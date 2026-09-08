/**
 * Structured logs for debugging (dev only — no noise in production builds).
 */
export function devLog(scope, ...args) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(`[RepairSeries:${scope}]`, ...args);
}

export function devWarn(scope, ...args) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.warn(`[RepairSeries:${scope}]`, ...args);
}

function authClock() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** Temporary auth timeline. Dev only. Never log tokens or OTPs. */
export function authTimeline(event, extra) {
  if (!__DEV__) return;
  const suffix = extra && typeof extra === 'object' ? extra : extra != null ? { detail: extra } : undefined;
  // eslint-disable-next-line no-console
  console.log(`[AUTH ${authClock()}]`, event, suffix || '');
}
