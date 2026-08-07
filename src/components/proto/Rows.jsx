import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBundle } from '../../state/store';
import { dateLabel } from '../../data/chats';
import { ChatGlyph, Chevron, Spark } from '../Icons';
import { DotsButton, useMenus } from './Menus';

const rowSpring = { type: 'spring', stiffness: 420, damping: 40 };

/* An ordinary chat row (Fig. 4-⑥). `surface` namespaces layout ids so the
   sidebar and the main page animate independently. */
export function ChatRow({ chat, bundled, surface = 'm', compact = false }) {
  const { state, dispatch } = useBundle();
  const { menu, openMenu } = useMenus();
  const isOpen = menu?.kind === 'row' && menu.chat?.id === chat.id && menu.surface === surface;

  return (
    <motion.div
      layout="position"
      layoutId={`${surface}-${chat.id}`}
      transition={rowSpring}
      initial={false}
      className={`cl-row ${state.highlightId === chat.id ? 'is-highlight' : ''}`}
    >
      <span className="cl-row-glyph"><ChatGlyph size={compact ? 13 : 15} /></span>
      <button
        type="button"
        className="cl-row-title"
        onClick={() => dispatch({ type: 'TOAST', text: 'Chat contents are out of scope — the index is the subject here.' })}
      >
        {chat.title}
      </button>
      {!compact && <span className="cl-row-date">{dateLabel(chat.date)}</span>}
      <DotsButton
        className="cl-row-dots"
        open={isOpen}
        onClick={(e) => openMenu('row', { chat, bundled, surface }, e)}
      />
    </motion.div>
  );
}

/* A bundle section (Fig. 4): chevron · name · count · spark · menu. */
export function BundleSection({ bundle, surface = 'm', compact = false }) {
  const { state, dispatch } = useBundle();
  const { menu, openMenu } = useMenus();
  const renaming = state.renaming === bundle.key && surface === 'm';
  const isOpen = menu?.kind === 'bundle' && menu.bundleKey === bundle.key && menu.surface === surface;

  return (
    <motion.section
      layout
      transition={rowSpring}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
      className="cl-bundle"
    >
      <div className="cl-bundle-head">
        <button
          type="button"
          className="cl-bundle-chevron"
          aria-label={bundle.collapsed ? 'Expand bundle' : 'Collapse bundle'}
          aria-expanded={!bundle.collapsed}
          onClick={() => dispatch({ type: 'TOGGLE_COLLAPSE', key: bundle.key })}
        >
          <Chevron open={!bundle.collapsed} />
        </button>

        {renaming ? (
          <RenameField bundle={bundle} />
        ) : (
          <span className="cl-bundle-name">{bundle.name}</span>
        )}

        <span className="cl-bundle-count">{bundle.chats.length}</span>
        <Spark size={11} />
        <span className="grow" />
        <DotsButton
          className="cl-bundle-dots"
          open={isOpen}
          onClick={(e) => openMenu('bundle', { bundleKey: bundle.key, bundleName: bundle.name, surface }, e)}
        />
      </div>

      <AnimatePresence initial={false}>
        {!bundle.collapsed && (
          <motion.div
            key="rows"
            className="cl-bundle-rows"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {bundle.chats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} bundled surface={surface} compact={compact} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* J-3 — the name becomes an inline text field, selected. */
function RenameField({ bundle }) {
  const { dispatch } = useBundle();
  const [value, setValue] = useState(bundle.name);
  const ref = useRef(null);

  useEffect(() => { ref.current?.select(); }, []);

  const commit = () => dispatch({ type: 'COMMIT_RENAME', key: bundle.key, name: value });

  return (
    <input
      ref={ref}
      className="cl-rename-input"
      value={value}
      aria-label="Bundle name"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') dispatch({ type: 'CANCEL_RENAME' });
      }}
    />
  );
}
