// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth'; // <--- 1. Import getAuth

// PASTE YOUR CONFIG OBJECT HERE
const firebaseConfig = {
   apiKey: "AIzaSyCTx-OAB1pshEe6yvopvzb8VSh-QEmT5sM",
  authDomain: "ns-mrp.firebaseapp.com",
  projectId: "ns-mrp",
  storageBucket: "ns-mrp.firebasestorage.app",
  messagingSenderId: "92645788043",
  appId: "1:92645788043:web:a32d6c7c4a35e88789878e",
  measurementId: "G-QR38KTTEJS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database connection so other files can use it
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- 2. Initialize and Export 'auth'