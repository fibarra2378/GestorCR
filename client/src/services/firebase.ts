import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyGestorCR2026',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'gestorcr-app.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'gestorcr-app',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'gestorcr-app.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId: env.VITE_FIREBASE_APP_ID || '1:1029384756:web:gestorcr2026app'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);
export default app;
