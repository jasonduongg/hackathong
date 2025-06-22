'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { PartyReceipt } from '@/types/receipt';

interface ReceiptImageModalProps {
    receipt: PartyReceipt;
    onClose: () => void;
    onRefreshUrl: (receiptId: string, s3Key: string) => void;
}

const ReceiptImageModal: React.FC<ReceiptImageModalProps> = ({
    receipt,
    onClose,
    onRefreshUrl
}) => {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        const originalBodyStyle = window.getComputedStyle(document.body).overflow;
        const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalBodyStyle;
            document.documentElement.style.overflow = originalHtmlStyle;
        };
    }, []);

    const formatDate = (date: any) => {
        if (!date) return 'Unknown';

        try {
            if (date.toDate && typeof date.toDate === 'function') {
                return date.toDate().toLocaleDateString();
            }
            if (date instanceof Date) {
                return date.toLocaleDateString();
            }
            return new Date(date).toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Receipt Image</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="text-center">
                        <img
                            src={receipt.downloadURL}
                            alt={`Receipt from ${receipt.analysis.store_name || 'Unknown store'}`}
                            className="max-w-full h-auto rounded-lg shadow-lg"
                            style={{ maxHeight: '70vh' }}
                            onError={(e) => {
                                // If image fails to load, try refreshing the URL
                                onRefreshUrl(receipt.id, receipt.s3Key);
                            }}
                        />
                        <p className="text-sm text-gray-500 mt-4">
                            {receipt.fileName} • {formatDate(receipt.uploadedAt)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptImageModal; 