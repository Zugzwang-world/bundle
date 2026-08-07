import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChatGlyph, Spark } from '../Icons';

/*
  Figure 1, animated: four months, nine chats, one concern.
  The retirement chats are inhaled into a single named place; the rest of
  Meera's life stays exactly where it was. Loops gently.
*/

const CONCERN_PILLS = [
  { t: 'Defined benefit vs defined contribution', l: 2, top: 15 },
  { t: 'EPF withdrawal rules after retirement', l: 27, top: 15 },
  { t: 'Is this bank letter about my pension genuine', l: 56, top: 15 },
  { t: 'How annuities work', l: 5, top: 29 },
  { t: 'Tax on pension withdrawals', l: 24, top: 29 },
  { t: 'Monthly budget on a fixed income', l: 51, top: 29 },
  { t: 'Senior citizen savings scheme rates', l: 2, top: 43 },
  { t: 'Pension withdrawal tax rules — the re-ask', l: 32, top: 43 },
  { t: 'Questions to ask a financial adviser', l: 62, top: 43 },
];

const NOISE_PILLS = [
  { t: 'Recipe for masala oats', l: 78, top: 29 },
  { t: 'Draft a birthday message for Ravi', l: 62, top: 57 },
  { t: 'Weekend trip ideas near Lonavala', l: 8, top: 57 },
  { t: 'What does deductible mean', l: 38, top: 57 },
];

export default function HeroGather() {
  const reduced = useReducedMotion();
  const [gathered, setGathered] = useState(Boolean(reduced));

  useEffect(() => {
    if (reduced) return undefined;
    const t = setTimeout(() => setGathered((g) => !g), gathered ? 3600 : 2600);
    return () => clearTimeout(t);
  }, [gathered, reduced]);

  return (
    <div className="gather" aria-hidden="true">
      <div className="gather-months">
        {['Mar', 'Apr', 'May', 'Jun'].map((m) => (
          <span key={m}>{m.toUpperCase()}</span>
        ))}
      </div>

      {CONCERN_PILLS.map((p, i) => (
        <motion.div
          key={p.t}
          className="gather-pill is-concern"
          initial={false}
          animate={
            gathered
              ? { left: '50%', top: '74%', x: '-50%', scale: 0.35, opacity: 0 }
              : { left: `${p.l}%`, top: `${p.top}%`, x: '0%', scale: 1, opacity: 1 }
          }
          transition={{
            duration: 0.65,
            delay: (gathered ? i : CONCERN_PILLS.length - 1 - i) * 0.045,
            ease: [0.6, 0.05, 0.2, 1],
          }}
        >
          {p.t}
        </motion.div>
      ))}

      {NOISE_PILLS.map((p) => (
        <motion.div
          key={p.t}
          className="gather-pill"
          initial={false}
          animate={{ opacity: gathered ? 0.28 : 0.75 }}
          transition={{ duration: 0.6 }}
          style={{ left: `${p.l}%`, top: `${p.top}%` }}
        >
          {p.t}
        </motion.div>
      ))}

      <motion.div
        className="gather-card"
        initial={false}
        animate={gathered ? { opacity: 1, scale: 1, y: 0, x: '-50%' } : { opacity: 0, scale: 0.95, y: 16, x: '-50%' }}
        transition={{ duration: 0.5, delay: gathered ? 0.32 : 0, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="gather-card-head">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)', color: 'var(--cl-faint)' }}>
            <path d="m9 5 8 7-8 7" />
          </svg>
          <span className="nm">Retirement planning</span>
          <span className="cl-bundle-count">9</span>
          <Spark size={10} />
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--cl-faint)', letterSpacing: 2 }}>···</span>
        </div>
        <div className="gather-card-row">
          <ChatGlyph size={13} /><span className="grow">Questions to ask a financial adviser</span><span className="dt">Jun 26</span>
        </div>
        <div className="gather-card-row">
          <ChatGlyph size={13} /><span className="grow">Pension withdrawal tax rules</span><span className="dt">Jun 9</span>
        </div>
        <div className="gather-card-row is-more">
          <span className="grow">… seven more, back to March</span>
        </div>
      </motion.div>
    </div>
  );
}
