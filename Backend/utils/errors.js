const { validationResult } = require("express-validator");
const httpError = (status, message) =>
  Object.assign(new Error(message), { status });
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(httpError(400, errors.array()[0].msg));
  next();
};
module.exports = { httpError, asyncHandler, validate };
