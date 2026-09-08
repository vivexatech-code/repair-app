import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { BOOKING_STATUS, TECHNICIAN_STATUS } from '../constants';
import { cityFromAddressMap } from '../utils/address';

const techniciansCol = 'technicians';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  return Number(ts) || 0;
}

function sameSlot(a, b) {
  const ma = toMillis(a);
  const mb = toMillis(b);
  if (!ma || !mb) return false;
  return Math.abs(ma - mb) < 60 * 60 * 1000;
}

function areaScore(tech, targetTokens) {
  const area = normalize(tech.areaAddress);
  const radiusList = Array.isArray(tech.serviceRadius)
    ? tech.serviceRadius.map((x) => normalize(x))
    : [];
  let score = 0;
  targetTokens.forEach((token) => {
    if (!token) return;
    if (area.includes(token)) score += 3;
    if (radiusList.some((entry) => entry.includes(token))) score += 2;
  });
  return score;
}

async function isTechnicianFreeAt(technicianId, scheduledAt) {
  const q = query(collection(db, 'bookings'), where('technicianId', '==', technicianId));
  const snap = await getDocs(q);
  const conflicts = [];
  snap.forEach((d) => {
    const row = d.data();
    if (
      [BOOKING_STATUS.NEW, BOOKING_STATUS.ASSIGNED].includes(row.status) &&
      sameSlot(row.scheduledAt, scheduledAt)
    ) {
      conflicts.push(row);
    }
  });
  return conflicts.length === 0;
}

export async function findAndAssignTechnician(bookingId, addressMap, scheduledAt) {
  const targetCity = cityFromAddressMap(addressMap);
  const targetArea = normalize(addressMap?.line1).split(',').map((x) => x.trim()).filter(Boolean)[0] || '';
  const targetTokens = [normalize(targetCity), normalize(targetArea)].filter(Boolean);
  const q = query(
    collection(db, techniciansCol),
    where('status', '==', TECHNICIAN_STATUS.AVAILABLE),
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    return { assigned: false };
  }

  const candidates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const available = await isTechnicianFreeAt(d.id, scheduledAt);
    if (!available && scheduledAt) {
      continue;
    }

    const pending = typeof data.pendingBookings === 'number' ? data.pendingBookings : 0;
    const score = areaScore(data, targetTokens);
    candidates.push({ id: d.id, ...data, pending, score });
  }

  if (!candidates.length) return { assigned: false };

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.pending - b.pending;
  });

  const chosen = candidates[0];
  const techRef = doc(db, techniciansCol, chosen.id);

  await updateDoc(techRef, {
    status: TECHNICIAN_STATUS.BUSY,
    pendingBookings: chosen.pending + 1,
    updatedAt: serverTimestamp(),
  });

  const technicianPhone =
    [chosen.phone, chosen.mobile, chosen.contactNumber, chosen.phoneNumber]
      .map((x) => (x != null ? String(x).trim() : ''))
      .find((s) => s.length > 0) || '';

  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, {
    status: 'Assigned',
    technicianId: chosen.id,
    technicianName: chosen.name || '',
    ...(technicianPhone ? { technicianPhone } : {}),
    updatedAt: serverTimestamp(),
  });

  return { assigned: true, technicianName: chosen.name };
}

/** Phone for calling technician; reads common Firestore field names. */
export async function getTechnicianPhoneById(technicianId) {
  if (!technicianId || typeof technicianId !== 'string') return null;
  try {
    const snap = await getDoc(doc(db, techniciansCol, technicianId));
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const raw =
      d.phone ?? d.mobile ?? d.contactNumber ?? d.phoneNumber ?? null;
    if (raw == null) return null;
    const s = String(raw).trim();
    return s.length ? s : null;
  } catch {
    return null;
  }
}
