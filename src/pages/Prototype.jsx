import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGroup } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { Gear } from '../components/Icons';
import ChatsPage from '../components/proto/ChatsPage';
import Sidebar from '../components/proto/Sidebar';
import DemoRail from '../components/proto/DemoRail';
import { MenuHost, MenuProvider } from '../components/proto/Menus';
import { Dialogs, SettingsPopover, Toast } from '../components/proto/Overlays';

export default function Prototype() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1180);

  return (
    <MenuProvider>
      <div className="proto-page">
        <header className="proto-bar" style={{ position: 'relative' }}>
          <Link to="/" className="proto-back mono">← Explainer</Link>
          <div className="proto-bar-title mono">
            Bundle · ZW·FS·001 — <span className="hl">interactive prototype</span>
          </div>
          <div className="proto-bar-actions">
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
          <LayoutGroup>
            <div className="cl-app">
              <Sidebar />
              <ChatsPage onOpenSettings={() => setSettingsOpen(true)} />
            </div>
          </LayoutGroup>
          <AnimatePresence>{railOpen && <DemoRail />}</AnimatePresence>
        </div>

        <MenuHost />
        <Dialogs />
        <Toast />
      </div>
    </MenuProvider>
  );
}
