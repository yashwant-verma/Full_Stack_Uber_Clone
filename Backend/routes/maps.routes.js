const express = require("express");
const router = express.Router();
router.use(require("../middlewares/auth.middleware").authUser);
router.use(
  require("express-rate-limit")({
    windowMs: 60000,
    limit: 45,
    keyGenerator: (req) => String(req.user._id),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many map searches. Please wait one minute." },
  }),
);
const { validate } = require("../utils/errors");
const mapController = require("../controllers/map.controller");
const { query } = require("express-validator");

router.get(
  "/get-coordinates",
  query("address").isString().isLength({ min: 3 }),
  validate,
  mapController.getCoordinates,
);

router.get(
  "/get-distance-time",
  query("origin").isString().isLength({ min: 3 }),
  query("destination").isString().isLength({ min: 3 }),
  validate,
  mapController.getDistanceTime,
);

router.get(
  "/get-suggestions",
  query("input").isString().isLength({ min: 3 }),
  validate,
  mapController.getAutoCompleteSuggestions,
);

module.exports = router;
