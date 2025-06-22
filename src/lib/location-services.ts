import axios from 'axios';

export interface LocationData {
    place_name: string | null;
    location_address: string | null;
    coordinates?: {
        lat: number;
        lng: number;
    };
    confidence: 'high' | 'medium' | 'low';
}

export interface MultipleLocationData {
    locations: LocationData[];
    has_multiple_locations: boolean;
}

interface GooglePlaceResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    types: string[];
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
}

interface GooglePlacesResponse {
    results: GooglePlaceResult[];
    status: string;
}

// Use Google Maps Places API for place validation
export const searchGooglePlaces = async (query: string, location?: string): Promise<GooglePlaceResult[]> => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('Google Maps API key not found');
            return [];
        }

        // Build search query with location context
        let searchQuery = query;
        if (location) {
            searchQuery = `${query} ${location}`;
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query: searchQuery,
                key: apiKey,
                type: 'restaurant|food', // Focus on restaurants and food places
                maxResults: 10 // Increased from 5 to get more results
            }
        });

        const data: GooglePlacesResponse = response.data;
        
        if (data.status === 'OK' && data.results) {
            console.log(`Found ${data.results.length} places for query: ${searchQuery}`);
            return data.results;
        } else {
            console.log(`Google Places API returned status: ${data.status} for query: ${searchQuery}`);
            return [];
        }
    } catch (error) {
        console.error('Google Places API error:', error);
        return [];
    }
};

// Use OpenStreetMap Nominatim API (free, no API key required)
export async function geocodeLocation(placeName: string): Promise<LocationData | null> {
    try {
        console.log(`Geocoding location: ${placeName}`);
        
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: placeName,
                format: 'json',
                limit: 1,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'HackathongApp/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            const result = response.data[0];
            const address = result.display_name;
            const coordinates = {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            };

            console.log(`Found location: ${address}`);
            
            return {
                place_name: placeName,
                location_address: address,
                coordinates,
                confidence: 'high'
            };
        }
        
        console.log(`No geocoding results for: ${placeName}`);
        return null;
    } catch (error) {
        console.error(`Geocoding error for ${placeName}:`, error);
        return null;
    }
}

