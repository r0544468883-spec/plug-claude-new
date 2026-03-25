import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  userName: string;
  onUpload: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PhotoUpload({ 
  userId, 
  currentAvatarUrl, 
  userName, 
  onUpload,
  size = 'lg' 
}: PhotoUploadProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error(isHebrew ? 'יש להעלות קובץ תמונה (JPG, PNG, WebP, GIF)' : 'Please upload an image file (JPG, PNG, WebP, GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isHebrew ? 'גודל הקובץ מקסימלי: 5MB' : 'Maximum file size: 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onUpload(publicUrl);
      toast.success(isHebrew ? 'התמונה עודכנה!' : 'Photo updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(isHebrew ? 'שגיאה בהעלאת התמונה' : 'Error uploading photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentAvatarUrl) return;

    setIsUploading(true);
    try {
      const oldPath = currentAvatarUrl.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (error) throw error;

      onUpload(null);
      toast.success(isHebrew ? 'התמונה הוסרה' : 'Photo removed');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error(isHebrew ? 'שגיאה בהסרת התמונה' : 'Error removing photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'border-4 border-primary/20')}>
          <AvatarImage src={currentAvatarUrl || undefined} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay on hover */}
        <div 
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Camera className="w-4 h-4 me-1" />
              {isHebrew ? 'שנה תמונה' : 'Change Photo'}
            </>
          )}
        </Button>

        {currentAvatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemovePhoto}
            disabled={isUploading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
