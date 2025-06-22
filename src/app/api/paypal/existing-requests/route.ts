import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const receiptId = searchParams.get('receiptId');
        const requesterId = searchParams.get('requesterId');

        if (!receiptId || !requesterId) {
            return NextResponse.json({ error: 'Receipt ID and Requester ID are required' }, { status: 400 });
        }

        // Query for existing payment requests for this receipt and requester
        const requestsQuery = query(
            collection(db, 'paypal_payments'),
            where('receiptId', '==', receiptId),
            where('requesterId', '==', requesterId)
        );

        const requestsSnapshot = await getDocs(requestsQuery);
        const requests: { [targetUserId: string]: any } = {};

        requestsSnapshot.forEach(doc => {
            const data = doc.data();
            // Use targetUserId as the key so we can easily look up by user
            requests[data.targetUserId] = {
                id: doc.id,
                targetUserId: data.targetUserId,
                paypalPaymentUrl: data.paypalPaymentUrl,
                status: data.status,
                amount: data.amount,
                note: data.note,
                createdAt: data.createdAt
            };
        });

        return NextResponse.json({
            success: true,
            requests
        });
    } catch (error) {
        console.error('Error fetching existing requests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch existing requests' },
            { status: 500 }
        );
    }
} 