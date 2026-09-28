import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
const toLatLng = (point) =>
  point && Number.isFinite(point.ltd) && Number.isFinite(point.lng)
    ? { lat: point.ltd, lng: point.lng }
    : null;
function InteractiveMap({ center, pickup, destination }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ridex-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API,
  });
  const [directions, setDirections] = useState(null);
  const [routeError, setRouteError] = useState("");
  const originLat = pickup?.lat,
    originLng = pickup?.lng,
    destLat = destination?.lat,
    destLng = destination?.lng;
  useEffect(() => {
    if (!isLoaded || originLat == null || destLat == null) return;
    let active = true;
    new window.google.maps.DirectionsService().route(
      {
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (!active) return;
        if (status === "OK") {
          setDirections(result);
          setRouteError("");
        } else {
          setDirections(null);
          setRouteError("Route display unavailable.");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [isLoaded, originLat, originLng, destLat, destLng]);
  if (loadError)
    return (
      <p className="p-6">
        Map unavailable. Your ride details are still available.
      </p>
    );
  if (!isLoaded)
    return (
      <p className="p-6" role="status">
        Loading map…
      </p>
    );
  return (
    <>
      <GoogleMap
        center={center}
        zoom={14}
        mapContainerStyle={{ width: "100%", height: "100%" }}
        options={{ streetViewControl: false, mapTypeControl: false }}
      >
        <Marker position={center} title="Latest location" />
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{ preserveViewport: true }}
          />
        )}
      </GoogleMap>
      {routeError && (
        <p className="absolute bottom-2 left-2 bg-white p-2 text-sm">
          {routeError}
        </p>
      )}
    </>
  );
}
export default function LiveTracking({
  captainLocation,
  locationUpdatedAt,
  pickupCoords,
  destinationCoords,
  trackCaptain = false,
}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (trackCaptain) return;
    if (!navigator.geolocation) {
      setError("Location is unavailable in this browser.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setError("");
      },
      () =>
        setError(
          "Allow location access to show your position. You can still enter addresses.",
        ),
      { timeout: 10000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [trackCaptain]);
  const center = trackCaptain ? toLatLng(captainLocation) : position;
  if (!center)
    return (
      <div className="flex h-full min-h-64 items-center justify-center bg-slate-100 p-8 text-center text-slate-600">
        <p>
          {trackCaptain
            ? "Waiting for the captain’s location…"
            : error || "Finding your location…"}
        </p>
      </div>
    );
  return (
    <div className="relative h-full min-h-64 overflow-hidden rounded-2xl bg-slate-100">
      {import.meta.env.VITE_GOOGLE_MAPS_API ? (
        <InteractiveMap
          center={center}
          pickup={toLatLng(pickupCoords)}
          destination={toLatLng(destinationCoords)}
        />
      ) : (
        <iframe
          title="Latest location map"
          className="h-full min-h-64 w-full border-0"
          src={`https://maps.google.com/maps?q=${center.lat},${center.lng}&z=15&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 p-2 text-xs text-slate-700">
        {trackCaptain
          ? `Captain’s last location${locationUpdatedAt ? " · " + new Date(locationUpdatedAt).toLocaleTimeString() : ""}. Updates may be delayed.`
          : "Your device location"}
      </p>
    </div>
  );
}

LiveTracking.propTypes = {
  captainLocation: PropTypes.object,
  locationUpdatedAt: PropTypes.string,
  pickupCoords: PropTypes.object,
  destinationCoords: PropTypes.object,
  trackCaptain: PropTypes.bool,
};
InteractiveMap.propTypes = {
  center: PropTypes.object.isRequired,
  pickup: PropTypes.object,
  destination: PropTypes.object,
};
