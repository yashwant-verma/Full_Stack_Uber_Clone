const publicAccount = require("../utils/publicAccount");
const { httpError } = require("../utils/errors");
const Ride = require("../models/ride.model");
exports.profile = async (req, res) => {
  req.account.fullname = {
    firstname: req.body.fullname.firstname,
    lastname: req.body.fullname.lastname || undefined,
  };
  req.account.email = req.body.email.trim().toLowerCase();
  await req.account.save();
  res.json(publicAccount(req.account));
};
exports.savedPlaces = async (req, res) => {
  if (
    new Set(req.body.places.map((place) => place.label)).size !==
    req.body.places.length
  )
    throw httpError(400, "Use each label only once.");
  req.account.savedPlaces = req.body.places.map(({ label, address }) => ({
    label,
    address,
  }));
  await req.account.save();
  res.json(publicAccount(req.account));
};
exports.availability = async (req, res) => {
  if (
    req.body.status === "inactive" &&
    (await Ride.exists({
      captain: req.captain._id,
      status: { $in: ["accepted", "ongoing"] },
    }))
  )
    throw httpError(409, "Finish your ride before going offline.");
  req.captain.status = req.body.status;
  await req.captain.save();
  res.json(publicAccount(req.captain));
};
