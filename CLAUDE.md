# Andino Support — Coding Standards

## 1. Architecture & Directory Strategy (Feature-Sliced)

- **Feature-Based**: Complex logic lives in `src/features/[feature-name]/` with components, hooks, and types co-located.
- **UI Primitives**: Reusable components (Button, Input, Dialog) live in `src/components/ui/` (shadcn/ui).
- **Service Layer**: Raw API calls in `src/lib/*-api.ts`. Business logic + Zod validation in `src/services/*-service.ts`. No raw fetch/axios in UI components.
- **Path Aliases**: Always use `@/*` for imports. Zero relative `../` imports.
- **Barrel Exports**: Use `index.ts` for clean module exports in `src/utils/`, `src/services/`, and feature directories.

## 2. Type Safety & Validation

- **Zero `any`**: All data must have a TypeScript interface or type. Browser API exceptions must use eslint-disable with justification.
- **Zod at Boundaries**: API responses validated with Zod `.parse()` / `.safeParse()` in the service layer before data reaches UI.
- **Zod for Forms**: Login/Register use Zod schemas for validation. Feature-specific schemas live in `src/features/*/schemas.ts`.
- **Type Inference**: Feature types derived from Zod schemas: `type User = z.infer<typeof UserSchema>`. Global types live in `src/types/index.ts`.

## 3. State Management

- **Server State**: React Query for all remote data. Stale times configured per feature.
- **Client State**: React Context for auth, theme, and chat session state. All three are low-frequency updates.
- **Separation**: Do not store API responses in Context; keep them in the React Query cache.

## 4. Quality Gates

- **Unit Testing**: Vitest. Utilities and hooks should have `.test.ts` files.
- **Linting**: ESLint + Prettier. Minimize eslint-disable comments (justify each one).
- **Formatting**: Prettier with project `.prettierrc`. Run `pnpm format` before commits.

## 5. Component & Styling Standards

- **200-Line Guideline**: Files exceeding 200 lines should be split. Exception: ChatContext (314 lines) is justified as cohesive feature state.
- **Conditional Classes**: Prefer `cn()` utility (clsx + tailwind-merge) for conditional classes. Template literals acceptable for simple cases.
- **Logic Extraction**: Move complex logic into custom hooks (`src/features/*/hooks/`) or `src/utils/`.
- **Error Boundaries**: Every route wrapped with `<ErrorBoundary>` + retry pattern.

## 6. Scalability & Performance

- **Error UX**: ErrorBoundary on every route. Pages with data fetching include inline retry buttons.
- **Memoization**: Use `useMemo` and `useCallback` for expensive list renders and stable callback references.

---

## Roadmap (Not Yet Implemented)

These items are planned but not built. Do not assume they exist in the codebase.

- [ ] **Zustand for Auth** — Migrate AuthContext to Zustand with persist middleware
- [ ] **80% Test Coverage** — Unit tests for services, hooks, and components
- [ ] **Playwright E2E** — Critical path tests (Login, Chat, Admin flows)
- [ ] **Full cn() Migration** — Replace all template literal ternaries with cn() utility
