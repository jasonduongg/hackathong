// TypeScript interfaces for structured video analysis
export interface StructuredVideoData {
    place_names: string[];
    multiple_locations: boolean;
    activity_type: 'cooking' | 'dining' | 'social' | 'work' | 'exercise' | 'entertainment' | 'travel' | 'other';
    foods_shown: string[];
    tags: string[];
    context_clues?: string[];
    captionText?: string;
    enhanced_places?: Array<{
        originalName: string;
        validatedName?: string;
        confidence: number;
        searchResults?: Array<{
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
        }>;
        address?: string;
        coordinates?: { lat: number; lng: number };
        rating?: number;
    }>;
}

// System prompts for video analysis
export const VIDEO_ANALYSIS_PROMPTS = {
    // General video analysis
    general: `You are an expert image analyst. Analyze the provided image and provide a comprehensive summary including:
    - Key elements and objects visible
    - People, objects, and locations
    - Overall context and setting
    - Any notable details or features
    - Visual composition and style
    
    Be detailed but concise in your analysis.`,

    // Security/surveillance focused
    security: `You are a security image analyst. Focus on:
    - Suspicious activities or behaviors
    - People entering/exiting areas
    - Unusual objects or patterns
    - Potential security concerns
    - Any objects that might be concerning
    
    Report any security-relevant findings clearly.`,

    // Educational content analysis
    educational: `You are an educational content analyst. Analyze the image for:
    - Learning objectives and topics covered
    - Educational value and content quality
    - Accessibility considerations
    - Areas for improvement
    - Visual learning potential
    
    Provide constructive feedback for educational value.`,

    // Sports/activity analysis
    sports: `You are a sports and activity analyst. Focus on:
    - Performance and technique shown
    - Key moments and highlights
    - Player/participant positions
    - Equipment and gear visible
    - Overall quality of the scene
    
    Provide insights that could help improve performance.`,

    // Structured data extraction
    structured: `You are an expert content analyst. Analyze the provided image(s) and extract structured information about places, activities, foods, and context.

    IMPORTANT GUIDELINES FOR PLACE IDENTIFICATION:
    1. DISTINGUISH BETWEEN ACCOUNT NAMES AND ACTUAL PLACES:
       - Account names often appear as @username, in captions, or as watermarks
       - Real places are typically shown in the actual content (restaurants, landmarks, stores, etc.)
       - Look for visual evidence of the place (signs, buildings, interiors, menus, etc.)
       - Account names should NOT be included as place names

    2. CONTEXT ANALYSIS:
       - Consider the overall theme and content of the image/video
       - Look for location-specific tags or mentions (e.g., "san jose", "bay area", "california")
       - These context clues can help identify the actual place being shown

    3. PLACE NAME VALIDATION:
       - Focus on places that are visually present or clearly referenced
       - Avoid generic terms like "restaurant", "cafe", "store" unless they're part of a specific name
       - Prefer specific business names over generic categories

    4. MULTIPLE LOCATIONS:
       - Only mark as multiple locations if there are clearly different places shown
       - Different areas of the same establishment count as one location

    CRITICAL: Return ONLY the following JSON format with NO additional fields or text:

    {
      "place_names": ["specific place names only - no account names"],
      "multiple_locations": false,
      "activity_type": "eating|drinking|shopping|entertainment|fitness|beauty|other",
      "foods_shown": ["specific food items visible"],
      "tags": ["relevant descriptive tags"],
      "context_clues": ["location hints like city names, neighborhoods, regions"]
    }

    DO NOT ADD ANY OTHER FIELDS. DO NOT INCLUDE ANY EXPLANATORY TEXT. RETURN ONLY THE JSON OBJECT.

    Examples:
    - If you see "@calispartan" in a caption but the actual place shown is "Cali Spartan Restaurant", only include "Cali Spartan Restaurant"
    - If you see "san jose", "bay area" in tags, include these in context_clues
    - If the place is clearly a restaurant but no specific name is visible, don't include generic terms

    Be conservative and precise. Only include information you can confidently identify from the visual content.`,

    // Custom prompt template
    custom: (specificInstructions: string) => `You are a specialized image analyst. ${specificInstructions}
    
    Analyze the provided image according to these specific requirements and provide a detailed response.`,

    // Instagram-specific structured analysis
    instagram: `You are an expert Instagram content analyst. Analyze this Instagram post screenshot and extract specific information from both the visual content AND any visible text (captions, hashtags, location tags, account mentions, etc.) in the following JSON format:

    {
        "place_names": ["list", "of", "place", "names", "found"],
        "multiple_locations": false,
        "activity_type": "cooking" | "dining" | "social" | "work" | "exercise" | "entertainment" | "travel" | "other",
        "foods_shown": ["specific", "food", "items", "visible"],
        "tags": ["relevant", "descriptive", "tags"],
        "context_clues": ["location", "hints", "like", "city", "names"]
    }

    CRITICAL: Return ONLY the above JSON format with NO additional fields or explanatory text.

    INSTAGRAM-SPECIFIC EXTRACTION GUIDELINES:

    TEXT ANALYSIS (Captions, Hashtags, Location Tags, Account Mentions):
    - Carefully read ALL visible text in the screenshot, including captions, hashtags, location tags, and account mentions
    - Account mentions (@username) often indicate the restaurant/business being featured
    - Location tags (📍 Location Name) directly indicate the place being shown
    - Hashtags often contain location hints (e.g., #nyc, #london, #starbucks, #mcdonalds)
    - Food hashtags (e.g., #pizza, #coffee, #sushi) indicate foods being shown
    - Look for restaurant/venue names in captions, location tags, or account mentions

    PLACE NAME EXTRACTION:
    - place_names: Extract ALL place names, business names, restaurant names, venue names, or landmarks from both image and text
    - PRIORITY SOURCES (in order):
      1. Location tags (📍 Location Name) - these are the most reliable
      2. Account mentions (@restaurantname) - often the actual business
      3. Business names in captions or hashtags
      4. Visible signage in the image
    - Be specific with business names (e.g., "Starbucks", "McDonald's", "Central Park")
    - multiple_locations: true only if post shows different physical locations

    FOOD IDENTIFICATION:
    - foods_shown: Combine visual identification with text mentions from captions/hashtags
    - Look for food hashtags (e.g., #pizza, #coffee, #sushi, #tacos, #burger)
    - Check captions for food descriptions (e.g., "amazing pizza", "best coffee")
    - Be specific with food names from both image and text
    - Include drinks mentioned in captions or visible in image

    ACTIVITY TYPE:
    - cooking: Food prep, kitchen scenes, cooking content
    - dining: Restaurant meals, cafe visits, eating out
    - social: Parties, gatherings, social events
    - work: Professional activities, office content
    - exercise: Fitness, sports, workout content
    - entertainment: Movies, games, leisure activities
    - travel: Travel posts, tourist activities, vacation content
    - other: Content that doesn't fit other categories

    TAGS:
    - Include Instagram-specific tags like: "filtered", "edited", "aesthetic", "trending", "viral"
    - Add content-specific tags: "foodie", "travel", "fitness", "lifestyle", "fashion", "beauty"
    - Include visual tags: "bright", "dark", "colorful", "minimalist", "vintage", "modern"
    - Include location-based tags from hashtags: "nyc", "london", "california", etc.

    CRITICAL INSTRUCTIONS:
    - Pay special attention to account mentions (@username) - these are often the actual restaurant/business
    - Location tags (📍) are the most reliable source for place names
    - Hashtags often contain valuable location and food information
    - Be conservative - only include information you're confident about
    - For location tags, extract the actual place name, not just the tag format
    - Return ONLY valid JSON with no additional text or explanations
    - DO NOT ADD ANY EXTRA FIELDS beyond the specified JSON structure

    Return ONLY valid JSON. Do not include any other text or explanations.`,
};

