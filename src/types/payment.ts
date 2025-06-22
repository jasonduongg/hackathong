export interface PaymentRequest {
    id: string;
    receiptId: string;
    requesterId: string;
    requesterName: string;
    targetUserId: string;
    targetUserName: string;
    amount: number;
    note: string;
    status: 'pending' | 'paid' | 'cancelled';
    createdAt: string;
    updatedAt: string;
    itemName?: string;
    paymentMethod?: 'paypal' | 'cash' | 'other';
    paymentDetails?: {
        phone?: string;
        email?: string;
        notes?: string;
    };
}

export interface PaymentSummary {
    totalOwed: number;
    totalPaid: number;
    pendingRequests: PaymentRequest[];
    completedRequests: PaymentRequest[];
}

export interface UserPaymentInfo {
    userId: string;
    displayName: string;
    email: string;
    paymentMethods: {
        paypal?: string;
        phone?: string;
    };
} 