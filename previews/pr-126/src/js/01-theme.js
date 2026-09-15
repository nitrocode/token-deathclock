  // ---- Theme toggle ----------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    currentTheme = theme;
    if (chartInstance) updateChartColors();
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try { localStorage.setItem(LS_THEME_KEY, newTheme); } catch (_) { /* ignore */ }
    if (newTheme === 'light') awardBadge('optimist');
  }

