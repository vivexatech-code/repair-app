import { DEFAULT_REVISIT_POLICY, normalizeRevisitPolicy, validityToDays } from './revisitPolicyShared';

export { DEFAULT_REVISIT_POLICY, normalizeRevisitPolicy, validityToDays };

function resolveCompletedAt(booking) {
  const raw = booking?.completedAt;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') {
    const d = raw.toDate();
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (raw?.seconds != null) {
    const d = new Date(Number(raw.seconds) * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinValidityWindow(booking, policy) {
  if (policy.type !== 'time_based') return true;
  const completedAt = resolveCompletedAt(booking);
  if (!completedAt) return true;
  const windowDays = validityToDays(policy.validityValue, policy.validityUnit);
  const expires = completedAt.getTime() + windowDays * 24 * 60 * 60 * 1000;
  return Date.now() <= expires;
}

function readDirectRemaining(booking) {
  const direct =
    booking?.revisitRemaining ??
    booking?.remainingRevisits ??
    booking?.freeRevisitsRemaining ??
    booking?.revisitEligibility?.remaining;
  if (direct == null || !Number.isFinite(Number(direct))) return null;
  return Math.max(0, Math.round(Number(direct)));
}

/**
 * How many free revisits remain on a completed parent booking.
 * Uses booking snapshot first, then live service policy fallback.
 */
export function getRevisitRemaining(booking, servicePolicy) {
  if (!booking) return 0;
  const policy = normalizeRevisitPolicy(
    booking.revisitPolicy || servicePolicy || DEFAULT_REVISIT_POLICY,
  );

  const direct = readDirectRemaining(booking);
  const history = Array.isArray(booking.revisitHistory) ? booking.revisitHistory : [];
  const used = history.length;

  // Explicit counters on the booking mean revisit was enabled at completion/create time.
  const policyActive =
    policy.enabled === true ||
    (direct != null && (booking.revisitPolicy != null || servicePolicy != null)) ||
    (direct != null && direct > 0);

  if (!policyActive && direct == null) return 0;

  if (direct != null) {
    if (!isWithinValidityWindow(booking, policy)) return 0;
    return direct;
  }

  if (!policy.enabled && !servicePolicy) return 0;
  if (!policy.enabled) return 0;

  if (policy.type === 'fixed_count') {
    return Math.max(0, policy.freeRevisitCount - used);
  }

  // time_based
  const completedAt = resolveCompletedAt(booking);
  if (!completedAt) return 0;
  if (!isWithinValidityWindow(booking, policy)) return 0;
  if (policy.maxRevisitsInPeriod > 0) {
    return Math.max(0, policy.maxRevisitsInPeriod - used);
  }
  return Math.max(0, (policy.freeRevisitCount || 1) - used);
}

export function getBookingTechnicianId(booking) {
  const candidates = [
    booking?.technicianId,
    booking?.assignedTechnicianId,
    booking?.techId,
    booking?.technician?.id,
    booking?.technicianUid,
  ];
  for (const c of candidates) {
    const id = c != null ? String(c).trim() : '';
    if (id) return id;
  }
  return '';
}

export function isBookingCompleted(booking) {
  return String(booking?.status || '').trim().toLowerCase() === 'completed';
}

export function canClaimRevisit(booking, servicePolicy) {
  if (!booking) return false;
  if (!isBookingCompleted(booking)) return false;
  if (booking?.isRevisit === true) return false;
  if (!getBookingTechnicianId(booking)) return false;
  return getRevisitRemaining(booking, servicePolicy) > 0;
}
