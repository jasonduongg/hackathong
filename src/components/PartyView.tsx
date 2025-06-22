'use client';

import React, { useState, useRef } from 'react';
import SingleParty from './SingleParty';
import { PartyList, PartyListRef } from './PartyList';

export const PartyView: React.FC = () => {
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
    const partyListRef = useRef<PartyListRef>(null);

    const handlePartyClick = (partyId: string) => {
        setSelectedPartyId(partyId);
    };

    const handlePartyDeleted = async () => {
        setSelectedPartyId(null);
        // Refresh the party list to remove the deleted party
        await partyListRef.current?.refreshParties();
    };

    return (
        <div className="flex">
            {/* Left side - Party List */}
            <PartyList
                ref={partyListRef}
                onPartySelect={handlePartyClick}
                selectedPartyId={selectedPartyId}
            />

            {/* Right side - Content Area (3/4) */}
            <div className="w-3/4 bg-white">
                {selectedPartyId ? (
                    <SingleParty partyId={selectedPartyId} onPartyDeleted={handlePartyDeleted} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 -mt-32">
                            <h3 className="text-xl font-medium mb-2">Select a Party</h3>
                            <p className="text-sm">Choose a party from the list to view its details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}; 