const router = require("express").Router();
const { body, param } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { authUser } = require("../middlewares/auth.middleware");
const { asyncHandler: run, validate } = require("../utils/errors");
const payment = require("../services/payment.service");
const provider = require("../services/razorpay.service");
router.use(authUser);
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 20,
    keyGenerator: (req) => String(req.user._id),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many payment requests. Wait one minute." },
  }),
);
router.get("/config", (req, res) => res.json(provider.config()));
const id = param("id").isMongoId().withMessage("Invalid ride ID.");
router.post(
  "/:id/order",
  id,
  validate,
  run(async (req, res) =>
    res.json(await payment.createOrder(req.params.id, req.user._id)),
  ),
);
router.post(
  "/:id/verify",
  id,
  body("razorpay_order_id")
    .isString()
    .matches(/^order_[a-zA-Z0-9]+$/),
  body("razorpay_payment_id")
    .isString()
    .matches(/^pay_[a-zA-Z0-9]+$/),
  body("razorpay_signature")
    .isString()
    .matches(/^[a-fA-F0-9]{64}$/),
  validate,
  run(async (req, res) =>
    res.json(await payment.verify(req.params.id, req.user._id, req.body)),
  ),
);
router.post(
  "/:id/status",
  id,
  validate,
  run(async (req, res) =>
    res.json(await payment.status(req.params.id, req.user._id)),
  ),
);
module.exports = router;
