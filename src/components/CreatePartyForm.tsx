'use client';

import React, { useState } from 'react';
import { createParty, createInvitation, searchUsersByEmail } from '@/lib/parties';

interface CreatePartyFormProps {
    user: any;
    userProfile: any;
    onPartyCreated: () => void;
    onCancel: () => void;
}

export const CreatePartyForm: React.FC<CreatePartyFormProps> = ({
    user,
    userProfile,
    onPartyCreated,
    onCancel
}) => {
    const [newPartyName, setNewPartyName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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

            // Reset form and call callback
            setNewPartyName('');
            setSelectedUsers([]);
            setSearchResults([]);
            onPartyCreated();

        } catch (error) {
            console.error('Error creating party:', error);
            alert('Failed to create party');
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

    return (
        <div className="bg-gray-50 p-4 overflow-y-auto">
            {/* Header with title and close button */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create Party</h2>
                <button
                    onClick={onCancel}
                    className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                    title="Cancel"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

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
    );
}; 