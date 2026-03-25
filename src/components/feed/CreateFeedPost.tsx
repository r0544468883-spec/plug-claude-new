import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { VideoPlayer } from './VideoPlayer';
import { Newspaper, Plus, Trash2, Upload, Loader2, Eye, Bell, Globe, MessageCircle } from 'lucide-react';

type PostType = 'tip' | 'culture' | 'poll' | 'visual' | 'video' | 'question' | 'event';

interface PollOptionDraft {
  text: string;
}

export function CreateFeedPost() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  const [postType, setPostType] = useState<PostType>('tip');
  const [content, setContent] = useState('');
  const [contentLang, setContentLang] = useState<'en' | 'he'>(language === 'he' ? 'he' : 'en');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState<PollOptionDraft[]>([{ text: '' }, { text: '' }]);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pushToFollowers, setPushToFollowers] = useState(false);

  // Community targeting
  const [targetType, setTargetType] = useState<'general' | 'hub' | 'channel'>('general');
  const [targetHubId, setTargetHubId] = useState<string>('');
  const [targetChannelId, setTargetChannelId] = useState<string>('');
  const [hubs, setHubs] = useState<{ id: string; name_en: string; name_he: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name_en: string; name_he: string }[]>([]);

  // Comment settings
  const [allowComments, setAllowComments] = useState(true);
  const [commentPermission, setCommentPermission] = useState<'all' | 'members' | 'none'>('all');

  // Event fields
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLink, setEventLink] = useState('');

  // Load communities where user is admin
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('community_members').select('hub_id, role, community_hubs(id, name_en, name_he)').eq('user_id', user.id).eq('role', 'admin').then(({ data }) => {
      if (data) {
        const hubList = data.map((m: any) => m.community_hubs).filter(Boolean);
        setHubs(hubList);
      }
    });
  }, [user?.id]);

  // Load channels when hub is selected
  useEffect(() => {
    if (!targetHubId) { setChannels([]); return; }
    supabase.from('community_channels').select('id, name_en, name_he').eq('hub_id', targetHubId).order('sort_order').then(({ data }) => {
      setChannels(data || []);
    });
  }, [targetHubId]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRTL ? 'הקובץ גדול מדי (מקסימום 100MB)' : 'File too large (max 100MB)');
      return;
    }
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
  };

  const addPollOption = () => {
    if (pollOptions.length >= 4) return;
    setPollOptions([...pollOptions, { text: '' }]);
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  const canPublish = () => {
    if (!content.trim()) return false;
    if (postType === 'poll') return pollOptions.every(o => o.text.trim());
    if (postType === 'event') return eventDate && eventTime;
    return true;
  };

  const handlePublish = async () => {
    if (!user?.id || !canPublish()) return;
    setPublishing(true);

    try {
      let videoUrl: string | null = null;

      if (videoFile) {
        const ext = videoFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('feed-videos').upload(path, videoFile, { contentType: videoFile.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage.from('feed-videos').createSignedUrl(path, 60 * 60 * 24 * 365);
        videoUrl = urlData?.signedUrl || null;
      }

      const { data: profileData } = await supabase.from('profiles').select('active_company_id').eq('user_id', user.id).single();

      const postData: any = {
        author_id: user.id,
        company_id: profileData?.active_company_id || null,
        post_type: postType,
        content_en: contentLang === 'en' ? content : null,
        content_he: contentLang === 'he' ? content : null,
        video_url: videoUrl,
        is_published: true,
        allow_comments: allowComments,
        comment_permission: commentPermission,
        content_language: contentLang,
      };

      if (targetType === 'hub' && targetHubId) postData.target_hub_id = targetHubId;
      if (targetType === 'channel' && targetChannelId) {
        postData.target_hub_id = targetHubId;
        postData.target_channel_id = targetChannelId;
      }

      // Add event info to content if event type
      if (postType === 'event' && eventDate && eventTime) {
        const eventInfo = `\n\n📅 ${eventDate} 🕐 ${eventTime}${eventLink ? `\n🔗 ${eventLink}` : ''}`;
        if (contentLang === 'en') postData.content_en = (postData.content_en || '') + eventInfo;
        else postData.content_he = (postData.content_he || '') + eventInfo;
      }

      const { data: post, error: postError } = await supabase.from('feed_posts').insert(postData).select('id').single();
      if (postError) throw postError;

      if (postType === 'poll' && post) {
        const options = pollOptions.filter(o => o.text.trim()).map(o => ({
          post_id: post.id,
          text_en: contentLang === 'en' ? o.text : o.text,
          text_he: contentLang === 'he' ? o.text : o.text,
        }));
        const { error: optError } = await supabase.from('feed_poll_options').insert(options);
        if (optError) throw optError;
      }

      if (pushToFollowers && post) {
        supabase.functions.invoke('send-content-notifications', {
          body: { postId: post.id, authorId: user.id, companyId: profileData?.active_company_id },
        }).catch(console.error);
      }

      toast.success(isRTL ? 'הפוסט פורסם בהצלחה! 🎉' : 'Post published successfully! 🎉');
      setContent(''); setPostType('tip'); removeVideo();
      setPollOptions([{ text: '' }, { text: '' }]);
      setShowPreview(false); setTargetType('general'); setTargetHubId(''); setTargetChannelId('');
      setEventDate(''); setEventTime(''); setEventLink('');
    } catch (err: any) {
      console.error('Publish error:', err);
      toast.error(isRTL ? 'שגיאה בפרסום הפוסט' : 'Error publishing post');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        {isRTL ? 'יצירת תוכן לפיד' : 'Create Feed Content'}
      </h2>
      <p className="text-muted-foreground text-sm -mt-4">
        {isRTL ? 'פרסמו תוכן שיגיע למועמדים ולקהילות' : 'Publish content that reaches candidates and communities'}
      </p>

      <Card>
        <CardHeader><CardTitle className="text-lg">{isRTL ? 'פוסט חדש' : 'New Post'}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {/* Post Type */}
          <div className="space-y-2">
            <Label>{isRTL ? 'סוג פוסט' : 'Post Type'}</Label>
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tip">{isRTL ? '💡 טיפ' : '💡 Tip'}</SelectItem>
                <SelectItem value="culture">{isRTL ? '🏢 תרבות ארגונית' : '🏢 Culture'}</SelectItem>
                <SelectItem value="poll">{isRTL ? '📊 סקר' : '📊 Poll'}</SelectItem>
                <SelectItem value="visual">{isRTL ? '🖼️ תוכן ויזואלי' : '🖼️ Visual'}</SelectItem>
                <SelectItem value="video">{isRTL ? '🎬 וידאו' : '🎬 Video'}</SelectItem>
                <SelectItem value="question">{isRTL ? '❓ שאלה לקהילה' : '❓ Question'}</SelectItem>
                <SelectItem value="event">{isRTL ? '📅 הזמנה לאירוע' : '📅 Event'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-sm">{isRTL ? 'שפת התוכן:' : 'Content language:'}</Label>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button className={`px-3 py-1 text-sm rounded-md transition-colors ${contentLang === 'he' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setContentLang('he')}>עברית</button>
              <button className={`px-3 py-1 text-sm rounded-md transition-colors ${contentLang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setContentLang('en')}>English</button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>{isRTL ? 'תוכן' : 'Content'}</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={contentLang === 'he' ? 'כתוב את התוכן כאן...' : 'Write your content here...'} dir={contentLang === 'he' ? 'rtl' : 'ltr'} rows={4} />
          </div>

          {/* Event fields */}
          {postType === 'event' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{isRTL ? 'תאריך' : 'Date'}</Label><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>{isRTL ? 'שעה' : 'Time'}</Label><Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>{isRTL ? 'לינק (אופציונלי)' : 'Link (optional)'}</Label><Input value={eventLink} onChange={(e) => setEventLink(e.target.value)} placeholder="https://..." /></div>
            </div>
          )}

          {/* Video/Image Upload */}
          <div className="space-y-2">
            <Label>{isRTL ? 'סרטון / תמונה (אופציונלי)' : 'Video / Image (optional)'}</Label>
            {videoPreviewUrl ? (
              <div className="space-y-2">
                <VideoPlayer src={videoPreviewUrl} />
                <Button variant="outline" size="sm" onClick={removeVideo} className="gap-2"><Trash2 className="w-4 h-4" />{isRTL ? 'הסר' : 'Remove'}</Button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{isRTL ? 'לחצו להעלאת קובץ (עד 100MB)' : 'Click to upload file (up to 100MB)'}</span>
                <input type="file" accept="video/*,image/*" className="hidden" onChange={handleVideoChange} />
              </label>
            )}
          </div>

          {/* Poll Options */}
          {postType === 'poll' && (
            <div className="space-y-3">
              <Label>{isRTL ? 'אפשרויות סקר' : 'Poll Options'}</Label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={opt.text} onChange={(e) => { const u = [...pollOptions]; u[idx] = { text: e.target.value }; setPollOptions(u); }} placeholder={`${isRTL ? 'אפשרות' : 'Option'} ${idx + 1}`} className="flex-1" />
                  {pollOptions.length > 2 && <Button variant="ghost" size="icon" onClick={() => removePollOption(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              ))}
              {pollOptions.length < 4 && <Button variant="outline" size="sm" onClick={addPollOption} className="gap-2"><Plus className="w-4 h-4" />{isRTL ? 'הוסף אפשרות' : 'Add Option'}</Button>}
            </div>
          )}

          {/* Publish Target */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Globe className="w-4 h-4" />{isRTL ? 'פרסום ל...' : 'Publish to...'}</Label>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v as any); setTargetHubId(''); setTargetChannelId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{isRTL ? '🌐 כל המשתמשים' : '🌐 Everyone'}</SelectItem>
                <SelectItem value="hub">{isRTL ? '👥 קהילה ספציפית' : '👥 Specific Community'}</SelectItem>
                <SelectItem value="channel">{isRTL ? '💬 ערוץ ספציפי' : '💬 Specific Channel'}</SelectItem>
              </SelectContent>
            </Select>
            {(targetType === 'hub' || targetType === 'channel') && (
              <Select value={targetHubId} onValueChange={setTargetHubId}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'בחר קהילה' : 'Select community'} /></SelectTrigger>
                <SelectContent>{hubs.map(h => <SelectItem key={h.id} value={h.id}>{isRTL ? h.name_he : h.name_en}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {targetType === 'channel' && targetHubId && channels.length > 0 && (
              <Select value={targetChannelId} onValueChange={setTargetChannelId}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'בחר ערוץ' : 'Select channel'} /></SelectTrigger>
                <SelectContent>{channels.map(c => <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_he : c.name_en}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>

          {/* Comment Settings */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <Label className="flex-1">{isRTL ? 'אפשר תגובות' : 'Allow Comments'}</Label>
              <Switch checked={allowComments} onCheckedChange={setAllowComments} />
            </div>
            {allowComments && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{isRTL ? 'מי יכול להגיב?' : 'Who can comment?'}</Label>
                <Select value={commentPermission} onValueChange={(v) => setCommentPermission(v as any)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'כולם' : 'Everyone'}</SelectItem>
                    <SelectItem value="members">{isRTL ? 'חברי קהילה בלבד' : 'Members only'}</SelectItem>
                    <SelectItem value="none">{isRTL ? 'אף אחד' : 'No one'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Push to Followers */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-sm font-medium">{isRTL ? 'שלח לעוקבים' : 'Push to Followers'}</Label>
              <p className="text-xs text-muted-foreground">{isRTL ? 'ישלח התראה לכל מי שעוקב אחריך' : 'Sends notification to all followers'}</p>
            </div>
            <Switch checked={pushToFollowers} onCheckedChange={setPushToFollowers} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="gap-2"><Eye className="w-4 h-4" />{isRTL ? 'תצוגה מקדימה' : 'Preview'}</Button>
            <Button onClick={handlePublish} disabled={!canPublish() || publishing} className="gap-2 flex-1">
              {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRTL ? 'פרסם' : 'Publish'}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">{isRTL ? 'תצוגה מקדימה:' : 'Preview:'}</p>
                <p className="text-sm leading-relaxed">{content || '—'}</p>
                {videoPreviewUrl && <div className="mt-3"><VideoPlayer src={videoPreviewUrl} /></div>}
                {postType === 'poll' && (
                  <div className="mt-3 space-y-2">
                    {pollOptions.filter(o => o.text).map((o, i) => (
                      <div key={i} className="p-2 rounded bg-background border text-sm">{o.text}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
