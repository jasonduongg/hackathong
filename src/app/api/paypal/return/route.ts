import { NextRequest, NextResponse } from 'next/server';
import { paypalService } from '@/lib/paypal';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const payerId = searchParams.get('PayerID');

        if (!token) {
            return NextResponse.redirect('/home?paypal_error=missing_token');
        }

        // Find the payment request by PayPal order ID
        const paymentsQuery = query(
            collection(db, 'paypal_payments'),
            where('paypalOrderId', '==', token)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);

        if (paymentsSnapshot.empty) {
            return NextResponse.redirect('/home?paypal_error=payment_not_found');
        }

        const paymentDoc = paymentsSnapshot.docs[0];
        const paymentData = paymentDoc.data();

        // Capture the payment
        const capturedOrder = await paypalService.captureOrder(token);

        // Update payment status
        await updateDoc(doc(db, 'paypal_payments', paymentDoc.id), {
            status: 'completed',
            paypalOrder: capturedOrder,
            updatedAt: new Date().toISOString()
        });

        // Redirect to success page
        return NextResponse.redirect('/home?paypal_success=payment_completed');
    } catch (error) {
        console.error('PayPal return error:', error);
        return NextResponse.redirect('/home?paypal_error=capture_failed');
    }
} 