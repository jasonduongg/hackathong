'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/lib/auth';

interface NavbarProps {
    onProfileClick?: () => void;
    onHomeClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onProfileClick, onHomeClick }) => {
    const { user, userProfile } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error('Failed to sign out:', error);
        }
    };

    const handleProfileClick = () => {
        setShowProfileMenu(false);
        if (onProfileClick) {
            onProfileClick();
        }
    };

    const handleHomeClick = () => {
        if (onHomeClick) {
            onHomeClick();
        }
    };


    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    if (!user) {
        return null; // Don't show navbar if user is not authenticated
    }

    return (
        <nav className={`fixed top-4 z-50 transition-all duration-300 ease-in-out ${isCollapsed
            ? 'left-4 w-14 h-14'
            : 'left-1/2 transform -translate-x-1/2 w-[90%] max-w-7xl'
            }`}>
            <div className={`bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg transition-all duration-300 ease-in-out ${isCollapsed
                ? 'rounded-full w-14 h-14 flex items-center justify-center'
                : 'rounded-full px-6 py-3'
                }`}>
                <div className="flex items-center justify-between">
                    {/* Left side - Eye button and Brand */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={toggleCollapse}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            <svg
                                className="w-4 h-4 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {isCollapsed ? (
                                    // Eye with slash (hidden)
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                ) : (
                                    // Eye (visible)
                                    <>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </>
                                )}
                            </svg>
                        </button>

                        {!isCollapsed && (
                            <button
                                onClick={handleHomeClick}
                                className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                                Hack
                            </button>
                        )}
                    </div>

                    {/* Right side - Profile and Sign Out */}
                    {!isCollapsed && (
                        <div className="flex items-center space-x-3">
                            {/* Profile Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">
                                            {userProfile?.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                        {userProfile?.displayName || 'Profile'}
                                    </span>
                                    <svg
                                        className={`w-4 h-4 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="text-sm font-medium text-gray-900">
                                                {userProfile?.displayName || 'User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleProfileClick}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            View Profile
                                        </button>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Backdrop to close menu when clicking outside */}
            {showProfileMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                />
            )}
        </nav>
    );
}; 