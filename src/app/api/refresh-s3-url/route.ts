import { NextRequest, NextResponse } from 'next/server';
import { getSignedDownloadUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
    try {
        const { s3Key } = await request.json();

        if (!s3Key) {
            return NextResponse.json(
                { error: 'S3 key is required' },
                { status: 400 }
            );
        }

        // Generate a new signed URL
        const downloadURL = await getSignedDownloadUrl(s3Key);

        return NextResponse.json({
            success: true,
            downloadURL
        });

    } catch (error) {
        console.error('Error refreshing S3 URL:', error);
        return NextResponse.json(
            { error: 'Failed to refresh URL' },
            { status: 500 }
        );
    }
} 