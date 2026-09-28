# How RideX works — Yashwant

This project deliberately keeps the MERN stack and uses straightforward JavaScript functions.

## Ride lifecycle

A ride starts pending, then becomes accepted, ongoing and completed. The rider can cancel pending/accepted rides. Each update checks the current status and owner/assigned captain in the database query. Unique partial indexes prevent multiple active rides for the same rider or assigned captain, including concurrent requests.

A rider confirms paying cash; the captain then confirms receiving it by finishing the ride. Both steps persist in MongoDB, so a refresh does not lose the payment state. This is not a payment gateway.

## Maps and matching

Google Maps supplies real coordinates, driving distance and duration. The server calculates base + distance + time charges. If maps fail, booking reports an error. Drivers must be online, have a location updated in the last minute, have the requested vehicle type and be within 5 km. For this small project the distance check is plain JavaScript, not a geospatial dispatch engine.

The captain sends GPS coordinates through an authenticated endpoint. Only the assigned rider receives its socket update. The rider can also recover the latest ride/location through HTTP polling. The optional JavaScript map draws a driving route; the keyless embed shows the last actual coordinate.

## Account and UI

Profile and saved-place forms save to MongoDB before showing success. Ride history is paginated. A completed ride can be rated once. Screens share simple cards, feedback messages and navigation. The public demo is separate from live bookings.

## Practical next steps

For a larger service: geospatial indexes, a shared rate-limit store, verified driver onboarding and infrastructure monitoring. These are intentionally outside this fresher project. Before real use, add account email verification and review privacy/operational requirements with the service owner.
