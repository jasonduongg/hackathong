'use client';

import React from 'react';

interface RestaurantEvent {
    id: string;
    partyId: string;
    createdAt: Date;
    updatedAt: Date;
    instagramData?: {
        screenshots?: string[];
        captionText: string;
        accountMentions: string[];
        locationTags: string[];
        hashtags: string[];
        allText: string;
        screenshotCount: number;
        videoDuration: number;
        originalUrl?: string;
    };
    restaurantData: {
        restaurant: {
            name: string;
            isChain: boolean;
            chainName?: string | null;
            address?: string | null;
            website?: string | null;
            hours?: string[] | null;
            phone?: string | null;
            rating?: number | null;
            placeId?: string | null;
        } | null;
        analysis: {
            place_names: string[];
            multiple_locations: boolean;
            activity_type: string;
            foods_shown: string[];
            tags: string[];
            context_clues?: string[];
        };
        processing: {
            frameCount: number;
            originalPlaceCount: number;
            validatedPlaceCount: number;
            geocodedPlaceCount: number;
        };
    };
    createdBy?: string;
    status?: 'active' | 'archived' | 'deleted';
    notes?: string;
}

interface EventCardProps {
    event: RestaurantEvent;
    onDelete: (eventId: string) => void;
    isDeleting: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onDelete, isDeleting }) => {
    const formatDate = (date: any) => {
        if (!date) return 'Unknown date';

        try {
            let dateObj: Date;

            // Handle Firestore Timestamp objects
            if (date && typeof date.toDate === 'function') {
                dateObj = date.toDate();
            }
            // Handle Firestore Timestamp with seconds/nanoseconds
            else if (date && typeof date.seconds === 'number') {
                dateObj = new Date(date.seconds * 1000);
            }
            // Handle JavaScript Date objects
            else if (date instanceof Date) {
                dateObj = date;
            }
            // Handle timestamp numbers
            else if (typeof date === 'number') {
                dateObj = new Date(date);
            }
            // Handle date strings
            else if (typeof date === 'string') {
                dateObj = new Date(date);
            }
            // Handle objects with _seconds property (Firestore timestamp)
            else if (date && typeof date._seconds === 'number') {
                dateObj = new Date(date._seconds * 1000);
            }
            else {
                console.warn('Unknown date format:', date);
                return 'Unknown date';
            }

            // Check if the date is valid
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date object:', date);
                return 'Invalid date';
            }

            return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error, date);
            return 'Invalid date';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {event.restaurantData.restaurant?.name || 'Unknown Restaurant'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Added by {event.createdBy} on {formatDate(event.createdAt)}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(event.id)}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete event"
                >
                    {isDeleting ? (
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Restaurant Details */}
            <div className="mb-3">
                {event.restaurantData.restaurant?.address && (
                    <p className="text-sm text-gray-600 mb-1">
                        📍 {event.restaurantData.restaurant.address}
                    </p>
                )}
                {event.restaurantData.restaurant?.phone && (
                    <p className="text-sm text-gray-600 mb-1">
                        📞 {event.restaurantData.restaurant.phone}
                    </p>
                )}
                {event.restaurantData.restaurant?.hours && event.restaurantData.restaurant.hours.length > 0 && (
                    <div className="mb-1">
                        <p className="text-sm font-medium text-gray-700 mb-1">🕒 Hours:</p>
                        <div className="text-xs text-gray-600 space-y-1">
                            {event.restaurantData.restaurant.hours.slice(0, 3).map((hour: string, idx: number) => (
                                <div key={idx}>{hour}</div>
                            ))}
                            {event.restaurantData.restaurant.hours.length > 3 && (
                                <div className="text-gray-500">
                                    +{event.restaurantData.restaurant.hours.length - 3} more days
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Foods Shown */}
            {event.restaurantData.analysis.foods_shown.length > 0 && (
                <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Foods:</p>
                    <div className="flex flex-wrap gap-1">
                        {event.restaurantData.analysis.foods_shown.slice(0, 5).map((food, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                                {food}
                            </span>
                        ))}
                        {event.restaurantData.analysis.foods_shown.length > 5 && (
                            <span className="text-xs text-gray-500">
                                +{event.restaurantData.analysis.foods_shown.length - 5} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Instagram Caption Preview */}
            {event.instagramData?.captionText && (
                <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Caption:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                        {event.instagramData.captionText.substring(0, 150)}
                        {event.instagramData.captionText.length > 150 && '...'}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                    {event.restaurantData.restaurant?.website && (
                        <a
                            href={event.restaurantData.restaurant.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            Visit Website
                        </a>
                    )}
                    {event.instagramData?.originalUrl && (
                        <a
                            href={event.instagramData.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:text-purple-800 underline"
                        >
                            View Instagram Post
                        </a>
                    )}
                </div>
                <span className="text-xs text-gray-400">
                    ID: {event.id.substring(0, 8)}...
                </span>
            </div>
        </div>
    );
}; 