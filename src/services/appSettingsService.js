import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

/** Single Firestore doc: `settings/app` — admin-controlled public app settings. */
const SETTINGS_DOC = doc(db, 'settings', 'app');

function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export function parseAppSettingsDoc(d) {
  const data = d && typeof d === 'object' ? d : {};
  return {
    supportEmail: str(data.supportEmail ?? data.support_email),
    supportPhone: str(data.supportPhone ?? data.support_phone),
    aboutApp: str(data.aboutApp),
    customerTerms: str(data.customerTerms),
    customerPrivacyPolicy: str(data.customerPrivacyPolicy),
    partnerTerms: str(data.partnerTerms),
    partnerPrivacyPolicy: str(data.partnerPrivacyPolicy),
    customerTermsUpdatedAt: data.customerTermsUpdatedAt || null,
    customerPrivacyUpdatedAt: data.customerPrivacyUpdatedAt || null,
    partnerTermsUpdatedAt: data.partnerTermsUpdatedAt || null,
    partnerPrivacyUpdatedAt: data.partnerPrivacyUpdatedAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export function formatLegalUpdatedAt(raw) {
  try {
    const d =
      typeof raw?.toDate === 'function'
        ? raw.toDate()
        : raw instanceof Date
          ? raw
          : raw?.seconds != null
            ? new Date(Number(raw.seconds) * 1000)
            : raw
              ? new Date(raw)
              : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

/**
 * Real-time subscription to support + public legal fields.
 */
export function subscribeAppSettings(onNext, onError) {
  return onSnapshot(
    SETTINGS_DOC,
    (snap) => {
      if (!snap.exists()) {
        onNext(parseAppSettingsDoc({}));
        return;
      }
      onNext(parseAppSettingsDoc(snap.data() || {}));
    },
    onError,
  );
}
