import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
    try {
        const user = getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { paymentId, status } = body;

        if (!paymentId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['pending', 'paid', 'cancelled'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Get the payment request
        const paymentDoc = doc(db, 'payment_requests', paymentId);
        const paymentSnapshot = await getDoc(paymentDoc);

        if (!paymentSnapshot.exists()) {
            return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
        }

        const paymentData = paymentSnapshot.data();

        // Only the target user can mark as paid, requester can cancel
        if (status === 'paid' && paymentData.targetUserId !== user.uid) {
            return NextResponse.json({ error: 'Only the target user can mark as paid' }, { status: 403 });
        }

        if (status === 'cancelled' && paymentData.requesterId !== user.uid) {
            return NextResponse.json({ error: 'Only the requester can cancel' }, { status: 403 });
        }

        // Update the payment request
        await updateDoc(paymentDoc, {
            status,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: `Payment request ${status}`
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        return NextResponse.json(
            { error: 'Failed to update payment status' },
            { status: 500 }
        );
    }
} 