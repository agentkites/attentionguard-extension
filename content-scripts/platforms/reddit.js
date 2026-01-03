/**
 * AttentionGuard - Reddit Platform Script
 * Detects algorithmic manipulation on Reddit
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'reddit';
  const COLOR = '#FF4500';

  // Pattern definitions
  const PATTERNS = {
    textPatterns: [
      { pattern: /^Promoted$/i, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
      { pattern: /Sponsored/i, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
      { pattern: /Popular near you/i, category: 'GEO_TARGETING', type: 'algorithmic', severity: 'medium' },
      { pattern: /Suggested for you/i, category: 'PERSONALIZED', type: 'algorithmic', severity: 'high' },
      { pattern: /Recommended for you/i, category: 'PERSONALIZED', type: 'algorithmic', severity: 'high' },
      { pattern: /Because you've visited/i, category: 'BEHAVIORAL_TRACKING', type: 'algorithmic', severity: 'high' },
      { pattern: /Because you follow/i, category: 'SOCIAL_GRAPH', type: 'social', severity: 'medium' },
      { pattern: /Similar to r\//i, category: 'SIMILAR_CONTENT', type: 'algorithmic', severity: 'medium' },
      { pattern: /Trending/i, category: 'TRENDING', type: 'algorithmic', severity: 'low' },
      { pattern: /Top today/i, category: 'TRENDING', type: 'algorithmic', severity: 'low' }
    ],
    recommendationSources: {
      'geo_popular': { category: 'GEO_TARGETING', type: 'algorithmic', severity: 'medium' },
      'user_to_post': { category: 'PERSONALIZED', type: 'algorithmic', severity: 'high' },
      'good_visits_on_subreddit': { category: 'BEHAVIORAL_TRACKING', type: 'algorithmic', severity: 'high' },
      'responsive_post_to_post': { category: 'RELATED_CONTENT', type: 'algorithmic', severity: 'medium' },
      'top_feed': { category: 'TRENDING', type: 'algorithmic', severity: 'low' },
      'home_feed': { category: 'ORGANIC', type: 'organic', severity: 'none' },
      'subreddit_page': { category: 'ORGANIC', type: 'organic', severity: 'none' }
    }
  };

  const session = AG.createSession();
  const state = AG.createState();

  function getPosts() {
    const posts = [];
    document.querySelectorAll('shreddit-post').forEach(el => {
      posts.push({ element: el, type: 'post' });
    });
    document.querySelectorAll('shreddit-ad-post').forEach(el => {
      posts.push({ element: el, type: 'ad' });
    });
    return posts;
  }

  function analyzePost(postData) {
    const el = postData.element;
    const id = el.id || AG.generateId('reddit', el.innerText);
    const labels = [];
    let isAd = postData.type === 'ad';

    // Check for ad post
    if (isAd || el.classList.contains('promotedlink')) {
      labels.push({
        category: 'ADVERTISING',
        text: 'Promoted',
        type: 'ad',
        severity: 'critical'
      });
      return { id, labels, classification: AG.CLASSIFICATION.AD };
    }

    // Check recommendation-source attribute
    const recSource = el.getAttribute('recommendation-source');
    if (recSource && PATTERNS.recommendationSources[recSource]) {
      const info = PATTERNS.recommendationSources[recSource];
      if (info.severity !== 'none') {
        labels.push({
          category: info.category,
          text: recSource,
          type: info.type,
          severity: info.severity
        });
      }
    }

    // Check credit-bar for text patterns
    const creditBar = el.querySelector('[slot="credit-bar"]');
    if (creditBar) {
      const text = creditBar.innerText;
      const matches = AG.matchPatterns(text, PATTERNS.textPatterns);
      matches.forEach(m => {
        if (!labels.some(l => l.category === m.category)) {
          labels.push(m);
        }
      });
    }

    const classification = AG.classify(labels, isAd);
    return { id, labels, classification };
  }

  function scan() {
    const posts = getPosts();
    let newCount = 0;

    posts.forEach(postData => {
      const result = analyzePost(postData);
      if (AG.addToSession(session, result.id, result.classification, result.labels)) {
        newCount++;
      }
    });

    state.scanCount++;

    // Report to background
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log('Reddit', COLOR,
        'Total:', session.total,
        '| Ads:', session.ads,
        '| Algo:', session.algorithmic,
        '| Social:', session.social,
        '| Organic:', session.organic,
        '| Rate:', AG.getManipulationRate(session) + '%'
      );
    }

    return session;
  }

  function startWatch() {
    if (state.observer) return;

    // Notify background that Reddit is active
    AG.notifyActive(PLATFORM);

    const container = document.querySelector('main') || document.body;
    const watcher = AG.createWatcher({
      container,
      selector: 'shreddit-post, shreddit-ad-post',
      onNewContent: scan,
      debounceMs: 800
    });

    watcher.start();
    state.observer = watcher;
    state.isWatching = true;

    AG.log('Reddit', COLOR, 'Real-time watching started');
    scan();
  }

  // Auto-start
  startWatch();

  // Register for refresh requests
  AG.registerPlatform(PLATFORM, session, scan);
})();
