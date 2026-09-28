import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import api, { errorMessage } from "../api/client";
import { UserDataContext } from "../context/contexts";
import useActiveRide from "../hooks/useActiveRide";
import AddressInput from "../components/AddressInput";
import LiveTracking from "../components/LiveTracking";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
import FareBreakdown from "../components/FareBreakdown";
export default function Home() {
  const { user } = useContext(UserDataContext);
  const {
    ride,
    loading,
    error: syncError,
    refresh,
    connected,
  } = useActiveRide();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [step, setStep] = useState("search");
  const [fares, setFares] = useState({});
  const [vehicleType, setVehicleType] = useState("car");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef(null);
  const navigate = useNavigate();
  useGSAP(
    () => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        gsap.from(panel.current, { opacity: 0, y: 12, duration: 0.3 });
    },
    { scope: panel },
  );
  useEffect(() => {
    if (ride?.status === "ongoing") navigate("/riding");
  }, [ride, navigate]);
  async function findFare(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get("/rides/get-fare", {
        params: { pickup, destination },
      });
      setFares(data);
      setStep("vehicle");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function book() {
    setBusy(true);
    setError("");
    try {
      await api.post("/rides/create", { pickup, destination, vehicleType });
      await refresh();
      setStep("search");
    } catch (err) {
      setError(errorMessage(err));
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await api.post("/rides/cancel", { rideId: ride._id });
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  function currentLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported. Enter your pickup address.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPickup(`${coords.latitude}, ${coords.longitude}`);
        setBusy(false);
      },
      () => {
        setError("Allow location access, or enter your pickup manually.");
        setBusy(false);
      },
      { timeout: 10000 },
    );
  }
  return (
    <PageShell title={`Where to, ${user?.fullname?.firstname || "Rider"}?`}>
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <section ref={panel} className="card order-2 lg:order-1">
          <Feedback message={error || syncError} />
          {!connected && (
            <p className="mb-3 text-xs text-slate-600" role="status">
              Live connection unavailable. Checking ride updates periodically.
            </p>
          )}
          {loading ? (
            <p role="status">Checking your current ride…</p>
          ) : ride ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                {ride.status === "pending"
                  ? "Searching for a captain"
                  : "Captain assigned"}
              </p>
              <h2 className="text-xl font-bold">{ride.destination}</h2>
              <p className="text-sm text-slate-600">From {ride.pickup}</p>
              {ride.status === "pending" ? (
                <p className="rounded-xl bg-blue-50 p-3 text-sm">
                  Waiting for an available {ride.vehicleType} captain within 5
                  km. If nobody accepts, you can cancel and try later.
                </p>
              ) : (
                <>
                  <p className="font-semibold">
                    {ride.captain?.fullname?.firstname} ·{" "}
                    {ride.captain?.vehicle?.plate}
                  </p>
                  <p className="text-sm">
                    {ride.captain?.rating
                      ? `${ride.captain.rating.average.toFixed(1)} / 5 · ${ride.captain.rating.count} reviews`
                      : "New driver · No ratings yet"}
                  </p>
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-sm">
                      Share this OTP only when your captain arrives
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-widest">
                      {ride.otp}
                    </p>
                  </div>
                </>
              )}
              <FareBreakdown ride={ride} />
              <button
                className="btn-secondary w-full"
                disabled={busy}
                onClick={cancel}
              >
                {busy ? "Please wait…" : "Cancel ride"}
              </button>
            </div>
          ) : step === "search" ? (
            <form className="space-y-4" onSubmit={findFare}>
              <AddressInput
                label="Pickup"
                id="pickup"
                value={pickup}
                onChange={setPickup}
              />
              <button
                type="button"
                className="text-sm font-semibold text-blue-700"
                disabled={busy}
                onClick={currentLocation}
              >
                Use current location
              </button>
              <AddressInput
                label="Destination"
                id="destination"
                value={destination}
                onChange={setDestination}
              />
              {!!user?.savedPlaces?.length && (
                <div className="flex flex-wrap gap-2">
                  {user.savedPlaces.map((place) => (
                    <button
                      type="button"
                      className="btn-secondary"
                      key={place.label}
                      onClick={() => setDestination(place.address)}
                    >
                      {place.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="btn w-full"
                disabled={
                  busy ||
                  pickup.trim().length < 3 ||
                  destination.trim().length < 3 ||
                  !!syncError
                }
              >
                {busy ? "Calculating fare…" : "Find a ride"}
              </button>
              <p className="text-xs text-slate-500">
                Cash payments · Fare based on driving distance and estimated
                time
              </p>
              <Link className="block text-sm text-blue-700" to="/profile">
                Manage saved Home and Work
              </Link>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                className="text-sm text-blue-700"
                onClick={() => setStep("search")}
              >
                ← Edit locations
              </button>
              <h2 className="text-xl font-bold">
                {step === "vehicle"
                  ? "Choose your ride"
                  : "Confirm your booking"}
              </h2>
              {step === "vehicle" ? (
                <>
                  {[
                    ["car", "RideX Go", "Up to 4 passengers"],
                    ["auto", "Auto", "Up to 3 passengers"],
                    ["moto", "Moto", "1 passenger"],
                  ].map(([key, label, description]) => (
                    <button
                      key={key}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${vehicleType === key ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
                      onClick={() => setVehicleType(key)}
                      aria-pressed={vehicleType === key}
                    >
                      <span>
                        <strong>{label}</strong>
                        <small className="block text-slate-600">
                          {description}
                        </small>
                      </span>
                      <strong>₹{fares[key]}</strong>
                    </button>
                  ))}
                  <button
                    className="btn w-full"
                    onClick={() => setStep("confirm")}
                  >
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {pickup} → {destination}
                  </p>
                  <p className="text-xl font-semibold">
                    {vehicleType} · Estimated ₹{fares[vehicleType]}
                  </p>
                  <p className="text-sm text-slate-600">
                    The final booking fare is calculated again when you confirm
                    and shown before your ride starts.
                  </p>
                  <button className="btn w-full" disabled={busy} onClick={book}>
                    {busy ? "Booking…" : "Confirm booking"}
                  </button>
                  <button
                    className="btn-secondary w-full"
                    disabled={busy}
                    onClick={() => setStep("vehicle")}
                  >
                    Change vehicle
                  </button>
                </>
              )}
            </div>
          )}
        </section>
        <div className="order-1 h-64 lg:order-2 lg:h-[650px]">
          <LiveTracking
            trackCaptain={!!ride?.captain}
            captainLocation={ride?.captain?.location}
            locationUpdatedAt={ride?.captain?.locationUpdatedAt}
            pickupCoords={ride?.pickupCoords}
            destinationCoords={ride?.destinationCoords}
          />
        </div>
      </div>
    </PageShell>
  );
}
