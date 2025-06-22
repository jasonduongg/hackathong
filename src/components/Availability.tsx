import React, { useState } from 'react';

interface RestaurantInfo {
    name: string;
    address: string;
    isChain?: boolean;
    chainName?: string;
    rating?: number;
    phone?: string;
    website?: string;
    hours?: string[];
    distanceFromParty?: number;
}

interface AvailabilityProps {
    loadingMetadata: boolean;
    commonTimes: any;
    fetchMemberMetadata: () => void;
    selectedRestaurant?: RestaurantInfo | null;
    onConfirmSelection?: (restaurant: RestaurantInfo, selectedTimeSlot: { day: string; hour: string } | null) => void;
    upcomingEvents?: any[];
}

interface TimeSlot {
    hour: string;
    timeRange: string;
    startTime: string;
    endTime: string;
    isSelected: boolean;
}

const Availability: React.FC<AvailabilityProps> = ({ 
    loadingMetadata, 
    commonTimes, 
    fetchMemberMetadata, 
    selectedRestaurant,
    onConfirmSelection,
    upcomingEvents
}) => {
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ day: string; hour: string } | null>(null);

    // Function to check if a time slot is already scheduled
    const isTimeSlotScheduled = (day: string, hour: string) => {
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
    };

    const handleTimeSlotSelect = (day: string, hour: string) => {
        // If clicking the same slot, deselect it
        if (selectedTimeSlot?.day === day && selectedTimeSlot?.hour === hour) {
            setSelectedTimeSlot(null);
        } else {
            // Otherwise, select the new slot (replacing any previous selection)
            setSelectedTimeSlot({ day, hour });
        }
    };

    const clearSelection = () => {
        setSelectedTimeSlot(null);
    };

    const isSlotSelected = (day: string, hour: string) => {
        return selectedTimeSlot?.day === day && selectedTimeSlot?.hour === hour;
    };

    const getSelectedSlotInfo = () => {
        if (!selectedTimeSlot || !commonTimes?.commonTimes) return null;
        
        const day = commonTimes.commonTimes.find((d: any) => d.day === selectedTimeSlot.day);
        if (!day) return null;
        
        const slot = day.timeSlots?.find((s: TimeSlot) => s.hour === selectedTimeSlot.hour);
        return slot ? { day: day.day, slot } : null;
    };

    const handleConfirmSelection = () => {
        if (selectedRestaurant && onConfirmSelection) {
            onConfirmSelection(selectedRestaurant, selectedTimeSlot);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Selected Restaurant Display */}
            {selectedRestaurant && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center mb-2">
                                <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                </svg>
                                <h3 className="text-lg font-medium text-blue-900">Selected Restaurant</h3>
                            </div>
                            <div className="text-sm text-blue-800">
                                <p className="font-semibold text-base">{selectedRestaurant.name}</p>
                                <p className="text-blue-700">{selectedRestaurant.address}</p>
                                {selectedRestaurant.rating && (
                                    <p className="text-blue-600">Rating: {selectedRestaurant.rating}/5</p>
                                )}
                                {selectedRestaurant.distanceFromParty && (
                                    <p className="text-blue-600">
                                        Distance: {selectedRestaurant.distanceFromParty.toFixed(1)} km from party center
                                    </p>
                                )}
                                {selectedRestaurant.isChain && selectedRestaurant.chainName && (
                                    <p className="text-blue-600">Chain: {selectedRestaurant.chainName}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Choose Time</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={clearSelection}
                        disabled={!selectedTimeSlot}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Clear Selection
                    </button>
                    <button
                        onClick={fetchMemberMetadata}
                        disabled={loadingMetadata}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingMetadata ? 'Loading...' : 'Refresh Availability'}
                    </button>
                </div>
            </div>

            {/* Selection Summary */}
            {selectedTimeSlot && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="font-medium text-green-900">Selected Time: </span>
                            {(() => {
                                const info = getSelectedSlotInfo();
                                return info ? (
                                    <span className="text-green-700 capitalize">
                                        {info.day} at {info.slot.startTime} - {info.slot.endTime}
                                    </span>
                                ) : (
                                    <span className="text-green-700">Loading...</span>
                                );
                            })()}
                        </div>
                        <button
                            onClick={clearSelection}
                            className="text-green-600 hover:text-green-800 text-sm underline"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Confirm Button */}
            {selectedRestaurant && selectedTimeSlot && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-yellow-900">Ready to Confirm?</h3>
                            <p className="text-sm text-yellow-700">
                                You've selected {selectedRestaurant.name} for {(() => {
                                    const info = getSelectedSlotInfo();
                                    return info ? `${info.day} at ${info.slot.startTime}` : 'your selected time';
                                })()}
                            </p>
                        </div>
                        <button
                            onClick={handleConfirmSelection}
                            className="px-6 py-3 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
                        >
                            Confirm Selection
                        </button>
                    </div>
                </div>
            )}

            {loadingMetadata ? (
                <div className="text-center py-8">
                    <div className="text-lg">Loading availability data...</div>
                </div>
            ) : commonTimes ? (
                <div className="space-y-6">
                    {/* Common Times Summary */}
                    <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-green-900 mb-3">Common Availability Times</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                                <span className="font-medium text-green-800">Total Available Hours:</span> {commonTimes.totalAvailableHours}
                            </div>
                            <div>
                                <span className="font-medium text-green-800">Total Time Slots:</span> {commonTimes.totalAvailableSlots || commonTimes.totalAvailableHours}
                            </div>
                            <div>
                                <span className="font-medium text-green-800">Days with Common Times:</span> {commonTimes.commonTimes.length}
                            </div>
                        </div>

                        {commonTimes.commonTimes.length > 0 ? (
                            <div className="space-y-6">
                                {commonTimes.commonTimes.map((day: any, index: number) => (
                                    <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-medium text-green-800 capitalize text-lg">{day.day}</h4>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-green-600">
                                                    {day.timeSlots?.length || day.hourCount} available slots
                                                </span>
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                    {day.hourCount} hours
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Individual Time Slots */}
                                        <div className="mb-4">
                                            <h5 className="font-medium text-gray-700 mb-3">Select a 1-Hour Time Slot:</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {day.timeSlots?.map((slot: TimeSlot, slotIndex: number) => {
                                                    const isScheduled = isTimeSlotScheduled(day.day, slot.hour);
                                                    
                                                    // Skip rendering if this slot is scheduled
                                                    if (isScheduled) {
                                                        return (
                                                            <div
                                                                key={slotIndex}
                                                                className="p-3 rounded-lg border-2 text-sm font-medium bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed flex items-center justify-center"
                                                                title={`Scheduled event at ${slot.startTime}`}
                                                            >
                                                                <div className="text-center">
                                                                    <div className="font-semibold">{slot.startTime}</div>
                                                                    <div className="text-xs opacity-75">to {slot.endTime}</div>
                                                                    <div className="text-xs text-gray-500 mt-1">Scheduled</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <button
                                                            key={slotIndex}
                                                            onClick={() => handleTimeSlotSelect(day.day, slot.hour)}
                                                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                                                                isSlotSelected(day.day, slot.hour)
                                                                    ? 'bg-blue-500 text-white border-blue-500'
                                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                                                            }`}
                                                        >
                                                            <div className="font-semibold">{slot.startTime}</div>
                                                            <div className="text-xs opacity-75">to {slot.endTime}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Grouped Time Ranges (for reference) */}
                                        <div>
                                            <h5 className="font-medium text-gray-700 mb-2">Available Time Ranges:</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {day.timeRanges?.map((range: string, rangeIndex: number) => (
                                                    <span key={rangeIndex} className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded border">
                                                        {range}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <div className="text-lg text-green-700 mb-2">No common times found</div>
                                <div className="text-sm text-green-600">All members need to be available at the same time</div>
                            </div>
                        )}
                    </div>

                    {/* Member Availability Status */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Member Availability Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {commonTimes.members?.map((member: any) => (
                                <div key={member.uid} className="bg-white rounded-lg p-3 border">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                                            {member.displayName?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 text-sm">{member.displayName || 'Unknown User'}</div>
                                            <div className="text-xs text-gray-500">{member.email}</div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${member.hasAvailability
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {member.hasAvailability ? 'Available' : 'No Schedule'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="text-lg text-gray-500 mb-4">No availability data loaded</div>
                    <button
                        onClick={fetchMemberMetadata}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                    >
                        Load Availability Data
                    </button>
                </div>
            )}
        </div>
    );
};

export default Availability; 