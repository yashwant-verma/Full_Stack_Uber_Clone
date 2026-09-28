const axios = require("axios");
const { httpError } = require("../utils/errors");
function settings() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const mode = keyId?.startsWith("rzp_test_")
    ? "test"
    : keyId?.startsWith("rzp_live_")
      ? "live"
      : null;
  if (!keyId || !secret || !webhookSecret || !mode)
    throw httpError(503, "UPI is not configured yet. You can use cash.");
  if (mode === "live" && process.env.RAZORPAY_ALLOW_LIVE !== "true")
    throw httpError(
      503,
      "Live payments are disabled. Configure test keys first.",
    );
  return { keyId, secret, webhookSecret, mode };
}
function config() {
  try {
    const { keyId, mode } = settings();
    return { enabled: true, keyId, mode };
  } catch {
    return { enabled: false, mode: "unconfigured" };
  }
}
async function call(method, path, data) {
  const { keyId, secret } = settings();
  try {
    const response = await axios({
      method,
      url: `https://api.razorpay.com/v1${path}`,
      auth: { username: keyId, password: secret },
      data,
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    const failure = httpError(
      503,
      "Payment provider unavailable. Please check payment status before retrying.",
    );
    // Only an explicit rejection proves that an order was not created.
    failure.definiteRejection = [400, 401, 403, 422].includes(
      error.response?.status,
    );
    throw failure;
  }
}
module.exports = {
  settings,
  config,
  createOrder: (data) => call("post", "/orders", data),
  fetchPayment: (id) => call("get", `/payments/${encodeURIComponent(id)}`),
  fetchOrderPayments: (id) =>
    call("get", `/orders/${encodeURIComponent(id)}/payments`),
};

module.exports = require("../utils/instrument")(module.exports, "razorpay");
