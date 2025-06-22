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
import { NearestRestaurantFinder } from './NearestRestaurantFinder';

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
    const [showJson, setShowJson] = useState(false);
    const [showRestaurantData, setShowRestaurantData] = useState(false);
    const [restaurantData, setRestaurantData] = useState('');
    const [savingRestaurantData, setSavingRestaurantData] = useState(false);
    const [savedRestaurantData, setSavedRestaurantData] = useState('');
    const [memberMetadata, setMemberMetadata] = useState<any>(null);
    const [showMemberMetadata, setShowMemberMetadata] = useState(false);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [showRestaurantFinder, setShowRestaurantFinder] = useState(false);
    const [restaurantFinderData, setRestaurantFinderData] = useState<any>(null);
    const [commonTimes, setCommonTimes] = useState<any>(null);
    const [loadingCommonTimes, setLoadingCommonTimes] = useState(false);

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

    const handleSaveRestaurantData = async () => {
        if (!restaurantData.trim()) {
            alert('Please enter some JSON data');
            return;
        }

        try {
            setSavingRestaurantData(true);
            
            // Validate JSON
            const parsedData = JSON.parse(restaurantData);
            
            // Save the data to the saved state
            setSavedRestaurantData(restaurantData);
            
            alert('Restaurant data saved!');
            
        } catch (error) {
            console.error('Error with restaurant data:', error);
            alert('Invalid JSON format. Please check your data.');
        } finally {
            setSavingRestaurantData(false);
        }
    };

    const fetchMemberMetadata = async () => {
        if (!partyId) return;

        try {
            setLoadingMetadata(true);
            const response = await fetch(`/api/get-members?partyId=${partyId}`);
            const data = await response.json();

            if (data.success) {
                setMemberMetadata(data);
                
                // Now call the get-times API to find common availability times
                await fetchCommonTimes(data.memberProfiles);
            } else {
                console.error('Failed to fetch member metadata:', data.error);
                alert('Failed to fetch member metadata');
            }
        } catch (error) {
            console.error('Error fetching member metadata:', error);
        } finally {
            setLoadingMetadata(false);
        }
    };

    const fetchCommonTimes = async (memberProfiles: any[]) => {
        if (!memberProfiles || memberProfiles.length === 0) return;

        try {
            setLoadingCommonTimes(true);
            const response = await fetch('/api/get-times', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberProfiles: memberProfiles
                })
            });
            
            const data = await response.json();

            if (data.success) {
                setCommonTimes(data);
            } else {
                console.error('Failed to fetch common times:', data.error);
            }
        } catch (error) {
            console.error('Error fetching common times:', error);
        } finally {
            setLoadingCommonTimes(false);
        }
    };

    const handleRestaurantFound = (data: any) => {
        setRestaurantFinderData(data);
        console.log('Restaurant found:', data);
        // You can add additional logic here, like saving to database or showing notifications
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
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setShowRestaurantFinder(!showRestaurantFinder)}
                                    className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
                                >
                                    {showRestaurantFinder ? 'Hide Restaurant Finder' : 'Find Restaurant'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRestaurantData(true);
                                        // Load saved data if it exists
                                        if (savedRestaurantData) {
                                            setRestaurantData(savedRestaurantData);
                                        }
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                                >
                                    Restaurant Data
                                </button>
                                <button
                                    onClick={() => {
                                        fetchMemberMetadata();
                                        setShowMemberMetadata(true);
                                    }}
                                    disabled={loadingMetadata}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMetadata ? 'Loading...' : 'Member Metadata'}
                                </button>
                                <button
                                    onClick={() => setShowJson(!showJson)}
                                    className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
                                >
                                    {showJson ? 'Hide JSON' : 'Show JSON'}
                                </button>
                                {party.members && party.members.length < 4 && (
                                    <button
                                        onClick={() => setShowInviteForm(!showInviteForm)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                                    >
                                        {showInviteForm ? 'Cancel' : 'Invite Members'}
                                    </button>
                                )}
                            </div>
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

                        {/* Restaurant Finder */}
                        {showRestaurantFinder && (
                            <div className="mb-6">
                                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-blue-800">Restaurant Finder</h3>
                                            <div className="mt-2 text-sm text-blue-700">
                                                <p>This feature finds the best restaurant location based on party member addresses.</p>
                                                <p className="mt-1">
                                                    <strong>Tip:</strong> Make sure all party members have completed their profile with their address information for the best results.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <NearestRestaurantFinder
                                    partyId={partyId}
                                    onRestaurantFound={handleRestaurantFound}
                                />
                            </div>
                        )}

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

                {/* JSON Modal */}
                {showJson && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Party JSON Data</h3>
                                <button
                                    onClick={() => setShowJson(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                                    {JSON.stringify(party, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* Restaurant Data Modal */}
                {showRestaurantData && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Submit Restaurant Data</h3>
                                <button
                                    onClick={() => {
                                        setShowRestaurantData(false);
                                        setRestaurantData(''); // Clear current textarea
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Restaurant Data (JSON Format)
                                    </label>
                                    <textarea
                                        value={restaurantData}
                                        onChange={(e) => setRestaurantData(e.target.value)}
                                        placeholder="Enter JSON data here..."
                                        className="w-full h-64 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowRestaurantData(false);
                                            setRestaurantData(''); // Clear current textarea
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveRestaurantData}
                                        disabled={savingRestaurantData}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingRestaurantData ? 'Saving...' : 'Save Data'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Member Metadata Modal */}
                {showMemberMetadata && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Party Member Metadata</h3>
                                <button
                                    onClick={() => setShowMemberMetadata(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                                {loadingMetadata ? (
                                    <div className="text-center py-8">
                                        <div className="text-lg">Loading member metadata...</div>
                                    </div>
                                ) : memberMetadata ? (
                                    <div className="space-y-6">
                                        {/* Party Information */}
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <h4 className="text-md font-medium text-blue-900 mb-2">Party Information</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-blue-800">Name:</span> {memberMetadata?.party?.name || 'Unknown'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-blue-800">Description:</span> {memberMetadata?.party?.description || 'No description'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-blue-800">Created By:</span> {memberMetadata?.party?.createdBy || 'Unknown'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-blue-800">Member Count:</span> {memberMetadata?.party?.memberCount || 0}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Common Times Section */}
                                        {loadingCommonTimes ? (
                                            <div className="bg-yellow-50 rounded-lg p-4">
                                                <h4 className="text-md font-medium text-yellow-900 mb-2">Common Availability Times</h4>
                                                <div className="text-center py-4">
                                                    <div className="text-lg text-yellow-700">Finding common times...</div>
                                                </div>
                                            </div>
                                        ) : commonTimes ? (
                                            <div className="bg-green-50 rounded-lg p-4">
                                                <h4 className="text-md font-medium text-green-900 mb-2">Common Availability Times</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                                                    <div>
                                                        <span className="font-medium text-green-800">Total Available Slots:</span> {commonTimes.totalSlots}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-green-800">Days with Common Times:</span> {commonTimes.commonTimes.length}
                                                    </div>
                                                </div>
                                                
                                                {commonTimes.commonTimes.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {commonTimes.commonTimes.map((day: any, index: number) => (
                                                            <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <h5 className="font-medium text-green-800 capitalize">{day.day}</h5>
                                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                                        {day.slotCount} slots
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {day.timeRanges.map((range: string, rangeIndex: number) => (
                                                                        <div key={rangeIndex} className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                                                            {range}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <div className="text-lg text-green-700">No common times found</div>
                                                        <div className="text-sm text-green-600 mt-1">All members need to be available at the same time</div>
                                                    </div>
                                                )}

                                                {/* Aggregated Preferences */}
                                                {commonTimes.aggregatedPreferences && (
                                                    <div className="mt-4">
                                                        <h5 className="font-medium text-green-800 mb-2">Group Preferences</h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                                            <div>
                                                                <span className="font-medium text-green-700">Dietary:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {commonTimes.aggregatedPreferences.dietaryRestrictions?.map((restriction: string, i: number) => (
                                                                        <span key={i} className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                                                            {restriction}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-green-700">Food:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {commonTimes.aggregatedPreferences.foodPreferences?.map((preference: string, i: number) => (
                                                                        <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                                                            {preference}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-green-700">Activities:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {commonTimes.aggregatedPreferences.activityPreferences?.map((preference: string, i: number) => (
                                                                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                                                            {preference}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Member Profiles */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Member Profiles</h4>
                                            <div className="space-y-4">
                                                {memberMetadata?.memberProfiles?.map((member: any, index: number) => (
                                                    <div key={member.uid} className="bg-gray-50 rounded-lg p-4">
                                                        <div className="flex items-center space-x-3 mb-3">
                                                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
                                                                {member.displayName?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'U'}
                                                            </div>
                                                            <div>
                                                                <h5 className="font-medium text-gray-900">{member.displayName || 'Unknown User'}</h5>
                                                                <p className="text-sm text-gray-500">{member.email}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-medium text-gray-700">Job:</span> {member.job || 'Not specified'}
                                                            </div>

                                                            <div>
                                                                <span className="font-medium text-gray-700">Dietary Restrictions:</span>
                                                                <div className="mt-1">
                                                                    {member.dietaryRestrictions?.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {member.dietaryRestrictions.map((restriction: string, i: number) => (
                                                                                <span key={i} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                                                                    {restriction}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-500">None</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-700">Food Preferences:</span>
                                                                <div className="mt-1">
                                                                    {member.foodPreferences?.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {member.foodPreferences.map((preference: string, i: number) => (
                                                                                <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                                    {preference}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-500">None</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-700">Activity Preferences:</span>
                                                                <div className="mt-1">
                                                                    {member.activityPreferences?.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {member.activityPreferences.map((preference: string, i: number) => (
                                                                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                                    {preference}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-500">None</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Availability */}
                                                        {member.availability && Object.keys(member.availability).length > 0 && (
                                                            <div className="mt-3">
                                                                <span className="font-medium text-gray-700">Availability:</span>
                                                                <div className="mt-1 text-xs">
                                                                    <pre className="bg-white p-2 rounded border overflow-x-auto">
                                                                        {JSON.stringify(member.availability, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Raw JSON Data */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Raw API Response</h4>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap">
                                                    {JSON.stringify({ memberMetadata, commonTimes }, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="text-lg text-gray-500">No member metadata available</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PartyProvider>
    );
};

export default SingleParty; 