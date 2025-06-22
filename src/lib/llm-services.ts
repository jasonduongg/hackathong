import Anthropic from '@anthropic-ai/sdk';
import { getVideoPrompt, DEFAULT_VIDEO_PROMPT, parseStructuredVideoData } from './prompts';
import axios from 'axios';

// Function to download image and convert to base64
async function downloadImageAsBase64(url: string): Promise<string> {
    try {
        console.log('Downloading image from URL:', url);
        
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
            },
            timeout: 10000 // 10 second timeout
        });
        
        const buffer = Buffer.from(response.data, 'binary');
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        
        // Validate that it's actually an image
        if (!mimeType.startsWith('image/')) {
            throw new Error(`URL does not point to an image. Content-Type: ${mimeType}`);
        }
        
        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            throw new Error(`Image too large: ${Math.round(buffer.length / 1024 / 1024)}MB (max 10MB)`);
        }
        
        const base64 = buffer.toString('base64');
        
        console.log('Image downloaded successfully, size:', buffer.length, 'bytes, type:', mimeType);
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Failed to download image:', error);
        throw new Error(`Failed to download image from URL: ${error}`);
    }
}

// Instagram Post Processing (Images)
export async function processInstagramPost(
    url: string,
    promptType: string = 'general',
    customInstructions?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions) as string;

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this Instagram post according to the system instructions provided."
                        },
                        {
                            type: "image",
                            source: {
                                type: "url",
                                url: url
                            }
                        }
                    ]
                }
            ]
        });

        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: response.content[0].type === 'text' ? response.content[0].text : '',
            timestamp: new Date().toISOString(),
            source: 'instagram'
        };
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process Instagram post with Anthropic');
    }
}

// YouTube Video Processing (Thumbnails)
export async function processYouTubeVideo(
    url: string,
    promptType: string = 'general',
    customInstructions?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions) as string;

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this YouTube video thumbnail according to the system instructions provided."
                        },
                        {
                            type: "image",
                            source: {
                                type: "url",
                                url: url
                            }
                        }
                    ]
                }
            ]
        });

        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: response.content[0].type === 'text' ? response.content[0].text : '',
            timestamp: new Date().toISOString(),
            source: 'youtube'
        };
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process YouTube video with Anthropic');
    }
}

// Generic Image Processing
export async function processImageURL(
    url: string,
    promptType: string = 'general',
    customInstructions?: string,
    captionText?: string,
    accountMentions?: string,
    locationTags?: string,
    hashtags?: string
) {
    console.log('processImageURL called with:', { 
        url, 
        promptType, 
        customInstructions, 
        hasCaptionText: !!captionText,
        hasAccountMentions: !!accountMentions,
        hasLocationTags: !!locationTags,
        hasHashtags: !!hashtags
    });
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Download the image and convert to base64
        console.log('Downloading image for analysis...');
        const base64Image = await downloadImageAsBase64(url);
        
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions) as string;
        console.log('System prompt type:', promptType);
        console.log('System prompt length:', systemPrompt.length);

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: (() => {
                                let contextText = "Please analyze this image according to the system instructions provided.";
                                
                                if (captionText) {
                                    contextText += `\n\nCaption: "${captionText}"`;
                                }
                                
                                if (accountMentions) {
                                    contextText += `\n\nAccount Mentions: ${accountMentions}`;
                                }
                                
                                if (locationTags) {
                                    contextText += `\n\nLocation Tags: ${locationTags}`;
                                }
                                
                                if (hashtags) {
                                    contextText += `\n\nHashtags: ${hashtags}`;
                                }
                                
                                return contextText;
                            })()
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: base64Image.includes('image/jpeg') ? "image/jpeg" : 
                                           base64Image.includes('image/png') ? "image/png" : 
                                           base64Image.includes('image/gif') ? "image/gif" : 
                                           base64Image.includes('image/webp') ? "image/webp" : "image/jpeg",
                                data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
                            }
                        }
                    ]
                }
            ]
        });

        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: response.content[0].type === 'text' ? response.content[0].text : '',
            timestamp: new Date().toISOString(),
            source: 'image_url',
            captionText: captionText,
            accountMentions: accountMentions,
            locationTags: locationTags,
            hashtags: hashtags
        };
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process image with Anthropic');
    }
}

