import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { TECHNICIAN_STATUS } from '../constants';
import { cityFromAddressMap } from '../utils/address';

const techniciansCol = 'technicians';

export async function findAndAssignTechnician(bookingId, addressMap) {
  const targetCity = cityFromAddressMap(addressMap);
  const q = query(
    collection(db, techniciansCol),
    where('status', '==', TECHNICIAN_STATUS.AVAILABLE),
    limit(20),
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    return { assigned: false };
  }

  let chosen = null;
  snap.forEach((d) => {
    const data = d.data();
    const area = (data.areaAddress || '').toLowerCase();
    if (chosen) return;
    if (targetCity && area.includes(targetCity)) {
      chosen = { id: d.id, ...data };
    }
  });

  if (!chosen) {
    const first = snap.docs[0];
    chosen = { id: first.id, ...first.data() };
  }

  const techRef = doc(db, techniciansCol, chosen.id);
  const pending = typeof chosen.pendingBookings === 'number' ? chosen.pendingBookings : 0;

  await updateDoc(techRef, {
    status: TECHNICIAN_STATUS.BUSY,
    pendingBookings: pending + 1,
    updatedAt: serverTimestamp(),
  });

  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, {
    status: 'Assigned',
    technicianId: chosen.id,
    technicianName: chosen.name || '',
    updatedAt: serverTimestamp(),
  });

  return { assigned: true, technicianName: chosen.name };
}
