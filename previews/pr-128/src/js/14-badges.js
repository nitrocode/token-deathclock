  // ---- Doom Achievements / Badge System -----------------------

  const BADGE_DEFS = [
    { id: 'morbid_curious',       icon: '\uD83D\uDC40', name: 'Morbid Curious',         desc: 'Spent 30 seconds watching the apocalypse.',          type: 'time',   threshold: 30   },
    { id: 'doom_magnet',          icon: '\uD83E\uDDF2', name: 'Doom Magnet',             desc: 'Spent 3 minutes watching the apocalypse.',            type: 'time',   threshold: 180  },
    { id: 'chronic_doomscroller', icon: '\uD83D\uDECB\uFE0F', name: 'Chronic Doomscroller', desc: '10 minutes of uninterrupted doom.',               type: 'time',   threshold: 600  },
    { id: 'terminal_patient',     icon: '\uD83D\uDC80', name: 'Terminal Patient',         desc: 'Half an hour here. Are you okay?',                   type: 'time',   threshold: 1800 },
    { id: 'one_of_us',            icon: '\uD83E\uDD16', name: 'One of Us Now',            desc: "One hour. You're part of the machine now.",          type: 'time',   threshold: 3600 },
    { id: 'spreading_doom',       icon: '\uD83D\uDCE4', name: 'Spreading the Doom',       desc: 'Clicked Share. Sharing is caring.',                  type: 'manual' },
    { id: 'number_cruncher',      icon: '\uD83E\uDDEE', name: 'Number Cruncher',          desc: 'Opened the Personal Footprint Calculator.',          type: 'manual' },
    { id: 'receipt_collector',    icon: '\uD83E\uDDFE', name: 'Receipt Collector',        desc: 'Checked your session receipt.',                       type: 'manual' },
    { id: 'optimist',             icon: '\uD83C\uDF1E', name: 'Optimist',                 desc: 'Switched to Light Mode. Your optimism is noted.',    type: 'manual' },
    { id: 'nocturnal_doomer',     icon: '\uD83C\uDF13', name: 'Nocturnal Doomer',         desc: "Visiting between midnight and 4am. Can't sleep?",   type: 'easter' },
    { id: 'return_visitor',       icon: '\uD83D\uDD01', name: 'Glutton for Punishment',   desc: 'You came back. You knew what would happen.',         type: 'easter' },
    // Accelerator badges
    { id: 'accelerant',           icon: '\uD83D\uDE80', name: 'Accelerant',               desc: 'Made your first tap on the Big Red Button.',         type: 'manual' },
    { id: 'arsonist',             icon: '\uD83D\uDD25', name: 'Arsonist',                 desc: 'Reached 10\xD7 combo for the first time.',           type: 'manual' },
    { id: 'trillion_villain',     icon: '\u26A1',       name: 'Trillion Villain',         desc: 'Personally contributed 1 trillion tokens.',          type: 'manual' },
    { id: 'continental_threat',   icon: '\uD83C\uDF0D', name: 'Continental Threat',       desc: 'Purchased the Global Data Centre upgrade.',          type: 'manual' },
    { id: 'space_criminal',       icon: '\uD83D\uDEF0\uFE0F', name: 'Space Criminal',    desc: 'Purchased the Orbital Inference Array.',             type: 'manual' },
    { id: 'godlike',              icon: '\uD83E\uDDEC', name: 'Godlike',                  desc: 'Purchased the AGI Mode upgrade.',                    type: 'manual' },
    { id: 'first_blood',          icon: '\uD83C\uDFC1', name: 'First Blood',              desc: 'Personally triggered your first milestone.',         type: 'manual' },
    { id: 'apex_accelerant',      icon: '\u2620\uFE0F', name: 'Apex Accelerant',         desc: 'Personally triggered 5 milestones.',                 type: 'manual' },
    { id: 'bragging_rights',      icon: '\uD83D\uDCE4', name: 'Bragging Rights',          desc: 'Shared your personal acceleration total.',           type: 'manual' },
    // AI-Native company badges
    { id: 'layoff_legend',        icon: '📤',           name: 'Layoff Legend',            desc: 'Replaced your first human worker with AI.',          type: 'manual' },
    { id: 'token_maxxer_badge',   icon: '📈',           name: 'Token Maxxer',             desc: 'Deployed your first AI agent.',                      type: 'manual' },
    { id: 'ai_native_ceo',        icon: '🏢',           name: 'AI-Native CEO',            desc: 'Reached AI-Native Company stage.',                   type: 'manual' },
    { id: 'lights_out',           icon: '☠️',           name: 'Lights Out',               desc: 'Replaced every human worker. Fully automated.',      type: 'manual' },
    // Witness badges
    { id: 'witness',              icon: '👁️',           name: 'Witness',                  desc: 'Stayed to watch a milestone get crossed in real time.', type: 'manual' },
    // Guilt-O-Meter badge
    { id: 'certified_hypocrite',  icon: '\uD83D\uDE2C', name: 'Certified Hypocrite',       desc: 'Watched the apocalypse for 5 minutes without doing anything about it.', type: 'manual' },
  ];

  const LS_BADGES_KEY = 'tokenDeathclockBadges';
  const LS_VISITS_KEY = 'tokenDeathclockVisits';

  const BADGE_ANIMS    = ['flip-x', 'flip-y', 'zoom-spin', 'bounce', 'glitch'];
  const ICON_INFO      = '\u2139\uFE0F';  // ℹ️
  const ICON_SEARCH    = '\uD83D\uDD0D';  // 🔍
  const T_ANIM_OUT  = 310;   // ms — must be ≥ longest out-animation duration
  const T_HOLD      = 2600;  // ms — info stays visible
  const T_ANIM_IN   = 380;   // ms — must be ≥ longest in-animation duration

  let earnedBadges = new Set();
  const toastQueue = [];
  let   toastActive = false;

  function loadBadges() {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_BADGES_KEY) || '[]');
      if (Array.isArray(stored)) stored.forEach((id) => earnedBadges.add(id));
    } catch (_) { /* ignore quota / parse errors */ }
  }

  function saveBadges() {
    try {
      localStorage.setItem(LS_BADGES_KEY, JSON.stringify([...earnedBadges]));
    } catch (_) { /* ignore */ }
  }

  function awardBadge(id) {
    if (earnedBadges.has(id)) return;
    const def = BADGE_DEFS.find((b) => b.id === id);
    if (!def) return;
    earnedBadges.add(id);
    saveBadges();
    queueToast(def);
    updateBadgesGrid();
  }

  function checkTimeBadges() {
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    BADGE_DEFS.filter((b) => b.type === 'time').forEach((b) => {
      if (elapsed >= b.threshold) awardBadge(b.id);
    });
  }

  function checkEasterEggs() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) awardBadge('nocturnal_doomer');
  }

  function getBadgeRevealText(def) {
    const earned = earnedBadges.has(def.id);
    if (earned) return def.desc;
    if (def.type === 'time') {
      const s       = def.threshold;
      const minutes = Math.round(s / 60);
      return s < 60
        ? `Stay on the page for ${s} seconds`
        : `Stay on the page for ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (def.type === 'easter') return '\uD83E\uDD2B Keep exploring\u2026';
    return def.desc;
  }

  function handleBadgeClick(def, el) {
    if (el.dataset.animating === '1') return;
    el.dataset.animating = '1';

    const anim   = BADGE_ANIMS[Math.floor(Math.random() * BADGE_ANIMS.length)];
    el.dataset.anim = anim;

    const earned  = earnedBadges.has(def.id);
    const iconEl  = el.querySelector('.badge-icon');
    const nameEl  = el.querySelector('.badge-name');
    if (!iconEl || !nameEl) { el.dataset.animating = '0'; return; }

    const origIcon = iconEl.textContent;
    const origName = nameEl.textContent;

    // Phase 1 — animate out
    el.classList.add('badge-anim-out');
    setTimeout(() => {
      // Swap in info content
      iconEl.textContent = earned ? ICON_INFO : ICON_SEARCH;
      nameEl.textContent = getBadgeRevealText(def);
      el.classList.remove('badge-anim-out');
      el.classList.add('badge-showing-info', 'badge-anim-in');

      setTimeout(() => {
        // Phase 2 — animate out again before restoring
        el.classList.remove('badge-anim-in');
        el.classList.add('badge-anim-out');

        setTimeout(() => {
          // Restore original content
          iconEl.textContent = origIcon;
          nameEl.textContent = origName;
          el.classList.remove('badge-anim-out', 'badge-showing-info');
          el.classList.add('badge-anim-in');

          setTimeout(() => {
            el.classList.remove('badge-anim-in');
            delete el.dataset.anim;
            el.dataset.animating = '0';
          }, T_ANIM_IN);
        }, T_ANIM_OUT);
      }, T_HOLD);
    }, T_ANIM_OUT);
  }

  function renderBadgesGrid() {
    const grid = document.getElementById('badges-grid');
    if (!grid) return;
    grid.innerHTML = '';
    BADGE_DEFS.forEach((def) => {
      const earned = earnedBadges.has(def.id);
      const hint   = def.type === 'time'
        ? `Spend ${def.threshold < 60 ? def.threshold + 's' : Math.round(def.threshold / 60) + 'min'} on the page`
        : def.type === 'easter' ? 'A secret badge\u2026' : 'Complete a specific action';
      const div = document.createElement('div');
      div.className   = 'badge-item ' + (earned ? 'earned' : 'locked');
      div.id          = 'badge-' + def.id;
      div.title       = earned ? def.desc : hint;
      div.setAttribute('aria-label', earned ? `${def.name}: ${def.desc}` : `Locked: ${hint}`);
      div.innerHTML   = `
        <span class="badge-icon" aria-hidden="true">${earned ? escHtml(def.icon) : '\uD83D\uDD12'}</span>
        <span class="badge-name">${escHtml(def.name)}</span>`;
      div.addEventListener('click', () => handleBadgeClick(def, div));
      grid.appendChild(div);
    });
  }

  function updateBadgesGrid() {
    BADGE_DEFS.forEach((def) => {
      const el = document.getElementById('badge-' + def.id);
      if (!el) return;
      if (el.dataset.animating === '1') return; // don't interrupt a running animation
      const earned = earnedBadges.has(def.id);
      el.className   = 'badge-item ' + (earned ? 'earned' : 'locked');
      const iconEl   = el.querySelector('.badge-icon');
      if (iconEl) iconEl.textContent = earned ? def.icon : '\uD83D\uDD12';
      el.title       = earned ? def.desc : el.title;
      if (earned) el.setAttribute('aria-label', `${def.name}: ${def.desc}`);
    });
  }

  function queueToast(def) {
    toastQueue.push(def);
    if (!toastActive) showNextToast();
  }

  function showNextToast() {
    if (!toastQueue.length) { toastActive = false; return; }
    toastActive = true;
    const def     = toastQueue.shift();
    const toast   = document.getElementById('toast');
    const iconEl  = document.getElementById('toast-icon');
    const titleEl = document.getElementById('toast-title');
    const descEl  = document.getElementById('toast-desc');
    if (!toast) return;
    if (iconEl)  iconEl.textContent  = def.icon;
    if (titleEl) titleEl.textContent = '\uD83C\uDFC6 ' + def.name;
    if (descEl)  descEl.textContent  = def.desc;
    toast.hidden = false;
    toast.classList.remove('toast-out');
    toast.classList.add('toast-in');
    clearTimeout(toast._dismissTimer);
    toast._dismissTimer = setTimeout(dismissToast, 5000);
  }

  function dismissToast() {
    const toast = document.getElementById('toast');
    if (!toast || toast.hidden) return;
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove('toast-out');
      toastActive = false;
      if (toastQueue.length) showNextToast();
    }, 320);
  }

  function initBadges() {
    loadBadges();

    // Track visit count and award return visitor badge
    try {
      const visits = (parseInt(localStorage.getItem(LS_VISITS_KEY) || '0', 10) || 0) + 1;
      localStorage.setItem(LS_VISITS_KEY, visits);
      if (visits > 1) setTimeout(() => awardBadge('return_visitor'), 600);
    } catch (_) { /* ignore */ }

    checkEasterEggs();
    renderBadgesGrid();

    const closeBtn = document.getElementById('toast-close');
    if (closeBtn) closeBtn.addEventListener('click', dismissToast);
  }

