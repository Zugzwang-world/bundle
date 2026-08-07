import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChatGlyph, Spark, ZwMark } from '../Icons';

/* ── shared helpers ─────────────────────────────────────────────────── */

export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={`zw-reveal ${className}`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ num, tag, right }) {
  return (
    <>
      <div className="zw-ghost" aria-hidden="true">{num}</div>
      <Reveal>
        <div className="zw-sechead">
          <span className="mono"><b>{num}</b> · {tag}</span>
          <span className="lead" />
          {right && <span className="mono">{right}</span>}
        </div>
      </Reveal>
    </>
  );
}

/* ── §2 · the problem ───────────────────────────────────────────────── */

export function Problem() {
  return (
    <section className="zw-section" id="problem">
      <div className="zw-wrap">
        <SectionHead num="§2" tag="Why this exists" right="Meera, 71 · Mar–Jun" />
        <Reveal>
          <h2 className="zw-h2">Meera has had one conversation for four months.</h2>
        </Reveal>
        <Reveal delay={0.06}>
          <div className="zw-kicker" style={{ marginBottom: 34 }}>
            Her chat index has recorded <strong>nine unrelated items</strong>.
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="zw-prose">
            In March she asks Claude what a defined-contribution pension is. Three weeks later, whether a
            letter from her bank is genuine. In April, how annuities work, and how withdrawals are taxed.
            In May, what the senior citizen savings scheme pays. In June she asks the tax question{' '}
            <strong>again</strong> — not because she forgot the answer, but because she cannot find the
            chat that contains it.
          </p>
          <p className="zw-prose">
            Nine chats, interleaved with recipes and birthday messages, each drifting further down a
            reverse-chronological list as newer chats arrive. The list records transactions; the person is
            having a continuity.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="zw-misses">
            <div className="zw-miss">
              <span className="mono">Misses her · 1</span>
              <h4>Search</h4>
              <p>Works when you know what to look for. The failure isn't recall of words — it's the absence of a place.</p>
            </div>
            <div className="zw-miss">
              <span className="mono">Misses her · 2</span>
              <h4>Projects</h4>
              <p>Excellent when you know in advance. Nobody creates a project on the day of a single pension question.</p>
            </div>
            <div className="zw-miss">
              <span className="mono">Misses her · 3</span>
              <h4>Memory</h4>
              <p>Claude understands her better with each chat. The index she scrolls has no way to show it.</p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="zw-pull">
            The gap is precise: <span className="gold">retroactive, zero-effort structure</span>, for the
            person who will never build structure themselves.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── §7.1 · anatomy ─────────────────────────────────────────────────── */

const ANATOMY = [
  { n: 1, tt: 'Chevron', td: 'Collapse and expand; the state persists per bundle.' },
  { n: 2, tt: 'Name', td: 'Specific or the bundle does not form. Once you rename it, it is yours; Claude never renames it back.' },
  { n: 3, tt: 'Count', td: 'How many chats the bundle holds.' },
  { n: 4, tt: 'The mark ✦', td: 'Formed by Claude. Project sections carry no mark — the difference stays legible at a glance.' },
  { n: 5, tt: 'Bundle menu', td: 'Two verbs, no more: Rename bundle, Hide bundle.' },
  { n: 6, tt: 'Rows', td: 'Ordinary chat rows. Their menus gain exactly one item while bundled: Remove from bundle, shortcut B.' },
];

export function Anatomy() {
  const [lit, setLit] = useState(null);
  const hit = (n) => ({
    className: `anat-hit ${lit === n ? 'is-lit' : ''}`,
    onMouseEnter: () => setLit(n),
    onMouseLeave: () => setLit(null),
    style: { position: 'relative', display: 'inline-flex', alignItems: 'center', padding: '2px 5px' },
  });

  return (
    <section className="zw-section" id="anatomy">
      <div className="zw-wrap">
        <SectionHead num="§7.1" tag="Anatomy of a bundle" right="Fig. 4 · six parts, two verbs" />
        <div className="zw-anatomy">
          <div>
            <Reveal>
              <h2 className="zw-h2">Everything a bundle is, on one card.</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="anat-legend" style={{ marginTop: 30 }}>
                {ANATOMY.map((a) => (
                  <button
                    key={a.n}
                    type="button"
                    className={`anat-item ${lit === a.n ? 'is-lit' : ''}`}
                    onMouseEnter={() => setLit(a.n)}
                    onMouseLeave={() => setLit(null)}
                    onFocus={() => setLit(a.n)}
                    onBlur={() => setLit(null)}
                  >
                    <span className="n">{a.n}</span>
                    <span>
                      <span className="tt">{a.tt}</span>
                      <div className="td">{a.td}</div>
                    </span>
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="anat-card">
              <div className="cl-bundle-head" style={{ gap: 6 }}>
                <span {...hit(1)}>
                  <span className="anat-badge">1</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)', color: 'var(--cl-faint)' }}>
                    <path d="m9 5 8 7-8 7" />
                  </svg>
                </span>
                <span {...hit(2)}>
                  <span className="anat-badge">2</span>
                  <span className="cl-bundle-name">Retirement planning</span>
                </span>
                <span {...hit(3)}>
                  <span className="anat-badge">3</span>
                  <span className="cl-bundle-count">9</span>
                </span>
                <span {...hit(4)}>
                  <span className="anat-badge">4</span>
                  <Spark size={11} />
                </span>
                <span className="grow" style={{ flex: 1 }} />
                <span {...hit(5)}>
                  <span className="anat-badge">5</span>
                  <span style={{ color: 'var(--cl-faint)', letterSpacing: 2, fontSize: 13 }}>···</span>
                </span>
              </div>

              <div {...hit(6)} style={{ display: 'block', position: 'relative', borderRadius: 10 }}>
                <span className="anat-badge" style={{ top: 18 }}>6</span>
                {[
                  ['Questions to ask a financial adviser', 'Jun 26'],
                  ['Pension withdrawal tax rules', 'Jun 9'],
                  ['Senior citizen savings scheme rates', 'May 21'],
                ].map(([t, d]) => (
                  <div key={t} className="cl-row" style={{ paddingLeft: 20 }}>
                    <span className="cl-row-glyph"><ChatGlyph size={14} /></span>
                    <span className="cl-row-title" style={{ cursor: 'default' }}>{t}</span>
                    <span className="cl-row-date">{d}</span>
                  </div>
                ))}
              </div>

              <div style={{ margin: '10px 8px 4px', borderRadius: 10, border: '1px solid var(--cl-hair)', background: '#191816', padding: 5, width: 180 }}>
                <div className="cl-menu-item"><span className="grow">Rename bundle</span></div>
                <div className="cl-menu-item"><span className="grow">Hide bundle</span></div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── §5 · invariants ────────────────────────────────────────────────── */

const INVARIANTS = [
  {
    id: 'INV-1',
    tt: 'The chronological list is never replaced',
    td: 'Bundles render above the chronological list, never instead of it. Every chat remains reachable in time order at all times, bundled or not.',
    pv: 'The person turns Bundle on, can\u2019t find yesterday\u2019s chat where it always was, turns Bundle off — and never touches it again.',
  },
  {
    id: 'INV-2',
    tt: 'A bundle is a view, never a move',
    td: 'Forming, renaming, hiding, or dissolving a bundle changes nothing about any chat: not its place, not its project, not its content. No action on a bundle can lose a chat.',
    pv: '\u201CWhere did my chat go?\u201D — the one question this feature must make unaskable.',
  },
  {
    id: 'INV-3',
    tt: 'Every generated name is correctable',
    td: 'Rename, remove-a-chat, and hide are never more than two clicks from the bundle\u2019s name. A name the person sets is theirs: Claude never overwrites it.',
    pv: 'A wrong, generic, or harmful label standing over a person\u2019s history with no obvious way to answer back.',
  },
  {
    id: 'INV-4',
    tt: 'Bundle sees only what memory sees',
    td: 'Bundle requires memory to be on and reads nothing memory does not already read. Incognito chats never bundle. Project chats never bundle. Turning memory off pauses Bundle with it.',
    pv: 'A feature that quietly enlarges the data question instead of inheriting its answer.',
  },
];

export function Invariants() {
  return (
    <section className="zw-section" id="invariants">
      <div className="zw-wrap">
        <SectionHead num="§5" tag="The rules that do not bend" right="each names the failure it prevents" />
        <Reveal>
          <h2 className="zw-h2">Everything else is a proposal. These four are its spine.</h2>
        </Reveal>
        <div className="zw-invgrid">
          {INVARIANTS.map((inv, i) => (
            <Reveal key={inv.id} delay={i * 0.05}>
              <div className="zw-inv" style={{ height: '100%' }}>
                <span className="mono">{inv.id}</span>
                <h3>{inv.tt}</h3>
                <p>{inv.td}</p>
                <div className="prevents"><b>Prevents</b>{inv.pv}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── correction verbs ───────────────────────────────────────────────── */

export function Verbs() {
  return (
    <section className="zw-section" id="correction">
      <div className="zw-wrap">
        <SectionHead num="G4" tag="Correction is the contract" right="two clicks from the name it answers" />
        <Reveal>
          <h2 className="zw-h2">Your first contribution is optional correction — never construction.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="zw-kicker">
            Bundles form with no setup, no naming, no filing. When Claude gets one wrong, the answer is
            always adjacent: three verbs, each two clicks from the name, each remembered forever.
          </div>
        </Reveal>
        <div className="zw-verbs">
          <Reveal delay={0.05}>
            <div className="zw-verb">
              <div className="vt">Rename <span className="mono">J-3</span></div>
              <p>The name becomes an inline text field, selected. A renamed bundle is settled — Claude never renames it back.</p>
              <div className="demo"><span className="dim">Apartment hunt →</span> Anaya’s flat</div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="zw-verb">
              <div className="vt">Remove <span className="mono">J-4</span></div>
              <p>The row leaves the section and sits in All chats exactly where its date puts it. A removal is remembered.</p>
              <div className="demo">Removed from bundle. <span style={{ color: 'var(--cl-coral)', fontWeight: 620 }}>Undo</span></div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="zw-verb">
              <div className="vt">Hide <span className="mono">J-5</span></div>
              <p>The section is gone; every chat is visible chronologically. A hidden bundle does not reform under another name.</p>
              <div className="demo">Bundle hidden. <span style={{ color: 'var(--cl-coral)', fontWeight: 620 }}>Undo</span></div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── §9 · states ────────────────────────────────────────────────────── */

export function States() {
  return (
    <section className="zw-section" id="states">
      <div className="zw-wrap">
        <SectionHead num="§9" tag="Every screen, every string" right="INV-1, drawn six times" />
        <Reveal>
          <h2 className="zw-h2">Six states. In every one, the list is present and correct.</h2>
        </Reveal>
        <div className="zw-states">
          <Reveal>
            <div className="zw-state">
              <span className="mono">Off — default</span>
              <div className="zw-state-shot">
                <div className="rowx"><ChatGlyph size={12} /> Pension tax rules <span className="dt">Jun 9</span></div>
                <div className="rowx"><ChatGlyph size={12} /> Masala oats recipe <span className="dt">Jun 2</span></div>
              </div>
              <p>The product as it is today, byte for byte. Bundle’s absence is a state, and it is the default one.</p>
            </div>
          </Reveal>
          <Reveal delay={0.04}>
            <div className="zw-state">
              <span className="mono">Generating</span>
              <div className="zw-state-shot">
                <div className="rowx"><span className="cl-spin" /> Finding related chats…</div>
                <div className="bar" style={{ width: '70%' }} />
                <div className="bar" style={{ width: '52%' }} />
              </div>
              <p>Skeletons above, list untouched below. Navigation never waits on generation.</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="zw-state">
              <span className="mono">Ready</span>
              <div className="zw-state-shot">
                <div className="rowx" style={{ color: 'var(--cl-text)', fontWeight: 620 }}>
                  Retirement planning <span className="cl-bundle-count">9</span> <Spark size={9} />
                </div>
                <div className="rowx" style={{ fontSize: 11, color: 'var(--cl-faint)' }}>All chats</div>
              </div>
              <p>Bundles above, All chats beneath. Collapse state persists per bundle.</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="zw-state">
              <span className="mono">Too little history</span>
              <div className="zw-state-shot"><span className="quote">Bundles will appear once you have a few chats about the same thing.</span></div>
              <p>One sentence, no ceremony. The toggle stays on; bundles arrive when they are earned.</p>
            </div>
          </Reveal>
          <Reveal delay={0.04}>
            <div className="zw-state">
              <span className="mono">Memory off</span>
              <div className="zw-state-shot">
                <div className="rowx"><span className="cl-switch is-disabled" style={{ width: 28, height: 16 }}><span className="cl-switch-knob" style={{ width: 12, height: 12, top: 1.5, left: 2 }} /></span> Bundle chats</div>
                <span className="quote">Bundle uses memory to understand your chats. Turn on memory to bundle them.</span>
              </div>
              <p>Disabled with a reason and a door, never a dead control.</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="zw-state">
              <span className="mono">Couldn’t bundle</span>
              <div className="zw-state-shot">
                <span className="quote">Claude couldn’t bundle your chats. Your list is unchanged.</span>
                <span className="btn">Try again</span>
              </div>
              <p>Failure costs nothing: the index is exactly as it was, and retry is one tap.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── §10 · sensitive names ──────────────────────────────────────────── */

const RULES = [
  { n: 'R1', t: <><b>Name the domain, never the struggle.</b> A cluster about a health scare is, at most, <b>Health</b> — never a condition, a symptom, or a diagnosis. The neutral name is deliberately boring; boring is the feature.</> },
  { n: 'R2', t: <><b>Every generated name passes a safety filter</b> before first render. A name that fails is replaced by its domain word; a cluster with no safe name does not form.</> },
  { n: 'R3', t: <><b>Hide is one menu away, and it is total.</b> A hidden bundle does not return, reform, or resurface under a new name.</> },
  { n: 'R4', t: <><b>What memory does not see, Bundle cannot say.</b> Incognito chats never bundle; nothing outside memory’s reach can appear in a name.</> },
  { n: 'R5', t: <><b>In doubt, don’t.</b> An unformed bundle costs a convenience. A wrong label on someone’s life costs trust that does not come back.</> },
];

export function Sensitive() {
  return (
    <section className="zw-section" id="sensitive">
      <div className="zw-wrap">
        <SectionHead num="§10" tag="A label is louder than a chat" right="naming is a safety surface" />
        <div className="zw-sens">
          <div>
            <Reveal>
              <h2 className="zw-h2">A bundle name is printed on the navigation surface.</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="zw-kicker">
                Visible to anyone glancing at a shared screen, a projector, a family laptop. Automatic
                naming of a person’s own history is therefore a safety surface, not a copywriting task —
                and it gets its own rules.
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="zw-rules">
                {RULES.map((r) => (
                  <div key={r.n} className="zw-rule">
                    <span className="rn">{r.n}</span>
                    <span className="rt">{r.t}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <div className="zw-sens-card">
              <div className="cl-bundle-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cl-faint)' }}>
                  <path d="m9 5 8 7-8 7" />
                </svg>
                <span className="cl-bundle-name">Health</span>
                <span className="cl-bundle-count">4</span>
                <Spark size={11} />
                <span style={{ flex: 1 }} />
                <span style={{ color: 'var(--cl-faint)', letterSpacing: 2 }}>···</span>
              </div>
              <div style={{ margin: '8px 10px 6px', borderRadius: 10, border: '1px solid var(--cl-hair)', background: '#191816', padding: 5, width: 190 }}>
                <div className="cl-menu-item"><ChatGlyph size={12} /><span className="grow">Rename bundle</span></div>
                <div className="cl-menu-item" style={{ background: 'var(--cl-hover)' }}><ChatGlyph size={12} /><span className="grow">Hide bundle</span></div>
              </div>
              <p style={{ padding: '10px 10px 6px', fontSize: 12, color: 'var(--cl-faint)', lineHeight: 1.55 }}>
                The domain word, nothing more — the four chats keep their own titles inside; the surface
                stays quiet. And if even the domain word is too loud for this screen, the answer is one
                item down.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── §11 · stability ────────────────────────────────────────────────── */

export function Stability() {
  const ITEMS = [
    ['Names are stable', 'A name changes on exactly two events: you rename it, or you explicitly ask Claude to regenerate. Never silently, never on a schedule.'],
    ['Membership grows; it does not churn', 'New chats join incrementally. Existing chats are never reshuffled between bundles in the background.'],
    ['Corrections are permanent', 'A removed chat stays removed. A hidden bundle stays hidden. Your decisions outrank the model’s next opinion.'],
    ['Order is boring on purpose', 'Bundles sort by most recent activity; chats keep newest-first. No novelty resorting, no “smart” reordering.'],
  ];
  return (
    <section className="zw-section" id="stability">
      <div className="zw-wrap">
        <SectionHead num="§11" tag="Findability is spatial memory" right="conservative by rule" />
        <Reveal>
          <h2 className="zw-h2">A group that keeps changing is worse than no group.</h2>
        </Reveal>
        <div className="zw-stab">
          {ITEMS.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.04}>
              <div className="zw-stab-item" style={{ height: '100%' }}>
                <div className="st">{t}</div>
                <p>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── §13 · scope ────────────────────────────────────────────────────── */

export function Scope() {
  const NOT = [
    'Not a new place chats live',
    'No “Miscellaneous” bucket — the list is the honest residue',
    'Never touches Projects',
    'Not on mobile in v1',
    'No merge & split',
    'One chat, one bundle',
    'No knowledge base, no instructions — a shelf, not a room',
  ];
  return (
    <section className="zw-section" id="scope">
      <div className="zw-wrap">
        <SectionHead num="§13" tag="Named, so absence reads as intent" right="out of scope for v1" />
        <Reveal>
          <h2 className="zw-h2">Deliberately small. That is the point.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="zw-chips">
            {NOT.map((n) => <span key={n} className="zw-chip">{n}</span>)}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="zw-v2">
            The continuity prize — starting a new chat <b>from</b> a bundle that already knows the story —
            is deferred so v1 stays a pure view with zero write-behaviour. It is the obvious v2, and it
            deserves its own specification.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── §8 · journeys strip ────────────────────────────────────────────── */

const JS = [
  ['J-1', 'Turning Bundle on'],
  ['J-2', 'A new chat joins its bundle'],
  ['J-3', 'Renaming a bundle'],
  ['J-4', 'Removing a chat'],
  ['J-5', 'Hiding a bundle'],
  ['J-6', 'Turning Bundle off'],
  ['J-7', 'The memory dependency'],
];

export function Journeys() {
  return (
    <section className="zw-section" id="journeys">
      <div className="zw-wrap">
        <SectionHead num="§8" tag="Step-wise, in Meera's hands" right="all seven are operable" />
        <Reveal>
          <h2 className="zw-h2">Seven journeys. The prototype walks every one.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="zw-jstrip">
            {JS.map(([id, t]) => (
              <div key={id} className="zw-j">
                <span className="mono">{id}</span>
                <h4>{t}</h4>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── final CTA + footer ─────────────────────────────────────────────── */

export function FinalCta() {
  return (
    <section className="zw-section" id="try">
      <div className="zw-wrap zw-final" style={{ padding: 0 }}>
        <Reveal>
          <Spark size={26} className="zw-hero-spark" />
          <h2 className="zw-h2 display">Walk Meera’s four months yourself.</h2>
          <div className="zw-final-sub">Flip the toggle. Rename a bundle. Try to lose a chat — you can’t.</div>
          <div className="zw-hero-ctas">
            <Link className="zw-cta is-primary" to="/prototype">Open the prototype <span aria-hidden="true">→</span></Link>
            <a className="zw-cta is-ghost" href="/Bundle_ZW-FS-001_v1_0.pdf" target="_blank" rel="noreferrer">Read the full spec (PDF)</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="zw-footer">
      <div className="zw-wrap">
        <div className="zw-footer-top">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--bone-dim)' }}>
            <ZwMark size={22} />
            <span className="mono" style={{ fontSize: 10 }}>The Zugzwang Foundation</span>
          </span>
          <span className="grow" />
          <span className="mono" style={{ fontSize: 10 }}>ZW-FS-001 · v1.0 · Published</span>
        </div>
        <p>
          Bundle — a feature specification for Claude, published by the Zugzwang Foundation
          (zugzwangworld.com) · An independent proposal. The Zugzwang Foundation is not affiliated with,
          commissioned by, or endorsed by Anthropic. “Claude” is used nominatively to name the product
          this proposal addresses; all interface depictions are illustrative reconstructions, not
          screenshots. Product facts verified against the live product on 2026-08-06; Claude ships
          gradually, and individual accounts may differ. ·{' '}
          <a href="/Bundle_ZW-FS-001_v1_0.pdf" target="_blank" rel="noreferrer">Specification (PDF)</a>
        </p>
      </div>
    </footer>
  );
}
