import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateCustomerProfile } from './customerService';

const DEFAULT_PREFS = {
  bookingUpdates: true,
  offers: true,
  marketing: false,
};

export function normalizeNotificationPrefs(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    bookingUpdates: src.bookingUpdates !== false,
    offers: src.offers !== false,
    marketing: src.marketing === true,
  };
}

/**
 * Prefer customers/{uid}/notifications; fall back to userNotifications where userId==uid.
 */
export function subscribeUserNotifications(userId, onNext, onError) {
  if (!userId) {
    onNext?.([]);
    return () => {};
  }

  const uid = String(userId);
  let primaryFailed = false;

  const unsubPrimary = onSnapshot(
    query(collection(db, 'customers', uid, 'notifications')),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), _source: 'sub' }));
      rows.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? (new Date(a.createdAt || 0).getTime() || 0);
        const tb = b.createdAt?.toMillis?.() ?? (new Date(b.createdAt || 0).getTime() || 0);
        return tb - ta;
      });
      onNext?.(rows);
    },
    () => {
      primaryFailed = true;
    },
  );

  const unsubFallback = onSnapshot(
    query(collection(db, 'userNotifications'), where('userId', '==', uid)),
    (snap) => {
      if (!primaryFailed && snap.empty) return;
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), _source: 'root' }));
      rows.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? (new Date(a.createdAt || 0).getTime() || 0);
        const tb = b.createdAt?.toMillis?.() ?? (new Date(b.createdAt || 0).getTime() || 0);
        return tb - ta;
      });
      if (primaryFailed || rows.length) onNext?.(rows);
    },
    onError,
  );

  return () => {
    try {
      unsubPrimary();
    } catch {
      /* ignore */
    }
    try {
      unsubFallback();
    } catch {
      /* ignore */
    }
  };
}

export async function markNotificationRead(userId, notification) {
  if (!userId || !notification?.id) return;
  try {
    if (notification._source === 'root') {
      await updateDoc(doc(db, 'userNotifications', notification.id), {
        read: true,
        readAt: serverTimestamp(),
      });
      return;
    }
    await updateDoc(doc(db, 'customers', String(userId), 'notifications', notification.id), {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch {
    /* best effort */
  }
}

/**
 * Persist an inbox row when scheduling a local notification (best-effort).
 */
export async function writeLocalInboxNotification(userId, { title, body, data } = {}) {
  if (!userId) return null;
  const prefsOk = true;
  if (!prefsOk) return null;
  try {
    const ref = await addDoc(collection(db, 'customers', String(userId), 'notifications'), {
      title: String(title || 'Notification'),
      body: String(body || ''),
      data: data && typeof data === 'object' ? data : {},
      read: false,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch {
    try {
      const ref = await addDoc(collection(db, 'userNotifications'), {
        userId: String(userId),
        title: String(title || 'Notification'),
        body: String(body || ''),
        data: data && typeof data === 'object' ? data : {},
        read: false,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch {
      return null;
    }
  }
}

export async function updateNotificationPrefs(userId, prefs) {
  if (!userId) return;
  const next = normalizeNotificationPrefs(prefs);
  await updateCustomerProfile(userId, { notificationPrefs: next });
  return next;
}

export { DEFAULT_PREFS };
