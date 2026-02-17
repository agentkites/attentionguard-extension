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
        { name: 'Promoted/Sponsored', severity: 'critical', desc: 'Paid ads and brand partnerships' }
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
        { name: 'Promoted/Sponsored', severity: 'critical', desc: 'Paid posts and company-sponsored content' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'LinkedIn Algorithm',
      description: 'Content LinkedIn pushes based on your profile and behavior.',
      categories: [
        { name: 'Suggested For You', severity: 'high', desc: 'AI-recommended posts' },
        { name: 'Recommended For You', severity: 'high', desc: 'Based on your profile data' },
        { name: 'Trending', severity: 'medium', desc: 'Trending pages/posts in your network' },
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
        { name: 'Sponsored', severity: 'critical', desc: 'Pre-roll, mid-roll ads and sponsored content' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'YouTube Algorithm',
      description: 'Videos pushed by YouTube to maximize watch time, not necessarily what you want.',
      categories: [
        { name: 'Recommended/Up Next', severity: 'high', desc: 'AI-suggested videos on home and sidebar' },
        { name: 'YouTube Shorts', severity: 'medium', desc: 'Addictive short-form video format' }
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
        { name: 'Sponsored Posts', severity: 'critical', desc: 'Paid advertisements in your feed (th_dat_spo)' },
        { name: 'Side Ads', severity: 'critical', desc: 'Advertisements in sidebar' },
        { name: 'Suggested For You', severity: 'critical', desc: 'Promoted pages and content' }
      ]
    },
    algorithmic: {
      icon: '🤖',
      title: 'Facebook Algorithm & Dark Patterns',
      description: 'Content and psychological tactics designed to maximize engagement and time on platform.',
      categories: [
        { name: 'Suggested Follows', severity: 'high', desc: 'Posts with Follow CTA from pages you don\'t follow' },
        { name: 'People You May Know', severity: 'high', desc: 'Friend suggestions to grow your network' },
        { name: 'Reels', severity: 'high', desc: 'Short-form videos designed for addiction' },
        { name: 'Social Proof', severity: 'high', desc: 'Showing "X people saw this", reaction counts' },
        { name: 'FOMO/Urgency', severity: 'high', desc: 'LIVE indicators, trending, expiring content' },
        { name: 'Variable Rewards', severity: 'high', desc: 'Notification badges, unread counts (slot machine mechanics)' },
        { name: 'Autoplay', severity: 'medium', desc: 'Videos that auto-play to hijack attention' },
        { name: 'Infinite Scroll', severity: 'medium', desc: 'Endless feed with no stopping point' },
        { name: 'Reminders', severity: 'low', desc: 'Birthday and memory reminders to pull you back' },
        { name: 'Friend Requests', severity: 'low', desc: 'Friend suggestions in side feed' },
        { name: 'Suggested Groups', severity: 'medium', desc: 'Group recommendations to increase engagement' },
        { name: 'Watch Feed', severity: 'medium', desc: 'Video content pushed via Watch tab' }
      ]
    },
    social: {
      icon: '👥',
      title: 'Facebook Social Signals',
      description: 'Content shown because friends interacted with it. Uses your social graph to manipulate.',
      categories: [
        { name: 'Friend Liked', severity: 'medium', desc: 'Posts your friends engaged with' },
        { name: 'Friend Commented', severity: 'medium', desc: 'Discussions friends joined' },
        { name: 'Social Context', severity: 'medium', desc: '"X friends like this page" pressure' },
        { name: 'Mutual Friends', severity: 'medium', desc: 'Showing mutual connections to build trust' },
        { name: 'Seen By', severity: 'medium', desc: 'Showing who viewed content (social pressure)' }
      ]
    },
    organic: {
      icon: '✓',
      title: 'Your Friends & Pages',
      description: 'Direct posts from friends and pages you follow - the content you actually chose to see.',
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
        { name: 'Promoted/Ad', severity: 'critical', desc: 'Paid tweet placements and promotions' }
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
  requestBtn: document.getElementById('requestBtn'),
  // Feed Composition elements
  totalBadge: document.getElementById('totalBadge'),
  pieChart: document.getElementById('pieChart'),
  intentionalPercent: document.getElementById('intentionalPercent'),
  intentionalValue: document.getElementById('intentionalValue'),
  algorithmicValue: document.getElementById('algorithmicValue'),
  echoedValue: document.getElementById('echoedValue'),
  sponsoredValue: document.getElementById('sponsoredValue'),
  healthScore: document.getElementById('healthScore'),
  healthFill: document.getElementById('healthFill'),
  healthDesc: document.getElementById('healthDesc'),
  // Tier 2 containers
  tier2Intentional: document.getElementById('tier2Intentional'),
  tier2Algorithmic: document.getElementById('tier2Algorithmic'),
  tier2Echoed: document.getElementById('tier2Echoed'),
  tier2Sponsored: document.getElementById('tier2Sponsored'),
  algorithmicBreakdown: document.getElementById('algorithmicBreakdown'),
  echoedBreakdown: document.getElementById('echoedBreakdown'),
  sponsoredBreakdown: document.getElementById('sponsoredBreakdown')
};

let currentPlatform = null;
let currentSession = null;
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

// ============================================
// FEED COMPOSITION HELPERS
// ============================================

/**
 * Gets the health class based on intentional percentage
 */
function getHealthClass(percent) {
  if (percent >= 70) return 'excellent';
  if (percent >= 50) return 'good';
  if (percent >= 30) return 'moderate';
  if (percent >= 15) return 'poor';
  return 'toxic';
}

/**
 * Gets the health description based on intentional percentage
 */
function getHealthDescription(percent) {
  if (percent >= 70) return 'Great! Most of your feed is content you intentionally chose.';
  if (percent >= 50) return 'Good balance. About half your feed is intentional.';
  if (percent >= 30) return 'The algorithm is curating more than you asked for.';
  if (percent >= 15) return 'Your feed is heavily curated by algorithms.';
  return 'Your feed is almost entirely algorithm-driven.';
}

/**
 * Updates the pie chart with CSS custom properties
 */
function updatePieChart(intentionalPct, curatedPct, socialPct, sponsoredPct) {
  if (!elements.pieChart) return;

  // Calculate cumulative degrees
  const intentionalDeg = (intentionalPct / 100) * 360;
  const curatedDeg = intentionalDeg + (curatedPct / 100) * 360;
  const socialDeg = curatedDeg + (socialPct / 100) * 360;

  // Set CSS custom properties
  elements.pieChart.style.setProperty('--deg-intentional', intentionalDeg + 'deg');
  elements.pieChart.style.setProperty('--deg-curated', curatedDeg + 'deg');
  elements.pieChart.style.setProperty('--deg-social', socialDeg + 'deg');
}

/**
 * Maps category names to Tier 1 (algorithmic, echoed, sponsored)
 * Returns null for organic/intentional categories
 */
function mapCategoryToTier1(category) {
  const cat = (category || '').toLowerCase();

  // Sponsored (Ads)
  if (cat.includes('ad') || cat.includes('sponsor') || cat.includes('promot') ||
      cat.includes('paid') || cat.includes('partner')) {
    return 'sponsored';
  }

  // Echoed (Social/Network-driven)
  if (cat.includes('social') || cat.includes('friend') || cat.includes('like') ||
      cat.includes('comment') || cat.includes('repost') || cat.includes('share') ||
      cat.includes('follow') || cat.includes('mutual') || cat.includes('connection') ||
      cat.includes('react') || cat.includes('love') || cat.includes('insightful')) {
    return 'echoed';
  }

  // Intentional (Organic)
  if (cat.includes('organic') || cat.includes('subscrib') || cat.includes('home_feed') ||
      cat === 'following' || cat === 'subscribed') {
    return null; // Intentional
  }

  // Everything else is Algorithmic
  return 'algorithmic';
}

/**
 * Renders ALL platform labels with their detection counts (full transparency)
 * Shows every label the platform can detect, even if count is 0
 */
function renderCategoryBreakdown(container, detectedCategories, tier1Key) {
  if (!container) return;

  // Clear existing content
  container.textContent = '';

  // Get platform-specific labels from PLATFORM_CATEGORIES
  var platformId = currentPlatform ? currentPlatform.id : null;
  var platformConfig = platformId ? PLATFORM_CATEGORIES[platformId] : null;

  // Map tier1Key to PLATFORM_CATEGORIES key
  var platformCategoryKey = tier1Key;
  if (tier1Key === 'algorithmic') platformCategoryKey = 'algorithmic';
  if (tier1Key === 'echoed') platformCategoryKey = 'social';
  if (tier1Key === 'sponsored') platformCategoryKey = 'ads';

  var categoryConfig = platformConfig ? platformConfig[platformCategoryKey] : null;

  if (!categoryConfig || !categoryConfig.categories) {
    // No platform-specific config, show detected ones only
    renderDetectedOnly(container, detectedCategories, tier1Key);
    return;
  }

  // Show ALL labels for this platform with counts
  categoryConfig.categories.forEach(function(catInfo) {
    // Find count for this label (try to match by name)
    var count = findCountForLabel(detectedCategories, catInfo.name);

    var div = document.createElement('div');
    div.className = 'tier2-item' + (count === 0 ? ' tier2-item-zero' : '');

    // Severity badge
    var severitySpan = document.createElement('span');
    severitySpan.className = 'tier2-severity ' + catInfo.severity;
    severitySpan.textContent = catInfo.severity.charAt(0).toUpperCase();
    severitySpan.title = catInfo.severity + ' severity';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'tier2-item-name';
    nameSpan.textContent = catInfo.name;
    nameSpan.title = catInfo.desc; // Show description on hover

    var countSpan = document.createElement('span');
    countSpan.className = 'tier2-item-count' + (count === 0 ? ' zero' : '');
    countSpan.textContent = count;

    div.appendChild(severitySpan);
    div.appendChild(nameSpan);
    div.appendChild(countSpan);
    container.appendChild(div);
  });
}

/**
 * Maps detected category codes to platform label names
 * This mapping aligns content-script category names with popup display names
 * Based on actual category names from platform/*.js content scripts
 */
var CATEGORY_MAPPINGS = {
  // === SHARED ACROSS PLATFORMS ===
  'ADVERTISING': ['Promoted/Sponsored', 'Promoted/Ad', 'Sponsored', 'Sponsored Posts', 'Sponsored Products', 'Sponsored Brands'],

  // === LINKEDIN ===
  'SUGGESTED': ['Suggested For You', 'Suggested', 'Suggested Topics'],
  'RECOMMENDED': ['Recommended For You', 'Recommended/Up Next'],
  'PERSONALIZED': ['Based On Your Profile', 'Suggested For You'],
  'JOB_RECOMMENDATION': ['Jobs Recommended'],
  'PEOPLE_SUGGESTION': ['People You May Know'],
  'SOCIAL_REACTION': ['X Likes This', 'X Loves This', 'X Finds Insightful', 'X Finds Funny', 'X Celebrates This', 'X Supports This'],
  'SOCIAL_REPOST': ['X Reposted', 'X Retweeted'],
  'SOCIAL_COMMENT': ['X Commented'],
  'SOCIAL_GRAPH': ['Connections Follow', 'Because You Follow', 'X Follows'],

  // === LINKEDIN (additional) ===
  'TRENDING': ['Trending'],

  // === REDDIT ===
  'GEO_TARGETING': ['Popular Near You'],
  'BEHAVIORAL_TRACKING': ['Because You Visited'],
  'SIMILAR_CONTENT': ['Similar to r/...'],
  'RELATED_CONTENT': ['Similar to r/...'],
  'ORGANIC': ['Subscribed Subreddits', 'Home Feed', 'Following Feed', 'Your Subscriptions', 'Following Timeline', 'Friends Posts', 'Followed Pages'],

  // === TWITTER/X ===
  'SOCIAL_LIKE': ['X Liked'],
  'SOCIAL_RETWEET': ['X Retweeted'],
  'SOCIAL_REPLY': ['X Replied'],
  'SOCIAL_FOLLOW': ['X Follows', 'Who To Follow'],
  'SOCIAL_MULTIPLE': ['X Liked', 'X Retweeted'],
  'ALGORITHM_SELECTED': ['For You Feed'],

  // === FACEBOOK ===
  'TH_DAT_SPO': ['Sponsored Posts'],
  'SIDE_AD': ['Side Ads'],
  'SIDE_ADS': ['Side Ads'],
  'SUGGESTED_PAGE': ['Suggested For You', 'Suggested Follows'],
  'SUGGESTED_FOLLOW': ['Suggested Follows'],
  'SUGGESTED_FOLLOWS': ['Suggested Follows'],
  'SUGGESTED_GROUPS': ['Suggested Groups'],
  'PYMK': ['People You May Know'],
  'PYMK_SIGNAL': ['People You May Know'],
  'PEOPLE_YOU_MAY_KNOW': ['People You May Know'],
  'REELS': ['Reels'],
  'SOCIAL_PROOF': ['Social Proof'],
  'FOMO': ['FOMO/Urgency'],
  'FOMO_URGENCY': ['FOMO/Urgency'],
  'VARIABLE_REWARD': ['Variable Rewards'],
  'VARIABLE_REWARDS': ['Variable Rewards'],
  'AUTOPLAY': ['Autoplay'],
  'INFINITE_SCROLL': ['Infinite Scroll'],
  'FRIEND_LIKED': ['Friend Liked'],
  'FRIEND_COMMENTED': ['Friend Commented'],
  'SOCIAL_CONTEXT': ['Social Context'],
  'MUTUAL_FRIENDS': ['Mutual Friends'],
  'SEEN_BY': ['Seen By'],
  'MEMORIES': ['Reminders'],
  'REMINDERS': ['Reminders'],
  'FRIEND_REQUEST': ['Friend Requests'],
  'FRIEND_REQUESTS': ['Friend Requests'],
  'FOLLOW_PROFILE': ['Suggested Follows'],
  'WATCH_FEED': ['Watch Feed'],

  // === INSTAGRAM ===
  'SPONSORED_POST': ['Sponsored Posts'],
  'SPONSORED_STORY': ['Sponsored Stories'],
  'EXPLORE': ['Explore Page'],
  'FROM_FOLLOWING': ['Following Feed', 'Stories'],
  'ACTIVITY_STATUS': ['Activity Status'],

  // === YOUTUBE ===
  'VIDEO_AD': ['Video Ads'],
  'SPONSORED_CARD': ['Sponsored Cards'],
  'SHORTS': ['YouTube Shorts'],
  'COMMUNITY': ['Community Posts'],
  'SUBSCRIBED': ['Subscribed Channels', 'Subscription Feed'],

  // === AMAZON ===
  'SPONSORED_PRODUCT': ['Sponsored Products'],
  'SPONSORED_BRAND': ['Sponsored Brands'],
  'PRICE_ANCHOR': ['Price Anchoring'],
  'SCARCITY': ['Only X Left'],
  'URGENCY': ['Order Within X Hours', 'Limited Time Deal'],
  'COUPON': ['Coupon Prompts'],
  'SEARCH_RESULT': ['Search Results'],
  'DIRECT_NAV': ['Direct Navigation']
};

/**
 * Tries to find a count for a platform label from detected categories
 */
function findCountForLabel(detectedCategories, labelName) {
  if (!detectedCategories) return 0;

  var totalCount = 0;

  for (var cat in detectedCategories) {
    if (detectedCategories.hasOwnProperty(cat)) {
      var catUpper = cat.toUpperCase();
      var catLower = cat.toLowerCase().replace(/_/g, ' ');
      var labelLower = labelName.toLowerCase();

      // 1. Check exact mapping
      var mappedLabels = CATEGORY_MAPPINGS[catUpper] || CATEGORY_MAPPINGS[cat];
      if (mappedLabels) {
        for (var i = 0; i < mappedLabels.length; i++) {
          if (mappedLabels[i].toLowerCase() === labelLower) {
            totalCount += detectedCategories[cat];
            break;
          }
        }
        continue;
      }

      // 2. Check if detected category contains or matches label name
      if (catLower.includes(labelLower) || labelLower.includes(catLower)) {
        totalCount += detectedCategories[cat];
        continue;
      }

      // 3. Fuzzy match - check word overlap
      var catWords = catLower.split(/[\s_]+/);
      var labelWords = labelLower.split(/[\s_]+/);
      var matchFound = catWords.some(function(cw) {
        return labelWords.some(function(lw) {
          return cw.length > 3 && lw.length > 3 && (cw.includes(lw) || lw.includes(cw));
        });
      });

      if (matchFound) {
        totalCount += detectedCategories[cat];
      }
    }
  }

  return totalCount;
}

/**
 * Fallback: render only detected categories (no platform config)
 */
function renderDetectedOnly(container, categories, tier1Filter) {
  var items = [];
  for (var cat in categories) {
    if (categories.hasOwnProperty(cat) && mapCategoryToTier1(cat) === tier1Filter) {
      items.push({ name: cat, count: categories[cat] });
    }
  }

  items.sort(function(a, b) { return b.count - a.count; });

  items.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'tier2-item';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'tier2-item-name';
    nameSpan.textContent = formatCategoryName(item.name);

    var countSpan = document.createElement('span');
    countSpan.className = 'tier2-item-count';
    countSpan.textContent = item.count;

    div.appendChild(nameSpan);
    div.appendChild(countSpan);
    container.appendChild(div);
  });

  if (items.length === 0) {
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'tier2-item tier2-item-zero';
    emptyDiv.textContent = 'No signals detected';
    container.appendChild(emptyDiv);
  }
}

