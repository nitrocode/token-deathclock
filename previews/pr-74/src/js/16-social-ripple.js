  // ============================================================
  // FEATURE: Social Ripple — "You're Not Alone"
  // ============================================================

  const PRESENCE_REACTIONS = [
    '"This makes me want to throw my laptop into the ocean." — Anonymous',
    '"I showed this to my manager. They said it was fine." — Anonymous',
    '"I can\'t stop refreshing it." — Anonymous',
    '"My AI assistant wrote this reaction." — Anonymous',
    '"Watching the counter tick feels weirdly calming?" — Anonymous',
    '"I sent this to my friends. None of them opened it." — Anonymous',
    '"We did this. We\'re still doing this." — Anonymous',
    '"The counter went up while I was typing this." — Anonymous',
  ];

  let presenceReactionIdx = 0;

  function updatePresenceStrip() {
    const countEl    = document.getElementById('presenceCount');
    const reactionEl = document.getElementById('presenceReaction');
    if (!countEl) return;

    const count = getSimulatedViewerCount(Date.now());
    countEl.textContent = count.toLocaleString();

    if (reactionEl) {
      reactionEl.style.opacity = '0';
      setTimeout(() => {
        // Wrap index to keep it bounded
        presenceReactionIdx = presenceReactionIdx % PRESENCE_REACTIONS.length;
        reactionEl.textContent = PRESENCE_REACTIONS[presenceReactionIdx];
        reactionEl.style.opacity = '1';
        presenceReactionIdx++;
      }, 500);
    }
  }

  function initPresenceStrip() {
    updatePresenceStrip();
    setInterval(updatePresenceStrip, 25000);
  }

