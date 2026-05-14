# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal fitness PWA (FR locale) for tracking custom strength programs (PPL_3 / UL_4 / PPL_UL_5 / PPL_6), daily nutrition, weight, body measurements, and gamified habit metrics. **Multi-user** with invite-code signup, session cookies, and `requireUser()` scoping on every read/write. Each user has one active `UserProgram` (generated from the Helms pyramid via `lib/programGenerator.ts`) holding their `UserExercise[]`.

The repo root sits at `sport-suivi/`; the Next.js `app/` directory is the default working directory shown in the shell, but lib/components/prisma all live one level up. Always reference files from the repo root (e.g. `lib/macros.ts`, not `../lib/macros.ts`).

## Stack

- **Next.js 14.2** App Router, server components by default, `"use client"` only where needed for interactivity
- **Prisma 5** + **PostgreSQL** (Neon serverless in prod; local at `localhost:5433` per README)
- **Tailwind 3.4** with a custom dark palette (`bg`, `surface`, `surface2`, `border`, `text`, `muted`, `accent`, `success`, `warning`, `danger`) — see `tailwind.config.ts`. No CSS-in-JS, no component library.
- **Recharts** for charts, **Zod** for API input validation
- **PWA**: custom `public/sw.js` (network-first, `/api/*` bypasses cache) + `app/manifest.ts` + `components/PWAClient.tsx`. SW is registered in production only to avoid hot-reload churn.
- TS path alias `@/*` → repo root (see `tsconfig.json`)

## Commands

```bash
npm run dev          # Next dev server → http://localhost:3000
npm run build        # Wipes node_modules/.prisma, regenerates client, then next build
npm run lint         # next lint
npm run db:push      # prisma db push — sync schema to DB without migrations
npm run db:seed      # tsx prisma/seed.ts — seeds exercises + foods + meal plan
npm run db:studio    # Prisma Studio GUI
```

No test runner is configured — there are no tests in this repo.

### Required env

`DATABASE_URL` must be set in `.env` (Postgres connection string). Without it Prisma/Next will fail to start.

## Architecture invariants

### Data model

The Prisma schema (`prisma/schema.prisma`) has four loosely-coupled domains. All tables (except `ExerciseCatalog` and `Food` which are shared catalogs) are scoped by `userId` with `onDelete: Cascade`:

1. **Auth** — `User` → `AuthSession` (cookie token id, 30d TTL) + `InviteCode` (consumed at signup). `lib/auth.ts` exposes `getCurrentUser`, `requireUser`, `requireAdmin`. Middleware (`middleware.ts`) gates everything via cookie presence; the Server Component layout handles the "already logged-in" redirect because Edge runtime can't query the DB.
2. **Training** — `ExerciseCatalog` (shared, seeded ~54 exos) is the reference for the generator. `UserProgram` (one active per user) carries the `split: SplitType`, `daysLabels` (JSON array), and N `UserExercise` rows. `WorkoutSession` → `WorkoutSet → UserExercise` (FK enforced). `UserExercise.archived` keeps history readable while filtering out of the active program. `WorkoutSet → WorkoutSession` cascades on delete; `WorkoutSet → UserExercise` doesn't.
3. **Nutrition** — One `MealPlan{isBase:true}` per user holds many `Meal` rows, several per `MealSlot` (BREAKFAST / LUNCH / DINNER). The active variant per slot is stored in `UserMealPreference` (`@@unique([userId, slot])`). Eaten meals are logged in `MealConsumption` with a unique `(userId, date, slot)` constraint.
4. **Daily/body** — `DailyLog` (one row per `(userId, UTC midnight date)`), `WeightLog`, `BodyMeasurement`. No FKs into training/nutrition.

### Calculation > storage

Derived metrics are **never persisted**. The codebase consistently recomputes from raw data:

- Streak, daily quests, PRs → `lib/gamification.ts`
- e1RM (Epley `w × (1 + r/30)`), all-time bests, plateau detection, progression series → `lib/progression.ts`
- Weekly volume per muscle group → `lib/muscleGroups.ts` (sums `UserExercise.primaryMuscle` + CSV `secondaryMuscles` enum; no string parsing)
- Program generation (split → exos with prescription, derived from priorities) → `lib/programGenerator.ts` + `lib/exerciseCatalog.ts`
- Strength tier (Big 4 ratios), 1RM% tables, plate calculator → `lib/lifting.ts`
- Macro targets + meal plan rescaling → `lib/macros.ts` (Helms/Schoenfeld/Aragon, see README for goal-specific multipliers)
- Achievements (24, in 5 categories) → `lib/achievements.ts`
- Body fat (US Navy formula) → `lib/bodyComp.ts`

When adding a new "stat", add a pure helper in `lib/` rather than a schema column. The exception is `bodyFatPct` (manual input — impedance/DEXA values the user types in).

### Prisma client

Use the singleton from `lib/prisma.ts` (`import { prisma } from "@/lib/prisma"`). It memoizes on `globalThis` in dev to survive Next hot reload. Do not instantiate `new PrismaClient()` in app code (only in `prisma/seed.ts`).

### API routes

