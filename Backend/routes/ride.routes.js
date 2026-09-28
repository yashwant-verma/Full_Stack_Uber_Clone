const router = require("express").Router();
const { body, param, query } = require("express-validator");
const auth = require("../middlewares/auth.middleware");
const c = require("../controllers/ride.controller");
const { asyncHandler: run, validate } = require("../utils/errors");
const id = body("rideId").isMongoId().withMessage("Invalid ride ID.");
const pathId = param("id").isMongoId().withMessage("Invalid ride ID.");
router.post(
  "/create",
  auth.authUser,
  body("pickup").isString().trim().isLength({ min: 3, max: 300 }),
  body("destination").isString().trim().isLength({ min: 3, max: 300 }),
  body("vehicleType").isIn(["car", "auto", "moto"]),
  validate,
  run(c.createRide),
);
router.get(
  "/get-fare",
  auth.authUser,
  query("pickup").isString().trim().isLength({ min: 3, max: 300 }),
  query("destination").isString().trim().isLength({ min: 3, max: 300 }),
  validate,
  run(c.getFare),
);
router.post("/confirm", auth.authCaptain, id, validate, run(c.confirmRide));
router.post(
  "/start-ride",
  auth.authCaptain,
  id,
  body("otp")
    .matches(/^\d{6}$/)
    .withMessage("Enter the six-digit OTP."),
  validate,
  run(c.startRide),
);
router.post("/end-ride", auth.authCaptain, id, validate, run(c.endRide));
router.post("/cancel", auth.authUser, id, validate, run(c.cancelRide));
router.get("/captain-stats", auth.authCaptain, run(c.getCaptainStats));
router.get("/pending", auth.authCaptain, run(c.getPendingRides));
router.get("/user-active-ride", auth.authUser, run(c.getActiveRide));
router.get("/active", auth.authAny, run(c.getActiveRide));
router.get(
  "/history",
  auth.authAny,
  query("page").optional().isInt({ min: 1, max: 10000 }),
  validate,
  run(c.history),
);
router.patch(
  "/location",
  auth.authCaptain,
  body("ltd").isFloat({ min: -90, max: 90 }).toFloat(),
  body("lng").isFloat({ min: -180, max: 180 }).toFloat(),
  validate,
  run(c.location),
);
router.post(
  "/:id/payment",
  auth.authUser,
  pathId,
  validate,
  run(c.confirmPayment),
);
router.post(
  "/:id/rating",
  auth.authUser,
  pathId,
  body("rating").isInt({ min: 1, max: 5 }).toInt(),
  body("review").optional().isString().trim().isLength({ max: 500 }),
  validate,
  run(c.rate),
);
router.get("/:id", auth.authAny, pathId, validate, run(c.details));
module.exports = router;
