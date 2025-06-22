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
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading parties...</div>
            </div>
        );
    }

    return (
        <div className="w-1/4 bg-gray-50 p-4 overflow-y-auto">
            {/* Search Bar */}
            <div className="mb-4">
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
                        <div
                            key={party.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors shadow-sm ${selectedPartyId === party.id
                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                : 'border-gray-200 hover:bg-white hover:shadow-md'
                                }`}
                            onClick={() => onPartySelect(party.id)}
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

            {/* Create Party Modal */}
            <CreatePartyModal
                isOpen={showCreatePartyModal}
                onClose={() => setShowCreatePartyModal(false)}
                onPartyCreated={fetchUserParties}
            />
        </div>
    );
}; 