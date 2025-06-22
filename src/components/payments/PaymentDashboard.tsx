'use client';

import React, { useState, useEffect } from 'react';
import { PaymentRequest, PaymentSummary } from '@/types/payment';
import { DollarSign, Clock, CheckCircle, XCircle, User, Receipt, Loader2 } from 'lucide-react';

export const PaymentDashboard: React.FC = () => {
    const [payments, setPayments] = useState<{
        sent_requests: PaymentRequest[];
        received_requests: PaymentRequest[];
        summary: PaymentSummary;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/payments/user');
            const data = await response.json();

            if (response.ok) {
                setPayments(data);
            } else {
                console.error('Failed to fetch payments:', data.error);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePaymentStatus = async (paymentId: string, status: 'paid' | 'cancelled') => {
        try {
            const response = await fetch('/api/payments/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paymentId, status }),
            });

            if (response.ok) {
                // Refresh payments
                await fetchPayments();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to update payment status');
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Failed to update payment status');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'paid':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading payments...</span>
            </div>
        );
    }

    if (!payments) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">Failed to load payments</p>
            </div>
        );
    }

    const { summary, received_requests, sent_requests } = payments;
    const currentRequests = activeTab === 'received' ? received_requests : sent_requests;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Owed</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(summary.totalOwed)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(summary.totalPaid)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending Requests</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {summary.pendingRequests.length}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab('received')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'received'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Received ({received_requests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('sent')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sent'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Sent ({sent_requests.length})
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {currentRequests.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">
                                {activeTab === 'received'
                                    ? 'No payment requests received'
                                    : 'No payment requests sent'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentRequests.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            {getStatusIcon(payment.status)}
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {activeTab === 'received'
                                                        ? payment.requesterName
                                                        : payment.targetUserName
                                                    }
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(payment.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                                {payment.status}
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                {formatCurrency(payment.amount)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <p className="text-sm text-gray-600">{payment.note}</p>
                                        {payment.itemName && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Receipt: {payment.itemName}
                                            </p>
                                        )}
                                    </div>

                                    {payment.paymentDetails && (
                                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-600 mb-1">Payment Details:</p>
                                            {payment.paymentDetails.username && (
                                                <p className="text-xs text-gray-700">
                                                    Username: {payment.paymentDetails.username}
                                                </p>
                                            )}
                                            {payment.paymentDetails.email && (
                                                <p className="text-xs text-gray-700">
                                                    Email: {payment.paymentDetails.email}
                                                </p>
                                            )}
                                            {payment.paymentDetails.phone && (
                                                <p className="text-xs text-gray-700">
                                                    Phone: {payment.paymentDetails.phone}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    {payment.status === 'pending' && (
                                        <div className="flex space-x-2">
                                            {activeTab === 'received' ? (
                                                <>
                                                    <button
                                                        onClick={() => updatePaymentStatus(payment.id, 'paid')}
                                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                                                    >
                                                        Mark as Paid
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => updatePaymentStatus(payment.id, 'cancelled')}
                                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                                                >
                                                    Cancel Request
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 