import PropTypes from "prop-types";
export default function FareBreakdown({ ride }) {
  if (!ride) return null;
  const parts = ride.fareBreakdown;
  return (
    <dl className="space-y-2 text-sm">
      {parts &&
        [
          ["Base fare", parts.base],
          ["Distance charge", parts.distance],
          ["Time charge", parts.time],
          ["Rounding", parts.rounding],
        ].map(([label, value]) => (
          <div className="flex justify-between gap-4" key={label}>
            <dt>{label}</dt>
            <dd>₹{Number(value || 0).toFixed(2)}</dd>
          </div>
        ))}
      <div className="flex justify-between border-t pt-3 text-lg font-bold">
        <dt>Total · {ride.paymentMethod === "upi" ? "UPI" : "Cash"}</dt>
        <dd>₹{ride.fare}</dd>
      </div>
    </dl>
  );
}

FareBreakdown.propTypes = { ride: PropTypes.object };
