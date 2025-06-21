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

// Process Multiple Images (Instagram Screenshots)
export async function processMultipleImages(
    images: File[],
    promptType: string = 'general',
    enhancedContext?: string
) {
    console.log(`Processing ${images.length} images with enhanced context`);
    
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any) as string;
        
        // Check if we have too many images (Anthropic has size limits)
        const maxImagesPerRequest = 5; // Conservative limit to avoid size issues
        
        if (images.length <= maxImagesPerRequest) {
            // Process all images in one request
            return await processImageBatch(anthropic, images, systemPrompt, enhancedContext);
        } else {
            // Process images in batches and combine results
            console.log(`Too many images (${images.length}), processing in batches of ${maxImagesPerRequest}`);
            
            const batches = [];
            for (let i = 0; i < images.length; i += maxImagesPerRequest) {
                batches.push(images.slice(i, i + maxImagesPerRequest));
            }
            
            console.log(`Processing ${batches.length} batches`);
            
            const batchResults = [];
            for (let i = 0; i < batches.length; i++) {
                console.log(`Processing batch ${i + 1}/${batches.length}`);
                const batchResult = await processImageBatch(anthropic, batches[i], systemPrompt, enhancedContext);
                batchResults.push(batchResult);
            }
            
            // Combine results from all batches
            return combineBatchResults(batchResults, images.length);
        }
    } catch (error) {
        console.error('Anthropic API error for multiple images:', error);
        throw new Error('Failed to process multiple images with Anthropic');
    }
}

// Process a single batch of images
async function processImageBatch(
    anthropic: Anthropic,
    images: File[],
    systemPrompt: string,
    enhancedContext?: string
) {
    // Convert all images to base64
    const imageContents = [];
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = image.type || 'image/png';
        
        // Ensure mimeType is a valid type for Anthropic API
        const validMimeType = mimeType === 'image/jpeg' ? 'image/jpeg' :
                             mimeType === 'image/png' ? 'image/png' :
                             mimeType === 'image/gif' ? 'image/gif' :
                             mimeType === 'image/webp' ? 'image/webp' : 'image/png';
        
        imageContents.push({
            type: "image",
            source: {
                type: "base64" as const,
                media_type: validMimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
                data: base64
            }
        });
        
        console.log(`Converted image ${i + 1}/${images.length} to base64 (${buffer.length} bytes)`);
    }

    // Create enhanced user message
    const userMessage = [
        {
            type: "text" as const,
            text: `Please analyze these ${images.length} screenshots from an Instagram video together to provide a comprehensive understanding of the content. Consider the progression and changes across all screenshots.

${enhancedContext || ''}

Analyze all screenshots as a cohesive video sequence and provide detailed insights about:
- Places, locations, and landmarks visible across the video
- Activities and actions taking place
- Foods, drinks, or consumables shown
- Overall context and narrative of the video
- Any notable changes or progression throughout the video

Please provide your analysis in the structured JSON format as specified in the system prompt.`
        },
        ...imageContents.map(img => ({
            type: "image" as const,
            source: img.source
        }))
    ];

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: userMessage
            }
        ]
    });

    return {
        provider: 'Anthropic Claude',
        promptType: 'structured',
        analysis: response.content[0].type === 'text' ? response.content[0].text : '',
        timestamp: new Date().toISOString(),
        source: 'instagram_screenshots',
        imageCount: images.length
    };
}

// Combine results from multiple batches
function combineBatchResults(batchResults: any[], totalImageCount: number) {
    console.log(`Combining results from ${batchResults.length} batches`);
    
    // Parse each batch result
    const parsedResults = batchResults.map(result => {
        try {
            const jsonMatch = result.analysis.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error parsing batch result:', error);
        }
        return null;
    }).filter(Boolean);
    
    if (parsedResults.length === 0) {
        // Fallback: return the first batch result
        return batchResults[0];
    }
    
    // Combine the results intelligently
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
    
    // Combine arrays (remove duplicates)
    const allPlaceNames = new Set<string>();
    const allFoods = new Set<string>();
    const allTags = new Set<string>();
    const allContextClues = new Set<string>();
    
    parsedResults.forEach(result => {
        if (result.place_names) {
            result.place_names.forEach((place: string) => allPlaceNames.add(place));
        }
        if (result.foods_shown) {
            result.foods_shown.forEach((food: string) => allFoods.add(food));
        }
        if (result.tags) {
            result.tags.forEach((tag: string) => allTags.add(tag));
        }
        if (result.context_clues) {
            result.context_clues.forEach((clue: string) => allContextClues.add(clue));
        }
    });
    
    combined.place_names = Array.from(allPlaceNames);
    combined.foods_shown = Array.from(allFoods);
    combined.tags = Array.from(allTags);
    combined.context_clues = Array.from(allContextClues);
    
    // For activity_type, use the most common one or default to 'other'
    const activityTypes = parsedResults.map(r => r.activity_type).filter(Boolean);
    if (activityTypes.length > 0) {
        const activityCounts: { [key: string]: number } = {};
        activityTypes.forEach(type => {
            activityCounts[type] = (activityCounts[type] || 0) + 1;
        });
        const mostCommon = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
        combined.activity_type = mostCommon ? mostCommon[0] : 'other';
    }
    
    // For multiple_locations, if any batch says true, then true
    combined.multiple_locations = parsedResults.some(r => r.multiple_locations === true);
    
    // Convert back to string format for the API response
    const combinedAnalysis = JSON.stringify(combined, null, 2);
    
    return {
        provider: 'Anthropic Claude',
        promptType: 'structured',
        analysis: combinedAnalysis,
        timestamp: new Date().toISOString(),
        source: 'instagram_screenshots_combined',
        imageCount: totalImageCount,
        batchCount: batchResults.length
    };
} 