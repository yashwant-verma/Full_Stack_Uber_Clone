import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { CaptainDataContext } from "../context/contexts";
import useActiveRide from "../hooks/useActiveRide";
import useCaptainLocation from "../hooks/useCaptainLocation";
import LiveTracking from "../components/LiveTracking";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
export default function CaptainHome() {
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const {
    ride,
    refresh,
    loading,
    error: syncError,
    connected,
  } = useActiveRide();
  const locationError = useCaptainLocation(
    captain?.status === "active" || !!ride,
  );
  const [requests, setRequests] = useState([]);
  const [ignored, setIgnored] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    if (ride?.status === "ongoing") navigate("/captain-riding");
  }, [ride, navigate]);
  const getRequests = useCallback(async () => {
    if (captain?.status !== "active" || ride) {
      setRequests([]);
      return;
    }
    try {
      const { data } = await api.get("/rides/pending");
      setRequests(data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [captain?.status, ride]);
  useEffect(() => {
    getRequests();
    const timer = setInterval(getRequests, 10000);
    return () => clearInterval(timer);
  }, [getRequests]);
  useEffect(() => {
    api
      .get("/rides/captain-stats")
      .then(({ data }) => setStats(data))
      .catch((err) => setError(errorMessage(err)));
  }, [ride]);
  async function action(callback) {
    setBusy(true);
    setError("");
    try {
      await callback();
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell title={`Hello, ${captain?.fullname?.firstname || "Captain"}`}>
      <Feedback message={error || syncError || locationError} />
      {!connected && (
        <p className="mb-3 text-sm text-slate-600">
          Live connection unavailable. Ride updates are checked periodically.
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="font-semibold">
          You are {captain?.status === "active" ? "online" : "offline"}
        </p>
        <button
          className="btn"
          disabled={busy || !!ride}
          onClick={() =>
            action(async () => {
              const { data } = await api.patch("/captains/availability", {
                status: captain.status === "active" ? "inactive" : "active",
              });
              setCaptain(data);
            })
          }
        >
          {captain?.status === "active" ? "Go offline" : "Go online"}
        </button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Today’s rides", stats?.todayRides],
          ["Today’s earnings", stats && `₹${stats.todayEarnings}`],
          ["Total rides", stats?.totalRides],
          ["Total earnings", stats && `₹${stats.totalEarnings}`],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm">
        {stats?.rating
          ? `Rating: ${stats.rating} / 5`
          : "New driver · No ratings yet"}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 lg:h-[500px]">
          <LiveTracking />
        </div>
        <section className="card">
          {loading ? (
            <p role="status">Checking current ride…</p>
          ) : ride ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                action(async () => {
                  await api.post("/rides/start-ride", {
                    rideId: ride._id,
                    otp,
                  });
                  navigate("/captain-riding");
                });
              }}
            >
              <h2 className="text-xl font-bold">Your assigned ride</h2>
              <p>
                {ride.user?.fullname?.firstname} · ₹{ride.fare}
              </p>
              <p>Pickup: {ride.pickup}</p>
              <p>Destination: {ride.destination}</p>
              <label htmlFor="ride-otp" className="block font-semibold">
                Ask the rider for their OTP
              </label>
              <input
                id="ride-otp"
                className="field"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
              />
              <button
                className="btn w-full"
                disabled={busy || otp.length !== 6}
              >
                Verify OTP and start ride
              </button>
            </form>
          ) : (
            <>
              <h2 className="mb-4 text-xl font-bold">Nearby requests</h2>
              {captain?.status !== "active" ? (
                <p>Go online and allow location access to receive requests.</p>
              ) : requests.filter((item) => !ignored.includes(item._id))
                  .length ? (
                requests
                  .filter((item) => !ignored.includes(item._id))
                  .map((item) => (
                    <article
                      key={item._id}
                      className="mb-3 rounded-xl border p-4"
                    >
                      <p className="font-semibold">
                        {item.user?.fullname?.firstname} · ₹{item.fare}
                      </p>
                      <p className="my-2 text-sm">
                        {item.pickup} → {item.destination}
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              await api.post("/rides/confirm", {
                                rideId: item._id,
                              });
                            })
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            setIgnored((previous) => [...previous, item._id])
                          }
                        >
                          Ignore
                        </button>
                      </div>
                    </article>
                  ))
              ) : (
                <p className="text-slate-600">
                  No matching rides within 5 km right now. We’ll check again
                  shortly.
                </p>
              )}
              <button
                className="mt-4 text-sm text-blue-700"
                onClick={getRequests}
              >
                Refresh requests
              </button>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
