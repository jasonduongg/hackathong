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

// Optimized restaurant deduction with early exit
async function performOptimizedRestaurantDeduction(
    filteredPlaces: string[], 
    structuredData: any, 
    captionText?: string, 
    accountMentions?: string, 
    locationTags?: string, 
    hashtags?: string
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
    
    // If only one restaurant found, skip complex AI analysis
    if (uniqueRestaurantNames.length === 1) {
        const restaurantName = uniqueRestaurantNames[0];
        return {
            deducedRestaurant: restaurantName,
            restaurantDetails: {
                name: restaurantName,
                isChain: false,
                address: null,
                website: null,
                hours: null,
                phone: null,
                rating: null,
                placeId: null
            },
            uniqueRestaurantNames,
            hasMultipleRestaurants: false
        };
    }
    
    // For multiple restaurants, use simplified logic instead of full AI analysis
    if (hasMultipleRestaurants) {
        // Use the first business-like place name as primary
        const primaryRestaurant = placesToAnalyze[0];
        return {
            deducedRestaurant: primaryRestaurant,
            restaurantDetails: {
                name: primaryRestaurant,
                isChain: false,
                address: null,
                website: null,
                hours: null,
                phone: null,
                rating: null,
                placeId: null
            },
            uniqueRestaurantNames,
            hasMultipleRestaurants: true
        };
    }
    
    // Fallback to first place name or null
    return {
        deducedRestaurant: placesToAnalyze[0] || null,
        restaurantDetails: placesToAnalyze[0] ? {
            name: placesToAnalyze[0],
            isChain: false,
            address: null,
            website: null,
            hours: null,
            phone: null,
            rating: null,
            placeId: null
        } : null,
        uniqueRestaurantNames,
        hasMultipleRestaurants: false
    };
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

        // Handle multiple images (Instagram screenshots) - OPTIMIZED
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

        // OPTIMIZED: Only enhance place names if we have them and they're not empty
        let enhancedPlaces: any[] = [];
        let filteredPlaces: string[] = [];
        
        if (structuredData.place_names && structuredData.place_names.length > 0) {
            console.log('Enhancing place names with search validation...');
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
        console.log('Geocoding place names...');
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

        // OPTIMIZED: Simplified restaurant deduction
        console.log('Performing optimized restaurant deduction...');
        const { deducedRestaurant, restaurantDetails, uniqueRestaurantNames, hasMultipleRestaurants } = 
            await performOptimizedRestaurantDeduction(
                filteredPlaces, 
                structuredData, 
                captionText, 
                accountMentions, 
                locationTags, 
                hashtags
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