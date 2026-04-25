  // ---- Counter updater -------------------------------------
  function updateCounters() {
    const now = Date.now();
    const tokens = getCurrentTokens();
    const currentRate = getRateAtDate(new Date(now));
    // Use firstArrivalTime so the counter accumulates across return visits
    const sessionTokens = Math.round((now - firstArrivalTime) / 1000 * currentRate);
    const elapsed = Math.floor((now - firstArrivalTime) / 1000);

    const totalEl = document.getElementById('totalCounter');
    const sessionEl = document.getElementById('sessionCounter');
    const sessionTimeEl = document.getElementById('sessionTime');
    const rateEl = document.getElementById('rateCounter');
    const rateEventEl = document.getElementById('rateEvent');

    if (totalEl) totalEl.textContent = numFmt(tokens);
    if (sessionEl) sessionEl.textContent = formatTokenCount(sessionTokens);
    if (sessionTimeEl) {
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      const suffix = firstArrivalTime !== pageLoadTime ? 'since first visit' : 'on page';
      sessionTimeEl.textContent = m > 0 ? `${m}m ${s}s ${suffix}` : `${s}s ${suffix}`;
    }
    if (rateEl) rateEl.textContent = formatTokenCount(currentRate);
    if (rateEventEl) {
      // Show the event that triggered this rate step
      const rateEntry = [...RATE_SCHEDULE].reverse().find(
        (r) => now >= new Date(r.date).getTime()
      );
      if (rateEntry) rateEventEl.textContent = rateEntry.event + ' · tokens/sec';
    }

    // Impact stats
    const impact = calculateEnvironmentalImpact(tokens);
    setStatText('statKwh',   formatTokenCountShort(impact.kWh));
    setStatText('statCo2',   formatTokenCountShort(impact.co2Kg));
    setStatText('statWater', formatTokenCountShort(impact.waterL));
    setStatText('statTrees', formatTokenCountShort(impact.treesEquivalent));

    // Update doomsday clock (PRD 1)
    updateDoomsdayClock(tokens);

    // Update milestone progress bars
    const triggered = getTriggeredMilestones(tokens, MILESTONES);
    MILESTONES.forEach((m, idx) => {
      const card = document.getElementById('milestone-' + m.id);
      if (!card) return;
      const wasTriggered = card.classList.contains('triggered');
      const isTriggered = tokens >= m.tokens;

      if (isTriggered && !wasTriggered) {
        card.classList.add('triggered');
        if (!shownEmergencyBroadcasts.has(m.id)) {
          shownEmergencyBroadcasts.add(m.id);
          showEmergencyBroadcast(m);
        }
      }

      const fill = card.querySelector('.progress-fill');
      if (fill) {
        const prev = idx === 0 ? 0 : MILESTONES[idx - 1].tokens;
        const pct = milestoneProgress(tokens, prev, m.tokens);
        fill.style.width = pct + '%';
        const pctLabel = card.querySelector('.progress-pct');
        if (pctLabel) pctLabel.textContent = pct.toFixed(1) + '%';
      }
    });

    requestAnimationFrame(updateCounters);
  }

  function setStatText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

