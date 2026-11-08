/* Weo: the friendly DoWeo AI diamond. Static SVG, no external image/service.
 * Only decorates existing chat controls; never modifies payment or account data.
 */
(() => {
  'use strict';
  const launch = document.getElementById('sq-ai-launch');
  const panel = document.getElementById('sq-ai-window');
  if (!launch || !panel) return;

  let mood = 'idle';
  let resetTimer = null;
  let iconCount = 0;

  // SVG is a fixed, trusted template; user content is never interpolated here.
  function createIcon() {
    const gradient = 'weo-color-' + (++iconCount);
    const host = document.createElement('span');
    host.innerHTML = '<svg class="weo-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
      + '<defs><linearGradient id="' + gradient + '" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#9cfff3"/><stop offset="54%" stop-color="#50e8e2"/><stop offset="100%" stop-color="#15acc9"/></linearGradient></defs>'
      + '<path class="weo-diamond" d="M60 5 C66 37 81 53 115 60 C82 67 66 84 60 115 C54 84 38 67 5 60 C38 53 54 37 60 5Z" fill="url(#' + gradient + ')" />'
      + '<path class="weo-highlight" d="M60 15 C65 41 76 53 101 60 C80 57 70 53 60 42 C51 53 39 57 20 60 C47 52 54 40 60 15Z" fill="#e3fff8" opacity=".35" />'
      + '<g class="weo-eyes-normal"><ellipse cx="47" cy="65" rx="4" ry="5.5" fill="#0d4158"/><ellipse cx="73" cy="65" rx="4" ry="5.5" fill="#0d4158"/></g>'
      + '<g class="weo-eyes-thinking"><ellipse cx="47" cy="57" rx="4" ry="5" fill="#0d4158"/><ellipse cx="73" cy="57" rx="4" ry="5" fill="#0d4158"/></g>'
      + '<g class="weo-eyes-happy" fill="none" stroke="#0d4158" stroke-width="4" stroke-linecap="round"><path d="M41 65 Q47 57 53 65"/><path d="M67 65 Q73 57 79 65"/></g>'
      + '<path class="weo-mouth-idle" d="M49 80 Q60 91 71 80" fill="none" stroke="#0d4158" stroke-width="4" stroke-linecap="round"/>'
      + '<path class="weo-mouth-thinking" d="M53 83 H67" fill="none" stroke="#0d4158" stroke-width="3.5" stroke-linecap="round"/>'
      + '<path class="weo-mouth-happy" d="M45 80 Q60 104 75 80Z" fill="#0d4158"/>'
      + '<ellipse class="weo-mouth-hello" cx="60" cy="83" rx="7" ry="9" fill="#0d4158"/>'
      + '<circle class="weo-cheek" cx="36" cy="79" r="5" fill="#c9fff7" opacity=".55"/>'
      + '<circle class="weo-cheek" cx="84" cy="79" r="5" fill="#c9fff7" opacity=".55"/>'
      + '</svg>';
    return host.firstElementChild;
  }

  function mount(container) {
    if (!container) return;
    if (!container.querySelector('.weo-svg')) {
      container.textContent = '';
      container.appendChild(createIcon());
    }
    container.classList.add('weo-mascot');
    container.setAttribute('data-weo-mood', mood);
  }

  function refresh() {
    mount(launch.querySelector('.sq-ai-mark'));
    mount(panel.querySelector('.sq-ai-avatar'));
    mount(panel.querySelector('.sq-ai-welcome-mark'));
  }

  function decorateBubble(bubble) {
    if (!bubble || bubble.classList.contains('user') || bubble.querySelector('.weo-bubble-avatar')) return;
    const badge = document.createElement('span');
    badge.className = 'weo-bubble-avatar';
    badge.setAttribute('aria-hidden', 'true');
    badge.appendChild(createIcon());
    bubble.classList.add('weo-has-avatar');
    bubble.prepend(badge);
  }

  function setMood(next) {
    if (!['idle', 'thinking', 'success', 'helping', 'hello'].includes(next)) next = 'idle';
    if (resetTimer !== null) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    mood = next;
    refresh();
    for (const el of panel.querySelectorAll('.weo-mascot')) {
      el.setAttribute('data-weo-mood', mood);
    }
    const timeout = next === 'success' ? 2300 : next === 'helping' ? 2800 : next === 'hello' ? 1600 : 0;
    if (timeout) resetTimer = setTimeout(() => setMood('idle'), timeout);
  }

  window.WeoMascot = Object.freeze({refresh, decorateBubble, setMood});
  refresh();
})();
