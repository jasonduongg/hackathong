import { NextRequest, NextResponse } from 'next/server';
import { processURLWithLLM, processVideoFile, processVideoFrames, processImageFile, processMultipleImages } from '@/lib/llm-services';
import { getLocationData, getBestLocation, geocodeLocation, enhancePlaceNamesWithSearch } from '@/lib/location-services';
import { parseStructuredVideoData } from '@/lib/prompts';

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