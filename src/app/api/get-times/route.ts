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
    createdAt?: any;
    updatedAt?: any;
}

interface RequestBody {
    memberProfiles: MemberProfile[];
    upcomingEvents?: any[];
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();
        const { memberProfiles, upcomingEvents = [] } = body;

        if (!memberProfiles || !Array.isArray(memberProfiles) || memberProfiles.length === 0) {
            return NextResponse.json(
                { error: 'Member profiles array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Find common availability times where ALL members are available
        const commonTimes = findCommonAvailabilityTimes(memberProfiles, upcomingEvents);

        // Also extract aggregated preferences for additional context
        const aggregatedPreferences = extractAggregatedPreferences(memberProfiles);

        // Calculate total available time slots across all days
        const totalAvailableSlots = commonTimes.reduce((total, day) => total + day.timeSlots.length, 0);

        return NextResponse.json({
            success: true,
            commonTimes,
            memberCount: memberProfiles.length,
            totalAvailableHours: commonTimes.reduce((total, day) => total + day.availableSlots.length, 0),
            totalAvailableSlots, // Total number of 1-hour slots available
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

// Helper function to check if a time slot is already scheduled
function isTimeSlotScheduled(day: string, hour: string, upcomingEvents: any[]): boolean {
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
        
        // Check if the current hour falls within the event's time range
        return parseInt(hour) >= eventStartHour && parseInt(hour) < eventEndHour;
    });
}

// Helper function to find common availability times where ALL members are available
function findCommonAvailabilityTimes(memberProfiles: MemberProfile[], upcomingEvents: any[]) {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    
    const commonTimes: any[] = [];

    daysOfWeek.forEach(day => {
        const dayCommonSlots: string[] = [];
        
        hours.forEach(hour => {
            // Skip if this time slot is already scheduled
            if (isTimeSlotScheduled(day, hour, upcomingEvents)) {
                return;
            }
            
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
            // Create individual 1-hour time slots for selection
            const timeSlots = dayCommonSlots.map(hour => ({
                hour: hour,
                timeRange: formatTimeSlot(hour),
                startTime: formatHour(parseInt(hour)),
                endTime: formatHour(parseInt(hour) + 1),
                isSelected: false // Default to not selected
            }));

            // Also keep the grouped ranges for display purposes
            const timeRanges = groupConsecutiveHours(dayCommonSlots);
            
            commonTimes.push({
                day,
                timeSlots, // Individual 1-hour slots for selection
                timeRanges, // Grouped ranges for display
                availableSlots: dayCommonSlots,
                hourCount: dayCommonSlots.length,
                totalSlots: dayCommonSlots.length
            });
        }
    });

    return commonTimes;
}

// Helper function to format individual time slot
function formatTimeSlot(hour: string): string {
    const h = parseInt(hour);
    const startTime = formatHour(h);
    const endTime = formatHour(h + 1);
    return `${startTime} - ${endTime}`;
}

// Helper function to format hour for display
function formatHour(hour: number): string {
    const h = hour % 24;
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
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
    // An hour slot '18' means 18:00-19:00. So the range is from start to end+1.
    return `${formatHour(start)} - ${formatHour(end + 1)}`;
}
