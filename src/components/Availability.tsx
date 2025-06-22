import React from 'react';

interface AvailabilityProps {
    loadingMetadata: boolean;
    commonTimes: any;
    fetchMemberMetadata: () => void;
}

const Availability: React.FC<AvailabilityProps> = ({ loadingMetadata, commonTimes, fetchMemberMetadata }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Party Availability</h2>
                <button
                    onClick={fetchMemberMetadata}
                    disabled={loadingMetadata}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loadingMetadata ? 'Loading...' : 'Refresh Availability'}
                </button>
            </div>

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
                                <span className="font-medium text-green-800">Days with Common Times:</span> {commonTimes.commonTimes.length}
                            </div>
                            <div>
                                <span className="font-medium text-green-800">Member Count:</span> {commonTimes.memberCount}
                            </div>
                        </div>

                        {commonTimes.commonTimes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {commonTimes.commonTimes.map((day: any, index: number) => (
                                    <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-medium text-green-800 capitalize">{day.day}</h4>
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                {day.hourCount} hours
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {day.timeRanges.map((range: string, rangeIndex: number) => (
                                                <div key={rangeIndex} className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded border">
                                                    {range}
                                                </div>
                                            ))}
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