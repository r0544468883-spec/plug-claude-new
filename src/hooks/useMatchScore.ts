import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface JobForMatching {
  field_id?: string | null;
  role_id?: string | null;
  experience_level_id?: string | null;
  job_field?: { id: string } | null;
  job_role?: { id: string } | null;
  experience_level?: { id: string } | null;
}

interface UserPreferences {
  preferred_fields?: string[] | null;
  preferred_roles?: string[] | null;
  preferred_experience_level_id?: string | null;
}

export function calculateMatchScore(
  job: JobForMatching,
  preferences: UserPreferences | null
): number {
  if (!preferences) return 0;

  let score = 0;
  let factors = 0;

  const jobFieldId = job.field_id || job.job_field?.id;
  const jobRoleId = job.role_id || job.job_role?.id;
  const jobExpLevelId = job.experience_level_id || job.experience_level?.id;

  // Field match (40 points)
  if (preferences.preferred_fields && preferences.preferred_fields.length > 0) {
    factors += 40;
    if (jobFieldId && preferences.preferred_fields.includes(jobFieldId)) {
      score += 40;
    }
  }

  // Role match (35 points)
  if (preferences.preferred_roles && preferences.preferred_roles.length > 0) {
    factors += 35;
    if (jobRoleId && preferences.preferred_roles.includes(jobRoleId)) {
      score += 35;
    }
  }

  // Experience level match (25 points)
  if (preferences.preferred_experience_level_id) {
    factors += 25;
    if (jobExpLevelId === preferences.preferred_experience_level_id) {
      score += 25;
    }
  }

  // If user has no preferences set, return 0
  if (factors === 0) return 0;

  // Normalize to 100
  return Math.round((score / factors) * 100);
}

export function useMatchScore(job: JobForMatching): number {
  const { profile } = useAuth();

  return useMemo(() => {
    return calculateMatchScore(job, profile as UserPreferences);
  }, [job, profile]);
}

export function useMatchScoreForJobs<T extends JobForMatching>(jobs: T[]): (T & { matchScore: number })[] {
  const { profile } = useAuth();

  return useMemo(() => {
    return jobs.map(job => ({
      ...job,
      matchScore: calculateMatchScore(job, profile as UserPreferences)
    }));
  }, [jobs, profile]);
}
