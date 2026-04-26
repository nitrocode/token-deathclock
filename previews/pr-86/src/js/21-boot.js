  // ---- Bootstrap ------------------------------------------
  function init() {
    // Restore persisted theme preference before rendering anything
    try {
      const savedTheme = localStorage.getItem(LS_THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') applyTheme(savedTheme);
    } catch (_) { /* ignore */ }

    // Theme toggle
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    // Hide completed milestones toggle
    const hideCompletedCb = document.getElementById('hideCompletedMilestones');
    if (hideCompletedCb) {
      hideCompletedCb.addEventListener('change', function () {
        const grid = document.getElementById('milestonesGrid');
        if (grid) grid.classList.toggle('hide-completed', this.checked);
      });
    }
    // Tab navigation
    initTabs();

    // Render static sections once
    renderMilestones();
    renderPredictionsTable();
    renderTips();
    renderChangelog();
    renderFooterStats();
    renderSectionAnchors();

    // Chart init is isolated so a missing date-adapter or other chart error
    // cannot prevent the counters and life-blocks from running.
    try {
      initChart();
    } catch (err) {
      console.error('Chart init failed:', err);
    }

    initLifeBlocks();

    // Fun features
    initBadges();
    initTicker();
    initEquivalences();
    initSharePanel();
    initFooterShare();
    initReceiptModal();
    initCalculator();
    initAccelerator();
    // Engagement features
    initPresenceStrip();
    initEventLog();
    // Scary & satirical features (PRDs 1–7)
    initEmergencyBroadcast();
    initSessionTabStrip();
    initApologies();
    initShame();
    initVillainLeaderboard();
    initIntervention();

    // Persist accelerator game state every 30 seconds and on page hide
    setInterval(saveAcceleratorState, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveAcceleratorState();
    });

    // Kick off the live counter RAF loop
    requestAnimationFrame(updateCounters);

    // Check time-based badges and milestone alert every second
    setInterval(() => {
      checkTimeBadges();
      checkMilestoneAlert();
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
