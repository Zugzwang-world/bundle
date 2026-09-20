import { CONCERNS, MEERA_CHATS, FRESH_CHATS, INCOMING_CHATS } from '../data/chats';

/*
  Stability merge — HANDOVER B6, rules in order, applied over the reducer state.
  Pure: no React, no I/O. The reducer stores what this returns (BUNDLES_FORMED),
  and the Merge stage card renders `overrides` — what the person's corrections and
  the freeze rule overrode in the model's proposal.

  mergeBundles(prevState, formed, chatsById?) → { bundles, overrides }

    prevState  the reducer state (reads names, removed, hidden, bundles, liveChats)
    formed     { clusters: [{ key, chatIds, centroid?, cohesion, days }],
                 names:    [{ key, name, domain, language, sensitive, concern }] }
               one names entry per cluster; a cluster without one was refused by the
               namer / gate and is dropped (override 'no_specific_name').
    chatsById  optional { [id]: chat } used for the fixture-concern id rule; defaults
               to the demo data + prevState.liveChats.

  Rules (B6):
    1. A bundle whose id has a person-set name keeps it; the model's name is discarded.
    2. A chat in `removed` is dropped from any cluster the model puts it in.
    3. A bundle in `hidden` is still returned (flagged) so its id, name and membership
       stay stable; selectIndex is what keeps it off the screen.
    4. (Attach — lives in the reducer's BUNDLE_ATTACHED, not here.)
    5. Names are frozen: each cluster is matched to a previous bundle by member overlap
       and, when matched, reuses that bundle's id, name and nameSource. Unmatched
       clusters get a new id and the model's name.

  Overlap measure: |A ∩ B| / min(|A|, |B|) ≥ 0.5 — the share of the smaller set's
  members that the other contains. Chosen over Jaccard because a bundle that grew by
  attach (4 → 9 members) must still freeze its name on the next run; Jaccard would
  put that at 4/9 and let the name churn. Matches are assigned greedily by descending
  score, ties by previous-bundle order then cluster order, one previous bundle per
  cluster and vice versa — deterministic for identical input (D11).

  Ids: a matched cluster reuses the previous id. Otherwise, if ≥ 50 % of members share
  a fixture `concern` key present in CONCERNS, the id is that key (so corrections keyed
  by 'retirement' etc. survive the first engine run); else 'b_' + cluster.key. An id
  already taken in this run falls back to 'b_' + cluster.key, so ids are unique.
*/

const OVERLAP = 0.5;

function defaultChatsById(prevState) {
  const map = {};
  for (const ch of [...MEERA_CHATS, ...FRESH_CHATS, ...INCOMING_CHATS, ...(prevState?.liveChats || [])]) {
    map[ch.id] = ch;
  }
  return map;
}

export function overlapScore(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const id of A) if (B.has(id)) shared += 1;
  return shared / Math.min(A.size, B.size);
}

// Majority fixture concern among members, or null.
export function majorityConcern(chatIds, chatsById) {
  const tally = {};
  for (const id of chatIds) {
    const key = chatsById[id]?.concern;
    if (key && CONCERNS[key]) tally[key] = (tally[key] || 0) + 1;
  }
  const best = Object.entries(tally).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
  if (!best) return null;
  return best[1] / chatIds.length >= OVERLAP ? best[0] : null;
}

export function mergeBundles(prevState, formed, chatsById = defaultChatsById(prevState)) {
  const removed = prevState?.removed || {};
  const hidden = prevState?.hidden || {};
  const personNames = prevState?.names || {};
  const prevBundles = prevState?.bundles || [];
  const overrides = [];
  const namesByKey = new Map((formed?.names || []).map((n) => [n.key, n]));

  // Rule 2 first, so overlap and majority are computed on what can actually render.
  const clusters = [];
  for (const cluster of formed?.clusters || []) {
    const proposal = namesByKey.get(cluster.key);
    if (!proposal || !proposal.name) {
      overrides.push({
        rule: 'no_specific_name',
        detail: `Cluster ${cluster.key} (${cluster.chatIds.length} chats) had no specific name and was not formed.`,
        clusterKey: cluster.key,
      });
      continue;
    }
    const dropped = cluster.chatIds.filter((id) => removed[id]);
    const chatIds = [...new Set(cluster.chatIds.filter((id) => !removed[id]))];
    if (dropped.length) {
      overrides.push({
        rule: 'removed',
        detail: `${dropped.join(', ')} stayed out of cluster ${cluster.key}: removed by the person.`,
        clusterKey: cluster.key,
        chatIds: dropped,
      });
    }
    if (chatIds.length === 0) continue; // an emptied cluster simply isn't there
    clusters.push({ cluster, proposal, chatIds });
  }

  // Rule 5 — match clusters to previous bundles by member overlap, best pairs first.
  const pairs = [];
  clusters.forEach((c, ci) => {
    prevBundles.forEach((p, pi) => {
      const score = overlapScore(c.chatIds, p.chatIds);
      if (score >= OVERLAP) pairs.push({ ci, pi, score });
    });
  });
  pairs.sort((x, y) => y.score - x.score || x.pi - y.pi || x.ci - y.ci);
  const matchOf = new Map(); // ci -> prev bundle
  const takenPrev = new Set();
  for (const { ci, pi } of pairs) {
    if (matchOf.has(ci) || takenPrev.has(pi)) continue;
    matchOf.set(ci, prevBundles[pi]);
    takenPrev.add(pi);
  }

  const usedIds = new Set();
  const bundles = clusters.map(({ cluster, proposal, chatIds }, ci) => {
    const prev = matchOf.get(ci) || null;
    let id;
    if (prev && !usedIds.has(prev.id)) {
      id = prev.id;
    } else {
      const key = majorityConcern(chatIds, chatsById);
      id = key && !usedIds.has(key) ? key : `b_${cluster.key}`;
      if (usedIds.has(id)) id = `b_${cluster.key}_${ci}`;
    }
    usedIds.add(id);

    let name = proposal.name;
    let nameSource = 'model';
    if (personNames[id]) {
      // Rule 1 — the person's name is settled.
      name = personNames[id];
      nameSource = 'person';
      if (proposal.name !== name) {
        overrides.push({
          rule: 'person_name',
          detail: `Kept "${name}" (renamed by the person); the model proposed "${proposal.name}".`,
          bundleId: id,
          proposed: proposal.name,
          kept: name,
        });
      }
    } else if (prev) {
      // Rule 5 — frozen after first render.
      name = prev.name;
      nameSource = prev.nameSource || 'model';
      if (proposal.name !== name) {
        overrides.push({
          rule: 'name_frozen',
          detail: `Kept "${name}" from the earlier run; the model proposed "${proposal.name}".`,
          bundleId: id,
          proposed: proposal.name,
          kept: name,
        });
      }
    }

    const isHidden = Boolean(hidden[id]);
    if (isHidden) {
      // Rule 3 — the bundle exists (so its id and name stay stable) but never renders.
      overrides.push({
        rule: 'hidden',
        detail: `"${name}" re-formed but stays hidden; its chats stay in the list.`,
        bundleId: id,
      });
    }

    return {
      id,
      name,
      nameSource,
      domain: proposal.domain ?? prev?.domain ?? null,
      language: proposal.language ?? prev?.language ?? null,
      sensitive: Boolean(proposal.sensitive ?? prev?.sensitive ?? false),
      concern: proposal.concern ?? prev?.concern ?? '',
      chatIds,
      hidden: isHidden,
      clusterKey: cluster.key,
      cohesion: cluster.cohesion ?? null,
      days: cluster.days ?? null,
    };
  });

  return { bundles, overrides };
}
