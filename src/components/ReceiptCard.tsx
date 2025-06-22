'use client';

import React, { useState } from 'react';
import { Receipt, DollarSign, Calendar, Store, Eye, Trash2, Image as ImageIcon, RefreshCw, Users, CreditCard } from 'lucide-react';
import { PartyReceipt } from '@/types/receipt';
import { UserProfile } from '@/lib/users';
import { PayPalPaymentModal } from './paypal/PayPalPaymentModal';

interface ReceiptCardProps {
    receipt: PartyReceipt;
    memberProfiles: UserProfile[];
    onViewDetails: (receipt: PartyReceipt) => void;
    onViewImage: (receipt: PartyReceipt) => void;
    onRefreshUrl: (receiptId: string, s3Key: string) => void;
    onDelete: (receiptId: string) => void;
    refreshingUrl: string | null;
    deletingReceipt: string | null;
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({
    receipt,
    memberProfiles,
    onViewDetails,
    onViewImage,
    onRefreshUrl,
    onDelete,
    refreshingUrl,
    deletingReceipt
}) => {
    const [showPayPalModal, setShowPayPalModal] = useState(false);

    const formatCurrency = (amount: string | null | undefined) => {
        if (amount === 'N/A' || !amount) return 'N/A';

        // Try to parse and format the amount
        const num = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) return amount;

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(num);
    };

    const formatDate = (date: any) => {
        if (!date) return 'Unknown';

        try {
            let dateObj: Date;

            if (date.toDate && typeof date.toDate === 'function') {
                dateObj = date.toDate();
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                dateObj = new Date(date);
            }

            // Check if the date is valid
            if (isNaN(dateObj.getTime())) {
                return 'Unknown';
            }

            return dateObj.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    };

    const handlePayPalPayment = () => {
        setShowPayPalModal(true);
    };

    const handlePaymentRequested = () => {
        // You could add a toast notification here
        console.log('Payment requested successfully');
    };

    return (
        <>
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with buttons at top right */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">
                                {receipt.displayName || receipt.fileName}
                            </h4>
                        </div>
                    </div>

                    {/* Action buttons moved to top right */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => onViewImage(receipt)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View image"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onViewDetails(receipt)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                        {receipt.isAssigned && (
                            <button
                                onClick={handlePayPalPayment}
                                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Request PayPal payment"
                            >
                                <CreditCard className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={() => onRefreshUrl(receipt.id, receipt.s3Key)}
                            disabled={refreshingUrl === receipt.id}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh URL"
                        >
                            {refreshingUrl === receipt.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </button>
                        <button
                            onClick={() => onDelete(receipt.id)}
                            disabled={deletingReceipt === receipt.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete receipt"
                        >
                            {deletingReceipt === receipt.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <Store className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{receipt.analysis.store_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{receipt.analysis.date || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                            {formatCurrency(receipt.analysis.total_amount)}
                        </span>
                    </div>
                </div>

                {receipt.analysis.items && receipt.analysis.items.length > 0 && (
                    <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">
                            {receipt.analysis.items.length} items found
                        </p>
                        <div className="space-y-1">
                            {receipt.analysis.items.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex justify-between text-xs">
                                    <span className="truncate">{item.name}</span>
                                    <span className="font-medium">{formatCurrency(item.total_line_price || item.price)}</span>
                                </div>
                            ))}
                            {receipt.analysis.items.length > 3 && (
                                <p className="text-xs text-gray-500">
                                    ...and {receipt.analysis.items.length - 3} more items
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Assignment Summary */}
                {receipt.isAssigned && receipt.memberAmounts && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs w-fit">
                            <DollarSign className="h-3 w-3" />
                            <span>Amounts owed</span>
                        </div>
                        <div className="space-y-1 mt-2">
                            {Object.entries(receipt.memberAmounts).map(([userId, amount]) => {
                                const member = memberProfiles.find(p => p.uid === userId);
                                const displayName = member?.displayName || member?.email?.split('@')[0] || 'Unknown';
                                return (
                                    <div key={userId} className="flex justify-between text-xs">
                                        <span className="text-gray-600">{displayName}</span>
                                        <span className="font-medium text-green-600">
                                            {formatCurrency(amount.toString())}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <PayPalPaymentModal
                isOpen={showPayPalModal}
                onClose={() => setShowPayPalModal(false)}
                receipt={receipt}
                memberProfiles={memberProfiles}
                onPaymentRequested={handlePaymentRequested}
            />
        </>
    );
};

export default ReceiptCard; 