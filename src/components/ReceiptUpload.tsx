'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, DollarSign, Calendar, Store, Loader2 } from 'lucide-react';
import { ReceiptData, ReceiptItem } from '@/types/receipt';

interface ReceiptAnalysis {
    success: boolean;
    data: ReceiptData;
    raw_response: string;
}

const ReceiptUpload: React.FC = () => {
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

            const response = await fetch('/api/analyze-receipt', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to analyze receipt');
            }

            setAnalysis(result);
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
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Receipt Analyzer
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Upload a receipt image and get an itemized breakdown with prices
                </p>
            </div>

            {/* Upload Area */}
            <div
                className={`max-w-4xl mx-auto p-6 rounded-lg text-center transition-colors ${isDragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />

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
                        PNG, JPG, GIF, WebP
                    </p>
                </div>
            </div>

            {/* Selected File */}
            {selectedFile && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {selectedFile.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={analyzeReceipt}
                            disabled={isUploading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <DollarSign className="h-4 w-4" />
                                    <span>Analyze Receipt</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Receipt Analysis
                    </h2>

                    {/* Receipt Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Store className="h-5 w-5 text-gray-500" />
                                <span className="font-medium text-gray-900 dark:text-white">Store</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300">
                                {analysis.data.store_name || 'N/A'}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Calendar className="h-5 w-5 text-gray-500" />
                                <span className="font-medium text-gray-900 dark:text-white">Date</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300">
                                {analysis.data.date || 'N/A'}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <DollarSign className="h-5 w-5 text-gray-500" />
                                <span className="font-medium text-gray-900 dark:text-white">Total</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 font-semibold">
                                {formatCurrency(analysis.data.total_amount)}
                            </p>
                        </div>
                    </div>

                    {/* Items List */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Items
                        </h3>

                        {analysis.data.items && analysis.data.items.length > 0 ? (
                            <div className="space-y-3">
                                {analysis.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                    >
                                        <div className="flex justify-between items-center py-3">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {item.name}
                                                </p>
                                                {item.quantity && item.quantity !== 'N/A' && (
                                                    <p className="text-sm text-gray-500">
                                                        Qty: {item.quantity}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(item.total_line_price || item.price)}
                                                </p>
                                                {item.total_line_price && item.quantity && item.quantity !== 'N/A' && (
                                                    <p className="text-xs text-gray-500">
                                                        {formatCurrency(item.price)} each
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Display subitems if they exist */}
                                        {item.subitems && item.subitems.length > 0 && (
                                            <div className="ml-4 mb-3 space-y-1">
                                                {item.subitems.map((subitem, subIndex) => (
                                                    <div key={subIndex} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="ml-2">• {subitem.name}</span>
                                                        {subitem.price && subitem.price !== 'N/A' && (
                                                            <span className="text-gray-500 dark:text-gray-500">
                                                                {formatCurrency(subitem.price)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">
                                No items found in the receipt
                            </p>
                        )}
                    </div>

                    {/* Additional Details */}
                    {(analysis.data.subtotal !== 'N/A' || analysis.data.tax_amount !== 'N/A') && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="space-y-2">
                                {analysis.data.subtotal !== 'N/A' && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(analysis.data.subtotal)}
                                        </span>
                                    </div>
                                )}
                                {analysis.data.tax_amount !== 'N/A' && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(analysis.data.tax_amount)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReceiptUpload; 