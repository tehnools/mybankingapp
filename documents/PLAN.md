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

## Phase 2: Local SQLite Bank Accounts, Connections, Logos & Brand Color Detail View ✅ (Complete)

**Goal:** Sync connected NZ bank accounts and bank connections from Akahu (`GET /v1/accounts` via the official `akahu` SDK) into local **`expo-sqlite`** storage, cache bank logos locally, eyedrop each bank's brand color, list accounts in the **Accounts** tab with a side arrow (`>`), and open the **Bank Account Detail View** showing the account's net balance card styled in the bank's brand color with an empty space reserved for transactions below.

- [x] Local SQLite Storage (`bank_accounts` & `bank_connections` in `lib/db.ts` with Zod boundary validation & `.transform()`)
- [x] Non-secure local bank logo caching (`lib/logo-files.ts`) & brand color eyedropper (`lib/bank-branding.ts`)
- [x] Accounts List Tab & `<AccountDetailView>` (`app/accounts.tsx`) with eyedropped brand color Net Balance card and reserved Transactions placeholder section

---

## Phase 3: Plug In Account Transactions (`GET /v1/accounts/{id}/transactions`) ✅ (Complete)

**Goal:** Sync account transactions via the official `akahu` SDK (`sdk.accounts.listTransactions`), validate and store them in `expo-sqlite` (`bank_transactions` table with `idx_bank_transactions_account_date`), and render them inside `<AccountDetailView>` in `app/accounts.tsx`.

- [x] `TransactionSchema`, `transformAkahuTransactionToTransaction`, and `BankTransactionDbRowTransformSchema` in `types/`
- [x] `bank_transactions` SQLite table and indexed queries in `lib/db.ts`
- [x] `useAkahuAccountTransactions` hook with multi-page cursor pagination and offline SQLite fallback in `hooks/use-akahu-data.ts`
- [x] Transactions list with merchant logos / category icons, signed NZD amounts, running balance, pull-to-refresh, and account-specific Sync in `app/accounts.tsx`

---

## Phase 4: Home Dashboard & Spending Insights — Next
- Aggregate net worth and spending summaries on the **Home** tab once accounts and transactions are working end-to-end.
