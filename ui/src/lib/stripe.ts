/**
 * Nebula DNS - Stripe Initialization
 * Stripe.js loader for payment method collection
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { loadStripe } from '@stripe/stripe-js'

// Lazy-load Stripe.js only when needed
// Uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY from environment
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)
