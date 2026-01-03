/**
 * AttentionGuard - YouTube Platform Script
 * Detects recommended vs subscribed content
 *
 * Strategy:
 * 1. Load subscriptions from sidebar + YouTube's internal data
 * 2. Persist to chrome.storage for reliability
 * 3. Match video channel handles against subscription list
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'youtube';
  const COLOR = '#FF0000';
  const STORAGE_KEY = 'youtube_subscriptions';

  const session = AG.createSession();
  session.subscriptions = new Set();
  session.subscriptionsLoaded = false;
  const state = AG.createState();

  const SELECTORS = {
    // Multiple selectors for subscription links in sidebar
    subscriptionLinks: [
      'ytd-guide-section-renderer a[href*="/@"]',
      'ytd-mini-guide-entry-renderer a[href*="/@"]',
      'ytd-guide-entry-renderer a[href*="/@"]',
      '#items ytd-guide-entry-renderer a[href*="/@"]',
      'ytd-guide-collapsible-section-entry-renderer a[href*="/@"]'
    ].join(', '),
    // Video renderers
    homeVideos: 'ytd-rich-item-renderer',
    watchSidebar: 'ytd-compact-video-renderer',
    searchResults: 'ytd-video-renderer',
    shortsItems: 'ytd-reel-item-renderer',
    // Multiple selectors for channel info inside video cards
    channelLinks: [
      '#channel-name a[href*="/@"]',
      '#text a[href*="/@"]',
      'ytd-channel-name a[href*="/@"]',
      '.ytd-channel-name a[href*="/@"]',
      '#metadata a[href*="/@"]',
      '#byline-container a[href*="/@"]',
      'a.yt-simple-endpoint[href*="/@"]'
    ]
  };

  function getPageType() {
    const url = window.location.href;
    if (url.includes('/watch')) return 'watch';
    if (url.includes('/results')) return 'search';
    if (url.includes('/shorts')) return 'shorts';
    if (url.includes('/feed/subscriptions')) return 'subscriptions';
    return 'home';
  }

  /**
   * Extract handle from a YouTube URL
   */
  function extractHandle(url) {
    if (!url) return null;
    const match = url.match(/\/@([^\/\?]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Expand sidebar to load full subscription list
   */
  async function expandSidebar() {
    // Check if sidebar is already expanded
    const guideRenderer = document.querySelector('ytd-guide-renderer');
    if (guideRenderer) return true;

    // Click hamburger menu to expand
    const hamburger = document.querySelector('#guide-button button, #guide-icon');
    if (hamburger) {
      hamburger.click();
      // Wait for guide to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click "Show more" in subscriptions section to reveal all
      const showMore = document.querySelector('ytd-guide-collapsible-entry-renderer #expander-item');
      if (showMore) {
        showMore.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Close sidebar again (click hamburger)
      hamburger.click();
      return true;
    }
    return false;
  }

  /**
   * Load subscriptions from multiple sources
   */
  async function loadSubscriptions() {
    let newCount = 0;
    const prevSize = session.subscriptions.size;

    // 1. Try to load from chrome.storage first (cached)
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      if (stored[STORAGE_KEY] && Array.isArray(stored[STORAGE_KEY])) {
        stored[STORAGE_KEY].forEach(handle => {
          if (!session.subscriptions.has(handle)) {
            session.subscriptions.add(handle);
          }
        });
        if (session.subscriptions.size > 0 && !session.subscriptionsLoaded) {
          AG.log('YouTube', COLOR, 'Loaded', session.subscriptions.size, 'cached subscriptions');
          session.subscriptionsLoaded = true;
        }
      }
    } catch (e) {
      // Storage not available
    }

    // 2. Expand sidebar if needed to get subscriptions
    if (session.subscriptions.size === 0) {
      await expandSidebar();
    }

    // 3. Scrape from sidebar (works after expansion)
    const guideRenderer = document.querySelector('ytd-guide-renderer');
    if (guideRenderer) {
      guideRenderer.querySelectorAll('a[href*="/@"]').forEach(link => {
        const handle = extractHandle(link.href);
        if (handle && !session.subscriptions.has(handle)) {
          session.subscriptions.add(handle);
          newCount++;
        }
      });
    }

    // 4. Also try the general selector
    const links = document.querySelectorAll(SELECTORS.subscriptionLinks);
    links.forEach(link => {
      const handle = extractHandle(link.href);
      if (handle && !session.subscriptions.has(handle)) {
        session.subscriptions.add(handle);
        newCount++;
      }
    });

    // 5. Try to extract from YouTube's internal data (ytInitialData)
    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        if (text.includes('ytInitialGuideData')) {
          // Extract subscription entries from guide data
          const matches = text.matchAll(/"navigationEndpoint":\s*\{[^}]*"browseEndpoint":\s*\{[^}]*"canonicalBaseUrl":\s*"\/@([^"]+)"/g);
          for (const match of matches) {
            const handle = match[1].toLowerCase();
            if (!session.subscriptions.has(handle)) {
              session.subscriptions.add(handle);
              newCount++;
            }
          }
        }
      }
    } catch (e) {
      // Parsing failed, continue
    }

    // 6. If on subscriptions page, scrape all visible channels
    if (getPageType() === 'subscriptions') {
      document.querySelectorAll('a[href*="/@"]').forEach(link => {
        const handle = extractHandle(link.href);
        if (handle && !session.subscriptions.has(handle)) {
          session.subscriptions.add(handle);
          newCount++;
        }
      });
    }

    // Save to storage if we found new ones
    if (newCount > 0) {
      AG.log('YouTube', COLOR, 'Found', newCount, 'new subscriptions. Total:', session.subscriptions.size);
      try {
        await chrome.storage.local.set({
          [STORAGE_KEY]: Array.from(session.subscriptions)
        });
      } catch (e) {
        // Storage not available
      }
    }

    return session.subscriptions.size;
  }

  function generateVideoId(el) {
    const link = el.querySelector('a[href*="/watch"]');
    if (link) {
      const match = link.href.match(/[?&]v=([^&]+)/);
      if (match) return 'yt_' + match[1];
    }

    const shortsLink = el.querySelector('a[href*="/shorts/"]');
    if (shortsLink) {
      const match = shortsLink.href.match(/\/shorts\/([^\/\?]+)/);
      if (match) return 'short_' + match[1];
    }

    return AG.generateId('yt', el.innerText);
  }

  /**
   * Get channel handle from video element using multiple selectors
   */
  function getChannelHandle(el) {
    // Try each selector in order
    for (const selector of SELECTORS.channelLinks) {
      const link = el.querySelector(selector);
      if (link) {
        const handle = extractHandle(link.href);
        if (handle) return handle;
      }
    }

    // Fallback: find any link with /@
    const allLinks = el.querySelectorAll('a[href*="/@"]');
    for (const link of allLinks) {
      // Skip video links (they also have /@channel in hover)
      if (link.href.includes('/watch') || link.href.includes('/shorts')) continue;
      const handle = extractHandle(link.href);
      if (handle) return handle;
    }

    return null;
  }

  function isAdElement(el) {
    if (el.closest('ytd-ad-slot-renderer')) return true;
    if (el.closest('ytd-promoted-sparkles-web-renderer')) return true;
    if (/\bSponsored\b/i.test(el.innerText)) return true;
    if (el.querySelector('[aria-label*="Ad"]')) return true;
    if (el.querySelector('.ytd-badge-supported-renderer')) {
      const badge = el.querySelector('.ytd-badge-supported-renderer');
      if (badge && /ad|sponsored/i.test(badge.textContent)) return true;
    }
    return false;
  }

  function isShortElement(el) {
    if (el.matches('ytd-reel-item-renderer')) return true;
    if (el.querySelector('a[href*="/shorts/"]')) return true;
    // Check if in shorts shelf
    const shelf = el.closest('ytd-rich-shelf-renderer');
    if (shelf) {
      const title = shelf.querySelector('#title');
      if (title && /shorts/i.test(title.textContent)) return true;
    }
    return false;
  }

  function analyzeVideo(el) {
    const id = generateVideoId(el);
    const labels = [];

    // Check for ads
    if (isAdElement(el)) {
      labels.push({
        category: 'ADVERTISING',
        text: 'Sponsored',
        type: 'ad',
        severity: 'critical'
      });
      return { id, labels, classification: AG.CLASSIFICATION.AD };
    }

    // Check for shorts (algorithmic)
    if (isShortElement(el)) {
      labels.push({
        category: 'SHORTS',
        text: 'YouTube Short',
        type: 'algorithmic',
        severity: 'medium'
      });
      return { id, labels, classification: AG.CLASSIFICATION.ALGORITHMIC };
    }

    // Check if from subscription
    const channelHandle = getChannelHandle(el);

    if (channelHandle && session.subscriptions.has(channelHandle)) {
      labels.push({
        category: 'SUBSCRIBED',
        text: 'From subscription',
        type: 'organic',
        severity: 'none'
      });
      return { id, labels, classification: AG.CLASSIFICATION.ORGANIC };
    }

    // Otherwise it's recommended
    labels.push({
      category: 'RECOMMENDED',
      text: 'Algorithm recommended',
      type: 'algorithmic',
      severity: 'medium'
    });
    return { id, labels, classification: AG.CLASSIFICATION.ALGORITHMIC };
  }

  async function scan() {
    await loadSubscriptions();

    const pageType = getPageType();

    // Don't scan on subscriptions page (it's all organic by definition)
    if (pageType === 'subscriptions') {
      AG.log('YouTube', COLOR, 'On subscriptions page - collecting subscription data');
      return session;
    }

    let selector = SELECTORS.homeVideos;
    if (pageType === 'watch') selector = SELECTORS.watchSidebar;
    if (pageType === 'search') selector = SELECTORS.searchResults;

    const videos = document.querySelectorAll(`${selector}, ${SELECTORS.shortsItems}`);
    let newCount = 0;
    let debugHandles = [];

    videos.forEach(el => {
      const result = analyzeVideo(el);
      if (AG.addToSession(session, result.id, result.classification, result.labels)) {
        newCount++;
        // Debug: collect first few channel handles
        if (debugHandles.length < 3) {
          const handle = getChannelHandle(el);
          if (handle) debugHandles.push(handle);
        }
      }
    });

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log('YouTube', COLOR,
        `[${pageType.toUpperCase()}]`,
        'Total:', session.total,
        '| Ads:', session.ads,
        '| Algo:', session.algorithmic,
        '| Organic:', session.organic,
        '| Subs:', session.subscriptions.size
      );

      // Debug: show sample handles
      if (debugHandles.length > 0 && session.organic === 0) {
        AG.log('YouTube', COLOR, 'Sample channels found:', debugHandles.join(', '));
        AG.log('YouTube', COLOR, 'Tip: Visit youtube.com/feed/subscriptions to sync your subscription list');
      }
    }

    return session;
  }

  async function startWatch() {
    if (state.observer) return;

    // Notify background that YouTube is active
    AG.notifyActive(PLATFORM);

    // Initial subscription load
    await loadSubscriptions();

    const container = document.querySelector('ytd-app') || document.body;
    const watcher = AG.createWatcher({
      container,
      selector: 'ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, ytd-reel-item-renderer',
      onNewContent: () => scan(),
      debounceMs: 1000
    });

    watcher.start();
    state.observer = watcher;
    state.isWatching = true;

    AG.log('YouTube', COLOR, 'Real-time watching started');
    AG.log('YouTube', COLOR, 'Subscriptions cached:', session.subscriptions.size);

    await scan();

    // Retry subscription loading after delays (sidebar loads lazily)
    setTimeout(async () => {
      const prevCount = session.subscriptions.size;
      await loadSubscriptions();
      if (session.subscriptions.size > prevCount) {
        AG.log('YouTube', COLOR, 'Updated subscriptions, re-scanning...');
        await scan();
      }
    }, 3000);
  }

  // Wait for YouTube SPA to initialize
  if (document.querySelector('ytd-app')) {
    startWatch();
  } else {
    const initObserver = new MutationObserver(() => {
      if (document.querySelector('ytd-app')) {
        initObserver.disconnect();
        startWatch();
      }
    });
    initObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Expose debug function for console
  window.ytDebug = () => {
    console.log('=== YouTube AttentionGuard Debug ===');
    console.log('Subscriptions:', Array.from(session.subscriptions));
    console.log('Session:', {
      total: session.total,
      ads: session.ads,
      algorithmic: session.algorithmic,
      organic: session.organic
    });

    // Test channel detection on first video
    const firstVideo = document.querySelector('ytd-rich-item-renderer');
    if (firstVideo) {
      const handle = getChannelHandle(firstVideo);
      console.log('First video channel:', handle);
      console.log('Is subscribed:', session.subscriptions.has(handle));
    }
  };
})();
