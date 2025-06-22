import { NextRequest, NextResponse } from 'next/server';
import { processURLWithLLM, processVideoFile, processVideoFrames, processImageFile, processMultipleImages } from '@/lib/llm-services';
import { getLocationData, getBestLocation, geocodeLocation, enhancePlaceNamesWithSearch, getPlaceDetails } from '@/lib/location-services';
import { parseStructuredVideoData } from '@/lib/prompts';

// Function to calculate string similarity (Levenshtein distance based)
function calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

export async function POST(request: NextRequest) {
    try {
        console.log('API route called - starting request processing');
        const formData = await request.formData();
        const videoFile = formData.get('video') as File;
        const imageFile = formData.get('image') as File;
        const images = formData.getAll('images') as File[];
        const url = formData.get('url') as string;
        const frames = formData.getAll('frames') as string[];
        const promptType = formData.get('promptType') as string || 'general';
        const customInstructions = formData.get('customInstructions') as string;
        const provider = formData.get('provider') as string || 'anthropic';
        const captionText = formData.get('captionText') as string;
        const accountMentions = formData.get('accountMentions') as string;
        const locationTags = formData.get('locationTags') as string;
        const hashtags = formData.get('hashtags') as string;
        const analysisMode = formData.get('analysisMode') as string;
        const videoDuration = formData.get('videoDuration') as string;

        console.log('Processing request:', { 
            hasUrl: !!url, 
            hasVideoFile: !!videoFile,
            hasImageFile: !!imageFile,
            imageCount: images.length,
            frameCount: frames.length, 
            promptType, 
            provider,
            analysisMode,
            hasCaptionText: !!captionText,
            hasAccountMentions: !!accountMentions,
            hasLocationTags: !!locationTags,
            hasHashtags: !!hashtags,
            videoDuration
        });

        // Validate provider (only anthropic supported now)
        if (provider !== 'anthropic') {
            return NextResponse.json(
                { error: 'Only Anthropic provider is supported' },
                { status: 400 }
            );
        }

        let llmResponse;

        // Handle multiple images (Instagram screenshots)
        if (images && images.length > 0) {
            console.log(`Processing ${images.length} Instagram screenshots`);
            
            // Validate all files are images
            for (const img of images) {
                if (!img.type.startsWith('image/')) {
                    return NextResponse.json(
                        { error: 'All files must be images' },
                        { status: 400 }
                    );
                }
            }
            
            // Process multiple images with enhanced context
            const enhancedCaption = captionText ? 
                `Caption: ${captionText}\n` : '';
            const enhancedContext = [
                enhancedCaption,
                accountMentions ? `Account mentions: ${accountMentions}\n` : '',
                locationTags ? `Location tags: ${locationTags}\n` : '',
                hashtags ? `Hashtags: ${hashtags}\n` : '',
                videoDuration ? `Video duration: ${videoDuration} seconds\n` : '',
                `This is a series of ${images.length} screenshots from an Instagram video. Analyze all screenshots together to provide a comprehensive understanding of the content.`
            ].filter(Boolean).join('');
            
            // Process all images together
            llmResponse = await processMultipleImages(images, promptType, enhancedContext);
        }
        // Handle video frames processing
        else if (frames && frames.length > 0) {
            console.log(`Processing ${frames.length} video frames`);
            // Process video frames
            llmResponse = await processVideoFrames(frames, promptType, customInstructions);
        }
        // Handle direct image file upload
        else if (imageFile) {
            // Validate file type
            if (!imageFile.type.startsWith('image/')) {
                return NextResponse.json(
                    { error: 'File must be an image' },
                    { status: 400 }
                );
            }
            // Process image file
            llmResponse = await processImageFile(imageFile, promptType, customInstructions);
        }
        // Handle video file upload
        else if (videoFile) {
            // Validate file type
            if (!videoFile.type.startsWith('video/')) {
                return NextResponse.json(
                    { error: 'File must be a video' },
                    { status: 400 }
                );
            }

            // Validate file size (100MB limit)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (videoFile.size > maxSize) {
                return NextResponse.json(
                    { error: 'Video file too large. Maximum size is 100MB' },
                    { status: 400 }
                );
            }

            // Process video file
            llmResponse = await processVideoFile(videoFile, promptType, customInstructions);
        }
        // Handle URL processing
        else if (url) {
            console.log('Processing URL:', url);
            // Validate URL format
            try {
                new URL(url);
            } catch {
                return NextResponse.json(
                    { error: 'Invalid URL format' },
                    { status: 400 }
                );
            }

            // Process URL with LLM
            console.log('Calling processURLWithLLM...');
            llmResponse = await processURLWithLLM(url, promptType, customInstructions, captionText, accountMentions, locationTags, hashtags);
            console.log('LLM response received:', llmResponse);
        }
        // Neither file nor URL provided
        else {
            return NextResponse.json(
                { error: 'Either image, video file, frames, or URL must be provided' },
                { status: 400 }
            );
        }

        // Parse the structured data
        const structuredData = parseStructuredVideoData(llmResponse.analysis);
        if (!structuredData) {
            return NextResponse.json(
                { error: 'Failed to parse structured data from LLM response' },
                { status: 500 }
            );
        }

        // Enhance place names with Google search validation
        console.log('Enhancing place names with search validation...');
        const { enhancedPlaces, filteredPlaces } = await enhancePlaceNamesWithSearch(
            structuredData.place_names,
            [...structuredData.tags, ...(structuredData.context_clues || [])]
        );

        // Update structured data with validated places
        const enhancedStructuredData = {
            ...structuredData,
            place_names: filteredPlaces,
            enhanced_places: enhancedPlaces,
            captionText: captionText || undefined
        };

        // Geocode the validated place names
        console.log('Geocoding place names...');
        const geocodedPlaces = [];
        for (const placeName of filteredPlaces) {
            try {
                const geocoded = await geocodeLocation(placeName);
                if (geocoded) {
                    geocodedPlaces.push({
                        name: placeName,
                        ...geocoded
                    });
                }
            } catch (error) {
                console.error(`Failed to geocode ${placeName}:`, error);
            }
        }

        // Restaurant Deduction: Use AI to determine the actual restaurant from all available data
        console.log('Performing restaurant deduction analysis...');
        let deducedRestaurant = null;
        let restaurantDetails = null;
        let uniqueRestaurantNames: string[] = [];
        let hasMultipleRestaurants = false;
        let placesToAnalyze: string[] = [];
        
        if (filteredPlaces.length > 0 || (structuredData.context_clues && structuredData.context_clues.length > 0)) {
            try {
                // Filter out landmarks and tourist attractions from place names
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
                const businessPlaces = filteredPlaces.filter(place => {
                    const lowerPlace = place.toLowerCase();
                    // Include if it contains business keywords
                    const hasBusinessKeyword = businessKeywords.some(keyword => lowerPlace.includes(keyword));
                    // Exclude if it contains landmark keywords
                    const hasLandmarkKeyword = landmarkKeywords.some(keyword => lowerPlace.includes(keyword));
                    
                    return hasBusinessKeyword && !hasLandmarkKeyword;
                });
                
                // If no business places found, use all places but prioritize business-like names
                placesToAnalyze = businessPlaces.length > 0 ? businessPlaces : filteredPlaces;
                
                // Check if we have multiple different restaurant names
                uniqueRestaurantNames = [...new Set(placesToAnalyze)];
                hasMultipleRestaurants = uniqueRestaurantNames.length > 1;
                
                console.log(`Found ${uniqueRestaurantNames.length} unique restaurant names: ${uniqueRestaurantNames.join(', ')}`);
                
                // Analyze enhanced places to determine if it's a chain
                let isChain = false;
                let chainLocations = [];
                
                if (enhancedStructuredData.enhanced_places && enhancedStructuredData.enhanced_places.length > 0) {
                    // Check if any place has multiple locations in search results
                    for (const place of enhancedStructuredData.enhanced_places) {
                        if (place.searchResults && place.searchResults.length > 1) {
                            // Check if the search results are for the same business name but different addresses
                            const businessNames = place.searchResults.map(result => result.name.toLowerCase());
                            const addresses = place.searchResults.map(result => result.formatted_address);
                            
                            // If we have multiple results with similar business names but different addresses, it's likely a chain
                            const uniqueAddresses = [...new Set(addresses)];
                            
                            // More sophisticated chain detection:
                            // 1. Check if all business names are very similar (same restaurant)
                            // 2. Check if addresses are in different cities/regions (indicating chain)
                            // 3. Check if the place IDs are different (different physical locations)
                            
                            const allNamesSimilar = businessNames.every(name => {
                                const baseName = businessNames[0];
                                const similarity = calculateStringSimilarity(name, baseName);
                                return similarity > 0.8; // 80% similarity threshold
                            });
                            
                            const differentCities = uniqueAddresses.length > 1;
                            const differentPlaceIds = place.searchResults.length > 1 && 
                                new Set(place.searchResults.map(r => r.place_id)).size > 1;
                            
                            // Only consider it a chain if:
                            // - Names are very similar (same restaurant)
                            // - Multiple different cities/regions
                            // - Different place IDs (different physical locations)
                            if (allNamesSimilar && differentCities && differentPlaceIds) {
                                isChain = true;
                                chainLocations = place.searchResults;
                                console.log(`Detected chain: ${place.originalName} with ${uniqueAddresses.length} locations`);
                                break;
                            } else if (uniqueAddresses.length > 1) {
                                console.log(`Found multiple locations for ${place.originalName}, but likely different restaurants with similar names`);
                            }
                        }
                    }
                }
                
                // If we have multiple different restaurant names, they're not a chain
                if (hasMultipleRestaurants) {
                    console.log(`Multiple different restaurants detected: ${uniqueRestaurantNames.join(', ')} - not a chain`);
                    isChain = false;
                }
                
                const deductionPrompt = `Based on the following information from a video analysis, determine the most likely restaurant or food establishment being featured:

Available Data:
- Place names identified: ${placesToAnalyze.join(', ') || 'None'}
- Context clues: ${structuredData.context_clues?.join(', ') || 'None'}
- Tags: ${structuredData.tags?.join(', ') || 'None'}
- Foods shown: ${structuredData.foods_shown?.join(', ') || 'None'}
- Caption text: ${captionText || 'None'}
- Location tags: ${locationTags || 'None'}
- Hashtags: ${hashtags || 'None'}
- Multiple restaurants detected: ${hasMultipleRestaurants ? 'YES' : 'NO'}
- Chain detection: ${isChain ? 'YES - Multiple locations found' : 'NO - Single location or multiple different restaurants'}

CRITICAL ANALYSIS RULES:
1. PRIORITIZE VISIBLE RESTAURANT NAMES from the video content over account mentions
2. Account mentions (@username) are often just user tags and may NOT be the restaurant name
3. Only use account mentions if they clearly match a restaurant name visible in the video
4. Location tags (📍 Address) show WHERE the restaurant is, not the restaurant name
5. Do NOT confuse street names or addresses with restaurant names
6. Look for specific business branding and names that are actually visible in the video content

MULTIPLE RESTAURANT HANDLING:
1. If multiple DIFFERENT restaurant names are found (e.g., "Trill Burgers", "Super Duper Burgers", "4505 BBQ"), they are NOT a chain
2. Each different restaurant name represents a separate establishment
3. Only consider it a chain if the SAME restaurant name appears in multiple locations
4. For multiple restaurants, focus on the one most prominently featured or mentioned
5. Look for the restaurant that appears most frequently or is most emphasized in the content

CHAIN DETECTION RULES:
1. If the restaurant name appears in multiple locations in Google Places search results, it's likely a chain
2. Common chain indicators: multiple addresses, same business name in different cities/areas
3. Single-location restaurants typically have only one address or location
4. When in doubt, if the business has multiple locations, mark as chain

Examples:
- If the video shows "Super Duper Burgers" signage but mentions "@trillburgers", the restaurant is "Super Duper Burgers"
- If caption says "SPARTAN TACOS" and location is "4848 San Felipe Rd", the restaurant is "Spartan Tacos" or "Cali Spartan"
- If caption mentions "@cali.spartan", the restaurant is likely "Cali Spartan"
- Do NOT deduce "San Felipe Mexican Restaurant" just because the address is on "San Felipe Rd"
- If "Cali Spartan" appears in multiple locations (4848 San Felipe Rd, 1008 Blossom Hill Rd, etc.), it's a chain
- If "Trill Burgers" and "Super Duper Burgers" are both mentioned, they are different restaurants, not a chain

Instructions:
1. Analyze all the data to identify the most likely restaurant name
2. Prioritize VISIBLE restaurant names from the video content over account mentions
3. Consider food types, location context, and any brand names mentioned
4. If multiple places are mentioned, determine which is the primary restaurant being featured
5. Focus ONLY on restaurants, cafes, and food establishments - NOT landmarks or tourist attractions
6. Determine if this is a chain restaurant or a single-location restaurant based on:
   - Multiple locations found in search results
   - Common chain names (McDonald's, Starbucks, Chipotle, etc.)
   - Business model indicators
7. Return a JSON object with the following structure:
   {
     "name": "Restaurant Name",
     "isChain": true/false,
     "chainName": "Chain Name (if applicable)",
     "location": "Specific location if single restaurant"
   }
8. If no clear restaurant can be determined, return {"name": "Unknown Restaurant", "isChain": false}

Restaurant Analysis:`;

                // Use the same LLM service to get the deduction
                const anthropic = new (await import('@anthropic-ai/sdk')).default({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                });
                
                const deductionResponse = await anthropic.messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 200,
                    system: "You are a restaurant identification expert. Return only valid JSON, nothing else.",
                    messages: [
                        {
                            role: "user",
                            content: deductionPrompt
                        }
                    ]
                });

                // Extract the restaurant information from the response
                const deductionText = deductionResponse.content[0].type === 'text' ? deductionResponse.content[0].text : '';
                
                try {
                    // Try to parse as JSON
                    const restaurantInfo = JSON.parse(deductionText);
                    deducedRestaurant = restaurantInfo.name;
                    
                    // Override the AI's chain detection with our analysis if we found multiple locations
                    const finalIsChain = isChain || restaurantInfo.isChain;
                    
                    // If it's a single-location restaurant, gather detailed information
                    if (restaurantInfo.name && restaurantInfo.name !== 'Unknown Restaurant' && !finalIsChain) {
                        console.log('Single-location restaurant detected, gathering details...');
                        
                        // Use Google Places API to get detailed information
                        try {
                            const searchQuery = restaurantInfo.location ? `${restaurantInfo.name} ${restaurantInfo.location}` : restaurantInfo.name;
                            const placeDetails = await getPlaceDetails(searchQuery);
                            
                            if (placeDetails) {
                                restaurantDetails = {
                                    name: restaurantInfo.name,
                                    isChain: false,
                                    address: placeDetails.formatted_address || null,
                                    website: placeDetails.website || null,
                                    hours: placeDetails.opening_hours?.weekday_text || null,
                                    phone: placeDetails.formatted_phone_number || null,
                                    rating: placeDetails.rating || null,
                                    placeId: placeDetails.place_id || null
                                };
                            } else {
                                restaurantDetails = {
                                    name: restaurantInfo.name,
                                    isChain: false,
                                    address: null,
                                    website: null,
                                    hours: null,
                                    phone: null,
                                    rating: null,
                                    placeId: null
                                };
                            }
                        } catch (detailsError) {
                            console.error('Error getting place details:', detailsError);
                            restaurantDetails = {
                                name: restaurantInfo.name,
                                isChain: false,
                                address: null,
                                website: null,
                                hours: null,
                                phone: null,
                                rating: null,
                                placeId: null
                            };
                        }
                    } else if (finalIsChain) {
                        // For chains, just provide basic info with null address details
                        restaurantDetails = {
                            name: restaurantInfo.name,
                            isChain: true,
                            chainName: restaurantInfo.chainName || restaurantInfo.name,
                            address: null,
                            website: null,
                            hours: null,
                            phone: null,
                            rating: null,
                            placeId: null
                        };
                    } else {
                        // For unknown restaurants, provide minimal info
                        restaurantDetails = {
                            name: restaurantInfo.name || 'Unknown Restaurant',
                            isChain: false,
                            address: null,
                            website: null,
                            hours: null,
                            phone: null,
                            rating: null,
                            placeId: null
                        };
                    }
                    
                } catch (parseError) {
                    console.error('Error parsing restaurant deduction JSON:', parseError);
                    // Fallback to simple name extraction
                    const lines = deductionText.split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('Restaurant Name:') && trimmed !== 'Unknown Restaurant') {
                            deducedRestaurant = trimmed;
                            break;
                        }
                    }
                }

                // If no clear restaurant found in the response, try to extract from place names
                if (!deducedRestaurant || deducedRestaurant === 'Unknown Restaurant') {
                    // Look for the most restaurant-like name in the filtered places
                    for (const place of placesToAnalyze) {
                        const lowerPlace = place.toLowerCase();
                        if (businessKeywords.some(keyword => lowerPlace.includes(keyword))) {
                            deducedRestaurant = place;
                            break;
                        }
                    }
                    
                    // If still no restaurant found, use the first business-like place name
                    if (!deducedRestaurant && placesToAnalyze.length > 0) {
                        deducedRestaurant = placesToAnalyze[0];
                    }
                }

                console.log('Restaurant deduction result:', deducedRestaurant);
                console.log('Restaurant details:', restaurantDetails);
            } catch (error) {
                console.error('Error during restaurant deduction:', error);
                // Fallback to first business-like place name
                if (filteredPlaces.length > 0) {
                    const businessKeywords = ['restaurant', 'cafe', 'bistro', 'diner', 'grill', 'kitchen', 'bar', 'pizza', 'taco', 'burger', 'sushi'];
                    const businessPlace = filteredPlaces.find(place => 
                        businessKeywords.some(keyword => place.toLowerCase().includes(keyword))
                    );
                    deducedRestaurant = businessPlace || filteredPlaces[0];
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Content processed successfully',
            provider: provider,
            promptType: promptType,
            source: frames && frames.length > 0 ? 'video_frames' : (imageFile ? 'image_file' : (videoFile ? 'video_file' : 'url')),
            url: url || null,
            frameCount: frames ? frames.length : null,
            llmResponse: llmResponse,
            structuredData: enhancedStructuredData,
            geocodedPlaces,
            deducedRestaurant,
            restaurantDetails,
            allDetectedRestaurants: uniqueRestaurantNames || placesToAnalyze,
            hasMultipleRestaurants: hasMultipleRestaurants || false,
            processingInfo: {
                frameCount: frames ? frames.length : 0,
                originalPlaceCount: structuredData.place_names.length,
                validatedPlaceCount: filteredPlaces.length,
                geocodedPlaceCount: geocodedPlaces.length
            }
        });

    } catch (error) {
        console.error('Error processing content:', error);
        return NextResponse.json(
            { error: 'Failed to process content' },
            { status: 500 }
        );
    }
}

