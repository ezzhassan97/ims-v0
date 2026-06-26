# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

Production is hosted on Vercel at **https://ims-nawy.vercel.app**.

- Vercel project: **`ims`** — project ID `prj_ELl78nAdrrPf0tQ69zGc0USsgfT1` (team `ezzhassan97-gmailcoms-projects`). It owns the `ims-nawy.vercel.app` domain.
- Single GitHub remote: **`origin` → `https://github.com/ezzhassan97/ims-v0` (branch `main`)**, under the `ezzhassan97` GitHub account. Vercel auto-deploys on every push to this repo's `main`.
- To ship: commit, then **`git push origin main`**. The push triggers the production build; the new deployment auto-claims `ims-nawy.vercel.app`.
- Requires the `ezzhassan97` GitHub account to be active (`gh auth switch --user ezzhassan97`).
- Do **not** create a separate `ims-nawy` Vercel project or `vercel alias` the domain manually — the domain belongs to the `ims` project and is reclaimed on each git deploy.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
```

There is no test suite. The dev server logs to `dev-server.out.log` / `dev-server.err.log`.

## Architecture

This is an **internal IMS (Inventory Management System) admin UI** for Nawy (real estate), scaffolded with [v0.app](https://v0.app) on **Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui** ("new-york" style, Radix primitives in `components/ui/`).

**Critical pattern — there is no real routing.** Despite being App Router, the entire app is a single route (`app/page.tsx` → `<AppShell />`). Navigation is **client-side state**, not URL-based:

- `components/app-shell.tsx` holds `activePage` state and a `switch` statement (`renderContent()`) that maps a page label string to a top-level page component. Adding a page means: add a `case` here, import the component, and add a sidebar entry.
- `components/sidebar.tsx` defines the nav tree (`navItems`) and calls `onPageChange(label)` to set `activePage`. Many sidebar labels have **no matching case** and fall through to `<ComingSoon>` — these are stubs, not bugs.
- Drill-down views (e.g. grouped property details) are handled by separate state in `AppShell` (`groupDetail`), overriding `activePage` rendering — not by navigation.

So: page label strings in `sidebar.tsx`, `app-shell.tsx`, and the page components must stay in sync. There is no `app/<route>/` directory structure to rely on.

**Data is entirely mocked.** No backend, no API routes, no database. Mock data and the domain type definitions live in `lib/`:
- `lib/mock-data.tsx` — core domain types (`Building`, `Unit`, `Amenity`, `SplittingRule`, etc.) and seed data.
- `lib/sold-units-mock.ts`, `lib/whatsapp-media-mock.ts` — feature-specific mocks.

When adding features, follow the existing convention: define the interface + mock array in a `lib/*-mock.ts(x)` file and import into the page component. State is local `useState`; there is no global store.

**Component organization:** `components/` is flat. Each top-level page is a `*-page.tsx` file; supporting pieces (modals, drawers, lists, maps) sit alongside. `components/ui/` is the shadcn primitive layer — don't hand-edit these unless intentionally customizing a primitive. Aliases (`@/components`, `@/lib`, `@/hooks`, `@/components/ui`) are defined in `components.json` and `tsconfig.json` (`@/*` → repo root).

## Conventions & gotchas

- **`next.config.mjs` sets `typescript.ignoreBuildErrors: true`** — builds pass even with type errors. Don't assume a green build means type-safe; run against the editor/`tsc` if type correctness matters.
- `images.unoptimized: true` — plain `<img>`-style behavior; no Next image optimization.
- Page components needing interactivity must start with `"use client"` (the shell and all pages are client components).
- Styling is Tailwind v4 (config-less, via `app/globals.css` + `@tailwindcss/postcss`). Use the `cn()` helper from `lib/utils.ts` for conditional classes. Icons come from `lucide-react`.
- Toasts: `sonner` and the shadcn `use-toast` hook both exist (`hooks/use-toast.ts`).
