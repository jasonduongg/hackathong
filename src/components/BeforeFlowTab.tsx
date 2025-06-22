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
    image?: string;
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
            saveStatus,
            loadingTasks
        },
        setUrl: setBeforeFlowUrl,
        setLoading: setBeforeFlowLoading,
        setProgress: setBeforeFlowProgress,
        setResult: setBeforeFlowResult,
        setError: setBeforeFlowError,
        setInstagramData,
        setSavingEvent,
        setSaveStatus,
        setLoadingTasks,
        updateLoadingTask,
        clearError
    } = useVideoAnalysis();

    // Restaurant search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<RestaurantInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);

    // Search save state
    const [savingSearchResult, setSavingSearchResult] = useState(false);
    const [searchSaveStatus, setSearchSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Before Flow handlers
    const handleBeforeFlowUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBeforeFlowUrl(e.target.value);
        clearError();
    };

    // Initialize loading tasks based on URL type
    const initializeLoadingTasks = (url: string) => {
        const isInstagram = url.includes('instagram.com/p/') || url.includes('instagram.com/reel/');

        if (isInstagram) {
            setLoadingTasks([
                {
                    id: 'screenshot',
                    title: 'Taking Instagram Screenshots',
                    description: 'Capturing screenshots from Instagram post',
                    status: 'pending'
                },
                {
                    id: 'analysis',
                    title: 'Analyzing Content',
                    description: 'Processing screenshots with AI',
                    status: 'pending'
                },
                {
                    id: 'validation',
                    title: 'Validating Places',
                    description: 'Cross-referencing with Google Maps',
                    status: 'pending'
                },
                {
                    id: 'completion',
                    title: 'Finalizing Results',
                    description: 'Preparing analysis results',
                    status: 'pending'
                }
            ]);
        } else {
            setLoadingTasks([
                {
                    id: 'analysis',
                    title: 'Analyzing Content',
                    description: 'Processing content with AI',
                    status: 'pending'
                },
                {
                    id: 'validation',
                    title: 'Validating Places',
                    description: 'Cross-referencing with Google Maps',
                    status: 'pending'
                },
                {
                    id: 'completion',
                    title: 'Finalizing Results',
                    description: 'Preparing analysis results',
                    status: 'pending'
                }
            ]);
        }
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

    const handleSaveSearchResult = async () => {
        if (!selectedRestaurant || !user) {
            setSearchSaveStatus('error');
            return;
        }

        setSavingSearchResult(true);
        setSearchSaveStatus('idle');

        try {
            // Prepare the restaurant data from search result
            const restaurantData = {
                restaurant: {
                    name: selectedRestaurant.name,
                    isChain: selectedRestaurant.isChain || false,
                    chainName: selectedRestaurant.isChain ? selectedRestaurant.chainName : null,
                    address: selectedRestaurant.address || null,
                    website: selectedRestaurant.website || null,
                    hours: selectedRestaurant.hours || null,
                    phone: selectedRestaurant.phone || null,
                    rating: selectedRestaurant.rating || null,
                    placeId: null, // Search results don't have placeId
                    image: selectedRestaurant.image || null
                },
                analysis: {
                    place_names: [selectedRestaurant.name], // Use the selected restaurant name
                    multiple_locations: false,
                    activity_type: 'restaurant_search',
                    foods_shown: [], // No food analysis from search
                    tags: selectedRestaurant.isChain ? ['chain', 'franchise'] : ['local'],
                    context_clues: [`Searched for: ${searchQuery}`]
                },
                processing: {
                    frameCount: 0,
                    originalPlaceCount: 1,
                    validatedPlaceCount: 1,
                    geocodedPlaceCount: 0
                }
            };

            // Save to database
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    partyId,
                    instagramData: null, // No Instagram data for search results
                    restaurantData,
                    createdBy: user.uid,
                    notes: `Restaurant search result: ${selectedRestaurant.name} (${searchQuery})`
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save search result');
            }

            const result = await response.json();
            setSearchSaveStatus('success');

            // Reset success status after 3 seconds
            setTimeout(() => setSearchSaveStatus('idle'), 3000);

            if (onEventSaved) {
                onEventSaved();
            }

        } catch (error) {
            console.error('Error saving search result:', error);
            setSearchSaveStatus('error');

            // Reset error status after 3 seconds
            setTimeout(() => setSearchSaveStatus('idle'), 3000);
        } finally {
            setSavingSearchResult(false);
        }
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

        // Initialize loading tasks
        initializeLoadingTasks(beforeFlowUrl);

        try {
            const formData = new FormData();

            // Check if it's an Instagram URL
            const isInstagram = beforeFlowUrl.includes('instagram.com/p/') || beforeFlowUrl.includes('instagram.com/reel/');

            if (isInstagram) {
                // Task 1: Screenshot
                updateLoadingTask('screenshot', 'loading', 20);
                setBeforeFlowProgress({ step: 'Taking Instagram screenshot...', percentage: 20, details: 'Loading Instagram page' });

                // Step 1: Get screenshot from backend
                const screenshotRes = await fetch('/api/screenshot-instagram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url: beforeFlowUrl })
                });

                if (!screenshotRes.ok) {
                    const errorData = await screenshotRes.json();
                    if (screenshotRes.status === 413) {
                        throw new Error(`Request too large: ${errorData.error}. Try with fewer images or a shorter video.`);
                    }
                    throw new Error(errorData.error || 'Failed to take screenshots');
                }

                const screenshotData = await screenshotRes.json();

                // VALIDATION: Check screenshot data size
                if (screenshotData.screenshots && screenshotData.screenshots.length > 0) {
                    const totalSize = screenshotData.screenshots.reduce((sum: number, screenshot: string) => sum + screenshot.length, 0);
                    const sizeInMB = totalSize / (1024 * 1024);
                    console.log(`Screenshot payload size: ${sizeInMB.toFixed(1)}MB`);

                    if (sizeInMB > 20) { // 20MB client-side limit
                        throw new Error(`Screenshot payload too large: ${sizeInMB.toFixed(1)}MB. Try with a shorter video or fewer images.`);
                    }
                }

                // Handle case where screenshots are not included due to size
                if (!screenshotData.screenshots || screenshotData.screenshots.length === 0) {
                    if (screenshotData.hasLargeScreenshots && screenshotData.cacheKey) {
                        // Fetch screenshots from cache
                        console.log('Fetching large screenshots from cache...');
                        const cacheResponse = await fetch(`/api/screenshot-instagram?cacheKey=${screenshotData.cacheKey}`);

                        if (cacheResponse.ok) {
                            const cacheData = await cacheResponse.json();
                            if (cacheData.screenshots && cacheData.screenshots.length > 0) {
                                // Replace the screenshot data with cached data
                                screenshotData.screenshots = cacheData.screenshots;
                                console.log(`Retrieved ${cacheData.screenshots.length} screenshots from cache`);
                            } else {
                                throw new Error(`Screenshots too large (${screenshotData.totalSizeMB}MB). Try with a shorter video or fewer images.`);
                            }
                        } else {
                            throw new Error(`Screenshots too large (${screenshotData.totalSizeMB}MB). Try with a shorter video or fewer images.`);
                        }
                    } else if (screenshotData.hasLargeScreenshots) {
                        throw new Error(`Screenshots too large (${screenshotData.totalSizeMB}MB). Try with a shorter video or fewer images.`);
                    } else {
                        throw new Error('Failed to screenshot Instagram post');
                    }
                }

                updateLoadingTask('screenshot', 'completed', 100);

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

                // Task 2: Analysis
                updateLoadingTask('analysis', 'loading', 40);
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
                    const blob = new Blob([ab], { type: 'image/jpeg' });
                    analysisFormData.append('images', blob, `instagram-screenshot-${index + 1}.jpg`);
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

                // Add partyId for chain location finding
                analysisFormData.append('partyId', partyId);

                setBeforeFlowProgress({ step: `Analyzing ${screenshotData.screenshotCount} screenshots...`, percentage: 60, details: 'Sending to AI for analysis' });

                const analysisResponse = await fetch('/api/process-video', {
                    method: 'POST',
                    body: analysisFormData
                });

                updateLoadingTask('analysis', 'completed', 100);

                // Task 3: Validation
                updateLoadingTask('validation', 'loading', 80);
                setBeforeFlowProgress({ step: 'Processing results...', percentage: 90, details: 'Validating places and locations' });

                const data = await analysisResponse.json();
                console.log('Analysis Response:', data);

                if (!analysisResponse.ok) {
                    throw new Error(data.error || 'Failed to analyze screenshots');
                }

                updateLoadingTask('validation', 'completed', 100);

                // Task 4: Completion
                updateLoadingTask('completion', 'loading', 90);
                setBeforeFlowProgress({ step: 'Analysis complete!', percentage: 100, details: 'Results ready' });

                // Use the enhanced structured data from the API
                if (data.structuredData) {
                    updateLoadingTask('completion', 'completed', 100);
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
                formData.append('partyId', partyId);

                // Task 1: Analysis
                updateLoadingTask('analysis', 'loading', 50);
                setBeforeFlowProgress({ step: 'Analyzing content...', percentage: 50, details: 'Processing with Claude' });
                console.log('Submitting URL:', beforeFlowUrl);

                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: formData
                });

                updateLoadingTask('analysis', 'completed', 100);

                // Task 2: Validation
                updateLoadingTask('validation', 'loading', 80);
                setBeforeFlowProgress({ step: 'Processing results...', percentage: 90, details: 'Validating places and locations' });

                const data = await response.json();
                console.log('API Response:', data);

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process content');
                }

                updateLoadingTask('validation', 'completed', 100);

                // Task 3: Completion
                updateLoadingTask('completion', 'loading', 90);
                setBeforeFlowProgress({ step: 'Analysis complete!', percentage: 100, details: 'Results ready' });

                // Use the enhanced structured data from the API
                if (data.structuredData) {
                    updateLoadingTask('completion', 'completed', 100);
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
            // Mark current task as error
            const currentTask = loadingTasks.find(task => task.status === 'loading');
            if (currentTask) {
                updateLoadingTask(currentTask.id, 'error');
            }
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
                    // For chains, include the specific location details if available
                    address: beforeFlowResult.restaurantDetails.address,
                    website: beforeFlowResult.restaurantDetails.website,
                    hours: beforeFlowResult.restaurantDetails.hours,
                    phone: beforeFlowResult.restaurantDetails.phone,
                    rating: beforeFlowResult.restaurantDetails.rating,
                    placeId: beforeFlowResult.restaurantDetails.placeId,
                    image: beforeFlowResult.restaurantDetails.image || null,
                    // Chain-specific fields
                    distanceFromParty: beforeFlowResult.restaurantDetails.distanceFromParty || null,
                    googleMapsUrl: beforeFlowResult.restaurantDetails.googleMapsUrl || null
                } : null,
                analysis: {
                    place_names: (beforeFlowResult.place_names || []).slice(0, 5), // Limit array length
                    multiple_locations: beforeFlowResult.multiple_locations || false,
                    activity_type: beforeFlowResult.activity_type || 'other',
                    foods_shown: (beforeFlowResult.foods_shown || []).slice(0, 10), // Limit array length
                    tags: (beforeFlowResult.tags || []).slice(0, 15), // Limit array length
                    context_clues: (beforeFlowResult.context_clues || []).slice(0, 8) // Limit array length
                },
                processing: {
                    frameCount: beforeFlowResult.processingInfo?.frameCount || 0,
                    originalPlaceCount: beforeFlowResult.processingInfo?.originalPlaceCount || 0,
                    validatedPlaceCount: beforeFlowResult.processingInfo?.validatedPlaceCount || 0,
                    geocodedPlaceCount: beforeFlowResult.processingInfo?.geocodedPlaceCount || 0
                }
            };

            // Prepare Instagram data
            const instagramEventData = instagramData ? {
                // Exclude screenshots to avoid Firestore size limit
                // screenshots: instagramData.screenshots || [],
                captionText: (instagramData.captionText || '').substring(0, 500), // Limit caption length
                accountMentions: (instagramData.accountMentions || []).slice(0, 10), // Limit array length
                locationTags: (instagramData.locationTags || []).slice(0, 5), // Limit array length
                hashtags: (instagramData.hashtags || []).slice(0, 20), // Limit array length
                // Truncate allText to avoid size issues
                allText: (instagramData.allText || '').substring(0, 200), // Limit allText length
                screenshotCount: instagramData.screenshotCount || 0,
                videoDuration: instagramData.videoDuration || 0,
                originalUrl: beforeFlowUrl
            } : null;

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

    const handleReset = () => {
        setBeforeFlowUrl('');
        setBeforeFlowResult(null);
        setBeforeFlowError(null);
        setInstagramData(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedRestaurant(null);
        setSearchError(null);
        setLoadingTasks([]);
        setSavingSearchResult(false);
        setSearchSaveStatus('idle');
        clearError();
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

            {/* Show search options only when there are no results */}
            {!beforeFlowResult && (
                <>
                    {/* Loading Tasks Section - Show when analyzing */}
                    {beforeFlowLoading && loadingTasks.length > 0 && (
                        <div className="mb-8">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
                                <div className="flex items-center mb-6">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                            <svg className="h-5 w-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-medium text-blue-900">Processing Your Content</h3>
                                        <p className="text-sm text-blue-700">We're analyzing your content step by step</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {loadingTasks.map((task, index) => (
                                        <div
                                            key={task.id}
                                            className={`border rounded-lg p-4 transition-all duration-300 ${task.status === 'completed'
                                                ? 'bg-green-50 border-green-300'
                                                : task.status === 'loading'
                                                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                                                    : task.status === 'error'
                                                        ? 'bg-red-50 border-red-300'
                                                        : 'bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${task.status === 'completed'
                                                        ? 'bg-green-500'
                                                        : task.status === 'loading'
                                                            ? 'bg-blue-500'
                                                            : task.status === 'error'
                                                                ? 'bg-red-500'
                                                                : 'bg-gray-300'
                                                        }`}>
                                                        {task.status === 'completed' && (
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                        {task.status === 'loading' && (
                                                            <svg className="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        )}
                                                        {task.status === 'error' && (
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        )}
                                                        {task.status === 'pending' && (
                                                            <span className="text-xs text-gray-600 font-medium">{index + 1}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-medium ${task.status === 'completed'
                                                            ? 'text-green-800'
                                                            : task.status === 'loading'
                                                                ? 'text-blue-800'
                                                                : task.status === 'error'
                                                                    ? 'text-red-800'
                                                                    : 'text-gray-600'
                                                            }`}>
                                                            {task.title}
                                                        </h4>
                                                        <p className={`text-sm ${task.status === 'completed'
                                                            ? 'text-green-600'
                                                            : task.status === 'loading'
                                                                ? 'text-blue-600'
                                                                : task.status === 'error'
                                                                    ? 'text-red-600'
                                                                    : 'text-gray-500'
                                                            }`}>
                                                            {task.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                {task.status === 'loading' && task.percentage && (
                                                    <div className="text-right">
                                                        <span className="text-sm font-medium text-blue-600">{task.percentage}%</span>
                                                    </div>
                                                )}
                                            </div>
                                            {task.status === 'loading' && task.percentage && (
                                                <div className="mt-3">
                                                    <div className="w-full bg-blue-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${task.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Analysis Section - Enhanced and Promoted - Only show when not loading */}
                    {!beforeFlowLoading && (
                        <div className="mb-8">
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 shadow-sm">
                                <div className="flex items-center mb-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-medium text-purple-900">AI-Powered Content Analysis</h3>
                                        <p className="text-sm text-purple-700">Upload images or Instagram posts for intelligent restaurant detection</p>
                                    </div>
                                </div>

                                <form onSubmit={handleBeforeFlowSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-purple-800 mb-2">
                                            Enter URL
                                        </label>
                                        <div className="flex space-x-2">
                                            <input
                                                type="url"
                                                value={beforeFlowUrl}
                                                onChange={handleBeforeFlowUrlChange}
                                                placeholder="https://images.unsplash.com/photo-... or Instagram URL"
                                                className="flex-1 px-3 py-2 border border-purple-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setBeforeFlowUrl('https://www.instagram.com/p/DK-QNONyWgM/?hl=en&img_index=1')}
                                                className="px-3 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded-md hover:bg-purple-200 transition-colors text-sm font-medium"
                                                title="Insert test Instagram URL"
                                            >
                                                Test URL
                                            </button>
                                        </div>
                                        <p className="mt-1 text-sm text-purple-600">
                                            Use public image URLs (Unsplash, Pexels, direct image links) or Instagram URLs
                                        </p>
                                    </div>

                                    <div className="flex space-x-4">
                                        <button
                                            type="submit"
                                            disabled={beforeFlowLoading || !beforeFlowUrl.trim()}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-md hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm"
                                        >
                                            {beforeFlowLoading ? 'Processing...' : 'Analyze with AI'}
                                        </button>
                                    </div>
                                </form>

                                {/* AI Features Highlight */}
                                <div className="mt-4 p-3 bg-white/50 rounded-lg border border-purple-100">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-xs font-medium text-purple-800">AI Features</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-purple-700">
                                        <div className="flex items-center space-x-1">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                            <span>Smart screenshot analysis</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                            <span>Google Maps integration</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                            <span>Restaurant validation</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                            <span>Comprehensive results</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Restaurant Search Section - Moved to second position - Only show when not loading */}
                    {!beforeFlowLoading && (
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
                                                            {/* Restaurant Image Thumbnail */}
                                                            {restaurant.image && (
                                                                <div className="flex-shrink-0 mr-4">
                                                                    <div className="relative">
                                                                        <img
                                                                            src={restaurant.image}
                                                                            alt={`${restaurant.name} restaurant`}
                                                                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                                                            onError={(e) => {
                                                                                const target = e.target as HTMLImageElement;
                                                                                target.style.display = 'none';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

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
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-3">
                                                        <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <h3 className="text-xl font-semibold text-green-900">Restaurant Selected!</h3>
                                                    </div>

                                                    {/* Restaurant Image Display */}
                                                    {selectedRestaurant.image && (
                                                        <div className="mb-4 p-4 bg-white rounded-lg border border-green-200">
                                                            <h4 className="font-medium text-green-900 mb-3">Restaurant Photo</h4>
                                                            <div className="relative">
                                                                <img
                                                                    src={selectedRestaurant.image}
                                                                    alt={`${selectedRestaurant.name} restaurant`}
                                                                    className="w-full h-48 object-cover rounded-lg shadow-md border border-green-200"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = 'none';
                                                                        // Show fallback message
                                                                        const container = target.parentElement;
                                                                        if (container) {
                                                                            container.innerHTML = `
                                                                                <div class="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
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
                                                                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                                                    Google Maps
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Restaurant Name and Basic Info */}
                                                    <div className="mb-4">
                                                        <h4 className="text-2xl font-bold text-green-900 mb-2">
                                                            {selectedRestaurant.name}
                                                        </h4>
                                                        {selectedRestaurant.address && (
                                                            <div className="flex items-start space-x-2 mb-2">
                                                                <span className="text-green-600 mt-1">📍</span>
                                                                <p className="text-lg text-green-800">{selectedRestaurant.address}</p>
                                                            </div>
                                                        )}
                                                        {selectedRestaurant.rating && (
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className="text-green-600">⭐</span>
                                                                <span className="text-lg text-green-800 font-medium">
                                                                    {selectedRestaurant.rating}/5 rating
                                                                </span>
                                                            </div>
                                                        )}
                                                        {selectedRestaurant.distanceFromParty && (
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className="text-green-600">📏</span>
                                                                <span className="text-lg text-green-800">
                                                                    {selectedRestaurant.distanceFromParty.toFixed(1)} km from party center
                                                                </span>
                                                            </div>
                                                        )}
                                                        {selectedRestaurant.isChain && (
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className="text-green-600">🏢</span>
                                                                <span className="text-lg text-green-800">
                                                                    Chain: {selectedRestaurant.chainName}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Contact Information and Hours */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                        <div>
                                                            <h5 className="text-lg font-semibold text-green-800 mb-3">Contact Information</h5>
                                                            {selectedRestaurant.website ? (
                                                                <div className="flex items-center space-x-3 mb-3">
                                                                    <span className="text-green-600 text-xl">🌐</span>
                                                                    <a
                                                                        href={selectedRestaurant.website}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-lg text-blue-600 hover:text-blue-800 underline font-medium"
                                                                    >
                                                                        Visit Website
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <p className="text-green-700 italic">Website not available</p>
                                                            )}
                                                            {selectedRestaurant.phone ? (
                                                                <div className="flex items-center space-x-3">
                                                                    <span className="text-green-600 text-xl">📞</span>
                                                                    <a
                                                                        href={`tel:${selectedRestaurant.phone}`}
                                                                        className="text-lg text-green-800 hover:text-green-900 font-medium"
                                                                    >
                                                                        {selectedRestaurant.phone}
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <p className="text-green-700 italic">Phone not available</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h5 className="text-lg font-semibold text-green-800 mb-3">Operating Hours</h5>
                                                            {selectedRestaurant.hours && selectedRestaurant.hours.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {selectedRestaurant.hours.map((hour: string, index: number) => (
                                                                        <div key={index} className="text-base text-green-800 font-medium">
                                                                            {hour}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-green-700 italic">Hours not available</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Save Button */}
                                            <div className="pt-4 border-t border-green-200">
                                                <button
                                                    onClick={handleSaveSearchResult}
                                                    disabled={savingSearchResult}
                                                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                                                >
                                                    {savingSearchResult ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span>Saving...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                            </svg>
                                                            <span>Save to Database</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Save Status Messages */}
                                            {searchSaveStatus === 'success' && (
                                                <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-md">
                                                    <p className="text-green-700 text-sm">✅ Restaurant saved successfully!</p>
                                                </div>
                                            )}
                                            {searchSaveStatus === 'error' && (
                                                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
                                                    <p className="text-red-700 text-sm">❌ Failed to save restaurant. Please try again.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {beforeFlowError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">{beforeFlowError}</p>
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

                    {/* Expanded Restaurant Details Card */}
                    {beforeFlowResult.restaurantDetails && (
                        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <h4 className="text-xl font-semibold text-gray-900 mb-6">Restaurant Information</h4>

                            {/* Restaurant Name and Basic Info */}
                            <div className="mb-6">
                                <h5 className="text-2xl font-bold text-gray-900 mb-3">
                                    {beforeFlowResult.restaurantDetails.name}
                                </h5>
                                {beforeFlowResult.restaurantDetails.address && (
                                    <div className="flex items-start space-x-2 mb-2">
                                        <span className="text-gray-500 mt-1">📍</span>
                                        <p className="text-lg text-gray-700">{beforeFlowResult.restaurantDetails.address}</p>
                                    </div>
                                )}
                                {beforeFlowResult.restaurantDetails.rating && (
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-gray-500">⭐</span>
                                        <span className="text-lg text-gray-700 font-medium">
                                            {beforeFlowResult.restaurantDetails.rating}/5 rating
                                        </span>
                                    </div>
                                )}
                                {beforeFlowResult.restaurantDetails.isChain && (
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-gray-500">🏢</span>
                                        <span className="text-lg text-gray-700">
                                            Chain: {beforeFlowResult.restaurantDetails.chainName}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h6 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h6>
                                    {beforeFlowResult.restaurantDetails.website && (
                                        <div className="flex items-center space-x-3 mb-3">
                                            <span className="text-gray-500 text-xl">🌐</span>
                                            <a
                                                href={beforeFlowResult.restaurantDetails.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-lg text-blue-600 hover:text-blue-800 underline font-medium"
                                            >
                                                Visit Website
                                            </a>
                                        </div>
                                    )}
                                    {beforeFlowResult.restaurantDetails.phone && (
                                        <div className="flex items-center space-x-3">
                                            <span className="text-gray-500 text-xl">📞</span>
                                            <a
                                                href={`tel:${beforeFlowResult.restaurantDetails.phone}`}
                                                className="text-lg text-gray-700 hover:text-gray-900 font-medium"
                                            >
                                                {beforeFlowResult.restaurantDetails.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Operating Hours - Show All Days */}
                                <div>
                                    <h6 className="text-lg font-semibold text-gray-800 mb-3">Operating Hours</h6>
                                    {beforeFlowResult.restaurantDetails.hours && beforeFlowResult.restaurantDetails.hours.length > 0 ? (
                                        <div className="space-y-2">
                                            {beforeFlowResult.restaurantDetails.hours.map((hour: string, index: number) => (
                                                <div key={index} className="text-base text-gray-700 font-medium">
                                                    {hour}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-base text-gray-500 italic">Hours not available</p>
                                    )}
                                </div>
                            </div>

                            {/* Food Analysis */}
                            <div className="mb-6">
                                <h6 className="text-lg font-semibold text-gray-800 mb-3">🍽️ Foods Shown in Video</h6>
                                {beforeFlowResult.foods_shown && beforeFlowResult.foods_shown.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {beforeFlowResult.foods_shown.map((food: string, index: number) => (
                                            <span key={index} className="px-3 py-2 bg-orange-100 text-orange-800 rounded-full text-base font-medium">
                                                {food}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-base text-gray-500 italic">No specific foods identified</p>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="mb-6">
                                <h6 className="text-lg font-semibold text-gray-800 mb-3">🏷️ Tags</h6>
                                {beforeFlowResult.tags && beforeFlowResult.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {beforeFlowResult.tags.map((tag: string, index: number) => (
                                            <span key={index} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-base font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-base text-gray-500 italic">No tags identified</p>
                                )}
                            </div>

                            {/* Activity Type */}
                            <div>
                                <h6 className="text-lg font-semibold text-gray-800 mb-3">Activity Type</h6>
                                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-base font-medium">
                                    {beforeFlowResult.activity_type || 'other'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex space-x-4">
                        <button
                            onClick={handleSaveToDatabase}
                            disabled={savingEvent}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {savingEvent ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    <span>Save to Database</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>New</span>
                        </button>
                    </div>

                    {/* Save Status Messages */}
                    {saveStatus === 'success' && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-700 text-sm">✅ Restaurant event saved successfully!</p>
                        </div>
                    )}
                    {saveStatus === 'error' && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-700 text-sm">❌ Failed to save restaurant event. Please try again.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BeforeFlowTab; 