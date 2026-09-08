import { Linking } from 'react-native';

const DEFAULT_SUPPORT = 'support@repairseries.com';

/**
 * Opens the default mail app with a pre-filled support template.
 * @param {string} [supportAddress] — admin support email (from Firestore); falls back to default
 */
export async function openSupportEmail({
  userName,
  userEmail,
  supportAddress,
} = {}) {
  try {
    const to = String(supportAddress || '').trim() || DEFAULT_SUPPORT;
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent(
      [
        `Name: ${userName?.trim() || '—'}`,
        `Email: ${userEmail?.trim() || '—'}`,
        '',
        'Issue:',
        '(Describe your issue here)',
        '',
      ].join('\n'),
    );
    const url = `mailto:${to}?subject=${subject}&body=${body}`;
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (!can) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