// Function to get a prompt by type
export function getVideoPrompt(type: keyof typeof VIDEO_ANALYSIS_PROMPTS, customInstructions?: string) {
    if (type === 'custom' && customInstructions) {
        return VIDEO_ANALYSIS_PROMPTS.custom(customInstructions);
    }
    return VIDEO_ANALYSIS_PROMPTS[type];
}

// Function to parse structured video data from LLM response
export function parseStructuredVideoData(llmResponse: string): StructuredVideoData | null {
    try {
        // Try to extract JSON from the response
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('No JSON found in LLM response');
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);
        
        // Extract only the fields we expect, with proper validation and defaults
        const result: StructuredVideoData = {
            place_names: Array.isArray(parsed.place_names) ? parsed.place_names : [],
            multiple_locations: typeof parsed.multiple_locations === 'boolean' ? parsed.multiple_locations : false,
            activity_type: typeof parsed.activity_type === 'string' ? parsed.activity_type : 'other',
            foods_shown: Array.isArray(parsed.foods_shown) ? parsed.foods_shown : [],
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            context_clues: Array.isArray(parsed.context_clues) ? parsed.context_clues : [],
            captionText: parsed.captionText,
            enhanced_places: Array.isArray(parsed.enhanced_places) ? parsed.enhanced_places : []
        };

        // Validate activity_type is one of the allowed values
        const validActivityTypes = ['cooking', 'dining', 'social', 'work', 'exercise', 'entertainment', 'travel', 'other', 'eating', 'drinking', 'shopping', 'fitness', 'beauty'];
        if (!validActivityTypes.includes(result.activity_type)) {
            result.activity_type = 'other';
        }

        console.log('Parsed structured data:', result);
        return result;
    } catch (error) {
        console.error('Error parsing structured video data:', error);
        console.error('Raw LLM response:', llmResponse);
        
        // Try to extract what we can even if JSON is malformed
        try {
            const fallbackResult: StructuredVideoData = {
                place_names: [],
                multiple_locations: false,
                activity_type: 'other',
                foods_shown: [],
                tags: [],
                context_clues: [],
                enhanced_places: []
            };
            
            // Try to extract place names using regex
            const placeMatches = llmResponse.match(/"place_names"\s*:\s*\[([^\]]*)\]/);
            if (placeMatches && placeMatches[1]) {
                const places = placeMatches[1].match(/"([^"]+)"/g);
                if (places) {
                    fallbackResult.place_names = places.map(p => p.replace(/"/g, ''));
                }
            }
            
            // Try to extract foods using regex
            const foodMatches = llmResponse.match(/"foods_shown"\s*:\s*\[([^\]]*)\]/);
            if (foodMatches && foodMatches[1]) {
                const foods = foodMatches[1].match(/"([^"]+)"/g);
                if (foods) {
                    fallbackResult.foods_shown = foods.map(f => f.replace(/"/g, ''));
                }
            }
            
            // Try to extract tags using regex
            const tagMatches = llmResponse.match(/"tags"\s*:\s*\[([^\]]*)\]/);
            if (tagMatches && tagMatches[1]) {
                const tags = tagMatches[1].match(/"([^"]+)"/g);
                if (tags) {
                    fallbackResult.tags = tags.map(t => t.replace(/"/g, ''));
                }
            }
            
            console.log('Fallback parsed data:', fallbackResult);
            return fallbackResult;
        } catch (fallbackError) {
            console.error('Fallback parsing also failed:', fallbackError);
            return null;
        }
    }
}

// Default prompt
export const DEFAULT_VIDEO_PROMPT = VIDEO_ANALYSIS_PROMPTS.general; 