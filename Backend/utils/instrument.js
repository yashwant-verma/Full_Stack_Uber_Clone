const logger = require('./logger');
// Trace service steps without ever dumping arguments, provider payloads or user data.
module.exports = function instrument(service, name) {
  const wrapped = {};
  for (const [operation, fn] of Object.entries(service)) {
    if (typeof fn !== 'function') { wrapped[operation] = fn; continue; }
    wrapped[operation] = function (...args) {
      const started = performance.now();
      logger.debug(`${name}.${operation}.start`);
      const done = result => {
        logger.debug(`${name}.${operation}.complete`, { durationMs: Math.round(performance.now() - started), ...(Array.isArray(result) ? { count: result.length } : {}), ...(result?.verified !== undefined ? { verified: result.verified } : {}) });
        return result;
      };
      const fail = error => { logger.error(`${name}.${operation}.failed`, { durationMs: Math.round(performance.now() - started), error }); throw error; };
      try { const result = fn.apply(this, args); return result?.then ? result.then(done, fail) : done(result); }
      catch (error) { return fail(error); }
    };
  }
  return wrapped;
};
