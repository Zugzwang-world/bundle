// The stage view — the hood, open (HANDOVER B8). Document world: zw- classes, ink/bone/gold,
// IBM Plex Mono for the technique lines. Renders the current run from the trace store.
//
//   Story mode  — cards reveal in order as the story clock advances; the clock advances off a
//                 card only when its event is done AND its dwell has elapsed, so events that
//                 arrive early are paced and a slow stage is waited on.
//   Inspect mode — everything live; click a card for the drawer with raw JSON or the numbers.
import { useEffect, useMemo, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { CONCERNS } from '../data/chats';
import { CONFIG, describe } from '../engine/config.js';
import { useBundle } from '../state/store';
import ConcernMap from './cards/ConcernMap.jsx';
import { CAPTIONS, CLAUDE_STAGES, SKIP_DWELL, stagesFor } from './story.js';
import { advance, setMode, useTrace } from './trace.js';

function readModel() {
  try { return import.meta.env.VITE_MODEL || 'claude-fable-5-1'; } catch { return 'claude-fable-5-1'; }
}

const GLYPH = { pending: '○', running: '◐', done: '●', error: '✕', skipped: '◌' };

/* ── helpers over the run ─────────────────────────────────────────── */
function eventFor(run, stage) {
  if (!run) return null;
  const keys = [stage.key, ...(stage.alias || [])];
  let best = null;
  for (const e of run.events) if (keys.includes(e.stage) && (!best || (e.updatedAt || 0) >= (best.updatedAt || 0))) best = e;
  // A merge card shows the merge event's detail; a later 'render' only completes it.
  if (best && best.stage !== stage.key) {
    const main = run.events.find((e) => e.stage === stage.key);
    if (main) return { ...main, status: best.status === 'done' ? 'done' : main.status };
  }
  return best;
}

const hasLater = (run, stages, i) => stages.slice(i + 1).some((s) => eventFor(run, s));

// The story clock. Lives on the trace store so the runner can sync the final dispatch to it.
function useStoryClock(run, stages, mode, story) {
  useEffect(() => {
    if (!run || mode !== 'story' || story.runId !== run.id) return undefined;
    const i = story.cursor;
    const st = stages[i];
    if (!st) return undefined; // finished
    const ev = eventFor(run, st);
    let dwell = st.dwell;
    let ready = false;
    if (ev?.status === 'done') ready = true;
    else if (!ev && hasLater(run, stages, i)) { ready = true; dwell = SKIP_DWELL; } // stage skipped by the engine
    else if (ev?.status === 'error') return undefined; // hold on the failed card
    if (!ready) return undefined; // wait on the running card
    const t = setTimeout(() => advance(run.id), Math.max(0, story.enteredAt + dwell - Date.now()));
    return () => clearTimeout(t);
  }, [run, stages, mode, story]);
}

const fmtMs = (ms) => (ms == null ? '' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

/* ── the pane ─────────────────────────────────────────────────────── */
export default function Stage({ onCollapse, onRetry, model = readModel() }) {
  const { current: run, mode, story } = useTrace();
  const { state } = useBundle();
  const stages = useMemo(() => stagesFor(run?.kind), [run?.kind]);
  const [selected, setSelected] = useState(null);
  useStoryClock(run, stages, mode, story);
  useEffect(() => { setSelected(null); }, [run?.id]);

  // chatId → bundle id, once the reducer has bundles; before that, the rules stage's clusters.
  const groups = useMemo(() => {
    const m = new Map();
    if (state.bundles) for (const b of state.bundles) for (const id of b.chatIds) m.set(id, b.id);
    else {
      const rules = run?.events.find((e) => e.stage === 'rules' && e.status === 'done');
      for (const c of rules?.output?.candidates || []) for (const id of c.chatIds || []) m.set(id, c.key);
    }
    return m.size ? m : null;
  }, [state.bundles, run?.events]);

  if (!run) return null;
  const storyLive = mode === 'story' && story.runId === run.id;
  const cursor = storyLive ? Math.min(story.cursor, stages.length - 1) : null;
  const finished = storyLive && story.cursor >= stages.length;

  const view = stages.map((st, i) => {
    const ev = eventFor(run, st);
    const later = hasLater(run, stages, i);
    let status;
    if (!storyLive) status = ev ? ev.status : later ? 'skipped' : 'pending';
    else if (i < story.cursor) status = ev ? ev.status : 'skipped';
    else if (i === story.cursor) status = !ev ? (later ? 'skipped' : 'running') : ev.status === 'pending' ? 'running' : ev.status;
    else status = 'pending';
    return { st, ev, status, revealed: !storyLive || i <= story.cursor };
  });

  const furthest = view.reduce((m, v, i) => (v.ev && v.status !== 'pending' ? i : m), -1);
  const focus = storyLive ? cursor : selected ?? Math.max(furthest, 0);
  const chipAt = storyLive ? cursor : Math.max(furthest, 0);
  const chipLabel = run.chat?.title || `${run.cards?.length ?? 0} cards`;
  const n = view.filter((v) => v.status === 'done').length;

  const nameOf = (id) => state.names?.[id] || state.bundles?.find((b) => b.id === id)?.name || CONCERNS[id]?.defaultName || id;

  const pick = (i) => {
    if (storyLive && !view[i].revealed) return;
    setSelected(i);
    if (mode !== 'inspect') setMode('inspect');
  };

  return (
    <section className="zw-stage" aria-label="Stage view">
      <header className="zw-stage-head">
        <span className="zw-mono zw-stage-kind">{run.kind === 'attach' ? 'Attach' : 'Form'} · run {run.reducerRunId ?? '—'}</span>
        <span className="zw-mono zw-stage-model" title="VITE_MODEL">{model}</span>
        <span className="zw-mono zw-stage-prog">{n}/{stages.length}{finished ? ' · played' : ''}</span>
        <span className="grow" />
        <div className="zw-seg" role="group" aria-label="Stage mode">
          <button type="button" className={mode === 'story' ? 'is-on' : ''} onClick={() => setMode('story')}>Story</button>
          <button type="button" className={mode === 'inspect' ? 'is-on' : ''} onClick={() => setMode('inspect')}>Inspect</button>
        </div>
        <button type="button" className="zw-collapse" onClick={onCollapse} title="Collapse the stage (`)">
          Collapse <kbd>`</kbd>
        </button>
      </header>

      <LayoutGroup id="stage">
        <div className="zw-cards" role="list">
          {view.map(({ st, ev, status, revealed }, i) => (
            <motion.article
              key={st.key}
              role="listitem"
              layout="position"
              className={`zw-card is-${status} ${revealed ? 'is-revealed' : 'is-future'} ${focus === i ? 'is-focus' : ''} ${CLAUDE_STAGES.has(st.key) ? 'is-claude' : ''}`}
              onClick={() => pick(i)}
              tabIndex={revealed ? 0 : -1}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }}
              aria-current={focus === i ? 'step' : undefined}
              initial={false}
              animate={{ opacity: revealed ? 1 : 0.32 }}
              transition={{ duration: 0.35 }}
            >
              <div className="zw-card-top">
                <span className={`zw-glyph is-${status}`} aria-label={status}>{GLYPH[status] || '○'}</span>
                <span className="zw-mono zw-tech">{st.technique}</span>
                {ev?.ms > 0 && status === 'done' && <span className="zw-mono zw-ms">{fmtMs(ev.ms)}</span>}
              </div>
              <h3 className="zw-card-title">{st.title}</h3>
              {revealed && <p className="zw-caption">{CAPTIONS[st.key]}</p>}
              {revealed && <div className="zw-out">{status === 'error' ? <span className="zw-err">{ev?.error || 'Failed'}</span> : summary(st.key, ev, status, nameOf)}</div>}
              {chipAt === i && (
                <motion.span layoutId="stage-chip" className="zw-chip" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
                  <span className="zw-chip-dot" />
                  <span className="t">{chipLabel}</span>
                </motion.span>
              )}
            </motion.article>
          ))}
        </div>
      </LayoutGroup>

      {focus != null && view[focus] && (
        <Detail
          key={`${run.id}-${view[focus].st.key}`}
          stage={view[focus].st}
          event={view[focus].ev}
          status={view[focus].status}
          run={run}
          groups={groups}
          nameOf={nameOf}
          inspect={mode === 'inspect'}
          onRetry={() => onRetry?.(run)}
        />
      )}
    </section>
  );
}

/* ── one-line live output per stage ───────────────────────────────── */
function summary(key, ev, status, nameOf) {
  const o = ev?.output;
  if (!o) return status === 'running' ? <span className="zw-dim">working…</span> : status === 'skipped' ? <span className="zw-dim">not needed</span> : null;
  switch (key) {
    case 'card':
      return o.title ? <><b>{o.title}</b>{o.summary ? ` — ${o.summary}` : ''}</> : `${o.count ?? '?'} cards${o.note ? ` · ${o.note}` : ''}`;
    case 'embed':
      if (o.dims) return `${o.count} × ${o.dims}-dim${o.ms ? ` · ${fmtMs(o.ms)}` : ''}`;
      return o.progress != null ? `${o.progress}/${o.count} embedded` : 'embedding…';
    case 'map':
      return `${(o.edges || []).length} edges ≥ τ_edge`;
    case 'rules':
      return `${(o.candidates || []).length} pass · ${(o.rejected || []).length} rejected`;
    case 'name': {
      const names = namesOf(o);
      const refused = names.filter((x) => x.refuse).length;
      return <>{names.filter((x) => !x.refuse).map((x) => x.name).join(' · ')}{refused ? <span className="zw-dim"> · {refused} refused</span> : null}</>;
    }
    case 'gate': {
      const g = gatesOf(o);
      const c = (d) => g.filter((x) => x.decision === d).length;
      return `${c('pass')} pass · ${c('downgrade')} downgraded · ${c('refuse')} refused`;
    }
    case 'merge':
      if (o.attached !== undefined || o.chatId) { const b = o.attached ?? o.bundleId; return <>→ <b>{b ? nameOf(b) : 'none'}</b></>; }
      return `${(o.bundles || []).length} bundles · ${(o.overrides || []).length} override${(o.overrides || []).length === 1 ? '' : 's'}`;
    case 'attach':
      return o.tie ? <>two within δ → <b>tie-break</b></> : <>→ <b>{o.bundleId ? nameOf(o.bundleId) : 'none'}</b>{o.scores?.[0] ? ` · ${o.scores[0].score.toFixed(2)}` : ''}</>;
    case 'tiebreak':
      return o.skipped ? <span className="zw-dim">not needed</span> : <>→ <b>{nameOf(o.bundleId ?? o.bundle_id)}</b> · runner-up {nameOf(o.runnerUp ?? o.runner_up)}</>;
    default:
      return JSON.stringify(o).slice(0, 80);
  }
}

// Both shapes: the mock's { names: [{ key, name, … }] } and pipeline.js's
// { results: [{ key, size, proposed, refused, reason }] }.
const namesOf = (o) => {
  if (Array.isArray(o)) return o;
  if (Array.isArray(o?.names)) return o.names;
  if (Array.isArray(o?.results)) return o.results.map((r) => ({ ...r, name: r.name ?? r.proposed, refuse: r.refuse ?? r.refused }));
  return o?.name ? [o] : [];
};
// Both shapes: { gates: [{ name, decision, replacement, layer, reason, term }] } and
// { results: [{ key, proposed, decision, final, layer, reason }] }.
const gatesOf = (o) => {
  if (Array.isArray(o)) return o;
  if (Array.isArray(o?.gates)) return o.gates;
  if (Array.isArray(o?.results)) return o.results.map((r) => ({ ...r, name: r.name ?? r.proposed, replacement: r.replacement ?? r.final }));
  return o?.decision ? [o] : [];
};
// raw is { request, response } for one call, or { calls: [{ request, response }, …] }.
const callsOf = (raw) => (Array.isArray(raw?.calls) ? raw.calls.filter(Boolean) : raw?.request || raw?.response ? [raw] : []);

/* ── the drawer beneath the row ───────────────────────────────────── */
function Detail({ stage, event, status, run, groups, nameOf, inspect, onRetry }) {
  const o = event?.output || null;
  const isClaude = CLAUDE_STAGES.has(stage.key);
  return (
    <motion.div className="zw-detail" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="zw-detail-head">
        <span className="zw-mono">{stage.title}</span>
        <span className="zw-mono zw-dim">{stage.technique}</span>
        {event?.ms > 0 && <span className="zw-mono zw-dim">{fmtMs(event.ms)}</span>}
      </div>

      {status === 'error' && (
        <div className="zw-error">
          <div>{event?.error || 'This stage failed.'}</div>
          <button type="button" className="zw-btn" onClick={onRetry}>Try again</button>
        </div>
      )}

      {status !== 'error' && <Body stage={stage} o={o} status={status} run={run} groups={groups} nameOf={nameOf} event={event} />}

      {inspect && (
        <div className="zw-inspect">
          {isClaude ? (
            callsOf(event?.raw).length ? (
              callsOf(event.raw).map((call, i, all) => (
                <div key={i} className="zw-call">
                  {all.length > 1 && <div className="zw-mono zw-dim">call {i + 1} of {all.length}</div>}
                  <Json label="request" value={call.request} />
                  <Json label="response" value={call.response} open={all.length === 1} />
                </div>
              ))
            ) : (
              <p className="zw-dim zw-fine">No request/response recorded for this stage{o?.skipped ? ' — it was not needed' : ''}.</p>
            )
          ) : (
            <>
              {event?.input && <Json label="input" value={event.input} />}
              {o && <Json label="output" value={o} />}
            </>
          )}
          <details className="zw-json">
            <summary className="zw-mono">config</summary>
            <table className="zw-table">
              <tbody>
                {describe(CONFIG).map((row) => (
                  <tr key={row.key}><td className="zw-mono">{row.label}</td><td>{String(row.value)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </motion.div>
  );
}

function Body({ stage, o, status, run, groups, nameOf, event }) {
  const cards = run.cards || [];
  const titleOf = (id) => cards.find((c) => c.id === id)?.title || run.chat?.title || id;
  if (!o) return <p className="zw-dim zw-fine">{status === 'running' ? 'Waiting on this stage…' : status === 'skipped' ? 'The engine did not need this stage.' : 'Not reached yet.'}</p>;

  switch (stage.key) {
    case 'card':
      return o.title ? (
        <div className="zw-cardout">
          <div className="zw-cardout-title">{o.title}</div>
          <div className="zw-cardout-sum">{o.summary}</div>
          {o.count ? <div className="zw-mono zw-dim">+ {o.count - 1} fixture cards, shipped with theirs</div> : null}
        </div>
      ) : (
        <p className="zw-fine">{o.count} cards. {o.note || ''}</p>
      );
    case 'embed':
      return (
        <div>
          <p className="zw-fine">{o.count} text{o.count === 1 ? '' : 's'} → {o.dims || 384}-dim unit vectors{o.ms ? ` in ${fmtMs(o.ms)}` : ''}{o.progress != null && !o.dims ? ` · ${o.progress}/${o.count}` : ''}.</p>
          {Array.isArray(o.sample) && (
            <div className="zw-vec" aria-label="vector preview">
              {o.sample.map((v, i) => (
                <span key={i} className="zw-vec-bar" title={String(v)}>
                  <span style={{ height: `${Math.min(100, Math.abs(v) * 400)}%`, background: v < 0 ? 'var(--bone-faint)' : 'var(--spark)' }} />
                  <em className="zw-mono">{v.toFixed(2)}</em>
                </span>
              ))}
              <span className="zw-mono zw-dim">… {(o.dims || 384) - o.sample.length} more</span>
            </div>
          )}
        </div>
      );
    case 'map':
      return <ConcernMap event={event} cards={cards} groups={groups} newId={o.newId ?? run.chat?.id ?? null} />;
    case 'attach':
      return (
        <div className="zw-attach">
          <ConcernMap event={event} cards={[...cards, ...(run.chat ? [run.chat] : [])]} groups={groups} newId={o.newId ?? run.chat?.id ?? null} compact />
          <div className="zw-scores">
            {(o.scores || []).map((s) => (
              <div key={s.id} className={`zw-score ${s.id === o.bundleId ? 'is-top' : ''}`}>
                <span className="t">{s.name || nameOf(s.id)}</span>
                <span className="zw-score-bar"><span style={{ width: `${Math.max(2, s.score * 100)}%` }} /></span>
                <span className="zw-mono">{s.score.toFixed(2)}</span>
              </div>
            ))}
            <p className="zw-fine zw-dim">τ_attach {CONFIG.tauAttach} · δ {CONFIG.delta}{o.tie ? ' · top two within δ — tie-break' : ''}</p>
          </div>
        </div>
      );
    case 'rules':
      return (
        <table className="zw-table">
          <thead><tr><th>cluster</th><th>chats</th><th>days</th><th>cohesion</th><th>result</th></tr></thead>
          <tbody>
            {(o.candidates || []).map((c) => (
              <tr key={c.key}><td className="zw-mono">{c.key}</td><td>{c.chatIds.length}</td><td>{c.days}</td><td>{c.cohesion?.toFixed?.(2) ?? c.cohesion}</td><td className="zw-ok">passes</td></tr>
            ))}
            {(o.rejected || []).map((c, i) => (
              <tr key={c.key || i} className="zw-rej"><td className="zw-mono">{c.key || '—'}</td><td>{c.chatIds?.length ?? '—'}</td><td>{c.days ?? '—'}</td><td>{c.cohesion?.toFixed?.(2) ?? c.cohesion ?? '—'}</td><td>{reasonText(c.reason, c)}</td></tr>
            ))}
          </tbody>
        </table>
      );
    case 'name':
      return (
        <table className="zw-table">
          <thead><tr><th>cluster</th><th>name</th><th>domain</th><th>lang</th><th>sensitive</th></tr></thead>
          <tbody>
            {namesOf(o).map((x, i) => (
              <tr key={x.key || i}>
                <td className="zw-mono">{x.key}</td>
                {x.refuse ? <td colSpan={4} className="zw-dim">refused — {x.reason}</td> : <>
                  <td><b>{x.name}</b>{x.concern ? <div className="zw-fine zw-dim">{x.concern}</div> : null}{x.size ? <div className="zw-fine zw-dim">{x.size} chats</div> : null}</td>
                  <td>{x.domain ?? '—'}</td><td>{x.language ?? '—'}</td><td>{x.sensitive == null ? '—' : x.sensitive ? 'yes' : 'no'}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'gate':
      return (
        <ul className="zw-gates">
          {gatesOf(o).map((g, i) => (
            <li key={g.key || i} className={`is-${g.decision}`}>
              <span className="zw-gate-name">
                {g.decision === 'pass' ? <b>{g.name}</b> : <><s>{g.name}</s> → <b>{g.decision === 'refuse' ? 'refused' : g.replacement}</b></>}
              </span>
              <span className="zw-mono zw-dim">layer {g.layer}{g.term ? ` · ${g.category || 'lexicon'}: ${g.term}` : ''}</span>
              <span className="zw-fine">{g.reason}</span>
            </li>
          ))}
        </ul>
      );
    case 'merge':
      if (run.kind === 'attach' || o.attached !== undefined || o.chatId) {
        const b = o.attached ?? o.bundleId ?? null;
        const list = o.overrides || (o.rule ? [{ rule: 4, detail: o.rule }] : null);
        return (
          <div>
            <p className="zw-fine"><b>{titleOf(run.chat?.id)}</b> → <b>{b ? nameOf(b) : 'no bundle'}</b>{o.runnerUp ? <span className="zw-dim"> · runner-up {nameOf(o.runnerUp)}</span> : null}</p>
            {o.reason && <p className="zw-fine zw-dim">{o.reason}</p>}
            <Overrides list={list} />
          </div>
        );
      }
      return (
        <div>
          <ul className="zw-bundles">
            {(o.bundles || []).map((b) => (
              <li key={b.id}><span className="zw-map-swatch" style={{ background: 'var(--spark)' }} /><b>{nameOf(b.id)}</b><span className="zw-mono zw-dim">{b.chatIds?.length ?? b.size ?? ''} · {b.id}{b.nameSource === 'person' ? ' · yours' : ''}</span></li>
            ))}
          </ul>
          <Overrides list={o.overrides} />
        </div>
      );
    case 'tiebreak':
      return o.skipped ? (
        <p className="zw-fine zw-dim">{o.reason || 'Not needed.'}</p>
      ) : (
        <div>
          <p className="zw-fine">→ <b>{nameOf(o.bundleId ?? o.bundle_id)}</b><span className="zw-dim"> · runner-up {nameOf(o.runnerUp ?? o.runner_up)}</span></p>
          <p className="zw-fine">{o.reason}</p>
        </div>
      );
    default:
      return <pre className="zw-pre">{JSON.stringify(o, null, 2)}</pre>;
  }
}

function reasonText(reason, c) {
  if (reason === 'too_few') return `too few — ${c.chatIds?.length ?? '?'} < ${CONFIG.minSize}`;
  if (reason === 'not_ongoing') return `not ongoing — ${c.days ?? '?'} day${c.days === 1 ? '' : 's'} < ${CONFIG.minDays}`;
  if (reason === 'no_specific_name') return `no specific name${c.detail ? ` — ${c.detail}` : ''}`;
  return reason;
}

function Overrides({ list }) {
  if (!list || !list.length) return <p className="zw-fine zw-dim">Nothing overridden — no corrections to keep yet.</p>;
  return (
    <ul className="zw-overrides">
      {list.map((x, i) => (
        <li key={i}><span className="zw-mono">rule {x.rule}</span><span>{x.detail}</span></li>
      ))}
    </ul>
  );
}

function Json({ label, value, open = false }) {
  const text = useMemo(() => { try { return JSON.stringify(value, null, 2); } catch { return String(value); } }, [value]);
  return (
    <details className="zw-json" open={open}>
      <summary className="zw-mono">{label} <span className="zw-dim">{text.length.toLocaleString()} chars</span></summary>
      <pre className="zw-pre">{text}</pre>
    </details>
  );
}
