/**
 * AttentionGuard - Instagram Platform Script
 * Detects sponsored and suggested content
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'instagram';
  const COLOR = '#E1306C';

  const PATTERNS = [
    { pattern: /\bSponsored\b/i, category: 'ADVERTISING', type: 'ad', severity: 'critical' },
    { pattern: /Suggested for you/i, category: 'SUGGESTED', type: 'algorithmic', severity: 'high' }
  ];

  const session = AG.createSession();
  const state = AG.createState();

  function generatePostId(el) {
    const link = el.querySelector('a[href*="/p/"]');
    if (link) {
      const match = link.href.match(/\/p\/([^\/]+)/);
      if (match) return 'ig_' + match[1];
    }
    return AG.generateId('ig', el.innerText);
  }

  function analyzePost(el) {
    const id = generatePostId(el);
    const text = el.innerText;
    const labels = [];

    // Check for sponsored
    if (/\bSponsored\b/i.test(text)) {
      labels.push({
        category: 'ADVERTISING',
        text: 'Sponsored',
        type: 'ad',
        severity: 'critical'
      });
      return { id, labels, classification: AG.CLASSIFICATION.AD };
    }

    // Check for suggested
    if (/Suggested for you/i.test(text)) {
      labels.push({
        category: 'SUGGESTED',
        text: 'Suggested for you',
        type: 'algorithmic',
        severity: 'high'
      });
      return { id, labels, classification: AG.CLASSIFICATION.ALGORITHMIC };
    }

    // Check for follow button (means you don't follow = suggested)
    let hasFollowButton = false;
    el.querySelectorAll('button').forEach(btn => {
      if (/^Follow$/i.test(btn.innerText)) hasFollowButton = true;
    });

    if (hasFollowButton) {
      labels.push({
        category: 'SUGGESTED',
        text: 'Not following',
        type: 'algorithmic',
        severity: 'medium'
      });
      return { id, labels, classification: AG.CLASSIFICATION.ALGORITHMIC };
    }

    return { id, labels, classification: AG.CLASSIFICATION.ORGANIC };
  }

  function scan() {
    const posts = document.querySelectorAll('article');
    let newCount = 0;

    posts.forEach(el => {
      const result = analyzePost(el);
      if (AG.addToSession(session, result.id, result.classification, result.labels)) {
        newCount++;
      }
    });

    // Also scan stories
    document.querySelectorAll('div[aria-label*="Story by"]').forEach(el => {
      const label = el.getAttribute('aria-label') || '';
      const match = label.match(/Story by ([^,]+)/i);
      const username = match ? match[1] : 'unknown';
      const id = 'story_' + username;

      if (!session.items[id]) {
        AG.addToSession(session, id, AG.CLASSIFICATION.ORGANIC, []);
      }
    });

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log('Instagram', COLOR,
        'Total:', session.total,
        '| Ads:', session.ads,
        '| Algo:', session.algorithmic,
        '| Organic:', session.organic,
        '| Rate:', AG.getManipulationRate(session) + '%'
      );
    }

    return session;
  }

  function startWatch() {
    if (state.observer) return;

    // Notify background that Instagram is active
    AG.notifyActive(PLATFORM);

    const container = document.querySelector('main') || document.body;
    const watcher = AG.createWatcher({
      container,
      selector: 'article',
      onNewContent: scan,
      debounceMs: 1000
    });

    watcher.start();
    state.observer = watcher;
    state.isWatching = true;

    AG.log('Instagram', COLOR, 'Real-time watching started');
    scan();
  }

  startWatch();
})();
