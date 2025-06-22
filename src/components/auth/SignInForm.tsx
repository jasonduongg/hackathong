'use client';

import React, { useState } from 'react';
import { signIn } from '@/lib/auth';

interface SignInFormProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSuccess, onError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await signIn(email, password);
            onSuccess?.();
        } catch (error: any) {
            const errorMessage = error.code === 'auth/user-not-found'
                ? 'No account found with this email'
                : error.code === 'auth/wrong-password'
                    ? 'Incorrect password'
                    : 'Failed to sign in. Please try again.';

            onError?.(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-soft-orange-500 focus:border-soft-orange-500 transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter your password"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 hover:from-soft-orange-600 hover:to-soft-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-soft-orange-500 disabled:opacity-50 transition-all duration-200"
            >
                {loading ? 'Signing in...' : 'Sign In'}
            </button>
        </form>
    );
}; 