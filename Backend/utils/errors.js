const { validationResult } = require("express-validator");
const logger = require("./logger");
const httpError = (status, message) => Object.assign(new Error(message), { status });
const asyncHandler = (handler) => (req, res, next) => {
  const operation = `${req.method} ${req.baseUrl || ""}${req.route?.path || req.path}`;
  logger.debug("handler.start", { operation });
  return Promise.resolve()
    .then(() => handler(req, res, next))
    .then(() => logger.debug("handler.complete", { operation }))
    .catch((error) => {
      logger.warn("handler.failed", { operation, error });
      next(error);
    });
};
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn("validation.failed", { count: errors.array().length, fields: errors.array().map(item => item.path) });
    return next(httpError(400, errors.array()[0].msg));
  }
  next();
};
module.exports = { httpError, asyncHandler, validate };
