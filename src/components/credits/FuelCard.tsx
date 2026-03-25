import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Github, 
  Linkedin, 
  Youtube, 
  Instagram, 
  Facebook, 
  MessageCircle,
  Share2,
  Check,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Custom icons for platforms not in lucide
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const ICON_MAP: Record<string, React.ReactNode> = {
  github: <Github className="w-5 h-5" />,
  linkedin: <Linkedin className="w-5 h-5" />,
  whatsapp: <WhatsAppIcon />,
  tiktok: <TikTokIcon />,
  discord: <DiscordIcon />,
  youtube: <Youtube className="w-5 h-5" />,
  spotify: <SpotifyIcon />,
  telegram: <TelegramIcon />,
  facebook: <Facebook className="w-5 h-5" />,
  instagram: <Instagram className="w-5 h-5" />,
  share: <Share2 className="w-5 h-5" />,
  twitter: <XIcon />,
};

const PLATFORM_COLORS: Record<string, string> = {
  github: 'from-gray-700 to-gray-900',
  linkedin: 'from-blue-600 to-blue-800',
  whatsapp: 'from-green-500 to-green-700',
  tiktok: 'from-pink-500 to-purple-600',
  discord: 'from-indigo-500 to-indigo-700',
  youtube: 'from-red-500 to-red-700',
  spotify: 'from-green-400 to-green-600',
  telegram: 'from-blue-400 to-blue-600',
  facebook: 'from-blue-500 to-blue-700',
  instagram: 'from-pink-500 via-purple-500 to-orange-400',
  share: 'from-primary to-accent',
  twitter: 'from-gray-800 to-black',
};

interface FuelCardProps {
  taskId: string;
  credits: number;
  label: string;
  url: string;
  icon: string;
  isCompleted?: boolean;
}

export const FuelCard = ({ taskId, credits, label, url, icon, isCompleted = false }: FuelCardProps) => {
  const { awardCredits } = useCredits();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = async () => {
    if (completed) return;

    // Open link in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Show confirmation after a short delay
    setTimeout(() => {
      setShowConfirm(true);
    }, 1000);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await awardCredits('social_task', taskId);
      if (result.success) {
        setCompleted(true);
        setShowConfirm(false);
      } else if (result.error?.includes('already')) {
        setCompleted(true);
        setShowConfirm(false);
        toast.info(isRTL ? 'כבר השלמת משימה זו!' : 'You already completed this task!');
      }
    } catch (error) {
      console.error('Error confirming task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const platformColor = PLATFORM_COLORS[icon] || 'from-primary to-accent';

  return (
    <motion.div
      whileHover={!completed ? { 
        scale: 1.02, 
        y: -4,
        boxShadow: '0 20px 40px -15px rgba(0, 255, 157, 0.3)'
      } : {}}
      whileTap={!completed ? { scale: 0.98 } : {}}
      className={cn(
        "relative group rounded-2xl overflow-hidden cursor-pointer",
        "border border-border/50 bg-card",
        "transition-all duration-300",
        completed && "opacity-75"
      )}
      onClick={!showConfirm ? handleClick : undefined}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity",
        `bg-gradient-to-br ${platformColor}`
      )} />

      {/* Content */}
      <div className="relative p-4 flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white",
          `bg-gradient-to-br ${platformColor}`,
          completed && "grayscale"
        )}>
          {completed ? <Check className="w-5 h-5" /> : ICON_MAP[icon]}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm truncate",
            completed && "line-through text-muted-foreground"
          )}>
            {label}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className={cn(
              "text-lg font-bold",
              completed ? "text-muted-foreground" : "text-[#00FF9D]"
            )}>
              +{credits}
            </span>
            <span className="text-xs text-muted-foreground">
              {isRTL ? 'דלק' : 'fuel'}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        {!completed && !showConfirm && (
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}

        {completed && (
          <div className="w-8 h-8 rounded-full bg-[#00FF9D]/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-[#00FF9D]" />
          </div>
        )}
      </div>

      {/* Confirmation overlay */}
      {showConfirm && !completed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
        >
          <p className="text-sm text-center mb-3">
            {isRTL ? 'השלמת את המשימה?' : 'Did you complete the task?'}
          </p>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirm();
              }}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm",
                "bg-[#00FF9D] text-black",
                "disabled:opacity-50"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isRTL ? 'כן!' : 'Yes!'
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(false);
              }}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-muted"
            >
              {isRTL ? 'עוד לא' : 'Not yet'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Magnetic pull effect on hover */}
      {!completed && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={false}
          whileHover={{
            background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0, 255, 157, 0.15) 0%, transparent 50%)',
          }}
        />
      )}
    </motion.div>
  );
};
