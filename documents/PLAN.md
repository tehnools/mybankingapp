# Staged Plan: Zero-Fee NZ Money Manager (Expo + Akahu Personal App)

## Why This Architecture? (100% Zero Fees)

Akahu charges commercial fees for multi-user OAuth apps, **but provides free "Personal App" developer access** for individuals accessing their own bank accounts.
By guiding each user to sign up on Akahu as a Personal App developer, accept Akahu's developer agreement, and bring their own `app_token_...` and `user_token_...` into the mobile app:

- **$0 API fees** for you and your users.
- **$0 server costs** (the mobile app calls `https://api.akahu.io/v1` directly from the phone with no backend needed).
- **100% on-device privacy** (tokens are locked inside the phone's hardware keystore behind biometrics).

---

## Phase 1: Barebones Login Screen & Guided Akahu Onboarding (With Auto-Paste)

**Goal:** Keep the app completely barebones, starting at a **Login / Welcome Screen** that leads new users through the zero-fee Akahu developer setup with automatic clipboard token detection.

### 1. Barebones Login / Welcome Screen (`app/index.tsx`)

- When the user first downloads and opens the app:
  - **New User (No stored tokens):** Shows a clean "Get Started (Zero-Fee Bank Setup)" action that launches the onboarding flow.
  - **Returning User (Tokens stored):** Shows a clean Login screen ("Unlock with Biometrics / Sign In") to enter the app.

### 2. Guided Akahu Developer Onboarding (`app/onboarding.tsx`)

A step-by-step wizard:

1. **Step 1 — Sign Up & Connect NZ Bank on Akahu:**
   - Button redirects user to `https://my.akahu.nz/connections` to create their Akahu account and link their NZ bank accounts.
2. **Step 2 — Developer Agreement & Token Creation:**
   - Button redirects user to `https://my.akahu.nz/developers` to accept the Akahu Personal App Developer Agreement and create their Personal App.
3. **Step 3 — Auto-Paste Token Form (`expo-clipboard` + `AppState`):**
   - As the user copies their **App ID Token** (`app_token_...`) and **User Access Token** (`user_token_...`) on Akahu and switches back to the app, the form **automatically reads the clipboard**, recognizes which token was copied by its prefix (`app_token_` vs `user_token_`), and populates the matching field automatically (plus manual "Paste" buttons as a fallback).
   - Verifies both tokens against `GET https://api.akahu.io/v1/me`.

### 3. Generic Akahu Core (`lib/`)

- **`lib/akahu-client.ts`**: Generic HTTP client attaching `X-Akahu-Id` and `Authorization: Bearer`.
- **`lib/akahu-auth.ts`**: Token verification (`/v1/me`), external link helpers, and session management.

---

## Phase 2: Biometric Store & Secure User Profile Storage

**Goal:** Immediately after token verification in onboarding, lock the tokens and user profile (`/v1/me`) in hardware-encrypted storage protected by Face / Fingerprint authentication.

1. **Biometric Setup Step (`expo-local-authentication` + `expo-secure-store`)**:
   - After valid tokens are pasted in onboarding, prompt the user to enable Biometric Unlock.
   - Store `akahu_app_token`, `akahu_access_token`, and user profile details (`_id`, `email`, `first_name`, `last_name`) securely in `expo-secure-store`.
2. **Biometric Login Flow**:
   - Returning users on the Login screen (`app/index.tsx`) tap **Unlock** → pass biometric prompt → enter the authenticated app shell.

---

## Phase 3: Barebones Authenticated App Shell & Bank Accounts

**Goal:** Once unlocked, enter the minimal bottom-tab shell (`Home`, `Accounts`, `Settings`) and list/add bank accounts.

1. **Minimal Bottom Tabs**:
   - **Home**: Blank/minimal landing dashboard.
   - **Accounts**: List connected NZ bank accounts (`GET /v1/accounts`), button to link more banks on Akahu, and Sync/Refresh (`POST /v1/refresh`).
   - **Settings**: View saved user details, toggle biometrics, or clear/reset Akahu tokens.

---

## Phase 4: Future Enhancements

- Transactions list, search/filtering, and spending insights once Phases 1–3 are tested end-to-end.
