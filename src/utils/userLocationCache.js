import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_LOCATION_CACHE_KEY = 'repair_series_user_location_v1';
export const LOCATION_ONBOARDING_KEY = 'repair_series_location_onboarding_v1';
export const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000;

export async function loadStoredUserLocation() {
  try {
    const raw = await AsyncStorage.getItem(USER_LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const lat = Number(parsed.latitude ?? parsed.lat);
    const lng = Number(parsed.longitude ?? parsed.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      ...parsed,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      cachedAt: Number(parsed.cachedAt) || 0,
    };
  } catch {
    return null;
  }
}

export async function saveStoredUserLocation(payload) {
  const nested = payload?.coords || {};
  const lat = Number(
    payload.latitude ?? payload.lat ?? nested.latitude ?? nested.lat,
  );
  const lng = Number(
    payload.longitude ?? payload.lng ?? nested.longitude ?? nested.lng,
  );
  const safe = {
    ...payload,
    ...(Number.isFinite(lat) ? { lat, latitude: lat } : {}),
    ...(Number.isFinite(lng) ? { lng, longitude: lng } : {}),
    cachedAt: Date.now(),
  };
  // Never persist NaN coords — that breaks cache reload and forces a new GPS label every open.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    delete safe.lat;
    delete safe.lng;
    delete safe.latitude;
    delete safe.longitude;
  }
  await AsyncStorage.setItem(USER_LOCATION_CACHE_KEY, JSON.stringify(safe));
}

export function isStoredLocationFresh(stored, ttlMs = LOCATION_CACHE_TTL_MS) {
  if (!stored?.cachedAt) return false;
  return Date.now() - stored.cachedAt < ttlMs;
}

export function storedLocationToBookingAddress(stored) {
  const label =
    stored.address ||
    stored.locationLabel ||
    stored.fullAddress ||
    stored.label ||
    '';
  return {
    id: `loc_${Date.now()}`,
    type: 'Home',
    fullAddress: label,
    city: stored.city || stored.cityName || '',
    state: stored.state || '',
    pincode: stored.pincode || '',
    lat: stored.lat,
    lng: stored.lng,
  };
}
