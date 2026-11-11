export function isSafeBranch(name) {
  return typeof name === 'string' && (/^feature\/jarvis-[a-z0-9-]+$/.test(name) || /^jarvis\/[a-z0-9-]+$/.test(name));
}
export function validateTask(value) {
  if (typeof value !== 'string' || value.trim().length < 12 || value.length > 3000)
    return 'Describe a task in 12–3000 characters';
  if (/[\u0000-\u001f]/.test(value)) return 'Control characters are not accepted';
  return null;
}
export function safeSearch(q) {
  if (typeof q !== 'string') return null;
  const s = q.trim();
  return s.length >= 2 && s.length <= 60 && /^[\w .-]+$/.test(s) ? s : null;
}
