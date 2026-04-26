  // ---- Counter updater -------------------------------------
  // Pre-computed reversed schedule for rate-event label lookup (avoids
  // cloning and reversing on every animation frame in updateCounters).
  const REVERSED_RATE_SCHEDULE = [...RATE_SCHEDULE].reverse();

  // Per-counter throttle timestamps for the floating +N pop animations.
  let _lastTokenPop   = 0; // total counter
  let _lastSessionPop = 0; // session counter
  let _lastStatPop    = 0; // impact stats
  let _lastRatePop    = 0; // rate counter (slower cadence)

  // Spawn a floating "+N" element inside `container` that floats up and fades out.
  // `cssClass` is appended to 'token-pop ' so colour variants can be applied via CSS.
  function spawnPop(container, text, cssClass) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'token-pop' + (cssClass ? ' ' + cssClass : '');
    el.setAttribute('aria-hidden', 'true');
    // Slight random horizontal spread so successive pops don't overlap perfectly.
    // 42–58 % keeps the pop centred over the number while adding visible variety.
    const POP_LEFT_BASE   = 42; // leftmost starting position (%)
    const POP_LEFT_SPREAD = 16; // random spread width (%)
    el.style.left = (POP_LEFT_BASE + Math.random() * POP_LEFT_SPREAD) + '%';
    el.textContent = text;
    container.appendChild(el);
    // Clean up the element when the animation ends or is cancelled.
    // A fallback timeout handles cases where neither event fires (e.g. hidden tab).
    const POP_ANIM_MS = 1500; // matches animation duration in CSS
    const POP_CLEANUP_BUFFER_MS = 200;
    let removed = false;
    const removeEl = () => {
      if (!removed) { removed = true; clearTimeout(fallback); el.remove(); }
    };
    el.addEventListener('animationend',    removeEl, { once: true });
    el.addEventListener('animationcancel', removeEl, { once: true });
    const fallback = setTimeout(removeEl, POP_ANIM_MS + POP_CLEANUP_BUFFER_MS);
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
    if (sessionEl) sessionEl.textContent = appendExp(sessionTokens, formatTokenCount(sessionTokens));
    if (sessionTimeEl) {
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      const suffix = firstArrivalTime !== pageLoadTime ? 'since first visit' : 'on page';
      sessionTimeEl.textContent = m > 0 ? `${m}m ${s}s ${suffix}` : `${s}s ${suffix}`;
    }
    if (rateEl) rateEl.textContent = appendExp(currentRate, formatTokenCount(currentRate));
    if (rateEventEl) {
      // Beyond BASE_DATE the rate is growing — reflect that in the subtitle
      const baseMs = new Date(BASE_DATE_ISO).getTime();
      if (now > baseMs) {
        rateEventEl.textContent = 'and growing · tokens/sec';
      } else {
        const rateEntry = REVERSED_RATE_SCHEDULE.find(
          (r) => now >= new Date(r.date).getTime()
        );
        if (rateEntry) rateEventEl.textContent = rateEntry.event + ' · tokens/sec';
      }
    }

    // Floating "+N" pops — spawned once per second (rate counter: once per minute)
    if (now - _lastTokenPop >= 1000) {
      _lastTokenPop = now;
      const totalBox = totalEl && totalEl.closest('.counter-box');
      spawnPop(totalBox, '+' + formatTokenCountShort(currentRate));
    }

    if (now - _lastSessionPop >= 1000) {
      _lastSessionPop = now;
      const sessionBox = sessionEl && sessionEl.closest('.counter-box');
      spawnPop(sessionBox, '+' + formatTokenCountShort(currentRate), 'token-pop--session');
    }

    // Rate counter: spawn a pop every 60 s showing how much the rate grew that minute.
    // (The rate grows ~30 %/yr; a per-minute delta is the smallest visible non-zero unit.)
    if (now - _lastRatePop >= 60000) {
      _lastRatePop = now;
      const rateOneMinAgo = getDynamicRate(new Date(now - 60000));
      const rateDelta = Math.round(currentRate - rateOneMinAgo);
      if (rateDelta > 0) {
        const rateBox = rateEl && rateEl.closest('.counter-box');
        spawnPop(rateBox, '+' + formatTokenCountShort(rateDelta) + '/s', 'token-pop--rate');
      }
    }

    // Impact stats
    const impact = calculateEnvironmentalImpact(tokens);
    setStatText('statKwh',   formatTokenCountShort(impact.kWh));
    setStatText('statCo2',   formatTokenCountShort(impact.co2Kg));
    setStatText('statWater', formatTokenCountShort(impact.waterL));
    setStatText('statTrees', formatTokenCountShort(impact.treesEquivalent));

    // Floating pops for impact stats — per-second deltas based on current rate
    if (now - _lastStatPop >= 1000) {
      _lastStatPop = now;
      const impactPerSec = calculateEnvironmentalImpact(currentRate);
      [
        { id: 'statKwh',   val: impactPerSec.kWh },
        { id: 'statCo2',   val: impactPerSec.co2Kg },
        { id: 'statWater', val: impactPerSec.waterL },
        { id: 'statTrees', val: impactPerSec.treesEquivalent },
      ].forEach(({ id, val }) => {
        if (val < 0.5) return; // skip if the per-second increase rounds to zero
        const statEl = document.getElementById(id);
        const statBox = statEl && statEl.closest('.impact-stat');
        spawnPop(statBox, '+' + formatTokenCountShort(Math.round(val)), 'token-pop--stat');
      });
    }

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

