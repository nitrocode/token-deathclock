  // ============================================================
  // ACCELERATE THE DOOM
  // ============================================================

  // ---- Constants -------------------------------------------

  /** Base tokens added to personal counter per tap (before multipliers). */
  const ACC_BASE_TOKENS_PER_TAP = 1_000_000;

  /** Doom Points earned per token (1 DP per 1 million tokens). */
  const ACC_DP_PER_TOKEN = 1 / 1_000_000;

  const UPGRADES = [
    { id: 'gpu_rack',    icon: '\uD83D\uDDA5\uFE0F', name: 'Extra GPU Rack',          cost:    10, multiplier:   2, flavour: 'More cores, more chaos'               },
    { id: 'liquid_cool', icon: '\u26A1',              name: 'Liquid Cooling Override', cost:    50, multiplier:   5, flavour: 'Ignore the thermal warnings'           },
    { id: 'global_dc',   icon: '\uD83C\uDF0D',        name: 'Global Data Centre',      cost:   200, multiplier:  10, flavour: 'Every continent contributing'          },
    { id: 'orbital',     icon: '\uD83D\uDEF0\uFE0F',  name: 'Orbital Inference Array', cost:  1000, multiplier:  25, flavour: 'Space itself regrets this'             },
    { id: 'agi_mode',    icon: '\uD83E\uDDEC',        name: 'AGI Mode',                cost:  5000, multiplier: 100, flavour: "It's writing its own prompts now"      },
  ];

  const LS_UPGRADES_KEY   = 'tokenDeathclockUpgrades';
  const LS_BESTSCORE_KEY  = 'tokenDeathclockBestScore';
  const LS_COMPANY_KEY    = 'tokenDeathclockCompany';
  const LS_GAME_STATE_KEY = 'tokenDeathclockGameState';

  // ---- State -----------------------------------------------

  const acc = {
    personalTokens:      0,
    doomPoints:          0,
    tapMultiplier:       1,
    combo:               1,
    tapTimestamps:       [],   // epoch-ms of recent taps (trimmed to last 3 s)
    totalTaps:           0,
    comboMaxHits:        0,    // times 10× combo was reached this session
    milestonesTriggered: 0,    // personal milestones crossed this session
    personalMilestoneSet: new Set(), // ids of milestones the player has crossed
    bestScore:           0,
    ownedUpgrades:       {},   // upgrade id → true
    challenges:          [],   // active challenge defs (3)
    challengeProgress:   {},   // challenge id → { value, completed }
    sessionStartTokens:  0,    // snapshot of personalTokens when section opens (for carbon sprint)
    sessionStartTime:    0,    // ms when section was opened
    _comboResetTimer:    null,
    _speedSecond:        { taps: 0, ts: 0 },  // taps in current 1-second bucket
    _speedStreak:        0,    // consecutive 1-sec buckets with ≥ 10 taps
    // Company / AI-Native
    replacedWorkers:     {},   // roleId → true
    ownedAgents:         {},   // agentId → count
    passiveRate:         0,    // tokens/sec from passive generators
  };

  // ---- Persistence -----------------------------------------

  function loadAcceleratorState() {
    try {
      const raw = localStorage.getItem(LS_UPGRADES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') acc.ownedUpgrades = parsed;
      }
    } catch (_) { /* ignore */ }
    try {
      const bs = parseFloat(localStorage.getItem(LS_BESTSCORE_KEY) || '0');
      if (isFinite(bs) && bs > 0) acc.bestScore = bs;
    } catch (_) { /* ignore */ }
    try {
      const raw = localStorage.getItem(LS_COMPANY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.replacedWorkers && typeof parsed.replacedWorkers === 'object') {
            acc.replacedWorkers = parsed.replacedWorkers;
          }
          if (parsed.ownedAgents && typeof parsed.ownedAgents === 'object') {
            acc.ownedAgents = parsed.ownedAgents;
          }
        }
      }
    } catch (_) { /* ignore */ }
    try {
      const raw = localStorage.getItem(LS_GAME_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.personalTokens === 'number' && isFinite(parsed.personalTokens) && parsed.personalTokens >= 0) {
            acc.personalTokens = parsed.personalTokens;
          }
          if (typeof parsed.doomPoints === 'number' && isFinite(parsed.doomPoints) && parsed.doomPoints >= 0) {
            acc.doomPoints = parsed.doomPoints;
          }
          if (typeof parsed.totalTaps === 'number' && isFinite(parsed.totalTaps) && parsed.totalTaps >= 0) {
            acc.totalTaps = Math.floor(parsed.totalTaps);
          }
          if (typeof parsed.milestonesTriggered === 'number' && isFinite(parsed.milestonesTriggered) && parsed.milestonesTriggered >= 0) {
            acc.milestonesTriggered = Math.floor(parsed.milestonesTriggered);
          }
          if (Array.isArray(parsed.personalMilestoneSet)) {
            acc.personalMilestoneSet = new Set(
              parsed.personalMilestoneSet.filter((id) => typeof id === 'string')
            );
          }
        }
      }
    } catch (_) { /* ignore */ }
    // Recompute tap multiplier and passive rate from persisted state
    acc.tapMultiplier = currentTapMultiplier();
    acc.passiveRate   = computePassiveRate(acc.ownedAgents, acc.replacedWorkers);
  }

  function saveAcceleratorState() {
    try { localStorage.setItem(LS_UPGRADES_KEY, JSON.stringify(acc.ownedUpgrades)); } catch (_) { /* ignore */ }
    try { localStorage.setItem(LS_BESTSCORE_KEY, String(acc.bestScore)); } catch (_) { /* ignore */ }
    try {
      localStorage.setItem(LS_COMPANY_KEY, JSON.stringify({
        replacedWorkers: acc.replacedWorkers,
        ownedAgents:     acc.ownedAgents,
      }));
    } catch (_) { /* ignore */ }
    try {
      localStorage.setItem(LS_GAME_STATE_KEY, JSON.stringify({
        personalTokens:      acc.personalTokens,
        doomPoints:          acc.doomPoints,
        totalTaps:           acc.totalTaps,
        milestonesTriggered: acc.milestonesTriggered,
        personalMilestoneSet: [...acc.personalMilestoneSet],
      }));
    } catch (_) { /* ignore */ }
  }

  function currentTapMultiplier() {
    let mult = 1;
    UPGRADES.forEach((u) => {
      if (acc.ownedUpgrades[u.id]) mult = Math.max(mult, u.multiplier);
    });
    return mult;
  }

  // ---- Tap handler -----------------------------------------

  function handleTap() {
    const now = Date.now();

    // Record tap timestamp, keep a 3-second window
    acc.tapTimestamps.push(now);
    if (acc.tapTimestamps.length > 200) {
      acc.tapTimestamps = acc.tapTimestamps.filter((t) => t >= now - 3000);
    }

    // Update combo
    const newCombo = computeComboMultiplier(acc.tapTimestamps);
    const hitMaxCombo = newCombo === 10 && acc.combo < 10;
    acc.combo = newCombo;

    // Tokens this tap
    const tokensThisTap = ACC_BASE_TOKENS_PER_TAP * acc.tapMultiplier * acc.combo;
    acc.personalTokens += tokensThisTap;
    acc.doomPoints     += tokensThisTap * ACC_DP_PER_TOKEN;
    acc.totalTaps++;

    // Speed challenge tracking: bucket by 1-second windows
    const secBucket = Math.floor(now / 1000);
    if (secBucket === acc._speedSecond.ts) {
      acc._speedSecond.taps++;
    } else {
      if (acc._speedSecond.taps >= 10) {
        acc._speedStreak++;
      } else {
        acc._speedStreak = 0;
      }
      acc._speedSecond = { taps: 1, ts: secBucket };
    }

    // Combo-max hits (for combo_king challenge)
    if (hitMaxCombo) acc.comboMaxHits++;

    // Haptic
    if (typeof navigator.vibrate === 'function') navigator.vibrate(30);

    // Visual tap animation
    const btn = document.getElementById('bigRedButton');
    if (btn) {
      btn.classList.add('tapping');
      setTimeout(() => btn.classList.remove('tapping'), 140);
    }

    updateAcceleratorUI();
    checkAcceleratorAchievements();
    updateChallengeProgress();
    updateVillainLeaderboard();
  }

  // ---- Challenge progress ----------------------------------

  function initChallengeProgress() {
    acc.challenges = getSessionChallenges(Date.now());
    acc.challengeProgress = {};
    acc.challenges.forEach((c) => {
      acc.challengeProgress[c.id] = { value: 0, completed: false };
    });
    acc.sessionStartTokens = acc.personalTokens;
    acc.sessionStartTime   = Date.now();
  }

  function updateChallengeProgress() {
    let anyChanged = false;
    acc.challenges.forEach((c) => {
      const p = acc.challengeProgress[c.id];
      if (!p || p.completed) return;
      let newValue = p.value;

      switch (c.type) {
        case 'taps':    newValue = acc.totalTaps; break;
        case 'tokens':  newValue = acc.personalTokens; break;
        case 'combo':   newValue = acc.comboMaxHits; break;
        case 'upgrade': newValue = Object.keys(acc.ownedUpgrades).length; break;
        case 'co2': {
          const impact = calculateEnvironmentalImpact(acc.personalTokens);
          newValue = impact.co2Kg; // target is in kg (1000 kg = 1 tonne)
          break;
        }
        case 'speed': {
          // Speed: 50 taps in under 10 seconds
          // Check if the last 50 taps were within 10 seconds
          if (acc.tapTimestamps.length >= 50) {
            const earliest = acc.tapTimestamps[acc.tapTimestamps.length - 50];
            const latest   = acc.tapTimestamps[acc.tapTimestamps.length - 1];
            if (latest - earliest < 10000) {
              newValue = c.target; // mark complete
            }
          }
          break;
        }
        default: break;
      }

      if (newValue !== p.value) {
        p.value = newValue;
        anyChanged = true;
        if (newValue >= c.target && !p.completed) {
          p.completed = true;
          p.value = c.target;
          acc.doomPoints += c.rewardDp;
          showChallengeComplete(c);
          // Nocturnal bonus: any challenge completed between midnight and 4am
          const hour = new Date().getHours();
          if (hour >= 0 && hour < 4) awardBadge('nocturnal_doomer');
        }
      }
    });
    if (anyChanged) renderChallenges();
  }

  function showChallengeComplete(c) {
    queueToast({
      icon: c.icon,
      name: 'Challenge Complete: ' + c.label,
      desc: '+' + c.rewardDp + ' DP — ' + c.desc,
    });
  }

  // ---- Achievements ----------------------------------------

  function checkAcceleratorAchievements() {
    if (acc.totalTaps === 1)                         awardBadge('accelerant');
    if (acc.combo === 10)                            awardBadge('arsonist');
    if (acc.personalTokens >= 1e12)                  awardBadge('trillion_villain');
    if (acc.ownedUpgrades['global_dc'])              awardBadge('continental_threat');
    if (acc.ownedUpgrades['orbital'])                awardBadge('space_criminal');
    if (acc.ownedUpgrades['agi_mode'])               awardBadge('godlike');
    if (acc.milestonesTriggered >= 1)                awardBadge('first_blood');
    if (acc.milestonesTriggered >= 5)                awardBadge('apex_accelerant');
  }

  // ---- Upgrade purchase ------------------------------------

  function purchaseUpgrade(id) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade || acc.ownedUpgrades[id]) return;
    if (acc.doomPoints < upgrade.cost) return;
    acc.doomPoints -= upgrade.cost;
    acc.ownedUpgrades[id] = true;
    acc.tapMultiplier = currentTapMultiplier();
    saveAcceleratorState();

    queueToast({
      icon: upgrade.icon,
      name: 'Upgrade Unlocked: ' + upgrade.name,
      desc: upgrade.flavour + ' — now ' + upgrade.multiplier + '\xD7 per tap',
    });

    updateAcceleratorUI();
    renderUpgradeShop();
    checkAcceleratorAchievements();
    updateChallengeProgress(); // may complete first_upgrade challenge
  }

  // ---- UI rendering ----------------------------------------

  function updateAcceleratorUI() {
    const impact = calculateEnvironmentalImpact(acc.personalTokens);

    setAccelText('accelTokens', formatTokenCount(acc.personalTokens));
    setAccelText('accelDp',     formatDoomPoints(acc.doomPoints));

    // CO₂ display: grams when < 1 kg, otherwise kg
    const co2Val = impact.co2Kg < 1
      ? (impact.co2Kg * 1000).toFixed(1) + ' g'
      : impact.co2Kg.toFixed(2) + ' kg';
    setAccelText('accelCo2', co2Val);

    // Water display: mL when < 1 L, otherwise L
    const waterVal = impact.waterL < 1
      ? Math.round(impact.waterL * 1000) + ' mL'
      : impact.waterL.toFixed(2) + ' L';
    setAccelText('accelWater', waterVal);

    // Passive rate display
    setAccelText('passiveRateDisplay', formatTokenCount(acc.passiveRate) + ' tokens/sec');

    updateComboDisplay();
    updateMilestoneRace();
    updateBestScore();
    renderUpgradeShop();
    renderWorkforcePanel();
    renderAgentShop();
    updateCompanyStage();

    // Show/hide share button
    const shareBtn = document.getElementById('shareAccelerationBtn');
    if (shareBtn) shareBtn.hidden = acc.personalTokens <= 0;

    // Show tap rate
    const rateEl = document.getElementById('brbTapRate');
    if (rateEl && acc.tapTimestamps.length >= 2) {
      const window2s = acc.tapTimestamps.filter((t) => t >= Date.now() - 2000);
      const rate = window2s.length / 2;
      rateEl.textContent = rate.toFixed(1) + ' taps/sec';
    }
  }

  function setAccelText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function updateComboDisplay() {
    const el = document.getElementById('comboDisplay');
    const btn = document.getElementById('bigRedButton');
    const lbl = document.getElementById('brbLabel');
    if (!el) return;

    el.textContent = acc.combo + '\xD7';
    el.setAttribute('aria-label', 'Combo multiplier: ' + acc.combo + '\xD7');

    const isMax = acc.combo === 10;
    el.classList.toggle('combo-max', isMax);
    if (btn) {
      btn.classList.toggle('combo-max', isMax);
      btn.setAttribute('aria-label', 'Feed the Machine \u2014 ' + acc.combo + '\xD7 combo');
    }
    if (lbl) {
      if (acc.combo >= 10)      lbl.textContent = 'MAXIMUM DOOM \u2622\uFE0F';
      else if (acc.combo >= 5)  lbl.textContent = 'FASTER! \uD83D\uDD25';
      else if (acc.combo >= 2)  lbl.textContent = 'Keep Going\u2026';
      else                      lbl.textContent = 'Feed the Machine';
    }
  }

  function updateMilestoneRace() {
    const next = getNextMilestoneForPlayer(acc.personalTokens, MILESTONES);
    const nameEl = document.getElementById('milestoneRaceName');
    const pctEl  = document.getElementById('milestoneRacePct');
    const fill   = document.getElementById('milestoneRaceFill');
    const bar    = document.getElementById('milestoneRaceBar');

    if (!next) {
      if (nameEl) nameEl.textContent = 'All cleared \uD83D\uDC80';
      if (pctEl)  pctEl.textContent  = '100%';
      if (fill)   fill.style.width   = '100%';
      return;
    }

    // Find the previous milestone tokens as the lower bound
    const idx  = MILESTONES.indexOf(next);
    const prev = idx > 0 ? MILESTONES[idx - 1].tokens : 0;
    const pct  = milestoneProgress(acc.personalTokens, prev, next.tokens);

    if (nameEl) nameEl.textContent = next.icon + ' ' + next.name;
    if (pctEl)  pctEl.textContent  = pct.toFixed(1) + '%';
    if (fill)   fill.style.width   = pct + '%';
    if (bar)    bar.setAttribute('aria-valuenow', Math.round(pct));

    // Check if the player just triggered this milestone
    if (acc.personalTokens >= next.tokens && !acc.personalMilestoneSet.has(next.id)) {
      acc.personalMilestoneSet.add(next.id);
      acc.milestonesTriggered++;
      flashPersonalMilestoneTrigger(next);
      if (typeof navigator.vibrate === 'function') navigator.vibrate(80);
      checkAcceleratorAchievements();
    }
  }

  function flashPersonalMilestoneTrigger(milestone) {
    // Flash the race bar
    const wrap = document.querySelector('.milestone-race-wrap');
    if (wrap) {
      wrap.classList.add('milestone-triggered');
      setTimeout(() => wrap.classList.remove('milestone-triggered'), 700);
    }
    // Flash the global milestone card
    const card = document.getElementById('milestone-' + milestone.id);
    if (card) {
      card.classList.add('player-triggered');
      setTimeout(() => card.classList.remove('player-triggered'), 700);
    }
    queueToast({
      icon: milestone.icon,
      name: 'Milestone Triggered: ' + milestone.name,
      desc: 'You personally crossed ' + milestone.shortDesc + '. Catastrophe achieved.',
    });
  }

  function updateBestScore() {
    if (acc.personalTokens > acc.bestScore) {
      acc.bestScore = acc.personalTokens;
      saveAcceleratorState();
      const valueEl = document.getElementById('bestScoreValue');
      if (valueEl) {
        valueEl.textContent = formatTokenCount(acc.bestScore);
        valueEl.className = 'new-record';
        setTimeout(() => { valueEl.className = ''; }, 2000);
      }
      updateVillainLeaderboard();
    } else {
      const valueEl = document.getElementById('bestScoreValue');
      if (valueEl && valueEl.textContent === '\u2014') {
        valueEl.textContent = acc.bestScore > 0 ? formatTokenCount(acc.bestScore) : '\u2014';
      }
    }
  }

  function renderUpgradeShop() {
    const shop = document.getElementById('upgradeShop');
    if (!shop) return;

    shop.innerHTML = '';
    UPGRADES.forEach((u) => {
      const owned      = !!acc.ownedUpgrades[u.id];
      const affordable = acc.doomPoints >= u.cost;
      const btn        = document.createElement('button');
      btn.className    = 'upgrade-card' +
        (owned ? ' owned' : '') +
        (!owned && !affordable ? ' unaffordable' : '');
      btn.setAttribute('aria-label', owned
        ? u.name + ' (owned)'
        : u.name + ' \u2014 costs ' + u.cost + ' DP'
      );
      if (owned) btn.setAttribute('aria-disabled', 'true');
      btn.innerHTML = `
        <span class="upgrade-card-icon" aria-hidden="true">${escHtml(u.icon)}</span>
        <div class="upgrade-card-name">${escHtml(u.name)}</div>
        <div class="upgrade-card-flavour">${escHtml(u.flavour)}</div>
        <div class="upgrade-card-cost">${owned ? '\u2713 Owned' : escHtml(String(u.cost)) + ' DP'}</div>
        <div class="upgrade-card-mult">${escHtml(String(u.multiplier))}\xD7 per tap</div>`;
      if (!owned) {
        btn.addEventListener('click', () => purchaseUpgrade(u.id));
      }
      shop.appendChild(btn);
    });
  }

  // ---- Workforce panel (fire workers) ----------------------

  function fireWorker(id) {
    const role = COMPANY_ROLES.find((r) => r.id === id);
    if (!role || acc.replacedWorkers[id]) return;
    if (acc.doomPoints < role.cost) return;
    acc.doomPoints -= role.cost;
    acc.replacedWorkers[id] = true;
    acc.passiveRate = computePassiveRate(acc.ownedAgents, acc.replacedWorkers);
    saveAcceleratorState();
    queueToast({
      icon:  role.icon,
      name:  'Role Automated: ' + role.name,
      desc:  role.flavour + ' (+' + formatTokenCount(role.tps) + '/sec)',
    });
    updateAcceleratorUI();
    renderWorkforcePanel();
    checkCompanyAchievements();
    updateChallengeProgress();
  }

  function renderWorkforcePanel() {
    const panel = document.getElementById('workforcePanel');
    if (!panel) return;
    panel.innerHTML = '';
    COMPANY_ROLES.forEach((r) => {
      const fired      = !!acc.replacedWorkers[r.id];
      const affordable = !fired && acc.doomPoints >= r.cost;
      const card       = document.createElement('button');
      card.className   = 'worker-card' +
        (fired ? ' fired' : '') +
        (!fired && !affordable ? ' unaffordable' : '');
      card.setAttribute('aria-label', fired
        ? r.name + ' (automated)'
        : r.name + ' — fire for ' + r.cost + ' DP'
      );
      if (fired) card.setAttribute('aria-disabled', 'true');
      card.innerHTML = `
        <span class="worker-card-icon" aria-hidden="true">${escHtml(r.icon)}</span>
        <div class="worker-card-name">${escHtml(r.name)}</div>
        <div class="worker-card-flavour">${escHtml(r.flavour)}</div>
        <div class="worker-card-tps">+${escHtml(formatTokenCount(r.tps))}/sec</div>
        <div class="worker-card-cost">${fired ? '🤖 Automated' : escHtml(String(r.cost)) + ' DP'}</div>`;
      if (!fired) {
        card.addEventListener('click', () => fireWorker(r.id));
      }
      panel.appendChild(card);
    });
  }

  // ---- AI Agent shop (passive generators) ------------------

  function purchaseAgent(id) {
    const agent = AI_AGENTS.find((a) => a.id === id);
    if (!agent) return;
    if (acc.doomPoints < agent.cost) return;
    acc.doomPoints -= agent.cost;
    acc.ownedAgents[id] = (acc.ownedAgents[id] || 0) + 1;
    acc.passiveRate = computePassiveRate(acc.ownedAgents, acc.replacedWorkers);
    saveAcceleratorState();
    updateAcceleratorUI();
    renderAgentShop();
    checkCompanyAchievements();
    updateChallengeProgress();
  }

  function renderAgentShop() {
    const shop = document.getElementById('agentShop');
    if (!shop) return;
    shop.innerHTML = '';
    AI_AGENTS.forEach((a) => {
      const count      = acc.ownedAgents[a.id] || 0;
      const affordable = acc.doomPoints >= a.cost;
      const card       = document.createElement('button');
      card.className   = 'agent-card' + (!affordable ? ' unaffordable' : '');
      card.setAttribute('aria-label',
        a.name + (count ? ' (×' + count + ' owned)' : '') + ' — costs ' + a.cost + ' DP'
      );
      card.innerHTML = `
        <span class="agent-card-icon" aria-hidden="true">${escHtml(a.icon)}</span>
        <div class="agent-card-name">${escHtml(a.name)}</div>
        <div class="agent-card-flavour">${escHtml(a.flavour)}</div>
        <div class="agent-card-tps">+${escHtml(formatTokenCount(a.tps))}/sec each</div>
        <div class="agent-card-cost">${escHtml(String(a.cost))} DP</div>
        ${count ? `<div class="agent-card-owned">\u00D7${count} deployed</div>` : ''}`;
      card.addEventListener('click', () => purchaseAgent(a.id));
      shop.appendChild(card);
    });
  }

  // ---- Company stage display --------------------------------

  function updateCompanyStage() {
    const replaced = Object.keys(acc.replacedWorkers).length;
    const stage    = getCompanyStage(replaced);
    const iconEl   = document.getElementById('companyStageIcon');
    const nameEl   = document.getElementById('companyStageName');
    if (iconEl) iconEl.textContent = stage.icon;
    if (nameEl) nameEl.textContent = stage.name;
  }

  // ---- Company achievements --------------------------------

  function checkCompanyAchievements() {
    const replaced = Object.keys(acc.replacedWorkers).length;
    if (replaced >= 1) awardBadge('layoff_legend');
    if (replaced >= 5) awardBadge('ai_native_ceo');
    if (replaced >= COMPANY_ROLES.length) awardBadge('lights_out');
    const hasAgent = AI_AGENTS.some((a) => (acc.ownedAgents[a.id] || 0) > 0);
    if (hasAgent) awardBadge('token_maxxer_badge');
  }

  // ---- Passive token generation loop -----------------------

  function startPassiveLoop() {
    // Tick every 200 ms — add passiveRate × 0.2 tokens per tick.
    // Only update the minimal counter elements here; full UI re-renders
    // (shop affordability, challenge progress bars) happen via handleTap() and
    // purchase actions so we avoid heavy DOM churn every 200 ms.
    setInterval(() => {
      if (acc.passiveRate <= 0) return;
      const tokensAdded = acc.passiveRate * 0.2;
      acc.personalTokens += tokensAdded;
      acc.doomPoints     += tokensAdded * ACC_DP_PER_TOKEN;
      // Update only the lightweight numeric displays
      setAccelText('accelTokens', formatTokenCount(acc.personalTokens));
      setAccelText('accelDp',     formatDoomPoints(acc.doomPoints));
      updateMilestoneRace();
      updateBestScore();
      updateChallengeProgress();
    }, 200);
  }

  function renderChallenges() {
    const row = document.getElementById('challengeRow');
    if (!row) return;
    row.innerHTML = '';
    acc.challenges.forEach((c) => {
      const p       = acc.challengeProgress[c.id] || { value: 0, completed: false };
      const pct     = Math.min(100, (p.value / c.target) * 100);
      const card    = document.createElement('div');
      card.className = 'challenge-card' + (p.completed ? ' completed' : '');
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', c.label + (p.completed ? ' (completed)' : ''));
      card.innerHTML = `
        <span class="challenge-card-icon" aria-hidden="true">${escHtml(c.icon)}</span>
        <div class="challenge-card-label">${escHtml(c.label)}</div>
        <div class="challenge-card-desc">${escHtml(c.desc)}</div>
        <div class="challenge-card-reward">+${escHtml(String(c.rewardDp))} DP</div>
        <div class="challenge-card-progress">
          <div class="challenge-card-pct">${pct.toFixed(0)}%</div>
          <div class="progress-bar" role="progressbar"
               aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill challenge-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        ${p.completed ? '<span class="challenge-checkmark" aria-hidden="true">\u2705</span>' : ''}`;
      row.appendChild(card);
    });
  }

  // ---- Share -----------------------------------------------

  function buildAccelerationShareText() {
    const impact = calculateEnvironmentalImpact(acc.personalTokens);
    const co2g   = (impact.co2Kg * 1000).toFixed(1);
    const waterMl = Math.round(impact.waterL * 1000);
    const next   = getNextMilestoneForPlayer(acc.personalTokens, MILESTONES);
    const nextLabel = next ? next.name : 'civilisation collapse';
    return (
      '\uD83D\uDE80 I personally accelerated AI\u2019s environmental doom by contributing ' +
      formatTokenCount(acc.personalTokens) + ' tokens \u2014 ' +
      co2g + '\u2009g of CO\u2082, ' + waterMl + '\u2009mL of water. ' +
      'One step closer to ' + nextLabel + '. Come join the apocalypse.\n' +
      '\u2192 ' + SITE_URL + ' #AccelerateTheDoom #TokenDeathClock'
    );
  }

  // ---- Combo reset loop ------------------------------------

  function startComboResetLoop() {
    setInterval(() => {
      if (acc.tapTimestamps.length === 0) return;
      const lastTap = acc.tapTimestamps[acc.tapTimestamps.length - 1];
      if (Date.now() - lastTap > 1500) {
        // Reset combo
        acc.tapTimestamps = [];
        if (acc.combo !== 1) {
          acc.combo = 1;
          updateComboDisplay();
          const rateEl = document.getElementById('brbTapRate');
          if (rateEl) rateEl.textContent = 'Tap to begin';
        }
      }
    }, 100);
  }

  // ---- Init ------------------------------------------------

  function initAccelerator() {
    loadAcceleratorState();

    // Toggle open/close
    const toggleBtn = document.getElementById('accelToggleBtn');
    const content   = document.getElementById('accel-content');
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const opening = content.hidden;
        content.hidden = !opening;
        toggleBtn.textContent = opening
          ? '\u25BC Close Doom Accelerator'
          : '\u25BA Open Doom Accelerator';
        toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if (opening) {
          initChallengeProgress();
          renderChallenges();
          renderUpgradeShop();
          renderWorkforcePanel();
          renderAgentShop();
          updateCompanyStage();
          updateAcceleratorUI();
          updateVillainLeaderboard();
          // Show best score from storage
          const valueEl = document.getElementById('bestScoreValue');
          if (valueEl) {
            valueEl.textContent = acc.bestScore > 0 ? formatTokenCount(acc.bestScore) : '\u2014';
          }
        }
      });
    }

    // Big Red Button — use pointerdown for instant response on mobile+desktop
    const btn = document.getElementById('bigRedButton');
    if (btn) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleTap();
      });
    }

    // Share button
    const shareBtn = document.getElementById('shareAccelerationBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openSharePopup(buildAccelerationShareText());
        awardBadge('bragging_rights');
      });
    }

    // Combo reset timer
    startComboResetLoop();
    // Passive token generation loop
    startPassiveLoop();
  }

