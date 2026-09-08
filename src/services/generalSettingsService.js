import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const GENERAL_DOC = doc(db, 'settings', 'general');

const DEFAULT_RADIUS_KM = 25;

/**
 * `settings/general.defaultTechnicianServiceRadiusKm` (number, km).
 */
export async function getDefaultTechnicianServiceRadiusKm() {
  try {
    const snap = await getDoc(GENERAL_DOC);
    if (!snap.exists) return DEFAULT_RADIUS_KM;
    const v = snap.data()?.defaultTechnicianServiceRadiusKm;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
    return DEFAULT_RADIUS_KM;
  } catch {
    return DEFAULT_RADIUS_KM;
  }
}

/**
 * Live listener for `settings/general` — used for Google review URL etc.
 */
export function subscribeGeneralSettings(onNext, onError) {
  return onSnapshot(
    GENERAL_DOC,
    (snap) => {
      const data = snap.exists() ? snap.data() || {} : {};
      onNext({
        defaultTechnicianServiceRadiusKm: Number(data.defaultTechnicianServiceRadiusKm) || DEFAULT_RADIUS_KM,
        platformCommissionPercent: Number(data.platformCommissionPercent) || 0,
        addonFeePercent: Number(data.addonFeePercent) || 0,
        googleReviewUrl: String(data.googleReviewUrl || '').trim(),
        homeReviews: Array.isArray(data.homeReviews)
          ? data.homeReviews
              .filter((r) => r && typeof r === 'object')
              .map((r) => ({
                name: String(r.name || '').trim(),
                text: String(r.text || r.review || '').trim(),
                rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
                area: String(r.area || '').trim(),
                reviewDate: String(r.reviewDate || r.date || '').trim(),
              }))
              .filter((r) => r.name && r.text)
          : [],
      });
    },
    onError,
  );
}

export async function getGoogleReviewUrl() {
  try {
    const snap = await getDoc(GENERAL_DOC);
    if (!snap.exists()) return '';
    return String(snap.data()?.googleReviewUrl || '').trim();
  } catch {
    return '';
  }
}
