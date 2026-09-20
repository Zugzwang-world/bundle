import { describe, it, expect, vi, afterEach } from 'vitest';
import { gateLayer1, gateName } from '../src/safety/gate.js';
import { lexiconHit, looksLikePersonName, CONDITIONS, MEDICATIONS, SYMPTOMS, INTIMATE, PLACE_BRAND_ALLOWLIST } from '../src/safety/lexicon.js';
import { isNonName } from '../src/engine/name.js';

const SAFE_DOMAINS = new Set(['Health', 'Finances', 'Legal', 'Personal']);

// [name, domain the namer reported]
const MUST_NEVER_RENDER = [
  ['Diabetes management', 'Health'],
  ['Chemo side effects', 'Health'],
  ['Sertraline dosage', 'Health'],
  ['Chest pain', 'Health'],
  ['Ravi Sharma', 'Personal'],
  ['Anxiety attacks', 'Health'],
  ['IVF cycle', 'Health'],
  ['Miscarriage recovery', 'Health'],
  ['Divorce lawyer', 'Legal'],
  ['Debt collectors', 'Finances'],
  ['Metformin', 'Health'],
  ['Knee replacement', 'Health'],
  ['HIV test', 'Health'],
  ['Panic attacks', 'Health'],
  ['Migraine triggers', 'Health'],
  ['Thyroid results', 'Health'],
  ['Blood pressure log', 'Health'],
  ['Depression support', 'Health'],
  ['Alcohol addiction', 'Health'],
  ['Rehab options', 'Health'],
  ['Bankruptcy filing', 'Finances'],
  ['Loan default notices', 'Finances'],
  ['Custody battle', 'Legal'],
  ['Restraining order', 'Legal'],
  ['Meera’s Knee', 'Health'],
  ['Chats with Priya Deshpande', 'Personal'],
  ['John Smith', 'Personal'],
  ['Ozempic weight loss', 'Health'],
  ['Cataract surgery', 'Health'],
  ['Breast cancer screening', 'Health'],
  ['Suicidal thoughts', 'Health'],
  ['Insomnia remedies', 'Health'],
  ['Cholesterol diet', 'Health'],
  ['Dementia care', 'Health'],
  ['Biopsy results', 'Health'],
  ['Affair suspicions', 'Personal'],
  ['मधुमेह उपचार', 'Health'],
  ['Talaq process', 'Legal'],
  ['Kavitha Nadar', 'Personal'],
  ['', 'Health'],
  ['Health and diet', 'Health'],
  ['Legal notices', 'Legal'],
  ['Finances after layoff', 'Finances'],
  ['Medical appointments', 'Health'], // sensitive health cluster → at most Health
];

const MUST_PASS = [
  'Retirement planning', 'Apartment hunt', 'Spanish practice', 'Health', 'Finances', 'Legal', 'Bookclub notes', 'Weekend trips',
  'Masala recipes', 'Hearing aid setup', 'Dadar flat search', 'Pension paperwork', 'Duolingo Spanish', 'Balcony plants',
  'निवृत्ती नियोजन', 'Mutual funds', 'Tax saver FD', 'Senior citizen savings', 'Mumbai brokers', 'Lonavala trip', 'Spanish grammar',
  'Housing', 'Languages', 'Morning walks', 'Kitchen repairs', 'Annuity comparisons', 'Retirement Planning', 'Spanish Practice',
  'Apartment Hunt', 'Google Docs tips', 'Tata Motors shares', 'Zerodha Coin', 'Birthday messages', 'Gift ideas',
];

