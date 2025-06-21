'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/auth';

interface LogoutButtonProps {
    className?: string;
    variant?: 'default' | 'minimal';
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
    className = '',
    variant = 'default'
}) => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setLoading(true);
        try {
            await signOutUser();
            router.push('/auth');
        } catch (error) {
            console.error('Failed to sign out:', error);
            // Still redirect even if there's an error
            router.push('/auth');
        } finally {
            setLoading(false);
        }
    };

    if (variant === 'minimal') {
        return (
            <button
                onClick={handleLogout}
                disabled={loading}
                className={`text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors ${className}`}
            >
                {loading ? 'Signing out...' : 'Sign Out'}
            </button>
        );
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors ${className}`}
        >
            {loading ? 'Signing out...' : 'Sign Out'}
        </button>
    );
}; 