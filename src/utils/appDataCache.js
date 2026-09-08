import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICES_KEY = 'repair_series_services_cache_v1';
const CATEGORIES_KEY = 'repair_series_categories_cache_v1';
const BANNERS_KEY = 'repair_series_banners_cache_v1';

export async function loadServicesCache() {
  try {
    const raw = await AsyncStorage.getItem(SERVICES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveServicesCache(list) {
  try {
    if (!Array.isArray(list)) return;
    await AsyncStorage.setItem(SERVICES_KEY, JSON.stringify(list));
  } catch {
    // best effort
  }
}

export async function loadCategoriesCache() {
  try {
    const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCategoriesCache(list) {
  try {
    if (!Array.isArray(list)) return;
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
  } catch {
    // best effort
  }
}

export async function loadBannersCache() {
  try {
    const raw = await AsyncStorage.getItem(BANNERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveBannersCache(list) {
  try {
    if (!Array.isArray(list)) return;
    await AsyncStorage.setItem(BANNERS_KEY, JSON.stringify(list));
  } catch {
    // best effort
  }
}
