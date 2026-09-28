const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const events = new Set(['ui.start', 'ui.navigation', 'ui.click', 'ui.submit', 'ui.error', 'ui.unhandled_rejection', 'ui.socket', 'ui.geolocation']);
// Development-only bridge: browser events can appear in the backend terminal too.
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CLIENT_LOGS === 'false') return res.sendStatus(404);
  next();
});
router.use(rateLimit({ windowMs: 60000, limit: 90, standardHeaders: 'draft-7', legacyHeaders: false }));
router.post('/', (req, res) => {
  const { event, detail } = req.body || {};
  if (!events.has(event) || typeof detail !== 'string' || detail.length > 500) return res.status(400).json({ message: 'Invalid log event.' });
  // All client reports are untrusted diagnostics, never evidence of payment/auth success.
  let safeDetail;
  try { safeDetail = logger.redact(JSON.parse(detail)); } catch { safeDetail = logger.cleanText(detail); }
  logger.info('browser.report', { clientEvent: event, detail: safeDetail, untrusted: true });
  res.sendStatus(204);
});
module.exports = router;