// Extract potential location names from text using common patterns
function extractLocationNames(text: string): string[] {
    const locationPatterns = [
        // Restaurant/cafe patterns - PRIORITY
        /(?:at|from|in|to)\s+([A-Z][a-zA-Z\s&'-]+(?:Restaurant|Cafe|Coffee|Bar|Pizza|Burger|Sushi|Diner|Bistro|Grill|Kitchen))/gi,
        // Business names with common suffixes - PRIORITY
        /([A-Z][a-zA-Z\s&'-]+(?:Starbucks|McDonald's|Subway|KFC|Pizza Hut|Domino's|Burger King|Wendy's|Taco Bell|Shake Shack|Five Guys|In-N-Out|Chipotle))/gi,
        // Food-related business patterns
        /([A-Z][a-zA-Z\s&'-]+(?:Bakery|Deli|Food|Eat|Dining|Shack|Kitchen|Grill))/gi,
        // Location hashtags (for context, not as place names)
        /#([a-zA-Z0-9]+(?:nyc|london|paris|tokyo|dubai|singapore|sydney|toronto|vancouver|miami|la|sf|chicago|boston|dc))/gi,
    ];

    const locations = new Set<string>();
    
    locationPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const location = match[1]?.trim();
            if (location && location.length > 2) {
                // Filter out landmarks and tourist attractions
                const lowerLocation = location.toLowerCase();
                const landmarkKeywords = [
                    'bridge', 'park', 'square', 'plaza', 'monument', 'statue', 'tower', 'building', 'museum', 
                    'gallery', 'theater', 'stadium', 'arena', 'airport', 'station', 'terminal', 'harbor', 
                    'beach', 'mountain', 'lake', 'river', 'canyon', 'valley', 'island', 'peninsula',
                    'golden gate', 'times square', 'central park', 'eiffel tower', 'statue of liberty',
                    'empire state', 'chrysler building', 'brooklyn bridge', 'manhattan bridge'
                ];
                
                const isLandmark = landmarkKeywords.some(keyword => lowerLocation.includes(keyword));
                if (!isLandmark) {
                    locations.add(location);
                }
            }
        }
    });

    return Array.from(locations);
}

// Main function to get location data from extracted place names
export async function getLocationData(extractedPlaceNames: string[], captionText?: string): Promise<MultipleLocationData> {
    const allLocationNames = new Set<string>();
    
    // Add extracted place names
    extractedPlaceNames.forEach(name => allLocationNames.add(name));
    
    // Extract additional locations from caption text
    if (captionText) {
        const captionLocations = extractLocationNames(captionText);
        captionLocations.forEach(name => allLocationNames.add(name));
    }

    const locationNames = Array.from(allLocationNames);
    console.log(`Found potential locations: ${locationNames.join(', ')}`);

    if (locationNames.length === 0) {
        return {
            locations: [],
            has_multiple_locations: false
        };
    }

    // Geocode each location
    const locationPromises = locationNames.map(name => geocodeLocation(name));
    const locationResults = await Promise.all(locationPromises);
    
    const validLocations = locationResults.filter(result => result !== null) as LocationData[];
    
    console.log(`Successfully geocoded ${validLocations.length} locations`);

    return {
        locations: validLocations,
        has_multiple_locations: validLocations.length > 1
    };
}

// Function to get the best location (most relevant for the context)
export function getBestLocation(locationData: MultipleLocationData): LocationData | null {
    if (locationData.locations.length === 0) {
        return null;
    }
    
    if (locationData.locations.length === 1) {
        return locationData.locations[0];
    }
    
    // For multiple locations, prioritize restaurants/cafes over general landmarks
    const restaurantLocations = locationData.locations.filter(loc => 
        loc.place_name?.toLowerCase().includes('restaurant') ||
        loc.place_name?.toLowerCase().includes('cafe') ||
        loc.place_name?.toLowerCase().includes('coffee') ||
        loc.place_name?.toLowerCase().includes('starbucks') ||
        loc.place_name?.toLowerCase().includes('mcdonald')
    );
    
    if (restaurantLocations.length > 0) {
        return restaurantLocations[0];
    }
    
    // Otherwise return the first location
    return locationData.locations[0];
}

export const validatePlaceName = async (placeName: string, contextTags: string[]): Promise<{
    isValid: boolean;
    confidence: number;
    suggestedName?: string;
    searchResults?: GooglePlaceResult[];
}> => {
    try {
        // Add location context to improve search results
        const locationHints = ['San Jose', 'Bay Area', 'California', 'CA', 'Silicon Valley', 'Blossom Hill'];
        const contextWithLocation = [...contextTags, ...locationHints];
        
        // Try multiple search queries for better results
        const searchQueries = [
            `${placeName} ${contextWithLocation.join(' ')}`,
            `${placeName} restaurant San Jose`,
            `${placeName} restaurant Bay Area`,
            `${placeName} San Jose`,
            `${placeName} Blossom Hill`,
            `${placeName} restaurant`,
            placeName // Just the place name as fallback
        ];
        
        // Also try variations of the place name
        const nameVariations = [];
        const words = placeName.split(' ');
        if (words.length > 1) {
            // Try with first two words (e.g., "Cali Spartan" from "Cali Spartan Mexican Kitchen")
            nameVariations.push(words.slice(0, 2).join(' '));
            // Try with first word (e.g., "Cali" from "Cali Spartan")
            nameVariations.push(words[0]);
        }
        
        // Add variations to search queries
        for (const variation of nameVariations) {
            searchQueries.push(`${variation} restaurant San Jose`);
            searchQueries.push(`${variation} San Jose`);
        }
        
        let bestResults: GooglePlaceResult[] = [];
        let bestConfidence = 0;
        
        for (const query of searchQueries) {
            const searchResults = await searchGooglePlaces(query, contextWithLocation.join(' '));
            if (searchResults.length > 0) {
                const confidence = analyzeSearchResults(placeName, searchResults);
                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestResults = searchResults;
                }
            }
        }
        
        if (bestResults.length === 0) {
            return { isValid: false, confidence: 0 };
        }
        
        const isValid = bestConfidence >= 0.2; // Even lower threshold for better recall
        
        return {
            isValid,
            confidence: bestConfidence,
            searchResults: isValid ? bestResults : undefined
        };
    } catch (error) {
        console.error('Place validation error:', error);
        return { isValid: false, confidence: 0 };
    }
};

