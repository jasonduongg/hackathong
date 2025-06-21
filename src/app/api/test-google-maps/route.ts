import { NextRequest, NextResponse } from 'next/server';
import { searchGooglePlaces } from '@/lib/location-services';

export async function POST(request: NextRequest) {
    try {
        const { placeName, location } = await request.json();
        
        if (!placeName) {
            return NextResponse.json(
                { error: 'Place name is required' },
                { status: 400 }
            );
        }

        console.log(`Testing Google Maps API for: ${placeName} in ${location || 'default location'}`);

        // Test the Google Places API
        const results = await searchGooglePlaces(placeName, location);
        
        if (results.length === 0) {
            return NextResponse.json({
                placeName,
                found: false,
                message: 'No places found'
            });
        }

        const bestResult = results[0];
        
        return NextResponse.json({
            placeName,
            found: true,
            name: bestResult.name,
            address: bestResult.formatted_address,
            rating: bestResult.rating,
            coordinates: bestResult.geometry.location,
            types: bestResult.types,
            allResults: results.slice(0, 3) // Return top 3 results for debugging
        });

    } catch (error: any) {
        console.error('Google Maps API test error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to test Google Maps API' },
            { status: 500 }
        );
    }
} 