import { motion } from 'framer-motion';
import { INCOMING_CHATS } from '../../data/chats';
import { JOURNEYS, useBundle } from '../../state/store';
import { Spark } from '../Icons';
import LiveChat from './LiveChat';

/* Margin notes for the prototype — the document world annotating the
   product world. Everything here is demo scaffolding, not the feature. */
export default function DemoRail() {
  const { state, dispatch } = useBundle();
  const done = JOURNEYS.filter((j) => state.journeys[j.id]).length;

  return (
    <motion.aside
      className="demo-rail"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Demo controls"
    >
      <div className="mono dr-head">§8 · Step-wise, in your hands</div>
      <div className="dr-title">Walk the seven journeys</div>

      <div>
        {JOURNEYS.map((j) => {
          const isDone = Boolean(state.journeys[j.id]);
          return (
            <div key={j.id} className={`dr-journey ${isDone ? 'is-done' : ''}`}>
              <span className="dr-check" aria-hidden="true">{isDone ? '✓' : ''}</span>
              <div>
                <div className="jl"><span className="dr-jid">{j.id} · </span>{j.label}</div>
                {!isDone && <div className="jh">{j.hint}</div>}
              </div>
            </div>
          );
        })}
        {done === JOURNEYS.length && (
          <div className="dr-done-line">
            <Spark size={12} />
            Seven for seven. Nothing moved, nothing lost.
          </div>
        )}
      </div>

      <div className="dr-block">
        <div className="mono dr-head" style={{ marginBottom: 12 }}>Demo controls</div>
        <div className="dr-ctl">
          <div className="dr-seg" role="group" aria-label="Account scenario">
            <button
              type="button"
              className={state.scenario === 'meera' ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'SET_SCENARIO', scenario: 'meera' })}
            >
              Meera · 4 months
            </button>
            <button
              type="button"
              className={state.scenario === 'fresh' ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'SET_SCENARIO', scenario: 'fresh' })}
            >
              New account
            </button>
          </div>

          <LiveChat />

          <button
            type="button"
            className="dr-btn"
            disabled={state.scenario === 'fresh' || state.arrivals.length >= INCOMING_CHATS.length}
            onClick={() => dispatch({ type: 'NEW_CHAT' })}
          >
            A new chat arrives
            <span className="sub">J-2 · {state.arrivals.length}/{INCOMING_CHATS.length}</span>
          </button>

          <div className="dr-switchrow">
            <span className="lb">Fail the next run</span>
            <span className="sub mono" style={{ fontSize: 9, color: 'var(--bone-faint)' }}>§9</span>
            <button
              type="button"
              role="switch"
              aria-checked={state.failNext}
              aria-label="Fail the next run"
              className={`dr-sw ${state.failNext ? 'is-on' : ''}`}
              onClick={() => dispatch({ type: 'SET_FAIL_NEXT', value: !state.failNext })}
            />
          </div>

          <div className="dr-switchrow">
            <span className="lb">Memory</span>
            <span className="sub mono" style={{ fontSize: 9, color: 'var(--bone-faint)' }}>J-7</span>
            <button
              type="button"
              role="switch"
              aria-checked={state.memoryOn}
              aria-label="Memory"
              className={`dr-sw ${state.memoryOn ? 'is-on' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_MEMORY' })}
            />
          </div>

          <button type="button" className="dr-btn" onClick={() => dispatch({ type: 'RESET' })}>
            Reset the prototype
            <span className="sub">Fresh start</span>
          </button>
        </div>

        <p className="dr-fine">
          Everything above this line is demo scaffolding. Everything inside the app frame is the
          proposal: one toggle, four invariants, six states — <a href="/Bundle_ZW-FS-001_v1_0.pdf" target="_blank" rel="noreferrer">ZW-FS-001 (PDF)</a>.
        </p>
      </div>
    </motion.aside>
  );
}
