# Structured Content Analysis Implementation

## Overview

I've successfully implemented a structured content analysis feature that extracts specific data fields from videos, Instagram posts, and YouTube videos in a consistent JSON format. The system now only uses Anthropic Claude for analysis and supports both file uploads and URL processing.

## What Was Implemented

### 1. New Structured Analysis Prompt

Added a new `structured` prompt type in `src/lib/prompts.ts` that extracts:

- **Location Address**: Full address if visible, `null` if not found
- **Multiple Locations**: Boolean indicating if content shows multiple locations/scenes
- **Place Name**: Name of the place/venue (e.g., "Central Park", "Starbucks")
- **Activity Type**: Categorized activity (cooking, dining, social, work, exercise, entertainment, travel, other)
- **Foods Shown**: Array of foods visible in the content
- **Tags**: Array of descriptive tags (indoor, outdoor, daytime, etc.)

### 2. TypeScript Interface

Created `StructuredVideoData` interface for type safety:

```typescript
export interface StructuredVideoData {
    location_address: string | null;
    multiple_locations: boolean;
    place_name: string | null;
    activity_type: 'cooking' | 'dining' | 'social' | 'work' | 'exercise' | 'entertainment' | 'travel' | 'other';
    foods_shown: string[];
    tags: string[];
}
```

### 3. JSON Parsing Function

Added `parseStructuredVideoData()` function that:
- Extracts JSON from LLM response
- Validates data structure
- Returns typed data or null if parsing fails

### 4. Anthropic-Only Integration

Removed OpenAI and Google Gemini integrations, keeping only Anthropic Claude:
- Updated all API endpoints to use Anthropic only
- Simplified provider selection
- Added URL processing capabilities

### 5. URL Processing Support

Added support for processing Instagram posts and YouTube videos:
- `processInstagramPost()` - Processes Instagram post URLs
- `processYouTubeVideo()` - Processes YouTube video URLs
- `processURLWithLLM()` - Generic URL processor with automatic detection

### 6. API Updates

Updated the video processing API to support:
- Video file uploads (existing functionality)
- Instagram post URLs
- YouTube video URLs
- Only Anthropic provider

### 7. Enhanced Test Interface

Updated the test page at `/structured-video-test` to support:
- Video file uploads
- Instagram/YouTube URL input
- Toggle between file and URL modes
- Real-time URL validation

## Usage Examples

### Video File Analysis

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'structured');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### Instagram Post Analysis

```javascript
const formData = new FormData();
formData.append('url', 'https://www.instagram.com/p/ABC123/');
formData.append('promptType', 'structured');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### YouTube Video Analysis

```javascript
const formData = new FormData();
formData.append('url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
formData.append('promptType', 'structured');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### Expected Response Format

```json
{
    "location_address": "123 Main St, New York, NY 10001",
    "multiple_locations": false,
    "place_name": "Central Park",
    "activity_type": "social",
    "foods_shown": ["pizza", "coffee", "sandwich"],
    "tags": ["outdoor", "daytime", "crowded", "urban"]
}
```

## Activity Type Categories

The system categorizes activities into these types:
- **cooking**: Food preparation, cooking activities
- **dining**: Eating, restaurant activities
- **social**: Social gatherings, parties, conversations
- **work**: Work-related activities, office settings
- **exercise**: Sports, fitness, physical activities
- **entertainment**: Movies, games, performances
- **travel**: Travel-related activities, transportation
- **other**: Activities that don't fit other categories

## Supported Sources

- **Video Files**: MP4, MOV, AVI, and other video formats
- **Instagram Posts**: Direct URLs to Instagram posts
- **YouTube Videos**: Direct URLs to YouTube videos

## Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/structured-video-test
   ```

3. **Choose input type**:
   - Upload a video file, or
   - Enter an Instagram or YouTube URL

4. **View the structured analysis results**

## Files Modified

- `src/lib/llm-services.ts` - Removed OpenAI/Gemini, added URL processing
- `src/lib/prompts.ts` - Added structured prompt and parsing functions
- `src/app/api/process-video/route.ts` - Updated for URL support and Anthropic-only
- `examples/video-api-usage.md` - Updated documentation with URL examples
- `src/app/structured-video-test/page.tsx` - Enhanced with URL support

## Environment Variables Required

```env
# For Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Benefits

1. **Consistent Data Structure**: All content returns data in the same format
2. **Type Safety**: TypeScript interfaces ensure data consistency
3. **Easy Integration**: JSON format makes it easy to integrate with databases
4. **Multiple Sources**: Support for files, Instagram, and YouTube
5. **Simplified Architecture**: Single provider (Anthropic) reduces complexity
6. **Error Handling**: Robust parsing with fallback for malformed responses

## Next Steps

You can now:
1. Test the structured analysis with video files, Instagram posts, and YouTube videos
2. Integrate the extracted data into your application
3. Modify the activity types or add new fields as needed
4. Use the parsed data for filtering, searching, or categorization
5. Extend URL support to other platforms if needed

The implementation is ready to use and will extract the specific data fields you requested from multiple content sources using only Anthropic Claude. 