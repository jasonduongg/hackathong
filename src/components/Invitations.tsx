'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getInvitationsByUser,
    updateInvitationStatus,
    addMemberToParty,
    Invitation
} from '@/lib/parties';

export const Invitations: React.FC = () => {
    const { user } = useAuth();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');

    useEffect(() => {
        if (user) {
            fetchInvitations();
        }
    }, [user]);

    const fetchInvitations = async () => {
        if (!user) return;

        try {
            const invitationsData = await getInvitationsByUser(user.uid);
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

            // Refresh invitations
            await fetchInvitations();

        } catch (error) {
            console.error('Error responding to invitation:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'accepted':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'declined':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'accepted':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'declined':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const filteredInvitations = invitations.filter(invitation => {
        if (filter === 'all') return true;
        return invitation.status === filter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading invitations...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-md">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">My Invitations</h1>
                        <div className="flex space-x-2">
                            {(['all', 'pending', 'accepted', 'declined'] as const).map((filterOption) => (
                                <button
                                    key={filterOption}
                                    onClick={() => setFilter(filterOption)}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === filterOption
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Invitations List */}
                <div className="p-6">
                    {filteredInvitations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations found</h3>
                            <p className="text-gray-500">
                                {filter === 'all'
                                    ? "You don't have any invitations yet."
                                    : `You don't have any ${filter} invitations.`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredInvitations.map((invitation) => (
                                <div key={invitation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Invitation to "{invitation.partyName}"
                                                </h3>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invitation.status)}`}>
                                                    {getStatusIcon(invitation.status)}
                                                    <span className="ml-1 capitalize">{invitation.status}</span>
                                                </span>
                                            </div>

                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p><span className="font-medium">From:</span> {invitation.fromUserName}</p>
                                                <p><span className="font-medium">Received:</span> {(() => {
                                                    if (!invitation.createdAt) return 'Unknown';
                                                    const date = invitation.createdAt as any;
                                                    if (date.toDate && typeof date.toDate === 'function') {
                                                        return date.toDate().toLocaleDateString() + ' ' + date.toDate().toLocaleTimeString();
                                                    }
                                                    if (date instanceof Date) {
                                                        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                                                    }
                                                    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
                                                })()}</p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {invitation.status === 'pending' && (
                                            <div className="flex space-x-2 ml-4">
                                                <button
                                                    onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                                                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Decline
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 