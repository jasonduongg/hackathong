'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

interface EventsListProps {
    partyId: string;
}

export const EventsList: React.FC<EventsListProps> = ({ partyId }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<RestaurantEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, [partyId]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/events?partyId=${partyId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }

            const data = await response.json();
            setEvents(data.events);
        } catch (error) {
            console.error('Error fetching events:', error);
            setError('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

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

    if (loading) {
        return (
            <div className="p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="mt-2 text-red-600 hover:text-red-800 underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="p-4">
                <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurant events yet</h3>
                    <p className="text-gray-500">
                        Start analyzing Instagram posts to save restaurant events to this party.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Restaurant Events</h3>
                <span className="text-sm text-gray-500">{events.length} events</span>
            </div>

            <div className="space-y-4">
                {events.map((event) => (
                    <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">
                                    {event.restaurantData.restaurant?.name || 'Unknown Restaurant'}
                                </h4>
                                <p className="text-sm text-gray-500">
                                    {formatDate(event.createdAt)}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {event.restaurantData.restaurant?.rating && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        ⭐ {event.restaurantData.restaurant.rating}/5
                                    </span>
                                )}
                                {event.instagramData && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        📸 Instagram
                                    </span>
                                )}
                            </div>
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
                ))}
            </div>
        </div>
    );
}; 