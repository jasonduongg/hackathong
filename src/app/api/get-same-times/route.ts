import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getUserProfilesByIds, UserProfile } from '@/lib/users';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const partyId = searchParams.get('partyId');

        if (!partyId) {
            return NextResponse.json(
                { error: 'Party ID is required' },
                { status: 400 }
            );
        }

        // Get the party document
        const partyRef = doc(db, 'parties', partyId);
        const partySnap = await getDoc(partyRef);

        if (!partySnap.exists()) {
            return NextResponse.json(
                { error: 'Party not found' },
                { status: 404 }
            );
        }

        const partyData = partySnap.data();
        const memberIds = partyData.members || [];

        if (memberIds.length === 0) {
            return NextResponse.json({
                success: true,
                party: {
                    id: partyId,
                    name: partyData.name,
                    description: partyData.description,
                    createdBy: partyData.createdBy,
                    createdAt: partyData.createdAt,
                    members: []
                },
                memberProfiles: [],
                memberCount: 0
            });
        }

        // Get member profiles
        const memberProfiles = await getUserProfilesByIds(memberIds);

        // Return comprehensive member metadata
        return NextResponse.json({
            success: true,
            party: {
                id: partyId,
                name: partyData.name,
                description: partyData.description,
                createdBy: partyData.createdBy,
                createdAt: partyData.createdAt,
                members: memberIds
            },
            memberProfiles: memberProfiles.map(profile => ({
                uid: profile.uid,
                email: profile.email,
                displayName: profile.displayName,
                photoURL: profile.photoURL,
                dietaryRestrictions: profile.dietaryRestrictions || [],
                foodPreferences: profile.foodPreferences || [],
                activityPreferences: profile.activityPreferences || [],
                availability: profile.availability || {},
                address: profile.address,
                job: profile.job,
                bio: profile.bio,
                location: profile.location,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt
            })),
            memberCount: memberProfiles.length
        });

    } catch (error) {
        console.error('Error fetching party member metadata:', error);
        return NextResponse.json(
            { error: 'Failed to fetch party member metadata' },
            { status: 500 }
        );
    }
}
