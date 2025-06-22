'use client';

import React, { useEffect } from 'react';
import { Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
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

const ITEMS_PER_PAGE = 5;

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
    const [currentPage, setCurrentPage] = React.useState(1);

    useEffect(() => {
        fetchReceipts(partyId);
    }, [partyId, fetchReceipts]);

    // Reset to first page when receipts change
    useEffect(() => {
        setCurrentPage(1);
    }, [receipts.length]);

    // Calculate pagination
    const totalPages = Math.ceil(receipts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentReceipts = receipts.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

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
            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                            </div>
                            <div className="flex-shrink-0 space-y-2">
                                <div className="h-8 bg-gray-200 rounded w-16"></div>
                                <div className="h-8 bg-gray-200 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Receipts List */}
            <div className="">
                {receipts.length === 0 ? (
                    <div className="text-center py-8">
                        <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No receipts uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Upload a receipt to get started</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {currentReceipts.map((receipt) => (
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

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-700">
                                        Showing {startIndex + 1} to {Math.min(endIndex, receipts.length)} of {receipts.length} receipts
                                    </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={goToPreviousPage}
                                        disabled={currentPage === 1}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Previous page"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-center space-x-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`px-3 py-1 text-sm rounded-md transition-colors ${currentPage === page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Next page"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
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