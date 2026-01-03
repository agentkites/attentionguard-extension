/**
 * AttentionGuard Core Framework
 * Shared utilities for all platform detection scripts
 */

(function() {
  'use strict';

  // Prevent double initialization
  if (window.AttentionGuard) return;

  const AttentionGuard = {
    // Classification constants
    CLASSIFICATION: {
      AD: 'ad',
      ALGORITHMIC: 'algorithmic',
      SOCIAL: 'social',
      ORGANIC: 'organic'
    },

    SEVERITY: {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
      NONE: 'none'
    },

    // Create standard session structure
    createSession: function() {
      return {
        items: {},
        startTime: Date.now(),
        total: 0,
        ads: 0,
        algorithmic: 0,
        social: 0,
        organic: 0,
        categories: {},
        severities: { critical: 0, high: 0, medium: 0, low: 0 }
      };
    },

    // Create watcher state
    createState: function() {
      return {
        observer: null,
        isWatching: false,
        scanCount: 0,
        debounceTimer: null
      };
    },

    // Get highest severity from labels array
    getHighestSeverity: function(labels) {
      const order = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
      let highest = 'none';
      labels.forEach(function(l) {
        if ((order[l.severity] || 0) > order[highest]) {
          highest = l.severity;
        }
      });
      return highest;
    },

    // Classify based on labels
    classify: function(labels, isAd) {
      if (isAd || labels.some(l => l.type === 'ad')) {
        return this.CLASSIFICATION.AD;
      }
      if (labels.some(l => l.type === 'social')) {
        return this.CLASSIFICATION.SOCIAL;
      }
      if (labels.some(l => l.type === 'algorithmic')) {
        return this.CLASSIFICATION.ALGORITHMIC;
      }
      return this.CLASSIFICATION.ORGANIC;
    },

    // Add item to session (returns true if new)
    addToSession: function(session, id, classification, labels) {
      if (session.items[id]) return false;

      session.items[id] = { classification, labels, timestamp: Date.now() };
      session.total++;

      switch (classification) {
        case this.CLASSIFICATION.AD:
          session.ads++;
          break;
        case this.CLASSIFICATION.ALGORITHMIC:
          session.algorithmic++;
          break;
        case this.CLASSIFICATION.SOCIAL:
          session.social++;
          break;
        default:
          session.organic++;
      }

      // Update category counts
      labels.forEach(function(label) {
        session.categories[label.category] = (session.categories[label.category] || 0) + 1;
      });

      // Update severity counts
      const severity = this.getHighestSeverity(labels);
      if (severity !== 'none') {
        session.severities[severity] = (session.severities[severity] || 0) + 1;
      }

      return true;
    },

    // Calculate manipulation rate
    getManipulationRate: function(session) {
      if (session.total === 0) return 0;
      const manipulated = session.ads + session.algorithmic + session.social;
      return Math.round((manipulated / session.total) * 100 * 10) / 10;
    },

    // Notify background that platform is active (call this on script start)
    notifyActive: function(platform) {
      chrome.runtime.sendMessage({
        type: 'PLATFORM_ACTIVE',
        data: { platform }
      }).catch(() => {
        // Extension context may be invalidated, ignore
      });
    },

    // Report stats to background service worker
    reportStats: function(platform, session) {
      const stats = {
        startTime: session.startTime,
        total: session.total,
        ads: session.ads,
        algorithmic: session.algorithmic,
        social: session.social,
        organic: session.organic,
        categories: session.categories,
        rate: this.getManipulationRate(session)
      };

      chrome.runtime.sendMessage({
        type: 'STATS_UPDATE',
        data: { platform, stats }
      }).catch(() => {
        // Extension context may be invalidated, ignore
      });

      return stats;
    },

    // Create MutationObserver with debouncing
    createWatcher: function(config) {
      const {
        container,
        selector,
        onNewContent,
        debounceMs = 800
      } = config;

      let debounceTimer = null;

      const observer = new MutationObserver(function(mutations) {
        let hasNew = false;

        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                if (node.matches && node.matches(selector)) {
                  hasNew = true;
                  break;
                }
                if (node.querySelector && node.querySelector(selector)) {
                  hasNew = true;
                  break;
                }
              }
            }
          }
          if (hasNew) break;
        }

        if (hasNew) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(onNewContent, debounceMs);
        }
      });

      return {
        start: function() {
          observer.observe(container || document.body, {
            childList: true,
            subtree: true
          });
        },
        stop: function() {
          observer.disconnect();
          if (debounceTimer) clearTimeout(debounceTimer);
        }
      };
    },

    // Generate hash-based ID from text
    generateId: function(prefix, text) {
      let hash = 0;
      const str = text.substring(0, 200);
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return prefix + '_' + Math.abs(hash).toString(36);
    },

    // Console logging with platform branding
    log: function(platform, color, ...args) {
      console.log(`%c[${platform} AttentionGuard]`, `color: ${color}; font-weight: bold;`, ...args);
    },

    // Check if text matches any pattern in array
    matchPatterns: function(text, patterns) {
      const matches = [];
      for (const rule of patterns) {
        const match = text.match(rule.pattern);
        if (match) {
          matches.push({
            category: rule.category,
            text: match[0].substring(0, 50),
            type: rule.type,
            severity: rule.severity
          });
        }
      }
      return matches;
    }
  };

  // Expose globally
  window.AttentionGuard = AttentionGuard;

  console.log('%c[AttentionGuard Core]', 'color: #32B67A; font-weight: bold;', 'Framework loaded');
})();
