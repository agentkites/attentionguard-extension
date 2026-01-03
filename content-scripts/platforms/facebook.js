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

    const data = { stories: [], socialContexts: [], algorithmicUnits: [], manipulationSignals: {} };
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

    // Find algorithmic feed units (recommendations, suggestions, etc.)
    const algorithmicPatterns = [
      { pattern: /PaginatedPeopleYouMayKnowFeedUnit/g, category: 'PEOPLE_YOU_MAY_KNOW', label: 'People You May Know' },
      { pattern: /SuggestedGroupUnit|GroupDiscoverUnit/g, category: 'SUGGESTED_GROUPS', label: 'Suggested Groups' },
      { pattern: /ReelUnit|"__typename":"[^"]*Reel/g, category: 'REELS', label: 'Reels' },
      { pattern: /FriendingRequestsSideFeedUnit/g, category: 'FRIEND_REQUESTS', label: 'Friend Requests' },
      { pattern: /AdsSideFeedUnit/g, category: 'SIDE_ADS', label: 'Side Ads' },
      { pattern: /RemindersSideFeedUnit|BirthdayRemindersSideFeedSubUnit/g, category: 'REMINDERS', label: 'Reminders' },
      { pattern: /VideoHomeUnit|WatchFeedUnit/g, category: 'WATCH_FEED', label: 'Watch Feed' },
      { pattern: /people_you_may_know|PeopleYouMayKnow/gi, category: 'PYMK_SIGNAL', label: 'PYMK Signal' },
      // Follow CTA = suggested pages/profiles (algorithmic recommendations)
      { pattern: /CometFeedStoryFollowButtonStrategy/g, category: 'SUGGESTED_FOLLOWS', label: 'Suggested Follows (with Follow CTA)' },
      { pattern: /FollowProfileActionLink/g, category: 'FOLLOW_PROFILE', label: 'Follow Profile Links' },
    ];

    algorithmicPatterns.forEach(({ pattern, category, label }) => {
      const matches = allContent.match(pattern);
      if (matches && matches.length > 0) {
        data.algorithmicUnits.push({ category, label, count: matches.length });
      }
    });

    // Detect manipulation signals (dark patterns, engagement hooks)
    const manipulationCategories = {
      SOCIAL_PROOF: {
        patterns: [/seen_by|SeenBy/gi, /mutual_friends|MutualFriends/gi, /reaction_count|total_count/gi],
        severity: 'medium',
        label: 'Social Proof'
      },
      FOMO_URGENCY: {
        patterns: [/is_live|live_status|LiveNow/gi, /trending|Trending/gi, /expires|expiration/gi],
        severity: 'high',
        label: 'FOMO/Urgency'
      },
      AUTOPLAY: {
        patterns: [/autoplay|auto_play/gi],
        severity: 'high',
        label: 'Autoplay Videos'
      },
      INFINITE_SCROLL: {
        patterns: [/has_next_page|hasNextPage/gi],
        severity: 'medium',
        label: 'Infinite Scroll'
      },
      VARIABLE_REWARDS: {
        patterns: [/new_feed_items|has_new|unseen_count/gi, /badge_count|unread_count/gi],
        severity: 'high',
        label: 'Variable Rewards (notifications)'
      }
    };

    Object.entries(manipulationCategories).forEach(([category, config]) => {
      let totalCount = 0;
      config.patterns.forEach(pattern => {
        const matches = allContent.match(pattern);
        if (matches) totalCount += matches.length;
      });
      if (totalCount > 0) {
        data.manipulationSignals[category] = {
          count: totalCount,
          severity: config.severity,
          label: config.label
        };
      }
    });

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

    // Track algorithmic feed units
    jsonData.algorithmicUnits.forEach(unit => {
      const id = AG.generateId('algo', unit.category);
      if (!session.items[id]) {
        const labels = [{
          category: unit.category,
          text: unit.label + ' (' + unit.count + ')',
          type: 'algorithmic',
          severity: 'high'
        }];
        AG.addToSession(session, id, AG.CLASSIFICATION.ALGORITHMIC, labels);
      }
    });

    // Track manipulation signals (dark patterns)
    Object.entries(jsonData.manipulationSignals).forEach(([category, signal]) => {
      const id = AG.generateId('manipulation', category);
      if (!session.items[id]) {
        const labels = [{
          category: category,
          text: signal.label + ' (' + signal.count + ' signals)',
          type: 'manipulation',
          severity: signal.severity
        }];
        // Count manipulation signals as algorithmic for the rate calculation
        AG.addToSession(session, id, AG.CLASSIFICATION.ALGORITHMIC, labels);
      }
    });

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    const hasNewData = newCount > 0 || jsonData.algorithmicUnits.length > 0 || Object.keys(jsonData.manipulationSignals).length > 0;
    if (hasNewData) {
      AG.log('Facebook', COLOR,
        'Ads:', session.ads,
        '| Algo:', session.algorithmic || 0,
        '| Social:', session.social,
        '| Organic:', session.organic,
        '| Manipulation Rate:', AG.getManipulationRate(session) + '%'
      );

      // Log manipulation signals detected
      if (Object.keys(jsonData.manipulationSignals).length > 0) {
        const signals = Object.entries(jsonData.manipulationSignals)
          .map(([cat, s]) => s.label + ':' + s.count)
          .join(', ');
        console.log('%c  [Dark Patterns] ' + signals, 'color: #ff6b6b;');
      }
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
