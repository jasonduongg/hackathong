'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getParty,
    searchUsersByEmail,
    createInvitation,
    addMemberToParty,
    Party
} from '@/lib/parties';
import { getUserProfilesByIds, UserProfile } from '@/lib/users';
import PartyReceiptUpload from './PartyReceiptUpload';
import PartyReceipts from './PartyReceipts';
import { PartyProvider } from '@/contexts/PartyContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PartyDetails } from '@/types/party';

interface SinglePartyProps {
    partyId: string;
}

interface PartyReceipt {
    id: string;
    partyId: string;
    fileName: string;
    fileSize: number;
    analysis: any;
    rawResponse: string;
    uploadedAt: any;
}

const SingleParty: React.FC<SinglePartyProps> = ({ partyId }) => {
    const [party, setParty] = useState<PartyDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPartyDetails = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'parties', partyId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setParty({ id: docSnap.id, ...docSnap.data() } as PartyDetails);
                } else {
                    console.log('No such document!');
                    setParty(null);
                }
            } catch (error) {
                console.error("Error fetching party details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (partyId) {
            fetchPartyDetails();
        }
    }, [partyId]);

    if (loading) {
        return <div className="text-center py-10">Loading party details...</div>;
    }

    if (!party) {
        return <div className="text-center py-10">Party not found</div>;
    }

    return (
        <PartyProvider partyId={partyId}>
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="border-b border-gray-200 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900">{party.name}</h1>
                    <p className="mt-1 text-sm text-gray-600">{party.description}</p>
                </div>
                <div className="mt-8">
                    <PartyReceiptUpload partyId={partyId} />
                </div>
                <div className="mt-8">
                    <PartyReceipts partyId={partyId} />
                </div>
            </div>
        </PartyProvider>
    );
};

export default SingleParty; 