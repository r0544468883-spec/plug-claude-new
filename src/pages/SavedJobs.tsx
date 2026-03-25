import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailsSheet } from '@/components/jobs/JobDetailsSheet';
import { EmptySavedJobsState } from '@/components/jobs/EmptySavedJobsState';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function SavedJobs() {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: savedJobs = [], isLoading } = useQuery({
    queryKey: ['saved-jobs-full', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: savedData, error: savedError } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', user.id);

      if (savedError) throw savedError;
      if (!savedData.length) return [];

      const jobIds = savedData.map(s => s.job_id);

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          company:companies(id, name, logo_url, description, website),
          job_field:job_fields(id, slug, name_en, name_he),
          job_role:job_roles(id, slug, name_en, name_he),
          experience_level:experience_levels(id, slug, name_en, name_he)
        `)
        .in('id', jobIds)
        .eq('status', 'active');

      if (jobsError) throw jobsError;
      return jobs || [];
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <DashboardLayout currentSection="saved-jobs" onSectionChange={() => {}}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  const handleApply = (job: any) => {
    // Navigate to application
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  return (
    <DashboardLayout currentSection="saved-jobs" onSectionChange={() => {}}>
      <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              {isHebrew ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </Button>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Heart className="w-6 h-6 text-primary fill-primary" />
            {isHebrew ? 'משרות שמורות' : 'Saved Jobs'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isHebrew 
              ? `${savedJobs.length} משרות שמרת`
              : `${savedJobs.length} jobs saved`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedJobs.length === 0 ? (
          <EmptySavedJobsState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {savedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={handleViewDetails}
                onApply={handleApply}
              />
            ))}
          </div>
        )}

        <JobDetailsSheet
          job={selectedJob}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onApply={handleApply}
        />
      </div>
    </DashboardLayout>
  );
}
