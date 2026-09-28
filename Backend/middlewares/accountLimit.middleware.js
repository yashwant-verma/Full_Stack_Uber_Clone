const crypto = require("crypto");
const Attempt = require("../models/authAttempt.model");
const { asyncHandler, httpError } = require("../utils/errors");
module.exports = asyncHandler(async (req, res, next) => {
  if (typeof req.body?.email !== "string") return next();
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const identity = `${req.baseUrl}${req.path}:${req.body.email.trim().toLowerCase()}:${window}`;
  const key = crypto.createHash("sha256").update(identity).digest("hex");
  let attempt;
  try {
    attempt = await Attempt.findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    attempt = await Attempt.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 } },
      { new: true },
    );
  }
  if (!attempt || attempt.count > 10)
    throw httpError(
      429,
      "Too many attempts for this account. Please wait 15 minutes.",
    );
  next();
});
