import { BOOKING_ECONOMICS_FIELDS } from './bookingEconomicsCore';
import { getCommittedCustomerTotalWhilePending } from './bookingApproval';

/** Booking has immutable economics frozen at completion (never re-read live settings). */
export function hasBookingEconomicsSnapshot(booking) {
  return booking?.[BOOKING_ECONOMICS_FIELDS.economicsSnapshotAt] != null;
}

/**
 * Normalize Firestore Timestamp, Date, or plain { seconds } to epoch ms.
 */
export function timestampToMillis(t) {
  if (t == null) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'number' && !Number.isNaN(t)) return t;
  if (typeof t.seconds === 'number') {
    return t.seconds * 1000 + (t.nanoseconds || 0) / 1e6;
  }
  return null;
}

/**
 * "Total Time: N mins" from booking.startTime / booking.endTime (completed jobs).
 */
export function getCompletedServiceDurationLabel(booking) {
  const start = timestampToMillis(booking?.startTime);
  const end = timestampToMillis(booking?.endTime);
  if (start == null || end == null || end < start) return null;
  const mins = Math.max(1, Math.round((end - start) / 60000));
  return `${mins} mins`;
}

export function formatScheduledDateLabel(booking) {
  const direct = booking?.date || booking?.scheduledDate;
  if (direct) return direct;
  const ts = booking?.scheduledAt;
  if (ts?.toDate) {
    return ts.toDate().toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return 'Date TBD';
}

export function formatScheduledTimeLabel(booking) {
  const direct = booking?.time || booking?.scheduledTime;
  if (direct) return direct;
  const ts = booking?.scheduledAt;
  if (ts?.toDate) {
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return null;
}

/** When technician marked service start (`serviceStartedAt`). */
export function formatServiceStartedAtLabel(booking) {
  const ms = timestampToMillis(booking?.serviceStartedAt);
  if (ms == null) return null;
  try {
    return new Date(ms).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/**
 * Normalize add-on rows from Firestore (addOnServices or legacy snake_case).
 * Each item: { serviceName, price }
 */
export function normalizeAddOnServices(booking) {
  const raw = booking?.addOnServices ?? booking?.add_on_services;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const serviceName = String(
        item?.serviceName ?? item?.name ?? item?.title ?? '',
      ).trim();
      const price = Number(item?.price ?? item?.amount ?? 0);
      const stRaw = item?.serviceType ?? item?.service_type ?? item?.type;
      const st = String(stRaw ?? '').trim().toLowerCase();
      const serviceType =
        st === 'extra' ? 'extra' : st === 'additional' ? 'additional' : null;
      return {
        serviceName,
        price: Number.isFinite(price) ? price : 0,
        ...(serviceType ? { serviceType } : {}),
      };
    })
    .filter((row) => row.serviceName.length > 0 || row.price > 0);
}

/**
 * Amount for the originally booked service line (before technician add-ons).
 */
export function getBookingBaseAmount(booking) {
  if (!booking) return 0;
  if (hasBookingEconomicsSnapshot(booking)) {
    const o = Number(booking[BOOKING_ECONOMICS_FIELDS.originalBookingAmount]);
    if (Number.isFinite(o) && o >= 0) return o;
  }
  const candidates = [
    booking.originalBookingAmount,
    booking.originalAmount,
    booking.baseAmount,
    booking.serviceAmount,
    booking.amount,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const addOns = normalizeAddOnServices(booking);
  const addSum = addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const total = Number(booking.totalAmount);
  if (Number.isFinite(total) && addSum > 0 && total >= addSum) {
    return total - addSum;
  }
  return 0;
}

/**
 * Final payable total: prefer server totalAmount, else base + sum(add-ons).
 */
export function getBookingFinalTotal(booking, addOns, baseAmount) {
  if (!booking) return 0;
  if (hasBookingEconomicsSnapshot(booking)) {
    const f = Number(booking[BOOKING_ECONOMICS_FIELDS.finalBookingAmount]);
    if (Number.isFinite(f) && f >= 0) return f;
  }
  const committedPending = getCommittedCustomerTotalWhilePending(
    booking,
    addOns,
    baseAmount,
  );
  if (committedPending != null) return committedPending;
  const explicit = Number(booking.totalAmount);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const addSum = (addOns || []).reduce((s, a) => s + (Number(a.price) || 0), 0);
  const base = Number.isFinite(baseAmount) ? baseAmount : 0;
  return base + addSum;
}

/** Fallback copy for bookings created before snapshot fields existed. */
const BOOKING_LABEL_FALLBACK = {
  category: 'Category not recorded',
  customerName: 'Customer not recorded',
  customerPhone: 'Phone not recorded',
};

/** Service title from booking snapshot (legacy + nested service). */
export function getBookingDisplayServiceName(booking) {
  if (!booking) return 'Service';
  const s = String(booking?.serviceName ?? '').trim();
  return (
    s ||
    String(booking?.service?.name ?? '').trim() ||
    String(booking?.title ?? '').trim() ||
    'Service'
  );
}

export function getBookingDisplayCategoryName(booking) {
  if (!booking) return BOOKING_LABEL_FALLBACK.category;
  const s = String(booking?.categoryName ?? '').trim();
  return s || BOOKING_LABEL_FALLBACK.category;
}

export function getBookingDisplayCustomerName(booking) {
  if (!booking) return BOOKING_LABEL_FALLBACK.customerName;
  const s = String(booking?.customerName ?? '').trim();
  return s || BOOKING_LABEL_FALLBACK.customerName;
}

export function getBookingDisplayCustomerPhone(booking) {
  if (!booking) return BOOKING_LABEL_FALLBACK.customerPhone;
  const s = String(booking?.customerPhone ?? '').trim();
  return s || BOOKING_LABEL_FALLBACK.customerPhone;
}

export function getBookingDisplayCustomerEmail(booking) {
  return String(booking?.customerEmail ?? '').trim();
}
