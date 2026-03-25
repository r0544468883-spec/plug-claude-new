# PLUG Nexus AI - Project Instructions

## UX Skill
When building or reviewing UI components, always reference and apply the UX checklist at:
`C:\Users\User\Desktop\Claude agents (skills)\tools\UX\ux-review-skill.md`

Key rules to always follow:
- Nielsen's 10 Heuristics on every component
- RTL/Hebrew support verified
- Loading, error, and empty states for all data views
- Mobile responsive (44px touch targets, no horizontal scroll)
- Accessibility: contrast, focus indicators, aria-labels

## PLUG Chrome Extension
The Chrome Extension source code is at:
`C:\Users\User\Desktop\PLUG extension`

When making changes that affect both web app and extension (shared Supabase tables, profiles, applications, jobs, real-time sync), always check and update both projects.

Key extension files:
- Service Worker: `src/background/service-worker.ts`
- Supabase lib: `src/lib/supabase.ts`
- Job Agent: `src/background/job-agent.ts`
- Side Panel: `src/sidepanel/SidePanel.tsx`
- Manifest: `manifest.json`

Shared resources (same Supabase project):
- `profiles` table — synced bidirectionally
- `applications` table — extension writes with `source: 'extension'`
- `jobs` table — extension upserts with `external_source`/`external_id`
- `extension_agent_control` table — dashboard controls extension agent
- `job_history` table — extension-only browsing history
