'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { UserProfile } from '@/components/auth/UserProfile';

export default function AuthPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
    const [error, setError] = useState<string>('');

    // Redirect to home if user is already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/home');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading authentication...</div>
            </div>
        );
    }

    // If user is logged in, show loading while redirecting
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Redirecting to home...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Welcome to Your App
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to your account or create a new one
                    </p>
                </div>

                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="flex space-x-4 mb-6">
                        <button
                            onClick={() => {
                                setActiveTab('signin');
                                setError('');
                            }}
                            className={`flex-1 py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'signin'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('signup');
                                setError('');
                            }}
                            className={`flex-1 py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'signup'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {activeTab === 'signin' ? (
                        <SignInForm
                            onSuccess={() => {
                                setError('');
                                router.push('/home');
                            }}
                            onError={setError}
                        />
                    ) : (
                        <SignUpForm
                            onSuccess={() => {
                                setError('');
                                router.push('/home');
                            }}
                            onError={setError}
                        />
                    )}
                </div>
            </div>
        </div>
    );
} 