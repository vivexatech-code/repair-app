import AsyncStorage from '@react-native-async-storage/async-storage';

const keyForUid = (uid) => `repair_series_customer_profile_cache_v1_${uid}`;

export async function loadCustomerProfileCache(uid) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(keyForUid(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCustomerProfileCache(uid, profile) {
  if (!uid || !profile) return;
  try {
    const slim = {
      id: profile.id,
      addresses: profile.addresses,
      lastUsedAddress: profile.lastUsedAddress,
    };
    await AsyncStorage.setItem(keyForUid(uid), JSON.stringify(slim));
  } catch {
    // best effort
  }
}