Pattern: `app/api/<resource>/route.ts` (and `[id]/route.ts` for item ops). All write endpoints validate with Zod and return `{ error: ... }` with status 400 on parse failure — copy that pattern when adding new ones. See `app/api/workouts/route.ts` for the canonical example. Pages mostly fetch directly via `prisma` server-side; APIs are for client-driven mutations + the CSV export under `/api/export/[type]`.

### Server vs client components

Pages (`app/<route>/page.tsx`) are server components that fetch with Prisma and pass plain data to client subcomponents (named `XxxClient.tsx` or `XxxForm.tsx`, marked `"use client"`). Use `export const dynamic = "force-dynamic"` on pages that read fresh state on each request (the dashboard at `app/page.tsx` is the model). Optimistic UI patterns (toggle "mangé", shopping list checkboxes, variant selector) all use `router.refresh()` after the mutation.

### Dates

- DB stores dates as `DateTime`. For day-bucketed records (`DailyLog`, `MealConsumption`), the convention is **UTC midnight** of the calendar day.
- Client-side "today" computation uses `localYmd(date)` from `lib/gamification.ts` (`YYYY-MM-DD` in local TZ) — avoids the off-by-one when the user's clock vs UTC disagrees.
- When adding new daily-bucketed data, follow the same `setUTCHours(0,0,0,0)` pattern (see `app/page.tsx:42` for `todayConsumed`).

### Layout & navigation

`app/layout.tsx` renders a minimal sticky header (logo only) and a fixed `NavLinks` bottom tab bar (4 primary tabs + "Plus" → bottom sheet for 7 secondary routes). Anything `fixed` near the bottom (rest timer, install prompt, "Terminer la séance" button) must clear the nav — existing code uses `bottom-24` / `bottom-44`. Both header and nav use `env(safe-area-inset-*)` for iOS notch/home-indicator. Don't reintroduce a top hamburger — the iPhone tap-target bug was the reason the bottom bar exists.

### Seeding model

`prisma/seed.ts` upserts the shared `ExerciseCatalog` (from `lib/exerciseCatalog.ts`) and the shared `Food` catalog. **No per-user data is touched by seed.** A user's program lives in `UserProgram` + `UserExercise` and is generated via `/api/program/generate` (or the legacy migration script `prisma/migrate-to-programs.ts` for the initial frakzi import). Exercise renames in the catalog don't break history because `UserExercise` snapshots the name at generation time.

## Workflow (mandatory)

### Auto-commit and auto-push (don't ask)

After completing a coherent unit of work (feature, fix, refactor), commit and push **without asking the user**. The user has authorized this as a durable instruction. Apply the workflow:

1. `npx tsc --noEmit` — must exit 0
2. Smoke-test the affected routes against `npm run dev` (already running in background)
3. `git add` the specific files (never `git add .` — avoids staging stray `app/.claude/` etc.)
4. `git commit` — split into multiple logical commits if the work spans distinct features (match the `feat:` / `chore:` / `fix:` prefixes used in the existing log)
5. `git push origin main`

Don't ask "should I commit?" or "ready to push?". Just do it after the test gate passes. If the test gate fails, stop and report — don't push broken code.

**Still confirm before**: force-pushing, rewriting published history, deleting branches, anything destructive. The auto-push authorization is for normal forward-progress commits only.

### Test before pushing to git

There's no test suite, so "test" means: at minimum run `npx tsc --noEmit` and `curl` the affected routes against `npm run dev`. For UI changes, also verify in a browser that the feature works end-to-end. If a test can't be done (e.g. iOS-specific behavior), say so explicitly rather than skipping.

The order is always: edit → `tsc --noEmit` → dev-server smoke test → commit → push.

### Database changes

When a change touches `prisma/schema.prisma`, the DB is out of sync until you run **both** of these:

1. `npm run db:push` — applies the schema diff to the running Postgres (Neon). Add `--accept-data-loss` only when the user has explicitly authorized dropping data (eg. removing a deprecated column with existing rows).
2. `npm run db:seed` — re-runs the seed if the change involves new reference data (foods, exercise catalog, base meal plan) that the app expects on first boot

Rule of thumb: schema-only change (new column, new enum value) → just `db:push`. Schema change that adds new reference data (foods/catalog/meals) → `db:push` then `db:seed`. The seed is fully idempotent (upsert by name) and **only touches shared catalogs**, never per-user data.

Run these immediately after the schema edit, before the rest of the implementation, so the Prisma client types match what the code expects.

## Conventions

- UI text is in **French**. Mirror existing tone (concise, lowercase labels, emoji headers like "🔥 Streak").
- Money/units: kg with 0.5 precision; ml for water; pas (steps) as integers. Rounding helpers for the meal plan rescale live in `lib/macros.ts` (5 g solids, 10 ml liquids, half-piece for unit foods).
- Imports use `@/...` alias. No relative `../../` chains.
- New pages: add a server `page.tsx` that fetches via `prisma`, delegate interactivity to a colocated client component. If the page should appear in nav, edit `components/NavLinks.tsx` (primary tabs vs. secondary sheet list).

## Reference docs in repo

- `README.md` — user-facing setup, macro tables
- `DEPLOY.md` — Vercel + Neon deployment notes
- `DEVELOPMENT_LOG.md` — chronological design decisions and feature history; useful when a feature's rationale ("why does X look like this?") isn't obvious from the code.
