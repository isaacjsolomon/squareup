/* DoWeo beta invitation. Does not create a second feedback system:
   the primary action opens the existing authenticated Beta Feedback Center. */
(function () {
  'use strict';
  if (document.getElementById('dw-beta-nudge')) return;

  const DELAY_MS = 7 * 60 * 1000;
  const ACTIVE_KEY = 'dw-beta-nudge-active-v1';
  const SEEN_KEY = 'dw-beta-nudge-seen-v1';
  const nudge = document.createElement('div');
  nudge.id = 'dw-beta-nudge';
  nudge.hidden = true;
  nudge.innerHTML = [
    '<section class="dw-beta-nudge-panel" role="dialog" aria-modal="true" aria-labelledby="dw-beta-nudge-title" aria-describedby="dw-beta-nudge-copy">',
      '<button class="dw-beta-nudge-close" type="button" aria-label="Close beta feedback invitation">×</button>',
      '<span class="dw-beta-nudge-diamond" aria-hidden="true">',
        '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">',
          '<path d="M13 22h38l8 12-27 26L5 34zM13 22l11 12 8-12 8 12 11-12M5 34h54M24 34l8 26 8-26"/>',
        '</svg>',
      '</span>',
      '<h2 id="dw-beta-nudge-title">Beta Feedback</h2>',
      '<p id="dw-beta-nudge-copy">You’ve been using DoWeo for a bit — we’d love to hear your thoughts!</p>',
      '<div class="dw-beta-nudge-topics" role="group" aria-label="Feedback category">',
        '<button type="button" data-dw-beta-topic="rating" aria-pressed="false"><span aria-hidden="true">◉</span>Tell us what you like</button>',
        '<button type="button" data-dw-beta-topic="idea" aria-pressed="true"><span aria-hidden="true">✧</span>Share ideas for new features</button>',
        '<button type="button" data-dw-beta-topic="bug" aria-pressed="false"><span aria-hidden="true">⚑</span>Report any issues</button>',
      '</div>',
      '<button type="button" class="dw-beta-nudge-give">Give Feedback <span aria-hidden="true">→</span></button>',
      '<button type="button" class="dw-beta-nudge-later">Maybe Later</button>',
    '</section>'
  ].join('');
  document.body.appendChild(nudge);
  const closeButton = nudge.querySelector('.dw-beta-nudge-close');
  const giveButton = nudge.querySelector('.dw-beta-nudge-give');
  const laterButton = nudge.querySelector('.dw-beta-nudge-later');
  let kind = 'idea';
  let elapsed = 0;
  let seen = false;
  let wasVisible = document.visibilityState === 'visible';
  let lastTick = performance.now();
  let lastFocus = null;
  let oldOverflow = '';
  try {
    elapsed = Math.max(0, Math.min(DELAY_MS, Number(sessionStorage.getItem(ACTIVE_KEY)) || 0));
    seen = sessionStorage.getItem(SEEN_KEY) === '1';
  } catch (_) { /* private mode: still works for this page load */ }

  function signedIn() {
    return !document.documentElement.classList.contains('sq-auth-loading') &&
      !document.body.classList.contains('sq-auth-guest') &&
      Boolean(document.getElementById('dw-beta-launch'));
  }
  function feedbackAction() {
    const desktop = matchMedia('(min-width:901px)').matches;
    const el = document.getElementById(desktop ? 'dw-beta-launch' : 'dw-beta-more-action');
    if (!el) return null;
    if (el.style.display === 'none' || !el.style.display) return null;
    return el;
  }
  function persist() {
    try { sessionStorage.setItem(ACTIVE_KEY, String(Math.round(elapsed))); } catch (_) {}
  }
  function markSeen() {
    seen = true;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
  }
  function hide(restoreFocus) {
    if (nudge.hidden) return;
    nudge.hidden = true;
    document.body.style.overflow = oldOverflow;
    if (restoreFocus && lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function')
      lastFocus.focus({preventScroll:true});
  }
  function dismiss() { markSeen(); hide(true); }
  function otherDialogOpen() {
    if (document.getElementById('dw-beta-modal')?.hidden === false) return true;
    if (document.querySelector('dialog[open], #auth-modal.open, .modal-bg.open')) return true;
    return [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(el =>
      !nudge.contains(el) && el.getClientRects().length > 0);
  }
  function maybeShow() {
    if (seen || !nudge.hidden || elapsed < DELAY_MS || !wasVisible || !signedIn() ||
        !feedbackAction() || otherDialogOpen()) return;
    markSeen(); // Never nag again in the same browsing session.
    lastFocus = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nudge.hidden = false;
    closeButton.focus({preventScroll:true});
    document.dispatchEvent(new Event('doweo:uiupdated'));
  }
  function tick() {
    const now = performance.now();
    // Cap delayed callbacks so sleeping/background tabs cannot count as use.
    if (wasVisible && signedIn() && !seen)
      elapsed = Math.min(DELAY_MS, elapsed + Math.max(0, Math.min(5000, now - lastTick)));
    lastTick = now;
    wasVisible = document.visibilityState === 'visible';
    if (!seen) persist();
    maybeShow();
  }

  nudge.querySelectorAll('[data-dw-beta-topic]').forEach(button=>{
    button.addEventListener('click',()=>{
      kind = button.dataset.dwBetaTopic;
      nudge.querySelectorAll('[data-dw-beta-topic]').forEach(other=>
        other.setAttribute('aria-pressed',String(other === button)));
    });
  });
  closeButton.addEventListener('click', dismiss);
  laterButton.addEventListener('click', dismiss);
  nudge.addEventListener('click', event=>{ if (event.target === nudge) dismiss(); });
  nudge.addEventListener('keydown', event=>{
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
    if (event.key !== 'Tab') return;
    const focusables = [closeButton, ...nudge.querySelectorAll('[data-dw-beta-topic]'), giveButton, laterButton];
    if (event.shiftKey && document.activeElement === focusables[0]) {
      event.preventDefault(); focusables[focusables.length-1].focus();
    } else if (!event.shiftKey && document.activeElement === focusables[focusables.length-1]) {
      event.preventDefault(); focusables[0].focus();
    }
  });
  giveButton.addEventListener('click',()=>{
    const target = feedbackAction();
    markSeen();
    hide(false);
    if (!target) return;
    // The existing mobile More button hides More and opens the real form.
    // The desktop launcher opens that same form.
    target.click();
    document.querySelector('#dw-beta-modal [data-kind="'+kind+'"]')?.click();
  });
  // Do not ask again if the visitor already opened feedback manually.
  const feedbackModal = document.getElementById('dw-beta-modal');
  if (feedbackModal) new MutationObserver(()=>{
    if (!feedbackModal.hidden) { markSeen(); hide(false); }
  }).observe(feedbackModal,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{
    tick(); lastTick = performance.now(); wasVisible = document.visibilityState === 'visible';
  });
  window.addEventListener('pagehide',()=>{ tick(); persist(); clearInterval(timer); },{once:true});
  const timer = setInterval(tick,1000);
  tick();
})();
