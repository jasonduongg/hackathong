# Video Processing API Usage Examples

## API Endpoint
`POST /api/process-video`

## Basic Usage

### 1. General Video Analysis (Default)
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('provider', 'openai'); // or 'anthropic', 'gemini'

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 2. Security-Focused Analysis
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'security');
formData.append('provider', 'openai');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 3. Educational Content Analysis
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'educational');
formData.append('provider', 'anthropic');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 4. Sports/Activity Analysis
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'sports');
formData.append('provider', 'gemini');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

### 5. Custom Analysis with Specific Instructions
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('promptType', 'custom');
formData.append('customInstructions', 'Focus specifically on identifying any safety hazards, equipment malfunctions, or procedural violations in this manufacturing video.');
formData.append('provider', 'openai');

const response = await fetch('/api/process-video', {
    method: 'POST',
    body: formData
});
```

## Available Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video` | File | Yes | Video file to analyze |
| `promptType` | String | No | Type of analysis: `general`, `security`, `educational`, `sports`, `custom` |
| `customInstructions` | String | No | Custom instructions (used with `promptType: custom`) |
| `provider` | String | No | LLM provider: `openai`, `anthropic`, `gemini` |

## Response Format

```json
{
    "success": true,
    "message": "Video processed successfully",
    "filename": "1703123456789-video.mp4",
    "provider": "openai",
    "promptType": "security",
    "llmResponse": {
        "provider": "OpenAI GPT-4V",
        "promptType": "security",
        "analysis": "Detailed analysis of the video...",
        "timestamp": "2023-12-21T10:30:45.123Z"
    }
}
```

## System Prompts

### General Analysis
Analyzes videos for key events, people, objects, locations, timeline, and overall context.

### Security Analysis
Focuses on suspicious activities, people entering/exiting, unusual movements, security concerns, and timestamps.

### Educational Analysis
Evaluates learning objectives, teaching methods, student engagement, content quality, and accessibility.

### Sports Analysis
Analyzes performance, technique, key moments, player movements, game flow, and strategy.

### Custom Analysis
Allows you to specify your own analysis requirements and focus areas.

## Environment Variables Required

Make sure to set these environment variables:

```env
# For OpenAI
OPENAI_API_KEY=your_openai_api_key

# For Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# For Google Gemini
GOOGLE_API_KEY=your_google_api_key
```

## Error Handling

The API returns appropriate error messages for:
- Missing video file
- Invalid file type (non-video)
- File too large (>100MB)
- Invalid provider
- LLM processing errors 