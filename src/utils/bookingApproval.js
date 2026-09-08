/**
 * Technician → customer approval using existing Firestore: `extrasApprovalRequest`.
 *
 * Shape (do not rename):
 * extrasApprovalRequest: {
 *   proposedAddOnServices?: { serviceId?, serviceName, price }[],
 *   proposedAdditionalServices?: { serviceId?, serviceName, price }[],
 *   status: 'pending' | 'approved' | 'rejected',
 *   requestedAt?,
 *   technicianId?,
 * }
 */

import {
  EXTRAS_APPROVAL_REQUEST_STATUS,
  BOOKING_SERVICE_ADDON_KIND,
} from '../constants';

function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.round(x * 100) / 100;
}

export function getExtrasApprovalRequest(booking) {
  const ear = booking?.extrasApprovalRequest;
  if (!ear || typeof ear !== 'object') return null;
  return ear;
}

export function normalizeExtrasApprovalStatus(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

export function hasPendingExtrasApproval(booking) {
  const ear = getExtrasApprovalRequest(booking);
  if (!ear) return false;
  return (
    normalizeExtrasApprovalStatus(ear.status) === EXTRAS_APPROVAL_REQUEST_STATUS.PENDING
  );
}

/** Back-compat alias used across UI. */
export function hasPendingCustomerApproval(booking) {
  return hasPendingExtrasApproval(booking);
}

export function normalizeAddonServiceType(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === BOOKING_SERVICE_ADDON_KIND.EXTRA) return BOOKING_SERVICE_ADDON_KIND.EXTRA;
  return BOOKING_SERVICE_ADDON_KIND.ADDITIONAL;
}

export function addonServiceTypeLabel(serviceType) {
  const t = normalizeAddonServiceType(serviceType);
  if (t === BOOKING_SERVICE_ADDON_KIND.EXTRA) return 'Extra Service';
  return 'Additional Service';
}

function mapProposedRow(item) {
  if (!item || typeof item !== 'object') return null;
  const serviceId =
    item.serviceId != null ? String(item.serviceId).trim() : '';
  const serviceName = String(
    item.serviceName ?? item.name ?? item.title ?? '',
  ).trim();
  const price = roundMoney(item.price ?? item.amount ?? 0);
  if (!serviceName && price <= 0) return null;
  return {
    serviceId: serviceId || undefined,
    serviceName: serviceName || 'Service',
    price,
  };
}

export function normalizeProposedAddOnServices(booking) {
  const ear = getExtrasApprovalRequest(booking);
  const raw = ear?.proposedAddOnServices ?? ear?.proposed_add_on_services;
  if (!Array.isArray(raw)) return [];
  return raw.map(mapProposedRow).filter(Boolean);
}

export function normalizeProposedAdditionalServices(booking) {
  const ear = getExtrasApprovalRequest(booking);
  const raw = ear?.proposedAdditionalServices ?? ear?.proposed_additional_services;
  if (!Array.isArray(raw)) return [];
  return raw.map(mapProposedRow).filter(Boolean);
}

export function sumProposedAddOnAmount(booking) {
  return normalizeProposedAddOnServices(booking).reduce(
    (s, r) => s + roundMoney(r.price),
    0,
  );
}

export function sumProposedAdditionalAmount(booking) {
  return normalizeProposedAdditionalServices(booking).reduce(
    (s, r) => s + roundMoney(r.price),
    0,
  );
}

/** Customer total if they approve: original + proposed extras + proposed additional. */
export function getProposedBookingTotalWithExtras(booking, originalAmount) {
  if (!hasPendingExtrasApproval(booking)) return null;
  const orig = roundMoney(originalAmount);
  return roundMoney(
    orig + sumProposedAddOnAmount(booking) + sumProposedAdditionalAmount(booking),
  );
}

/**
 * While extras approval is pending, payable total excludes unapproved proposed lines.
 */
export function getCommittedCustomerTotalWhilePending(booking, addOnsNormalized, baseAmount) {
  if (!hasPendingExtrasApproval(booking)) return null;
  const explicit = roundMoney(booking?.totalAmount);
  if (explicit > 0) return explicit;
  const b = roundMoney(baseAmount);
  const addSum = (addOnsNormalized || []).reduce(
    (s, a) => s + roundMoney(a?.price),
    0,
  );
  return roundMoney(b + addSum);
}

export function extrasApprovalWasRejected(booking) {
  if (hasPendingExtrasApproval(booking)) return false;
  const ear = getExtrasApprovalRequest(booking);
  if (!ear) return false;
  return (
    normalizeExtrasApprovalStatus(ear.status) === EXTRAS_APPROVAL_REQUEST_STATUS.REJECTED
  );
}

export function countPendingProposedLines(booking) {
  return (
    normalizeProposedAddOnServices(booking).length +
    normalizeProposedAdditionalServices(booking).length
  );
}
