import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const ticketsCol = 'supportTickets';

/**
 * Subscribe to the signed-in customer's support tickets (newest first when possible).
 */
export function subscribeSupportTickets(customerId, onNext, onError) {
  if (!customerId) {
    onNext?.([]);
    return () => {};
  }
  const q = query(
    collection(db, ticketsCol),
    where('customerId', '==', String(customerId)),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? (new Date(a.createdAt || 0).getTime() || 0);
        const tb = b.createdAt?.toMillis?.() ?? (new Date(b.createdAt || 0).getTime() || 0);
        return tb - ta;
      });
      onNext?.(rows);
    },
    onError,
  );
}

export function subscribeSupportTicket(ticketId, onNext, onError) {
  if (!ticketId) {
    onNext?.(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, ticketsCol, ticketId),
    (snap) => {
      if (!snap.exists()) {
        onNext?.(null);
        return;
      }
      onNext?.({ id: snap.id, ...snap.data() });
    },
    onError,
  );
}

/**
 * @param {{ customerId: string, subject: string, message: string, bookingId?: string, customerName?: string, customerEmail?: string }} params
 */
export async function createSupportTicket(params) {
  const customerId = String(params?.customerId || '').trim();
  const subject = String(params?.subject || '').trim();
  const message = String(params?.message || '').trim();
  if (!customerId) throw new Error('Sign in required');
  if (!subject) throw new Error('Please enter a subject');
  if (!message) throw new Error('Please enter a message');

  const now = serverTimestamp();
  const firstMessage = {
    id: `m_${Date.now()}`,
    sender: 'customer',
    senderId: customerId,
    body: message,
    createdAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, ticketsCol), {
    customerId,
    subject,
    status: 'open',
    bookingId: params.bookingId ? String(params.bookingId).trim() : '',
    customerName: params.customerName ? String(params.customerName).trim() : '',
    customerEmail: params.customerEmail ? String(params.customerEmail).trim() : '',
    messages: [firstMessage],
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id };
}

export async function replyToSupportTicket({ ticketId, customerId, message }) {
  const tid = String(ticketId || '').trim();
  const uid = String(customerId || '').trim();
  const body = String(message || '').trim();
  if (!tid || !uid) throw new Error('Missing ticket or user');
  if (!body) throw new Error('Please enter a message');

  const msg = {
    id: `m_${Date.now()}`,
    sender: 'customer',
    senderId: uid,
    body,
    createdAt: new Date().toISOString(),
  };

  await updateDoc(doc(db, ticketsCol, tid), {
    messages: arrayUnion(msg),
    status: 'open',
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
