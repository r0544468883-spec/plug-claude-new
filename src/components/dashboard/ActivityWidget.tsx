import { useLanguage } from '@/contexts/LanguageContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Flame, Sparkles, Mic, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActivityWidget() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { weeklyStats: s } = useActivityLog();

  // Build 7-day grid (Sun→Sat)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const count = s.byDay.find(x => x.date === key)?.count ?? 0;
    const dayName = d.toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { weekday: 'short' });
    return { key, count, dayName };
  });

  const maxCount = Math.max(...days.map(d => d.count), 1);

  const stats = [
    { icon: Send,     value: s.applies,          labelHe: 'הגשות', labelEn: 'Applied',   color: 'text-indigo-400' },
    { icon: Activity, value: s.stageChanges,      labelHe: 'עדכוני שלב', labelEn: 'Updates', color: 'text-blue-400' },
    { icon: Sparkles, value: s.matchesGenerated,  labelHe: "מאצ'ים", labelEn: 'Matches',   color: 'text-primary' },
    { icon: Mic,      value: s.interviewPreps,    labelHe: 'הכנות', labelEn: 'Preps',     color: 'text-purple-400' },
  ];

  if (s.totalActions === 0) return null;

  return (
    <Card className="bg-card border-border" dir={isHebrew ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          {isHebrew ? 'פעילות השבוע' : 'This Week'}
          {s.bestStreak >= 3 && (
            <span className="flex items-center gap-1 text-orange-400 text-xs font-medium ms-auto">
              <Flame className="w-3.5 h-3.5" />
              {s.bestStreak} {isHebrew ? 'ימים רצופים' : 'day streak'}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 7-day bar chart */}
        <div className="flex items-end gap-1 h-14">
          {days.map(day => {
            const heightPct = day.count > 0 ? Math.max((day.count / maxCount) * 100, 12) : 0;
            const isToday = day.key === new Date().toISOString().slice(0, 10);
            return (
              <div key={day.key} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full flex items-end justify-center" style={{ height: '44px' }}>
                  {day.count > 0 ? (
                    <div
                      className={cn(
                        'w-full rounded-t-sm transition-all',
                        isToday ? 'bg-primary' : 'bg-primary/40'
                      )}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.count} ${isHebrew ? 'פעולות' : 'actions'}`}
                    />
                  ) : (
                    <div className="w-full rounded-t-sm bg-muted/40" style={{ height: '4px' }} />
                  )}
                </div>
                <span className={cn('text-[9px]', isToday ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                  {day.dayName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/50">
          {stats.map(({ icon: Icon, value, labelHe, labelEn, color }) => (
            <div key={labelEn} className="text-center">
              <Icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', color)} />
              <p className="text-sm font-bold">{value}</p>
              <p className="text-[9px] text-muted-foreground">{isHebrew ? labelHe : labelEn}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
