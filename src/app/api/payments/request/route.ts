import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { PaymentRequest } from '@/types/payment';

export async function POST(request: NextRequest) {
    try {
        const user = getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            receiptId,
            targetUserId,
            amount,
            note,
            itemName,
            paymentMethod = 'paypal',
            paymentDetails = {}
        } = body;

        // Validate required fields
        if (!receiptId || !targetUserId || !amount || !note) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        // Get requester's profile
        const requesterDoc = await getDoc(doc(db, 'users', user.uid));
        const requesterName = requesterDoc.exists()
            ? requesterDoc.data().displayName || user.email?.split('@')[0] || 'Unknown'
            : user.email?.split('@')[0] || 'Unknown';

        // Get target user's profile
        const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
        const targetUserName = targetUserDoc.exists()
            ? targetUserDoc.data().displayName || targetUserDoc.data().email?.split('@')[0] || 'Unknown'
            : 'Unknown';

        // Create payment request
        const paymentRequest: Omit<PaymentRequest, 'id'> = {
            receiptId,
            requesterId: user.uid,
            requesterName,
            targetUserId,
            targetUserName,
            amount,
            note,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            itemName,
            paymentMethod,
            paymentDetails
        };

        // Store in Firestore
        const paymentDoc = await addDoc(collection(db, 'payment_requests'), paymentRequest);

        return NextResponse.json({
            success: true,
            payment_request: {
                ...paymentRequest,
                id: paymentDoc.id
            }
        });
    } catch (error) {
        console.error('Payment request error:', error);
        return NextResponse.json(
            { error: 'Failed to create payment request' },
            { status: 500 }
        );
    }
} 