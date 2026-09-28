import { useCallback, useContext, useEffect, useState } from "react";
import api, { errorMessage } from "../api/client";
import { SocketContext } from "../context/contexts";
export default function useActiveRide() {
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { socket, connected } = useContext(SocketContext);
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/rides/active");
      setRide(data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let stopped = false;
    let timer;
    const poll = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(poll, connected ? 10000 : 5000);
    };
    poll();
    for (const event of [
      "ride-confirmed",
      "ride-started",
      "ride-ended",
      "ride-cancelled",
      "payment-received",
      "payment-verified",
    ])
      socket.on(event, refresh);
    const location = (data) =>
      setRide((previous) =>
        previous?._id === data.rideId
          ? {
              ...previous,
              captain: {
                ...previous.captain,
                location: data.location,
                locationUpdatedAt: data.locationUpdatedAt,
              },
            }
          : previous,
      );
    socket.on("captain-location", location);
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.off("captain-location", location);
      for (const event of [
        "ride-confirmed",
        "ride-started",
        "ride-ended",
        "ride-cancelled",
        "payment-received",
        "payment-verified",
      ])
        socket.off(event, refresh);
    };
  }, [socket, connected, refresh]);
  return { ride, setRide, loading, error, refresh, connected };
}
