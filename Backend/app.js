require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connect = require("./db/db");
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
)
  throw new Error(
    "Set JWT_SECRET to a random value of at least 32 characters.",
  );
const app = express();
const logger = require("./utils/logger");
app.use(require("./middlewares/requestLog.middleware"));
const {
  securityHeaders,
  rejectUnsafeInput,
} = require("./middlewares/security.middleware");
const { asyncHandler } = require("./utils/errors");
// Set a specific hop count only when deployed behind a known reverse proxy.
if (/^\d+$/.test(process.env.TRUST_PROXY_HOPS || ""))
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
app.use(securityHeaders);
app.disable("x-powered-by");
app.use(
  cors({
    exposedHeaders: ["X-Request-Id"],
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","),
  }),
);
// Webhook signatures must be checked against untouched bytes, before JSON parsing.
app.post(
  "/payments/webhook",
  express.raw({ type: "application/json", limit: "64kb" }),
  asyncHandler(async (req, res) => {
    await connect();
    res.json(
      await require("./services/payment.service").webhook(
        req.body,
        req.get("x-razorpay-signature"),
      ),
    );
  }),
);
app.use(express.json({ limit: "20kb" }));
app.use(rejectUnsafeInput);
app.use("/debug/client-events", require("./routes/clientLogs.routes"));
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Please wait one minute." },
  }),
);
app.use(require("cookie-parser")());
app.get("/", (req, res) =>
  res.json({ message: "RideX API by Yashwant", status: "running" }),
);
app.use(async (req, res, next) => {
  try {
    await connect();
    next();
  } catch (error) {
    logger.error("database.request_unavailable", { error });
    res
      .status(503)
      .json({ message: "Database unavailable. Please retry shortly." });
  }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again after 15 minutes." },
});
app.use(
  [
    "/users/login",
    "/captains/login",
    "/users/register",
    "/captains/register",
    "/users/forgot-password",
    "/captains/forgot-password",
    "/users/reset-password",
    "/captains/reset-password",
    "/rides/start-ride",
  ],
  authLimiter,
);
app.use("/users", require("./routes/user.routes"));
app.use("/captains", require("./routes/captain.routes"));
app.use("/maps", require("./routes/maps.routes"));
app.use("/payments", require("./routes/payment.routes"));
app.use("/rides", require("./routes/ride.routes"));
app.use((req, res) => res.status(404).json({ message: "Endpoint not found." }));
app.use((error, req, res, next) => {
  logger.error("http.request.failed", { error, method: req.method, path: req.path });
  if (res.headersSent) return next(error);
  if (error.code === 11000)
    return res.status(409).json({
      message:
        "This email is already registered, or an active ride already exists. Refresh and retry.",
    });
  const status =
    error.status ||
    (["ValidationError", "CastError"].includes(error.name) ? 400 : 500);
  res.status(status).json({
    message:
      status === 500 ? "Something went wrong. Please retry." : error.message,
  });
});
module.exports = app;
