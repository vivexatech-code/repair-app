import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { subscribeAppSettings } from '../services/appSettingsService';
import { devWarn } from '../utils/devLog';

/** Shown only when Firestore has no values (never as primary marketing copy). */
export const FALLBACK_SUPPORT_EMAIL = 'support@repairseries.com';
export const FALLBACK_SUPPORT_PHONE = '+911800000111';

const EMPTY = {
  supportEmail: null,
  supportPhone: null,
  aboutApp: null,
  customerTerms: null,
  customerPrivacyPolicy: null,
  partnerTerms: null,
  partnerPrivacyPolicy: null,
  customerTermsUpdatedAt: null,
  customerPrivacyUpdatedAt: null,
  partnerTermsUpdatedAt: null,
  partnerPrivacyUpdatedAt: null,
  updatedAt: null,
};

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAppSettings(
      (next) => {
        setSettings(next);
        setLoading(false);
      },
      (err) => {
        devWarn('appSettings', 'subscribe failed', err);
        setLoading(false);
      },
    );
    return () => unsub?.();
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      loading,
      resolvedSupportEmail: (settings.supportEmail && settings.supportEmail.trim()) || FALLBACK_SUPPORT_EMAIL,
      resolvedSupportPhone: (settings.supportPhone && settings.supportPhone.trim()) || null,
    }),
    [settings, loading],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return ctx;
}
