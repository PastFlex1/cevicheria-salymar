import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnxHW0zdAO2Yew-hUpzllYQQq-bTREGMQ",
  authDomain: "salymar-854d3.firebaseapp.com",
  projectId: "salymar-854d3",
  storageBucket: "salymar-854d3.firebasestorage.app",
  messagingSenderId: "387608806324",
  appId: "1:387608806324:web:8f7a4870c261ac267128e1",
  measurementId: "G-KLQQSK84YW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
