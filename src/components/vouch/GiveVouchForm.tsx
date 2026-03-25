import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, X, Loader2 } from 'lucide-react';

const vouchSchema = z.object({
  vouch_type: z.enum(['colleague', 'manager', 'recruiter', 'friend', 'mentor']),
  relationship: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  skills: z.array(z.string()).optional(),
});

type VouchFormData = z.infer<typeof vouchSchema>;

interface GiveVouchFormProps {
  toUserId: string;
  toUserName: string;
  trigger?: React.ReactNode;
}

const vouchTypeOptions = [
  { value: 'colleague', label: { en: 'Colleague', he: 'עמית' }, icon: '👥' },
  { value: 'manager', label: { en: 'Manager', he: 'מנהל' }, icon: '👔' },
  { value: 'recruiter', label: { en: 'Recruiter', he: 'מגייס' }, icon: '🎯' },
  { value: 'friend', label: { en: 'Friend', he: 'חבר' }, icon: '🤝' },
  { value: 'mentor', label: { en: 'Mentor', he: 'מנטור' }, icon: '🌟' },
];

export function GiveVouchForm({ toUserId, toUserName, trigger }: GiveVouchFormProps) {
  const [open, setOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const form = useForm<VouchFormData>({
    resolver: zodResolver(vouchSchema),
    defaultValues: {
      vouch_type: 'colleague',
      relationship: '',
      message: '',
      skills: [],
    },
  });

  const createVouchMutation = useMutation({
    mutationFn: async (data: VouchFormData) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('vouches').insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        vouch_type: data.vouch_type,
        relationship: data.relationship || null,
        message: data.message,
        skills: skills.length > 0 ? skills : null,
        is_public: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouches', toUserId] });
      toast({
        title: isHebrew ? 'ה-Vouch נשלח!' : 'Vouch sent!',
        description: isHebrew 
          ? `תודה שנתת Vouch ל-${toUserName}`
          : `Thank you for vouching for ${toUserName}`,
      });
      setOpen(false);
      form.reset();
      setSkills([]);
    },
    onError: (error: Error) => {
      toast({
        title: isHebrew ? 'שגיאה' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const onSubmit = (data: VouchFormData) => {
    createVouchMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Heart className="h-4 w-4" />
            {isHebrew ? 'תן Vouch' : 'Give Vouch'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isHebrew ? `Vouch עבור ${toUserName}` : `Vouch for ${toUserName}`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vouch_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isHebrew ? 'סוג קשר' : 'Relationship Type'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vouchTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.icon} {isHebrew ? option.label.he : option.label.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isHebrew ? 'איך אתם מכירים?' : 'How do you know them?'}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={isHebrew ? 'עבדנו יחד ב-Google' : 'We worked together at Google'} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isHebrew ? 'ההמלצה שלך' : 'Your Recommendation'}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={isHebrew 
                        ? 'ספר על החוויה שלך לעבוד עם האדם הזה...' 
                        : 'Tell us about your experience working with this person...'
                      }
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>{isHebrew ? 'מיומנויות' : 'Skills'}</FormLabel>
              <div className="flex gap-2 mt-1">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder={isHebrew ? 'הוסף מיומנות' : 'Add a skill'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddSkill}>
                  +
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="gap-1 cursor-pointer"
                      onClick={() => handleRemoveSkill(skill)}
                    >
                      {skill}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createVouchMutation.isPending}
            >
              {createVouchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  {isHebrew ? 'שלח Vouch' : 'Send Vouch'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
