import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
const missingConfig = Object.entries(firebaseConfig).filter(([key, value]) => !value);
if (missingConfig.length > 0) {
    console.error('Missing Firebase configuration:', missingConfig.map(([key]) => key));
    throw new Error(`Missing Firebase configuration: ${missingConfig.map(([key]) => key).join(', ')}`);
}

// Initialize Firebase
let app;
try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
    console.error('Failed to initialize Firebase app:', error);
    throw error;
}

// Initialize Firebase Authentication and get a reference to the service
let auth;
try {
    auth = getAuth(app);
} catch (error) {
    console.error('Failed to initialize Firebase Auth:', error);
    throw error;
}

// Initialize Cloud Firestore and get a reference to the service
let db: Firestore;
try {
    db = getFirestore(app);
} catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw error;
}

// Initialize Firebase Storage and get a reference to the service
let storage: FirebaseStorage;
try {
    storage = getStorage(app);
} catch (error) {
    console.error('Failed to initialize Firebase Storage:', error);
    throw error;
}

export { auth, db, storage };
export default app; 