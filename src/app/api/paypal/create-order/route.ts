import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { paypalService } from '@/lib/paypal';
import { PayPalPaymentRequest } from '@/types/paypal';

export async function POST(request: NextRequest) {
    try {
        // Check if PayPal credentials are configured
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
            console.error('PayPal credentials not configured');
            return NextResponse.json({
                error: 'PayPal credentials not configured. Please check your environment variables.'
            }, { status: 500 });
        }

        // Get user ID from request headers (passed from client)
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            console.error('No user ID provided in request headers');
            return NextResponse.json({ error: 'User ID required' }, { status: 401 });
        }

        console.log('Processing payment request for user:', userId);

        const body = await request.json();
        const {
            receiptId,
            targetUserId,
            amount,
            note,
            itemName,
            targetPayPalEmail
        } = body;

        console.log('Payment request data:', {
            receiptId,
            targetUserId,
            amount,
            note,
            itemName,
            targetPayPalEmail
        });

        // Validate required fields
        if (!receiptId || !targetUserId || !amount || !note) {
            console.error('Missing required fields:', { receiptId, targetUserId, amount, note });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (amount <= 0) {
            console.error('Invalid amount:', amount);
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        // Get requester's profile from Firestore
        const requesterDoc = await getDoc(doc(db, 'users', userId));
        if (!requesterDoc.exists()) {
            console.error('Requester profile not found:', userId);
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        const requesterData = requesterDoc.data();
        const requesterName = requesterData.displayName || requesterData.email?.split('@')[0] || 'Unknown';

        // Get target user's profile from Firestore
        const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
        if (!targetUserDoc.exists()) {
            console.error('Target user profile not found:', targetUserId);
            return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
        }

        const targetUserData = targetUserDoc.data();
        const targetUserName = targetUserData.displayName || targetUserData.email?.split('@')[0] || 'Unknown';

        console.log('User profiles:', { requesterName, targetUserName });

        // Create payment request record
        const paymentRequest: Omit<PayPalPaymentRequest, 'id'> = {
            receiptId,
            requesterId: userId,
            requesterName,
            targetUserId,
            targetUserName,
            amount,
            note,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            itemName,
            targetPayPalEmail
        };

        console.log('Creating payment request in Firestore...');

        // Store in Firestore first
        const paymentDoc = await addDoc(collection(db, 'paypal_payments'), paymentRequest);
        const paymentRequestWithId = { ...paymentRequest, id: paymentDoc.id };

        console.log('Payment request stored with ID:', paymentDoc.id);

        // Create PayPal money request
        console.log('Creating PayPal money request...');
        const paypalPaymentUrl = await paypalService.createMoneyRequest(paymentRequestWithId);

        console.log('PayPal money request created:', paypalPaymentUrl);

        // Update the payment request with PayPal payment URL
        await setDoc(doc(db, 'paypal_payments', paymentDoc.id), {
            ...paymentRequest,
            paypalPaymentUrl
        }, { merge: true });

        console.log('Payment request completed successfully');

        return NextResponse.json({
            success: true,
            message: `Payment request sent to ${targetUserName}`,
            paypal_url: paypalPaymentUrl,
            payment_request: {
                ...paymentRequestWithId,
                paypalPaymentUrl
            }
        });
    } catch (error) {
        console.error('Payment request error:', error);

        return NextResponse.json(
            { error: 'Failed to create payment request: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        );
    }
} 