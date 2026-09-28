const axios = require("axios");
const { httpError } = require("../utils/errors");
const api = axios.create({
  baseURL: "https://maps.googleapis.com/maps/api",
  timeout: 10000,
});
async function google(path, params) {
  if (!process.env.GOOGLE_MAPS_API)
    throw httpError(
      503,
      "Maps are not configured. Please try the demo or contact support.",
    );
  let data;
  try {
    ({ data } = await api.get(path, {
      params: { ...params, key: process.env.GOOGLE_MAPS_API },
    }));
  } catch {
    throw httpError(503, "Maps are temporarily unavailable. Please retry.");
  }
  if (data.status === "ZERO_RESULTS")
    throw httpError(
      422,
      "No matching location or route found. Please choose another address.",
    );
  if (data.status !== "OK")
    throw httpError(503, "Maps are temporarily unavailable. Please retry.");
  return data;
}
async function getAddressCoordinate(address) {
  const data = await google("/geocode/json", { address });
  const point = data.results[0].geometry.location;
  return { ltd: point.lat, lng: point.lng };
}
async function getDistanceTime(origin, destination) {
  const data = await google("/distancematrix/json", {
    origins: origin,
    destinations: destination,
    mode: "driving",
  });
  const route = data.rows[0]?.elements[0];
  if (route?.status !== "OK")
    throw httpError(422, "No driving route found between these locations.");
  if (route.distance.value < 100)
    throw httpError(400, "Pickup and destination are too close.");
  return route;
}
async function getAutoCompleteSuggestions(input) {
  try {
    const data = await google("/place/autocomplete/json", {
      input,
      components: "country:in",
    });
    return data.predictions.map((item) => item.description);
  } catch (error) {
    if (error.status === 422) return [];
    throw error;
  }
}
function distanceKm(a, b) {
  if (![a?.ltd, a?.lng, b?.ltd, b?.lng].every(Number.isFinite)) return Infinity;
  const rad = (value) => (value * Math.PI) / 180;
  const x =
    Math.sin(rad(b.ltd - a.ltd) / 2) ** 2 +
    Math.cos(rad(a.ltd)) *
      Math.cos(rad(b.ltd)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, x)));
}
module.exports = {
  getAddressCoordinate,
  getDistanceTime,
  getAutoCompleteSuggestions,
  distanceKm,
};

module.exports = require("../utils/instrument")(module.exports, "maps");
