import {
  PhoneAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
} from 'firebase/auth';
import { auth } from './firebase';
import { logout as authLogout } from './authService';
import { ensureCustomerFromAuth } from './customerService';
import { mapPhoneAuthError } from '../utils/phoneAuthErrors';
import { parseIndiaMobile, websiteApiBase } from '../utils/phone';
import { authTimeline } from '../utils/devLog';

let confirmation = null;
let verificationId = null;

export function clearPhoneConfirmation() {
  confirmation = null;
  verificationId = null;
}

export async function sendCustomerOtp(rawPhone, recaptcha) {
  const parsed = parseIndiaMobile(rawPhone);
  if (!parsed.ok) throw new Error(parsed.error);
  if (!recaptcha?.sendOtp) {
    throw new Error('Security check is not ready. Try again.');
  }
  try {
    const result = await recaptcha.sendOtp(parsed.e164);
    confirmation = result?.confirmation || null;
    verificationId = result?.verificationId || null;
    if (!confirmation && !verificationId) {
      throw new Error('Unable to send OTP.');
    }
    return { e164: parsed.e164 };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const message = error instanceof Error ? error.message : String(error || '');
    const customData =
      error && typeof error === 'object' && 'customData' in error ? error.customData : undefined;
    console.warn(
      'OTP authentication failed ' +
        JSON.stringify({
          code: code || '(none)',
          message,
          name: error instanceof Error ? error.name : '',
          customData,
          environment: __DEV__ ? 'development' : 'production',
          hasRecaptcha: Boolean(recaptcha),
        }),
    );
    clearPhoneConfirmation();
    throw new Error(mapPhoneAuthError(error));
  }
}

export async function confirmCustomerOtp(code) {
  const otp = String(code || '').replace(/\D/g, '');
  if (otp.length !== 6) throw new Error('Enter the 6-digit OTP.');
  try {
    if (confirmation) {
      const cred = await confirmation.confirm(otp);
      authTimeline('OTP confirmation accepted', { uid: cred.user?.uid || null });
      return cred.user;
    }
    if (verificationId) {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const cred = await signInWithCredential(auth, credential);
      authTimeline('OTP credential accepted', { uid: cred.user?.uid || null });
      return cred.user;
    }
    throw new Error('Request a new OTP first.');
  } catch (error) {
    throw new Error(mapPhoneAuthError(error));
  }
}

export async function resolveCustomerIdentity(displayName) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  const base = websiteApiBase();
  const res = await fetch(`${base}/api/auth/resolve-identity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'customer', displayName: displayName || '' }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403) {
      await authLogout('account-blocked', 'phoneAuthService.resolveCustomerIdentity').catch(
        () => undefined,
      );
      throw new Error(payload.error || 'This account has been blocked.');
    }
    authTimeline('resolve-identity failed — keeping OTP session', {
      status: res.status,
      uid: user.uid,
    });
    await ensureCustomerFromAuth(user.uid, {
      phone: user.phoneNumber || '',
      name: displayName || user.displayName || '',
      email: user.email || '',
    });
    return { uid: user.uid, created: true, fallback: true };
  }
  if (payload.customToken) {
    authTimeline('signing in with identity custom token', {
      fromUid: user.uid,
      toUid: payload.uid || null,
    });
    await signInWithCustomToken(auth, payload.customToken);
    return payload;
  }

  const live = auth.currentUser;
  if (live?.uid) {
    await ensureCustomerFromAuth(live.uid, {
      phone: live.phoneNumber || '',
      name: displayName || live.displayName || '',
      email: live.email || '',
    });
  }
  return payload;
}
