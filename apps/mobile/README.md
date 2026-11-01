# Flux Shield Mobile (`apps/mobile`)

Native iOS + Android app for **Flux Labs platform admins** and **MSP operators**, built with Expo SDK 58, Expo Router, TanStack Query, and secure token storage.

## Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) / `npx expo`
- For device builds: [EAS CLI](https://docs.expo.dev/build/setup/) (`npm i -g eas-cli`)
- Apple Developer + Google Play accounts (Jeremy already has these)

## Configure API URL

Default production API: `https://api.shield.fluxlabs.net`

Override locally:

```bash
export EXPO_PUBLIC_API_URL=https://api.shield.fluxlabs.net
```

Runtime config is also set in `app.config.ts` (`extra.apiUrl`).

## Run locally

```bash
cd apps/mobile
npm ci
npm start
```

- **Expo Go:** scan the QR code (limited — push + secure store work best on dev builds).
- **iOS simulator / Android emulator:** press `i` or `a` in the Expo CLI UI.
- **Web (UI dev only):** `npm run web`

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
```

CI runs the same in `.github/workflows/ci.yml` (`mobile-test` job).

## EAS Build profiles

`eas.json` defines:

| Profile | Use |
|---------|-----|
| `development` | Dev client, internal distribution, iOS simulator |
| `preview` | Internal QA / TestFlight internal |
| `production` | Store releases (`autoIncrement`) |

### Required EAS secrets (set in Expo dashboard — never commit)

| Secret | Purpose |
|--------|---------|
| `EAS_PROJECT_ID` | Links builds to Expo project (`app.config.ts` extra) |
| `EXPO_PUBLIC_API_URL` | Optional override per environment |
| Apple credentials | Managed by EAS or uploaded ASC key |
| Android keystore | Managed by EAS or uploaded |
| `GOOGLE_SERVICES_JSON` | FCM for Android push (when enabling production push) |
| APNs key | iOS push via Expo (upload in Expo push credentials) |

Create/link project:

```bash
eas login
eas init   # once — sets project id
```

Build:

```bash
eas build --profile development --platform ios
eas build --profile preview --platform all
eas build --profile production --platform all
```

## TestFlight & Play internal testing

1. `eas build --profile preview --platform ios` → download `.ipa` or use EAS Submit.
2. `eas submit --platform ios --latest` (App Store Connect → TestFlight internal group).
3. `eas build --profile preview --platform android` → `eas submit --platform android --track internal`.

Bundle ID / application ID: **`net.fluxlabs.shield`**

## Auth & API behavior

- Login mode: **Platform admin** (`/admin/*`) vs **MSP** (`/auth/*`, tenant JWT).
- Sends **`X-Device-Id`** and **`X-App-Version`** on every request.
- Admin refresh: `POST /admin/refresh`; tenant: `POST /auth/refresh`.
- Push registration: `POST /admin/mobile/register` or `/auth/mobile/register`.
- Impersonation: reason required; banner + `POST /admin/impersonate/end`.
- Rooted/jailbroken devices: **read-only** (MVP stub detector; wire native attestation in Phase 2).

## Backend dependencies

This app targets APIs from:

- PR **#19** — admin MFA
- PR **#21** — `/admin/tenants*`, `/admin/audit/logs`, `/admin/system/certificates`
- PR **#22** — mobile device registration, sessions, refresh, impersonation reason
- PR **#17** — DNS Management read (`/dns-management/zones`)

## Design reference

See `docs/mobile/MOBILE-APP-DESIGN.md` and `docs/mobile/mockups/`.
