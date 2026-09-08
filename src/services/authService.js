import { signOut, deleteUser } from 'firebase/auth';
import { auth } from './firebase';
import { deleteCustomerProfile } from './customerService';
import { mapPhoneAuthError } from '../utils/phoneAuthErrors';
import { authTimeline } from '../utils/devLog';

export async function logout(reason = 'user-logout', source = 'authService.logout') {
  const uid = auth.currentUser?.uid || null;
  authTimeline('signOut', { source, reason, uid });
  await signOut(auth);
}

export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to continue.');
  }
  authTimeline('deleteUser', {
    source: 'authService.deleteAccount',
    reason: 'account-delete',
    uid: user.uid,
  });
  try {
    await deleteCustomerProfile(user.uid);
  } catch {
    /* best effort */
  }
  try {
    await deleteUser(user);
  } catch (error) {
    throw new Error(mapPhoneAuthError(error));
  }
}
