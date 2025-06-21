'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/users';
import { signOutUser } from '@/lib/auth';

export const UserProfile: React.FC = () => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    console.log('UserProfile: userProfile', userProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: userProfile?.displayName || '',
    });

    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        try {
            await updateUserProfile(user.uid, formData);
            await refreshUserProfile();
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error('Failed to sign out:', error);
        }
    };

    const formatDate = (date: any) => {
        if (!date) {
            return 'Not available';
        }

        // Handle Firestore Timestamp objects
        if (date && typeof date.toDate === 'function') {
            return date.toDate().toLocaleString();
        }

        // Handle JavaScript Date objects
        if (date instanceof Date) {
            return date.toLocaleString();
        }

        // Handle timestamp numbers or strings
        try {
            return new Date(date).toLocaleString();
        } catch (error) {
            console.error('Error formatting date:', error, date);
            return 'Invalid date';
        }
    };

    if (!user || !userProfile) {
        console.log('UserProfile: Missing user or userProfile', { user: !!user, userProfile: !!userProfile });
        return <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile</h2>
                <p className="text-gray-600">Loading profile data...</p>
            </div>
        </div>;
    }

    console.log('UserProfile: Rendering with data', {
        displayName: userProfile.displayName,
        email: user.email,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        createdAtType: typeof userProfile.createdAt,
        updatedAtType: typeof userProfile.updatedAt
    });

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
                <div className="space-x-2">
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        >
                            Edit Profile
                        </button>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    ) : (
                        <p className="mt-1 text-sm text-gray-900">{userProfile.displayName || 'Not set'}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Member Since</label>
                    <p className="mt-1 text-sm text-gray-900">
                        {formatDate(userProfile.createdAt)}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Logged In</label>
                    <p className="mt-1 text-sm text-gray-900">
                        {formatDate(userProfile.updatedAt)}
                    </p>
                </div>

                {isEditing && (
                    <div className="flex space-x-2 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setFormData({
                                    displayName: userProfile.displayName || '',
                                });
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}; 