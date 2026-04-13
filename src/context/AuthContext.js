import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getCustomerProfile } from '../services/customerService';
import {
  loginWithEmail,
  logout as authLogout,
  signUpWithEmail,
} from '../services/authService';
import { createCustomerProfile } from '../services/customerService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (uid) => {
    setProfileLoading(true);
    try {
      const data = await getCustomerProfile(uid);
      setCustomer(data);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u.uid);
      } else {
        setCustomer(null);
      }
      setInitializing(false);
    });
    return unsub;
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const u = await loginWithEmail(email, password);
    await loadProfile(u.uid);
    return u;
  }, [loadProfile]);

  const signUp = useCallback(
    async ({ name, email, password, phone, address }) => {
      const u = await signUpWithEmail(name, email, password);
      await createCustomerProfile(u.uid, {
        name,
        email,
        phone,
        address,
      });
      await authLogout();
    },
    [],
  );

  const logout = useCallback(async () => {
    await authLogout();
    setCustomer(null);
  }, []);

  const refreshCustomer = useCallback(async () => {
    if (user?.uid) await loadProfile(user.uid);
  }, [loadProfile, user?.uid]);

  const value = useMemo(
    () => ({
      user,
      customer,
      initializing,
      profileLoading,
      login,
      signUp,
      logout,
      refreshCustomer,
    }),
    [
      user,
      customer,
      initializing,
      profileLoading,
      login,
      signUp,
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
