import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log configuration (remove in production)
console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
    authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
    projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
    storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
    messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
    appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing',
});

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
    console.log('Firebase app initialized successfully');
} catch (error) {
    console.error('Failed to initialize Firebase app:', error);
    throw error;
}

// Initialize Firebase Authentication and get a reference to the service
let auth;
try {
    auth = getAuth(app);
    console.log('Firebase Auth initialized successfully');
} catch (error) {
    console.error('Failed to initialize Firebase Auth:', error);
    throw error;
}

// Initialize Cloud Firestore and get a reference to the service
let db;
try {
    db = getFirestore(app);
    console.log('Firestore initialized successfully');
} catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw error;
}

export { auth, db };
export default app; 