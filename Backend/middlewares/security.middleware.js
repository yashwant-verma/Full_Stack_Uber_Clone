const { httpError } = require("../utils/errors");
function unsafeKeys(value, depth = 0) {
  if (!value || typeof value !== "object") return false;
  if (depth > 12) return true;
  return Object.entries(value).some(
    ([key, nested]) =>
      key.startsWith("$") ||
      key.includes(".") ||
      ["__proto__", "prototype", "constructor"].includes(key) ||
      unsafeKeys(nested, depth + 1),
  );
}
function rejectUnsafeInput(req, res, next) {
  if (unsafeKeys(req.body) || unsafeKeys(req.query))
    return next(httpError(400, "Invalid request fields."));
  next();
}
function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  });
  if (process.env.NODE_ENV === "production")
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}
module.exports = { rejectUnsafeInput, securityHeaders, unsafeKeys };
