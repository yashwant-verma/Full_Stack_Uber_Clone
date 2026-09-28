const Ride = require("../models/ride.model");
const maps = require("./maps.service");
const crypto = require("crypto");
const { httpError } = require("../utils/errors");
const activeStatuses = ["pending", "accepted", "ongoing"];
const vehicleKey = (type) => (type === "motorcycle" ? "moto" : type);
function calculateFare(route, type) {
  const rates = { auto: [30, 10, 2], car: [50, 15, 3], moto: [20, 8, 1.5] };
  if (!rates[type]) throw httpError(400, "Choose a valid vehicle.");
  const [base, perKm, perMinute] = rates[type];
  const distance =
    Math.round((route.distance.value / 1000) * perKm * 100) / 100;
  const time = Math.round((route.duration.value / 60) * perMinute * 100) / 100;
  const fare = Math.round(base + distance + time);
  return {
    fare,
    breakdown: {
      base,
      distance,
      time,
      rounding: Math.round((fare - base - distance - time) * 100) / 100,
    },
  };
}
async function getFare(pickup, destination) {
  const route = await maps.getDistanceTime(pickup, destination);
  return Object.fromEntries(
    ["auto", "car", "moto"].map((type) => [
      type,
      calculateFare(route, type).fare,
    ]),
  );
}
async function createRide({ user, pickup, destination, vehicleType }) {
  if (await Ride.exists({ user, status: { $in: activeStatuses } }))
    throw httpError(409, "You already have an active ride.");
  const [route, pickupCoords, destinationCoords] = await Promise.all([
    maps.getDistanceTime(pickup, destination),
    maps.getAddressCoordinate(pickup),
    maps.getAddressCoordinate(destination),
  ]);
  const price = calculateFare(route, vehicleType);
  return Ride.create({
    user,
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
    vehicleType,
    fare: price.fare,
    fareBreakdown: price.breakdown,
    distance: route.distance.value,
    duration: route.duration.value,
    otp: crypto.randomInt(100000, 1000000).toString(),
  });
}
function canReceiveRide(captain, ride) {
  return (
    captain.status === "active" &&
    Date.now() - new Date(captain.locationUpdatedAt || 0).getTime() < 60000 &&
    vehicleKey(captain.vehicle.vehicleType) === ride.vehicleType &&
    maps.distanceKm(captain.location, ride.pickupCoords) <= 5
  );
}
async function confirmRide({ rideId, captain }) {
  const candidate = await Ride.findById(rideId);
  if (!candidate || candidate.status !== "pending")
    throw httpError(409, "This ride is no longer available.");
  if (!canReceiveRide(captain, candidate))
    throw httpError(
      409,
      "Go online near the pickup with the matching vehicle.",
    );
  if (
    await Ride.exists({
      captain: captain._id,
      status: { $in: ["accepted", "ongoing"] },
    })
  )
    throw httpError(409, "Finish your current ride first.");
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, status: "pending" },
    { status: "accepted", captain: captain._id, active: true },
    { new: true },
  );
  if (!ride)
    throw httpError(409, "Another captain already accepted this ride.");
  return ride;
}
async function startRide({ rideId, otp, captain }) {
  const filter = { _id: rideId, captain: captain._id, status: "accepted" };
  await Ride.updateOne(
    { ...filter, otpLockedUntil: { $lte: new Date() } },
    { $set: { otpAttempts: 0 }, $unset: { otpLockedUntil: 1 } },
  );
  const attempt = await Ride.findOneAndUpdate(
    {
      ...filter,
      $or: [{ otpAttempts: { $lt: 5 } }, { otpAttempts: { $exists: false } }],
    },
    {
      $inc: { otpAttempts: 1 },
      $set: { otpLockedUntil: new Date(Date.now() + 15 * 60000) },
    },
    { new: true },
  ).select("+otp");
  if (!attempt) {
    if (!(await Ride.exists(filter)))
      throw httpError(409, "Assigned ride is unavailable.");
    throw httpError(
      429,
      "OTP locked. Wait 15 minutes after too many attempts.",
    );
  }
  if (typeof otp !== "string" || attempt.otp !== otp)
    throw httpError(409, "Invalid ride OTP.");
  const ride = await Ride.findOneAndUpdate(
    { ...filter, otp },
    { status: "ongoing" },
    { new: true },
  );
  if (!ride) throw httpError(409, "Ride status changed. Refresh and retry.");
  return ride;
}
async function endRide({ rideId, captain }) {
  // UPI must already be captured and verified. Cash still needs both people to confirm.
  let ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      captain: captain._id,
      status: "ongoing",
      paymentMethod: "upi",
      paymentStatus: "verified",
    },
    { status: "completed", active: false, completedAt: new Date() },
    { new: true },
  );
  if (!ride)
    ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        captain: captain._id,
        status: "ongoing",
        paymentMethod: { $ne: "upi" },
        paymentStatus: "rider_confirmed",
      },
      {
        status: "completed",
        active: false,
        paymentStatus: "captain_confirmed",
        paidAt: new Date(),
        completedAt: new Date(),
      },
      { new: true },
    );
  if (!ride)
    throw httpError(
      409,
      "Payment must be verified (UPI) or confirmed by the rider (cash) before finishing your assigned ride.",
    );
  return ride;
}
async function cancelRide({ rideId, userId }) {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, user: userId, status: { $in: ["pending", "accepted"] } },
    { status: "cancelled", active: false },
    { new: true },
  );
  if (!ride)
    throw httpError(
      409,
      "Ride cannot be cancelled. Refresh to check its status.",
    );
  return ride;
}
module.exports = {
  getFare,
  calculateFare,
  createRide,
  confirmRide,
  startRide,
  endRide,
  cancelRide,
  canReceiveRide,
  activeStatuses,
};

module.exports = require("../utils/instrument")(module.exports, "ride");
