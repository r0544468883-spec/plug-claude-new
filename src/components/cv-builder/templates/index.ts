import { ModernTech } from './ModernTech';
import { ClassicPro } from './ClassicPro';
import { Minimal } from './Minimal';
import { Creative } from './Creative';
import { Executive } from './Executive';
import { Academic } from './Academic';
import { Developer } from './Developer';
import { Designer } from './Designer';
import { Startup } from './Startup';
import { Traditional } from './Traditional';
import { TemplateProps } from '../types';
import { ComponentType } from 'react';

export interface TemplateInfo {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  component: ComponentType<TemplateProps>;
  category: 'professional' | 'creative' | 'technical' | 'academic';
  previewColor: string;
}

export const templates: TemplateInfo[] = [
  {
    id: 'modern-tech',
    name: 'Modern Tech',
    nameHe: 'טכנולוגי מודרני',
    description: 'Clean sidebar layout perfect for tech professionals',
    descriptionHe: 'פריסה נקייה עם סרגל צד, מושלם לאנשי טכנולוגיה',
    component: ModernTech,
    category: 'technical',
    previewColor: '#3b82f6',
  },
  {
    id: 'classic-pro',
    name: 'Classic Professional',
    nameHe: 'קלאסי מקצועי',
    description: 'Traditional centered layout that works everywhere',
    descriptionHe: 'פריסה מרכזית מסורתית שמתאימה לכל מקום',
    component: ClassicPro,
    category: 'professional',
    previewColor: '#374151',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    nameHe: 'מינימליסטי',
    description: 'Ultra-clean design with focus on content',
    descriptionHe: 'עיצוב נקי במיוחד עם דגש על התוכן',
    component: Minimal,
    category: 'professional',
    previewColor: '#6b7280',
  },
  {
    id: 'creative',
    name: 'Creative',
    nameHe: 'יצירתי',
    description: 'Bold colors and dynamic layout for creatives',
    descriptionHe: 'צבעים נועזים ופריסה דינמית לאנשים יצירתיים',
    component: Creative,
    category: 'creative',
    previewColor: '#8b5cf6',
  },
  {
    id: 'executive',
    name: 'Executive',
    nameHe: 'מנהלים',
    description: 'Sophisticated design for senior professionals',
    descriptionHe: 'עיצוב מתוחכם לאנשי מקצוע בכירים',
    component: Executive,
    category: 'professional',
    previewColor: '#1e3a5f',
  },
  {
    id: 'academic',
    name: 'Academic',
    nameHe: 'אקדמי',
    description: 'Perfect for researchers and educators',
    descriptionHe: 'מושלם לחוקרים ואנשי אקדמיה',
    component: Academic,
    category: 'academic',
    previewColor: '#065f46',
  },
  {
    id: 'developer',
    name: 'Developer',
    nameHe: 'מפתחים',
    description: 'Designed for software engineers with GitHub integration',
    descriptionHe: 'מותאם למפתחי תוכנה עם שילוב GitHub',
    component: Developer,
    category: 'technical',
    previewColor: '#0f172a',
  },
  {
    id: 'designer',
    name: 'Designer',
    nameHe: 'מעצבים',
    description: 'Showcase your portfolio in style',
    descriptionHe: 'הצג את הפורטפוליו שלך בסטייל',
    component: Designer,
    category: 'creative',
    previewColor: '#ec4899',
  },
  {
    id: 'startup',
    name: 'Startup',
    nameHe: 'סטארטאפ',
    description: 'Dynamic and modern for fast-paced environments',
    descriptionHe: 'דינמי ומודרני לסביבות עבודה מהירות',
    component: Startup,
    category: 'creative',
    previewColor: '#f97316',
  },
  {
    id: 'traditional',
    name: 'Traditional',
    nameHe: 'מסורתי',
    description: 'Time-tested format that every ATS loves',
    descriptionHe: 'פורמט מוכח שכל מערכת ATS אוהבת',
    component: Traditional,
    category: 'professional',
    previewColor: '#44403c',
  },
];

export const getTemplateById = (id: string): TemplateInfo | undefined => {
  return templates.find((t) => t.id === id);
};

export const getTemplatesByCategory = (category: TemplateInfo['category']): TemplateInfo[] => {
  return templates.filter((t) => t.category === category);
};
