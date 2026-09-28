# Security notes — Yashwant

## Implemented

- Role-bound HS256 JWTs with issuer/audience validation, unique session IDs and an 8-hour expiry. Logout blacklists a token; reset increments token version and disconnects old sockets.
- Password hashing, 8–72-character new passwords with a bcrypt byte limit, and current-password confirmation for email changes.
- IP rate limits plus persistent MongoDB account limits for login/reset attempts. Production proxy hop count must match the actual hosting setup.
- Reset codes use a keyed digest, expire in 15 minutes, have a 60-second resend cooldown and allow five attempts. Code consumption is atomic.
- Ride start permits only the assigned captain, with five OTP attempts and a 15-minute retry window.
- Request size limits, rejection of Mongo operator/prototype keys, no-store API responses and security headers. Vercel frontend headers include a CSP permitting Maps and Razorpay Checkout.
- Payment order ownership, server-derived amount, constant-time signature checks, raw-body webhook verification, captured-payment checks and atomic idempotent state updates.

## Still a learning project

Login tokens remain in localStorage; an XSS flaw can expose them. A future deployment can migrate to HttpOnly Secure cookies with a deliberate CSRF and cross-origin design. Email ownership verification, distributed IP limits, refunds/dispute processing, monitoring and a full security audit are not included. Do not describe these changes as a guarantee of complete security.

Use HTTPS, strong environment secrets and least-privilege MongoDB credentials. Keep dependencies updated. Do not attach secrets, reset OTPs, payment signatures or full private account data to public issues.
