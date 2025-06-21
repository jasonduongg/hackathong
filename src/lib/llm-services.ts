import Anthropic from '@anthropic-ai/sdk';
import { getVideoPrompt, DEFAULT_VIDEO_PROMPT } from './prompts';

// Anthropic Claude Integration
export async function processVideoWithAnthropic(
    filepath: string,
    filename: string,
    promptType: string = 'general',
    customInstructions?: string
) {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        // Read the video file as base64
        const fs = require('fs');
        const videoBuffer = fs.readFileSync(filepath);
        const base64Video = videoBuffer.toString('base64');

        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions);

        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this video according to the system instructions provided."
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "video/mp4",
                                data: base64Video
                            }
                        }
                    ]
                }
            ]
        });

        return {
            provider: 'Anthropic Claude',
            promptType: promptType,
            analysis: response.content[0].text,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error('Failed to process video with Anthropic');
    }
}

// Generic LLM processor that can use any of the above services
export async function processVideoWithLLM(
    filepath: string,
    filename: string,
    provider: 'anthropic' = 'anthropic',
    promptType: string = 'general',
    customInstructions?: string
) {
    switch (provider) {
        case 'anthropic':
            return await processVideoWithAnthropic(filepath, filename, promptType, customInstructions);
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
} 