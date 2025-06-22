import { NextRequest, NextResponse } from 'next/server';
import { processURLWithLLM, processVideoFile, processVideoFrames, processImageFile, processMultipleImages } from '@/lib/llm-services';
import { getLocationData, getBestLocation, geocodeLocation, enhancePlaceNamesWithSearch, getPlaceDetails } from '@/lib/location-services';
import { parseStructuredVideoData } from '@/lib/prompts';

// Configure runtime for this API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 5 minutes timeout

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

// Function to check if a restaurant is a chain
async function checkIfChainRestaurant(restaurantName: string): Promise<boolean> {
    const chainRestaurants = [
        'mcdonalds', 'mcdonald\'s', 'mcdonald',
        'starbucks', 'starbuck',
        'chipotle', 'chipotle mexican grill',
        'subway', 'subway restaurants',
        'kfc', 'kentucky fried chicken',
        'pizza hut', 'pizzahut',
        'dominos', 'domino\'s', 'domino\'s pizza',
        'burger king', 'burgerking',
        'wendys', 'wendy\'s',
        'taco bell', 'tacobell',
        'shake shack', 'shakeshack',
        'five guys', 'fiveguys',
        'in-n-out', 'in n out burger',
        'chick-fil-a', 'chick fil a',
        'popeyes', 'popeyes louisiana kitchen',
        'dunkin', 'dunkin donuts',
        'panera', 'panera bread',
        'olive garden', 'olivegarden',
        'applebees', 'applebee\'s',
        'red lobster', 'redlobster',
        'outback', 'outback steakhouse',
        'chilis', 'chili\'s', 'chili\'s grill & bar',
        'buffalo wild wings', 'buffalo wild wings grill & bar',
        'tgi fridays', 'tgi friday\'s',
        'red robin', 'redrobin',
        'cheesecake factory', 'cheesecakefactory',
        'p.f. chang\'s', 'pf changs',
        'california pizza kitchen', 'cpk',
        'buca di beppo', 'bucadibeppo',
        'carrabba\'s', 'carrabbas',
        'bonefish grill', 'bonefishgrill',
        'flemings', 'flemings steakhouse',
        'longhorn steakhouse', 'longhorn',
        'texas roadhouse', 'texasroadhouse',
        'logan\'s roadhouse', 'logans roadhouse',
        'golden corral', 'goldencorral',
        'cracker barrel', 'crackerbarrel',
        'ihop', 'international house of pancakes',
        'denny\'s', 'dennys',
        'waffle house', 'wafflehouse',
        'perkins', 'perkins restaurant & bakery',
        'bob evans', 'bobevans',
        'cracker barrel', 'crackerbarrel',
        'olive garden', 'olivegarden',
        'red lobster', 'redlobster',
        'longhorn steakhouse', 'longhorn',
        'outback steakhouse', 'outback',
        'bonefish grill', 'bonefishgrill',
        'carrabba\'s italian grill', 'carrabbas',
        'flemings prime steakhouse & wine bar', 'flemings',
        'buca di beppo', 'bucadibeppo',
        'seasons 52', 'seasons52',
        'bahama breeze', 'bahamabreeze',
        'eddie v\'s prime seafood', 'eddie vs',
        'capital grille', 'capitalgrille',
        'ruth\'s chris steak house', 'ruths chris',
        'morton\'s the steakhouse', 'mortons',
        'fogo de chao', 'fogo de chão',
        'texas de brazil', 'texas de brazil churrascaria',
        'brazilian steakhouse', 'brazilian steak house',
        'churrascaria', 'churrascaria brazilian steakhouse',
        'zachary\'s pizza', 'zacharys pizza', 'zachary\'s chicago pizza'
    ];

    const normalizedName = restaurantName.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    return chainRestaurants.some(chain => {
        const normalizedChain = chain.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        return normalizedName.includes(normalizedChain) || normalizedChain.includes(normalizedName);
    });
}