describe('gateLayer1 — names that must never render as given', () => {
  it.each(MUST_NEVER_RENDER)('%s', (name, domain) => {
    const r = gateLayer1({ name, domain, sensitive: true });
    expect(r.decision).not.toBe('pass');
    expect(r.decision).toBe('downgrade');
    expect(SAFE_DOMAINS.has(r.replacement) || r.replacement === domain).toBe(true);
    expect(r.replacement).not.toBe(name);
    expect(typeof r.reason).toBe('string');
    expect(r.reason.length).toBeGreaterThan(0);
  });
  it('has at least 30 cases', () => expect(MUST_NEVER_RENDER.length).toBeGreaterThanOrEqual(30));

  it('health hits downgrade to Health regardless of the reported domain', () => {
    expect(gateLayer1({ name: 'Chest pain', domain: 'Fitness' }).replacement).toBe('Health');
    expect(gateLayer1({ name: 'Metformin', domain: '' }).replacement).toBe('Health');
  });
  it('money and legal intimate hits map to Finances / Legal', () => {
    expect(gateLayer1({ name: 'Debt collectors', domain: 'Health' }).replacement).toBe('Finances');
    expect(gateLayer1({ name: 'Divorce lawyer', domain: 'Housing' }).replacement).toBe('Legal');
  });
  it('a person name downgrades to the safe domain, else Personal', () => {
    expect(gateLayer1({ name: 'Ravi Sharma', domain: 'Housing' }).replacement).toBe('Housing');
    expect(gateLayer1({ name: 'Ravi Sharma', domain: 'Meera Joshi' }).replacement).toBe('Personal');
    expect(gateLayer1({ name: 'Ravi Sharma', domain: 'Diabetes' }).replacement).toBe('Personal');
    expect(gateLayer1({ name: 'Ravi Sharma', domain: '' }).replacement).toBe('Personal');
  });
  it('the domain word is a ceiling (B7 · Name, D5)', () => {
    expect(gateLayer1({ name: 'Health and diet', domain: 'Health', sensitive: true })).toMatchObject({ decision: 'downgrade', replacement: 'Health' });
    expect(gateLayer1({ name: 'Legal notices', domain: 'Legal', sensitive: false }).replacement).toBe('Legal');
    expect(gateLayer1({ name: 'Morning walks', domain: 'Health', sensitive: true }).replacement).toBe('Health');
    expect(gateLayer1({ name: 'Morning walks', domain: 'Health', sensitive: false }).decision).toBe('pass');
    expect(gateLayer1({ name: 'Retirement planning', domain: 'Finances', sensitive: true }).decision).toBe('pass');
    expect(gateLayer1({ name: 'Health', domain: 'Health', sensitive: true }).decision).toBe('pass');
  });
  it('the replacement itself always passes layer 1', () => {
    for (const [name, domain] of MUST_NEVER_RENDER) {
      const r = gateLayer1({ name, domain });
      expect(gateLayer1({ name: r.replacement, domain }).decision).toBe('pass');
    }
  });
});

describe('gateLayer1 — names that must pass', () => {
  it.each(MUST_PASS)('%s', (name) => {
    const r = gateLayer1({ name, domain: 'Something', sensitive: false });
    expect(r.decision).toBe('pass');
    expect(r.replacement).toBeUndefined();
  });
  it('has at least 20 cases', () => expect(MUST_PASS.length).toBeGreaterThanOrEqual(20));
});

