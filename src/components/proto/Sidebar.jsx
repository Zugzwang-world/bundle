import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { selectIndex, useBundle } from '../../state/store';
import { ChatGlyph, Chevron, Toggle } from '../Icons';
import { BundleSection, ChatRow } from './Rows';

const NAV = ['New', 'Chats and tasks', 'Projects', 'Artifacts', 'Scheduled', 'Customize'];

/* The sidebar mirror (§8.3) — same preference, same bundles, one derivation (A13).
   Project sections sit above, untouched and unmarked; bundles are the
   sections with the spark. */
export default function Sidebar() {
  const { state, dispatch } = useBundle();
  const index = selectIndex(state);
  const [projOpen, setProjOpen] = useState(true);
  const inert = (what) => dispatch({ type: 'TOAST', text: `${what} is outside this prototype — see §13 of the spec.` });

  return (
    <aside className="cl-sidebar">
      <div className="cl-brand">Claude</div>

      <nav className="cl-nav">
        {NAV.map((item) => (
          <button
            key={item}
            type="button"
            className={`cl-nav-item ${item === 'Chats and tasks' ? 'is-active' : ''}`}
            onClick={() => item !== 'Chats and tasks' && inert(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="cl-scroll">
        {/* Project section — person-made, no mark, exactly as today (Fig. 7-①). */}
        {index.projects.map((p) => (
          <div key={p.name}>
            <button type="button" className="cl-side-section-head" onClick={() => setProjOpen((v) => !v)} aria-expanded={projOpen}>
              <Chevron open={projOpen} size={11} />
              <span style={{ flex: 1 }}>{p.name}</span>
              <span className="count">{p.chats.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {projOpen && (
                <motion.div
                  className="cl-side-indent"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  {p.chats.map((chat) => (
                    <button key={chat.id} type="button" className="cl-side-row" onClick={() => inert('Opening chats')}>
                      <ChatGlyph size={13} />
                      <span className="t">{chat.title}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Recents header carries the mirror — the same preference in miniature (Fig. 7-②). */}
        <div className="cl-side-label">
          Recents
          <span className="grow" />
          <Toggle
            mini
            on={state.bundleOn && state.memoryOn}
            disabled={!state.memoryOn}
            label="Bundle chats"
            onClick={() => dispatch({ type: 'TOGGLE_BUNDLE' })}
          />
        </div>

        {index.showBundles && (
          <AnimatePresence initial={false}>
            {index.bundles.map((b) => (
              <BundleSection key={b.key} bundle={b} surface="s" compact />
            ))}
          </AnimatePresence>
        )}

        {index.listChats.slice(0, 14).map((chat) => (
          <ChatRow key={chat.id} chat={chat} surface="s" compact />
        ))}
      </div>
    </aside>
  );
}
