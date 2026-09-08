export { colors } from './colors';
export { spacing, radius, shadows } from './spacing';
export { typography } from './typography';

export const APP_NAME = 'Repair Series';

export const BOOKING_STATUS = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  /** Exact Firestore value — do not lowercase. */
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const SERVICE_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  COMING_SOON: 'Coming Soon',
};

export const TECHNICIAN_STATUS = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
};

/** Values on `booking.extrasApprovalRequest.status` (existing Firestore field). */
export const EXTRAS_APPROVAL_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

/** Persisted on approved `addOnServices` rows (`serviceType`) after user approves extras request. */
export const BOOKING_SERVICE_ADDON_KIND = Object.freeze({
  EXTRA: 'extra',
  ADDITIONAL: 'additional',
});
