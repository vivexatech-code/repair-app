import { auth } from './firebase';
import { websiteApiBase } from '../utils/phone';

export async function uploadImage({ uri, kind = 'profile-user', ...meta }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  const base = websiteApiBase();
  if (!base) {
    throw new Error('Set EXPO_PUBLIC_WEBSITE_API_URL to upload images.');
  }

  const formData = new FormData();
  const filePart =
    typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('blob:') || uri.startsWith('data:'))
      ? await (await fetch(uri)).blob()
      : { uri, name: `upload_${Date.now()}.jpg`, type: 'image/jpeg' };
  formData.append('file', filePart);
  formData.append('kind', kind);
  Object.entries(meta).forEach(([key, value]) => {
    if (value) formData.append(key, String(value));
  });

  const response = await fetch(`${base}/api/storage/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || 'Image upload failed');
  }
  const url = String(json.url || '').trim();
  if (!url) throw new Error('No image URL returned');
  return url;
}

/** Legacy name — new uploads go to Cloudflare R2 via the website API. */
export async function uploadImageToCloudinary(uri) {
  return uploadImage({ uri, kind: 'profile-user' });
}
