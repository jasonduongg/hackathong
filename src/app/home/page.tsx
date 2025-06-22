'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/components/auth/UserProfile';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { Navbar } from '@/components/Navbar';
import { PartyView } from '@/components/PartyView';
import { Invitations } from '@/components/Invitations';

import { VideoUpload } from '@/components/VideoUpload';
import { updateUserProfile } from '@/lib/users';

export default function HomePage() {
    const { user, userProfile, loading } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showParties, setShowParties] = useState(false);
    const [showInvitations, setShowInvitations] = useState(false);

    const [showVideoUpload, setShowVideoUpload] = useState(false);
    const [paypalEmail, setPayPalEmail] = useState(userProfile?.paypalEmail || '');
    const [paypalSaveStatus, setPaypalSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');


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

    // Check if user needs to complete onboarding
    if (userProfile && !userProfile.hasCompletedOnboarding && !showOnboarding) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pt-8">
                <Navbar
                    onProfileClick={() => setShowProfile(true)}
                    onHomeClick={() => {
                        setShowProfile(false);
                        setShowParties(false);
                        setShowInvitations(false);
                    }}
                />
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                        <p className="text-gray-600">
                            Let's get to know you better to personalize your experience.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Start Onboarding
                    </button>
                </div>
            </div>
        );
    }

    // Show onboarding form
    if (showOnboarding) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20">
                <Navbar
                    onProfileClick={() => setShowProfile(true)}
                    onHomeClick={() => {
                        setShowProfile(false);
                        setShowParties(false);
                        setShowInvitations(false);
                    }}
                />
                <OnboardingForm
                    onComplete={() => {
                        setShowOnboarding(false);
                    }}
                />
            </div>
        );
    }

    // Show profile if requested
    if (showProfile) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20">
                <Navbar
                    onProfileClick={() => setShowProfile(false)}
                    onHomeClick={() => {
                        setShowProfile(false);
                        setShowParties(false);
                        setShowInvitations(false);
                    }}
                />
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <UserProfile
                            onRestartOnboarding={() => {
                                setShowOnboarding(true);
                            }}
                        />
                    </div>
                </main>
            </div>
        );
    }

    // Show parties if requested
    if (showParties) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20">
                <Navbar
                    onProfileClick={() => setShowProfile(true)}
                    onHomeClick={() => {
                        setShowProfile(false);
                        setShowParties(false);
                        setShowInvitations(false);
                    }}
                />
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <PartyView />
                    </div>
                </main>
            </div>
        );
    }

    // Show invitations if requested
    if (showInvitations) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20">
                <Navbar
                    onProfileClick={() => setShowProfile(true)}
                    onHomeClick={() => {
                        setShowProfile(false);
                        setShowParties(false);
                        setShowInvitations(false);
                    }}
                />
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <Invitations />
                    </div>
                </main>
            </div>
        );
    }

    // Show regular home page with "Hi" message
    const handleSavePaypalEmail = async () => {
        if (!user) return;
        setPaypalSaveStatus('saving');
        try {
            await updateUserProfile(user.uid, { paypalEmail });
            setPaypalSaveStatus('saved');
            setTimeout(() => setPaypalSaveStatus('idle'), 2000);
        } catch (e) {
            setPaypalSaveStatus('error');
            setTimeout(() => setPaypalSaveStatus('idle'), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <Navbar
                onProfileClick={() => setShowProfile(true)}
                onHomeClick={() => {
                    setShowProfile(false);
                    setShowParties(false);
                    setShowInvitations(false);
                }}
            />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">

                    <div className="text-center mb-12">
                        <h1 className="text-6xl font-bold text-gray-900 mb-4">
                            Hi, {userProfile?.displayName || 'there'}! 👋
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                            Welcome to Hack. What would you like to do today?
                        </p>

                        {/* PayPal Email Input */}
                        <div className="max-w-md mx-auto mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Your PayPal Email</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="your-paypal@email.com"
                                    value={paypalEmail}
                                    onChange={e => setPayPalEmail(e.target.value)}
                                />
                                <button
                                    onClick={handleSavePaypalEmail}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    disabled={paypalSaveStatus === 'saving' || !paypalEmail}
                                >
                                    {paypalSaveStatus === 'saving' ? 'Saving...' : paypalSaveStatus === 'saved' ? 'Saved!' : 'Save'}
                                </button>
                            </div>
                            {paypalSaveStatus === 'error' && (
                                <p className="text-red-500 text-xs mt-1">Failed to save. Try again.</p>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={() => setShowVideoUpload(true)}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Analyze Video</span>
                            </button>
                            <button
                                onClick={() => setShowParties(true)}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                My Parties
                            </button>
                            <button
                                onClick={() => setShowInvitations(true)}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                My Invitations
                            </button>
                            <button
                                onClick={() => setShowProfile(true)}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                View Profile
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Video Upload Modal */}
            {showVideoUpload && (
                <VideoUpload onClose={() => setShowVideoUpload(false)} />
            )}
        </div>
    );
} 