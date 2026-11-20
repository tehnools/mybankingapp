# Staged Plan: Zero-Fee NZ Money Manager (Expo + Akahu Personal App)

## Why This Architecture? (100% Zero Fees & Open Source)
Akahu charges commercial fees for multi-user OAuth apps, **but provides free "Personal App" developer access** for individuals accessing their own bank accounts.
By guiding each user to sign up on Akahu as a Personal App developer, accept Akahu's developer agreement, and bring their own `app_token_...` and `user_token_...` into the mobile app:
- **$0 API fees** for you and your users.
- **$0 server costs** (the mobile app calls `https://api.akahu.io/v1` directly from the phone with no backend needed).
- **100% on-device privacy** (tokens and salted PIN hash live inside hardware-backed `expo-secure-store`).

---

## Phase 1: Barebones App Shell, Akahu Setup, Mandatory 6-Digit PIN & Biometric Uplift ✅ (Complete)

**Goal:** Get into the barebones app shell (`Home`, `Accounts`, `Settings`), set up Akahu tokens with clipboard auto-paste, and secure the app with a mandatory 6-digit PIN + optional biometric uplift.

### 1. Minimal Bottom Tab Navigation (`app/_layout.tsx`)
- [x] **Home (`app/index.tsx`)**: Minimal landing page displaying Akahu connection status.
- [x] **Accounts (`app/accounts.tsx`)**: Placeholder screen ready for Phase 2.
- [x] **Settings (`app/settings.tsx`)**: Akahu token entry, clipboard auto-paste, mandatory 6-digit PIN setup, locked credential form, and optional biometric toggle.

### 2. Akahu Token Setup & Auto-Paste (`hooks/use-akahu-data.ts` & `app/settings.tsx`)
- [x] **External Links**: Quick buttons to open `https://my.akahu.nz` (link banks) and `https://my.akahu.nz/developers` (accept Developer Terms & create Personal App).
- [x] **Clipboard Auto-Paste (`expo-clipboard`)**: Automatically detects `app_token_...` and `user_token_...` from the clipboard when returning to the app (plus manual one-tap Paste button).
- [x] **Live Verification**: Validates both tokens against `GET https://api.akahu.io/v1/me` and stores the user profile.

### 3. Mandatory 6-Digit PIN First → Optional Biometric Uplift (`lib/security.ts`, `components/pin-pad.tsx`, `hooks/use-app-state.ts`)
- [x] **Mandatory 6-Digit PIN**: Created & confirmed when first saving Akahu tokens; stored as a random-salted SHA-256 hash in `expo-secure-store`.
- [x] **Optional Biometric Uplift**: Immediately offered after setting the 6-digit PIN if the device has biometrics enrolled.
- [x] **Locked Credential Form**: Tokens are masked and read-only once saved; tapping **Edit** tries biometrics first (if enabled) and falls back to the 6-digit PIN pad.
- [x] **Graceful OS Biometrics Fallback (No Token Wipe)**: If the user removes biometrics from Android/iOS settings or toggles Biometric Unlock off in Settings, biometrics are cleanly disabled while tokens and the mandatory 6-digit PIN stay intact.
- [x] **Cold-Launch-Only Lock (`useAppLifecycleState`)**: Moving between background and foreground keeps the session unlocked; only a full app close & reopen triggers the lock screen (Biometrics first, 6-digit PIN pad fallback).
- [x] **Explicit Wipe Option**: Separate **"Clear Saved Tokens & Reset PIN"** confirmation modal in Settings.

---

## Phase 2: Add & List Connected Bank Accounts (`app/accounts.tsx`) — Next

**Goal:** Connect the **Accounts** tab to Akahu's `/v1/accounts` and `/v1/refresh` endpoints.

1. **List Connected Accounts (`GET /v1/accounts`)**:
   - Display bank name, account name, masked account number, current balance, and available balance using `useAkahuAccounts()`.
2. **Add / Link More Banks & Sync**:
   - Button to open `https://my.akahu.nz` to link additional NZ bank accounts.
   - **Sync / Refresh** button (`POST /v1/refresh` via `useRefreshAkahu()`) and pull-to-refresh to update balances.

---

## Phase 3: Home Dashboard Summary (`app/index.tsx`)

**Goal:** Show a clean total net balance card across connected NZ bank accounts and quick navigation to Accounts and Settings.

---

## Phase 4: Future Enhancements
- Transactions list (`GET /v1/transactions` and `/v1/accounts/{id}/transactions`), search/filtering, and spending insights once Phases 1–3 are tested end-to-end.
