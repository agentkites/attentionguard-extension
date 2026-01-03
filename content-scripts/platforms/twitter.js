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

  function analyzeTweet(el) {
    const id = AG.generateId('tweet', el.innerText);
    const text = el.innerText;
    const firstLines = text.split('\n').slice(0, 6).join(' ');
    const labels = [];

    // Check for ads
    if (/\bAd\b/.test(firstLines) || /\bPromoted\b/i.test(firstLines)) {
      labels.push({
        category: 'ADVERTISING',
        text: 'Promoted tweet',
        type: 'ad',
        severity: 'critical'
      });
      return { id, labels, classification: AG.CLASSIFICATION.AD };
    }

    // Check social context
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
})();
