// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAPH1-u-GXM2GloU8P30hZo7bGRLtoXsnM",
  authDomain: "our-love-lives-on.firebaseapp.com",
  projectId: "our-love-lives-on",
  storageBucket: "our-love-lives-on.firebasestorage.app",
  messagingSenderId: "238364756253",
  appId: "1:238364756253:web:9fa70e8207eb107876b9f4",
  measurementId: "G-9CZMY794RY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);