'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/users';
import { DollarSign, Clock, CheckCircle, XCircle, ExternalLink, Receipt, Loader2 } from 'lucide-react';

interface PaymentRequest {
    id: string;
    receiptId: string;
    requesterId: string;
    requesterName: string;
    targetUserId: string;
    targetUserName: string;
    amount: number;
    note: string;
    status: 'pending' | 'paid' | 'cancelled' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    itemName?: string;
    paymentMethod?: 'paypal' | 'cash' | 'other';
    paymentDetails?: {
        phone?: string;
        email?: string;
        notes?: string;
    };
    type: 'regular' | 'paypal';
    paypalPaymentUrl?: string;
}

interface PartyPaymentRequestsProps {
    partyId: string;
    memberProfiles: UserProfile[];
    onRequestsUpdate?: (pendingCount: number) => void;
}

const PartyPaymentRequests: React.FC<PartyPaymentRequestsProps> = ({ partyId, memberProfiles, onRequestsUpdate }) => {
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaymentRequests();
    }, [partyId]);

    const fetchPaymentRequests = async () => {
        try {
            setLoading(true);
            console.log('Fetching payment requests for party:', partyId);
            const response = await fetch(`/api/party-payment-requests?partyId=${partyId}`);
            console.log('API response status:', response.status);
            const data = await response.json();
            console.log('API response data:', data);

            if (response.ok) {
                const requests = data.paymentRequests || [];
                console.log('Payment requests found:', requests.length);
                setPaymentRequests(requests);
                if (onRequestsUpdate) {
                    const pendingCount = requests.filter((r: PaymentRequest) => r.status === 'pending').length;
                    onRequestsUpdate(pendingCount);
                }
            } else {
                console.error('Failed to fetch payment requests:', data.error);
            }
        } catch (error) {
            console.error('Error fetching payment requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            case 'paid':
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'cancelled':
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'paid':
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleViewReceipt = (receiptId: string) => {
        // This could open a modal or navigate to receipt details
        // For now, we'll just log it - you can implement this based on your receipt viewing functionality
        console.log('View receipt:', receiptId);
        // You could implement this to open a modal or navigate to the receipts tab
        // For example: window.location.href = `/party/${partyId}?tab=receipts&receipt=${receiptId}`;
    };

    const handlePayPalPayment = (paypalUrl: string) => {
        if (paypalUrl) {
            window.open(paypalUrl, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-3" />
                <div className="text-gray-500">Loading payment requests...</div>
            </div>
        );
    }

    if (paymentRequests.length === 0) {
        return (
            <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payment requests found</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Payment Requests</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                        {paymentRequests.length} request{paymentRequests.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {paymentRequests.map((request) => (
                    <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                                {getStatusIcon(request.status)}
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {request.requesterName} → {request.targetUserName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(request.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                    {request.status}
                                </span>
                                <span className="font-bold text-gray-900">
                                    {formatCurrency(request.amount)}
                                </span>
                            </div>
                        </div>

                        <div className="mb-3">
                            <p className="text-sm text-gray-600">{request.note}</p>
                            {request.itemName && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Receipt: {request.itemName}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleViewReceipt(request.receiptId)}
                                    className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    <Receipt className="h-4 w-4" />
                                    <span>View Receipt</span>
                                </button>
                            </div>

                            <div className="flex items-center space-x-2">
                                {request.type === 'paypal' && request.paypalPaymentUrl && request.status === 'pending' && (
                                    <button
                                        onClick={() => handlePayPalPayment(request.paypalPaymentUrl!)}
                                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        <span>Pay with PayPal</span>
                                    </button>
                                )}

                                {request.paymentMethod && request.paymentMethod !== 'paypal' && (
                                    <span className="text-xs text-gray-500">
                                        Method: {request.paymentMethod}
                                    </span>
                                )}
                            </div>
                        </div>

                        {request.paymentDetails && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Payment Details:</p>
                                {request.paymentDetails.email && (
                                    <p className="text-xs text-gray-700">
                                        Email: {request.paymentDetails.email}
                                    </p>
                                )}
                                {request.paymentDetails.phone && (
                                    <p className="text-xs text-gray-700">
                                        Phone: {request.paymentDetails.phone}
                                    </p>
                                )}
                                {request.paymentDetails.notes && (
                                    <p className="text-xs text-gray-700">
                                        Notes: {request.paymentDetails.notes}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartyPaymentRequests; 