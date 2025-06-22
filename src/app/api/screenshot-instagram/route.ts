import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Import chromium only for production environments
let chromium: any = null;
try {
    chromium = require('@sparticuz/chromium');
} catch (error) {
    console.log('@sparticuz/chromium not available, will use regular puppeteer');
}

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

        // Check if it's a valid Instagram post or reel URL
        const isValidInstagramUrl = url.includes('instagram.com/p/') || url.includes('instagram.com/reel/');
        if (!isValidInstagramUrl) {
            return NextResponse.json(
                { error: 'Invalid Instagram URL. Must be a post (instagram.com/p/) or reel (instagram.com/reel/)' },
                { status: 400 }
            );
        }

        console.log('Taking screenshot of Instagram content:', url);

        // FAST: URL-based carousel detection using index=X parameter
        console.log('Analyzing URL for carousel indicators...');
        const urlObj = new URL(url);

        // Check for various Instagram carousel parameters
        const hasIndexParam = urlObj.searchParams.has('index');
        const hasImgIndexParam = urlObj.searchParams.has('img_index');
        const hasCarouselParam = urlObj.searchParams.has('carousel');
        const hasSlideParam = urlObj.searchParams.has('slide');

        const indexValue = urlObj.searchParams.get('index');
        const imgIndexValue = urlObj.searchParams.get('img_index');
        const carouselValue = urlObj.searchParams.get('carousel');
        const slideValue = urlObj.searchParams.get('slide');

        console.log(`URL analysis - index: ${indexValue}, img_index: ${imgIndexValue}, carousel: ${carouselValue}, slide: ${slideValue}`);

        // If URL has any carousel parameter, it's definitely a carousel
        const isUrlCarousel = hasIndexParam || hasImgIndexParam || hasCarouselParam || hasSlideParam;
        let estimatedPanelCount = 1;

        if (isUrlCarousel) {
            // Try to estimate panel count from various parameter values
            // Instagram typically uses 0-based indexing, so img_index=1 means 2nd panel
            let maxIndex = 0;

            if (indexValue && !isNaN(parseInt(indexValue))) {
                maxIndex = Math.max(maxIndex, parseInt(indexValue));
            }
            if (imgIndexValue && !isNaN(parseInt(imgIndexValue))) {
                maxIndex = Math.max(maxIndex, parseInt(imgIndexValue));
            }
            if (carouselValue && !isNaN(parseInt(carouselValue))) {
                maxIndex = Math.max(maxIndex, parseInt(carouselValue));
            }
            if (slideValue && !isNaN(parseInt(slideValue))) {
                maxIndex = Math.max(maxIndex, parseInt(slideValue));
            }

            if (maxIndex > 0) {
                estimatedPanelCount = Math.max(maxIndex + 1, 2); // At least 2 panels if there's an index
                console.log(`Detected carousel from URL parameters, max index: ${maxIndex}, estimated ${estimatedPanelCount} panels`);
            } else {
                estimatedPanelCount = 2; // Default to 2 if carousel parameter is present but not numeric
                console.log('Detected carousel from URL carousel parameter, defaulting to 2 panels');
            }
        }

        // OPTIMIZED: Browser launch configuration for speed
        console.log('Launching browser with optimized configuration...');

        let browser;
        try {
            if (chromium) {
                // Production environment with @sparticuz/chromium
                console.log('Using @sparticuz/chromium for production environment');
                browser = await puppeteer.launch({
                    args: [
                        ...chromium.args,
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection',
                        '--disable-default-apps',
                        '--disable-extensions',
                        '--disable-plugins',
                        '--disable-images',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-software-rasterizer',
                        '--disable-background-networking',
                        '--disable-sync',
                        '--disable-translate',
                        '--hide-scrollbars',
                        '--mute-audio',
                        '--no-default-browser-check',
                        '--safebrowsing-disable-auto-update',
                        '--ignore-certificate-errors',
                        '--ignore-ssl-errors',
                        '--ignore-certificate-errors-spki-list',
                        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ],
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(),
                    headless: chromium.headless,
                    timeout: 20000, // REDUCED: Faster timeout
                });
                console.log('Browser launched successfully with @sparticuz/chromium');
            } else {
                // Local development environment with regular puppeteer
                console.log('Using regular puppeteer for local development');
                browser = await puppeteer.launch({
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection',
                        '--disable-default-apps',
                        '--disable-extensions',
                        '--disable-plugins',
                        '--disable-sync',
                        '--disable-translate',
                        '--hide-scrollbars',
                        '--mute-audio',
                        '--no-default-browser-check',
                        '--safebrowsing-disable-auto-update',
                        '--ignore-certificate-errors',
                        '--ignore-ssl-errors',
                        '--ignore-certificate-errors-spki-list',
                        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ],
                    defaultViewport: { width: 1200, height: 800 },
                    headless: true,
                    timeout: 20000, // REDUCED: Faster timeout
                });
                console.log('Browser launched successfully with regular puppeteer');
            }
        } catch (launchError) {
            console.error('Failed to launch browser:', launchError);

            // Try fallback with minimal configuration
            try {
                console.log('Trying fallback configuration...');
                browser = await puppeteer.launch({
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--no-first-run',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection',
                        '--disable-default-apps',
                        '--disable-extensions',
                        '--disable-plugins',
                        '--disable-sync',
                        '--disable-translate',
                        '--hide-scrollbars',
                        '--mute-audio',
                        '--no-default-browser-check',
                        '--safebrowsing-disable-auto-update',
                        '--ignore-certificate-errors',
                        '--ignore-ssl-errors',
                        '--ignore-certificate-errors-spki-list'
                    ],
                    defaultViewport: { width: 1200, height: 800 },
                    headless: true,
                    timeout: 20000, // REDUCED: Faster timeout
                });
                console.log('Browser launched successfully with fallback configuration');
            } catch (fallbackError) {
                console.error('Failed to launch browser with fallback configuration:', fallbackError);
                const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
                throw new Error(`Browser launch failed with all configurations: ${errorMessage}. This may be due to missing dependencies or permission issues.`);
            }
        }

        let page;
        try {
            page = await browser.newPage();
            console.log('Page created successfully');
        } catch (pageError) {
            console.error('Failed to create page:', pageError);
            await browser.close();
            const errorMessage = pageError instanceof Error ? pageError.message : 'Unknown error';
            throw new Error(`Page creation failed: ${errorMessage}`);
        }

        // OPTIMIZED: Set viewport and navigate with faster settings
        await page.setViewport({ width: 1200, height: 800 });

        // FAST: Navigate to Instagram post with optimized settings
        console.log('Navigating to Instagram post...');
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded', // FASTER: Use domcontentloaded instead of networkidle2
                timeout: 20000 // REDUCED: Faster timeout
            });
            console.log('Navigation successful');
        } catch (navigationError) {
            console.error('Navigation failed:', navigationError);
            await browser.close();
            const errorMessage = navigationError instanceof Error ? navigationError.message : 'Unknown error';
            throw new Error(`Failed to navigate to Instagram post: ${errorMessage}`);
        }

        // FAST: Minimal wait for page load
        console.log('Waiting for Instagram page to load...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // REDUCED: From 5000ms to 2000ms

        // FAST: Quick popup handling
        await new Promise(resolve => setTimeout(resolve, 1000)); // REDUCED: From 2000ms to 1000ms

        // Try to close popups quickly
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
                    await new Promise(resolve => setTimeout(resolve, 200)); // REDUCED: From 300ms to 200ms
                    break;
                }
            } catch (error) {
                // Continue to next selector
            }
        }

        // FAST: Minimal wait after popup handling
        await new Promise(resolve => setTimeout(resolve, 500)); // REDUCED: From 1000ms to 500ms

        // OPTIMIZED: Simplified carousel detection
        console.log('Detecting carousel/multi-panel post...');

        let carouselInfo;
        carouselInfo = await page.evaluate(() => {
            // Look for Instagram-specific carousel indicators (most reliable)
            const instagramIndicators = document.querySelectorAll('[data-testid="carousel-indicator"], [role="tab"]');
            const navigationButtons = document.querySelectorAll('[aria-label*="Next"], [aria-label*="next"], [aria-label*="Previous"], [aria-label*="previous"]');

            // Check for carousel navigation buttons
            const hasNavigationButtons = navigationButtons.length > 0;
            const hasInstagramCarousel = instagramIndicators.length > 1;

            // Only treat as carousel if there are actual navigation elements OR Instagram carousel indicators
            const isCarousel = hasInstagramCarousel || hasNavigationButtons;

            // Use Instagram carousel indicators count (most reliable)
            let panelCount = 1;
            if (instagramIndicators.length > 1) {
                panelCount = instagramIndicators.length;
            } else if (hasNavigationButtons) {
                // If we have navigation buttons but no indicators, estimate 2-4 panels
                panelCount = 3; // Conservative estimate
            }

            return {
                isCarousel,
                panelCount,
                hasInstagramCarousel,
                hasNavigation: navigationButtons.length > 0,
                instagramIndicatorCount: instagramIndicators.length
            };
        });

        console.log('Carousel detection result:', carouselInfo);

        // OPTIMIZED: Combine URL-based detection with DOM-based detection
        const finalCarouselInfo = {
            ...carouselInfo,
            isCarousel: isUrlCarousel || carouselInfo.isCarousel,
            panelCount: isUrlCarousel ? Math.max(estimatedPanelCount, carouselInfo.panelCount) : carouselInfo.panelCount,
            isUrlCarousel: isUrlCarousel,
            urlEstimatedPanels: estimatedPanelCount
        };

        console.log('Final carousel detection result:', finalCarouselInfo);

        // OPTIMIZATION: Limit the number of panels to prevent API size limits and improve performance
        const MAX_PANELS = 4; // REDUCED: From 8 to 4 panels max for speed
        const actualPanelCount = Math.min(finalCarouselInfo.panelCount, MAX_PANELS);

        if (finalCarouselInfo.panelCount > MAX_PANELS) {
            console.log(`Limiting carousel from ${finalCarouselInfo.panelCount} to ${MAX_PANELS} panels for speed`);
        }

        // FAST: Find post element
        console.log('Looking for post container...');
        const postSelectors = [
            'article',
            '[role="main"]',
            'main',
            '[data-testid="post-container"]'
        ];

        let postElement = null;
        for (const selector of postSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    console.log(`Found post with selector: ${selector}`);
                    postElement = element;
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
            return NextResponse.json({ error: 'Could not find Instagram content on page.' }, { status: 404 });
        }

        // FAST: Find video element
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
                const element = await page.$(selector);
                if (element) {
                    console.log(`Found video with selector: ${selector}`);
                    videoElement = element;
                    isVideoPost = true;
                    break;
                }
            } catch (error) {
                console.log(`Video selector ${selector} not found, trying next...`);
            }
        }

        // FAST: Get video duration if it's a video element
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

        // FAST: Streamlined text extraction
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

            // FAST: Simplified caption extraction
            const captionSelectors = [
                '[data-testid="post-caption"]',
                '[data-testid="caption"]',
                'div[class*="caption"]',
                'span[class*="caption"]',
                'p[class*="caption"]'
            ];

            for (const selector of captionSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 20) {
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
            hashtagCount: extractedData.hashtags.length,
            captionPreview: extractedData.caption.substring(0, 200) + '...'
        });

        // FAST: Take screenshots for all panels in carousel posts
        console.log('Taking optimized screenshots...');
        const screenshots: string[] = [];

        if (finalCarouselInfo.isCarousel) {
            console.log(`Processing carousel with ${actualPanelCount} panels...`);

            // Take screenshot of first panel
            try {
                console.log('Taking screenshot of first panel...');
                const firstPanelScreenshot = await postElement.screenshot({
                    type: 'png',
                    encoding: 'binary',
                });

                const base64 = Buffer.from(firstPanelScreenshot).toString('base64');
                screenshots.push(base64);
                console.log('First panel screenshot taken successfully');
            } catch (error) {
                console.error('Error taking first panel screenshot:', error);
            }

            // FAST: Navigate through remaining panels with simplified navigation
            for (let panelIndex = 1; panelIndex < actualPanelCount; panelIndex++) {
                try {
                    console.log(`Navigating to panel ${panelIndex + 1}/${actualPanelCount}...`);

                    // FAST: Try keyboard navigation first (most reliable)
                    let navigated = false;
                    try {
                        await page.keyboard.press('ArrowRight');
                        navigated = true;
                        console.log('Used keyboard navigation');
                    } catch (error) {
                        console.log('Keyboard navigation failed, trying click...');
                    }

                    // FAST: Fallback to click navigation
                    if (!navigated) {
                        try {
                            const nextButton = await page.$('[aria-label*="Next"], [aria-label*="next"]');
                            if (nextButton) {
                                await nextButton.click();
                                navigated = true;
                                console.log('Used click navigation');
                            }
                        } catch (error) {
                            console.log('Click navigation failed');
                        }
                    }

                    if (navigated) {
                        // FAST: Minimal wait for panel to load
                        await new Promise(resolve => setTimeout(resolve, 1000)); // REDUCED: From 2000ms to 1000ms

                        // Take screenshot of current panel
                        try {
                            const panelScreenshot = await postElement.screenshot({
                                type: 'png',
                                encoding: 'binary',
                            });

                            const base64 = Buffer.from(panelScreenshot).toString('base64');
                            screenshots.push(base64);
                            console.log(`Panel ${panelIndex + 1} screenshot taken successfully`);
                        } catch (error) {
                            console.error(`Error taking panel ${panelIndex + 1} screenshot:`, error);
                        }

                        // FAST: Limited video frame extraction for carousel panels
                        const panelHasVideo = await page.evaluate(() => {
                            const video = document.querySelector('video');
                            return !!video;
                        });

                        if (panelHasVideo) {
                            console.log(`Extracting limited video frames for panel ${panelIndex + 1}...`);

                            // Get video duration for this panel
                            const panelVideoDuration = await page.evaluate(() => {
                                const video = document.querySelector('video');
                                if (video && !isNaN(video.duration)) {
                                    return video.duration;
                                }
                                return 0;
                            });

                            if (panelVideoDuration > 0) {
                                // FAST: Extract only 3 frames for carousel videos (reduced from 15)
                                const frameCount = Math.min(3, Math.ceil(panelVideoDuration / 3)); // 1 frame per 3 seconds, max 3

                                try {
                                    const videoFrames = await page.evaluate(async (count, duration) => {
                                        const video = document.querySelector('video') as HTMLVideoElement;
                                        const canvas = document.createElement('canvas');
                                        const ctx = canvas.getContext('2d');

                                        if (!video || !ctx) return [];

                                        canvas.width = video.videoWidth || 640;
                                        canvas.height = video.videoHeight || 480;

                                        const frames: string[] = [];

                                        for (let i = 0; i < count; i++) {
                                            const timestamp = (i / count) * duration;
                                            video.currentTime = timestamp;

                                            await new Promise<void>((resolve) => {
                                                const onCanPlay = () => {
                                                    video.removeEventListener('canplay', onCanPlay);
                                                    resolve();
                                                };
                                                video.addEventListener('canplay', onCanPlay);

                                                setTimeout(() => {
                                                    video.removeEventListener('canplay', onCanPlay);
                                                    resolve();
                                                }, 300); // REDUCED: From 500ms to 300ms
                                            });

                                            await new Promise(resolve => setTimeout(resolve, 100)); // REDUCED: From 200ms to 100ms

                                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                            const frameDataUrl = canvas.toDataURL('image/png', 0.8);
                                            const frameData = frameDataUrl.split(',')[1];
                                            frames.push(frameData);
                                        }

                                        return frames;
                                    }, frameCount, panelVideoDuration);

                                    screenshots.push(...videoFrames);
                                    console.log(`Video frame extraction completed for panel ${panelIndex + 1}: ${videoFrames.length} frames`);

                                } catch (error) {
                                    console.error(`Video frame extraction failed for panel ${panelIndex + 1}:`, error);
                                }
                            }
                        }
                    } else {
                        console.log(`Failed to navigate to panel ${panelIndex + 1} - stopping carousel navigation`);
                        break;
                    }

                } catch (error) {
                    console.error(`Error processing panel ${panelIndex + 1}:`, error);
                    break;
                }
            }

        } else {
            // Single panel post - take screenshot
            try {
                console.log('Taking single panel screenshot...');
                const postScreenshot = await postElement.screenshot({
                    type: 'png',
                    encoding: 'binary',
                });

                const base64 = Buffer.from(postScreenshot).toString('base64');
                screenshots.push(base64);
                console.log('Single panel screenshot taken successfully');
            } catch (error) {
                console.error('Error taking single panel screenshot:', error);
            }

            // FAST: Limited video frame extraction for single video posts
            if (isVideoPost && videoDuration > 0) {
                console.log('Taking limited video frames for single video post...');
                const frameCount = Math.min(5, Math.ceil(videoDuration / 3)); // REDUCED: From 15 to 5 frames, 1 frame per 3 seconds

                try {
                    const videoFrames = await page.evaluate(async (count, duration) => {
                        const video = document.querySelector('video') as HTMLVideoElement;
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (!video || !ctx) return [];

                        canvas.width = video.videoWidth || 640;
                        canvas.height = video.videoHeight || 480;

                        const frames: string[] = [];

                        for (let i = 0; i < count; i++) {
                            const timestamp = (i / count) * duration;
                            video.currentTime = timestamp;

                            await new Promise<void>((resolve) => {
                                const onCanPlay = () => {
                                    video.removeEventListener('canplay', onCanPlay);
                                    resolve();
                                };
                                video.addEventListener('canplay', onCanPlay);

                                setTimeout(() => {
                                    video.removeEventListener('canplay', onCanPlay);
                                    resolve();
                                }, 300); // REDUCED: From 500ms to 300ms
                            });

                            await new Promise(resolve => setTimeout(resolve, 100)); // REDUCED: From 200ms to 100ms

                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const frameDataUrl = canvas.toDataURL('image/png', 0.8);
                            const frameData = frameDataUrl.split(',')[1];
                            frames.push(frameData);
                        }

                        return frames;
                    }, frameCount, videoDuration);

                    screenshots.push(...videoFrames);
                    console.log(`Video frame extraction completed: ${videoFrames.length} frames`);

                } catch (error) {
                    console.error('Video frame extraction failed:', error);
                }
            }
        }

        await browser.close();

        console.log('Screenshots taken successfully:', screenshots.length);
        console.log('Screenshot breakdown:', {
            comprehensiveScreenshots: finalCarouselInfo.isCarousel ? actualPanelCount : 1,
            videoScreenshots: screenshots.length - (finalCarouselInfo.isCarousel ? actualPanelCount : 1),
            isCarousel: finalCarouselInfo.isCarousel,
            panelCount: actualPanelCount,
            originalPanelCount: finalCarouselInfo.panelCount
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
            videoDuration: videoDuration,
            isCarousel: finalCarouselInfo.isCarousel,
            panelCount: actualPanelCount,
            originalPanelCount: finalCarouselInfo.panelCount
        });

    } catch (error: any) {
        console.error('Instagram screenshot error:', error);
        return NextResponse.json({ error: error.message || 'Failed to screenshot Instagram content.' }, { status: 500 });
    }
} 