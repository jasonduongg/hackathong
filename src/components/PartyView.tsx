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
import { SingleParty } from './SingleParty';

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
        } catch (error) {
            console.error('Error fetching parties:', error);
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

    // Show single party view if a party is selected
    if (selectedPartyId) {
        return (
            <div className="flex h-screen">
                {/* Left side - Party List (1/4) */}
                <div className="w-1/4 bg-gray-50 p-4 overflow-y-auto">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">My Parties</h2>

                    {parties.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">You haven't joined any parties yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {parties.map((party) => (
                                <div
                                    key={party.id}
                                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedPartyId === party.id
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:bg-white'
                                        }`}
                                    onClick={() => handlePartyClick(party.id)}
                                >
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{party.name}</h3>
                                    <p className="text-xs text-gray-600">
                                        Members: {party.members.length}/4
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Create Party Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => setShowCreateParty(!showCreateParty)}
                            className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            {showCreateParty ? 'Cancel' : '+ Create Party'}
                        </button>
                    </div>

                    {/* Create Party Form */}
                    {showCreateParty && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Party Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newPartyName}
                                        onChange={(e) => setNewPartyName(e.target.value)}
                                        placeholder="Enter party name..."
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Invite Members
                                    </label>
                                    <div className="flex space-x-1">
                                        <input
                                            type="email"
                                            value={searchEmail}
                                            onChange={(e) => setSearchEmail(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                                            placeholder="Search by email..."
                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <button
                                            onClick={handleSearchUsers}
                                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="border border-gray-200 rounded-lg p-2">
                                        <h4 className="text-xs font-medium text-gray-700 mb-1">Search Results</h4>
                                        <div className="space-y-1">
                                            {searchResults.map((userData) => (
                                                <div
                                                    key={userData.uid}
                                                    className="flex justify-between items-center p-1 bg-gray-50 rounded text-xs"
                                                >
                                                    <div>
                                                        <p className="font-medium">{userData.displayName || 'Unknown'}</p>
                                                        <p className="text-gray-600">{userData.email}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => addSelectedUser(userData)}
                                                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
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
                                        <h4 className="text-xs font-medium text-gray-700 mb-1">Selected ({selectedUsers.length}/3)</h4>
                                        <div className="space-y-1">
                                            {selectedUsers.map((userId) => (
                                                <div
                                                    key={userId}
                                                    className="flex justify-between items-center p-1 bg-indigo-50 rounded text-xs"
                                                >
                                                    <span>{userId}</span>
                                                    <button
                                                        onClick={() => removeSelectedUser(userId)}
                                                        className="px-1 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
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
                                    className="w-full px-2 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Party
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pending Invitations</h3>
                            <div className="space-y-2">
                                {invitations.map((invitation) => (
                                    <div key={invitation.id} className="border border-gray-200 rounded-lg p-2 text-xs">
                                        <p className="font-medium text-gray-900 mb-1">
                                            "{invitation.partyName}"
                                        </p>
                                        <p className="text-gray-600 mb-2">
                                            From: {invitation.fromUserName}
                                        </p>
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
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

                {/* Right side - Single Party View (3/4) */}
                <div className="w-3/4 bg-white">
                    <SingleParty partyId={selectedPartyId} onBack={handleBackToParties} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left side - Existing Parties */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">My Parties</h2>

                    {parties.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">You haven't joined any parties yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {parties.map((party) => (
                                <div
                                    key={party.id}
                                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handlePartyClick(party.id)}
                                >
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{party.name}</h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Members: {party.members.length}/4
                                    </p>
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

                    {/* Create Party Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => setShowCreateParty(!showCreateParty)}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            {showCreateParty ? 'Cancel' : '+ Create Party'}
                        </button>
                    </div>

                    {/* Create Party Form */}
                    {showCreateParty && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            onClick={handleSearchUsers}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
                                                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">{userData.displayName || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-600">{userData.email}</p>
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
                                                    className="flex justify-between items-center p-2 bg-indigo-50 rounded"
                                                >
                                                    <span className="text-sm">{userId}</span>
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
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Party
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h3>
                            <div className="space-y-3">
                                {invitations.map((invitation) => (
                                    <div key={invitation.id} className="border border-gray-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-900 mb-2">
                                            Invitation to join "{invitation.partyName}"
                                        </p>
                                        <p className="text-xs text-gray-600 mb-3">
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
            </div>
        </div>
    );
}; 