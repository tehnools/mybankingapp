---
name: state-and-data-fetching
description: >-
  Enforces using TanStack Query (useQuery, useMutation) and derived state instead of
  useState, useEffect, and useRef when writing or refactoring React Native components and hooks.
---

# State & Data Fetching Guidelines (TanStack Query over `useEffect` / `useState` / `useRef`)

Follow these rules whenever creating or modifying React Native screens, components, and hooks in this project:

## 1. Never Use `useEffect` + `useState` for Async Reads
- **Avoid**: Calling async functions (API requests, `expo-secure-store`, biometric checks) inside `useEffect` and storing the result in `useState`.
- **Instead**: Create a `useQuery` hook in `hooks/` and read `data`, `isLoading`, and `error` directly.

```tsx
// GOOD: TanStack Query
export function useAkahuStoredSettings() {
  return useQuery({
    queryKey: ["akahu", "stored-settings"],
    queryFn: async () => {
      const stored = await akahuClient.getStoredCredentials()
      const biometricEnabled = await SecurityManager.isBiometricEnabled()
      return { ...stored, biometricEnabled }
    },
  })
}
```

## 2. Use `useMutation` Instead of Manual Loading/Error `useState`
- **Avoid**: `const [isLoading, setIsLoading] = useState(false)` and `const [error, setError] = useState(null)` around async actions.
- **Instead**: Wrap writes, token verification, biometric prompts, and API mutations in `useMutation`, using `mutation.isPending`, `mutation.error`, and `queryClient.invalidateQueries` in `onSuccess`.

## 3. Derive State Instead of `useEffect` / `useRef` Synchronization
- Compute derived values (such as `isFormLocked`, `isConnected`, totals, and filtered arrays) directly in the render body from `useQuery` results rather than syncing them with `useEffect` or tracking previous values with `useRef`.
