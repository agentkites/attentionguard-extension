/**
 * AttentionGuard Network Size Detector
 * Auto-detects connections/followers/friends count from platform DOM
 * Runs once before feed scan to capture network size metadata
 */

(function() {
  'use strict';

  if (window.AGNetworkDetector) return;

  const DETECTORS = {
    linkedin: {
      // LinkedIn shows "500+ connections" or "N connections" on feed page sidebar
      detect: function() {
        var text = document.body.innerText;
        var match = text.match(/(\d[\d,+]*)\s*connection/i);
        if (match) {
          var val = match[1].replace(/[,+]/g, '');
          var num = parseInt(val, 10);
          // LinkedIn caps display at "500+"
          if (match[1].indexOf('+') !== -1) {
            return { connections: num, capped: true };
          }
          return { connections: num, capped: false };
        }
        return null;
      },
      // Can also try navigating to profile for exact count
      profileUrl: '/in/me/',
      profileDetect: function(doc) {
        var text = doc.body.innerText;
        var match = text.match(/(\d[\d,+]*)\s*connection/i);
        if (match) {
          var val = match[1].replace(/[,+]/g, '');
          return { connections: parseInt(val, 10), capped: match[1].indexOf('+') !== -1 };
        }
        return null;
      }
    },

    reddit: {
      // Reddit shows karma on profile hover/page
      // Subscribed subreddit count not easily available, but karma is on the page
      detect: function() {
        // Check for karma in the user menu or sidebar
        var karmaEl = document.querySelector('[id*="karma"], [data-testid*="karma"]');
        if (karmaEl) {
          var num = parseInt(karmaEl.textContent.replace(/[,\s]/g, ''), 10);
          if (!isNaN(num)) return { karma: num };
        }
        // Try header profile area
        var text = document.body.innerText;
        var match = text.match(/([\d,]+)\s*karma/i);
        if (match) {
          return { karma: parseInt(match[1].replace(/,/g, ''), 10) };
        }
        return null;
      }
    },

    facebook: {
      // Facebook shows friend count on profile page
      detect: function() {
        // Friend count is typically on profile, not feed
        // Check sidebar for any friend count reference
        var text = document.body.innerText;
        var match = text.match(/([\d,]+)\s*friends/i);
        if (match) {
          return { friends: parseInt(match[1].replace(/,/g, ''), 10) };
        }
        return null;
      },
      profileUrl: '/me',
      profileDetect: function(doc) {
        var text = doc.body.innerText;
        var match = text.match(/([\d,]+)\s*friends/i);
        if (match) {
          return { friends: parseInt(match[1].replace(/,/g, ''), 10) };
        }
        return null;
      }
    },

    instagram: {
      // Instagram shows following/followers on profile page
      detect: function() {
        // On feed page, profile link is in the sidebar
        // Followers/following are only on profile page
        return null; // Need profile page
      },
      profileDetect: function(doc) {
        var text = doc.body.innerText;
        var followersMatch = text.match(/([\d,.]+[KMkm]?)\s*followers/i);
        var followingMatch = text.match(/([\d,.]+[KMkm]?)\s*following/i);
        var result = {};
        if (followersMatch) {
          result.followers = parseCount(followersMatch[1]);
        }
        if (followingMatch) {
          result.following = parseCount(followingMatch[1]);
        }
        return Object.keys(result).length > 0 ? result : null;
      }
    }
  };

  // Parse counts like "1.2K", "3.5M", "12,345"
  function parseCount(str) {
    if (!str) return 0;
    str = str.trim().replace(/,/g, '');
    var multiplier = 1;
    if (/[kK]$/.test(str)) {
      multiplier = 1000;
      str = str.replace(/[kK]$/, '');
    } else if (/[mM]$/.test(str)) {
      multiplier = 1000000;
      str = str.replace(/[mM]$/, '');
    }
    var num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num * multiplier);
  }

  const AGNetworkDetector = {
    // Detect network size for the current platform
    detect: function(platform) {
      var detector = DETECTORS[platform];
      if (!detector) return null;
      return detector.detect();
    },

    // Get the profile URL for a platform (if network size needs profile visit)
    getProfileUrl: function(platform) {
      var detector = DETECTORS[platform];
      return detector ? detector.profileUrl || null : null;
    },

    // Detect from profile page content
    detectFromProfile: function(platform, doc) {
      var detector = DETECTORS[platform];
      if (!detector || !detector.profileDetect) return null;
      return detector.profileDetect(doc || document);
    },

    // Utility
    parseCount: parseCount
  };

  window.AGNetworkDetector = AGNetworkDetector;

  console.log('%c[AG Network Detector]', 'color: #3498DB; font-weight: bold;', 'Network detector loaded');
})();
