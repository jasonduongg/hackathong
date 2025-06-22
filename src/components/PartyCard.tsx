import React from 'react';
import { Party } from '@/lib/parties';
import { UserProfile } from '@/lib/users';

interface PartyCardProps {
    party: Party;
    memberProfiles: UserProfile[];
    isSelected: boolean;
    onSelect: (partyId: string) => void;
}

export const PartyCard: React.FC<PartyCardProps> = ({
    party,
    memberProfiles,
    isSelected,
    onSelect
}) => {
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

    // Helper function to format creation date
    const formatCreationDate = (createdAt: any) => {
        if (!createdAt) return 'Unknown';
        const date = createdAt;
        if (date.toDate && typeof date.toDate === 'function') {
            return date.toDate().toLocaleDateString();
        }
        if (date instanceof Date) {
            return date.toLocaleDateString();
        }
        return new Date(date).toLocaleDateString();
    };

    return (
        <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors shadow-sm ${isSelected
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:bg-white hover:shadow-md'
                }`}
            onClick={() => onSelect(party.id)}
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
                    {memberProfiles?.slice(0, 4).map((profile, index) => {
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
                Created: {formatCreationDate(party.createdAt)}
            </p>
        </div>
    );
}; 