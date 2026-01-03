/**
 * AttentionGuard - LinkedIn Platform Script
 * Detects algorithmic labels and social engagement signals
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'linkedin';
  const COLOR = '#0A66C2';

  const PATTERNS = [
    { pattern: /Promoted/i, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
    { pattern: /Sponsored/i, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
    { pattern: /^Suggested$/m, category: 'SUGGESTED', type: 'algorithmic', severity: 'high' },
    { pattern: /Suggested for you/i, category: 'SUGGESTED', type: 'algorithmic', severity: 'high' },
    { pattern: /Recommended for you/i, category: 'RECOMMENDED', type: 'algorithmic', severity: 'high' },
    { pattern: /likes this/i, category: 'SOCIAL_REACTION', type: 'social', severity: 'medium' },
    { pattern: /loves this/i, category: 'SOCIAL_REACTION', type: 'social', severity: 'medium' },
    { pattern: /finds this insightful/i, category: 'SOCIAL_REACTION', type: 'social', severity: 'medium' },
    { pattern: /finds this funny/i, category: 'SOCIAL_REACTION', type: 'social', severity: 'medium' },
    { pattern: /celebrates this/i, category: 'SOCIAL_REACTION', type: 'social', severity: 'medium' },
    { pattern: /supports this/i, category: 'SOCIAL_REACTION', type: 'social', severity: 'medium' },
    { pattern: /reposted/i, category: 'SOCIAL_REPOST', type: 'social', severity: 'medium' },
    { pattern: /commented on this/i, category: 'SOCIAL_COMMENT', type: 'social', severity: 'medium' },
    { pattern: /connections follow/i, category: 'SOCIAL_GRAPH', type: 'social', severity: 'medium' },
    { pattern: /Jobs recommended for you/i, category: 'JOB_RECOMMENDATION', type: 'algorithmic', severity: 'medium' },
    { pattern: /Based on your profile/i, category: 'PERSONALIZED', type: 'algorithmic', severity: 'high' },
    { pattern: /People you may know/i, category: 'PEOPLE_SUGGESTION', type: 'algorithmic', severity: 'medium' }
  ];

  const session = AG.createSession();
  const state = AG.createState();

  function getPosts() {
    const posts = [];
    const seen = {};

    ['[data-id^="urn:li:activity"]', '.occludable-update'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const id = el.getAttribute('data-id') || AG.generateId('li', el.innerText);
        if (!seen[id]) {
          seen[id] = true;
          posts.push({ el, id });
        }
      });
    });

    return posts;
  }

  function analyzePost(postData) {
    const { el, id } = postData;
    const text = el.innerText.substring(0, 800);
    const labels = AG.matchPatterns(text, PATTERNS);

    // Dedupe categories
    const seenCat = {};
    const uniqueLabels = labels.filter(l => {
      if (seenCat[l.category]) return false;
      seenCat[l.category] = true;
      return true;
    });

    const classification = AG.classify(uniqueLabels, false);
    return { id, labels: uniqueLabels, classification };
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
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log('LinkedIn', COLOR,
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

    // Notify background that LinkedIn is active
    AG.notifyActive(PLATFORM);

    const container = document.querySelector('main') || document.body;
    const watcher = AG.createWatcher({
      container,
      selector: '[data-id^="urn:li:activity"], .occludable-update',
      onNewContent: scan,
      debounceMs: 800
    });

    watcher.start();
    state.observer = watcher;
    state.isWatching = true;

    AG.log('LinkedIn', COLOR, 'Real-time watching started');
    scan();
  }

  startWatch();

  // Register for refresh requests
  AG.registerPlatform(PLATFORM, session, scan);
})();
