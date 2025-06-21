import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    createdAt: Date;
    updatedAt: Date;
    // Onboarding status
    hasCompletedOnboarding?: boolean;
    // Onboarding fields
    dietaryRestrictions?: string[];
    birthday?: Date;
    job?: string;
    availability?: {
        [day: string]: {
            [hour: string]: boolean;
        };
    };
    activityPreferences?: string[];
    foodPreferences?: string[];
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    // Legacy field for backward compatibility
    generalAvailable?: boolean;
    // Add more user fields as needed
    bio?: string;
    location?: string;
    website?: string;
    // Party management
    partyIds?: string[];
}

// Create a new user profile
export const createUserProfile = async (user: User, additionalData?: Partial<UserProfile>): Promise<void> => {
    const userRef = doc(db, 'users', user.uid);

    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        hasCompletedOnboarding: false, // Default to false for new users
        ...additionalData,
    };

    await setDoc(userRef, userProfile);
};

// Get user profile by UID
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    } else {
        return null;
    }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
    const userRef = doc(db, 'users', uid);

    const updateData = {
        ...updates,
        updatedAt: new Date(),
    };

    await updateDoc(userRef, updateData);
};

// Delete user profile
export const deleteUserProfile = async (uid: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
};

// Get all users (use with caution, consider pagination for large datasets)
export const getAllUsers = async (): Promise<UserProfile[]> => {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
    });

    return users;
};

// Get users by email
export const getUsersByEmail = async (email: string): Promise<UserProfile[]> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
    });

    return users;
};

// Get multiple user profiles by UIDs
export const getUserProfilesByIds = async (uids: string[]): Promise<UserProfile[]> => {
    if (uids.length === 0) return [];

    const users: UserProfile[] = [];

    // Firestore doesn't support 'in' queries with more than 10 items, so we need to batch them
    const batchSize = 10;
    for (let i = 0; i < uids.length; i += batchSize) {
        const batch = uids.slice(i, i + batchSize);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', batch));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            users.push(doc.data() as UserProfile);
        });
    }

    return users;
}; 