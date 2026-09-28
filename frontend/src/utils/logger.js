const enabled = import.meta.env.VITE_DEBUG_LOGS === 'true' || (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS !== 'false');
const forward = import.meta.env.DEV && import.meta.env.VITE_FORWARD_CLIENT_LOGS !== 'false';
const hidden = /password|secret|token|authorization|cookie|signature|otp|email|phone|contact|address|pickup|destination|latitude|longitude|body|headers|params/i;
function clean(value) {
  if (typeof value === 'string') return value.replace(/[\r\n\t]/g, ' ').replace(/Bearer\s+[^\s,]+/gi, 'Bearer [REDACTED]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[TOKEN REDACTED]').replace(/(?:mongodb(?:\+srv)?|https?):\/\/[^\s"']+/gi, '[URL REDACTED]').replace(/((?:password|secret|token|otp|signature)\s*[:=]\s*)[^,;\s]+/gi, '$1[REDACTED]').slice(0, 300);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hidden.test(key) ? '[REDACTED]' : clean(item)]));
  return value;
}
export function log(event, details = {}, level = 'info') {
  if (!enabled && level !== 'error') return;
  const safe = clean(details);
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](`[RideX ${new Date().toISOString()}] ${event}`, safe);
  if (forward && event.startsWith('ui.')) {
    // Native fetch avoids a logging loop through Axios interceptors.
    fetch(`${import.meta.env.VITE_BASE_URL || 'http://localhost:3000'}/debug/client-events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, detail: JSON.stringify(safe).slice(0, 500) }), keepalive: true }).catch(() => {});
  }
}
export function startBrowserLogging() {
  log('ui.start', { mode: import.meta.env.MODE });
  window.addEventListener('error', event => log('ui.error', { reason: event.message, line: event.lineno, column: event.colno }, 'error'));
  window.addEventListener('unhandledrejection', event => log('ui.unhandled_rejection', { reason: event.reason instanceof Error ? event.reason.message : 'Unhandled promise rejection' }, 'error'));
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (button) log('ui.click', { action: button.dataset.logAction || button.type || 'button', page: window.location.pathname });
  }, true);
  document.addEventListener('submit', () => log('ui.submit', { page: window.location.pathname }), true);
}
