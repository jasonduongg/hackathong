import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideoPrompt, DEFAULT_VIDEO_PROMPT } from './prompts';

// OpenAI GPT-4V Integration
export async function processVideoWithOpenAI(
    filepath: string,
    filename: string,
    promptType: string = 'general',
    customInstructions?: string
) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        // Read the video file as base64
        const fs = require('fs');
        const videoBuffer = fs.readFileSync(filepath);
        const base64Video = videoBuffer.toString('base64');

        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions);

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please analyze this video according to the system instructions provided."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:video/mp4;base64,${base64Video}`,
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
        });

        return {
            provider: 'OpenAI GPT-4V',
            promptType: promptType,
            analysis: response.choices[0].message.content,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error('Failed to process video with OpenAI');
    }
}

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

// Google Gemini Integration
export async function processVideoWithGemini(
    filepath: string,
    filename: string,
    promptType: string = 'general',
    customInstructions?: string
) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

    try {
        // Read the video file
        const fs = require('fs');
        const videoBuffer = fs.readFileSync(filepath);

        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // Get the appropriate system prompt
        const systemPrompt = getVideoPrompt(promptType as any, customInstructions);
        const prompt = `${systemPrompt}\n\nPlease analyze this video according to the instructions above.`;

        const result = await model.generateContent([prompt, videoBuffer]);
        const response = await result.response;
        const text = response.text();

        return {
            provider: 'Google Gemini',
            promptType: promptType,
            analysis: text,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Google Gemini API error:', error);
        throw new Error('Failed to process video with Google Gemini');
    }
}

// Generic LLM processor that can use any of the above services
export async function processVideoWithLLM(
    filepath: string,
    filename: string,
    provider: 'openai' | 'anthropic' | 'gemini' = 'openai',
    promptType: string = 'general',
    customInstructions?: string
) {
    switch (provider) {
        case 'openai':
            return await processVideoWithOpenAI(filepath, filename, promptType, customInstructions);
        case 'anthropic':
            return await processVideoWithAnthropic(filepath, filename, promptType, customInstructions);
        case 'gemini':
            return await processVideoWithGemini(filepath, filename, promptType, customInstructions);
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
} 