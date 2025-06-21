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

interface SinglePartyProps {
    partyId: string;
    onBack: () => void;
}

export const SingleParty: React.FC<SinglePartyProps> = ({ partyId, onBack }) => {
    const { user, userProfile } = useAuth();
    const [party, setParty] = useState<Party | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showInviteForm, setShowInviteForm] = useState(false);

    useEffect(() => {
        if (partyId) {
            fetchPartyDetails();
        }
    }, [partyId]);

    const fetchPartyDetails = async () => {
        try {
            const partyData = await getParty(partyId);
            setParty(partyData);
        } catch (error) {
            console.error('Error fetching party details:', error);
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
                userData.uid !== user?.uid &&
                !selectedUsers.includes(userData.uid) &&
                !party?.members.includes(userData.uid)
            );
            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const handleInviteMembers = async () => {
        if (!party || !user || selectedUsers.length === 0) return;

        try {
            // Check if party would exceed 4 people limit
            if (party.members.length + selectedUsers.length > 4) {
                alert('Party cannot exceed 4 people');
                return;
            }

            // Create invitations for selected users
            const invitationPromises = selectedUsers.map(userId =>
                createInvitation({
                    partyId: party.id,
                    partyName: party.name,
                    fromUserId: user.uid,
                    fromUserName: userProfile?.displayName || user.email || 'Unknown',
                    toUserId: userId,
                    status: 'pending',
                })
            );

            await Promise.all(invitationPromises);

            // Reset form
            setSelectedUsers([]);
            setSearchResults([]);
            setSearchEmail('');
            setShowInviteForm(false);

            // Refresh party details
            await fetchPartyDetails();

        } catch (error) {
            console.error('Error inviting members:', error);
            alert('Failed to send invitations');
        }
    };

    const addSelectedUser = (userData: any) => {
        if (party && party.members.length + selectedUsers.length >= 4) {
            alert('Party cannot exceed 4 people');
            return;
        }
        setSelectedUsers([...selectedUsers, userData.uid]);
        setSearchResults([]);
        setSearchEmail('');
    };

    const removeSelectedUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading party details...</div>
            </div>
        );
    }

    if (!party) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Party not found</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Parties
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{party.name}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Party Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Party Details</h2>

                    <div className="space-y-3">
                        <div>
                            <span className="text-sm font-medium text-gray-600">Created:</span>
                            <p className="text-sm text-gray-900">
                                {(() => {
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

                        <div>
                            <span className="text-sm font-medium text-gray-600">Members:</span>
                            <p className="text-sm text-gray-900">{party.members.length}/4</p>
                        </div>
                    </div>
                </div>

                {/* Members */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Members</h2>
                        {party.members.length < 4 && (
                            <button
                                onClick={() => setShowInviteForm(!showInviteForm)}
                                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                            >
                                {showInviteForm ? 'Cancel' : 'Invite'}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {party.members.map((memberId) => (
                            <div key={memberId} className="flex items-center p-2 bg-gray-50 rounded">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-sm font-medium text-indigo-600">
                                        {memberId === user?.uid ? 'You' : memberId.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-900">
                                    {memberId === user?.uid ? 'You' : memberId}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Invite Form */}
                    {showInviteForm && (
                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search by Email
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="email"
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                                        placeholder="Enter email..."
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
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                                        Selected ({selectedUsers.length})
                                    </h4>
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

                            {/* Send Invitations Button */}
                            {selectedUsers.length > 0 && (
                                <button
                                    onClick={handleInviteMembers}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Send Invitations
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 