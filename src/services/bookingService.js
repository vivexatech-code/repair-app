import {
  collection,
  addDoc,
  doc,
  query,
  updateDoc,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  deleteDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateBookingCode } from '../utils/bookingCode';
import { BOOKING_STATUS, EXTRAS_APPROVAL_REQUEST_STATUS } from '../constants';
import { isPastDateKey, isSlotPastForDate } from '../constants/bookingSlots';
import {
  assignNearestTechnicianAndLockBusySlot,
  assignExistingTechnicianToBooking,
  releaseBusySlotForBooking,
  lockBusySlotForTechnician,
} from './bookingAllocationService';
import {
  notifyBookingCreated,
  notifyTechnicianAssigned,
} from './notificationService';
import {
  incrementCustomerBookings,
  getCustomerProfile,
} from './customerService';
import { fetchServiceById, fetchCategoryById } from './serviceCatalogService';
import { getBookingBaseAmount, normalizeAddOnServices } from '../utils/bookingDisplay';
import { normalizeRevisitPolicy } from '../utils/revisitPolicyShared';
import { incrementCouponUsage } from './couponService';

const bookingsCol = 'bookings';

function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.round(x * 100) / 100;
}

function normalizeExtrasApprovalStatus(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

function toAdditionalBookingLine(row) {
  const title =
    String(row?.title ?? row?.serviceName ?? row?.name ?? '').trim() || 'Service';
  const price = roundMoney(row?.price ?? row?.amount ?? 0);
  const qtyRaw = Number(row?.quantity);
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
  const additionalServiceId =
    row?.additionalServiceId != null ? String(row.additionalServiceId).trim() : '';
  return {
    title,
    price,
    quantity,
    ...(additionalServiceId ? { additionalServiceId } : {}),
  };
}

function sumAdditionalLines(lines) {
  return (lines || []).reduce(
    (s, r) =>
      s + roundMoney(r.price) * Math.max(1, Math.floor(Number(r.quantity) || 1)),
    0,
  );
}

function toAddOnLine(row, serviceType) {
  const serviceName =
    String(row?.serviceName ?? row?.name ?? row?.title ?? '').trim() || 'Service';
  const price = Number(row?.price ?? row?.amount ?? 0) || 0;
  const serviceId = row?.serviceId != null ? String(row.serviceId).trim() : '';
  return {
    ...(serviceId ? { serviceId } : {}),
    serviceName,
    price,
    serviceType,
  };
}

function toFirestoreTimestamp(value) {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.now();
}

function trimStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Merge Firestore service/profile data at create time so the booking document is self-contained.
 * Still validates non-empty required strings before any write.
 */
async function resolveBookingSnapshotFields(input) {
  const customerId = trimStr(input.customerId);
  const serviceId = trimStr(input.serviceId);
  let serviceName = trimStr(input.serviceName);
  let categoryId = trimStr(input.categoryId);
  let categoryName = trimStr(input.categoryName);
  let customerName = trimStr(input.customerName);
  let customerPhone = trimStr(input.customerPhone);
  let customerEmail = trimStr(input.customerEmail);

  let revisitPolicy = input.revisitPolicy || null;
  if (serviceId) {
    try {
      const svc = await fetchServiceById(serviceId);
      if (svc && typeof svc === 'object') {
        if (!serviceName) serviceName = trimStr(svc.name);
        if (!categoryId) categoryId = trimStr(svc.categoryId);
        if (!categoryName) {
          categoryName = trimStr(svc.categoryName || svc.category);
        }
        if (!revisitPolicy && svc.revisitPolicy) {
          revisitPolicy = svc.revisitPolicy;
        }
      }
    } catch {
      /* validation below */
    }
  }

  if (categoryId && !categoryName) {
    try {
      const cat = await fetchCategoryById(categoryId);
      if (cat) categoryName = trimStr(cat.name);
    } catch {
      /* validation below */
    }
  }

  if (customerId && (!customerName || !customerPhone || !customerEmail)) {
    try {
      const prof = await getCustomerProfile(customerId);
      if (!customerName) customerName = trimStr(prof?.name);
      if (!customerPhone) customerPhone = trimStr(prof?.phone);
      if (!customerEmail) customerEmail = trimStr(prof?.email);
    } catch {
      /* validation below */
    }
  }

  const missing = [];
  if (!customerId) missing.push('customer id');
  if (!serviceId) missing.push('service id');
  if (!serviceName) missing.push('service name');
  if (!categoryId) missing.push('category id');
  if (!categoryName) missing.push('category name');
  if (!customerName) missing.push('customer name');
  if (!customerPhone) missing.push('customer phone');

  if (missing.length) {
    throw new Error(
      `Cannot create booking: missing ${missing.join(', ')}. Update your profile or try again.`,
    );
  }

  const merged = {
    ...input,
    customerId,
    serviceId,
    serviceName,
    categoryId,
    categoryName,
    customerName,
    customerPhone,
    ...(revisitPolicy ? { revisitPolicy } : {}),
  };
  delete merged.customerEmail;
  if (customerEmail) merged.customerEmail = String(customerEmail);
  return merged;
}

export function subscribeCustomerBookings(customerId, onNext, onError) {
  if (!customerId) {
    onNext([]);
    return () => {};
  }
  const q = query(
    collection(db, bookingsCol),
    where('customerId', '==', customerId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => {
        try {
          rows.push({ id: d.id, ...d.data() });
        } catch {
          /* skip malformed document */
        }
      });
      rows.sort((a, b) => {
        const ta = a.scheduledAt?.toMillis?.() ?? 0;
        const tb = b.scheduledAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      onNext(rows);
    },
    onError,
  );
}

/**
 * Real-time listener for a single booking document (add-ons, totalAmount, status, etc.).
 */
export function subscribeBooking(bookingId, onNext, onError) {
  if (!bookingId) {
    onNext(null);
    return () => {};
  }
  const ref = doc(db, bookingsCol, bookingId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onNext(null);
        return;
      }
      try {
        onNext({ id: snap.id, ...snap.data() });
      } catch {
        onNext(null);
      }
    },
    onError,
  );
}

