import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
import FareBreakdown from "../components/FareBreakdown";
export default function RideDetails() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .get(`/rides/${id}`)
      .then(({ data }) => setRide(data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/rides/${id}/rating`, {
        rating: Number(rating),
        review,
      });
      setRide(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell title="Ride details">
      <Feedback message={error} />
      <Link className="no-print mb-4 inline-block text-blue-700" to="/history">
        ← All rides
      </Link>
      {ride ? (
        <div className="max-w-2xl space-y-5">
          <section className="card space-y-4">
            <h2 className="text-xl font-bold">
              RideX ·{" "}
              {ride.status === "completed" ? "Cash receipt" : "Ride summary"}
            </h2>
            <p className="break-all text-xs text-slate-500">
              Ride ID: {ride._id}
            </p>
            <p>{new Date(ride.createdAt).toLocaleString()}</p>
            <p>
              <strong>From:</strong> {ride.pickup}
            </p>
            <p>
              <strong>To:</strong> {ride.destination}
            </p>
            <p>
              Captain: {ride.captain?.fullname?.firstname || "Not assigned"} ·{" "}
              {ride.captain?.vehicle?.plate || "—"}
            </p>
            <p>
              {ride.distance
                ? (ride.distance / 1000).toFixed(1) + " km"
                : "Distance unavailable"}{" "}
              ·{" "}
              {ride.duration
                ? Math.round(ride.duration / 60) + " estimated minutes"
                : ""}
            </p>
            <p>
              Status: {ride.status} · Payment:{" "}
              {ride.paymentStatus?.replaceAll("_", " ") || "Not recorded"}
            </p>
            <FareBreakdown ride={ride} />
            {ride.status === "completed" && (
              <button
                className="btn-secondary no-print"
                onClick={() => window.print()}
              >
                Print / save receipt as PDF
              </button>
            )}
          </section>
          {ride.rating ? (
            <section className="card">
              <h2 className="font-bold">Your review · {ride.rating}/5</h2>
              <p className="mt-2">{ride.review || "No written review"}</p>
            </section>
          ) : (
            ride.status === "completed" &&
            localStorage.getItem("role") === "user" && (
              <form className="card space-y-4 no-print" onSubmit={submit}>
                <h2 className="font-bold">How was your ride?</h2>
                <label className="block">
                  Rating
                  <select
                    className="field mt-2"
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Review (optional)
                  <textarea
                    className="field mt-2"
                    maxLength={500}
                    value={review}
                    onChange={(event) => setReview(event.target.value)}
                  />
                </label>
                <button className="btn" disabled={busy}>
                  {busy ? "Saving…" : "Submit review"}
                </button>
              </form>
            )
          )}
        </div>
      ) : (
        !error && <p role="status">Loading details…</p>
      )}
    </PageShell>
  );
}
