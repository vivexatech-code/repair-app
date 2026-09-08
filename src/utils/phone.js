export const INDIA_DIAL_CODE = '+91';
export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_SEC = 60;

export function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

export function parseIndiaMobile(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: false, error: 'Enter your mobile number.' };

  let digits = digitsOnly(trimmed);
  if (digits.startsWith('0091')) digits = digits.slice(4);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);

  if (digits.length < 10) return { ok: false, error: 'Mobile number is too short.' };
  if (digits.length > 10) return { ok: false, error: 'Mobile number is too long.' };
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { ok: false, error: 'Enter a valid Indian mobile number.' };
  }

  return { ok: true, e164: `${INDIA_DIAL_CODE}${digits}`, national: digits };
}

export function formatNationalInput(raw) {
  return digitsOnly(raw).slice(0, 10);
}

export function websiteApiBase() {
  return String(
    process.env.EXPO_PUBLIC_WEBSITE_API_URL ||
      process.env.EXPO_PUBLIC_WEBSITE_URL ||
      'https://www.repairseries.in',
  )
    .trim()
    .replace(/\/$/, '');
}
