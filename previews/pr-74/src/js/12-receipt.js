  // ---- Token Receipt Modal ------------------------------------

  let receiptShown = false;

  function generateReceiptText() {
    const now     = new Date();
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const rate    = getRateAtDate(now);
    const sessionTokens = Math.max(1, elapsed * rate);
    const impact  = calculateEnvironmentalImpact(sessionTokens);

    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const durationStr = m > 0 ? `${m} min ${s} sec` : `${s} sec`;

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const timeStr = now.toUTCString().split(' ')[4] + ' UTC';

    const co2g     = (impact.co2Kg * 1000).toFixed(1);
    const waterMl  = Math.round(impact.waterL * 1000);
    const kwhStr   = impact.kWh < 0.000001 ? '< 0.000001' : impact.kWh.toFixed(6);
    const kmDriven = (impact.co2Kg / 0.171).toFixed(3);
    const phoneMin = Math.max(1, Math.round(impact.kWh / 0.015 * 60));
    const sips     = Math.max(1, Math.round(waterMl / 20));

    const L32 = '─'.repeat(32);
    const E32 = '═'.repeat(32);

    function pl(str, w) { return String(str).padStart(w); }

    return [
      '╔' + '═'.repeat(30) + '╗',
      '║  🧾  AI DEATH CLOCK          ║',
      '║     SESSION RECEIPT          ║',
      '╚' + '═'.repeat(30) + '╝',
      '',
      `  Date:     ${dateStr}`,
      `  Time:     ${timeStr}`,
      `  Duration: ${durationStr}`,
      '',
      L32,
      'ITEM                       VALUE',
      L32,
      `AI tokens consumed ${pl(formatTokenCount(sessionTokens), 12)}`,
      `Energy used (kWh)  ${pl(kwhStr, 12)}`,
      `CO\u2082 emitted (g)   ${pl(co2g, 12)}`,
      `Water used (mL)    ${pl(waterMl, 12)}`,
      '',
      `Global rate: ${formatTokenCount(rate)} tokens/sec`,
      L32,
      'ENVIRONMENTAL COST:',
      '',
      `  \uD83C\uDF21\uFE0F  ~${co2g} g CO\u2082`,
      `     \u2248 driving ${kmDriven} km`,
      '',
      `  \uD83C\uDF0A  ~${waterMl} mL water`,
      `     \u2248 ${sips} sip${sips !== 1 ? 's' : ''} of tea`,
      '',
      `  \u26A1  ~${kwhStr} kWh`,
      `     \u2248 phone for ${phoneMin} min`,
      L32,
      '   * * * NO REFUNDS * * *',
      '  THE PLANET CANNOT ISSUE',
      '   CARBON CREDITS FOR AI',
      L32,
      '    Please come again.',
      "    (We'll still be here.)",
      '           \uD83D\uDC80',
      E32,
    ].join('\n');
  }

  function buildReceiptShareText() {
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const rate    = getRateAtDate(new Date());
    const sessionTokens = Math.max(1, elapsed * rate);
    const impact  = calculateEnvironmentalImpact(sessionTokens);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    const co2g    = (impact.co2Kg * 1000).toFixed(1);
    const waterMl = Math.round(impact.waterL * 1000);
    return (
      `\uD83E\uDDFE My AI Death Clock receipt: AI consumed ${formatTokenCount(sessionTokens)} tokens in ${timeStr}. ` +
      `That's ${co2g}g CO\u2082, ${waterMl}mL water. ` +
      `And I didn't even prompt anything.\n` +
      `\u2192 ${SITE_URL} #TokenDeathClock #AIReceipt`
    );
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') {
      if (e.key === 'Escape') hideReceiptModal();
      return;
    }
    const modal    = document.getElementById('receipt-modal');
    if (!modal) return;
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function showReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;
    const body = document.getElementById('receipt-body');
    if (body) body.textContent = generateReceiptText();
    modal.hidden = false;
    receiptShown = true;
    modal.addEventListener('keydown', trapFocus);
    const firstBtn = modal.querySelector('button');
    if (firstBtn) firstBtn.focus();
    awardBadge('receipt_collector');
  }

  function hideReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;
    modal.hidden = true;
    modal.removeEventListener('keydown', trapFocus);
  }

  function initReceiptModal() {
    const triggerBtn = document.getElementById('getReceiptBtn');
    if (triggerBtn) triggerBtn.addEventListener('click', showReceiptModal);

    const closeBtn = document.getElementById('receiptCloseBtn');
    if (closeBtn)   closeBtn.addEventListener('click', hideReceiptModal);

    const shareBtn = document.getElementById('receiptShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openSharePopup(buildReceiptShareText());
        awardBadge('spreading_doom');
      });
    }

    const copyBtn = document.getElementById('receiptCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const bodyEl = document.getElementById('receipt-body');
        const text   = bodyEl ? bodyEl.textContent : generateReceiptText();
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Receipt'; }, 2000);
        }).catch(() => {
          copyBtn.textContent = '❌ Failed';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Receipt'; }, 2000);
        });
      });
    }

    // Close on backdrop click
    const modal = document.getElementById('receipt-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) hideReceiptModal();
      });
    }

  }

