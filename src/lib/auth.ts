import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<UserCredential> => {
    try {
        console.log('Attempting to sign up user:', email);
        const result = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Sign up successful:', result.user.uid);
        return result;
    } catch (error: any) {
        console.error('Sign up error:', error.code, error.message);
        throw error;
    }
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
        console.log('Attempting to sign in user:', email);
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful:', result.user.uid);
        return result;
    } catch (error: any) {
        console.error('Sign in error:', error.code, error.message);
        throw error;
    }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
    try {
        console.log('Attempting to sign out user');
        await signOut(auth);
        console.log('Sign out successful');
    } catch (error: any) {
        console.error('Sign out error:', error.code, error.message);
        throw error;
    }
};

// Get current user
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
}; 