1. Architecture & Directory Strategy (Feature-Sliced)
Feature-Based: Complex logic must live in src/features/[feature-name].

UI Primitives: Reusable components (Buttons, Inputs) live in src/components/ui.

Service Layer: All API communication MUST be abstracted into src/services/api-client.ts. No raw fetch in UI components.

Path Aliases: Always use @/* for imports. Zero relative ../ imports.

2. Type Safety & Validation (Strict)
Zero 'any': All data must have a TypeScript interface or type.

Schema-First: Use Zod for form validation and API response shapes.

Inference: Derive types from schemas: type User = z.infer<typeof UserSchema>.

3. State Management
Server State: React Query for all remote data (5m stale time).

Client State: Zustand for global UI/Auth. Context only for low-frequency updates.

Separation: Do not store API responses in Zustand; keep them in the React Query cache.

4. Quality Gates (Testing & Lint)
Unit Testing: Vitest. Every utility/hook must have a .test.ts file.

E2E Testing: Playwright for critical paths (Login, Chat, Payment).

Coverage: Minimum 80% statement coverage.

Linting: ESLint + Prettier. No warnings or "ignore" comments allowed.

5. Component & Styling Standards
200-Line Limit: Files exceeding 200 lines MUST be split into sub-components.

Conditional Classes: Always use the cn() utility (clsx + tailwind-merge).

Logic Extraction: Move complex logic into custom hooks or src/utils.

6. Scalability & Performance
Error UX: Every feature must have an ErrorBoundary and a "Retry" pattern.

Memoization: Use useMemo and useCallback for expensive list renders.

Barrels: Use index.ts files for clean module exports.