/**
 * SERVER COPY — must match `src/utils/bookingEconomicsCore.js`.
 * Adjust both files together if formulas change.
 *
 * Platform fee applies ONLY on service price (not visiting charge).
 * Visiting charge belongs to the company, not the technician.
 */

'use strict';

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

function sanitizePercent(raw, fallback = 0) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, n));
}

function sanitizeMoney(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function sumAddOnPrices(addOnRows) {
  if (!Array.isArray(addOnRows)) return 0;
  return addOnRows.reduce((acc, row) => {
    const qty = Number(row?.quantity) || 1;
    const v = Number(row?.price ?? row?.amount ?? 0);
    return acc + (Number.isFinite(v) && v > 0 ? v * qty : 0);
  }, 0);
}

function computeFrozenEconomics(opts) {
  const servicePrice = sanitizeMoney(
    opts.servicePrice ?? opts.originalBookingAmount,
  );
  const visitingCharge = sanitizeMoney(opts.visitingCharge);
  const addedServicesAmount = sanitizeMoney(opts.addedServicesAmount);
  const pctPlat = sanitizePercent(opts.platformFeePercent, 0);
  const pctAddon = sanitizePercent(opts.addonFeePercent, 0);

  const customerBaseTotal = sanitizeMoney(servicePrice + visitingCharge);
  const finalBookingAmount = sanitizeMoney(
    customerBaseTotal + addedServicesAmount,
  );

  const platformFeeAmount = sanitizeMoney((servicePrice * pctPlat) / 100);
  const addonFeeAmount = sanitizeMoney((addedServicesAmount * pctAddon) / 100);
  const technicianFinalEarning = sanitizeMoney(
    servicePrice - platformFeeAmount + addedServicesAmount - addonFeeAmount,
  );
  const companyEarnings = sanitizeMoney(
    platformFeeAmount + visitingCharge + addonFeeAmount,
  );
  const totalDeduction = sanitizeMoney(
    finalBookingAmount - technicianFinalEarning,
  );
  const platformFinalEarning = companyEarnings;

  return {
    servicePrice,
    visitingCharge,
    originalBookingAmount: servicePrice,
    customerBaseTotal,
    addedServicesAmount,
    finalBookingAmount,
    platformFeePercent: pctPlat,
    addonFeePercent: pctAddon,
    platformFeeAmount,
    addonFeeAmount,
    totalDeduction,
    technicianFinalEarning,
    companyEarnings,
    platformFinalEarning,
  };
}

module.exports = {
  sanitizePercent,
  sanitizeMoney,
  sumAddOnPrices,
  computeFrozenEconomics,
};
