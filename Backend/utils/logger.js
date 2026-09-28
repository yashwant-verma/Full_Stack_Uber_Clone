const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const hiddenKey = /password|passwd|secret|token|authorization|cookie|signature|otp|api.?key|email|phone|contact|address|pickup|destination|latitude|longitude|^lat$|^lng$|^ltd$|vpa|^uri$|^url$|body|headers|params/i;
function cleanText(value) {
  return String(value).replace(/\x1b\[[0-9;]*m/g, '').replace(/[\r\n\t]/g, ' ')
    .replace(/(?:mongodb(?:\+srv)?|https?):\/\/[^\s"']+/gi, '[URL REDACTED]')
    .replace(/Bearer\s+[^\s,]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[TOKEN REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL REDACTED]')
    .replace(/((?:password|secret|token|otp|signature)\s*[:=]\s*)[^,;\s]+/gi, '$1[REDACTED]').slice(0, 500);
}
function redact(value, depth = 0) {
  if (depth > 5) return '[TRUNCATED]';
  if (value instanceof Error) return { name: value.name, code: value.code, status: value.status, message: cleanText(value.message) };
  if (typeof value === 'string') return cleanText(value);
  if (Array.isArray(value)) return value.slice(0, 10).map(item => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    return Object.fromEntries(Object.entries(value).slice(0, 25).map(([key, nested]) => [key, hiddenKey.test(key) ? '[REDACTED]' : redact(nested, depth + 1)]));
  }
  return value;
}
function log(level, event, details = {}) {
  const configured = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  if (levels[level] < (levels[configured] ?? levels.info)) return;
  const record = { time: new Date().toISOString(), level, event: cleanText(event), requestId: context.getStore()?.requestId, ...redact(details) };
  const line = process.env.LOG_FORMAT === 'json' ? JSON.stringify(record) : `${record.time} ${level.toUpperCase().padEnd(5)} ${record.requestId ? '[' + record.requestId + '] ' : ''}${record.event} ${JSON.stringify(redact(details))}`;
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}
module.exports = { context, redact, cleanText, debug: (event, data) => log('debug', event, data), info: (event, data) => log('info', event, data), warn: (event, data) => log('warn', event, data), error: (event, data) => log('error', event, data) };
