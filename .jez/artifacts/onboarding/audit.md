# Onboarding Audit: PLUG Nexus AI
**Date**: 2026-04-28
**URL**: plug-nexus-ai.vercel.app
**Role Audited**: job_seeker (Hebrew, RTL)

---

## First Impression Score: 2/5

A new user lands on a feature-rich dashboard with 12+ cards, all showing zeros.
No forced onboarding flow. No clear "start here" signal. The tour system exists
but is opt-in (FAB button). Credits, stats, and widgets display before the user
understands what they are. On mobile it's worse -- a vertical wall of empty cards.

---

## Current Onboarding Flow (As-Is)

```
Signup (email/pass/name/phone/gender)
  |
  v
Gmail Integration Step (skippable)
  |
  v
Dashboard (overview) -- 12+ cards, all empty
  |
  +--> DailyWelcome modal (role tips, mentions credits user doesn't know)
  +--> TodaysFocus card (collapsed, 3 onboarding items)
  +--> ProfileCompletionCard (0%, 8 items missing)
  +--> TourGuideFAB (floating button, opt-in)
  +--> Everything else: stats=0, apps=0, interviews=0, empty widgets
```

### Problems with current flow:
1. No forced sequence -- user can ignore everything
2. DailyWelcome mentions credits before user understands them
3. TodaysFocus is collapsed by default -- new user won't expand it
4. ProfileCompletionCard says "0%" but links to wrong section (profile-docs vs profile-settings)
5. Tour is opt-in via small FAB -- most users won't discover it
6. Dashboard shows 12+ cards that are all empty -- overwhelming, discouraging

---

## Empty States Audit

| Page | Current State | Quality | Recommendation |
|------|--------------|---------|----------------|
| **Applications (Kanban)** | Dedicated EmptyApplicationsState component with icon, warm copy, CTA "Search Jobs Now", feature badges | Excellent | Keep as-is. Gold standard. |
| **Job Search** | "No jobs found" + dynamic message based on filter state + "Clear filters" CTA | Very Good | Add "first time" variant: "Set up your profile to see matching jobs" |
| **Messages** | "No conversations yet" + "New message" CTA, search-aware | Very Good | Keep as-is |
| **Feed** | Reusable EmptyFeed component per tab, "Create Post" CTA | Good | Network tab: add "Connect with people to see their posts" |
| **Resume Upload** | Raw upload zone ("drag file here"), auto-dismiss tip after 3s | WEAK | Replace with proper empty state: WHY to upload, not just HOW |
| **Schedule (Calendar)** | Inconsistent across 5 view modes. Day/Board views near-empty. List/Calendar views OK | Inconsistent | Standardize: same card + CTA across all modes |
| **Interview Prep** | History tab: excellent. Tips tab: buried CTA. Practice tab: no empty state (form IS the state) | Mixed | Add welcome card for first-timers in Practice tab |
| **Companies** | Not audited in detail | Unknown | Check |
| **CV Builder** | Not audited in detail | Unknown | Check |
| **My Stats** | Shows zeros | Unknown | Add context: "Stats will populate as you apply" |

---

## Feature Discovery Issues

| Feature | Problem | Fix |
|---------|---------|-----|
| **Guided Tour** | Hidden behind small FAB button. Most users won't find it | Auto-trigger on first login |
| **PLUG Chat** | Center button on mobile nav, but no indication it's an AI assistant | Add pulsing dot + "Try me!" hint on first visit |
| **Chrome Extension** | Tour step mentions it, but no install link or explanation in dashboard | Add extension install card for new users |
| **Credits System** | Mentioned in DailyWelcome + overview, but never explained | Add "What are credits?" tooltip or first-use explainer |
| **CV Builder** | Blocked on mobile (shows warning dialog). No explanation why | Explain: "CV Builder works best on desktop" with option to continue |
| **Job Swipe** | Exists but not in main nav or tour | Add to onboarding for users who prefer browsing |
| **Profile Completion** | Card shows 0% but no priority ranking of items | Mark essential vs. nice-to-have |
| **Bottom tools row** | 4 cards at bottom of overview (CV, Interview, Companies, Chat) | No label explaining these are "main features" |

---

## Contextual Help Gaps

| Location | Gap | Priority |
|----------|-----|----------|
| **Signup: Gender field** | No explanation why it's needed | Medium |
| **Dashboard: Credits balance** | Number shown with no context on what credits do | High |
| **Dashboard: Stats row** | "0 Applied / 0 Interviews / 0 Active" with no guidance | High |
| **Profile: Personal tagline vs About Me** | Two similar fields, confusing which to fill | Medium |
| **Profile: Professional links** | No hint about which links matter most | Low |
| **Schedule: Hour slots** | Clickable but not obviously so | Medium |
| **Applications: Kanban stages** | Drag-and-drop not explained | Medium |

---

## Mobile-Specific Issues

| Issue | Severity | Location |
|-------|----------|----------|
| **12+ cards stacked vertically** | Critical | OverviewHome.tsx |
| **No safe-area-inset on main grid** | High | DashboardLayout.tsx |
| **Tour tooltip too low on steps 8, 17** | High | TourTooltip.tsx positioning |
| **Tour "By Screens" mode not useful on mobile** | High | TourGuideFAB.tsx |
| **CV Builder blocked with humorous warning** | Medium | DashboardLayout.tsx line 66 |
| **Bottom nav has no badge indicators** | Medium | MobileBottomBar.tsx |
| **Step 12 stuck in tour** | Medium | JobSeekerTour.tsx |
| **Sidebar not visible on mobile** | High | DashboardLayout.tsx |

