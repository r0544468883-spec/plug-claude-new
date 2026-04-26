import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface JobForMatching {
  field_id?: string | null;
  role_id?: string | null;
  experience_level_id?: string | null;
  job_field?: { id: string } | null;
  job_role?: { id: string } | null;
  experience_level?: { id: string } | null;
  // Skill matching — job's required skills or tags
  required_skills?: string[] | null;
  tags?: string[] | null;
}

interface UserPreferences {
  preferred_fields?: string[] | null;
  preferred_roles?: string[] | null;
  preferred_experience_level_id?: string | null;
  skills?: string[] | null;
}

/** Jaccard index: |A ∩ B| / |A ∪ B| — returns 0–1 */
function jaccardIndex(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map(s => s.toLowerCase().trim()));
  const setB = new Set(b.map(s => s.toLowerCase().trim()));
  let intersection = 0;
  setA.forEach(s => { if (setB.has(s)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Returns list of skills present in both job and user profile */
export function getSkillOverlap(job: JobForMatching, preferences: UserPreferences | null): string[] {
  if (!preferences?.skills?.length) return [];
  const jobSkills = [...(job.required_skills ?? []), ...(job.tags ?? [])];
  if (!jobSkills.length) return [];
  const userSet = new Set(preferences.skills.map(s => s.toLowerCase().trim()));
  return jobSkills.filter(s => userSet.has(s.toLowerCase().trim()));
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

  // Field match (35 points)
  if (preferences.preferred_fields && preferences.preferred_fields.length > 0) {
    factors += 35;
    if (jobFieldId && preferences.preferred_fields.includes(jobFieldId)) {
      score += 35;
    }
  }

  // Role match (30 points)
  if (preferences.preferred_roles && preferences.preferred_roles.length > 0) {
    factors += 30;
    if (jobRoleId && preferences.preferred_roles.includes(jobRoleId)) {
      score += 30;
    }
  }

  // Experience level match (20 points)
  if (preferences.preferred_experience_level_id) {
    factors += 20;
    if (jobExpLevelId === preferences.preferred_experience_level_id) {
      score += 20;
    }
  }

  // Skill overlap — Jaccard index (15 points)
  const userSkills = preferences.skills ?? [];
  const jobSkills = [...(job.required_skills ?? []), ...(job.tags ?? [])];
  if (userSkills.length > 0 && jobSkills.length > 0) {
    factors += 15;
    score += Math.round(jaccardIndex(userSkills, jobSkills) * 15);
  }

  if (factors === 0) return 0;

  return Math.round((score / factors) * 100);
}

export interface MatchBreakdownData {
  fieldScore: number;    // 0–100
  roleScore: number;     // 0–100
  expScore: number;      // 0–100
  skillScore: number;    // 0–100 (Jaccard × 100)
  matchingSkills: string[];
  missingSkills: string[];
  totalScore: number;
}

export function getMatchBreakdown(
  job: JobForMatching,
  preferences: UserPreferences | null
): MatchBreakdownData {
  const jobFieldId = job.field_id || job.job_field?.id;
  const jobRoleId = job.role_id || job.job_role?.id;
  const jobExpLevelId = job.experience_level_id || job.experience_level?.id;

  const fieldScore = preferences?.preferred_fields?.length
    ? (jobFieldId && preferences.preferred_fields.includes(jobFieldId) ? 100 : 0)
    : -1; // -1 = not applicable

  const roleScore = preferences?.preferred_roles?.length
    ? (jobRoleId && preferences.preferred_roles.includes(jobRoleId) ? 100 : 0)
    : -1;

  const expScore = preferences?.preferred_experience_level_id
    ? (jobExpLevelId === preferences.preferred_experience_level_id ? 100 : 0)
    : -1;

  const userSkills = (preferences?.skills ?? []).map(s => s.toLowerCase().trim());
  const jobSkills = [...(job.required_skills ?? []), ...(job.tags ?? [])];
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase().trim());

  const matchingSkills = jobSkills.filter((s, i) => userSkills.includes(jobSkillsLower[i]));
  const missingSkills = jobSkills.filter((s, i) => !userSkills.includes(jobSkillsLower[i])).slice(0, 5);

  const skillScore = userSkills.length > 0 && jobSkills.length > 0
    ? Math.round(jaccardIndex(userSkills, jobSkillsLower) * 100)
    : -1;

  return {
    fieldScore,
    roleScore,
    expScore,
    skillScore,
    matchingSkills,
    missingSkills,
    totalScore: calculateMatchScore(job, preferences),
  };
}

/** Fetch all cached AI scores for a list of job IDs (from extension scoring) */
export function useStoredMatchScores(jobIds: string[]): Record<string, number> {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['job_match_scores', user?.id, jobIds.join(',')],
    enabled: !!user && jobIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('job_match_scores')
        .select('job_id, score')
        .eq('user_id', user!.id)
        .in('job_id', jobIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((row: { job_id: string; score: number }) => {
        map[row.job_id] = row.score;
      });
      return map;
    },
  });

  return data ?? {};
}

export function useMatchScore(job: JobForMatching): number {
  const { profile } = useAuth();

  return useMemo(() => {
    return calculateMatchScore(job, profile as UserPreferences);
  }, [job, profile]);
}

export function useMatchScoreForJobs<T extends JobForMatching>(jobs: T[]): (T & { matchScore: number; skillOverlap: string[] })[] {
  const { profile } = useAuth();

  return useMemo(() => {
    return jobs.map(job => ({
      ...job,
      matchScore: calculateMatchScore(job, profile as UserPreferences),
      skillOverlap: getSkillOverlap(job, profile as UserPreferences),
    }));
  }, [jobs, profile]);
}
