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

// Search for specific restaurant locations using Google Places API
async function searchRestaurantLocations(location: Location, restaurantName: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not found');
    return [];
  }

  try {
    // Use text search to find specific restaurant locations
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(restaurantName)}&location=${location.lat},${location.lng}&radius=50000&type=restaurant&key=${apiKey}`;
    
    console.log('Searching for restaurant locations:', restaurantName);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log(`Found ${data.results.length} locations for ${restaurantName}`);
      return data.results;
    } else {
      console.error('Places API error:', data.status, data.error_message);
      return [];
    }
    
  } catch (error) {
    console.error('Error searching restaurant locations:', error);
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

    if (!restaurantData || !restaurantData.restaurant || !restaurantData.restaurant.name) {
      return NextResponse.json(
        { error: 'Restaurant data with name is required' },
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
      address: p.address
    })));
    
    // Check for members with structured addresses only
    const membersWithAddresses = memberProfiles.filter(profile => {
      const hasAddress = profile.address && (
        profile.address.street || 
        profile.address.city || 
        profile.address.state
      );
      
      console.log(`Member ${profile.displayName || profile.email}:`, {
        hasAddress,
        address: profile.address
      });
      
      return hasAddress;
    });

    if (membersWithAddresses.length === 0) {
      return NextResponse.json(
        { 
          error: 'No members with addresses found',
          details: 'Members need to complete their profile with structured address information (street, city, state)',
          memberCount: memberProfiles.length,
          membersWithoutAddresses: memberProfiles.map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            email: p.email,
            hasAddress: !!(p.address && (p.address.street || p.address.city)),
            addressFields: p.address ? {
              hasStreet: !!p.address.street,
              hasCity: !!p.address.city,
              hasState: !!p.address.state,
              hasZipCode: !!p.address.zipCode,
              hasCountry: !!p.address.country
            } : null
          }))
        },
        { status: 400 }
      );
    }

    // Geocode all member addresses
    const memberLocations: Array<{ profile: UserProfile; location: Location }> = [];
    
    for (const profile of membersWithAddresses) {
      // Only use structured address data
      const address = profile.address!;
      const addressString = [
        address.street,
        address.city,
        address.state,
        address.zipCode,
        address.country
      ].filter(Boolean).join(', ');
      
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

    console.log('Party centroid:', centroid);

    // Search for restaurant locations
    const restaurantName = restaurantData.restaurant.name;
    const restaurantLocations = await searchRestaurantLocations(centroid, restaurantName);

    if (restaurantLocations.length === 0) {
      return NextResponse.json(
        { 
          error: `No locations found for ${restaurantName}`,
          details: 'The restaurant may not have multiple locations or may not be in the search area'
        },
        { status: 404 }
      );
    }

    // Find the nearest restaurant location to the centroid
    let nearestLocation = restaurantLocations[0];
    let minDistance = calculateDistance(
      centroid.lat, centroid.lng,
      nearestLocation.geometry.location.lat, nearestLocation.geometry.location.lng
    );

    for (const location of restaurantLocations) {
      const distance = calculateDistance(
        centroid.lat, centroid.lng,
        location.geometry.location.lat, location.geometry.location.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    }

    // Sort all locations by distance and take top 3
    const sortedLocations = restaurantLocations
      .map(location => ({
        name: location.name,
        address: location.formatted_address,
        rating: location.rating || 0,
        distance: calculateDistance(
          centroid.lat, centroid.lng,
          location.geometry.location.lat, location.geometry.location.lng
        ),
        placeId: location.place_id
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3); // Take only top 3 closest locations

    // Get detailed information for each location including hours
    const locationsWithDetails = await Promise.all(
      sortedLocations.map(async (location) => {
        const details = await getPlaceDetails(location.placeId);
        return {
          name: location.name,
          address: location.address,
          rating: location.rating,
          distance: location.distance,
          hours: details?.opening_hours?.weekday_text || [],
          phone: details?.formatted_phone_number || '',
          website: details?.website || '',
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${location.placeId}`
        };
      })
    );

    // Format the response
    const response = {
      originalRestaurant: restaurantData.restaurant,
      nearestLocation: {
        name: locationsWithDetails[0].name,
        address: locationsWithDetails[0].address,
        website: locationsWithDetails[0].website,
        hours: locationsWithDetails[0].hours,
        phone: locationsWithDetails[0].phone,
        rating: locationsWithDetails[0].rating,
        placeId: sortedLocations[0].placeId,
        distanceFromParty: locationsWithDetails[0].distance,
        googleMapsUrl: locationsWithDetails[0].googleMapsUrl
      },
      allLocations: locationsWithDetails,
      partyInfo: {
        centroid,
        memberCount: memberLocations.length,
        memberLocations: memberLocations.map(member => ({
          userId: member.profile.uid,
          displayName: member.profile.displayName,
          location: member.location,
          address: member.profile.address
        }))
      },
      analysis: {
        totalLocationsFound: restaurantLocations.length,
        topLocationsShown: 3,
        searchRadius: '50km',
        restaurantName: restaurantName,
        isChain: restaurantLocations.length > 1
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error finding nearest chain location:', error);
    return NextResponse.json(
      { error: 'Failed to find nearest chain location' },
      { status: 500 }
    );
  }
} 