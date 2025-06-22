'use client';

import React, { useState } from 'react';

interface ChainLocationFinderProps {
    partyId: string;
    onLocationFound: (data: any) => void;
}

const ChainLocationFinder: React.FC<ChainLocationFinderProps> = ({ partyId, onLocationFound }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [restaurantData, setRestaurantData] = useState('');

    const handleFindLocation = async () => {
        if (!restaurantData.trim()) {
            setError('Please enter restaurant data');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Parse the JSON data
            let parsedData;
            try {
                parsedData = JSON.parse(restaurantData);
            } catch (parseError) {
                setError('Invalid JSON format. Please check your restaurant data.');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/find-nearest-chain-location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    partyId, 
                    restaurantData: parsedData 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error === 'No members with addresses found') {
                    setError(`No members have completed their address information. Please ask party members to complete their profile with their full address (street, city, state).`);
                } else if (data.error === 'Could not geocode any member addresses') {
                    setError(`Unable to find the locations for member addresses. Please ensure addresses are complete and valid (street, city, state, zip code).`);
                } else if (data.error === 'Google Maps API key is missing') {
                    setError(`Google Maps API is not configured. Please contact the administrator.`);
                } else if (data.error.includes('No locations found for')) {
                    setError(`No locations found for this restaurant. It may not have multiple locations or may not be in the search area.`);
                } else {
                    setError(data.error || 'Failed to find nearest chain location');
                }
                return;
            }

            setResult(data.data);
            onLocationFound(data.data);
        } catch (err) {
            console.error('Error finding chain location:', err);
            setError('Failed to connect to the chain location finder service');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Find Nearest Chain Location</h3>
                <p className="text-sm text-gray-500">
                    Paste restaurant data from a video to find the nearest location of that restaurant chain
                </p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Data (JSON Format)
                </label>
                <textarea
                    value={restaurantData}
                    onChange={(e) => setRestaurantData(e.target.value)}
                    placeholder="Paste the restaurant JSON data here..."
                    className="w-full h-48 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
            </div>

            <div className="flex justify-end mb-4">
                <button
                    onClick={handleFindLocation}
                    disabled={loading || !restaurantData.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Finding...' : 'Find Nearest Location'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Unable to find location</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                                {error.includes('address') && (
                                    <div className="mt-2">
                                        <p className="font-medium">To fix this:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li>Complete your profile with your full address (street, city, state)</li>
                                            <li>Ask other party members to add their complete addresses</li>
                                            <li>Ensure addresses include street, city, and state for best results</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {result && (
                <div className="space-y-4">
                    {/* Original Restaurant Info */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Original Restaurant</h4>
                        <div className="text-sm text-gray-700">
                            <p><strong>{result.originalRestaurant.name}</strong></p>
                            <p>{result.originalRestaurant.address}</p>
                            {result.originalRestaurant.rating && (
                                <p>Rating: {result.originalRestaurant.rating}/5</p>
                            )}
                        </div>
                    </div>

                    {/* Nearest Location */}
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-green-800">Nearest Location Found!</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>
                                        <strong>
                                            {result.nearestLocation.googleMapsUrl ? (
                                                <a 
                                                    href={result.nearestLocation.googleMapsUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-green-800 hover:text-green-900 underline"
                                                >
                                                    {result.nearestLocation.name}
                                                </a>
                                            ) : (
                                                result.nearestLocation.name
                                            )}
                                        </strong>
                                    </p>
                                    <p>{result.nearestLocation.address}</p>
                                    {result.nearestLocation.rating && (
                                        <p>Rating: {result.nearestLocation.rating}/5</p>
                                    )}
                                    <p className="mt-2 text-xs">
                                        Distance from party center: {result.nearestLocation.distanceFromParty.toFixed(1)} km
                                    </p>
                                    
                                    {/* Hours for nearest location */}
                                    {result.nearestLocation.hours && result.nearestLocation.hours.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-green-700 mb-1">Hours:</p>
                                            <div className="grid grid-cols-1 gap-1">
                                                {result.nearestLocation.hours.map((hour: string, index: number) => (
                                                    <p key={index} className="text-xs text-green-600">{hour}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Contact info for nearest location */}
                                    {(result.nearestLocation.phone || result.nearestLocation.website) && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                            {result.nearestLocation.phone && (
                                                <p className="text-xs text-green-600">📞 {result.nearestLocation.phone}</p>
                                            )}
                                            {result.nearestLocation.website && (
                                                <a 
                                                    href={result.nearestLocation.website} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-green-600 hover:text-green-800 underline"
                                                >
                                                    🌐 Website
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* All Locations */}
                    {result.allLocations.length > 1 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-3">Top 3 Closest Locations ({result.allLocations.length} shown of {result.analysis.totalLocationsFound} total)</h4>
                            <div className="space-y-3">
                                {result.allLocations
                                    .sort((a: any, b: any) => a.distance - b.distance)
                                    .map((location: any, index: number) => (
                                        <div key={index} className="bg-white rounded border border-blue-100 p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-blue-800">
                                                        {location.googleMapsUrl ? (
                                                            <a 
                                                                href={location.googleMapsUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-800 hover:text-blue-900 underline"
                                                            >
                                                                {location.name}
                                                            </a>
                                                        ) : (
                                                            location.name
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-blue-600">{location.address}</p>
                                                </div>
                                                <div className="text-right ml-2">
                                                    <p className="text-xs text-blue-600 font-medium">{location.distance.toFixed(1)} km</p>
                                                    {location.rating && (
                                                        <p className="text-xs text-blue-600">★ {location.rating}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Hours */}
                                            {location.hours && location.hours.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-blue-700 mb-1">Hours:</p>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {location.hours.map((hour: string, hourIndex: number) => (
                                                            <p key={hourIndex} className="text-xs text-blue-600">{hour}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Contact Info */}
                                            {(location.phone || location.website) && (
                                                <div className="mt-2 pt-2 border-t border-blue-100">
                                                    {location.phone && (
                                                        <p className="text-xs text-blue-600">📞 {location.phone}</p>
                                                    )}
                                                    {location.website && (
                                                        <a 
                                                            href={location.website} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            🌐 Website
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Analysis */}
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-purple-900 mb-2">Analysis</h4>
                        <div className="text-sm text-purple-700 space-y-1">
                            <p>Total locations found: {result.analysis.totalLocationsFound}</p>
                            <p>Search radius: {result.analysis.searchRadius}</p>
                            <p>Is chain: {result.analysis.isChain ? 'Yes' : 'No'}</p>
                            <p>Party members with addresses: {result.partyInfo.memberCount}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChainLocationFinder; 