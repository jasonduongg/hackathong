import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export interface S3UploadResult {
    key: string;
    url: string;
    bucket: string;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
    file: Buffer,
    fileName: string,
    partyId: string,
    contentType: string
): Promise<S3UploadResult> {
    const timestamp = Date.now();
    const key = `receipts/${partyId}/${timestamp}_${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
            'party-id': partyId,
            'uploaded-at': timestamp.toString(),
        },
    });

    await s3Client.send(command);

    // Generate a signed URL for immediate access
    const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hour

    return {
        key,
        url: signedUrl,
        bucket: BUCKET_NAME,
    };
}

/**
 * Generate a signed URL for an existing S3 object
 */
export async function getSignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Get the public URL for an S3 object (if bucket is public)
 */
export function getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
} 