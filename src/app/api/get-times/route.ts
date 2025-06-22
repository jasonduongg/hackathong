import { NextRequest, NextResponse } from 'next/server';

interface MemberProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    dietaryRestrictions?: string[];
    foodPreferences?: string[];
    activityPreferences?: string[];
    availability?: {
        [day: string]: {
            [hour: string]: boolean;
        };
    };
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    job?: string;
    bio?: string;
    location?: string;
    createdAt?: any;
    updatedAt?: any;
}

interface RequestBody {
    memberProfiles: MemberProfile[];
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();
        const { memberProfiles } = body;

        if (!memberProfiles || !Array.isArray(memberProfiles) || memberProfiles.length === 0) {
            return NextResponse.json(
                { error: 'Member profiles array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Find common availability times where ALL members are available
        const commonTimes = findCommonAvailabilityTimes(memberProfiles);

        // Also extract aggregated preferences for additional context
        const aggregatedPreferences = extractAggregatedPreferences(memberProfiles);

        return NextResponse.json({
            success: true,
            commonTimes,
            memberCount: memberProfiles.length,
            totalSlots: commonTimes.reduce((total, day) => total + day.availableSlots.length, 0),
            aggregatedPreferences,
            members: memberProfiles.map(profile => ({
                uid: profile.uid,
                displayName: profile.displayName,
                email: profile.email,
                hasAvailability: !!profile.availability && Object.keys(profile.availability).length > 0
            }))
        });

    } catch (error) {
        console.error('Error processing member availability:', error);
        return NextResponse.json(
            { error: 'Failed to process member availability' },
            { status: 500 }
        );
    }
}

// Helper function to extract aggregated preferences
function extractAggregatedPreferences(memberProfiles: MemberProfile[]) {
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

    return {
        dietaryRestrictions: Array.from(allDietaryRestrictions),
        foodPreferences: Array.from(allFoodPreferences),
        activityPreferences: Array.from(allActivityPreferences)
    };
}

// Helper function to find common availability times where ALL members are available
function findCommonAvailabilityTimes(memberProfiles: MemberProfile[]) {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    
    const commonTimes: any[] = [];

    daysOfWeek.forEach(day => {
        const dayCommonSlots: string[] = [];
        
        hours.forEach(hour => {
            let allAvailable = true;
            
            // Check if ALL members are available at this time slot
            memberProfiles.forEach(profile => {
                const availability = profile.availability;
                if (!availability || !availability[day] || !availability[day][hour]) {
                    allAvailable = false;
                }
            });
            
            // Only include time slots where ALL members are available
            if (allAvailable) {
                dayCommonSlots.push(hour);
            }
        });
        
        if (dayCommonSlots.length > 0) {
            // Group consecutive hours into time ranges
            const timeRanges = groupConsecutiveHours(dayCommonSlots);
            commonTimes.push({
                day,
                timeRanges,
                availableSlots: dayCommonSlots,
                slotCount: dayCommonSlots.length
            });
        }
    });

    return commonTimes;
}

// Helper function to group consecutive hours into ranges
function groupConsecutiveHours(hours: string[]): string[] {
    if (hours.length === 0) return [];
    
    const ranges: string[] = [];
    let start = parseInt(hours[0]);
    let end = start;
    
    for (let i = 1; i < hours.length; i++) {
        const current = parseInt(hours[i]);
        if (current === end + 1) {
            end = current;
        } else {
            ranges.push(formatTimeRange(start, end));
            start = current;
            end = current;
        }
    }
    
    ranges.push(formatTimeRange(start, end));
    return ranges;
}

// Helper function to format time range
function formatTimeRange(start: number, end: number): string {
    const formatHour = (hour: number) => {
        if (hour === 0) return '12:00 AM';
        if (hour < 12) return `${hour}:00 AM`;
        if (hour === 12) return '12:00 PM';
        return `${hour - 12}:00 PM`;
    };
    
    if (start === end) {
        return formatHour(start);
    }
    
    return `${formatHour(start)} - ${formatHour(end)}`;
}
