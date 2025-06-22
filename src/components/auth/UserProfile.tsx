'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/users';
import { signOutUser } from '@/lib/auth';

interface UserProfileProps {
    onRestartOnboarding?: () => void;
}

const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
];

// Generate 24 hourly time slots
const HOURS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
        key: hour.toString().padStart(2, '0'),
        label: `${displayHour}${ampm}`,
        time: `${hour.toString().padStart(2, '0')}:00`
    };
});

// Function to convert hourly availability into readable ranges
const convertToRanges = (dayAvailability: { [hour: string]: boolean }) => {
    if (!dayAvailability) return [];

    const ranges: string[] = [];
    let startHour: string | null = null;
    let endHour: string | null = null;

    // Check each hour from 00 to 23
    for (let i = 0; i < 24; i++) {
        const hourKey = i.toString().padStart(2, '0');
        const isAvailable = dayAvailability[hourKey];

        if (isAvailable && startHour === null) {
            // Start of a new range
            startHour = hourKey;
        } else if (!isAvailable && startHour !== null) {
            // End of a range
            endHour = (i - 1).toString().padStart(2, '0');
            const startLabel = HOURS.find(h => h.key === startHour)?.label;
            const endLabel = HOURS.find(h => h.key === endHour)?.label;
            ranges.push(`${startLabel}-${endLabel}`);
            startHour = null;
            endHour = null;
        }
    }

    // Handle case where range extends to the end of the day
    if (startHour !== null) {
        endHour = '23';
        const startLabel = HOURS.find(h => h.key === startHour)?.label;
        const endLabel = HOURS.find(h => h.key === endHour)?.label;
        ranges.push(`${startLabel}-${endLabel}`);
    }

    return ranges;
};

