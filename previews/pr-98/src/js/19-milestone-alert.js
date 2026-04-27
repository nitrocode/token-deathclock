  // ============================================================
  // FEATURE: Milestone Crossing Flash Overlay
  // ============================================================

  const milestoneAlertShown = new Set(); // ids of milestones already flashed this session

  function checkMilestoneAlert() {
    const tokens = getCurrentTokens();
    const next   = getNextMilestone(tokens, MILESTONES);

    if (!next) return;

    const secsToNext = (next.tokens - tokens) / TOKENS_PER_SECOND;

    if (secsToNext <= 0) {
      // Milestone just crossed — fire flash once per milestone
      if (!milestoneAlertShown.has(next.id)) {
        milestoneAlertShown.add(next.id);
        showMilestoneFlash(next);
        awardBadge('witness');
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

