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

## Phase 4: Home Dashboard — Accounts & Purchase Type Pie Graphs — Next

**Goal:** Build the **Home** tab (`app/index.tsx`) with interactive 2D donut/pie charts and a date-range filter powered by local SQLite data across all connected accounts, using a **swappable chart abstraction** (`components/charts/` + `types/charts.ts`) backed initially by `react-native-gifted-charts` (`react-native-svg` + `expo-linear-gradient`) so the charting library can be swapped later (e.g. to `victory-native` XL + Skia) without changing screen or hook code.

1. **Swappable Chart Layer (`types/charts.ts`, `components/charts/`)**:
   - Define library-agnostic chart data & prop interfaces (`DonutChartSlice`, `DonutChartProps`, `LineChartSeries`, `ChartLegendItem`).
   - Wrap `react-native-gifted-charts` inside `components/charts/donut-chart.tsx` and `components/charts/chart-legend.tsx` so screens never import charting-library primitives directly.
2. **Accounts Breakdown Pie Graph**:
   - Displays each connected bank account's share of total funds.
   - Includes a **color-coded list of bank accounts as a legend** (using each bank's eyedropped brand color / distinct shade + account name + NZD balance).
3. **Purchase Type / Category Spending Pie Graph**:
   - Collates debit spending across all connected accounts using `useAkahuCategorySpending({ startDate, endDate })`.
   - Groups uncategorized or unsure purchase types under **"Other"** so the chart stays clean and readable.
4. **Date Range Selector**:
   - Allows switching periods (e.g. `1M`, `3M`, `6M`, `1Y`), automatically triggering `useBackfillHistoricalTransactions` when an older range is requested.

---

## Phase 5: Net Gain & Net Worth Line Chart

**Goal:** Add a swappable `<LineChart>` wrapper in `components/charts/` calculating and visualizing **Net Gain** (cashflow: income minus spending per period) and **Net Worth / Net Balance** trends over time across all connected accounts.

---

## MVP 2 (Future / Brainstorming): Savings Goals & Spreadsheet / CSV Exports

**Goal:** Add an entry point on the **Home** tab (`app/index.tsx`) for Savings Goals, plus free CSV & cloud spreadsheet export/sync options (exact design TBD).

- **Savings Goals:**
  - Cadence options: **Weekly**, **Fortnightly**, **Monthly (default)**, and **Yearly**.
  - Scope: Aggregates **all connected accounts** (no per-account selection).
  - Home Page Entry Point: Card/tile on the Home dashboard routing into the savings goals screen.
- **CSV & Cloud Spreadsheet Export / Sync:**
  - **Local CSV Export / Share:** 100% offline and free via `expo-file-system` + `expo-sharing`.
  - **Google Sheets (Free, $0 API fees):** Upload/update a Google Sheet created by the app using the non-sensitive `drive.file` scope (avoids paid CASA security audits) via `@react-native-google-signin/google-signin` or `expo-auth-session`.
  - **Microsoft OneDrive (Free for personal accounts):** Upload `.csv` / `.xlsx` files to OneDrive via Microsoft Graph (`Files.ReadWrite.AppFolder`). *(Note: Microsoft Graph's live `/workbook` Excel API does not support personal OneDrive accounts — file upload works for free, live cell editing requires M365 Business.)*

---

## MVP 3 (Future / Brainstorming): Gamification & Encrypted Google Drive DB Backup

**Goal:** Layer gamification on top of savings goals and add encrypted, cross-device database backup to Google Drive (exact design TBD).

- **Achievements & Milestones:** Unlock badges, streaks, and milestone celebrations as savings targets and financial milestones are reached.
- **Encrypted SQLite Backup to Google Drive (Free, $0 API fees):**
  - Snapshot `nz_money_manager.db` safely (`VACUUM INTO`), encrypt on-device with **AES-256-GCM** (via `expo-crypto`) using a user-chosen backup passphrase/recovery key so it can be restored on a new phone, and upload to Google Drive's hidden `appDataFolder` (`drive.appdata` non-sensitive scope — no CASA audit).
