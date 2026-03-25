import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Target, Users, Eye, TrendingUp, Clock, CheckCircle2,
  FileSearch, Shield
} from 'lucide-react';

export function FeedJobSearchInsights() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: insights } = useQuery({
    queryKey: ['job-search-insights', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get user's applications with job details
      const { data: myApps } = await supabase
        .from('applications')
        .select('id, status, job_id, created_at')
        .eq('candidate_id', user.id);

      if (!myApps?.length) return null;

      const jobIds = myApps.map((a: any) => a.job_id).filter(Boolean);

      // Count competitors: other people who applied to same jobs
      let totalCompetitors = 0;
      let mostCompetedJob = { title: '', count: 0, jobId: '' };

      if (jobIds.length > 0) {
        // Get competing applications per job
        const { data: competingApps } = await supabase
          .from('applications')
          .select('job_id')
          .in('job_id', jobIds)
          .neq('candidate_id', user.id);

        const perJob: Record<string, number> = {};
        for (const app of (competingApps || [])) {
          perJob[app.job_id] = (perJob[app.job_id] || 0) + 1;
        }
        totalCompetitors = Object.values(perJob).reduce((sum, v) => sum + v, 0);

        // Find the most competed job
        const topJobId = Object.entries(perJob).sort((a, b) => b[1] - a[1])[0];
        if (topJobId) {
          const { data: jobData } = await supabase
            .from('jobs')
            .select('title')
            .eq('id', topJobId[0])
            .single();
          mostCompetedJob = {
            title: jobData?.title || '',
            count: topJobId[1],
            jobId: topJobId[0],
          };
        }
      }

      // Application status breakdown
      const statusCounts = {
        pending: 0,
        reviewed: 0,
        interview: 0,
        rejected: 0,
        accepted: 0,
      };
      for (const app of myApps) {
        const s = (app.status || 'pending').toLowerCase();
        if (s.includes('interview') || s === 'phone_screen') statusCounts.interview++;
        else if (s === 'reviewed' || s === 'shortlisted') statusCounts.reviewed++;
        else if (s === 'rejected' || s === 'declined') statusCounts.rejected++;
        else if (s === 'accepted' || s === 'hired' || s === 'offer') statusCounts.accepted++;
        else statusCounts.pending++;
      }

      // Profile strength
      const p = profile as any;
      let profileScore = 0;
      const fields = ['full_name', 'title', 'city', 'about_me', 'linkedin_url', 'phone', 'avatar_url'];
      for (const f of fields) {
        if (p?.[f]) profileScore++;
      }
      const profileStrength = Math.round((profileScore / fields.length) * 100);

      // Applications this week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const appsThisWeek = myApps.filter((a: any) => a.created_at >= oneWeekAgo).length;

      return {
        totalApplications: myApps.length,
        totalCompetitors,
        avgCompetitorsPerJob: jobIds.length > 0 ? Math.round(totalCompetitors / jobIds.length) : 0,
        mostCompetedJob,
        statusCounts,
        profileStrength,
        appsThisWeek,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (!insights) return null;

  return (
    <div className="space-y-3">
      {/* Profile Strength */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">
              {isRTL ? 'חוזק הפרופיל' : 'Profile Strength'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={insights.profileStrength} className="flex-1 h-2" />
            <span className="text-sm font-bold text-primary">{insights.profileStrength}%</span>
          </div>
          {insights.profileStrength < 80 && (
            <p className="text-[11px] text-amber-600 mt-1.5">
              {isRTL ? 'השלם את הפרופיל כדי לבלוט יותר!' : 'Complete your profile to stand out!'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Job Search Stats */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {isRTL ? 'תובנות חיפוש' : 'Search Insights'}
            </h3>
          </div>

          <div className="space-y-3">
            {/* Apps this week */}
            <InsightRow
              icon={<Clock className="w-3.5 h-3.5 text-blue-500" />}
              label={isRTL ? 'הגשות השבוע' : 'Apps this week'}
              value={insights.appsThisWeek}
            />

            {/* Avg competitors */}
            <InsightRow
              icon={<Users className="w-3.5 h-3.5 text-orange-500" />}
              label={isRTL ? 'מתחרים ממוצע למשרה' : 'Avg. competitors/job'}
              value={insights.avgCompetitorsPerJob}
            />

            {/* Total competitors */}
            <InsightRow
              icon={<TrendingUp className="w-3.5 h-3.5 text-red-500" />}
              label={isRTL ? 'סה"כ מתחרים' : 'Total competitors'}
              value={insights.totalCompetitors}
            />

            {/* Most competed job */}
            {insights.mostCompetedJob.title && (
              <div className="bg-orange-50 rounded-lg p-2.5 mt-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="w-3 h-3 text-orange-500" />
                  <span className="text-[11px] font-medium text-orange-700">
                    {isRTL ? 'המשרה הכי תחרותית' : 'Most competitive job'}
                  </span>
                </div>
                <p className="text-xs text-gray-800 font-medium truncate">
                  {insights.mostCompetedJob.title}
                </p>
                <p className="text-[10px] text-orange-600 mt-0.5">
                  {insights.mostCompetedJob.count} {isRTL ? 'מועמדים אחרים' : 'other applicants'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Application Status Breakdown */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSearch className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {isRTL ? 'סטטוס מועמדויות' : 'Application Status'}
            </h3>
          </div>

          <div className="space-y-2">
            <StatusBar
              label={isRTL ? 'ממתין' : 'Pending'}
              count={insights.statusCounts.pending}
              total={insights.totalApplications}
              color="bg-gray-400"
            />
            <StatusBar
              label={isRTL ? 'נצפה' : 'Reviewed'}
              count={insights.statusCounts.reviewed}
              total={insights.totalApplications}
              color="bg-blue-500"
            />
            <StatusBar
              label={isRTL ? 'ראיון' : 'Interview'}
              count={insights.statusCounts.interview}
              total={insights.totalApplications}
              color="bg-green-500"
            />
            <StatusBar
              label={isRTL ? 'התקבל' : 'Accepted'}
              count={insights.statusCounts.accepted}
              total={insights.totalApplications}
              color="bg-emerald-600"
            />
            <StatusBar
              label={isRTL ? 'נדחה' : 'Rejected'}
              count={insights.statusCounts.rejected}
              total={insights.totalApplications}
              color="bg-red-400"
            />
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">{isRTL ? 'סה"כ הגשות' : 'Total applications'}</span>
            <span className="text-sm font-bold text-gray-800">{insights.totalApplications}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function StatusBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-600 w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-gray-700 w-6 text-end">{count}</span>
    </div>
  );
}
