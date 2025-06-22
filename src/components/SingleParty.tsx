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
import PartyPaymentRequests from './PartyPaymentRequests';
import BeforeFlowTab from './BeforeFlowTab';
import { EventsList } from './EventsList';
import { PartyProvider, useParty } from '@/contexts/PartyContext';
import { VideoAnalysisProvider, useVideoAnalysis } from '@/contexts/VideoAnalysisContext';
import { UploadProvider } from '@/contexts/UploadContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, writeBatch, collection, query, getDocs, where } from 'firebase/firestore';
import { PartyDetails } from '@/types/party';

interface SinglePartyProps {
    partyId: string;
    onPartyDeleted?: () => void;
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

type TabType = 'info' | 'receipts' | 'requests' | 'before-flow';

// Component to show Before Flow tab button with loading indicator
const BeforeFlowTabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
}> = ({ isActive, onClick }) => {
    const { state: { loading, progress } } = useVideoAnalysis();

    return (
        <button
            onClick={onClick}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
        >
            <div className="flex items-center space-x-2">
                <span>Before Flow</span>
                {loading && (
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-600">
                            {Math.round(progress.percentage)}%
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
};

// Inner component that uses the PartyContext
const SinglePartyContent: React.FC<SinglePartyProps> = ({ partyId, onPartyDeleted }) => {
    const { user, userProfile } = useAuth();
    const { receipts } = useParty();
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [party, setParty] = useState<PartyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
    const [invitedUserProfiles, setInvitedUserProfiles] = useState<{ [userId: string]: UserProfile }>({});
    const [showJson, setShowJson] = useState(false);
    const [showRestaurantData, setShowRestaurantData] = useState(false);
    const [restaurantData, setRestaurantData] = useState('');
    const [savingRestaurantData, setSavingRestaurantData] = useState(false);
    const [savedRestaurantData, setSavedRestaurantData] = useState('');
    const [memberMetadata, setMemberMetadata] = useState<any>(null);
    const [showMemberMetadata, setShowMemberMetadata] = useState(false);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [commonTimes, setCommonTimes] = useState<any>(null);
    const [loadingCommonTimes, setLoadingCommonTimes] = useState(false);
    const [aggregatedPreferences, setAggregatedPreferences] = useState<any>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
    const [selectedUserForModal, setSelectedUserForModal] = useState<UserProfile | null>(null);
    const [showBeforeFlow, setShowBeforeFlow] = useState(true);
    const [showUploadReceipt, setShowUploadReceipt] = useState(true);
    const [eventsCount, setEventsCount] = useState(0);
    const [loadingEventsCount, setLoadingEventsCount] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [loadingUpcomingEvents, setLoadingUpcomingEvents] = useState(false);
    const [showScheduledEventsOnly, setShowScheduledEventsOnly] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedPartyName, setEditedPartyName] = useState('');
    const [savingPartyName, setSavingPartyName] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingParty, setDeletingParty] = useState(false);

    // Function to check if a time slot is already scheduled
    const isTimeSlotScheduled = (day: string, hour: number) => {
        if (!upcomingEvents || upcomingEvents.length === 0) return false;
        
        return upcomingEvents.some(event => {
            if (!event.scheduledTime) return false;
            
            // Check if the event is scheduled for this exact day
            if (event.scheduledTime.day !== day) return false;
            
            // Parse start and end times
            const startTime = event.scheduledTime.startTime;
            const endTime = event.scheduledTime.endTime;
            
            if (!startTime) return false;
            
            // Convert time strings to hours (e.g., "1:00 PM" -> 13, "1:00 AM" -> 1)
            const parseTimeToHour = (timeStr: string) => {
                const time = timeStr.toLowerCase();
                const isPM = time.includes('pm');
                const timeMatch = time.match(/(\d+):(\d+)/);
                
                if (!timeMatch) return 0;
                
                let hour = parseInt(timeMatch[1]);
                if (isPM && hour !== 12) hour += 12;
                if (!isPM && hour === 12) hour = 0;
                
                return hour;
            };
            
            const eventStartHour = parseTimeToHour(startTime);
            const eventEndHour = endTime ? parseTimeToHour(endTime) : eventStartHour + 1;
            
            // Debug logging (only for development)
            if (process.env.NODE_ENV === 'development') {
                console.log(`Checking event: ${event.restaurantData?.restaurant?.name || 'Unknown'} on ${day} from ${startTime} to ${endTime} (${eventStartHour}-${eventEndHour}) vs current hour ${hour}`);
            }
            
            // Check if the current hour falls within the event's time range
            const isScheduled = hour >= eventStartHour && hour < eventEndHour;
            
            if (isScheduled && process.env.NODE_ENV === 'development') {
                console.log(`Time slot ${day} ${hour}:00 is scheduled for ${event.restaurantData?.restaurant?.name || 'Unknown'}`);
            }
            
            return isScheduled;
        });
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

    const fetchPendingRequestsCount = async () => {
        try {
            const response = await fetch(`/api/party-payment-requests?partyId=${partyId}`);
            const data = await response.json();
            if (response.ok) {
                const requests = data.paymentRequests || [];
                const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
                setPendingRequestsCount(pendingCount);
            }
        } catch (error) {
            console.error('Error fetching pending requests count:', error);
        }
    };

    const fetchEventsCount = async () => {
        if (!partyId) return;

        try {
            setLoadingEventsCount(true);
            const response = await fetch(`/api/events?partyId=${partyId}`);
            const data = await response.json();

            if (response.ok) {
                setEventsCount(data.events?.length || 0);
            } else {
                console.error('Failed to fetch events count:', data.error);
                setEventsCount(0);
            }
        } catch (error) {
            console.error('Error fetching events count:', error);
            setEventsCount(0);
        } finally {
            setLoadingEventsCount(false);
        }
    };

    const fetchUpcomingEvents = async () => {
        if (!partyId) return;

        try {
            setLoadingUpcomingEvents(true);
            const response = await fetch(`/api/events?partyId=${partyId}`);
            const data = await response.json();

            if (response.ok) {
                // Filter events that have scheduledTime and sort by scheduled time
                const scheduledEvents = data.events
                    .filter((event: any) => event.scheduledTime)
                    .sort((a: any, b: any) => {
                        // Sort by day first, then by hour
                        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                        const dayA = dayOrder.indexOf(a.scheduledTime.day);
                        const dayB = dayOrder.indexOf(b.scheduledTime.day);

                        if (dayA !== dayB) {
                            return dayA - dayB;
                        }

                        return parseInt(a.scheduledTime.hour) - parseInt(b.scheduledTime.hour);
                    });

                setUpcomingEvents(scheduledEvents);
            } else {
                console.error('Failed to fetch upcoming events:', data.error);
                setUpcomingEvents([]);
            }
        } catch (error) {
            console.error('Error fetching upcoming events:', error);
            setUpcomingEvents([]);
        } finally {
            setLoadingUpcomingEvents(false);
        }
    };

    useEffect(() => {
        const fetchPartyDetails = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'parties', partyId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const partyData = docSnap.data() as PartyDetails;
                    setParty(partyData);

                    // Fetch member profiles
                    if (partyData.members && partyData.members.length > 0) {
                        const profiles = await getUserProfilesByIds(partyData.members);
                        setMemberProfiles(profiles);
                    }
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
            fetchMemberMetadata();
            fetchPendingRequestsCount();
            fetchEventsCount();
            fetchUpcomingEvents();
        }
    }, [partyId, user]);

    useEffect(() => {
        if (memberProfiles && memberProfiles.length > 0) {
            const allDietaryRestrictions = new Set<string>();
            const allFoodPreferences = new Set<string>();
            const allActivityPreferences = new Set<string>();

            memberProfiles.forEach(profile => {
                profile.dietaryRestrictions?.forEach(restriction =>
                    allDietaryRestrictions.add(restriction)
                );
                profile.foodPreferences?.forEach(preference =>
                    allFoodPreferences.add(preference)
                );
                profile.activityPreferences?.forEach(preference =>
                    allActivityPreferences.add(preference)
                );
            });

            setAggregatedPreferences({
                dietaryRestrictions: Array.from(allDietaryRestrictions),
                foodPreferences: Array.from(allFoodPreferences),
                activityPreferences: Array.from(allActivityPreferences)
            });
        }
    }, [memberProfiles]);

    // Helper function to get background color for initials
    const getInitialColor = (uid: string) => {
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
        ];
        const index = uid.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Helper function to get first initial
    const getInitial = (profile: UserProfile) => {
        return profile.displayName?.charAt(0)?.toUpperCase() ||
            profile.email?.charAt(0)?.toUpperCase() || 'U';
    };

    // Helper function to get user display (image or initials)
    const getUserDisplay = (profile: UserProfile) => {
        if (profile.photoURL) {
            return { type: 'image', value: profile.photoURL };
        }
        return { type: 'initial', value: getInitial(profile) };
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

    const handleRestaurantSelected = (restaurant: any) => {
        setSelectedRestaurant(restaurant);
        setActiveTab('info');
    };

    const handleConfirmSelection = (restaurant: any, selectedTimeSlot: any) => {
        console.log('Final selection confirmed:', { restaurant, selectedTimeSlot });
        // Here you can save the final selection to the database
        // and potentially navigate to a confirmation page or show a success message
        alert(`Party confirmed! ${restaurant.name} on ${selectedTimeSlot.day} at ${selectedTimeSlot.hour}`);
    };

    const handleEventSaved = () => {
        // Refresh upcoming events to update the availability grid
        fetchUpcomingEvents();
        fetchEventsCount();
    };

    const handleEditPartyName = () => {
        setEditedPartyName(party?.name || '');
        setIsEditingName(true);
    };

    const handleSavePartyName = async () => {
        if (!party || !editedPartyName.trim()) return;

        try {
            setSavingPartyName(true);
            const docRef = doc(db, 'parties', partyId);
            await updateDoc(docRef, {
                name: editedPartyName.trim()
            });

            // Update local state
            setParty(prev => prev ? { ...prev, name: editedPartyName.trim() } : null);
            setIsEditingName(false);
        } catch (error) {
            console.error('Error updating party name:', error);
            alert('Failed to update party name');
        } finally {
            setSavingPartyName(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingName(false);
        setEditedPartyName('');
    };

    const handleDeleteParty = async () => {
        if (!party) return;

        try {
            setDeletingParty(true);

            // Delete all associated data first
            const batch = writeBatch(db);

            // Delete receipts
            const receiptsQuery = query(collection(db, 'receipts'), where('partyId', '==', partyId));
            const receiptsSnapshot = await getDocs(receiptsQuery);
            receiptsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete events
            const eventsQuery = query(collection(db, 'events'), where('partyId', '==', partyId));
            const eventsSnapshot = await getDocs(eventsQuery);
            eventsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete payment requests
            const paymentsQuery = query(collection(db, 'paymentRequests'), where('partyId', '==', partyId));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            paymentsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete invitations for this party
            const invitationsQuery = query(collection(db, 'invitations'), where('partyId', '==', partyId));
            const invitationsSnapshot = await getDocs(invitationsQuery);
            invitationsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Finally delete the party itself
            const partyRef = doc(db, 'parties', partyId);
            batch.delete(partyRef);

            // Commit all deletions
            await batch.commit();

            // Close the modal and call the callback to set current party view to none
            setShowDeleteConfirm(false);
            onPartyDeleted?.();
        } catch (error) {
            console.error('Error deleting party:', error);
            alert('Failed to delete party and associated data');
        } finally {
            setDeletingParty(false);
            setShowDeleteConfirm(false);
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
                        {/* Party Header */}
                        <div className="mb-6">
                            {/* Title and Actions Row */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    {isEditingName ? (
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={editedPartyName}
                                                onChange={(e) => setEditedPartyName(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSavePartyName()}
                                                className="text-2xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleSavePartyName}
                                                disabled={savingPartyName}
                                                className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                                            >
                                                {savingPartyName ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="text-sm text-gray-600 hover:text-gray-800"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
                                            {user?.uid === party.createdBy && (
                                                <button
                                                    onClick={handleEditPartyName}
                                                    className="text-gray-400 hover:text-gray-600"
                                                    title="Edit party name"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-gray-600">{party.description}</p>
                                </div>
                                {user?.uid === party.createdBy && (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                            title="Delete party"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Members Section */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Members ({memberProfiles.length}/4)
                                    </h3>
                                    {party.members && party.members.length < 4 && (
                                        <button
                                            onClick={() => setShowInviteForm(!showInviteForm)}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                                        >
                                            {showInviteForm ? 'Cancel' : 'Invite Members'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {memberProfiles.map((profile: UserProfile) => {
                                        const display = getUserDisplay(profile);
                                        return (
                                            <div
                                                key={profile.uid}
                                                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                                                onClick={() => setSelectedUserForModal(profile)}
                                            >
                                                <div className={`w-10 h-10 rounded-full ${getInitialColor(profile.uid)} flex items-center justify-center text-white font-bold`}>
                                                    {getInitial(profile)}
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

                            {/* Upcoming Events Section */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <h3 className="text-lg font-medium text-green-900 mb-3">Upcoming Events</h3>
                                {loadingUpcomingEvents ? (
                                    <div className="text-sm text-green-700">Loading upcoming events...</div>
                                ) : upcomingEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingEvents.slice(0, 3).map((event, index) => (
                                            <div key={event.id} className="bg-white rounded-lg p-3 border border-green-200">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium text-green-900 truncate">
                                                            {event.restaurantData.restaurant?.name || 'Restaurant Event'}
                                                        </h4>
                                                        <p className="text-sm text-green-700">
                                                            {event.scheduledTime.day.charAt(0).toUpperCase() + event.scheduledTime.day.slice(1)} at {event.scheduledTime.startTime}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {upcomingEvents.length > 3 && (
                                            <div className="text-center pt-2">
                                                <button
                                                    onClick={() => {
                                                        setActiveTab('before-flow');
                                                        setShowBeforeFlow(false);
                                                        setShowScheduledEventsOnly(true);
                                                    }}
                                                    className="text-sm text-green-600 hover:text-green-800 underline"
                                                >
                                                    View all {upcomingEvents.length} events
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="text-sm text-green-700">No upcoming events scheduled</div>
                                        <button
                                            onClick={() => setActiveTab('before-flow')}
                                            className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
                                        >
                                            Plan your first event
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-600">{party.description}</p>
                        </div>

                        {/* Group Preferences */}
                        {aggregatedPreferences && (
                            <div className="bg-blue-50 rounded-lg p-4 mt-6">
                                <h3 className="text-lg font-medium text-blue-900 mb-3">Group Preferences</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <h4 className="font-medium text-blue-800 mb-2">Dietary Restrictions</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {aggregatedPreferences.dietaryRestrictions?.length > 0 ? (
                                                aggregatedPreferences.dietaryRestrictions.map((restriction: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                                                        {restriction}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-blue-600">None specified</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-blue-800 mb-2">Food Preferences</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {aggregatedPreferences.foodPreferences?.length > 0 ? (
                                                aggregatedPreferences.foodPreferences.map((preference: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                                        {preference}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-blue-600">None specified</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-blue-800 mb-2">Activity Preferences</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {aggregatedPreferences.activityPreferences?.length > 0 ? (
                                                aggregatedPreferences.activityPreferences.map((preference: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                                        {preference}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-blue-600">None specified</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Availability Grid */}
                        <div className="bg-green-50 rounded-lg p-4 mt-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-medium text-green-900">Group Availability</h3>
                                <button
                                    onClick={fetchMemberMetadata}
                                    disabled={loadingMetadata}
                                    className="text-sm text-green-700 hover:text-green-800 underline"
                                >
                                    {loadingMetadata ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>

                            {loadingMetadata ? (
                                <div className="text-center py-4">
                                    <div className="text-green-700">Loading availability data...</div>
                                </div>
                            ) : memberMetadata && memberMetadata.memberProfiles ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-max">
                                        {/* Header row with hours */}
                                        <div className="flex mb-2">
                                            <div className="w-10 flex-shrink-0"></div>
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <div key={i} className="w-8 text-xs text-center text-green-700 font-medium">
                                                    {i === 0 ? '12A' : i === 12 ? '12P' : i > 12 ? `${i - 12}P` : `${i}A`}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Days and availability grid */}
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                            <div key={day} className="flex items-center mb-1">
                                                <div className="w-10 text-sm font-medium text-green-800 capitalize flex-shrink-0">
                                                    {day === 'monday' ? 'M' :
                                                        day === 'tuesday' ? 'T' :
                                                            day === 'wednesday' ? 'W' :
                                                                day === 'thursday' ? 'Th' :
                                                                    day === 'friday' ? 'F' :
                                                                        day === 'saturday' ? 'Sa' : 'Su'}
                                                </div>
                                                <div className="flex">
                                                    {Array.from({ length: 24 }, (_, hour) => {
                                                        const hourKey = hour.toString().padStart(2, '0');
                                                        let availableCount = 0;

                                                        // Check if this time slot is already scheduled
                                                        const isScheduled = isTimeSlotScheduled(day, hour);

                                                        // Count how many members are available at this time
                                                        memberMetadata.memberProfiles.forEach((member: any) => {
                                                            if (member.availability &&
                                                                member.availability[day] &&
                                                                member.availability[day][hourKey]) {
                                                                availableCount++;
                                                            }
                                                        });

                                                        const totalMembers = memberMetadata.memberProfiles.length;
                                                        const availabilityRatio = totalMembers > 0 ? availableCount / totalMembers : 0;

                                                        // Calculate color intensity based on availability ratio
                                                        const getColorClass = (ratio: number) => {
                                                            if (ratio === 0) return 'bg-gray-100';
                                                            if (ratio <= 0.25) return 'bg-green-200';
                                                            if (ratio <= 0.5) return 'bg-green-300';
                                                            if (ratio <= 0.75) return 'bg-green-400';
                                                            return 'bg-green-600';
                                                        };

                                                        // If scheduled, show as unavailable regardless of availability
                                                        const finalColorClass = isScheduled ? 'bg-gray-300' : getColorClass(availabilityRatio);

                                                        return (
                                                            <div
                                                                key={hour}
                                                                className={`w-8 h-6 border border-white ${finalColorClass} flex items-center justify-center relative ${isScheduled ? 'border-gray-400 border-2' : ''}`}
                                                                title={isScheduled 
                                                                    ? `Scheduled event at ${hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}`
                                                                    : `${availableCount}/${totalMembers} available at ${hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}`
                                                                }
                                                            >
                                                                {isScheduled ? (
                                                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                ) : availableCount > 0 && (
                                                                    <span className="text-xs font-bold text-white">
                                                                        {availableCount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
                                            <span className="text-gray-600">None</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
                                                <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-600">Scheduled</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 bg-green-200 border border-gray-300"></div>
                                            <span className="text-gray-600">1-25%</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 bg-green-300 border border-gray-300"></div>
                                            <span className="text-gray-600">26-50%</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 bg-green-400 border border-gray-300"></div>
                                            <span className="text-gray-600">51-75%</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 bg-green-600 border border-gray-300"></div>
                                            <span className="text-gray-600">76-100%</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-max">
                                        {/* Skeleton Header row with hours */}
                                        <div className="flex mb-2">
                                            <div className="w-20 flex-shrink-0"></div>
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <div key={i} className="w-8 text-xs text-center text-gray-400 font-medium">
                                                    {i === 0 ? '12A' : i === 12 ? '12P' : i > 12 ? `${i - 12}P` : `${i}A`}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Skeleton Days and availability grid */}
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                            <div key={day} className="flex items-center mb-1">
                                                <div className="w-20 text-sm font-medium text-gray-400 capitalize flex-shrink-0">
                                                    {day === 'monday' ? 'M' :
                                                        day === 'tuesday' ? 'T' :
                                                            day === 'wednesday' ? 'W' :
                                                                day === 'thursday' ? 'Th' :
                                                                    day === 'friday' ? 'F' :
                                                                        day === 'saturday' ? 'Sa' : 'Su'}
                                                </div>
                                                <div className="flex">
                                                    {Array.from({ length: 24 }, (_, hour) => (
                                                        <div
                                                            key={hour}
                                                            className="w-8 h-6 border border-gray-200 bg-gray-100 animate-pulse"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 text-center text-sm text-gray-500">
                                        Click "Refresh" to load availability data
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pending Invitations Bar */}
                        {pendingInvitations.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Pending Invitations ({pendingInvitations.length})</h3>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                            <span className="text-sm font-medium text-yellow-800">Invitations sent</span>
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
            case 'receipts':
                return (
                    <div className="space-y-6">
                        {/* Toggle Buttons */}
                        <div className="p-4">
                            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setShowUploadReceipt(true)}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${showUploadReceipt
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Upload Receipt
                                </button>
                                <button
                                    onClick={() => setShowUploadReceipt(false)}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${!showUploadReceipt
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    View Receipts
                                </button>
                            </div>
                        </div>

                        {/* Content based on toggle */}
                        {showUploadReceipt ? (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Receipt</h2>
                                <PartyReceiptUpload partyId={partyId} />
                            </div>
                        ) : (
                            <PartyReceipts partyId={partyId} memberProfiles={memberProfiles} />
                        )}
                    </div>
                );
            case 'requests':
                return <PartyPaymentRequests partyId={partyId} memberProfiles={memberProfiles} onRequestsUpdate={setPendingRequestsCount} />;
            case 'before-flow':
                return (
                    <div className="space-y-6">
                        {/* Toggle Buttons */}
                        <div className="p-4">
                            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setShowBeforeFlow(true)}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${showBeforeFlow
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Find Event
                                </button>
                                <button
                                    onClick={() => setShowBeforeFlow(false)}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${!showBeforeFlow
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    View Events
                                </button>
                            </div>
                        </div>

                        {/* Content based on toggle */}
                        {showBeforeFlow ? (
                            <BeforeFlowTab partyId={partyId} onEventSaved={handleEventSaved} />
                        ) : (
                            <EventsList partyId={partyId} showScheduledOnly={showScheduledEventsOnly} upcomingEvents={upcomingEvents} onEventsChange={handleEventSaved} />
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 h-full">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${((activeTab as any) === 'info')
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Party
                    </button>
                    <button
                        onClick={() => setActiveTab('before-flow')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${((activeTab as any) === 'before-flow')
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            <span>Events</span>
                            <div className="flex items-center space-x-1">
                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600">
                                        {loadingEventsCount ? '...' : eventsCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('receipts')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${((activeTab as any) === 'receipts')
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            <span>Receipts</span>
                            <div className="flex items-center space-x-1">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-green-600">
                                        {receipts.length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${((activeTab as any) === 'requests')
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            <span>Payments</span>
                            {pendingRequestsCount > 0 && (
                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </div>
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

            {selectedUserForModal && (
                <UserMetadataModal
                    userProfile={selectedUserForModal}
                    onClose={() => setSelectedUserForModal(null)}
                />
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
                                                    <span className="font-medium text-green-800">Total Available Hours:</span> {commonTimes.totalAvailableHours}
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
                                                                    {day.hourCount} hours
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

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Delete Party</h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>"{party?.name}"</strong>? This action will permanently delete:
                            </p>
                            <ul className="text-sm text-gray-600 mb-6 space-y-2">
                                <li className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>All party events and scheduled activities</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>All uploaded receipts and payment data</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>All pending payment requests</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>All party invitations</span>
                                </li>
                            </ul>
                            <p className="text-sm text-red-600 font-medium mb-6">
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteParty}
                                    disabled={deletingParty}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deletingParty ? 'Deleting...' : 'Delete Party'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SingleParty: React.FC<SinglePartyProps> = ({ partyId, onPartyDeleted }) => {
    return (
        <PartyProvider partyId={partyId}>
            <VideoAnalysisProvider>
                <UploadProvider>
                    <SinglePartyContent partyId={partyId} onPartyDeleted={onPartyDeleted} />
                </UploadProvider>
            </VideoAnalysisProvider>
        </PartyProvider>
    );
};

// Simple Modal for User Metadata
const UserMetadataModal: React.FC<{ userProfile: UserProfile; onClose: () => void }> = ({ userProfile, onClose }) => {
    if (!userProfile) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{userProfile.displayName || 'User Details'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-600">{userProfile.email}</span></p>
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Dietary Restrictions:</h4>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.dietaryRestrictions?.length ? userProfile.dietaryRestrictions.map(r => <span key={r} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">{r}</span>) : <span className="text-gray-500 text-sm">None</span>}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Food Preferences:</h4>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.foodPreferences?.length ? userProfile.foodPreferences.map(p => <span key={p} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">{p}</span>) : <span className="text-gray-500 text-sm">None</span>}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Activity Preferences:</h4>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.activityPreferences?.length ? userProfile.activityPreferences.map(a => <span key={a} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">{a}</span>) : <span className="text-gray-500 text-sm">None</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SingleParty;