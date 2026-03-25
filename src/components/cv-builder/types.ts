export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  photo?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Language {
  name: string;
  level: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
}

export interface Skills {
  technical: string[];
  soft: string[];
  languages: Language[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url?: string;
}

export type FontFamily = 'inter' | 'roboto' | 'open-sans' | 'heebo' | 'assistant' | 'playfair' | 'lora' | 'montserrat' | 'poppins' | 'raleway' | 'merriweather' | 'source-serif' | 'nunito';
export type ColorPreset = 'default' | 'professional' | 'creative' | 'minimal' | 'bold' | 'elegant' | 'forest' | 'sunset' | 'rose' | 'midnight' | 'royal' | 'ocean';
export type Spacing = 'compact' | 'normal' | 'spacious';
export type Orientation = 'portrait' | 'landscape';
export type BackgroundPattern = 'none' | 'dots' | 'grid' | 'diagonal' | 'bubbles' | 'squares' | 'waves' | 'corners';

export interface CVSettings {
  templateId: string;
  accentColor: string;
  headingColor?: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: FontFamily;
  colorPreset: ColorPreset;
  spacing: Spacing;
  orientation: Orientation;
  backgroundPattern: BackgroundPattern;
  cvLanguage: 'he' | 'en';
}

export const colorPresets: Record<ColorPreset, { primary: string; secondary: string; accent: string; name: string; nameHe: string }> = {
  default:      { primary: '#3b82f6', secondary: '#64748b', accent: '#10b981', name: 'Modern Blue',       nameHe: 'כחול מודרני' },
  professional: { primary: '#1e3a5f', secondary: '#374151', accent: '#0891b2', name: 'Navy Professional', nameHe: 'כחול עסקי' },
  creative:     { primary: '#8b5cf6', secondary: '#6366f1', accent: '#ec4899', name: 'Creative Purple',   nameHe: 'סגול יצירתי' },
  minimal:      { primary: '#374151', secondary: '#6b7280', accent: '#9ca3af', name: 'Minimal Gray',      nameHe: 'אפור מינימלי' },
  bold:         { primary: '#dc2626', secondary: '#1f2937', accent: '#f97316', name: 'Bold Red',          nameHe: 'אדום נועז' },
  elegant:      { primary: '#0d9488', secondary: '#115e59', accent: '#14b8a6', name: 'Elegant Teal',      nameHe: 'טורקיז אלגנטי' },
  forest:       { primary: '#16a34a', secondary: '#166534', accent: '#4ade80', name: 'Forest Green',      nameHe: 'ירוק יער' },
  sunset:       { primary: '#ea580c', secondary: '#c2410c', accent: '#fb923c', name: 'Sunset Orange',     nameHe: 'כתום שקיעה' },
  rose:         { primary: '#e11d48', secondary: '#9f1239', accent: '#fb7185', name: 'Rose Pink',         nameHe: 'ורוד ורד' },
  midnight:     { primary: '#0f172a', secondary: '#1e293b', accent: '#475569', name: 'Midnight',          nameHe: 'חצות' },
  royal:        { primary: '#b45309', secondary: '#92400e', accent: '#fbbf24', name: 'Royal Gold',        nameHe: 'זהב מלכותי' },
  ocean:        { primary: '#0284c7', secondary: '#0369a1', accent: '#38bdf8', name: 'Ocean Blue',        nameHe: 'כחול אוקיינוס' },
};

export const fontFamilies: Record<FontFamily, { name: string; nameHe: string; stack: string; category: 'sans' | 'serif' | 'hebrew' }> = {
  inter:         { name: 'Inter',           nameHe: 'אינטר',       stack: "'Inter', sans-serif",           category: 'sans' },
  roboto:        { name: 'Roboto',          nameHe: 'רובוטו',      stack: "'Roboto', sans-serif",          category: 'sans' },
  'open-sans':   { name: 'Open Sans',       nameHe: 'אופן סאנס',   stack: "'Open Sans', sans-serif",       category: 'sans' },
  montserrat:    { name: 'Montserrat',      nameHe: 'מונסראט',     stack: "'Montserrat', sans-serif",      category: 'sans' },
  poppins:       { name: 'Poppins',         nameHe: 'פופינס',      stack: "'Poppins', sans-serif",         category: 'sans' },
  raleway:       { name: 'Raleway',         nameHe: 'ראלוויי',     stack: "'Raleway', sans-serif",         category: 'sans' },
  nunito:        { name: 'Nunito',          nameHe: 'נוניטו',      stack: "'Nunito', sans-serif",          category: 'sans' },
  playfair:      { name: 'Playfair Display',nameHe: 'פלייפייר',    stack: "'Playfair Display', serif",     category: 'serif' },
  lora:          { name: 'Lora',            nameHe: 'לורה',        stack: "'Lora', serif",                 category: 'serif' },
  merriweather:  { name: 'Merriweather',    nameHe: 'מריוות׳ר',   stack: "'Merriweather', serif",         category: 'serif' },
  'source-serif': { name: 'Source Serif',   nameHe: 'סורס סריף',   stack: "'Source Serif 4', serif",       category: 'serif' },
  heebo:         { name: 'Heebo',           nameHe: 'חיבו',        stack: "'Heebo', sans-serif",           category: 'hebrew' },
  assistant:     { name: 'Assistant',       nameHe: 'אסיסטנט',     stack: "'Assistant', sans-serif",       category: 'hebrew' },
};

export interface CVData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
  projects: Project[];
  settings: CVSettings;
}

export const defaultCVData: CVData = {
  personalInfo: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: {
    technical: [],
    soft: [],
    languages: [],
  },
  certifications: [],
  projects: [],
  settings: {
    templateId: 'modern-tech',
    accentColor: '#3b82f6',
    fontSize: 'medium',
    fontFamily: 'inter',
    colorPreset: 'default',
    spacing: 'normal',
    orientation: 'portrait',
    backgroundPattern: 'none',
    cvLanguage: 'en',
  },
};

export interface TemplateProps {
  data: CVData;
  scale?: number;
}

export interface ATSScore {
  overall: number;
  sections: {
    name: string;
    score: number;
    suggestions: string[];
  }[];
}
