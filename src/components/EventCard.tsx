'use client';

import React, { useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/users';
import { EventModal } from './EventModal';

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
            image?: string | null;
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
    const [creatorName, setCreatorName] = useState<string>('Loading...');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchCreatorName = async () => {
            if (event.createdBy) {
                try {
                    const userProfile = await getUserProfile(event.createdBy);
                    if (userProfile) {
                        setCreatorName(userProfile.displayName || userProfile.email || 'Unknown User');
                    } else {
                        setCreatorName('Unknown User');
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setCreatorName('Unknown User');
                }
            } else {
                setCreatorName('Unknown User');
            }
        };

        fetchCreatorName();
    }, [event.createdBy]);

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
            <div className="flex gap-4 items-center">
                {/* Restaurant Image - 1:1 aspect ratio on the left */}
                {event.restaurantData.restaurant?.image && (
                    <div className="flex-shrink-0 mr-4">
                        <div className="relative w-40 h-40">
                            <img
                                src={event.restaurantData.restaurant.image}
                                alt={`${event.restaurantData.restaurant.name} restaurant`}
                                className="w-full h-full object-cover rounded-lg shadow-sm border border-gray-200"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    // Show fallback message
                                    const container = target.parentElement;
                                    if (container) {
                                        container.innerHTML = `
                                            <div class="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
                                                <div class="text-center text-gray-500">
                                                    <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                    </svg>
                                                    <p class="text-xs">No image</p>
                                                </div>
                                            </div>
                                        `;
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Content area - header and address on the right */}
                <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {event.restaurantData.restaurant?.name || 'Unknown Restaurant'}
                            </h3>
                            {event.restaurantData.restaurant?.address && (
                                <p className="text-sm text-gray-600 mb-1">
                                    📍 {event.restaurantData.restaurant.address}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                title="View event details"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
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
                    </div>

                    {/* Restaurant Details */}
                    <div className="mb-3">
                        <div className="flex items-center space-x-2">
                            {event.restaurantData.restaurant?.website && (
                                <a
                                    href={event.restaurantData.restaurant.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                                    </svg>
                                    Website
                                </a>
                            )}
                            {event.instagramData?.originalUrl && (
                                <a
                                    href={event.instagramData.originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    Instagram
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Added by {creatorName} on {formatDate(event.createdAt)}
                        </p>
                        <span className="text-xs text-gray-400">
                            ID: {event.id.substring(0, 8)}...
                        </span>
                    </div>
                </div>
            </div>

            {/* Event Modal */}
            <EventModal
                event={event}
                creatorName={creatorName}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}; 