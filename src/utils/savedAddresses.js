import AsyncStorage from '@react-native-async-storage/async-storage';

const keyForUid = (uid) => `repair_series_saved_addresses_${uid}`;

export async function loadSavedAddresses(uid) {
  if (!uid) return [];
  try {
    const raw = await AsyncStorage.getItem(keyForUid(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSavedAddresses(uid, list) {
  if (!uid) return;
  await AsyncStorage.setItem(keyForUid(uid), JSON.stringify(list));
}
