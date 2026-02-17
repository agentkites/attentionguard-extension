/**
 * AttentionGuard - Background Service Worker
 * Manages icon state, side panel, and aggregates stats across tabs
 */

// Browser detection: Firefox exposes the global `browser` object natively
const IS_FIREFOX = typeof browser !== 'undefined' && !!browser.runtime?.getURL;

// Platform detection patterns
const PLATFORMS = {
  reddit: { pattern: /reddit\.com/i, color: '#FF4500', name: 'Reddit' },
  twitter: { pattern: /(twitter\.com|x\.com)/i, color: '#1DA1F2', name: 'Twitter/X' },
  facebook: { pattern: /facebook\.com/i, color: '#1877F2', name: 'Facebook' },
  instagram: { pattern: /instagram\.com/i, color: '#E1306C', name: 'Instagram' },
  linkedin: { pattern: /linkedin\.com/i, color: '#0A66C2', name: 'LinkedIn' },
  youtube: { pattern: /youtube\.com/i, color: '#FF0000', name: 'YouTube' },
  amazon: { pattern: /amazon\./i, color: '#FF9900', name: 'Amazon' }
};

// Track active platforms per tab
const activeTabs = new Map();

// Default session structure
function createEmptySession() {
  return {
    startTime: Date.now(),
    total: 0,
    ads: 0,
    algorithmic: 0,
    social: 0,
    organic: 0,
    categories: {},
    lastUpdate: Date.now()
  };
}

// Detect platform from URL
function detectPlatform(url) {
  if (!url) return null;
  for (const [id, config] of Object.entries(PLATFORMS)) {
    if (config.pattern.test(url)) {
      return { id, ...config };
    }
  }
  return null;
}

// Get storage API based on persistence setting
async function getStorage() {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings?.persistSessions) return chrome.storage.local;
  return chrome.storage.session || chrome.storage.local;
}

// Get all sessions
async function getSessions() {
  const storage = await getStorage();
  const data = await storage.get('sessions');
  return data.sessions || {};
}

// Save sessions
async function saveSessions(sessions) {
  const storage = await getStorage();
  await storage.set({ sessions });
}

// Icon paths (properly sized) - use chrome.runtime.getURL for proper resolution
function getIconPaths(isActive) {
  const base = isActive ? 'assets/icons/brain-cog-red' : 'assets/icons/brain-cog';
  return {
    16: chrome.runtime.getURL(base + '-16.png'),
    32: chrome.runtime.getURL(base + '-32.png'),
    48: chrome.runtime.getURL(base + '-48.png')
  };
}

// Update icon based on platform
async function updateIcon(tabId, platform) {
  try {
    if (platform) {
      // Active - red icon
      await chrome.action.setIcon({
        tabId,
        path: getIconPaths(true)
      });

      // Get stats for badge
      const sessions = await getSessions();
      const session = sessions[platform.id];

      if (session && session.total > 0) {
        const manipulated = session.ads + session.algorithmic + session.social;
        const rate = Math.round((manipulated / session.total) * 100);
        await chrome.action.setBadgeText({ tabId, text: `${rate}%` });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: platform.color });
      } else {
        await chrome.action.setBadgeText({ tabId, text: '' });
      }

      await chrome.action.setTitle({
        tabId,
        title: `AttentionGuard - ${platform.name} (Click to open panel)`
      });
    } else {
      // Inactive - default icon
      await chrome.action.setIcon({
        tabId,
        path: getIconPaths(false)
      });
      await chrome.action.setBadgeText({ tabId, text: '' });
      await chrome.action.setTitle({
        tabId,
        title: 'AttentionGuard - No supported platform'
      });
    }
  } catch (e) {
    console.error('[AttentionGuard] Icon update error:', e);
  }
}

