'use client';

import React, { useState } from 'react';
import { PartyReceipt } from '@/types/receipt';
import { UserProfile } from '@/lib/users';
import { DollarSign, Send, Loader2, X, User, CreditCard } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: PartyReceipt;
    memberProfiles: UserProfile[];
    onPaymentRequested?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    receipt,
    memberProfiles,
    onPaymentRequested
}) => {
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'cash' | 'other'>('paypal');
    const [paymentDetails, setPaymentDetails] = useState({
        phone: '',
        email: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setSelectedUser('');
        setAmount('');
        setNote('');
        setPaymentMethod('paypal');
        setPaymentDetails({
            phone: '',
            email: '',
            notes: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUser || !amount || !note) {
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/payments/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    receiptId: receipt.id,
                    targetUserId: selectedUser,
                    amount: numAmount,
                    note,
                    itemName: receipt.fileName,
                    paymentMethod,
                    paymentDetails
                }),
            });

            const data = await response.json();

            if (response.ok) {
                onPaymentRequested?.();
                onClose();
                resetForm();
            } else {
                console.error('Failed to request payment:', data.error);
                alert('Failed to request payment. Please try again.');
            }
        } catch (error) {
            console.error('Error requesting payment:', error);
            alert('Failed to request payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: string) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(num);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Request Payment</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Receipt Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Receipt Details</h3>
                            <p className="text-sm text-gray-600">{receipt.fileName}</p>
                            <p className="text-sm text-gray-600">
                                Total: {formatCurrency(receipt.analysis.total_amount)}
                            </p>
                        </div>

                        {/* Select User */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Person to Pay
                            </label>
                            <select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="">Choose a person...</option>
                                {memberProfiles.map((member) => (
                                    <option key={member.uid} value={member.uid}>
                                        {member.displayName || member.email?.split('@')[0] || 'Unknown'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preferred Payment Method
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'paypal', label: 'PayPal', icon: '💙' },
                                    { value: 'cash', label: 'Cash', icon: '💵' },
                                    { value: 'other', label: 'Other', icon: '💳' }
                                ].map((method) => (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(method.value as any)}
                                        className={`p-3 border rounded-lg text-center transition-colors ${paymentMethod === method.value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="text-lg mb-1">{method.icon}</div>
                                        <div className="text-sm font-medium">{method.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Details (Optional)
                            </label>
                            <div className="space-y-3">
                                {paymentMethod === 'paypal' && (
                                    <input
                                        type="email"
                                        placeholder="PayPal email"
                                        value={paymentDetails.email}
                                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                )}
                                <input
                                    type="tel"
                                    placeholder="Phone number (optional)"
                                    value={paymentDetails.phone}
                                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Note
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="What's this payment for?"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!selectedUser || !amount || !note || loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            <span>{loading ? 'Requesting...' : 'Request Payment'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}; 