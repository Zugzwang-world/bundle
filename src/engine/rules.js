// The formation standard as code: size ≥ minSize, distinct days ≥ minDays.
// Nameability is decided later by Name refusing or not; it is not a rule here.

// Distinct calendar days across a cluster's chats. 'today' is one day.
export function distinctDays(chatIds, chatsById) {
  const days = new Set();
  for (const id of chatIds) {
    const chat = chatsById instanceof Map ? chatsById.get(id) : chatsById?.[id];
    const d = chat?.date;
    if (d) days.add(d);
  }
  return days.size;
}

/**
 * @returns {{ candidates: Cluster[], rejected: { cluster: Cluster, reason: 'too_few'|'not_ongoing' }[] }}
 * Sets `days` on every cluster. Size is checked first, so a tiny cluster on one day is 'too_few'.
 */
export function applyRules(clusters, chatsById, config) {
  const candidates = [];
  const rejected = [];
  for (const cluster of clusters) {
    cluster.days = distinctDays(cluster.chatIds, chatsById);
    if (cluster.chatIds.length < config.minSize) rejected.push({ cluster, reason: 'too_few' });
    else if (cluster.days < config.minDays) rejected.push({ cluster, reason: 'not_ongoing' });
    else candidates.push(cluster);
  }
  return { candidates, rejected };
}
