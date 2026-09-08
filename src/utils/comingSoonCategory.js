/** Mirrors adminpanel-repairseries `normalizeComingSoonCategory`. */

export function normalizeComingSoonCategory(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  if (v === 'commercial' || v === 'commercial services') return 'commercial';
  return 'main';
}

export function splitComingSoonByCategory(list) {
  const main = [];
  const commercial = [];
  for (const svc of Array.isArray(list) ? list : []) {
    if (normalizeComingSoonCategory(svc?.comingSoonCategory) === 'commercial') {
      commercial.push(svc);
    } else {
      main.push(svc);
    }
  }
  return { main, commercial };
}
