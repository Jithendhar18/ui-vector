# BookStack RAG — Frontend

React + TypeScript chat interface for BookStack RAG Agent.

## Tech Stack

- **React 18** + TypeScript
- **Vite** — build tooling
- **Tailwind CSS** + shadcn/ui — styling and component library
- **React Query** — server state caching
- **React Router v6** — client-side routing
- **Zod** — runtime schema validation at API boundaries
- **Sonner** — toast notifications

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:8080
```

Requires the backend running on `http://localhost:8000`.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (port 8080) |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm lint` | ESLint check |
| `pnpm test` | Run Vitest |

## Project Structure

```
src/
├── components/       # Shared UI components (layout, skeletons, ui primitives)
├── contexts/         # React Context providers (Auth, Chat, Theme)
├── features/         # Feature modules (auth/, chat/)
│   ├── auth/         # Login, register forms and hooks
│   └── chat/         # Chat UI, message bubbles, session sidebar
├── lib/              # API clients (api.ts, query-api.ts, auth-api.ts, admin-api.ts)
├── pages/            # Route-level page components
├── services/         # Service layer (chat-service.ts, avatarService.ts)
├── types/            # Shared TypeScript type definitions
└── utils/            # Pure utility functions (date, text, status-colors)
```

## Architecture

- **API layer** (`lib/`) — Axios-based HTTP clients with interceptors for JWT refresh
- **Service layer** (`services/`) — Business logic, Zod validation, data mapping
- **Context layer** (`contexts/`) — Global state (auth tokens, chat sessions, theme)
- **Features** — Self-contained feature modules with components, hooks, and types

## Environment

The API base URL is configured in [src/lib/config.ts](src/lib/config.ts) and defaults to `http://localhost:8000/api/v1`.
