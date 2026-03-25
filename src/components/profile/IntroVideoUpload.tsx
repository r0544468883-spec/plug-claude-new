import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, Loader2, Trash2, Upload, Play } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IntroVideoUploadProps {
  userId: string;
  currentVideoUrl: string | null;
  onUpload: (url: string | null) => void;
}

export function IntroVideoUpload({ userId, currentVideoUrl, onUpload }: IntroVideoUploadProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_DURATION = 60; // 60 seconds

  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_DURATION) {
          toast.error(
            isHebrew 
              ? `הסרטון ארוך מדי. מקסימום ${MAX_DURATION} שניות` 
              : `Video is too long. Maximum ${MAX_DURATION} seconds`
          );
          resolve(false);
        } else {
          resolve(true);
        }
      };
      
      video.onerror = () => {
        toast.error(isHebrew ? 'שגיאה בקריאת הסרטון' : 'Error reading video');
        resolve(false);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error(
        isHebrew 
          ? 'יש להעלות סרטון בפורמט MP4, WebM או MOV' 
          : 'Please upload a video in MP4, WebM or MOV format'
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        isHebrew 
          ? 'גודל הקובץ מקסימלי: 50MB' 
          : 'Maximum file size: 50MB'
      );
      return;
    }

    // Validate duration
    const isValid = await validateVideo(file);
    if (!isValid) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/intro-${Date.now()}.${fileExt}`;

      // Delete old video if exists
      if (currentVideoUrl) {
        const oldPath = currentVideoUrl.split('/profile-videos/')[1]?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('profile-videos').remove([oldPath]);
        }
      }

      // Upload new video
      const { error: uploadError } = await supabase.storage
        .from('profile-videos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get signed URL (private bucket)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('profile-videos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (signedError) throw signedError;

      // Store the path, not the signed URL (we'll generate signed URLs on demand)
      const videoPath = `profile-videos/${fileName}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ intro_video_url: videoPath })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onUpload(signedData.signedUrl);
      toast.success(isHebrew ? 'הסרטון הועלה!' : 'Video uploaded!');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      const msg = error?.message || error?.error || JSON.stringify(error);
      toast.error(`שגיאה בסרטון: ${msg}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveVideo = async () => {
    if (!currentVideoUrl) return;

    setIsUploading(true);
    try {
      // Extract path from URL or stored path
      let videoPath = currentVideoUrl;
      if (currentVideoUrl.includes('/profile-videos/')) {
        videoPath = currentVideoUrl.split('/profile-videos/')[1]?.split('?')[0] || '';
      } else if (currentVideoUrl.startsWith('profile-videos/')) {
        videoPath = currentVideoUrl.replace('profile-videos/', '');
      }

      if (videoPath) {
        await supabase.storage.from('profile-videos').remove([videoPath]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ intro_video_url: null })
        .eq('user_id', userId);

      if (error) throw error;

      onUpload(null);
      toast.success(isHebrew ? 'הסרטון הוסר' : 'Video removed');
    } catch (error) {
      console.error('Error removing video:', error);
      toast.error(isHebrew ? 'שגיאה בהסרת הסרטון' : 'Error removing video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {currentVideoUrl ? (
        <div className="space-y-3">
          <Card className="overflow-hidden bg-muted/30">
            <video
              ref={videoPreviewRef}
              src={currentVideoUrl}
              controls
              className="w-full max-h-[300px] object-contain"
              preload="metadata"
            />
          </Card>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Video className="w-4 h-4 me-1" />
              {isHebrew ? 'החלף סרטון' : 'Replace Video'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveVideo}
              disabled={isUploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 me-1" />
              {isHebrew ? 'הסר' : 'Remove'}
            </Button>
          </div>
        </div>
      ) : (
        <Card
          className={cn(
            'border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50',
            isUploading && 'pointer-events-none opacity-60'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'מעלה סרטון...' : 'Uploading video...'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {isHebrew ? 'העלה סרטון היכרות' : 'Upload Introduction Video'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isHebrew 
                    ? 'גרור לכאן או לחץ לבחירה • עד 60 שניות • עד 50MB'
                    : 'Drag here or click to select • Up to 60 seconds • Max 50MB'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, WebM, MOV
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
