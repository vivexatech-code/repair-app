import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

const customersCol = 'customers';

export async function getCustomerProfile(uid) {
  const ref = doc(db, customersCol, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createCustomerProfile(uid, payload) {
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
  const ref = doc(db, customersCol, uid);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function incrementCustomerBookings(uid) {
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
        onNext(null);
        return;
      }
      onNext({ id: snap.id, ...snap.data() });
    },
    onError,
  );
}

export async function saveCustomerAddresses(uid, addresses) {
  const safeList = Array.isArray(addresses) ? addresses.slice(0, 3) : [];
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

export async function saveLastUsedAddress(uid, address) {
  const ref = doc(db, customersCol, uid);
  try {
    await updateDoc(ref, {
      lastUsedAddress: address || null,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await setDoc(
      ref,
      {
        lastUsedAddress: address || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}