---

## Proposed Onboarding Strategy (To-Be)

### Phase 1: First Login Flow (Forced, 3 minutes)

```
Signup
  |
  v
Role Selection (existing, good)
  |
  v
[NEW] Onboarding Wizard (3 steps, modal, unskippable first time)
  |
  Step 1: Upload CV
  |  - Drag/drop or file picker
  |  - Explain: "This lets PLUG find matching jobs for you"
  |  - Skip allowed but with "You'll get fewer matches" warning
  |
  Step 2: Complete Key Profile Fields
  |  - Full name (pre-filled from signup)
  |  - Tagline (one-liner about what you do)
  |  - LinkedIn URL (optional but encouraged)
  |  - Profile photo (optional)
  |  - Show completion % updating live
  |
  Step 3: Choose Your Goal
  |  - "I'm actively looking" / "I'm open to offers" / "Just exploring"
  |  - Sets urgency level, affects what we show
  |  - Pick 2-3 job categories/roles interested in
  |
  v
Dashboard (simplified first-time view)
```

### Phase 2: Simplified First-Time Dashboard

For users with < 3 applications AND < 50% profile completion:

```
+--------------------------------------------------+
|  Welcome, [Name]! Here's your plan:               |
|                                                    |
|  [=======-----] 40% profile complete               |
|                                                    |
|  1. [x] Upload CV                                  |
|  2. [ ] Complete profile  -->  [Go]                |
|  3. [ ] Browse matching jobs  -->  [Search]        |
|  4. [ ] Submit first application  -->  [Apply]     |
|                                                    |
|  [Start Guided Tour]  [Skip, show me everything]   |
+--------------------------------------------------+

+-- Matching Jobs (3 cards) --+  +-- PLUG Chat --+
|  Based on your CV...         |  |  Ask me       |
|  [Job 1] [Job 2] [Job 3]    |  |  anything!    |
+-----------------------------+  +---------------+

(NO other widgets until checklist is 75%+ done)
```

### Phase 3: Progressive Disclosure

| User State | What We Show | What We Hide |
|------------|-------------|-------------|
| **New (0 apps, < 50% profile)** | Checklist + Jobs + Chat + Tour CTA | Stats, Schedule, Feed, Communities, Assignments, Vouches |
| **Getting Started (1-3 apps, 50%+ profile)** | Above + Applications Kanban + Stats | Schedule, Feed, Communities |
| **Active (4+ apps, 70%+ profile)** | Full dashboard | Nothing hidden |
| **Power User (10+ apps)** | Full dashboard + advanced features | Onboarding elements auto-dismissed |

### Phase 4: Contextual Triggers (Ongoing)

| Trigger | Action |
|---------|--------|
| User opens Applications for first time | Show 10s tooltip: "Drag cards between stages to track progress" |
| User opens Schedule for first time | Show: "Click any hour to add a task. Connect Google Calendar for auto-sync" |
| User opens Chat for first time | Auto-send welcome message from PLUG explaining capabilities |
| User reaches 5 applications | Celebrate: "5 applications submitted! You're making progress" + show Interview Prep |
| User hasn't logged in for 3 days | Push notification / email: "3 new jobs match your profile" |
| Profile reaches 100% | Celebrate + unlock "Visible to HR" badge explanation |

### Phase 5: Tour System Fixes

1. **Auto-trigger tour on first login** (after wizard, not instead of)
2. **Remove "By Screens" mode on mobile** -- confusing, doesn't work well
3. **Fix stuck steps**: Step 12 (applications), Steps 8/17 (tooltip positioning)
4. **Max 10 steps for first-time tour** -- current 24 is too many
5. **Split into mini-tours**: "Profile Tour" (3 steps), "Job Search Tour" (3 steps), "Applications Tour" (3 steps) -- triggered contextually

---

## Quick Wins (Top 5, Highest Impact)

1. **Create OnboardingWizard modal** -- 3-step forced flow on first login (CV + Profile + Goal). Prevents the "empty dashboard" problem entirely.

2. **Simplified first-time dashboard** -- Hide 70% of widgets for new users. Show only: Checklist + Matching Jobs + Chat. Progressive disclosure as they complete tasks.

3. **Fix Resume Upload empty state** -- Replace bare upload zone with proper card: icon, heading ("Upload your CV"), explanation ("PLUG will analyze your experience and find matching jobs"), CTA button.

4. **Auto-trigger guided tour** after onboarding wizard (not opt-in). Shorten to 10 key steps. Remove "By Screens" on mobile.

5. **Add badge indicators to mobile bottom nav** -- Red dot on Profile (if incomplete), number on Applications (if any pending), pulse on Chat (if never used).

---

## Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Onboarding Wizard (3-step modal) | Large | Critical |
| P0 | Simplified first-time dashboard | Large | Critical |
| P1 | Resume Upload empty state fix | Small | High |
| P1 | Auto-trigger tour (first login) | Small | High |
| P1 | Remove By Screens on mobile | Small | High |
| P1 | Fix tour steps 8, 12, 17 | Medium | High |
| P2 | Progressive disclosure logic | Medium | Medium |
| P2 | Credits system explainer | Small | Medium |
| P2 | Mobile bottom nav badges | Medium | Medium |
| P2 | Schedule empty state standardization | Small | Medium |
| P3 | Contextual first-use tooltips | Medium | Medium |
| P3 | Mini-tours per section | Large | Medium |
| P3 | Celebration milestones | Small | Low |
| P3 | Re-engagement notifications | Medium | Low |
