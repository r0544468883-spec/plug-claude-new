import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, Lightbulb, Zap, Heart, Star } from 'lucide-react';

interface PlugResponseProps {
  children: ReactNode;
  type?: 'default' | 'tip' | 'celebration' | 'encouragement' | 'insight';
  showTip?: boolean;
}

const plugTips = {
  en: [
    "💡 Did you know? Tailoring your resume to each job increases response rates by 50%!",
    "🎯 Pro tip: Follow up on applications after 1 week if you haven't heard back.",
    "✨ Fun fact: Most recruiters spend only 6 seconds on initial resume review!",
    "🚀 Networking accounts for 70% of all jobs landed. Time to connect!",
    "📊 Adding quantifiable achievements to your resume can boost interview chances by 40%.",
    "🌟 Remember: Every 'no' brings you closer to the right 'yes'!",
  ],
  he: [
    "💡 ידעת? התאמת קורות החיים לכל משרה מגדילה את שיעור התגובות ב-50%!",
    "🎯 טיפ: עקוב אחרי מועמדויות אחרי שבוע אם לא קיבלת תשובה.",
    "✨ עובדה מעניינת: רוב המגייסים מקדישים רק 6 שניות לסינון ראשוני!",
    "🚀 70% מהמשרות מתקבלות דרך נטוורקינג. הגיע הזמן להתחבר!",
    "📊 הוספת הישגים מספריים יכולה להגדיל סיכויי ראיון ב-40%.",
    "🌟 זכור: כל 'לא' מקרב אותך ל'כן' הנכון!",
  ]
};

const celebrationEmojis = ['🎉', '🎊', '🥳', '✨', '🌟', '💫', '🏆', '👏'];
const encouragementEmojis = ['💪', '🙌', '👊', '🔥', '⭐', '💯', '🚀', '✊'];

export function PlugResponse({ children, type = 'default', showTip = false }: PlugResponseProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [randomTip, setRandomTip] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string>('');

  useEffect(() => {
    if (showTip && Math.random() > 0.7) {
      const tips = isHebrew ? plugTips.he : plugTips.en;
      setRandomTip(tips[Math.floor(Math.random() * tips.length)]);
    }

    if (type === 'celebration') {
      setEmoji(celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)]);
    } else if (type === 'encouragement') {
      setEmoji(encouragementEmojis[Math.floor(Math.random() * encouragementEmojis.length)]);
    }
  }, [showTip, type, isHebrew]);

  const getIcon = () => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'celebration':
        return <span className="text-lg">{emoji}</span>;
      case 'encouragement':
        return <span className="text-lg">{emoji}</span>;
      case 'insight':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getWrapperClass = () => {
    switch (type) {
      case 'tip':
        return 'border-l-2 border-yellow-500/50 pl-3 bg-yellow-500/5';
      case 'celebration':
        return 'border-l-2 border-green-500/50 pl-3 bg-green-500/5';
      case 'encouragement':
        return 'border-l-2 border-primary/50 pl-3 bg-primary/5';
      case 'insight':
        return 'border-l-2 border-purple-500/50 pl-3 bg-purple-500/5';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`rounded-lg ${type !== 'default' ? getWrapperClass() : ''}`}>
        {type !== 'default' && (
          <div className="flex items-center gap-2 mb-2">
            {getIcon()}
            {type === 'tip' && (
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                {isHebrew ? 'טיפ מ-Plug' : 'Plug Tip'}
              </span>
            )}
            {type === 'insight' && (
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {isHebrew ? 'תובנה' : 'Insight'}
              </span>
            )}
          </div>
        )}
        
        {children}
      </div>

      {/* Random Plug Tip */}
      <AnimatePresence>
        {randomTip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{randomTip}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Utility function to detect response type from AI content
export function detectResponseType(content: string): 'default' | 'tip' | 'celebration' | 'encouragement' | 'insight' {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('congratulations') || lowerContent.includes('מזל טוב') || 
      lowerContent.includes('great job') || lowerContent.includes('עבודה מצוינת') ||
      lowerContent.includes('100%') || lowerContent.includes('hired')) {
    return 'celebration';
  }
  
  if (lowerContent.includes('tip:') || lowerContent.includes('טיפ:') ||
      lowerContent.includes('pro tip') || lowerContent.includes('did you know')) {
    return 'tip';
  }
  
  if (lowerContent.includes('you can do') || lowerContent.includes('keep going') ||
      lowerContent.includes('אתה יכול') || lowerContent.includes('המשך') ||
      lowerContent.includes("don't give up") || lowerContent.includes('אל תוותר')) {
    return 'encouragement';
  }
  
  if (lowerContent.includes('analysis') || lowerContent.includes('ניתוח') ||
      lowerContent.includes('insight') || lowerContent.includes('based on')) {
    return 'insight';
  }
  
  return 'default';
}
