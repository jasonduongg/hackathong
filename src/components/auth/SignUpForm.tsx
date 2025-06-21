'use client';

import React, { useState } from 'react';
import { signUp } from '@/lib/auth';
import { createUserProfile } from '@/lib/users';

interface SignUpFormProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            onError?.('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            onError?.('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const userCredential = await signUp(email, password);

            // Create user profile in Firestore
            await createUserProfile(userCredential.user, {
                displayName: displayName || undefined,
            });

            onSuccess?.();
        } catch (error: any) {
            const errorMessage = error.code === 'auth/email-already-in-use'
                ? 'An account with this email already exists'
                : error.code === 'auth/weak-password'
                    ? 'Password is too weak'
                    : 'Failed to create account. Please try again.';

            onError?.(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                    Display Name
                </label>
                <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your display name"
                />
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your email"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your password (min 6 characters)"
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                </label>
                <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Confirm your password"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {loading ? 'Creating account...' : 'Sign Up'}
            </button>
        </form>
    );
}; 