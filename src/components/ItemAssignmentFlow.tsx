'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Users, DollarSign } from 'lucide-react';
import { PartyReceipt, ReceiptItem } from '@/types/receipt';
import { UserProfile } from '@/lib/users';

interface ItemAssignmentFlowProps {
    receipt: PartyReceipt;
    memberProfiles: UserProfile[];
    onClose: () => void;
    onAssignmentComplete: (updatedReceipt: PartyReceipt) => void;
}

interface AssignmentState {
    [itemIndex: number]: {
        assignedTo: string[];
        assignedAmounts: { [userId: string]: number };
    };
}

const ItemAssignmentFlow: React.FC<ItemAssignmentFlowProps> = ({
    receipt,
    memberProfiles,
    onClose,
    onAssignmentComplete
}) => {
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [assignments, setAssignments] = useState<AssignmentState>({});
    const [loading, setLoading] = useState(false);

    const items = receipt.analysis.items || [];
    const currentItem = items[currentItemIndex];

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

    useEffect(() => {
        // Initialize assignments for all items
        const initialAssignments: AssignmentState = {};
        items.forEach((_, index) => {
            initialAssignments[index] = {
                assignedTo: [],
                assignedAmounts: {}
            };
        });
        setAssignments(initialAssignments);
    }, [items]);

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;
        if (isNaN(num)) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(num);
    };

    const getItemTotal = (item: ReceiptItem) => {
        if (item.total_line_price) {
            return parseFloat(item.total_line_price.replace(/[^0-9.-]/g, ''));
        }
        const price = parseFloat(item.price.replace(/[^0-9.-]/g, ''));
        const quantity = parseInt(item.quantity || '1');
        return price * quantity;
    };

    const handleMemberToggle = (userId: string) => {
        const currentAssignment = assignments[currentItemIndex];
        const isAssigned = currentAssignment.assignedTo.includes(userId);

        let newAssignedTo: string[];
        let newAssignedAmounts: { [userId: string]: number };

        if (isAssigned) {
            // Remove member
            newAssignedTo = currentAssignment.assignedTo.filter(id => id !== userId);
            newAssignedAmounts = { ...currentAssignment.assignedAmounts };
            delete newAssignedAmounts[userId];
        } else {
            // Add member
            newAssignedTo = [...currentAssignment.assignedTo, userId];
            newAssignedAmounts = { ...currentAssignment.assignedAmounts };
        }

        // Recalculate amounts
        const itemTotal = getItemTotal(currentItem);
        const memberCount = newAssignedTo.length;

        if (memberCount > 0) {
            const amountPerPerson = itemTotal / memberCount;
            newAssignedTo.forEach(memberId => {
                newAssignedAmounts[memberId] = amountPerPerson;
            });
        }

        setAssignments(prev => ({
            ...prev,
            [currentItemIndex]: {
                assignedTo: newAssignedTo,
                assignedAmounts: newAssignedAmounts
            }
        }));
    };

    const handleNext = () => {
        if (currentItemIndex < items.length - 1) {
            setCurrentItemIndex(currentItemIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentItemIndex > 0) {
            setCurrentItemIndex(currentItemIndex - 1);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            // Update receipt with assignments
            const updatedItems = items.map((item, index) => ({
                ...item,
                assignedTo: assignments[index]?.assignedTo || [],
                assignedAmounts: assignments[index]?.assignedAmounts || {}
            }));

            // Calculate total amounts for each member from items only
            const memberItemAmounts: { [userId: string]: number } = {};
            memberProfiles.forEach(member => {
                memberItemAmounts[member.uid] = 0;
            });

            updatedItems.forEach(item => {
                if (item.assignedAmounts) {
                    Object.entries(item.assignedAmounts).forEach(([userId, amount]) => {
                        memberItemAmounts[userId] = (memberItemAmounts[userId] || 0) + amount;
                    });
                }
            });

            // Calculate total tax and tip from receipt
            const totalTax = parseFloat(receipt.analysis.tax_amount?.replace(/[^0-9.-]/g, '') || '0');
            const totalTip = parseFloat(receipt.analysis.gratuity?.replace(/[^0-9.-]/g, '') || '0');
            const totalTaxAndTip = totalTax + totalTip;

            // Calculate total assigned amount (sum of all item assignments)
            const totalAssignedAmount = Object.values(memberItemAmounts).reduce((sum, amount) => sum + amount, 0);

            // Distribute tax and tip proportionally based on each person's assigned amount
            const memberAmounts: { [userId: string]: number } = {};

            if (totalAssignedAmount > 0 && totalTaxAndTip > 0) {
                Object.entries(memberItemAmounts).forEach(([userId, itemAmount]) => {
                    const taxAndTipRatio = itemAmount / totalAssignedAmount;
                    const taxAndTipShare = totalTaxAndTip * taxAndTipRatio;
                    memberAmounts[userId] = itemAmount + taxAndTipShare;
                });
            } else {
                // If no tax/tip or no assignments, just use item amounts
                Object.assign(memberAmounts, memberItemAmounts);
            }

            const updatedReceipt: PartyReceipt = {
                ...receipt,
                analysis: {
                    ...receipt.analysis,
                    items: updatedItems
                },
                isAssigned: true,
                memberAmounts
            };

            // Save to database
            const response = await fetch('/api/update-receipt-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiptId: receipt.id, assignments: updatedReceipt }),
            });

            if (response.ok) {
                onAssignmentComplete(updatedReceipt);
            } else {
                throw new Error('Failed to save assignments');
            }
        } catch (error) {
            console.error('Error saving assignments:', error);
            alert('Failed to save assignments. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const currentAssignment = assignments[currentItemIndex];
    const itemTotal = currentItem ? getItemTotal(currentItem) : 0;
    const assignedCount = currentAssignment?.assignedTo.length || 0;
    const amountPerPerson = assignedCount > 0 ? itemTotal / assignedCount : 0;

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Assign Items</h2>
                            <div className="flex items-center space-x-3 mt-1">
                                <p className="text-sm text-gray-500">
                                    Item {currentItemIndex + 1} of {items.length}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Progress</span>
                            <span>{Math.round(((currentItemIndex + 1) / items.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((currentItemIndex + 1) / items.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Current Item */}
                    {currentItem && (
                        <div className="mb-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-3">
                                        {currentItem.quantity && parseInt(currentItem.quantity) > 1 && (
                                            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-lg font-bold">
                                                {currentItem.quantity}
                                            </div>
                                        )}
                                        <h3 className="text-lg font-semibold text-gray-900">{currentItem.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatCurrency(itemTotal)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {currentItem.quantity && parseInt(currentItem.quantity) > 1
                                                ? `${currentItem.quantity} x ${formatCurrency(currentItem.price)}`
                                                : formatCurrency(currentItem.price)
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Member Selection */}
                            <div className="mb-6">
                                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    Select who's paying for this item
                                </h4>
                                <div className="space-y-2">
                                    {memberProfiles.map((member) => {
                                        const isSelected = currentAssignment?.assignedTo.includes(member.uid) || false;
                                        const displayName = member.displayName || member.email?.split('@')[0] || 'Unknown';

                                        return (
                                            <button
                                                key={member.uid}
                                                onClick={() => handleMemberToggle(member.uid)}
                                                className={`w-full p-3 rounded-lg border-2 transition-all ${isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                                            <span className="text-white text-sm font-medium">
                                                                {displayName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-medium text-gray-900">{displayName}</p>
                                                            <p className="text-sm text-gray-500">{member.email}</p>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-600">
                                                                {formatCurrency(amountPerPerson)}
                                                            </span>
                                                            <Check className="h-4 w-4 text-blue-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Assignment Summary */}
                            {assignedCount > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-800">
                                                {assignedCount} {assignedCount === 1 ? 'person' : 'people'} selected
                                            </p>
                                            <p className="text-sm text-green-600">
                                                {formatCurrency(amountPerPerson)} each
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-green-600">Total</p>
                                            <p className="text-lg font-bold text-green-800">
                                                {formatCurrency(itemTotal)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Tax and Tip Distribution Note */}
                                    <div className="mt-3 pt-3 border-t border-green-200">
                                        <p className="text-xs text-green-700">
                                            💡 Tax and tip will be distributed proportionally based on each person's total assigned amount.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tax and Tip Distribution Summary (Final Step) */}
                            {currentItemIndex === items.length - 1 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <h4 className="text-md font-medium text-blue-900 mb-3 flex items-center">
                                        <DollarSign className="h-4 w-4 mr-2" />
                                        Tax & Tip Distribution Summary
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Total Tax:</span>
                                            <span className="font-medium text-blue-900">
                                                {formatCurrency(receipt.analysis.tax_amount)}
                                            </span>
                                        </div>
                                        {receipt.analysis.gratuity && receipt.analysis.gratuity !== 'N/A' && (
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">Total Tip:</span>
                                                <span className="font-medium text-blue-900">
                                                    {formatCurrency(receipt.analysis.gratuity)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 border-t border-blue-200">
                                            <span className="text-blue-700 font-medium">Total Tax + Tip:</span>
                                            <span className="font-bold text-blue-900">
                                                {formatCurrency(
                                                    (parseFloat(receipt.analysis.tax_amount?.replace(/[^0-9.-]/g, '') || '0') +
                                                        parseFloat(receipt.analysis.gratuity?.replace(/[^0-9.-]/g, '') || '0')).toString()
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2">
                                            These amounts will be distributed proportionally based on each person's assigned item total.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <button
                            onClick={handlePrevious}
                            disabled={currentItemIndex === 0}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Previous</span>
                        </button>

                        {currentItemIndex === items.length - 1 ? (
                            <button
                                onClick={handleComplete}
                                disabled={loading || assignedCount === 0}
                                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                <span>Complete Assignment</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={assignedCount === 0}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Next</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemAssignmentFlow; 