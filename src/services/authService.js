import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

export class EmailNotVerifiedError extends Error {
  constructor() {
    super('EMAIL_NOT_VERIFIED');
    this.name = 'EmailNotVerifiedError';
  }
}

export async function signUpWithEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name });
    await sendEmailVerification(auth.currentUser);
  }
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await cred.user.reload();
  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw new EmailNotVerifiedError();
  }
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) return;
  await sendEmailVerification(auth.currentUser);
}

export async function signInUnverifiedAndResendVerification(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await cred.user.reload();
  if (cred.user.emailVerified) {
    return { verified: true, user: cred.user };
  }
  await sendEmailVerification(cred.user);
  await signOut(auth);
  return { verified: false };
}
