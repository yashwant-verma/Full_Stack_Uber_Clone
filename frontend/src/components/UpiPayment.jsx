import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import api, { errorMessage } from "../api/client";
import { loadRazorpay } from "../utils/razorpay";
import Feedback from "./Feedback";
export default function UpiPayment({ ride, refresh }) {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    api
      .get("/payments/config")
      .then(({ data }) => setConfig(data))
      .catch((err) => setError(errorMessage(err)));
  }, []);
  async function checkStatus() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/payments/${ride._id}/status`);
      setMessage(data.message);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function openCheckout() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      // Load the script first so a blocked script cannot unnecessarily lock the payment method.
      await loadRazorpay();
      const { data: order } = await api.post(`/payments/${ride._id}/order`);
      await refresh();
      let handlingSuccess = false;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "RideX",
        description:
          order.mode === "test"
            ? "Test ride payment — no real money"
            : "Ride payment",
        theme: { color: "#2563eb" },
        config: {
          display: {
            blocks: {
              upi: { name: "Pay with UPI", instruments: [{ method: "upi" }] },
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (response) => {
          handlingSuccess = true;
          try {
            const { data } = await api.post(
              `/payments/${ride._id}/verify`,
              response,
            );
            setMessage(data.message);
            await refresh();
          } catch (err) {
            setError(
              errorMessage(err) +
                " If money was debited, use Check payment status instead of paying again.",
            );
          } finally {
            setBusy(false);
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            if (!handlingSuccess) {
              setBusy(false);
              setMessage(
                "Checkout closed. No success has been assumed. Check status or reopen the same order.",
              );
            }
          },
        },
      });
      checkout.on("payment.failed", () =>
        setError(
          "Payment attempt failed. You can retry in checkout. If money was debited, check status first.",
        ),
      );
      checkout.open();
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message);
      setBusy(false);
      await refresh();
    }
  }
  const blocked = ["order_creating", "order_unknown"].includes(
    ride.paymentStatus,
  );
  const enabled = config?.enabled && !blocked && ride.status === "ongoing";
  return (
    <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="font-semibold">Pay with UPI</h3>
      {config?.mode === "test" || ride.paymentMode === "test" ? (
        <p className="text-sm font-semibold text-amber-800">
          TEST MODE · No real money is collected.
        </p>
      ) : null}
      {!config ? (
        <p className="text-sm">Loading payment options…</p>
      ) : !config.enabled ? (
        <p className="text-sm text-slate-600">
          UPI is not configured yet. Cash is available for rides without an
          existing UPI order.
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          Use the UPI app or QR option offered by Razorpay. Payment is confirmed
          only after server verification.
        </p>
      )}
      <Feedback message={error} />
      {message && (
        <p role="status" className="text-sm text-slate-700">
          {message}
        </p>
      )}
      {blocked ? (
        <p className="text-sm text-amber-900">
          Order confirmation is pending. If this persists, contact support with
          your ride ID. Do not pay again or switch to cash.
        </p>
      ) : (
        <button
          className="btn w-full"
          disabled={busy || !enabled}
          data-log-action="open-upi-checkout" onClick={openCheckout}
        >
          {busy
            ? "Processing…"
            : ride.paymentOrderId
              ? "Reopen UPI checkout"
              : `Pay ₹${ride.fare} with UPI`}
        </button>
      )}
      {ride.paymentMethod === "upi" && (
        <button
          className="btn-secondary w-full"
          disabled={busy}
          data-log-action="check-upi-status" onClick={checkStatus}
        >
          Check payment status
        </button>
      )}
      {ride.paymentMethod !== "upi" && (
        <p className="text-xs text-slate-600">
          Starting UPI reserves this ride for UPI payment. Cash is disabled
          afterwards to prevent double payment.
        </p>
      )}
    </section>
  );
}
UpiPayment.propTypes = {
  ride: PropTypes.object.isRequired,
  refresh: PropTypes.func.isRequired,
};
