const Ride = require("../models/ride.model");
const Captain = require("../models/captain.model");
const service = require("../services/ride.service");
const view = require("../services/rideView.service");
const { emitTo } = require("../socket");
const { httpError } = require("../utils/errors");
async function notify(ride, event) {
  const [riderView, captainView] = await Promise.all([
    view(ride._id, "user"),
    view(ride._id, "captain"),
  ]);
  emitTo("user", ride.user, event, riderView);
  emitTo("captain", ride.captain, event, captainView);
}
exports.createRide = async (req, res) => {
  const { pickup, destination, vehicleType } = req.body;
  const ride = await service.createRide({
    user: req.user._id,
    pickup,
    destination,
    vehicleType,
  });
  res.status(201).json(await view(ride._id, "user"));
};
exports.getFare = async (req, res) =>
  res.json(await service.getFare(req.query.pickup, req.query.destination));
exports.confirmRide = async (req, res) => {
  const ride = await service.confirmRide({
    rideId: req.body.rideId,
    captain: req.captain,
  });
  await notify(ride, "ride-confirmed");
  res.json(await view(ride._id, "captain"));
};
exports.startRide = async (req, res) => {
  const ride = await service.startRide({
    rideId: req.body.rideId,
    otp: req.body.otp,
    captain: req.captain,
  });
  await notify(ride, "ride-started");
  res.json(await view(ride._id, "captain"));
};
exports.endRide = async (req, res) => {
  const ride = await service.endRide({
    rideId: req.body.rideId,
    captain: req.captain,
  });
  await notify(ride, "ride-ended");
  res.json(await view(ride._id, "captain"));
};
exports.cancelRide = async (req, res) => {
  const ride = await service.cancelRide({
    rideId: req.body.rideId,
    userId: req.user._id,
  });
  await notify(ride, "ride-cancelled");
  res.json({ message: "Ride cancelled." });
};
exports.getActiveRide = async (req, res) => {
  const ride = await Ride.findOne({
    [req.role]: req.account._id,
    status: { $in: service.activeStatuses },
  }).sort({ createdAt: -1 });
  res.json(ride ? await view(ride._id, req.role) : null);
};
exports.getPendingRides = async (req, res) => {
  if (
    await Ride.exists({
      captain: req.captain._id,
      status: { $in: ["accepted", "ongoing"] },
    })
  )
    return res.json([]);
  const pending = await Ride.find({
    status: "pending",
    vehicleType:
      req.captain.vehicle.vehicleType === "motorcycle"
        ? "moto"
        : req.captain.vehicle.vehicleType,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "fullname");
  res.json(
    pending
      .filter((ride) => service.canReceiveRide(req.captain, ride))
      .slice(0, 10),
  );
};
exports.confirmPayment = async (req, res) => {
  const ride = await Ride.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      status: "ongoing",
      paymentStatus: { $in: ["pending", "rider_confirmed"] },
    },
    { paymentStatus: "rider_confirmed" },
    { new: true },
  );
  if (!ride) throw httpError(409, "Payment cannot be confirmed for this ride.");
  emitTo("captain", ride.captain, "payment-received", { rideId: ride._id });
  res.json(await view(ride._id, "user"));
};
exports.history = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const filter = {
    [req.role]: req.account._id,
    status: { $in: ["completed", "cancelled"] },
  };
  const [rides, count] = await Promise.all([
    Ride.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * 10)
      .limit(10)
      .populate("captain", "fullname vehicle")
      .populate("user", "fullname"),
    Ride.countDocuments(filter),
  ]);
  res.json({ rides, page, hasMore: page * 10 < count });
};
exports.details = async (req, res) => {
  if (!(await Ride.exists({ _id: req.params.id, [req.role]: req.account._id })))
    throw httpError(404, "Ride not found.");
  res.json(await view(req.params.id, req.role));
};
exports.rate = async (req, res) => {
  const ride = await Ride.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      status: "completed",
      rating: { $exists: false },
    },
    { rating: req.body.rating, review: req.body.review || "" },
    { new: true, runValidators: true },
  );
  if (!ride)
    throw httpError(409, "Only a completed, unrated ride can be reviewed.");
  res.json(await view(ride._id, "user"));
};
exports.getCaptainStats = async (req, res) => {
  const rides = await Ride.find({
    captain: req.captain._id,
    status: "completed",
  });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const todayRides = rides.filter(
    (ride) =>
      today.format(ride.completedAt || ride.updatedAt) ===
      today.format(new Date()),
  );
  const rated = rides.filter((ride) => ride.rating);
  res.json({
    todayRides: todayRides.length,
    totalRides: rides.length,
    todayEarnings: todayRides.reduce((sum, ride) => sum + ride.fare, 0),
    totalEarnings: rides.reduce((sum, ride) => sum + ride.fare, 0),
    rating: rated.length
      ? (
          rated.reduce((sum, ride) => sum + ride.rating, 0) / rated.length
        ).toFixed(1)
      : null,
  });
};
exports.location = async (req, res) => {
  const { ltd, lng } = req.body;
  const locationUpdatedAt = new Date();
  await Captain.findByIdAndUpdate(req.captain._id, {
    location: { ltd, lng },
    locationUpdatedAt,
  });
  const ride = await Ride.findOne({
    captain: req.captain._id,
    status: { $in: ["accepted", "ongoing"] },
  });
  if (ride)
    emitTo("user", ride.user, "captain-location", {
      rideId: ride._id,
      location: { ltd, lng },
      locationUpdatedAt,
    });
  res.json({ message: "Location updated." });
};
