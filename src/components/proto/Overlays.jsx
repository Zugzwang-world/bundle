import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBundle } from '../../state/store';
import { Toggle } from '../Icons';
import { useMenus } from './Menus';

export function Dialogs() {
  const { dialog, setDialog } = useMenus();
  const { dispatch } = useBundle();

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => e.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, setDialog]);

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          className="cl-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}
        >
          <motion.div
            className="cl-dialog"
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16 }}
          >
            {dialog.kind === 'hide' ? (
              <>
                {/* J-5 — one small confirmation, verbatim. The action keeps its name. */}
                <h3>Hide this bundle?</h3>
                <p>Your chats stay in your list. The bundle just stops appearing.</p>
                <div className="cl-dialog-actions">
                  <button type="button" className="cl-btn-ghost" onClick={() => setDialog(null)}>Cancel</button>
                  <button
                    type="button"
                    className="cl-btn-solid"
                    autoFocus
                    onClick={() => { dispatch({ type: 'HIDE_BUNDLE', key: dialog.key }); setDialog(null); }}
                  >
                    Hide bundle
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* A14 — Delete behaves exactly as today; bundles never delete, Delete still does. */}
                <h3>Delete chat?</h3>
                <p>“{dialog.chat.title}” will be deleted. In this prototype there is no undo — Reset restores the demo.</p>
                <div className="cl-dialog-actions">
                  <button type="button" className="cl-btn-ghost" onClick={() => setDialog(null)}>Cancel</button>
                  <button
                    type="button"
                    className="cl-btn-solid cl-btn-danger"
                    autoFocus
                    onClick={() => { dispatch({ type: 'DELETE_CHAT', chatId: dialog.chat.id }); setDialog(null); }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Every destructive-looking act is undoable in place (§9.1). */
export function Toast() {
  const { state, dispatch } = useBundle();
  const toast = state.toast;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="cl-toast"
          role="status"
          initial={{ opacity: 0, y: 14, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {toast.text}
          {toast.undo && (
            <button type="button" onClick={() => dispatch(toast.undo)}>Undo</button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Where the J-7 door leads: memory, user-controllable, Bundle's only source. */
export function SettingsPopover({ open, onClose }) {
  const { state, dispatch } = useBundle();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cl-settings"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
        >
          <h4>Settings › Capabilities</h4>
          <div className="cl-settings-row">
            <div className="tx">
              <div className="tt">Memory</div>
              <div className="td">
                Claude keeps a distilled understanding of your chats. Bundle reads nothing memory
                does not already read — turning this off pauses Bundle the same moment.
              </div>
            </div>
            <Toggle on={state.memoryOn} label="Memory" onClick={() => dispatch({ type: 'TOGGLE_MEMORY' })} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
