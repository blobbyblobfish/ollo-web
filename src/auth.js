// Shared passwordless email-link auth helpers, used by both /start and /login.
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from './firebase';

export const EMAIL_KEY = 'olloEmailForSignIn';

export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// The sign-in link always returns to /start, which completes the sign-in and
// resumes (or begins) the person's week.
export const actionCodeSettings = () => ({
  url: window.location.origin + '/start',
  handleCodeInApp: true,
});

/* Send the magic link and remember the email for when they click it back. */
export async function sendSignInLink(email) {
  const clean = email.trim();
  await sendSignInLinkToEmail(auth, clean, actionCodeSettings());
  window.localStorage.setItem(EMAIL_KEY, clean);
}

/* Turn Firebase error codes into something a human wants to read. */
export function friendly(err) {
  switch (err?.code) {
    case 'auth/operation-not-allowed':
      return "Email sign-in isn't switched on yet. (Enable the Email/Password → Email link provider in the Firebase console.)";
    case 'auth/invalid-email':
      return 'That email doesn’t look right — mind checking it?';
    case 'auth/invalid-action-code':
      return 'That sign-in link has expired or was already used. Let’s send a fresh one.';
    case 'permission-denied':
      return 'Couldn’t save to your account — Firestore rules may need updating.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}
