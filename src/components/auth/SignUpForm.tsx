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
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                </label>
                <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-soft-orange-500 focus:border-soft-orange-500 transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter your display name"
                />
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-soft-orange-500 focus:border-soft-orange-500 transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter your email"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-soft-orange-500 focus:border-soft-orange-500 transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter your password (min 6 characters)"
                />
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                </label>
                <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-soft-orange-500 focus:border-soft-orange-500 transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Confirm your password"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 hover:from-soft-orange-600 hover:to-soft-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-soft-orange-500 disabled:opacity-50 transition-all duration-200"
            >
                {loading ? 'Creating account...' : 'Sign Up'}
            </button>
        </form>
    );
}; 