  // ---- "What Could We Have Done Instead?" Equivalences -------

  let snarkMode = false;
  let equivIdx  = 0;

  function updateEquivalences() {
    const tokens  = getCurrentTokens();
    const entries = generateEquivalences(tokens, snarkMode ? 'snarky' : 'hopeful');
    if (!entries.length) return;
    const entry   = entries[equivIdx % entries.length];
    const iconEl  = document.getElementById('equivIcon');
    const textEl  = document.getElementById('equivText');
    if (iconEl) iconEl.textContent = entry.icon;
    if (textEl) textEl.textContent = entry.text;
    equivIdx++;
  }

  function initEquivalences() {
    updateEquivalences();
    setInterval(updateEquivalences, 5000);

    const toggle = document.getElementById('snarkToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        snarkMode = !snarkMode;
        toggle.textContent = snarkMode ? '🌱 Hopeful Mode' : '😤 Snarky Mode';
        toggle.setAttribute('aria-pressed', snarkMode ? 'true' : 'false');
        equivIdx = 0;
        updateEquivalences();
      });
    }
  }

