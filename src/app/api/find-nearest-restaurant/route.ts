import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getUserProfilesByIds, UserProfile } from '@/lib/users';

interface RestaurantData {
  restaurant: {
    name: string;
    isChain: boolean;
    chainName: string | null;
    address: string;
    website: string;
    hours: string[];
    phone: string;
    rating: number;
    placeId: string;
  };
  analysis: {
    place_names: string[];
    multiple_locations: boolean;
    activity_type: string;
    foods_shown: string[];
    tags: string[];
    context_clues: string[];
  };
  processing: {
    frameCount: number;
    originalPlaceCount: number;
    validatedPlaceCount: number;
    geocodedPlaceCount: number;
  };
}

interface Location {
  lat: number;
  lng: number;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: Location;
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  types: string[];
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Geocode an address using Google Geocoding API
async function geocodeAddress(address: string): Promise<Location | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not found');
    return null;
  }

  if (!address || address.trim() === '') {
    console.error('Empty address provided for geocoding');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    console.log('Geocoding URL:', url.replace(apiKey, '[API_KEY]'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Geocoding API response not ok:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    console.log('Geocoding response status:', data.status);
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('No results found for address:', address);
      return null;
    } else {
      console.error('Geocoding API error:', data.status, data.error_message);
      return null;
    }
    
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Search for restaurants near a location using Google Places API
async function searchRestaurants(location: Location, restaurantName?: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not found');
    return [];
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&type=restaurant&key=${apiKey}`;
    
    if (restaurantName) {
      // If we have a specific restaurant name, search for it
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(restaurantName)}&location=${location.lat},${location.lng}&radius=5000&type=restaurant&key=${apiKey}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
}

// Get detailed place information
async function getPlaceDetails(placeId: string): Promise<any> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not found');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,types&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is properly configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Firebase configuration is missing. Please set up your environment variables.',
          details: 'Copy env.example to .env.local and fill in your Firebase configuration values.'
        },
        { status: 500 }
      );
    }

    // Check if Google Maps API key is configured
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Google Maps API key is missing. Please set up your environment variables.',
          details: 'Add GOOGLE_MAPS_API_KEY to your .env.local file.'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { partyId, restaurantData } = body;

    if (!partyId) {
      return NextResponse.json(
        { error: 'Party ID is required' },
        { status: 400 }
      );
    }

    // Get party details
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);

    if (!partySnap.exists()) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      );
    }

    const party = partySnap.data();
    const memberIds = party.members || [];

    if (memberIds.length === 0) {
      return NextResponse.json(
        { error: 'No members found in party' },
        { status: 400 }
      );
    }

    // Get member profiles with addresses
    const memberProfiles = await getUserProfilesByIds(memberIds);
    
    console.log('Member profiles:', memberProfiles.map(p => ({
      uid: p.uid,
      displayName: p.displayName,
      email: p.email,
      address: p.address,
      location: p.location
    })));
    
    // Check for members with addresses or location information
    const membersWithAddresses = memberProfiles.filter(profile => {
      const hasAddress = profile.address && (
        profile.address.street || 
        profile.address.city || 
        profile.address.state
      );
      const hasLocation = profile.location;
      
      console.log(`Member ${profile.displayName || profile.email}:`, {
        hasAddress,
        hasLocation,
        address: profile.address,
        location: profile.location
      });
      
      return hasAddress || hasLocation;
    });

    if (membersWithAddresses.length === 0) {
      return NextResponse.json(
        { 
          error: 'No members with addresses found',
          details: 'Members need to complete their profile with address or location information',
          memberCount: memberProfiles.length,
          membersWithoutAddresses: memberProfiles.map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            email: p.email,
            hasAddress: !!(p.address && (p.address.street || p.address.city)),
            hasLocation: !!p.location
          }))
        },
        { status: 400 }
      );
    }

    // Geocode all member addresses
    const memberLocations: Array<{ profile: UserProfile; location: Location }> = [];
    
    for (const profile of membersWithAddresses) {
      let addressString = '';
      
      if (profile.address && (profile.address.street || profile.address.city)) {
        // Use structured address
        addressString = [
          profile.address.street,
          profile.address.city,
          profile.address.state,
          profile.address.zipCode,
          profile.address.country
        ].filter(Boolean).join(', ');
      } else if (profile.location) {
        // Use location field as fallback
        addressString = profile.location;
      }
      
      console.log(`Geocoding address for ${profile.displayName || profile.email}:`, addressString);
      
      const location = await geocodeAddress(addressString);
      if (location) {
        memberLocations.push({ profile, location });
        console.log(`Successfully geocoded: ${addressString} -> ${location.lat}, ${location.lng}`);
      } else {
        console.log(`Failed to geocode: ${addressString}`);
      }
    }

    if (memberLocations.length === 0) {
      return NextResponse.json(
        { error: 'Could not geocode any member addresses' },
        { status: 400 }
      );
    }

    // Calculate the centroid of all member locations
    const centroid = {
      lat: memberLocations.reduce((sum, member) => sum + member.location.lat, 0) / memberLocations.length,
      lng: memberLocations.reduce((sum, member) => sum + member.location.lng, 0) / memberLocations.length
    };

    // Search for restaurants
    let restaurants: PlaceResult[] = [];
    
    if (restaurantData?.restaurant?.name) {
      // If we have a specific restaurant name, search for it
      restaurants = await searchRestaurants(centroid, restaurantData.restaurant.name);
    } else {
      // Search for general restaurants
      restaurants = await searchRestaurants(centroid);
    }

    if (restaurants.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants found near the party location' },
        { status: 404 }
      );
    }

    // Find the nearest restaurant to the centroid
    let nearestRestaurant = restaurants[0];
    let minDistance = calculateDistance(
      centroid.lat, centroid.lng,
      nearestRestaurant.geometry.location.lat, nearestRestaurant.geometry.location.lng
    );

    for (const restaurant of restaurants) {
      const distance = calculateDistance(
        centroid.lat, centroid.lng,
        restaurant.geometry.location.lat, restaurant.geometry.location.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestRestaurant = restaurant;
      }
    }

    // Get detailed information about the nearest restaurant
    const placeDetails = await getPlaceDetails(nearestRestaurant.place_id);

    // Format the response
    const response = {
      restaurant: {
        name: nearestRestaurant.name,
        isChain: false, // Would need additional logic to determine this
        chainName: null,
        address: nearestRestaurant.formatted_address,
        website: placeDetails?.website || '',
        hours: placeDetails?.opening_hours?.weekday_text || [],
        phone: placeDetails?.formatted_phone_number || '',
        rating: nearestRestaurant.rating || 0,
        placeId: nearestRestaurant.place_id
      },
      analysis: {
        place_names: [nearestRestaurant.name],
        multiple_locations: restaurants.length > 1,
        activity_type: 'eating',
        foods_shown: restaurantData?.analysis?.foods_shown || [],
        tags: restaurantData?.analysis?.tags || [],
        context_clues: restaurantData?.analysis?.context_clues || []
      },
      processing: {
        frameCount: restaurantData?.processing?.frameCount || 0,
        originalPlaceCount: restaurants.length,
        validatedPlaceCount: 1,
        geocodedPlaceCount: memberLocations.length
      },
      location: {
        centroid,
        memberLocations: memberLocations.map(member => ({
          userId: member.profile.uid,
          displayName: member.profile.displayName,
          location: member.location,
          address: member.profile.address
        })),
        distanceToRestaurant: minDistance
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error finding nearest restaurant:', error);
    return NextResponse.json(
      { error: 'Failed to find nearest restaurant' },
      { status: 500 }
    );
  }
} 