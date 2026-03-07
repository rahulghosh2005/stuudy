# Stuudy

## What This Is

Stuudy is a social study-tracking app — Strava for students. Students log study sessions with a live timer that broadcasts to followers and classmates in real time. It combines the motivational feedback loop of social fitness apps with academic tracking: courses, habits, GPA, and grades are shareable (publicly or privately), and group "classrooms" let cohorts of students hold each other accountable through live and historical session visibility.

## Core Value

The moment you start your study timer, your followers can see you studying live — making studying social, visible, and motivating in the same way a public run on Strava is.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create an account and set up a profile
- [ ] User can track study sessions with a live timer (per course)
- [ ] Live timer status broadcasts to followers in real time
- [ ] User can follow/unfollow other users
- [ ] User can see a live activity feed of who is currently studying
- [ ] User can see past study history (frequency, duration, course breakdown)
- [ ] User can create "classrooms" and invite friends via shareable link
- [ ] Classroom members can see each other's live and past sessions
- [ ] User can log grades and GPA (public or private visibility toggle)
- [ ] User can generate analytics: study streaks, course heatmaps, weekly/monthly summaries
- [ ] Polished UI: Notion-inspired clean design + Apple-style interactive animations and dynamic backgrounds

### Out of Scope

- Native iOS/Android app — web-first, responsive mobile web is sufficient for v1
- AI study recommendations — too complex for v1, revisit after data is collected
- Video/voice study rooms — different product surface, defer to v2
- Calendar integrations — nice-to-have, not core to MVP value loop
- Payments/premium tier — ship free first, monetize later

## Context

**Inspiration:** Strava (social tracking + live activity feed), Notion (clean typographic UI with depth), Apple (smooth interactions, dynamic backgrounds, attention to micro-detail)

**Target users:** University/college students, primarily ages 18–25. Likely studying in cohorts (same course, same program). Social accountability is core — the app only works if your friends are on it.

**Key UX insight:** The "live" study timer going public is the viral loop. When you see your friend is studying right now, you're motivated to join them. This must feel instant and real — no stale data.

**Design direction:**
- Notion: Clean sans-serif typography, generous whitespace, subtle borders, block-based layout feel
- Apple: Framer Motion-style transitions, frosted glass effects, dynamic gradient backgrounds that shift based on time-of-day or activity state, spring physics on interactions
- Strava: Activity rings, progress arcs, streak visualizations, feed-style scrolling

**Tech assumptions (to be validated by research):**
- Next.js 14 App Router (SSR + real-time ready)
- Supabase (auth, Postgres DB, real-time subscriptions)
- Tailwind CSS + Framer Motion
- shadcn/ui as component base, heavily customized

## Constraints

- **Stack**: Web app (Next.js preferred) — mobile-responsive but not native
- **Real-time**: Live timer visibility must be <2s latency — this is the core feature
- **Auth**: Must support email/password at minimum; social login (Google) preferred
- **Design**: Must feel premium — cheap or generic UI is a dealbreaker
- **Solo dev**: Build in phases, each phase shippable — don't over-architect

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-first (not native) | Faster to ship, real-time parity with native, responsive works fine for students | — Pending |
| Supabase for real-time | Built-in Postgres + real-time subscriptions + auth — reduces infra complexity | — Pending |
| Classrooms (not DMs) | Group accountability is the differentiator vs. just a follow system | — Pending |
| Grades optional/private | Reduces friction to join; sensitive data must feel safe | — Pending |

---
*Last updated: 2026-03-06 after initialization*
