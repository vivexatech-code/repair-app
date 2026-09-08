import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from './firebase';

function websiteApiBase() {
  return String(
    process.env.EXPO_PUBLIC_WEBSITE_API_URL ||
      process.env.EXPO_PUBLIC_WEBSITE_URL ||
      'https://repairseries.in',
  )
    .trim()
    .replace(/\/$/, '');
}

function mapPaymentError(message) {
  return String(message || 'Payment confirmation failed. Please try again.')
    .replace(/^Firebase:\s*/i, '')
    .replace(/\s*\([^)]*\)\.?$/, '')
    .trim();
}

/**
 * Customer confirms in-app payment after technician sends RS App payment request.
 * Prefers the Vercel API; falls back to the Firebase callable if the website URL is unset.
 */
export async function confirmRsAppPayment({ bookingId, customerId }) {
  if (!bookingId || !customerId) throw new Error('Missing booking or customer');

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required');
  if (String(uid) !== String(customerId)) throw new Error('Not allowed');

  const base = websiteApiBase();
  if (base) {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`${base}/api/bookings/confirm-payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: String(bookingId) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(mapPaymentError(data.error || 'Payment confirmation failed.'));
    }
    return data?.ok ? data : { ok: true, bookingId };
  }

  const functions = getFunctions(app);
  const confirm = httpsCallable(functions, 'confirmCustomerPayment');
  try {
    const result = await confirm({ bookingId: String(bookingId) });
    return result?.data ?? { ok: true };
  } catch (e) {
    throw new Error(mapPaymentError(e?.message || 'Payment confirmation failed.'));
  }
}
