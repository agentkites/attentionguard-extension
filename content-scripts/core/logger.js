/**
 * AttentionGuard Research Logger
 * IndexedDB logging, session tracking, segment aggregation, auto-scroll engine
 * Used for citizen science feed composition study
 */

(function() {
  'use strict';

  // Prevent double initialization
  if (window.AGLogger) return;

  const DB_NAME = 'attentionguard-research';
  const DB_VERSION = 1;
  const ITEMS_STORE = 'items';
  const SESSIONS_STORE = 'sessions';

  const TARGET_ITEMS = 500;
  const SEGMENT_SIZE = 10;
  const TOTAL_SEGMENTS = 50;

  // Research taxonomy labels (multi-label per item)
  const RESEARCH_LABELS = {
    ORGANIC: 'organic',
    ALGORITHMIC: 'algorithmic',
    AD: 'ad',
    SOCIAL_PRESSURE: 'social_pressure',
    FOMO_URGENCY: 'fomo_urgency',
    BEHAVIORAL_TRACKING: 'behavioral_tracking',
    VARIABLE_REWARD: 'variable_reward'
  };

  // Map existing AG classifications + categories to research labels
  function mapToResearchLabels(classification, labels) {
    const researchLabels = [];

    // Scan ALL labels independently — research taxonomy is multi-label
    // A single post can be AD + SOCIAL_PRESSURE, or ALGORITHMIC + BEHAVIORAL_TRACKING
    var hasAd = false, hasAlgo = false, hasSocial = false;

    for (const label of labels) {
      const cat = (label.category || '').toUpperCase();
      const type = label.type || '';

      // Ad signals
      if (type === 'ad' || cat.includes('ADVERTISING') || cat.includes('SPONSORED') ||
          cat.includes('PROMOTED')) {
        hasAd = true;
      }

      // Algorithmic signals — content surfaced by recommendation engine
      if (type === 'algorithmic' || cat.includes('SUGGESTED') || cat.includes('RECOMMENDED') ||
          cat.includes('PEOPLE_SUGGESTION') || cat.includes('JOB_RECOMMENDATION') ||
          cat.includes('PERSONALIZED') || cat.includes('BASED_ON')) {
        hasAlgo = true;
      }

      // Social pressure signals
      if (type === 'social' || cat.includes('SOCIAL') || cat.includes('REACTION') ||
          cat.includes('REPOST') || cat.includes('COMMENT') || cat.includes('GRAPH') ||
          cat.includes('FOLLOW') || cat.includes('MUTUAL') || cat.includes('CONNECTION')) {
        hasSocial = true;
        if (!researchLabels.includes(RESEARCH_LABELS.SOCIAL_PRESSURE)) {
          researchLabels.push(RESEARCH_LABELS.SOCIAL_PRESSURE);
        }
      }

      // FOMO/urgency signals
      if (cat.includes('FOMO') || cat.includes('URGENCY') || cat.includes('TRENDING') ||
          cat.includes('LIVE') || cat.includes('EXPIRE') || cat.includes('SCARCITY') ||
          cat.includes('LIMITED')) {
        if (!researchLabels.includes(RESEARCH_LABELS.FOMO_URGENCY)) {
          researchLabels.push(RESEARCH_LABELS.FOMO_URGENCY);
        }
      }

      // Behavioral tracking signals
      if (cat.includes('TRACKING') || cat.includes('RECOMMENDATION_SOURCE') ||
          cat.includes('BEHAVIORAL')) {
        if (!researchLabels.includes(RESEARCH_LABELS.BEHAVIORAL_TRACKING)) {
          researchLabels.push(RESEARCH_LABELS.BEHAVIORAL_TRACKING);
        }
      }

      // Variable reward signals
      if (cat.includes('VARIABLE_REWARD') || cat.includes('BADGE') || cat.includes('UNSEEN') ||
          cat.includes('NEW_FEED') || cat.includes('NOTIFICATION')) {
        if (!researchLabels.includes(RESEARCH_LABELS.VARIABLE_REWARD)) {
          researchLabels.push(RESEARCH_LABELS.VARIABLE_REWARD);
        }
      }
    }

    // Add primary content type labels (these are NOT mutually exclusive)
    if (hasAd) researchLabels.push(RESEARCH_LABELS.AD);
    if (hasAlgo) researchLabels.push(RESEARCH_LABELS.ALGORITHMIC);

    // Organic = no ad, no algorithmic, no social signals
    // A post from someone you follow, shown without any recommendation label
    if (!hasAd && !hasAlgo && !hasSocial) {
      researchLabels.push(RESEARCH_LABELS.ORGANIC);
    }

    // If only social signals (no ad/algo), still mark as organic base + social overlay
    // "Your connection liked this" is organic content amplified by social pressure
    if (!hasAd && !hasAlgo && hasSocial) {
      researchLabels.push(RESEARCH_LABELS.ORGANIC);
    }

    return researchLabels;
  }

  // ─── IndexedDB ──────────────────────────────────────────────────────

  let db = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function(event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(ITEMS_STORE)) {
          const itemStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id', autoIncrement: true });
          itemStore.createIndex('sessionId', 'sessionId', { unique: false });
          itemStore.createIndex('platform', 'platform', { unique: false });
        }

        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: 'sessionId' });
        }
      };

      request.onsuccess = function(event) {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = function(event) {
        reject(event.target.error);
      };
    });
  }

  function dbPut(storeName, data) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbGetAll(storeName, indexName, indexValue) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      var request;
      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  }

  function dbGet(storeName, key) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  }

  // ─── Session Management ─────────────────────────────────────────────

  function generateSessionId() {
    // Crypto-random UUID
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ─── Auto-Scroll Engine ─────────────────────────────────────────────

  // Find the actual scrollable element (some platforms use a container, not document)
  function findScrollContainer() {
    // Check common scroll containers
    var candidates = [
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
      document.querySelector('[data-testid="primaryColumn"]'),  // Twitter
      document.querySelector('[role="feed"]')                    // Facebook
    ];

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el) continue;
      var style = window.getComputedStyle(el);
      if ((style.overflowY === 'scroll' || style.overflowY === 'auto') &&
          el.scrollHeight > el.clientHeight + 100) {
        return el;
      }
    }

    // Fallback: search all elements
    var all = document.querySelectorAll('*');
    for (var i = 0; i < Math.min(all.length, 300); i++) {
      var el = all[i];
      if (el.scrollHeight > el.clientHeight + 200 && el.clientHeight > 300) {
        var style = window.getComputedStyle(el);
        if (style.overflowY === 'scroll' || style.overflowY === 'auto') {
          return el;
        }
      }
    }

    // Default to window
    return null;
  }

  const AutoScroller = {
    _running: false,
    _scrollTimer: null,
    _pauseTimer: null,
    _scrollTarget: null,  // The element to scroll (null = window)

    // Scroll parameters — aggressive but natural enough to avoid bot detection
    _config: {
      minScrollDelay: 800,    // Min time between scrolls (ms)
      maxScrollDelay: 1500,   // Max time between scrolls (ms)
      minScrollAmount: 600,   // Min pixels per scroll (~1 post height)
      maxScrollAmount: 1200,  // Max pixels per scroll (~2 posts)
      pauseChance: 0.05,      // 5% chance of random pause
      pauseMinMs: 500,        // Min pause duration
      pauseMaxMs: 1500,       // Max pause duration
      scrollbackChance: 0.03, // 3% chance of small scrollback
      scrollbackAmount: 100   // Max scrollback pixels
    },

    _rand: function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    _scrollBy: function(amount) {
      if (this._scrollTarget) {
        // Use scrollTop directly — some platforms (LinkedIn) intercept scrollBy
        // Animate with setTimeout (not rAF — rAF pauses in background tabs)
        var el = this._scrollTarget;
        var start = el.scrollTop;
        var steps = 8;
        var stepMs = 50;
        var stepNum = 0;

        function doStep() {
          stepNum++;
          var progress = stepNum / steps;
          var ease = 1 - Math.pow(1 - progress, 3);
          el.scrollTop = start + (amount * ease);
          if (stepNum < steps) {
            setTimeout(doStep, stepMs);
          }
        }
        doStep();
      } else {
        // For window scroll, set scrollTop directly too (scrollBy may not work in background)
        var current = document.documentElement.scrollTop || document.body.scrollTop || 0;
        var target = current + amount;
        var steps = 8;
        var stepMs = 50;
        var stepNum = 0;

        function doWindowStep() {
          stepNum++;
          var progress = stepNum / steps;
          var ease = 1 - Math.pow(1 - progress, 3);
          var val = current + (amount * ease);
          document.documentElement.scrollTop = val;
          document.body.scrollTop = val;
          if (stepNum < steps) {
            setTimeout(doWindowStep, stepMs);
          }
        }
        doWindowStep();
      }
    },

    start: function(onItemCountCheck) {
      if (this._running) return;
      this._running = true;
      this._onItemCountCheck = onItemCountCheck;
      this._scrollTarget = findScrollContainer();
      console.log('%c[AG AutoScroll]', 'color: #9B59B6;',
        'Scroll target:', this._scrollTarget ? this._scrollTarget.tagName + '.' + this._scrollTarget.className.substring(0, 30) : 'window');
      this._tick();
    },

    stop: function() {
      this._running = false;
      if (this._scrollTimer) clearTimeout(this._scrollTimer);
      if (this._pauseTimer) clearTimeout(this._pauseTimer);
      this._scrollTimer = null;
      this._pauseTimer = null;
    },

    _tick: function() {
      var self = this;
      if (!self._running) return;

      // Check if we should stop (target reached)
      if (self._onItemCountCheck && self._onItemCountCheck()) {
        self.stop();
        return;
      }

      // Random pause
      if (Math.random() < self._config.pauseChance) {
        var pauseMs = self._rand(self._config.pauseMinMs, self._config.pauseMaxMs);
        self._pauseTimer = setTimeout(function() {
          self._doScroll();
        }, pauseMs);
        return;
      }

      self._doScroll();
    },

    _doScroll: function() {
      var self = this;
      if (!self._running) return;

      // Random scrollback
      if (Math.random() < self._config.scrollbackChance) {
        var backAmount = self._rand(50, self._config.scrollbackAmount);
        self._scrollBy(-backAmount);

        // Then scroll forward after a beat
        setTimeout(function() {
          var amount = self._rand(self._config.minScrollAmount, self._config.maxScrollAmount);
          self._scrollBy(amount + backAmount);
        }, self._rand(400, 800));
      } else {
        var amount = self._rand(self._config.minScrollAmount, self._config.maxScrollAmount);
        self._scrollBy(amount);
      }

      // Schedule next tick
      var delay = self._rand(self._config.minScrollDelay, self._config.maxScrollDelay);
      self._scrollTimer = setTimeout(function() {
        self._tick();
      }, delay);
    },

    isRunning: function() {
      return this._running;
    }
  };

  // ─── Segment Aggregation ────────────────────────────────────────────

  function computeSegments(items) {
    var segments = [];
    for (var s = 0; s < TOTAL_SEGMENTS; s++) {
      var start = s * SEGMENT_SIZE;
      var end = Math.min(start + SEGMENT_SIZE, items.length);
      var segItems = items.slice(start, end);

      if (segItems.length === 0) break;

      var counts = {
        organic: 0,
        algo: 0,
        ad: 0,
        fomo: 0,
        social_pressure: 0,
        tracking: 0,
        variable_reward: 0
      };
      var manipSignals = 0;

      for (var i = 0; i < segItems.length; i++) {
        var rl = segItems[i].researchLabels;
        if (rl.indexOf('organic') !== -1) counts.organic++;
        if (rl.indexOf('algorithmic') !== -1) counts.algo++;
        if (rl.indexOf('ad') !== -1) counts.ad++;
        if (rl.indexOf('fomo_urgency') !== -1) { counts.fomo++; manipSignals++; }
        if (rl.indexOf('social_pressure') !== -1) { counts.social_pressure++; manipSignals++; }
        if (rl.indexOf('behavioral_tracking') !== -1) { counts.tracking++; manipSignals++; }
        if (rl.indexOf('variable_reward') !== -1) { counts.variable_reward++; manipSignals++; }
        // Count algorithmic as manipulation signal too
        if (rl.indexOf('algorithmic') !== -1) manipSignals++;
      }

      var n = segItems.length;
      segments.push({
        seg: s + 1,
        organic: Math.round(counts.organic / n * 100),
        algo: Math.round(counts.algo / n * 100),
        ad: Math.round(counts.ad / n * 100),
        fomo: Math.round(counts.fomo / n * 100),
        social_pressure: Math.round(counts.social_pressure / n * 100),
        tracking: Math.round(counts.tracking / n * 100),
        variable_reward: Math.round(counts.variable_reward / n * 100),
        manip_density: Math.round(manipSignals / n * 100) / 100
      });
    }

    return segments;
  }

  // ─── Metrics Computation ────────────────────────────────────────────

  function computeMetrics(segments) {
    if (segments.length === 0) return null;

    // Organic half-life: segment where organic drops to 50% of initial
    var initialOrganic = segments[0].organic;
    var halfLifeTarget = initialOrganic / 2;
    var organicHalfLife = null;
    for (var i = 0; i < segments.length; i++) {
      if (segments[i].organic <= halfLifeTarget) {
        organicHalfLife = (i + 1) * SEGMENT_SIZE;
        break;
      }
    }

    // Manipulation majority depth: first segment where organic < 50% and stays below
    var manipMajorityDepth = null;
    for (var i = 0; i < segments.length; i++) {
      if (segments[i].organic < 50) {
        var staysBelow = true;
        for (var j = i + 1; j < segments.length; j++) {
          if (segments[j].organic >= 50) { staysBelow = false; break; }
        }
        if (staysBelow) {
          manipMajorityDepth = (i + 1) * SEGMENT_SIZE;
          break;
        }
      }
    }

    // First algorithmic insertion
    var firstAlgoInsertion = null;
    // (computed from raw items, not segments — caller should provide)

    // Average manipulation density
    var totalDensity = 0;
    for (var i = 0; i < segments.length; i++) {
      totalDensity += segments[i].manip_density;
    }
    var avgManipDensity = Math.round(totalDensity / segments.length * 100) / 100;

    // Organic decay rate (linear regression slope of organic % over segments)
    var n = segments.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i;
      sumY += segments[i].organic;
      sumXY += i * segments[i].organic;
      sumX2 += i * i;
    }
    var organicDecayRate = null;
    var denom = (n * sumX2 - sumX * sumX);
    if (denom !== 0) {
      organicDecayRate = Math.round((n * sumXY - sumX * sumY) / denom * 100) / 100;
    }

    // Average ad density
    var totalAd = 0;
    for (var i = 0; i < segments.length; i++) {
      totalAd += segments[i].ad;
    }
    var avgAdPct = Math.round(totalAd / segments.length * 10) / 10;

    return {
      organicHalfLife: organicHalfLife,
      manipMajorityDepth: manipMajorityDepth,
      avgManipDensity: avgManipDensity,
      organicDecayRate: organicDecayRate,
      avgAdPct: avgAdPct,
      totalSegments: segments.length
    };
  }

  // ─── SHA-256 Hash ───────────────────────────────────────────────────

  async function sha256(text) {
    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    var hash = await crypto.subtle.digest('SHA-256', data);
    var bytes = new Uint8Array(hash);
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  // ─── Redacted Payload Assembly ──────────────────────────────────────

  async function assemblePayload(sessionData, items, segments, metrics, userProfile) {
    // Create raw data string for audit hash
    var rawStr = JSON.stringify(items.map(function(item) {
      return {
        idx: item.itemIndex,
        labels: item.researchLabels,
        ts: item.timestamp
      };
    }));
    var rawHash = await sha256(rawStr);

    var now = new Date();
    return {
      session_id: sessionData.sessionId,
      platform: sessionData.platform,
      extension_version: chrome.runtime.getManifest().version,
      session_hour: now.getHours(),
      day_of_week: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()],
      duration_minutes: Math.round((Date.now() - sessionData.startTime) / 60000),
      total_items: items.length,
      country: userProfile.country || null,
      age_range: userProfile.ageRange || null,
      account_age: userProfile.accountAge || null,
      network_size: sessionData.networkSize || null,
      usage_freq: userProfile.usageFreq || null,
      vpn_active: userProfile.vpnActive || false,
      ad_blocker: sessionData.adBlockerDetected || false,
      selector_health: sessionData.selectorHealth || 'ok',
      segments: segments,
      metrics: metrics,
      raw_sha256: rawHash
    };
  }

  // ─── Main Logger Object ─────────────────────────────────────────────

  const AGLogger = {
    RESEARCH_LABELS: RESEARCH_LABELS,
    TARGET_ITEMS: TARGET_ITEMS,
    SEGMENT_SIZE: SEGMENT_SIZE,

    _db: null,
    _currentSession: null,
    _itemCount: 0,
    _items: [],
    _onComplete: null,
    _onProgress: null,

    // Initialize the logger and open IndexedDB
    init: async function() {
      await openDB();
      this._db = db;
      return this;
    },

    // Start a new research session for a platform
    startSession: function(platform, networkSize) {
      var sessionId = generateSessionId();
      this._currentSession = {
        sessionId: sessionId,
        platform: platform,
        startTime: Date.now(),
        networkSize: networkSize || null,
        selectorHealth: 'ok',
        adBlockerDetected: false,
        status: 'running'
      };
      this._itemCount = 0;
      this._items = [];

      // Save session to IndexedDB
      dbPut(SESSIONS_STORE, this._currentSession);

      // Notify background
      chrome.runtime.sendMessage({
        type: 'LOGGER_SESSION_START',
        data: { platform: platform, sessionId: sessionId }
      }).catch(function() {});

      return sessionId;
    },

    // Log a classified item (called by platform scripts via core hook)
    logItem: function(id, classification, labels, platformDetails) {
      if (!this._currentSession) return false;
      if (this._itemCount >= TARGET_ITEMS) return false;

      this._itemCount++;
      var researchLabels = mapToResearchLabels(classification, labels);

      var item = {
        sessionId: this._currentSession.sessionId,
        platform: this._currentSession.platform,
        itemIndex: this._itemCount,
        scrollSegment: Math.ceil(this._itemCount / SEGMENT_SIZE),
        researchLabels: researchLabels,
        classification: classification,
        labelDetails: platformDetails || null,
        timestamp: Date.now(),
        viewportY: window.scrollY || (document.querySelector('main') ? document.querySelector('main').scrollTop : 0)
      };

      this._items.push(item);

      // Save to IndexedDB
      dbPut(ITEMS_STORE, item);

      // Report progress
      if (this._onProgress) {
        this._onProgress(this._itemCount, TARGET_ITEMS);
      }

      // Compute running stats for live dashboard
      var stats = { total: this._itemCount, organic: 0, algorithmic: 0, ads: 0, social: 0 };
      for (var si = 0; si < this._items.length; si++) {
        var rl = this._items[si].researchLabels;
        if (rl.indexOf('organic') !== -1) stats.organic++;
        if (rl.indexOf('algorithmic') !== -1) stats.algorithmic++;
        if (rl.indexOf('ad') !== -1) stats.ads++;
        if (rl.indexOf('social_pressure') !== -1) stats.social++;
      }

      // Notify background of progress
      chrome.runtime.sendMessage({
        type: 'LOGGER_PROGRESS',
        data: {
          platform: this._currentSession.platform,
          sessionId: this._currentSession.sessionId,
          itemCount: this._itemCount,
          targetItems: TARGET_ITEMS,
          stats: stats
        }
      }).catch(function() {});

      // Check completion
      if (this._itemCount >= TARGET_ITEMS) {
        this._completeSession();
      }

      return true;
    },

    // Complete the current session
    _completeSession: async function() {
      if (!this._currentSession) return;

      AutoScroller.stop();

      this._currentSession.status = 'complete';
      this._currentSession.endTime = Date.now();
      await dbPut(SESSIONS_STORE, this._currentSession);

      // Compute segments and metrics
      var segments = computeSegments(this._items);
      var metrics = computeMetrics(segments);

      // Detect ad blocker: 0 ads in 100+ items is suspicious
      if (this._itemCount >= 100) {
        var adCount = 0;
        for (var i = 0; i < this._items.length; i++) {
          if (this._items[i].researchLabels.indexOf('ad') !== -1) adCount++;
        }
        if (adCount === 0) {
          this._currentSession.adBlockerDetected = true;
          await dbPut(SESSIONS_STORE, this._currentSession);
        }
      }

      // Notify background
      chrome.runtime.sendMessage({
        type: 'LOGGER_SESSION_COMPLETE',
        data: {
          platform: this._currentSession.platform,
          sessionId: this._currentSession.sessionId,
          itemCount: this._itemCount,
          segments: segments,
          metrics: metrics
        }
      }).catch(function() {});

      if (this._onComplete) {
        this._onComplete(this._currentSession, segments, metrics);
      }
    },

    // Start auto-scrolling
    startAutoScroll: function() {
      var self = this;
      AutoScroller.start(function() {
        return self._itemCount >= TARGET_ITEMS;
      });
    },

    // Stop auto-scrolling
    stopAutoScroll: function() {
      AutoScroller.stop();
    },

    isAutoScrolling: function() {
      return AutoScroller.isRunning();
    },

    // Set callbacks
    onProgress: function(fn) { this._onProgress = fn; },
    onComplete: function(fn) { this._onComplete = fn; },

    // Mark selector health
    setSelectorHealth: function(health) {
      if (this._currentSession) {
        this._currentSession.selectorHealth = health;
        dbPut(SESSIONS_STORE, this._currentSession);
      }
    },

    // Get current item count
    getItemCount: function() { return this._itemCount; },

    // Get current session
    getCurrentSession: function() { return this._currentSession; },

    // Get all items for current session
    getItems: function() { return this._items.slice(); },

    // Compute segments for current items
    getSegments: function() { return computeSegments(this._items); },

    // Compute metrics for current items
    getMetrics: function() {
      var segments = this.getSegments();
      return computeMetrics(segments);
    },

    // Assemble redacted payload for submission
    assemblePayload: async function(userProfile) {
      if (!this._currentSession) return null;
      var segments = this.getSegments();
      var metrics = this.getMetrics();
      return assemblePayload(this._currentSession, this._items, segments, metrics, userProfile);
    },

    // Get all completed sessions from IndexedDB
    getAllSessions: async function() {
      return dbGetAll(SESSIONS_STORE);
    },

    // Get session by ID
    getSession: async function(sessionId) {
      return dbGet(SESSIONS_STORE, sessionId);
    },

    // Get items for a session
    getSessionItems: async function(sessionId) {
      return dbGetAll(ITEMS_STORE, 'sessionId', sessionId);
    },

    // Auto-scroll config access
    AutoScroller: AutoScroller,

    // Utility exports
    computeSegments: computeSegments,
    computeMetrics: computeMetrics,
    mapToResearchLabels: mapToResearchLabels,
    sha256: sha256
  };

  // Expose globally
  window.AGLogger = AGLogger;

  console.log('%c[AG Research Logger]', 'color: #9B59B6; font-weight: bold;', 'Logger loaded');
})();
