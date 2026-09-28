const publicAccount = require("../utils/publicAccount");
const captainModel = require("../models/captain.model");
const captainService = require("../services/captain.service");
const blackListTokenModel = require("../models/blackListToken.model");
const { validationResult } = require("express-validator");

module.exports.registerCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullname, email, password, vehicle } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const isCaptainAlreadyExist = await captainModel.findOne({
    email: cleanEmail,
  });

  if (isCaptainAlreadyExist) {
    return res.status(400).json({ message: "Captain already exist" });
  }

  const hashedPassword = await captainModel.hashPassword(password);

  const captain = await captainService.createCaptain({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email: cleanEmail,
    password: hashedPassword,
    color: vehicle.color,
    plate: vehicle.plate,
    capacity: vehicle.capacity,
    vehicleType: vehicle.vehicleType,
  });

  captain.status = "inactive";
  await captain.save();

  const token = captain.generateAuthToken();

  res.status(201).json({ token, captain: publicAccount(captain) });
};

module.exports.loginCaptain = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
      message: errors.array()[0]?.msg || "Validation error",
    });
  }

  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const captain = await captainModel
    .findOne({ email: cleanEmail })
    .select("+password +tokenVersion");

  if (!captain) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await captain.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Set captain status to active in DB on login
  captain.status = "inactive";
  await captain.save();

  const token = captain.generateAuthToken();

  res.status(200).json({ token, captain: publicAccount(captain) });
};

module.exports.getCaptainProfile = async (req, res, next) => {
  res.status(200).json({ captain: publicAccount(req.captain) });
};

module.exports.logoutCaptain = async (req, res, next) => {
  const token = req.token;

  if (req.captain?._id) {
    await captainModel.findByIdAndUpdate(req.captain._id, {
      status: "inactive",
    });
  }

  if (token) {
    await blackListTokenModel.create({ token });
  }

  require("../socket").disconnectAccount("captain", req.captain._id);
  res.clearCookie("token");

  res.status(200).json({ message: "Logout successfully" });
};

module.exports.forgotPassword =
  require("../services/passwordReset.service").request(captainModel);
module.exports.resetPassword =
  require("../services/passwordReset.service").reset(captainModel, "captain");
for (const name of Object.keys(module.exports))
  module.exports[name] = require("../utils/errors").asyncHandler(
    module.exports[name],
  );
