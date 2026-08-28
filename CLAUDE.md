# PLUG Nexus AI - Project Instructions

## Reuse-Before-Build Rule
Before building any new product or major feature, FIRST search for ready-made skills/MCP/subagents/GitHub repos — don't build from scratch what exists in open source.
Search: Glama + mcp.so (MCP) · Composio/awesome-claude-skills + Skillselion + SkillsClaude (skills) · wshobson/agents (subagents) · agentskills.co.il (Israeli/regulatory) · GitHub `awesome-<domain>`.
Install skills with `npx skills add owner/repo`. Full source list: `Desktop/HELIX - מאגר מקורות סקילים MCP ואייגנטים.docx`.

## UX Skill
When building or reviewing UI components, always reference and apply the UX checklist at:
`C:\Users\User\Desktop\Claude agents (skills)\tools\UX\ux-review-skill.md`

Key rules to always follow:
- Nielsen's 10 Heuristics on every component
- RTL/Hebrew support verified
- Loading, error, and empty states for all data views
- Mobile responsive (44px touch targets, no horizontal scroll)
- Accessibility: contrast, focus indicators, aria-labels

## Skill-Based Agents (STANDING RULE — all products)
Every product agent that calls an LLM MUST load its capability from the shared skill library (`helix/skills/`), not from a prompt duplicated per product. Agent = archetype (role/format/gate in code) × domain (loaded from a skill). One skill per capability, shared across products — never a skill per agent. Every text-producing agent also loads `helix-brand-voice` (+ Hebrew-native + clean-text/no-em-dash). Deterministic agents (no LLM) need no skill. Reference `PRODUCTS/HELIX-AGENT-SKILLS-MAP.md` (matrix) + `HELIX-SKILLS-WIRING-CHECKLIST.md` (method) in the helix repo. Reuse ready-made skills (anthropics/skills, ComposioHQ/awesome-claude-skills) before building; security-read third-party skills first. Wire the skill before treating any agent work as done. In ai-kit, the injection point is `_shared/ai-kit/agent-config.ts::renderSystemPrompt` + `_shared/ai-kit/skills/registry.ts`.

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

## Extension Version Update Rule
After finishing work on extension files (content scripts, service worker, side panel, etc.):
1. Bump the `version` field in `C:\Users\User\Desktop\PLUG extension\public\manifest.json`
2. Update the `extension_config.latest_version` value in Supabase (`extension_agent_control` or dedicated config row)
3. Build the extension (`npm run build` in the extension directory)
4. The extension checks Supabase every 30 minutes — if version mismatch, it shows a refresh banner to the user
