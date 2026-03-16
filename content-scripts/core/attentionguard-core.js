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

      // Hook: if research logger is active, log this item
      if (window.AGLogger && window.AGLogger.getCurrentSession()) {
        window.AGLogger.logItem(id, classification, labels);
      }

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

      // Update category counts - only count labels matching the final classification
      // This prevents social signals on ads from inflating the Echoed category
      const classificationTypeMap = {
        ad: this.CLASSIFICATION.AD,
        algorithmic: this.CLASSIFICATION.ALGORITHMIC,
        social: this.CLASSIFICATION.SOCIAL,
        organic: this.CLASSIFICATION.ORGANIC
      };

      labels.forEach(function(label) {
        // Only count this label if its type matches the final classification
        // OR if it's an ad (always count ad labels on ad posts)
        const labelClassification = classificationTypeMap[label.type] || this.CLASSIFICATION.ORGANIC;
        if (labelClassification === classification) {
          session.categories[label.category] = (session.categories[label.category] || 0) + 1;
        }
      }, this);

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
    },

    // Registered platform sessions for refresh requests
    _registeredPlatforms: {},

    // Register a platform's session for refresh handling
    registerPlatform: function(platform, session, scanFn) {
      this._registeredPlatforms[platform] = { session, scanFn };
    },

    // Handle stats request from background
    handleStatsRequest: function() {
      for (const [platform, data] of Object.entries(this._registeredPlatforms)) {
        // Trigger a fresh scan if available
        if (data.scanFn) {
          data.scanFn();
        } else {
          // Just report current stats
          this.reportStats(platform, data.session);
        }
      }
    }
  };

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'REQUEST_STATS':
        AttentionGuard.handleStatsRequest();
        sendResponse({ success: true });
        return false;

      case 'LOGGER_STOP':
        if (window.AGLogger) {
          window.AGLogger.stopAutoScroll();
        }
        sendResponse({ success: true });
        return false;

      case 'LOGGER_START':
        startLoggerScan(message.data.platform);
        sendResponse({ success: true });
        return false;

      case 'LOGGER_GET_STATUS':
        if (window.AGLogger && window.AGLogger.getCurrentSession()) {
          var session = window.AGLogger.getCurrentSession();
          var items = window.AGLogger.getItems();
          var count = window.AGLogger.getItemCount();
          var stats = { total: count, organic: 0, algorithmic: 0, ads: 0, social: 0 };
          for (var i = 0; i < items.length; i++) {
            var rl = items[i].researchLabels;
            if (rl.indexOf('organic') !== -1) stats.organic++;
            if (rl.indexOf('algorithmic') !== -1) stats.algorithmic++;
            if (rl.indexOf('ad') !== -1) stats.ads++;
            if (rl.indexOf('social_pressure') !== -1) stats.social++;
          }
          // Always include segments for live chart rendering
          var segments = window.AGLogger.getSegments();
          var isComplete = session.status === 'complete';
          sendResponse({
            platform: session.platform,
            sessionId: session.sessionId,
            itemCount: count,
            targetItems: 500,
            stats: stats,
            complete: isComplete,
            segments: segments,
            metrics: isComplete ? window.AGLogger.getMetrics() : null
          });
        } else {
          sendResponse(null);
        }
        return false;
    }
    return false;
  });

  // Start a logger scan for the given platform
  async function startLoggerScan(platform) {
    console.log('%c[AG Logger]', 'color: #9B59B6; font-weight: bold;', 'startLoggerScan called for:', platform);

    // Wait for logger and health check to be available
    if (!window.AGLogger || !window.AGHealthCheck) {
      console.log('%c[AG Logger]', 'color: #9B59B6;', 'Waiting for AGLogger/AGHealthCheck...', !!window.AGLogger, !!window.AGHealthCheck);
      setTimeout(function() { startLoggerScan(platform); }, 500);
      return;
    }

    // Don't start if already running
    if (window.AGLogger.getCurrentSession() && window.AGLogger.isAutoScrolling()) {
      console.log('%c[AG Logger]', 'color: #9B59B6;', 'Already running, skipping');
      return;
    }

    try {
      // Run health check (shorter delay since page is already loaded)
      console.log('%c[AG Logger]', 'color: #9B59B6;', 'Running health check...');
      const health = await window.AGHealthCheck.check(platform, 2000);
      console.log('%c[AG Logger]', 'color: #9B59B6;', 'Health check result:', JSON.stringify(health));

      if (!health.healthy) {
        console.log('%c[AG Logger]', 'color: #E74C3C;', 'Health check FAILED — selectors broken');
        window.AGHealthCheck.showBrokenBanner(platform);
        if (window.AGLogger.getCurrentSession()) {
          window.AGLogger.setSelectorHealth('broken');
        }
        return;
      }

      // Detect network size
      var networkSize = null;
      if (window.AGNetworkDetector) {
        var netResult = window.AGNetworkDetector.detect(platform);
        console.log('%c[AG Logger]', 'color: #9B59B6;', 'Network size:', JSON.stringify(netResult));
        if (netResult) {
          networkSize = netResult.connections || netResult.friends ||
                        netResult.followers || netResult.karma || null;
        }
      }

      // Initialize logger and start session
      await window.AGLogger.init();
      var sessionId = window.AGLogger.startSession(platform, networkSize);
      console.log('%c[AG Logger]', 'color: #9B59B6;', 'Session started:', sessionId);

      // Start auto-scroll after brief delay for feed to settle
      setTimeout(function() {
        console.log('%c[AG Logger]', 'color: #9B59B6;', 'Starting auto-scroll...');
        window.AGLogger.startAutoScroll();
      }, 1500);

    } catch (e) {
      console.error('[AttentionGuard] Logger scan start error:', e);
    }
  }

  // Check if a research logger scan should auto-start on this page
  async function checkLoggerAutoStart() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'LOGGER_GET_ACTIVE_SCAN' });
      if (!response || !response.platform) return;

      const platform = response.platform;
      const currentUrl = window.location.hostname;

      const platformHosts = {
        linkedin: 'linkedin.com',
        reddit: 'reddit.com',
        facebook: 'facebook.com',
        instagram: 'instagram.com'
      };

      if (!currentUrl.includes(platformHosts[platform])) return;

      startLoggerScan(platform);
    } catch (e) {
      // Extension context may not be ready
    }
  }

  // Delay auto-start check to let platform scripts initialize first
  setTimeout(checkLoggerAutoStart, 3000);

  // Expose globally
  window.AttentionGuard = AttentionGuard;

  console.log('%c[AttentionGuard Core]', 'color: #32B67A; font-weight: bold;', 'Framework loaded');
})();
