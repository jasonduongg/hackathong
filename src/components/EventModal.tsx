'use client';

import React, { useEffect, useState } from 'react';
import Availability from './Availability';

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
    scheduledTime?: {
        day: string;
        hour: string;
        startTime: string;
        endTime: string;
    };
}

interface EventModalProps {
    event: RestaurantEvent;
    creatorName: string;
    isOpen: boolean;
    onClose: () => void;
    onEventUpdated?: (event: RestaurantEvent | undefined) => void;
    openToAvailability?: boolean;
    upcomingEvents?: any[];
}

export const EventModal: React.FC<EventModalProps> = ({ event, creatorName, isOpen, onClose, onEventUpdated, openToAvailability, upcomingEvents }) => {
    const [showAvailability, setShowAvailability] = useState(false);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [commonTimes, setCommonTimes] = useState<any>(null);
    const [memberMetadata, setMemberMetadata] = useState<any>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';

            // If openToAvailability is true, automatically show the availability view
            if (openToAvailability) {
                setShowAvailability(true);
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, openToAvailability]);

    // Auto-load availability data when availability view is shown
    useEffect(() => {
        if (showAvailability && !memberMetadata && !loadingMetadata) {
            fetchMemberMetadata();
        }
    }, [showAvailability, memberMetadata, loadingMetadata]);

    const fetchMemberMetadata = async () => {
        if (!event.partyId) return;

        try {
            setLoadingMetadata(true);
            const response = await fetch(`/api/get-members?partyId=${event.partyId}`);
            const data = await response.json();

            if (data.success) {
                setMemberMetadata(data);
                await fetchCommonTimes(data.memberProfiles);
            } else {
                console.error('Failed to fetch member metadata:', data.error);
                alert('Failed to fetch member metadata');
            }
        } catch (error) {
            console.error('Error fetching member metadata:', error);
        } finally {
            setLoadingMetadata(false);
        }
    };

    const fetchCommonTimes = async (memberProfiles: any[]) => {
        if (!memberProfiles || memberProfiles.length === 0) return;

        try {
            const response = await fetch('/api/get-times', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberProfiles: memberProfiles
                })
            });

            const data = await response.json();

            if (data.success) {
                setCommonTimes(data);
            } else {
                console.error('Failed to fetch common times:', data.error);
            }
        } catch (error) {
            console.error('Error fetching common times:', error);
        }
    };

    const handleConfirmSelection = async (restaurant: any, selectedTimeSlot: any) => {
        if (!selectedTimeSlot) return;

        try {
            // Get the time slot details
            const day = commonTimes.commonTimes.find((d: any) => d.day === selectedTimeSlot.day);
            const slot = day?.timeSlots?.find((s: any) => s.hour === selectedTimeSlot.hour);

            if (!slot) {
                alert('Invalid time slot selected');
                return;
            }

            // Update the event with the scheduled time
            const updatedEvent = {
                ...event,
                scheduledTime: {
                    day: selectedTimeSlot.day,
                    hour: selectedTimeSlot.hour,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                }
            };

            // Save to database
            const response = await fetch('/api/events', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventId: event.id,
                    scheduledTime: updatedEvent.scheduledTime
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update event');
            }

            // Call the callback to update the parent component
            notifyParentOfChange(updatedEvent);

            // Close the availability view
            setShowAvailability(false);

            alert(`Event scheduled for ${selectedTimeSlot.day} at ${slot.startTime} - ${slot.endTime}`);
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Failed to schedule event. Please try again.');
        }
    };

    const formatDate = (date: any) => {
        if (!date) return 'Unknown date';

        try {
            let dateObj: Date;

            if (date && typeof date.toDate === 'function') {
                dateObj = date.toDate();
            } else if (date && typeof date.seconds === 'number') {
                dateObj = new Date(date.seconds * 1000);
            } else if (date instanceof Date) {
                dateObj = date;
            } else if (typeof date === 'number') {
                dateObj = new Date(date);
            } else if (typeof date === 'string') {
                dateObj = new Date(date);
            } else if (date && typeof date._seconds === 'number') {
                dateObj = new Date(date._seconds * 1000);
            } else {
                return 'Unknown date';
            }

            if (isNaN(dateObj.getTime())) {
                return 'Invalid date';
            }

            return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    // Add this function to call after scheduling or deleting
    const notifyParentOfChange = (updatedEvent?: any) => {
        if (onEventUpdated) {
            onEventUpdated(updatedEvent);
        }
    };

    const handleDeleteEvent = async () => {
        if (!confirm('Are you sure you want to delete this restaurant event? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('/api/events', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId: event.id })
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }

            // Call the callback to notify parent of the change
            notifyParentOfChange(undefined);

            // Close the modal
            onClose();

            alert('Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event. Please try again.');
        }
    };

    const handleUnscheduleEvent = async () => {
        if (!confirm('Are you sure you want to unschedule this event? The event will remain but will no longer have a scheduled time.')) {
            return;
        }

        try {
            const response = await fetch('/api/events', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventId: event.id,
                    scheduledTime: null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to unschedule event');
            }

            // Call the callback to notify parent of the change
            notifyParentOfChange({
                ...event,
                scheduledTime: undefined
            });

            // Close the modal
            onClose();

            alert('Event unscheduled successfully');
        } catch (error) {
            console.error('Error unscheduling event:', error);
            alert('Failed to unschedule event. Please try again.');
        }
    };

    if (!isOpen) return null;

    // If showing availability view, render the availability component
    if (showAvailability) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={() => setShowAvailability(false)}
                />

                {/* Modal */}
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                            <h2 className="text-2xl font-bold text-gray-900">
                                Schedule Event: {event.restaurantData.restaurant?.name || 'Restaurant'}
                            </h2>
                            <button
                                onClick={() => setShowAvailability(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <Availability
                                loadingMetadata={loadingMetadata}
                                commonTimes={commonTimes}
                                fetchMemberMetadata={fetchMemberMetadata}
                                selectedRestaurant={{
                                    name: event.restaurantData.restaurant?.name || 'Restaurant',
                                    address: event.restaurantData.restaurant?.address || '',
                                    rating: event.restaurantData.restaurant?.rating || undefined,
                                    phone: event.restaurantData.restaurant?.phone || undefined,
                                    website: event.restaurantData.restaurant?.website || undefined,
                                    hours: event.restaurantData.restaurant?.hours || undefined,
                                    isChain: event.restaurantData.restaurant?.isChain,
                                    chainName: event.restaurantData.restaurant?.chainName || undefined
                                }}
                                onConfirmSelection={handleConfirmSelection}
                                upcomingEvents={upcomingEvents}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {event.restaurantData.restaurant?.name || 'Restaurant Details'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Restaurant Image */}
                        {event.restaurantData.restaurant?.image && (
                            <div className="w-full h-48 rounded-lg overflow-hidden">
                                <img
                                    src={event.restaurantData.restaurant.image}
                                    alt={`${event.restaurantData.restaurant.name || 'Restaurant'} image`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Restaurant Information */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            {/* Restaurant Name and Rating Header */}
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-2xl font-bold text-gray-900">
                                    {event.restaurantData.restaurant?.name || 'N/A'}
                                </h4>
                                <div className="flex items-center">
                                    {event.restaurantData.restaurant?.rating ? (
                                        <>
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const roundedRating = Math.round(event.restaurantData.restaurant!.rating! * 2) / 2;
                                                    return (
                                                        <svg
                                                            key={star}
                                                            className={`w-5 h-5 ${star <= roundedRating
                                                                ? 'text-yellow-400 fill-current'
                                                                : star - 0.5 <= roundedRating
                                                                    ? 'text-yellow-400 fill-current'
                                                                    : 'text-gray-300'
                                                                }`}
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                                        </svg>
                                                    );
                                                })}
                                            </div>
                                            <span className="ml-2 text-sm text-gray-600">
                                                {event.restaurantData.restaurant.rating}/5
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-gray-500">N/A</span>
                                    )}
                                </div>
                            </div>

                            {/* Address as Subheader */}
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-lg text-gray-600">
                                    {event.restaurantData.restaurant?.address || 'N/A'}
                                </p>
                                {event.restaurantData.restaurant?.address && (
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.restaurantData.restaurant.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                        </svg>
                                        Navigate
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Phone</p>
                                    <p className="text-gray-900">{event.restaurantData.restaurant?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Website</p>
                                    {event.restaurantData.restaurant?.website ? (
                                        <a
                                            href={event.restaurantData.restaurant.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Visit Website
                                        </a>
                                    ) : (
                                        <p className="text-gray-900">N/A</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">Hours</p>
                                            <div className="text-gray-900">
                                                {event.restaurantData.restaurant?.hours && event.restaurantData.restaurant.hours.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {event.restaurantData.restaurant.hours.map((hour, index) => (
                                                            <p key={index} className="text-sm">{hour}</p>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p>N/A</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-6 flex flex-col space-y-2">
                                            <button
                                                onClick={() => setShowAvailability(true)}
                                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {event.scheduledTime ? 'Reschedule' : 'Schedule Event'}
                                            </button>
                                            {event.scheduledTime && (
                                                <button
                                                    onClick={handleUnscheduleEvent}
                                                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Unschedule
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scheduled Time Display */}
                            {event.scheduledTime && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Scheduled Time</p>
                                            <p className="text-green-700 capitalize">
                                                {event.scheduledTime.day} at {event.scheduledTime.startTime} - {event.scheduledTime.endTime}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={() => setShowAvailability(true)}
                                                className="text-green-600 hover:text-green-800 text-sm underline font-medium"
                                            >
                                                Change
                                            </button>
                                            <button
                                                onClick={handleUnscheduleEvent}
                                                className="text-yellow-600 hover:text-yellow-800 text-sm underline font-medium"
                                            >
                                                Unschedule
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analysis Information */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Foods Shown</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        {event.restaurantData.analysis.foods_shown?.length > 0 ?
                                            event.restaurantData.analysis.foods_shown.map((food, index) => (
                                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                                    {food}
                                                </span>
                                            )) : (
                                                <p className="text-gray-500">No foods identified</p>
                                            )
                                        }
                                    </div>
                                </div>
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

                        {/* Event Metadata */}
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Metadata</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Created By</p>
                                    <p className="text-gray-900">{creatorName}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Status</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${event.status === 'active' ? 'bg-green-100 text-green-800' :
                                        event.status === 'archived' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {event.status || 'active'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Created</p>
                                    <p className="text-gray-900">{formatDate(event.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Updated</p>
                                    <p className="text-gray-900">{formatDate(event.updatedAt)}</p>
                                </div>
                            </div>
                            
                            {/* Delete Button */}
                            <div className="mt-4 pt-4 border-t border-yellow-200">
                                <button
                                    onClick={handleDeleteEvent}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Event
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 