// Optional: GET method to check API status and show available options
export async function GET() {
    return NextResponse.json({
        status: 'Video and image content processing API is running',
        endpoints: {
            POST: '/api/process-video - Provide video file or URL for analysis'
        },
        parameters: {
            video: 'Video file to analyze (required if URL not provided)',
            url: 'URL to any public image (required if video not provided)',
            frames: 'Frames to analyze (optional, multiple frames separated by commas)',
            promptType: 'Type of analysis: general, security, educational, sports, structured, custom (optional, default: general)',
            customInstructions: 'Custom instructions for analysis (optional, used with promptType: custom)',
            provider: 'LLM provider: anthropic (optional, default: anthropic)'
        },
        availablePrompts: [
            'general - General content analysis',
            'security - Security/surveillance focused analysis',
            'educational - Educational content analysis',
            'sports - Sports/activity analysis',
            'structured - Structured data extraction (JSON format)',
            'custom - Custom analysis with specific instructions'
        ],
        supportedSources: [
            'Video files (MP4, MOV, AVI - max 100MB)',
            'Public image URLs (Unsplash, Pexels, direct image links)'
        ],
        notes: [
            'Video file processing is currently limited - use image URLs for best results',
            'Either video file or URL must be provided, not both'
        ]
    });
}

async function combineFrameAnalyses(frameAnalyses: any[]): Promise<any> {
    // For now, return the first frame's analysis
    // In the future, we could implement more sophisticated combination logic
    return frameAnalyses[0];
} 