# Stripe billing setup

The API creates Checkout subscriptions, opens the Stripe Customer Portal, and updates company plans from signed webhooks.

1. Authenticate the Stripe CLI with `stripe login`.
2. Run `STRIPE_PRO_MONTHLY_CENTS=14900 STRIPE_ENTERPRISE_MONTHLY_CENTS=100000 scripts/stripe-provision.sh`.
3. Add the printed price IDs plus `STRIPE_SECRET_KEY` to `apps/api/.env`.
4. Register `POST https://your-domain/api/billing/webhook` in Stripe and subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
5. Add the endpoint signing secret as `STRIPE_WEBHOOK_SECRET` and restart the API.

Use test-mode keys and test prices until the full checkout flow has been verified. Never commit `.env` files or Stripe secrets.