/**
 * Formats category name for display
 */
function formatCategoryName(name) {
  // Handle common patterns
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Updates the Feed Composition UI
 */
function updateFeedComposition(session) {
  const total = session.total || 0;
  const ads = session.ads || 0;
  const algo = session.algorithmic || 0;
  const social = session.social || 0;
  const organic = session.organic || 0;
  const categories = session.categories || {};

  // Calculate percentages
  const intentionalPct = total > 0 ? Math.round((organic / total) * 100) : 0;
  const curatedPct = total > 0 ? Math.round((algo / total) * 100) : 0;
  const socialPct = total > 0 ? Math.round((social / total) * 100) : 0;
  const sponsoredPct = total > 0 ? Math.round((ads / total) * 100) : 0;

  // Update total badge
  if (elements.totalBadge) {
    elements.totalBadge.textContent = total + ' posts';
  }

  // Update pie chart
  updatePieChart(intentionalPct, curatedPct, socialPct, sponsoredPct);

  // Update center value
  if (elements.intentionalPercent) {
    elements.intentionalPercent.textContent = intentionalPct + '%';
  }

  // Update legend values
  if (elements.intentionalValue) elements.intentionalValue.textContent = intentionalPct + '%';
  if (elements.algorithmicValue) elements.algorithmicValue.textContent = curatedPct + '%';
  if (elements.echoedValue) elements.echoedValue.textContent = socialPct + '%';
  if (elements.sponsoredValue) elements.sponsoredValue.textContent = sponsoredPct + '%';

  // Update Tier 2 breakdowns with actual category data
  renderCategoryBreakdown(elements.algorithmicBreakdown, categories, 'algorithmic');
  renderCategoryBreakdown(elements.echoedBreakdown, categories, 'echoed');
  renderCategoryBreakdown(elements.sponsoredBreakdown, categories, 'sponsored');

  // Update health section
  const healthClass = getHealthClass(intentionalPct);
  const healthDesc = getHealthDescription(intentionalPct);

  if (elements.healthScore) {
    elements.healthScore.textContent = intentionalPct + '%';
    elements.healthScore.className = 'health-score ' + healthClass;
  }

  if (elements.healthFill) {
    elements.healthFill.style.width = intentionalPct + '%';
    elements.healthFill.className = 'health-fill ' + healthClass;
  }

  if (elements.healthDesc) {
    elements.healthDesc.textContent = healthDesc;
  }
}

/**
 * Initialize legend expand/collapse handlers
 */
function initLegendHandlers() {
  var legendItems = document.querySelectorAll('.legend-item');
  legendItems.forEach(function(item) {
    var row = item.querySelector('.legend-row');
    if (row) {
      row.addEventListener('click', function() {
        var tier2 = item.querySelector('.legend-tier2');
        var isExpanded = item.classList.contains('expanded');

        // Collapse all others
        legendItems.forEach(function(other) {
          if (other !== item) {
            other.classList.remove('expanded');
            var otherTier2 = other.querySelector('.legend-tier2');
            if (otherTier2) otherTier2.classList.add('collapsed');
          }
        });

        // Toggle current
        if (isExpanded) {
          item.classList.remove('expanded');
          if (tier2) tier2.classList.add('collapsed');
        } else {
          item.classList.add('expanded');
          if (tier2) tier2.classList.remove('collapsed');
        }
      });
    }
  });
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

  // Setup Feed Composition legend handlers
  initLegendHandlers();

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

  // Update Feed Composition UI
  updateFeedComposition(session);
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
      const issueUrl = 'https://github.com/agentkites/attentionguard-extension/issues/new?title=' + issueTitle + '&body=' + issueBody + '&labels=platform-request';

      chrome.tabs.create({ url: issueUrl });

      // Mark as submitted
      elements.requestBtn.textContent = 'Request submitted!';
      elements.requestBtn.classList.add('submitted');
    }
  });
}

// Listen for stats broadcasts and tab changes from background
chrome.runtime.onMessage.addListener(function(message) {
  if (message.type === 'STATS_BROADCAST' && currentPlatform) {
    if (message.data.platform === currentPlatform.id) {
      updateStats(message.data.stats);
    }
  }

  // Handle tab change - refresh display
  if (message.type === 'TAB_CHANGED') {
    const { platform, session, url } = message.data;
    currentPlatform = platform;
    currentSession = session;

    if (platform) {
      // Show stats for new platform
      showActivePlatform(platform, session);
    } else {
      // No supported platform on new tab
      showNoPlatform(url);
    }
  }
});

// Cleanup on close
window.addEventListener('unload', function() {
  stopUpdates();
});

// Initialize
init();
