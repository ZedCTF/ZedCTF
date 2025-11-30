// Import the functions you need from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration - UPDATED for GitHub Pages
const firebaseConfig = {
  apiKey: "AIzaSyAVk3CIK5hyAmjwVPh1p4i01vq-0Z5IsEA",
  authDomain: "zedctf.github.io", // Changed from zedctf.firebaseapp.com
  projectId: "zedctf",
  storageBucket: "zedctf.firebasestorage.app",
  messagingSenderId: "574551910114",
  appId: "1:574551910114:web:8bcce937be224e1575a0bb",
  measurementId: "G-MEYRJGR69W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the services you'll use in your app
export { app, analytics, auth, db, storage };