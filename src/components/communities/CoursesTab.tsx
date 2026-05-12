import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, BookOpen, Users, Star, Clock, GraduationCap, Loader2,
  ChevronRight, ChevronLeft, Play, CheckCircle2, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CertificateView } from './CertificateView';
import { CourseRatings } from './CourseRatings';
import { QuizPlayer } from './QuizPlayer';

interface CoursesTabProps {
  hubId: string;
  isAdmin: boolean;
}

export function CoursesTab({ hubId, isAdmin }: CoursesTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const ChevronIcon = isHebrew ? ChevronLeft : ChevronRight;

  // Fetch courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['community-courses', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_courses')
        .select('*')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user enrollments
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('community_enrollments')
        .select('course_id')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const enrolledCourseIds = new Set(myEnrollments.map((e: any) => e.course_id));

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any).from('community_enrollments').insert({
        course_id: courseId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'נרשמת לקורס!' : 'Enrolled successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['community-courses', hubId] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בהרשמה' : 'Failed to enroll'),
  });

  if (selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        isAdmin={isAdmin}
        onBack={() => setSelectedCourseId(null)}
      />
    );
  }

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          {isHebrew ? 'קורסים' : 'Courses'}
        </h3>
        {isAdmin && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                {isHebrew ? 'קורס חדש' : 'New Course'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir={isHebrew ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{isHebrew ? 'יצירת קורס חדש' : 'Create New Course'}</DialogTitle>
              </DialogHeader>
              <CreateCourseForm
                hubId={hubId}
                onSuccess={() => {
                  setShowCreate(false);
                  queryClient.invalidateQueries({ queryKey: ['community-courses', hubId] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {isHebrew ? 'אין קורסים עדיין' : 'No courses yet'}
            </p>
            {isAdmin && (
              <Button variant="outline" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                {isHebrew ? 'צור את הקורס הראשון' : 'Create your first course'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses
            .filter((c: any) => c.is_published || isAdmin)
            .map((course: any) => {
              const enrolled = enrolledCourseIds.has(course.id);
              const title = isHebrew ? (course.title_he || course.title) : course.title;
              const desc = isHebrew ? (course.description_he || course.description) : course.description;

              return (
                <Card
                  key={course.id}
                  className={cn(
                    'hover:shadow-md transition-all cursor-pointer group',
                    !course.is_published && 'opacity-70 border-dashed'
                  )}
                  onClick={() => enrolled || isAdmin ? setSelectedCourseId(course.id) : undefined}
                >
                  {/* Banner */}
                  {course.banner_url ? (
                    <div className="h-32 bg-cover bg-center rounded-t-xl" style={{ backgroundImage: `url(${course.banner_url})` }} />
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-xl flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-primary/40" />
                    </div>
                  )}

                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{title}</h4>
                        {desc && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{desc}</p>}
                      </div>
                      {!course.is_published && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {isHebrew ? 'טיוטה' : 'Draft'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {course.enrollment_count}
                      </span>
                      {course.rating_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          {Number(course.rating_avg).toFixed(1)}
                        </span>
                      )}
                      {!course.is_free && (
                        <Badge variant="secondary" className="text-xs">
                          {course.currency} {course.cost}
                        </Badge>
                      )}
                      {course.is_free && (
                        <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                          {isHebrew ? 'חינם' : 'Free'}
                        </Badge>
                      )}
                    </div>

                    {/* Action */}
                    {enrolled ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={(e) => { e.stopPropagation(); setSelectedCourseId(course.id); }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        {isHebrew ? 'המשך ללמוד' : 'Continue Learning'}
                        <ChevronIcon className="w-3.5 h-3.5 ms-auto" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={(e) => { e.stopPropagation(); enrollMutation.mutate(course.id); }}
                        disabled={enrollMutation.isPending}
                      >
                        {enrollMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
                        {isHebrew ? 'הירשם לקורס' : 'Enroll'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ==================== Create Course Form ====================

function CreateCourseForm({ hubId, onSuccess }: { hubId: string; onSuccess: () => void }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [title, setTitle] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [desc, setDesc] = useState('');
  const [descHe, setDescHe] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [cost, setCost] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim()) throw new Error('Missing data');
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { error } = await (supabase as any).from('community_courses').insert({
        hub_id: hubId,
        creator_id: user.id,
        title: title.trim(),
        title_he: titleHe.trim() || title.trim(),
        slug: `${slug}-${Date.now().toString(36)}`,
        description: desc.trim(),
        description_he: descHe.trim(),
        is_free: isFree,
        cost: isFree ? 0 : parseFloat(cost) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הקורס נוצר!' : 'Course created!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title (English)</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. HR Fundamentals" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">כותרת (עברית)</Label>
          <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="לדוגמה: יסודות HR" dir="rtl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="resize-none min-h-[60px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">תיאור</Label>
          <Textarea value={descHe} onChange={e => setDescHe(e.target.value)} className="resize-none min-h-[60px]" dir="rtl" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{isHebrew ? 'קורס חינמי' : 'Free course'}</Label>
        <Switch checked={isFree} onCheckedChange={setIsFree} />
      </div>
      {!isFree && (
        <div className="space-y-1.5">
          <Label className="text-xs">{isHebrew ? 'מחיר (ILS)' : 'Price (ILS)'}</Label>
          <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="99" />
        </div>
      )}
      <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} className="w-full gap-2">
        {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isHebrew ? 'צור קורס' : 'Create Course'}
      </Button>
    </div>
  );
}

// ==================== Course Detail ====================

function CourseDetail({ courseId, isAdmin, onBack }: { courseId: string; isAdmin: boolean; onBack: () => void }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ['community-course', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['community-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['my-lesson-completions', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const lessonIds = lessons.map((l: any) => l.id);
      if (lessonIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('community_lesson_completions')
        .select('lesson_id')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);
      return data || [];
    },
    enabled: !!user?.id && lessons.length > 0,
  });

  const completedIds = new Set(completions.map((c: any) => c.lesson_id));
  const progressPct = lessons.length > 0 ? Math.round((completedIds.size / lessons.length) * 100) : 0;

  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) return;
      const { error } = await (supabase as any).from('community_lesson_completions').insert({
        lesson_id: lessonId,
        user_id: user.id,
      });
      if (error && !error.message?.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lesson-completions', courseId] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('community_courses')
        .update({ is_published: !course?.is_published })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'סטטוס עודכן' : 'Status updated');
      queryClient.invalidateQueries({ queryKey: ['community-course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['community-courses'] });
    },
  });

  const BackIcon = isHebrew ? ChevronRight : ChevronLeft;
  const title = course ? (isHebrew ? (course.title_he || course.title) : course.title) : '';

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <BackIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{course?.enrollment_count || 0} {isHebrew ? 'תלמידים' : 'students'}</span>
            <span>{lessons.length} {isHebrew ? 'שיעורים' : 'lessons'}</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => publishMutation.mutate()}>
              {course?.is_published
                ? (isHebrew ? 'הסתר' : 'Unpublish')
                : (isHebrew ? 'פרסם' : 'Publish')}
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setShowAddLesson(true)}>
              <Plus className="w-3.5 h-3.5" />
              {isHebrew ? 'שיעור' : 'Lesson'}
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isAdmin && lessons.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isHebrew ? 'התקדמות' : 'Progress'}</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {/* Lessons list */}
      {lessons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>{isHebrew ? 'אין שיעורים עדיין' : 'No lessons yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson: any, idx: number) => {
            const completed = completedIds.has(lesson.id);
            const lessonTitle = isHebrew ? (lesson.title_he || lesson.title) : lesson.title;

            return (
              <div key={lesson.id} className="space-y-1">
              <Card
                className={cn(
                  'transition-colors hover:bg-muted/30 cursor-pointer',
                  completed && 'bg-green-50/50 border-green-200'
                )}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium',
                    completed ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  )}>
                    {completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lessonTitle}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {lesson.duration_minutes} {isHebrew ? 'דק\'' : 'min'}
                        </span>
                      )}
                      {lesson.video_url && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Play className="w-2.5 h-2.5 me-0.5" />
                          {isHebrew ? 'וידאו' : 'Video'}
                        </Badge>
                      )}
                      {lesson.is_free_preview && (
                        <Badge className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100">
                          {isHebrew ? 'תצוגה מקדימה' : 'Preview'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); setQuizLessonId(quizLessonId === lesson.id ? null : lesson.id); }}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      {isHebrew ? 'בוחן' : 'Quiz'}
                    </Button>
                    {!completed && !isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); completeLessonMutation.mutate(lesson.id); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isHebrew ? 'סיימתי' : 'Done'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              {quizLessonId === lesson.id && (
                <div className="ms-11">
                  <QuizPlayer lessonId={lesson.id} isAdmin={isAdmin} />
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate */}
      <CertificateView
        courseId={courseId}
        courseTitle={course?.title || ''}
        courseTitleHe={course?.title_he}
        progressPct={progressPct}
        isAdmin={isAdmin}
      />

      {/* Ratings */}
      <CourseRatings courseId={courseId} isEnrolled={!isAdmin} />

      {/* Add Lesson Dialog */}
      <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
        <DialogContent className="max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{isHebrew ? 'הוספת שיעור' : 'Add Lesson'}</DialogTitle>
          </DialogHeader>
          <AddLessonForm
            courseId={courseId}
            sortOrder={lessons.length}
            onSuccess={() => {
              setShowAddLesson(false);
              queryClient.invalidateQueries({ queryKey: ['community-lessons', courseId] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Add Lesson Form ====================

function AddLessonForm({ courseId, sortOrder, onSuccess }: { courseId: string; sortOrder: number; onSuccess: () => void }) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [title, setTitle] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title required');
      const { error } = await (supabase as any).from('community_lessons').insert({
        course_id: courseId,
        title: title.trim(),
        title_he: titleHe.trim() || title.trim(),
        video_url: videoUrl.trim() || null,
        duration_minutes: duration ? parseInt(duration) : null,
        sort_order: sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'השיעור נוסף!' : 'Lesson added!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lesson title" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">כותרת</Label>
          <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="כותרת השיעור" dir="rtl" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{isHebrew ? 'קישור לוידאו (YouTube / Vimeo)' : 'Video URL (YouTube / Vimeo)'}</Label>
        <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." dir="ltr" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{isHebrew ? 'אורך (דקות)' : 'Duration (minutes)'}</Label>
        <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="30" />
      </div>
      <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} className="w-full gap-2">
        {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isHebrew ? 'הוסף שיעור' : 'Add Lesson'}
      </Button>
    </div>
  );
}
