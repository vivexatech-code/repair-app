/**
 * Calls the website Vercel notify API with a Firebase ID token.
 * No server secrets are bundled into the app.
 */
import { auth } from './firebase';

function websiteApiBase() {
  return String(
    process.env.EXPO_PUBLIC_WEBSITE_API_URL ||
      process.env.EXPO_PUBLIC_WEBSITE_URL ||
      'https://repairseries.in',
  )
    .trim()
    .replace(/\/$/, '');
}

export async function requestRemotePush(payload) {
  const user = auth.currentUser;
  if (!user) return { skipped: true, reason: 'unsigned' };

  const base = websiteApiBase();
  if (!base) return { skipped: true, reason: 'no-api-url' };

  try {
    const token = await user.getIdToken();
    const res = await fetch(`${base}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
