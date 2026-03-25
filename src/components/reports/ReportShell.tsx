import { ReactNode, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Mail, CalendarDays, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subMonths, startOfYear } from 'date-fns';

export type DateRange = { from: Date; to: Date };

interface ReportShellProps {
  title: string;
  description: string;
  children: ReactNode;
  data: any[];
  columns?: { key: string; label: string }[];
  isLoading?: boolean;
  onDateRangeChange?: (range: DateRange) => void;
}

const QUICK_RANGES = [
  { label: 'שבוע', labelEn: 'Week', days: 7 },
  { label: 'חודש', labelEn: 'Month', days: 30 },
  { label: 'רבעון', labelEn: 'Quarter', days: 90 },
  { label: 'שנה', labelEn: 'Year', days: 365 },
];

export function ReportShell({ title, description, children, data, columns, isLoading, onDateRangeChange }: ReportShellProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [activeRange, setActiveRange] = useState(1); // default: month

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

  const exportPDF = () => {
    window.print();
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`${isHebrew ? 'דוח PLUG' : 'PLUG Report'}: ${title}`);
    const body = encodeURIComponent(`${isHebrew ? 'מצורף דוח' : 'Attached report'}: ${title}\n${description}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={sendEmail} className="gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {isHebrew ? 'שלח' : 'Email'}
          </Button>
        </div>
      </div>

      {/* Quick date ranges */}
      <div className="flex gap-2 flex-wrap no-print">
        {QUICK_RANGES.map((r, i) => (
          <Button
            key={i}
            variant={activeRange === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickRange(r.days, i)}
          >
            {isHebrew ? r.label : r.labelEn}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : data.length === 0 && !isLoading ? (
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
