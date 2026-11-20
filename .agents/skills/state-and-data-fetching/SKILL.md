---
name: state-and-data-fetching
description: >-
  Enforces using TanStack Query (useQuery, useMutation), derived state, and typed arrow functions
  instead of useState, useEffect, useRef, and standard function declarations when writing or
  refactoring React Native components and hooks.
---

# Coding, State & Data Fetching Guidelines

Follow these rules whenever creating or modifying React Native screens, components, utilities, and hooks in this project:

## 1. Prefer Typed Arrow Functions Over `function` Declarations
- Always write functions and React components as `const` arrow functions with **explicit parameter types** and **explicit return types** (e.g. `: React.JSX.Element`, `: string`, `: Promise<boolean>`).
- Avoid using the `function` keyword.

```tsx
// GOOD: Arrow function with explicit input and return types
export const maskToken = (token: string, prefixLen = 12): string => {
  if (!token) return ""
  if (token.length <= prefixLen + 4) return token
  return `${token.slice(0, prefixLen)}••••••••••••${token.slice(-4)}`
}
```

## 2. Never Use `useEffect` + `useState` for Async Reads
- **Avoid**: Calling async functions (API requests, `expo-secure-store`, biometric checks) inside `useEffect` and storing the result in `useState`.
- **Instead**: Create a `useQuery` hook in `hooks/` and read `data`, `isLoading`, and `error` directly.

## 3. Use `useMutation` Instead of Manual Loading/Error `useState`
- **Avoid**: `const [isLoading, setIsLoading] = useState(false)` and `const [error, setError] = useState(null)` around async actions.
- **Instead**: Wrap writes, token verification, biometric prompts, and API mutations in `useMutation`, using `mutation.isPending`, `mutation.error`, and `queryClient.invalidateQueries` in `onSuccess`.

## 4. Derive State Instead of `useEffect` / `useRef` Synchronization
- Compute derived values (such as `isFormLocked`, `isConnected`, totals, and filtered arrays) directly in the render body from `useQuery` results or Zustand selectors rather than syncing them with `useEffect` or tracking previous values with `useRef`.
