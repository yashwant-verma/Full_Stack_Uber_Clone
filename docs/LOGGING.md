# See what RideX is doing — Yashwant

Run the backend and frontend in separate terminals:

```sh
# Terminal 1
cd Backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Set these values in `Backend/.env` and restart:

```env
LOG_LEVEL=debug
LOG_FORMAT=pretty
ENABLE_CLIENT_LOGS=true
```

In `frontend/.env`:

```env
VITE_DEBUG_LOGS=true
VITE_FORWARD_CLIENT_LOGS=true
```

Backend terminal shows startup configuration availability, MongoDB connecting/connected/disconnected/errors, database operation names, each HTTP request, auth result, service processing start/complete/failure, Maps/SMTP/Razorpay operations, socket connection/events and unexpected process failures. Database filters/documents and request bodies are not printed.

Browser DevTools → Console shows page changes, named button actions, form submissions, request start/result/error, connection changes and uncaught browser errors. In development, UI events also go to the backend terminal as `browser.report`. Frontend API requests and backend request logs share `X-Request-Id`; search that ID to follow a request. The bridge is disabled in production and rate limited. Browser reports are labelled untrusted and never change application state.

Example (illustrative):

```text
2026-09-28T18:00:00.000Z INFO  server.ready {"port":3000,"environment":"development"}
2026-09-28T18:00:01.000Z INFO  [request-id] http.request.start {"method":"POST","path":"/payments/ride-id/order"}
2026-09-28T18:00:01.005Z DEBUG [request-id] payment.createOrder.start {}
2026-09-28T18:00:01.010Z DEBUG [request-id] database.query {"collection":"rides","operation":"findOne"}
2026-09-28T18:00:01.050Z DEBUG [request-id] razorpay.createOrder.start {}
2026-09-28T18:00:01.600Z DEBUG [request-id] razorpay.createOrder.complete {"durationMs":550}
2026-09-28T18:00:01.610Z INFO  [request-id] http.request.complete {"status":200,"durationMs":610}
```

- `DEBUG`: processing details, database operation names and external-service steps.
- `INFO`: normal lifecycle and request results.
- `WARN`: rejected requests, disconnected sockets and aborted requests.
- `ERROR`: failed operations, validation/auth failures reaching the error handler and unexpected process errors.
- `LOG_LEVEL=info`: less noise; `LOG_LEVEL=silent`: no application logs.
- `LOG_FORMAT=json`: one JSON object per line for log tools.

Passwords, reset/ride OTPs, bearer tokens, secrets, signatures, email/phone/address fields and full connection URLs are excluded or redacted. Do not add raw `console.log(req.body)`, `console.log(process.env)` or full provider responses. Logging is not packet capture and does not reveal internal bank/UPI operations.

To capture backend output in PowerShell:

```powershell
npm run dev 2>&1 | Tee-Object -FilePath ridex-debug.log
```

Log files are ignored by git. Inspect logs before sharing; timestamps, request IDs, account IDs and ride IDs are still diagnostic data. Production hosting has separate frontend browser logs and backend service logs; the development bridge is intentionally not enabled there.
