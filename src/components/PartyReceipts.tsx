'use client';

import React, { useEffect } from 'react';
import { Receipt, DollarSign, Calendar, Store, Eye, Trash2, X, Image as ImageIcon, RefreshCw, Users } from 'lucide-react';
import { useParty } from '@/contexts/PartyContext';
import { PartyReceipt } from '@/types/receipt';
import { UserProfile } from '@/lib/users';
import ItemAssignmentFlow from './ItemAssignmentFlow';

interface PartyReceiptsProps {
    partyId: string;
    memberProfiles: UserProfile[];
}

const PartyReceipts: React.FC<PartyReceiptsProps> = ({ partyId, memberProfiles }) => {
    const {
        receipts,
        loading,
        fetchReceipts,
        removeReceipt,
        updateReceipt
    } = useParty();

    const [selectedReceipt, setSelectedReceipt] = React.useState<PartyReceipt | null>(null);
    const [showDetails, setShowDetails] = React.useState(false);
    const [showImage, setShowImage] = React.useState(false);
    const [showRawData, setShowRawData] = React.useState(false);
    const [showAssignmentFlow, setShowAssignmentFlow] = React.useState(false);
    const [refreshingUrl, setRefreshingUrl] = React.useState<string | null>(null);
    const [deletingReceipt, setDeletingReceipt] = React.useState<string | null>(null);

    useEffect(() => {
        fetchReceipts(partyId);
    }, [partyId, fetchReceipts]);

    const refreshSignedUrl = async (receiptId: string, s3Key: string) => {
        // This functionality may need to be moved to the context as well if it modifies shared state
        try {
            setRefreshingUrl(receiptId);
            const response = await fetch('/api/refresh-s3-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ s3Key }),
            });
            if (response.ok) {
                const { downloadURL } = await response.json();
                // This part of state update will need to be handled via context
                // setReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, downloadURL } : r));
            }
        } catch (error) {
            console.error('Error refreshing URL:', error);
        } finally {
            setRefreshingUrl(null);
        }
    };

    const deleteReceipt = async (receiptId: string) => {
        if (!confirm('Are you sure you want to delete this receipt?')) return;
        try {
            setDeletingReceipt(receiptId);
            const response = await fetch(`/api/delete-receipt`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiptId }),
            });
            if (response.ok) {
                removeReceipt(receiptId);
            } else {
                console.error('Failed to delete receipt');
            }
        } catch (error) {
            console.error('Error deleting receipt:', error);
        } finally {
            setDeletingReceipt(null);
        }
    };

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

    const formatTaxPercentage = (taxAmount: string, subtotal: string) => {
        if (taxAmount === 'N/A' || subtotal === 'N/A') return '';

        const tax = parseFloat(taxAmount.replace(/[^0-9.-]/g, ''));
        const sub = parseFloat(subtotal.replace(/[^0-9.-]/g, ''));

        if (isNaN(tax) || isNaN(sub) || sub === 0) return '';

        const percentage = (tax / sub) * 100;
        return `(${percentage.toFixed(1)}%)`;
    };

    const handleViewDetails = (receipt: PartyReceipt) => {
        setSelectedReceipt(receipt);
        setShowDetails(true);
    };

    const handleViewImage = (receipt: PartyReceipt) => {
        setSelectedReceipt(receipt);
        setShowImage(true);
    };

    const handleStartAssignment = (receipt: PartyReceipt) => {
        setSelectedReceipt(receipt);
        setShowAssignmentFlow(true);
    };

    const handleAssignmentComplete = (updatedReceipt: PartyReceipt) => {
        // Update the receipt in the context
        if (updateReceipt) {
            updateReceipt(updatedReceipt);
        }
        setShowAssignmentFlow(false);
        setShowDetails(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading receipts...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Receipts List */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Receipt className="h-5 w-5" />
                        <span>Party Receipts</span>
                        {receipts.length > 0 && (
                            <span className="text-sm text-gray-500">({receipts.length})</span>
                        )}
                    </h3>
                </div>

                {receipts.length === 0 ? (
                    <div className="text-center py-8">
                        <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No receipts uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Upload a receipt to get started</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {receipts.map((receipt) => (
                            <div
                                key={receipt.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <Receipt className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{receipt.fileName}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(receipt.uploadedAt)} • {(receipt.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            {receipt.isAssigned && (
                                                <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                                                    <Users className="h-3 w-3" />
                                                    <span>Assigned</span>
                                                </div>
                                            )}
                                        </div>

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
                                                <p className="text-sm text-gray-600 mb-2">Amounts owed:</p>
                                                <div className="space-y-1">
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

                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            onClick={() => handleViewImage(receipt)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="View image"
                                        >
                                            <ImageIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleViewDetails(receipt)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => refreshSignedUrl(receipt.id, receipt.s3Key)}
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
                                            onClick={() => deleteReceipt(receipt.id)}
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
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Receipt Image Modal */}
            {showImage && selectedReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Receipt Image</h2>
                                <button
                                    onClick={() => setShowImage(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="text-center">
                                <img
                                    src={selectedReceipt.downloadURL}
                                    alt={`Receipt from ${selectedReceipt.analysis.store_name || 'Unknown store'}`}
                                    className="max-w-full h-auto rounded-lg shadow-lg"
                                    style={{ maxHeight: '70vh' }}
                                    onError={(e) => {
                                        // If image fails to load, try refreshing the URL
                                        refreshSignedUrl(selectedReceipt.id, selectedReceipt.s3Key);
                                    }}
                                />
                                <p className="text-sm text-gray-500 mt-4">
                                    {selectedReceipt.fileName} • {formatDate(selectedReceipt.uploadedAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Details Modal */}
            {showDetails && selectedReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Receipt Details</h2>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setShowRawData(!showRawData)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${showRawData
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
                                    </button>
                                    <button
                                        onClick={() => handleStartAssignment(selectedReceipt)}
                                        className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>{selectedReceipt.isAssigned ? 'Reassign' : 'Assign'}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowDetails(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Receipt Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Store className="h-5 w-5 text-gray-500" />
                                            <span className="font-medium text-gray-900">Store</span>
                                        </div>
                                        <p className="text-gray-600">
                                            {selectedReceipt.analysis.store_name || 'N/A'}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Calendar className="h-5 w-5 text-gray-500" />
                                            <span className="font-medium text-gray-900">Date</span>
                                        </div>
                                        <p className="text-gray-600">
                                            {selectedReceipt.analysis.date || 'N/A'}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <DollarSign className="h-5 w-5 text-gray-500" />
                                            <span className="font-medium text-gray-900">Total</span>
                                        </div>
                                        <p className="text-gray-600 font-semibold">
                                            {formatCurrency(selectedReceipt.analysis.total_amount)}
                                        </p>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>

                                    {selectedReceipt.analysis.items && selectedReceipt.analysis.items.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedReceipt.analysis.items.map((item, index) => {
                                                const parseNum = (val: string | undefined | null) => parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;

                                                const perItemPrice = parseNum(item.price);
                                                const perItemTax = parseNum(item.tax_price);
                                                const quantity = parseInt(String(item.quantity).replace(/[^0-9]/g, '') || '1', 10);

                                                // Use total_line_price if available, otherwise calculate from per-item price
                                                const lineItemTotal = item.total_line_price ? parseNum(item.total_line_price) : perItemPrice * quantity;
                                                const lineItemTax = perItemTax * quantity;

                                                return (
                                                    <div key={index} className="pb-4 border-b last:border-b-0">
                                                        <div className="flex justify-between items-baseline">
                                                            <h4 className="font-semibold text-lg text-gray-800">{item.name}</h4>
                                                            <p className="font-medium text-gray-800">
                                                                {formatCurrency(lineItemTotal.toString())}
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-between items-baseline text-sm text-gray-500 mt-1">
                                                            <p>
                                                                {quantity} x {formatCurrency(item.price)}
                                                            </p>
                                                            {lineItemTax > 0 &&
                                                                <p>
                                                                    + {formatCurrency(lineItemTax.toString())} Tax
                                                                </p>
                                                            }
                                                        </div>

                                                        {/* Assignment Info */}
                                                        {item.assignedTo && item.assignedTo.length > 0 && (
                                                            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                                                <p className="text-xs text-blue-700 mb-1">
                                                                    Assigned to {item.assignedTo.length} {item.assignedTo.length === 1 ? 'person' : 'people'}:
                                                                </p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.assignedTo.map((userId) => {
                                                                        const member = memberProfiles.find(p => p.uid === userId);
                                                                        const displayName = member?.displayName || member?.email?.split('@')[0] || 'Unknown';
                                                                        const amount = item.assignedAmounts?.[userId] || 0;
                                                                        return (
                                                                            <span key={userId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                                {displayName} ({formatCurrency(amount.toString())})
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.subitems && item.subitems.length > 1 && (
                                                            <div className="pl-4 mt-3 space-y-2 text-sm text-gray-600">
                                                                {item.subitems.map((subitem, subIndex) => (
                                                                    <div key={subIndex} className="flex justify-between items-center">
                                                                        <span>{subitem.name}</span>
                                                                        {subitem.tax_price && parseNum(subitem.tax_price) > 0 &&
                                                                            <span className="text-xs">
                                                                                Tax: {formatCurrency(subitem.tax_price)}
                                                                            </span>
                                                                        }
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No items found in the receipt</p>
                                    )}
                                </div>

                                {/* Additional Details */}
                                {(selectedReceipt.analysis.subtotal !== 'N/A' || selectedReceipt.analysis.tax_amount !== 'N/A') && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="space-y-2">
                                            {selectedReceipt.analysis.subtotal !== 'N/A' && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Subtotal:</span>
                                                    <span className="font-medium text-gray-900">
                                                        {formatCurrency(selectedReceipt.analysis.subtotal)}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedReceipt.analysis.tax_amount !== 'N/A' && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Tax {formatTaxPercentage(selectedReceipt.analysis.tax_amount, selectedReceipt.analysis.subtotal)}: </span>
                                                    <span className="font-medium text-gray-900">
                                                        {formatCurrency(selectedReceipt.analysis.tax_amount)}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedReceipt.analysis.gratuity && selectedReceipt.analysis.gratuity !== 'N/A' && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">
                                                        Gratuity {selectedReceipt.analysis.gratuity_rate && `(${selectedReceipt.analysis.gratuity_rate})`}:
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        {formatCurrency(selectedReceipt.analysis.gratuity)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Raw Database Info */}
                            {showRawData && (
                                <div className="mt-6 border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw Database Information</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(selectedReceipt, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                            <div className="flex justify-end items-center space-x-2 text-md">
                                <span className="text-gray-600">Subtotal: {formatCurrency(selectedReceipt.analysis.subtotal)}</span>
                                <span className="text-gray-500">+</span>
                                <span className="text-gray-600">
                                    Tax {formatTaxPercentage(selectedReceipt.analysis.tax_amount, selectedReceipt.analysis.subtotal)}: {formatCurrency(selectedReceipt.analysis.tax_amount)}
                                </span>
                                {selectedReceipt.analysis.gratuity && selectedReceipt.analysis.gratuity !== 'N/A' && (
                                    <>
                                        <span className="text-gray-500">+</span>
                                        <span className="text-gray-600">
                                            Gratuity {selectedReceipt.analysis.gratuity_rate && `(${selectedReceipt.analysis.gratuity_rate})`}: {formatCurrency(selectedReceipt.analysis.gratuity)}
                                        </span>
                                    </>
                                )}
                                <span className="text-gray-500">=</span>
                                <span className="font-bold text-gray-900">Total: {formatCurrency(selectedReceipt.analysis.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Assignment Flow */}
            {showAssignmentFlow && selectedReceipt && (
                <ItemAssignmentFlow
                    receipt={selectedReceipt}
                    memberProfiles={memberProfiles}
                    onClose={() => setShowAssignmentFlow(false)}
                    onAssignmentComplete={handleAssignmentComplete}
                />
            )}
        </div>
    );
};

export default PartyReceipts; 