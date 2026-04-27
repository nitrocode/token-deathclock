  // ---- Share Your Doom ----------------------------------------

  const REDDIT_SHARE_TITLE = 'There\'s a live counter showing how much energy AI burns every second — the numbers are wild';

  function buildShareText() {
    const now     = Date.now();
    const elapsed = Math.floor((now - pageLoadTime) / 1000);
    const rate    = getRateAtDate(new Date(now));
    const sessionTokens = Math.max(1, elapsed * rate);
    const phrases = sessionEquivalences(sessionTokens);
    const equiv   = phrases.length
      ? phrases[Math.floor(Math.random() * phrases.length)]
      : null;
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

    // Friendly, jargon-free hooks — rotated randomly so repeated shares feel fresh.
    // Avoid "tokens" (too technical) and spammy hashtags.
    const hooks = [
      `🤖 I just spent ${timeStr} watching a live counter of how much energy AI is burning. It's a lot.`,
      `😬 There's a website that tracks AI's real-time energy use and I've been staring at it for ${timeStr}.`,
      `💡 Spent ${timeStr} on a site showing AI's environmental cost ticking up live. You might want to see this.`,
      `🌍 AI is quietly burning through enormous amounts of energy. Someone made a live counter. I've been watching for ${timeStr}.`,
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    let text = hook;
    if (equiv) text += `\nIn that time alone: ${equiv}.`;
    text += `\n👉 ${SITE_URL}`;
    return text;
  }

  // Generic share — uses OS share sheet when available, falls back to Twitter deep-link.
  // Use this for buttons that aren't labelled with a specific platform.
  function openSharePopup(text) {
    if (navigator.share) {
      navigator.share({ text, url: SITE_URL }).catch(() => {
        // User cancelled or share failed — fall back to Twitter
        openTwitterShare(text);
      });
      return;
    }
    openTwitterShare(text);
  }

  // Platform-specific deep-link helpers — bypass navigator.share intentionally.
  function openTwitterShare(text) {
    const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer,width=560,height=420');
  }

  function openRedditShare(title) {
    const url = 'https://www.reddit.com/submit?url=' +
      encodeURIComponent(SITE_URL) + '&title=' + encodeURIComponent(title);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openLinkedInShare(text) {
    const url = 'https://www.linkedin.com/shareArticle?mini=true&url=' +
      encodeURIComponent(SITE_URL) + '&title=' +
      encodeURIComponent('Token Deathclock — AI\'s Environmental Cost, Live') +
      '&summary=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openWhatsAppShare(text) {
    const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openBlueskyShare(text) {
    const url = 'https://bsky.app/intent/compose?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Copies `value` to clipboard; updates `btn` text to give feedback.
  function copyToClipboard(btn, value, resetLabel) {
    if (!navigator.clipboard) {
      btn.textContent = '❌ Not supported';
      setTimeout(() => { btn.textContent = resetLabel; }, 2000);
      return;
    }
    navigator.clipboard.writeText(value).then(() => {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = resetLabel; }, 2000);
    }).catch(() => {
      btn.textContent = '❌ Failed';
      setTimeout(() => { btn.textContent = resetLabel; }, 2000);
    });
  }

  function initSharePanel() {
    const panel   = document.getElementById('share-doom-panel');
    const options = document.getElementById('share-doom-options');
    if (!panel) return;

    // Show floating panel after 10 s of page time
    setTimeout(() => { panel.hidden = false; }, SHARE_PANEL_DELAY_MS);

    // Support ?share=true URL param — auto-open options immediately
    if (new URLSearchParams(window.location.search).get('share') === 'true') {
      panel.hidden = false;
      if (options) options.hidden = false;
    }

    const mainBtn = document.getElementById('shareDoomBtn');
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        if (options) options.hidden = !options.hidden;
      });
    }

    const twitterBtn = document.getElementById('shareTwitterBtn');
    if (twitterBtn) {
      twitterBtn.addEventListener('click', () => {
        // Use direct deep-link — bypasses navigator.share for platform-specific button
        openTwitterShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const redditBtn = document.getElementById('shareRedditBtn');
    if (redditBtn) {
      redditBtn.addEventListener('click', () => {
        openRedditShare(REDDIT_SHARE_TITLE);
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const linkedinBtn = document.getElementById('shareLinkedInBtn');
    if (linkedinBtn) {
      linkedinBtn.addEventListener('click', () => {
        openLinkedInShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const whatsappBtn = document.getElementById('shareWhatsAppBtn');
    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', () => {
        openWhatsAppShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const blueskyBtn = document.getElementById('shareBlueskyBtn');
    if (blueskyBtn) {
      blueskyBtn.addEventListener('click', () => {
        openBlueskyShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const copyBtn = document.getElementById('shareCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyToClipboard(copyBtn, buildShareText(), '📋 Copy text');
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const closeBtn = document.getElementById('shareCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => { if (options) options.hidden = true; });
    }

    // Close options when clicking outside
    document.addEventListener('click', (e) => {
      if (options && !options.hidden && panel && !panel.contains(e.target)) {
        options.hidden = true;
      }
    });
  }

  // ---- Footer "Spread the Doom" share row ---------------------

  function initFooterShare() {
    const shareText = () => buildShareText();
    const redditTitle = REDDIT_SHARE_TITLE;

    const map = [
      { id: 'footerShareTwitter',  fn: () => openTwitterShare(shareText()) },
      { id: 'footerShareReddit',   fn: () => openRedditShare(redditTitle) },
      { id: 'footerShareLinkedIn', fn: () => openLinkedInShare(shareText()) },
      { id: 'footerShareWhatsApp', fn: () => openWhatsAppShare(shareText()) },
      { id: 'footerShareBluesky',  fn: () => openBlueskyShare(shareText()) },
      { id: 'footerShareCopy',     fn: (btn) => copyToClipboard(btn, SITE_URL, '📋 Copy link') },
    ];

    map.forEach(({ id, fn }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          fn(btn);
          awardBadge('spreading_doom');
        });
      }
    });
  }

