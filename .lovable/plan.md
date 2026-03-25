
# Daily CRM Calendar — Hourly View with Activity-Linked Tasks

## What We're Building

A **full daily CRM calendar** (like HubSpot / Salesforce daily view) that shows tasks by time slots, with deep integration into CRM activity logs (conversations, meetings, calls). When you log any activity in the CRM, you can instantly create a linked follow-up task that appears in the calendar.

---

## Current State Analysis

**Existing tables:**
- `schedule_tasks` — General tasks (user_id, title, due_date, due_time, task_type, priority). Currently stores only text references to candidates/jobs (not FK).
- `client_tasks` — CRM tasks per company (recruiter_id, company_id, due_date).
- `client_timeline` — CRM activity log (meetings, calls, emails per contact/company).
- `client_reminders` — Contact-level reminders.

**Gap:** The three separate task/reminder tables are not unified into a single calendar view. There's no hourly day view, no attendee/participant system, and no "create task from activity" flow.

---

## Database Changes (Migration)

### 1. Extend `schedule_tasks` with new columns

```sql
ALTER TABLE schedule_tasks
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  -- 'manual' | 'crm_activity' | 'crm_reminder' | 'interview'
  ADD COLUMN IF NOT EXISTS source_id UUID,
  -- FK to the originating record (client_timeline.id, client_reminders.id, etc.)
  ADD COLUMN IF NOT EXISTS source_table TEXT,
  -- 'client_timeline' | 'client_reminders' | 'applications'
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID[] DEFAULT '{}',
  -- Array of user_ids (internal users)
  ADD COLUMN IF NOT EXISTS external_attendees JSONB DEFAULT '[]';
  -- [{"name": "דנה כהן", "email": "dana@acme.com"}]
```

### 2. Add `linked_task_id` to `client_timeline`

```sql
ALTER TABLE client_timeline
  ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES schedule_tasks(id) ON DELETE SET NULL;
```

This creates a bidirectional link: activity → task and task → activity.

---

## Component Changes

### A. Redesign `ScheduleCalendar.tsx` — Add Daily Hourly View

Add a third view mode: **`'day'`** (in addition to existing `'calendar'` and `'list'`).

**Daily View Layout (CRM style):**

```text
+-------------------------------+
| « Mon 18/02  [Day] [Week] [Month] [List] |
+----------+--------------------+
|  08:00   |  [empty]           |
|  09:00   |  🎤 ראיון — דנה כהן  |  ← colored block, height = duration
|  10:00   |  ───               |
|  11:00   |  👥 פגישה — Wix     |
|  12:00   |  [empty]           |
|  ...     |                    |
+----------+--------------------+
```

- Hours from 07:00 to 22:00 (scrollable)
- Each task block: colored by type, shows title + linked entity (company/candidate)
- Click a block → drawer/popover with full details + "Edit" / "Complete" / "Delete"
- Click an empty slot → Quick-create task with that time pre-filled
- Tasks **without a time** appear in an "All Day" row at the top
- **Aggregate from all sources:** pulls from `schedule_tasks` (which now includes CRM-linked tasks and general tasks)

### B. Update Add-Task Dialog in `ScheduleCalendar.tsx`

Add new optional fields to the create dialog:
- **מיקום** (location text input)
- **לינק לפגישה** (meeting link)
- **משתתפים פנימיים** (multi-select from profiles — internal users)
- **משתתפים חיצוניים** (repeatable row: שם + מייל)

When external attendees are added and the task is saved → option: **"שלח הזמנה במייל"** — sends a simple invitation email via the existing `process-reminders` edge function or a new one.

### C. "Create Task from Activity" — Update `ContactDetailSheet.tsx`

After successfully logging any activity (call, meeting, email) in the CRM, show a bottom action strip:

```text
✅ פגישה נוספה בהצלחה
[ + צור משימה מהפגישה הזו ]   [ בסדר ]
```

Clicking **"+ צור משימה"** opens an inline mini-form (collapsed):
- כותרת (auto-filled: `"פולואפ: {activity.title}"`)
- תאריך + שעה (default: tomorrow 09:00)
- עדיפות (default: high for meetings)
- משתתפים חיצוניים (pre-filled from contact's email)
- Submit → inserts into `schedule_tasks` with `source='crm_activity'` and `source_id=activity.id`

Also: the existing `addActivityMutation` in `ContactDetailSheet.tsx` auto-creates a `client_tasks` follow-up for meetings — we'll keep that AND also insert into `schedule_tasks` so it appears in the unified calendar.

### D. Update `ClientProfilePage.tsx` — "Add to Calendar" on Tasks

In the existing task list (Timeline/Tasks tab), each `client_task` will show a small **"📅 הוסף ליומן"** button. Clicking it inserts the task into `schedule_tasks` with source linking.

---

## Data Flow Diagram

```text
ContactDetailSheet (log meeting/call)
       │
       ├─→ client_timeline (activity record)
       │
       └─→ [optional] schedule_tasks (linked task, source='crm_activity')
                              │
                              └─→ Appears in ScheduleCalendar Daily View
                                  alongside ALL other tasks
```

---

## Files to Create/Edit

| File | Action | What Changes |
|---|---|---|
| `supabase/migrations/XXXX_calendar_upgrade.sql` | **Create** | Adds columns to `schedule_tasks` and `client_timeline` |
| `src/components/dashboard/ScheduleCalendar.tsx` | **Edit** | Add daily hourly view, attendees fields in create dialog |
| `src/components/clients/ContactDetailSheet.tsx` | **Edit** | Add "create task from activity" CTA after successful activity log |
| `src/components/clients/ClientProfilePage.tsx` | **Edit** | "Add to calendar" button on client_tasks, sync to schedule_tasks |

---

## Implementation Details

### Daily Hourly View — Key Logic

```tsx
// Hours grid: 07–22
const hours = Array.from({ length: 16 }, (_, i) => i + 7); // [7, 8, ..., 22]

// Place tasks in time slots
const tasksByHour = tasks.reduce((acc, task) => {
  const hour = task.due_time ? parseInt(task.due_time.split(':')[0]) : null;
  if (hour !== null) {
    acc[hour] = [...(acc[hour] || []), task];
  }
  return acc;
}, {});

// All-day tasks (no time set)
const allDayTasks = tasks.filter(t => !t.due_time);
```

### Email Invitation for External Attendees

When `external_attendees` array is non-empty on task save, call `supabase.functions.invoke('process-reminders', ...)` or a dedicated `send-calendar-invite` edge function that:
- Sends a plain-text email via Resend (using existing `RESEND_API_KEY` if configured)
- Email contains: event title, date/time, location/link, organizer name
- Falls back gracefully if `RESEND_API_KEY` is not set (just saves the task, no email error)

---

## UX Details

- **RTL support**: daily grid has times on the right, tasks on the left for Hebrew
- **Colors**: same type-color system as current (meeting=orange, interview=purple, etc.)
- **Scroll**: daily view scrolls to current hour automatically (or to first task of the day)
- **Mobile**: daily view stacks nicely — hour labels above task blocks
- **Empty state**: "לא נמצאו אירועים היום — לחץ על שעה כלשהי להוספת משימה"
- **Navigation**: `[< יום קודם]` `[היום]` `[יום הבא >]` buttons in daily view header

---

## What Stays Unchanged

- Existing monthly calendar grid view and list view — untouched
- `client_tasks` table — continues to work as before
- `client_reminders` — continues to work as before
- All existing RLS policies remain intact
