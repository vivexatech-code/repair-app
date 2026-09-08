/**
 * Repair Series Cloud Functions
 *
 * HTTP replacements live on the website (Vercel / Next.js `testing/`):
 *   POST /api/bookings/confirm-payment
 *   POST /api/bookings/freeze-economics
 *   POST /api/notifications/send
 *   GET/POST /api/notifications/process-outbox
 *
 * Do not delete `freezeBookingEconomicsOnComplete` until every completion
 * path is confirmed to call the Vercel freeze endpoint. It is idempotent.
 */
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const {
  sanitizePercent,
  sanitizeMoney,
  sumAddOnPrices,
  computeFrozenEconomics,
} = require('./bookingEconomicsLogic');

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const SETTINGS_GENERAL = 'settings/general';
const BOOKING_STATUS_COMPLETED = 'Completed';

/** @typedef {FirebaseFirestore.Firestore} Firestore */
/** @typedef {FirebaseFirestore.DocumentReference} DocRef */

/**
 * Service price only — platform fee base (excludes visiting charge).
 */
function deriveServicePrice(booking) {
  const keys = ['servicePrice', 'originalBookingAmount', 'amount', 'baseAmount', 'serviceAmount'];
  for (const k of keys) {
    const n = sanitizeMoney(booking[k]);
    if (n > 0) return n;
  }
  return 0;
}

function deriveVisitingCharge(booking) {
  return sanitizeMoney(booking?.visitingCharge);
}

function getAddOnArray(booking) {
  return booking?.addOnServices ?? booking?.add_on_services ?? [];
}

/**
 * When totalAmount is trusted and original is known, infer add-ons as remainder.
 */
function deriveAddedServicesAmount(booking, servicePrice, visitingCharge) {
  const direct = sanitizeMoney(booking?.addedServicesAmount);
  if (direct > 0) return direct;
  const fromRows = sumAddOnPrices(getAddOnArray(booking));
  if (fromRows > 0) return fromRows;
  const total = sanitizeMoney(booking?.totalAmount);
  const base = sanitizeMoney(servicePrice + visitingCharge);
  if (total > 0 && base > 0 && total >= base) {
    return sanitizeMoney(total - base);
  }
  return 0;
}

/**
 * Secure customer RS-app payment confirmation.
 * Prefer POST /api/bookings/confirm-payment on Vercel; this callable remains as fallback.
 */
exports.confirmCustomerPayment = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }

  const bookingId = String(request.data?.bookingId ?? '').trim();
  if (!bookingId) {
    throw new HttpsError('invalid-argument', 'Missing bookingId');
  }

  const bookingRef = db.doc(`bookings/${bookingId}`);
  const uid = request.auth.uid;

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(bookingRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Booking not found');
    }

    const data = snap.data() || {};
    if (String(data.customerId ?? '') !== String(uid)) {
      throw new HttpsError('permission-denied', 'Not allowed');
    }

    const pr = data.paymentRequest;
    if (!pr || String(pr.status ?? '').toLowerCase() !== 'pending') {
      throw new HttpsError('failed-precondition', 'No pending payment request');
    }
    if (String(pr.method ?? '').toLowerCase() !== 'rs_app') {
      throw new HttpsError('failed-precondition', 'Unsupported payment method');
    }
    if (!String(data.completionPhoto?.url ?? '').trim()) {
      throw new HttpsError(
        'failed-precondition',
        'Technician has not submitted completion photo yet',
      );
    }

    const paidStatus = String(data.paymentStatus ?? '').toLowerCase();
    if (paidStatus === 'paid') {
      throw new HttpsError('failed-precondition', 'Payment already confirmed');
    }

    txn.update(bookingRef, {
      paymentStatus: 'paid',
      paymentMethod: 'rs_app',
      paidAt: FieldValue.serverTimestamp(),
      paymentConfirmedAt: FieldValue.serverTimestamp(),
      status: BOOKING_STATUS_COMPLETED,
      completedAt: FieldValue.serverTimestamp(),
      paymentRequest: {
        ...pr,
        status: 'paid',
        paidAt: FieldValue.serverTimestamp(),
        confirmedBy: uid,
        confirmSource: 'confirmCustomerPayment',
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, bookingId };
});

/**
 * First transition to Completed: freeze economics once (immutable).
 */
exports.freezeBookingEconomicsOnComplete = onDocumentUpdated(
  'bookings/{bookingId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!after) return;

    const beforeStatus = String(before?.status ?? '').trim();
    const afterStatus = String(after?.status ?? '').trim();

    if (afterStatus !== BOOKING_STATUS_COMPLETED) return;
    if (beforeStatus === BOOKING_STATUS_COMPLETED) return;
    if (after.economicsSnapshotAt != null) return;

    const bookingRef = event.data.after.ref;

    await db.runTransaction(async (txn) => {
      const fresh = await txn.get(bookingRef);
      if (!fresh.exists) return;
      const b = fresh.data();
      if (String(b?.status ?? '').trim() !== BOOKING_STATUS_COMPLETED) return;
      if (b.economicsSnapshotAt != null) return;

      const settingsSnap = await txn.get(db.doc(SETTINGS_GENERAL));
      const g = settingsSnap.exists ? settingsSnap.data() || {} : {};
      const platformFeePercent = sanitizePercent(
        b.platformFeePercent ?? g.platformCommissionPercent,
        0,
      );
      const addonFeePercent = sanitizePercent(
        b.addonFeePercent ?? g.addonFeePercent,
        0,
      );

      const servicePrice = deriveServicePrice(b);
      const visitingCharge = deriveVisitingCharge(b);
      const addedServicesAmount = deriveAddedServicesAmount(
        b,
        servicePrice,
        visitingCharge,
      );

      const econ = computeFrozenEconomics({
        servicePrice,
        visitingCharge,
        addedServicesAmount,
        platformFeePercent,
        addonFeePercent,
      });

      const patch = {
        ...econ,
        economicsSnapshotAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (sanitizeMoney(b.totalAmount) <= 0 && econ.finalBookingAmount > 0) {
        patch.totalAmount = econ.finalBookingAmount;
      }

      txn.update(bookingRef, patch);
    });
  },
);
