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

## UI component library (MANDATORY — reuse, never redesign)

Everything below is a **library**. Any new page or experience must be assembled from these primitives and patterns exactly as the existing pages use them, so it comes out right the first time. Canonical references: the **projects table** (`projects-list-page.tsx`, the richest example), the **detailed properties table** (`all-properties-page.tsx`), the **data grid in `testing-playground.tsx`** (nested/grouped rows), and the **project details page** (`projects-page.tsx` + `project-header.tsx`). Copy from these — do not invent new variants.

### Tables (`components/table-kit.tsx` primitives)

- **Structure**: toolbar above the card, then `TableCard` → `TableCardHeader` → scrollable `<table>` (`COL_SEP` column separators) → `TableFooter` (page-size select + pagination; 10/page tables, 12 grids; per-group paging via `GroupPager`).
- **Header**: title + blue count chip (`bg-blue-100 text-blue-700 border border-blue-200 text-xs px-2`); secondary counts (e.g. Phases) via the `extra` slot; CTAs right-aligned in the `cta` slot — one solid primary button, others `variant="outline"`, all `h-8 gap-1.5` with an icon. When grouping is active, **Expand all / Collapse all** ghost buttons appear in the header.
- **Toolbar** (`TableToolbar`): search input, inline `FilterSelect` / `FilterMultiSelect` / `DateRangeFilter` (supports `withTime`), `sortControl` = `MultiSortControl` (multi-level sort, drag-to-reorder priority), `groupControl` = Group by dropdown, **All Filters** button → `FiltersDrawer` (same controls, same order, Apply + Clear fixed at bottom), **Columns** button → `ColumnsSheet` (drag reorder, eye show/hide, lock to freeze).
- **Sorting**: every multi-sort field is also header-click sortable, cycling asc → desc → none (single level, synced with the multi-sort control).
- **Selection**: checkbox column **frozen left** (40px, `sticky left-0`; frozen data columns offset from 40px). The **header checkbox selects the current page only**; selecting the whole result set is the bulk bar's "Select all" button. `FloatingBulkBar` + `BulkBarButton` for bulk actions; cap-limited actions guard with a toast.
- **Row actions**: a single `⋯` dropdown frozen right — **View always first**, then action groups separated by `DropdownMenuSeparator`. Never standalone icon buttons per row.
- **Grouping**: group header rows are collapsible (chevron + label + count, sticky-left content); tree mode (phases under mains) = indented tinted child rows, a sticky "N Phases and Subprojects" separator, and **numeric aggregation on the parent display row**.
- **Cascade dialogs**: actions on a main project cascade to its phases — the dialog states this, lists the phases **read-only** (`PhaseCascadeList` / read-only list with current values), shows amber note boxes for warnings (ignored phases, impacted property counts).

### Tags, IDs, timestamps

- **Tags are rectangular, never pills**: `rounded-md border px-2 py-0.5 text-xs font-medium`. Standard tones — Active/Uploaded/Added `emerald-100/700`; Hidden/Missing `red-100/700` (softer `-50` variants for Uploaded/Missing masterplans); org Nawy `emerald-100`, Partners `blue-100`; Entry Type Automatic `emerald`, Manual `blue`; value tags (district/area/category…) use the stable hash palette (`ColorTag`). Primary status: Launch green-50, On-Sale emerald-100, On-Hold orange-50, Sold-Off red-50, Archived red-100.
- IDs always via `IdTag` → caption `ID: 123` (prefixed ids like `PRJ-0001` shown as-is) with hover copy — never `ID# 123`.
- Timestamps always formatted like `10 Jan 2026, 07:00 AM` (`fmtDateTime` in projects-list-page uses UTC getters to avoid hydration mismatch).

### Details pages

- **Layout**: in-page breadcrumb (buttons, no routing) → main info container → grey `TabsList` strip (icon + label per tab, white active tab, `TabStrip` for overflow scroll) → tab content. Cards are flat: `border border-border rounded-xl bg-card`, no shadow.
- **Main info container** (see `project-header.tsx`): view-only header bar (icon square, name, level/status tags, caption row with `IdTag` + parent/developer links that `hover:underline` and open in a **new tab**, location) — collapsed by default. Right side order: **Edit** (outline) → **expand/collapse chevron** (outline icon button) → **`⋯` actions menu** (outline icon button, far right) with the same actions/order as the table rows. Expanding shows a 4-per-row field grid; Edit turns grid fields into inputs with Save/Cancel + validation (mandatory names, positive-number checks, red borders + toast). **Statuses that have dedicated actions (listing/primary/entry) are never editable inline** — they render as tags even in edit mode; derived fields (coordinates/polygon presence, auto rank, created/updated) are view-only.
- **Cards/grids pages** (masterplans, floor plans, render images): flat bordered cards, ID above title, view icon top-right, page number bottom-right, status tag top-right; clicking the image opens a full-screen viewer.
- **Side drawers** (Sheet): white header with title + ID, scrollable body, footer actions; prev/next arrows + `X/Y` counter when stepping through a list; shift-click range selection + `FloatingBulkBar` where bulk review applies.
- **Selection pickers**: project dropdowns use the shared `ProjectTreeSelect` (nested phases, ids, statuses); dependent dropdowns (Category → Type → Subtype) reset children on parent change.
