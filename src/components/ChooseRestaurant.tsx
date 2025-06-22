'use client';

import React from 'react';
import { NearestRestaurantFinder } from './NearestRestaurantFinder';
import ChainLocationFinder from './ChainLocationFinder';

interface ChooseRestaurantProps {
    partyId: string;
    onRestaurantFound: (data: any) => void;
    onChainLocationFound: (data: any) => void;
}

const ChooseRestaurant: React.FC<ChooseRestaurantProps> = ({ 
    partyId, 
    onRestaurantFound, 
    onChainLocationFound 
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Restaurant</h2>
                <p className="text-gray-600 mb-6">
                    Find the perfect restaurant for your party. Choose from your saved restaurants or find the closest one to your party members.
                </p>
            </div>

            <div className="space-y-6">
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
                            className="w-full px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Browse Saved Restaurants
                        </button>
                        
                        <div className="text-xs text-blue-500">
                            <p>💡 Tip: Add restaurants to your collection by uploading videos on the Restaurant Library page</p>
                        </div>
                    </div>
                </div>

                {/* Find Nearest Restaurant */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-green-900">Find Nearest Restaurant</h3>
                            <p className="text-sm text-green-700">Discover restaurants near your party</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-sm text-green-600">
                            Find the best restaurant location based on party member addresses.
                        </p>
                        
                        <NearestRestaurantFinder
                            partyId={partyId}
                            onRestaurantFound={onRestaurantFound}
                        />
                    </div>
                </div>
            </div>

            {/* Testing Section - Can be removed in the future */}
            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-3">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-700">Testing - Chain Location Finder</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                    This section is for testing purposes and can be removed in the future.
                </p>
                <ChainLocationFinder
                    partyId={partyId}
                    onLocationFound={onChainLocationFound}
                />
            </div>
        </div>
    );
};

export default ChooseRestaurant; 