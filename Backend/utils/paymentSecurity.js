const crypto = require("crypto");
const { httpError } = require("./errors");
function verifyHmac(message, signature, secret) {
  if (
    !secret ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  )
    return false;
  const expected = crypto.createHmac("sha256", secret).update(message).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
function amountInPaise(fare) {
  const amount = Math.round(fare * 100);
  if (!Number.isFinite(fare) || !Number.isSafeInteger(amount) || amount < 100)
    throw httpError(400, "Invalid saved ride fare.");
  return amount;
}
function checkPayment(payment, ride) {
  if (
    !payment ||
    payment.order_id !== ride.paymentOrderId ||
    payment.amount !== amountInPaise(ride.fare) ||
    payment.currency !== "INR" ||
    payment.method !== "upi"
  ) {
    throw httpError(
      409,
      "Payment details do not match this UPI ride. Contact support.",
    );
  }
  if (payment.amount_refunded !== 0 || payment.status === "refunded")
    throw httpError(409, "This payment has a refund. Contact support.");
  return payment.status === "captured" && payment.captured === true;
}
module.exports = { verifyHmac, amountInPaise, checkPayment };
