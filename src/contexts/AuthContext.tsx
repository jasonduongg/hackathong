'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { getUserProfile, createUserProfile, UserProfile } from '@/lib/users';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUserProfile = async () => {
        if (user) {
            try {
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
            } catch (error) {
                console.error('Failed to refresh user profile:', error);
                setUserProfile(null);
            }
        } else {
            setUserProfile(null);
        }
    };

    useEffect(() => {
        console.log('AuthProvider: Starting authentication state listener');

        // Add a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            console.log('AuthProvider: Timeout reached, setting loading to false');
            setLoading(false);
        }, 5000); // 5 second timeout

        const unsubscribe = onAuthStateChange(async (user) => {
            console.log('AuthProvider: Auth state changed', user ? `User: ${user.email}` : 'No user');

            // Clear the timeout since we got a response
            clearTimeout(timeoutId);

            setUser(user);

            if (user) {
                console.log('AuthProvider: Fetching user profile for', user.uid);
                try {
                    let profile = await getUserProfile(user.uid);

                    // If profile doesn't exist, create one with current date
                    if (!profile) {
                        console.log('AuthProvider: No profile found, creating new profile');
                        await createUserProfile(user, {
                            displayName: user.displayName || '',
                            photoURL: user.photoURL || '',
                        });
                        profile = await getUserProfile(user.uid);
                    }

                    console.log('AuthProvider: User profile fetched/created', profile);
                    setUserProfile(profile);
                } catch (error) {
                    console.error('AuthProvider: Error with user profile', error);
                    // Don't set userProfile to null here, just log the error
                    // This allows the app to work even if Firestore isn't set up
                    setUserProfile(null);
                }
            } else {
                console.log('AuthProvider: No user, clearing profile');
                setUserProfile(null);
            }

            console.log('AuthProvider: Setting loading to false');
            setLoading(false);
        });

        return () => {
            console.log('AuthProvider: Cleaning up auth listener');
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    const value = {
        user,
        userProfile,
        loading,
        refreshUserProfile,
    };

    console.log('AuthProvider: Current state', { user: user?.email, loading, hasProfile: !!userProfile });

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 