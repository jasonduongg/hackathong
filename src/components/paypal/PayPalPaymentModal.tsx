'use client';

import React, { useState, useEffect } from 'react';
import { PartyReceipt } from '@/types/receipt';
import { UserProfile } from '@/lib/users';
import { DollarSign, Send, Loader2, X, User, CreditCard, Users, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PayPalPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: PartyReceipt;
    memberProfiles: UserProfile[];
    onPaymentRequested?: () => void;
}

interface PaymentRequest {
    id: string;
    paypalPaymentUrl?: string;
    status: string;
    amount: number;
    note: string;
    createdAt: string;
}

export const PayPalPaymentModal: React.FC<PayPalPaymentModalProps> = ({
    isOpen,
    onClose,
    receipt,
    memberProfiles,
    onPaymentRequested
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [existingRequests, setExistingRequests] = useState<{ [userId: string]: PaymentRequest }>({});
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    // Check if current user is the one who paid
    const isPayer = user?.uid === receipt.paidBy;

    // Fetch existing payment requests when modal opens
    useEffect(() => {
        if (isOpen && user?.uid) {
            fetchExistingRequests();
        }
    }, [isOpen, user?.uid, receipt.id]);

    const fetchExistingRequests = async () => {
        try {
            const response = await fetch(`/api/paypal/existing-requests?receiptId=${receipt.id}&requesterId=${user?.uid}`);
            if (response.ok) {
                const data = await response.json();
                // The API now returns requests keyed by targetUserId
                setExistingRequests(data.requests || {});
            }
        } catch (error) {
            console.error('Error fetching existing requests:', error);
        }
    };

    const copyToClipboard = async (text: string, userId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedLink(userId);
            setTimeout(() => setCopiedLink(null), 2000);
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            prompt('Copy this PayPal link:', text);
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(num);
    };

    // Calculate amount for each user
    const calculateUserAmount = (userId: string): number => {
        if (receipt.memberAmounts && receipt.memberAmounts[userId]) {
            return receipt.memberAmounts[userId];
        }

        // Fallback: split equally among all members
        const totalAmount = parseFloat(receipt.analysis.total_amount) || 0;
        return totalAmount / memberProfiles.length;
    };

    // Generate note for each user
    const generateNote = (member: UserProfile): string => {
        const memberName = member.displayName || member.email?.split('@')[0] || 'Unknown';
        const storeName = receipt.analysis.store_name || 'restaurant';
        const date = receipt.analysis.date ? new Date(receipt.analysis.date).toLocaleDateString() : 'today';

        return `Payment for ${storeName} on ${date} - Split with ${memberName}`;
    };

    const handlePaymentRequest = async (member: UserProfile) => {
        const amount = calculateUserAmount(member.uid);
        const note = generateNote(member);
        const paypalEmail = member.paypalEmail;

        if (!paypalEmail) {
            alert(`${member.displayName || member.email} hasn't set up their PayPal email yet. Please ask them for their PayPal email address.`);
            return;
        }

        if (amount <= 0) {
            alert('No amount to request for this user.');
            return;
        }

        try {
            setLoading(member.uid);
            const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.uid || ''
                },
                body: JSON.stringify({
                    receiptId: receipt.id,
                    targetUserId: member.uid,
                    amount: amount,
                    note: note,
                    itemName: receipt.fileName,
                    targetPayPalEmail: paypalEmail
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Show success message with PayPal URL
                const paypalUrl = data.paypal_url;
                const message = `${data.message}\n\nPayPal Payment Link: ${paypalUrl}\n\nCopy this link and share it with ${member.displayName || member.email} to complete the payment.`;

                if (confirm(message + '\n\nWould you like to copy the PayPal link to your clipboard?')) {
                    try {
                        await navigator.clipboard.writeText(paypalUrl);
                        alert('PayPal link copied to clipboard!');
                    } catch (err) {
                        // Fallback for browsers that don't support clipboard API
                        prompt('Copy this PayPal link:', paypalUrl);
                    }
                }

                // Refresh existing requests
                await fetchExistingRequests();
                onPaymentRequested?.();
            } else {
                console.error('Failed to create payment request:', data.error);
                alert('Failed to create payment request. Please try again.');
            }
        } catch (error) {
            console.error('Error creating payment request:', error);
            alert('Failed to create payment request. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Request Payments</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Receipt Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-gray-900 mb-2">Receipt Details</h3>
                        <p className="text-sm text-gray-600">{receipt.fileName}</p>
                        <p className="text-sm text-gray-600">
                            Total: {formatCurrency(receipt.analysis.total_amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                            Store: {receipt.analysis.store_name || 'Unknown'}
                        </p>
                        {receipt.paidBy && (
                            <p className="text-sm text-gray-600">
                                Paid by: {memberProfiles.find(p => p.uid === receipt.paidBy)?.displayName || memberProfiles.find(p => p.uid === receipt.paidBy)?.email?.split('@')[0] || 'Unknown'}
                            </p>
                        )}
                    </div>

                    {/* Show message if user didn't pay */}
                    {!isPayer && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <CreditCard className="h-5 w-5 text-yellow-600" />
                                <h4 className="font-medium text-yellow-900">Payment Requests</h4>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">
                                Only the person who paid for this receipt can request payments from others.
                            </p>
                        </div>
                    )}

                    {/* User Cards */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                            <Users className="h-5 w-5" />
                            <span>Party Members</span>
                        </h3>

                        {memberProfiles.map((member) => {
                            const amount = calculateUserAmount(member.uid);
                            const note = generateNote(member);
                            const hasPayPalEmail = !!member.paypalEmail;
                            const isCurrentUser = member.uid === user?.uid;
                            const isLoading = loading === member.uid;
                            const existingRequest = existingRequests[member.uid];

                            return (
                                <div key={member.uid} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">
                                                    {member.displayName || member.email?.split('@')[0] || 'Unknown'}
                                                    {isCurrentUser && (
                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            You
                                                        </span>
                                                    )}
                                                    {member.uid === receipt.paidBy && (
                                                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            Paid
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-sm text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-gray-900">
                                                {formatCurrency(amount)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Note:</strong> {note}
                                        </p>
                                        {hasPayPalEmail ? (
                                            <p className="text-xs text-green-600 flex items-center space-x-1">
                                                <CreditCard className="h-3 w-3" />
                                                <span>PayPal: {member.paypalEmail}</span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-orange-600 flex items-center space-x-1">
                                                <CreditCard className="h-3 w-3" />
                                                <span>No PayPal email configured</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Show existing payment request if available */}
                                    {existingRequest && existingRequest.paypalPaymentUrl && (
                                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm text-green-800 font-medium">
                                                        Payment request already sent
                                                    </p>
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Created: {new Date(existingRequest.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => copyToClipboard(existingRequest.paypalPaymentUrl!, member.uid)}
                                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center space-x-1"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                        <span>{copiedLink === member.uid ? 'Copied!' : 'Copy Link'}</span>
                                                    </button>
                                                    <a
                                                        href={existingRequest.paypalPaymentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center space-x-1"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        <span>Open</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Request Button - only show if no existing request and user is payer */}
                                    {!existingRequest && isPayer && (
                                        <button
                                            onClick={() => handlePaymentRequest(member)}
                                            disabled={isCurrentUser || !hasPayPalEmail || amount <= 0 || isLoading}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            <span>
                                                {isCurrentUser
                                                    ? 'Cannot request from yourself'
                                                    : !hasPayPalEmail
                                                        ? 'No PayPal email'
                                                        : isLoading
                                                            ? 'Sending Request...'
                                                            : 'Request Payment'
                                                }
                                            </span>
                                        </button>
                                    )}

                                    {/* Show message for non-payers */}
                                    {!existingRequest && !isPayer && (
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <p className="text-sm text-gray-600 text-center">
                                                Only the person who paid can request payments
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <h4 className="font-medium text-blue-900">PayPal Payment Request</h4>
                        </div>
                        <p className="text-sm text-blue-700">
                            Click "Request Payment" to create a PayPal payment link. You can then share this link with the selected person so they can pay you directly through PayPal.
                        </p>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-800">
                                    <strong>Sandbox Mode:</strong> You're currently using PayPal's sandbox environment for testing.
                                    Recipients will need to use PayPal sandbox test accounts to complete payments.
                                    Get test accounts from your PayPal Developer Dashboard.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 