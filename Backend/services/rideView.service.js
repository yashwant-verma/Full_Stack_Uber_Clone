const Ride = require("../models/ride.model");
module.exports = async (id, role) => {
  let query = Ride.findById(id)
    .populate("user", "fullname")
    .populate("captain", "fullname vehicle location locationUpdatedAt");
  if (role === "user") query = query.select("+otp");
  const ride = await query.lean();
  if (ride?.captain) {
    const ratings = await Ride.aggregate([
      { $match: { captain: ride.captain._id, rating: { $exists: true } } },
      {
        $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
      },
    ]);
    ride.captain.rating = ratings[0] || null;
  }
  return ride;
};
