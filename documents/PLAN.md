# Staged Plan: Zero-Fee NZ Money Manager (Expo + Akahu Personal App)

## Why This Architecture? (100% Zero Fees & Open Source)
Akahu charges commercial fees for multi-user OAuth apps, **but provides free "Personal App" developer access** for individuals accessing their own bank accounts.
By guiding each user to sign up on Akahu as a Personal App developer, accept Akahu's developer agreement, and bring their own `app_token_...` and `user_token_...` into the mobile app:
- **$0 API fees** for you and your users.
- **$0 server costs** (the mobile app calls `https://api.akahu.io/v1` directly from the phone with no backend needed).
- **100% on-device privacy** (tokens are locked inside the phone's hardware keystore behind biometrics).

---

## Phase 1: Barebones App Shell, Akahu Token Setup & Biometric Uplift (Current)

**Goal:** Get into the barebones app shell (`Home`, `Accounts`, `Settings`), allow the user to save their Akahu tokens in Settings, and immediately lock them behind a Biometric Uplift.

### 1. Minimal Bottom Tab Navigation (`app/_layout.tsx`)
- **Home (`app/index.tsx`)**: Minimal landing page displaying connection status.
- **Accounts (`app/accounts.tsx`)**: Placeholder screen ready for Phase 2.
- **Settings (`app/settings.tsx`)**: Akahu token entry, biometric uplift, locked credential form, and biometric toggle.

### 2. Biometric Uplift & Locked Credential Form (`app/settings.tsx` & `lib/security.ts`)
1. **Enter & Verify Tokens:**
   - User opens `https://my.akahu.nz` (link banks) and `https://my.akahu.nz/developers` (accept Developer Terms & copy `app_token_...` and `user_token_...`).
   - User pastes both tokens into Settings and taps **"Verify & Lock with Biometrics"**.
2. **Biometric Uplift on Save:**
   - App verifies the tokens against `GET https://api.akahu.io/v1/me`.
   - Immediately prompts a **biometric uplift** (`expo-local-authentication`) before locking and persisting the tokens and user profile in `expo-secure-store`.
3. **Locked Form & Biometric Edit Button:**
   - Once saved, the `App ID Token` and `User Access Token` inputs are **locked and masked** (`app_token_••••`).
   - Tapping the **"Edit"** button triggers a **biometric unlock prompt** before allowing any edits.
4. **Biometric Security Toggle & Wipe Warning Modal:**
   - Settings includes a **Biometric Security** toggle switch.
   - Toggling it **OFF** opens a **Warning Modal** informing the user that turning off biometrics will permanently wipe their stored `App ID Token` and `User Access Token` from device storage, requiring them to copy and paste both tokens all over again.
   - Confirming the modal requires **biometric verification** before wiping the tokens and disabling biometrics.

---

## Phase 2: Add & List Connected Bank Accounts (`app/accounts.tsx`)

**Goal:** Once tokens are verified and locked in Settings, display and manage connected NZ bank accounts in the **Accounts** tab.

1. **List Connected Accounts (`GET /v1/accounts`)**:
   - Display bank name, account name, masked account number, current balance, and available balance.
2. **Add / Link More Banks & Sync**:
   - Button to open `https://my.akahu.nz` to link additional NZ bank accounts.
   - **Sync / Refresh** button (`POST /v1/refresh`) to pull updated account balances.

---

## Phase 3: App Launch Biometric Lock Screen & Auto-Paste Onboarding Polish

**Goal:** Require biometric unlock when reopening the app (if tokens are stored) and add clipboard auto-paste conveniences.

---

## Phase 4: Future Enhancements
- Transactions list, search/filtering, and spending insights once Phases 1–3 are tested end-to-end.
