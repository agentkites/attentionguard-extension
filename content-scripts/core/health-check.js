/**
 * AttentionGuard Selector Health Check
 * Self-diagnosis for broken selectors, fallback chains, one-click reporting
 */

(function() {
  'use strict';

  if (window.AGHealthCheck) return;

  // Platform-specific selector fallback chains
  // Each strategy is tried in order; first one returning >0 results wins
  const SELECTOR_STRATEGIES = {
    linkedin: [
      { name: 'testid', feed: '[data-testid="mainFeed"]', post: '[role="listitem"]' },
      { name: 'role-list', feed: '[role="list"]', post: '[role="listitem"]' },
      { name: 'main-structure', feed: 'main', post: 'main [data-display-contents]' }
    ],
    reddit: [
      { name: 'shreddit', feed: null, post: 'shreddit-post' },
      { name: 'shreddit-alt', feed: null, post: 'article[data-testid="post-container"]' },
      { name: 'main-article', feed: 'main', post: 'main article' }
    ],
    facebook: [
      { name: 'role-feed', feed: '[role="feed"]', post: '[role="article"]' },
      { name: 'pagelet', feed: '[data-pagelet*="Feed"]', post: '[data-pagelet*="Feed"] > div > div' },
      { name: 'body-walker', feed: null, post: '[role="article"]' }
    ],
    instagram: [
      { name: 'article', feed: null, post: 'article' },
      { name: 'main-article', feed: 'main', post: 'main article' }
    ]
  };

  const GITHUB_ISSUE_BASE = 'https://github.com/agentkites/attentionguard-extension/issues/new';

  const AGHealthCheck = {

    // Try all selector strategies for a platform, return the first working one
    findWorkingStrategy: function(platform) {
      var strategies = SELECTOR_STRATEGIES[platform];
      if (!strategies) return null;

      for (var i = 0; i < strategies.length; i++) {
        var strategy = strategies[i];
        var feedEl = strategy.feed ? document.querySelector(strategy.feed) : document;
        if (strategy.feed && !feedEl) continue;

        var searchRoot = feedEl || document;
        var posts = searchRoot.querySelectorAll(strategy.post);
        if (posts.length > 0) {
          return {
            strategy: strategy,
            feedElement: feedEl,
            postCount: posts.length
          };
        }
      }

      return null; // All strategies failed
    },

    // Run health check after page load
    check: function(platform, delayMs) {
      var self = this;
      delayMs = delayMs || 5000;

      return new Promise(function(resolve) {
        setTimeout(function() {
          var result = self.findWorkingStrategy(platform);
          if (result) {
            resolve({
              healthy: true,
              strategy: result.strategy.name,
              postCount: result.postCount,
              feedSelector: result.strategy.feed,
              postSelector: result.strategy.post,
              feedElement: result.feedElement
            });
          } else {
            resolve({
              healthy: false,
              strategy: null,
              postCount: 0,
              feedSelector: null,
              postSelector: null,
              feedElement: null
            });
          }
        }, delayMs);
      });
    },

    // Show broken selector banner to user
    showBrokenBanner: function(platform) {
      // Don't duplicate
      if (document.getElementById('ag-health-banner')) return;

      var banner = document.createElement('div');
      banner.id = 'ag-health-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;' +
        'background:#fee2e2;border-bottom:2px solid #ef4444;padding:12px 20px;' +
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;' +
        'color:#991b1b;display:flex;align-items:center;justify-content:space-between;';

      var msg = document.createElement('span');
      msg.textContent = 'AttentionGuard: Unable to detect feed items on ' +
        platform.charAt(0).toUpperCase() + platform.slice(1) +
        '. The site may have updated its structure.';

      var actions = document.createElement('span');

      var reportBtn = document.createElement('a');
      reportBtn.textContent = 'Report this issue';
      reportBtn.href = this._buildIssueUrl(platform);
      reportBtn.target = '_blank';
      reportBtn.style.cssText = 'background:#ef4444;color:white;padding:6px 14px;' +
        'border-radius:6px;text-decoration:none;font-weight:600;margin-left:12px;font-size:13px;';

      var dismissBtn = document.createElement('button');
      dismissBtn.textContent = '\u00D7';
      dismissBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;' +
        'color:#991b1b;margin-left:12px;padding:0 4px;';
      dismissBtn.onclick = function() { banner.remove(); };

      actions.appendChild(reportBtn);
      actions.appendChild(dismissBtn);
      banner.appendChild(msg);
      banner.appendChild(actions);
      document.body.appendChild(banner);
    },

    // Build pre-filled GitHub issue URL
    _buildIssueUrl: function(platform) {
      var version = 'unknown';
      try { version = chrome.runtime.getManifest().version; } catch(e) {}

      var title = encodeURIComponent('Selector broken: ' + platform);
      var body = encodeURIComponent(
        '## Broken Selector Report\n\n' +
        '**Platform:** ' + platform + '\n' +
        '**Extension Version:** ' + version + '\n' +
        '**Browser:** ' + navigator.userAgent.substring(0, 100) + '\n' +
        '**Date:** ' + new Date().toISOString().split('T')[0] + '\n' +
        '**URL:** ' + window.location.hostname + window.location.pathname + '\n\n' +
        '**What happened:** The extension could not find any feed items on this page. ' +
        'All selector strategies returned 0 results.\n\n' +
        '**Strategies tried:**\n' +
        (SELECTOR_STRATEGIES[platform] || []).map(function(s) {
          return '- ' + s.name + ': feed=`' + (s.feed || 'document') + '` post=`' + s.post + '`';
        }).join('\n') +
        '\n\n---\n*Auto-generated by AttentionGuard Health Check*'
      );

      return GITHUB_ISSUE_BASE + '?title=' + title + '&body=' + body + '&labels=selector-broken';
    },

    // Get strategies for a platform (for external use)
    getStrategies: function(platform) {
      return SELECTOR_STRATEGIES[platform] || [];
    }
  };

  window.AGHealthCheck = AGHealthCheck;

  console.log('%c[AG Health Check]', 'color: #E74C3C; font-weight: bold;', 'Health check loaded');
})();
