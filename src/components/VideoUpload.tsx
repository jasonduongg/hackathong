'use client';

import React, { useState, useRef } from 'react';

interface VideoUploadProps {
    onClose: () => void;
}

interface ProcessingResult {
    success: boolean;
    message: string;
    filename?: string;
    provider?: string;
    promptType?: string;
    llmResponse?: {
        provider: string;
        promptType: string;
        analysis: string;
        timestamp: string;
    };
}

export function VideoUpload({ onClose }: VideoUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState<ProcessingResult | null>(null);
    const [error, setError] = useState<string>('');
    const [promptType, setPromptType] = useState<'general' | 'security' | 'educational' | 'sports' | 'custom'>('general');
    const [provider, setProvider] = useState<'openai' | 'anthropic' | 'gemini'>('openai');
    const [customInstructions, setCustomInstructions] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('video/')) {
                setError('Please select a valid video file');
                return;
            }

            // Validate file size (100MB limit)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (file.size > maxSize) {
                setError('File size too large. Maximum size is 100MB');
                return;
            }

            setSelectedFile(file);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a video file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('video', selectedFile);
            formData.append('promptType', promptType);
            formData.append('provider', provider);

            if (promptType === 'custom' && customInstructions) {
                formData.append('customInstructions', customInstructions);
            }

            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await fetch('/api/process-video', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();

            if (response.ok) {
                setResult(data);
            } else {
                setError(data.error || 'Failed to process video');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setError('');
            setResult(null);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setError('');
        setResult(null);
        setUploadProgress(0);
        setPromptType('general');
        setProvider('openai');
        setCustomInstructions('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Video Analysis</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {!result ? (
                        <>
                            {/* File Upload Section */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Video
                                </label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-600">
                                        {selectedFile ? selectedFile.name : 'Click to select or drag and drop a video file'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Maximum file size: 100MB</p>
                                </div>
                            </div>

                            {/* Analysis Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Analysis Type
                                    </label>
                                    <select
                                        value={promptType}
                                        onChange={(e) => setPromptType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="general">General Analysis</option>
                                        <option value="security">Security Analysis</option>
                                        <option value="educational">Educational Analysis</option>
                                        <option value="sports">Sports Analysis</option>
                                        <option value="custom">Custom Analysis</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        AI Provider
                                    </label>
                                    <select
                                        value={provider}
                                        onChange={(e) => setProvider(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="openai">OpenAI GPT-4V</option>
                                        <option value="anthropic">Anthropic Claude</option>
                                        <option value="gemini">Google Gemini</option>
                                    </select>
                                </div>
                            </div>

                            {/* Custom Instructions */}
                            {promptType === 'custom' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Custom Instructions
                                    </label>
                                    <textarea
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        placeholder="Enter your specific analysis requirements..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        rows={3}
                                    />
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}

                            {/* Upload Progress */}
                            {isUploading && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Processing video...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                    disabled={isUploading}
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || isUploading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'Processing...' : 'Analyze Video'}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Results Display */
                        <div>
                            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                                ✅ {result.message}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <h3 className="font-semibold text-gray-900 mb-2">Analysis Results</h3>
                                <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Provider:</span> {result.llmResponse?.provider}</div>
                                    <div><span className="font-medium">Analysis Type:</span> {result.llmResponse?.promptType}</div>
                                    <div><span className="font-medium">Timestamp:</span> {new Date(result.llmResponse?.timestamp || '').toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-900 mb-2">Analysis</h3>
                                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                                    <p className="text-gray-700 whitespace-pre-wrap">
                                        {result.llmResponse?.analysis}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Analyze Another Video
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 