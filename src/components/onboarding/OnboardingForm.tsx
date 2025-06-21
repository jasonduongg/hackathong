'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/users';

interface OnboardingFormProps {
    onComplete: () => void;
}

interface OnboardingData {
    dietaryRestrictions: string[];
    birthday: string;
    displayName: string;
    job: string;
    availability: {
        [day: string]: {
            [hour: string]: boolean;
        };
    };
    activityPreferences: string[];
    foodPreferences: string[];
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
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

const ONBOARDING_QUESTIONS = {
    displayName: {
        title: "What should we call you?",
        subtitle: "This is how other users will see your name",
        type: "text",
        required: true,
        placeholder: "Enter your display name"
    },
    birthday: {
        title: "When's your birthday?",
        subtitle: "We'll use this to personalize your experience",
        type: "date",
        required: true
    },
    job: {
        title: "What do you do for work?",
        subtitle: "This helps us understand your schedule and interests",
        type: "text",
        required: false,
        placeholder: "e.g., Software Engineer, Teacher, Student"
    },
    dietaryRestrictions: {
        title: "Any dietary restrictions?",
        subtitle: "Select all that apply",
        type: "multiSelect",
        required: false,
        options: [
            "None",
            "Vegetarian",
            "Vegan",
            "Gluten-Free",
            "Dairy-Free",
            "Nut-Free",
            "Halal",
            "Kosher",
            "Low-Carb",
            "Keto",
            "Paleo"
        ]
    },
    foodPreferences: {
        title: "What types of food do you enjoy?",
        subtitle: "Select your favorite cuisines",
        type: "multiSelect",
        required: false,
        options: [
            "Italian",
            "Mexican",
            "Chinese",
            "Japanese",
            "Indian",
            "Thai",
            "Mediterranean",
            "American",
            "French",
            "Greek",
            "Korean",
            "Vietnamese",
            "Middle Eastern",
            "African",
            "Caribbean"
        ]
    },
    activityPreferences: {
        title: "What activities interest you?",
        subtitle: "Select activities you'd like to participate in",
        type: "multiSelect",
        required: false,
        options: [
            "Cooking",
            "Hiking",
            "Sports",
            "Gaming",
            "Reading",
            "Travel",
            "Music",
            "Art",
            "Photography",
            "Dancing",
            "Yoga",
            "Running",
            "Cycling",
            "Swimming",
            "Board Games",
            "Movies",
            "Theater",
            "Museums",
            "Wine Tasting",
            "Coffee/Tea"
        ]
    },
    availability: {
        title: "When are you typically available?",
        subtitle: "Select the hours when you're usually free for activities",
        type: "availability",
        required: true
    },
    address: {
        title: "Where are you located?",
        subtitle: "This helps us find activities near you",
        type: "address",
        required: false
    }
};

const QUESTION_ORDER = [
    'displayName',
    'birthday',
    'job',
    'dietaryRestrictions',
    'foodPreferences',
    'activityPreferences',
    'availability',
    'address'
];

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ onComplete }) => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);

    // Initialize availability with 24 hours for each day
    const initializeAvailability = () => {
        const availability: { [day: string]: { [hour: string]: boolean } } = {};
        DAYS_OF_WEEK.forEach(day => {
            availability[day.key] = {};
            HOURS.forEach(hour => {
                availability[day.key][hour.key] = false;
            });
        });
        return availability;
    };

    const [formData, setFormData] = useState<OnboardingData>({
        dietaryRestrictions: [],
        birthday: '',
        displayName: '',
        job: '',
        availability: initializeAvailability(),
        activityPreferences: [],
        foodPreferences: [],
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        }
    });

    // Pre-fill form with existing user data when component mounts or userProfile changes
    useEffect(() => {
        if (userProfile) {
            // Convert birthday Date to string format for input
            const formatDateForInput = (date: any) => {
                if (!date) return '';

                // Handle Firestore Timestamp objects
                if (date && typeof date.toDate === 'function') {
                    return date.toDate().toISOString().split('T')[0];
                }

                // Handle JavaScript Date objects
                if (date instanceof Date) {
                    return date.toISOString().split('T')[0];
                }

                // Handle timestamp numbers or strings
                try {
                    return new Date(date).toISOString().split('T')[0];
                } catch (error) {
                    return '';
                }
            };

            // Convert old availability format to new hourly format
            const convertAvailability = () => {
                if (userProfile.availability) {
                    // If user already has hourly availability, use it
                    const converted = initializeAvailability();
                    DAYS_OF_WEEK.forEach(day => {
                        if (userProfile.availability[day.key]) {
                            HOURS.forEach(hour => {
                                converted[day.key][hour.key] = userProfile.availability[day.key][hour.key] || false;
                            });
                        }
                    });
                    return converted;
                }

                // Convert old time slot format to hourly
                const converted = initializeAvailability();

                // If user has old generalAvailable field, set common hours
                if (userProfile.generalAvailable) {
                    DAYS_OF_WEEK.forEach(day => {
                        // Set common availability hours (9 AM to 9 PM)
                        HOURS.forEach(hour => {
                            const hourNum = parseInt(hour.key);
                            converted[day.key][hour.key] = hourNum >= 9 && hourNum <= 21;
                        });
                    });
                }

                // If user has old time slot format, convert it
                if (userProfile.availability) {
                    DAYS_OF_WEEK.forEach(day => {
                        const dayAvailability = userProfile.availability[day.key];
                        if (dayAvailability) {
                            // Convert old time slots to hours
                            if (dayAvailability.morning) {
                                // Morning: 6 AM to 12 PM
                                for (let i = 6; i < 12; i++) {
                                    converted[day.key][i.toString().padStart(2, '0')] = true;
                                }
                            }
                            if (dayAvailability.afternoon) {
                                // Afternoon: 12 PM to 6 PM
                                for (let i = 12; i < 18; i++) {
                                    converted[day.key][i.toString().padStart(2, '0')] = true;
                                }
                            }
                            if (dayAvailability.evening) {
                                // Evening: 6 PM to 12 AM
                                for (let i = 18; i < 24; i++) {
                                    converted[day.key][i.toString().padStart(2, '0')] = true;
                                }
                            }
                            if (dayAvailability.night) {
                                // Night: 12 AM to 6 AM
                                for (let i = 0; i < 6; i++) {
                                    converted[day.key][i.toString().padStart(2, '0')] = true;
                                }
                            }
                        }
                    });
                }

                return converted;
            };

            setFormData({
                dietaryRestrictions: userProfile.dietaryRestrictions || [],
                birthday: formatDateForInput(userProfile.birthday),
                displayName: userProfile.displayName || '',
                job: userProfile.job || '',
                availability: convertAvailability(),
                activityPreferences: userProfile.activityPreferences || [],
                foodPreferences: userProfile.foodPreferences || [],
                address: {
                    street: userProfile.address?.street || '',
                    city: userProfile.address?.city || '',
                    state: userProfile.address?.state || '',
                    zipCode: userProfile.address?.zipCode || '',
                    country: userProfile.address?.country || ''
                }
            });
        }
    }, [userProfile]);

    const currentQuestionKey = QUESTION_ORDER[currentPage];
    const currentQuestion = ONBOARDING_QUESTIONS[currentQuestionKey as keyof typeof ONBOARDING_QUESTIONS];
    const totalPages = QUESTION_ORDER.length;

    const handleInputChange = (field: string, value: any) => {
        if (field === 'address') {
            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, ...value }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleMultiSelectChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field as keyof OnboardingData]?.includes(value)
                ? (prev[field as keyof OnboardingData] as string[]).filter(item => item !== value)
                : [...(prev[field as keyof OnboardingData] as string[] || []), value]
        }));
    };

    const handleAvailabilityChange = (day: string, hour: string) => {
        setFormData(prev => ({
            ...prev,
            availability: {
                ...prev.availability,
                [day]: {
                    ...prev.availability[day as keyof typeof prev.availability],
                    [hour]: !prev.availability[day as keyof typeof prev.availability][hour]
                }
            }
        }));
    };

    const isCurrentPageValid = () => {
        const value = currentQuestionKey === 'address'
            ? Object.values(formData.address).some(v => v.trim())
            : currentQuestionKey === 'availability'
                ? Object.values(formData.availability).some(day =>
                    Object.values(day).some(hour => hour)
                )
                : formData[currentQuestionKey as keyof OnboardingData];

        if (currentQuestion.required) {
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            if (typeof value === 'object' && value !== null) {
                // For availability object, check if at least one hour is selected
                return Object.values(value).some(day =>
                    Object.values(day).some(hour => hour)
                );
            }
            return value && value.toString().trim() !== '';
        }
        return true;
    };

    const handleNext = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Convert birthday string to Date object
            const birthdayDate = formData.birthday ? new Date(formData.birthday) : undefined;

            // Filter out empty arrays and convert to proper format
            const updateData = {
                displayName: formData.displayName,
                birthday: birthdayDate,
                job: formData.job || undefined,
                dietaryRestrictions: formData.dietaryRestrictions.length > 0 ? formData.dietaryRestrictions : undefined,
                foodPreferences: formData.foodPreferences.length > 0 ? formData.foodPreferences : undefined,
                activityPreferences: formData.activityPreferences.length > 0 ? formData.activityPreferences : undefined,
                availability: formData.availability,
                address: Object.values(formData.address).some(v => v.trim()) ? formData.address : undefined,
                hasCompletedOnboarding: true
            };

            await updateUserProfile(user.uid, updateData);
            await refreshUserProfile();
            onComplete();
        } catch (error) {
            console.error('Failed to save onboarding data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderQuestion = () => {
        switch (currentQuestion.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={formData[currentQuestionKey as keyof OnboardingData] as string || ''}
                        onChange={(e) => handleInputChange(currentQuestionKey, e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={formData[currentQuestionKey as keyof OnboardingData] as string || ''}
                        onChange={(e) => handleInputChange(currentQuestionKey, e.target.value)}
                        className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                );

            case 'availability':
                return (
                    <div className="mt-4">
                        <div className="overflow-x-auto">
                            <div className="min-w-full">
                                {/* Header with days */}
                                <div className="grid grid-cols-8 gap-1 mb-2">
                                    <div className="text-sm font-medium text-gray-700 text-center">Hour</div>
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day.key} className="text-xs font-medium text-gray-600 text-center">
                                            {day.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Hours and days */}
                                {HOURS.map(hour => (
                                    <div key={hour.key} className="grid grid-cols-8 gap-1 mb-1">
                                        <div className="text-xs font-medium text-gray-700 flex items-center justify-center">
                                            {hour.label}
                                        </div>
                                        {DAYS_OF_WEEK.map(day => (
                                            <button
                                                key={`${hour.key}-${day.key}`}
                                                type="button"
                                                onClick={() => handleAvailabilityChange(day.key, hour.key)}
                                                className={`h-6 rounded transition-colors ${formData.availability[day.key as keyof typeof formData.availability][hour.key]
                                                    ? 'bg-indigo-500 hover:bg-indigo-600'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                                    }`}
                                                title={`${day.label} ${hour.label} (${hour.time})`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 text-sm text-gray-600">
                            <p>💡 Tip: Click on the bars to select when you're typically available for activities.</p>
                        </div>
                    </div>
                );

            case 'multiSelect':
                return (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {currentQuestion.options?.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleMultiSelectChange(currentQuestionKey, option)}
                                className={`p-3 rounded-lg border-2 transition-colors text-sm ${(formData[currentQuestionKey as keyof OnboardingData] as string[])?.includes(option)
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );

            case 'address':
                return (
                    <div className="mt-4 space-y-3">
                        <input
                            type="text"
                            placeholder="Street Address"
                            value={formData.address.street}
                            onChange={(e) => handleInputChange('address', { street: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="City"
                                value={formData.address.city}
                                onChange={(e) => handleInputChange('address', { city: e.target.value })}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <input
                                type="text"
                                placeholder="State"
                                value={formData.address.state}
                                onChange={(e) => handleInputChange('address', { state: e.target.value })}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="ZIP Code"
                                value={formData.address.zipCode}
                                onChange={(e) => handleInputChange('address', { zipCode: e.target.value })}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Country"
                                value={formData.address.country}
                                onChange={(e) => handleInputChange('address', { country: e.target.value })}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full bg-white rounded-xl shadow-lg p-8">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">
                            Step {currentPage + 1} of {totalPages}
                        </span>
                        <span className="text-sm text-gray-600">
                            {Math.round(((currentPage + 1) / totalPages) * 100)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {currentQuestion.title}
                    </h2>
                    <p className="text-gray-600">
                        {currentQuestion.subtitle}
                    </p>
                </div>

                {/* Form Field */}
                {renderQuestion()}

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        onClick={handlePrevious}
                        disabled={currentPage === 0}
                        className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    {currentPage === totalPages - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !isCurrentPageValid()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Complete Setup'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={!isCurrentPageValid()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}; 