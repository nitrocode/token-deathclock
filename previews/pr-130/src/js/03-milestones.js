  // ---- Render milestones -----------------------------------
  function renderMilestones() {
    const grid = document.getElementById('milestonesGrid');
    if (!grid) return;

    const tokens = getCurrentTokens();
    grid.innerHTML = '';

    MILESTONES.forEach((m, idx) => {
      const isTriggered = tokens >= m.tokens;
      const prev = idx === 0 ? 0 : MILESTONES[idx - 1].tokens;
      const pct = milestoneProgress(tokens, prev, m.tokens);
      const prediction = predictMilestoneDate(tokens, TOKENS_PER_SECOND, m.tokens);

      const card = document.createElement('div');
      card.className = 'milestone-card' + (isTriggered ? ' triggered' : '');
      card.id = 'milestone-' + m.id;
      card.innerHTML = `
        <div class="milestone-header">
          <span class="milestone-icon" aria-hidden="true">${m.icon}</span>
          <div>
            <div class="milestone-name">${escHtml(m.name)}</div>
            <div class="milestone-threshold">${escHtml(m.shortDesc)}</div>
          </div>
        </div>
        <p class="milestone-desc">${escHtml(m.description)}</p>
        <p class="milestone-consequence">${escHtml(m.consequence)}</p>
        <div class="milestone-event">${escHtml(m.followingEvent)}</div>
        <div class="milestone-progress-wrap">
          <div class="milestone-progress-label">
            <span>Progress</span>
            <span class="progress-pct">${pct.toFixed(1)}%</span>
          </div>
          <div class="progress-bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        ${prediction ? `<div class="milestone-predict">⏱ Predicted: ${escHtml(formatDate(prediction))} (${escHtml(getTimeDelta(prediction))})</div>` : ''}
        ${m.reference ? `<a href="${escHtml(m.reference)}" class="milestone-ref" target="_blank" rel="noopener noreferrer">📎 Source</a>` : ''}
      `;
      grid.appendChild(card);
    });
  }

  // ---- Render predictions table ----------------------------
  function renderPredictionsTable() {
    const tbody = document.getElementById('predictionsBody');
    if (!tbody) return;

    const tokens = getCurrentTokens();
    tbody.innerHTML = '';

    MILESTONES.forEach((m) => {
      const isPassed = tokens >= m.tokens;
      const prediction = isPassed
        ? null
        : predictMilestoneDate(tokens, TOKENS_PER_SECOND, m.tokens);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escHtml(m.icon)} ${escHtml(m.name)}</td>
        <td>${escHtml(m.shortDesc)}</td>
        <td>${isPassed ? '<span class="passed-badge">PASSED</span>' : '⏳ Pending'}</td>
        <td class="${isPassed ? '' : 'future-date'}">${isPassed ? '—' : escHtml(formatDate(prediction))}</td>
        <td>${isPassed ? '<span style="color:var(--accent)">Already triggered</span>' : escHtml(getTimeDelta(prediction))}</td>
      `;
      tbody.appendChild(tr);
    });
  }

