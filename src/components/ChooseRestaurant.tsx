'use client';

import React, { useState } from 'react';
import ChainLocationFinder from './ChainLocationFinder';

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
    googleMapsUrl?: string;
}

interface ChooseRestaurantProps {
    partyId: string;
    onRestaurantSelected: (restaurant: RestaurantInfo) => void;
    onChainLocationFound: (data: any) => void;
    selectedRestaurant?: RestaurantInfo | null;
}

const ChooseRestaurant: React.FC<ChooseRestaurantProps> = ({ 
    partyId, 
    onRestaurantSelected,
    onChainLocationFound,
    selectedRestaurant
}) => {
    const [selectedRestaurantData, setSelectedRestaurantData] = useState<RestaurantInfo | null>(selectedRestaurant || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<RestaurantInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchError('Please enter a restaurant name');
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        setSearchResults([]);

        try {
            const response = await fetch('/api/search-restaurant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    partyId,
                    restaurantName: searchQuery.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                setSearchResults(data.data.allLocations);
                console.log('Search results:', data.data.allLocations);
            } else {
                setSearchError(data.error || 'Failed to search for restaurant');
                console.error('Search error:', data);
            }
        } catch (error) {
            console.error('Error searching restaurant:', error);
            setSearchError('Failed to search for restaurant. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRestaurantFound = (data: any) => {
        // Handle both old format (single restaurant) and new format (multiple restaurants)
        let restaurantInfo: RestaurantInfo;
        
        if (data.restaurant) {
            // Old format - single restaurant
            restaurantInfo = {
                name: data.restaurant.name,
                address: data.restaurant.address,
                isChain: data.restaurant.isChain,
                chainName: data.restaurant.chainName,
                rating: data.restaurant.rating,
                phone: data.restaurant.phone,
                website: data.restaurant.website,
                hours: data.restaurant.hours,
                distanceFromParty: data.location?.distanceToRestaurant
            };
        } else if (data.restaurants && data.restaurants.length > 0) {
            // New format - multiple restaurants, use the first one (should be selected)
            const selectedRestaurant = data.restaurants[0];
            restaurantInfo = {
                name: selectedRestaurant.name,
                address: selectedRestaurant.address,
                isChain: selectedRestaurant.isChain,
                chainName: selectedRestaurant.chainName,
                rating: selectedRestaurant.rating,
                phone: selectedRestaurant.phone,
                website: selectedRestaurant.website,
                hours: selectedRestaurant.hours,
                distanceFromParty: selectedRestaurant.distanceFromParty
            };
        } else {
            console.error('Invalid restaurant data format:', data);
            return;
        }
        
        setSelectedRestaurantData(restaurantInfo);
    };

    const handleChainLocationFound = (data: any) => {
        const restaurantInfo: RestaurantInfo = {
            name: data.nearestLocation.name,
            address: data.nearestLocation.address,
            isChain: true,
            chainName: data.originalRestaurant.name,
            rating: data.nearestLocation.rating,
            phone: data.nearestLocation.phone,
            website: data.nearestLocation.website,
            hours: data.nearestLocation.hours,
            distanceFromParty: data.nearestLocation.distanceFromParty
        };
        
        setSelectedRestaurantData(restaurantInfo);
        onChainLocationFound(data);
    };

    const handleSelectSearchResult = (restaurant: RestaurantInfo) => {
        setSelectedRestaurantData(restaurant);
        // Don't clear search results or query - let users see all options
    };

    const handleNextToAvailability = () => {
        if (selectedRestaurantData) {
            onRestaurantSelected(selectedRestaurantData);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Restaurant</h2>
                <p className="text-gray-600 mb-6">
                    Find the perfect restaurant for your party. Search for a specific restaurant or choose from your saved restaurants.
                </p>
            </div>

            <div className="space-y-6">
                {/* Search Restaurant */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-orange-900">Search Restaurant</h3>
                            <p className="text-sm text-orange-700">Find a specific restaurant near your party</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Enter restaurant name (e.g., 'McDonald's', 'Pizza Hut')"
                                className="flex-1 px-3 py-2 text-sm border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                disabled={isSearching}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {searchError && (
                            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                                {searchError}
                            </div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-orange-800">Search Results ({searchResults.length} found)</h4>
                                {searchResults.map((restaurant, index) => {
                                    const isSelected = selectedRestaurantData && 
                                        selectedRestaurantData.name === restaurant.name && 
                                        selectedRestaurantData.address === restaurant.address;
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-green-50 border-green-300 ring-2 ring-green-200' 
                                                    : 'bg-white border-orange-200 hover:bg-orange-50'
                                            }`}
                                            onClick={() => handleSelectSearchResult(restaurant)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h5 className="font-medium text-gray-900">{restaurant.name}</h5>
                                                        {isSelected && (
                                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                                                Selected
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">{restaurant.address}</p>
                                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                                        {restaurant.rating && (
                                                            <span>⭐ {restaurant.rating}/5</span>
                                                        )}
                                                        {restaurant.distanceFromParty && (
                                                            <span>📍 {restaurant.distanceFromParty.toFixed(1)} km away</span>
                                                        )}
                                                        {restaurant.isChain && (
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                Chain
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button className={`${
                                                    isSelected ? 'text-green-600' : 'text-orange-600 hover:text-orange-800'
                                                }`}>
                                                    {isSelected ? (
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Choose from Saved Restaurants */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-blue-900">Saved Restaurants</h3>
                            <p className="text-sm text-blue-700">Choose from your collection of restaurants</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-sm text-blue-600">
                            Select from restaurants you've saved from videos and other sources.
                        </p>
                        
                        <button
                            onClick={() => {/* TODO: Navigate to saved restaurants page */}}
                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Browse Saved Restaurants
                        </button>
                        
                        <div className="text-xs text-blue-500">
                            <p>💡 Tip: Add restaurants to your collection by uploading videos on the Restaurant Library page</p>
                        </div>
                    </div>
                </div>

                {/* Selected Restaurant Display */}
                {selectedRestaurantData && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center mb-2">
                                    <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-green-900">Restaurant Selected!</h3>
                                </div>
                                <div className="text-sm text-green-800">
                                    <p className="font-semibold text-base">{selectedRestaurantData.name}</p>
                                    <p className="text-green-700">{selectedRestaurantData.address}</p>
                                    {selectedRestaurantData.rating && (
                                        <p className="text-green-600">Rating: {selectedRestaurantData.rating}/5</p>
                                    )}
                                    {selectedRestaurantData.distanceFromParty && (
                                        <p className="text-green-600">
                                            Distance: {selectedRestaurantData.distanceFromParty.toFixed(1)} km from party center
                                        </p>
                                    )}
                                    {selectedRestaurantData.isChain && (
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                                            Chain Restaurant
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleNextToAvailability}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                            >
                                Next: Choose Time
                            </button>
                        </div>
                    </div>
                )}

                {/* Chain Location Finder */}
                {/* 
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-purple-900">Find Nearest Chain Location</h3>
                            <p className="text-sm text-purple-700">Find the closest location of a restaurant chain</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-sm text-purple-600">
                            Paste restaurant data from a video to find the nearest location of that restaurant chain.
                        </p>
                        
                        <ChainLocationFinder
                            partyId={partyId}
                            onLocationFound={onChainLocationFound}
                        />
                    </div>
                </div>
                */}
            </div>
        </div>
    );
};

export default ChooseRestaurant; 