  // ---- AI Guilt-O-Meter (Phase 3 PRD #2) ----------------------

  const GUILT_DURATION_MS = 300000; // 5 minutes → 100 %

  let _guiltCertified = false;

  function updateGuiltMeter() {
    const bar      = document.getElementById('guiltMeterBar');
    const labelEl  = document.getElementById('guiltMeterLabel');
    const shareBtn = document.getElementById('guiltShareBtn');
    if (!bar || !labelEl) return;

    const elapsed = Math.max(0, Date.now() - pageLoadTime);
    const pct     = Math.min(100, Math.floor((elapsed / GUILT_DURATION_MS) * 100));
    const label   = getGuiltLabel(pct);
    const labelText = label.icon + '\u00A0' + label.text;

    bar.value = pct;
    bar.setAttribute('aria-valuenow', pct);
    bar.setAttribute('aria-label', labelText);
    labelEl.textContent = labelText;

    if (shareBtn) shareBtn.hidden = pct < 20;

    if (pct >= 100 && !_guiltCertified) {
      _guiltCertified = true;
      awardBadge('certified_hypocrite');
    }
  }

  function initGuiltMeter() {
    const shareBtn = document.getElementById('guiltShareBtn');

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const elapsed = Math.max(0, Date.now() - pageLoadTime);
        const mins    = Math.floor(elapsed / 60000) || 1;
        const labelEl = document.getElementById('guiltMeterLabel');
        const labelText = labelEl ? labelEl.textContent : '';
        const shareText =
          '\uD83D\uDE2C I\u2019ve been watching AI consume tokens for ' +
          mins + ' minute' + (mins !== 1 ? 's' : '') +
          ' and done absolutely nothing about it.' +
          ' My guilt level: ' + labelText +
          '. Are you as bad as me?\n\u2192 ' + SITE_URL +
          ' #TokenDeathClock #CertifiedHypocrite';
        openSharePopup(shareText);
        awardBadge('spreading_doom');
      });
    }

    // Render initial state
    updateGuiltMeter();
  }