export const UserProfile: React.FC<UserProfileProps> = ({ onRestartOnboarding }) => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paypalEmail, setPayPalEmail] = useState(userProfile?.paypalEmail || '');
    const [paypalSaveStatus, setPaypalSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isChangingPaypalEmail, setIsChangingPaypalEmail] = useState(false);
    const [formData, setFormData] = useState({
        displayName: userProfile?.displayName || '',
        job: userProfile?.job || '',
        dietaryRestrictions: userProfile?.dietaryRestrictions || [],
        foodPreferences: userProfile?.foodPreferences || [],
        activityPreferences: userProfile?.activityPreferences || [],
        availability: userProfile?.availability || {},
        address: userProfile?.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        }
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

    const handleRestartOnboarding = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Reset onboarding status to trigger onboarding flow
            await updateUserProfile(user.uid, { hasCompletedOnboarding: false });
            await refreshUserProfile();
            setIsEditing(false);

            // Call the parent component's restart onboarding function
            if (onRestartOnboarding) {
                onRestartOnboarding();
            }
        } catch (error) {
            console.error('Failed to restart onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePaypalEmail = async () => {
        if (!user) return;
        setPaypalSaveStatus('saving');
        try {
            await updateUserProfile(user.uid, { paypalEmail });
            setPaypalSaveStatus('saved');
            setIsChangingPaypalEmail(false);
            await refreshUserProfile();
            setTimeout(() => setPaypalSaveStatus('idle'), 2000);
        } catch (e) {
            setPaypalSaveStatus('error');
            setTimeout(() => setPaypalSaveStatus('idle'), 2000);
        }
    };

    const handleChangePaypalEmail = () => {
        setIsChangingPaypalEmail(true);
        setPayPalEmail('');
    };

    const formatDate = (date: any) => {
        if (!date) {
            return 'Not available';
        }

        // Handle Firestore Timestamp objects
        if (date && typeof date.toDate === 'function') {
            return date.toDate().toLocaleDateString();
        }

        // Handle JavaScript Date objects
        if (date instanceof Date) {
            return date.toLocaleDateString();
        }

        // Handle timestamp numbers or strings
        try {
            return new Date(date).toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error, date);
            return 'Invalid date';
        }
    };

    const formatArray = (arr: string[] | undefined) => {
        if (!arr || arr.length === 0) return 'None specified';
        return arr.join(', ');
    };

    const formatAddress = (address: any) => {
        if (!address) return 'Not specified';
        const parts = [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Not specified';
    };

    const formatAvailability = (availability: any) => {
        if (!availability) {
            // Fallback to legacy generalAvailable field
            return userProfile?.generalAvailable ? 'Generally available' : 'Limited availability';
        }

        // Check if it's the new hourly format or old time slot format
        const isHourlyFormat = availability.monday && typeof availability.monday === 'object' &&
            Object.keys(availability.monday).some(key => key.length === 2 && !isNaN(parseInt(key)));

        if (isHourlyFormat) {
            // New hourly format - convert to ranges
            const availableSlots: string[] = [];
            DAYS_OF_WEEK.forEach(day => {
                const dayAvailability = availability[day.key];
                if (dayAvailability) {
                    const ranges = convertToRanges(dayAvailability);
                    if (ranges.length > 0) {
                        availableSlots.push(`${day.label}: ${ranges.join(', ')}`);
                    }
                }
            });
            return availableSlots.length > 0 ? availableSlots.join('; ') : 'No availability set';
        } else {
            // Old time slot format
            const availableSlots: string[] = [];
            DAYS_OF_WEEK.forEach(day => {
                const dayAvailability = availability[day.key];
                if (dayAvailability) {
                    const daySlots: string[] = [];
                    if (dayAvailability.morning) daySlots.push('Morning');
                    if (dayAvailability.afternoon) daySlots.push('Afternoon');
                    if (dayAvailability.evening) daySlots.push('Evening');
                    if (dayAvailability.night) daySlots.push('Night');
                    if (daySlots.length > 0) {
                        availableSlots.push(`${day.label}: ${daySlots.join(', ')}`);
                    }
                }
            });
            return availableSlots.length > 0 ? availableSlots.join('; ') : 'No availability set';
        }
    };

    if (!user || !userProfile) {
        return <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile</h2>
                <p className="text-gray-600">Loading profile data...</p>
            </div>
        </div>;
    }

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
                {/* Basic Information */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label className="block text-sm font-medium text-gray-700">Job</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.job}
                                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            ) : (
                                <p className="mt-1 text-sm text-gray-900">{userProfile.job || 'Not specified'}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Birthday</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {userProfile.birthday ? formatDate(userProfile.birthday) : 'Not specified'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* PayPal Email */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Settings</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PayPal Email</label>
                        {userProfile?.paypalEmail && !isChangingPaypalEmail ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-center space-x-2">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-green-800 font-medium">PayPal Connected</span>
                                </div>
                                <p className="text-sm text-green-600 text-center mt-1">{userProfile.paypalEmail}</p>
                                <button
                                    onClick={handleChangePaypalEmail}
                                    className="text-xs text-green-600 hover:text-green-800 mt-2 underline"
                                >
                                    Change PayPal Email
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                {isChangingPaypalEmail && (
                                    <button
                                        onClick={() => {
                                            setIsChangingPaypalEmail(false);
                                            setPayPalEmail(userProfile?.paypalEmail || '');
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                                    >
                                        Cancel
                                    </button>
                                )}
                                {paypalSaveStatus === 'error' && (
                                    <p className="text-red-500 text-xs">Failed to save. Try again.</p>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            This email will be used to receive payments from other users.
                        </p>
                    </div>
                </div>

                {/* Preferences */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Preferences</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Dietary Restrictions</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatArray(userProfile.dietaryRestrictions)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Food Preferences</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatArray(userProfile.foodPreferences)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Activity Preferences</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatArray(userProfile.activityPreferences)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Availability</label>
                            <div className="mt-1 space-y-1">
                                {(() => {
                                    if (!userProfile.availability) {
                                        return (
                                            <p className="text-sm text-gray-900">
                                                {userProfile.generalAvailable ? 'Generally available' : 'Limited availability'}
                                            </p>
                                        );
                                    }

                                    // Check if it's the new hourly format or old time slot format
                                    const isHourlyFormat = userProfile.availability.monday && typeof userProfile.availability.monday === 'object' &&
                                        Object.keys(userProfile.availability.monday).some(key => key.length === 2 && !isNaN(parseInt(key)));

                                    if (isHourlyFormat) {
                                        // New hourly format - convert to ranges and display in columns
                                        const availabilityRows: React.ReactElement[] = [];
                                        DAYS_OF_WEEK.forEach(day => {
                                            const dayAvailability = userProfile.availability?.[day.key];
                                            if (dayAvailability) {
                                                const ranges = convertToRanges(dayAvailability);
                                                if (ranges.length > 0) {
                                                    availabilityRows.push(
                                                        <div key={day.key} className="flex justify-between items-center py-1">
                                                            <span className="text-sm font-medium text-gray-700 w-24">{day.label}:</span>
                                                            <span className="text-sm text-gray-900">{ranges.join(', ')}</span>
                                                        </div>
                                                    );
                                                }
                                            }
                                        });
                                        return availabilityRows.length > 0 ? availabilityRows : <p className="text-sm text-gray-900">No availability set</p>;
                                    } else {
                                        // Old time slot format
                                        const availabilityRows: React.ReactElement[] = [];
                                        DAYS_OF_WEEK.forEach(day => {
                                            const dayAvailability = userProfile.availability?.[day.key];
                                            if (dayAvailability) {
                                                const daySlots: string[] = [];
                                                if (dayAvailability.morning) daySlots.push('Morning');
                                                if (dayAvailability.afternoon) daySlots.push('Afternoon');
                                                if (dayAvailability.evening) daySlots.push('Evening');
                                                if (dayAvailability.night) daySlots.push('Night');
                                                if (daySlots.length > 0) {
                                                    availabilityRows.push(
                                                        <div key={day.key} className="flex justify-between items-center py-1">
                                                            <span className="text-sm font-medium text-gray-700 w-24">{day.label}:</span>
                                                            <span className="text-sm text-gray-900">{daySlots.join(', ')}</span>
                                                        </div>
                                                    );
                                                }
                                            }
                                        });
                                        return availabilityRows.length > 0 ? availabilityRows : <p className="text-sm text-gray-900">No availability set</p>;
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <p className="mt-1 text-sm text-gray-900">
                            {formatAddress(userProfile.address)}
                        </p>
                    </div>
                </div>

                {/* Account Information */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Member Since</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(userProfile.createdAt)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(userProfile.updatedAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="flex flex-col space-y-3 pt-4">
                        <div className="flex space-x-2">
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
                                        job: userProfile.job || '',
                                        dietaryRestrictions: userProfile.dietaryRestrictions || [],
                                        foodPreferences: userProfile.foodPreferences || [],
                                        activityPreferences: userProfile.activityPreferences || [],
                                        availability: userProfile.availability || {},
                                        address: userProfile.address || {
                                            street: '',
                                            city: '',
                                            state: '',
                                            zipCode: '',
                                            country: ''
                                        }
                                    });
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Restart Onboarding Button */}
                        <div className="border-t pt-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-3">
                                    Want to update your preferences? Restart the onboarding process to answer all questions again.
                                </p>
                                <button
                                    onClick={handleRestartOnboarding}
                                    disabled={loading}
                                    className="px-6 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Processing...' : 'Restart Onboarding'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}; 