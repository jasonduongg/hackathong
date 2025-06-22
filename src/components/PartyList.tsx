'use client';

import React, { useState } from 'react';
import { Party } from '@/lib/parties';
import { UserProfile } from '@/lib/users';

interface PartyListProps {
    parties: Party[];
    memberProfiles: { [partyId: string]: UserProfile[] };
    selectedPartyId: string | null;
    onPartyClick: (partyId: string) => void;
    onShowCreateParty: () => void;
}

export const PartyList: React.FC<PartyListProps> = ({
    parties,
    memberProfiles,
    selectedPartyId,
    onPartyClick,
    onShowCreateParty
}) => {
    // Helper function to get display name or initial for a user
    const getUserDisplay = (profile: UserProfile) => {
        if (profile.photoURL) {
            return { type: 'image' as const, value: profile.photoURL };
        }
        const initial = profile.displayName?.charAt(0)?.toUpperCase() ||
            profile.email?.charAt(0)?.toUpperCase() || 'U';
        return { type: 'initial' as const, value: initial };
    };

    // Helper function to get background color for initials
    const getInitialColor = (uid: string) => {
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
        ];
        const index = uid.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="bg-gray-50 p-4 overflow-y-auto">
            {/* Header with title */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">My Parties</h2>
            </div>

            {parties.length === 0 ? (
                <div className="space-y-4">
                    {/* Add Party Card */}
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                        onClick={onShowCreateParty}
                    >
                        <div className="flex items-center justify-center h-16">
                            <div className="text-center">
                                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-gray-600">Create New Party</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-500 text-center py-8">You haven't joined any parties yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Add Party Card */}
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                        onClick={onShowCreateParty}
                    >
                        <div className="flex items-center justify-center h-16">
                            <div className="text-center">
                                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-gray-600">Create New Party</p>
                            </div>
                        </div>
                    </div>

                    {parties.map((party) => (
                        <div
                            key={party.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors shadow-sm ${selectedPartyId === party.id
                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                : 'border-gray-200 hover:bg-white hover:shadow-md'
                                }`}
                            onClick={() => onPartyClick(party.id)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{party.name}</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {party.members.length}/4
                                </span>
                            </div>

                            {/* Member Avatars */}
                            <div className="flex items-center mb-2">
                                <div className="flex -space-x-2">
                                    {memberProfiles[party.id]?.slice(0, 4).map((profile, index) => {
                                        const display = getUserDisplay(profile);
                                        return (
                                            <div
                                                key={profile.uid}
                                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                                                title={profile.displayName || profile.email}
                                            >
                                                {display.type === 'image' ? (
                                                    <img
                                                        src={display.value}
                                                        alt={profile.displayName || 'Member'}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-xs font-medium ${getInitialColor(profile.uid)}`}>
                                                        {display.value}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {party.members.length > 4 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-gray-300 flex items-center justify-center">
                                            <span className="text-xs text-gray-600 font-medium">
                                                +{party.members.length - 4}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                Created: {(() => {
                                    if (!party.createdAt) return 'Unknown';
                                    const date = party.createdAt as any;
                                    if (date.toDate && typeof date.toDate === 'function') {
                                        return date.toDate().toLocaleDateString();
                                    }
                                    if (date instanceof Date) {
                                        return date.toLocaleDateString();
                                    }
                                    return new Date(date).toLocaleDateString();
                                })()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}; 