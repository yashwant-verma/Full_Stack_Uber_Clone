const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const userController = require("../controllers/user.controller");
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
  ],
  userController.registerUser,
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid Email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  userController.loginUser,
);

router.get("/profile", authMiddleware.authUser, userController.getUserProfile);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Invalid Email")],
  userController.forgotPassword,
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
  userController.resetPassword,
);

router.patch(
  "/profile",
  authMiddleware.authUser,
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
  authMiddleware.authUser,
  body("places").isArray({ max: 2 }),
  body("places.*.label").isIn(["Home", "Work"]),
  body("places.*.address").isString().trim().isLength({ min: 3, max: 300 }),
  require("../utils/errors").validate,
  require("../utils/errors").asyncHandler(
    require("../controllers/account.controller").savedPlaces,
  ),
);
router.get("/logout", authMiddleware.authUser, userController.logoutUser);
module.exports = router;
