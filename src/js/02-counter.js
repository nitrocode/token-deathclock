  // ---- Counter updater -------------------------------------
  let _lastTokenPop = 0;

  function spawnTokenPop(ratePerSec) {
    const totalEl = document.getElementById('totalCounter');
    if (!totalEl) return;
    const container = totalEl.closest('.counter-box');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'token-pop';
    el.setAttribute('aria-hidden', 'true');
    // Slight random horizontal spread so successive pops don't stack perfectly
    el.style.left = (42 + Math.random() * 16) + '%';
    el.textContent = '+' + formatTokenCountShort(ratePerSec);
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  function updateCounters() {
    const now = Date.now();
    const tokens = getCurrentTokens();
    const currentRate = getDynamicRate(new Date(now));
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
      // Beyond BASE_DATE the rate is growing — reflect that in the subtitle
      const baseMs = new Date(BASE_DATE_ISO).getTime();
      if (now > baseMs) {
        rateEventEl.textContent = 'and growing · tokens/sec';
      } else {
        const rateEntry = [...RATE_SCHEDULE].reverse().find(
          (r) => now >= new Date(r.date).getTime()
        );
        if (rateEntry) rateEventEl.textContent = rateEntry.event + ' · tokens/sec';
      }
    }

    // Spawn a floating "+N" pop on the total counter once per second
    if (now - _lastTokenPop >= 1000) {
      _lastTokenPop = now;
      spawnTokenPop(currentRate);
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

