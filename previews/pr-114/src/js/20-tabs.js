  // ---- Tab navigation ------------------------------------
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
    const VALID_TABS = new Set(
      Array.from(tabBtns).map((btn) => btn.dataset.tab)
    );

    // Build sectionId → tabName map so direct section deep-links work.
    const sectionToTab = {};
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      const tabName = panel.id.replace(/^tab-/, '');
      panel.querySelectorAll('[id]').forEach((el) => {
        sectionToTab[el.id] = tabName;
      });
    });

    function switchTab(targetTab, updateHash = true) {
      if (!VALID_TABS.has(targetTab)) return;
      tabBtns.forEach((btn) => {
        const isActive = btn.dataset.tab === targetTab;
        btn.classList.toggle('tab-btn--active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
        panel.hidden = panel.id !== 'tab-' + targetTab;
      });
      if (updateHash) {
        history.pushState(null, '', '#' + targetTab);
      }
    }

    function applyHash(smooth) {
      const hash = location.hash.slice(1);
      if (!hash) return;
      if (VALID_TABS.has(hash)) {
        switchTab(hash, false);
      } else if (sectionToTab[hash]) {
        switchTab(sectionToTab[hash], false);
        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        });
      }
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Inline "Dashboard" link inside the About tab
    document.querySelectorAll('.about-inline-tab-link[data-switch-tab]').forEach((link) => {
      link.addEventListener('click', () => switchTab(link.dataset.switchTab));
    });

    window.addEventListener('hashchange', () => applyHash(true));

    // Apply initial hash on page load without smooth-scroll
    applyHash(false);
  }

