/**
 * Facebook Network Interceptor - Injected into MAIN world
 * Intercepts fetch/XHR to capture GraphQL responses for scroll detection
 */
(function() {
  'use strict';

  if (window.__AG_NETWORK_INTERCEPTED__) return;
  window.__AG_NETWORK_INTERCEPTED__ = true;

  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    return originalFetch.apply(this, arguments).then(response => {
      const clone = response.clone();
      const urlStr = typeof url === 'string' ? url : (url.url || '');

      if (urlStr.includes('graphql') || urlStr.includes('/api/')) {
        clone.text().then(text => {
          // Post message to content script
          window.postMessage({ type: 'AG_NETWORK_DATA', source: 'fetch', text: text }, '*');
        }).catch(() => {});
      }

      return response;
    });
  };

  // Override XHR
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._agUrl = url;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    const xhr = this;

    xhr.addEventListener('load', function() {
      if (xhr._agUrl && (xhr._agUrl.includes('graphql') || xhr._agUrl.includes('/api/'))) {
        // Post message to content script
        window.postMessage({ type: 'AG_NETWORK_DATA', source: 'xhr', text: xhr.responseText }, '*');
      }
    });

    return originalXHRSend.apply(this, arguments);
  };

  console.log('%c[AttentionGuard]', 'color: #1877F2; font-weight: bold;', 'Network interception active (main world)');
})();
