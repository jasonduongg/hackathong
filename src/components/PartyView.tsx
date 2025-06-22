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
import SingleParty from './SingleParty';

export const PartyView: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [parties, setParties] = useState<Party[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateParty, setShowCreateParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
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

    const handleSearchUsers = async () => {
        if (!searchEmail.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await searchUsersByEmail(searchEmail);
            const filteredResults = results.filter(userData =>
                userData.uid !== user?.uid && !selectedUsers.includes(userData.uid)
            );
            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const handleCreateParty = async () => {
        if (!user || !newPartyName.trim()) return;

        try {
            // Check if party would exceed 4 people limit
            if (selectedUsers.length + 1 > 4) {
                alert('Party cannot exceed 4 people');
                return;
            }

            // Create party
            const partyId = await createParty({
                name: newPartyName.trim(),
                createdBy: user.uid,
                members: [user.uid, ...selectedUsers],
            });

            // Create invitations for selected users (only if there are selected users)
            if (selectedUsers.length > 0) {
                const invitationPromises = selectedUsers.map(userId =>
                    createInvitation({
                        partyId,
                        partyName: newPartyName.trim(),
                        fromUserId: user.uid,
                        fromUserName: userProfile?.displayName || user.email || 'Unknown',
                        toUserId: userId,
                        status: 'pending',
                    })
                );

                await Promise.all(invitationPromises);
            }

            // Reset form
            setNewPartyName('');
            setSelectedUsers([]);
            setSearchResults([]);
            setShowCreateParty(false);

            // Refresh parties list
            await fetchUserParties();

        } catch (error) {
            console.error('Error creating party:', error);
            alert('Failed to create party');
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

    const removeSelectedUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
    };

    const addSelectedUser = (userData: any) => {
        if (selectedUsers.length >= 3) { // Max 4 people including creator
            alert('Party cannot exceed 4 people');
            return;
        }
        setSelectedUsers([...selectedUsers, userData.uid]);
        setSearchResults([]);
        setSearchEmail('');
    };

    const handlePartyClick = (partyId: string) => {
        setSelectedPartyId(partyId);
    };

    const handleBackToParties = () => {
        setSelectedPartyId(null);
        fetchUserParties(); // Refresh the parties list
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading parties...</div>
            </div>
        );
    }


    return (
        <div className="flex">
            {/* Left side - Party List (1/4) */}
            <div className="w-1/4 bg-gray-50 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-6">My Parties</h2>

                {/* Create Party Button Card */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowCreateParty(!showCreateParty)}
                        className="w-full p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 text-center group"
                    >
                        <div className="flex flex-col items-center space-y-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">
                                {showCreateParty ? 'Cancel' : 'Create New Party'}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Create Party Form */}
                {showCreateParty && (
                    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Party Name
                                </label>
                                <input
                                    type="text"
                                    value={newPartyName}
                                    onChange={(e) => setNewPartyName(e.target.value)}
                                    placeholder="Enter party name..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Invite Members
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="email"
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                                        placeholder="Search by email..."
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        onClick={handleSearchUsers}
                                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="border border-gray-200 rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
                                    <div className="space-y-2">
                                        {searchResults.map((userData) => (
                                            <div
                                                key={userData.uid}
                                                className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                                            >
                                                <div>
                                                    <p className="font-medium">{userData.displayName || 'Unknown'}</p>
                                                    <p className="text-gray-600 text-xs">{userData.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => addSelectedUser(userData)}
                                                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selected Users */}
                            {selectedUsers.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Members ({selectedUsers.length}/3)</h4>
                                    <div className="space-y-2">
                                        {selectedUsers.map((userId) => (
                                            <div
                                                key={userId}
                                                className="flex justify-between items-center p-2 bg-indigo-50 rounded text-sm"
                                            >
                                                <span>{userId}</span>
                                                <button
                                                    onClick={() => removeSelectedUser(userId)}
                                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create Button */}
                            <button
                                onClick={handleCreateParty}
                                disabled={!newPartyName.trim()}
                                className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Party
                            </button>
                        </div>
                    </div>
                )}

                {parties.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">You haven't joined any parties yet.</p>
                ) : (
                    <div className="space-y-4">
                        {parties.map((party) => (
                            <div
                                key={party.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-colors shadow-sm ${selectedPartyId === party.id
                                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                    : 'border-gray-200 hover:bg-white hover:shadow-md'
                                    }`}
                                onClick={() => handlePartyClick(party.id)}
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
            </div>

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