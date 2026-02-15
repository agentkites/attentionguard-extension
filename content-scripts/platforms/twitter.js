/**
 * AttentionGuard - Twitter/X Platform Script
 * Detects algorithmic manipulation on Twitter/X
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'twitter';
  const COLOR = '#1DA1F2';

  const PATTERNS = {
    socialContext: [
      { pattern: /liked$/i, category: 'SOCIAL_LIKE', type: 'social', severity: 'medium' },
      { pattern: /likes$/i, category: 'SOCIAL_LIKE', type: 'social', severity: 'medium' },
      { pattern: /retweeted$/i, category: 'SOCIAL_RETWEET', type: 'social', severity: 'medium' },
      { pattern: /reposted$/i, category: 'SOCIAL_REPOST', type: 'social', severity: 'medium' },
      { pattern: /replied$/i, category: 'SOCIAL_REPLY', type: 'social', severity: 'low' },
      { pattern: /follows$/i, category: 'SOCIAL_FOLLOW', type: 'social', severity: 'medium' },
      { pattern: /and \d+ others/i, category: 'SOCIAL_MULTIPLE', type: 'social', severity: 'high' }
    ],
    text: [
      { pattern: /^Ad$/m, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
      { pattern: /^Promoted$/m, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
      { pattern: /Suggested for you/i, category: 'SUGGESTED', type: 'algorithmic', severity: 'high' },
      { pattern: /Because you follow/i, category: 'SOCIAL_GRAPH', type: 'algorithmic', severity: 'high' },
      { pattern: /You might like/i, category: 'SUGGESTED', type: 'algorithmic', severity: 'high' }
    ]
  };

  const session = AG.createSession();
  const state = AG.createState();

  function getActiveFeedTab() {
    const tab = document.querySelector('[role="tab"][aria-selected="true"]');
    return tab ? tab.innerText.trim() : 'Unknown';
  }

  function getTweets() {
    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  }

  // Detect ads by checking for a standalone "Ad" or "Promoted" marker
  // Twitter places the ad label on its own line right after the handle (line index 2)
  function isAdTweet(el) {
    const lines = el.innerText.split('\n');
    // Ad marker appears on line 2 or 3 (after name + handle), as exact text
    for (let i = 1; i <= Math.min(4, lines.length - 1); i++) {
      const line = lines[i].trim();
      if (line === 'Ad' || line === 'Promoted') return true;
    }
    // Also check for ad-specific spans as fallback
    const spans = el.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      const t = spans[i].textContent.trim();
      // Only match standalone "Ad" spans (not inside longer text)
      if ((t === 'Ad' || t === 'Promoted') && spans[i].childElementCount === 0) {
        return true;
      }
    }
    return false;
  }

  function analyzeTweet(el) {
    const text = el.innerText;
    const id = AG.generateId('tweet', text);
    const firstLines = text.split('\n').slice(0, 6).join(' ');
    const labels = [];

    // Check for ads using precise detection
    if (isAdTweet(el)) {
      labels.push({
        category: 'ADVERTISING',
        text: 'Promoted tweet',
        type: 'ad',
        severity: 'critical'
      });
      return { id, labels, classification: AG.CLASSIFICATION.AD };
    }

    // Check social context (Twitter may not always show this element)
    const socialCtx = el.querySelector('[data-testid="socialContext"]');
    if (socialCtx) {
      const socialText = socialCtx.innerText.trim();
      const matches = AG.matchPatterns(socialText, PATTERNS.socialContext);
      labels.push(...matches);
    }

    // Check for algorithmic indicators
    const textMatches = AG.matchPatterns(firstLines, PATTERNS.text);
    textMatches.forEach(m => {
      if (m.type !== 'ad' && !labels.some(l => l.category === m.category)) {
        labels.push(m);
      }
    });

    // If on "For you" tab with no other signals, it's algorithm-selected
    const feedType = getActiveFeedTab();
    if (labels.length === 0 && feedType === 'For you') {
      labels.push({
        category: 'ALGORITHM_SELECTED',
        text: 'Selected by For You algorithm',
        type: 'algorithmic',
        severity: 'low'
      });
    }

    const classification = AG.classify(labels, false);
    return { id, labels, classification };
  }

  function scan() {
    const tweets = getTweets();
    let newCount = 0;

    tweets.forEach(el => {
      const result = analyzeTweet(el);
      if (AG.addToSession(session, result.id, result.classification, result.labels)) {
        newCount++;
      }
    });

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      const feedType = getActiveFeedTab();
      AG.log('Twitter', COLOR,
        `[${feedType}]`,
        'Total:', session.total,
        '| Ads:', session.ads,
        '| Algo:', session.algorithmic,
        '| Social:', session.social,
        '| Rate:', AG.getManipulationRate(session) + '%'
      );
    }

    return session;
  }

  function startWatch() {
    if (state.observer) return;

    // Notify background that Twitter is active
    AG.notifyActive(PLATFORM);

    const container = document.querySelector('[data-testid="primaryColumn"]') || document.body;
    const watcher = AG.createWatcher({
      container,
      selector: 'article[data-testid="tweet"]',
      onNewContent: scan,
      debounceMs: 800
    });

    watcher.start();
    state.observer = watcher;
    state.isWatching = true;

    AG.log('Twitter', COLOR, 'Real-time watching started');
    scan();
  }

  startWatch();

  // Register for refresh requests
  AG.registerPlatform(PLATFORM, session, scan);
})();
