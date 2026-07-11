# Payments adapter boundary

Stripe calls remain coupled to the existing billing application service in this foundation stage. A later subscriptions migration will extract a payment-gateway port and Stripe adapter here without changing billing behavior.
