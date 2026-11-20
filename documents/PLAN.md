# Staged Plan: Zero-Fee NZ Money Manager (Expo + Akahu Personal App)

## Why This Architecture? (100% Zero Fees & Open Source)
Akahu charges commercial fees for multi-user OAuth apps, **but provides free "Personal App" developer access** for individuals accessing their own bank accounts.
By guiding each user to sign up on Akahu as a Personal App developer, accept Akahu's developer agreement, and bring their own `app_token_...` and `user_token_...` into the mobile app:
- **$0 API fees** for you and your users.
- **$0 server costs** (the mobile app calls `https://api.akahu.io/v1` directly from the phone with no backend needed).
- **100% on-device privacy** (tokens and salted PIN hash live inside hardware-backed `expo-secure-store`, and bank accounts are cached locally in `expo-sqlite`).

---

## Phase 1: Barebones App Shell, Akahu Setup, Mandatory 6-Digit PIN & Biometric Uplift ✅ (Complete)

**Goal:** Get into the barebones app shell (`Home`, `Accounts`, `Settings`), set up Akahu tokens with clipboard auto-paste, and secure the app with a mandatory 6-digit PIN + optional biometric uplift.

- [x] Minimal Bottom Tab Navigation (`Home`, `Accounts`, `Settings`)
- [x] Akahu Token Setup & Clipboard Auto-Paste (`expo-clipboard`)
- [x] Mandatory 6-Digit PIN First → Optional Biometric Uplift
- [x] Non-destructive OS Biometrics Fallback & Cold-Launch-Only Lock (`useAppLifecycleState`)

---

## Phase 2: Local SQLite Bank Accounts List & Account Detail Page ✅ (Current)

**Goal:** Sync connected NZ bank accounts from Akahu (`GET /v1/accounts`) into local **`expo-sqlite`** storage, list them in the **Accounts** tab with a side arrow (`>`), and open a dedicated **Bank Account Page** showing the account's net balance and an empty space reserved for transactions below.

1. **Local SQLite Storage (`lib/db.ts` via `expo-sqlite`)**:
   - Store and query `bank_accounts` locally on device (`id`, `name`, `bank`, `account_number`, `balance`, `available_balance`, `type`, `status`, `last_refreshed`, `updated_at`).
   - Clear the local SQLite `bank_accounts` table whenever tokens are wiped.
2. **Accounts List Tab (`app/accounts.tsx`)**:
   - Fetch accounts from Akahu and persist them in `expo-sqlite` via TanStack Query (`useAkahuAccounts()`).
   - Render each bank account card with its bank name, account name, account number, balance, and a **side arrow (`>`)**.
   - Provide **Sync** (`POST /v1/refresh` + SQLite upsert) and **Link Bank on Akahu** (`https://my.akahu.nz`) actions.
3. **Individual Bank Account Detail Page (`app/account/[id].tsx`)**:
   - Clicking an account card's `>` row navigates to `/account/[id]`.
   - Displays the **Net Balance Card** for that specific bank account at the top (Current Net Balance, Available Balance, Bank & Account Number).
   - Reserves a **Transactions Section** below (currently showing a clean empty state until transaction syncing is plugged in).

---

## Phase 3: Plug In Account Transactions (`GET /v1/accounts/{id}/transactions`) — Next

**Goal:** Store and list transactions in `expo-sqlite` inside the reserved transactions section on the Bank Account Detail Page (`app/account/[id].tsx`).

---

## Phase 4: Home Dashboard & Spending Insights
- Aggregate net worth and spending summaries on the **Home** tab once accounts and transactions are working end-to-end.
