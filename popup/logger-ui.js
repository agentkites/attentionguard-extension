/**
 * AttentionGuard Research Logger - UI Controller
 * Multi-platform orchestrator, onboarding, scorecard
 */

(function() {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────

  const PLATFORMS = ['linkedin', 'reddit', 'facebook', 'instagram'];

  const PLATFORM_URLS = {
    linkedin: 'https://www.linkedin.com/feed/',
    reddit: 'https://www.reddit.com/',
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/'
  };

  const PLATFORM_NAMES = {
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    facebook: 'Facebook',
    instagram: 'Instagram'
  };

  const PLATFORM_ICONS = {
    linkedin: '../assets/platforms/linkedin.png',
    reddit: '../assets/platforms/reddit.png',
    facebook: '../assets/platforms/facebook.png',
    instagram: '../assets/platforms/instagram.png'
  };

  // ISO country list (top 50 by internet users)
  const COUNTRIES = [
    'IN', 'US', 'CN', 'BR', 'ID', 'RU', 'JP', 'NG', 'DE', 'MX',
    'GB', 'FR', 'TR', 'PH', 'VN', 'KR', 'EG', 'IT', 'TH', 'PK',
    'BD', 'ES', 'CO', 'AR', 'PL', 'UA', 'CA', 'MY', 'AU', 'SA',
    'PE', 'TW', 'NL', 'IR', 'CL', 'CZ', 'RO', 'BE', 'GR', 'PT',
    'SE', 'HU', 'IL', 'AT', 'CH', 'DK', 'FI', 'NO', 'NZ', 'SG',
    'AE', 'ZA', 'IE', 'HK', 'KE'
  ];

  const COUNTRY_NAMES = {
    IN: 'India', US: 'United States', CN: 'China', BR: 'Brazil', ID: 'Indonesia',
    RU: 'Russia', JP: 'Japan', NG: 'Nigeria', DE: 'Germany', MX: 'Mexico',
    GB: 'United Kingdom', FR: 'France', TR: 'Turkey', PH: 'Philippines', VN: 'Vietnam',
    KR: 'South Korea', EG: 'Egypt', IT: 'Italy', TH: 'Thailand', PK: 'Pakistan',
    BD: 'Bangladesh', ES: 'Spain', CO: 'Colombia', AR: 'Argentina', PL: 'Poland',
    UA: 'Ukraine', CA: 'Canada', MY: 'Malaysia', AU: 'Australia', SA: 'Saudi Arabia',
    PE: 'Peru', TW: 'Taiwan', NL: 'Netherlands', IR: 'Iran', CL: 'Chile',
    CZ: 'Czech Republic', RO: 'Romania', BE: 'Belgium', GR: 'Greece', PT: 'Portugal',
    SE: 'Sweden', HU: 'Hungary', IL: 'Israel', AT: 'Austria', CH: 'Switzerland',
    DK: 'Denmark', FI: 'Finland', NO: 'Norway', NZ: 'New Zealand', SG: 'Singapore',
    AE: 'UAE', ZA: 'South Africa', IE: 'Ireland', HK: 'Hong Kong', KE: 'Kenya'
  };

  // ─── State ────────────────────────────────────────────────────────

  let state = {
    userProfile: null,
    platformResults: {},  // { linkedin: { sessionId, segments, metrics, itemCount }, ... }
    activePlatform: null,
    scanStartTime: null,
    scanElapsedTimer: null
  };

  // ─── Storage ──────────────────────────────────────────────────────

  async function loadState() {
    const data = await chrome.storage.local.get('loggerState');
    if (data.loggerState) {
      state = Object.assign(state, data.loggerState);
    }
  }

  async function saveState() {
    await chrome.storage.local.set({
      loggerState: {
        userProfile: state.userProfile,
        platformResults: state.platformResults
      }
    });
  }

  // ─── View Management ─────────────────────────────────────────────

  function showView(viewId) {
    document.querySelectorAll('.view').forEach(function(v) {
      v.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
  }

  // ─── Onboarding ──────────────────────────────────────────────────

  function initOnboarding() {
    // Populate country dropdown
    const countrySelect = document.getElementById('field-country');
    const sorted = COUNTRIES.slice().sort(function(a, b) {
      return (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b);
    });
    sorted.forEach(function(code) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = COUNTRY_NAMES[code] || code;
      countrySelect.appendChild(opt);
    });

    // Handle form submit
    document.getElementById('onboarding-form').addEventListener('submit', function(e) {
      e.preventDefault();

      state.userProfile = {
        country: document.getElementById('field-country').value,
        ageRange: document.getElementById('field-age').value || null,
        usageFreq: document.getElementById('field-usage').value || null,
        vpnActive: document.getElementById('field-vpn').value === 'yes'
      };

      saveState();
      showChecklist();
    });
  }

  // Pre-fill onboarding form with existing profile data
  function prefillOnboarding() {
    if (!state.userProfile) return;
    var p = state.userProfile;
    if (p.country) document.getElementById('field-country').value = p.country;
    if (p.ageRange) document.getElementById('field-age').value = p.ageRange;
    if (p.usageFreq) document.getElementById('field-usage').value = p.usageFreq;
    document.getElementById('field-vpn').value = p.vpnActive ? 'yes' : 'no';
    document.getElementById('field-consent').checked = true;
  }

  // ─── Platform Checklist ───────────────────────────────────────────

  function showChecklist() {
    showView('view-checklist');
    updateChecklistUI();
  }

  function updateChecklistUI() {
    let completed = 0;

    PLATFORMS.forEach(function(platform) {
      const statusEl = document.getElementById('status-' + platform);
      const btnEl = document.getElementById('btn-' + platform);
      const progressEl = document.getElementById('progress-' + platform);
      const rowEl = document.querySelector('.platform-row[data-platform="' + platform + '"]');

      const result = state.platformResults[platform];

      var viewBtn = document.getElementById('btn-view-' + platform);

      if (result && result.complete) {
        completed++;
        var label = result.itemCount + ' items' + (result.partial ? ' (partial)' : '');
        statusEl.textContent = label;
        statusEl.className = 'platform-status done';
        btnEl.textContent = 'Rescan';
        btnEl.className = 'btn-platform';
        rowEl.className = 'platform-row complete';
        var color = result.partial ? '#e67e22' : '#27ae60';
        progressEl.innerHTML = '<div class="fill" style="width:100%;background:' + color + '"></div>';
        viewBtn.classList.remove('hidden');
      } else {
        statusEl.textContent = 'Not started';
        statusEl.className = 'platform-status';
        btnEl.textContent = 'Start';
        btnEl.className = 'btn-platform';
        rowEl.className = 'platform-row';
        progressEl.innerHTML = '';
        viewBtn.classList.add('hidden');
      }
    });

    var remaining = PLATFORMS.length - completed;
    document.getElementById('platforms-remaining').textContent =
      completed + ' of ' + PLATFORMS.length + ' completed';

    var scorecardBtn = document.getElementById('btn-view-scorecard');
    scorecardBtn.disabled = completed === 0;
    if (completed === PLATFORMS.length) {
      scorecardBtn.textContent = 'View Full Scorecard';
    } else if (completed > 0) {
      scorecardBtn.textContent = 'View Scorecard (' + completed + '/' + PLATFORMS.length + ')';
      scorecardBtn.disabled = false;
    }
  }

  function showPlatformResults(platform) {
    var result = state.platformResults[platform];
    if (!result) return;

    state.activePlatform = platform;
    showView('view-platform-done');

    var label = result.partial
      ? PLATFORM_NAMES[platform] + ' — ' + result.itemCount + ' items'
      : PLATFORM_NAMES[platform] + ' Complete!';
    document.getElementById('done-platform-name').textContent = label;
    document.getElementById('done-items').textContent = result.itemCount;

    var metrics = result.metrics || {};
    if (result.segments && result.segments[0]) {
      document.getElementById('done-organic').textContent = result.segments[0].organic + '%';
    } else {
      document.getElementById('done-organic').textContent = '\u2014';
    }
    document.getElementById('done-manip').textContent =
      metrics.avgManipDensity != null ? metrics.avgManipDensity.toFixed(2) : '\u2014';
    document.getElementById('done-halflife').textContent =
      metrics.organicHalfLife ? 'Item ' + metrics.organicHalfLife : 'Never';

    var nextPlatform = getNextPlatform(platform);
    var nextBtn = document.getElementById('btn-next-platform');
    if (nextPlatform) {
      nextBtn.textContent = 'Next: ' + PLATFORM_NAMES[nextPlatform];
      nextBtn.classList.remove('hidden');
      nextBtn.onclick = function() { startPlatformScan(nextPlatform); };
    } else {
      nextBtn.textContent = 'View Full Scorecard';
      nextBtn.onclick = function() { showScorecard(); };
    }
  }

  function initChecklist() {
    // Platform start/rescan buttons
    PLATFORMS.forEach(function(platform) {
      document.getElementById('btn-' + platform).addEventListener('click', function() {
        startPlatformScan(platform);
      });

      // View results buttons
      document.getElementById('btn-view-' + platform).addEventListener('click', function() {
        showPlatformResults(platform);
      });
    });

    // View scorecard button
    document.getElementById('btn-view-scorecard').addEventListener('click', function() {
      showScorecard();
    });

    // Edit profile
    document.getElementById('btn-edit-profile').addEventListener('click', function() {
      prefillOnboarding();
      showView('view-onboarding');
    });

    // Reset all data
    document.getElementById('btn-reset-all').addEventListener('click', function() {
      if (confirm('This will clear all scan data and profile settings. Continue?')) {
        state.platformResults = {};
        state.userProfile = null;
        chrome.storage.local.remove(['loggerState', 'loggerActiveScan']);
        showView('view-onboarding');
      }
    });
  }

  // ─── Platform Scanning ────────────────────────────────────────────

  function startPlatformScan(platform) {
    // Clear previous results for rescan
    if (state.platformResults[platform]) {
      delete state.platformResults[platform];
      saveState();
    }

    state.activePlatform = platform;
    state.scanStartTime = Date.now();

    // Show scanning view
    showView('view-scanning');
    document.getElementById('scan-platform-name').textContent = PLATFORM_NAMES[platform];
    document.getElementById('scan-platform-icon').src = PLATFORM_ICONS[platform];
    document.getElementById('scan-subtitle').textContent = 'Analyzing your feed...';
    document.getElementById('scan-progress-fill').style.width = '0%';
    document.getElementById('scan-progress-text').textContent = '0 / 500';
    document.getElementById('scan-organic').textContent = '\u2014';
    document.getElementById('scan-algorithmic').textContent = '\u2014';
    document.getElementById('scan-ads').textContent = '\u2014';
    document.getElementById('scan-social').textContent = '\u2014';
    document.getElementById('scan-elapsed').textContent = '0:00';
    resetChart();
    drawChart();

    // Show account age question
    document.getElementById('scan-account-age').classList.remove('hidden');

    // Start elapsed timer
    if (state.scanElapsedTimer) clearInterval(state.scanElapsedTimer);
    state.scanElapsedTimer = setInterval(updateElapsed, 1000);

    // Tell background to navigate to platform and start scan
    chrome.runtime.sendMessage({
      type: 'LOGGER_START_SCAN',
      data: { platform: platform, url: PLATFORM_URLS[platform] }
    }).catch(function() {});

    // Start polling for progress updates
    startPolling();
  }

  function updateElapsed() {
    if (!state.scanStartTime) return;
    var elapsed = Math.floor((Date.now() - state.scanStartTime) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    document.getElementById('scan-elapsed').textContent =
      mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  // ─── Live Chart ──────────────────────────────────────────────────

  var chartSegments = [];  // Array of { organic, algo, ad, social }
  var lastSegmentItemCount = 0;
  var organicCliffDetected = false;

  function resetChart() {
    chartSegments = [];
    lastSegmentItemCount = 0;
    organicCliffDetected = false;
    document.getElementById('scan-annotation').textContent = '';
    document.getElementById('scan-metric-callout').classList.add('hidden');
  }

  function drawChart() {
    var canvas = document.getElementById('scan-chart');
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var pad = { top: 5, right: 5, bottom: 20, left: 28 };
    var plotW = W - pad.left - pad.right;
    var plotH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad.top + (plotH * i / 4);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#555';
      ctx.font = '9px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((100 - i * 25) + '%', pad.left - 4, y + 3);
    }

    if (chartSegments.length === 0) {
      ctx.fillStyle = '#444';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', W / 2, H / 2);
      return;
    }

    var maxSegs = 50;
    var segW = plotW / maxSegs;

    // X-axis labels
    ctx.fillStyle = '#555';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    var xLabels = [1, 10, 20, 30, 40, 50];
    for (var i = 0; i < xLabels.length; i++) {
      var x = pad.left + (xLabels[i] - 0.5) * segW;
      ctx.fillText(xLabels[i] * 10, x, H - 4);
    }
    ctx.fillText('items →', W - pad.right - 10, H - 4);

    // Draw stacked area chart
    var colors = {
      organic: { fill: 'rgba(39,174,96,0.4)', line: '#27ae60' },
      algo: { fill: 'rgba(230,126,34,0.4)', line: '#e67e22' },
      ad: { fill: 'rgba(231,76,60,0.4)', line: '#e74c3c' },
      social: { fill: 'rgba(155,89,182,0.3)', line: '#9b59b6' }
    };

    // Draw lines (not stacked — each as its own line for clarity)
    var series = [
      { key: 'organic', color: colors.organic },
      { key: 'algo', color: colors.algo },
      { key: 'ad', color: colors.ad },
      { key: 'social', color: colors.social }
    ];

    for (var s = 0; s < series.length; s++) {
      var ser = series[s];
      ctx.beginPath();
      ctx.strokeStyle = ser.color.line;
      ctx.lineWidth = 2;

      for (var i = 0; i < chartSegments.length; i++) {
        var x = pad.left + (i + 0.5) * segW;
        var val = chartSegments[i][ser.key];
        var y = pad.top + plotH * (1 - val / 100);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Fill area under line
      if (chartSegments.length > 1) {
        ctx.lineTo(pad.left + (chartSegments.length - 0.5) * segW, pad.top + plotH);
        ctx.lineTo(pad.left + 0.5 * segW, pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = ser.color.fill;
        ctx.fill();
      }
    }

    // Draw organic cliff marker if detected
    if (organicCliffDetected) {
      var cliffSeg = -1;
      for (var i = 0; i < chartSegments.length; i++) {
        if (chartSegments[i].organic < 50) { cliffSeg = i; break; }
      }
      if (cliffSeg >= 0) {
        var cx = pad.left + (cliffSeg + 0.5) * segW;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, pad.top);
        ctx.lineTo(cx, pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('organic cliff', cx, pad.top + 10);
      }
    }
  }

  function updateAnnotation() {
    var ann = document.getElementById('scan-annotation');
    var callout = document.getElementById('scan-metric-callout');
    var calloutText = document.getElementById('scan-metric-text');
    var calloutIcon = document.getElementById('scan-metric-icon');

    if (chartSegments.length === 0) return;

    var latest = chartSegments[chartSegments.length - 1];
    var first = chartSegments[0];

    // Check for organic cliff
    if (!organicCliffDetected && latest.organic < 50) {
      organicCliffDetected = true;
      var itemNum = chartSegments.length * 10;
      ann.textContent = 'Organic cliff at item ' + itemNum;
      ann.style.color = '#e74c3c';

      callout.classList.remove('hidden', 'positive');
      calloutIcon.textContent = '\u26A0';
      calloutText.textContent = 'Your feed became majority non-organic at item ' + itemNum + '. Everything after this is mostly algorithm-chosen content.';
    } else if (chartSegments.length >= 2) {
      // Show trend
      var prev = chartSegments[chartSegments.length - 2];
      var diff = latest.organic - prev.organic;
      if (diff < -10) {
        ann.textContent = 'Organic dropping \u2193';
        ann.style.color = '#e74c3c';
      } else if (diff > 5) {
        ann.textContent = 'Organic recovering \u2191';
        ann.style.color = '#27ae60';
      } else {
        ann.textContent = 'Seg ' + chartSegments.length + '/50';
        ann.style.color = '#888';
      }
    }

    // Show insight callouts at milestones
    if (!organicCliffDetected && chartSegments.length >= 3) {
      var organicDrop = first.organic - latest.organic;
      if (organicDrop > 20) {
        callout.classList.remove('hidden', 'positive');
        calloutIcon.textContent = '\u{1F4C9}';
        calloutText.textContent = 'Organic content dropped ' + Math.round(organicDrop) + '% since you started scrolling. The algorithm is taking over.';
      }
    }

    if (chartSegments.length >= 5 && latest.organic > 70) {
      callout.classList.remove('hidden');
      callout.classList.add('positive');
      calloutIcon.textContent = '\u2705';
      calloutText.textContent = 'Your feed is still mostly organic at segment ' + chartSegments.length + '. This is uncommon!';
    }
  }

  function updateScanProgress(data) {
    var pct = Math.round(data.itemCount / data.targetItems * 100);
    document.getElementById('scan-progress-fill').style.width = pct + '%';
    document.getElementById('scan-progress-text').textContent =
      data.itemCount + ' / ' + data.targetItems;

    // Update subtitle with context
    if (data.itemCount > 0) {
      var seg = Math.ceil(data.itemCount / 10);
      document.getElementById('scan-subtitle').textContent =
        'Segment ' + seg + ' of 50 \u2022 Auto-scrolling...';
    }

    // Update live stats
    if (data.stats) {
      var total = data.stats.total || 1;
      var orgPct = Math.round(data.stats.organic / total * 100);
      var algoPct = Math.round(data.stats.algorithmic / total * 100);
      var adPct = Math.round(data.stats.ads / total * 100);
      var socPct = Math.round(data.stats.social / total * 100);

      document.getElementById('scan-organic').textContent = orgPct + '%';
      document.getElementById('scan-algorithmic').textContent = algoPct + '%';
      document.getElementById('scan-ads').textContent = adPct + '%';
      document.getElementById('scan-social').textContent = socPct + '%';

      // Update chart when a new segment completes (every 10 items)
      var currentSeg = Math.floor(data.itemCount / 10);
      if (currentSeg > lastSegmentItemCount && data.itemCount >= 10) {
        // Compute this segment's composition from running totals
        // We approximate: segment N = difference between cumulative at N*10 and (N-1)*10
        // For simplicity, use current running averages for the latest segment
        // A more accurate approach would need per-segment data from the content script
        if (data.segments && data.segments.length > chartSegments.length) {
          // Use actual segment data if available
          for (var i = chartSegments.length; i < data.segments.length; i++) {
            chartSegments.push({
              organic: data.segments[i].organic,
              algo: data.segments[i].algo,
              ad: data.segments[i].ad,
              social: data.segments[i].social_pressure
            });
          }
        } else {
          // Approximate from running totals
          chartSegments.push({
            organic: orgPct,
            algo: algoPct,
            ad: adPct,
            social: socPct
          });
        }
        lastSegmentItemCount = currentSeg;
        drawChart();
        updateAnnotation();
      }
    }
  }

  function onScanComplete(data) {
    if (state.scanElapsedTimer) clearInterval(state.scanElapsedTimer);

    var platform = data.platform;
    var accountAge = document.getElementById('field-account-age').value || null;

    state.platformResults[platform] = {
      sessionId: data.sessionId,
      segments: data.segments,
      metrics: data.metrics,
      itemCount: data.itemCount,
      accountAge: accountAge,
      complete: true,
      completedAt: Date.now()
    };

    saveState();

    // Show platform done view
    showView('view-platform-done');
    document.getElementById('done-platform-name').textContent =
      PLATFORM_NAMES[platform] + ' Complete!';
    document.getElementById('done-items').textContent = data.itemCount;

    var metrics = data.metrics;
    if (metrics) {
      document.getElementById('done-organic').textContent =
        (data.segments && data.segments[0]) ? data.segments[0].organic + '%' : '—';
      document.getElementById('done-manip').textContent =
        metrics.avgManipDensity !== null ? metrics.avgManipDensity.toFixed(2) : '—';
      document.getElementById('done-halflife').textContent =
        metrics.organicHalfLife !== null ? 'Item ' + metrics.organicHalfLife : 'Never';
    }

    // Determine next platform
    var nextPlatform = getNextPlatform(platform);
    var nextBtn = document.getElementById('btn-next-platform');
    if (nextPlatform) {
      nextBtn.textContent = 'Next: ' + PLATFORM_NAMES[nextPlatform];
      nextBtn.classList.remove('hidden');
      nextBtn.onclick = function() { startPlatformScan(nextPlatform); };
    } else {
      nextBtn.textContent = 'View Full Scorecard';
      nextBtn.onclick = function() { showScorecard(); };
    }
  }

  function getNextPlatform(currentPlatform) {
    var currentIdx = PLATFORMS.indexOf(currentPlatform);
    for (var i = currentIdx + 1; i < PLATFORMS.length; i++) {
      var p = PLATFORMS[i];
      if (!state.platformResults[p] || !state.platformResults[p].complete) {
        return p;
      }
    }
    // Wrap around
    for (var i = 0; i < currentIdx; i++) {
      var p = PLATFORMS[i];
      if (!state.platformResults[p] || !state.platformResults[p].complete) {
        return p;
      }
    }
    return null; // All done
  }

  function initScanning() {
    document.getElementById('btn-stop-scan').addEventListener('click', function() {
      chrome.runtime.sendMessage({ type: 'LOGGER_STOP_SCAN' }).catch(function() {});
      if (state.scanElapsedTimer) clearInterval(state.scanElapsedTimer);
      stopPolling();

      // Save partial results — poll one last time to get final state
      chrome.runtime.sendMessage({ type: 'LOGGER_GET_PROGRESS' }, function(response) {
        if (response && response.data && response.data.itemCount > 0) {
          var data = response.data;
          var platform = data.platform || state.activePlatform;
          var accountAge = document.getElementById('field-account-age').value || null;

          state.platformResults[platform] = {
            sessionId: data.sessionId,
            segments: data.segments || chartSegments.map(function(s) {
              return { organic: s.organic, algo: s.algo, ad: s.ad, social_pressure: s.social, manip_density: 0 };
            }),
            metrics: data.metrics || null,
            itemCount: data.itemCount,
            accountAge: accountAge,
            complete: true,  // Mark as complete even if partial
            partial: true,    // Flag that it was stopped early
            completedAt: Date.now()
          };
          saveState();

          // Show platform done view with partial results
          showView('view-platform-done');
          document.getElementById('done-platform-name').textContent =
            PLATFORM_NAMES[platform] + ' \u2014 ' + data.itemCount + ' items';

          document.getElementById('done-items').textContent = data.itemCount;
          var stats = data.stats;
          if (stats && stats.total > 0) {
            document.getElementById('done-organic').textContent =
              Math.round(stats.organic / stats.total * 100) + '%';
          }
          document.getElementById('done-manip').textContent = '\u2014';
          document.getElementById('done-halflife').textContent = '\u2014';

          var nextPlatform = getNextPlatform(platform);
          var nextBtn = document.getElementById('btn-next-platform');
          if (nextPlatform) {
            nextBtn.textContent = 'Next: ' + PLATFORM_NAMES[nextPlatform];
            nextBtn.onclick = function() { startPlatformScan(nextPlatform); };
          } else {
            nextBtn.textContent = 'View Scorecard';
            nextBtn.onclick = function() { showScorecard(); };
          }
        } else {
          showChecklist();
        }
      });
    });

    document.getElementById('btn-back-checklist').addEventListener('click', function() {
      showChecklist();
    });
  }

  // ─── Scorecard ────────────────────────────────────────────────────

  function showScorecard() {
    showView('view-scorecard');

    var tbody = document.getElementById('scorecard-body');
    tbody.innerHTML = '';
    var hasData = false;

    PLATFORMS.forEach(function(platform) {
      var result = state.platformResults[platform];
      if (!result || !result.itemCount) return;
      hasData = true;

      var tr = document.createElement('tr');
      var metrics = result.metrics || {};
      var partialTag = result.partial ? ' <span style="color:#e67e22;font-size:10px">(partial)</span>' : '';

      tr.innerHTML =
        '<td><strong>' + PLATFORM_NAMES[platform] + '</strong>' + partialTag + '</td>' +
        '<td>' + (metrics.organicHalfLife ? 'Item ' + metrics.organicHalfLife : 'N/A') + '</td>' +
        '<td>' + (metrics.avgManipDensity != null ? metrics.avgManipDensity.toFixed(2) : '\u2014') + '</td>' +
        '<td>' + (metrics.avgAdPct != null ? metrics.avgAdPct.toFixed(1) + '%' : '\u2014') + '</td>' +
        '<td>' + (metrics.organicDecayRate != null ? metrics.organicDecayRate.toFixed(2) + '%/seg' : '\u2014') + '</td>';

      tbody.appendChild(tr);
    });

    if (!hasData) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" style="text-align:center;color:#666;padding:20px">No scan data yet. Run at least one platform scan.</td>';
      tbody.appendChild(tr);
    }

    document.getElementById('btn-submit-data').disabled = !hasData;
    document.getElementById('submit-status').classList.add('hidden');
  }

  // ─── Data Export ──────────────────────────────────────────────────

  function getLastCompletedPlatform() {
    if (state.activePlatform && state.platformResults[state.activePlatform]) {
      return state.activePlatform;
    }
    for (var i = PLATFORMS.length - 1; i >= 0; i--) {
      if (state.platformResults[PLATFORMS[i]]) return PLATFORMS[i];
    }
    return state.activePlatform;
  }

  function exportCSV(platform) {
    var result = state.platformResults[platform];
    if (!result || !result.segments) return;

    var rows = ['segment,items_start,items_end,organic_pct,algo_pct,ad_pct,social_pct,fomo_pct,tracking_pct,variable_reward_pct,manip_density'];
    var segments = result.segments;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      rows.push([
        s.seg || (i + 1),
        i * 10 + 1,
        (i + 1) * 10,
        s.organic,
        s.algo,
        s.ad,
        s.social_pressure || 0,
        s.fomo || 0,
        s.tracking || 0,
        s.variable_reward || 0,
        s.manip_density || 0
      ].join(','));
    }

    var csv = rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'attentionguard-' + platform + '-segments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON(platform) {
    var result = state.platformResults[platform];
    if (!result) return;

    var payload = {
      platform: platform,
      sessionId: result.sessionId,
      itemCount: result.itemCount,
      partial: result.partial || false,
      completedAt: result.completedAt ? new Date(result.completedAt).toISOString() : null,
      segments: result.segments,
      metrics: result.metrics,
      userProfile: state.userProfile
    };

    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'attentionguard-' + platform + '-session.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function showSegmentView(platform) {
    var result = state.platformResults[platform];
    if (!result || !result.segments) return;

    showView('view-segments');
    document.getElementById('segments-title').textContent =
      PLATFORM_NAMES[platform] + ' — Segment Data';

    var tbody = document.getElementById('segments-body');
    tbody.innerHTML = '';

    var segments = result.segments;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      var tr = document.createElement('tr');

      var orgClass = s.organic >= 60 ? 'high' : (s.organic >= 40 ? 'medium' : 'low');
      var algoClass = s.algo <= 10 ? '' : (s.algo <= 30 ? 'medium' : 'low');
      var adClass = s.ad <= 10 ? '' : (s.ad <= 20 ? 'medium' : 'low');

      tr.innerHTML =
        '<td>' + (s.seg || (i + 1)) + '</td>' +
        '<td class="' + orgClass + '">' + s.organic + '</td>' +
        '<td class="' + algoClass + '">' + s.algo + '</td>' +
        '<td class="' + adClass + '">' + s.ad + '</td>' +
        '<td>' + (s.social_pressure || 0) + '</td>' +
        '<td>' + (s.manip_density != null ? s.manip_density.toFixed(2) : '—') + '</td>';

      tbody.appendChild(tr);
    }
  }

  function initDataExports() {
    document.getElementById('btn-export-csv').addEventListener('click', function() {
      exportCSV(getLastCompletedPlatform());
    });

    document.getElementById('btn-export-json').addEventListener('click', function() {
      exportJSON(getLastCompletedPlatform());
    });

    document.getElementById('btn-view-segments').addEventListener('click', function() {
      showSegmentView(getLastCompletedPlatform());
    });

    document.getElementById('btn-segments-back').addEventListener('click', function() {
      if (state.activePlatform && state.platformResults[state.activePlatform]) {
        showPlatformResults(state.activePlatform);
      } else {
        showChecklist();
      }
    });
  }

  function initScorecard() {
    document.getElementById('btn-submit-data').addEventListener('click', submitData);

    document.getElementById('btn-done').addEventListener('click', function() {
      showChecklist();
    });
  }

  async function submitData() {
    var submitBtn = document.getElementById('btn-submit-data');
    var statusEl = document.getElementById('submit-status');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    statusEl.classList.add('hidden');

    try {
      // Assemble payloads for all completed platforms
      var payloads = [];
      for (var i = 0; i < PLATFORMS.length; i++) {
        var platform = PLATFORMS[i];
        var result = state.platformResults[platform];
        if (!result || !result.complete) continue;

        var profile = Object.assign({}, state.userProfile, {
          accountAge: result.accountAge || null
        });

        payloads.push({
          session_id: result.sessionId,
          platform: platform,
          extension_version: chrome.runtime.getManifest().version,
          completed_at: new Date(result.completedAt).toISOString(),
          duration_minutes: null,
          total_items: result.itemCount,
          country: profile.country || null,
          age_range: profile.ageRange || null,
          account_age: profile.accountAge || null,
          network_size: null,
          usage_freq: profile.usageFreq || null,
          vpn_active: profile.vpnActive || false,
          segments: result.segments,
          metrics: result.metrics
        });
      }

      // Submit to background for forwarding
      var response = await chrome.runtime.sendMessage({
        type: 'LOGGER_SUBMIT_DATA',
        data: { payloads: payloads }
      });

      if (response && response.success) {
        showView('view-submitted');
      } else {
        throw new Error(response ? response.error : 'Unknown error');
      }
    } catch (err) {
      statusEl.textContent = 'Submission failed: ' + err.message;
      statusEl.className = 'error';
      statusEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Retry Submission';
    }
  }

  // ─── Message Listener ────────────────────────────────────────────

  chrome.runtime.onMessage.addListener(function(message) {
    switch (message.type) {
      case 'LOGGER_PROGRESS':
        updateScanProgress(message.data);
        break;
      case 'LOGGER_SESSION_COMPLETE':
        onScanComplete(message.data);
        break;
    }
  });

  // ─── Polling for progress (backup for when messages don't arrive) ──

  var pollTimer = null;

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function() {
      chrome.runtime.sendMessage({ type: 'LOGGER_GET_PROGRESS' }, function(response) {
        if (chrome.runtime.lastError) return;
        if (response && response.data && response.data.itemCount > 0) {
          updateScanProgress(response.data);
          if (response.data.complete) {
            onScanComplete(response.data);
            stopPolling();
          }
        }
      });
    }, 1000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────

  async function init() {
    await loadState();

    initOnboarding();
    initChecklist();
    initScanning();
    initDataExports();
    initScorecard();

    // Determine which view to show
    if (!state.userProfile) {
      showView('view-onboarding');
    } else {
      prefillOnboarding();
      showChecklist();
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);

})();