export async function createBooking(params) {
  const resolved = await resolveBookingSnapshotFields(params);
  const {
    customerId,
    serviceId,
    serviceName,
    categoryId,
    categoryName,
    customerName,
    customerPhone,
    customerEmail,
    amount,
    durationMinutes,
    address,
    scheduledAt,
    notes,
    promoCode,
    selectedVariations,
  } = resolved;

  const allocationRole = params.allocationRole ?? 'primary';
  const userLat = params.userLat;
  const userLng = params.userLng;
  const scheduledSlotDateStr = params.scheduledSlotDateStr;
  const scheduledSlotLabel = params.scheduledSlotLabel;
  const scheduledSlotIndex = params.scheduledSlotIndex;
  const followupTechnicianId = params.followupTechnicianId;
  const revisitPolicy = resolved.revisitPolicy || params.revisitPolicy || null;

  if (scheduledSlotDateStr && scheduledSlotIndex != null) {
    const dateStr = String(scheduledSlotDateStr).trim();
    const slotIdx = Number(scheduledSlotIndex);
    if (isPastDateKey(dateStr)) {
      throw new Error('Cannot book a past date.');
    }
    if (isSlotPastForDate(dateStr, slotIdx)) {
      throw new Error('This time slot has already passed. Please choose a future slot.');
    }
  }
  if (scheduledAt) {
    const at = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
    if (!Number.isNaN(at.getTime()) && at.getTime() <= Date.now()) {
      throw new Error('Scheduled time must be in the future.');
    }
  }

  const bookingCode = generateBookingCode(8);
  const isRevisit = params.isRevisit === true;
  const parentBookingId = trimStr(params.parentBookingId);

  let platformFeePercent;
  let addonFeePercent;
  try {
    const generalSnap = await getDoc(doc(db, 'settings', 'general'));
    if (generalSnap.exists()) {
      const g = generalSnap.data() || {};
      const p = Number(g.platformCommissionPercent);
      const a = Number(g.addonFeePercent);
      if (Number.isFinite(p) && p >= 0) platformFeePercent = p;
      if (Number.isFinite(a) && a >= 0) addonFeePercent = a;
    }
  } catch {
    /* freeze will read live settings if percents are absent */
  }
  if (params.platformFeePercent != null && Number.isFinite(Number(params.platformFeePercent))) {
    platformFeePercent = Number(params.platformFeePercent);
  }
  if (params.addonFeePercent != null && Number.isFinite(Number(params.addonFeePercent))) {
    addonFeePercent = Number(params.addonFeePercent);
  }

  const payload = {
    customerId,
    customerName,
    customerPhone,
    ...(customerEmail ? { customerEmail: String(customerEmail) } : {}),
    serviceId,
    serviceName,
    categoryId,
    categoryName,
    amount: isRevisit ? 0 : amount,
    durationMinutes,
    address,
    scheduledAt: toFirestoreTimestamp(scheduledAt),
    createdAt: serverTimestamp(),
    status: BOOKING_STATUS.NEW,
    bookingCode,
    notes: notes || (isRevisit ? 'Free revisit claim' : ''),
    ...(isRevisit
      ? {
          isRevisit: true,
          parentBookingId: parentBookingId || '',
          originalBookingId: parentBookingId || '',
          revisitReason: trimStr(params.revisitReason) || 'Customer claimed free revisit',
          visitingCharge: 0,
          totalAmount: 0,
        }
      : {}),
    ...(!isRevisit && revisitPolicy
      ? (() => {
          const p = normalizeRevisitPolicy(revisitPolicy);
          if (!p.enabled) return {};
          const remaining =
            p.type === 'fixed_count'
              ? p.freeRevisitCount
              : p.maxRevisitsInPeriod > 0
                ? p.maxRevisitsInPeriod
                : p.freeRevisitCount || 1;
          return {
            revisitPolicy: p,
            revisitRemaining: remaining,
            remainingRevisits: remaining,
            freeRevisitsRemaining: remaining,
            revisitHistory: [],
          };
        })()
      : {}),
    ...(scheduledSlotDateStr &&
    scheduledSlotLabel != null &&
    scheduledSlotIndex != null
      ? {
          scheduledSlotDate: String(scheduledSlotDateStr).trim(),
          scheduledSlotLabel: String(scheduledSlotLabel ?? '').trim(),
          scheduledSlotIndex: Number(scheduledSlotIndex),
        }
      : {}),
    financeFormulaVersion: 'v2',
    visitingCharge: isRevisit ? 0 : 0,
    ...(promoCode ? { promoCode: String(promoCode) } : {}),
    ...(params.servicePrice != null && !isRevisit
      ? { servicePrice: roundMoney(params.servicePrice) }
      : {}),
    ...(params.discountAmount != null && !isRevisit
      ? { discountAmount: roundMoney(params.discountAmount) }
      : {}),
    ...(params.customerPlatformFeeType && !isRevisit
      ? {
          customerPlatformFeeType: params.customerPlatformFeeType,
          customerPlatformFeeValue: Number(params.customerPlatformFeeValue) || 0,
          customerPlatformFee: roundMoney(params.customerPlatformFee),
          gstEnabled: params.gstEnabled === true,
          gstPercent: Number(params.gstPercent) || 0,
          sparePartCommissionPercent: Number(params.sparePartCommissionPercent) || 0,
        }
      : {}),
    ...(platformFeePercent != null && !isRevisit ? { platformFeePercent } : {}),
    ...(addonFeePercent != null && !isRevisit ? { addonFeePercent } : {}),
    ...(Array.isArray(selectedVariations) && selectedVariations.length
      ? {
          selectedVariations: selectedVariations.map((s) => ({
            variationId: String(s.variationId ?? s.id ?? ''),
            title: String(s.title ?? ''),
            price: Number(s.price) || 0,
            quantity:
              Number.isFinite(Number(s.quantity)) && Number(s.quantity) > 0
                ? Math.round(Number(s.quantity))
                : 1,
          })),
        }
      : {}),
  };

  const ref = await addDoc(collection(db, bookingsCol), payload);

  try {
    if (allocationRole === 'followup') {
      if (followupTechnicianId && String(followupTechnicianId).trim() !== '') {
        await assignExistingTechnicianToBooking(
          ref.id,
          String(followupTechnicianId).trim(),
        );
      } else {
        throw new Error('Follow-up booking missing assigned partner.');
      }
    } else if (
      scheduledSlotDateStr &&
      scheduledSlotLabel != null &&
      scheduledSlotIndex != null &&
      userLat != null &&
      userLng != null &&
      categoryId
    ) {
      await assignNearestTechnicianAndLockBusySlot({
        bookingId: ref.id,
        categoryId,
        userLat: Number(userLat),
        userLng: Number(userLng),
        dateStr: String(scheduledSlotDateStr).trim(),
        slotLabel: scheduledSlotLabel,
        slotIndex: scheduledSlotIndex,
      });
    }
  } catch (e) {
    try {
      await deleteDoc(doc(db, bookingsCol, ref.id));
    } catch {
      /* best effort */
    }
    if (e?.code === 'NO_TECH_IN_RADIUS') {
      throw new Error(
        'No service partner is available within range for this address. Try another location or contact support.',
      );
    }
    if (e?.code === 'ALL_TECHS_BUSY' || e?.message === 'ALL_TECHS_BUSY') {
      throw new Error(
        'This slot is no longer available. Please select another slot.',
      );
    }
    throw new Error(
      e?.message ||
        'Could not assign a partner for this slot. Please try another time.',
    );
  }

  await notifyBookingCreated(bookingCode);
  if (!isRevisit) {
    await incrementCustomerBookings(customerId);
  }

  if (!isRevisit && promoCode && params.couponMeta?.id) {
    try {
      await incrementCouponUsage(params.couponMeta, {
        customerId,
        bookingId: ref.id,
      });
    } catch {
      /* optional */
    }
  }

  if (isRevisit && parentBookingId) {
    try {
      const parentRef = doc(db, bookingsCol, parentBookingId);
      await runTransaction(db, async (tx) => {
        const parentSnap = await tx.get(parentRef);
        if (!parentSnap.exists()) return;
        const p = parentSnap.data() || {};
        const history = Array.isArray(p.revisitHistory) ? [...p.revisitHistory] : [];
        history.push({
          bookingId: ref.id,
          bookingCode,
          claimedAt: new Date().toISOString(),
          technicianId: String(params.followupTechnicianId || '').trim(),
        });
        const remainingRaw =
          p.revisitRemaining ??
          p.remainingRevisits ??
          p.freeRevisitsRemaining;
        const patch = {
          revisitHistory: history,
          updatedAt: serverTimestamp(),
        };
        if (remainingRaw != null && Number.isFinite(Number(remainingRaw))) {
          const next = Math.max(0, Math.round(Number(remainingRaw)) - 1);
          patch.revisitRemaining = next;
          patch.remainingRevisits = next;
          patch.freeRevisitsRemaining = next;
        }
        tx.update(parentRef, patch);
      });
    } catch {
      /* parent counters best-effort */
    }
  }

  try {
    await notifyTechnicianAssigned(bookingCode);
  } catch {
    /* non-fatal */
  }

  try {
    const { requestRemotePush } = await import('./remoteNotify');
    const assignedSnap = await getDoc(doc(db, bookingsCol, ref.id));
    const assigned = assignedSnap.exists() ? assignedSnap.data() : {};
    await requestRemotePush({
      eventType: assigned?.technicianId ? 'assigned' : 'created',
      bookingId: ref.id,
      customerId,
      technicianId: assigned?.technicianId || '',
      serviceName,
      bookingCode,
      audience: 'both',
    });
  } catch {
    /* remote notify optional until Vercel server is configured */
  }

  return { id: ref.id, bookingCode };
}

