import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import PageShell from "../components/PageShell";
import Feedback from "../components/Feedback";
export default function RideHistory() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get("/rides/history", { params: { page } })
      .then((response) => {
        if (active) {
          setData(response.data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, retry]);
  return (
    <PageShell title="My rides">
      <Feedback message={error} />
      {error && (
        <button
          className="btn-secondary"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry
        </button>
      )}
      {loading ? (
        <p role="status">Loading rides…</p>
      ) : !error && !data?.rides.length ? (
        <div className="card">
          <h2 className="font-bold">Your trips will appear here</h2>
          <p className="mt-2 text-slate-600">
            Completed and cancelled rides, receipts and reviews are saved in one
            place.
          </p>
        </div>
      ) : (
        !error && (
          <div className="space-y-4">
            {data?.rides.map((ride) => (
              <Link
                className="card block hover:border-blue-500"
                key={ride._id}
                to={`/history/${ride._id}`}
              >
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{ride.destination}</p>
                  <strong>₹{ride.fare}</strong>
                </div>
                <p className="my-2 text-sm text-slate-600">
                  From {ride.pickup}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(ride.createdAt).toLocaleString()} · {ride.status}
                  {ride.rating ? ` · ${ride.rating}/5` : ""}
                </p>
              </Link>
            ))}
          </div>
        )
      )}
      <div className="mt-6 flex gap-3">
        <button
          className="btn-secondary"
          disabled={page === 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <span className="p-3">Page {page}</span>
        <button
          className="btn-secondary"
          disabled={!data?.hasMore || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </PageShell>
  );
}
