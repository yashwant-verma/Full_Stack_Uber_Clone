const express = require("express");
const router = express.Router();
router.use(
  ["/login", "/forgot-password", "/reset-password"],
  require("../middlewares/accountLimit.middleware"),
);
const { body } = require("express-validator");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post(
  "/register",
  [
    body("email")
      .isString()
      .trim()
      .isLength({ max: 254 })
      .isEmail()
      .withMessage("Invalid Email"),
    body("fullname.firstname")
      .isLength({ min: 3 })
      .withMessage("First name must be at least 3 characters long"),
    body("password")
      .isString()
      .isLength({ min: 8, max: 72 })
      .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
      .withMessage(
        "Use 8–72 characters (at most 72 UTF-8 bytes) for your password",
      ),
  ],
  userController.registerUser,
);

router.post(
  "/login",
  [
    body("email")
      .isString()
      .trim()
      .isLength({ max: 254 })
      .isEmail()
      .withMessage("Invalid Email"),
    body("password")
      .isString()
      .isLength({ min: 1, max: 72 })
      .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
      .withMessage("Enter your password"),
  ],
  userController.loginUser,
);

router.get("/profile", authMiddleware.authUser, userController.getUserProfile);

router.post(
  "/forgot-password",
  [
    body("email")
      .isString()
      .trim()
      .isLength({ max: 254 })
      .isEmail()
      .withMessage("Invalid Email"),
  ],
  require("../utils/errors").validate,
  userController.forgotPassword,
);

router.post(
  "/reset-password",
  [
    body("email")
      .isString()
      .trim()
      .isLength({ max: 254 })
      .isEmail()
      .withMessage("Invalid Email"),
    body("otp")
      .isString()
      .matches(/^\d{6}$/)
      .withMessage("OTP must be 6 digits"),
    body("newPassword")
      .isString()
      .isLength({ min: 8, max: 72 })
      .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
      .withMessage(
        "Use 8–72 characters (at most 72 UTF-8 bytes) for your password",
      ),
  ],
  require("../utils/errors").validate,
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
  body("email").isString().trim().isLength({ max: 254 }).isEmail(),
  body("currentPassword").optional().isString().isLength({ max: 72 }),
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
