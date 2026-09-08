import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { logout as authLogout } from '../services/authService';
import {
  emptyCustomerProfile,
  ensureCustomerFromAuth,
  getCustomerProfile,
  normalizeCustomerProfile,
  saveCustomerPushToken,
} from '../services/customerService';
import {
  isExpoGoEnvironment,
  registerForPushNotificationsAsync,
} from '../services/notificationService';
import { authTimeline, devLog, devWarn } from '../utils/devLog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(() => emptyCustomerProfile(''));
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [identityResolving, setIdentityResolving] = useState(false);
  const profileLoadGenRef = useRef(0);
  const identityResolvingRef = useRef(false);
  const applyUserRef = useRef(async () => {});

  const loadProfile = useCallback(async (uid) => {
    if (!uid) {
      setCustomer(emptyCustomerProfile(''));
      return;
    }

    const gen = ++profileLoadGenRef.current;
    setProfileLoading(true);

    try {
      authTimeline('Profile loading started', { uid });
      devLog('auth', 'loadProfile start', uid);

      const profile = await getCustomerProfile(uid);

      if (gen !== profileLoadGenRef.current) {
        devLog('auth', 'loadProfile skipped (superseded)', uid);
        authTimeline('Profile request superseded', {
          uid,
          reason: 'newer-session-started',
        });
        return;
      }
      if (auth.currentUser?.uid !== uid) {
        devLog('auth', 'loadProfile skipped (session changed)', uid);
        authTimeline('Profile request dropped (session changed)', {
          uid,
          liveUid: auth.currentUser?.uid || null,
        });
        return;
      }

      if (!profile.exists) {
        authTimeline('customers doc not found — keeping Firebase session', { uid });
        if (identityResolvingRef.current) {
          setCustomer(profile);
          return;
        }
        const ensured = await ensureCustomerFromAuth(uid, {
          phone: auth.currentUser?.phoneNumber || '',
          name: auth.currentUser?.displayName || '',
          email: auth.currentUser?.email || '',
        });
        if (gen !== profileLoadGenRef.current || auth.currentUser?.uid !== uid) {
          return;
        }
        setCustomer(ensured.profile);
        authTimeline('customers doc ensured', { uid, created: ensured.created });
        return;
      }

      const next = normalizeCustomerProfile(uid, { ...profile, exists: true });
      if (next.blocked === true) {
        devWarn('auth', 'blocked customer signed out', uid);
        await authLogout('customer-blocked', 'AuthContext.loadProfile');
        return;
      }
      setCustomer(next);
      authTimeline('Profile loaded', { uid, exists: true });
      devLog('auth', 'loadProfile ok', profile.id);
    } catch (e) {
      devWarn('auth', 'loadProfile failed', e);
      if (gen === profileLoadGenRef.current && auth.currentUser?.uid === uid) {
        setCustomer(emptyCustomerProfile(uid ?? ''));
      }
    } finally {
      if (gen === profileLoadGenRef.current) {
        setProfileLoading(false);
      }
    }
  }, []);

  const applyUser = useCallback(
    async (u) => {
      try {
        if (u?.uid) {
          authTimeline('Auth state received: USER', { uid: u.uid });
          setUser(u);
          try {
            await loadProfile(u.uid);
          } catch (e) {
            devWarn('auth', 'loadProfile in listener failed', e);
            setCustomer(emptyCustomerProfile(u.uid));
          }

          if (!isExpoGoEnvironment()) {
            try {
              const push = await registerForPushNotificationsAsync().catch(() => null);
              if (push?.token && auth.currentUser?.uid === u.uid) {
                await saveCustomerPushToken(u.uid, push).catch((err) => {
                  devWarn('auth', 'saveCustomerPushToken failed', err);
                });
              }
            } catch (e) {
              devWarn('auth', 'push registration failed', e);
            }
          }
          return;
        }

        authTimeline('Auth state received: SIGNED OUT');
        if (identityResolvingRef.current) {
          authTimeline('signed-out during identity resolution — navigation held on login');
          return;
        }

        setUser(null);
        profileLoadGenRef.current += 1;
        setCustomer(emptyCustomerProfile(''));
        setProfileLoading(false);
      } catch (e) {
        devWarn('auth', 'onAuthStateChanged handler error', e);
        if (u?.uid) {
          setCustomer(emptyCustomerProfile(u.uid));
        }
      } finally {
        setInitializing(false);
      }
    },
    [loadProfile],
  );

  applyUserRef.current = applyUser;

  const beginIdentityResolution = useCallback(() => {
    identityResolvingRef.current = true;
    setIdentityResolving(true);
    authTimeline('identity resolution started');
  }, []);

  const endIdentityResolution = useCallback(() => {
    identityResolvingRef.current = false;
    setIdentityResolving(false);
    const live = auth.currentUser;
    authTimeline('identity resolution ended', { uid: live?.uid || null });
    if (!live) {
      setUser(null);
      profileLoadGenRef.current += 1;
      setCustomer(emptyCustomerProfile(''));
      setProfileLoading(false);
      return;
    }
    void applyUserRef.current(live);
  }, []);

  useEffect(() => {
    authTimeline('Auth listener registered');
    const unsub = onAuthStateChanged(auth, (u) => {
      void applyUser(u);
    });
    return () => {
      unsub();
      authTimeline('Auth listener removed');
    };
  }, [applyUser]);

  const logout = useCallback(async () => {
    identityResolvingRef.current = false;
    setIdentityResolving(false);
    profileLoadGenRef.current += 1;
    setProfileLoading(false);
    try {
      await authLogout('user-logout', 'AuthContext.logout');
    } catch (e) {
      devWarn('auth', 'logout failed', e);
    }
    setUser(null);
    setCustomer(emptyCustomerProfile(''));
  }, []);

  const refreshCustomer = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await loadProfile(user.uid);
    } catch (e) {
      devWarn('auth', 'refreshCustomer failed', e);
      setCustomer(emptyCustomerProfile(user.uid));
    }
  }, [loadProfile, user?.uid]);

  const customerForUi = useMemo(
    () =>
      normalizeCustomerProfile(
        user?.uid ?? '',
        customer == null || typeof customer !== 'object'
          ? emptyCustomerProfile(user?.uid ?? '')
          : customer,
      ),
    [customer, user?.uid],
  );

  const profileSettled =
    !user ||
    (!profileLoading && (!customer?.id || customer.id === user.uid));

  const appReady =
    !initializing && !identityResolving && profileSettled;

  const value = useMemo(
    () => ({
      user,
      customer: customerForUi,
      initializing,
      identityResolving,
      profileLoading,
      appReady,
      beginIdentityResolution,
      endIdentityResolution,
      logout,
      refreshCustomer,
    }),
    [
      user,
      customerForUi,
      initializing,
      identityResolving,
      profileLoading,
      appReady,
      beginIdentityResolution,
      endIdentityResolution,
      logout,
      refreshCustomer,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
