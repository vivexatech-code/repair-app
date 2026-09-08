/**
 * Canonical booking time windows — single source for the user app schedule UI.
 * Only `busySlots` in Firestore marks occupancy; all others are treated as available.
 *
 * `slotIndex` must match `technicians/{id}/busySlots/{YYYY-MM-DD}_{slotIndex}` suffix.
 */
export const BOOKING_DAY_SLOTS = Object.freeze([
  { slotIndex: 1, slot: '8:00 - 9:00' },
  { slotIndex: 2, slot: '9:00 - 10:00' },
  { slotIndex: 3, slot: '10:00 - 11:00' },
  { slotIndex: 4, slot: '11:00 - 12:00' },
  { slotIndex: 5, slot: '12:00 - 1:00' },
  { slotIndex: 6, slot: '1:00 - 2:00' },
  { slotIndex: 7, slot: '2:00 - 3:00' },
  { slotIndex: 8, slot: '3:00 - 4:00' },
  { slotIndex: 9, slot: '4:00 - 5:00' },
  { slotIndex: 10, slot: '5:00 - 6:00' },
]);

/** Local wall-clock hour when each slot begins (matches labels above). */
export const BOOKING_SLOT_START_HOUR_LOCAL = Object.freeze({
  1: 8,
  2: 9,
  3: 10,
  4: 11,
  5: 12,
  6: 13,
  7: 14,
  8: 15,
  9: 16,
  10: 17,
});

/** `yyyy-MM-dd` in local timezone */
export function formatLocalDateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * True when the slot start time on `dateStr` is not after `now` (local wall clock).
 */
export function isSlotPastForDate(dateStr, slotIndex, now = new Date()) {
  const idx = Number(slotIndex);
  const h = BOOKING_SLOT_START_HOUR_LOCAL[idx];
  if (h == null) return true;
  const parts = String(dateStr ?? '').trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return true;
  const [y, m, d] = parts;
  const slotStart = new Date(y, m - 1, d, h, 0, 0, 0);
  return slotStart.getTime() <= now.getTime();
}

export function isPastDateKey(dateStr, now = new Date()) {
  return String(dateStr ?? '').trim() < formatLocalDateKey(now);
}
