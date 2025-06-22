'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getPartiesByMember,
    getInvitationsByUser,
    createParty,
    createInvitation,
    updateInvitationStatus,
    addMemberToParty,
    searchUsersByEmail,
    Party,
    Invitation
} from '@/lib/parties';
import { getUserProfilesByIds, UserProfile } from '@/lib/users';
import { CreatePartyModal } from './CreatePartyModal';
import { PartyCard } from './PartyCard';

interface PartyListProps {
    onPartySelect: (partyId: string) => void;
    selectedPartyId: string | null;
}

export const PartyList: React.FC<PartyListProps> = ({ onPartySelect, selectedPartyId }) => {
    const { user, userProfile } = useAuth();
    const [parties, setParties] = useState<Party[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
    const [partySearchTerm, setPartySearchTerm] = useState('');
    const [memberProfiles, setMemberProfiles] = useState<{ [partyId: string]: UserProfile[] }>({});

    // Fetch user's parties and invitations
    useEffect(() => {
        if (user) {
            fetchUserParties();
            fetchUserInvitations();
        }
    }, [user]);

    const fetchUserParties = async () => {
        if (!user) return;

        try {
            const partiesData = await getPartiesByMember(user.uid);
            setParties(partiesData);

            // Fetch member profiles for all parties
            await fetchMemberProfiles(partiesData);
        } catch (error) {
            console.error('Error fetching parties:', error);
        }
    };

    const fetchMemberProfiles = async (partiesData: Party[]) => {
        try {
            const profilesMap: { [partyId: string]: UserProfile[] } = {};

            for (const party of partiesData) {
                if (party.members.length > 0) {
                    const profiles = await getUserProfilesByIds(party.members);
                    profilesMap[party.id] = profiles;
                } else {
                    profilesMap[party.id] = [];
                }
            }

            setMemberProfiles(profilesMap);
        } catch (error) {
            console.error('Error fetching member profiles:', error);
        }
    };

    const fetchUserInvitations = async () => {
        if (!user) return;

        try {
            const invitationsData = await getInvitationsByUser(user.uid, 'pending');
            setInvitations(invitationsData);
        } catch (error) {
            console.error('Error fetching invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvitationResponse = async (invitationId: string, status: 'accepted' | 'declined') => {
        try {
            await updateInvitationStatus(invitationId, status);

            if (status === 'accepted') {
                // Add user to party members
                const invitation = invitations.find(inv => inv.id === invitationId);
                if (invitation) {
                    await addMemberToParty(invitation.partyId, user?.uid || '');
                }
            }

            // Refresh data
            await fetchUserParties();
            await fetchUserInvitations();

        } catch (error) {
            console.error('Error responding to invitation:', error);
        }
    };

    // Filter parties based on search term
    const filteredParties = parties.filter(party =>
        party.name.toLowerCase().includes(partySearchTerm.toLowerCase())
    ).sort((a, b) => {
        // Sort by creation date, newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading parties...</div>
            </div>
        );
    }

    return (
        <div className="w-1/4 bg-gray-50 flex flex-col h-screen">
            {/* Search Bar - Fixed at top */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                    <input
                        type="text"
                        value={partySearchTerm}
                        onChange={(e) => setPartySearchTerm(e.target.value)}
                        placeholder="Search parties..."
                        className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-scroll p-4">
                {/* Create Party Button Card - Only show when not searching */}
                {!partySearchTerm && (
                    <div className="mb-6">
                        <button
                            onClick={() => setShowCreatePartyModal(true)}
                            className="w-full p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 text-center group h-32 flex items-center justify-center"
                        >
                            <div className="flex flex-col items-center space-y-2">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">
                                    Create New Party
                                </span>
                            </div>
                        </button>
                    </div>
                )}

                {filteredParties.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        {partySearchTerm ? 'No parties found matching your search.' : "You haven't joined any parties yet."}
                    </p>
                ) : (
                    <div className="space-y-4">
                        {filteredParties.map((party) => (
                            <PartyCard
                                key={party.id}
                                party={party}
                                memberProfiles={memberProfiles[party.id] || []}
                                isSelected={selectedPartyId === party.id}
                                onSelect={onPartySelect}
                            />
                        ))}
                    </div>
                )}

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h3>
                        <div className="space-y-3">
                            {invitations.map((invitation) => (
                                <div key={invitation.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                                    <p className="font-medium text-gray-900 mb-2">
                                        "{invitation.partyName}"
                                    </p>
                                    <p className="text-gray-600 mb-3 text-xs">
                                        From: {invitation.fromUserName}
                                    </p>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Party Modal */}
            <CreatePartyModal
                isOpen={showCreatePartyModal}
                onClose={() => setShowCreatePartyModal(false)}
                onPartyCreated={fetchUserParties}
            />
        </div>
    );
}; 