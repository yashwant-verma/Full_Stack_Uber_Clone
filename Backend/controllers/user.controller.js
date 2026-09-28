const publicAccount = require("../utils/publicAccount");
const userModel = require("../models/user.model");
const userService = require("../services/user.service");
const { validationResult } = require("express-validator");
const blackListTokenModel = require("../models/blackListToken.model");

module.exports.registerUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullname, email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const isUserAlready = await userModel.findOne({ email: cleanEmail });

  if (isUserAlready) {
    return res.status(400).json({ message: "User already exist" });
  }

  const hashedPassword = await userModel.hashPassword(password);

  const user = await userService.createUser({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email: cleanEmail,
    password: hashedPassword,
  });

  const token = user.generateAuthToken();

  res.status(201).json({ token, user: publicAccount(user) });
};

module.exports.loginUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const user = await userModel
    .findOne({ email: cleanEmail })
    .select("+password +tokenVersion");

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = user.generateAuthToken();

  res.status(200).json({ token, user: publicAccount(user) });
};

module.exports.getUserProfile = async (req, res, next) => {
  res.status(200).json(publicAccount(req.user));
};

module.exports.logoutUser = async (req, res, next) => {
  require("../socket").disconnectAccount("user", req.user._id);
  res.clearCookie("token");
  const token = req.token;

  if (token) {
    await blackListTokenModel.create({ token });
  }

  res.status(200).json({ message: "Logged out" });
};

module.exports.forgotPassword =
  require("../services/passwordReset.service").request(userModel);
module.exports.resetPassword =
  require("../services/passwordReset.service").reset(userModel, "user");
for (const name of Object.keys(module.exports))
  module.exports[name] = require("../utils/errors").asyncHandler(
    module.exports[name],
  );
