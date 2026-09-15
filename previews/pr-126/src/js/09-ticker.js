  // ---- "AI Is Currently Generating…" Ticker ------------------

  const TICKER_ENTRIES = [
    { tokensEach: 400,   label: 'LinkedIn posts about disruption, transformation, and journeys' },
    { tokensEach: 800,   label: 'cover letters for jobs already filled by AI' },
    { tokensEach: 200,   label: 'apology emails for replying "per my last email"' },
    { tokensEach: 1500,  label: 'README files for projects that will never be committed' },
    { tokensEach: 3000,  label: 'passive-aggressive Slack messages softened by three rewrites' },
    { tokensEach: 600,   label: 'horoscopes for zodiac signs that don\'t exist yet' },
    { tokensEach: 2000,  label: 'attempts to explain consciousness to a language model' },
    { tokensEach: 500,   label: 'recursive prompts asking AI if it\'s sentient' },
    { tokensEach: 1200,  label: 'love poems for someone who asked for "something quick"' },
    { tokensEach: 400,   label: 'philosophical debates between two instances of the same model' },
    { tokensEach: 2500,  label: 'security advisories for vulnerabilities AI introduced last week' },
    { tokensEach: 800,   label: 'slide decks titled "AI Strategy 2026"' },
    { tokensEach: 300,   label: 'meeting summaries for meetings that could have been emails' },
    { tokensEach: 5000,  label: 'terms of service that no human will ever read' },
    { tokensEach: 600,   label: 'bedtime stories featuring a dragon named Gerald' },
    { tokensEach: 400,   label: 'recipes that add cheese to things that should not have cheese' },
    { tokensEach: 800,   label: 'cat pictures described in 800 words' },
    { tokensEach: 250,   label: 'arguments about whether a hot dog is a sandwich' },
    { tokensEach: 100,   label: 'variations of "hello world" in Rust' },
    { tokensEach: 1000,  label: 'strongly worded letters about a neighbour\'s leaf blower' },
  ];

  let tickerPaused = false;
  let tickerIdx    = 0;
  let tickerCurrent = null; // { entry, nStr, sessionTokens }
  let tickerInterval = null;

  function tickerNiceFmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' million';
    if (n >= 1e3) return (Math.round(n / 100) * 100).toLocaleString();
    return Math.max(1, Math.round(n)).toLocaleString();
  }

  function updateTicker() {
    if (tickerPaused) return;
    const now = Date.now();
    const elapsed = Math.max(1, (now - pageLoadTime) / 1000);
    const rate = getRateAtDate(new Date(now));
    const sessionTokens = elapsed * rate;
    const entry = TICKER_ENTRIES[tickerIdx % TICKER_ENTRIES.length];
    const count = Math.max(1, sessionTokens / entry.tokensEach);
    const nStr  = tickerNiceFmt(count);
    const el    = document.getElementById('ai-ticker-text');
    if (el) el.textContent = nStr + ' ' + entry.label;
    tickerCurrent = { entry, nStr, sessionTokens, rate };
    tickerIdx++;
  }

  function expandTicker() {
    if (!tickerCurrent) return;
    tickerPaused = true;
    const expanded = document.getElementById('ai-ticker-expanded');
    if (expanded) expanded.hidden = false;
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    if (toggleBtn) { toggleBtn.textContent = '▶ Resume'; toggleBtn.setAttribute('aria-pressed', 'true'); }
    const math = document.getElementById('ai-ticker-math');
    if (math && tickerCurrent) {
      const { entry, nStr, sessionTokens, rate } = tickerCurrent;
      const elapsed = Math.round(sessionTokens / rate);
      math.textContent =
        `${elapsed}s × ${formatTokenCount(rate)} tokens/sec\n` +
        `= ${formatTokenCount(sessionTokens)} tokens consumed globally\n\n` +
        `÷ ${entry.tokensEach.toLocaleString()} tokens per item\n` +
        `≈ ${nStr} ${entry.label}\n\n` +
        `(Just in the time you've been watching.)`;
    }
  }

  function collapseTicker() {
    const expanded = document.getElementById('ai-ticker-expanded');
    if (expanded) expanded.hidden = true;
    tickerPaused = false;
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    if (toggleBtn) { toggleBtn.textContent = '⏸ Pause'; toggleBtn.setAttribute('aria-pressed', 'false'); }
  }

  function shareTickerFact() {
    if (!tickerCurrent) return;
    const { entry, nStr, sessionTokens } = tickerCurrent;
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const timeStr = elapsed >= 60
      ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
      : `${elapsed}s`;
    const text =
      `🤖 Since I arrived (${timeStr} ago), AI has probably generated:\n\n` +
      `${nStr} ${entry.label}\n\n` +
      `That's what ${formatTokenCount(tickerCurrent.rate)} tokens/sec looks like in human terms.\n` +
      `→ ${SITE_URL} #AIDeathClock #TokenDeathClock`;
    openSharePopup(text);
  }

  function initTicker() {
    const prefersReduced = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    updateTicker();
    if (!prefersReduced) {
      tickerInterval = setInterval(updateTicker, 4000);
    }

    const textEl = document.getElementById('ai-ticker-text');
    if (textEl) textEl.addEventListener('click', expandTicker);

    const toggleBtn = document.getElementById('ai-ticker-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (tickerPaused) { collapseTicker(); } else { expandTicker(); }
      });
    }

    const resumeBtn = document.getElementById('ai-ticker-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', collapseTicker);

    const shareBtn = document.getElementById('ai-ticker-share');
    if (shareBtn) shareBtn.addEventListener('click', shareTickerFact);
  }

