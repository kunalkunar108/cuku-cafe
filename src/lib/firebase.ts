import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Web App configuration.
// This is client-side configuration for the Firebase Web SDK.
// Never put a Firebase Admin SDK service-account/private key here.
const firebaseConfig = {
  apiKey: "AIzaSyDT2NDHxybXwftZwLcFDwmN_No04g0gZM0",
  authDomain: "cuku-cafe.firebaseapp.com",
  projectId: "cuku-cafe",
  storageBucket: "cuku-cafe.firebasestorage.app",
  messagingSenderId: "796537983030",
  appId: "1:796537983030:web:425b608d0eff8a246f4897",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
