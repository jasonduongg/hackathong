'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/components/auth/UserProfile';

export default function HomePage() {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">You need to be logged in to access this page.</p>
                    <a
                        href="/auth"
                        className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Go to Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <UserProfile />
                </div>
            </main>
        </div>
    );
} 