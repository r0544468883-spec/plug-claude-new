import { Users, Briefcase, Building2 } from 'lucide-react';

export type ConnectionCircle = 'colleague' | 'recruiter' | 'company';
export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export function getCircleLabel(circle: ConnectionCircle, language: string) {
  const labels: Record<ConnectionCircle, { he: string; en: string }> = {
    colleague: { he: 'קולגה', en: 'Colleague' },
    recruiter: { he: 'מגייס', en: 'Recruiter' },
    company: { he: 'חברה', en: 'Company' },
  };
  return language === 'he' ? labels[circle].he : labels[circle].en;
}

export function getCircleLabelPlural(circle: ConnectionCircle, language: string) {
  const labels: Record<ConnectionCircle, { he: string; en: string }> = {
    colleague: { he: 'קולגות', en: 'Colleagues' },
    recruiter: { he: 'מגייסים', en: 'Recruiters' },
    company: { he: 'חברות', en: 'Companies' },
  };
  return language === 'he' ? labels[circle].he : labels[circle].en;
}

export function getCircleIcon(circle: ConnectionCircle) {
  switch (circle) {
    case 'colleague': return Users;
    case 'recruiter': return Briefcase;
    case 'company': return Building2;
  }
}

export function getCircleColor(circle: ConnectionCircle) {
  switch (circle) {
    case 'colleague': return 'text-blue-500 bg-blue-500/10';
    case 'recruiter': return 'text-purple-500 bg-purple-500/10';
    case 'company': return 'text-emerald-500 bg-emerald-500/10';
  }
}
