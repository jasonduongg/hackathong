import { NextRequest, NextResponse } from 'next/server';
import { createRestaurantEvent, getRestaurantEventsByParty, getRestaurantEventsByUser, deleteRestaurantEvent } from '@/lib/events';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            partyId,
            instagramData,
            restaurantData,
            createdBy,
            notes
        } = body;

        // Validate required fields
        if (!partyId) {
            return NextResponse.json(
                { error: 'Party ID is required' },
                { status: 400 }
            );
        }

        if (!restaurantData) {
            return NextResponse.json(
                { error: 'Restaurant data is required' },
                { status: 400 }
            );
        }

        // Create the event data
        const eventData = {
            partyId,
            instagramData,
            restaurantData,
            createdBy,
            notes,
            status: 'active' as const
        };

        // Save to database
        const eventId = await createRestaurantEvent(eventData);

        return NextResponse.json({
            success: true,
            eventId,
            message: 'Restaurant event saved successfully'
        });

    } catch (error) {
        console.error('Error saving restaurant event:', error);
        return NextResponse.json(
            { error: 'Failed to save restaurant event' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const partyId = searchParams.get('partyId');
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!partyId && !userId) {
            return NextResponse.json(
                { error: 'Either partyId or userId is required' },
                { status: 400 }
            );
        }

        let events;
        if (partyId) {
            events = await getRestaurantEventsByParty(partyId, limit);
        } else {
            events = await getRestaurantEventsByUser(userId!, limit);
        }

        return NextResponse.json({
            success: true,
            events,
            count: events.length
        });

    } catch (error) {
        console.error('Error fetching restaurant events:', error);
        return NextResponse.json(
            { error: 'Failed to fetch restaurant events' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        // Delete the event (soft delete)
        await deleteRestaurantEvent(eventId);

        return NextResponse.json({
            success: true,
            message: 'Restaurant event deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting restaurant event:', error);
        return NextResponse.json(
            { error: 'Failed to delete restaurant event' },
            { status: 500 }
        );
    }
} 