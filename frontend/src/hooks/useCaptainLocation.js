import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/client";
export default function useCaptainLocation(enabled) {
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      return;
    }
    let stopped = false;
    let timer;
    const update = () =>
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          if (stopped) return;
          try {
            await api.patch("/rides/location", {
              ltd: coords.latitude,
              lng: coords.longitude,
            });
            setError("");
          } catch (err) {
            if (!stopped) setError(errorMessage(err));
          }
          if (!stopped) timer = setTimeout(update, 10000);
        },
        () => {
          if (!stopped) {
            setError(
              "Allow location access to receive nearby rides and share your position.",
            );
            timer = setTimeout(update, 15000);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    update();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [enabled]);
  return error;
}
