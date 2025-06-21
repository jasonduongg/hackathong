'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/components/auth/UserProfile';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { Navbar } from '@/components/Navbar';
import { PartyView } from '@/components/PartyView';
import { Invitations } from '@/components/Invitations';

export default function HomePage() {
    const { user, userProfile, loading } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showParties, setShowParties] = useState(false);
    const [showInvitations, setShowInvitations] = useState(false);

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pt-20">
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
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-gray-900 mb-4">
                            Hi, {userProfile?.displayName || 'there'}! 👋
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                            Welcome to Hack. What would you like to do today?
                        </p>
                        <div className="flex justify-center space-x-4">
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
        </div>
    );
} 