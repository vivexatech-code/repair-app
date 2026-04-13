import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateBookingCode } from '../utils/bookingCode';
import { BOOKING_STATUS } from '../constants';
import { findAndAssignTechnician } from './technicianService';
import {
  notifyBookingCreated,
  notifyTechnicianAssigned,
} from './notificationService';
import { incrementCustomerBookings } from './customerService';

const bookingsCol = 'bookings';

function toFirestoreTimestamp(value) {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  return Timestamp.now();
}

export function subscribeCustomerBookings(customerId, onNext, onError) {
  const q = query(
    collection(db, bookingsCol),
    where('customerId', '==', customerId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
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

export async function createBooking({
  customerId,
  serviceId,
  serviceName,
  amount,
  durationMinutes,
  address,
  scheduledAt,
  notes,
}) {
  const bookingCode = generateBookingCode(8);
  const payload = {
    customerId,
    serviceId,
    serviceName,
    amount,
    durationMinutes,
    address,
    scheduledAt: toFirestoreTimestamp(scheduledAt),
    createdAt: serverTimestamp(),
    status: BOOKING_STATUS.NEW,
    bookingCode,
    notes: notes || '',
  };

  const ref = await addDoc(collection(db, bookingsCol), payload);
  await notifyBookingCreated(bookingCode);
  await incrementCustomerBookings(customerId);

  try {
    const assign = await findAndAssignTechnician(ref.id, address);
    if (assign.assigned) {
      await notifyTechnicianAssigned(bookingCode);
    }
  } catch {
    /* assignment is best-effort; booking stays New */
  }

  return { id: ref.id, bookingCode };
}
