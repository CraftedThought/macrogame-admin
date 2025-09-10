// src/firebase/config.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCfhDEOLVcdz8nwu-QDHGhTDU4KIcl3pX4",
  authDomain: "macrogame-admin.firebaseapp.com",
  projectId: "macrogame-admin",
  storageBucket: "macrogame-admin.firebasestorage.app",
  messagingSenderId: "268677369966",
  appId: "1:268677369966:web:55d43f2d86ab2bdaf4967f",
  measurementId: "G-50SL5Z5V6X"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);