// Handle messages from content scripts and panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'PLATFORM_ACTIVE': {
      // Content script notifying us it's active
      const { platform } = message.data;
      const tabId = sender.tab?.id;

      if (tabId && platform) {
        const platformConfig = PLATFORMS[platform];
        if (platformConfig) {
          activeTabs.set(tabId, { id: platform, ...platformConfig });
          await updateIcon(tabId, { id: platform, ...platformConfig });
        }
      }
      return { success: true };
    }

    case 'STATS_UPDATE': {
      const { platform, stats } = message.data;
      const sessions = await getSessions();

      // Merge stats into platform session
      if (!sessions[platform]) {
        sessions[platform] = createEmptySession();
      }

      // Update session with new stats
      Object.assign(sessions[platform], stats, { lastUpdate: Date.now() });
      await saveSessions(sessions);

      // Update badge on sender tab
      if (sender.tab?.id) {
        const platformConfig = PLATFORMS[platform];
        if (platformConfig) {
          await updateIcon(sender.tab.id, { id: platform, ...platformConfig });
        }
      }

      // Broadcast update to panel
      chrome.runtime.sendMessage({
        type: 'STATS_BROADCAST',
        data: { platform, stats }
      }).catch(() => {});

      return { success: true };
    }

    case 'GET_STATS': {
      const sessions = await getSessions();
      const { settings } = await chrome.storage.local.get('settings');
      return { sessions, settings: settings || { persistSessions: false } };
    }

    case 'GET_CURRENT_PLATFORM': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const platform = detectPlatform(tab?.url);
      const sessions = await getSessions();
      return {
        platform,
        session: platform ? sessions[platform.id] : null,
        tabId: tab?.id
      };
    }

    case 'TOGGLE_PERSISTENCE': {
      const { persist } = message.data;
      await chrome.storage.local.set({ settings: { persistSessions: persist } });

      // Migrate data between storage types
      const sessionStorage = chrome.storage.session || chrome.storage.local;
      if (!persist) {
        const { sessions } = await chrome.storage.local.get('sessions');
        if (sessions) {
          await sessionStorage.set({ sessions });
        }
      } else {
        const { sessions } = await sessionStorage.get('sessions');
        if (sessions) {
          await chrome.storage.local.set({ sessions });
        }
      }

      return { success: true };
    }

    case 'RESET_SESSION': {
      const { platform } = message.data;
      const sessions = await getSessions();

      if (platform && sessions[platform]) {
        sessions[platform] = createEmptySession();
      } else {
        // Reset all
        for (const key of Object.keys(sessions)) {
          sessions[key] = createEmptySession();
        }
      }

      await saveSessions(sessions);

      // Update badge
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const currentPlatform = detectPlatform(tab.url);
        await updateIcon(tab.id, currentPlatform);
      }

      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

// Open side panel (Chrome) or sidebar (Firefox) when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (IS_FIREFOX) {
    await browser.sidebarAction.open();
  } else {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Update icon when tab changes
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    const platform = activeTabs.get(tabId) || detectPlatform(tab.url);
    await updateIcon(tabId, platform);

    // Request fresh stats from content script
    if (platform) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'REQUEST_STATS' });
      } catch (e) {
        // Content script might not be loaded yet
      }
    }

    // Notify panel of tab change
    const sessions = await getSessions();
    chrome.runtime.sendMessage({
      type: 'TAB_CHANGED',
      data: {
        platform,
        session: platform ? sessions[platform.id] : null,
        tabId,
        url: tab.url
      }
    }).catch(() => {});
  } catch (e) {
    // Tab might not exist
  }
});

// Update icon when tab URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const platform = detectPlatform(tab.url);
    if (platform) {
      activeTabs.set(tabId, platform);
    } else {
      activeTabs.delete(tabId);
    }
    await updateIcon(tabId, platform);
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ settings: { persistSessions: false } });

  // Enable side panel (Chrome only; Firefox sidebar is always available via manifest)
  if (!IS_FIREFOX && chrome.sidePanel) {
    await chrome.sidePanel.setOptions({
      enabled: true
    });
  }
});

