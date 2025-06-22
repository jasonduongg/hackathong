'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, DollarSign, Calendar, Store, Loader2, X, Receipt } from 'lucide-react';
import { PartyReceipt, ReceiptData, ReceiptItem, ReceiptSubItem } from '@/types/receipt';
import { useParty } from '@/contexts/PartyContext';

interface ReceiptAnalysis {
    success: boolean;
    data: ReceiptData;
    raw_response: string;
    receiptId: string;
}

interface PartyReceiptUploadProps {
    partyId: string;
}

const PartyReceiptUpload: React.FC<PartyReceiptUploadProps> = ({ partyId }) => {
    const { addReceipt } = useParty();
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, []);

    const handleFileSelect = (file: File) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setSelectedFile(file);
        setError(null);
        setAnalysis(null);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const analyzeReceipt = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('partyId', partyId);

            const response = await fetch('/api/analyze-receipt', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to analyze receipt');
            }

            setAnalysis(result);

            const newReceipt: PartyReceipt = {
                id: result.receiptId,
                partyId,
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                s3Key: result.s3Key,
                s3Bucket: result.data.store_name,
                downloadURL: result.downloadURL,
                analysis: result.data,
                rawResponse: result.raw_response,
                uploadedAt: new Date(),
            };
            addReceipt(newReceipt);

            // Reset form after successful upload
            setTimeout(() => {
                setSelectedFile(null);
                setAnalysis(null);
            }, 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while analyzing the receipt');
        } finally {
            setIsUploading(false);
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

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div className="">
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileInputChange}
                    />

                    <div className="space-y-4">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />

                        <div>
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer text-blue-600 hover:text-blue-500 font-medium"
                            >
                                Click to upload
                            </label>
                            <span className="text-gray-500"> or drag and drop</span>
                        </div>

                        <p className="text-sm text-gray-500">
                            PNG, JPG, GIF, WebP up to 10MB
                        </p>
                    </div>
                </div>

                {/* Selected File */}
                {selectedFile && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={analyzeReceipt}
                                    disabled={isUploading}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign className="h-3 w-3" />
                                            <span>Analyze</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-800">Receipt analyzed successfully!</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600">Store:</span>
                                <p className="font-medium">{analysis.data.store_name || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Date:</span>
                                <p className="font-medium">{analysis.data.date || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Total:</span>
                                <p className="font-medium">{formatCurrency(analysis.data.total_amount)}</p>
                            </div>
                        </div>

                        {analysis.data.items && analysis.data.items.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-600 mb-2">Items found: {analysis.data.items.length}</p>
                                <div className="space-y-1">
                                    {analysis.data.items.slice(0, 3).map((item, index) => (
                                        <div key={index}>
                                            <div className="flex justify-between text-xs">
                                                <span className="truncate">{item.name}</span>
                                                <span className="font-medium">{formatCurrency(item.price)}</span>
                                            </div>
                                            {/* Show subitems if they exist */}
                                            {item.subitems && item.subitems.length > 0 && (
                                                <div className="ml-2 mt-1 space-y-0.5">
                                                    {item.subitems.slice(0, 2).map((subitem, subIndex) => (
                                                        <div key={subIndex} className="flex justify-between text-xs text-gray-500">
                                                            <span className="truncate">• {subitem.name}</span>
                                                            <div className="flex space-x-1">
                                                                {subitem.crv_price && parseFloat(subitem.crv_price) > 0 && (
                                                                    <span>CRV: {formatCurrency(subitem.crv_price)}</span>
                                                                )}
                                                                {subitem.tax_price && parseFloat(subitem.tax_price) > 0 && (
                                                                    <span>Tax: {formatCurrency(subitem.tax_price)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {item.subitems.length > 2 && (
                                                        <p className="text-xs text-gray-400">...and {item.subitems.length - 2} more subitems</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {analysis.data.items.length > 3 && (
                                        <p className="text-xs text-gray-500">...and {analysis.data.items.length - 3} more items</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartyReceiptUpload; 