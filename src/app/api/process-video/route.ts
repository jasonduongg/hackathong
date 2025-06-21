import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { processVideoWithLLM } from '@/lib/llm-services';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('video') as File;
        const promptType = formData.get('promptType') as string || 'general';
        const customInstructions = formData.get('customInstructions') as string;
        const provider = formData.get('provider') as string || 'openai';

        // Validate file exists
        if (!file) {
            return NextResponse.json(
                { error: 'No video file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('video/')) {
            return NextResponse.json(
                { error: 'File must be a video' },
                { status: 400 }
            );
        }

        // Validate file size (e.g., 100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size too large. Maximum size is 100MB' },
                { status: 400 }
            );
        }

        // Validate provider
        const validProviders = ['openai', 'anthropic', 'gemini'];
        if (!validProviders.includes(provider)) {
            return NextResponse.json(
                { error: 'Invalid provider. Must be one of: openai, anthropic, gemini' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const filepath = join(uploadsDir, filename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Process video with LLM
        const llmResponse = await processVideoWithLLM(
            filepath,
            file.name,
            provider as 'openai' | 'anthropic' | 'gemini',
            promptType,
            customInstructions
        );

        return NextResponse.json({
            success: true,
            message: 'Video processed successfully',
            filename: filename,
            provider: provider,
            promptType: promptType,
            llmResponse: llmResponse
        });

    } catch (error) {
        console.error('Error processing video:', error);
        return NextResponse.json(
            { error: 'Failed to process video' },
            { status: 500 }
        );
    }
}

// Optional: GET method to check API status and show available options
export async function GET() {
    return NextResponse.json({
        status: 'Video processing API is running',
        endpoints: {
            POST: '/api/process-video - Upload and process video with LLM'
        },
        parameters: {
            video: 'Video file (required)',
            promptType: 'Type of analysis: general, security, educational, sports, custom (optional, default: general)',
            customInstructions: 'Custom instructions for analysis (optional, used with promptType: custom)',
            provider: 'LLM provider: openai, anthropic, gemini (optional, default: openai)'
        },
        availablePrompts: [
            'general - General video analysis',
            'security - Security/surveillance focused analysis',
            'educational - Educational content analysis',
            'sports - Sports/activity analysis',
            'custom - Custom analysis with specific instructions'
        ]
    });
} 