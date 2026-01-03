/**
 * AttentionGuard - Facebook Platform Script
 * Parses embedded JSON data for reliable detection
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'facebook';
  const COLOR = '#1877F2';

  const session = AG.createSession();
  const state = AG.createState();

  function parseEmbeddedData() {
    const scripts = document.querySelectorAll('script');
    let allContent = '';
    scripts.forEach(s => { allContent += s.textContent; });

    const data = { stories: [], socialContexts: [] };
    const seenIds = {};

    // Find stories with sponsored indicator
    // Note: Match th_dat_spo directly - [^}]*? fails with nested JSON
    const sponsoredPattern = /"th_dat_spo":(null|\{[^}]*?\})/g;
    let match;

    while ((match = sponsoredPattern.exec(allContent)) !== null) {
      // th_dat_spo:null = organic, th_dat_spo:{...} = sponsored (any object means ad)
      const isSponsored = match[1] !== 'null' && match[1].startsWith('{');
      // Look backwards for Story ID
      const contextStart = Math.max(0, match.index - 500);
      const context = allContent.substring(contextStart, match.index + match[0].length);
      const idMatch = context.match(/"id":"(S:_I[^"]+|UzpfS[^"]+)"/);
      const storyId = idMatch ? idMatch[1] : 'story_' + Object.keys(seenIds).length;

      if (!seenIds[storyId]) {
        seenIds[storyId] = true;
        data.stories.push({ id: storyId, isSponsored });
      }
    }

    // Find post_id patterns
    const postIdPattern = /"post_id":"([^"]+)"/g;
    while ((match = postIdPattern.exec(allContent)) !== null) {
      if (!seenIds[match[1]]) {
        seenIds[match[1]] = true;
        data.stories.push({ id: match[1], isSponsored: false });
      }
    }

    // Find social context
    const socialPattern = /"social_context"\s*:\s*\{[^}]*?"text"\s*:\s*"([^"]+)"/g;
    while ((match = socialPattern.exec(allContent)) !== null) {
      data.socialContexts.push(match[1]);
    }

    return data;
  }

  function scan() {
    const jsonData = parseEmbeddedData();
    let newCount = 0;

    jsonData.stories.forEach(story => {
      const labels = [];

      if (story.isSponsored) {
        labels.push({
          category: 'SPONSORED_POST',
          text: 'Sponsored',
          type: 'ad',
          severity: 'critical'
        });
      }

      const classification = story.isSponsored ? AG.CLASSIFICATION.AD : AG.CLASSIFICATION.ORGANIC;

      if (AG.addToSession(session, story.id, classification, labels)) {
        newCount++;
      }
    });

    // Track social contexts
    jsonData.socialContexts.forEach(ctx => {
      const id = AG.generateId('social', ctx);
      if (!session.items[id]) {
        const labels = [{
          category: 'SOCIAL_CONTEXT',
          text: ctx,
          type: 'social',
          severity: 'medium'
        }];
        AG.addToSession(session, id, AG.CLASSIFICATION.SOCIAL, labels);
      }
    });

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log('Facebook', COLOR,
        'Total:', session.total,
        '| Ads:', session.ads,
        '| Social:', session.social,
        '| Organic:', session.organic,
        '| Rate:', AG.getManipulationRate(session) + '%'
      );
    }

    return session;
  }

  function startWatch() {
    if (state.observer) return;

    // Notify background that Facebook is active
    AG.notifyActive(PLATFORM);

    const observer = new MutationObserver(mutations => {
      let shouldScan = false;

      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              if (node.tagName === 'SCRIPT' || (node.textContent && node.textContent.length > 500)) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(scan, 1500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    state.observer = { stop: () => observer.disconnect() };
    state.isWatching = true;

    AG.log('Facebook', COLOR, 'Real-time watching started (JSON parsing)');
    scan();
  }

  startWatch();

  // Register for refresh requests
  AG.registerPlatform(PLATFORM, session, scan);
})();
