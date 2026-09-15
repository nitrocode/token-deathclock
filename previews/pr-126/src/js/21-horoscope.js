  // ---- Daily AI Horoscope (Phase 3 PRD #1) --------------------

  const LS_HOROSCOPE_DATE_KEY = 'tokenDeathclockHoroscopeDate';

  /** Return today's UTC date as a YYYY-MM-DD string. */
  function utcDateString(nowMs) {
    const d = new Date(nowMs);
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function initHoroscope() {
    const details  = document.getElementById('horoscope-details');
    const dateEl   = document.getElementById('horoscope-date');
    const textEl   = document.getElementById('horoscope-text');
    const shareBtn = document.getElementById('horoscope-share-btn');
    if (!details || !textEl) return;

    const nowMs   = Date.now();
    const today   = utcDateString(nowMs);
    const text    = getDailyHoroscope(nowMs, HOROSCOPE_TEMPLATES);

    // Render the horoscope text safely
    textEl.textContent = text;
    if (dateEl) dateEl.textContent = today;

    // Start collapsed if already viewed today; otherwise open + persist date
    let alreadySeen = false;
    try {
      const stored = JSON.parse(localStorage.getItem(LS_HOROSCOPE_DATE_KEY) || 'null');
      alreadySeen = stored && stored.date === today;
      if (!alreadySeen) {
        localStorage.setItem(LS_HOROSCOPE_DATE_KEY, JSON.stringify({ date: today }));
      }
    } catch (_) { /* ignore quota / access errors */ }

    if (alreadySeen) {
      details.removeAttribute('open');
    } else {
      details.setAttribute('open', '');
    }

    // Persist collapsed state when user toggles
    details.addEventListener('toggle', () => {
      if (details.open) {
        try {
          localStorage.setItem(LS_HOROSCOPE_DATE_KEY, JSON.stringify({ date: today }));
        } catch (_) { /* ignore */ }
      }
    });

    // Share button
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareText =
          `\uD83D\uDD2E Today's AI Horoscope: "${text}"\n` +
          `Will this be you today? \u2192 ${SITE_URL} #TokenDeathClock #AIHoroscope`;
        openSharePopup(shareText);
      });
    }
  }
