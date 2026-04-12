import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useToast } from '@/hooks/use-toast';
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
import { Heart, Loader2 } from 'lucide-react';
import { SkillSearch } from './SkillSearch';

interface MasterSkill {
  id: string;
  name_en: string;
  name_he: string;
  category_en: string;
  category_he: string;
  skill_type: 'hard' | 'soft';
  is_custom: boolean;
}

const vouchSchema = z.object({
  vouch_type: z.enum(['colleague', 'manager', 'recruiter', 'friend', 'mentor']),
  relationship: z.string().optional(),
  message: z.string().min(30, 'Message must be at least 30 characters'),
});

type VouchFormData = z.infer<typeof vouchSchema>;

interface VouchFormContentProps {
  toUserId: string;
  toUserName: string;
  onSuccess?: () => void;
}

const vouchTypeOptions = [
  { value: 'colleague', label: { en: 'Colleague', he: 'עמית' }, icon: '👥' },
  { value: 'manager', label: { en: 'Manager', he: 'מנהל' }, icon: '👔' },
  { value: 'recruiter', label: { en: 'Recruiter', he: 'מגייס' }, icon: '🎯' },
  { value: 'friend', label: { en: 'Friend', he: 'חבר' }, icon: '🤝' },
  { value: 'mentor', label: { en: 'Mentor', he: 'מנטור' }, icon: '🌟' },
];

export function VouchFormContent({ toUserId, toUserName, onSuccess }: VouchFormContentProps) {
  const [selectedSkills, setSelectedSkills] = useState<MasterSkill[]>([]);
  const { user } = useAuth();
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const form = useForm<VouchFormData>({
    resolver: zodResolver(vouchSchema),
    defaultValues: {
      vouch_type: 'colleague',
      relationship: '',
      message: '',
    },
  });

  const createVouchMutation = useMutation({
    mutationFn: async (data: VouchFormData) => {
      if (!user) throw new Error('Not authenticated');
      
      // Calculate weight based on giver's status
      const skillIds = selectedSkills.map(s => s.id);
      const { data: weightData } = await supabase
        .rpc('calculate_vouch_weight', { 
          giver_id: user.id, 
          skill_ids: skillIds 
        });
      
      const weight = weightData || 1;
      
      const { error } = await supabase.from('vouches').insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        vouch_type: data.vouch_type,
        relationship: data.relationship || null,
        message: data.message,
        skill_ids: skillIds.length > 0 ? skillIds : null,
        skills: selectedSkills.map(s => isHebrew ? s.name_he : s.name_en),
        is_public: true,
        weight: weight,
      });

      if (error) throw error;

      // Check if this is a reciprocal vouch (they vouched for us first)
      const { data: existingVouch } = await supabase
        .from('vouches')
        .select('id')
        .eq('from_user_id', toUserId)
        .eq('to_user_id', user.id)
        .limit(1)
        .maybeSingle();

      return { isReciprocal: !!existingVouch };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['vouches', toUserId] });
      queryClient.invalidateQueries({ queryKey: ['vouches-with-skills', toUserId] });
      queryClient.invalidateQueries({ queryKey: ['vouch-discovery'] });

      // Award credits — reciprocal gets bonus XP
      if (result?.isReciprocal) {
        await awardCredits('vouch_reciprocal');
      } else {
        await awardCredits('vouch_given');
      }

      // Auto-connect: send connection request (or auto-accept if reciprocal vouch)
      try {
        const vouchType = form.getValues('vouch_type');
        const circle = vouchType === 'recruiter' ? 'recruiter' : 'colleague';

        // Check if connection already exists
        const { data: existingConn } = await (supabase as any)
          .from('connections')
          .select('id, status')
          .or(`and(requester_id.eq.${user!.id},addressee_id.eq.${toUserId}),and(requester_id.eq.${toUserId},addressee_id.eq.${user!.id})`)
          .limit(1)
          .maybeSingle();

        if (!existingConn) {
          // No connection — create one. If reciprocal vouch, auto-accept.
          await (supabase as any).from('connections').insert({
            requester_id: user!.id,
            addressee_id: toUserId,
            circle,
            status: result?.isReciprocal || circle === 'recruiter' ? 'accepted' : 'pending',
            accepted_at: result?.isReciprocal || circle === 'recruiter' ? new Date().toISOString() : null,
            source: 'vouch',
          });
        } else if (existingConn.status === 'pending' && result?.isReciprocal) {
          // Pending connection + reciprocal vouch → auto-accept
          await (supabase as any).from('connections')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', existingConn.id);
        }

        queryClient.invalidateQueries({ queryKey: ['connections'] });
      } catch (e) {
        console.warn('[VouchFormContent] Auto-connect failed:', e);
      }

      toast({
        title: isHebrew ? 'ה-Vouch נשלח!' : 'Vouch sent!',
        description: isHebrew 
          ? `תודה שנתת Vouch ל-${toUserName}`
          : `Thank you for vouching for ${toUserName}`,
      });
      form.reset();
      setSelectedSkills([]);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: isHebrew ? 'שגיאה' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: VouchFormData) => {
    createVouchMutation.mutate(data);
  };

  return (
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

        {/* Skills Section */}
        <div className="space-y-2">
          <FormLabel>{isHebrew ? 'מיומנויות להמלצה' : 'Skills to Endorse'}</FormLabel>
          <SkillSearch
            selectedSkills={selectedSkills}
            onSkillsChange={setSelectedSkills}
            maxSkills={10}
          />
        </div>

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
  );
}
