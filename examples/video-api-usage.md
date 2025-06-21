# Content Processing API Usage Examples

## API Endpoint
`POST /api/process-video`

## Basic Usage

### 1. Video File Analysis (Default)
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 2. Instagram Post Analysis
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

### 3. YouTube Video Analysis
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

### 4. Security-Focused Analysis
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'security');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 5. Educational Content Analysis
```javascript
const formData = new FormData();
formData.append('url', 'https://www.youtube.com/watch?v=educational-video');
formData.append('promptType', 'educational');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 6. Sports/Activity Analysis
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'sports');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 7. Structured Data Extraction
```javascript
const formData = new FormData();
formData.append('url', 'https://www.instagram.com/p/food-post/');
formData.append('promptType', 'structured');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});

// Response will contain structured JSON data:
// {
//   "location_address": "123 Main St, New York, NY 10001",
//   "multiple_locations": false,
//   "place_name": "Central Park",
//   "activity_type": "social",
//   "foods_shown": ["pizza", "coffee", "sandwich"],
//   "tags": ["outdoor", "daytime", "crowded", "urban"]
// }
```

### 8. Custom Analysis with Specific Instructions
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'custom');
formData.append('customInstructions', 'Focus specifically on identifying any safety hazards, equipment malfunctions, or procedural violations in this manufacturing video.');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

## Available Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video` | File | No* | Video file to analyze (required if URL not provided) |
| `url` | String | No* | URL to Instagram post or YouTube video (required if video not provided) |
| `promptType` | String | No | Type of analysis: `general`, `security`, `educational`, `sports`, `structured`, `custom` |
| `customInstructions` | String | No | Custom instructions (used with `promptType: custom`) |
| `provider` | String | No | LLM provider: `anthropic` (default) |

*Either `video` or `url` must be provided.

## Response Format

```json
{
    "success": true,
    "message": "Content processed successfully",
    "provider": "anthropic",
    "promptType": "structured",
    "source": "url",
    "url": "https://www.instagram.com/p/ABC123/",
    "llmResponse": {
        "provider": "Anthropic Claude",
        "promptType": "structured",
        "analysis": "{\"location_address\":\"123 Main St\",\"multiple_locations\":false,\"place_name\":\"Central Park\",\"activity_type\":\"social\",\"foods_shown\":[\"pizza\",\"coffee\"],\"tags\":[\"outdoor\",\"daytime\"]}",
        "timestamp": "2023-12-21T10:30:45.123Z",
        "source": "instagram"
    }
}
```

## System Prompts

### General Analysis
Analyzes content for key events, people, objects, locations, timeline, and overall context.

### Security Analysis
Focuses on suspicious activities, people entering/exiting, unusual movements, security concerns, and timestamps.

### Educational Analysis
Evaluates learning objectives, teaching methods, student engagement, content quality, and accessibility.

### Sports Analysis
Analyzes performance, technique, key moments, player movements, game flow, and strategy.

### Structured Analysis
Extracts specific data in JSON format:
- **location_address**: Full address if visible, null if not found
- **multiple_locations**: Boolean indicating if content shows multiple locations
- **place_name**: Name of the place/venue
- **activity_type**: Categorized activity (cooking, dining, social, work, exercise, entertainment, travel, other)
- **foods_shown**: Array of foods visible in the content
- **tags**: Array of descriptive tags

### Custom Analysis
Allows you to specify your own analysis requirements and focus areas.

## Supported Sources

- **Video Files**: MP4, MOV, AVI, and other video formats
- **Instagram Posts**: Direct URLs to Instagram posts
- **YouTube Videos**: Direct URLs to YouTube videos

## Environment Variables Required

Make sure to set this environment variable:

```env
# For Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Error Handling

The API returns appropriate error messages for:
- Missing video file or URL
- Invalid file type (non-video)
- File too large (>100MB)
- Invalid URL format
- Unsupported URL type (non-Instagram/YouTube)
- LLM processing errors 