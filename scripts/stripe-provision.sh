#!/usr/bin/env bash
set -euo pipefail

: "${STRIPE_CURRENCY:=eur}"
: "${STRIPE_PRO_MONTHLY_CENTS:=14900}"
: "${STRIPE_ENTERPRISE_MONTHLY_CENTS:=100000}"

command -v stripe >/dev/null || { echo 'Stripe CLI is required: https://stripe.com/docs/stripe-cli'; exit 1; }

echo 'Creating Neuraldocx Stripe products and recurring EUR prices…'
pro_product=$(stripe products create --name='Neuraldocx Pro' --description='Team AI compliance workspace' --format=json | sed -n 's/.*"id":\s*"\([^"]*\)".*/\1/p' | head -1)
enterprise_product=$(stripe products create --name='Neuraldocx Enterprise' --description='Enterprise AI compliance workspace' --format=json | sed -n 's/.*"id":\s*"\([^"]*\)".*/\1/p' | head -1)
pro_price=$(stripe prices create --product="$pro_product" --currency="$STRIPE_CURRENCY" --unit-amount="$STRIPE_PRO_MONTHLY_CENTS" --recurring[interval]=month --format=json | sed -n 's/.*"id":\s*"\([^"]*\)".*/\1/p' | head -1)
enterprise_price=$(stripe prices create --product="$enterprise_product" --currency="$STRIPE_CURRENCY" --unit-amount="$STRIPE_ENTERPRISE_MONTHLY_CENTS" --recurring[interval]=month --format=json | sed -n 's/.*"id":\s*"\([^"]*\)".*/\1/p' | head -1)

printf '\nAdd these values to apps/api/.env:\nSTRIPE_PRICE_PRO=%s\nSTRIPE_PRICE_ENTERPRISE=%s\n' "$pro_price" "$enterprise_price"
