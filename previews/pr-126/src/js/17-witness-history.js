  // ============================================================
  // FEATURE: Witness History — Live Session Event Log
  // ============================================================

  let logEntryCount = 0;
  const LOG_INTERVAL_MS  = 15000;
  const MAX_LOG_ENTRIES  = 50;

  function appendLogEntry() {
    const logEl = document.getElementById('event-log');
    if (!logEl) return;

    const now = Date.now();
    const elapsed = Math.max(1, (now - pageLoadTime) / 1000);
    const rate = getRateAtDate(new Date(now));
    const sessionTokens = elapsed * rate;

    const d = new Date(now);
    const timeStr = [
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      String(d.getSeconds()).padStart(2, '0'),
    ].join(':');

    const equivs = generateEquivalences(sessionTokens, 'hopeful');
    const equiv = equivs.length
      ? equivs[logEntryCount % equivs.length]
      : null;

    const entry = document.createElement('div');
    entry.className = 'event-log-entry';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = timeStr;
    entry.appendChild(timeSpan);

    if (equiv) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'log-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = equiv.icon;
      entry.appendChild(iconSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'log-text';
    const tokenStr = formatTokenCount(sessionTokens);
    textSpan.textContent = equiv
      ? '+' + tokenStr + ' tokens since you arrived · ' + equiv.text
      : '+' + tokenStr + ' tokens generated globally since you arrived';
    entry.appendChild(textSpan);

    logEl.appendChild(entry);

    // Cap at MAX_LOG_ENTRIES visible entries to avoid unbounded DOM growth
    while (logEl.children.length > MAX_LOG_ENTRIES) {
      logEl.removeChild(logEl.firstChild);
    }

    // Auto-scroll to the newest entry
    logEl.scrollTop = logEl.scrollHeight;
    logEntryCount++;
  }

  function buildLogExportText() {
    const logEl = document.getElementById('event-log');
    if (!logEl) return '';
    const lines = [];
    lines.push('=== AI DEATH CLOCK — SESSION LOG ===');
    lines.push('Session started: ' + new Date(pageLoadTime).toUTCString());
    lines.push('');
    logEl.querySelectorAll('.event-log-entry').forEach((entry) => {
      const time = entry.querySelector('.log-time');
      const text = entry.querySelector('.log-text');
      if (time && text) {
        lines.push('[' + time.textContent + '] ' + text.textContent);
      }
    });
    lines.push('');
    lines.push('\u2192 ' + SITE_URL);
    return lines.join('\n');
  }

  function initEventLog() {
    // First entry after 5 seconds, then every 15 seconds
    setTimeout(appendLogEntry, 5000);
    setInterval(appendLogEntry, LOG_INTERVAL_MS);

    const exportBtn = document.getElementById('exportLogBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const text = buildLogExportText();
        navigator.clipboard.writeText(text).then(() => {
          exportBtn.textContent = '\u2705 Copied!';
          setTimeout(() => { exportBtn.textContent = '\uD83D\uDCCB Copy Log'; }, 2000);
        }).catch(() => {
          exportBtn.textContent = '\u274C Failed';
          setTimeout(() => { exportBtn.textContent = '\uD83D\uDCCB Copy Log'; }, 2000);
        });
      });
    }
  }

