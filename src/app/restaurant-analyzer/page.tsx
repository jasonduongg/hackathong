'use client';

import { useState } from 'react';

interface RestaurantDetails {
    name: string;
    isChain: boolean;
    chainName?: string;
    address?: string | null;
    website?: string | null;
    hours?: string[] | null;
    phone?: string | null;
    rating?: number | null;
    placeId?: string | null;
    image?: string | null;
}

interface AnalysisResult {
    place_names: string[];
    multiple_locations: boolean;
    activity_type: string;
    foods_shown: string[];
    tags: string[];
    context_clues?: string[];
    deducedRestaurant?: string;
    restaurantDetails?: RestaurantDetails;
    enhanced_places?: any[];
    processingInfo?: any;
    allDetectedRestaurants?: string[];
    hasMultipleRestaurants?: boolean;
}

interface InstagramData {
    screenshots: string[];
    captionText: string;
    accountMentions: string[];
    locationTags: string[];
    hashtags: string[];
    allText: string;
    screenshotCount: number;
    videoDuration: number;
}

export default function RestaurantAnalyzer() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [instagramData, setInstagramData] = useState<InstagramData | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
    const [progress, setProgress] = useState({ step: '', percentage: 0, details: '' });

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        try {
            new URL(url);
        } catch {
            setError('Please enter a valid URL');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setSelectedRestaurant(null);
        setProgress({step: 'Starting analysis...', percentage: 0, details: ''});

        try {
            const formData = new FormData();
            
            const isInstagram = url.includes('instagram.com/p/');
            
            if (isInstagram) {
                setProgress({step: 'Taking Instagram screenshot...', percentage: 20, details: 'Loading Instagram page'});
                
                const screenshotRes = await fetch('/api/screenshot-instagram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const screenshotData = await screenshotRes.json();
                if (!screenshotRes.ok || !screenshotData.screenshots || screenshotData.screenshots.length === 0) {
                    throw new Error(screenshotData.error || 'Failed to screenshot Instagram post');
                }
                
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
                
                setProgress({step: `Processing Instagram screenshot${durationText}...`, percentage: 40, details: 'Screenshots captured successfully'});
                
                setProgress({step: `Analyzing ${screenshotData.screenshotCount} screenshots...`, percentage: 50, details: 'Preparing screenshots for AI analysis'});
                
                const analysisFormData = new FormData();
                
                screenshotData.screenshots.forEach((screenshot: string, index: number) => {
                    const byteString = atob(screenshot);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: 'image/png' });
                    analysisFormData.append('images', blob, `instagram-screenshot-${index + 1}.png`);
                });
                
                analysisFormData.append('promptType', 'structured');
                analysisFormData.append('provider', 'anthropic');
                analysisFormData.append('analysisMode', 'multi-screenshot');
                
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
                
                setProgress({step: `Analyzing ${screenshotData.screenshotCount} screenshots with AI...`, percentage: 60, details: 'Sending to Claude for analysis'});
                
                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: analysisFormData
                });

                setProgress({step: 'Processing results...', percentage: 90, details: 'Validating places and locations'});

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process content');
                }

                if (data.structuredData) {
                    setProgress({step: 'Analysis complete!', percentage: 100, details: 'Results ready'});
                    const fullResult = {
                        ...data.structuredData,
                        deducedRestaurant: data.deducedRestaurant,
                        restaurantDetails: data.restaurantDetails,
                        enhanced_places: data.enhanced_places,
                        geocodedPlaces: data.geocodedPlaces,
                        processingInfo: data.processingInfo,
                        allDetectedRestaurants: data.allDetectedRestaurants,
                        hasMultipleRestaurants: data.hasMultipleRestaurants
                    };
                    setResult(fullResult);
                    
                    // Auto-select if only one restaurant
                    if (fullResult.place_names.length === 1) {
                        setSelectedRestaurant(fullResult.place_names[0]);
                    }
                } else {
                    setError('Failed to get structured data from API response');
                }
            } else {
                formData.append('url', url);
                formData.append('promptType', 'structured');
                formData.append('provider', 'anthropic');
                
                setProgress({step: 'Analyzing content...', percentage: 50, details: 'Processing with Claude'});

                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: formData
                });

                setProgress({step: 'Processing results...', percentage: 90, details: 'Validating places and locations'});

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process content');
                }

                if (data.structuredData) {
                    setProgress({step: 'Analysis complete!', percentage: 100, details: 'Results ready'});
                    const fullResult = {
                        ...data.structuredData,
                        deducedRestaurant: data.deducedRestaurant,
                        restaurantDetails: data.restaurantDetails,
                        enhanced_places: data.enhanced_places,
                        geocodedPlaces: data.geocodedPlaces,
                        processingInfo: data.processingInfo,
                        allDetectedRestaurants: data.allDetectedRestaurants,
                        hasMultipleRestaurants: data.hasMultipleRestaurants
                    };
                    setResult(fullResult);
                    
                    // Auto-select if only one restaurant
                    if (fullResult.place_names.length === 1) {
                        setSelectedRestaurant(fullResult.place_names[0]);
                    }
                } else {
                    setError('Failed to get structured data from API response');
                }
            }

        } catch (error) {
            console.error('Error:', error);
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedRestaurantDetails = () => {
        if (!selectedRestaurant || !result) return null;
        
        // If we have restaurantDetails and it matches the selected restaurant
        if (result.restaurantDetails && result.restaurantDetails.name === selectedRestaurant) {
            return result.restaurantDetails;
        }
        
        // Otherwise, create a basic restaurant object
        return {
            name: selectedRestaurant,
            isChain: false,
            address: null,
            website: null,
            hours: null,
            phone: null,
            rating: null,
            placeId: null
        };
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Restaurant Analyzer
                    </h1>
                    <a 
                        href="/structured-video-test" 
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                        Test Mode
                    </a>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Analyze Restaurant Content</h2>
                    
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-blue-800 text-sm">
                            <strong>AI-Powered Analysis:</strong> Upload Instagram posts, videos, or images to automatically identify restaurants, 
                            determine if they're chains or single locations, and get detailed information including addresses, hours, and ratings.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter URL
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={handleUrlChange}
                                placeholder="https://www.instagram.com/p/... or image URL"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Instagram posts, Unsplash images, or direct image links
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !url.trim()}
                            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {loading ? 'Analyzing...' : 'Analyze Restaurant'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {loading && progress.step && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-blue-700 text-sm font-medium">{progress.step}</span>
                                <span className="text-blue-700 text-sm">{Math.round(progress.percentage)}%</span>
                            </div>
                            {progress.details && (
                                <div className="text-blue-600 text-xs mb-2 italic">
                                    {progress.details}
                                </div>
                            )}
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {result && (
                    <div className="space-y-6">
                        {/* Summary of All Detected Restaurants */}
                        {result.hasMultipleRestaurants && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4">All Detected Restaurants</h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(result.allDetectedRestaurants || result.place_names).map((restaurant, index) => (
                                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-2">{restaurant}</h4>
                                            <p className="text-sm text-gray-600">
                                                {result.context_clues?.find(clue => 
                                                    clue.toLowerCase().includes(restaurant.toLowerCase())
                                                ) || 'Restaurant mentioned in content'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Restaurant Selection */}
                        {(result.hasMultipleRestaurants || result.place_names.length > 1) && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4">Multiple Restaurants Detected</h3>
                                <p className="text-gray-600 mb-4">
                                    We found multiple restaurants in this content. Please select which one you'd like to see details for:
                                </p>
                                <div className="space-y-2">
                                    {(result.allDetectedRestaurants || result.place_names).map((place, index) => (
                                        <label key={index} className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="restaurant"
                                                value={place}
                                                checked={selectedRestaurant === place}
                                                onChange={(e) => setSelectedRestaurant(e.target.value)}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-900">{place}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Restaurant Details */}
                        {selectedRestaurant && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {selectedRestaurant}
                                    </h3>
                                    {getSelectedRestaurantDetails()?.isChain && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                            Chain Restaurant
                                        </span>
                                    )}
                                </div>

                                {getSelectedRestaurantDetails() && (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Restaurant Image */}
                                        {getSelectedRestaurantDetails()?.image && (
                                            <div className="md:col-span-2 mb-6">
                                                <h4 className="font-medium text-gray-900 mb-3">Restaurant Photo</h4>
                                                <div className="relative">
                                                    <img 
                                                        src={getSelectedRestaurantDetails()?.image || ''} 
                                                        alt={`${selectedRestaurant} restaurant`}
                                                        className="w-full h-64 object-cover rounded-lg shadow-md"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-2">Restaurant Information</h4>
                                                <div className="space-y-2 text-sm">
                                                    {getSelectedRestaurantDetails()?.isChain ? (
                                                        <p className="text-gray-600">
                                                            <span className="font-medium">Chain:</span> {getSelectedRestaurantDetails()?.chainName}
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {getSelectedRestaurantDetails()?.address && (
                                                                <p className="text-gray-600">
                                                                    <span className="font-medium">Address:</span> {getSelectedRestaurantDetails()?.address}
                                                                </p>
                                                            )}
                                                            {getSelectedRestaurantDetails()?.phone && (
                                                                <p className="text-gray-600">
                                                                    <span className="font-medium">Phone:</span> {getSelectedRestaurantDetails()?.phone}
                                                                </p>
                                                            )}
                                                            {getSelectedRestaurantDetails()?.rating && (
                                                                <p className="text-gray-600">
                                                                    <span className="font-medium">Rating:</span> ⭐ {getSelectedRestaurantDetails()?.rating}/5
                                                                </p>
                                                            )}
                                                            {getSelectedRestaurantDetails()?.website && (
                                                                <p className="text-gray-600">
                                                                    <span className="font-medium">Website:</span> 
                                                                    <a 
                                                                        href={getSelectedRestaurantDetails()?.website || ''} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800 ml-1"
                                                                    >
                                                                        Visit Website
                                                                    </a>
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {(() => {
                                                const details = getSelectedRestaurantDetails();
                                                return details?.hours && details.hours.length > 0 && (
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 mb-2">Hours of Operation</h4>
                                                        <div className="text-sm space-y-1">
                                                            {details.hours.map((hour, index) => (
                                                                <div key={index} className="text-gray-600">{hour}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-2">Foods Featured</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.foods_shown.slice(0, 8).map((food, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                                                        >
                                                            {food}
                                                        </span>
                                                    ))}
                                                    {result.foods_shown.length > 8 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                                                            +{result.foods_shown.length - 8} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-2">Location Context</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.context_clues?.slice(0, 6).map((clue, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
                                                        >
                                                            {clue}
                                                        </span>
                                                    ))}
                                                    {result.context_clues && result.context_clues.length > 6 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                                                            +{result.context_clues.length - 6} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Instagram Post Info */}
                        {instagramData && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4">Instagram Post Details</h3>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">
                                            <span className="font-medium">Screenshots:</span> {instagramData.screenshotCount}
                                        </p>
                                        {instagramData.videoDuration > 0 && (
                                            <p className="text-gray-600">
                                                <span className="font-medium">Video Duration:</span> {Math.round(instagramData.videoDuration)}s
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        {instagramData.locationTags.length > 0 && (
                                            <p className="text-gray-600">
                                                <span className="font-medium">Location:</span> {instagramData.locationTags.join(', ')}
                                            </p>
                                        )}
                                        {instagramData.hashtags.length > 0 && (
                                            <p className="text-gray-600">
                                                <span className="font-medium">Hashtags:</span> {instagramData.hashtags.length}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
} 