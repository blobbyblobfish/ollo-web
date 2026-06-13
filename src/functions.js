// Client wrappers for the Cloud Functions callables used by the response page.
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app); // default region us-central1

// Opt into the local emulator with REACT_APP_USE_EMULATOR=true npm start
if (
  process.env.REACT_APP_USE_EMULATOR === 'true' &&
  window.location.hostname === 'localhost'
) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export const getPrompt = httpsCallable(functions, 'getPrompt');
export const getUploadUrl = httpsCallable(functions, 'getUploadUrl');
export const submitResponse = httpsCallable(functions, 'submitResponse');
export const mintMyToken = httpsCallable(functions, 'mintMyToken');
