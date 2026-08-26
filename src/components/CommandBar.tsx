import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CommandPalette, type CommandItem } from "@/lib/motion";
import "@/lib/motion/tokens.css";

// Real in-product ⌘K command bar for PLUG, powered by @helix/motion.
// Mounted app-wide in App.tsx — jump to any screen from anywhere.
// PLUG accent = green; palette scales in with an Apple spring + scrim blur,
// full keyboard nav (↑/↓/Enter/Esc), reduced-motion aware.

const NAV: { title: string; subtitle: string; path: string }[] = [
  { title: "בית", subtitle: "דשבורד", path: "/" },
  { title: "משרות שמורות", subtitle: "מועמדות", path: "/saved-jobs" },
  { title: "בונה קורות חיים", subtitle: "CV", path: "/cv-builder" },
  { title: "הכנה לראיון", subtitle: "AI", path: "/interview-prep" },
  { title: "דוחות", subtitle: "אנליטיקה", path: "/reports" },
  { title: "אנליטיקה", subtitle: "נתונים", path: "/analytics" },
  { title: "חיפוש מועמדים", subtitle: "מגייסים", path: "/candidate-search" },
  { title: "הרשת שלי", subtitle: "קשרים", path: "/network" },
  { title: "התאמות", subtitle: "משרות", path: "/my-matches" },
  { title: "המלצות", subtitle: "vouches", path: "/vouches" },
  { title: "הפניות", subtitle: "referrals", path: "/referrals" },
  { title: "משימות בית", subtitle: "assignments", path: "/assignments" },
  { title: "רעיונות", subtitle: "ideas", path: "/ideas" },
  { title: "חברות", subtitle: "מעסיקים", path: "/companies" },
  { title: "קרדיטים", subtitle: "חשבון", path: "/credits" },
  { title: "האקסטנשן", subtitle: "Chrome", path: "/extension" },
  { title: "Motion Lab", subtitle: "Apple-UX", path: "/motion-lab" },
];

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items: CommandItem[] = useMemo(
    () =>
      NAV.map((n) => ({
        id: n.path,
        title: n.title,
        subtitle: n.subtitle,
        keywords: n.path,
        run: () => navigate(n.path),
      })),
    [navigate]
  );

  return (
    <div dir="rtl" style={{ ["--hm-accent" as string]: "#10B981" }}>
      <CommandPalette
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        items={items}
        placeholder="קפוץ לכל מסך…  (⌘K)"
      />
    </div>
  );
}
