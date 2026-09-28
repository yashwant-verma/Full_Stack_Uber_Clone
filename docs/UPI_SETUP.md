# UPI setup — Yashwant

RideX uses Razorpay Standard Checkout with UPI, server-created orders, signature verification and captured-payment checks. No UPI PIN, bank password or secret API key goes through the frontend.

## 1. Backend settings

In `Backend/.env`, configure your own **test-mode** credentials:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret
RAZORPAY_WEBHOOK_SECRET=your_separate_random_webhook_secret
RAZORPAY_ALLOW_LIVE=false
```

Never commit this file or paste secrets into a frontend `VITE_` variable. The frontend receives only the public key ID and the server-created order. Missing settings keep UPI unavailable; cash remains available for rides without an open UPI order.

## 2. Razorpay dashboard

- Configure automatic capture. RideX only accepts **captured** payments; an authorized payment is not shown as paid.
- Add your deployed HTTPS API webhook URL: `https://YOUR-API/payments/webhook`.
- Use the same webhook secret as `RAZORPAY_WEBHOOK_SECRET`.
- Subscribe to `payment.captured` and `order.paid`.
- Enable the appropriate UPI methods on your account. Checkout offers supported app-intent/QR methods; RideX does not implement a custom UPI Collect form.

## 3. Try an end-to-end test

Use test keys, an ongoing ride and the Pay with UPI button. Confirm that a success becomes **UPI verified** only after server verification. Try closing checkout, reopening the same order, refreshing either account, sending duplicate webhook events and pressing Check payment status. The captain must not collect cash after UPI has started. Test mode is labelled on rider, captain and receipt screens.

A gateway payment goes to the configured **merchant account**, not automatically to an individual captain. The earnings dashboard records ride totals; it is not an automated payout system. Real driver payouts/settlement are outside this portfolio integration.

## Failure handling

- Closing/failing checkout does not mark a payment as paid. Reopen the same order or check its status.
- The server locks the payment method once a UPI order starts, preventing cash/UPI double payment.
- If order creation times out, the provider may still have created it. RideX keeps the ride locked (`order_unknown` / `order_creating`) instead of blindly creating another order. The owner should inspect the Razorpay dashboard using receipt `ride_<ride ID>` and reconcile the stored order with its correct amount/currency before allowing another payment. There is no automatic unlock endpoint.
- If an order was never created and the provider explicitly rejected it, cash remains available.
- Duplicate verified callbacks/webhooks are safe. Only a matching order, amount, INR currency, UPI method, no-refund payment and captured status can verify the ride.
- Refunds, disputes and payouts must be reviewed in the gateway dashboard. This version does not automate them. A verified receipt records the captured payment at verification time; it is not a live settlement/refund ledger.

## Before live mode

Account activation and UPI availability depend on Razorpay. Complete a real test-mode checkout and webhook round trip with your own credentials first. Only then configure live keys and explicitly set `RAZORPAY_ALLOW_LIVE=true`. Never mix test and live keys on an unfinished ride. The new code has not been tested against your gateway account.

## Official references

- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/sample-code/
