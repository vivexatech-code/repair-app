import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const GUEST_BROWSE_KEY = 'repair_series_guest_browse_v1';

const GuestBrowseContext = createContext(null);

export function GuestBrowseProvider({ children }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [isGuestBrowse, setIsGuestBrowse] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(GUEST_BROWSE_KEY);
        if (active) setIsGuestBrowse(v === '1');
      } catch {
        if (active) setIsGuestBrowse(false);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsGuestBrowse(false);
    (async () => {
      try {
        await AsyncStorage.removeItem(GUEST_BROWSE_KEY);
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  const enterGuestBrowse = useCallback(async () => {
    try {
      await AsyncStorage.setItem(GUEST_BROWSE_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsGuestBrowse(true);
  }, []);

  /**
   * End guest mode and show login. After successful sign-in, app navigates to pendingRoute.
   */
  const promptLogin = useCallback((route) => {
    if (route?.name) {
      setPendingRoute({
        name: route.name,
        params: route.params || {},
      });
    } else {
      setPendingRoute(null);
    }
    setIsGuestBrowse(false);
    (async () => {
      try {
        await AsyncStorage.removeItem(GUEST_BROWSE_KEY);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const consumePendingRoute = useCallback(() => {
    setPendingRoute(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      isGuestBrowse,
      enterGuestBrowse,
      promptLogin,
      pendingRoute,
      consumePendingRoute,
    }),
    [
      ready,
      isGuestBrowse,
      enterGuestBrowse,
      promptLogin,
      pendingRoute,
      consumePendingRoute,
    ],
  );

  return (
    <GuestBrowseContext.Provider value={value}>
      {children}
    </GuestBrowseContext.Provider>
  );
}

export function useGuestBrowse() {
  const ctx = useContext(GuestBrowseContext);
  if (!ctx) {
    throw new Error('useGuestBrowse must be used within GuestBrowseProvider');
  }
  return ctx;
}