// Optimized restaurant deduction with early exit
async function performOptimizedRestaurantDeduction(
    filteredPlaces: string[],
    structuredData: any,
    captionText?: string,
    accountMentions?: string,
    locationTags?: string,
    hashtags?: string,
    partyId?: string
): Promise<{ deducedRestaurant: string | null; restaurantDetails: any; uniqueRestaurantNames: string[]; hasMultipleRestaurants: boolean }> {

    // Early exit if no places found
    if (filteredPlaces.length === 0) {
        return {
            deducedRestaurant: null,
            restaurantDetails: null,
            uniqueRestaurantNames: [],
            hasMultipleRestaurants: false
        };
    }

    // Quick business name filtering
    const businessKeywords = [
        'restaurant', 'cafe', 'bistro', 'diner', 'grill', 'kitchen', 'bar', 'pizza', 'taco',
        'burger', 'sushi', 'coffee', 'bakery', 'deli', 'food', 'eat', 'dining', 'shack',
        'mcdonalds', 'starbucks', 'chipotle', 'subway', 'kfc', 'pizza hut', 'dominos',
        'burger king', 'wendys', 'taco bell', 'shake shack', 'five guys', 'in-n-out'
    ];

    // Filter out generic descriptions and keep only actual business names
    const actualBusinessPlaces = filteredPlaces.filter(place => {
        const lowerPlace = place.toLowerCase();

        // Reject generic descriptions
        if (lowerPlace.includes('restaurant referenced by') ||
            lowerPlace.includes('restaurant mentioned') ||
            lowerPlace.includes('food establishment') ||
            lowerPlace.includes('restaurant') && !businessKeywords.some(keyword => lowerPlace.includes(keyword))) {
            return false;
        }

        // Keep if it contains business keywords or looks like an actual name
        return businessKeywords.some(keyword => lowerPlace.includes(keyword)) ||
            (place.length > 2 && place.length < 50 && !place.includes(' '));
    });

    // If no actual business names found, try to extract from account mentions
    let placesToAnalyze = actualBusinessPlaces;
    if (actualBusinessPlaces.length === 0 && accountMentions) {
        const mentions = accountMentions.split(',').map(m => m.trim());
        const businessMentions = mentions.filter(mention => {
            const cleanMention = mention.replace('@', '').toLowerCase();
            // Look for mentions that could be business names
            return cleanMention.length > 3 &&
                (businessKeywords.some(keyword => cleanMention.includes(keyword)) ||
                    cleanMention.includes('cali') ||
                    cleanMention.includes('spartan') ||
                    cleanMention.includes('burger') ||
                    cleanMention.includes('taco') ||
                    cleanMention.includes('pizza'));
        });

        if (businessMentions.length > 0) {
            placesToAnalyze = businessMentions.map(m => m.replace('@', ''));
        }
    }

    // If still no places, use the original filtered places but clean them up
    if (placesToAnalyze.length === 0) {
        placesToAnalyze = filteredPlaces.map(place => {
            // Clean up generic descriptions
            if (place.includes('referenced by @')) {
                const mention = place.match(/@([a-zA-Z0-9._]+)/);
                return mention ? mention[1] : place;
            }
            return place;
        }).filter(place => place.length > 2 && place.length < 50);
    }

    const uniqueRestaurantNames = [...new Set(placesToAnalyze)];
    const hasMultipleRestaurants = uniqueRestaurantNames.length > 1;
    if (uniqueRestaurantNames.length === 1) {
        const restaurantName = uniqueRestaurantNames[0];

        // Get detailed restaurant information
        const placeDetails = await getPlaceDetails(restaurantName);

        // Check if this is a chain restaurant
        const isChain = await checkIfChainRestaurant(restaurantName);

        let finalRestaurantDetails: any = {
            name: restaurantName,
            isChain: isChain,
            chainName: isChain ? restaurantName : null,
            address: placeDetails?.formatted_address || null,
            website: placeDetails?.website || null,
            hours: placeDetails?.opening_hours?.weekday_text || null,
            phone: placeDetails?.formatted_phone_number || null,
            rating: placeDetails?.rating || null,
            placeId: placeDetails?.place_id || null,
            image: placeDetails?.photoUrl || null
        };

        // If it's a chain and we have partyId, find the closest location
        if (isChain && partyId) {
            try {
                console.log(`Chain detected: ${restaurantName}, searching for closest location...`);

                const chainLocationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search-restaurant`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        partyId,
                        restaurantName: restaurantName
                    })
                });

                console.log(`Search request sent for: ${restaurantName}`);

                if (chainLocationResponse.ok) {
                    const chainLocationData = await chainLocationResponse.json();
                    if (chainLocationData.success && chainLocationData.data.allLocations.length > 0) {
                        // Get the closest location
                        const closestLocation = chainLocationData.data.allLocations[0];
                        console.log(`Found closest location: ${closestLocation.name} at ${closestLocation.address}`);
                        finalRestaurantDetails = {
                            name: closestLocation.name,
                            isChain: true,
                            chainName: restaurantName,
                            address: closestLocation.address,
                            website: closestLocation.website,
                            hours: closestLocation.hours,
                            phone: closestLocation.phone,
                            rating: closestLocation.rating,
                            placeId: closestLocation.placeId,
                            image: closestLocation.image,
                            distanceFromParty: closestLocation.distance,
                            googleMapsUrl: closestLocation.googleMapsUrl
                        };
                    }
                }
            } catch (error) {
                console.error('Error finding chain location:', error);
                // Keep the original details if chain location finding fails
            }
        }

        return {
            deducedRestaurant: restaurantName,
            restaurantDetails: finalRestaurantDetails,
            uniqueRestaurantNames,
            hasMultipleRestaurants: false
        };
    }
    if (hasMultipleRestaurants) {
        const primaryRestaurant = placesToAnalyze[0];

        // Get detailed restaurant information
        const placeDetails = await getPlaceDetails(primaryRestaurant);

        return {
            deducedRestaurant: primaryRestaurant,
            restaurantDetails: {
                name: primaryRestaurant,
                isChain: false,
                address: placeDetails?.formatted_address || null,
                website: placeDetails?.website || null,
                hours: placeDetails?.opening_hours?.weekday_text || null,
                phone: placeDetails?.formatted_phone_number || null,
                rating: placeDetails?.rating || null,
                placeId: placeDetails?.place_id || null,
                image: placeDetails?.photoUrl || null
            },
            uniqueRestaurantNames,
            hasMultipleRestaurants: true
        };
    }

    // Fallback to first place name or null
    const fallbackRestaurant = placesToAnalyze[0];
    if (fallbackRestaurant) {
        const placeDetails = await getPlaceDetails(fallbackRestaurant);

        return {
            deducedRestaurant: fallbackRestaurant,
            restaurantDetails: {
                name: fallbackRestaurant,
                isChain: false,
                address: placeDetails?.formatted_address || null,
                website: placeDetails?.website || null,
                hours: placeDetails?.opening_hours?.weekday_text || null,
                phone: placeDetails?.formatted_phone_number || null,
                rating: placeDetails?.rating || null,
                placeId: placeDetails?.place_id || null,
                image: placeDetails?.photoUrl || null
            },
            uniqueRestaurantNames,
            hasMultipleRestaurants: false
        };
    }

    return {
        deducedRestaurant: null,
        restaurantDetails: null,
        uniqueRestaurantNames,
        hasMultipleRestaurants: false
    };
}

export async function POST(request: NextRequest) {
    try {
        // VALIDATION: Check request size before processing
        const contentLength = request.headers.get('content-length');
        if (contentLength) {
            const sizeInMB = parseInt(contentLength) / (1024 * 1024);
            const MAX_REQUEST_SIZE = 50; // 50MB limit
            if (sizeInMB > MAX_REQUEST_SIZE) {
                return NextResponse.json(
                    { error: `Request too large: ${sizeInMB.toFixed(1)}MB (max ${MAX_REQUEST_SIZE}MB)` },
                    { status: 413 }
                );
            }
            console.log(`Request size: ${sizeInMB.toFixed(1)}MB`);
        }

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

        // Validate provider (only anthropic supported now)
        if (provider !== 'anthropic') {
            return NextResponse.json(
                { error: 'Only Anthropic provider is supported' },
                { status: 400 }
            );
        }

        let llmResponse;

        // Handle multiple images (Instagram screenshots) - OPTIMIZED
        if (images && images.length > 0) {
            console.log(`Processing ${images.length} images with prompt type: ${promptType}`);

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

            console.log('Enhanced context prepared, calling processMultipleImages...');

            // Process all images together
            llmResponse = await processMultipleImages(images, promptType, enhancedContext);
            console.log('processMultipleImages completed successfully');
        }
        // Handle video frames processing
        else if (frames && frames.length > 0) {
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
            llmResponse = await processURLWithLLM(url, promptType, customInstructions, captionText, accountMentions, locationTags, hashtags);
        }
        // Neither file nor URL provided
        else {
            return NextResponse.json(
                { error: 'Either image, video file, frames, or URL must be provided' },
                { status: 400 }
            );
        }

        // Parse the structured data
        console.log('Parsing structured data from LLM response...');
        const structuredData = parseStructuredVideoData(llmResponse.analysis);
        if (!structuredData) {
            console.error('Failed to parse structured data. LLM response:', llmResponse);
            return NextResponse.json(
                { error: 'Failed to parse structured data from LLM response' },
                { status: 500 }
            );
        }
        console.log('Structured data parsed successfully:', structuredData);

        // OPTIMIZED: Only enhance place names if we have them and they're not empty
        let enhancedPlaces: any[] = [];
        let filteredPlaces: string[] = [];

        if (structuredData.place_names && structuredData.place_names.length > 0) {
            const enhancementResult = await enhancePlaceNamesWithSearch(
                structuredData.place_names,
                [...structuredData.tags, ...(structuredData.context_clues || [])]
            );
            enhancedPlaces = enhancementResult.enhancedPlaces;
            filteredPlaces = enhancementResult.filteredPlaces;
        } else {
            filteredPlaces = [];
        }

        // Update structured data with validated places
        const enhancedStructuredData = {
            ...structuredData,
            place_names: filteredPlaces,
            enhanced_places: enhancedPlaces,
            captionText: captionText || undefined
        };

        // OPTIMIZED: Parallel geocoding for better performance
        const geocodingPromises = filteredPlaces.map(async (placeName) => {
            try {
                const geocoded = await geocodeLocation(placeName);
                if (geocoded) {
                    return {
                        name: placeName,
                        ...geocoded
                    };
                }
                return null;
            } catch (error) {
                console.error(`Failed to geocode ${placeName}:`, error);
                return null;
            }
        });

        const geocodedPlaces = (await Promise.all(geocodingPromises)).filter(Boolean);

        // Get partyId from form data if available
        const partyId = formData.get('partyId') as string;

        // OPTIMIZED: Simplified restaurant deduction with chain location finding
        const { deducedRestaurant, restaurantDetails, uniqueRestaurantNames, hasMultipleRestaurants } =
            await performOptimizedRestaurantDeduction(
                filteredPlaces,
                structuredData,
                captionText,
                accountMentions,
                locationTags,
                hashtags,
                partyId
            );

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
            allDetectedRestaurants: uniqueRestaurantNames || filteredPlaces,
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

        // Provide more detailed error information
        let errorMessage = 'Failed to process content';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString()
            },
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
            provider: 'LLM provider: anthropic (optional, default: anthropic)',
            partyId: 'Party ID for chain location finding (optional)'
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
            'Either video file or URL must be provided, not both',
            'Chain restaurants will automatically find the closest location to party members'
        ]
    });
}

async function combineFrameAnalyses(frameAnalyses: any[]): Promise<any> {
    // For now, return the first frame's analysis
    // In the future, we could implement more sophisticated combination logic
    return frameAnalyses[0];
}