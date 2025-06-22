'use client';

import React from 'react';
import { Invitation } from '@/lib/parties';

interface InvitationsListProps {
    invitations: Invitation[];
    onInvitationResponse: (invitationId: string, status: 'accepted' | 'declined') => void;
}

export const InvitationsList: React.FC<InvitationsListProps> = ({
    invitations,
    onInvitationResponse
}) => {
    if (invitations.length === 0) {
        return null;
    }

    return (
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
                                onClick={() => onInvitationResponse(invitation.id, 'accepted')}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                Accept
                            </button>
                            <button
                                onClick={() => onInvitationResponse(invitation.id, 'declined')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 