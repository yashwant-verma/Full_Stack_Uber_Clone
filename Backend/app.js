require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connect = require("./db/db");
const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","),
  }),
);
app.use(express.json({ limit: "20kb" }));
app.use(require("cookie-parser")());
app.get("/", (req, res) =>
  res.json({ message: "RideX API by Yashwant", status: "running" }),
);
app.use(async (req, res, next) => {
  try {
    await connect();
    next();
  } catch {
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
app.use("/rides", require("./routes/ride.routes"));
app.use((req, res) => res.status(404).json({ message: "Endpoint not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000)
    return res
      .status(409)
      .json({
        message:
          "This email is already registered, or an active ride already exists. Refresh and retry.",
      });
  const status =
    error.status ||
    (["ValidationError", "CastError"].includes(error.name) ? 400 : 500);
  res
    .status(status)
    .json({
      message:
        status === 500 ? "Something went wrong. Please retry." : error.message,
    });
});
module.exports = app;
