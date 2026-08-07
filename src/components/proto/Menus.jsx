import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBundle } from '../../state/store';
import { Dots } from '../Icons';

/*
  One menu host for the whole prototype. The grammar is the spec's:
  · bundle menu — two verbs, no more (Fig. 4-⑤)
  · row menu — today's six items, plus exactly one while bundled:
    Remove from bundle, shortcut B (Fig. 6)
*/

const MenuCtx = createContext(null);
export const useMenus = () => useContext(MenuCtx);

export function MenuProvider({ children }) {
  const [menu, setMenu] = useState(null); // {kind:'row'|'bundle', chat?, bundleKey?, bundled?, x, y, up}
  const [dialog, setDialog] = useState(null); // {kind:'hide', key, name} | {kind:'delete', chat}

  const open = (kind, payload, e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const up = r.bottom > window.innerHeight - 330;
    setMenu({ kind, ...payload, x: r.right, y: up ? r.top - 6 : r.bottom + 6, up });
  };

  const value = useMemo(
    () => ({ menu, openMenu: open, closeMenu: () => setMenu(null), dialog, setDialog }),
    [menu, dialog],
  );
  return <MenuCtx.Provider value={value}>{children}</MenuCtx.Provider>;
}

function MenuItem({ label, kbd, danger, isNew, onClick, submarker }) {
  return (
    <button type="button" className={`cl-menu-item ${danger ? 'is-danger' : ''} ${isNew ? 'is-new' : ''}`} onClick={onClick}>
      <span className="grow">{label}</span>
      {submarker && <span style={{ color: 'var(--cl-faint)' }}>›</span>}
      {kbd && <span className="kbd">{kbd}</span>}
    </button>
  );
}

export function MenuHost() {
  const { dispatch } = useBundle();
  const { menu, closeMenu, setDialog } = useMenus();
  const ref = useRef(null);

  // close on outside click / Esc; B removes-from-bundle while a bundled row menu is open
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) closeMenu(); };
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
      if ((e.key === 'b' || e.key === 'B') && menu.kind === 'row' && menu.bundled) {
        dispatch({ type: 'REMOVE_FROM_BUNDLE', chatId: menu.chat.id });
        closeMenu();
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [menu, closeMenu, dispatch]);

  const inert = () => {
    dispatch({ type: 'TOAST', text: 'Outside this prototype — see §13 of the spec.' });
    closeMenu();
  };

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={ref}
          className="cl-menu"
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: menu.up ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.13 }}
          style={{
            left: Math.max(8, menu.x - 226),
            top: menu.up ? undefined : menu.y,
            bottom: menu.up ? window.innerHeight - menu.y : undefined,
          }}
        >
          {menu.kind === 'bundle' ? (
            <>
              {/* Two verbs. Nothing else earns a place. (§9.1) */}
              <MenuItem label="Rename bundle" onClick={() => { dispatch({ type: 'START_RENAME', key: menu.bundleKey }); closeMenu(); }} />
              <MenuItem label="Hide bundle" onClick={() => { setDialog({ kind: 'hide', key: menu.bundleKey, name: menu.bundleName }); closeMenu(); }} />
            </>
          ) : (
            <>
              <MenuItem label="Pin" kbd="P" onClick={inert} />
              <MenuItem label="Mark as unread" kbd="U" onClick={inert} />
              <MenuItem label="Rename" kbd="R" onClick={inert} />
              {menu.bundled && (
                <MenuItem
                  label="Remove from bundle"
                  kbd="B"
                  isNew
                  onClick={() => { dispatch({ type: 'REMOVE_FROM_BUNDLE', chatId: menu.chat.id }); closeMenu(); }}
                />
              )}
              <MenuItem label="Change project" submarker onClick={inert} />
              <MenuItem label="Remove from project" onClick={inert} />
              <div className="cl-menu-sep" />
              <MenuItem label="Delete" kbd="D" danger onClick={() => { setDialog({ kind: 'delete', chat: menu.chat }); closeMenu(); }} />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DotsButton({ open, onClick, className = '' }) {
  return (
    <button type="button" aria-label="Open menu" aria-haspopup="menu" className={`${className} ${open ? 'is-open' : ''}`} onClick={onClick}>
      <Dots />
    </button>
  );
}
