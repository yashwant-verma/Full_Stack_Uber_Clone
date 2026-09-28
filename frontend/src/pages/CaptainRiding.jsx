import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import useActiveRide from "../hooks/useActiveRide";
import useCaptainLocation from "../hooks/useCaptainLocation";
import LiveTracking from "../components/LiveTracking";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
import FareBreakdown from "../components/FareBreakdown";
export default function CaptainRiding() {
  const { ride, loading, error: syncError } = useActiveRide();
  const locationError = useCaptainLocation(!!ride);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function finish() {
    setBusy(true);
    setError("");
    try {
      await api.post("/rides/end-ride", { rideId: ride._id });
      navigate(`/history/${ride._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <PageShell title="Current trip">
      <Feedback message={error || syncError || locationError} />
      {loading ? (
        <p role="status">Loading ride…</p>
      ) : !ride ? (
        <div className="card">
          <p>No active ride.</p>
          <Link className="btn mt-4" to="/captain-home">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 lg:h-[500px]">
            <LiveTracking
              pickupCoords={ride.pickupCoords}
              destinationCoords={ride.destinationCoords}
            />
          </div>
          <section className="card space-y-4">
            <h2 className="text-xl font-bold">
              {ride.user?.fullname?.firstname}’s trip
            </h2>
            <p>
              {ride.pickup} → {ride.destination}
            </p>
            <FareBreakdown ride={ride} />
            {ride.status === "accepted" ? (
              <Link className="btn" to="/captain-home">
                Enter OTP to start
              </Link>
            ) : (
              <>
                <Feedback
                  success={["rider_confirmed", "verified"].includes(
                    ride.paymentStatus,
                  )}
                  message={
                    ride.paymentStatus === "verified"
                      ? ride.paymentMode === "test"
                        ? "Test UPI verified; no real money collected. You can finish the ride."
                        : "UPI verified by the server. Do not collect cash."
                      : ride.paymentStatus === "rider_confirmed"
                        ? "Rider confirmed paying cash. Check that you received it before finishing."
                        : "Waiting for the rider to confirm cash payment."
                  }
                />
                <button
                  className="btn w-full"
                  disabled={
                    busy ||
                    !["rider_confirmed", "verified"].includes(
                      ride.paymentStatus,
                    )
                  }
                  data-log-action="finish-ride" onClick={finish}
                >
                  {busy
                    ? "Finishing…"
                    : ride.paymentStatus === "verified"
                      ? "Finish ride — UPI verified"
                      : "Cash received — finish ride"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
