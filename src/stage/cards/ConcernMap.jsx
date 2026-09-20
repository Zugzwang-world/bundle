// The concern map — every chat a dot, near dots joined (B8). d3-force lays it out once,
// synchronously (a few hundred ticks for 40 nodes is a couple of ms), so React only
// renders positions; the new chat's node animates in with framer-motion.
import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { CONFIG } from '../../engine/config.js';

export const W = 600;
export const H = 320;

// Document-world palette for bundles; unknown / not-yet-formed = faint grey.
const PALETTE = ['#e2b96f', '#7fb3a5', '#c98b8b', '#8f9fcb', '#b0a0d8', '#b7a06b', '#9fbf8a'];
const GREY = '#6d685f';

function groupColour(groupKeys) {
  const keys = [...groupKeys].filter(Boolean).sort();
  const map = new Map(keys.map((k, i) => [k, PALETTE[i % PALETTE.length]]));
  return (k) => (k ? map.get(k) || GREY : GREY);
}

function layout(nodes, links, newId) {
  const n = nodes.length || 1;
  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id((d) => d.id).distance((l) => 40 + (1 - l.score) * 140).strength((l) => 0.3 + l.score * 0.6))
    .force('charge', forceManyBody().strength(-70))
    .force('center', forceCenter(W / 2, H / 2))
    .force('collide', forceCollide(9))
    .stop();
  // Deterministic start: a ring, so the same life draws the same map twice (D11 in spirit).
  nodes.forEach((d, i) => {
    const a = (i / n) * Math.PI * 2;
    d.x = W / 2 + Math.cos(a) * 110;
    d.y = H / 2 + Math.sin(a) * 90;
    if (d.id === newId) { d.x = 24; d.y = 24; }
  });
  const ticks = Math.min(300, 60 + n * 5);
  for (let i = 0; i < ticks; i++) sim.tick();
  const pad = 12;
  for (const d of nodes) {
    d.x = Math.max(pad, Math.min(W - pad, d.x));
    d.y = Math.max(pad, Math.min(H - pad, d.y));
  }
  return nodes;
}

/**
 * @param {{ event: StageEvent|null, cards: Chat[], groups: Map<string,string>|null, newId?: string|null, tauEdge?: number, compact?: boolean }} props
 *   groups — chatId → bundle id, once bundles exist (colours the dots); null before formation.
 */
export default function ConcernMap({ event, cards = [], groups = null, newId = null, tauEdge = CONFIG.tauEdge, compact = false }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(null);
  const out = event?.output || {};
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const theNew = newId ?? out.newId ?? null;

  const { nodes, links, colour } = useMemo(() => {
    const raw = Array.isArray(out.nodes) && out.nodes.length ? out.nodes : cards.map((c) => ({ id: c.id, title: c.title, group: null }));
    const nodes = raw.map((d) => ({
      id: d.id,
      title: d.title || byId.get(d.id)?.title || d.id,
      group: groups?.get(d.id) ?? d.group ?? null,
    }));
    const ids = new Set(nodes.map((d) => d.id));
    const links = (out.edges || [])
      .filter((e) => e.score >= tauEdge && ids.has(e.a) && ids.has(e.b))
      .map((e) => ({ source: e.a, target: e.b, score: e.score }));
    layout(nodes, links, theNew);
    return { nodes, links, colour: groupColour(nodes.map((d) => d.group)) };
  }, [out.nodes, out.edges, cards, groups, tauEdge, theNew, byId]);

  // Neighbour list beneath: the new chat's top-3 (form: keyed by id; attach: a flat array).
  const near = useMemo(() => {
    const nb = out.neighbours;
    if (!nb) return null;
    if (Array.isArray(nb)) return nb.slice(0, 3);
    if (theNew && nb[theNew]) return nb[theNew].slice(0, 3);
    return null;
  }, [out.neighbours, theNew]);

  const hovered = hover ? nodes.find((d) => d.id === hover) : null;

  return (
    <div className={`zw-map ${compact ? 'is-compact' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="zw-map-svg" role="img" aria-label="Concern map: chats as dots, similar chats joined">
        <g className="zw-map-links">
          {links.map((l, i) => (
            <line
              key={i}
              x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
              stroke="currentColor"
              strokeOpacity={0.12 + (l.score - tauEdge) * 1.2}
              strokeWidth={0.8 + l.score}
            />
          ))}
        </g>
        <g className="zw-map-nodes">
          {nodes.map((d) => {
            const isNew = d.id === theNew;
            const r = isNew ? 7 : 5;
            const fill = colour(d.group);
            const common = {
              r,
              fill,
              stroke: isNew ? 'var(--bone)' : 'var(--ink)',
              strokeWidth: isNew ? 2 : 1,
              onMouseEnter: () => setHover(d.id),
              onMouseLeave: () => setHover((h) => (h === d.id ? null : h)),
              style: { cursor: 'default' },
            };
            return isNew ? (
              <motion.circle
                key={d.id}
                {...common}
                initial={reduce ? { cx: d.x, cy: d.y, opacity: 1 } : { cx: 18, cy: 18, opacity: 0 }}
                animate={{ cx: d.x, cy: d.y, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              >
                <title>{d.title}</title>
              </motion.circle>
            ) : (
              <circle key={d.id} {...common} cx={d.x} cy={d.y} opacity={hover && hover !== d.id ? 0.55 : 1}>
                <title>{d.title}</title>
              </circle>
            );
          })}
        </g>
        {hovered && (
          <g transform={`translate(${Math.min(hovered.x + 10, W - 190)}, ${Math.max(hovered.y - 14, 12)})`} pointerEvents="none">
            <rect x={0} y={-11} width={Math.min(190, hovered.title.length * 6.4 + 12)} height={20} rx={4} fill="var(--ink)" stroke="var(--hair-strong)" />
            <text x={6} y={3} className="zw-map-tip">{hovered.title.length > 28 ? hovered.title.slice(0, 27) + '…' : hovered.title}</text>
          </g>
        )}
      </svg>
      <div className="zw-map-foot">
        <span className="zw-mono">{nodes.length} chats · {links.length} edges ≥ τ_edge {tauEdge}</span>
        {near && near.length > 0 && (
          <ol className="zw-map-near">
            {near.map((n) => (
              <li key={n.id}>
                <span className="zw-map-swatch" style={{ background: colour(groups?.get(n.id) ?? nodes.find((d) => d.id === n.id)?.group) }} />
                <span className="t">{byId.get(n.id)?.title || nodes.find((d) => d.id === n.id)?.title || n.id}</span>
                <span className="zw-mono s">{n.score.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
