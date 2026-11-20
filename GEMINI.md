# Workspace Rules & Coding Guidelines

## TypeScript & Function Rules
- **Prefer arrow functions with explicit input parameter types and explicit return types** over standard `function` declarations (`const myFn = (input: InputType): ReturnType => { ... }`).
- Define all shared interfaces and types in the `types/` directory.

## React & State Management Rules
- **Prefer TanStack Query (`useQuery`, `useMutation`) over `useEffect`, `useState`, and `useRef`** for all asynchronous data fetching, device storage reads/writes (`expo-secure-store`), and side-effect synchronization.
- **No `useEffect` for data loading or syncing state**: Never fetch data or load storage inside `useEffect` and copy it into `useState`. Wrap async reads in a `useQuery` hook and async writes/actions in a `useMutation` hook (invalidating queries via `queryClient.invalidateQueries`).
- **Derive state instead of storing duplicate `useState`**: Compute booleans, masked strings, totals, and filtered lists directly during render from `useQuery` data or Zustand store selectors rather than synchronizing them with `useEffect` or `useRef`.
- **Minimal `useState`**: Only use `useState` for ephemeral, unpersisted UI form drafts when not covered by TanStack Query state (`isPending`, `isError`, `data`) or Zustand.
