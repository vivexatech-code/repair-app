import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeCustomerBookings } from '../services/bookingService';
import { useAuth } from './AuthContext';

const BookingsContext = createContext(null);
const bookingStatusCacheKey = (uid) => `repair_series_booking_status_cache_${uid}`;

async function loadBookingStatusCache(uid) {
  if (!uid) return { cache: {}, hasPersistedCache: false };
  try {
    const raw = await AsyncStorage.getItem(bookingStatusCacheKey(uid));
    if (!raw) return { cache: {}, hasPersistedCache: false };
    const parsed = JSON.parse(raw);
    return {
      cache: parsed && typeof parsed === 'object' ? parsed : {},
      hasPersistedCache: true,
    };
  } catch {
    return { cache: {}, hasPersistedCache: false };
  }
}

async function saveBookingStatusCache(uid, cache) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(bookingStatusCacheKey(uid), JSON.stringify(cache));
  } catch {
    // best effort only
  }
}

export function BookingsProvider({ children }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevStatusRef = useRef({});
  const hasSyncedRef = useRef(false);
  const hasPersistedCacheRef = useRef(false);
  const [statusCacheReady, setStatusCacheReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user?.uid) {
      prevStatusRef.current = {};
      hasSyncedRef.current = false;
      hasPersistedCacheRef.current = false;
      setStatusCacheReady(true);
      return undefined;
    }

    setStatusCacheReady(false);
    loadBookingStatusCache(user.uid).then(({ cache, hasPersistedCache }) => {
      if (!active) return;
      prevStatusRef.current = cache;
      hasPersistedCacheRef.current = hasPersistedCache;
      hasSyncedRef.current = false;
      setStatusCacheReady(true);
    });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setBookings([]);
      setLoading(false);
      return undefined;
    }
    if (!statusCacheReady) return undefined;
    setLoading(true);
    const unsub = subscribeCustomerBookings(
      user.uid,
      (rows) => {
        setBookings(Array.isArray(rows) ? rows : []);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message || 'Failed to load bookings');
        setLoading(false);
      },
    );
    return unsub;
  }, [statusCacheReady, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !statusCacheReady) return;

    const prev = prevStatusRef.current;
    const next = { ...prev };

    const syncNotifications = async () => {
      try {
        bookings.forEach((b) => {
          const id = b?.id;
          if (!id) return;
          next[id] = b?.status;
        });

        prevStatusRef.current = next;
        hasPersistedCacheRef.current = true;
        hasSyncedRef.current = true;
        await saveBookingStatusCache(user.uid, next);
      } catch {
        /* avoid crash if storage or mapping fails */
      }
    };

    if (!hasSyncedRef.current) {
      syncNotifications();
      return;
    }

    try {
      bookings.forEach((b) => {
        const id = b?.id;
        if (!id) return;
        next[id] = b?.status;
      });

      prevStatusRef.current = next;
      saveBookingStatusCache(user.uid, next).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [bookings, statusCacheReady, user?.uid]);

  const value = useMemo(
    () => ({ bookings, loading, error }),
    [bookings, loading, error],
  );

  return (
    <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within BookingsProvider');
  return ctx;
}
