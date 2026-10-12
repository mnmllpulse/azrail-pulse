
// Cloudflare-Ready Auth & Data Layer
// This layer manages local state and prepares for Cloudflare synchronization

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      const token = await user.getIdToken();
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async () => {
  // Implementation for Google Sign In would go here
  console.log('Google Sign In');
  return null;
};

export const logout = async () => {
  await auth.signOut();
};

export const setDemoMode = (enabled: boolean) => {
  console.log('Demo mode toggled:', enabled);
};

export const getAccessToken = async () => {
  return await auth.currentUser?.getIdToken();
};
