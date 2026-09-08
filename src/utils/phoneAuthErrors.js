export function mapPhoneAuthError(error) {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number.';
    case 'auth/missing-phone-number':
      return 'Enter your mobile number.';
    case 'auth/quota-exceeded':
    case 'auth/too-many-requests':
      return 'Too many OTP requests. Please wait and try again.';
    case 'auth/invalid-app-credential':
      return 'App verification failed. Real SMS OTP cannot run on localhost — use 127.0.0.1 or a deployed domain listed in Firebase Authorized domains.';
    case 'auth/captcha-check-failed':
      return 'Verification check failed. Please try again.';
    case 'auth/invalid-verification-code':
    case 'auth/invalid-verification-id':
      return 'Invalid OTP. Please check the code and try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'This OTP has expired. Request a new code.';
    case 'auth/missing-verification-code':
      return 'Enter the 6-digit OTP.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/billing-not-enabled':
      return 'Real SMS OTP requires Firebase Blaze billing. Test phone numbers still work without SMS.';
    case 'auth/operation-not-allowed':
      return 'Phone login is not enabled. Please contact support.';
    case 'auth/requires-recent-login':
      return 'Please sign in again, then retry.';
    default:
      if (error instanceof Error && /BILLING_NOT_ENABLED/i.test(error.message)) {
        return 'Real SMS OTP requires Firebase Blaze billing. Test phone numbers still work without SMS.';
      }
      if (error instanceof Error && error.message) {
        if (/blocked|suspended|pending|mobile|OTP|phone/i.test(error.message)) {
          return error.message;
        }
      }
      return 'Authentication failed. Please try again.';
  }
}
