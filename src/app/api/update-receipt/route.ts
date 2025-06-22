import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PartyReceipt } from '@/types/receipt';

export async function POST(request: NextRequest) {
    try {
        const { receiptId, updatedReceipt } = await request.json();

        if (!receiptId) {
            return NextResponse.json(
                { error: 'Receipt ID is required' },
                { status: 400 }
            );
        }

        if (!updatedReceipt) {
            return NextResponse.json(
                { error: 'Updated receipt data is required' },
                { status: 400 }
            );
        }

        // Update the receipt document with the new analysis data
        const receiptRef = doc(db, 'receipts', receiptId);
        await updateDoc(receiptRef, {
            analysis: updatedReceipt.analysis,
            updatedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            message: 'Receipt updated successfully'
        });

    } catch (error) {
        console.error('Error updating receipt:', error);
        return NextResponse.json(
            { error: 'Failed to update receipt' },
            { status: 500 }
        );
    }
} 