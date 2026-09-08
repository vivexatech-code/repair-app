import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Location from 'expo-location';
import { devWarn } from '../utils/devLog';
import {
  isStoredLocationFresh,
  loadStoredUserLocation,
  saveStoredUserLocation,
} from '../utils/userLocationCache';

const LocationContext = createContext(null);
const DEFAULT_LOCATION = 'Set your service location';

/** Short label for "Location detected: …" success line. */
function cityLabelFromPlace(place, fullLabel) {
  if (place?.city) return String(place.city);
  if (place?.region) return String(place.region);
  if (fullLabel) {
    const parts = String(fullLabel)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts[parts.length - 1] || fullLabel;
  }
  return '';
}

function formatGeoLabel(place, coords) {
  const area = place?.district || place?.subregion || place?.name || 'Current area';
  const city = place?.city || place?.region || '';
  const line = [area, city].filter(Boolean).join(', ');
  if (coords?.latitude != null && coords?.longitude != null) {
    return line || `${Number(coords.latitude).toFixed(4)}, ${Number(coords.longitude).toFixed(4)}`;
  }
  return line || DEFAULT_LOCATION;
}

function applyCachedToState(cached, setters) {
  if (!cached) return false;
  const { setLocationLabel, setCoords, setCityName, setPermissionStatus } = setters;
  if (cached.locationLabel) setLocationLabel(cached.locationLabel);
  const coords = cached.coords || (cached.latitude != null
    ? { latitude: cached.latitude, longitude: cached.longitude }
    : null);
  setCoords(coords);
  setPermissionStatus(cached.permissionStatus || 'undetermined');
  const cn =
    (cached.cityName && String(cached.cityName).trim()) ||
    (cached.city && String(cached.city).trim()) ||
    cityLabelFromPlace(null, cached.locationLabel) ||
    '';
  setCityName(cn);
  return true;
}

export function LocationProvider({ children }) {
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION);
  const [cityName, setCityName] = useState('');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');

  useEffect(() => {
    let active = true;
    (async () => {
      const cached = await loadStoredUserLocation();
      if (active) {
        applyCachedToState(cached, {
          setLocationLabel,
          setCoords,
          setCityName,
          setPermissionStatus,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refreshLocation = useCallback(async (options = {}) => {
    const force = options?.force === true;
    if (!force) {
      const cached = await loadStoredUserLocation();
      if (cached && isStoredLocationFresh(cached)) {
        applyCachedToState(cached, {
          setLocationLabel,
          setCoords,
          setCityName,
          setPermissionStatus,
        });
        return { fromCache: true };
      }
    }

    setLoading(true);
    try {
      let permission;
      try {
        permission = await Location.requestForegroundPermissionsAsync();
      } catch (e) {
        devWarn('location', 'requestForegroundPermissionsAsync failed', e);
        setLoading(false);
        return { fromCache: false, denied: true };
      }
      setPermissionStatus(permission?.status ?? 'undetermined');

      if (permission?.status !== 'granted') {
        setLoading(false);
        return { fromCache: false, denied: true };
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const currentCoords = current?.coords || null;
      setCoords(currentCoords);

      let label = DEFAULT_LOCATION;
      let place0 = null;
      if (currentCoords) {
        try {
          const places = await Location.reverseGeocodeAsync(currentCoords);
          place0 = places?.[0] || null;
          label = formatGeoLabel(place0, currentCoords);
        } catch {
          label =
            currentCoords?.latitude != null && currentCoords?.longitude != null
              ? `${Number(currentCoords.latitude).toFixed(4)}, ${Number(currentCoords.longitude).toFixed(4)}`
              : DEFAULT_LOCATION;
        }
      }

      setLocationLabel(label);
      const cn = cityLabelFromPlace(place0, label) || label;
      setCityName(cn);
      await saveStoredUserLocation({
        locationLabel: label,
        address: label,
        latitude: currentCoords?.latitude,
        longitude: currentCoords?.longitude,
        lat: currentCoords?.latitude,
        lng: currentCoords?.longitude,
        coords: currentCoords,
        cityName: cn,
        city: place0?.city || cn,
        state: place0?.region || '',
        pincode: place0?.postalCode || '',
        permissionStatus: permission?.status ?? 'granted',
        manual: false,
      });
      return { fromCache: false };
    } catch (e) {
      devWarn('location', 'refreshLocation failed', e);
      return { fromCache: false, error: e };
    } finally {
      setLoading(false);
    }
  }, []);

  const setManualLocation = useCallback(async (input) => {
    const isObj = input && typeof input === 'object';
    const next = isObj
      ? String(input.fullAddress || input.line1 || input.label || '').trim() || DEFAULT_LOCATION
      : String(input || '').trim() || DEFAULT_LOCATION;

    let nextCoords = coords;
    if (isObj) {
      const lat = Number(input.lat ?? input.latitude);
      const lng = Number(input.lng ?? input.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        nextCoords = { latitude: lat, longitude: lng };
        setCoords(nextCoords);
      }
    }

    setLocationLabel(next);
    const cn =
      (isObj && (input.city || input.cityName)) ||
      cityLabelFromPlace(null, next) ||
      next;
    setCityName(String(cn));
    try {
      await saveStoredUserLocation({
        locationLabel: next,
        address: next,
        cityName: String(cn),
        city: isObj ? String(input.city || cn) : String(cn),
        state: isObj ? String(input.state || '') : '',
        pincode: isObj ? String(input.pincode || input.postalCode || '') : '',
        latitude: nextCoords?.latitude,
        longitude: nextCoords?.longitude,
        lat: nextCoords?.latitude,
        lng: nextCoords?.longitude,
        coords: nextCoords,
        permissionStatus,
        manual: true,
      });
    } catch {
      /* cache optional */
    }
  }, [coords, permissionStatus]);

  const value = useMemo(
    () => ({
      locationLabel,
      cityName,
      coords,
      loading,
      permissionStatus,
      refreshLocation,
      setManualLocation,
    }),
    [
      locationLabel,
      cityName,
      coords,
      loading,
      permissionStatus,
      refreshLocation,
      setManualLocation,
    ],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used within LocationProvider');
  return ctx;
}
