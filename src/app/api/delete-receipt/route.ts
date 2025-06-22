import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
    region: 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    endpoint: 'https://s3.us-east-2.amazonaws.com',
});

export async function DELETE(request: NextRequest) {
    try {
        const { receiptId } = await request.json();

        if (!receiptId) {
            return NextResponse.json(
                { error: 'Receipt ID is required' },
                { status: 400 }
            );
        }

        // Get the receipt document to get S3 information
        const receiptRef = doc(db, 'receipts', receiptId);
        const receiptDoc = await getDoc(receiptRef);

        if (!receiptDoc.exists()) {
            return NextResponse.json(
                { error: 'Receipt not found' },
                { status: 404 }
            );
        }

        const receiptData = receiptDoc.data();
        const { s3Key, s3Bucket } = receiptData;

        // Delete from S3 if S3 information exists
        if (s3Key && s3Bucket) {
            try {
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: s3Bucket,
                    Key: s3Key,
                });
                await s3Client.send(deleteCommand);
                console.log(`Deleted S3 object: ${s3Key}`);
            } catch (s3Error) {
                console.error('Error deleting from S3:', s3Error);
                // Continue with Firestore deletion even if S3 deletion fails
            }
        }

        // Delete from Firestore
        await deleteDoc(receiptRef);
        console.log(`Deleted Firestore document: ${receiptId}`);

        return NextResponse.json({
            success: true,
            message: 'Receipt deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting receipt:', error);
        return NextResponse.json(
            { error: 'Failed to delete receipt' },
            { status: 500 }
        );
    }
} 