describe('lexicon', () => {
  it('has the required sizes', () => {
    expect(CONDITIONS.length).toBeGreaterThanOrEqual(60);
    expect(MEDICATIONS.length).toBeGreaterThanOrEqual(30);
    expect(SYMPTOMS.length).toBeGreaterThanOrEqual(30);
    expect(INTIMATE.length).toBeGreaterThanOrEqual(15);
    expect(PLACE_BRAND_ALLOWLIST.length).toBeGreaterThanOrEqual(40);
  });
  it('matches on word boundaries with plurals, case-insensitively', () => {
    expect(lexiconHit('Panic attacks')).toMatchObject({ hit: true, term: 'panic attack', category: 'symptom' });
    expect(lexiconHit('METFORMIN timing')).toMatchObject({ hit: true, category: 'medication' });
    expect(lexiconHit('Standard deduction')).toMatchObject({ hit: false }); // 'std' must not match inside 'standard'
    expect(lexiconHit('Tibetan cooking')).toMatchObject({ hit: false }); // 'tb' must not match inside 'tibetan'
    expect(lexiconHit('Hearing aid setup')).toMatchObject({ hit: false });
    expect(lexiconHit('Health')).toMatchObject({ hit: false });
  });
  it('matches Devanagari and transliterated condition words', () => {
    expect(lexiconHit('मधुमेह').hit).toBe(true);
    expect(lexiconHit('घटस्फोट').domain).toBe('Legal');
    expect(lexiconHit('bukhar aur khansi').hit).toBe(true);
    expect(lexiconHit('निवृत्ती नियोजन').hit).toBe(false);
  });
  it('looksLikePersonName', () => {
    for (const n of ['Ravi Sharma', "Meera's Knee", 'Priya Deshpande', 'John Smith', 'Chats with Ravi Sharma', 'Kavitha Nadar']) {
      expect(looksLikePersonName(n), n).toBe(true);
    }
    for (const n of ['Retirement Planning', 'Spanish Practice', 'Apartment Hunt', 'Dadar Station', 'Tata Motors', 'Google Docs',
      'Mutual Funds', 'Senior Citizen', 'Tax Saver FD', 'Duolingo Spanish', 'Zerodha Coin', 'Lonavala Trip', 'Balcony Plants',
      'Hearing Aid Setup', 'Health', 'ravi sharma', 'निवृत्ती नियोजन', 'SCSS Rates']) {
      expect(looksLikePersonName(n), n).toBe(false);
    }
  });
});

describe('isNonName', () => {
  it('rejects the non-names', () => {
    for (const n of ['Miscellaneous', 'General', 'Other', 'Misc', 'Various', 'Random', 'misc', 'OTHER', ' general ', 'Other chats', 'Miscellaneous topics', '', null, undefined]) {
      expect(isNonName(n), String(n)).toBe(true);
    }
  });
  it('accepts real names', () => {
    for (const n of ['Retirement planning', 'Health', 'Spanish practice', 'General knowledge quiz nights', 'Otherworldly fiction']) {
      expect(isNonName(n), n).toBe(false);
    }
  });
});

describe('gateName (no network)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('short-circuits at layer 1 without calling Claude', async () => {
    const fetch = vi.fn(() => { throw new Error('must not be called'); });
    vi.stubGlobal('fetch', fetch);
    const r = await gateName({ name: 'Diabetes management', domain: 'Health', sensitive: true }, [{ title: 'HbA1c results' }]);
    expect(r).toMatchObject({ decision: 'downgrade', name: 'Health', layer: 1, raw: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when Claude is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    const r = await gateName({ name: 'Retirement planning', domain: 'Finances', sensitive: false }, []);
    expect(r).toMatchObject({ decision: 'downgrade', name: 'Finances', layer: 2, reason: 'gate unavailable', raw: null });
  });

  it('passes a name through when layer 2 says pass', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'tool_use', name: 'emit_gate', input: { decision: 'pass', reason: 'Names an activity.' } }], usage: {} }),
    })));
    const r = await gateName({ name: 'Spanish practice', domain: 'Languages', sensitive: false }, []);
    expect(r).toMatchObject({ decision: 'pass', name: 'Spanish practice', layer: 2, reason: 'Names an activity.' });
    expect(r.raw.response.content[0].name).toBe('emit_gate');
  });

  it('guards a layer-2 replacement that is itself unsafe', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'tool_use', name: 'emit_gate', input: { decision: 'downgrade', replacement: 'Diabetes', reason: 'x' } }], usage: {} }),
    })));
    const r = await gateName({ name: 'Sugar levels', domain: 'Health', sensitive: false }, []);
    expect(r).toMatchObject({ decision: 'downgrade', name: 'Health', layer: 2 });
  });
});
