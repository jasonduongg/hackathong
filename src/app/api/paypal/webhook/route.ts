import { NextRequest, NextResponse } from 'next/server';
import { paypalService } from '@/lib/paypal';
import { db } from '@/lib/firebase';
import { query, collection, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { PayPalWebhookEvent } from '@/types/paypal';

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const headers = request.headers;

        // Verify webhook signature
        const transmissionId = headers.get('paypal-transmission-id');
        const timestamp = headers.get('paypal-transmission-time');
        const webhookId = headers.get('paypal-webhook-id');
        const certUrl = headers.get('paypal-cert-url');
        const authAlgo = headers.get('paypal-auth-algo');
        const actualSig = headers.get('paypal-transmission-sig');

        if (!transmissionId || !timestamp || !webhookId || !certUrl || !authAlgo || !actualSig) {
            console.error('Missing PayPal webhook headers');
            return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
        }

        const isValid = await paypalService.verifyWebhookSignature(
            transmissionId,
            timestamp,
            webhookId,
            body,
            certUrl,
            authAlgo,
            actualSig
        );

        if (!isValid) {
            console.error('Invalid PayPal webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const event: PayPalWebhookEvent = JSON.parse(body);

        // Handle different event types
        switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                await handlePaymentCompleted(event);
                break;
            case 'PAYMENT.CAPTURE.DENIED':
                await handlePaymentDenied(event);
                break;
            case 'PAYMENT.CAPTURE.REFUNDED':
                await handlePaymentRefunded(event);
                break;
            default:
                console.log(`Unhandled PayPal event: ${event.event_type}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PayPal webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

async function handlePaymentCompleted(event: PayPalWebhookEvent) {
    const order = event.resource;

    // Find payment by PayPal order ID
    const paymentsQuery = query(
        collection(db, 'paypal_payments'),
        where('paypalOrderId', '==', order.id)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];

        await updateDoc(doc(db, 'paypal_payments', paymentDoc.id), {
            status: 'completed',
            paypalOrder: order,
            updatedAt: new Date().toISOString()
        });
    }
}

async function handlePaymentDenied(event: PayPalWebhookEvent) {
    const order = event.resource;

    const paymentsQuery = query(
        collection(db, 'paypal_payments'),
        where('paypalOrderId', '==', order.id)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];

        await updateDoc(doc(db, 'paypal_payments', paymentDoc.id), {
            status: 'failed',
            paypalOrder: order,
            updatedAt: new Date().toISOString()
        });
    }
}

async function handlePaymentRefunded(event: PayPalWebhookEvent) {
    const order = event.resource;

    const paymentsQuery = query(
        collection(db, 'paypal_payments'),
        where('paypalOrderId', '==', order.id)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];

        await updateDoc(doc(db, 'paypal_payments', paymentDoc.id), {
            status: 'refunded',
            paypalOrder: order,
            updatedAt: new Date().toISOString()
        });
    }
} 