'use client';

import { useState } from 'react';
import { StructuredVideoData, parseStructuredVideoData } from '@/lib/prompts';

export default function StructuredVideoTest() {
    const [url, setUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{step: string, percentage: number, details?: string}>({step: '', percentage: 0});
    const [result, setResult] = useState<StructuredVideoData | null>(null);
    const [error, setError] = useState<string | null>(null);
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

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setError('Please enter a valid URL');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setProgress({step: 'Starting analysis...', percentage: 0});

        try {
            const formData = new FormData();
            
            // Check if it's an Instagram URL
            const isInstagram = url.includes('instagram.com/p/');
            
            if (isInstagram) {
                setProgress({step: 'Taking Instagram screenshot...', percentage: 20, details: 'Loading Instagram page'});
                
                // Step 1: Get screenshot from backend
                const screenshotRes = await fetch('/api/screenshot-instagram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
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
                
                setProgress({step: `Processing Instagram screenshot${durationText}...`, percentage: 40, details: 'Screenshots captured successfully'});
                
                // Step 2: Send ALL screenshots for analysis
                setProgress({step: `Analyzing ${screenshotData.screenshotCount} screenshots...`, percentage: 50, details: 'Preparing screenshots for AI analysis'});
                
                // Create a combined analysis request with all screenshots
                const analysisFormData = new FormData();
                
                // Add all screenshots
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
                
                // Add caption text for better context
                if (screenshotData.captionText) {
                    analysisFormData.append('captionText', screenshotData.captionText);
                    console.log('Added caption text for context:', screenshotData.captionText.substring(0, 100) + '...');
                }
                
                // Add all extracted Instagram data
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
                
                // Add video duration for context
                if (screenshotData.videoDuration > 0) {
                    analysisFormData.append('videoDuration', screenshotData.videoDuration.toString());
                    console.log('Added video duration:', screenshotData.videoDuration);
                }
                
                setProgress({step: `Analyzing ${screenshotData.screenshotCount} screenshots with AI...`, percentage: 60, details: 'Sending to Claude for analysis'});
                
                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: analysisFormData
                });

                setProgress({step: 'Processing results...', percentage: 90, details: 'Validating places and locations'});

                const data = await response.json();
                console.log('API Response:', data);

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process content');
                }

                // Use the enhanced structured data from the API
                if (data.structuredData) {
                    setProgress({step: 'Analysis complete!', percentage: 100, details: 'Results ready'});
                    // Combine structuredData with other top-level fields
                    setResult({
                        ...data.structuredData,
                        deducedRestaurant: data.deducedRestaurant,
                        restaurantDetails: data.restaurantDetails,
                        enhanced_places: data.enhanced_places,
                        geocodedPlaces: data.geocodedPlaces,
                        processingInfo: data.processingInfo
                    });
                } else {
                    setError('Failed to get structured data from API response');
                }
            } else {
                // Regular URL processing
                formData.append('url', url);
                formData.append('promptType', 'structured');
                formData.append('provider', 'anthropic');
                
                setProgress({step: 'Analyzing content...', percentage: 50, details: 'Processing with Claude'});
                console.log('Submitting URL:', url);

                const response = await fetch('/api/process-video', {
                    method: 'POST',
                    body: formData
                });

                setProgress({step: 'Processing results...', percentage: 90, details: 'Validating places and locations'});

                const data = await response.json();
                console.log('API Response:', data);

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to process content');
                }

                // Use the enhanced structured data from the API
                if (data.structuredData) {
                    setProgress({step: 'Analysis complete!', percentage: 100, details: 'Results ready'});
                    // Combine structuredData with other top-level fields
                    setResult({
                        ...data.structuredData,
                        deducedRestaurant: data.deducedRestaurant,
                        restaurantDetails: data.restaurantDetails,
                        enhanced_places: data.enhanced_places,
                        geocodedPlaces: data.geocodedPlaces,
                        processingInfo: data.processingInfo
                    });
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

    const extractVideoFrames = async (videoFile: File): Promise<string[]> => {
        return new Promise((resolve, reject) => {
            console.log('Starting frame extraction for:', videoFile.name);
            
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error('Could not create canvas context'));
                return;
            }

            const frames: string[] = [];
            const videoUrl = URL.createObjectURL(videoFile);
            
            video.onloadedmetadata = () => {
                console.log('Video metadata loaded:', {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight
                });
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Extract 1 frame per 2 seconds
                const frameInterval = 2; // seconds
                const totalFrames = Math.ceil(video.duration / frameInterval);
                const timestamps: number[] = [];
                
                for (let i = 0; i < totalFrames; i++) {
                    timestamps.push(i * frameInterval);
                }
                
                let frameIndex = 0;
                
                console.log(`Extracting ${timestamps.length} frames at 1 frame every ${frameInterval} seconds`);
                
                const extractFrame = () => {
                    if (frameIndex >= timestamps.length) {
                        console.log('Frame extraction complete, extracted frames:', frames.length);
                        URL.revokeObjectURL(videoUrl);
                        resolve(frames);
                        return;
                    }
                    
                    const currentTime = timestamps[frameIndex];
                    const progressPercentage = ((frameIndex + 1) / timestamps.length) * 100;
                    setProgress({
                        step: `Extracting frame ${frameIndex + 1}/${timestamps.length}`,
                        percentage: progressPercentage
                    });
                    
                    console.log(`Extracting frame ${frameIndex + 1} at time ${currentTime}s`);
                    video.currentTime = currentTime;
                };
                
                video.onseeked = () => {
                    try {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        const frameData = frameDataUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix
                        frames.push(frameData);
                        console.log(`Frame ${frameIndex + 1} extracted successfully (size: ${frameData.length})`);
                        frameIndex++;
                        extractFrame();
                    } catch (error) {
                        console.error('Error extracting frame:', error);
                        URL.revokeObjectURL(videoUrl);
                        reject(new Error(`Failed to extract frame ${frameIndex + 1}: ${error}`));
                    }
                };
                
                video.onerror = (error) => {
                    console.error('Video error:', error);
                    URL.revokeObjectURL(videoUrl);
                    reject(new Error('Failed to load video'));
                };
                
                extractFrame();
            };
            
            video.onerror = () => {
                console.error('Failed to load video metadata');
                URL.revokeObjectURL(videoUrl);
                reject(new Error('Failed to load video'));
            };
            
            video.src = videoUrl;
        });
    };

    const validateImageUrl = async (url: string): Promise<boolean> => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Structured Video Analysis Test
                </h1>

                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 text-sm">
                        <strong>Test Mode:</strong> This page shows detailed debugging information and raw data. 
                        For a cleaner user experience, visit the <a href="/restaurant-analyzer" className="text-blue-600 hover:text-blue-800 underline">Restaurant Analyzer</a>.
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Analyze Videos</h2>
                    
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-blue-800 text-sm">
                            <strong>Enhanced Analysis:</strong> The system takes targeted screenshots - separate screenshots of caption text and video content only (not entire UI). 
                            For videos: 1 frame every 2 seconds + caption screenshot if available.
                            Uses AI to identify and validate restaurant names using Google Maps API, ensuring accurate place identification from multiple locations.
                            All screenshots are analyzed together for comprehensive results with restaurant deduction.
                        </p>
                    </div>

                    {/* Simple Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter URL
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={handleUrlChange}
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
                                disabled={loading || !url.trim()}
                                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Analyze Content'}
                            </button>
                        </div>
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
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
                        
                        {/* Instagram Screenshot and Data Display */}
                        {instagramData && (
                            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                                <h3 className="font-medium text-gray-900 mb-3">Instagram Post Analysis</h3>
                                
                                {/* Screenshots */}
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                                        Screenshots ({instagramData?.screenshotCount || 0} total):
                                        {instagramData?.videoDuration && instagramData.videoDuration > 0 && (
                                            <span className="text-xs text-gray-500 ml-2">
                                                Video duration: {Math.round(instagramData.videoDuration)}s 
                                                ({Math.round(instagramData.videoDuration / 60)}m {Math.round(instagramData.videoDuration % 60)}s)
                                            </span>
                                        )}
                                    </h4>
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
                                        <h4 className="text-sm font-medium text-yellow-800 mb-2">📝 Caption Text:</h4>
                                        <p className="text-sm text-yellow-700 bg-white p-3 rounded border font-mono">
                                            {instagramData.captionText}
                                        </p>
                                    </div>
                                )}
                                
                                {/* Extracted Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Caption */}
                                    {instagramData.captionText && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Caption:</h4>
                                            <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                                                {instagramData.captionText}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Account Mentions */}
                                    {instagramData.accountMentions.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Account Mentions:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {instagramData.accountMentions.map((mention, index) => (
                                                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                        {mention}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Location Tags */}
                                    {instagramData.locationTags.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Location Tags:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {instagramData.locationTags.map((location, index) => (
                                                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                        📍 {location}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Hashtags */}
                                    {instagramData.hashtags.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Hashtags:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {instagramData.hashtags.slice(0, 10).map((hashtag, index) => (
                                                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                                        {hashtag}
                                                    </span>
                                                ))}
                                                {instagramData.hashtags.length > 10 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                        +{instagramData.hashtags.length - 10} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* All Text (truncated) */}
                                {instagramData.allText && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-1">All Extracted Text:</h4>
                                        <p className="text-xs text-gray-500 bg-white p-2 rounded border max-h-20 overflow-y-auto">
                                            {instagramData.allText}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {result.captionText && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-green-700 text-sm">
                                    <strong>Caption Context:</strong> "{result.captionText}"
                                </p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-gray-900">Place Names Found</h3>
                                    {result.place_names && result.place_names.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.place_names.map((place, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                                                >
                                                    {place}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">No places identified</p>
                                    )}
                                </div>

                                {/* Deduced Restaurant Section */}
                                {result.deducedRestaurant && (
                                    <div>
                                        <h3 className="font-medium text-gray-900">🎯 Deduced Restaurant</h3>
                                        <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">🏪</span>
                                                <span className="font-semibold text-green-800 text-lg">
                                                    {result.deducedRestaurant}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                AI-analyzed from all available data including place names, context clues, and location information
                                            </p>
                                            
                                            {/* Restaurant Details */}
                                            {result.restaurantDetails && (
                                                <div className="mt-3 p-3 bg-white rounded border">
                                                    {result.restaurantDetails.isChain ? (
                                                        <div className="text-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-blue-600">🔗</span>
                                                                <span className="font-medium text-blue-800">Chain Restaurant</span>
                                                            </div>
                                                            <p className="text-gray-600">
                                                                <strong>Chain:</strong> {result.restaurantDetails.chainName}
                                                            </p>
                                                            <p className="text-gray-500 text-xs mt-1">
                                                                Address and hours not available for chain locations
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-green-600">📍</span>
                                                                <span className="font-medium text-green-800">Single Location</span>
                                                            </div>
                                                            
                                                            {result.restaurantDetails.address && (
                                                                <p className="text-gray-600 mb-1">
                                                                    <strong>Address:</strong> {result.restaurantDetails.address}
                                                                </p>
                                                            )}
                                                            
                                                            {result.restaurantDetails.website && (
                                                                <p className="text-gray-600 mb-1">
                                                                    <strong>Website:</strong> 
                                                                    <a 
                                                                        href={result.restaurantDetails.website} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800 ml-1"
                                                                    >
                                                                        Visit Website
                                                                    </a>
                                                                </p>
                                                            )}
                                                            
                                                            {result.restaurantDetails.phone && (
                                                                <p className="text-gray-600 mb-1">
                                                                    <strong>Phone:</strong> {result.restaurantDetails.phone}
                                                                </p>
                                                            )}
                                                            
                                                            {result.restaurantDetails.rating && (
                                                                <p className="text-gray-600 mb-1">
                                                                    <strong>Rating:</strong> ⭐ {result.restaurantDetails.rating}/5
                                                                </p>
                                                            )}
                                                            
                                                            {result.restaurantDetails.hours && result.restaurantDetails.hours.length > 0 && (
                                                                <div className="mt-2">
                                                                    <p className="font-medium text-gray-700 mb-1">Hours:</p>
                                                                    <div className="text-xs text-gray-600 space-y-1">
                                                                        {result.restaurantDetails.hours.map((hour: string, index: number) => (
                                                                            <div key={index}>{hour}</div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-medium text-gray-900">Context Clues</h3>
                                    {result.context_clues && result.context_clues.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.context_clues.map((clue, index) => (
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
                                    <h3 className="font-medium text-gray-900">Multiple Locations</h3>
                                    <p className="text-gray-600">
                                        {result.multiple_locations ? 'Yes' : 'No'}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900">Activity Type</h3>
                                    <p className="text-gray-600 capitalize">
                                        {result.activity_type}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-gray-900">Foods Shown</h3>
                                    {result.foods_shown.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.foods_shown.map((food, index) => (
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
                                    <h3 className="font-medium text-gray-900">Tags</h3>
                                    {result.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.tags.map((tag, index) => (
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

                        <div className="mt-6 p-4 bg-gray-50 rounded-md">
                            <h3 className="font-medium text-gray-900 mb-2">Raw JSON Data</h3>
                            <pre className="text-sm text-gray-700 overflow-x-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>

                        {/* Clean Restaurant Data */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-md">
                            <h3 className="font-medium text-blue-900 mb-2">Clean Restaurant Data</h3>
                            <pre className="text-sm text-blue-700 overflow-x-auto">
                                {JSON.stringify({
                                    restaurant: result.restaurantDetails ? {
                                        name: result.restaurantDetails.name,
                                        isChain: result.restaurantDetails.isChain,
                                        chainName: result.restaurantDetails.isChain ? result.restaurantDetails.chainName : null,
                                        // Location details only for single locations
                                        address: result.restaurantDetails.isChain ? null : result.restaurantDetails.address,
                                        website: result.restaurantDetails.isChain ? null : result.restaurantDetails.website,
                                        hours: result.restaurantDetails.isChain ? null : result.restaurantDetails.hours,
                                        phone: result.restaurantDetails.isChain ? null : result.restaurantDetails.phone,
                                        rating: result.restaurantDetails.isChain ? null : result.restaurantDetails.rating,
                                        placeId: result.restaurantDetails.isChain ? null : result.restaurantDetails.placeId
                                    } : null,
                                    analysis: {
                                        place_names: result.place_names,
                                        multiple_locations: result.multiple_locations,
                                        activity_type: result.activity_type,
                                        foods_shown: result.foods_shown,
                                        tags: result.tags,
                                        context_clues: result.context_clues
                                    },
                                    processing: {
                                        frameCount: (result as any).processingInfo?.frameCount || 0,
                                        originalPlaceCount: (result as any).processingInfo?.originalPlaceCount || 0,
                                        validatedPlaceCount: (result as any).processingInfo?.validatedPlaceCount || 0,
                                        geocodedPlaceCount: (result as any).processingInfo?.geocodedPlaceCount || 0
                                    }
                                }, null, 2)}
                            </pre>
                        </div>

                        {/* Enhanced Place Validation Results */}
                        {result.enhanced_places && result.enhanced_places.length > 0 && (
                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                                <h3 className="font-medium text-green-900 mb-3">Place Validation Results (Google Maps)</h3>
                                <div className="space-y-3">
                                    {result.enhanced_places.map((place, index) => (
                                        <div key={index} className="border border-green-200 rounded p-3 bg-white">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-medium text-gray-900">
                                                    {place.originalName}
                                                </span>
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    place.confidence >= 0.7 
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
                                                        {place.searchResults.slice(0, 2).map((result, idx) => (
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
        </div>
    );
} 