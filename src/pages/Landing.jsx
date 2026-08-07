import { Link } from 'react-router-dom';
import { Spark } from '../components/Icons';
import HeroGather from '../components/landing/HeroGather';
import MiniDemo from '../components/landing/MiniDemo';
import {
  Anatomy, FinalCta, Footer, Invariants, Journeys, Problem, Reveal,
  Scope, SectionHead, Sensitive, Stability, States, Verbs,
} from '../components/landing/sections';

export default function Landing() {
  return (
    <div className="zw-page">
      <header className="zw-runhead">
        <span className="mono zw-runhead-org">Zugzwang Foundation · Product suggestions</span>
        <span className="grow" />
        <a className="zw-runlink mono" href="/Bundle_ZW-FS-001_v1_0.pdf" target="_blank" rel="noreferrer">Spec.pdf</a>
        <Link className="zw-runlink zw-runcta mono" to="/prototype">Open prototype →</Link>
      </header>

      {/* ── Hero ── */}
      <section className="zw-hero">
        <div className="zw-wrap">
          <Reveal>
            <span className="mono zw-hero-eyebrow">An independent feature proposal for Claude · ZW·FS·001</span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="display">Bundle</h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="zw-hero-sub">
              Automatic, reversible grouping for scattered conversations. One toggle on the chat index —
              and <b>nothing moves, ever</b>.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <div className="zw-hero-ctas">
              <Link className="zw-cta is-primary" to="/prototype">Open the prototype <span aria-hidden="true">→</span></Link>
              <a className="zw-cta is-ghost" href="#problem">Read the case <span aria-hidden="true">↓</span></a>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="zw-figure">
              <HeroGather />
              <div className="zw-figcap">
                <b>Figure 1</b> — Four months, nine chats, one concern. The list records transactions;
                the person is having a continuity. Bundle gives the continuity a place and a name.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Problem />

      {/* ── §7 · what Bundle adds — live ── */}
      <section className="zw-section" id="live">
        <div className="zw-wrap">
          <SectionHead num="§7" tag="The proposal" right="one toggle, two surfaces" />
          <Reveal>
            <h2 className="zw-h2">One toggle. Off, nothing changes.</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="zw-kicker">
              On, bundles render as sections <strong>above</strong> the chronological list — the same
              visual grammar as project sections, marked <Spark size={10} /> because Claude formed them.
              The list continues beneath, complete, under <strong>All chats</strong>.
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="zw-figure" style={{ paddingTop: 40 }}>
              <span className="zw-live-tag"><span className="zw-live-dot" />Live — flip it</span>
              <MiniDemo />
              <div className="zw-figcap">
                <b>Figure 3</b> — The same nine chats, both ways. Three concerns get places; everything
                else stays exactly where it was. This one is real: the full prototype is one click away.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Anatomy />
      <Invariants />
      <Verbs />
      <States />
      <Sensitive />
      <Stability />
      <Scope />
      <Journeys />
      <FinalCta />
      <Footer />
    </div>
  );
}
