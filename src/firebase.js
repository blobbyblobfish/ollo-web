// Firebase app + the services the onboarding flow needs.
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPH1-u-GXM2GloU8P30hZo7bGRLtoXsnM",
  authDomain: "our-love-lives-on.firebaseapp.com",
  projectId: "our-love-lives-on",
  storageBucket: "our-love-lives-on.firebasestorage.app",
  messagingSenderId: "238364756253",
  appId: "1:238364756253:web:9fa70e8207eb107876b9f4",
  measurementId: "G-9CZMY794RY",
};

const app = initializeApp(firebaseConfig);

// Analytics only runs in supported (browser) environments.
isSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
