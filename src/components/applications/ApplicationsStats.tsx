import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, Calendar, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ApplicationsStatsProps {
  total: number;
  active: number;
  interviews: number;
  rejected: number;
}

export function ApplicationsStats({ total, active, interviews, rejected }: ApplicationsStatsProps) {
  const { t } = useLanguage();

  const stats = [
    {
      title: t('applications.total') || 'Total Applications',
      value: total,
      icon: FileText,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      title: t('applications.active') || 'Active',
      value: active,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('applications.interviews') || 'Interviews',
      value: interviews,
      icon: Calendar,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: t('applications.rejected') || 'Rejected',
      value: rejected,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
