const logger = require("../utils/logger");
const crypto = require("crypto");
const { httpError } = require("../utils/errors");
const { verifyHmac } = require("../utils/paymentSecurity");
const emailService = require("./email.service");
const accepted = {
  message:
    "If this account exists, a reset code will be sent. Wait a minute before requesting another.",
};
exports.request = (Model) => async (req, res) => {
  logger.info("account.reset_request.processing");
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  )
    throw httpError(
      503,
      "Email service is not configured. Please contact support.",
    );
  const email = req.body.email.trim().toLowerCase();
  const otp = crypto.randomInt(100000, 1000000).toString();
  const digest = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${email}:${otp}`)
    .digest("hex");
  const account = await Model.findOneAndUpdate(
    {
      email,
      $or: [
        { resetOtpRequestedAt: { $exists: false } },
        { resetOtpRequestedAt: { $lte: new Date(Date.now() - 60000) } },
      ],
    },
    {
      resetOtp: digest,
      resetOtpExpires: new Date(Date.now() + 15 * 60000),
      resetOtpRequestedAt: new Date(),
      resetOtpAttempts: 0,
    },
    { new: true },
  );
  if (account) {
    try {
      await emailService.sendPasswordResetEmail({
        to: email,
        otp,
        userName: account.fullname.firstname,
      });
    } catch {
      await Model.updateOne(
        { _id: account._id, resetOtp: digest },
        { $unset: { resetOtp: 1, resetOtpExpires: 1 } },
      );
      throw httpError(503, "Email delivery is unavailable. Please try later.");
    }
  }
  logger.info("account.reset_request.complete");
  res.json(accepted);
};
exports.reset = (Model, role) => async (req, res) => {
  const { otp, newPassword } = req.body;
  const email = req.body.email.trim().toLowerCase();
  // Count attempts in MongoDB before comparing, so parallel guesses share the same limit.
  const account = await Model.findOneAndUpdate(
    {
      email,
      resetOtpExpires: { $gt: new Date() },
      $or: [
        { resetOtpAttempts: { $lt: 5 } },
        { resetOtpAttempts: { $exists: false } },
      ],
    },
    { $inc: { resetOtpAttempts: 1 } },
    { new: true },
  ).select("+resetOtp +resetOtpExpires +resetOtpAttempts");
  if (
    !account ||
    !verifyHmac(`${email}:${otp}`, account.resetOtp, process.env.JWT_SECRET)
  )
    throw httpError(
      400,
      "Invalid, expired or locked reset code. Request a new code.",
    );
  const password = await Model.hashPassword(newPassword);
  const result = await Model.updateOne(
    {
      _id: account._id,
      resetOtp: account.resetOtp,
      resetOtpExpires: { $gt: new Date() },
    },
    {
      $set: { password },
      $inc: { tokenVersion: 1 },
      $unset: { resetOtp: 1, resetOtpExpires: 1, resetOtpAttempts: 1 },
    },
  );
  if (!result.modifiedCount)
    throw httpError(400, "This code is no longer valid.");
  logger.info("account.password_reset.complete", { role, accountId: account._id });
  require("../socket").disconnectAccount(role, account._id);
  res.json({ message: "Password reset successful. You can now log in." });
};
