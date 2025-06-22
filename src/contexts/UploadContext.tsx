'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReceiptData } from '@/types/receipt';

interface ReceiptAnalysis {
    success: boolean;
    data: ReceiptData;
    raw_response: string;
    receiptId: string;
}

interface UploadState {
    // File state
    selectedFile: File | null;

    // Upload state
    isUploading: boolean;
    isDragOver: boolean;

    // Analysis state
    analysis: ReceiptAnalysis | null;
    error: string | null;
}

interface UploadContextType {
    state: UploadState;
    setSelectedFile: (file: File | null) => void;
    setIsUploading: (uploading: boolean) => void;
    setIsDragOver: (dragOver: boolean) => void;
    setAnalysis: (analysis: ReceiptAnalysis | null) => void;
    setError: (error: string | null) => void;
    resetState: () => void;
    clearError: () => void;
}

const initialState: UploadState = {
    selectedFile: null,
    isUploading: false,
    isDragOver: false,
    analysis: null,
    error: null
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<UploadState>(initialState);

    const setSelectedFile = (selectedFile: File | null) => {
        setState(prev => ({ ...prev, selectedFile, error: null }));
    };

    const setIsUploading = (isUploading: boolean) => {
        setState(prev => ({ ...prev, isUploading }));
    };

    const setIsDragOver = (isDragOver: boolean) => {
        setState(prev => ({ ...prev, isDragOver }));
    };

    const setAnalysis = (analysis: ReceiptAnalysis | null) => {
        setState(prev => ({ ...prev, analysis }));
    };

    const setError = (error: string | null) => {
        setState(prev => ({ ...prev, error }));
    };

    const resetState = () => {
        setState(initialState);
    };

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    const value: UploadContextType = {
        state,
        setSelectedFile,
        setIsUploading,
        setIsDragOver,
        setAnalysis,
        setError,
        resetState,
        clearError
    };

    return (
        <UploadContext.Provider value={value}>
            {children}
        </UploadContext.Provider>
    );
};

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (context === undefined) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
}; 