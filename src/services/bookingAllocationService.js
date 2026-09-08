import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { BOOKING_STATUS } from '../constants';
import { BOOKING_DAY_SLOTS, isSlotPastForDate, isPastDateKey } from '../constants/bookingSlots';
import { getDefaultTechnicianServiceRadiusKm } from './generalSettingsService';

const techniciansCol = 'technicians';

/** Earth radius in km */
const R = 6371;

export function formatLocalDateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function readTechnicianLocation(data) {
  const loc = data?.location;
  if (loc && typeof loc === 'object') {
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(data?.lat);
  const lng = Number(data?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

export function getBusySlotDocumentId(dateStr, slotIndex) {
  return `${dateStr}_${Number(slotIndex)}`;
}

function techMatchesCategory(data, categoryId) {
  const c = String(categoryId ?? '').trim();
  if (!c) return false;
  const single = String(data?.categoryId ?? '').trim();
  if (single && single === c) return true;
  const primary = String(data?.primaryCategoryId ?? '').trim();
  if (primary && primary === c) return true;
  const arr = Array.isArray(data?.categoryIds) ? data.categoryIds : null;
  if (arr && arr.some((x) => String(x).trim() === c)) return true;
  return false;
}

export async function fetchTechniciansMatchingCategory(categoryId) {
  const c = String(categoryId ?? '').trim();
  if (!c) return [];
  const snap = await getDocs(collection(db, techniciansCol));
  const rows = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    if (!techMatchesCategory(data, c)) return;
    rows.push({ id: d.id, ...data });
  });
  return rows;
}

export function filterWithinRadiusKm(technicians, userLat, userLng, radiusKm) {
  const ulat = Number(userLat);
  const ulng = Number(userLng);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return [];
  if (!Number.isFinite(ulat) || !Number.isFinite(ulng)) return [];

  return technicians
    .map((t) => {
      const loc = readTechnicianLocation(t);
      if (!loc) return { ...t, _distanceKm: Infinity };
      const km = haversineKm(ulat, ulng, loc.lat, loc.lng);
      return { ...t, _distanceKm: km };
    })
    .filter((t) => t._distanceKm <= radiusKm)
    .sort((a, b) => a._distanceKm - b._distanceKm);
}

function normalizeSlotLabel(s) {
  return String(s ?? '').trim();
}

async function fetchBusySlotMapsForDate(technicianIds, dateStr) {
  const maps = {};
  for (const id of technicianIds) {
    const q = query(
      collection(db, techniciansCol, id, 'busySlots'),
      where('date', '==', dateStr),
    );
    const snap = await getDocs(q);
    const m = new Map();
    snap.forEach((docSnap) => {
      const x = docSnap.data() || {};
      const si = Number(x.slotIndex ?? docSnap.id.split('_').pop());
      if (!Number.isFinite(si)) return;
      m.set(si, { ...x, id: docSnap.id });
    });
    maps[id] = m;
  }
  return maps;
}

function isSlotBusyEntry(entry) {
  if (!entry) return false;
  return String(entry.status ?? '').toLowerCase() === 'busy';
}

/**
 * Returns visible time windows: fixed {@link BOOKING_DAY_SLOTS} minus windows where
 * every eligible technician has a `busySlots` doc with `status: busy` for that `slotIndex`.
 * Availability is never read from Firestore — only busy records are.
 */
export async function getVisibleSlotsForDate({
  categoryId,
  userLat,
  userLng,
  pickedDate,
  radiusKm: radiusKmOverride,
}) {
  const radiusKm =
    radiusKmOverride != null
      ? Number(radiusKmOverride)
      : await getDefaultTechnicianServiceRadiusKm();
  const techsAll = await fetchTechniciansMatchingCategory(categoryId);
  const eligible = filterWithinRadiusKm(
    techsAll,
    userLat,
    userLng,
    Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 25,
  );
  const dateStr = formatLocalDateKey(pickedDate);
  const ids = eligible.map((t) => t.id);

  const allFixed = BOOKING_DAY_SLOTS;

  if (ids.length === 0) {
    return {
      visibleSlots: [],
      eligibleTechnicianIds: ids,
      radiusKm,
      noEligibleTechnicians: true,
      allSlotsBusy: false,
    };
  }

  const busyMaps = await fetchBusySlotMapsForDate(ids, dateStr);

  const visibleSlots = allFixed.filter((def) => {
    if (isSlotPastForDate(dateStr, def.slotIndex)) return false;
    const idx = def.slotIndex;
    for (const tid of ids) {
      const row = busyMaps[tid]?.get(idx);
      if (!isSlotBusyEntry(row)) return true;
    }
    return false;
  });

  return {
    visibleSlots,
    eligibleTechnicianIds: ids,
    radiusKm,
    noEligibleTechnicians: false,
    allSlotsBusy: visibleSlots.length === 0 && allFixed.length > 0,
  };
}

export async function isSlotStillAvailable({
  categoryId,
  userLat,
  userLng,
  dateStr,
  slotIndex,
  radiusKm: radiusKmOverride,
}) {
  const radiusKm =
    radiusKmOverride != null
      ? Number(radiusKmOverride)
      : await getDefaultTechnicianServiceRadiusKm();
  const techsAll = await fetchTechniciansMatchingCategory(categoryId);
  const eligible = filterWithinRadiusKm(
    techsAll,
    userLat,
    userLng,
    Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 25,
  );
  const ids = eligible.map((t) => t.id);
  if (!ids.length) return false;

  const idx = Number(slotIndex);
  if (isSlotPastForDate(dateStr, idx)) return false;
  const busyMaps = await fetchBusySlotMapsForDate(ids, dateStr);
  for (const tid of ids) {
    const row = busyMaps[tid]?.get(idx);
    if (!isSlotBusyEntry(row)) return true;
  }
  return false;
}

function technicianPhoneFromData(d) {
  return (
    [d?.phone, d?.mobile, d?.contactNumber, d?.phoneNumber].find(
      (x) => x != null && String(x).trim() !== '',
    ) || ''
  );
}

export async function assignNearestTechnicianAndLockBusySlot({
  bookingId,
  categoryId,
  userLat,
  userLng,
  dateStr,
  slotLabel,
  slotIndex,
}) {
  const dateKey = String(dateStr ?? '').trim();
  const idx = Number(slotIndex);
  if (isPastDateKey(dateKey)) {
    const err = new Error('Cannot book a past date.');
    err.code = 'PAST_DATE';
    throw err;
  }
  if (isSlotPastForDate(dateKey, idx)) {
    const err = new Error('This time slot has already passed.');
    err.code = 'PAST_SLOT';
    throw err;
  }

  const radiusKm = await getDefaultTechnicianServiceRadiusKm();
  const techsAll = await fetchTechniciansMatchingCategory(categoryId);
  const eligible = filterWithinRadiusKm(
    techsAll,
    userLat,
    userLng,
    radiusKm,
  );
  if (!eligible.length) {
    const err = new Error('NO_TECH_IN_RADIUS');
    err.code = 'NO_TECH_IN_RADIUS';
    throw err;
  }

  const docId = getBusySlotDocumentId(dateStr, slotIndex);
  const bookingRef = doc(db, 'bookings', bookingId);

  let locked = false;
  await runTransaction(db, async (transaction) => {
    for (const tech of eligible) {
      const busyRef = doc(
        db,
        techniciansCol,
        tech.id,
        'busySlots',
        docId,
      );
      const busySnap = await transaction.get(busyRef);
      const existing = busySnap.exists() ? busySnap.data() : null;
      if (busySnap.exists() && isSlotBusyEntry(existing)) {
        continue;
      }

      transaction.set(busyRef, {
        date: dateStr,
        slot: normalizeSlotLabel(slotLabel),
        slotIndex: Number(slotIndex),
        status: 'busy',
        reason: 'booking',
        bookingId,
        createdAt: serverTimestamp(),
      });

      const phone = technicianPhoneFromData(tech);
      transaction.update(bookingRef, {
        status: BOOKING_STATUS.ASSIGNED,
        technicianId: tech.id,
        technicianName: String(tech.name ?? '').trim() || '',
        ...(phone ? { technicianPhone: String(phone).trim() } : {}),
        scheduledSlotDate: dateStr,
        scheduledSlotLabel: normalizeSlotLabel(slotLabel),
        scheduledSlotIndex: Number(slotIndex),
        updatedAt: serverTimestamp(),
      });
      locked = true;
      return;
    }
  });

  if (!locked) {
    const err = new Error('ALL_TECHS_BUSY');
    err.code = 'ALL_TECHS_BUSY';
    throw err;
  }
}

export async function assignExistingTechnicianToBooking(bookingId, technicianId) {
  if (!bookingId || !technicianId) return;
  const techSnap = await getDoc(doc(db, techniciansCol, technicianId));
  if (!techSnap.exists()) return;
  const tech = techSnap.data() || {};
  const phone = technicianPhoneFromData(tech);
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: BOOKING_STATUS.ASSIGNED,
    technicianId,
    technicianName: String(tech.name ?? '').trim() || '',
    ...(phone ? { technicianPhone: String(phone).trim() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function releaseBusySlotForBooking(booking) {
  const techId = String(booking?.technicianId ?? '').trim();
  const dateStr = String(booking?.scheduledSlotDate ?? '').trim();
  const slotIndex = Number(booking?.scheduledSlotIndex);
  const bookingId = String(booking?.id ?? '').trim();
  if (!techId || !dateStr || !Number.isFinite(slotIndex) || slotIndex < 1 || !bookingId) {
    return;
  }
  const docId = getBusySlotDocumentId(dateStr, slotIndex);
  const busyRef = doc(db, techniciansCol, techId, 'busySlots', docId);
  const snap = await getDoc(busyRef);
  if (!snap.exists()) return;
  const bid = String(snap.data()?.bookingId ?? '').trim();
  if (bid === bookingId) {
    await deleteDoc(busyRef);
  }
}

/**
 * Lock a busy slot for a known technician (reschedule / follow-up).
 * Allows overwrite when the existing busy doc already belongs to this booking.
 */
export async function lockBusySlotForTechnician({
  technicianId,
  bookingId,
  dateStr,
  slotLabel,
  slotIndex,
}) {
  const techId = String(technicianId || '').trim();
  const bid = String(bookingId || '').trim();
  const date = String(dateStr || '').trim();
  const idx = Number(slotIndex);
  if (!techId || !bid || !date || !Number.isFinite(idx) || idx < 1) {
    throw new Error('Missing technician or slot details.');
  }
  if (isPastDateKey(date)) {
    throw new Error('Cannot book a past date.');
  }
  if (isSlotPastForDate(date, idx)) {
    throw new Error('This time slot has already passed. Please choose a future slot.');
  }

  const docId = getBusySlotDocumentId(date, idx);
  const busyRef = doc(db, techniciansCol, techId, 'busySlots', docId);

  await runTransaction(db, async (transaction) => {
    const busySnap = await transaction.get(busyRef);
    if (busySnap.exists()) {
      const existing = busySnap.data() || {};
      const existingBid = String(existing.bookingId ?? '').trim();
      if (isSlotBusyEntry(existing) && existingBid && existingBid !== bid) {
        const err = new Error('ALL_TECHS_BUSY');
        err.code = 'ALL_TECHS_BUSY';
        throw err;
      }
    }
    transaction.set(busyRef, {
      date,
      slot: normalizeSlotLabel(slotLabel),
      slotIndex: idx,
      status: 'busy',
      reason: 'booking',
      bookingId: bid,
      createdAt: serverTimestamp(),
    });
  });
}
