# RideX API — Yashwant

All protected endpoints use `Authorization: Bearer <token>`. Tokens include account role. A rider token cannot access captain endpoints. JSON errors use a `message` field.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/users/register`, `/captains/register` | Create account |
| POST | `/users/login`, `/captains/login` | Login |
| GET / PATCH | `/users/profile`, `/captains/profile` | Read / save profile |
| PUT | `/users/saved-places` | `{ places: [{ label: "Home", address: "..." }] }` (Home/Work, max 2) |
| GET | `/users/logout`, `/captains/logout` | Revoke current token and disconnect sockets |
| POST | `/users/forgot-password`, `/captains/forgot-password` | Email a reset OTP |
| POST | `/users/reset-password`, `/captains/reset-password` | Reset with email, otp, newPassword; revoke old sessions |
| PATCH | `/captains/availability` | `{ status: "active" }` or `inactive` |
| PATCH | `/rides/location` | Captain coordinates `{ ltd, lng }` |
| GET | `/maps/get-suggestions?input=...` | Real location suggestions |
| GET | `/rides/get-fare?pickup=...&destination=...` | Car, Auto, Moto estimates |
| POST | `/rides/create` | pickup, destination, vehicleType (`car`, `auto`, `moto`) |
| GET | `/rides/pending` | Nearby compatible rides for available captain |
| POST | `/rides/confirm` | Captain accepts `{ rideId }` |
| POST | `/rides/start-ride` | Assigned captain submits `{ rideId, otp }` |
| POST | `/rides/cancel` | Rider cancels pending/accepted `{ rideId }` |
| GET | `/rides/active` | Current account's active ride |
| POST | `/rides/:id/payment` | Rider confirms cash |
| POST | `/rides/end-ride` | Captain confirms receipt and finishes `{ rideId }` |
| GET | `/rides/history?page=1` | 10 completed/cancelled rides per page |
| GET | `/rides/:id` | Owner/assigned captain's ride details |
| POST | `/rides/:id/rating` | Rider submits rating 1–5 and optional review, once |
| GET | `/rides/captain-stats` | Completed rides, earnings and real rating |

Socket.IO takes `{ auth: { token } }` on connection. Identity rooms are assigned by the server. Clients cannot send join, payment or location changes to choose another identity. Use the authenticated HTTP endpoints, which persist data before emitting events. OTP is returned only in the rider view, never the captain view.

`GET /rides/user-active-ride` remains as a rider-only compatibility endpoint. Ride start is now POST, so the OTP is not put in the query string.
