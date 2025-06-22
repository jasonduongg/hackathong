'use client';

import React, { useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { useParty } from '@/contexts/PartyContext';
import { PartyReceipt } from '@/types/receipt';
import { UserProfile } from '@/lib/users';
import ItemAssignmentFlow from './ItemAssignmentFlow';
import ReceiptCard from './ReceiptCard';
import ReceiptImageModal from './ReceiptImageModal';
import ReceiptDetailsModal from './ReceiptDetailsModal';

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

    const handleUpdateReceipt = async (updatedReceipt: PartyReceipt) => {
        try {
            // Call the API to update the receipt in the database
            const response = await fetch('/api/update-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiptId: updatedReceipt.id,
                    updatedReceipt
                }),
            });

            if (response.ok) {
                // Update the receipt in the context only after successful database update
                if (updateReceipt) {
                    updateReceipt(updatedReceipt);
                }
                setShowDetails(false);
            } else {
                console.error('Failed to update receipt in database');
                // You might want to show an error message to the user here
            }
        } catch (error) {
            console.error('Error updating receipt:', error);
            // You might want to show an error message to the user here
        }
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
            <div className="">
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
                            <ReceiptCard
                                key={receipt.id}
                                receipt={receipt}
                                memberProfiles={memberProfiles}
                                onViewDetails={handleViewDetails}
                                onViewImage={handleViewImage}
                                onRefreshUrl={refreshSignedUrl}
                                onDelete={deleteReceipt}
                                refreshingUrl={refreshingUrl}
                                deletingReceipt={deletingReceipt}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Receipt Image Modal */}
            {showImage && selectedReceipt && (
                <ReceiptImageModal
                    receipt={selectedReceipt}
                    onClose={() => setShowImage(false)}
                    onRefreshUrl={refreshSignedUrl}
                />
            )}

            {/* Receipt Details Modal */}
            {showDetails && selectedReceipt && (
                <ReceiptDetailsModal
                    receipt={selectedReceipt}
                    memberProfiles={memberProfiles}
                    onClose={() => setShowDetails(false)}
                    onStartAssignment={handleStartAssignment}
                    onUpdateReceipt={handleUpdateReceipt}
                />
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