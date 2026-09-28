# RideX — Full Stack Ride Booking

Built by **Yashwant** as a fresher portfolio and learning project.

RideX uses React, Express, Node.js, MongoDB and Socket.IO. It demonstrates rider and captain accounts, booking, an OTP start, location updates and cash/UPI payment flows. It is not a commercial transport service.

## Preview

The `/demo` page works without login, Maps credentials or a backend. Its sample locations and fares are clearly labelled; it never creates rides or collects money.

## What works

- Rider and captain signup/login, hashed passwords and email OTP reset.
- Profile changes saved in MongoDB; saved Home and Work addresses.
- Address search and driving-distance fares through Google Maps.
- Car, Auto and Moto selection; nearby matching within 5 km with vehicle and fresh-location checks.
- Captain online/offline control and actual completed-ride earnings.
- Atomic acceptance: only one captain can accept a pending ride.
- Only the assigned captain can start a ride with the rider's OTP.
- Authenticated Socket.IO rooms; saved database state and HTTP polling recover updates after refresh.
- Actual captain location updates while online/on a ride; no invented GPS movement.
- Cash confirmation saved by the rider, then confirmed by the captain when finishing.
- Razorpay UPI checkout with server verification, raw-body webhooks and duplicate-payment protection. Test mode is labelled.
- Paginated ride history, printable cash receipts, one rating/review per completed ride.
- Responsive pages, error messages, loading/empty states and a 404 page.

## Run locally

Use Node.js 22 and a running local MongoDB instance (or your own Atlas database). Docker is not required.

```sh
git clone https://github.com/yashwant-verma/Full_Stack_Uber_Clone.git
cd Full_Stack_Uber_Clone/Backend
npm ci
```

Copy `Backend/.env.example` to `Backend/.env`, set a long random `JWT_SECRET` and your MongoDB URL. Then:

```sh
npm run dev
```

In another terminal:

```sh
cd Full_Stack_Uber_Clone/frontend
npm ci
```

Copy `frontend/.env.example` to `frontend/.env`, then run:

```sh
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:3000 by default.

### Maps and email

- Real bookings require a configured Google Maps server key with Geocoding, Places autocomplete and Distance Matrix access. Billing/API availability depends on your Google Cloud account. No fake location or fare fallback is used.
- Optional `VITE_GOOGLE_MAPS_API` enables the Maps JavaScript map, a real location marker and driving-route display. This is a public browser key: restrict it to your website origins. The server key belongs only in `Backend/.env`.
- Without the browser key, the map embeds the latest actual GPS point. The demo works without either key.
- SMTP settings are required to email reset OTPs. Missing SMTP returns an unavailable message, not a false success.
- Location sharing needs browser permission and HTTPS on hosted sites (localhost works during development).

## Try the full flow

1. Open separate browser profiles/incognito sessions for rider and captain.
2. Create both accounts. Captain starts offline; go online and allow location access.
3. Choose a pickup within 5 km of the captain and choose the captain's vehicle type.
4. Rider books; captain accepts the request and enters the rider's OTP.
5. Rider confirms cash only after paying. Captain confirms receipt and finishes.
6. Open My rides, inspect the receipt, print/save it as PDF and submit a review.
7. Refresh either browser during the ride to check state recovery.

## Checks

```sh
cd frontend
npm run lint
npm run build
npx playwright install chromium
npm run test:ui
cd ../Backend
npm test
```

Backend tests use an isolated temporary MongoDB via `mongodb-memory-server`; the first run downloads a MongoDB binary. They never use your development database. Tests cover persistence, roles, simultaneous acceptance, duplicate bookings, OTP/ownership, cash state, ratings, unavailable services and socket authentication. GitHub Actions includes a manually triggered checks workflow; run it when ready.

## Simple project structure

- `Backend/routes`: endpoint validation and auth guards.
- `Backend/controllers`: request/response handling.
- `Backend/services`: maps, fare calculation, ride changes and safe ride views.
- `Backend/models`: accounts and rides with database constraints.
- `frontend/src/api/client.js`: shared Axios client.
- `frontend/src/hooks`: active ride sync, address search and captain location.
- `frontend/src/pages`: screens; `components`: reusable UI.

See [API notes](Backend/README.md), [deployment](vercel_deployment_guide.md) and [design notes](document.md).

When run, browser checks produce a demo recording and screenshots in the `ridex-browser-checks` GitHub Actions artifact. The booking screenshot uses labelled mocked map data. Browser and MongoDB checks have not been verified in this workspace.

## Existing database / upgrading

Older login tokens have no role claim, so sign in again after updating. Back up existing data before switching a deployed instance. Older rides may lack coordinates, vehicle type, payment status or fare breakdown; those historical values are not fabricated. Finish/cancel old active test rides in the old version or use a fresh development database before testing the new flow. No destructive migration is run automatically.

## Limitations

This is a single-server learning project. Nearby matching uses a bounded query and a simple Haversine distance check; it is not a city-scale dispatch system. Rate limits are in memory and reset with the server. There are no card payments, automated driver payouts, commercial driver verification or emergency dispatch. Network/GPS updates can be delayed. Location and Maps/SMTP integration should be checked with your own credentials before sharing a hosted demo.

## UPI and security update

See [UPI setup](docs/UPI_SETUP.md) and [security notes](SECURITY.md). Author: **Yashwant**. Existing sessions must log in again because JWT issuer/audience checks changed. Existing password-reset codes must be requested again.

Run `npm run test:security` in Backend for payment-signature and input-security unit checks without MongoDB. Full MongoDB/browser/gateway verification remains separate; manual CI is retained.

## Terminal and browser logs

See [logging instructions](docs/LOGGING.md). Debug logging shows processing steps, request IDs, DB operations and service errors without dumping passwords/OTP/payment secrets. Development UI events also appear in the backend terminal.
