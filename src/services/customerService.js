import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeSavedAddress } from '../utils/address';

const customersCol = 'customers';

/** Safe default when Firestore has no doc or uid is missing; use for consistent app shape. */
export function emptyCustomerProfile(uid) {
  return {
    id: uid ?? '',
    name: '',
    email: '',
    phone: '',
    address: '',
    addresses: [],
    totalBookings: 0,
    photoURL: '',
    blocked: false,
    exists: false,
  };
}

/**
 * Merge Firestore snapshots into predictable primitives; keeps extra keys from `raw` except
 * core fields which are sanitized (avoids undefined/null surprises in RN UI/render paths).
 */
export function normalizeCustomerProfile(uid, raw) {
  const base = emptyCustomerProfile(uid ?? '');
  if (!raw || typeof raw !== 'object') return base;

  const addressesList = Array.isArray(raw.addresses)
    ? raw.addresses
        .map((a, idx) => normalizeSavedAddress(a, `addr_${idx}`))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const tb = raw.totalBookings;
  const totalBookings =
    Number.isFinite(Number(tb)) && Number(tb) >= 0 ? Math.round(Number(tb)) : 0;

  const photoRaw = raw.photoURL ?? raw.photoUrl;
  const photo =
    typeof photoRaw === 'string' && photoRaw.trim() ? photoRaw.trim() : '';

  return {
    ...base,
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid ?? '',
    name: raw.name != null ? String(raw.name) : '',
    email: raw.email != null ? String(raw.email) : '',
    phone: raw.phone != null ? String(raw.phone) : '',
    address: raw.address != null ? String(raw.address) : '',
    addresses: addressesList,
    lastUsedAddress: raw.lastUsedAddress
      ? normalizeSavedAddress(raw.lastUsedAddress, 'last')
      : null,
    totalBookings,
    photoURL: photo,
    blocked: raw.blocked === true,
    exists: raw.exists === true,
  };
}

export async function getCustomerProfile(uid) {
  if (!uid) {
    return emptyCustomerProfile('');
  }

  try {
    const ref = doc(db, customersCol, uid);
    const snap = await getDoc(ref);

    const defaultProfile = emptyCustomerProfile(uid);

    if (!snap.exists()) {
      return { ...defaultProfile, exists: false };
    }

    const data = snap.data() || {};

    return normalizeCustomerProfile(uid, {
      id: snap.id,
      ...data,
      addresses: Array.isArray(data?.addresses) ? data.addresses : [],
      exists: true,
    });
  } catch {
    return { ...emptyCustomerProfile(uid), exists: false };
  }
}

/** Create customers/{uid} for a valid phone-auth user. Never a reason to signOut. */
export async function ensureCustomerFromAuth(uid, extras = {}) {
  if (!uid) return { created: false, profile: emptyCustomerProfile('') };

  const existing = await getCustomerProfile(uid);
  if (existing.exists) {
    return { created: false, profile: existing };
  }

  const phone = String(extras.phone || '').trim();
  const name = String(extras.name || '').trim() || 'Customer';
  const ref = doc(db, customersCol, uid);
  await setDoc(
    ref,
    {
      uid,
      name,
      email: String(extras.email || '').trim(),
      phone,
      phoneNormalized: phone,
      phoneVerified: Boolean(phone),
      authProvider: 'phone',
      address: '',
      addresses: [],
      totalBookings: 0,
      blocked: false,
      lastUsedAddress: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const profile = await getCustomerProfile(uid);
  return { created: true, profile };
}

export async function createCustomerProfile(uid, payload) {
  if (!uid) return;
  const ref = doc(db, customersCol, uid);
  await setDoc(ref, {
    name: payload.name,
    email: payload.email,
    phone: payload.phone || '',
    address: payload.address || '',
    totalBookings: 0,
    blocked: false,
    addresses: [],
    lastUsedAddress: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCustomerProfile(uid, updates) {
  if (!uid) return;
  const ref = doc(db, customersCol, uid);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function incrementCustomerBookings(uid) {
  if (!uid) return;
  const ref = doc(db, customersCol, uid);
  await updateDoc(ref, {
    totalBookings: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeCustomerProfile(uid, onNext, onError) {
  if (!uid) return () => {};
  const ref = doc(db, customersCol, uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onNext(emptyCustomerProfile(uid));
        return;
      }
      const data = snap.data() || {};
      onNext(normalizeCustomerProfile(uid, { id: snap.id, ...data, exists: true }));
    },
    onError,
  );
}

export async function saveCustomerAddresses(uid, addresses) {
  if (!uid) return;
  const safeList = (Array.isArray(addresses) ? addresses : [])
    .map((a, idx) => normalizeSavedAddress(a, `addr_${idx}`))
    .filter(Boolean)
    .slice(0, 10);
  const ref = doc(db, customersCol, uid);
  try {
    await updateDoc(ref, {
      addresses: safeList,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await setDoc(
      ref,
      {
        addresses: safeList,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

/** Soft-delete customer profile document (Auth user deletion is separate). */
export async function deleteCustomerProfile(uid) {
  if (!uid) return;
  try {
    await deleteDoc(doc(db, customersCol, uid));
  } catch {
    await setDoc(
      doc(db, customersCol, uid),
      {
        deleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function saveLastUsedAddress(uid, address) {
  if (!uid) return;
  const normalized = address ? normalizeSavedAddress(address) : null;
  const ref = doc(db, customersCol, uid);
  try {
    await updateDoc(ref, {
      lastUsedAddress: normalized,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await setDoc(
      ref,
      {
        lastUsedAddress: normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

/**
 * Persist native push token (FCM on Android, APNs on iOS via Expo device token).
 * Accepts legacy string or { token, platform, type } from registerForPushNotificationsAsync.
 * Skips Firestore writes when the stored token is unchanged.
 */
const lastSavedPushByUid = new Map();

export async function saveCustomerPushToken(uid, pushPayload) {
  if (!uid || !pushPayload) return;
  const ref = doc(db, customersCol, uid);

  const data =
    typeof pushPayload === 'string'
      ? {
          devicePushToken: pushPayload,
          pushToken: pushPayload,
          ...(String(pushPayload).startsWith('ExponentPushToken')
            ? { expoPushToken: pushPayload }
            : {}),
          pushTokenUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      : {
          devicePushToken: pushPayload.deviceToken || pushPayload.token,
          devicePushPlatform: pushPayload.platform,
          devicePushType: pushPayload.type,
          pushToken: pushPayload.expoPushToken || pushPayload.token,
          ...(pushPayload.expoPushToken
            ? { expoPushToken: pushPayload.expoPushToken }
            : String(pushPayload.token || '').startsWith('ExponentPushToken')
              ? { expoPushToken: pushPayload.token }
              : {}),
          pushTokenUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

  if (!data.devicePushToken && !data.expoPushToken && !data.pushToken) return;

  const fingerprint = `${data.expoPushToken || ''}|${data.devicePushToken || ''}|${data.pushToken || ''}`;
  if (lastSavedPushByUid.get(uid) === fingerprint) return;

  try {
    await updateDoc(ref, data);
    lastSavedPushByUid.set(uid, fingerprint);
  } catch {
    await setDoc(ref, data, { merge: true });
    lastSavedPushByUid.set(uid, fingerprint);
  }
}
