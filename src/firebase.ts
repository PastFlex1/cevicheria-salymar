import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC87f42FkGhfg2ZWgsnUAeoI_2rmkskuaI",
  authDomain: "salymar-e94b5.firebaseapp.com",
  projectId: "salymar-e94b5",
  storageBucket: "salymar-e94b5.firebasestorage.app",
  messagingSenderId: "982446998060",
  appId: "1:982446998060:web:2d33a122b66d850c48c789",
  measurementId: "G-2MDPXNGE8H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
