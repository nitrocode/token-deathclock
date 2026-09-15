  // ---- Personal Footprint Calculator --------------------------

  function updateCalcResults() {
    const promptsEl = document.getElementById('calcPrompts');
    const lengthEl  = document.getElementById('calcLength');
    const modelEl   = document.getElementById('calcModel');
    if (!promptsEl || !lengthEl || !modelEl) return;

    const prompts = parseInt(promptsEl.value,  10) || 20;
    const tokens  = parseInt(lengthEl.value,   10) || 500;
    const mult    = parseFloat(modelEl.value)      || 1;

    const fp = calculatePersonalFootprint(prompts, tokens, mult);

    const co2g       = (fp.weekly.co2Kg   * 1000).toFixed(1);
    const waterMlW   = Math.round(fp.weekly.waterL * 1000);
    const co2gA      = Math.round(fp.annual.co2Kg   * 1000);
    const globalT    = (fp.globalWeeklyCo2Kg / 1000).toFixed(1);
    const kmDriven   = (fp.annual.co2Kg / 0.171).toFixed(1);
    const globalCars = formatTokenCount(fp.globalWeeklyCo2Kg / (0.171 * 1000 / 52));
    const treeBail   = Math.max(1, Math.round(fp.annual.co2Kg / 21));
    const phoneCharges = Math.round(fp.weekly.kWh / 0.015);

    const results = document.getElementById('calc-results');
    if (!results) return;

    results.innerHTML = `
      <div class="wanted-poster">
        <div class="wanted-title">WANTED</div>
        <div class="wanted-subtitle">For Environmental Crimes Against the Atmosphere</div>
        <div class="wanted-divider"></div>
        <div class="wanted-charges">
          <div class="wanted-charge"><strong>COUNT I:</strong> Consuming ${escHtml(formatTokenCount(fp.weeklyTokens))} tokens per week — enough to power ${escHtml(phoneCharges.toLocaleString())} smartphone charges.</div>
          <div class="wanted-charge"><strong>COUNT II:</strong> Emitting ${escHtml(co2g)} g CO\u2082 weekly — equivalent to driving ${escHtml(kmDriven)} km a year.</div>
          <div class="wanted-charge"><strong>COUNT III:</strong> Evaporating ${escHtml(String(waterMlW))} mL of cooling water per week without remorse.</div>
          <div class="wanted-charge"><strong>COUNT IV:</strong> Projecting annual emissions of ${escHtml(String(co2gA))} g CO\u2082 — sustained and premeditated.</div>
        </div>
        <div class="wanted-divider"></div>
        <div class="wanted-bail">⚖️ BAIL: Plant ${escHtml(String(treeBail))} tree${treeBail !== 1 ? 's' : ''} or delete your ChatGPT account.</div>
        <div class="wanted-global">If all 500M AI users matched this profile: ${escHtml(globalT)} tonnes CO\u2082/week — equiv. ${escHtml(globalCars)} cars driven.</div>
      </div>`;
  }

  function buildCalcShareText() {
    const promptsEl = document.getElementById('calcPrompts');
    const lengthEl  = document.getElementById('calcLength');
    const modelEl   = document.getElementById('calcModel');
    const prompts   = promptsEl ? (parseInt(promptsEl.value, 10) || 20) : 20;
    const tokens    = lengthEl  ? (parseInt(lengthEl.value,  10) || 500) : 500;
    const mult      = modelEl   ? (parseFloat(modelEl.value) || 1) : 1;
    const fp        = calculatePersonalFootprint(prompts, tokens, mult);
    const co2g      = (fp.weekly.co2Kg * 1000).toFixed(1);
    const globalT   = (fp.globalWeeklyCo2Kg / 1000).toFixed(0);
    return (
      `\uD83E\uDDEE I sent ${prompts} AI prompts this week. ` +
      `That's ~${formatTokenCount(fp.weeklyTokens)} tokens, ~${co2g}g CO\u2082. ` +
      `Multiply me by 500 million \u2192 ${globalT} tonnes of CO\u2082/week just from AI prompts.\n` +
      `\u2192 ${SITE_URL} #AICarbonFootprint #TokenDeathClock`
    );
  }

  function initCalculator() {
    const toggleBtn = document.getElementById('calcToggleBtn');
    const content   = document.getElementById('calc-content');
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const opening = content.hidden;
        content.hidden = !opening;
        toggleBtn.textContent = opening
          ? '\u25BC Close Calculator'
          : '\u25BA Open Personal AI Carbon Footprint Calculator';
        toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if (opening) {
          updateCalcResults();
          awardBadge('number_cruncher');
        }
      });
    }

    ['calcPrompts', 'calcLength', 'calcModel'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (id === 'calcPrompts') {
          const val = document.getElementById('calcPromptsVal');
          if (val) val.textContent = el.value;
          el.setAttribute('aria-valuenow', el.value);
        }
        updateCalcResults();
      });
    });

    const shareBtn = document.getElementById('calcShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openSharePopup(buildCalcShareText());
        awardBadge('spreading_doom');
      });
    }
  }

