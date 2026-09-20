// Demo data for the Bundle prototype.
// Titles and dates follow the spec's figures (ZW-FS-001 §2, Fig. 1/3/7); the rest
// fills out a believable four months of one person's index.
//
// Summaries live in meera.json, generated once by scripts/gen-summaries.mjs
// (`npm run gen:summaries`); ids/titles/dates here are the source of truth and the
// json only contributes `summary`, matched by id. A chat missing from the json gets ''.

import meera from './meera.json' with { type: 'json' };

export const CONCERNS = {
  retirement: { key: 'retirement', defaultName: 'Retirement planning' },
  apartment: { key: 'apartment', defaultName: 'Apartment hunt' },
  spanish: { key: 'spanish', defaultName: 'Spanish practice' },
  health: { key: 'health', defaultName: 'Health' },
};

const SUMMARIES = new Map(
  [...(meera.meera || []), ...(meera.incoming || []), ...(meera.fresh || [])].map((ch) => [ch.id, ch.summary || '']),
);

// `concern` is a fixture hint for the simulated path only; the engine never reads it.
const c = (id, title, date, concern = null, project = null) => ({
  id,
  title,
  summary: SUMMARIES.get(id) || '',
  date,
  concern,
  project,
  source: 'fixture',
});

// Dates are 2026. Labels are derived (e.g. "Jun 26").
export const MEERA_CHATS = [
  // ── Retirement planning · 9 (Fig. 1) ──────────────────────────────
  c('r1', 'Questions to ask a financial adviser', '2026-06-26', 'retirement'),
  c('r2', 'Pension withdrawal tax rules', '2026-06-09', 'retirement'),
  c('r3', 'Senior citizen savings scheme rates', '2026-05-21', 'retirement'),
  c('r4', 'Monthly budget on a fixed income', '2026-05-03', 'retirement'),
  c('r5', 'Tax on pension withdrawals', '2026-04-15', 'retirement'),
  c('r6', 'How annuities work', '2026-04-08', 'retirement'),
  c('r7', 'Is this bank letter about my pension genuine', '2026-04-02', 'retirement'),
  c('r8', 'EPF withdrawal rules after retirement', '2026-03-20', 'retirement'),
  c('r9', 'Defined benefit vs defined contribution', '2026-03-12', 'retirement'),

  // ── Apartment hunt · 5 ────────────────────────────────────────────
  c('a1', 'Two-bedroom flats near Dadar station', '2026-05-12', 'apartment'),
  c('a2', 'Are broker fees negotiable in Mumbai', '2026-05-08', 'apartment'),
  c('a3', 'Carpet area vs built-up area', '2026-04-24', 'apartment'),
  c('a4', 'Registration and stamp duty basics', '2026-04-19', 'apartment'),
  c('a5', 'Society transfer charges — who pays', '2026-04-11', 'apartment'),

  // ── Spanish practice · 12 ─────────────────────────────────────────
  c('s1', 'Ser vs estar, again', '2026-06-24', 'spanish'),
  c('s2', 'Past tense of ir', '2026-06-18', 'spanish'),
  c('s3', 'Ordering food politely in Spanish', '2026-06-12', 'spanish'),
  c('s4', 'Subjunctive triggers list', '2026-06-04', 'spanish'),
  c('s5', 'Practice dialogue: at the pharmacy', '2026-05-27', 'spanish'),
  c('s6', 'Por vs para with examples', '2026-05-18', 'spanish'),
  c('s7', 'Rolling the double r', '2026-05-09', 'spanish'),
  c('s8', 'Numbers above one thousand', '2026-04-30', 'spanish'),
  c('s9', 'Days, months and dates drill', '2026-04-21', 'spanish'),
  c('s10', 'Common false friends', '2026-04-12', 'spanish'),
  c('s11', 'Greetings for a video call', '2026-03-30', 'spanish'),
  c('s12', 'Is Duolingo enough at seventy', '2026-03-16', 'spanish'),

  // ── Health scare · 4 (v0.2, A5) — exists so the safety gate has something to downgrade ──
  c('h1', 'Is this chest tightness after walking serious', '2026-03-18', 'health'),
  c('h2', 'What does a borderline HbA1c result mean', '2026-04-09', 'health'),
  c('h3', 'Amlodipine making my ankles swell — should I stop', '2026-05-06', 'health'),
  c('h4', 'Cardiologist referral — what happens at the first visit', '2026-06-11', 'health'),

  // ── Ungrouped — the honest residue (Fig. 3) ───────────────────────
  c('u1', 'Draft a birthday message for Ravi', '2026-06-22'),
  c('u2', 'Recipe for masala oats', '2026-06-02'),
  c('u3', 'Reset a hearing aid that keeps beeping', '2026-05-30'),
  c('u4', 'Word for the feeling of missing a place', '2026-05-15'),
  c('u5', 'What does deductible mean', '2026-04-28'),
  c('u6', 'Photo of a balcony plant — what is it', '2026-04-06'),
  c('u7', 'Weekend trip ideas near Lonavala', '2026-03-28'),
  c('u8', 'Knee exercises after morning walks', '2026-03-24'),

  // ── Project: bookclub/notes (never candidates, INV-4) ─────────────
  c('p1', 'October reading shortlist', '2026-06-28', null, 'bookclub/notes'),
  c('p2', 'Discussion questions, ch. 4', '2026-06-15', null, 'bookclub/notes'),
];

// A new account with too little history (§9 · "Too little history").
export const FRESH_CHATS = [
  c('f1', 'Feedback on a cover letter', '2026-08-05'),
  c('f2', 'Fix a leaky kitchen tap', '2026-08-03'),
  c('f3', 'Gift ideas under ₹500', '2026-07-30'),
  c('f4', 'What is a mutual fund', '2026-07-28'),
];

// J-2 — chats that can "arrive" during the demo, in order.
export const INCOMING_CHATS = [
  c('n1', 'Compare two annuity quotes', 'today', 'retirement'),
  c('n2', 'Practice: booking a taxi in Spanish', 'today', 'spanish'),
  c('n3', 'Is a nominee different from an heir', 'today', 'retirement'),
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateLabel(date) {
  if (date === 'today') return 'Today';
  const [, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function sortKey(date) {
  return date === 'today' ? '9999-99-99' : date;
}

export const byNewest = (a, b) => sortKey(b.date).localeCompare(sortKey(a.date));
