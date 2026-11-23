# Workspace Rules & Coding Guidelines

## TypeScript, Zod & Function Rules

- **Prefer arrow functions with explicit input parameter types and explicit return types** over standard `function` declarations (`const myFn = (input: InputType): ReturnType => { ... }`).
- **Keep comments minimal**: Rely on descriptive function/variable names, explicit parameter types, and explicit return types to document intent rather than adding JSDoc blocks or explanatory comments.
- Define all shared interfaces, types, and Zod schemas in the `types/` directory.
- **Use the official `akahu` SDK (pinned with a tilde `~`) for all Akahu API calls and Akahu-owned models** (`Account`, `User`, `Transaction`, `PendingTransaction`, `ConnectionInfo`). Do not duplicate or maintain manual Zod schemas for Akahu's external API responses.
- **Reserve Zod (`zod`) and `.transform()` for our own boundaries**:
  1. **User Input / Output**: Validating and sanitizing user-entered tokens (`AkahuPersonalTokensTransformSchema`), clipboard strings (`AkahuClipboardTextTransformSchema`), and 6-digit PINs (`SixDigitPinSchema`).
  2. **Our Local Database & Storage (`expo-sqlite` & `expo-secure-store`)**: Validating data before inserting into SQLite (`BankAccountSchema`, `BankConnectionUpsertInputSchema`) and transforming SQLite rows (`snake_case` -> `camelCase`) or persisted profiles on read (`BankAccountDbRowTransformSchema`, `createBankConnectionDbRowTransformSchema`, `StoredUserProfileSchema`).
  3. **Our Own APIs**: Any custom API payloads owned by this project.
- **Use TypeScript Discriminated Unions** for internal app state and action results (`AkahuConnectResult`, `AkahuConnectionStatus`, `BiometricAuthResult`, `PinFlowState`).

## React & State Management Rules

- **Prefer TanStack Query (`useQuery`, `useMutation`) over `useEffect`, `useState`, and `useRef`** for all asynchronous data fetching, device storage reads/writes (`expo-secure-store`), and side-effect synchronization.
- **No `useEffect` for data loading or syncing state**: Never fetch data or load storage inside `useEffect` and copy it into `useState`. Wrap async reads in a `useQuery` hook and async writes/actions in a `useMutation` hook (invalidating queries via `queryClient.invalidateQueries`).
- **Derive state instead of storing duplicate `useState`**: Compute booleans, masked strings, totals, and filtered lists directly during render from `useQuery` data or Zustand store selectors rather than synchronizing them with `useEffect` or `useRef`.
- **Minimal `useState`**: Only use `useState` for ephemeral, unpersisted UI form drafts when not covered by TanStack Query state (`isPending`, `isError`, `data`) or Zustand.
