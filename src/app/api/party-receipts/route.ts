import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

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

        // Query receipts for the specific party
        const receiptsRef = collection(db, 'receipts');
        const q = query(
            receiptsRef,
            where('partyId', '==', partyId)
            // Temporarily removed orderBy to avoid index requirement
            // orderBy('uploadedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const receipts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];

        // Sort receipts by uploadedAt in descending order on the client side
        receipts.sort((a, b) => {
            const dateA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt);
            const dateB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({
            success: true,
            receipts
        });

    } catch (error) {
        console.error('Error fetching party receipts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch receipts' },
            { status: 500 }
        );
    }
} 