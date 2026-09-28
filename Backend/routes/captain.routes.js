const captainController = require("../controllers/captain.controller");
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authMiddleware = require("../middlewares/auth.middleware");

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid Email"),
    body("fullname.firstname")
      .isLength({ min: 3 })
      .withMessage("First name must be at least 3 characters long"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("vehicle.color")
      .isLength({ min: 3 })
      .withMessage("Color must be at least 3 characters long"),
    body("vehicle.plate")
      .isLength({ min: 3 })
      .withMessage("Plate must be at least 3 characters long"),
    body("vehicle.capacity")
      .isInt({ min: 1 })
      .withMessage("Capacity must be at least 1"),
    body("vehicle.vehicleType")
      .isIn(["car", "motorcycle", "auto"])
      .withMessage("Invalid vehicle type"),
  ],
  captainController.registerCaptain,
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid Email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  captainController.loginCaptain,
);

router.get(
  "/profile",
  authMiddleware.authCaptain,
  captainController.getCaptainProfile,
);

router.get(
  "/logout",
  authMiddleware.authCaptain,
  captainController.logoutCaptain,
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Invalid Email")],
  captainController.forgotPassword,
);

router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("Invalid Email"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  captainController.resetPassword,
);

router.patch(
  "/profile",
  authMiddleware.authCaptain,
  body("fullname.firstname").isString().trim().isLength({ min: 3, max: 50 }),
  body("fullname.lastname")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 }),
  body("email").isEmail().normalizeEmail(),
  require("../utils/errors").validate,
  require("../utils/errors").asyncHandler(
    require("../controllers/account.controller").profile,
  ),
);
router.put(
  "/saved-places",
  authMiddleware.authCaptain,
  body("places").isArray({ max: 2 }),
  body("places.*.label").isIn(["Home", "Work"]),
  body("places.*.address").isString().trim().isLength({ min: 3, max: 300 }),
  require("../utils/errors").validate,
  require("../utils/errors").asyncHandler(
    require("../controllers/account.controller").savedPlaces,
  ),
);
router.patch(
  "/availability",
  authMiddleware.authCaptain,
  body("status").isIn(["active", "inactive"]),
  require("../utils/errors").validate,
  require("../utils/errors").asyncHandler(
    require("../controllers/account.controller").availability,
  ),
);
module.exports = router;
