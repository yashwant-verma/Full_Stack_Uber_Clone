const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  verifyHmac,
  amountInPaise,
  checkPayment,
} = require("../utils/paymentSecurity");
const { unsafeKeys } = require("../middlewares/security.middleware");
const secret = "test-only-secret";
const sign = (value) =>
  crypto.createHmac("sha256", secret).update(value).digest("hex");
test("checkout signature binds the stored order to its payment", () => {
  const digest = sign("order_123|pay_123");
  assert.equal(verifyHmac("order_123|pay_123", digest, secret), true);
  assert.equal(verifyHmac("order_999|pay_123", digest, secret), false);
  assert.equal(verifyHmac("order_123|pay_999", digest, secret), false);
  for (const invalid of ["", "abcd", "z".repeat(64), {}, null])
    assert.equal(verifyHmac("order_123|pay_123", invalid, secret), false);
});
test("webhook signature uses exact raw bytes, not re-serialized JSON", () => {
  const raw = Buffer.from('{ "event": "payment.captured" }');
  assert.equal(verifyHmac(raw, sign(raw), secret), true);
  assert.equal(
    verifyHmac(Buffer.from('{"event":"payment.captured"}'), sign(raw), secret),
    false,
  );
});
test("only matching captured UPI payments can verify a ride", () => {
  const ride = { fare: 200, paymentOrderId: "order_123" };
  const payment = {
    id: "pay_123",
    order_id: "order_123",
    amount: 20000,
    currency: "INR",
    method: "upi",
    status: "captured",
    captured: true,
    amount_refunded: 0,
  };
  assert.equal(checkPayment(payment, ride), true);
  assert.equal(
    checkPayment({ ...payment, status: "authorized", captured: false }, ride),
    false,
  );
  for (const change of [
    { amount: 1 },
    { currency: "USD" },
    { method: "card" },
    { order_id: "order_other" },
    { amount_refunded: 1 },
  ])
    assert.throws(() => checkPayment({ ...payment, ...change }, ride));
});
test("money amounts must be finite positive integer paise", () => {
  assert.equal(amountInPaise(12.34), 1234);
  for (const invalid of [NaN, Infinity, -1, 0, Number.MAX_VALUE])
    assert.throws(() => amountInPaise(invalid));
});
test("Mongo operator/prototype keys are rejected, ordinary address text is allowed", () => {
  assert.equal(unsafeKeys({ email: { $ne: null } }), true);
  assert.equal(unsafeKeys(JSON.parse('{"__proto__":{"admin":true}}')), true);
  assert.equal(unsafeKeys({ "account.role": "captain" }), true);
  assert.equal(
    unsafeKeys({ pickup: "St. John Road", email: "a@example.com" }),
    false,
  );
});

const Ride = require("../models/ride.model");
const provider = require("../services/razorpay.service");
const service = require("../services/payment.service");
const config = {
  keyId: "rzp_test_example",
  secret,
  webhookSecret: secret,
  mode: "test",
};
const owned = {
  _id: "ride1",
  user: "user1",
  captain: "captain1",
  fare: 200,
  status: "ongoing",
  paymentStatus: "order_created",
  paymentMethod: "upi",
  paymentOrderId: "order_123",
  paymentMode: "test",
};
test("invalid checkout signature is rejected before a provider API call", async (t) => {
  t.mock.method(Ride, "findOne", async (query) => {
    assert.equal(query.user, "user1");
    return owned;
  });
  t.mock.method(provider, "settings", () => config);
  const fetch = t.mock.method(provider, "fetchPayment", async () => {
    throw new Error("must not fetch");
  });
  await assert.rejects(
    service.verify("ride1", "user1", {
      razorpay_order_id: "order_123",
      razorpay_payment_id: "pay_123",
      razorpay_signature: "0".repeat(64),
    }),
    /Invalid payment signature/,
  );
  assert.equal(fetch.mock.callCount(), 0);
});
test("existing checkout is reused without creating another gateway order", async (t) => {
  t.mock.method(provider, "settings", () => config);
  t.mock.method(Ride, "findOne", async () => owned);
  const create = t.mock.method(provider, "createOrder", async () => {
    throw new Error("must not create");
  });
  const order = await service.createOrder("ride1", "user1");
  assert.equal(order.orderId, "order_123");
  assert.equal(order.amount, 20000);
  assert.equal(create.mock.callCount(), 0);
});
test("unknown order creation failure keeps the payment locked", async (t) => {
  t.mock.method(provider, "settings", () => config);
  const ride = {
    ...owned,
    paymentStatus: "pending",
    paymentOrderId: undefined,
  };
  t.mock.method(Ride, "findOne", async () => ride);
  t.mock.method(Ride, "findOneAndUpdate", async (query) => {
    assert.equal(query.paymentStatus, "pending");
    return ride;
  });
  t.mock.method(provider, "createOrder", async () => {
    throw new Error("Timeout");
  });
  let update;
  t.mock.method(Ride, "updateOne", async (filter, fields) => {
    update = fields;
  });
  await assert.rejects(service.createOrder("ride1", "user1"), /Timeout/);
  assert.equal(update.paymentStatus, "order_unknown");
  assert.equal(update.paymentMethod, undefined);
});
test("duplicate captured events are idempotent and cannot replace another payment", async (t) => {
  t.mock.method(provider, "settings", () => config);
  t.mock.method(Ride, "findOneAndUpdate", async (query, update) => {
    assert.equal(query.paymentStatus, "order_created");
    assert.equal(query.paymentOrderId, "order_123");
    assert.equal(update.paymentStatus, "verified");
    return null; // Already applied by the first callback.
  });
  t.mock.method(Ride, "findById", async () => ({
    ...owned,
    status: "completed",
    paymentStatus: "verified",
    paymentId: "pay_123",
  }));
  const payment = {
    id: "pay_123",
    order_id: "order_123",
    amount: 20000,
    currency: "INR",
    method: "upi",
    status: "captured",
    captured: true,
    amount_refunded: 0,
  };
  assert.equal((await service.recordCaptured(owned, payment)).verified, true);
  await assert.rejects(
    service.recordCaptured(owned, { ...payment, id: "pay_other" }),
    /support review/,
  );
});
test("bad webhook signature is rejected before database lookup", async (t) => {
  t.mock.method(provider, "settings", () => config);
  const find = t.mock.method(Ride, "findOne", async () => {
    throw new Error("must not look up");
  });
  await assert.rejects(
    service.webhook(Buffer.from("{}"), "0".repeat(64)),
    /Invalid webhook signature/,
  );
  assert.equal(find.mock.callCount(), 0);
});
