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

        // ENHANCED: URL-based carousel detection using index=X parameter
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

        // HYBRID: Browser launch configuration for both production and local development
        console.log('Launching browser with hybrid configuration...');

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
                    timeout: 30000,
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
                    timeout: 30000,
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
                    timeout: 30000,
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

        // ENHANCED: Set viewport to desktop dimensions to capture more content including captions
        await page.setViewport({ width: 1200, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // ENHANCED: Navigate to the Instagram post with retry logic for production
        console.log('Navigating to Instagram post with retry logic...');
        let navigationSuccess = false;
        let navigationRetryCount = 0;
        const maxNavigationRetries = 3;

        while (!navigationSuccess && navigationRetryCount < maxNavigationRetries) {
            try {
                console.log(`Navigation attempt ${navigationRetryCount + 1}/${maxNavigationRetries}...`);

                // Set a longer timeout for production environments
                const navigationTimeout = chromium ? 45000 : 30000;

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: navigationTimeout
                });

                navigationSuccess = true;
                console.log('Navigation successful');
            } catch (navigationError) {
                navigationRetryCount++;
                console.error(`Navigation attempt ${navigationRetryCount} failed:`, navigationError);

                if (navigationRetryCount >= maxNavigationRetries) {
                    await browser.close();
                    const errorMessage = navigationError instanceof Error ? navigationError.message : 'Unknown error';
                    throw new Error(`Failed to navigate to Instagram post after ${maxNavigationRetries} attempts: ${errorMessage}`);
                }

                // Wait before retrying
                console.log(`Waiting 2 seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Try to create a new page if the current one was detached
                try {
                    await page.close();
                } catch (closeError) {
                    console.log('Could not close page, continuing...');
                }

                try {
                    page = await browser.newPage();
                    await page.setViewport({ width: 1200, height: 800 });
                    console.log('Created new page for retry');
                } catch (newPageError) {
                    console.error('Failed to create new page for retry:', newPageError);
                    await browser.close();
                    throw new Error(`Failed to create new page for retry: ${newPageError instanceof Error ? newPageError.message : 'Unknown error'}`);
                }
            }
        }

        // ENHANCED: Wait longer for Instagram to fully load, especially for carousels
        console.log('Waiting for Instagram page to fully load...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time for carousel loading

        // OPTIMIZED: Reduced wait time for popups
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to close popups more efficiently
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
                    await new Promise(resolve => setTimeout(resolve, 300));
                    break; // OPTIMIZED: Exit after first successful popup close
                }
            } catch (error) {
                // Continue to next selector
            }
        }

        // OPTIMIZED: Reduced wait time
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ENHANCED: Better carousel detection with URL-based detection as primary method
        console.log('Detecting carousel/multi-panel post...');

        // If URL indicates carousel, be more aggressive in detection
        let carouselInfo;
        let retryCount = 0;
        const maxRetries = 3;

        do {
            carouselInfo = await page.evaluate(() => {
                // Look for carousel indicators with more comprehensive selectors
                const indicators = document.querySelectorAll('[data-testid="carousel-indicator"], [data-testid="carousel-dot"]');
                const dots = document.querySelectorAll('[role="tab"], [aria-label*="carousel"], [data-testid*="carousel"]');
                const navigationButtons = document.querySelectorAll('[aria-label*="Next"], [aria-label*="next"], [aria-label*="Previous"], [aria-label*="previous"], button[aria-label*="Next"], button[aria-label*="Previous"]');

                // Look for carousel container elements
                const carouselContainers = document.querySelectorAll('[data-testid*="carousel"], [class*="carousel"], [role="region"]');

                // ENHANCED: More comprehensive media detection selectors
                const images = document.querySelectorAll('img[src*="instagram"], img[alt*="Photo"], img[data-testid*="image"], img[src*="cdninstagram"], img[src*="scontent"], img[src*="scontent.cdninstagram"], img[data-testid="post-media"], img[role="img"]');
                const videos = document.querySelectorAll('video, [data-testid="video-player"], video[src*="instagram"], video[src*="cdninstagram"], video[data-testid*="video"]');

                // Also look for media containers that might contain the actual media
                const mediaContainers = document.querySelectorAll('[data-testid*="media"], [class*="media"], [data-testid="post-media"], [data-testid="carousel-container"]');

                // Enhanced detection logic - look for actual carousel navigation elements
                const hasCarouselElements = indicators.length > 1 || dots.length > 1 || navigationButtons.length > 0 || carouselContainers.length > 0;

                // Check if there are multiple visible media items (not just hidden ones)
                let visibleMediaCount = 0;
                const allMedia = [...images, ...videos];

                for (const media of allMedia) {
                    const rect = media.getBoundingClientRect();
                    if (rect.width > 100 && rect.height > 100 &&
                        rect.x >= 0 && rect.y >= 0 &&
                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                        visibleMediaCount++;
                    }
                }

                // Look for Instagram-specific carousel indicators
                const instagramIndicators = document.querySelectorAll('[data-testid="carousel-indicator"], [role="tab"]');
                const hasInstagramCarousel = instagramIndicators.length > 1;

                // Check for carousel navigation buttons
                const hasNavigationButtons = navigationButtons.length > 0;

                // Only treat as carousel if there are actual navigation elements OR Instagram carousel indicators
                const isCarousel = hasCarouselElements || hasInstagramCarousel || hasNavigationButtons;

                // ENHANCED: Better panel count detection with multiple strategies
                let panelCount = 1;

                // Strategy 1: Use Instagram carousel indicators (most reliable)
                if (instagramIndicators.length > 1) {
                    panelCount = instagramIndicators.length;
                    console.log(`Using Instagram indicators count: ${panelCount}`);
                }
                // Strategy 2: Use other carousel indicators
                else if (indicators.length > 1) {
                    panelCount = indicators.length;
                    console.log(`Using general indicators count: ${panelCount}`);
                }
                // Strategy 3: Use dots/tabs
                else if (dots.length > 1) {
                    panelCount = dots.length;
                    console.log(`Using dots count: ${panelCount}`);
                }
                // Strategy 4: If we have navigation buttons, estimate from total media count
                else if (hasNavigationButtons && (images.length + videos.length) > 1) {
                    // Instagram often has many hidden media elements, so use total count
                    panelCount = Math.min(images.length + videos.length, 15); // Cap at 15 to be safe
                    console.log(`Using total media count with navigation: ${panelCount} (from ${images.length + videos.length} total media)`);
                }
                // Strategy 5: Use visible media count if multiple visible
                else if (visibleMediaCount > 1) {
                    panelCount = visibleMediaCount;
                    console.log(`Using visible media count: ${panelCount}`);
                }
                // Strategy 6: If total media count is high, it's likely a carousel
                else if (images.length + videos.length > 3) {
                    panelCount = Math.min(images.length + videos.length, 10);
                    console.log(`Using high total media count: ${panelCount} (from ${images.length + videos.length} total media)`);
                }

                return {
                    isCarousel,
                    panelCount,
                    hasIndicators: indicators.length > 0,
                    hasDots: dots.length > 0,
                    hasNavigation: navigationButtons.length > 0,
                    hasCarouselContainers: carouselContainers.length > 0,
                    hasInstagramCarousel: hasInstagramCarousel,
                    imageCount: images.length,
                    videoCount: videos.length,
                    totalMediaCount: images.length + videos.length,
                    visibleMediaCount: visibleMediaCount,
                    hasCarouselElements: hasCarouselElements,
                    instagramIndicatorCount: instagramIndicators.length,
                    mediaContainerCount: mediaContainers.length
                };
            });

            console.log(`Carousel detection attempt ${retryCount + 1}:`, carouselInfo);

            // If URL indicates carousel but DOM doesn't find media, wait and retry
            if (isUrlCarousel && carouselInfo.totalMediaCount === 0 && retryCount < maxRetries - 1) {
                console.log('URL indicates carousel but no media found, waiting and retrying...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                retryCount++;
            } else {
                break;
            }
        } while (retryCount < maxRetries);

        // ENHANCED: Combine URL-based detection with DOM-based detection
        const finalCarouselInfo = {
            ...carouselInfo,
            isCarousel: isUrlCarousel || carouselInfo.isCarousel,
            panelCount: isUrlCarousel ? Math.max(estimatedPanelCount, carouselInfo.panelCount) : carouselInfo.panelCount,
            isUrlCarousel: isUrlCarousel,
            urlEstimatedPanels: estimatedPanelCount
        };

        console.log('Final carousel detection result:', finalCarouselInfo);

        // OPTIMIZATION: Limit the number of panels to prevent API size limits and improve performance
        const MAX_PANELS = 8; // Limit to 8 panels max to prevent API size issues
        const actualPanelCount = Math.min(finalCarouselInfo.panelCount, MAX_PANELS);

        if (finalCarouselInfo.panelCount > MAX_PANELS) {
            console.log(`Limiting carousel from ${finalCarouselInfo.panelCount} to ${MAX_PANELS} panels for performance and API size limits`);
        }

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
                await page.waitForSelector(selector, { timeout: 3000 }); // OPTIMIZED: Reduced timeout
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
                await page.waitForSelector(selector, { timeout: 3000 }); // OPTIMIZED: Reduced timeout
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
            return NextResponse.json({ error: 'Could not find Instagram content on page.' }, { status: 404 });
        }

        // ENHANCED: Find the specific media area to crop to just the post content
        console.log('Finding specific post media area for cropping...');
        const mediaAreaInfo = await page.evaluate(() => {
            // Look for the actual post media container with better filtering
            const mediaSelectors = [
                '[data-testid="post-media"]',
                '[data-testid="media-container"]',
                '[data-testid="carousel-container"]',
                '[data-testid*="media"]',
                '[class*="media"]',
                '[class*="post"]',
                'article img',
                'article video',
                '[role="main"] img',
                '[role="main"] video'
            ];

            let mediaElement = null;
            let mediaSelector = '';

            // First try specific media containers
            for (const selector of mediaSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const rect = element.getBoundingClientRect();
                    // Filter out tiny elements and ensure it's visible on screen
                    if (rect.width > 200 && rect.height > 200 &&
                        rect.x >= 0 && rect.y >= 0 &&
                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                        mediaElement = element;
                        mediaSelector = selector;
                        console.log(`Found media element with selector: ${selector}, size: ${rect.width}x${rect.height}, position: ${rect.x},${rect.y}`);
                        break;
                    }
                }
                if (mediaElement) break;
            }

            // If no media container found, look for the largest visible image or video
            if (!mediaElement) {
                const images = document.querySelectorAll('img[src*="instagram"], img[alt*="Photo"], img[data-testid*="image"], img[src*="cdninstagram"], img[src*="scontent"], img[src*="scontent.cdninstagram"], img[data-testid="post-media"], img[role="img"]');
                const videos = document.querySelectorAll('video, [data-testid="video-player"], video[src*="instagram"], video[src*="cdninstagram"], video[data-testid*="video"]');

                let largestElement = null;
                let largestArea = 0;

                // Find the largest visible image
                for (const img of images) {
                    const rect = img.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    // Check if element is visible and on screen
                    if (area > largestArea && rect.width > 200 && rect.height > 200 &&
                        rect.x >= 0 && rect.y >= 0 &&
                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                        largestElement = img;
                        largestArea = area;
                        mediaSelector = 'img[src*="instagram"]';
                    }
                }

                // Check if any visible video is larger
                for (const video of videos) {
                    const rect = video.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    if (area > largestArea && rect.width > 200 && rect.height > 200 &&
                        rect.x >= 0 && rect.y >= 0 &&
                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                        largestElement = video;
                        largestArea = area;
                        mediaSelector = 'video';
                    }
                }

                if (largestElement) {
                    mediaElement = largestElement;
                    const rect = largestElement.getBoundingClientRect();
                    console.log(`Found largest visible media element: ${mediaSelector}, size: ${rect.width}x${rect.height}, position: ${rect.x},${rect.y}`);
                }
            }

            // If still no media element, look for article or main content area
            if (!mediaElement) {
                const contentSelectors = [
                    'article',
                    '[role="main"]',
                    'main',
                    '[data-testid="post-container"]'
                ];

                for (const selector of contentSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        if (rect.width > 300 && rect.height > 300 &&
                            rect.x >= 0 && rect.y >= 0 &&
                            rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                            mediaElement = element;
                            mediaSelector = selector;
                            console.log(`Using visible content area as media element: ${selector}, size: ${rect.width}x${rect.height}, position: ${rect.x},${rect.y}`);
                            break;
                        }
                    }
                }
            }

            if (mediaElement) {
                const rect = mediaElement.getBoundingClientRect();
                // Ensure coordinates are within viewport bounds
                const x = Math.max(0, Math.min(rect.x, window.innerWidth - rect.width));
                const y = Math.max(0, Math.min(rect.y, window.innerHeight - rect.height));
                const width = Math.min(rect.width, window.innerWidth - x);
                const height = Math.min(rect.height, window.innerHeight - y);

                return {
                    found: true,
                    selector: mediaSelector,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    elementTag: mediaElement.tagName,
                    area: width * height,
                    originalX: rect.x,
                    originalY: rect.y,
                    originalWidth: rect.width,
                    originalHeight: rect.height
                };
            }

            return { found: false };
        });

        console.log('Media area info:', mediaAreaInfo);

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

        // OPTIMIZED: Streamlined text extraction
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

            // ENHANCED: Better caption extraction with more comprehensive selectors
            const captionSelectors = [
                '[data-testid="post-caption"]',
                '[data-testid="caption"]',
                'div[class*="caption"]',
                'div[class*="Caption"]',
                'span[class*="caption"]',
                'p[class*="caption"]',
                'div[class*="text"]',
                'span[class*="text"]',
                'p[class*="text"]',
                '[role="article"] div',
                'article div',
                '[data-testid*="post"] div'
            ];

            for (const selector of captionSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 20 && !result.caption.includes(text)) {
                        // Check if this looks like a caption (contains food items, emojis, etc.)
                        const hasFoodKeywords = /\b(food|dish|meal|restaurant|dinner|lunch|breakfast|cocktail|drink|dessert|appetizer|entree|main|course)\b/i.test(text);
                        const hasEmojis = /[🍽️🍕🍔🍜🍣🍱🍰🍸🍷🍺🎂🔖🌟]/g.test(text);
                        const hasAccountMention = /@[a-zA-Z0-9._]+/.test(text);
                        const hasLocation = /📍|location|address|street/i.test(text);

                        if (hasFoodKeywords || hasEmojis || hasAccountMention || hasLocation || text.length > 100) {
                            result.caption = text;
                            break;
                        }
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

        // ENHANCED: Take screenshots for all panels in carousel posts
        console.log('Taking enhanced screenshots...');
        const screenshots: string[] = [];

        if (finalCarouselInfo.isCarousel) {
            console.log(`Processing carousel with ${actualPanelCount} panels (limited from ${finalCarouselInfo.panelCount})...`);

            // Take screenshot of first panel
            try {
                console.log('Taking screenshot of first panel...');
                let firstPanelScreenshot;

                if (mediaAreaInfo.found) {
                    // Crop to the specific media area
                    console.log(`Cropping to media area: ${mediaAreaInfo.selector}`);
                    firstPanelScreenshot = await page.screenshot({
                        type: 'png',
                        encoding: 'binary',
                        clip: {
                            x: Math.round(mediaAreaInfo.x || 0),
                            y: Math.round(mediaAreaInfo.y || 0),
                            width: Math.round(mediaAreaInfo.width || 800),
                            height: Math.round(mediaAreaInfo.height || 600)
                        }
                    });
                } else {
                    // Fallback to full post element
                    console.log('Using fallback full post screenshot');
                    firstPanelScreenshot = await screenshotElement.screenshot({
                        type: 'png',
                        encoding: 'binary',
                    });
                }

                const base64 = Buffer.from(firstPanelScreenshot).toString('base64');
                screenshots.push(base64);
                console.log('First panel screenshot taken successfully');
            } catch (error) {
                console.error('Error taking first panel screenshot:', error);
            }

            // Navigate through remaining panels (limited to MAX_PANELS)
            for (let panelIndex = 1; panelIndex < actualPanelCount; panelIndex++) {
                try {
                    console.log(`Navigating to panel ${panelIndex + 1}/${actualPanelCount}...`);

                    // Try different navigation methods with enhanced selectors
                    let navigated = false;

                    // Method 1: Click next button with more comprehensive selectors
                    try {
                        const nextButtonSelectors = [
                            '[aria-label*="Next"]',
                            '[aria-label*="next"]',
                            'button[aria-label*="Next"]',
                            'button[aria-label*="next"]',
                            '[data-testid*="next"]',
                            '[data-testid*="Next"]',
                            'button[data-testid*="next"]',
                            'button[data-testid*="Next"]',
                            '[role="button"][aria-label*="Next"]',
                            '[role="button"][aria-label*="next"]'
                        ];

                        for (const selector of nextButtonSelectors) {
                            try {
                                const nextButton = await page.$(selector);
                                if (nextButton) {
                                    console.log(`Found next button with selector: ${selector}`);
                                    await nextButton.click();
                                    navigated = true;
                                    console.log('Used next button navigation');
                                    break;
                                }
                            } catch (error) {
                                console.log(`Next button selector ${selector} failed, trying next...`);
                            }
                        }
                    } catch (error) {
                        console.log('Next button navigation failed, trying alternative...');
                    }

                    // Method 2: Click on carousel indicator/dot with enhanced selectors
                    if (!navigated) {
                        try {
                            const indicatorSelectors = [
                                '[data-testid="carousel-indicator"]',
                                '[data-testid="carousel-dot"]',
                                '[role="tab"]',
                                '[aria-label*="carousel"]',
                                '[data-testid*="carousel"]',
                                'button[data-testid*="carousel"]',
                                '[class*="carousel"]'
                            ];

                            for (const selector of indicatorSelectors) {
                                try {
                                    const indicators = await page.$$(selector);
                                    if (indicators[panelIndex]) {
                                        console.log(`Found indicator with selector: ${selector} at index ${panelIndex}`);
                                        await indicators[panelIndex].click();
                                        navigated = true;
                                        console.log('Used indicator navigation');
                                        break;
                                    }
                                } catch (error) {
                                    console.log(`Indicator selector ${selector} failed, trying next...`);
                                }
                            }
                        } catch (error) {
                            console.log('Indicator navigation failed, trying alternative...');
                        }
                    }

                    // Method 3: Use arrow key navigation
                    if (!navigated) {
                        try {
                            console.log('Trying keyboard navigation...');
                            await page.keyboard.press('ArrowRight');
                            navigated = true;
                            console.log('Used keyboard navigation');
                        } catch (error) {
                            console.log('Keyboard navigation failed');
                        }
                    }

                    // Method 4: Try clicking on the right side of the media area
                    if (!navigated) {
                        try {
                            console.log('Trying click-based navigation on media area...');
                            const mediaArea = await page.$('article, [data-testid*="post"], [role="main"]');
                            if (mediaArea) {
                                const box = await mediaArea.boundingBox();
                                if (box) {
                                    // Click on the right side of the media area
                                    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5);
                                    navigated = true;
                                    console.log('Used click-based navigation on media area');
                                }
                            }
                        } catch (error) {
                            console.log('Click-based navigation failed');
                        }
                    }

                    if (navigated) {
                        // Wait for panel to load with longer timeout
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Update media area info for the new panel
                        const updatedMediaAreaInfo = await page.evaluate(() => {
                            // Look for the actual post media container with better filtering
                            const mediaSelectors = [
                                '[data-testid="post-media"]',
                                '[data-testid="media-container"]',
                                '[data-testid="carousel-container"]',
                                '[data-testid*="media"]',
                                '[class*="media"]',
                                '[class*="post"]'
                            ];

                            let mediaElement = null;
                            let mediaSelector = '';

                            // First try specific media containers
                            for (const selector of mediaSelectors) {
                                const elements = document.querySelectorAll(selector);
                                for (const element of elements) {
                                    const rect = element.getBoundingClientRect();
                                    // Filter out tiny elements and ensure it's visible on screen
                                    if (rect.width > 200 && rect.height > 200 &&
                                        rect.x >= 0 && rect.y >= 0 &&
                                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                                        mediaElement = element;
                                        mediaSelector = selector;
                                        console.log(`Found media element with selector: ${selector}, size: ${rect.width}x${rect.height}, position: ${rect.x},${rect.y}`);
                                        break;
                                    }
                                }
                                if (mediaElement) break;
                            }

                            // If no media container found, look for the largest visible image or video
                            if (!mediaElement) {
                                const images = document.querySelectorAll('img[src*="instagram"], img[alt*="Photo"], img[data-testid*="image"]');
                                const videos = document.querySelectorAll('video, [data-testid="video-player"]');

                                let largestElement = null;
                                let largestArea = 0;

                                // Find the largest visible image
                                for (const img of images) {
                                    const rect = img.getBoundingClientRect();
                                    const area = rect.width * rect.height;
                                    // Check if element is visible and on screen
                                    if (area > largestArea && rect.width > 200 && rect.height > 200 &&
                                        rect.x >= 0 && rect.y >= 0 &&
                                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                                        largestElement = img;
                                        largestArea = area;
                                        mediaSelector = 'img[src*="instagram"]';
                                    }
                                }

                                // Check if any visible video is larger
                                for (const video of videos) {
                                    const rect = video.getBoundingClientRect();
                                    const area = rect.width * rect.height;
                                    if (area > largestArea && rect.width > 200 && rect.height > 200 &&
                                        rect.x >= 0 && rect.y >= 0 &&
                                        rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                                        largestElement = video;
                                        largestArea = area;
                                        mediaSelector = 'video';
                                    }
                                }

                                if (largestElement) {
                                    mediaElement = largestElement;
                                    const rect = largestElement.getBoundingClientRect();
                                    console.log(`Found largest visible media element: ${mediaSelector}, size: ${rect.width}x${rect.height}, position: ${rect.x},${rect.y}`);
                                }
                            }

                            // If still no media element, look for article or main content area
                            if (!mediaElement) {
                                const contentSelectors = [
                                    'article',
                                    '[role="main"]',
                                    'main',
                                    '[data-testid="post-container"]'
                                ];

                                for (const selector of contentSelectors) {
                                    const element = document.querySelector(selector);
                                    if (element) {
                                        const rect = element.getBoundingClientRect();
                                        if (rect.width > 300 && rect.height > 300 &&
                                            rect.x >= 0 && rect.y >= 0 &&
                                            rect.right <= window.innerWidth && rect.bottom <= window.innerHeight) {
                                            mediaElement = element;
                                            mediaSelector = selector;
                                            console.log(`Using visible content area as media element: ${selector}, size: ${rect.width}x${rect.height}, position: ${rect.x},${rect.y}`);
                                            break;
                                        }
                                    }
                                }
                            }

                            if (mediaElement) {
                                const rect = mediaElement.getBoundingClientRect();
                                // Ensure coordinates are within viewport bounds
                                const x = Math.max(0, Math.min(rect.x, window.innerWidth - rect.width));
                                const y = Math.max(0, Math.min(rect.y, window.innerHeight - rect.height));
                                const width = Math.min(rect.width, window.innerWidth - x);
                                const height = Math.min(rect.height, window.innerHeight - y);

                                return {
                                    found: true,
                                    selector: mediaSelector,
                                    x: x,
                                    y: y,
                                    width: width,
                                    height: height,
                                    elementTag: mediaElement.tagName,
                                    area: width * height,
                                    originalX: rect.x,
                                    originalY: rect.y,
                                    originalWidth: rect.width,
                                    originalHeight: rect.height
                                };
                            }

                            return { found: false };
                        });

                        console.log(`Panel ${panelIndex + 1} media area info:`, updatedMediaAreaInfo);

                        // Verify navigation worked by checking if content changed
                        const currentPanelInfo = await page.evaluate(() => {
                            const images = document.querySelectorAll('img[src*="instagram"], img[alt*="Photo"], img[data-testid*="image"]');
                            const videos = document.querySelectorAll('video, [data-testid="video-player"]');
                            return {
                                imageCount: images.length,
                                videoCount: videos.length,
                                totalMediaCount: images.length + videos.length
                            };
                        });

                        console.log(`Panel ${panelIndex + 1} media info:`, currentPanelInfo);

                        // Check if this panel has a video
                        const panelHasVideo = await page.evaluate(() => {
                            const video = document.querySelector('video');
                            return !!video;
                        });

                        console.log(`Panel ${panelIndex + 1} has video: ${panelHasVideo}`);

                        // Take screenshot of current panel with cropping
                        let panelScreenshot;
                        if (updatedMediaAreaInfo.found) {
                            console.log(`Taking cropped screenshot for panel ${panelIndex + 1}...`);
                            panelScreenshot = await page.screenshot({
                                type: 'png',
                                encoding: 'binary',
                                clip: {
                                    x: Math.round(updatedMediaAreaInfo.x || 0),
                                    y: Math.round(updatedMediaAreaInfo.y || 0),
                                    width: Math.round(updatedMediaAreaInfo.width || 800),
                                    height: Math.round(updatedMediaAreaInfo.height || 600)
                                }
                            });
                        } else {
                            console.log(`Taking fallback screenshot for panel ${panelIndex + 1}...`);
                            panelScreenshot = await screenshotElement.screenshot({
                                type: 'png',
                                encoding: 'binary',
                            });
                        }

                        const base64 = Buffer.from(panelScreenshot).toString('base64');
                        screenshots.push(base64);
                        console.log(`Panel ${panelIndex + 1} screenshot taken successfully`);

                        // If this panel has a video, extract video frames
                        if (panelHasVideo) {
                            console.log(`Extracting video frames for panel ${panelIndex + 1}...`);

                            // Get video duration for this panel
                            const panelVideoDuration = await page.evaluate(() => {
                                const video = document.querySelector('video');
                                if (video && !isNaN(video.duration)) {
                                    return video.duration;
                                }
                                return 0;
                            });

                            if (panelVideoDuration > 0) {
                                // Extract up to 15 frames for this video panel
                                const frameCount = Math.min(15, Math.ceil(panelVideoDuration / 2)); // 1 frame per 2 seconds, max 15

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
                                            console.log(`Extracting frame ${i + 1}/${count} at ${timestamp.toFixed(1)}s`);

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
                                                }, 500);
                                            });

                                            await new Promise(resolve => setTimeout(resolve, 200));

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
                        break; // Stop trying to navigate if we can't find a way
                    }

                } catch (error) {
                    console.error(`Error processing panel ${panelIndex + 1}:`, error);
                    break; // Stop on error to avoid infinite loops
                }
            }

        } else {
            // Single panel post - take comprehensive screenshot with cropping
            try {
                console.log('Taking comprehensive post screenshot...');
                let postScreenshot;

                if (mediaAreaInfo.found) {
                    // Crop to the specific media area
                    console.log(`Cropping to media area: ${mediaAreaInfo.selector}`);
                    postScreenshot = await page.screenshot({
                        type: 'png',
                        encoding: 'binary',
                        clip: {
                            x: Math.round(mediaAreaInfo.x || 0),
                            y: Math.round(mediaAreaInfo.y || 0),
                            width: Math.round(mediaAreaInfo.width || 800),
                            height: Math.round(mediaAreaInfo.height || 600)
                        }
                    });
                } else {
                    // Fallback to full post element
                    console.log('Using fallback full post screenshot');
                    postScreenshot = await screenshotElement.screenshot({
                        type: 'png',
                        encoding: 'binary',
                    });
                }

                const base64 = Buffer.from(postScreenshot).toString('base64');
                screenshots.push(base64);
                console.log('Comprehensive screenshot taken successfully');
            } catch (error) {
                console.error('Error taking comprehensive screenshot:', error);
            }

            // For single video posts, extract up to 15 frames
            if (isVideoPost && videoDuration > 0) {
                console.log('Taking additional video frames for single video post...');
                const frameCount = Math.min(15, Math.ceil(videoDuration / 2)); // 1 frame per 2 seconds, max 15

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
                            console.log(`Extracting frame ${i + 1}/${count} at ${timestamp.toFixed(1)}s`);

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
                                }, 500);
                            });

                            await new Promise(resolve => setTimeout(resolve, 200));

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

                    // FALLBACK: Take screenshots at different times using page-level operations
                    console.log('Using fallback method for video frame extraction...');
                    const fallbackFrames = [];

                    for (let i = 0; i < frameCount; i++) {
                        try {
                            const timestamp = (i / frameCount) * videoDuration;
                            console.log(`Fallback: Seeking to ${timestamp.toFixed(1)}s for frame ${i + 1}`);

                            await page.evaluate((time) => {
                                const video = document.querySelector('video') as HTMLVideoElement;
                                if (video) {
                                    video.currentTime = time;
                                }
                            }, timestamp);

                            await page.waitForFunction(
                                (time) => {
                                    const video = document.querySelector('video') as HTMLVideoElement;
                                    return video && Math.abs(video.currentTime - time) < 0.5;
                                },
                                { timeout: 5000 },
                                timestamp
                            );

                            await new Promise(resolve => setTimeout(resolve, 500));

                            if (videoElement && videoElement.asElement()) {
                                const videoScreenshot = await videoElement.asElement()!.screenshot({
                                    type: 'png',
                                    encoding: 'binary',
                                });
                                const base64 = Buffer.from(videoScreenshot).toString('base64');
                                fallbackFrames.push(base64);
                                console.log(`Fallback frame ${i + 1} captured at ${timestamp.toFixed(1)}s`);
                            }
                        } catch (frameError) {
                            console.error(`Error taking fallback video frame ${i + 1}:`, frameError);
                        }
                    }

                    screenshots.push(...fallbackFrames);
                    console.log(`Fallback video frame extraction completed: ${fallbackFrames.length} frames`);
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