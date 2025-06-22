'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { PartyReceipt } from '@/types/receipt'; // Assuming a shared type definition

interface PartyContextType {
    receipts: PartyReceipt[];
    setReceipts: React.Dispatch<React.SetStateAction<PartyReceipt[]>>;
    addReceipt: (newReceipt: PartyReceipt) => void;
    removeReceipt: (receiptId: string) => void;
    updateReceipt: (updatedReceipt: PartyReceipt) => void;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    fetchReceipts: (partyId: string) => Promise<void>;
}

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider = ({ children, partyId }: { children: ReactNode, partyId: string }) => {
    const [receipts, setReceipts] = useState<PartyReceipt[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReceipts = useCallback(async (partyId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/party-receipts?partyId=${partyId}`);
            const result = await response.json();

            if (response.ok) {
                setReceipts(result.receipts || []);
            } else {
                console.error('Failed to fetch receipts:', result.error);
                setReceipts([]);
            }
        } catch (error) {
            console.error('Error fetching receipts:', error);
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Automatically fetch receipts when the provider initializes
    useEffect(() => {
        if (partyId) {
            fetchReceipts(partyId);
        }
    }, [partyId, fetchReceipts]);

    const addReceipt = (newReceipt: PartyReceipt) => {
        setReceipts(prev => [newReceipt, ...prev]);
    };

    const removeReceipt = (receiptId: string) => {
        setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
    };

    const updateReceipt = (updatedReceipt: PartyReceipt) => {
        setReceipts(prev => prev.map(receipt =>
            receipt.id === updatedReceipt.id ? updatedReceipt : receipt
        ));
    };

    return (
        <PartyContext.Provider value={{ receipts, setReceipts, addReceipt, removeReceipt, updateReceipt, loading, setLoading, fetchReceipts }}>
            {children}
        </PartyContext.Provider>
    );
};

export const useParty = () => {
    const context = useContext(PartyContext);
    if (context === undefined) {
        throw new Error('useParty must be used within a PartyProvider');
    }
    return context;
}; 