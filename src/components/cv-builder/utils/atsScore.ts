import { CVData, ATSScore } from '../types';

const DATE_RE = /^\d{2}\/\d{4}$/;

export function computeATSScore(data: CVData): ATSScore {
  const sections: ATSScore['sections'] = [];

  // ── Contact Info (10 pts) ───────────────────────────────────────────────
  const contactFields = [
    data.personalInfo.fullName,
    data.personalInfo.email,
    data.personalInfo.phone,
    data.personalInfo.location,
  ];
  const contactFilled = contactFields.filter(Boolean).length;
  const contactScore = Math.round((contactFilled / contactFields.length) * 10);
  const contactSuggestions: string[] = [];
  if (!data.personalInfo.fullName)   contactSuggestions.push('Add your full name');
  if (!data.personalInfo.email)      contactSuggestions.push('Add your email address');
  if (!data.personalInfo.phone)      contactSuggestions.push('Add your phone number');
  if (!data.personalInfo.location)   contactSuggestions.push('Add your location');
  sections.push({ name: 'Contact Info', score: contactScore, suggestions: contactSuggestions });

  // ── Professional Summary (20 pts) ──────────────────────────────────────
  const summary = data.personalInfo.summary?.trim() || '';
  const wordCount = summary ? summary.split(/\s+/).length : 0;
  let summaryScore = 0;
  const summarySuggestions: string[] = [];
  if (wordCount >= 50) {
    summaryScore = 20;
  } else if (wordCount >= 20) {
    summaryScore = 12;
    summarySuggestions.push('Expand your summary to at least 50 words for better ATS visibility');
  } else if (wordCount > 0) {
    summaryScore = 5;
    summarySuggestions.push('Your summary is too short — aim for 50+ words with keywords');
  } else {
    summarySuggestions.push('Add a professional summary with relevant keywords');
  }
  sections.push({ name: 'Professional Summary', score: summaryScore, suggestions: summarySuggestions });

  // ── Work Experience (25 pts) ────────────────────────────────────────────
  const expCount = data.experience.length;
  const avgBullets = expCount
    ? data.experience.reduce((acc, e) => acc + e.bullets.length, 0) / expCount
    : 0;
  let expScore = 0;
  const expSuggestions: string[] = [];
  if (expCount >= 2 && avgBullets >= 3) {
    expScore = 25;
  } else if (expCount >= 1 && avgBullets >= 2) {
    expScore = 17;
    expSuggestions.push('Add more bullet points per role (aim for 3–5 per position)');
  } else if (expCount >= 1) {
    expScore = 10;
    expSuggestions.push('Add 3–5 quantified bullet points per job (numbers, percentages, impact)');
  } else {
    expSuggestions.push('Add at least one work experience entry');
  }
  if (expCount > 0 && data.experience.some(e => !DATE_RE.test(e.startDate))) {
    expSuggestions.push('Use MM/YYYY format for all employment dates');
  }
  sections.push({ name: 'Work Experience', score: expScore, suggestions: expSuggestions });

  // ── Education (15 pts) ─────────────────────────────────────────────────
  const edu = data.education;
  let eduScore = 0;
  const eduSuggestions: string[] = [];
  if (edu.length > 0 && edu[0].institution && edu[0].degree) {
    eduScore = 15;
  } else if (edu.length > 0) {
    eduScore = 8;
    eduSuggestions.push('Complete your education entry with institution and degree');
  } else {
    eduSuggestions.push('Add your education history');
  }
  sections.push({ name: 'Education', score: eduScore, suggestions: eduSuggestions });

  // ── Skills (20 pts) ────────────────────────────────────────────────────
  const techCount = data.skills.technical.length;
  const softCount = data.skills.soft.length;
  let skillScore = 0;
  const skillSuggestions: string[] = [];
  if (techCount >= 5 && softCount >= 2) {
    skillScore = 20;
  } else if (techCount >= 3 || (techCount >= 2 && softCount >= 1)) {
    skillScore = 12;
    if (techCount < 5) skillSuggestions.push('Add more technical skills (aim for 5+)');
    if (softCount < 2) skillSuggestions.push('Add at least 2 soft skills');
  } else {
    skillScore = 4;
    skillSuggestions.push('List at least 5 technical skills and 2 soft skills relevant to your target roles');
  }
  sections.push({ name: 'Skills', score: skillScore, suggestions: skillSuggestions });

  // ── Date Format (10 pts) ───────────────────────────────────────────────
  const allDates = data.experience.flatMap(e => [e.startDate, e.endDate].filter(Boolean) as string[]);
  const validDates = allDates.filter(d => DATE_RE.test(d)).length;
  const dateScore = allDates.length === 0 ? 10 : Math.round((validDates / allDates.length) * 10);
  const dateSuggestions: string[] = [];
  if (allDates.length > 0 && validDates < allDates.length) {
    dateSuggestions.push('Use MM/YYYY format for all dates (e.g. 03/2022)');
  }
  sections.push({ name: 'Date Formatting', score: dateScore, suggestions: dateSuggestions });

  const overall = sections.reduce((acc, s) => acc + s.score, 0);
  return { overall, sections };
}
