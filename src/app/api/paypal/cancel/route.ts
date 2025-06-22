import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { query, collection, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (token) {
            // Find the payment request by PayPal order ID
            const paymentsQuery = query(
                collection(db, 'paypal_payments'),
                where('paypalOrderId', '==', token)
            );
            const paymentsSnapshot = await getDocs(paymentsQuery);

            if (!paymentsSnapshot.empty) {
                const paymentDoc = paymentsSnapshot.docs[0];

                // Update payment status to cancelled
                await updateDoc(doc(db, 'paypal_payments', paymentDoc.id), {
                    status: 'cancelled',
                    updatedAt: new Date().toISOString()
                });
            }
        }

        // Redirect to home page with cancellation message
        return NextResponse.redirect('/home?paypal_error=payment_cancelled');
    } catch (error) {
        console.error('PayPal cancel error:', error);
        return NextResponse.redirect('/home?paypal_error=cancel_failed');
    }
} 