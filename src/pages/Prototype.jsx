import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Gear } from '../components/Icons';
import ChatsPage from '../components/proto/ChatsPage';
import Sidebar from '../components/proto/Sidebar';
import DemoRail from '../components/proto/DemoRail';
import { MenuHost, MenuProvider } from '../components/proto/Menus';
import { Dialogs, SettingsPopover, Toast } from '../components/proto/Overlays';
import { useBundle } from '../state/store';
import Stage from '../stage/Stage';
import { loadPipeline, resetRunner, retry, runForm } from '../stage/runner';
import { reset as resetTrace, setMode, setVisible, useTrace } from '../stage/trace';

const DUR = { duration: 0.42, ease: [0.16, 1, 0.3, 1] };

function useMedia(query) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

let defaultedEngine = false; // once per page load: engine → 'live' when a pipeline module exists

export default function Prototype() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1180);
  const { state, dispatch } = useBundle();
  const { current: run, visible } = useTrace();
  const narrow = useMedia('(max-width: 900px)');
  const { search } = useLocation();
  const stateRef = useRef(state);
  stateRef.current = state;

  // ?inspect starts the stage in inspect mode; the booth default is story.
  useEffect(() => {
    if (new URLSearchParams(search).has('inspect')) setMode('inspect');
  }, [search]);

  // Engine default: live when src/engine/pipeline.js exists (the mock covers it otherwise).
  useEffect(() => {
    if (defaultedEngine) return;
    defaultedEngine = true;
    loadPipeline().then((mod) => { if (mod && stateRef.current.engine !== 'live') dispatch({ type: 'SET_ENGINE', mode: 'live' }); });
  }, [dispatch]);

  // Live engine: every entry into 'generating' (toggle on, Try again, memory resume) is a Form run.
  useEffect(() => {
    if (state.phase !== 'generating' || state.engine !== 'live') return;
    runForm({ state, dispatch });
  }, [state.phase, state.runId, state.engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the prototype / swap the life → the stage empties too.
  useEffect(() => {
    if (state.runId === 0 && state.phase === 'off') { resetTrace(); resetRunner(); }
  }, [state.runId, state.phase, state.scenario]);

  // ` toggles the stage (not while typing).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      setVisible(!visible);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  const open = Boolean(run) && visible;
  const size = narrow
    ? { width: '100%', height: open ? '58%' : '0%', opacity: open ? 1 : 0 }
    : { width: open ? '60%' : '0%', height: '100%', opacity: open ? 1 : 0 };

  return (
    <MenuProvider>
      <div className="proto-page">
        <header className="proto-bar" style={{ position: 'relative' }}>
          <Link to="/" className="proto-back mono">← Explainer</Link>
          <div className="proto-bar-title mono">
            Bundle · ZW·FS·001 — <span className="hl">interactive prototype</span>
          </div>
          <div className="proto-bar-actions">
            {run && (
              <button
                type="button"
                className={`bar-btn ${open ? 'is-active' : ''}`}
                aria-expanded={open}
                onClick={() => setVisible(!visible)}
                title="Toggle the stage view (`)"
              >
                Stage
              </button>
            )}
            <button
              type="button"
              className={`bar-btn ${settingsOpen ? 'is-active' : ''}`}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <Gear size={13} />
            </button>
            <button
              type="button"
              className={`bar-btn ${railOpen ? 'is-active' : ''}`}
              aria-expanded={railOpen}
              onClick={() => setRailOpen((v) => !v)}
            >
              Demo controls
            </button>
          </div>
          <SettingsPopover open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </header>

        {/* Mobile is explicitly out of scope for v1 (§13, NG3). */}
        <div className="proto-mobile-note">
          <span className="mono" style={{ fontSize: 9 }}>§13</span>
          <span>
            This prototype mirrors Claude's desktop index; mobile is out of scope for Bundle v1.
            It works here, but it deserves a wider screen.
          </span>
        </div>

        <div className="proto-body">
          {/* The frame: Claude UI left, the stage right (B8: ~40/60 when open). The app
              frame is always the same node — opening the stage never re-mounts the list (INV-1). */}
          <div className={`proto-frame ${narrow ? 'is-stacked' : ''}`}>
            <LayoutGroup>
              <div className="cl-app">
                <Sidebar />
                <ChatsPage onOpenSettings={() => setSettingsOpen(true)} />
              </div>
            </LayoutGroup>
            <motion.div
              className={`zw-stage-wrap ${narrow ? 'is-stacked' : ''}`}
              initial={false}
              animate={size}
              transition={DUR}
              aria-hidden={!open}
              inert={!open}
              style={{ pointerEvents: open ? 'auto' : 'none' }}
            >
              {run && (
                <Stage
                  onCollapse={() => setVisible(false)}
                  onRetry={(r) => retry(r, { state: stateRef.current, dispatch })}
                />
              )}
            </motion.div>
          </div>
          <AnimatePresence>{railOpen && <DemoRail />}</AnimatePresence>
        </div>

        <MenuHost />
        <Dialogs />
        <Toast />
      </div>
    </MenuProvider>
  );
}
