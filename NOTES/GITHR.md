# GitHub HR Reference Repositories

סקרנו את הגיטים האלו ב-2026-04-23. לא צריך לעבור עליהם שוב.

---

## לשילוב עתידי ב-PLUG

### 1. AI Recruiter Agent ⭐⭐⭐⭐⭐
**סטאק:** React + Vite + Anthropic SDK (Claude) — זהה ל-PLUG
**שימוש:** Reference ראשי לבניית Agentic Recruiter ב-PLUG
**תכונות:**
- `FillRoleCoordinator` — multi-agent עם sub-agents מתמחים
- `SequenceAgent` — outreach sequences אוטומטיות
- `BiasAudit` tool — סריקת bias ב-JD
- `MemoryStore` — agent שמשתפר עם הזמן
- Permission gate — agent מחכה לאישור אנושי לפני פעולות הרסניות
- ATS Webhooks (Greenhouse, Lever, Workday)

**לפתוח כשבונים:** `packages/backend/src/agent-loop/` + `tools/`

---

### 2. Multi-Agent LangChain Recruitment Pipeline ⭐⭐⭐⭐⭐
**סטאק:** Python + FastAPI + LangChain + Groq
**שימוש:** Pipeline stages + scoring rubric + offer letter
**תכונות:**
- Pipeline: `JD → Search → Score → Schedule → Feedback → Offer → Eval`
- Scoring rubric: `40% skill + 30% experience + 15% education + 15% preferred`
- Offer Agent — מכתב הצעת עבודה אוטומטי עם ולידציית שכר
- Feedback Agent — סנטימנט + hire/no-hire
- `prompts/agent_prompts.json` — כל ה-prompts בקובץ אחד

**לפתוח כשבונים:** `prompts/agent_prompts.json` + scoring rubric

---

### 3. AI Resume Screening & Job Matching ⭐⭐⭐⭐
**סטאק:** Python + FastAPI + FAISS + Streamlit
**שימוש:** שדרוג מנוע ההתאמה של PLUG
**תכונות:**
- Hybrid scoring: cosine similarity + Jaccard Index (skill overlap)
- FAISS vector store לחיפוש סמנטי
- RAG על קורות חיים

**לפתוח כשבונים:** `backend/services/matching_service.py`

---

### 4. ConvoHire — Agentic Recruiter ⭐⭐⭐⭐
**סטאק:** Python + FastAPI + Gemini + Streamlit
**שימוש:** שדרוג InterviewPrep ב-PLUG
**תכונות:**
- Skill matching סמנטי (cosine threshold)
- Follow-up questions דינמיות לפי תשובת המועמד
- ציון נסתר מצד השרת

**לפתוח כשבונים:** `skill_matching_agent.py` + `evaluator_agent.py`

---

### 5. EquiHire AI + blind-recruiter ⭐⭐⭐
**סטאק:** React + Vite + Gemini
**שימוש:** Bias detection + PII masking
**תכונות:**
- JD Auditor — מחפש שפה מוטית ומנסח מחדש
- PII Masking — מסתיר שם/גיל/מיקום מקו"ח

**לפתוח כשבונים:** `prompts/` ב-EquiHire

---

## לעתיד הרחוק — HR Modules

| גיט | שימוש |
|-----|-------|
| **Horilla HRMS** | Reference הכי טוב לבניית HR modules (חופשות, onboarding, payroll) |
| **Frappe HR** | השראה נוספת |
| **OrangeHRM** | השראה נוספת |
| **IceHrm** | השראה נוספת |

> לא לשלב ישירות — רק להסתכל על הלוגיקה והשדות כשבונים native ב-Supabase.

---

## לא רלוונטי (לא לבדוק שוב)
- OCA HR — Odoo בלבד
- Sentrifugo — PHP ישן
- Human-Recruiter (Django) — פרויקט תרגול
- Chinese HR projects — פרויקטי תרגול ישנים
- Weibo Flutter clone — לא קשור
- HR terminal ruler (`hr`) — כלי terminal בלבד
- Recruiter2050 Java — לא גמור
- HRM (Hierarchical Reasoning Model) — מחקר ML, לא רלוונטי
