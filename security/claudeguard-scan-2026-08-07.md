# ClaudeGuard-IL — סריקת אבטחה + ציות · PLUG web app
**סריקה:** 2026-08-07 · **תיקון:** 2026-08-08 · **כלי:** `github.com/Freespirits/claudeguard-il` (Tier 0 static) · **כיסוי:** 768/768 קבצים (100%)

> ⚠️ **מודל כנות:** "סריקה נקייה אינה הוכחה לבטיחות." הכלי over-flags ומתעד זאת ב-ERRATA. **כל ממצא אומת ידנית מול המיגרציות + קוד האפליקציה** לפני סיווג.

## תוצאה גולמית → אחרי אימות
Verdict אוטומטי: **critical** · 507 ממצאים · 18 P0 "confirmed". **אחרי אימות ידני:** 2 false-positive · 4 מכוונים-ותקינים · **12 אמיתיים — כולם תוקנו**.

## טבלת ההכרעה המלאה (18 ה-P0)
| טבלה | ה-policy | הכרעה | תיקון |
|---|---|---|---|
| `their` | — | ❌ false-positive | אין טבלה כזו (טעות פרסינג משם policy) |
| `promo_codes` | — | ❌ false-positive | RLS מופעל **בלי** policies = deny-all = כבר מאובטח |
| `referrals` | Anyone insert click | 🟢 מכוון | append ציבורי (מעקב הפניות) — נשמר |
| `profile_views` | Anyone record view | 🟢 מכוון | append ציבורי — נשמר |
| `career_site_analytics` | insertable by all | 🟢 מכוון | ingest אנליטיקס ציבורי — נשמר |
| `signing_document_audit` | insert authenticated | 🟢 תקין | כבר `TO authenticated` — נשמר |
| `payment_link_transactions` | `link_tx_insert` true | 🔴 **תוקן** | checkout ציבורי מותר אבל רק `status='pending'` (webhook משלים) — **בקוד המקור** |
| `affiliate_conversions` | `conversions_insert` true | 🔴 **תוקן** | הוסר policy — נרשם server-side (הונאת עמלות נסגרה) — **בקוד המקור** |
| `challenge_teams` | `challenge_teams_insert` true | 🔴 **תוקן** | scoped `TO authenticated` — **בקוד המקור** |
| `community_payments` | System manage ALL(true) | 🔴 **תוקן** | הוסר ALL(true) (דלף תשלומי כולם); insert=own+pending בלבד |
| `community_point_transactions` | System insert points | 🔴 **תוקן** | הוסר — נקודות מוענקות ב-`award_community_points()` (SECURITY DEFINER) |
| `community_notifications` | System insert | 🔴 **תוקן** | scoped `TO authenticated` |
| `community_analytics_events` | System insert | 🔴 **תוקן** | scoped `TO authenticated` |
| `audit_log` | System insert | 🔴 **תוקן** | הוסר (נכתב ע"י triggers/server; 0 כתיבות client) |
| `notifications` | System insert | 🔴 **תוקן** | scoped `TO authenticated` (חוסם phishing anon; ping של HR ממשיך) |
| `companies` | `companies_auth_insert` true | 🔴 **תוקן** | scoped `TO authenticated` |
| `master_skills` | Auth add skills | 🔴 **תוקן** | scoped `TO authenticated` |
| `company_reviews` | update is_approved true | 🔴 **תוקן** | הוסר (כל אחד אישר/ערך כל ביקורת); עריכה=בעל הביקורת בלבד, אישור=service role |

## איפה התיקון
- **קוד המקור (טרם-הורץ):** `supabase/migrations/20260531000001_groop_features.sql` — 3 טבלאות הכסף/הונאה תוקנו במקום.
- **מיגרציית תיקון חדשה:** `supabase/migrations/20260808000000_rls_hardening.sql` — מוגנת (`to_regclass`), אידמפוטנטית, רצה אחרונה. מתקנת את כל 12 האמיתיים (כולל טבלאות live שאסור לערוך את ההיסטוריה שלהן).

## אימות
⚠️ **re-scan סטטי לא יראה 0** — הסורק קורא את ה-`CREATE POLICY` הישנים ולא עוקב אחרי `DROP POLICY` במיגרציה מאוחרת (18→16 אחרי תיקוני-המקור בלבד). **האימות האמיתי = הרצת המיגרציה ואז:**
```sql
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies where schemaname='public'
   and tablename in ('companies','master_skills','audit_log','notifications','company_reviews',
     'community_point_transactions','community_notifications','community_payments',
     'community_analytics_events','payment_link_transactions','affiliate_conversions','challenge_teams');
```
מצופה: אפס policies עם `qual/with_check = true` ובלי role על טבלאות אלו.

## מה נשאר (follow-up, לא חוסם)
- `notifications`/`community_notifications`: scoped ל-authenticated, אבל משתמש מחובר עדיין יכול ליצור התראה לאחר — לצמצם ל-actor אחרי בירור עמודות.
- 357 ממצאי `needs-review` (לא confirmed) לא טופלו פרטנית — ROI נמוך.

## הרצה חוזרת / מוצרים אחרים
`node <claudeguard>/plugin/scripts/grader.mjs <repo> --json`. מומלץ על helix-rank, STAGE וכל מוצרי HELIX (אותו סטאק Supabase).
