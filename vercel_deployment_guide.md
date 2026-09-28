# Hosting RideX — Yashwant

## Frontend

Build `frontend` with `npm ci && npm run build`. Publish `frontend/dist` as a static site. The included Vercel rewrite supports React Router routes. Configure `VITE_BASE_URL` with the HTTPS API URL before building; optional `VITE_GOOGLE_MAPS_API` is a browser key restricted to your site domain.

## Backend

Run `Backend` as a persistent Node.js service using `npm ci` and `npm start`. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, Google Maps and SMTP environment variables. `CLIENT_ORIGIN` is your exact frontend origin, or a comma-separated list. The service must support long-lived Socket.IO connections for live updates. Do not expose `.env` files.

`Backend/vercel.json` is retained for the existing HTTP-only setup, but that entry exports Express without initialising the Socket.IO server. In that mode, the frontend falls back to HTTP polling. Use `Backend/server.js` on a persistent Node service for the full real-time experience.

Check signup/login, Maps and SMTP, permissions, a two-browser ride, refresh recovery and a receipt on your actual deployment. This repository update alone does not configure hosting accounts or API credentials.
