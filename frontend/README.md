# Frontend

The frontend is a React 19 application built with Vite, TanStack Router, React Query, Zustand, Zod, Tailwind CSS v4, and the React Compiler Babel pipeline used in this repository.

## Purpose

This package contains the browser application for Vendor Portal. It owns:

- File-based routes and route generation
- Create and table page UIs
- Client-side state management
- API consumption through the backend services

## Entry Points

- Main bootstrap: `src/main.tsx`
- Generated route tree: `src/routeTree.gen.ts`

## Stack

- React 19
- Vite 8
- TanStack Router
- React Query
- Zustand
- Tailwind CSS v4
- Zod v4

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Type-check and build production assets |
| `pnpm preview` | Serve the built app with Vite preview on port 5173 |

## Environment Variables

The frontend expects:

```bash
VITE_API_URL=http://localhost:4000
```

That points the browser app at the HANA backend during local development.

## Local Setup

From the repository root:

```bash
pnpm install
pnpm dev:frontend
```

Open the app at:

```text
http://localhost:5173
```

## Project Structure

- `src/features/` - feature-oriented UI modules
- `src/routes/` - file-based route modules
- `src/components/` - shared UI building blocks
- `src/stores/` - Zustand stores
- `src/lib/` - shared client utilities
- `src/queries/` - React Query data access

## Build And Deploy

Production build output is emitted to `dist/`. The app is designed to be served as static assets in production, for example by IIS or another static host.

## Important Conventions

- Do not edit `src/routeTree.gen.ts` manually
- Use the `@/` alias for imports rooted at `src/`
- Keep form validation and payload shaping close to the feature module that owns it
- Preserve existing route generation and do not hand-maintain generated route state

## Troubleshooting

- If Vite cannot reach the backend, verify `VITE_API_URL`
- If routing changes do not appear, restart the dev server so the route plugin regenerates the route tree
- If build output looks stale, remove `dist/` and run `pnpm build`

