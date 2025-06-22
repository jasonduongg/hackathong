import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    limit,
} from 'firebase/firestore';
import { db } from './firebase';

export interface RestaurantEvent {
    id: string;
    partyId: string;
    createdAt: Date;
    updatedAt: Date;

    // Instagram content data
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

    // Clean restaurant data
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

    // Additional metadata
    createdBy?: string; // User ID who created the event
    status?: 'active' | 'archived' | 'deleted';
    notes?: string;
    scheduledTime?: {
        day: string;
        hour: string;
        startTime: string;
        endTime: string;
    };
}

// Create a new restaurant event
export const createRestaurantEvent = async (eventData: Omit<RestaurantEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const eventRef = collection(db, 'events');
    const newEvent = {
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const docRef = await addDoc(eventRef, newEvent);
    return docRef.id;
};

// Get event by ID
export const getRestaurantEvent = async (eventId: string): Promise<RestaurantEvent | null> => {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
        return { id: eventSnap.id, ...eventSnap.data() } as RestaurantEvent;
    } else {
        return null;
    }
};

// Get events by party ID
export const getRestaurantEventsByParty = async (partyId: string, limitCount: number = 50): Promise<RestaurantEvent[]> => {
    const eventsRef = collection(db, 'events');
    const q = query(
        eventsRef,
        where('partyId', '==', partyId)
    );

    const querySnapshot = await getDocs(q);
    const events: RestaurantEvent[] = [];
    querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as RestaurantEvent;
        // Filter out deleted events on the client side
        if (event.status !== 'deleted') {
            events.push(event);
        }
    });

    // Sort by createdAt descending on client side
    events.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    // Apply limit on client side
    return events.slice(0, limitCount);
};

// Get events by user ID (created by)
export const getRestaurantEventsByUser = async (userId: string, limitCount: number = 50): Promise<RestaurantEvent[]> => {
    const eventsRef = collection(db, 'events');
    const q = query(
        eventsRef,
        where('createdBy', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const events: RestaurantEvent[] = [];
    querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as RestaurantEvent;
        // Filter out deleted events on the client side
        if (event.status !== 'deleted') {
            events.push(event);
        }
    });

    // Sort by createdAt descending on client side
    events.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    // Apply limit on client side
    return events.slice(0, limitCount);
};

// Update event
export const updateRestaurantEvent = async (eventId: string, updates: Partial<RestaurantEvent>): Promise<void> => {
    const eventRef = doc(db, 'events', eventId);

    const updateData = {
        ...updates,
        updatedAt: new Date(),
    };

    await updateDoc(eventRef, updateData);
};

// Delete event (soft delete by setting status to 'deleted')
export const deleteRestaurantEvent = async (eventId: string): Promise<void> => {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
        status: 'deleted',
        updatedAt: new Date(),
    });
};

// Archive event
export const archiveRestaurantEvent = async (eventId: string): Promise<void> => {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
        status: 'archived',
        updatedAt: new Date(),
    });
};

// Get recent events across all parties (for dashboard)
export const getRecentRestaurantEvents = async (limitCount: number = 20): Promise<RestaurantEvent[]> => {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef);

    const querySnapshot = await getDocs(q);
    const events: RestaurantEvent[] = [];
    querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as RestaurantEvent;
        // Filter out deleted events on the client side
        if (event.status !== 'deleted') {
            events.push(event);
        }
    });

    // Sort by createdAt descending on client side
    events.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    // Apply limit on client side
    return events.slice(0, limitCount);
};

// Search events by restaurant name
export const searchRestaurantEvents = async (searchTerm: string, partyId?: string): Promise<RestaurantEvent[]> => {
    const eventsRef = collection(db, 'events');
    let q = query(eventsRef);

    if (partyId) {
        q = query(q, where('partyId', '==', partyId));
    }

    const querySnapshot = await getDocs(q);
    const events: RestaurantEvent[] = [];

    querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as RestaurantEvent;

        // Filter out deleted events on the client side
        if (event.status === 'deleted') {
            return;
        }

        // Filter by search term
        const restaurantName = event.restaurantData.restaurant?.name?.toLowerCase() || '';
        const placeNames = event.restaurantData.analysis.place_names.join(' ').toLowerCase();
        const foods = event.restaurantData.analysis.foods_shown.join(' ').toLowerCase();
        const tags = event.restaurantData.analysis.tags.join(' ').toLowerCase();
        const caption = event.instagramData?.captionText?.toLowerCase() || '';

        const searchLower = searchTerm.toLowerCase();

        if (restaurantName.includes(searchLower) ||
            placeNames.includes(searchLower) ||
            foods.includes(searchLower) ||
            tags.includes(searchLower) ||
            caption.includes(searchLower)) {
            events.push(event);
        }
    });

    // Sort by createdAt descending on client side
    events.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    return events;
}; 