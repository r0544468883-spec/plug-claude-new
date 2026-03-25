import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { MapPin, BarChart3, Briefcase, TrendingUp, Building2, Zap, Home, Users } from 'lucide-react';

interface JobInsightsStatsProps {
  jobs: Array<{
    id: string;
    location?: string | null;
    job_type?: string | null;
    field_id?: string | null;
    experience_level_id?: string | null;
    description?: string | null;
    requirements?: string | null;
    salary_range?: string | null;
    job_field?: { name_en?: string; name_he?: string; slug?: string } | null;
    experience_level?: { name_en?: string; name_he?: string; slug?: string } | null;
  }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)', // green
  'hsl(217, 91%, 60%)', // blue
  'hsl(271, 91%, 65%)', // purple
  'hsl(38, 92%, 50%)',  // orange
  'hsl(340, 82%, 52%)', // pink
  'hsl(var(--muted-foreground))',
];

const WORK_TYPE_COLORS = {
  remote: 'hsl(142, 76%, 36%)',
  hybrid: 'hsl(38, 92%, 50%)',
  onsite: 'hsl(217, 91%, 60%)',
};

// Extract skills from job descriptions
function extractSkills(jobs: JobInsightsStatsProps['jobs'], isHebrew: boolean): { skill: string; count: number }[] {
  const skillKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'AWS', 'Docker',
    'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL', 'Git', 'CI/CD', 'Agile', 'Scrum',
    'REST', 'GraphQL', 'Vue', 'Angular', 'Next.js', 'TailwindCSS', 'Figma',
    'Product Management', 'Leadership', 'Communication', 'Problem Solving',
  ];
  
  const skillCounts: Record<string, number> = {};
  
  jobs.forEach(job => {
    const text = ((job.description || '') + ' ' + (job.requirements || '')).toLowerCase();
    skillKeywords.forEach(skill => {
      if (text.includes(skill.toLowerCase())) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
    });
  });
  
  return Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Detect work type from job
function detectWorkType(job: JobInsightsStatsProps['jobs'][0]): 'remote' | 'hybrid' | 'onsite' {
  const text = ((job.description || '') + ' ' + (job.location || '') + ' ' + (job.job_type || '')).toLowerCase();
  
  if (text.includes('remote') || text.includes('מרחוק') || text.includes('עבודה מהבית')) {
    return 'remote';
  }
  if (text.includes('hybrid') || text.includes('היברידי') || text.includes('היברידית')) {
    return 'hybrid';
  }
  return 'onsite';
}