// Generic URL processor for images
export async function processURLWithLLM(
    url: string,
    promptType: string = 'general',
    customInstructions?: string,
    captionText?: string,
    accountMentions?: string,
    locationTags?: string,
    hashtags?: string
) {
    console.log('processURLWithLLM called with:', {
        url,
        promptType,
        customInstructions,
        hasCaptionText: !!captionText,
        hasAccountMentions: !!accountMentions,
        hasLocationTags: !!locationTags,
        hasHashtags: !!hashtags
    });
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);
    
    // Process any image URL with caption context
    return await processImageURL(url, promptType, customInstructions, captionText, accountMentions, locationTags, hashtags);
}

// Video file processing
export async function processVideoFile(
    videoFile: File,
    promptType: string = 'general',
    customInstructions?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions) as string;

        // Note: Current Anthropic API doesn't support video content directly
        // This is a placeholder implementation
        // In production, you would need to:
        // 1. Use a video processing service to extract frames
        // 2. Use a different API that supports video
        // 3. Process the video file on the client side and send frames
        
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Video file analysis is not yet supported in this version. File details: ${videoFile.name}, Size: ${videoFile.size} bytes, Type: ${videoFile.type}. Please use image URLs or implement video frame extraction for full video analysis.`
                        }
                    ]
                }
            ]
        });

        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: response.content[0].type === 'text' ? response.content[0].text : '',
            timestamp: new Date().toISOString(),
            source: 'video_file',
            fileName: videoFile.name,
            fileSize: videoFile.size,
            fileType: videoFile.type,
            note: 'Video processing requires frame extraction - not yet implemented'
        };
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process video file with Anthropic');
    }
}

// Process multiple video frames
export async function processVideoFrames(
    frames: string[],
    promptType: string = 'general',
    customInstructions?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        console.log(`Processing ${frames.length} video frames with prompt type: ${promptType}`);
        
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions) as string;

        // Process each frame and combine results
        const frameAnalyses = await Promise.all(
            frames.map(async (frame, index) => {
                console.log(`Processing frame ${index + 1}/${frames.length}`);
                
                try {
                    const response = await anthropic.messages.create({
                        model: "claude-3-5-sonnet-20241022",
                        max_tokens: 1000,
                        system: systemPrompt,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: `Please analyze this video frame (frame ${index + 1} of ${frames.length}) according to the system instructions provided.`
                                    },
                                    {
                                        type: "image",
                                        source: {
                                            type: "base64",
                                            media_type: "image/jpeg",
                                            data: frame
                                        }
                                    }
                                ]
                            }
                        ]
                    });

                    console.log(`Frame ${index + 1} processed successfully`);
                    
                    return {
                        frameIndex: index,
                        analysis: response.content[0].type === 'text' ? response.content[0].text : ''
                    };
                } catch (frameError) {
                    console.error(`Error processing frame ${index + 1}:`, frameError);
                    return {
                        frameIndex: index,
                        analysis: `Error processing frame ${index + 1}: ${frameError instanceof Error ? frameError.message : 'Unknown error'}`
                    };
                }
            })
        );

        console.log('All frames processed, combining results');

        // For structured analysis, we need to combine the structured data properly
        if (promptType === 'structured') {
            // Parse structured data from each frame
            const structuredDataArray = frameAnalyses.map(fa => {
                try {
                    return parseStructuredVideoData(fa.analysis);
                } catch (error) {
                    console.error(`Failed to parse structured data from frame ${fa.frameIndex + 1}:`, error);
                    return null;
                }
            }).filter(data => data !== null);

            if (structuredDataArray.length === 0) {
                throw new Error('No valid structured data could be parsed from any frame');
            }

            // Combine structured data from all frames
            const combined: {
                place_names: string[];
                multiple_locations: boolean;
                activity_type: string;
                foods_shown: string[];
                tags: string[];
                context_clues: string[];
            } = {
                place_names: [],
                multiple_locations: false,
                activity_type: 'other',
                foods_shown: [],
                tags: [],
                context_clues: []
            };

            // Collect all unique values
            const allFoods = new Set<string>();
            const allTags = new Set<string>();
            const allPlaceNames = new Set<string>();
            const allContextClues = new Set<string>();
            const activityTypes = new Map<string, number>();

            structuredDataArray.forEach((data, index) => {
                if (data) {
                    // Collect foods
                    data.foods_shown.forEach((food: string) => allFoods.add(food));
                    
                    // Collect tags
                    data.tags.forEach((tag: string) => allTags.add(tag));
                    
                    // Collect place names
                    if (data.place_names) {
                        data.place_names.forEach((place: string) => allPlaceNames.add(place));
                    }
                    
                    // Collect context clues
                    if (data.context_clues) {
                        data.context_clues.forEach((clue: string) => allContextClues.add(clue));
                    }
                    
                    // Count activity types
                    const currentCount = activityTypes.get(data.activity_type) || 0;
                    activityTypes.set(data.activity_type, currentCount + 1);
                }
            });

            // Set the most common activity type
            let mostCommonActivity = 'other';
            let maxCount = 0;
            activityTypes.forEach((count, activity) => {
                if (count > maxCount) {
                    maxCount = count;
                    mostCommonActivity = activity;
                }
            });

            // Set multiple locations if we have different locations
            const hasMultipleLocations = allPlaceNames.size > 1;

            combined.foods_shown = Array.from(allFoods);
            combined.tags = Array.from(allTags);
            combined.place_names = Array.from(allPlaceNames);
            combined.context_clues = Array.from(allContextClues);
            combined.activity_type = mostCommonActivity;
            combined.multiple_locations = hasMultipleLocations;

            // Convert back to JSON string for consistency
            const combinedAnalysis = JSON.stringify(combined, null, 2);

            return {
                provider: 'Anthropic Claude',
                promptType: promptType,
                analysis: combinedAnalysis,
                timestamp: new Date().toISOString(),
                source: 'video_frames',
                frameCount: frames.length,
                frameAnalyses: frameAnalyses
            };
        } else {
            // For non-structured analysis, combine text responses
            const combinedAnalysis = frameAnalyses.map(fa => 
                `Frame ${fa.frameIndex + 1}: ${fa.analysis}`
            ).join('\n\n');

            return {
                provider: 'Anthropic Claude',
                promptType: promptType,
                analysis: combinedAnalysis,
                timestamp: new Date().toISOString(),
                source: 'video_frames',
                frameCount: frames.length,
                frameAnalyses: frameAnalyses
            };
        }
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process video frames with Anthropic');
    }
}

// Process direct image file upload
export async function processImageFile(
    imageFile: File,
    promptType: string = 'general',
    customInstructions?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions) as string;

        // Convert file to base64
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // Only allow supported image types
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
        type SupportedType = typeof supportedTypes[number];
        const mediaType: SupportedType = supportedTypes.includes(imageFile.type as SupportedType)
            ? (imageFile.type as SupportedType)
            : 'image/png';

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this image according to the system instructions provided."
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType,
                                data: base64
                            }
                        }
                    ]
                }
            ]
        });

        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: response.content[0].type === 'text' ? response.content[0].text : '',
            timestamp: new Date().toISOString(),
            source: 'image_file',
            fileName: imageFile.name,
            fileSize: imageFile.size,
            fileType: imageFile.type
        };
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process image with Anthropic');
    }
}

// Process Multiple Images (Instagram Screenshots) - OPTIMIZED
export async function processMultipleImages(images: File[], promptType: string, enhancedContext?: string): Promise<any> {
    console.log(`Processing ${images.length} images with enhanced context`);
    
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // OPTIMIZED: Use larger batch size and process fewer batches
        const batchSize = Math.min(20, images.length); // Use maximum batch size possible
        const batches = [];
        
        for (let i = 0; i < images.length; i += batchSize) {
            batches.push(images.slice(i, i + batchSize));
        }
        
        console.log(`Processing ${images.length} images in ${batches.length} batch(es) of ${batchSize}`);
        
        // OPTIMIZED: Process all batches in parallel if possible, otherwise sequentially
        let results;
        if (batches.length === 1) {
            // Single batch - process directly
            results = [await processImageBatchOptimized(anthropic, batches[0], promptType, enhancedContext || '')];
        } else {
            // Multiple batches - process sequentially to avoid rate limits
            results = [];
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`Processing batch ${i + 1}/${batches.length}`);
                
                try {
                    const result = await processImageBatchOptimized(anthropic, batch, promptType, enhancedContext || '');
                    results.push(result);
                } catch (error) {
                    console.error(`Failed to process batch ${i + 1}:`, error);
                    throw error;
                }
            }
        }
        
        // OPTIMIZED: Combine results more efficiently
        const combinedAnalysis = results.map(result => 
            result.content[0].type === 'text' ? result.content[0].text : ''
        ).join('\n\n---\n\n');
        
        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: combinedAnalysis,
            timestamp: new Date().toISOString(),
            source: 'instagram_screenshots',
            imageCount: images.length,
            batchCount: batches.length
        };
        
    } catch (error) {
        console.error('Anthropic API error for multiple images:', error);
        throw new Error('Failed to process multiple images with Anthropic');
    }
}

// OPTIMIZED: Streamlined batch processing
async function processImageBatchOptimized(anthropic: Anthropic, images: File[], promptType: string, context: string): Promise<any> {
    console.log(`Processing batch of ${images.length} images`);
    
    // OPTIMIZED: Convert images to base64 more efficiently
    const base64Images = await Promise.all(images.map(async (image, index) => {
        const arrayBuffer = await image.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = image.type;
        
        // Ensure mimeType is a valid type for Anthropic API
        const validMimeType = mimeType === 'image/jpeg' ? 'image/jpeg' :
                             mimeType === 'image/png' ? 'image/png' :
                             mimeType === 'image/gif' ? 'image/gif' :
                             mimeType === 'image/webp' ? 'image/webp' : 'image/png';
        
        console.log(`Converted image ${index + 1}/${images.length} to base64 (${base64.length} bytes)`);
        
        return {
            type: "image" as const,
            source: {
                type: "base64" as const,
                media_type: validMimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
                data: base64
            }
        };
    }));

    // OPTIMIZED: Simplified system prompt for faster processing
    const systemPrompt = `You are an expert content analyzer. Analyze the provided images and extract structured information about restaurants, food, and locations.

