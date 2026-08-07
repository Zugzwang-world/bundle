import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ChatGlyph, Spark, Toggle } from '../Icons';

/*
  §7, live. A small real instance of the proposal: flip the toggle, watch
  two concerns get places while everything else stays put under All chats.
*/

const ROWS = [
  { id: 'm1', t: 'Questions to ask a financial adviser', d: 'Jun 26', c: 'ret' },
  { id: 'm2', t: 'Ser vs estar, again', d: 'Jun 24', c: 'spa' },
  { id: 'm3', t: 'Draft a birthday message for Ravi', d: 'Jun 22', c: null },
  { id: 'm4', t: 'Past tense of ir', d: 'Jun 18', c: 'spa' },
  { id: 'm5', t: 'Ordering food politely in Spanish', d: 'Jun 12', c: 'spa' },
  { id: 'm6', t: 'Pension withdrawal tax rules', d: 'Jun 9', c: 'ret' },
  { id: 'm7', t: 'Recipe for masala oats', d: 'Jun 2', c: null },
  { id: 'm8', t: 'Senior citizen savings scheme rates', d: 'May 21', c: 'ret' },
  { id: 'm9', t: 'How annuities work', d: 'Apr 8', c: 'ret' },
];

const BUNDLES = [
  { key: 'ret', name: 'Retirement planning' },
  { key: 'spa', name: 'Spanish practice' },
];

const spring = { type: 'spring', stiffness: 420, damping: 40 };

function Row({ row, showDate = true }) {
  return (
    <motion.div layout="position" layoutId={`mini-${row.id}`} transition={spring} className="cl-row" style={{ padding: '6px 8px' }}>
      <span className="cl-row-glyph"><ChatGlyph size={14} /></span>
      <span className="cl-row-title" style={{ cursor: 'default' }}>{row.t}</span>
      {showDate && <span className="cl-row-date">{row.d}</span>}
    </motion.div>
  );
}

export default function MiniDemo() {
  const [on, setOn] = useState(false);
  const [phase, setPhase] = useState('off'); // off | generating | ready

  useEffect(() => {
    if (phase !== 'generating') return undefined;
    const t = setTimeout(() => setPhase('ready'), 1300);
    return () => clearTimeout(t);
  }, [phase]);

  const flip = () => {
    if (on) { setOn(false); setPhase('off'); }
    else { setOn(true); setPhase('generating'); }
  };

  const ready = phase === 'ready';
  const listRows = ready ? ROWS.filter((r) => !r.c) : ROWS;

  return (
    <LayoutGroup id="minidemo">
      <div className="mini-frame">
        <div className="mini-head">
          <span className="tt">Chats and tasks</span>
          <div className="cl-toggle-wrap">
            <span className="cl-toggle-label">Bundle chats</span>
            <Toggle on={on} label="Bundle chats" onClick={flip} />
            <div className="cl-tooltip" role="tooltip">
              Group related chats into bundles you can rename, edit, or hide.
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {phase === 'generating' && (
            <motion.div
              key="gen"
              className="cl-skel-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              style={{ padding: '2px 8px 10px' }}
            >
              <span className="cl-spin" aria-hidden="true" />
              Finding related chats…
            </motion.div>
          )}

          {ready &&
            BUNDLES.map((b) => {
              const chats = ROWS.filter((r) => r.c === b.key);
              return (
                <motion.div
                  key={b.key}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.14 } }}
                  transition={spring}
                  style={{ marginBottom: 2 }}
                >
                  <div className="cl-bundle-head" style={{ padding: '5px 8px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)', color: 'var(--cl-faint)' }}>
                      <path d="m9 5 8 7-8 7" />
                    </svg>
                    <span className="cl-bundle-name">{b.name}</span>
                    <span className="cl-bundle-count">{chats.length}</span>
                    <Spark size={10} />
                  </div>
                  <div style={{ paddingLeft: 14 }}>
                    {chats.map((r) => <Row key={r.id} row={r} />)}
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {ready && <motion.div layout className="cl-all-label" transition={spring}>All chats</motion.div>}

        <motion.div layout transition={spring}>
          {listRows.map((r) => <Row key={r.id} row={r} />)}
        </motion.div>
      </div>
    </LayoutGroup>
  );
}
