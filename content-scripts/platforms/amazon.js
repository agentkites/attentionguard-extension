/**
 * AttentionGuard - Amazon Platform Script
 * Detects manipulation patterns: sponsored, urgency, price anchoring
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'amazon';
  const COLOR = '#FF9900';

  const PATTERNS = {
    sponsored: /sponsored|प्रायोजित|gesponsert|sponsorisé|patrocinado/i,
    urgency: /only \d+ left|order within|limited time|ends in|deal ends|hurry/i,
    onlyXLeft: /only (\d+) left/i
  };

  const SELECTORS = {
    searchResults: '[data-component-type="s-search-result"]',
    sponsoredLabel: '.puis-sponsored-label-text, .s-label-popover-default',
    strikePrice: '.a-text-price[data-a-strike="true"]',
    coupon: '.s-coupon-unclipped, #vpcButton'
  };

  const session = AG.createSession();
  const state = AG.createState();

  function getPageType() {
    const path = window.location.pathname;
    if (path.includes('/s') && window.location.search.includes('k=')) return 'search';
    if (path.includes('/dp/') || path.includes('/gp/product/')) return 'product';
    if (path.includes('/cart')) return 'cart';
    return 'home';
  }

  function generateProductId(el) {
    const asin = el.getAttribute('data-asin');
    if (asin) return 'amz_' + asin;

    const link = el.querySelector('a[href*="/dp/"]');
    if (link) {
      const match = link.href.match(/\/dp\/([A-Z0-9]+)/);
      if (match) return 'amz_' + match[1];
    }

    return AG.generateId('amz', el.innerText);
  }

  function analyzeProduct(el) {
    const id = generateProductId(el);
    const text = el.innerText;
    const labels = [];

    // Check sponsored
    const isSponsored = !!(
      el.querySelector(SELECTORS.sponsoredLabel) ||
      PATTERNS.sponsored.test(text.substring(0, 200))
    );

    if (isSponsored) {
      labels.push({
        category: 'SPONSORED',
        text: 'Sponsored product',
        type: 'ad',
        severity: 'critical'
      });
    }

    // Check price anchoring (strikethrough prices)
    if (el.querySelector(SELECTORS.strikePrice)) {
      labels.push({
        category: 'PRICE_ANCHORING',
        text: 'Strikethrough pricing',
        type: 'algorithmic',
        severity: 'medium'
      });
    }

    // Check urgency
    const urgencyMatch = text.match(PATTERNS.onlyXLeft);
    if (urgencyMatch) {
      labels.push({
        category: 'URGENCY',
        text: `Only ${urgencyMatch[1]} left`,
        type: 'algorithmic',
        severity: 'high'
      });
    } else if (PATTERNS.urgency.test(text)) {
      labels.push({
        category: 'URGENCY',
        text: 'Urgency messaging',
        type: 'algorithmic',
        severity: 'high'
      });
    }

    // Check coupons
    if (el.querySelector(SELECTORS.coupon)) {
      labels.push({
        category: 'COUPON',
        text: 'Coupon prompt',
        type: 'algorithmic',
        severity: 'low'
      });
    }

    const classification = isSponsored ? AG.CLASSIFICATION.AD :
      labels.length > 0 ? AG.CLASSIFICATION.ALGORITHMIC : AG.CLASSIFICATION.ORGANIC;

    return { id, labels, classification };
  }

  function scanSearchPage() {
    const products = document.querySelectorAll(SELECTORS.searchResults);
    let newCount = 0;

    products.forEach(el => {
      const result = analyzeProduct(el);
      if (AG.addToSession(session, result.id, result.classification, result.labels)) {
        newCount++;
      }
    });

    return newCount;
  }

  function scanProductPage() {
    const path = window.location.pathname;
    const asinMatch = path.match(/\/dp\/([A-Z0-9]+)/);
    if (!asinMatch) return 0;

    const id = 'amz_' + asinMatch[1];
    if (session.items[id]) return 0;

    const labels = [];
    const pageText = document.body.innerText;

    // Price anchoring
    if (document.querySelector(SELECTORS.strikePrice)) {
      labels.push({
        category: 'PRICE_ANCHORING',
        text: 'Strikethrough pricing',
        type: 'algorithmic',
        severity: 'medium'
      });
    }

    // Urgency
    if (PATTERNS.urgency.test(pageText)) {
      labels.push({
        category: 'URGENCY',
        text: 'Urgency messaging',
        type: 'algorithmic',
        severity: 'high'
      });
    }

    const classification = labels.length > 0 ? AG.CLASSIFICATION.ALGORITHMIC : AG.CLASSIFICATION.ORGANIC;
    AG.addToSession(session, id, classification, labels);

    return 1;
  }

  function scan() {
    const pageType = getPageType();
    let newCount = 0;

    if (pageType === 'search') {
      newCount = scanSearchPage();
    } else if (pageType === 'product') {
      newCount = scanProductPage();
    }

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log('Amazon', COLOR,
        `[${pageType.toUpperCase()}]`,
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

    // Notify background that Amazon is active
    AG.notifyActive(PLATFORM);

    const container = document.querySelector('#a-page') || document.body;

    const observer = new MutationObserver(() => {
      const productCount = document.querySelectorAll(SELECTORS.searchResults).length;
      if (productCount > state.lastCount || state.lastUrl !== window.location.href) {
        state.lastCount = productCount;
        state.lastUrl = window.location.href;

        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(scan, 1000);
      }
    });

    observer.observe(container, { childList: true, subtree: true });
    state.observer = { stop: () => observer.disconnect() };
    state.isWatching = true;
    state.lastCount = 0;
    state.lastUrl = window.location.href;

    AG.log('Amazon', COLOR, 'Real-time watching started');
    scan();
  }

  startWatch();

  // Register for refresh requests
  AG.registerPlatform(PLATFORM, session, scan);
})();
