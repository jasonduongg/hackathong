'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoAnalysis } from '@/contexts/VideoAnalysisContext';

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

    // Before Flow handlers
    const handleBeforeFlowUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBeforeFlowUrl(e.target.value);
        clearError();
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

                // Add all screenshots
                for (let i = 0; i < screenshotData.screenshots.length; i++) {
                    const screenshot = screenshotData.screenshots[i];
                    const byteString = atob(screenshot);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let j = 0; j < byteString.length; j++) {
                        ia[j] = byteString.charCodeAt(j);
                    }
                    const blob = new Blob([ab], { type: 'image/png' });
                    analysisFormData.append('images', blob, `instagram-screenshot-${i + 1}.png`);
                }

                analysisFormData.append('promptType', 'structured');
                analysisFormData.append('provider', 'anthropic');
                analysisFormData.append('analysisMode', 'multi-screenshot');

                // Add Instagram-specific context
                if (screenshotData.captionText) {
                    analysisFormData.append('captionText', screenshotData.captionText);
                    console.log('Added caption text for context:', screenshotData.captionText.substring(0, 100) + '...');
                }
                if (screenshotData.accountMentions && screenshotData.accountMentions.length > 0) {
                    analysisFormData.append('accountMentions', screenshotData.accountMentions.join(', '));
                    console.log('Added account mentions:', screenshotData.accountMentions);
                }
                if (screenshotData.locationTags && screenshotData.locationTags.length > 0) {
                    analysisFormData.append('locationTags', screenshotData.locationTags.join(', '));
                    console.log('Added location tags:', screenshotData.locationTags);
                }
                if (screenshotData.hashtags && screenshotData.hashtags.length > 0) {
                    analysisFormData.append('hashtags', screenshotData.hashtags.join(', '));
                    console.log('Added hashtags:', screenshotData.hashtags.slice(0, 5));
                }
                if (screenshotData.videoDuration > 0) {
                    analysisFormData.append('videoDuration', screenshotData.videoDuration.toString());
                    console.log('Added video duration:', screenshotData.videoDuration);
                }

                setBeforeFlowProgress({ step: `Analyzing ${screenshotData.screenshotCount} screenshots with AI...`, percentage: 60, details: 'Sending to Claude for analysis' });

                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: analysisFormData
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
                    placeId: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.placeId
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
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-900"></div>
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
                                    placeId: beforeFlowResult.restaurantDetails.isChain ? null : beforeFlowResult.restaurantDetails.placeId
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
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-green-700 font-medium">Event saved successfully!</p>
                                </div>
                                <p className="text-green-600 text-sm mt-1">
                                    Restaurant data and Instagram post have been saved to the events database.
                                </p>
                            </div>
                        )}

                        {saveStatus === 'error' && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-red-700 font-medium">Error saving event</p>
                                </div>
                                <p className="text-red-600 text-sm mt-1">
                                    Please try again later. If the problem persists, contact support.
                                </p>
                            </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                            <p>This will save:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Clean restaurant data (name, address, hours, rating, etc.)</li>
                                <li>Analysis results (foods shown, tags, context clues)</li>
                                <li>Instagram post metadata (captions, hashtags, account mentions)</li>
                                <li>Party association and user information</li>
                                <li><em>Note: Instagram screenshots are not saved to avoid size limits</em></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BeforeFlowTab; 