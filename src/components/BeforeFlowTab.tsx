'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoAnalysis } from '@/contexts/VideoAnalysisContext';

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

interface BeforeFlowTabProps {
    partyId: string;
    onEventSaved?: () => void;
}

const BeforeFlowTab: React.FC<BeforeFlowTabProps> = ({ partyId, onEventSaved }) => {
    const { user } = useAuth();
    const {
        state: {
            url: beforeFlowUrl,
            loading: beforeFlowLoading,
            progress: beforeFlowProgress,
            result: beforeFlowResult,
            error: beforeFlowError,
            instagramData,
            savingEvent,
            saveStatus
        },
        setUrl: setBeforeFlowUrl,
        setLoading: setBeforeFlowLoading,
        setProgress: setBeforeFlowProgress,
        setResult: setBeforeFlowResult,
        setError: setBeforeFlowError,
        setInstagramData,
        setSavingEvent,
        setSaveStatus,
        clearError
    } = useVideoAnalysis();

    // Restaurant search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<RestaurantInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);

    // Before Flow handlers
    const handleBeforeFlowUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBeforeFlowUrl(e.target.value);
        clearError();
    };

    // Restaurant search handlers
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

    const handleSelectSearchResult = (restaurant: RestaurantInfo) => {
        setSelectedRestaurant(restaurant);
    };

    const handleBeforeFlowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!beforeFlowUrl.trim()) {
            setBeforeFlowError('Please enter a URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(beforeFlowUrl);
        } catch {
            setBeforeFlowError('Please enter a valid URL');
            return;
        }

        setBeforeFlowLoading(true);
        clearError();
        setBeforeFlowResult(null);
        setBeforeFlowProgress({ step: 'Starting analysis...', percentage: 0 });

        try {
            const formData = new FormData();

            // Check if it's an Instagram URL
            const isInstagram = beforeFlowUrl.includes('instagram.com/p/');

            if (isInstagram) {
                setBeforeFlowProgress({ step: 'Taking Instagram screenshot...', percentage: 20, details: 'Loading Instagram page' });

                // Step 1: Get screenshot from backend
                const screenshotRes = await fetch('/api/screenshot-instagram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: beforeFlowUrl })
                });
                const screenshotData = await screenshotRes.json();
                if (!screenshotRes.ok || !screenshotData.screenshots || screenshotData.screenshots.length === 0) {
                    throw new Error(screenshotData.error || 'Failed to screenshot Instagram post');
                }

                // Store Instagram data for display
                setInstagramData({
                    screenshots: screenshotData.screenshots || [screenshotData.image],
                    captionText: screenshotData.captionText || '',
                    accountMentions: screenshotData.accountMentions || [],
                    locationTags: screenshotData.locationTags || [],
                    hashtags: screenshotData.hashtags || [],
                    allText: screenshotData.allText || '',
                    screenshotCount: screenshotData.screenshotCount || 1,
                    videoDuration: screenshotData.videoDuration || 0
                });

                const durationText = screenshotData.videoDuration > 0
                    ? ` (${Math.round(screenshotData.videoDuration)}s video, ${screenshotData.screenshotCount} screenshots)`
                    : ` (${screenshotData.screenshotCount} screenshots)`;

                setBeforeFlowProgress({ step: `Processing Instagram screenshot${durationText}...`, percentage: 40, details: 'Screenshots captured successfully' });

                // Step 2: Send ALL screenshots for analysis
                setBeforeFlowProgress({ step: `Analyzing ${screenshotData.screenshotCount} screenshots...`, percentage: 50, details: 'Preparing screenshots for AI analysis' });

                // Create a combined analysis request with all screenshots
                const analysisFormData = new FormData();
                analysisFormData.append('promptType', 'structured');
                analysisFormData.append('provider', 'anthropic');

                // Add all screenshots to the form data
                screenshotData.screenshots.forEach((screenshot: string, index: number) => {
                    // Convert base64 string to File object
                    const byteString = atob(screenshot);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: 'image/png' });
                    analysisFormData.append('images', blob, `instagram-screenshot-${index + 1}.png`);
                });

                // Add Instagram metadata if available
                if (screenshotData.captionText) {
                    analysisFormData.append('captionText', screenshotData.captionText);
                }
                if (screenshotData.accountMentions && screenshotData.accountMentions.length > 0) {
                    analysisFormData.append('accountMentions', screenshotData.accountMentions.join(', '));
                }
                if (screenshotData.locationTags && screenshotData.locationTags.length > 0) {
                    analysisFormData.append('locationTags', screenshotData.locationTags.join(', '));
                }
                if (screenshotData.hashtags && screenshotData.hashtags.length > 0) {
                    analysisFormData.append('hashtags', screenshotData.hashtags.join(', '));
                }
                if (screenshotData.videoDuration > 0) {
                    analysisFormData.append('videoDuration', screenshotData.videoDuration.toString());
                }

                setBeforeFlowProgress({ step: `Analyzing ${screenshotData.screenshotCount} screenshots...`, percentage: 60, details: 'Sending to AI for analysis' });

                const analysisResponse = await fetch('/api/process-video', {
                    method: 'POST',
                    body: analysisFormData
                });

                setBeforeFlowProgress({ step: 'Processing results...', percentage: 90, details: 'Validating places and locations' });

                const data = await analysisResponse.json();
                console.log('Analysis Response:', data);

                if (!analysisResponse.ok) {
                    throw new Error(data.error || 'Failed to analyze screenshots');
                }

                // Use the enhanced structured data from the API
                if (data.structuredData) {
                    setBeforeFlowProgress({ step: 'Analysis complete!', percentage: 100, details: 'Results ready' });
                    // Combine structuredData with other top-level fields
                    setBeforeFlowResult({
                        ...data.structuredData,
                        deducedRestaurant: data.deducedRestaurant,
                        restaurantDetails: data.restaurantDetails,
                        enhanced_places: data.enhanced_places,
                        geocodedPlaces: data.geocodedPlaces,
                        processingInfo: data.processingInfo
                    });
                } else {
                    setBeforeFlowError('Failed to get structured data from API response');
                }
            } else {
                // Regular URL processing
                formData.append('url', beforeFlowUrl);
                formData.append('promptType', 'structured');
                formData.append('provider', 'anthropic');

                setBeforeFlowProgress({ step: 'Analyzing content...', percentage: 50, details: 'Processing with Claude' });
                console.log('Submitting URL:', beforeFlowUrl);

                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: formData
                });

                setBeforeFlowProgress({ step: 'Processing results...', percentage: 90, details: 'Validating places and locations' });

                const data = await response.json();
                console.log('API Response:', data);

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process content');
                }

                // Use the enhanced structured data from the API
                if (data.structuredData) {
                    setBeforeFlowProgress({ step: 'Analysis complete!', percentage: 100, details: 'Results ready' });
                    // Combine structuredData with other top-level fields
                    setBeforeFlowResult({
                        ...data.structuredData,
                        deducedRestaurant: data.deducedRestaurant,
                        restaurantDetails: data.restaurantDetails,
                        enhanced_places: data.enhanced_places,
                        geocodedPlaces: data.geocodedPlaces,
                        processingInfo: data.processingInfo
                    });
                } else {
                    setBeforeFlowError('Failed to get structured data from API response');
                }
            }

        } catch (error) {
            console.error('Error:', error);
            setBeforeFlowError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setBeforeFlowLoading(false);
        }
    };

    const handleSaveToDatabase = async () => {
        if (!beforeFlowResult || !user) {
            setSaveStatus('error');
            return;
        }

        setSavingEvent(true);
        setSaveStatus('idle');

        try {
            // Prepare the clean restaurant data
            const restaurantData = {
                restaurant: beforeFlowResult.restaurantDetails ? {
                    name: beforeFlowResult.restaurantDetails.name,
                    isChain: beforeFlowResult.restaurantDetails.isChain,
                    chainName: beforeFlowResult.restaurantDetails.isChain ? beforeFlowResult.restaurantDetails.chainName : null,
                    address: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.address,
                    website: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.website,
                    hours: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.hours,
                    phone: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.phone,
                    rating: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.rating,
                    placeId: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.placeId,
                    image: beforeFlowResult.restaurantDetails.image || null
                } : null,
                analysis: {
                    place_names: beforeFlowResult.place_names,
                    multiple_locations: beforeFlowResult.multiple_locations,
                    activity_type: beforeFlowResult.activity_type,
                    foods_shown: beforeFlowResult.foods_shown,
                    tags: beforeFlowResult.tags,
                    context_clues: beforeFlowResult.context_clues
                },
                processing: {
                    frameCount: beforeFlowResult.processingInfo?.frameCount || 0,
                    originalPlaceCount: beforeFlowResult.processingInfo?.originalPlaceCount || 0,
                    validatedPlaceCount: beforeFlowResult.processingInfo?.validatedPlaceCount || 0,
                    geocodedPlaceCount: beforeFlowResult.processingInfo?.geocodedPlaceCount || 0
                }
            };

            // Prepare Instagram data if available
            const instagramEventData = instagramData ? {
                // Exclude screenshots to avoid Firestore size limit
                // screenshots: instagramData.screenshots,
                captionText: instagramData.captionText,
                accountMentions: instagramData.accountMentions,
                locationTags: instagramData.locationTags,
                hashtags: instagramData.hashtags,
                allText: instagramData.allText,
                screenshotCount: instagramData.screenshotCount,
                videoDuration: instagramData.videoDuration,
                originalUrl: beforeFlowUrl
            } : undefined;

            // Save to database
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    partyId,
                    instagramData: instagramEventData,
                    restaurantData,
                    createdBy: user.uid,
                    notes: `Restaurant analysis from ${beforeFlowUrl}`
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save event');
            }

            const result = await response.json();
            setSaveStatus('success');

            // Reset success status after 3 seconds
            setTimeout(() => setSaveStatus('idle'), 3000);

            if (onEventSaved) {
                onEventSaved();
            }

        } catch (error) {
            console.error('Error saving event:', error);
            setSaveStatus('error');

            // Reset error status after 3 seconds
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setSavingEvent(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold">Before Flow Analysis</h2>
                <div className="relative group">
                    <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center cursor-help text-xs font-bold">
                        i
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-blue-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
                        <div className="text-xs">
                            <strong>Enhanced Analysis:</strong> The system takes targeted screenshots - separate screenshots of caption text and video content only (not entire UI).
                            For videos: 1 frame every 2 seconds + caption screenshot if available.
                            Uses AI to identify and validate restaurant names using Google Maps API, ensuring accurate place identification from multiple locations.
                            All screenshots are analyzed together for comprehensive results with restaurant deduction.
                            <br /><br />
                            <strong>Google Maps Integration:</strong> Automatically fetches restaurant photos, details, ratings, hours, and contact information from Google Maps API.
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-900"></div>
                    </div>
                </div>
            </div>

            {/* Restaurant Search Section */}
            <div className="mb-8">
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
                                    const isSelected = selectedRestaurant &&
                                        selectedRestaurant.name === restaurant.name &&
                                        selectedRestaurant.address === restaurant.address;

                                    return (
                                        <div
                                            key={index}
                                            className={`border rounded-lg p-4 transition-colors cursor-pointer ${isSelected
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
                                                <button className={`${isSelected ? 'text-green-600' : 'text-orange-600 hover:text-orange-800'
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

                        {/* Selected Restaurant Display */}
                        {selectedRestaurant && (
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
                                            <p className="font-semibold text-base">{selectedRestaurant.name}</p>
                                            <p className="text-green-700">{selectedRestaurant.address}</p>
                                            {selectedRestaurant.rating && (
                                                <p className="text-green-600">Rating: {selectedRestaurant.rating}/5</p>
                                            )}
                                            {selectedRestaurant.distanceFromParty && (
                                                <p className="text-green-600">
                                                    Distance: {selectedRestaurant.distanceFromParty.toFixed(1)} km from party center
                                                </p>
                                            )}
                                            {selectedRestaurant.isChain && (
                                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                                                    Chain Restaurant
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Simple Form */}
            <form onSubmit={handleBeforeFlowSubmit} className="space-y-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter URL
                    </label>
                    <input
                        type="url"
                        value={beforeFlowUrl}
                        onChange={handleBeforeFlowUrlChange}
                        placeholder="https://images.unsplash.com/photo-... or Instagram URL"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        Use public image URLs (Unsplash, Pexels, direct image links) or Instagram URLs
                    </p>
                </div>

                <div className="flex space-x-4">
                    <button
                        type="submit"
                        disabled={beforeFlowLoading || !beforeFlowUrl.trim()}
                        className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {beforeFlowLoading ? 'Processing...' : 'Analyze Content'}
                    </button>
                </div>
            </form>

            {beforeFlowError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">{beforeFlowError}</p>
                </div>
            )}

            {beforeFlowLoading && beforeFlowProgress.step && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-700 text-sm font-medium">{beforeFlowProgress.step}</span>
                        <span className="text-blue-700 text-sm">{Math.round(beforeFlowProgress.percentage)}%</span>
                    </div>
                    {beforeFlowProgress.details && (
                        <div className="text-blue-600 text-xs mb-2 italic">
                            {beforeFlowProgress.details}
                        </div>
                    )}
                    <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${beforeFlowProgress.percentage}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {beforeFlowResult && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>

                    {/* Restaurant Image Display */}
                    {beforeFlowResult.restaurantDetails?.image && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-3">Restaurant Photo</h4>
                            <div className="relative">
                                <img
                                    src={beforeFlowResult.restaurantDetails.image}
                                    alt={`${beforeFlowResult.restaurantDetails.name} restaurant`}
                                    className="w-full h-64 object-cover rounded-lg shadow-md border border-blue-200"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        // Show fallback message
                                        const container = target.parentElement;
                                        if (container) {
                                            container.innerHTML = `
                                                <div class="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
                                                    <div class="text-center text-gray-500">
                                                        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                        </svg>
                                                        <p class="text-sm">Image not available</p>
                                                    </div>
                                                </div>
                                            `;
                                        }
                                    }}
                                />
                                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    Google Maps
                                </div>
                            </div>
                            {beforeFlowResult.restaurantDetails.name && (
                                <p className="text-sm text-blue-700 mt-2 font-medium">
                                    📍 {beforeFlowResult.restaurantDetails.name}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Restaurant Details Card */}
                    {beforeFlowResult.restaurantDetails && (
                        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <h4 className="font-medium text-gray-900 mb-4">Restaurant Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h5 className="text-lg font-semibold text-gray-900 mb-2">
                                        {beforeFlowResult.restaurantDetails.name}
                                    </h5>
                                    {beforeFlowResult.restaurantDetails.address && (
                                        <div className="flex items-start space-x-2 mb-2">
                                            <span className="text-gray-500 mt-0.5">📍</span>
                                            <p className="text-sm text-gray-700">{beforeFlowResult.restaurantDetails.address}</p>
                                        </div>
                                    )}
                                    {beforeFlowResult.restaurantDetails.website && (
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-gray-500">🌐</span>
                                            <a
                                                href={beforeFlowResult.restaurantDetails.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                            >
                                                Visit Website
                                            </a>
                                        </div>
                                    )}
                                    {beforeFlowResult.restaurantDetails.phone && (
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-gray-500">📞</span>
                                            <a
                                                href={`tel:${beforeFlowResult.restaurantDetails.phone}`}
                                                className="text-sm text-gray-700 hover:text-gray-900"
                                            >
                                                {beforeFlowResult.restaurantDetails.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    {beforeFlowResult.restaurantDetails.rating && (
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-gray-500">⭐</span>
                                            <span className="text-sm text-gray-700">
                                                {beforeFlowResult.restaurantDetails.rating}/5 rating
                                            </span>
                                        </div>
                                    )}
                                    {beforeFlowResult.restaurantDetails.hours && beforeFlowResult.restaurantDetails.hours.length > 0 && (
                                        <div className="mb-2">
                                            <span className="text-gray-500 text-sm">🕒 Hours:</span>
                                            <div className="mt-1 space-y-1">
                                                {beforeFlowResult.restaurantDetails.hours.slice(0, 3).map((hour: string, index: number) => (
                                                    <div key={index} className="text-xs text-gray-600">
                                                        {hour}
                                                    </div>
                                                ))}
                                                {beforeFlowResult.restaurantDetails.hours.length > 3 && (
                                                    <div className="text-xs text-gray-500">
                                                        +{beforeFlowResult.restaurantDetails.hours.length - 3} more days
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {beforeFlowResult.restaurantDetails.isChain && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-500">🏢</span>
                                            <span className="text-sm text-gray-700">
                                                Chain: {beforeFlowResult.restaurantDetails.chainName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Analysis Results */}
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-4">Content Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h5 className="text-sm font-medium text-green-800 mb-2">📍 Places Identified</h5>
                                <div className="space-y-1">
                                    {beforeFlowResult.place_names && beforeFlowResult.place_names.length > 0 ? (
                                        beforeFlowResult.place_names.map((place: string, index: number) => (
                                            <div key={index} className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                                                {place}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-green-600 italic">No specific places identified</p>
                                    )}
                                </div>

                                <h5 className="text-sm font-medium text-green-800 mb-2 mt-4">🍽️ Foods Shown</h5>
                                <div className="flex flex-wrap gap-1">
                                    {beforeFlowResult.foods_shown && beforeFlowResult.foods_shown.length > 0 ? (
                                        beforeFlowResult.foods_shown.map((food: string, index: number) => (
                                            <span key={index} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                                {food}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm text-green-600 italic">No specific foods identified</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h5 className="text-sm font-medium text-green-800 mb-2">🏷️ Tags & Context</h5>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-xs font-medium text-green-700">Activity Type:</span>
                                        <div className="text-sm text-green-600 capitalize">
                                            {beforeFlowResult.activity_type || 'Not specified'}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-medium text-green-700">Tags:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {beforeFlowResult.tags && beforeFlowResult.tags.length > 0 ? (
                                                beforeFlowResult.tags.slice(0, 6).map((tag: string, index: number) => (
                                                    <span key={index} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                                        {tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-sm text-green-600 italic">No tags identified</p>
                                            )}
                                        </div>
                                    </div>

                                    {beforeFlowResult.context_clues && beforeFlowResult.context_clues.length > 0 && (
                                        <div>
                                            <span className="text-xs font-medium text-green-700">Context Clues:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {beforeFlowResult.context_clues.slice(0, 4).map((clue: string, index: number) => (
                                                    <span key={index} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                                        {clue}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {beforeFlowResult.processingInfo && (
                            <div className="mt-4 pt-4 border-t border-green-200">
                                <h5 className="text-sm font-medium text-green-800 mb-2">📊 Processing Info</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-green-600">Frames:</span>
                                        <div className="font-medium text-green-800">{beforeFlowResult.processingInfo.frameCount || 0}</div>
                                    </div>
                                    <div>
                                        <span className="text-green-600">Places Found:</span>
                                        <div className="font-medium text-green-800">{beforeFlowResult.processingInfo.originalPlaceCount || 0}</div>
                                    </div>
                                    <div>
                                        <span className="text-green-600">Validated:</span>
                                        <div className="font-medium text-green-800">{beforeFlowResult.processingInfo.validatedPlaceCount || 0}</div>
                                    </div>
                                    <div>
                                        <span className="text-green-600">Geocoded:</span>
                                        <div className="font-medium text-green-800">{beforeFlowResult.processingInfo.geocodedPlaceCount || 0}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clean Restaurant Data */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-md">
                        <h4 className="font-medium text-blue-900 mb-2">Clean Restaurant Data</h4>
                        <pre className="text-sm text-blue-700 overflow-x-auto">
                            {JSON.stringify({
                                restaurant: beforeFlowResult.restaurantDetails ? {
                                    name: beforeFlowResult.restaurantDetails.name,
                                    isChain: beforeFlowResult.restaurantDetails.isChain,
                                    chainName: beforeFlowResult.restaurantDetails.isChain ? beforeFlowResult.restaurantDetails.chainName : null,
                                    // Location details only for single locations
                                    address: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.address,
                                    website: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.website,
                                    hours: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.hours,
                                    phone: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.phone,
                                    rating: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.rating,
                                    placeId: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.placeId,
                                    image: beforeFlowResult.restaurantDetails.image || null
                                } : null,
                                analysis: {
                                    place_names: beforeFlowResult.place_names,
                                    multiple_locations: beforeFlowResult.multiple_locations,
                                    activity_type: beforeFlowResult.activity_type,
                                    foods_shown: beforeFlowResult.foods_shown,
                                    tags: beforeFlowResult.tags,
                                    context_clues: beforeFlowResult.context_clues
                                },
                                processing: {
                                    frameCount: beforeFlowResult.processingInfo?.frameCount || 0,
                                    originalPlaceCount: beforeFlowResult.processingInfo?.originalPlaceCount || 0,
                                    validatedPlaceCount: beforeFlowResult.processingInfo?.validatedPlaceCount || 0,
                                    geocodedPlaceCount: beforeFlowResult.processingInfo?.geocodedPlaceCount || 0
                                }
                            }, null, 2)}
                        </pre>
                    </div>

                    {/* Save to Database Button */}
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900">Save to Database</h4>
                            <span className="text-sm text-gray-500">Party ID: {partyId}</span>
                        </div>

                        <button
                            onClick={handleSaveToDatabase}
                            disabled={savingEvent || !beforeFlowResult}
                            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            {savingEvent ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving to Database...
                                </span>
                            ) : (
                                '💾 Save Restaurant Event to Database'
                            )}
                        </button>

                        {/* Status Messages */}
                        {saveStatus === 'success' && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-green-700 text-sm">✅ Event saved successfully!</p>
                            </div>
                        )}

                        {saveStatus === 'error' && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-700 text-sm">❌ Failed to save event. Please try again.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BeforeFlowTab; 