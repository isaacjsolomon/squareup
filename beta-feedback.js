/* DoWeo Beta Feedback Center: isolated, responsive overlay.
 * Uses the existing authenticated window.squareUpApi for GET/POST /api/feedback.
 * Never collects credentials, payment account details, or raw query strings.
 */
(function () {
  'use strict';
  if (document.getElementById('dw-feedback-dialog')) return;

  const desktopAnchor = document.getElementById('nav-about');
  const mobileGrid = document.querySelector('#sq-mobile-more-sheet .sq-balanced-more-grid');

  if (desktopAnchor) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'dw-feedback-desktop';
    button.className = 'sq-nav-link dw-feedback-trigger';
    button.innerHTML = '<span class="sq-nav-icon" aria-hidden="true">✎</span><span class="sq-nav-label">Beta Feedback</span>';
    desktopAnchor.insertAdjacentElement('beforebegin', button);
  }
  if (mobileGrid) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'dw-feedback-mobile';
    button.className = 'dw-feedback-trigger';
    button.innerHTML = '<span class="sq-balanced-icon" aria-hidden="true">✎</span><strong>Beta Feedback</strong>';
    mobileGrid.appendChild(button);
  }

  const overlay = document.createElement('div');
  overlay.id = 'dw-feedback-dialog';
  overlay.className = 'dw-feedback-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="dw-feedback-panel" role="dialog" aria-modal="true" aria-labelledby="dw-feedback-title" aria-describedby="dw-feedback-intro">
      <header class="dw-feedback-header">
        <div>
          <span class="dw-feedback-kicker">DOWeO EARLY ACCESS</span>
          <h2 id="dw-feedback-title">Help improve DoWeo</h2>
          <p id="dw-feedback-intro">Share a bug, suggest an improvement, or rate your experience.</p>
        </div>
        <button type="button" class="dw-feedback-close" id="dw-feedback-close" aria-label="Close feedback">×</button>
      </header>

      <div class="dw-feedback-tabs" role="tablist" aria-label="Feedback type">
        <button type="button" role="tab" id="dw-feedback-tab-bug" aria-selected="true" data-feedback-kind="bug">Report a bug</button>
        <button type="button" role="tab" id="dw-feedback-tab-idea" aria-selected="false" data-feedback-kind="idea">Suggest a feature</button>
        <button type="button" role="tab" id="dw-feedback-tab-rating" aria-selected="false" data-feedback-kind="rating">Rate DoWeo</button>
      </div>

      <form id="dw-feedback-form" novalidate>
        <div class="dw-feedback-field" id="dw-feedback-title-field">
          <label for="dw-feedback-subject">Short title <span aria-hidden="true">*</span></label>
          <input id="dw-feedback-subject" name="title" type="text" minlength="5" maxlength="120" required placeholder="What should we fix?">
        </div>
        <div class="dw-feedback-field" id="dw-feedback-stars-field" hidden>
          <span class="dw-feedback-label" id="dw-feedback-stars-label">How would you rate your experience?</span>
          <div class="dw-feedback-stars" role="group" aria-labelledby="dw-feedback-stars-label">
            <button type="button" data-rating="1" aria-label="1 star" aria-pressed="false">☆</button>
            <button type="button" data-rating="2" aria-label="2 stars" aria-pressed="false">☆</button>
            <button type="button" data-rating="3" aria-label="3 stars" aria-pressed="false">☆</button>
            <button type="button" data-rating="4" aria-label="4 stars" aria-pressed="false">☆</button>
            <button type="button" data-rating="5" aria-label="5 stars" aria-pressed="false">☆</button>
          </div>
        </div>
        <div class="dw-feedback-field">
          <label for="dw-feedback-details" id="dw-feedback-details-label">What happened? <span aria-hidden="true">*</span></label>
          <textarea id="dw-feedback-details" name="details" rows="4" minlength="15" maxlength="2000" required placeholder="Tell us what happened and what you expected."></textarea>
          <small id="dw-feedback-details-help">Include what you expected to happen. Up to 2,000 characters.</small>
        </div>
        <div class="dw-feedback-field" id="dw-feedback-steps-field">
          <label for="dw-feedback-steps">Steps to reproduce <span class="dw-feedback-optional">(optional)</span></label>
          <textarea id="dw-feedback-steps" name="steps" rows="2" maxlength="900" placeholder="1. Open a tracker&#10;2. Tap ..."></textarea>
        </div>
        <div class="dw-feedback-field">
          <label for="dw-feedback-device">Device used</label>
          <select id="dw-feedback-device" name="device">
            <option value="mobile">Phone</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Computer</option>
            <option value="other">Other / not sure</option>
          </select>
        </div>
        <p class="dw-feedback-privacy">Please don't include passwords, payment details, private financial data, or other people's personal information.</p>
        <p class="dw-feedback-message" id="dw-feedback-message" role="status" aria-live="polite"></p>
        <button type="submit" id="dw-feedback-send" class="dw-feedback-submit">Send feedback</button>
      </form>
      <section class="dw-feedback-history" aria-labelledby="dw-feedback-history-title">
        <div class="dw-feedback-history-top"><h3 id="dw-feedback-history-title">Your recent feedback</h3><button type="button" id="dw-feedback-refresh">Refresh</button></div>
        <div id="dw-feedback-history-list" class="dw-feedback-history-list" aria-live="polite"><p>Open this panel to see your submissions.</p></div>
      </section>
    </section>
  `;
  document.body.appendChild(overlay);

  const $ = id => document.getElementById(id);
  const form = $('dw-feedback-form');
  const subject = $('dw-feedback-subject');
  const details = $('dw-feedback-details');
  const steps = $('dw-feedback-steps');
  const message = $('dw-feedback-message');
  const send = $('dw-feedback-send');
  const history = $('dw-feedback-history-list');
  let kind = 'bug';
  let rating = 0;
  let lastFocus = null;
  let pending = false;

  const api = (method, data) => {
    if (typeof window.squareUpApi !== 'function')
      return Promise.reject(new Error('Please log in to send feedback.'));
    return window.squareUpApi('feedback', method, data);
  };
  const mark = (text, error) => {
    message.textContent = text;
    message.classList.toggle('dw-feedback-error', !!error);
  };

  function setRating(value) {
    rating = value;
    overlay.querySelectorAll('[data-rating]').forEach(button => {
      const active = Number(button.dataset.rating) <= rating;
      button.textContent = active ? '★' : '☆';
      button.setAttribute('aria-pressed', button.dataset.rating === String(rating) ? 'true' : 'false');
      button.classList.toggle('is-selected', active);
    });
  }
  function setKind(next) {
    kind = next;
    overlay.querySelectorAll('[data-feedback-kind]').forEach(button => {
      button.setAttribute('aria-selected', String(button.dataset.feedbackKind === next));
    });
    $('dw-feedback-title-field').hidden = next === 'rating';
    $('dw-feedback-stars-field').hidden = next !== 'rating';
    $('dw-feedback-steps-field').hidden = next !== 'bug';
    subject.required = next !== 'rating';
    details.required = next !== 'rating';
    details.minLength = next === 'rating' ? 0 : 15;
    $('dw-feedback-details-label').textContent =
      next === 'rating' ? 'What could we do better? (optional)' :
      next === 'idea' ? 'Describe your idea *' : 'What happened? *';
    subject.placeholder = next === 'idea' ? 'What feature would you like?' : 'What should we fix?';
    details.placeholder = next === 'rating'
      ? 'Tell us what you liked or what could improve.'
      : next === 'idea' ? 'How would this feature help you?' :
        'Tell us what happened and what you expected.';
    mark('', false);
  }

  function renderHistory(items) {
    history.replaceChildren();
    if (!Array.isArray(items) || !items.length) {
      const p = document.createElement('p');
      p.textContent = 'No feedback submitted yet.';
      history.appendChild(p);
      return;
    }
    for (const item of items) {
      const row = document.createElement('article');
      row.className = 'dw-feedback-history-item';
      const head = document.createElement('div');
      head.className = 'dw-feedback-history-heading';
      const label = document.createElement('strong');
      label.textContent = item.kind === 'rating'
        ? String(item.rating || '—') + ' / 5 stars'
        : item.title || (item.kind === 'idea' ? 'Feature idea' : 'Bug report');
      const status = document.createElement('span');
      status.className = 'dw-feedback-status';
      status.textContent = item.status || 'new';
      head.append(label, status);
      const meta = document.createElement('small');
      const date = item.created_at ? new Date(item.created_at) : null;
      meta.textContent = (item.kind === 'idea' ? 'Feature idea' : item.kind === 'bug' ? 'Bug report' : 'Rating')
        + (date && !Number.isNaN(date.getTime()) ? ' · ' + date.toLocaleDateString() : '');
      row.append(head, meta);
      history.appendChild(row);
    }
  }
  async function loadHistory() {
    history.textContent = 'Loading your feedback…';
    try {
      const result = await api('GET');
      if (overlay.hidden) return;
      renderHistory(result.items);
    } catch (error) {
      if (overlay.hidden) return;
      history.textContent = error?.message || 'Could not load feedback history.';
    }
  }

  function open() {
    if (document.body.classList.contains('sq-auth-guest')) return;
    lastFocus = document.activeElement;
    const more = $('sq-mobile-more-sheet');
    if (more) more.hidden = true;
    document.body.classList.remove('sq-balanced-sheet-open');
    overlay.hidden = false;
    document.documentElement.classList.add('dw-feedback-open');
    $('dw-feedback-close').focus();
    loadHistory();
  }
  function close() {
    if (pending) return;
    overlay.hidden = true;
    document.documentElement.classList.remove('dw-feedback-open');
    if (lastFocus?.isConnected && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  $('dw-feedback-desktop')?.addEventListener('click', open);
  $('dw-feedback-mobile')?.addEventListener('click', open);
  $('dw-feedback-close').addEventListener('click', close);
  $('dw-feedback-refresh').addEventListener('click', loadHistory);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.querySelectorAll('[data-feedback-kind]').forEach(button => {
    button.addEventListener('click', () => { setKind(button.dataset.feedbackKind); button.focus(); });
  });
  overlay.querySelectorAll('[data-rating]').forEach(button => {
    button.addEventListener('click', () => { setRating(Number(button.dataset.rating)); button.focus(); });
  });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])'))
      .filter(el => !el.closest('[hidden]') && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  $('dw-feedback-device').value = window.innerWidth <= 650 ? 'mobile' : window.innerWidth <= 900 ? 'tablet' : 'desktop';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    if (kind === 'rating' && !rating) {
      mark('Please choose a star rating before submitting.', true);
      $('dw-feedback-stars-field').querySelector('button')?.focus();
      return;
    }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const payload = {
      kind,
      title: kind === 'rating' ? '' : subject.value,
      details: details.value,
      steps: kind === 'bug' ? steps.value : '',
      rating: kind === 'rating' ? rating : null,
      device: $('dw-feedback-device').value,
      page: location.pathname // no query parameters or private invitation tokens
    };
    pending = true;
    send.disabled = true;
    send.textContent = 'Sending…';
    mark('', false);
    try {
      await api('POST', payload);
      form.reset();
      setRating(0);
      $('dw-feedback-device').value = window.innerWidth <= 650 ? 'mobile' : window.innerWidth <= 900 ? 'tablet' : 'desktop';
      mark('Thank you! Your feedback was saved.', false);
      await loadHistory();
    } catch (error) {
      mark(error?.message || 'Could not send feedback. Please try again.', true);
    } finally {
      pending = false;
      send.disabled = false;
      send.textContent = 'Send feedback';
    }
  });
  setKind('bug');
})();
