import {
  collection,
  doc,
  getDocs,
  getDoc,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  if (typeof expiresAt?.toDate === 'function') {
    return expiresAt.toDate().getTime() < Date.now();
  }
  const ts = new Date(expiresAt).getTime();
  return Number.isFinite(ts) ? ts < Date.now() : false;
}

function readUsageLimit(data) {
  const raw =
    data?.maxUses ?? data?.usageLimit ?? data?.maxUsage ?? data?.limit ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function readUsageCount(data) {
  const n = Number(data?.usageCount ?? data?.usedCount ?? data?.timesUsed ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function readPerUserLimit(data) {
  const raw = data?.perUserLimit ?? data?.maxPerUser ?? data?.userLimit ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function readIdList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function intersects(allowed, candidate) {
  if (!allowed.length) return true;
  const set = new Set(allowed.map(String));
  return candidate.some((id) => set.has(String(id)));
}

async function countCustomerCouponRedemptions(collectionName, couponId, customerId) {
  if (!couponId || !customerId) return 0;
  try {
    const q = query(
      collection(db, collectionName, couponId, 'couponRedemptions'),
      where('customerId', '==', String(customerId)),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    /* fall through to bookings query */
  }

  try {
    const couponSnap = await getDoc(doc(db, collectionName, couponId));
    const code = normalizeCode(couponSnap.exists() ? couponSnap.data()?.code : '');
    if (!code) return 0;
    const bookingsQ = query(
      collection(db, 'bookings'),
      where('customerId', '==', String(customerId)),
      where('promoCode', '==', code),
      limit(50),
    );
    const bookingsSnap = await getDocs(bookingsQ);
    return bookingsSnap.size;
  } catch {
    return 0;
  }
}

async function customerHasPriorBookings(customerId) {
  if (!customerId) return false;
  try {
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', String(customerId)),
      limit(1),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

/**
 * @param {string} rawCode
 * @param {number} [orderSubtotal] — service + visiting, before discount
 * @param {object} [options]
 * @param {string} [options.customerId]
 * @param {string} [options.categoryId]
 * @param {string} [options.serviceId]
 * @param {string[]} [options.categoryIds]
 * @param {string[]} [options.serviceIds]
 */
export async function validateCoupon(rawCode, orderSubtotal = 0, options = {}) {
  const code = normalizeCode(rawCode);
  if (!code) {
    return { valid: false, message: 'Please enter a promo code.' };
  }

  const customerId = options?.customerId != null ? String(options.customerId).trim() : '';
  const categoryIds = [
    ...readIdList(options?.categoryIds),
    ...(options?.categoryId ? [String(options.categoryId).trim()] : []),
  ].filter(Boolean);
  const serviceIds = [
    ...readIdList(options?.serviceIds),
    ...(options?.serviceId ? [String(options.serviceId).trim()] : []),
  ].filter(Boolean);

  let snap;
  let collectionName = 'coupons';
  try {
    const q = query(collection(db, 'coupons'), where('code', '==', code));
    snap = await getDocs(q);
  } catch {
    return { valid: false, message: 'Could not verify promo code. Try again.' };
  }

  let data = null;

  if (!snap.empty) {
    const d = snap.docs[0];
    data = { id: d.id, ...d.data(), _collection: 'coupons' };
  } else {
    try {
      const offersQ = query(collection(db, 'offers'), where('code', '==', code));
      const offersSnap = await getDocs(offersQ);
      if (!offersSnap.empty) {
        const d = offersSnap.docs[0];
        data = { id: d.id, ...d.data(), _collection: 'offers' };
        collectionName = 'offers';
      }
    } catch {
      return { valid: false, message: 'Could not verify promo code. Try again.' };
    }
  }

  if (!data) {
    return { valid: false, message: 'Invalid promo code.' };
  }
  if (data.active === false) {
    return { valid: false, message: 'This promo code is inactive.' };
  }
  if (isExpired(data.expiresAt || data.expiryDate)) {
    return { valid: false, message: 'This promo code has expired.' };
  }

  const usageLimit = readUsageLimit(data);
  const usageCount = readUsageCount(data);
  if (usageLimit != null && usageCount >= usageLimit) {
    return { valid: false, message: 'This promo code has reached its usage limit.' };
  }

  const allowedCategories = readIdList(data.categoryIds ?? data.categories);
  const allowedServices = readIdList(data.serviceIds ?? data.services);
  if (allowedCategories.length && categoryIds.length && !intersects(allowedCategories, categoryIds)) {
    return { valid: false, message: 'This promo code is not valid for the selected category.' };
  }
  if (allowedServices.length && serviceIds.length && !intersects(allowedServices, serviceIds)) {
    return { valid: false, message: 'This promo code is not valid for the selected service.' };
  }

  const firstOrderOnly = Boolean(
    data.firstOrderOnly ?? data.firstOrder ?? data.newCustomersOnly,
  );
  if (firstOrderOnly && customerId) {
    const hasPrior = await customerHasPriorBookings(customerId);
    if (hasPrior) {
      return { valid: false, message: 'This promo code is only for your first order.' };
    }
  }

  const perUserLimit = readPerUserLimit(data);
  if (perUserLimit != null && customerId) {
    const used = await countCustomerCouponRedemptions(
      data._collection || collectionName,
      data.id,
      customerId,
    );
    if (used >= perUserLimit) {
      return {
        valid: false,
        message:
          perUserLimit === 1
            ? 'You have already used this promo code.'
            : `You can use this promo code at most ${perUserLimit} time(s).`,
      };
    }
  }

  const minOrderAmount = Number(
    data.minOrderAmount ?? data.minOrder ?? data.minimumOrder ?? 0,
  );
  if (minOrderAmount > 0 && Number(orderSubtotal) < minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order of ₹${minOrderAmount} required for this code.`,
    };
  }

  const discountType =
    data.discountType ||
    (typeof data.discountPercent === 'number' ? 'percentage' : 'flat');
  const discountValue =
    discountType === 'percentage'
      ? Number(data.discountPercent ?? data.percentage ?? data.value ?? 0)
      : Number(data.discountFlat ?? data.amount ?? data.flatAmount ?? data.value ?? 0);

  if (!discountValue || !Number.isFinite(discountValue)) {
    return { valid: false, message: 'This promo code has no discount value.' };
  }

  const maxDiscount = Number(data.maxDiscount ?? data.maxDiscountAmount ?? 0);

  return {
    valid: true,
    id: data.id,
    collection: data._collection || collectionName,
    code,
    discountType,
    discountValue,
    minOrderAmount: minOrderAmount > 0 ? minOrderAmount : undefined,
    maxDiscount: Number.isFinite(maxDiscount) && maxDiscount > 0 ? maxDiscount : undefined,
    usageCount,
    usageLimit: usageLimit ?? undefined,
    perUserLimit: perUserLimit ?? undefined,
    firstOrderOnly,
    categoryIds: allowedCategories.length ? allowedCategories : undefined,
    serviceIds: allowedServices.length ? allowedServices : undefined,
    message: 'Promo code applied successfully.',
  };
}

/**
 * Atomically increment coupon usage and record a per-user redemption when possible.
 * @param {object} coupon — result from validateCoupon when valid
 * @param {{ customerId?: string, bookingId?: string }} [meta]
 */
export async function incrementCouponUsage(coupon, meta = {}) {
  const id = String(coupon?.id || '').trim();
  if (!id) return;
  const col =
    String(coupon?.collection || '').trim() === 'offers' ? 'offers' : 'coupons';
  const customerId = meta?.customerId != null ? String(meta.customerId).trim() : '';
  const bookingId = meta?.bookingId != null ? String(meta.bookingId).trim() : '';

  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, col, id);
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const usageLimit = readUsageLimit(data);
      const usageCount = readUsageCount(data);
      if (usageLimit != null && usageCount >= usageLimit) {
        throw new Error('COUPON_USAGE_EXCEEDED');
      }
      tx.update(ref, {
        usageCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      if (customerId && col === 'coupons') {
        const redRef = doc(collection(db, col, id, 'couponRedemptions'));
        tx.set(redRef, {
          customerId,
          ...(bookingId ? { bookingId } : {}),
          couponCode: normalizeCode(coupon.code || data.code),
          redeemedAt: serverTimestamp(),
        });
      }
    });
    return;
  } catch (e) {
    if (String(e?.message) === 'COUPON_USAGE_EXCEEDED') return;
    /* fall back to best-effort increment */
  }

  try {
    await updateDoc(doc(db, col, id), {
      usageCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* optional — rules or missing field */
  }
}

/**
 * @param {number} amount — order subtotal (service + visiting) before discount
 * @param {object|null} coupon — result from validateCoupon when valid
 */
export function calculateDiscount(amount, coupon) {
  const total = Number(amount || 0);
  if (!coupon?.valid || total <= 0) return 0;

  const minOrder = Number(coupon.minOrderAmount ?? 0);
  if (minOrder > 0 && total < minOrder) return 0;

  if (coupon.discountType === 'percentage') {
    const pct = Number(coupon.discountValue || 0);
    let rupees = Math.round((total * pct) / 100);
    const cap = Number(coupon.maxDiscount);
    if (Number.isFinite(cap) && cap > 0) {
      rupees = Math.min(rupees, Math.round(cap));
    }
    return Math.min(total, Math.max(0, rupees));
  }

  const flat = Math.round(Number(coupon.discountValue || 0));
  return Math.min(total, Math.max(0, flat));
}
