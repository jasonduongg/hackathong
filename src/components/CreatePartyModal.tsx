'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    createParty,
    createInvitation,
    searchUsersByEmail,
    Party
} from '@/lib/parties';
import { getUserProfilesByIds, UserProfile } from '@/lib/users';

interface CreatePartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPartyCreated: () => void;
}

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({
    isOpen,
    onClose,
    onPartyCreated
}) => {
    const { user, userProfile } = useAuth();
    const [newPartyName, setNewPartyName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedUserProfiles, setSelectedUserProfiles] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Fetch user profiles when selected users change
    useEffect(() => {
        const fetchSelectedUserProfiles = async () => {
            if (selectedUsers.length > 0) {
                try {
                    const profiles = await getUserProfilesByIds(selectedUsers);
                    setSelectedUserProfiles(profiles);
                } catch (error) {
                    console.error('Error fetching user profiles:', error);
                    setSelectedUserProfiles([]);
                }
            } else {
                setSelectedUserProfiles([]);
            }
        };

        fetchSelectedUserProfiles();
    }, [selectedUsers]);

    const handleSearchUsers = async () => {
        if (!searchEmail.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setHasSearched(true);
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

    // Add a new function to handle email input changes
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchEmail(value);

        // Clear search results and reset hasSearched when user is typing
        if (value.trim() === '') {
            setSearchResults([]);
            setHasSearched(false);
        }
    };

    const handleCreateParty = async () => {
        if (!user || !newPartyName.trim()) return;

        setIsLoading(true);
        try {
            // Check if party would exceed 4 people limit
            if (selectedUsers.length + 1 > 4) {
                alert('Party cannot exceed 4 people');
                return;
            }

            // Create party with only the creator as a member
            const partyId = await createParty({
                name: newPartyName.trim(),
                createdBy: user.uid,
                members: [user.uid], // Only add the creator initially
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
            setSelectedUserProfiles([]);
            setSearchResults([]);
            setSearchEmail('');

            // Close modal and refresh
            onClose();
            onPartyCreated();

        } catch (error) {
            console.error('Error creating party:', error);
            alert('Failed to create party');
        } finally {
            setIsLoading(false);
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
        setHasSearched(false);
    };

    const handleClose = () => {
        if (!isLoading) {
            setNewPartyName('');
            setSelectedUsers([]);
            setSelectedUserProfiles([]);
            setSearchResults([]);
            setSearchEmail('');
            setHasSearched(false);
            onClose();
        }
    };

    // Helper function to get display name for a user
    const getUserDisplayName = (userId: string) => {
        const profile = selectedUserProfiles.find(p => p.uid === userId);
        if (!profile) {
            return 'Loading...';
        }
        return profile.displayName || profile.email || userId;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Create New Party</h2>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Party Name */}
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
                            disabled={isLoading}
                        />
                    </div>

                    {/* Invite Members */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Invite Members (Optional)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            You can create a party just for yourself or invite up to 3 other people
                        </p>
                        <div className="flex space-x-2">
                            <input
                                type="email"
                                value={searchEmail}
                                onChange={handleEmailChange}
                                placeholder="Search by email..."
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSearchUsers}
                                disabled={isLoading}
                                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
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
                                            disabled={isLoading}
                                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Search Results */}
                    {hasSearched && searchEmail.trim() && searchResults.length === 0 && (
                        <div className="border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-500 text-center">No members found</p>
                        </div>
                    )}

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Members ({selectedUsers.length}/3)</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {selectedUsers.map((userId) => (
                                    <div
                                        key={userId}
                                        className="flex justify-between items-center p-2 bg-indigo-50 rounded text-sm"
                                    >
                                        <span className="font-medium">{getUserDisplayName(userId)}</span>
                                        <button
                                            onClick={() => removeSelectedUser(userId)}
                                            disabled={isLoading}
                                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateParty}
                        disabled={!newPartyName.trim() || isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Creating...' : 'Create Party'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 