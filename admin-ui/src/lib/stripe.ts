/**
 * Nebula DNS - Admin UI Stripe Configuration
 * Initializes Stripe.js with publishable key
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'

// Initialize Stripe.js with the publishable key
// Returns null if key is not configured (development without Stripe)
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

export const stripePromise: Promise<Stripe | null> = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null)
