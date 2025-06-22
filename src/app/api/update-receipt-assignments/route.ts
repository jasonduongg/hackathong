import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PartyReceipt } from '@/types/receipt';

export async function POST(request: NextRequest) {
    try {
        const { receiptId, assignments } = await request.json();

        if (!receiptId) {
            return NextResponse.json(
                { error: 'Receipt ID is required' },
                { status: 400 }
            );
        }

        // Update the receipt document with assignment data
        const receiptRef = doc(db, 'receipts', receiptId);
        await updateDoc(receiptRef, {
            analysis: assignments.analysis,
            isAssigned: assignments.isAssigned,
            memberAmounts: assignments.memberAmounts,
            updatedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            message: 'Receipt assignments updated successfully'
        });

    } catch (error) {
        console.error('Error updating receipt assignments:', error);
        return NextResponse.json(
            { error: 'Failed to update receipt assignments' },
            { status: 500 }
        );
    }
} 