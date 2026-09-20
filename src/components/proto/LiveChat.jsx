import { useState } from 'react';
import { useBundle } from '../../state/store';
import { hasKey, config } from '../../engine/anthropic';
import { reply } from '../../engine/reply';
import { card } from '../../engine/card';

const SUGGESTED =
  'My bank says the SCSS interest is credited quarterly — should I move part of it to a 5-year tax-saver FD instead?';

/* v0.2 beat 1 — a real chat. Claude answers, then writes the card (title + summary).
   The card is dispatched as a chat; the list beneath never moves. */
export default function LiveChat() {
  const { state, dispatch } = useBundle();
  const [text, setText] = useState(SUGGESTED);
  const [stage, setStage] = useState('idle'); // idle | reply | card | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const busy = stage === 'reply' || stage === 'card';

  async function send() {
    const msg = text.trim();
    if (!msg || busy) return;
    setError(null);
    setResult(null);
    try {
      setStage('reply');
      const r = await reply(msg);
      setStage('card');
      const c = await card(msg, r.output);
      const chat = {
        id: `live-${Date.now()}`,
        title: c.output.title,
        summary: c.output.summary,
        date: 'today',
        concern: c.output.concern || null,
        project: null,
        source: 'new',
      };
      dispatch({ type: 'CHAT_CREATED', chat });
      setResult({ reply: r.output, card: c.output, ms: { reply: r.ms, card: c.ms } });
      setStage('done');
      setText('');
    } catch (e) {
      setError(e.message);
      setStage('error');
    }
  }

  return (
    <div className="dr-live">
      <div className="lb" style={{ marginBottom: 6 }}>
        New chat · real reply <span className="sub mono" style={{ fontSize: 9, color: 'var(--bone-faint)' }}>{config.model} · {config.mode}</span>
      </div>
      <textarea
        className="dr-ta"
        rows={3}
        value={text}
        disabled={!hasKey() || busy || state.scenario === 'fresh'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
        placeholder="Ask Claude anything…"
      />
      <button
        type="button"
        className="dr-btn"
        disabled={!hasKey() || busy || !text.trim() || state.scenario === 'fresh'}
        onClick={send}
      >
        {stage === 'reply' ? 'Claude is replying…' : stage === 'card' ? 'Claude writes the card…' : 'Send'}
        <span className="sub">Reply → Card → list</span>
      </button>
      {error && <p className="dr-fine" style={{ color: '#e07a5f' }}>Couldn't reach Claude: {error}</p>}
      {result && (
        <div className="dr-live-out">
          <div className="sub mono" style={{ fontSize: 9, color: 'var(--bone-faint)' }}>
            CARD · {result.ms.reply} ms reply · {result.ms.card} ms card
          </div>
          <div className="dr-live-title">{result.card.title}</div>
          <div className="dr-live-sum">{result.card.summary}</div>
          <div className="sub mono" style={{ fontSize: 9, color: 'var(--bone-faint)', marginTop: 4 }}>
            PLACED → {result.card.concern || 'none'}
            {result.card.runner_up ? ` · runner-up ${result.card.runner_up}` : ''}
          </div>
          <div className="dr-live-sum" style={{ opacity: 0.8 }}>{result.card.reason}</div>
          <details style={{ marginTop: 6 }}>
            <summary className="sub mono" style={{ fontSize: 9, cursor: 'pointer' }}>REPLY</summary>
            <div className="dr-live-sum" style={{ whiteSpace: 'pre-wrap' }}>{result.reply}</div>
          </details>
        </div>
      )}
    </div>
  );
}