/**
 * Customer in-app rating (1–5). Only once per booking when Completed.
 */
export async function submitCustomerRating(bookingId, rating) {
  const id = String(bookingId || '').trim();
  const stars = Math.round(Number(rating));
  if (!id) throw new Error('Missing booking id');
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new Error('Choose a rating from 1 to 5');
  }

  const ref = doc(db, bookingsCol, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Booking not found');
  const data = snap.data() || {};
  if (String(data.status || '').trim() !== BOOKING_STATUS.COMPLETED) {
    throw new Error('You can rate completed bookings only');
  }
  if (data.customerRating != null) {
    throw new Error('You have already rated this booking');
  }

  await updateDoc(ref, {
    customerRating: stars,
    ratedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelBookingByUser(bookingId) {
  if (!bookingId) {
    throw new Error('Missing booking id');
  }
  const ref = doc(db, bookingsCol, bookingId);
  const snap = await getDoc(ref);
  const row = snap.exists() ? { id: snap.id, ...snap.data() } : null;

  await updateDoc(ref, {
    status: BOOKING_STATUS.CANCELLED,
    cancelledBy: 'user',
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (row) {
    try {
      const { requestRemotePush } = await import('./remoteNotify');
      await requestRemotePush({
        eventType: 'cancelled',
        bookingId,
        customerId: row.customerId || '',
        technicianId: row.technicianId || '',
        serviceName: row.serviceName || '',
        bookingCode: row.bookingCode || '',
        audience: 'both',
      });
    } catch {
      /* optional */
    }
  }

  if (row) {
    try {
      await releaseBusySlotForBooking(row);
    } catch {
      /* best effort */
    }
  }
}

/**
 * Customer reschedule for New / Assigned bookings only.
 * Updates scheduledAt + slot fields and re-locks the technician busy slot when assigned.
 */
export async function rescheduleBooking({
  bookingId,
  scheduledAt,
  scheduledSlotDateStr,
  scheduledSlotLabel,
  scheduledSlotIndex,
}) {
  if (!bookingId) {
    throw new Error('Missing booking id');
  }
  const dateStr = String(scheduledSlotDateStr || '').trim();
  const slotIdx = Number(scheduledSlotIndex);
  const slotLabel = String(scheduledSlotLabel ?? '').trim();
  if (!dateStr || !Number.isFinite(slotIdx) || slotIdx < 1 || !slotLabel) {
    throw new Error('Please choose a valid time slot.');
  }
  if (isPastDateKey(dateStr)) {
    throw new Error('Cannot book a past date.');
  }
  if (isSlotPastForDate(dateStr, slotIdx)) {
    throw new Error('This time slot has already passed. Please choose a future slot.');
  }

  const at = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) {
    throw new Error('Scheduled time must be in the future.');
  }

  const ref = doc(db, bookingsCol, bookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Booking not found');
  }
  const row = { id: snap.id, ...snap.data() };
  const status = String(row.status ?? '').trim();
  const allowed =
    status === BOOKING_STATUS.NEW ||
    status === BOOKING_STATUS.ASSIGNED ||
    status.toLowerCase() === 'pending';
  if (!allowed) {
    throw new Error('Only new or assigned bookings can be rescheduled.');
  }

  const sameSlot =
    String(row.scheduledSlotDate || '') === dateStr &&
    Number(row.scheduledSlotIndex) === slotIdx;
  if (sameSlot) {
    throw new Error('Please pick a different time slot.');
  }

  try {
    await releaseBusySlotForBooking(row);
  } catch {
    /* best effort */
  }

  const techId = String(row.technicianId || '').trim();
  if (techId) {
    try {
      await lockBusySlotForTechnician({
        technicianId: techId,
        bookingId,
        dateStr,
        slotLabel,
        slotIndex: slotIdx,
      });
    } catch (e) {
      if (e?.code === 'ALL_TECHS_BUSY' || e?.message === 'ALL_TECHS_BUSY') {
        throw new Error(
          'This slot is no longer available for your partner. Please choose another time.',
        );
      }
      throw e;
    }
  }

  await updateDoc(ref, {
    scheduledAt: toFirestoreTimestamp(at),
    scheduledSlotDate: dateStr,
    scheduledSlotLabel: slotLabel,
    scheduledSlotIndex: slotIdx,
    updatedAt: serverTimestamp(),
    rescheduledAt: serverTimestamp(),
  });

  return { id: bookingId };
}

/**
 * Customer approves or rejects `extrasApprovalRequest` (existing Firestore shape).
 */
export async function resolveBookingAddOnApproval({
  bookingId,
  customerId,
  decision,
}) {
  if (!bookingId || !customerId) {
    throw new Error('Missing booking or customer');
  }
  const ref = doc(db, bookingsCol, bookingId);
  const dec = String(decision || '').toLowerCase();
  if (dec !== 'approved' && dec !== 'rejected') {
    throw new Error('Invalid decision');
  }

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error('Booking not found');
    }
    const data = snap.data();
    if (String(data.customerId ?? '') !== String(customerId)) {
      throw new Error('Not allowed');
    }

    const ear = data.extrasApprovalRequest;
    if (!ear || typeof ear !== 'object') {
      throw new Error('Invalid approval request');
    }
    if (
      normalizeExtrasApprovalStatus(ear.status) !==
      EXTRAS_APPROVAL_REQUEST_STATUS.PENDING
    ) {
      throw new Error('This update was already reviewed');
    }

    const docForAmounts = { id: snap.id, ...data };

    if (dec === 'rejected') {
      transaction.update(ref, {
        extrasApprovalRequest: {
          ...ear,
          status: EXTRAS_APPROVAL_REQUEST_STATUS.REJECTED,
        },
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const isEdit = ear.isEdit === true;

    const rawExtras = Array.isArray(ear.proposedAddOnServices)
      ? ear.proposedAddOnServices
      : [];
    const rawAdditional = Array.isArray(ear.proposedAdditionalServices)
      ? ear.proposedAdditionalServices
      : [];
    const replacement = ear.replacementService && typeof ear.replacementService === 'object'
      ? ear.replacementService
      : null;

    if (rawExtras.length === 0 && rawAdditional.length === 0 && !replacement) {
      throw new Error('Nothing to approve');
    }

    const patch = {
      extrasApprovalRequest: {
        ...ear,
        status: EXTRAS_APPROVAL_REQUEST_STATUS.APPROVED,
      },
      updatedAt: serverTimestamp(),
    };

    if (replacement) {
      const newPrice = roundMoney(replacement.price);
      const visiting = roundMoney(docForAmounts.visitingCharge);
      const additionalLines = rawAdditional.map(toAdditionalBookingLine).filter((r) => r.title);
      const existingAdditional = Array.isArray(data.additionalServices)
        ? data.additionalServices.map(toAdditionalBookingLine)
        : [];
      const mergedAdditional = isEdit
        ? additionalLines
        : [...existingAdditional, ...additionalLines];

      let total = roundMoney(newPrice + visiting + sumAdditionalLines(mergedAdditional));

      patch.serviceId = String(replacement.serviceId || '').trim() || docForAmounts.serviceId;
      patch.serviceName = String(replacement.serviceName || '').trim() || docForAmounts.serviceName;
      patch.amount = newPrice;
      patch.servicePrice = newPrice;
      patch.originalBookingAmount = newPrice;
      patch.baseAmount = newPrice;
      patch.replacedService = {
        serviceId: replacement.previousServiceId || docForAmounts.serviceId || '',
        serviceName: replacement.previousServiceName || docForAmounts.serviceName || '',
        price: roundMoney(replacement.previousPrice ?? getBookingBaseAmount(docForAmounts)),
        replacedAt: serverTimestamp(),
        ...(replacement.additionalServiceId
          ? { additionalServiceId: String(replacement.additionalServiceId) }
          : {}),
      };
      patch.addOnServices = [];
      if (mergedAdditional.length) {
        patch.additionalServices = mergedAdditional;
      }
      patch.totalAmount = total;
      patch.finalBookingAmount = total;
      patch.serviceChangeHistory = arrayUnion({
        at: Timestamp.now(),
        type: 'main_replacement',
        technicianId: String(ear.technicianId || '').trim(),
        isEdit,
        fromServiceName: docForAmounts.serviceName,
        toServiceName: patch.serviceName,
        toPrice: newPrice,
      });
      transaction.update(ref, patch);
      return;
    }

    const additionalLines = rawAdditional.map(toAdditionalBookingLine).filter((r) => r.title);
    const extraLines = rawExtras
      .map((r) => toAddOnLine(r, 'extra'))
      .filter((row) => row.serviceName || row.price > 0);

    const existingAdditional = Array.isArray(data.additionalServices)
      ? data.additionalServices.map(toAdditionalBookingLine)
      : [];
    const mergedAdditional = isEdit
      ? additionalLines
      : [...existingAdditional, ...additionalLines];

    const existing = Array.isArray(data.addOnServices) ? [...data.addOnServices] : [];
    const mergedAddons =
      extraLines.length > 0 ? (isEdit ? extraLines : [...existing, ...extraLines]) : existing;

    const base = getBookingBaseAmount(docForAmounts);
    const visiting = roundMoney(docForAmounts.visitingCharge);
    const addonSum = mergedAddons.reduce((s, a) => s + roundMoney(a?.price), 0);
    const newTotal = roundMoney(
      base + visiting + addonSum + sumAdditionalLines(mergedAdditional),
    );

    const updatePayload = {
      ...patch,
      totalAmount: newTotal,
      finalBookingAmount: newTotal,
      serviceChangeHistory: arrayUnion({
        at: Timestamp.now(),
        type: additionalLines.length ? 'secondary_addon' : 'catalog_addon',
        technicianId: String(ear.technicianId || '').trim(),
        isEdit,
      }),
    };
    if (mergedAddons.length) updatePayload.addOnServices = mergedAddons;
    if (mergedAdditional.length) updatePayload.additionalServices = mergedAdditional;

    transaction.update(ref, updatePayload);
  });
}
