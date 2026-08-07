import { AnimatePresence, motion } from 'framer-motion';
import { selectIndex, useBundle } from '../../state/store';
import { Spark, Toggle } from '../Icons';
import { BundleSection, ChatRow } from './Rows';

/* The Chats and tasks page — the only part of the product Bundle touches. */
export default function ChatsPage({ onOpenSettings }) {
  const { state, dispatch } = useBundle();
  const index = selectIndex(state);
  const inert = (what) => dispatch({ type: 'TOAST', text: `${what} is outside this prototype — see §13 of the spec.` });

  const showNote = index.showBundles && state.everFormed && !state.noteDismissed;

  return (
    <main className="cl-main">
      <div className="cl-page">
        <h1 className="cl-page-title">Chats and tasks</h1>

        {/* View controls — the toggle sits where the spec puts it (§7). */}
        <div className="cl-controls">
          <button type="button" className="cl-chip" onClick={() => inert('Filtering')}>Filter by All ▾</button>
          <button type="button" className="cl-chip" onClick={() => inert('Select')}>Select</button>
          <span className="grow" />
          <div className="cl-toggle-wrap">
            <span className="cl-toggle-label" id="bundle-toggle-label">Bundle chats</span>
            <Toggle
              on={state.bundleOn && state.memoryOn}
              disabled={!state.memoryOn}
              label="Bundle chats"
              onClick={() => dispatch({ type: 'TOGGLE_BUNDLE' })}
            />
            <div className="cl-tooltip" role="tooltip">
              Group related chats into bundles you can rename, edit, or hide.
            </div>
          </div>
          <button type="button" className="cl-new-btn" onClick={() => inert('New chat')}>New</button>
        </div>

        {/* J-7 — disabled with a reason and a door, never a dead control. */}
        {!state.memoryOn && (
          <div className="cl-memory-note">
            <span>
              Bundle uses memory to understand your chats.{' '}
              <button type="button" onClick={onOpenSettings}>Turn on memory</button> to bundle them.
            </span>
          </div>
        )}

        {/* §9 — the states. In every one of them the list below is present. */}
        <AnimatePresence initial={false}>
          {state.phase === 'generating' && <Skeletons key="skel" />}

          {state.phase === 'failed' && (
            <StateCard key="failed">
              Claude couldn’t bundle your chats. Your list is unchanged.
              <div>
                <button type="button" className="cl-try" onClick={() => dispatch({ type: 'RETRY' })}>Try again</button>
              </div>
            </StateCard>
          )}

          {state.phase === 'thin' && (
            <StateCard key="thin">Bundles will appear once you have a few chats about the same thing.</StateCard>
          )}

          {showNote && (
            <motion.div
              key="note"
              className="cl-note"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
            >
              <Spark size={11} />
              <span className="grow">Bundled by Claude. Rename, remove chats, or hide any bundle.</span>
              <button type="button" className="cl-note-x" aria-label="Dismiss" onClick={() => dispatch({ type: 'DISMISS_NOTE' })}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bundles render above the chronological list, never instead of it (INV-1). */}
        {index.showBundles && (
          <div className="cl-bundles">
            <AnimatePresence initial={false}>
              {index.bundles.map((b) => (
                <BundleSection key={b.key} bundle={b} surface="m" />
              ))}
            </AnimatePresence>
          </div>
        )}

        {index.showBundles && <div className="cl-all-label">All chats</div>}

        <div className="cl-list">
          {index.listChats.map((chat) => (
            <ChatRow key={chat.id} chat={chat} surface="m" />
          ))}
        </div>
      </div>
    </main>
  );
}

function StateCard({ children }) {
  return (
    <motion.div
      className="cl-statecard"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      {children}
    </motion.div>
  );
}

/* J-1 — "Finding related chats…" and two quiet skeleton sections.
   The list never blinks; navigation never waits on generation. */
function Skeletons() {
  return (
    <motion.div
      className="cl-skel"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <div className="cl-skel-label">
        <span className="cl-spin" aria-hidden="true" />
        Finding related chats…
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="cl-skel-section">
          <div className="cl-skel-line" style={{ paddingLeft: 0 }}>
            <div className="cl-skel-bar cl-skel-dot" />
            <div className="cl-skel-bar" style={{ width: i ? 128 : 156 }} />
          </div>
          <div className="cl-skel-line"><div className="cl-skel-bar cl-skel-dot" /><div className="cl-skel-bar" style={{ width: i ? 210 : 244 }} /></div>
          <div className="cl-skel-line"><div className="cl-skel-bar cl-skel-dot" /><div className="cl-skel-bar" style={{ width: i ? 176 : 198 }} /></div>
        </div>
      ))}
    </motion.div>
  );
}
