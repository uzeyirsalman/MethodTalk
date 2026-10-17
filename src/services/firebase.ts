import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
};

// Lazy/safe initialization so the app doesn't crash if Firebase is not yet configured
let app: any = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

export { db, storage };

/**
 * Uploads a pre-synthesized character line audio file to Firebase Cloud Storage.
 * Path: scenes/{sceneId}/{chunkId}_{lang}.mp3
 */
export async function uploadSceneAudio(
  sceneId: string,
  chunkId: number,
  lang: string,
  audioBlob: Blob
): Promise<string | null> {
  if (!storage) {
    console.warn('Firebase Storage is not configured. Falling back to local storage.');
    return null;
  }

  try {
    const storageRef = ref(storage, `scenes/${sceneId}/${chunkId}_${lang}.mp3`);
    await uploadBytes(storageRef, audioBlob, { contentType: 'audio/mpeg' });
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.error('Failed to upload audio to Firebase Storage:', err);
    return null;
  }
}

/**
 * Retrieves the public download URL for a pre-synthesized character line audio file.
 */
export async function getSceneAudioDownloadUrl(
  sceneId: string,
  chunkId: number,
  lang: string
): Promise<string | null> {
  if (!storage) {
    return `/audio/scenes/${sceneId}/${chunkId}_${lang}.mp3`;
  }

  try {
    const storageRef = ref(storage, `scenes/${sceneId}/${chunkId}_${lang}.mp3`);
    return await getDownloadURL(storageRef);
  } catch {
    // If not found in Firebase Storage, fallback to local public asset path
    return `/audio/scenes/${sceneId}/${chunkId}_${lang}.mp3`;
  }
}
