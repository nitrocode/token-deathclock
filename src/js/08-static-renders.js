  // ---- Render token-saving tips ---------------------------
  function renderTips() {
    const grid = document.getElementById('tipsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    TOKEN_TIPS.forEach((tip) => {
      const card = document.createElement('div');
      card.className = 'tip-card';
      card.id = 'tip-' + escHtml(tip.id);
      const impact = calculateTipImpact(tip.savingPct, 1); // 1 % of global users
      const savedTokensStr = formatTokenCountShort(impact.tokensPerDay);
      const savedCo2Str = formatTokenCountShort(impact.co2KgPerDay);
      card.innerHTML = `
        <div class="tip-header">
          <span class="tip-icon" aria-hidden="true">${tip.icon}</span>
          <div class="tip-title">${escHtml(tip.title)}</div>
        </div>
        <p class="tip-text">${escHtml(tip.tip)}</p>
        <p class="tip-detail">${escHtml(tip.detail)}</p>
        <div class="tip-impact">
          If 1&#x202F;% of global users applied this tip:<br>
          <strong>${escHtml(savedTokensStr)} tokens/day saved</strong> ·
          <strong>${escHtml(savedCo2Str)} kg CO₂/day avoided</strong>
        </div>
        ${tip.reference ? `<a href="${escHtml(tip.reference)}" class="tip-ref" target="_blank" rel="noopener noreferrer">📎 Learn more</a>` : ''}
      `;
      grid.appendChild(card);
    });
  }

  // ---- Render changelog tab -----------------------------------
  function renderChangelog() {
    const list = document.getElementById('changelogList');
    if (!list) return;

    const versionEl = document.getElementById('siteVersion');
    if (versionEl && SITE_VERSION) {
      versionEl.textContent = 'v' + SITE_VERSION;
    }

    if (!CHANGELOG_RELEASES || CHANGELOG_RELEASES.length === 0) {
      list.innerHTML = '<p class="about-body">No changelog entries found.</p>';
      return;
    }

    let html = '';
    CHANGELOG_RELEASES.forEach((release) => {
      const isUnreleased = release.version === 'Unreleased';
      const dateStr = release.date
        ? `<span class="changelog-date">${escHtml(release.date)}</span>`
        : '';
      const ghUrl = isUnreleased
        ? 'https://github.com/nitrocode/token-deathclock/compare/v' +
          escHtml(SITE_VERSION) + '...HEAD'
        : 'https://github.com/nitrocode/token-deathclock/releases/tag/v' +
          escHtml(release.version);
      html += `<div class="changelog-release${isUnreleased ? ' changelog-release--unreleased' : ''}">`;
      html += `<div class="changelog-release-header">`;
      html += `<a class="changelog-version" href="${ghUrl}" target="_blank" rel="noopener noreferrer">`;
      html += isUnreleased ? '🔧 Unreleased' : escHtml('v' + release.version);
      html += `</a>${dateStr}`;
      html += `</div>`;
      if (release.sections.length === 0) {
        html += `<p class="changelog-empty">No entries yet.</p>`;
      }
      release.sections.forEach((sec) => {
        html += `<div class="changelog-section">`;
        html += `<h4 class="changelog-section-heading">${escHtml(sec.heading)}</h4>`;
        html += `<ul class="changelog-items">`;
        sec.items.forEach((item) => {
          html += `<li class="changelog-item">${escHtml(item)}</li>`;
        });
        html += `</ul></div>`;
      });
      html += `</div>`;
    });

    list.innerHTML = html;
  }

  // ---- Render footer meta-irony stats -------------------------
  function renderFooterStats() {
    const el = document.getElementById('footerMetaIrony');
    if (!el || PROJECT_PR_COUNT == null || PROJECT_TOTAL_TOKENS == null) return;
    const formattedTokens = '~' + PROJECT_TOTAL_TOKENS.toLocaleString('en-US');
    el.innerHTML =
      '🔥 This site was built using AI coding agents across ' +
      escHtml(String(PROJECT_PR_COUNT)) + ' pull requests, consuming an estimated ' +
      '<strong>' + escHtml(formattedTokens) + ' tokens</strong> in the process \u2014 ' +
      'adding to the very problem it tracks.';
  }

  // ---- Add anchor links to section headings -------------------
  function renderSectionAnchors() {
    document.querySelectorAll('section[id]').forEach((section) => {
      const h2 = section.querySelector('h2');
      if (!h2) return;
      if (h2.querySelector('.section-anchor')) return;
      const anchor = document.createElement('a');
      anchor.className = 'section-anchor';
      anchor.href = '#' + section.id;
      anchor.setAttribute('aria-label', 'Link to section: ' + section.id);
      anchor.textContent = '#';
      h2.appendChild(anchor);
    });
  }

  // ============================================================
  // FUN FEATURES
  // ============================================================

  const SITE_URL = 'https://nitrocode.github.io/token-deathclock/';
  const SHARE_PANEL_DELAY_MS = 10_000; // 10 000 ms — delay before showing floating share panel

