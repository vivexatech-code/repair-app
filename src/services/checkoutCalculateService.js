import { auth } from './firebase';
import { websiteApiBase } from '../utils/phone';

export async function fetchCheckoutQuote({
  serviceId,
  variationId,
  quantity = 1,
  couponCode,
  discountAmount,
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required to confirm pricing.');
  const base = websiteApiBase();
  if (!base) {
    throw new Error('Set EXPO_PUBLIC_WEBSITE_API_URL to confirm booking amounts.');
  }
  const token = await user.getIdToken();
  const res = await fetch(`${base}/api/checkout/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serviceId,
      variationId: variationId || undefined,
      quantity,
      couponCode: couponCode || undefined,
      discountAmount,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Could not confirm the booking amount.');
  }
  return json;
}
