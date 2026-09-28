const Ride = require("../models/ride.model");
const provider = require("./razorpay.service");
const { httpError } = require("../utils/errors");
const {
  verifyHmac,
  amountInPaise,
  checkPayment,
} = require("../utils/paymentSecurity");
const { emitTo } = require("../socket");
async function ownedRide(id, user) {
  const ride = await Ride.findOne({ _id: id, user });
  if (!ride) throw httpError(404, "Ride not found.");
  return ride;
}
function checkout(ride) {
  const { keyId, mode } = provider.settings();
  if (ride.paymentMode !== mode)
    throw httpError(
      409,
      "Payment mode changed. Contact support before paying.",
    );
  return {
    orderId: ride.paymentOrderId,
    amount: amountInPaise(ride.fare),
    currency: "INR",
    keyId,
    mode,
  };
}
async function createOrder(id, user) {
  const { mode } = provider.settings();
  let ride = await ownedRide(id, user);
  if (ride.status !== "ongoing")
    throw httpError(409, "UPI is available only during your ongoing ride.");
  if (ride.paymentStatus === "verified")
    throw httpError(409, "This ride is already paid.");
  if (ride.paymentOrderId) return checkout(ride); // Retry the SAME order after closing Checkout.
  const amount = amountInPaise(ride.fare);
  ride = await Ride.findOneAndUpdate(
    {
      _id: id,
      user,
      status: "ongoing",
      paymentStatus: "pending",
      paymentOrderId: { $exists: false },
    },
    {
      paymentMethod: "upi",
      paymentStatus: "order_creating",
      paymentMode: mode,
      paymentStartedAt: new Date(),
    },
    { new: true },
  );
  if (!ride)
    throw httpError(
      409,
      "A payment is already confirmed or being prepared. Refresh payment status.",
    );
  let order;
  try {
    order = await provider.createOrder({
      amount,
      currency: "INR",
      receipt: `ride_${id}`,
      partial_payment: false,
      notes: { rideId: String(id) },
    });
  } catch (error) {
    await Ride.updateOne(
      { _id: id, paymentStatus: "order_creating" },
      {
        paymentStatus: error.definiteRejection ? "pending" : "order_unknown",
        ...(error.definiteRejection ? { paymentMethod: "cash" } : {}),
      },
    );
    throw error;
  }
  if (
    !/^order_[a-zA-Z0-9]+$/.test(order?.id || "") ||
    order.amount !== amount ||
    order.currency !== "INR"
  ) {
    await Ride.updateOne(
      { _id: id, paymentStatus: "order_creating" },
      { paymentStatus: "order_unknown" },
    );
    throw httpError(
      503,
      "Unexpected order response. Contact support; do not make a second payment.",
    );
  }
  // If this save fails, the lock stays in place; do not create another order blindly.
  ride = await Ride.findOneAndUpdate(
    { _id: id, paymentStatus: "order_creating" },
    { paymentOrderId: order.id, paymentStatus: "order_created" },
    { new: true },
  );
  if (!ride) throw httpError(409, "Payment needs support review.");
  return checkout(ride);
}
async function recordCaptured(ride, payment) {
  if (!checkPayment(payment, ride))
    return {
      verified: false,
      message: "Payment has not been captured yet. Check again shortly.",
    };
  if (ride.paymentMode !== provider.settings().mode)
    throw httpError(409, "Payment mode mismatch.");
  const saved = await Ride.findOneAndUpdate(
    {
      _id: ride._id,
      paymentOrderId: payment.order_id,
      paymentMethod: "upi",
      status: "ongoing",
      paymentStatus: "order_created",
    },
    { paymentStatus: "verified", paymentId: payment.id, paidAt: new Date() },
    { new: true },
  );
  if (!saved) {
    const existing = await Ride.findById(ride._id);
    if (
      existing?.paymentStatus !== "verified" ||
      existing.paymentId !== payment.id
    )
      throw httpError(409, "Payment needs support review.");
  }
  // Re-delivery is safe: this only refreshes the UI; money is never captured twice here.
  emitTo("user", ride.user, "payment-verified", { rideId: ride._id });
  emitTo("captain", ride.captain, "payment-verified", { rideId: ride._id });
  return { verified: true, message: "UPI payment verified." };
}
async function verify(id, user, body) {
  const ride = await ownedRide(id, user);
  if (!ride.paymentOrderId || ride.paymentOrderId !== body.razorpay_order_id)
    throw httpError(400, "Order does not match this ride.");
  const { secret } = provider.settings();
  if (
    !verifyHmac(
      `${ride.paymentOrderId}|${body.razorpay_payment_id}`,
      body.razorpay_signature,
      secret,
    )
  )
    throw httpError(400, "Invalid payment signature.");
  const payment = await provider.fetchPayment(body.razorpay_payment_id);
  if (payment.id !== body.razorpay_payment_id)
    throw httpError(409, "Payment ID mismatch.");
  return recordCaptured(ride, payment);
}
async function status(id, user) {
  const ride = await ownedRide(id, user);
  if (ride.paymentStatus === "verified")
    return { verified: true, message: "UPI payment verified." };
  if (!ride.paymentOrderId) {
    return {
      verified: false,
      message: ["order_unknown", "order_creating"].includes(ride.paymentStatus)
        ? "Order is not confirmed yet. If this persists, contact support with the ride ID. Do not pay cash or start another payment."
        : "No UPI order created.",
    };
  }
  const payments = await provider.fetchOrderPayments(ride.paymentOrderId);
  const captured = payments.items?.find(
    (payment) => payment.status === "captured",
  );
  if (!captured)
    return {
      verified: false,
      message:
        "No captured payment yet. Retry the same UPI checkout if you have not paid.",
    };
  return recordCaptured(ride, captured);
}
async function webhook(raw, signature) {
  const { webhookSecret } = provider.settings();
  if (!Buffer.isBuffer(raw) || !verifyHmac(raw, signature, webhookSecret))
    throw httpError(400, "Invalid webhook signature.");
  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    throw httpError(400, "Invalid webhook body.");
  }
  if (!["payment.captured", "order.paid"].includes(event.event))
    return { received: true };
  const entity = event.payload?.payment?.entity;
  if (
    !/^pay_[a-zA-Z0-9]+$/.test(entity?.id || "") ||
    !/^order_[a-zA-Z0-9]+$/.test(entity?.order_id || "")
  )
    throw httpError(400, "Payment details missing.");
  const ride = await Ride.findOne({ paymentOrderId: entity.order_id });
  // Other products can use the same merchant account. Never trust client notes to attach an order.
  if (!ride) return { received: true, ignored: true };
  const payment = await provider.fetchPayment(entity.id);
  if (payment.id !== entity.id) throw httpError(409, "Payment ID mismatch.");
  await recordCaptured(ride, payment);
  return { received: true };
}
module.exports = { createOrder, verify, status, webhook, recordCaptured };

module.exports = require("../utils/instrument")(module.exports, "payment");