export function JobInsightsStats({ jobs }: JobInsightsStatsProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Aggregate jobs by city
  const cityData = useMemo(() => {
    const cityMap: Record<string, number> = {};
    
    jobs.forEach(job => {
      if (job.location) {
        const city = job.location.split(',')[0].trim();
        cityMap[city] = (cityMap[city] || 0) + 1;
      } else {
        const unknownKey = isHebrew ? 'לא צוין' : 'Not specified';
        cityMap[unknownKey] = (cityMap[unknownKey] || 0) + 1;
      }
    });

    const sorted = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length > 6) {
      const top6 = sorted.slice(0, 6);
      const otherCount = sorted.slice(6).reduce((sum, item) => sum + item.value, 0);
      top6.push({ name: isHebrew ? 'אחר' : 'Other', value: otherCount });
      return top6;
    }

    return sorted;
  }, [jobs, isHebrew]);

  // Aggregate by field
  const fieldData = useMemo(() => {
    const fieldMap: Record<string, number> = {};
    
    jobs.forEach(job => {
      const fieldName = isHebrew 
        ? (job.job_field?.name_he || 'לא צוין')
        : (job.job_field?.name_en || 'Not specified');
      fieldMap[fieldName] = (fieldMap[fieldName] || 0) + 1;
    });

    return Object.entries(fieldMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [jobs, isHebrew]);

  // Aggregate by experience level
  const experienceData = useMemo(() => {
    const expMap: Record<string, number> = {};
    
    jobs.forEach(job => {
      const expName = isHebrew
        ? (job.experience_level?.name_he || 'לא צוין')
        : (job.experience_level?.name_en || 'Not specified');
      expMap[expName] = (expMap[expName] || 0) + 1;
    });

    return Object.entries(expMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [jobs, isHebrew]);

  // Work type distribution
  const workTypeData = useMemo(() => {
    const counts = { remote: 0, hybrid: 0, onsite: 0 };
    
    jobs.forEach(job => {
      const type = detectWorkType(job);
      counts[type]++;
    });

    return [
      { name: isHebrew ? 'מרחוק' : 'Remote', value: counts.remote, color: WORK_TYPE_COLORS.remote },
      { name: isHebrew ? 'היברידי' : 'Hybrid', value: counts.hybrid, color: WORK_TYPE_COLORS.hybrid },
      { name: isHebrew ? 'במשרד' : 'On-site', value: counts.onsite, color: WORK_TYPE_COLORS.onsite },
    ].filter(item => item.value > 0);
  }, [jobs, isHebrew]);

  // Trending skills
  const trendingSkills = useMemo(() => extractSkills(jobs, isHebrew), [jobs, isHebrew]);

  // Salary distribution
  const salaryData = useMemo(() => {
    const salaryMap: Record<string, number> = {};
    
    jobs.forEach(job => {
      if (job.salary_range) {
        salaryMap[job.salary_range] = (salaryMap[job.salary_range] || 0) + 1;
      }
    });

    return Object.entries(salaryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [jobs]);

  if (jobs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Jobs by City - Pie Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {isHebrew ? 'משרות לפי עיר' : 'Jobs by City'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {cityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      className="stroke-background"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} ${isHebrew ? 'משרות' : 'jobs'}`,
                    ''
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value: string, entry: any) => (
                    <span className="text-xs text-foreground">
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Work Type Distribution - Donut */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />
            {isHebrew ? 'סוג עבודה' : 'Work Type'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={workTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {workTypeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="stroke-background"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} ${isHebrew ? 'משרות' : 'jobs'}`,
                    ''
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value: string, entry: any) => (
                    <span className="text-xs text-foreground">
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Jobs by Field - Bar Chart */}
      {fieldData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              {isHebrew ? 'משרות לפי תחום' : 'Jobs by Field'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fieldData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}`, isHebrew ? 'משרות' : 'Jobs']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experience Level Distribution */}
      {experienceData.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {isHebrew ? 'רמת ניסיון' : 'Experience Level'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={experienceData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}`, isHebrew ? 'משרות' : 'Jobs']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trending Skills */}
      {trendingSkills.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {isHebrew ? 'כישורים נדרשים' : 'In-Demand Skills'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {trendingSkills.map((skill, index) => (
                <Badge 
                  key={skill.skill} 
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: index < 3 
                      ? 'hsl(var(--primary) / 0.2)' 
                      : 'hsl(var(--muted))',
                    borderColor: index < 3 
                      ? 'hsl(var(--primary) / 0.3)' 
                      : 'transparent',
                  }}
                >
                  {skill.skill}
                  <span className="ml-1 opacity-60">({skill.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            {isHebrew ? 'סיכום מהיר' : 'Quick Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isHebrew ? 'סה"כ משרות' : 'Total Jobs'}
            </span>
            <span className="font-bold text-foreground">{jobs.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isHebrew ? 'ערים' : 'Cities'}
            </span>
            <span className="font-bold text-foreground">{cityData.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isHebrew ? 'עבודה מרחוק' : 'Remote Jobs'}
            </span>
            <span className="font-bold text-primary">
              {workTypeData.find(w => w.name.includes('Remote') || w.name.includes('מרחוק'))?.value || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isHebrew ? 'תחומים' : 'Fields'}
            </span>
            <span className="font-bold text-foreground">{fieldData.length}</span>
          </div>
          {salaryData.length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {isHebrew ? 'טווחי שכר נפוצים:' : 'Common salary ranges:'}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {salaryData.slice(0, 3).map(s => (
                  <Badge key={s.name} variant="outline" className="text-xs">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
