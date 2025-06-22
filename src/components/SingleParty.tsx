'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getParty,
    searchUsersByEmail,
    createInvitation,
    addMemberToParty,
    getInvitationsSentByUser,
    Party,
    Invitation
} from '@/lib/parties';
import { getUserProfilesByIds, UserProfile } from '@/lib/users';
import PartyReceiptUpload from './PartyReceiptUpload';
import PartyReceipts from './PartyReceipts';
import { PartyProvider } from '@/contexts/PartyContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PartyDetails } from '@/types/party';

interface SinglePartyProps {
    partyId: string;
}

interface PartyReceipt {
    id: string;
    partyId: string;
    fileName: string;
    fileSize: number;
    analysis: any;
    rawResponse: string;
    uploadedAt: any;
}

type TabType = 'info' | 'upload' | 'receipts';

const SingleParty: React.FC<SinglePartyProps> = ({ partyId }) => {
    const { user, userProfile } = useAuth();
    const [party, setParty] = useState<PartyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
    const [invitedUserProfiles, setInvitedUserProfiles] = useState<{ [userId: string]: UserProfile }>({});
    const [activeTab, setActiveTab] = useState<TabType>('info');

    useEffect(() => {
        const fetchPartyDetails = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'parties', partyId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const partyData = { id: docSnap.id, ...docSnap.data() } as PartyDetails;
                    setParty(partyData);

                    // Fetch member profiles if party has members
                    if (partyData.members && partyData.members.length > 0) {
                        const profiles = await getUserProfilesByIds(partyData.members);
                        setMemberProfiles(profiles);
                    }
                } else {
                    console.log('No such document!');
                    setParty(null);
                }
            } catch (error) {
                console.error("Error fetching party details:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchPendingInvitations = async () => {
            if (!user) return;

            try {
                const invitations = await getInvitationsSentByUser(user.uid, 'pending');
                // Filter invitations for this specific party
                const partyInvitations = invitations.filter(inv => inv.partyId === partyId);
                setPendingInvitations(partyInvitations);

                // Fetch profiles for invited users
                if (partyInvitations.length > 0) {
                    const invitedUserIds = partyInvitations.map(inv => inv.toUserId);
                    const profiles = await getUserProfilesByIds(invitedUserIds);
                    const profilesMap: { [userId: string]: UserProfile } = {};
                    profiles.forEach(profile => {
                        profilesMap[profile.uid] = profile;
                    });
                    setInvitedUserProfiles(profilesMap);
                }
            } catch (error) {
                console.error("Error fetching pending invitations:", error);
            }
        };

        if (partyId) {
            fetchPartyDetails();
            fetchPendingInvitations();
        }
    }, [partyId, user]);

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
                userData.uid !== user?.uid &&
                !party?.members?.includes(userData.uid)
            );
            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const handleInviteUser = async (userData: any) => {
        if (!user || !party) return;

        try {
            // Check if party would exceed 4 people limit
            if (party.members && party.members.length >= 4) {
                alert('Party cannot exceed 4 people');
                return;
            }
            await createInvitation({
                partyId: party.id,
                partyName: party.name,
                fromUserId: user.uid,
                fromUserName: userProfile?.displayName || user.email || 'Unknown',
                toUserId: userData.uid,
                status: 'pending',
            });

            // Reset form and refresh pending invitations
            setSearchEmail('');
            setSearchResults([]);
            setShowInviteForm(false);

            // Refresh pending invitations and invited user profiles
            const invitations = await getInvitationsSentByUser(user.uid, 'pending');
            const partyInvitations = invitations.filter(inv => inv.partyId === partyId);
            setPendingInvitations(partyInvitations);

            // Update invited user profiles
            if (partyInvitations.length > 0) {
                const invitedUserIds = partyInvitations.map(inv => inv.toUserId);
                const profiles = await getUserProfilesByIds(invitedUserIds);
                const profilesMap: { [userId: string]: UserProfile } = {};
                profiles.forEach(profile => {
                    profilesMap[profile.uid] = profile;
                });
                setInvitedUserProfiles(profilesMap);
            }

            alert('Invitation sent successfully!');

        } catch (error) {
            console.error('Error sending invitation:', error);
            alert('Failed to send invitation');
        }
    };

    if (loading) {
        return <div className="text-center py-10">Loading party details...</div>;
    }

    if (!party) {
        return <div className="text-center py-10">Party not found</div>;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'info':
                return (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">Party Information</h2>
                            {party.members && party.members.length < 4 && (
                                <button
                                    onClick={() => setShowInviteForm(!showInviteForm)}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                                >
                                    {showInviteForm ? 'Cancel' : 'Invite Members'}
                                </button>
                            )}
                        </div>

                        {/* Member List */}
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">
                                Members ({memberProfiles.length}/4)
                            </h3>
                            <div className="space-y-3">
                                {memberProfiles.map((profile) => {
                                    const display = getUserDisplay(profile);
                                    return (
                                        <div key={profile.uid} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                                                {display.type === 'image' ? (
                                                    <img
                                                        src={display.value}
                                                        alt={profile.displayName || 'Member'}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-sm font-medium ${getInitialColor(profile.uid)}`}>
                                                        {display.value}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {profile.displayName || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-gray-500">{profile.email}</p>
                                            </div>
                                            {profile.uid === party.createdBy && (
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                    Creator
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                {memberProfiles.length === 0 && (
                                    <p className="text-gray-500 text-center py-4">No members found</p>
                                )}
                            </div>
                        </div>

                        {/* Pending Invitations Bar */}
                        {pendingInvitations.length > 0 && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-yellow-800">
                                                Pending Invitations ({pendingInvitations.length})
                                            </h3>
                                            <p className="text-sm text-yellow-700">
                                                Waiting for responses from invited members
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => setShowInviteForm(!showInviteForm)}
                                            className="text-sm text-yellow-800 hover:text-yellow-900 underline"
                                        >
                                            {showInviteForm ? 'Hide' : 'Invite More'}
                                        </button>
                                    </div>
                                </div>

                                {/* Pending Invitations List */}
                                <div className="space-y-2">
                                    {pendingInvitations.map((invitation) => (
                                        <div key={invitation.id} className="flex items-center justify-between bg-white rounded-md p-2 border border-yellow-200">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm text-gray-700">
                                                    Invited: {invitedUserProfiles[invitation.toUserId]?.displayName || 'Unknown User'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                                                Pending
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Invite Form */}
                        {showInviteForm && (
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Invite New Members</h3>
                                <div className="space-y-4">
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
                                                placeholder="Enter email address..."
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
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
                                            <div className="space-y-2">
                                                {searchResults.map((userData) => (
                                                    <div
                                                        key={userData.uid}
                                                        className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {userData.displayName || 'Unknown User'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{userData.email}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleInviteUser(userData)}
                                                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                                                        >
                                                            Invite
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Party Details */}
                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Party Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Created</p>
                                    <p className="font-medium text-gray-900">
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
                                    <p className="text-gray-500">Status</p>
                                    <p className="font-medium text-gray-900">
                                        {party.members && party.members.length >= 4 ? 'Full' : 'Open'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'upload':
                return (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

                        <PartyReceiptUpload partyId={partyId} />
                    </div>
                );
            case 'receipts':
                return <PartyReceipts partyId={partyId} memberProfiles={memberProfiles} />;
            default:
                return null;
        }
    };

    return (
        <PartyProvider partyId={partyId}>
            <div className="container mx-auto p-4 md:p-6 lg:p-8 h-full">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'info'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Party Info
                        </button>
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'upload'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Upload Receipts
                        </button>
                        <button
                            onClick={() => setActiveTab('receipts')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'receipts'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Receipts
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-8">
                    {renderTabContent()}
                </div>
            </div>
        </PartyProvider>
    );
};

export default SingleParty; 
