import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/client";
export default function useLocationSearch(input) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setSuggestions([]);
    setError("");
    if (input.trim().length < 3) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/maps/get-suggestions", {
          params: { input },
          signal: controller.signal,
        });
        setSuggestions(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);
  return { suggestions, loading, error };
}
