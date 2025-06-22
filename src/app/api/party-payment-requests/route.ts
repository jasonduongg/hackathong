import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const partyId = searchParams.get('partyId');

        if (!partyId) {
            return NextResponse.json(
                { error: 'Party ID is required' },
                { status: 400 }
            );
        }

        // First, get all receipts for this party
        const receiptsRef = collection(db, 'receipts');
        const receiptsQuery = query(receiptsRef, where('partyId', '==', partyId));
        const receiptsSnapshot = await getDocs(receiptsQuery);
        const receiptIds = receiptsSnapshot.docs.map(doc => doc.id);

        if (receiptIds.length === 0) {
            return NextResponse.json({
                success: true,
                paymentRequests: []
            });
        }

        // Get PayPal payment requests for all receipts in this party - OPTIMIZED for PayPal only
        const paypalPaymentsRef = collection(db, 'paypal_payments');

        // Create all PayPal queries in parallel
        const paypalPaymentQueries = receiptIds.map(receiptId =>
            getDocs(query(paypalPaymentsRef, where('receiptId', '==', receiptId)))
        );

        // Execute all PayPal queries in parallel
        const paypalSnapshots = await Promise.all(paypalPaymentQueries);

        const allRequests: any[] = [];

        // Process PayPal payment requests
        paypalSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                allRequests.push({
                    id: doc.id,
                    ...doc.data(),
                    type: 'paypal'
                });
            });
        });

        // Sort by creation date (newest first)
        allRequests.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            paymentRequests: allRequests
        });

    } catch (error) {
        console.error('API: Error fetching party payment requests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payment requests' },
            { status: 500 }
        );
    }
} 