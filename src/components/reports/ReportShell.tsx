import { ReactNode, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Mail, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export type DateRange = { from: Date; to: Date };

interface ReportShellProps {
  title: string;
  description: string;
  children: ReactNode;
  data: any[];
  columns?: { key: string; label: string }[];
  isLoading?: boolean;
  onDateRangeChange?: (range: DateRange) => void;
  /** When true, renders as a simple card without header/buttons/dates (for embedding in MyStatsPage) */
  compact?: boolean;
}

const QUICK_RANGES = [
  { label: 'שבוע', labelEn: 'Week', days: 7 },
  { label: 'חודש', labelEn: 'Month', days: 30 },
  { label: 'רבעון', labelEn: 'Quarter', days: 90 },
  { label: 'שנה', labelEn: 'Year', days: 365 },
];

export function ReportShell({ title, description, children, data, columns, isLoading, onDateRangeChange, compact }: ReportShellProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [activeRange, setActiveRange] = useState(1);

  const handleQuickRange = (days: number, index: number) => {
    setActiveRange(index);
    const to = new Date();
    const from = subDays(to, days);
    onDateRangeChange?.({ from, to });
  };

  const exportCSV = () => {
    if (!data.length) {
      toast.error(isHebrew ? 'אין נתונים לייצוא' : 'No data to export');
      return;
    }
    const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }));
    const header = cols.map(c => c.label).join(',');
    const rows = data.map(row => cols.map(c => JSON.stringify(row[c.key] ?? '')).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isHebrew ? 'CSV יוצא בהצלחה' : 'CSV exported successfully');
  };

  // ── Compact mode: simple card with title + content ──
  if (compact) {
    if (isLoading) {
      return (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      );
    }
    if (data.length === 0) {
      return (
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center text-muted-foreground">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isHebrew ? 'אין נתונים' : 'No data'}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          {children}
        </CardContent>
      </Card>
    );
  }

  // ── Full mode: standalone page with header + controls ──
  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex items-start justify-between gap-2 no-print">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-2xl font-bold text-foreground truncate">{title}</h1>
          <p className="text-muted-foreground text-[11px] sm:text-sm mt-0.5 line-clamp-1">{description}</p>
        </div>
        <div className="hidden sm:flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const subject = encodeURIComponent(`${isHebrew ? 'דוח PLUG' : 'PLUG Report'}: ${title}`);
            const body = encodeURIComponent(`${isHebrew ? 'מצורף דוח' : 'Attached report'}: ${title}\n${description}`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
          }} className="gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {isHebrew ? 'שלח' : 'Email'}
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap no-print">
        {QUICK_RANGES.map((r, i) => (
          <Button
            key={i}
            variant={activeRange === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickRange(r.days, i)}
            className="h-7 px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm"
          >
            {isHebrew ? r.label : r.labelEn}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isHebrew ? 'אין נתונים לתקופה שנבחרה' : 'No data for the selected period'}</p>
          </CardContent>
        </Card>
      ) : (
        <>{children}</>
      )}
    </div>
  );
}
