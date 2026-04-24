  // ============================================================
  // FEATURE: "Wait for It" — Milestone Countdown Alert
  // ============================================================

  const MILESTONE_ALERT_THRESHOLD_SECS = 120;
  const milestoneAlertShown = new Set(); // ids of milestones already flashed this session

  function checkMilestoneAlert() {
    const tokens = getCurrentTokens();
    const next   = getNextMilestone(tokens, MILESTONES);
    const bannerEl   = document.getElementById('milestone-alert-banner');
    const msgEl      = document.getElementById('milestone-alert-msg');
    const countEl    = document.getElementById('milestone-alert-countdown');
    const iconEl     = document.getElementById('milestone-alert-icon');

    if (!bannerEl) return;

    if (!next) {
      if (!bannerEl.hidden) bannerEl.hidden = true;
      return;
    }

    const secsToNext = (next.tokens - tokens) / TOKENS_PER_SECOND;

    if (secsToNext > MILESTONE_ALERT_THRESHOLD_SECS) {
      if (!bannerEl.hidden) bannerEl.hidden = true;
      return;
    }

    if (secsToNext <= 0) {
      // Milestone just crossed — fire flash once per milestone
      if (!milestoneAlertShown.has(next.id)) {
        milestoneAlertShown.add(next.id);
        bannerEl.hidden = true;
        showMilestoneFlash(next);
        awardBadge('witness');
      }
      return;
    }

    // Within alert window — show / update the banner
    bannerEl.hidden = false;
    if (iconEl) iconEl.textContent = next.icon;
    if (msgEl) {
      msgEl.textContent =
        '\u26A0\uFE0F ' + next.name + ' threshold crossing imminent \u2014 stay to witness it!';
    }
    if (countEl) {
      const s = Math.ceil(secsToNext);
      if (s < 60) {
        countEl.textContent = s + 's';
      } else {
        const mins = Math.floor(s / 60);
        const secs = String(s % 60).padStart(2, '0');
        countEl.textContent = `${mins}m\u00A0${secs}s`;
      }
    }
  }

  function showMilestoneFlash(milestone) {
    const overlay  = document.getElementById('milestone-flash-overlay');
    const nameEl   = document.getElementById('milestone-flash-name');
    const iconEl   = document.getElementById('milestone-flash-icon');
    const descEl   = document.getElementById('milestone-flash-desc');
    const closeBtn = document.getElementById('milestone-flash-close');
    if (!overlay) return;

    if (nameEl) nameEl.textContent = milestone.name;
    if (iconEl) iconEl.textContent = milestone.icon;
    if (descEl) descEl.textContent = `${milestone.shortDesc} \u2014 ${milestone.description}`;

    overlay.hidden = false;
    if (closeBtn) {
      closeBtn.focus();
      closeBtn.onclick = () => { overlay.hidden = true; };
    }

    // Haptic feedback where supported
    if (typeof navigator.vibrate === 'function') navigator.vibrate([200, 100, 200]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => { overlay.hidden = true; }, 6000);
  }

