# Stack Research

**Domain:** Social real-time study tracking web app (Strava for studying)
**Researched:** 2026-03-06
**Confidence:** MEDIUM (training data Aug 2025; WebSearch/WebFetch unavailable during research — critical claims flagged)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (App Router) | Full-stack web framework | App Router is stable as of 15.0; RSC + streaming SSR pairs naturally with Supabase subscriptions; built-in API routes eliminate need for separate Express server; Vercel deployment is zero-config |
| Supabase | latest (JS SDK v2.x) | Auth + Postgres DB + Realtime | Single BaaS handles auth (email + OAuth), Postgres with row-level security, and WebSocket-based Realtime channels — avoids running 3 separate services; generous free tier validates well before cost |
| Supabase Realtime | Built into Supabase | Live presence + activity broadcasting | Postgres-native Realtime via Broadcast and Presence channels — see Real-Time Decision section for detailed analysis |
| TypeScript | 5.x | Type safety throughout | Non-negotiable for a real-time app; type errors in subscription payloads are hard to debug at runtime |
| Tailwind CSS | 3.x (or 4.x beta) | Utility-first styling | Standard for Next.js projects; excellent DX for the design-system-adjacent work shadcn/ui requires |

### UI & Animation Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| shadcn/ui | latest (not versioned, copy-paste) | Base component system | Not a package dependency — components live in your repo, fully customizable; Notion-style clean defaults; uses Radix UI primitives for accessibility; pairs perfectly with Tailwind |
| Framer Motion | 11.x | Animations and transitions | The standard for React animation; spring physics, layout animations, gesture handling, and exit animations all native; required for the Apple-style interaction quality the design spec demands |
| Radix UI | 1.x (via shadcn/ui) | Accessible headless primitives | Already included via shadcn/ui; mention explicitly because you'll reach for Dialog, Dropdown, Tooltip, etc. directly |
| Lucide React | 0.4x+ | Icons | Consistent, tree-shakeable, pairs with shadcn/ui by default |

### State Management

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Zustand | 4.x | Client-side timer + UI state | For a real-time timer that broadcasts live, you need a client-side store that the Supabase channel can write into and the UI reads from; Zustand is minimal, no boilerplate, works without context providers |
| TanStack Query (React Query) | 5.x | Server state + feed data | For the activity feed, user profiles, session history — stale-while-revalidate pattern handles social feed well; pairs with Next.js App Router; version 5 removed many footguns |

### Database & Auth

| Technology | Purpose | Notes |
|------------|---------|-------|
| Supabase Postgres | Primary DB | Row-Level Security is essential — enforce follow graph visibility and classroom membership at DB level, not app level |
| Supabase Auth | Email + Google OAuth | Use `@supabase/ssr` package (not the deprecated `auth-helpers`) for App Router; handles session cookies server-side correctly |
| Supabase Storage | Profile photos, assets | Included in Supabase; no separate S3 setup needed for v1 |

### Analytics & Monitoring

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PostHog | latest (JS SDK) | Product analytics + session replay | Self-hostable, has a generous free cloud tier; captures funnel drop-offs, feature usage; important for validating social loop metrics after launch |
| Vercel Analytics | Built-in | Core Web Vitals monitoring | Free on Vercel; add from day 1 — real-time performance matters for the live-timer feel |
| Sentry | 8.x | Error tracking | Catch Supabase subscription drops, unhandled promise rejections in timer code |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Prettier | Code formatting | No debate on style — configure once, forget |
| ESLint | Linting | Use `eslint-config-next` which is bundled; add `@typescript-eslint` rules |
| Husky + lint-staged | Pre-commit hooks | Enforce formatting before commits land |
| Supabase CLI | Local dev, migrations, type gen | `supabase gen types typescript` generates DB types — eliminates manual type writing for all Postgres tables |

---

## The Real-Time Decision: Supabase vs Alternatives

This is the most critical stack decision. The core feature (live timer visible to followers) lives or dies on this choice.

### What the App Needs From Real-Time

