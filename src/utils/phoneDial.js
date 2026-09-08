import { Linking, Platform } from 'react-native';

/**
 * Build a safe tel: URI. Preserves leading + for international numbers.
 * @returns {string|null}
 */
export function buildTelHref(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('+')) {
    const rest = s.slice(1).replace(/\D/g, '');
    return rest.length ? `tel:+${rest}` : null;
  }
  const digits = s.replace(/\D/g, '');
  return digits.length ? `tel:${digits}` : null;
}

/**
 * Open the dialer / phone app. No-op if number is missing or invalid.
 * On Android, `canOpenURL(tel:)` often returns false even when the dialer works — we still try openURL inside try/catch.
 */
export async function openPhoneDialer(raw) {
  const href = buildTelHref(raw);
  if (!href) return { ok: false, reason: 'invalid' };
  try {
    if (Platform.OS === 'android') {
      await Linking.openURL(href);
      return { ok: true };
    }
    const can = await Linking.canOpenURL(href).catch(() => false);
    if (!can) {
      return { ok: false, reason: 'unsupported' };
    }
    await Linking.openURL(href);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'open_failed' };
  }
}