${context}

CRITICAL: You MUST return your response in valid JSON format only. No other text.

IMPORTANT RULES FOR RESTAURANT NAMES:
1. Extract ONLY actual business names, brand names, or restaurant names that are visible or mentioned
2. DO NOT create generic descriptions like "Mexican restaurant" or "restaurant referenced by @username"
3. Look for specific business names like "Cali Spartan", "Super Duper Burgers", "McDonald's", etc.
4. If you see @username mentions, only include them if they clearly represent a business name
5. If no specific restaurant name is found, use "Unknown Restaurant" or leave the array empty
6. Focus on names that appear on signage, menus, receipts, or are clearly mentioned as business names

Return a JSON object with this exact structure:
{
  "place_names": ["ACTUAL_BUSINESS_NAME_1", "ACTUAL_BUSINESS_NAME_2"],
  "multiple_locations": true/false,
  "activity_type": "restaurant_review" or "food_showcase" or "food_tour" or "other",
  "foods_shown": ["list", "of", "food", "items"],
  "tags": ["relevant", "tags", "and", "keywords"],
  "context_clues": ["additional", "context", "information"]
}

Focus on identifying:
- ACTUAL restaurant names and brands (not generic descriptions)
- Food items and dishes shown
- Location information for each place
- Business details and distinguishing features

