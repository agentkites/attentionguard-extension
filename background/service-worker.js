/**
 * AttentionGuard - Background Service Worker
 * Manages icon state, side panel, and aggregates stats across tabs
 */

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
  return (settings?.persistSessions) ? chrome.storage.local : chrome.storage.session;
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
    console.log('[AttentionGuard] updateIcon called:', { tabId, platform: platform?.id });

    if (platform) {
      // Active - red icon
      await chrome.action.setIcon({
        tabId,
        path: getIconPaths(true)
      });
      console.log('[AttentionGuard] Set ACTIVE icon for tab', tabId);

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
      console.log('[AttentionGuard] Set INACTIVE icon for tab', tabId);
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
      if (!persist) {
        const { sessions } = await chrome.storage.local.get('sessions');
        if (sessions) {
          await chrome.storage.session.set({ sessions });
        }
      } else {
        const { sessions } = await chrome.storage.session.get('sessions');
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

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
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
    console.log('[AttentionGuard] Tab updated:', tab.url);
    const platform = detectPlatform(tab.url);
    console.log('[AttentionGuard] Detected platform:', platform?.id || 'none');
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
  console.log('AttentionGuard installed');
  await chrome.storage.local.set({ settings: { persistSessions: false } });

  // Enable side panel
  await chrome.sidePanel.setOptions({
    enabled: true
  });
});

console.log('AttentionGuard service worker loaded');
