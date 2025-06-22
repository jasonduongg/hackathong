'use client';

import React, { useState } from 'react';

interface BeforeFlowTabProps {
    partyId: string;
}

const BeforeFlowTab: React.FC<BeforeFlowTabProps> = ({ partyId }) => {
    // Before Flow state
    const [beforeFlowUrl, setBeforeFlowUrl] = useState<string>('');
    const [beforeFlowLoading, setBeforeFlowLoading] = useState(false);
    const [beforeFlowProgress, setBeforeFlowProgress] = useState<{ step: string, percentage: number, details?: string }>({ step: '', percentage: 0 });
    const [beforeFlowResult, setBeforeFlowResult] = useState<any>(null);
    const [beforeFlowError, setBeforeFlowError] = useState<string | null>(null);
    const [instagramData, setInstagramData] = useState<{
        screenshots: string[];
        captionText: string;
        accountMentions: string[];
        locationTags: string[];
        hashtags: string[];
        allText: string;
        screenshotCount: number;
        videoDuration: number;
    } | null>(null);

    // Before Flow handlers
    const handleBeforeFlowUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBeforeFlowUrl(e.target.value);
        setBeforeFlowError(null);
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
        setBeforeFlowError(null);
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

                    {/* Instagram Screenshot and Data Display */}
                    {instagramData && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                            <h4 className="font-medium text-gray-900 mb-3">Instagram Post Analysis</h4>

                            {/* Screenshots */}
                            <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    Screenshots ({instagramData?.screenshotCount || 0} total):
                                    {instagramData?.videoDuration && instagramData.videoDuration > 0 && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            Video duration: {Math.round(instagramData.videoDuration)}s
                                            ({Math.round(instagramData.videoDuration / 60)}m {Math.round(instagramData.videoDuration % 60)}s)
                                        </span>
                                    )}
                                </h5>
                                <div className="space-y-4">
                                    {instagramData?.screenshots.map((screenshot, index) => {
                                        // Determine screenshot type based on index and caption presence
                                        const hasCaption = instagramData?.captionText && instagramData.captionText.length > 0;
                                        const isDebugScreenshot = index === 0; // First screenshot is always debug
                                        const isCaptionScreenshot = hasCaption && index === 1; // Second screenshot is caption (if exists)
                                        const isVideoScreenshot = hasCaption ? index > 1 : index > 0; // Rest are video screenshots

                                        return (
                                            <div key={index} className="border border-gray-200 rounded p-2">
                                                <div className="text-xs text-gray-500 mb-2">
                                                    {isDebugScreenshot ? (
                                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                            🔍 DEBUG: Full Page Screenshot
                                                        </span>
                                                    ) : isCaptionScreenshot ? (
                                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                                            📝 Caption Screenshot
                                                        </span>
                                                    ) : isVideoScreenshot ? (
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                            🎥 Video Screenshot {hasCaption ? index - 1 : index}
                                                            {instagramData?.videoDuration && instagramData.videoDuration > 0 && (
                                                                <span className="ml-2">
                                                                    (at {Math.round(((index - (hasCaption ? 2 : 1)) / Math.max(1, (instagramData?.screenshotCount || 1) - (hasCaption ? 2 : 1))) * instagramData.videoDuration)}s)
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                                            📷 Content Screenshot {index + 1}
                                                        </span>
                                                    )}
                                                </div>
                                                <img
                                                    src={`data:image/png;base64,${screenshot}`}
                                                    alt={`Instagram post screenshot ${index + 1}`}
                                                    className="max-w-full h-auto border border-gray-300 rounded"
                                                    style={{ maxHeight: '400px' }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Caption Display */}
                            {instagramData.captionText && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <h5 className="text-sm font-medium text-yellow-800 mb-2">📝 Caption Text:</h5>
                                    <p className="text-sm text-yellow-700 bg-white p-3 rounded border font-mono">
                                        {instagramData.captionText}
                                    </p>
                                </div>
                            )}

                            {/* Extracted Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h5 className="font-medium text-gray-900 mb-2">Account Mentions</h5>
                                    {instagramData.accountMentions && instagramData.accountMentions.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {instagramData.accountMentions.map((mention, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                                                >
                                                    {mention}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No account mentions</p>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900 mb-2">Location Tags</h5>
                                    {instagramData.locationTags && instagramData.locationTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {instagramData.locationTags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                                                >
                                                    📍 {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No location tags</p>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900 mb-2">Hashtags</h5>
                                    {instagramData.hashtags && instagramData.hashtags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {instagramData.hashtags.slice(0, 10).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                            {instagramData.hashtags.length > 10 && (
                                                <span className="text-gray-500 text-sm">
                                                    +{instagramData.hashtags.length - 10} more
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No hashtags</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Structured Data Display */}
                    <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Structured Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h5 className="font-medium text-gray-900">Place Names</h5>
                                    {beforeFlowResult.place_names && beforeFlowResult.place_names.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {beforeFlowResult.place_names.map((place: string, index: number) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                                                >
                                                    {place}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No places detected</p>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900">Context Clues</h5>
                                    {beforeFlowResult.context_clues && beforeFlowResult.context_clues.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {beforeFlowResult.context_clues.map((clue: string, index: number) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
                                                >
                                                    {clue}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No context clues found</p>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900">Multiple Locations</h5>
                                    <p className="text-gray-600">
                                        {beforeFlowResult.multiple_locations ? 'Yes' : 'No'}
                                    </p>
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900">Activity Type</h5>
                                    <p className="text-gray-600 capitalize">
                                        {beforeFlowResult.activity_type}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h5 className="font-medium text-gray-900">Foods Shown</h5>
                                    {beforeFlowResult.foods_shown && beforeFlowResult.foods_shown.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {beforeFlowResult.foods_shown.map((food: string, index: number) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                                                >
                                                    {food}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No foods detected</p>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900">Tags</h5>
                                    {beforeFlowResult.tags && beforeFlowResult.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {beforeFlowResult.tags.map((tag: string, index: number) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No tags</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Raw JSON Data */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-2">Raw JSON Data</h4>
                        <pre className="text-sm text-gray-700 overflow-x-auto">
                            {JSON.stringify(beforeFlowResult, null, 2)}
                        </pre>
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

                    {/* Enhanced Place Validation Results */}
                    {beforeFlowResult.enhanced_places && beforeFlowResult.enhanced_places.length > 0 && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                            <h4 className="font-medium text-green-900 mb-3">Place Validation Results (Google Maps)</h4>
                            <div className="space-y-3">
                                {beforeFlowResult.enhanced_places.map((place: any, index: number) => (
                                    <div key={index} className="border border-green-200 rounded p-3 bg-white">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-gray-900">
                                                {place.originalName}
                                            </span>
                                            <span className={`px-2 py-1 text-xs rounded-full ${place.confidence >= 0.7
                                                ? 'bg-green-100 text-green-800'
                                                : place.confidence >= 0.4
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {Math.round(place.confidence * 100)}% confidence
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {place.validatedName ? (
                                                <span className="text-green-700">✓ Validated as real place</span>
                                            ) : (
                                                <span className="text-red-700">✗ Likely not a real place</span>
                                            )}
                                        </div>
                                        {place.address && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Address:</span> {place.address}
                                            </div>
                                        )}
                                        {place.rating && (
                                            <div className="mt-1 text-sm text-gray-600">
                                                <span className="font-medium">Rating:</span> ⭐ {place.rating}/5
                                            </div>
                                        )}
                                        {place.searchResults && place.searchResults.length > 0 && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                <div className="font-medium mb-1">Google Places Results:</div>
                                                <div className="space-y-1">
                                                    {place.searchResults.slice(0, 2).map((result: any, idx: number) => (
                                                        <div key={idx} className="pl-2 border-l-2 border-green-200">
                                                            <div className="font-medium">{result.name}</div>
                                                            <div>{result.formatted_address}</div>
                                                            {result.rating && (
                                                                <div className="text-yellow-600">⭐ {result.rating}/5</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BeforeFlowTab; 