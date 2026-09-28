const crypto = require('node:crypto');
const logger = require('../utils/logger');
module.exports = (req, res, next) => {
  const supplied = req.get('x-request-id');
  const requestId = /^[a-f0-9-]{36}$/i.test(supplied || '') ? supplied : crypto.randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  const start = performance.now();
  logger.context.run({ requestId }, () => {
    logger.info('http.request.start', { method: req.method, path: req.path });
    res.once('finish', () => {
      const details = { requestId, method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, durationMs: Math.round(performance.now() - start), role: req.role, accountId: req.account?._id };
      (res.statusCode >= 500 ? logger.error : res.statusCode >= 400 ? logger.warn : logger.info)('http.request.complete', details);
    });
    res.once('close', () => { if (!res.writableFinished) logger.warn('http.request.aborted', { requestId, method: req.method, durationMs: Math.round(performance.now() - start) }); });
    next();
  });
};