Examples of GOOD place_names:
- ["Cali Spartan", "Super Duper Burgers"]
- ["McDonald's", "Starbucks"]
- ["Unknown Restaurant"] (if no name found)

Examples of BAD place_names:
- ["Mexican restaurant referenced by @cali.spartan"]
- ["restaurant mentioned in caption"]
- ["food establishment"]

Return ONLY the JSON object, nothing else.`;

    const messages = [
        {
            role: "user" as const,
            content: [
                {
                    type: "text" as const,
                    text: `Analyze these ${images.length} images from a video. Look for restaurant names, food items, locations, and any relevant business information. Return ONLY a valid JSON object.`
                },
                ...base64Images
            ]
        }
    ];

    // OPTIMIZED: Simplified retry logic
    let retryCount = 0;
    const maxRetries = 1; // Reduced retries for faster processing
    
    while (retryCount <= maxRetries) {
        try {
            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000, // Reduced for faster response
                system: systemPrompt,
                messages: messages
            });

            console.log(`Successfully processed batch of ${images.length} images`);
            return response;
            
        } catch (error: any) {
            console.error(`Error processing batch:`, error.message);
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying batch (attempt ${retryCount}/${maxRetries + 1})...`);
                // OPTIMIZED: Shorter delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            throw error;
        }
    }
    
    throw new Error(`Failed to process batch after ${maxRetries + 1} attempts`);
}

// Helper function to delay execution
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to parse retry-after header
function parseRetryAfter(retryAfter: string): number {
    const seconds = parseInt(retryAfter);
    if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
    }
    return 60000; // Default to 60 seconds if parsing fails
} 