1. **Presence channels** — broadcast who is currently studying (online/offline/active-with-timer)
2. **Timer state broadcast** — when a user starts/pauses/stops a timer, followers see it within 2s
3. **Activity feed push** — new session events push to feed without polling
4. **Classroom rooms** — small group channels (likely <50 members) see each other live
5. **Scale at launch** — probably 10–500 concurrent users initially; must not break at 5K

### Supabase Realtime: What It Provides

Supabase Realtime has three channel types (as of mid-2025):

- **Broadcast** — ephemeral pub/sub, client-to-client via Supabase relay, sub-100ms typical latency, no persistence
- **Presence** — built on CRDT-like presence tracking; each client maintains a presence state synced to the channel; perfect for "who is online" lists
- **Postgres Changes** — DB-change subscriptions via logical replication; slower than Broadcast (goes through WAL), typically 200–800ms

**For this app:**
- Timer start/stop/pause → use **Broadcast** (ephemeral, fast, no need to persist the raw event)
- "Who is studying now" → use **Presence** (exactly what it's designed for)
- New session saved to DB → use **Postgres Changes** (feed updates when a session is committed)

**Confidence:** MEDIUM — Supabase Realtime architecture is from official docs knowledge (pre-Aug 2025); channel limits and exact latency SLAs should be verified at supabase.com/docs/guides/realtime before finalizing.

### Known Supabase Realtime Limitations (verify before committing)

- **Connection limits** are tied to plan: Free plan has ~200 concurrent Realtime connections; Pro plan higher. This is a hard ceiling, not a soft one. At 500 concurrent users all with open Realtime connections, you'll hit Free tier limits.
- **Presence channel size** — large presence channels (>100 clients in one channel) have performance degradation. For classrooms, this is fine; for a global "who is studying" feed with 500+ users, you'd want to shard or use a different approach.
- **No guaranteed delivery** — Broadcast is fire-and-forget. If a client is briefly disconnected, they miss events. For timers, this is acceptable (reconnect and sync state from DB). For mission-critical events, use Postgres Changes instead.
- **Realtime on Vercel Edge** — Supabase Realtime WebSocket connections do NOT work from Vercel Edge Functions (stateless, can't hold WebSocket). They work fine in the browser (client-side) and in Node.js server environments.

**Confidence:** MEDIUM-LOW — these limitations were documented behavior as of mid-2025. Connection limit numbers should be verified at current Supabase pricing page.

### Alternatives Verdict

| Alternative | Verdict | When to Choose It Instead |
|-------------|---------|--------------------------|
| **Pusher (Channels)** | Skip for v1 | Better DX for pure presence/pub-sub; more predictable pricing; but adds a third service when Supabase already handles it. Use if Supabase Realtime proves unreliable in production. |
| **Ably** | Skip for v1 | Enterprise-grade guaranteed delivery, message history, better scale guarantees; overkill and expensive for a student app at launch |
| **Socket.io** | Do not use | Requires running your own server (no serverless support); operational burden is too high for a solo dev; stateful servers conflict with Vercel deployment |
| **Liveblocks** | Skip for v1 | Excellent for collaborative docs/cursors; this app doesn't need operational transforms or CRDT conflict resolution — it needs simple broadcast |
| **PartyKit** | Interesting but skip | Built on Cloudflare Durable Objects; legitimately great for real-time rooms; but adds another service and the ecosystem is younger than Supabase |

**Decision: Use Supabase Realtime.** The BaaS integration (single auth/DB/RT service), zero additional infrastructure, and correct feature set (Broadcast + Presence covers both timer broadcasting and "who's online") make it the right choice for a solo-dev v1. The key mitigation: upgrade to Supabase Pro ($25/mo) before any public launch to lift connection limits.

**Confidence:** MEDIUM — recommendation is sound based on documented capabilities, but verify current connection limits and latency benchmarks before building the real-time layer.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | 0.5.x+ | Server-side auth in App Router | Use this instead of deprecated `@supabase/auth-helpers-nextjs`; handles cookie-based sessions correctly in RSC, Server Actions, and middleware |
| `date-fns` | 3.x | Date formatting/manipulation | Study session durations, streak calculations, relative timestamps on feed; lighter than moment.js, tree-shakeable |
| `recharts` or `victory` | recharts 2.x | Study analytics visualizations | Course heatmaps, weekly summaries, activity rings; recharts is React-native (no D3 dependency), good defaults |
| `react-hot-toast` or `sonner` | sonner 1.x | Toast notifications | Session complete, follower joined, etc.; sonner is the modern choice — Expo-inspired, better animations than react-hot-toast |
| `nuqs` | 1.x | URL search param state | For feed filters, date range selectors — keeps shareable URLs without useState headaches |
| `zod` | 3.x | Schema validation | Validate form inputs, API route bodies, Supabase payload shapes; pairs with react-hook-form |
| `react-hook-form` | 7.x | Form state management | Auth forms, profile setup, session logging forms |
| `clsx` + `tailwind-merge` (via `cn`) | — | Conditional class merging | shadcn/ui installs this already; use everywhere for conditional Tailwind classes |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Supabase | Firebase / Firestore | If you need mobile SDK first, or offline-first sync; Firebase Realtime Database has better offline guarantees but worse SQL query capability |
| Supabase | PlanetScale + Auth0 + Pusher | Better separation of concerns at scale; worse DX for a solo dev; revisit at 10K+ users if Supabase limits bite |
| Next.js 15 (App Router) | Next.js 14 (Pages Router) | Only if you have an existing Pages Router codebase; greenfield should use App Router |
| Zustand | Redux Toolkit | Redux is overkill; the timer + presence state is simple enough that Zustand's store-per-feature model is cleaner |
| TanStack Query v5 | SWR | SWR is simpler but TanStack Query v5 has better devtools, invalidation granularity, and offline support; the activity feed needs sophisticated cache invalidation |
| Framer Motion | React Spring | Both are excellent; Framer Motion wins for layout animations (reorder) and has better documentation; Apple-style spring physics are both available |
| shadcn/ui | Chakra UI / MUI | shadcn/ui is not a dependency — components live in your repo, zero bundle impact from unused components; Chakra/MUI lock you into their design system |
| Recharts | D3 directly | D3 has a steep learning curve and no React abstractions; Recharts covers all needed chart types (area, bar, radial) without D3 imperative API |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated as of 2024; does not support App Router Server Components correctly | `@supabase/ssr` |
| Socket.io | Requires stateful server — incompatible with Vercel serverless/edge deployment; solo dev cannot maintain a WebSocket server | Supabase Realtime |
| Redux / Redux Toolkit | Massive boilerplate for a timer + presence use case; mental overhead outweighs benefit | Zustand |
| Prisma | Adds ORM abstraction layer when Supabase already generates TypeScript types from Postgres schema; doubles migration complexity | Supabase CLI + `supabase gen types` |
| NextAuth.js | Supabase Auth already provides email + OAuth; adding NextAuth creates dual session systems and auth state conflicts | Supabase Auth via `@supabase/ssr` |
| Styled Components / Emotion | CSS-in-JS with runtime overhead; conflicts with RSC (server components cannot have runtime CSS-in-JS); Tailwind is the correct choice for Next.js App Router | Tailwind CSS |
| Vercel Edge Runtime for Supabase operations | Supabase client uses Node.js APIs not available in Edge runtime; causes cryptic runtime errors | Node.js runtime (default) for Supabase API routes |
| Global Realtime Presence channel | Single "everyone online" Presence channel breaks at >200 concurrent users due to Supabase Free tier connection limits | Shard by classroom + use activity feed for global visibility |

---

## Stack Patterns by Context

**If building the real-time timer first (recommended MVP path):**
- Use Supabase Broadcast channel named `timer:[user_id]` — clients subscribe to specific user channels
- Timer state (start time, course, current duration) lives in Zustand store client-side
- On broadcast receive → update Zustand store → UI reactively renders
- On session complete → write to Postgres → Postgres Changes triggers feed update

**If building the social feed first:**
- Use TanStack Query with polling as fallback while Realtime is not yet set up
- Replace polling with Postgres Changes subscription in a later phase
- Avoid building dependency on Realtime before auth + DB schema is stable

**If Supabase Realtime connection limits become a problem:**
- Upgrade to Supabase Pro (first step, $25/mo)
- Add Pusher as a Broadcast-only layer (Supabase stays for auth + DB); this is a drop-in swap since the channel subscription API is similar
- Do NOT switch to Socket.io — the serverless constraint is permanent

**For the classroom group rooms:**
- Use Supabase Presence on channel `classroom:[classroom_id]`
- Presence state payload: `{ user_id, display_name, avatar_url, timer_state: 'idle' | 'studying', course: string | null, elapsed_seconds: number }`
- Each member's client updates their own presence; Supabase Presence syncs the full room state to all members
- Max classroom size before degradation: stay under 50 members per channel for reliable presence

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15.x | React 19.x | Next.js 15 requires React 19; this is a breaking change from Next.js 14 + React 18 |
| Framer Motion 11.x | React 18 + React 19 | Framer Motion 11 supports both; verify `motion` import (new API) vs `motion` from older API |
| `@supabase/ssr` 0.5.x | Next.js 14 + 15 | Works with both; specifically tested with App Router middleware |
| Tailwind CSS 3.x | PostCSS | Tailwind 4 is in beta/RC as of early 2025 — avoid for production until stable |
| TanStack Query 5.x | React 18 + 19 | v5 dropped class components; v5 has async adapter for RSC |
| shadcn/ui (latest) | Next.js 15 + Tailwind 3 | shadcn/ui components target Tailwind 3; if you use Tailwind 4, some utility classes may differ |

**Confidence for versions:** MEDIUM — React 19 / Next.js 15 compatibility was the major story as of Aug 2025. Verify exact peer dependency trees with `npm install` before committing to any version. In particular, confirm Framer Motion 11 peer dep requirements.

---

## Installation

```bash
# Bootstrap Next.js 15 with TypeScript + Tailwind + App Router
npx create-next-app@latest stuudy --typescript --tailwind --app --src-dir --import-alias "@/*"

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# State management
npm install zustand @tanstack/react-query

# UI & Animation
npm install framer-motion lucide-react sonner

# Form + validation
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install date-fns clsx tailwind-merge nuqs

# Analytics / charts
npm install recharts

# Shadcn/ui — install via CLI (not npm), installs per component
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label dialog dropdown-menu avatar badge separator skeleton tabs tooltip

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom typescript eslint prettier husky lint-staged

# Supabase CLI (for local dev + type generation)
npm install -D supabase
```

---

## Sources

- Supabase Realtime docs (training data, Aug 2025 cutoff) — Broadcast, Presence, Postgres Changes channel types; connection limit concerns — **MEDIUM confidence**
- Next.js 15 release (training data) — App Router stability, React 19 requirement — **MEDIUM confidence**
- `@supabase/ssr` package (training data) — replacement for deprecated auth-helpers — **MEDIUM confidence**
- Framer Motion 11 docs (training data) — React 19 support, layout animations — **MEDIUM confidence**
- shadcn/ui official pattern (training data) — copy-paste component model, Radix primitives — **HIGH confidence** (stable pattern since 2023)
- TanStack Query v5 (training data) — stale-while-revalidate, RSC adapter — **MEDIUM confidence**
- Tailwind CSS 4 status (training data) — beta as of Aug 2025, avoid for production — **LOW confidence**, verify current status

**IMPORTANT — Verify Before Building:**
1. Supabase Realtime connection limits by plan tier (critical for launch planning)
2. Supabase Realtime Presence channel performance at 50+ concurrent members
3. Tailwind CSS 4 production stability (it may be stable by now — check tailwindcss.com)
4. Next.js 15 exact React 19 peer dep requirement (confirm with `npm info next peerDependencies`)
5. `@supabase/ssr` current version and changelog for any App Router middleware changes

---

*Stack research for: Stuudy — social real-time study tracking web app*
*Researched: 2026-03-06*
*Note: WebSearch and WebFetch tools were unavailable during this research session. All claims are from training data (cutoff Aug 2025). Verify flagged items with official docs before implementation.*
