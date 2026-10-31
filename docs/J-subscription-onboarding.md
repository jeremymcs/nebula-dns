# J. Subscription & Onboarding System

## Overview

This document describes the subscription management and tenant onboarding system for Nebula DNS, enabling self-service signup, automated provisioning, and guided onboarding.

## Features Implemented

### 1. Subscription Plans

Four subscription tiers with different feature sets and limits:

| Plan | Price (Monthly) | Price (Yearly) | Key Features |
|------|----------------|----------------|--------------|
| **Free** | $0 | $0 | Basic filtering, 1 location, 100K queries/mo |
| **Starter** | $9.99 | $99.99 | Email support, custom lists, SafeSearch |
| **Professional** | $29.99 | $299.99 | API access, schedules, audit logs, priority support |
| **Enterprise** | $99.99 | $999.99 | SSO, dedicated support, custom branding, SLA |

### 2. Public Marketing Pages

- **Landing Page** (`/landing`)
  - Hero section with value proposition
  - Feature highlights
  - Statistics display
  - Trust badges
  - Call-to-action buttons

- **Pricing Page** (`/pricing`)
  - Interactive plan comparison
  - Monthly/yearly billing toggle (17% savings)
  - Feature comparison matrix
  - FAQ section
  - Contact sales CTA

- **Signup Page** (`/signup`)
  - 3-step signup flow
  - Real-time validation
  - Plan selection with summary
  - Terms acceptance
  - Success confirmation

### 3. Tenant Provisioning

Automatic provisioning when a new tenant signs up:

1. **Tenant Creation**
   - Generate unique slug from company name
   - Initialize tenant settings
   - Set plan and status

2. **Owner User Creation**
   - Create user with owner role
   - Hash password securely
   - Send verification email

3. **Default Policy Setup**
   - Create "Default Security Policy"
   - Configure recommended blocking categories
   - Enable threat protection

4. **Primary Location**
   - Create "Primary Network" location
   - Assign default policy
   - Generate DoH token

### 4. Welcome Email

Automated email sent after successful signup:
- Personalized greeting
- Account details
- Getting started steps
- Dashboard login link
- Support information

### 5. Onboarding Wizard

Guided 5-step onboarding after first login:

1. **Welcome** - Introduction and overview
2. **Location Setup** - Review pre-created location
3. **Policy Customization** - Adjust blocking categories
4. **Device Configuration** - DNS server addresses and setup guides
5. **Verification** - Confirm everything is working

## API Endpoints

### Public Endpoints

```
GET  /plans              - List all subscription plans
GET  /plans/:id          - Get specific plan details
POST /signup             - Create signup request
POST /signup/:id/complete - Complete signup (after payment)
POST /webhooks/stripe    - Stripe webhook handler
```

### Authenticated Endpoints

```
GET  /subscription       - Get current subscription
POST /subscription/cancel - Cancel subscription
POST /subscription/resume - Resume canceled subscription
```

## Database Schema

### New Tables

```sql
-- Subscription Plans
CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2) NOT NULL,
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    ...
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    plan_id VARCHAR(50) REFERENCES subscription_plans(id),
    status VARCHAR(20),
    billing_cycle VARCHAR(20),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    ...
);

-- Signup Requests
CREATE TABLE signup_requests (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    company_name VARCHAR(255),
    plan_id VARCHAR(50),
    status VARCHAR(20),
    stripe_checkout_session_id VARCHAR(100),
    ...
);

-- Onboarding Progress
CREATE TABLE onboarding_progress (
    id UUID PRIMARY KEY,
    tenant_id UUID UNIQUE REFERENCES tenants(id),
    steps_completed JSONB,
    current_step VARCHAR(50),
    ...
);
```

## Stripe Integration

### Payment Flow

1. User selects plan and completes signup form
2. For paid plans, redirect to Stripe Checkout
3. After payment, Stripe webhook triggers provisioning
4. User redirected to dashboard

### Webhook Events Handled

- `checkout.session.completed` - Complete signup
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Handle cancellation
- `invoice.paid` - Record payment
- `invoice.payment_failed` - Send payment failed email

## Email Templates

### Welcome Email
- Professional HTML template
- Mobile-responsive
- Getting started steps
- Dashboard CTA button

### Payment Failed Email
- Urgent styling
- Update payment link
- Support contact

### Password Reset Email
- Security-focused
- Time-limited link
- Clear instructions

## Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...

# Email (SendGrid)
SENDGRID_API_KEY=SG...
EMAIL_FROM_ADDRESS=noreply@safedns.example.com
EMAIL_FROM_NAME=Nebula DNS

# Frontend
FRONTEND_URL=https://app.safedns.example.com
```

## Future Enhancements

### Phase 1 (Next Sprint)
- [ ] Stripe Checkout integration
- [ ] Email verification flow
- [ ] Password strength requirements
- [ ] Captcha for signup

### Phase 2
- [ ] Team invitations
- [ ] Plan upgrade/downgrade flow
- [ ] Usage-based billing alerts
- [ ] Referral program

### Phase 3
- [ ] Enterprise SSO/SAML
- [ ] Custom invoice branding
- [ ] Multi-currency support
- [ ] Annual billing reminders

## Testing

### Unit Tests
- Signup validation
- Plan limit enforcement
- Provisioning flow

### Integration Tests
- End-to-end signup
- Stripe webhook processing
- Email delivery

### Manual Testing
- Signup flow walkthrough
- Onboarding wizard completion
- Plan selection changes

## Deployment Checklist

- [ ] Configure Stripe products and prices
- [ ] Set up SendGrid templates (optional)
- [ ] Configure DNS for email domain
- [ ] Set environment variables
- [ ] Run database migrations
- [ ] Test webhook endpoint
- [ ] Enable in production

## Support Documentation

New users should be directed to:
- Setup guides for different platforms
- FAQ about billing and plans
- Contact support for enterprise inquiries
