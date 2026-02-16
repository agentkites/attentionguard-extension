# Contributing to AttentionGuard

Thank you for your interest in contributing to AttentionGuard! This guide will help you add support for new platforms or improve existing detection patterns.

## Table of Contents

- [Getting Started](#getting-started)
- [Adding a New Platform](#adding-a-new-platform)
- [Platform Script Template](#platform-script-template)
- [Detection Patterns](#detection-patterns)
- [Testing Your Changes](#testing-your-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Load the extension in Chrome (Developer mode)
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Adding a New Platform

### Step 1: Create the Platform Script

Create a new file at `content-scripts/platforms/{platform}.js`

### Step 2: Update manifest.json

Add your platform to the content scripts section:

```json
{
  "matches": ["*://*.yourplatform.com/*"],
  "js": [
    "content-scripts/core/attentionguard-core.js",
    "content-scripts/platforms/yourplatform.js"
  ],
  "run_at": "document_idle"
}
```

Also add to `host_permissions`:

```json
"host_permissions": [
  "*://*.yourplatform.com/*"
]
```

### Step 3: Update Background Service Worker

Add your platform to the `PLATFORMS` object in `background/service-worker.js`:

```javascript
const PLATFORMS = {
  // ... existing platforms
  yourplatform: {
    pattern: /yourplatform\.com/i,
    color: '#HEXCOLOR',
    name: 'Your Platform'
  }
};
```

### Step 4: Add Platform Icon (Optional)

Add an emoji or icon to `popup/popup.js`:

```javascript
const PLATFORM_ICONS = {
  // ... existing icons
  yourplatform: '🆕'
};
```

## Platform Script Template

Use this template for new platform scripts:

```javascript
/**
 * AttentionGuard - [Platform Name] Platform Script
 * Brief description of what this detects
 */

(function() {
  'use strict';

  const AG = window.AttentionGuard;
  const PLATFORM = 'platformid';  // lowercase, matches manifest
  const COLOR = '#HEXCOLOR';       // brand color for console logs

  // Define detection patterns
  const PATTERNS = [
    {
      pattern: /Sponsored/i,
      category: 'ADVERTISING',
      type: 'ad',           // 'ad', 'algorithmic', 'social', or 'organic'
      severity: 'critical'  // 'critical', 'high', 'medium', 'low', 'none'
    },
    // Add more patterns...
  ];

  // Initialize session and state
  const session = AG.createSession();
  const state = AG.createState();

  // Get content items from the page
  function getItems() {
    return document.querySelectorAll('your-selector');
  }

  // Analyze a single item
  function analyzeItem(el) {
    const id = AG.generateId(PLATFORM, el.innerText);
    const text = el.innerText;
    const labels = AG.matchPatterns(text, PATTERNS);

    // Add custom detection logic here...

    const classification = AG.classify(labels, false);
    return { id, labels, classification };
  }

  // Main scan function
  function scan() {
    const items = getItems();
    let newCount = 0;

    items.forEach(el => {
      const result = analyzeItem(el);
      if (AG.addToSession(session, result.id, result.classification, result.labels)) {
        newCount++;
      }
    });

    state.scanCount++;
    AG.reportStats(PLATFORM, session);

    if (newCount > 0) {
      AG.log(PLATFORM, COLOR,
        'Total:', session.total,
        '| Ads:', session.ads,
        '| Algo:', session.algorithmic,
        '| Rate:', AG.getManipulationRate(session) + '%'
      );
    }

    return session;
  }

  // Start watching for new content
  function startWatch() {
    if (state.observer) return;

    const container = document.querySelector('main') || document.body;
    const watcher = AG.createWatcher({
      container,
      selector: 'your-item-selector',
      onNewContent: scan,
      debounceMs: 800
    });

    watcher.start();
    state.observer = watcher;
    state.isWatching = true;

    AG.log(PLATFORM, COLOR, 'Real-time watching started');
    scan();
  }

  // Auto-start
  startWatch();
})();
```

## Detection Patterns

### Pattern Types

| Type | Description | Example |
|------|-------------|---------|
| `ad` | Paid/sponsored content | "Promoted", "Sponsored" |
| `algorithmic` | Algorithm-selected content | "Suggested for you", "Recommended" |
| `social` | Shown due to social signals | "X liked this", "Friends commented" |
| `organic` | Natural/chronological content | Subscribed feeds |

### Severity Levels

| Severity | Description |
|----------|-------------|
| `critical` | Direct advertising/promotion |
| `high` | Strong algorithmic manipulation |
| `medium` | Moderate manipulation signals |
| `low` | Weak signals |
| `none` | Organic content |

### Tips for Pattern Detection

1. **Inspect the DOM** - Use Chrome DevTools to find unique selectors
2. **Check data attributes** - Many platforms use `data-*` attributes
3. **Look for hidden JSON** - Facebook/Meta embeds data in `<script>` tags
4. **Test edge cases** - Different languages, regions, logged out state

## Core Framework API

The `AttentionGuard` core provides these utilities:

```javascript
// Constants
AG.CLASSIFICATION.AD / ALGORITHMIC / SOCIAL / ORGANIC
AG.SEVERITY.CRITICAL / HIGH / MEDIUM / LOW / NONE

// Session management
AG.createSession()           // Create new session
AG.createState()            // Create watcher state
AG.addToSession(session, id, classification, labels)

// Detection helpers
AG.matchPatterns(text, patterns)  // Match text against pattern array
AG.classify(labels, isAd)         // Determine classification
AG.getHighestSeverity(labels)     // Get highest severity from labels
AG.generateId(prefix, text)       // Generate unique ID from text hash

// Communication
AG.reportStats(platform, session) // Send stats to background

// Watching
AG.createWatcher({ container, selector, onNewContent, debounceMs })

// Logging
AG.log(platform, color, ...args)  // Branded console output
```

## Testing Your Changes

1. Load the extension in Chrome (Developer mode)
2. Visit the platform you're testing
3. Open Chrome DevTools Console
4. Look for `[Platform AttentionGuard]` logs
5. Click the extension icon to verify stats appear
6. Scroll and verify real-time updates

## Submitting a Pull Request

1. Ensure your code follows the existing style
2. Test on multiple pages of the platform
3. Include a description of what your changes detect
4. Reference any related issues

### PR Checklist

- [ ] New platform script in `content-scripts/platforms/`
- [ ] Updated `manifest.json` with matches and host_permissions
- [ ] Updated `background/service-worker.js` PLATFORMS object
- [ ] Updated `popup/popup.js` PLATFORM_ICONS (if applicable)
- [ ] Tested on live platform
- [ ] Console logs working
- [ ] Popup stats updating

## Questions?

Open an issue on GitHub or reach out to the team at [hq@agentkite.com](mailto:hq@agentkite.com).

---

Thank you for helping make the web more transparent!