function analyzeSearchResults(placeName: string, searchResults: GooglePlaceResult[]): number {
    const placeNameLower = placeName.toLowerCase();
    let confidence = 0;
    
    for (const result of searchResults.slice(0, 3)) { // Check first 3 results
        const title = result.name.toLowerCase();
        
        // Exact match gets high confidence
        if (title.includes(placeNameLower)) {
            confidence += 0.5;
        }
        
        // Partial match with more flexible word matching
        const words = placeNameLower.split(' ').filter(word => word.length > 2); // Filter out short words
        const matchingWords = words.filter(word => 
            title.includes(word)
        );
        
        // More lenient matching - if we match key words, give higher confidence
        if (matchingWords.length >= Math.max(1, words.length * 0.5)) { // 50% word match, minimum 1 word
            confidence += 0.4;
        }
        
        // Special handling for business name variations
        // "Cali Spartan" should match "Cali-Spartan", "Cali Spartan Mexican Kitchen", etc.
        const keyWords = placeNameLower.split(' ').filter(word => 
            !['the', 'and', 'or', 'of', 'in', 'at', 'to', 'for', 'with', 'by'].includes(word)
        );
        const keyWordMatches = keyWords.filter(word => title.includes(word));
        if (keyWordMatches.length >= Math.max(1, keyWords.length * 0.6)) { // 60% of key words
            confidence += 0.3;
        }
        
        // Business indicators
        const businessIndicators = ['restaurant', 'cafe', 'bar', 'shop', 'store', 'tacos', 'food', 'dining', 'kitchen', 'grill', 'bistro'];
        const hasBusinessIndicator = businessIndicators.some(indicator => 
            title.includes(indicator)
        );
        if (hasBusinessIndicator) {
            confidence += 0.2;
        }
        
        // Location indicators
        const locationIndicators = ['address', 'location', 'directions', 'map', 'hours', 'phone', 'website', 'menu', 'blossom hill', 'san jose'];
        const hasLocationIndicator = locationIndicators.some(indicator => 
            title.includes(indicator)
        );
        if (hasLocationIndicator) {
            confidence += 0.1;
        }
        
        // Check if result types include restaurant/food
        if (result.types && result.types.some(type => 
            ['restaurant', 'food', 'establishment'].includes(type)
        )) {
            confidence += 0.2;
        }
    }
    
    return Math.min(confidence, 1.0); // Cap at 1.0
}

