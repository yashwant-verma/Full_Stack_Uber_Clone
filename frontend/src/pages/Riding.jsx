import UpiPayment from "../components/UpiPayment";
import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import useActiveRide from "../hooks/useActiveRide";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
import FareBreakdown from "../components/FareBreakdown";
import LiveTracking from "../components/LiveTracking";
export default function Riding() {
  const {
    ride,
    loading,
    error: syncError,
    refresh,
    connected,
  } = useActiveRide();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/rides/${ride._id}/payment`);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell title="Your ride">
      <Feedback message={error || syncError} />
      {loading ? (
        <p role="status">Loading ride…</p>
      ) : !ride ? (
        <div className="card">
          <h2 className="text-xl font-bold">No active ride</h2>
          <p className="my-4">
            Completed rides, receipts and ratings are in your ride history.
          </p>
          <Link className="btn" to="/history">
            View rides and rate your trip
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="h-80 lg:h-[550px]">
            <LiveTracking
              trackCaptain
              captainLocation={ride.captain?.location}
              locationUpdatedAt={ride.captain?.locationUpdatedAt}
              pickupCoords={ride.pickupCoords}
              destinationCoords={ride.destinationCoords}
            />
          </div>
          <section className="card space-y-4">
            <p className="text-sm font-bold uppercase text-blue-700">
              {ride.status}
            </p>
            <h2 className="text-xl font-bold">Heading to {ride.destination}</h2>
            <p>
              Captain: {ride.captain?.fullname?.firstname} ·{" "}
              {ride.captain?.vehicle?.plate}
            </p>
            <p className="text-sm">
              {ride.captain?.rating
                ? `${ride.captain.rating.average.toFixed(1)} / 5`
                : "New driver · No ratings yet"}
            </p>
            <FareBreakdown ride={ride} />
            {ride.paymentStatus === "verified" ? (
              <Feedback
                success
                message={
                  ride.paymentMode === "test"
                    ? "Test UPI payment verified. No real money was collected. Waiting for your captain to finish."
                    : "UPI payment verified. Do not pay cash. Waiting for your captain to finish."
                }
              />
            ) : ride.paymentStatus === "rider_confirmed" ? (
              <Feedback
                success
                message="You confirmed paying cash. Waiting for the captain to confirm receipt and finish the ride."
              />
            ) : (
              <>
                <UpiPayment ride={ride} refresh={refresh} />
                <p className="text-sm text-slate-600">
                  Pay cash directly to your captain when you arrive, then
                  confirm below.
                </p>
                <button
                  className="btn w-full"
                  disabled={
                    busy ||
                    ride.status !== "ongoing" ||
                    ride.paymentMethod === "upi"
                  }
                  data-log-action="confirm-cash" onClick={pay}
                >
                  {busy ? "Saving…" : `I paid ₹${ride.fare} in cash`}
                </button>
              </>
            )}
            {!connected && (
              <p className="text-xs text-slate-500">
                Live connection unavailable. Checking updates periodically.
              </p>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
