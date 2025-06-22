'use client';

import React, { useState } from 'react';
import SingleParty from './SingleParty';
import { PartyList } from './PartyList';

export const PartyView: React.FC = () => {
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

    const handlePartyClick = (partyId: string) => {
        setSelectedPartyId(partyId);
    };

    return (
        <div className="flex">
            {/* Left side - Party List */}
            <PartyList
                onPartySelect={handlePartyClick}
                selectedPartyId={selectedPartyId}
            />

            {/* Right side - Content Area (3/4) */}
            <div className="w-3/4 bg-white">
                {selectedPartyId ? (
                    <SingleParty partyId={selectedPartyId} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                            <h3 className="text-xl font-medium mb-2">Select a Party</h3>
                            <p className="text-sm">Choose a party from the list to view its details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}; 