export const enhancePlaceNamesWithSearch = async (placeNames: string[], contextTags: string[]): Promise<{
    enhancedPlaces: Array<{
        originalName: string;
        validatedName?: string;
        confidence: number;
        searchResults?: GooglePlaceResult[];
        address?: string;
        coordinates?: { lat: number; lng: number };
        rating?: number;
    }>;
    filteredPlaces: string[];
}> => {
    // Filter out landmarks and tourist attractions
    const landmarkKeywords = [
        'bridge', 'park', 'square', 'plaza', 'monument', 'statue', 'tower', 'building', 'museum', 
        'gallery', 'theater', 'stadium', 'arena', 'airport', 'station', 'terminal', 'harbor', 
        'beach', 'mountain', 'lake', 'river', 'canyon', 'valley', 'island', 'peninsula',
        'golden gate', 'times square', 'central park', 'eiffel tower', 'statue of liberty',
        'empire state', 'chrysler building', 'brooklyn bridge', 'manhattan bridge'
    ];
    
    const businessKeywords = [
        'restaurant', 'cafe', 'bistro', 'diner', 'grill', 'kitchen', 'bar', 'pizza', 'taco', 
        'burger', 'sushi', 'coffee', 'bakery', 'deli', 'food', 'eat', 'dining', 'shack',
        'mcdonalds', 'starbucks', 'chipotle', 'subway', 'kfc', 'pizza hut', 'dominos',
        'burger king', 'wendys', 'taco bell', 'shake shack', 'five guys', 'in-n-out'
    ];
    
    // Filter places to only include business-like names
    const businessPlaces = placeNames.filter(place => {
        const lowerPlace = place.toLowerCase();
        // Include if it contains business keywords
        const hasBusinessKeyword = businessKeywords.some(keyword => lowerPlace.includes(keyword));
        // Exclude if it contains landmark keywords
        const hasLandmarkKeyword = landmarkKeywords.some(keyword => lowerPlace.includes(keyword));
        
        return hasBusinessKeyword && !hasLandmarkKeyword;
    });
    
    // If no business places found, use all places but prioritize business-like names
    const placesToProcess = businessPlaces.length > 0 ? businessPlaces : placeNames;
    
    const enhancedPlaces = [];
    const filteredPlaces = [];
    
    for (const placeName of placesToProcess) {
        const validation = await validatePlaceName(placeName, contextTags);
        
        const enhancedPlace = {
            originalName: placeName,
            validatedName: validation.isValid ? placeName : undefined,
            confidence: validation.confidence,
            searchResults: validation.searchResults,
            address: validation.searchResults?.[0]?.formatted_address,
            coordinates: validation.searchResults?.[0]?.geometry?.location,
            rating: validation.searchResults?.[0]?.rating
        };
        
        enhancedPlaces.push(enhancedPlace);
        
        // Include places with confidence, but prioritize business-like names
        if (validation.confidence > 0.05) {
            // If we have business places, only include those
            if (businessPlaces.length > 0) {
                if (businessPlaces.includes(placeName)) {
                    filteredPlaces.push(placeName);
                }
            } else {
                // If no business places, include all with confidence
                filteredPlaces.push(placeName);
            }
        }
    }
    
    return { enhancedPlaces, filteredPlaces };
};

// Get detailed information about a specific place
export async function getPlaceDetails(searchQuery: string): Promise<any> {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('Google Maps API key not found');
            return null;
        }

        // First, search for the place to get the place_id
        const searchResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query: searchQuery,
                key: apiKey,
                type: 'restaurant|food',
                maxResults: 1
            }
        });

        const searchData = searchResponse.data;
        
        if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
            const placeId = searchData.results[0].place_id;
            console.log(`Found place ID: ${placeId} for query: ${searchQuery}`);
            
            // Now get detailed information using the place_id
            const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                params: {
                    place_id: placeId,
                    key: apiKey,
                    fields: 'name,formatted_address,website,formatted_phone_number,opening_hours,rating,place_id'
                }
            });

            const detailsData = detailsResponse.data;
            
            if (detailsData.status === 'OK' && detailsData.result) {
                console.log(`Retrieved details for: ${detailsData.result.name}`);
                return detailsData.result;
            } else {
                console.log(`Place details API returned status: ${detailsData.status}`);
                return null;
            }
        } else {
            console.log(`Place search returned status: ${searchData.status} for query: ${searchQuery}`);
            return null;
        }
    } catch (error) {
        console.error('Error getting place details:', error);
        return null;
    }
} 