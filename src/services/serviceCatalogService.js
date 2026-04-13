import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { SERVICE_STATUS } from '../constants';

const servicesCol = 'services';

export async function fetchActiveServices() {
  const q = query(
    collection(db, servicesCol),
    where('status', '==', SERVICE_STATUS.ACTIVE),
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function fetchAllServices() {
  const snap = await getDocs(collection(db, servicesCol));
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function fetchServiceById(serviceId) {
  const ref = doc(db, servicesCol, serviceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
