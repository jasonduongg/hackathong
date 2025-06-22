import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        
        if (!url || !url.includes('instagram.com')) {
            return NextResponse.json(
                { error: 'Invalid Instagram URL' },
                { status: 400 }
            );
        }

        console.log('Taking screenshot of Instagram post:', url);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Set viewport to laptop aspect ratio (16:10) - wider for better laptop experience
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the Instagram post
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for popups to appear and handle them
        console.log('Handling popups and banners...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to close popups
        const popupSelectors = [
            'button[aria-label="Close"]',
            'button[aria-label="Close dialog"]',
            'button[aria-label="Dismiss"]',
            'button:has-text("Not Now")',
            'button:has-text("Close")',
            'button:has-text("X")',
            'button:has-text("✕")',
            'button:has-text("×")',
            '[data-testid="close-button"]',
            '.close-button',
            '.modal-close',
            'svg[aria-label="Close"]'
        ];
        
        for (const selector of popupSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    console.log(`Found and clicking popup element: ${selector}`);
                    await element.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                // Continue to next selector
            }
        }
        
        // Wait for content to load after popup handling
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find the video element specifically
        console.log('Looking for video element...');
        let videoElement = null;
        let isVideoPost = false;
        const videoSelectors = [
            'video',
            '[data-testid="video-player"]',
            'video[src]',
            'video[data-testid]'
        ];

        for (const selector of videoSelectors) {
            try {
                console.log(`Trying video selector: ${selector}`);
                await page.waitForSelector(selector, { timeout: 5000 });
                videoElement = await page.$(selector);
                if (videoElement) {
                    console.log(`Found video with selector: ${selector}`);
                    isVideoPost = true;
                    break;
                }
            } catch (error) {
                console.log(`Video selector ${selector} not found, trying next...`);
            }
        }

        // Always target the full post content to include captions/descriptions
        console.log('Looking for post container to include captions...');
        const postSelectors = [
            'article',
            '[role="main"]',
            'main',
            '[data-testid="post-container"]'
        ];

        let postElement = null;
        for (const selector of postSelectors) {
            try {
                console.log(`Trying post selector: ${selector}`);
                await page.waitForSelector(selector, { timeout: 5000 });
                postElement = await page.$(selector);
                if (postElement) {
                    console.log(`Found post with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                console.log(`Post selector ${selector} not found, trying next...`);
            }
        }

        if (!postElement) {
            // Final fallback to body
            postElement = await page.$('body');
        }

        if (!postElement) {
            await browser.close();
            return NextResponse.json({ error: 'Could not find Instagram post content on page.' }, { status: 404 });
        }

        // Use postElement for screenshots (includes captions) but keep videoElement for duration detection
        const screenshotElement = postElement;

        // Get video duration if it's a video element
        let videoDuration = 0;
        try {
            videoDuration = await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video && !isNaN(video.duration)) {
                    return video.duration;
                }
                return 0;
            });
            console.log('Video duration detected:', videoDuration, 'seconds');
        } catch (error) {
            console.log('Could not detect video duration:', error);
        }

        // Extract text content first
        console.log('Extracting text content...');
        const extractedData = await page.evaluate(() => {
            const result = {
                caption: '',
                accountMentions: [] as string[],
                locationTags: [] as string[],
                hashtags: [] as string[],
                allText: ''
            };

            // Get all text from the page
            const allText = document.body.textContent || '';
            result.allText = allText;

            // Extract account mentions (@username)
            const accountMatches = allText.match(/@[a-zA-Z0-9._]+/g);
            if (accountMatches) {
                result.accountMentions = [...new Set(accountMatches)];
            }

            // Extract location tags (📍 Location Name)
            const locationMatches = allText.match(/📍\s*([^#\n]+)/g);
            if (locationMatches) {
                result.locationTags = locationMatches.map(match => match.replace('📍', '').trim());
            }

            // Extract hashtags
            const hashtagMatches = allText.match(/#([a-zA-Z0-9_]+)/g);
            if (hashtagMatches) {
                result.hashtags = [...new Set(hashtagMatches)];
            }

            // Try to find caption text
            const captionSelectors = [
                '[data-testid="post-caption"]',
                'div[class*="caption"]',
                'div[class*="Caption"]',
                'span[class*="caption"]',
                'p[class*="caption"]'
            ];

            for (const selector of captionSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 10) {
                        result.caption = text;
                        break;
                    }
                }
                if (result.caption) break;
            }

            return result;
        });

        console.log('Extracted data:', {
            captionLength: extractedData.caption.length,
            accountMentions: extractedData.accountMentions,
            locationTags: extractedData.locationTags,
            hashtagCount: extractedData.hashtags.length
        });

        // Take targeted screenshots: caption area + video content only
        console.log('Taking targeted screenshots...');
        const screenshots: string[] = [];
        
        // 0. DEBUG: Take a full page screenshot first to see what we're working with
        try {
            console.log('Taking full page debug screenshot...');
            const fullPageScreenshot = await page.screenshot({
                type: 'png',
                encoding: 'binary',
                fullPage: true
            });
            const fullPageBase64 = Buffer.from(fullPageScreenshot).toString('base64');
            screenshots.push(fullPageBase64);
            console.log('Full page debug screenshot taken');
        } catch (error) {
            console.error('Error taking full page screenshot:', error);
        }
        
        // 1. Screenshot of caption area (if exists) - IMPROVED LOGIC
        if (extractedData.caption.length > 0) {
            try {
                console.log('Taking caption screenshot...');
                const captionElement = await page.evaluateHandle(() => {
                    // Find the video element first to locate caption next to it
                    const video = document.querySelector('video');
                    if (!video) return null;
                    
                    const videoRect = video.getBoundingClientRect();
                    console.log('Video position:', videoRect);
                    
                    // Look for caption elements that are positioned next to or below the video
                    const captionSelectors = [
                        '[data-testid="post-caption"]',
                        '[data-testid="caption"]',
                        'div[class*="caption"]',
                        'div[class*="Caption"]',
                        'span[class*="caption"]',
                        'p[class*="caption"]',
                        'div[class*="text"]',
                        'span[class*="text"]'
                    ];
                    
                    for (const selector of captionSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            const elementRect = element.getBoundingClientRect();
                            const text = element.textContent?.trim();
                            
                            if (text && text.length > 10 && text.length < 2000) {
                                // Check if this element is positioned next to or below the video
                                const isNearVideo = (
                                    // Below the video
                                    (elementRect.top > videoRect.bottom - 50 && elementRect.top < videoRect.bottom + 200) ||
                                    // To the right of the video (if video is on the left)
                                    (elementRect.left > videoRect.right - 50 && elementRect.left < videoRect.right + 300) ||
                                    // Above the video (if caption is above)
                                    (elementRect.bottom < videoRect.top + 50 && elementRect.bottom > videoRect.top - 200)
                                );
                                
                                if (isNearVideo) {
                                    console.log('Found caption element near video:', selector, 'Text length:', text.length, 'Position:', elementRect);
                                    return element;
                                }
                            }
                        }
                    }
                    
                    // Fallback: look for any text content that might be a caption near the video
                    const allDivs = document.querySelectorAll('div');
                    for (const div of allDivs) {
                        const text = div.textContent?.trim();
                        if (text && text.length > 20 && text.length < 1000) {
                            const rect = div.getBoundingClientRect();
                            
                            // Check if it's positioned near the video
                            const isNearVideo = (
                                (rect.top > videoRect.bottom - 50 && rect.top < videoRect.bottom + 200) ||
                                (rect.left > videoRect.right - 50 && rect.left < videoRect.right + 300) ||
                                (rect.bottom < videoRect.top + 50 && rect.bottom > videoRect.top - 200)
                            );
                            
                            if (isNearVideo) {
                                console.log('Found potential caption fallback near video:', 'Text length:', text.length, 'Position:', rect);
                                return div;
                            }
                        }
                    }
                    
                    return null;
                });
                
                if (captionElement && captionElement.asElement()) {
                    const captionScreenshot = await captionElement.asElement()!.screenshot({
                        type: 'png',
                        encoding: 'binary',
                    });
                    const base64 = Buffer.from(captionScreenshot).toString('base64');
                    screenshots.push(base64);
                    console.log('Caption screenshot taken successfully');
                } else {
                    console.log('No caption element found for screenshot');
                }
            } catch (error) {
                console.error('Error taking caption screenshot:', error);
            }
        } else {
            console.log('No caption text found, skipping caption screenshot');
        }

        // 2. FAST VIDEO FRAME EXTRACTION - Much faster than seeking through video
        if (isVideoPost && videoDuration > 0) {
            console.log('Using fast video frame extraction method...');
            const startTime = Date.now();
            
            // Calculate number of frames: 1 per 2 seconds as requested
            const frameInterval = 2; // seconds
            const videoScreenshotCount = Math.ceil(videoDuration / frameInterval);
            
            console.log(`Taking ${videoScreenshotCount} video frames at 1 frame every ${frameInterval} seconds...`);
            
            // FAST METHOD: Use video element's natural frame extraction
            try {
                // Get video element and extract frames efficiently
                const videoFrames = await page.evaluate(async (frameCount, duration) => {
                    const video = document.querySelector('video') as HTMLVideoElement;
                    if (!video) return [];
                    
                    const frames: string[] = [];
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return [];
                    
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    console.log(`Starting fast frame extraction: ${frameCount} frames from ${duration}s video`);
                    
                    // Fast frame extraction: jump to key timestamps
                    for (let i = 0; i < frameCount; i++) {
                        const timestamp = (i / frameCount) * duration;
                        console.log(`Extracting frame ${i + 1}/${frameCount} at ${timestamp.toFixed(1)}s`);
                        
                        // Set video time and wait for it to be ready
                        video.currentTime = timestamp;
                        
                        // Wait for video to be ready (much faster than full seek)
                        await new Promise<void>((resolve) => {
                            const onCanPlay = () => {
                                video.removeEventListener('canplay', onCanPlay);
                                resolve();
                            };
                            video.addEventListener('canplay', onCanPlay);
                            
                            // Timeout fallback
                            setTimeout(() => {
                                video.removeEventListener('canplay', onCanPlay);
                                resolve();
                            }, 100);
                        });
                        
                        // Capture frame
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const frameDataUrl = canvas.toDataURL('image/png', 0.8);
                        const frameData = frameDataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
                        frames.push(frameData);
                    }
                    
                    console.log(`Fast frame extraction completed: ${frames.length} frames`);
                    return frames;
                }, videoScreenshotCount, videoDuration);
                
                // Add extracted frames to screenshots
                screenshots.push(...videoFrames);
                const endTime = Date.now();
                const processingTime = endTime - startTime;
                console.log(`Fast frame extraction completed: ${videoFrames.length} frames in ${processingTime}ms (${(processingTime/1000).toFixed(2)}s)`);
                console.log(`Average time per frame: ${(processingTime/videoFrames.length).toFixed(0)}ms`);
                
            } catch (error) {
                console.error('Fast frame extraction failed, falling back to video element screenshots:', error);
                
                // Fallback: take screenshots of video element at different times
                const fallbackStartTime = Date.now();
                for (let i = 0; i < videoScreenshotCount; i++) {
                    try {
                        const timestamp = (i / videoScreenshotCount) * videoDuration;
                        
                        // Quick seek
                        await page.evaluate((time) => {
                            const video = document.querySelector('video') as HTMLVideoElement;
                            if (video) {
                                video.currentTime = time;
                            }
                        }, timestamp);
                        
                        // Short wait
                        await new Promise(resolve => setTimeout(resolve, 50));
                        
                        if (videoElement && videoElement.asElement()) {
                            const videoScreenshot = await videoElement.asElement()!.screenshot({
                                type: 'png',
                                encoding: 'binary',
                            });
                            const base64 = Buffer.from(videoScreenshot).toString('base64');
                            screenshots.push(base64);
                        }
                    } catch (frameError) {
                        console.error(`Error taking fallback video frame ${i + 1}:`, frameError);
                    }
                }
                const fallbackEndTime = Date.now();
                const fallbackTime = fallbackEndTime - fallbackStartTime;
                console.log(`Fallback frame extraction completed: ${videoScreenshotCount} frames in ${fallbackTime}ms (${(fallbackTime/1000).toFixed(2)}s)`);
            }
        } else if (isVideoPost) {
            // If video exists but no duration, take 1 screenshot
            try {
                console.log('Taking single video screenshot...');
                if (videoElement && videoElement.asElement()) {
                    const videoScreenshot = await videoElement.asElement()!.screenshot({
                        type: 'png',
                        encoding: 'binary',
                    });
                    const base64 = Buffer.from(videoScreenshot).toString('base64');
                    screenshots.push(base64);
                }
            } catch (error) {
                console.error('Error taking video screenshot:', error);
            }
        } else {
            // If no video, take screenshot of the main content area
            try {
                console.log('Taking content area screenshot...');
                const contentScreenshot = await screenshotElement.screenshot({
                    type: 'png',
                    encoding: 'binary',
                });
                const base64 = Buffer.from(contentScreenshot).toString('base64');
                screenshots.push(base64);
            } catch (error) {
                console.error('Error taking content screenshot:', error);
            }
        }

        await browser.close();

        console.log('Screenshots taken successfully:', screenshots.length);
        console.log('Screenshot breakdown:', {
            captionScreenshots: extractedData.caption.length > 0 ? 1 : 0,
            videoScreenshots: isVideoPost ? (videoDuration > 0 ? Math.max(3, Math.min(8, Math.ceil(videoDuration / 2))) : 1) : 0,
            contentScreenshots: !isVideoPost ? 1 : 0
        });

        return NextResponse.json({
            success: true,
            screenshots: screenshots,
            contentType: 'image/png',
            captionText: extractedData.caption,
            accountMentions: extractedData.accountMentions,
            locationTags: extractedData.locationTags,
            hashtags: extractedData.hashtags,
            allText: extractedData.allText.substring(0, 500) + '...',
            screenshotCount: screenshots.length,
            videoDuration: videoDuration
        });

    } catch (error: any) {
        console.error('Instagram screenshot error:', error);
        return NextResponse.json({ error: error.message || 'Failed to screenshot Instagram post.' }, { status: 500 });
    }
} 