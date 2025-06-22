'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EventCard } from './EventCard';

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

interface EventsListProps {
    partyId: string;
    showScheduledOnly?: boolean;
}

export const EventsList: React.FC<EventsListProps> = ({ partyId, showScheduledOnly = false }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<RestaurantEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
    const [filterScheduledOnly, setFilterScheduledOnly] = useState(showScheduledOnly);

    useEffect(() => {
        fetchEvents();
    }, [partyId]);

    useEffect(() => {
        setFilterScheduledOnly(showScheduledOnly);
    }, [showScheduledOnly]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/events?partyId=${partyId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }

            const data = await response.json();
            // Sort events by creation date (newest first)
            const sortedEvents = data.events.sort((a: RestaurantEvent, b: RestaurantEvent) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);

                // Handle invalid dates
                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                    console.warn('Invalid date found:', { a: a.createdAt, b: b.createdAt });
                    return 0;
                }

                return dateB.getTime() - dateA.getTime();
            });
            setEvents(sortedEvents);
        } catch (error) {
            console.error('Error fetching events:', error);
            setError('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this restaurant event? This action cannot be undone.')) {
            return;
        }

        setDeletingEvent(eventId);
        try {
            const response = await fetch('/api/events', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId })
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }

            // Remove the event from the local state
            setEvents(prev => prev.filter(event => event.id !== eventId));
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event. Please try again.');
        } finally {
            setDeletingEvent(null);
        }
    };

    const handleEventUpdated = (updatedEvent: RestaurantEvent) => {
        // Update the event in the local state
        setEvents(prev => prev.map(event =>
            event.id === updatedEvent.id ? updatedEvent : event
        ));
    };

    // Filter events based on the filter state
    const filteredEvents = filterScheduledOnly
        ? events.filter(event => event.scheduledTime)
        : events;

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

    if (filteredEvents.length === 0) {
        return (
            <div className="p-4">
                <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {filterScheduledOnly ? 'No scheduled events yet' : 'No restaurant events yet'}
                    </h3>
                    <p className="text-gray-500">
                        {filterScheduledOnly
                            ? 'Schedule events to see them here.'
                            : 'Start analyzing Instagram posts to save restaurant events to this party.'
                        }
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {filterScheduledOnly ? 'Scheduled Events' : 'Restaurant Events'}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setFilterScheduledOnly(false)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${!filterScheduledOnly
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            All Events
                        </button>
                        <button
                            onClick={() => setFilterScheduledOnly(true)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${filterScheduledOnly
                                ? 'bg-green-100 text-green-700 font-medium'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Scheduled Only
                        </button>
                    </div>
                </div>
                <span className="text-sm text-gray-500">{filteredEvents.length} events</span>
            </div>

            <div className="space-y-4">
                {filteredEvents.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        onDelete={handleDeleteEvent}
                        isDeleting={deletingEvent === event.id}
                        onEventUpdated={handleEventUpdated}
                    />
                ))}
            </div>
        </div>
    );
}; 