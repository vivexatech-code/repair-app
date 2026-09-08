import { sanitizeMoney, sanitizePercent, BOOKING_ECONOMICS_FIELDS } from './bookingEconomicsCore';

/**
 * Read-only: returns stored economics from the booking document.
 * Do not recompute fees from live settings — use this for Admin, Technician, and Details UIs.
 *
 * @param {Record<string, unknown>|null|undefined} booking
 * @returns {null | {
 *   originalBookingAmount: number,
 *   addedServicesAmount: number,
 *   finalBookingAmount: number,
 *   platformFeePercent: number,
 *   addonFeePercent: number,
 *   platformFeeAmount: number,
 *   addonFeeAmount: number,
 *   totalDeduction: number,
 *   technicianFinalEarning: number,
 *   platformFinalEarning: number,
 *   economicsSnapshotAt: unknown,
 * }}
 */
export function getFrozenBookingEconomics(booking) {
  if (!booking) return null;
  const b = booking;
  if (b[BOOKING_ECONOMICS_FIELDS.economicsSnapshotAt] == null) return null;

  const originalBookingAmount = sanitizeMoney(
    b[BOOKING_ECONOMICS_FIELDS.originalBookingAmount],
  );
  const addedServicesAmount = sanitizeMoney(
    b[BOOKING_ECONOMICS_FIELDS.addedServicesAmount],
  );
  const finalBookingAmount = sanitizeMoney(
    b[BOOKING_ECONOMICS_FIELDS.finalBookingAmount],
  );
  const platformFeePercent = sanitizePercent(
    b[BOOKING_ECONOMICS_FIELDS.platformFeePercent],
    0,
  );
  const addonFeePercent = sanitizePercent(
    b[BOOKING_ECONOMICS_FIELDS.addonFeePercent],
    0,
  );
  const platformFeeAmount = sanitizeMoney(
    b[BOOKING_ECONOMICS_FIELDS.platformFeeAmount],
  );
  const addonFeeAmount = sanitizeMoney(b[BOOKING_ECONOMICS_FIELDS.addonFeeAmount]);
  const totalDeduction = sanitizeMoney(b[BOOKING_ECONOMICS_FIELDS.totalDeduction]);
  const technicianFinalEarning = sanitizeMoney(
    b[BOOKING_ECONOMICS_FIELDS.technicianFinalEarning],
  );
  const platformFinalEarning = sanitizeMoney(
    b[BOOKING_ECONOMICS_FIELDS.platformFinalEarning],
  );

  return {
    originalBookingAmount,
    addedServicesAmount,
    finalBookingAmount,
    platformFeePercent,
    addonFeePercent,
    platformFeeAmount,
    addonFeeAmount,
    totalDeduction,
    technicianFinalEarning,
    platformFinalEarning,
    economicsSnapshotAt: b[BOOKING_ECONOMICS_FIELDS.economicsSnapshotAt],
  };
}

export function formatInrWhole(amount) {
  const n = sanitizeMoney(amount);
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function getFrozenEconomicsStaffRows(booking) {
  const econ = getFrozenBookingEconomics(booking);
  if (!econ) return null;
  return [
    { key: 'orig', label: 'Original Booking Amount', value: formatInrWhole(econ.originalBookingAmount) },
    { key: 'add', label: 'Added Services Amount', value: formatInrWhole(econ.addedServicesAmount) },
    { key: 'final', label: 'Final Booking Amount', value: formatInrWhole(econ.finalBookingAmount) },
    { key: 'pPct', label: 'Platform Fee %', value: `${econ.platformFeePercent}%` },
    { key: 'aPct', label: 'Add-on Fee %', value: `${econ.addonFeePercent}%` },
    { key: 'pAmt', label: 'Platform Fee Amount', value: formatInrWhole(econ.platformFeeAmount) },
    { key: 'aAmt', label: 'Add-on Fee Amount', value: formatInrWhole(econ.addonFeeAmount) },
    { key: 'ded', label: 'Total Deduction', value: formatInrWhole(econ.totalDeduction) },
    { key: 'tech', label: 'Technician Final Earning', value: formatInrWhole(econ.technicianFinalEarning) },
    { key: 'plat', label: 'Platform Final Earning', value: formatInrWhole(econ.platformFinalEarning) },
  ];
}
