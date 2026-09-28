# RideX frontend — Yashwant

React 18 + Vite, Tailwind CSS, React Router, Axios, GSAP and Socket.IO Client.

Copy `.env.example` to `.env`, run `npm ci`, then `npm run dev`.

- `npm run lint`: JavaScript and React checks.
- `npm run build`: production bundle.
- `npm run preview`: preview the built bundle.
- `/demo`: fictional walkthrough that does not need a backend.

The shared Axios client attaches the current token. Booking uses one step state rather than several overlapping panels. Hooks separate API synchronisation, location publishing and autocomplete from screen markup. Database responses decide when a save/booking/payment is successful.
