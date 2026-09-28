const mongoose = require("mongoose");
const point = { ltd: Number, lng: Number };
const rideSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "captain" },
    pickup: { type: String, required: true },
    destination: { type: String, required: true },
    pickupCoords: point,
    destinationCoords: point,
    vehicleType: { type: String, enum: ["car", "auto", "moto"] },
    fare: { type: Number, required: true },
    fareBreakdown: {
      base: Number,
      distance: Number,
      time: Number,
      rounding: Number,
    },
    distance: Number,
    duration: Number,
    status: {
      type: String,
      enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
      default: "pending",
    },
    active: { type: Boolean, default: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "rider_confirmed", "captain_confirmed"],
      default: "pending",
    },
    paidAt: Date,
    completedAt: Date,
    otp: { type: String, required: true, select: false },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);
// A database constraint also protects simultaneous requests from different tabs.
rideSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
rideSchema.index(
  { captain: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true, captain: { $type: "objectId" } },
  },
);
rideSchema.index({ user: 1, createdAt: -1 });
rideSchema.index({ captain: 1, createdAt: -1 });
module.exports = mongoose.model("ride", rideSchema);
