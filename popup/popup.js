/**
 * AttentionGuard Side Panel Script
 * Real-time stats display with live updates
 */

// Platform icons (image paths)
const PLATFORM_ICONS = {
  reddit: '../assets/platforms/reddit.png',
  twitter: '../assets/platforms/twitter.png',
  facebook: '../assets/platforms/facebook.png',
  instagram: '../assets/platforms/instagram.png',
  linkedin: '../assets/platforms/linkedin.png',
  youtube: '../assets/platforms/youtube.png',
  amazon: '../assets/platforms/amazon.png'
};

// Platform-specific category information
const PLATFORM_CATEGORIES = {
  reddit: {
    ads: {
      icon: '🎯',
      title: 'Reddit Ads',
      description: 'Paid promotional content in your Reddit feed.',
      categories: [
        { name: 'Promoted Posts', severity: 'critical', desc: 'Paid ads that look like regular posts' },
        { name: 'Sponsored Content', severity: 'critical', desc: 'Brand partnerships marked as sponsored' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'Reddit Algorithm',
      description: 'Content Reddit\'s algorithm pushes to you based on your behavior, not your subscriptions.',
      categories: [
        { name: 'Suggested For You', severity: 'high', desc: 'Posts recommended based on your browsing' },
        { name: 'Because You Visited', severity: 'high', desc: 'Based on subreddits you\'ve browsed' },
        { name: 'Popular Near You', severity: 'medium', desc: 'Geo-targeted trending content' },
        { name: 'Similar to r/...', severity: 'medium', desc: 'Related subreddit recommendations' },
        { name: 'Trending', severity: 'low', desc: 'Viral posts pushed for engagement' }
      ]
    },
    social: {
      icon: '👥',
      title: 'Reddit Social',
      description: 'Reddit has minimal social signals compared to other platforms.',
      categories: [
        { name: 'Because You Follow', severity: 'medium', desc: 'Based on users or communities you follow' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Subreddits',
      description: 'Posts from communities you deliberately joined.',
      categories: [
        { name: 'Subscribed Subreddits', severity: 'low', desc: 'From r/ communities you joined' },
        { name: 'Home Feed', severity: 'low', desc: 'Your personalized front page' }
      ]
    }
  },
  linkedin: {
    ads: {
      icon: '🎯',
      title: 'LinkedIn Ads',
      description: 'Paid promotional content targeting professionals.',
      categories: [
        { name: 'Promoted', severity: 'critical', desc: 'Paid posts in your feed' },
        { name: 'Sponsored', severity: 'critical', desc: 'Company-sponsored content' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'LinkedIn Algorithm',
      description: 'Content LinkedIn pushes based on your profile and behavior.',
      categories: [
        { name: 'Suggested For You', severity: 'high', desc: 'AI-recommended posts' },
        { name: 'Recommended For You', severity: 'high', desc: 'Based on your profile data' },
        { name: 'Based On Your Profile', severity: 'high', desc: 'Personalized to your work history' },
        { name: 'Jobs Recommended', severity: 'medium', desc: 'Job listings pushed to you' },
        { name: 'People You May Know', severity: 'medium', desc: 'Connection suggestions' }
      ]
    },
    social: {
      icon: '👥',
      title: 'LinkedIn Social',
      description: 'Content shown because your connections engaged with it. LinkedIn heavily uses social proof.',
      categories: [
        { name: 'X Likes This', severity: 'medium', desc: 'Someone in your network liked this post' },
        { name: 'X Loves This', severity: 'medium', desc: 'Reaction-based social signal' },
        { name: 'X Finds Insightful', severity: 'medium', desc: 'Professional reaction signal' },
        { name: 'X Commented', severity: 'medium', desc: 'Connection commented on this' },
        { name: 'X Reposted', severity: 'medium', desc: 'Shared by someone you know' },
        { name: 'Connections Follow', severity: 'medium', desc: 'Based on who your network follows' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Network',
      description: 'Direct posts from people and companies you follow.',
      categories: [
        { name: 'Following', severity: 'low', desc: 'From accounts you chose to follow' },
        { name: 'Connections', severity: 'low', desc: 'Posts from your direct connections' }
      ]
    }
  },
  youtube: {
    ads: {
      icon: '🎯',
      title: 'YouTube Ads',
      description: 'Paid video promotions and sponsored content.',
      categories: [
        { name: 'Video Ads', severity: 'critical', desc: 'Pre-roll and mid-roll advertisements' },
        { name: 'Sponsored Cards', severity: 'critical', desc: 'Product placements and promotions' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'YouTube Algorithm',
      description: 'Videos pushed by YouTube to maximize watch time, not necessarily what you want.',
      categories: [
        { name: 'Recommended', severity: 'high', desc: 'AI-suggested videos in sidebar and home' },
        { name: 'YouTube Shorts', severity: 'medium', desc: 'Addictive short-form video format' },
        { name: 'Up Next', severity: 'high', desc: 'Auto-play suggestions to keep you watching' }
      ]
    },
    social: {
      icon: '👥',
      title: 'YouTube Social',
      description: 'YouTube has minimal social signals.',
      categories: [
        { name: 'Community Posts', severity: 'low', desc: 'Posts from channels about activity' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Subscriptions',
      description: 'Videos from channels you deliberately subscribed to.',
      categories: [
        { name: 'Subscribed Channels', severity: 'low', desc: 'From creators you follow' },
        { name: 'Subscription Feed', severity: 'low', desc: 'Chronological subscription content' }
      ]
    }
  },
  amazon: {
    ads: {
      icon: '🎯',
      title: 'Amazon Ads',
      description: 'Paid product placements that sellers pay for.',
      categories: [
        { name: 'Sponsored Products', severity: 'critical', desc: 'Paid search result placements' },
        { name: 'Sponsored Brands', severity: 'critical', desc: 'Brand advertisements in results' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'Amazon Manipulation',
      description: 'Psychological tactics designed to pressure you into buying.',
      categories: [
        { name: 'Price Anchoring', severity: 'medium', desc: 'Strikethrough prices to make deals seem better' },
        { name: 'Only X Left', severity: 'high', desc: 'Scarcity messaging to create urgency' },
        { name: 'Order Within X Hours', severity: 'high', desc: 'Countdown timers to rush decisions' },
        { name: 'Limited Time Deal', severity: 'high', desc: 'Time pressure tactics' },
        { name: 'Coupon Prompts', severity: 'low', desc: 'Clip coupon CTAs to increase commitment' }
      ]
    },
    social: {
      icon: '👥',
      title: 'Amazon Social',
      description: 'Amazon uses minimal social signals.',
      categories: [
        { name: 'Reviews', severity: 'low', desc: 'User reviews (not tracked as manipulation)' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Search',
      description: 'Products matching your actual search query.',
      categories: [
        { name: 'Search Results', severity: 'low', desc: 'Non-sponsored search matches' },
        { name: 'Direct Navigation', severity: 'low', desc: 'Products you navigated to directly' }
      ]
    }
  },
  instagram: {
    ads: {
      icon: '🎯',
      title: 'Instagram Ads',
      description: 'Sponsored posts and stories in your feed.',
      categories: [
        { name: 'Sponsored Posts', severity: 'critical', desc: 'Paid feed advertisements' },
        { name: 'Sponsored Stories', severity: 'critical', desc: 'Paid story placements' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'Instagram Algorithm',
      description: 'Content from accounts you don\'t follow, pushed by the algorithm.',
      categories: [
        { name: 'Suggested For You', severity: 'high', desc: 'Recommended posts in feed' },
        { name: 'Explore Page', severity: 'high', desc: 'Algorithmically curated content' },
        { name: 'Reels', severity: 'medium', desc: 'Short-form video recommendations' }
      ]
    },
    social: {
      icon: '👥',
      title: 'Instagram Social',
      description: 'Instagram has minimal explicit social signals in feed.',
      categories: [
        { name: 'Activity Status', severity: 'low', desc: 'When friends are active' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Following',
      description: 'Posts from accounts you chose to follow.',
      categories: [
        { name: 'Following Feed', severity: 'low', desc: 'Posts from accounts you follow' },
        { name: 'Stories', severity: 'low', desc: 'Stories from people you follow' }
      ]
    }
  },
  facebook: {
    ads: {
      icon: '🎯',
      title: 'Facebook Ads',
      description: 'Sponsored content targeting you based on extensive data collection.',
      categories: [
        { name: 'Sponsored Posts', severity: 'critical', desc: 'Paid advertisements in feed' },
        { name: 'Suggested For You', severity: 'critical', desc: 'Promoted pages and content' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'Facebook Algorithm',
      description: 'Content Facebook\'s algorithm selects to maximize engagement.',
      categories: [
        { name: 'Suggested Posts', severity: 'high', desc: 'From pages you don\'t follow' },
        { name: 'Recommended Groups', severity: 'medium', desc: 'Group suggestions' },
        { name: 'Watch Videos', severity: 'medium', desc: 'Video recommendations' }
      ]
    },
    social: {
      icon: '👥',
      title: 'Facebook Social',
      description: 'Content shown because friends interacted with it.',
      categories: [
        { name: 'Friend Liked', severity: 'medium', desc: 'Posts your friends engaged with' },
        { name: 'Friend Commented', severity: 'medium', desc: 'Discussions friends joined' },
        { name: 'Social Context', severity: 'medium', desc: 'X friends like this page' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Friends & Pages',
      description: 'Direct posts from friends and pages you follow.',
      categories: [
        { name: 'Friends Posts', severity: 'low', desc: 'Direct posts from friends' },
        { name: 'Followed Pages', severity: 'low', desc: 'From pages you liked' }
      ]
    }
  },
  twitter: {
    ads: {
      icon: '🎯',
      title: 'Twitter/X Ads',
      description: 'Promoted tweets and accounts.',
      categories: [
        { name: 'Promoted Tweets', severity: 'critical', desc: 'Paid tweet placements' },
        { name: 'Promoted Accounts', severity: 'critical', desc: 'Paid follow suggestions' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'Twitter/X Algorithm',
      description: 'Content pushed by the For You algorithm.',
      categories: [
        { name: 'For You Feed', severity: 'high', desc: 'Algorithmically curated timeline' },
        { name: 'Suggested Topics', severity: 'medium', desc: 'Topic recommendations' },
        { name: 'Trending', severity: 'medium', desc: 'Trending topics and hashtags' },
        { name: 'Who To Follow', severity: 'medium', desc: 'Account suggestions' }
      ]
    },
    social: {
      icon: '👥',
      title: 'Twitter/X Social',
      description: 'Content based on who you follow\'s activity.',
      categories: [
        { name: 'X Liked', severity: 'medium', desc: 'Tweets people you follow liked' },
        { name: 'X Retweeted', severity: 'medium', desc: 'Retweets from your network' },
        { name: 'X Follows', severity: 'medium', desc: 'Based on who your follows follow' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Following',
      description: 'Tweets from accounts you follow (Following tab).',
      categories: [
        { name: 'Following Timeline', severity: 'low', desc: 'Chronological following feed' },
        { name: 'Lists', severity: 'low', desc: 'Your curated Twitter lists' }
      ]
    }
  }
};

// Default fallback for unknown platforms
const DEFAULT_CATEGORIES = {
  ads: {
    icon: '🎯',
    title: 'Advertisements',
    description: 'Paid promotional content.',
    categories: [
      { name: 'Sponsored Content', severity: 'critical', desc: 'Paid placements' }
    ]
  },
  algorithmic: {
    icon: '🤖',
    title: 'Algorithmic Content',
    description: 'Content selected by algorithms based on your behavior.',
    categories: [
      { name: 'Recommendations', severity: 'high', desc: 'AI-curated suggestions' }
    ]
  },
  social: {
    icon: '👥',
    title: 'Social Signals',
    description: 'Content shown based on social connections.',
    categories: [
      { name: 'Social Activity', severity: 'medium', desc: 'Based on network engagement' }
    ]
  },
  organic: {
    icon: '✓',
    title: 'Organic Content',
    description: 'Content you chose to see.',
    categories: [
      { name: 'Subscribed', severity: 'low', desc: 'From accounts you follow' }
    ]
  }
};

// DOM Elements
const elements = {
  noPlatform: document.getElementById('noPlatform'),
  activePlatform: document.getElementById('activePlatform'),
  platformHeader: document.getElementById('platformHeader'),
  platformIcon: document.getElementById('platformIcon'),
  platformName: document.getElementById('platformName'),
  sessionTime: document.getElementById('sessionTime'),
  scoreNumber: document.getElementById('scoreNumber'),
  scoreProgress: document.getElementById('scoreProgress'),
  adsCount: document.getElementById('adsCount'),
  algoCount: document.getElementById('algoCount'),
  socialCount: document.getElementById('socialCount'),
  organicCount: document.getElementById('organicCount'),
  progressFill: document.getElementById('progressFill'),
  manipulatedCount: document.getElementById('manipulatedCount'),
  totalCount: document.getElementById('totalCount'),
  resetBtn: document.getElementById('resetBtn'),
  persistToggle: document.getElementById('persistToggle'),
  themeToggle: document.getElementById('themeToggle'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalIcon: document.getElementById('modalIcon'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody'),
  modalClose: document.getElementById('modalClose'),
  requestSection: document.getElementById('requestSection'),
  currentSiteName: document.getElementById('currentSiteName'),
  requestBtn: document.getElementById('requestBtn')
};

let currentPlatform = null;
let updateInterval = null;
let sessionStartTime = null;
let currentTabUrl = null;
let currentTabId = null;

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('attentionguard-theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('attentionguard-theme', newTheme);
}

// Modal management - using safe DOM methods
function showCategoryModal(category) {
  // Get platform-specific categories, fallback to default
  const platformId = currentPlatform ? currentPlatform.id : null;
  const platformCategories = platformId ? PLATFORM_CATEGORIES[platformId] : null;
  const info = (platformCategories && platformCategories[category])
    ? platformCategories[category]
    : DEFAULT_CATEGORIES[category];

  if (!info) return;

  elements.modalIcon.textContent = info.icon;
  elements.modalTitle.textContent = info.title;

  // Clear existing content
  elements.modalBody.textContent = '';

  // Create description paragraph
  const desc = document.createElement('p');
  desc.className = 'modal-description';
  desc.textContent = info.description;
  elements.modalBody.appendChild(desc);

  // Create section title
  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'category-section-title';
  sectionTitle.textContent = 'Detection Categories';
  elements.modalBody.appendChild(sectionTitle);

  // Create category list
  const ul = document.createElement('ul');
  ul.className = 'category-list';

  info.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'category-item';

    const badge = document.createElement('span');
    badge.className = 'severity-badge ' + cat.severity;
    badge.textContent = cat.severity;

    const content = document.createElement('div');
    content.className = 'category-content';

    const name = document.createElement('div');
    name.className = 'category-name';
    name.textContent = cat.name;

    const descText = document.createElement('div');
    descText.className = 'category-desc';
    descText.textContent = cat.desc;

    content.appendChild(name);
    content.appendChild(descText);
    li.appendChild(badge);
    li.appendChild(content);
    ul.appendChild(li);
  });

  elements.modalBody.appendChild(ul);
  elements.modalOverlay.classList.add('active');
}

function hideModal() {
  elements.modalOverlay.classList.remove('active');
}

// Check if URL is a valid website (not chrome://, about:, etc.)
function isValidWebsite(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

// Extract hostname from URL
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Initialize panel
async function init() {
  // Init theme
  initTheme();

  // Load and display current tab info
  await refreshCurrentTab();

  // Load settings
  const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  elements.persistToggle.checked = settingsResponse.settings?.persistSessions || false;

  // Setup event listeners
  setupEventListeners();

  // Listen for tab changes
  chrome.tabs.onActivated.addListener(handleTabChange);
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
}

// Refresh current tab info
async function refreshCurrentTab() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_PLATFORM' });

  currentTabId = response.tabId;

  // Get current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabUrl = tab?.url || null;
  } catch (e) {
    currentTabUrl = null;
  }

  // Check if empty/chrome tab - close panel
  if (!currentTabUrl || !isValidWebsite(currentTabUrl)) {
    // Can't close side panel programmatically, just show "no platform" state
    showNoPlatform(null);
    return;
  }

  if (response.platform) {
    currentPlatform = response.platform;
    showActivePlatform(response.platform, response.session);
    startUpdates();
  } else {
    showNoPlatform(currentTabUrl);
  }
}

// Handle tab activation change
async function handleTabChange(activeInfo) {
  stopUpdates();
  currentPlatform = null;
  await refreshCurrentTab();
}

// Handle tab URL update
async function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tabId === currentTabId) {
    stopUpdates();
    currentPlatform = null;
    await refreshCurrentTab();
  }
}

// Show no platform state
function showNoPlatform(url) {
  elements.noPlatform.style.display = 'flex';
  elements.activePlatform.style.display = 'none';

  // Show request section if valid website URL
  if (url && isValidWebsite(url)) {
    const hostname = getHostname(url);
    elements.currentSiteName.textContent = hostname || url;
    elements.requestSection.style.display = 'block';
    elements.requestBtn.textContent = 'Request AttentionGuard for this site';
    elements.requestBtn.classList.remove('submitted');
  } else {
    elements.requestSection.style.display = 'none';
  }
}

// Show active platform with stats
function showActivePlatform(platform, session) {
  elements.noPlatform.style.display = 'none';
  elements.activePlatform.style.display = 'block';

  // Set platform branding
  document.body.className = 'platform-' + platform.id;
  // Preserve theme
  const theme = localStorage.getItem('attentionguard-theme') || 'dark';
  document.body.setAttribute('data-theme', theme);

  // Set platform icon as image
  const iconPath = PLATFORM_ICONS[platform.id];
  if (iconPath) {
    elements.platformIcon.textContent = '';
    const img = document.createElement('img');
    img.src = iconPath;
    img.alt = platform.name;
    img.width = 24;
    img.height = 24;
    elements.platformIcon.appendChild(img);
  } else {
    elements.platformIcon.textContent = '🛡️';
  }
  elements.platformName.textContent = platform.name;

  // Update stats
  if (session) {
    sessionStartTime = session.startTime;
    updateStats(session);
  } else {
    sessionStartTime = Date.now();
    updateStats({
      total: 0,
      ads: 0,
      algorithmic: 0,
      social: 0,
      organic: 0,
      startTime: Date.now()
    });
  }
}

// Update stats display with animations
function updateStats(session) {
  const total = session.total || 0;
  const ads = session.ads || 0;
  const algo = session.algorithmic || 0;
  const social = session.social || 0;
  const organic = session.organic || 0;
  const manipulated = ads + algo + social;
  const rate = total > 0 ? Math.round((manipulated / total) * 100) : 0;

  // Animate number changes
  animateValue(elements.scoreNumber, rate);
  animateValue(elements.adsCount, ads);
  animateValue(elements.algoCount, algo);
  animateValue(elements.socialCount, social);
  animateValue(elements.organicCount, organic);

  // Update progress circle
  const circumference = 283; // 2 * PI * 45
  const offset = circumference - (rate / 100) * circumference;
  elements.scoreProgress.style.strokeDashoffset = offset;

  // Color based on rate
  if (rate >= 70) {
    elements.scoreProgress.style.stroke = '#ef4444'; // Red
  } else if (rate >= 40) {
    elements.scoreProgress.style.stroke = '#f59e0b'; // Orange
  } else {
    elements.scoreProgress.style.stroke = '#22c55e'; // Green
  }

  // Update progress bar
  elements.progressFill.style.width = rate + '%';

  // Update counts
  elements.manipulatedCount.textContent = manipulated;
  elements.totalCount.textContent = total;

  // Update session time
  if (session.startTime) {
    sessionStartTime = session.startTime;
  }
  updateSessionTime();
}

// Update session time display
function updateSessionTime() {
  if (!sessionStartTime) return;

  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  elements.sessionTime.textContent = mins + ':' + secs.toString().padStart(2, '0');
}

// Animate number value change
function animateValue(element, newValue) {
  const currentValue = parseInt(element.textContent) || 0;
  if (currentValue !== newValue) {
    element.textContent = newValue;
    element.classList.add('pulse');
    setTimeout(function() {
      element.classList.remove('pulse');
    }, 300);
  }
}

// Start real-time updates
function startUpdates() {
  // Poll for updates every second
  updateInterval = setInterval(async function() {
    if (!currentPlatform) return;

    // Update session time
    updateSessionTime();

    // Fetch latest stats
    const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_PLATFORM' });
    if (response.session) {
      updateStats(response.session);
    }
  }, 1000);
}

// Stop updates
function stopUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Category cards - show modal on click
  document.querySelectorAll('.stat-card').forEach(function(card) {
    card.addEventListener('click', function() {
      const category = card.getAttribute('data-category');
      showCategoryModal(category);
    });
  });

  // Modal close
  elements.modalClose.addEventListener('click', hideModal);
  elements.modalOverlay.addEventListener('click', function(e) {
    if (e.target === elements.modalOverlay) {
      hideModal();
    }
  });

  // Reset button
  elements.resetBtn.addEventListener('click', async function() {
    if (!currentPlatform) return;

    await chrome.runtime.sendMessage({
      type: 'RESET_SESSION',
      data: { platform: currentPlatform.id }
    });

    // Reset local state
    sessionStartTime = Date.now();

    // Refresh stats
    const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_PLATFORM' });
    if (response.session) {
      updateStats(response.session);
    } else {
      updateStats({
        total: 0,
        ads: 0,
        algorithmic: 0,
        social: 0,
        organic: 0,
        startTime: Date.now()
      });
    }
  });

  // Persist toggle
  elements.persistToggle.addEventListener('change', async function(e) {
    await chrome.runtime.sendMessage({
      type: 'TOGGLE_PERSISTENCE',
      data: { persist: e.target.checked }
    });
  });

  // Escape key to close modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideModal();
    }
  });

  // Request button
  elements.requestBtn.addEventListener('click', function() {
    if (elements.requestBtn.classList.contains('submitted')) return;

    const hostname = getHostname(currentTabUrl);
    if (hostname) {
      // Open GitHub issues page with pre-filled info
      const issueTitle = encodeURIComponent('Request: Add AttentionGuard for ' + hostname);
      const issueBody = encodeURIComponent('**Website:** ' + hostname + '\n**URL:** ' + currentTabUrl + '\n\n**Why should we add this site?**\n(Please describe what manipulation patterns you notice on this site)');
      const issueUrl = 'https://github.com/agentkite/attentionguard/issues/new?title=' + issueTitle + '&body=' + issueBody + '&labels=platform-request';

      chrome.tabs.create({ url: issueUrl });

      // Mark as submitted
      elements.requestBtn.textContent = 'Request submitted!';
      elements.requestBtn.classList.add('submitted');
    }
  });
}

// Listen for stats broadcasts from background
chrome.runtime.onMessage.addListener(function(message) {
  if (message.type === 'STATS_BROADCAST' && currentPlatform) {
    if (message.data.platform === currentPlatform.id) {
      updateStats(message.data.stats);
    }
  }
});

// Cleanup on close
window.addEventListener('unload', function() {
  stopUpdates();
});

// Initialize
init();
