'use client';

import React, { useState, useEffect } from 'react';
import { X, Store, Calendar, DollarSign, Users, Edit, Save } from 'lucide-react';
import { PartyReceipt } from '@/types/receipt';
import { UserProfile } from '@/lib/users';

interface ReceiptDetailsModalProps {
    receipt: PartyReceipt;
    memberProfiles: UserProfile[];
    onClose: () => void;
    onStartAssignment: (receipt: PartyReceipt) => void;
    onUpdateReceipt?: (updatedReceipt: PartyReceipt) => void;
}

const ReceiptDetailsModal: React.FC<ReceiptDetailsModalProps> = ({
    receipt,
    memberProfiles,
    onClose,
    onStartAssignment,
    onUpdateReceipt
}) => {
    const [showRawData, setShowRawData] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedReceipt, setEditedReceipt] = useState<PartyReceipt>(receipt);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [taxRate, setTaxRate] = useState(() => {
        // Extract tax rate from database, default to 8.6% if not found
        const dbTaxRate = receipt.analysis.tax_rate;
        if (dbTaxRate && dbTaxRate !== 'N/A') {
            // Remove % and convert to decimal
            const rateStr = dbTaxRate.replace('%', '');
            const rate = parseFloat(rateStr) / 100;
            return isNaN(rate) ? 0.086 : rate;
        }
        return 0.086; // Default fallback
    });
    const [gratuityRate, setGratuityRate] = useState(() => {
        // Extract gratuity rate from database, default to 0% if not found
        const dbGratuityRate = receipt.analysis.gratuity_rate;
        if (dbGratuityRate && dbGratuityRate !== 'N/A') {
            // Remove % and convert to decimal
            const rateStr = dbGratuityRate.replace('%', '');
            const rate = parseFloat(rateStr) / 100;
            return isNaN(rate) ? 0 : rate;
        }
        return 0; // Default fallback
    });

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

    const formatTaxPercentage = (taxAmount: string, subtotal: string) => {
        if (taxAmount === 'N/A' || subtotal === 'N/A') return '';

        const tax = parseFloat(taxAmount.replace(/[^0-9.-]/g, ''));
        const sub = parseFloat(subtotal.replace(/[^0-9.-]/g, ''));

        if (isNaN(tax) || isNaN(sub) || sub === 0) return '';

        const percentage = (tax / sub) * 100;
        return `(${percentage.toFixed(1)}%)`;
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing - reset to original
            setEditedReceipt(receipt);
        }
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        if (!onUpdateReceipt) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            await onUpdateReceipt(editedReceipt);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving receipt:', error);
            setSaveError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateItem = (index: number, field: string, value: string) => {
        const updatedItems = [...editedReceipt.analysis.items];
        const currentItem = updatedItems[index];

        // Create updated item with the changed field
        let updatedItem = { ...currentItem, [field]: value };

        // Handle related field updates
        if (field === 'price' || field === 'quantity') {
            const newPrice = field === 'price' ? parseFloat(value) || 0 : parseFloat(currentItem.price || '0') || 0;
            const newQuantity = field === 'quantity' ? parseInt(value) || 1 : parseInt(currentItem.quantity || '1') || 1;

            // Update total_line_price based on price * quantity
            const newTotalLinePrice = (newPrice * newQuantity).toFixed(2);
            updatedItem = { ...updatedItem, total_line_price: newTotalLinePrice };

            // Calculate tax automatically based on current tax rate
            const newTaxPrice = (newPrice * taxRate).toFixed(2);
            updatedItem = { ...updatedItem, tax_price: newTaxPrice };

            // Update subitems if they exist
            if (updatedItem.subitems && updatedItem.subitems.length > 0) {
                updatedItem.subitems = updatedItem.subitems.map(subitem => ({
                    ...subitem,
                    price: newPrice.toFixed(2),
                    tax_price: newTaxPrice
                }));
            }
        }

        // If updating total_line_price directly, recalculate price based on quantity
        if (field === 'total_line_price') {
            const totalPrice = parseFloat(value) || 0;
            const quantity = parseInt(currentItem.quantity || '1') || 1;
            const newPrice = quantity > 0 ? (totalPrice / quantity).toFixed(2) : '0.00';
            updatedItem = { ...updatedItem, price: newPrice };

            // Calculate tax automatically based on new price and current tax rate
            const newTaxPrice = (parseFloat(newPrice) * taxRate).toFixed(2);
            updatedItem = { ...updatedItem, tax_price: newTaxPrice };

            // Update subitems if they exist
            if (updatedItem.subitems && updatedItem.subitems.length > 0) {
                updatedItem.subitems = updatedItem.subitems.map(subitem => ({
                    ...subitem,
                    price: newPrice,
                    tax_price: newTaxPrice
                }));
            }
        }

        updatedItems[index] = updatedItem;

        setEditedReceipt({
            ...editedReceipt,
            analysis: {
                ...editedReceipt.analysis,
                items: updatedItems
            }
        });

        // Recalculate receipt totals after updating items
        setTimeout(() => {
            const updatedReceiptWithNewItems = {
                ...editedReceipt,
                analysis: {
                    ...editedReceipt.analysis,
                    items: updatedItems
                }
            };

            // Create a temporary state to recalculate totals
            const items = updatedItems;

            // Calculate new subtotal from all items
            const newSubtotal = items.reduce((sum, item) => {
                const totalLinePrice = parseFloat(item.total_line_price || '0') || 0;
                return sum + totalLinePrice;
            }, 0).toFixed(2);

            // Calculate new tax from all items
            const newTax = items.reduce((sum, item) => {
                const taxPrice = parseFloat(item.tax_price || '0') || 0;
                const quantity = parseInt(item.quantity || '1') || 1;
                return sum + (taxPrice * quantity);
            }, 0).toFixed(2);

            // Calculate new total (subtotal + tax + gratuity)
            const currentGratuity = parseFloat(editedReceipt.analysis.gratuity || '0') || 0;
            const newTotal = (parseFloat(newSubtotal) + parseFloat(newTax) + currentGratuity).toFixed(2);

            setEditedReceipt({
                ...editedReceipt,
                analysis: {
                    ...editedReceipt.analysis,
                    items: updatedItems,
                    subtotal: newSubtotal,
                    tax_amount: newTax,
                    total_amount: newTotal
                }
            });
        }, 0);
    };

    const updateReceiptField = (field: string, value: string) => {
        const updatedAnalysis = { ...editedReceipt.analysis, [field]: value };

        // Recalculate total when subtotal, tax, or gratuity changes
        if (field === 'subtotal' || field === 'tax_amount' || field === 'gratuity') {
            const subtotal = field === 'subtotal' ? parseFloat(value) || 0 : parseFloat(updatedAnalysis.subtotal || '0') || 0;
            const tax = field === 'tax_amount' ? parseFloat(value) || 0 : parseFloat(updatedAnalysis.tax_amount || '0') || 0;
            const gratuity = field === 'gratuity' ? parseFloat(value) || 0 : parseFloat(updatedAnalysis.gratuity || '0') || 0;

            const newTotal = (subtotal + tax + gratuity).toFixed(2);
            updatedAnalysis.total_amount = newTotal;
        }

        setEditedReceipt({
            ...editedReceipt,
            analysis: updatedAnalysis
        });
    };

    const recalculateReceiptTotals = () => {
        const items = editedReceipt.analysis.items || [];

        // Calculate new subtotal from all items
        const newSubtotal = items.reduce((sum, item) => {
            const totalLinePrice = parseFloat(item.total_line_price || '0') || 0;
            return sum + totalLinePrice;
        }, 0).toFixed(2);

        // Calculate new tax from all items
        const newTax = items.reduce((sum, item) => {
            const taxPrice = parseFloat(item.tax_price || '0') || 0;
            const quantity = parseInt(item.quantity || '1') || 1;
            return sum + (taxPrice * quantity);
        }, 0).toFixed(2);

        // Calculate new total (subtotal + tax + gratuity)
        const currentGratuity = parseFloat(editedReceipt.analysis.gratuity || '0') || 0;
        const newTotal = (parseFloat(newSubtotal) + parseFloat(newTax) + currentGratuity).toFixed(2);

        setEditedReceipt({
            ...editedReceipt,
            analysis: {
                ...editedReceipt.analysis,
                subtotal: newSubtotal,
                tax_amount: newTax,
                total_amount: newTotal
            }
        });
    };

    const updateTaxRate = (newTaxRate: number) => {
        setTaxRate(newTaxRate);

        // Recalculate tax for all items with new rate
        const updatedItems = editedReceipt.analysis.items.map(item => {
            const price = parseFloat(item.price || '0') || 0;
            const newTaxPrice = (price * newTaxRate).toFixed(2);

            return {
                ...item,
                tax_price: newTaxPrice,
                subitems: item.subitems?.map(subitem => ({
                    ...subitem,
                    tax_price: newTaxPrice
                }))
            };
        });

        setEditedReceipt({
            ...editedReceipt,
            analysis: {
                ...editedReceipt.analysis,
                items: updatedItems,
                tax_rate: `${(newTaxRate * 100).toFixed(2)}%`
            }
        });

        // Recalculate receipt totals after updating items
        setTimeout(() => {
            const items = updatedItems;

            // Calculate new subtotal from all items
            const newSubtotal = items.reduce((sum, item) => {
                const totalLinePrice = parseFloat(item.total_line_price || '0') || 0;
                return sum + totalLinePrice;
            }, 0).toFixed(2);

            // Calculate new tax from all items
            const newTax = items.reduce((sum, item) => {
                const taxPrice = parseFloat(item.tax_price || '0') || 0;
                const quantity = parseInt(item.quantity || '1') || 1;
                return sum + (taxPrice * quantity);
            }, 0).toFixed(2);

            // Calculate new total (subtotal + tax + gratuity)
            const currentGratuity = parseFloat(editedReceipt.analysis.gratuity || '0') || 0;
            const newTotal = (parseFloat(newSubtotal) + parseFloat(newTax) + currentGratuity).toFixed(2);

            setEditedReceipt({
                ...editedReceipt,
                analysis: {
                    ...editedReceipt.analysis,
                    items: updatedItems,
                    tax_rate: `${(newTaxRate * 100).toFixed(2)}%`,
                    subtotal: newSubtotal,
                    tax_amount: newTax,
                    total_amount: newTotal
                }
            });
        }, 0);
    };

    const updateGratuityRate = (newGratuityRate: number) => {
        setGratuityRate(newGratuityRate);

        // Calculate new gratuity amount based on subtotal
        const subtotal = parseFloat(editedReceipt.analysis.subtotal || '0') || 0;
        const newGratuityAmount = (subtotal * newGratuityRate).toFixed(2);

        // Calculate new total (subtotal + tax + new gratuity)
        const tax = parseFloat(editedReceipt.analysis.tax_amount || '0') || 0;
        const newTotal = (subtotal + tax + parseFloat(newGratuityAmount)).toFixed(2);

        setEditedReceipt({
            ...editedReceipt,
            analysis: {
                ...editedReceipt.analysis,
                gratuity: newGratuityAmount,
                gratuity_rate: `${(newGratuityRate * 100).toFixed(2)}%`,
                total_amount: newTotal
            }
        });
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                            {onUpdateReceipt && (
                                <>
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Save className="h-4 w-4" />
                                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                            </button>
                                            <button
                                                onClick={handleEditToggle}
                                                disabled={isSaving}
                                                className="px-3 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <X className="h-4 w-4" />
                                                <span>Cancel</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleEditToggle}
                                            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                            <span>Edit</span>
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => onStartAssignment(receipt)}
                                className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                            >
                                <Users className="h-4 w-4" />
                                <span>{receipt.isAssigned ? 'Reassign' : 'Assign'}</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {saveError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">{saveError}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Receipt Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Store className="h-5 w-5 text-gray-500" />
                                    <span className="font-medium text-gray-900">Store</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedReceipt.analysis.store_name || ''}
                                        onChange={(e) => updateReceiptField('store_name', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Store name"
                                    />
                                ) : (
                                    <p className="text-gray-600">
                                        {receipt.analysis.store_name || 'N/A'}
                                    </p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Calendar className="h-5 w-5 text-gray-500" />
                                    <span className="font-medium text-gray-900">Date</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedReceipt.analysis.date || ''}
                                        onChange={(e) => updateReceiptField('date', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Date"
                                    />
                                ) : (
                                    <p className="text-gray-600">
                                        {receipt.analysis.date || 'N/A'}
                                    </p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <DollarSign className="h-5 w-5 text-gray-500" />
                                    <span className="font-medium text-gray-900">Total</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedReceipt.analysis.total_amount || ''}
                                        onChange={(e) => updateReceiptField('total_amount', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Total amount"
                                    />
                                ) : (
                                    <p className="text-gray-600 font-semibold">
                                        {formatCurrency(receipt.analysis.total_amount)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Items List */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>

                            {receipt.analysis.items && receipt.analysis.items.length > 0 ? (
                                <div className="space-y-3">
                                    {(isEditing ? editedReceipt.analysis.items : receipt.analysis.items).map((item, index) => {
                                        const parseNum = (val: string | undefined | null) => parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;

                                        const perItemPrice = parseNum(item.price);
                                        const perItemTax = parseNum(item.tax_price);
                                        const quantity = parseInt(String(item.quantity).replace(/[^0-9]/g, '') || '1', 10);

                                        // Use total_line_price if available, otherwise calculate from per-item price
                                        const lineItemTotal = item.total_line_price ? parseNum(item.total_line_price) : perItemPrice * quantity;
                                        const lineItemTax = perItemTax * quantity;

                                        // Use the correct item data for display
                                        const displayItem = isEditing ? editedReceipt.analysis.items[index] : item;
                                        const displayPerItemTax = parseNum(displayItem.tax_price);
                                        const displayQuantity = parseInt(String(displayItem.quantity).replace(/[^0-9]/g, '') || '1', 10);
                                        const displayLineItemTax = displayPerItemTax * displayQuantity;

                                        return (
                                            <div key={index} className="pb-4 border-b last:border-b-0">
                                                <div className="flex justify-between items-baseline">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editedReceipt.analysis.items[index].name || ''}
                                                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                            className="flex-1 mr-4 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-lg"
                                                            placeholder="Item name"
                                                        />
                                                    ) : (
                                                        <h4 className="font-semibold text-lg text-gray-800">{item.name}</h4>
                                                    )}
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editedReceipt.analysis.items[index].price || ''}
                                                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                                                            className="w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                                            placeholder="Price"
                                                        />
                                                    ) : (
                                                        <p className="font-medium text-gray-800">
                                                            {formatCurrency(lineItemTotal.toString())}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-baseline text-sm text-gray-500 mt-1">
                                                    {isEditing ? (
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="number"
                                                                value={editedReceipt.analysis.items[index].quantity || '1'}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                className="w-16 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                min="1"
                                                            />
                                                            <span>x</span>
                                                            <input
                                                                type="text"
                                                                value={editedReceipt.analysis.items[index].price || ''}
                                                                onChange={(e) => updateItem(index, 'price', e.target.value)}
                                                                className="w-20 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="Price"
                                                            />
                                                            <span>=</span>
                                                            <input
                                                                type="text"
                                                                value={editedReceipt.analysis.items[index].total_line_price || ''}
                                                                onChange={(e) => updateItem(index, 'total_line_price', e.target.value)}
                                                                className="w-24 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="Total"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p>
                                                            {displayQuantity} x {formatCurrency(item.price)}
                                                        </p>
                                                    )}
                                                    {displayLineItemTax > 0 &&
                                                        <p>
                                                            + {formatCurrency(displayLineItemTax.toString())} Tax
                                                        </p>
                                                    }
                                                </div>

                                                {/* Tax Price Editor */}
                                                {isEditing && (
                                                    <div className="mt-2 flex items-center space-x-2 text-sm">
                                                        <span className="text-gray-500">Tax:</span>
                                                        <span className="text-gray-700 font-medium">
                                                            {formatCurrency(displayItem.tax_price)}
                                                        </span>
                                                        <span className="text-gray-400">(× {displayQuantity} = {formatCurrency(displayLineItemTax.toString())})</span>
                                                    </div>
                                                )}

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
                        {(receipt.analysis.subtotal !== 'N/A' || receipt.analysis.tax_amount !== 'N/A') && (
                            <div className="border-t border-gray-200 pt-4">
                                <div className="space-y-2">
                                    {receipt.analysis.subtotal !== 'N/A' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Subtotal:</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editedReceipt.analysis.subtotal || ''}
                                                    onChange={(e) => updateReceiptField('subtotal', e.target.value)}
                                                    className="w-32 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-right"
                                                    placeholder="Subtotal"
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-900">
                                                    {formatCurrency(receipt.analysis.subtotal)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {receipt.analysis.tax_amount !== 'N/A' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Tax {isEditing ? (
                                                    <span>
                                                        (
                                                        <input
                                                            type="number"
                                                            value={(taxRate * 100).toFixed(1)}
                                                            onChange={(e) => {
                                                                const newRate = parseFloat(e.target.value) / 100;
                                                                if (!isNaN(newRate) && newRate >= 0) {
                                                                    updateTaxRate(newRate);
                                                                }
                                                            }}
                                                            className="w-12 p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center text-xs"
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                        />
                                                        %)
                                                    </span>
                                                ) : (
                                                    formatTaxPercentage(receipt.analysis.tax_amount, receipt.analysis.subtotal)
                                                )}:
                                            </span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editedReceipt.analysis.tax_amount || ''}
                                                    onChange={(e) => updateReceiptField('tax_amount', e.target.value)}
                                                    className="w-32 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-right"
                                                    placeholder="Tax amount"
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-900">
                                                    {formatCurrency(receipt.analysis.tax_amount)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {receipt.analysis.gratuity && receipt.analysis.gratuity !== 'N/A' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Gratuity {isEditing ? (
                                                    <span>
                                                        (
                                                        <input
                                                            type="number"
                                                            value={(gratuityRate * 100).toFixed(1)}
                                                            onChange={(e) => {
                                                                const newRate = parseFloat(e.target.value) / 100;
                                                                if (!isNaN(newRate) && newRate >= 0) {
                                                                    updateGratuityRate(newRate);
                                                                }
                                                            }}
                                                            className="w-12 p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center text-xs"
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                        />
                                                        %)
                                                    </span>
                                                ) : (
                                                    receipt.analysis.gratuity_rate && `(${receipt.analysis.gratuity_rate})`
                                                )}:
                                            </span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editedReceipt.analysis.gratuity || ''}
                                                    onChange={(e) => updateReceiptField('gratuity', e.target.value)}
                                                    className="w-32 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-right"
                                                    placeholder="Gratuity"
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-900">
                                                    {formatCurrency(receipt.analysis.gratuity)}
                                                </span>
                                            )}
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
                                    {JSON.stringify(receipt, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                    <div className="flex justify-end items-center space-x-2 text-md">
                        <span className="text-gray-600">Subtotal: {formatCurrency(isEditing ? editedReceipt.analysis.subtotal : receipt.analysis.subtotal)}</span>
                        <span className="text-gray-500">+</span>
                        <span className="text-gray-600">
                            Tax {formatTaxPercentage(isEditing ? editedReceipt.analysis.tax_amount : receipt.analysis.tax_amount, isEditing ? editedReceipt.analysis.subtotal : receipt.analysis.subtotal)}: {formatCurrency(isEditing ? editedReceipt.analysis.tax_amount : receipt.analysis.tax_amount)}
                        </span>
                        {(isEditing ? editedReceipt.analysis.gratuity : receipt.analysis.gratuity) && (isEditing ? editedReceipt.analysis.gratuity : receipt.analysis.gratuity) !== 'N/A' && (
                            <>
                                <span className="text-gray-500">+</span>
                                <span className="text-gray-600">
                                    Gratuity {(isEditing ? editedReceipt.analysis.gratuity_rate : receipt.analysis.gratuity_rate) && `(${(isEditing ? editedReceipt.analysis.gratuity_rate : receipt.analysis.gratuity_rate)})`}: {formatCurrency(isEditing ? editedReceipt.analysis.gratuity : receipt.analysis.gratuity)}
                                </span>
                            </>
                        )}
                        <span className="text-gray-500">=</span>
                        <span className="font-bold text-gray-900">Total: {formatCurrency(isEditing ? editedReceipt.analysis.total_amount : receipt.analysis.total_amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptDetailsModal; 