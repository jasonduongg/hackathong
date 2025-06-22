import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function getCurrentUserServer(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
        if (!token) {
            return null;
        }

        const decodedToken = await getAuth().verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}

// Alternative method using session token from cookies
export async function getCurrentUserFromSession(request: NextRequest) {
    try {
        // For now, we'll use a simpler approach by getting the user from the request
        // This assumes the client is sending the user ID in a header or query param
        const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return null;
        }

        // Verify the user exists in Firestore
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return null;
        }

        return {
            uid: userId,
            email: userDoc.data()?.email,
            ...userDoc.data()
        };
    } catch (error) {
        console.error('Error getting user from session:', error);
        return null;
    }
} 