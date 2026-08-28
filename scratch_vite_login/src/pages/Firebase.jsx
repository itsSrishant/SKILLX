// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDQ5yi9_BBrMDNCtvTIQpt9uIOTWt61pGc",
  authDomain: "authentication-657d7.firebaseapp.com",
  projectId: "authentication-657d7",
  storageBucket: "authentication-657d7.firebasestorage.app",
  messagingSenderId: "934691936852",
  appId: "1:934691936852:web:64c040c4abadabbbfbebc1",
  measurementId: "G-PW8PNKQWFB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;