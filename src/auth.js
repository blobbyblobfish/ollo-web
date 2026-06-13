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
      return 'Couldn’t reach your account — your Firestore security rules may be denying access. Deploy the rules with: firebase deploy --only firestore:rules';
    case 'unavailable':
      return 'Couldn’t reach the database. Make sure a Firestore database has been created for this project, then try again.';
    case 'timeout':
      return 'This is taking longer than expected — your Firestore database may not be created yet (Firebase console → Firestore Database → Create database), or you’re offline.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}
