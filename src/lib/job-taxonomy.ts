// Job Taxonomy - Centralized data for fields, roles, and experience levels
// This file provides type-safe access to the job hierarchy

export interface JobField {
  slug: string;
  name_en: string;
  name_he: string;
  icon: string;
}

export interface JobRole {
  slug: string;
  name_en: string;
  name_he: string;
  fieldSlug: string;
}

export interface ExperienceLevel {
  slug: string;
  name_en: string;
  name_he: string;
  years_min: number;
  years_max: number | null;
}

// All 30 job fields based on ALLJOBS
export const JOB_FIELDS: JobField[] = [
  { slug: 'tech', name_en: 'Hi-Tech & IT', name_he: 'הייטק ומחשבים', icon: 'monitor' },
  { slug: 'marketing', name_en: 'Marketing & Advertising', name_he: 'שיווק ופרסום', icon: 'megaphone' },
  { slug: 'sales', name_en: 'Sales', name_he: 'מכירות', icon: 'trending-up' },
  { slug: 'finance', name_en: 'Finance & Economics', name_he: 'כספים וכלכלה', icon: 'dollar-sign' },
  { slug: 'engineering', name_en: 'Engineering', name_he: 'הנדסה', icon: 'settings' },
  { slug: 'hr', name_en: 'HR & Recruitment', name_he: 'משאבי אנוש וגיוס', icon: 'users' },
  { slug: 'management', name_en: 'Management & Admin', name_he: 'ניהול ואדמיניסטרציה', icon: 'briefcase' },
  { slug: 'customer-service', name_en: 'Customer Service & Support', name_he: 'שירות לקוחות ותמיכה', icon: 'headphones' },
  { slug: 'design', name_en: 'Design & Creative', name_he: 'עיצוב וקריאייטיב', icon: 'palette' },
  { slug: 'logistics', name_en: 'Logistics & Shipping', name_he: 'לוגיסטיקה ושילוח', icon: 'truck' },
  { slug: 'manufacturing', name_en: 'Manufacturing & Industry', name_he: 'ייצור ותעשייה', icon: 'factory' },
  { slug: 'healthcare', name_en: 'Healthcare & Medical', name_he: 'בריאות ורפואה', icon: 'heart-pulse' },
  { slug: 'education', name_en: 'Education & Teaching', name_he: 'חינוך והוראה', icon: 'graduation-cap' },
  { slug: 'legal', name_en: 'Legal', name_he: 'משפטים', icon: 'scale' },
  { slug: 'media', name_en: 'Media & PR', name_he: 'תקשורת ויחסי ציבור', icon: 'newspaper' },
  { slug: 'real-estate', name_en: 'Real Estate', name_he: 'נדל"ן', icon: 'home' },
  { slug: 'hospitality', name_en: 'Hospitality & Tourism', name_he: 'מסעדנות ומלונאות', icon: 'utensils' },
  { slug: 'retail', name_en: 'Retail & Commerce', name_he: 'קמעונאות ומסחר', icon: 'shopping-cart' },
  { slug: 'construction', name_en: 'Construction & Infrastructure', name_he: 'בניין ותשתיות', icon: 'hard-hat' },
  { slug: 'security', name_en: 'Security & Safety', name_he: 'ביטחון ושמירה', icon: 'shield' },
  { slug: 'drivers', name_en: 'Drivers & Transportation', name_he: 'נהגים והובלה', icon: 'car' },
  { slug: 'social-work', name_en: 'Social Work & Welfare', name_he: 'עבודה סוציאלית ורווחה', icon: 'hand-helping' },
  { slug: 'data', name_en: 'Data & Analytics', name_he: 'דאטה ואנליטיקה', icon: 'bar-chart' },
  { slug: 'insurance', name_en: 'Insurance & Banking', name_he: 'ביטוח ובנקאות', icon: 'landmark' },
  { slug: 'agriculture', name_en: 'Agriculture & Environment', name_he: 'חקלאות וסביבה', icon: 'leaf' },
  { slug: 'culture', name_en: 'Culture & Entertainment', name_he: 'תרבות ובידור', icon: 'music' },
  { slug: 'sports', name_en: 'Sports & Fitness', name_he: 'ספורט וכושר', icon: 'dumbbell' },
  { slug: 'import-export', name_en: 'Import & Export', name_he: 'יבוא ויצוא', icon: 'plane' },
  { slug: 'freelance', name_en: 'Freelance & Self-employed', name_he: 'פרילנס ועצמאים', icon: 'user' },
  { slug: 'students', name_en: 'Students & Entry Level', name_he: 'סטודנטים וללא ניסיון', icon: 'book-open' },
];

// All job roles organized by field
export const JOB_ROLES: JobRole[] = [
  // Hi-Tech & IT
  { slug: 'software-developer', name_en: 'Software Developer', name_he: 'מפתח/ת תוכנה', fieldSlug: 'tech' },
  { slug: 'fullstack-developer', name_en: 'Full Stack Developer', name_he: 'מפתח/ת Full Stack', fieldSlug: 'tech' },
  { slug: 'frontend-developer', name_en: 'Frontend Developer', name_he: 'מפתח/ת Frontend', fieldSlug: 'tech' },
  { slug: 'backend-developer', name_en: 'Backend Developer', name_he: 'מפתח/ת Backend', fieldSlug: 'tech' },
  { slug: 'mobile-developer', name_en: 'Mobile Developer', name_he: 'מפתח/ת מובייל', fieldSlug: 'tech' },
  { slug: 'devops-engineer', name_en: 'DevOps Engineer', name_he: 'מהנדס/ת DevOps', fieldSlug: 'tech' },
  { slug: 'qa-engineer', name_en: 'QA Engineer', name_he: 'מהנדס/ת QA', fieldSlug: 'tech' },
  { slug: 'qa-automation', name_en: 'QA Automation Engineer', name_he: 'מהנדס/ת אוטומציה', fieldSlug: 'tech' },
  { slug: 'data-engineer', name_en: 'Data Engineer', name_he: 'מהנדס/ת נתונים', fieldSlug: 'tech' },
  { slug: 'ml-engineer', name_en: 'ML/AI Engineer', name_he: 'מהנדס/ת ML/AI', fieldSlug: 'tech' },
  { slug: 'security-engineer', name_en: 'Security Engineer', name_he: 'מהנדס/ת אבטחת מידע', fieldSlug: 'tech' },
  { slug: 'cloud-engineer', name_en: 'Cloud Engineer', name_he: 'מהנדס/ת ענן', fieldSlug: 'tech' },
  { slug: 'system-admin', name_en: 'System Administrator', name_he: 'מנהל/ת מערכות', fieldSlug: 'tech' },
  { slug: 'network-admin', name_en: 'Network Administrator', name_he: 'מנהל/ת רשתות', fieldSlug: 'tech' },
  { slug: 'tech-lead', name_en: 'Tech Lead', name_he: 'מוביל/ה טכנולוגי', fieldSlug: 'tech' },
  { slug: 'architect', name_en: 'Software Architect', name_he: 'ארכיטקט/ית תוכנה', fieldSlug: 'tech' },
  { slug: 'product-manager', name_en: 'Product Manager', name_he: 'מנהל/ת מוצר', fieldSlug: 'tech' },
  { slug: 'project-manager', name_en: 'Project Manager', name_he: 'מנהל/ת פרויקטים', fieldSlug: 'tech' },
  { slug: 'scrum-master', name_en: 'Scrum Master', name_he: 'סקראם מאסטר', fieldSlug: 'tech' },
  { slug: 'cto', name_en: 'CTO', name_he: 'מנהל/ת טכנולוגיות', fieldSlug: 'tech' },
  { slug: 'vp-engineering', name_en: 'VP Engineering', name_he: 'VP הנדסה', fieldSlug: 'tech' },
  { slug: 'it-support', name_en: 'IT Support', name_he: 'תמיכה טכנית', fieldSlug: 'tech' },
  { slug: 'helpdesk', name_en: 'Help Desk', name_he: 'הלפ דסק', fieldSlug: 'tech' },
  { slug: 'database-admin', name_en: 'Database Administrator', name_he: 'מנהל/ת בסיסי נתונים', fieldSlug: 'tech' },
  { slug: 'embedded-developer', name_en: 'Embedded Developer', name_he: 'מפתח/ת Embedded', fieldSlug: 'tech' },

  // Marketing & Advertising
  { slug: 'marketing-manager', name_en: 'Marketing Manager', name_he: 'מנהל/ת שיווק', fieldSlug: 'marketing' },
  { slug: 'digital-marketing-manager', name_en: 'Digital Marketing Manager', name_he: 'מנהל/ת שיווק דיגיטלי', fieldSlug: 'marketing' },
  { slug: 'product-marketing-manager', name_en: 'Product Marketing Manager', name_he: 'מנהל/ת שיווק מוצר', fieldSlug: 'marketing' },
  { slug: 'seo-specialist', name_en: 'SEO Specialist', name_he: 'מומחה/ית SEO', fieldSlug: 'marketing' },
  { slug: 'sem-specialist', name_en: 'SEM/PPC Specialist', name_he: 'מומחה/ית SEM/PPC', fieldSlug: 'marketing' },
  { slug: 'campaign-manager', name_en: 'Campaign Manager', name_he: 'מנהל/ת קמפיינים', fieldSlug: 'marketing' },
  { slug: 'copywriter', name_en: 'Copywriter', name_he: 'קופירייטר/ית', fieldSlug: 'marketing' },
  { slug: 'content-manager', name_en: 'Content Manager', name_he: 'מנהל/ת תוכן', fieldSlug: 'marketing' },
  { slug: 'social-media-manager', name_en: 'Social Media Manager', name_he: 'מנהל/ת סושיאל מדיה', fieldSlug: 'marketing' },
  { slug: 'brand-manager', name_en: 'Brand Manager', name_he: 'מנהל/ת מותג', fieldSlug: 'marketing' },
  { slug: 'marketing-analyst', name_en: 'Marketing Analyst', name_he: 'אנליסט/ית שיווק', fieldSlug: 'marketing' },
  { slug: 'affiliate-manager', name_en: 'Affiliate Manager', name_he: 'מנהל/ת אפילייט', fieldSlug: 'marketing' },
  { slug: 'email-marketing', name_en: 'Email Marketing Specialist', name_he: 'מומחה/ית אימייל מרקטינג', fieldSlug: 'marketing' },
  { slug: 'event-manager', name_en: 'Event Manager', name_he: 'מנהל/ת אירועים', fieldSlug: 'marketing' },
  { slug: 'crm-manager', name_en: 'CRM Manager', name_he: 'מנהל/ת CRM', fieldSlug: 'marketing' },
  { slug: 'growth-hacker', name_en: 'Growth Hacker', name_he: 'Growth Hacker', fieldSlug: 'marketing' },
  { slug: 'marketing-coordinator', name_en: 'Marketing Coordinator', name_he: 'רכז/ת שיווק', fieldSlug: 'marketing' },
  { slug: 'media-buyer', name_en: 'Media Buyer', name_he: 'קניין/ת מדיה', fieldSlug: 'marketing' },

  // Sales
  { slug: 'sales-rep', name_en: 'Sales Representative', name_he: 'נציג/ת מכירות', fieldSlug: 'sales' },
  { slug: 'sales-manager', name_en: 'Sales Manager', name_he: 'מנהל/ת מכירות', fieldSlug: 'sales' },
  { slug: 'account-executive', name_en: 'Account Executive', name_he: 'מנהל/ת לקוחות', fieldSlug: 'sales' },
  { slug: 'account-manager', name_en: 'Account Manager', name_he: 'מנהל/ת תיקי לקוחות', fieldSlug: 'sales' },
  { slug: 'business-development', name_en: 'Business Development', name_he: 'פיתוח עסקי', fieldSlug: 'sales' },
  { slug: 'sales-director', name_en: 'Sales Director', name_he: 'מנהל/ת מכירות בכיר', fieldSlug: 'sales' },
  { slug: 'inside-sales', name_en: 'Inside Sales', name_he: 'מכירות פנים', fieldSlug: 'sales' },
  { slug: 'field-sales', name_en: 'Field Sales', name_he: 'מכירות שטח', fieldSlug: 'sales' },
  { slug: 'telesales', name_en: 'Telesales', name_he: 'מכירות טלפוניות', fieldSlug: 'sales' },
  { slug: 'pre-sales', name_en: 'Pre-Sales', name_he: 'Pre-Sales', fieldSlug: 'sales' },
  { slug: 'sales-engineer', name_en: 'Sales Engineer', name_he: 'מהנדס/ת מכירות', fieldSlug: 'sales' },
  { slug: 'channel-manager', name_en: 'Channel Manager', name_he: 'מנהל/ת ערוצי הפצה', fieldSlug: 'sales' },

  // Finance & Economics
  { slug: 'accountant', name_en: 'Accountant', name_he: 'רואה חשבון', fieldSlug: 'finance' },
  { slug: 'financial-analyst', name_en: 'Financial Analyst', name_he: 'אנליסט/ית פיננסי', fieldSlug: 'finance' },
  { slug: 'cfo', name_en: 'CFO', name_he: 'מנהל/ת כספים', fieldSlug: 'finance' },
  { slug: 'controller', name_en: 'Controller', name_he: 'קונטרולר/ית', fieldSlug: 'finance' },
  { slug: 'bookkeeper', name_en: 'Bookkeeper', name_he: 'מנהל/ת חשבונות', fieldSlug: 'finance' },
  { slug: 'tax-consultant', name_en: 'Tax Consultant', name_he: 'יועץ/ת מס', fieldSlug: 'finance' },
  { slug: 'auditor', name_en: 'Auditor', name_he: 'מבקר/ת פנימי', fieldSlug: 'finance' },
  { slug: 'treasury-manager', name_en: 'Treasury Manager', name_he: 'מנהל/ת אוצר', fieldSlug: 'finance' },
  { slug: 'financial-planner', name_en: 'Financial Planner', name_he: 'מתכנן/ת פיננסי', fieldSlug: 'finance' },
  { slug: 'credit-analyst', name_en: 'Credit Analyst', name_he: 'אנליסט/ית אשראי', fieldSlug: 'finance' },
  { slug: 'investment-analyst', name_en: 'Investment Analyst', name_he: 'אנליסט/ית השקעות', fieldSlug: 'finance' },
  { slug: 'risk-analyst', name_en: 'Risk Analyst', name_he: 'אנליסט/ית סיכונים', fieldSlug: 'finance' },
  { slug: 'finance-manager', name_en: 'Finance Manager', name_he: 'מנהל/ת כספים', fieldSlug: 'finance' },
  { slug: 'payroll-specialist', name_en: 'Payroll Specialist', name_he: 'מומחה/ית שכר', fieldSlug: 'finance' },
  { slug: 'billing-specialist', name_en: 'Billing Specialist', name_he: 'מומחה/ית חיוב', fieldSlug: 'finance' },
  { slug: 'collections-specialist', name_en: 'Collections Specialist', name_he: 'מומחה/ית גבייה', fieldSlug: 'finance' },
  { slug: 'budget-analyst', name_en: 'Budget Analyst', name_he: 'אנליסט/ית תקציבים', fieldSlug: 'finance' },
  { slug: 'economist', name_en: 'Economist', name_he: 'כלכלן/ית', fieldSlug: 'finance' },

  // Engineering
  { slug: 'mechanical-engineer', name_en: 'Mechanical Engineer', name_he: 'מהנדס/ת מכונות', fieldSlug: 'engineering' },
  { slug: 'electrical-engineer', name_en: 'Electrical Engineer', name_he: 'מהנדס/ת חשמל', fieldSlug: 'engineering' },
  { slug: 'civil-engineer', name_en: 'Civil Engineer', name_he: 'מהנדס/ת אזרחי', fieldSlug: 'engineering' },
  { slug: 'industrial-engineer', name_en: 'Industrial Engineer', name_he: 'מהנדס/ת תעשייה וניהול', fieldSlug: 'engineering' },
  { slug: 'chemical-engineer', name_en: 'Chemical Engineer', name_he: 'מהנדס/ת כימיה', fieldSlug: 'engineering' },
  { slug: 'environmental-engineer', name_en: 'Environmental Engineer', name_he: 'מהנדס/ת סביבה', fieldSlug: 'engineering' },
  { slug: 'biomedical-engineer', name_en: 'Biomedical Engineer', name_he: 'מהנדס/ת ביו-רפואי', fieldSlug: 'engineering' },
  { slug: 'structural-engineer', name_en: 'Structural Engineer', name_he: 'מהנדס/ת קונסטרוקציה', fieldSlug: 'engineering' },
  { slug: 'process-engineer', name_en: 'Process Engineer', name_he: 'מהנדס/ת תהליכים', fieldSlug: 'engineering' },
  { slug: 'production-engineer', name_en: 'Production Engineer', name_he: 'מהנדס/ת ייצור', fieldSlug: 'engineering' },
  { slug: 'quality-engineer', name_en: 'Quality Engineer', name_he: 'מהנדס/ת איכות', fieldSlug: 'engineering' },
  { slug: 'maintenance-engineer', name_en: 'Maintenance Engineer', name_he: 'מהנדס/ת תחזוקה', fieldSlug: 'engineering' },
  { slug: 'project-engineer', name_en: 'Project Engineer', name_he: 'מהנדס/ת פרויקטים', fieldSlug: 'engineering' },
  { slug: 'safety-engineer', name_en: 'Safety Engineer', name_he: 'מהנדס/ת בטיחות', fieldSlug: 'engineering' },
  { slug: 'electronics-engineer', name_en: 'Electronics Engineer', name_he: 'מהנדס/ת אלקטרוניקה', fieldSlug: 'engineering' },
  { slug: 'materials-engineer', name_en: 'Materials Engineer', name_he: 'מהנדס/ת חומרים', fieldSlug: 'engineering' },
  { slug: 'automation-engineer', name_en: 'Automation Engineer', name_he: 'מהנדס/ת אוטומציה', fieldSlug: 'engineering' },
  { slug: 'hvac-engineer', name_en: 'HVAC Engineer', name_he: 'מהנדס/ת מיזוג אוויר', fieldSlug: 'engineering' },
  { slug: 'plumbing-engineer', name_en: 'Plumbing Engineer', name_he: 'מהנדס/ת אינסטלציה', fieldSlug: 'engineering' },
  { slug: 'energy-engineer', name_en: 'Energy Engineer', name_he: 'מהנדס/ת אנרגיה', fieldSlug: 'engineering' },

  // HR & Recruitment
  { slug: 'hr-manager', name_en: 'HR Manager', name_he: 'מנהל/ת משאבי אנוש', fieldSlug: 'hr' },
  { slug: 'recruiter', name_en: 'Recruiter', name_he: 'מגייס/ת', fieldSlug: 'hr' },
  { slug: 'talent-acquisition', name_en: 'Talent Acquisition Specialist', name_he: 'מומחה/ית גיוס טאלנטים', fieldSlug: 'hr' },
  { slug: 'hr-business-partner', name_en: 'HR Business Partner', name_he: 'שותף/ה עסקי למשאבי אנוש', fieldSlug: 'hr' },
  { slug: 'compensation-benefits', name_en: 'Compensation & Benefits Specialist', name_he: 'מומחה/ית תגמול והטבות', fieldSlug: 'hr' },
  { slug: 'training-development', name_en: 'Training & Development Manager', name_he: 'מנהל/ת הדרכה ופיתוח', fieldSlug: 'hr' },
  { slug: 'employee-relations', name_en: 'Employee Relations Specialist', name_he: 'מומחה/ית יחסי עובדים', fieldSlug: 'hr' },
  { slug: 'hr-coordinator', name_en: 'HR Coordinator', name_he: 'רכז/ת משאבי אנוש', fieldSlug: 'hr' },
  { slug: 'hr-generalist', name_en: 'HR Generalist', name_he: 'מומחה/ית משאבי אנוש כללי', fieldSlug: 'hr' },
  { slug: 'headhunter', name_en: 'Headhunter', name_he: 'האד האנטר', fieldSlug: 'hr' },
  { slug: 'sourcer', name_en: 'Sourcer', name_he: 'סורסר/ית', fieldSlug: 'hr' },
  { slug: 'hr-analyst', name_en: 'HR Analyst', name_he: 'אנליסט/ית משאבי אנוש', fieldSlug: 'hr' },

  // Management & Admin
  { slug: 'ceo', name_en: 'CEO', name_he: 'מנכ"ל/ית', fieldSlug: 'management' },
  { slug: 'coo', name_en: 'COO', name_he: 'סמנכ"ל/ית תפעול', fieldSlug: 'management' },
  { slug: 'general-manager', name_en: 'General Manager', name_he: 'מנהל/ת כללי', fieldSlug: 'management' },
  { slug: 'operations-manager', name_en: 'Operations Manager', name_he: 'מנהל/ת תפעול', fieldSlug: 'management' },
  { slug: 'office-manager', name_en: 'Office Manager', name_he: 'מנהל/ת משרד', fieldSlug: 'management' },
  { slug: 'executive-assistant', name_en: 'Executive Assistant', name_he: 'עוזר/ת מנכ"ל', fieldSlug: 'management' },
  { slug: 'administrative-assistant', name_en: 'Administrative Assistant', name_he: 'מזכיר/ה', fieldSlug: 'management' },
  { slug: 'receptionist', name_en: 'Receptionist', name_he: 'פקיד/ת קבלה', fieldSlug: 'management' },
  { slug: 'office-coordinator', name_en: 'Office Coordinator', name_he: 'רכז/ת משרד', fieldSlug: 'management' },
  { slug: 'facilities-manager', name_en: 'Facilities Manager', name_he: 'מנהל/ת מתקנים', fieldSlug: 'management' },
  { slug: 'personal-assistant', name_en: 'Personal Assistant', name_he: 'עוזר/ת אישי', fieldSlug: 'management' },
  { slug: 'data-entry', name_en: 'Data Entry Clerk', name_he: 'מקליד/ה', fieldSlug: 'management' },

  // Customer Service & Support
  { slug: 'customer-service-rep', name_en: 'Customer Service Representative', name_he: 'נציג/ת שירות לקוחות', fieldSlug: 'customer-service' },
  { slug: 'customer-service-manager', name_en: 'Customer Service Manager', name_he: 'מנהל/ת שירות לקוחות', fieldSlug: 'customer-service' },
  { slug: 'call-center-agent', name_en: 'Call Center Agent', name_he: 'נציג/ת מוקד', fieldSlug: 'customer-service' },
  { slug: 'call-center-manager', name_en: 'Call Center Manager', name_he: 'מנהל/ת מוקד', fieldSlug: 'customer-service' },
  { slug: 'technical-support', name_en: 'Technical Support', name_he: 'תמיכה טכנית', fieldSlug: 'customer-service' },
  { slug: 'customer-success', name_en: 'Customer Success Manager', name_he: 'מנהל/ת הצלחת לקוחות', fieldSlug: 'customer-service' },
  { slug: 'support-engineer', name_en: 'Support Engineer', name_he: 'מהנדס/ת תמיכה', fieldSlug: 'customer-service' },
  { slug: 'complaints-handler', name_en: 'Complaints Handler', name_he: 'מטפל/ת בתלונות', fieldSlug: 'customer-service' },

  // Design & Creative
  { slug: 'graphic-designer', name_en: 'Graphic Designer', name_he: 'מעצב/ת גרפי', fieldSlug: 'design' },
  { slug: 'ui-designer', name_en: 'UI Designer', name_he: 'מעצב/ת UI', fieldSlug: 'design' },
  { slug: 'ux-designer', name_en: 'UX Designer', name_he: 'מעצב/ת UX', fieldSlug: 'design' },
  { slug: 'product-designer', name_en: 'Product Designer', name_he: 'מעצב/ת מוצר', fieldSlug: 'design' },
  { slug: 'web-designer', name_en: 'Web Designer', name_he: 'מעצב/ת אתרים', fieldSlug: 'design' },
  { slug: 'motion-designer', name_en: 'Motion Designer', name_he: 'מעצב/ת אנימציה', fieldSlug: 'design' },
  { slug: 'illustrator', name_en: 'Illustrator', name_he: 'מאייר/ת', fieldSlug: 'design' },
  { slug: 'video-editor', name_en: 'Video Editor', name_he: 'עורך/ת וידאו', fieldSlug: 'design' },
  { slug: 'art-director', name_en: 'Art Director', name_he: 'מנהל/ת אמנותי', fieldSlug: 'design' },
  { slug: 'creative-director', name_en: 'Creative Director', name_he: 'מנהל/ת קריאייטיב', fieldSlug: 'design' },
  { slug: 'brand-designer', name_en: 'Brand Designer', name_he: 'מעצב/ת מותג', fieldSlug: 'design' },
  { slug: '3d-designer', name_en: '3D Designer', name_he: 'מעצב/ת תלת מימד', fieldSlug: 'design' },

  // Logistics & Shipping
  { slug: 'logistics-manager', name_en: 'Logistics Manager', name_he: 'מנהל/ת לוגיסטיקה', fieldSlug: 'logistics' },
  { slug: 'warehouse-manager', name_en: 'Warehouse Manager', name_he: 'מנהל/ת מחסן', fieldSlug: 'logistics' },
  { slug: 'warehouse-worker', name_en: 'Warehouse Worker', name_he: 'עובד/ת מחסן', fieldSlug: 'logistics' },
  { slug: 'supply-chain-manager', name_en: 'Supply Chain Manager', name_he: 'מנהל/ת שרשרת אספקה', fieldSlug: 'logistics' },
  { slug: 'procurement-manager', name_en: 'Procurement Manager', name_he: 'מנהל/ת רכש', fieldSlug: 'logistics' },
  { slug: 'buyer', name_en: 'Buyer', name_he: 'קניין/ית', fieldSlug: 'logistics' },
  { slug: 'inventory-manager', name_en: 'Inventory Manager', name_he: 'מנהל/ת מלאי', fieldSlug: 'logistics' },
  { slug: 'shipping-coordinator', name_en: 'Shipping Coordinator', name_he: 'רכז/ת שילוח', fieldSlug: 'logistics' },
  { slug: 'customs-agent', name_en: 'Customs Agent', name_he: 'עמיל/ת מכס', fieldSlug: 'logistics' },
  { slug: 'forklift-operator', name_en: 'Forklift Operator', name_he: 'מפעיל/ת מלגזה', fieldSlug: 'logistics' },

  // Manufacturing & Industry
  { slug: 'production-manager', name_en: 'Production Manager', name_he: 'מנהל/ת ייצור', fieldSlug: 'manufacturing' },
  { slug: 'plant-manager', name_en: 'Plant Manager', name_he: 'מנהל/ת מפעל', fieldSlug: 'manufacturing' },
  { slug: 'machine-operator', name_en: 'Machine Operator', name_he: 'מפעיל/ת מכונות', fieldSlug: 'manufacturing' },
  { slug: 'cnc-operator', name_en: 'CNC Operator', name_he: 'מפעיל/ת CNC', fieldSlug: 'manufacturing' },
  { slug: 'assembly-worker', name_en: 'Assembly Worker', name_he: 'עובד/ת הרכבה', fieldSlug: 'manufacturing' },
  { slug: 'quality-inspector', name_en: 'Quality Inspector', name_he: 'בקר/ת איכות', fieldSlug: 'manufacturing' },
  { slug: 'shift-supervisor', name_en: 'Shift Supervisor', name_he: 'מנהל/ת משמרת', fieldSlug: 'manufacturing' },
  { slug: 'maintenance-technician', name_en: 'Maintenance Technician', name_he: 'טכנאי/ת תחזוקה', fieldSlug: 'manufacturing' },
  { slug: 'electrician', name_en: 'Electrician', name_he: 'חשמלאי/ת', fieldSlug: 'manufacturing' },
  { slug: 'welder', name_en: 'Welder', name_he: 'רתך/ית', fieldSlug: 'manufacturing' },
  { slug: 'packaging-worker', name_en: 'Packaging Worker', name_he: 'עובד/ת אריזה', fieldSlug: 'manufacturing' },
  { slug: 'lab-technician', name_en: 'Lab Technician', name_he: 'טכנאי/ת מעבדה', fieldSlug: 'manufacturing' },
  { slug: 'food-technologist', name_en: 'Food Technologist', name_he: 'טכנולוג/ית מזון', fieldSlug: 'manufacturing' },
  { slug: 'textile-worker', name_en: 'Textile Worker', name_he: 'עובד/ת טקסטיל', fieldSlug: 'manufacturing' },
  { slug: 'plastics-technician', name_en: 'Plastics Technician', name_he: 'טכנאי/ת פלסטיקה', fieldSlug: 'manufacturing' },

  // Healthcare & Medical
  { slug: 'doctor', name_en: 'Doctor / Physician', name_he: 'רופא/ה', fieldSlug: 'healthcare' },
  { slug: 'nurse', name_en: 'Nurse', name_he: 'אח/ות', fieldSlug: 'healthcare' },
  { slug: 'medical-secretary', name_en: 'Medical Secretary', name_he: 'מזכיר/ה רפואי', fieldSlug: 'healthcare' },
  { slug: 'pharmacist', name_en: 'Pharmacist', name_he: 'רוקח/ת', fieldSlug: 'healthcare' },
  { slug: 'dentist', name_en: 'Dentist', name_he: 'רופא/ת שיניים', fieldSlug: 'healthcare' },
  { slug: 'dental-assistant', name_en: 'Dental Assistant', name_he: 'סייע/ת רופא שיניים', fieldSlug: 'healthcare' },
  { slug: 'physiotherapist', name_en: 'Physiotherapist', name_he: 'פיזיותרפיסט/ית', fieldSlug: 'healthcare' },
  { slug: 'occupational-therapist', name_en: 'Occupational Therapist', name_he: 'מרפא/ה בעיסוק', fieldSlug: 'healthcare' },
  { slug: 'psychologist', name_en: 'Psychologist', name_he: 'פסיכולוג/ית', fieldSlug: 'healthcare' },
  { slug: 'dietitian', name_en: 'Dietitian', name_he: 'דיאטן/ית', fieldSlug: 'healthcare' },
  { slug: 'paramedic', name_en: 'Paramedic', name_he: 'פרמדיק', fieldSlug: 'healthcare' },
  { slug: 'medical-lab-tech', name_en: 'Medical Lab Technician', name_he: 'טכנאי/ת מעבדה רפואית', fieldSlug: 'healthcare' },
  { slug: 'radiographer', name_en: 'Radiographer', name_he: 'טכנולוג/ית רנטגן', fieldSlug: 'healthcare' },
  { slug: 'caregiver', name_en: 'Caregiver', name_he: 'מטפל/ת', fieldSlug: 'healthcare' },
  { slug: 'hospital-admin', name_en: 'Hospital Administrator', name_he: 'מנהל/ת בית חולים', fieldSlug: 'healthcare' },
  { slug: 'medical-device-tech', name_en: 'Medical Device Technician', name_he: 'טכנאי/ת ציוד רפואי', fieldSlug: 'healthcare' },
  { slug: 'optometrist', name_en: 'Optometrist', name_he: 'אופטומטריסט/ית', fieldSlug: 'healthcare' },
  { slug: 'speech-therapist', name_en: 'Speech Therapist', name_he: 'קלינאי/ת תקשורת', fieldSlug: 'healthcare' },
  { slug: 'veterinarian', name_en: 'Veterinarian', name_he: 'וטרינר/ית', fieldSlug: 'healthcare' },
  { slug: 'vet-assistant', name_en: 'Veterinary Assistant', name_he: 'עוזר/ת וטרינר', fieldSlug: 'healthcare' },

  // Education & Teaching
  { slug: 'teacher', name_en: 'Teacher', name_he: 'מורה', fieldSlug: 'education' },
  { slug: 'kindergarten-teacher', name_en: 'Kindergarten Teacher', name_he: 'גננת', fieldSlug: 'education' },
  { slug: 'special-education-teacher', name_en: 'Special Education Teacher', name_he: 'מורה לחינוך מיוחד', fieldSlug: 'education' },
  { slug: 'tutor', name_en: 'Tutor', name_he: 'מורה פרטי', fieldSlug: 'education' },
  { slug: 'lecturer', name_en: 'Lecturer', name_he: 'מרצה', fieldSlug: 'education' },
  { slug: 'professor', name_en: 'Professor', name_he: 'פרופסור', fieldSlug: 'education' },
  { slug: 'school-principal', name_en: 'School Principal', name_he: 'מנהל/ת בית ספר', fieldSlug: 'education' },
  { slug: 'education-coordinator', name_en: 'Education Coordinator', name_he: 'רכז/ת חינוך', fieldSlug: 'education' },
  { slug: 'guidance-counselor', name_en: 'Guidance Counselor', name_he: 'יועץ/ת חינוכי', fieldSlug: 'education' },
  { slug: 'teaching-assistant', name_en: 'Teaching Assistant', name_he: 'סייע/ת הוראה', fieldSlug: 'education' },
  { slug: 'trainer', name_en: 'Trainer / Instructor', name_he: 'מדריך/ה', fieldSlug: 'education' },
  { slug: 'curriculum-developer', name_en: 'Curriculum Developer', name_he: 'מפתח/ת תוכניות לימוד', fieldSlug: 'education' },

  // Legal
  { slug: 'lawyer', name_en: 'Lawyer / Attorney', name_he: 'עורך/ת דין', fieldSlug: 'legal' },
  { slug: 'legal-counsel', name_en: 'Legal Counsel', name_he: 'יועץ/ת משפטי', fieldSlug: 'legal' },
  { slug: 'paralegal', name_en: 'Paralegal', name_he: 'פרה-ליגל', fieldSlug: 'legal' },
  { slug: 'legal-secretary', name_en: 'Legal Secretary', name_he: 'מזכיר/ה משפטי', fieldSlug: 'legal' },
  { slug: 'notary', name_en: 'Notary', name_he: 'נוטריון', fieldSlug: 'legal' },
  { slug: 'compliance-officer', name_en: 'Compliance Officer', name_he: 'קצין/ת ציות', fieldSlug: 'legal' },
  { slug: 'contracts-manager', name_en: 'Contracts Manager', name_he: 'מנהל/ת חוזים', fieldSlug: 'legal' },
  { slug: 'patent-attorney', name_en: 'Patent Attorney', name_he: 'עורך/ת דין פטנטים', fieldSlug: 'legal' },

  // Media & PR
  { slug: 'journalist', name_en: 'Journalist', name_he: 'עיתונאי/ת', fieldSlug: 'media' },
  { slug: 'editor', name_en: 'Editor', name_he: 'עורך/ת', fieldSlug: 'media' },
  { slug: 'pr-manager', name_en: 'PR Manager', name_he: 'מנהל/ת יחסי ציבור', fieldSlug: 'media' },
  { slug: 'pr-specialist', name_en: 'PR Specialist', name_he: 'איש/ת יחסי ציבור', fieldSlug: 'media' },
  { slug: 'communications-manager', name_en: 'Communications Manager', name_he: 'מנהל/ת תקשורת', fieldSlug: 'media' },
  { slug: 'spokesperson', name_en: 'Spokesperson', name_he: 'דובר/ת', fieldSlug: 'media' },
  { slug: 'news-anchor', name_en: 'News Anchor', name_he: 'מגיש/ת חדשות', fieldSlug: 'media' },
  { slug: 'producer', name_en: 'Producer', name_he: 'מפיק/ה', fieldSlug: 'media' },
  { slug: 'photographer', name_en: 'Photographer', name_he: 'צלם/ת', fieldSlug: 'media' },
  { slug: 'videographer', name_en: 'Videographer', name_he: 'צלם/ת וידאו', fieldSlug: 'media' },

  // Real Estate
  { slug: 'real-estate-agent', name_en: 'Real Estate Agent', name_he: 'סוכן/ת נדל"ן', fieldSlug: 'real-estate' },
  { slug: 'property-manager', name_en: 'Property Manager', name_he: 'מנהל/ת נכסים', fieldSlug: 'real-estate' },
  { slug: 'real-estate-appraiser', name_en: 'Real Estate Appraiser', name_he: 'שמאי/ת מקרקעין', fieldSlug: 'real-estate' },
  { slug: 'real-estate-developer', name_en: 'Real Estate Developer', name_he: 'יזם/ית נדל"ן', fieldSlug: 'real-estate' },
  { slug: 'leasing-agent', name_en: 'Leasing Agent', name_he: 'סוכן/ת השכרה', fieldSlug: 'real-estate' },
  { slug: 'mortgage-consultant', name_en: 'Mortgage Consultant', name_he: 'יועץ/ת משכנתאות', fieldSlug: 'real-estate' },
  { slug: 'building-manager', name_en: 'Building Manager', name_he: 'מנהל/ת בניין', fieldSlug: 'real-estate' },
  { slug: 'real-estate-lawyer', name_en: 'Real Estate Lawyer', name_he: 'עו"ד נדל"ן', fieldSlug: 'real-estate' },

  // Hospitality & Tourism
  { slug: 'hotel-manager', name_en: 'Hotel Manager', name_he: 'מנהל/ת מלון', fieldSlug: 'hospitality' },
  { slug: 'front-desk', name_en: 'Front Desk Agent', name_he: 'פקיד/ת קבלה במלון', fieldSlug: 'hospitality' },
  { slug: 'concierge', name_en: 'Concierge', name_he: 'קונסיירז', fieldSlug: 'hospitality' },
  { slug: 'housekeeper', name_en: 'Housekeeper', name_he: 'חדרן/ית', fieldSlug: 'hospitality' },
  { slug: 'chef', name_en: 'Chef', name_he: 'שף', fieldSlug: 'hospitality' },
  { slug: 'sous-chef', name_en: 'Sous Chef', name_he: 'סו-שף', fieldSlug: 'hospitality' },
  { slug: 'cook', name_en: 'Cook', name_he: 'טבח/ית', fieldSlug: 'hospitality' },
  { slug: 'waiter', name_en: 'Waiter / Waitress', name_he: 'מלצר/ית', fieldSlug: 'hospitality' },
  { slug: 'bartender', name_en: 'Bartender', name_he: 'ברמן/ית', fieldSlug: 'hospitality' },
  { slug: 'restaurant-manager', name_en: 'Restaurant Manager', name_he: 'מנהל/ת מסעדה', fieldSlug: 'hospitality' },
  { slug: 'tour-guide', name_en: 'Tour Guide', name_he: 'מדריך/ת טיולים', fieldSlug: 'hospitality' },
  { slug: 'travel-agent', name_en: 'Travel Agent', name_he: 'סוכן/ת נסיעות', fieldSlug: 'hospitality' },

  // Retail & Commerce
  { slug: 'store-manager', name_en: 'Store Manager', name_he: 'מנהל/ת חנות', fieldSlug: 'retail' },
  { slug: 'assistant-store-manager', name_en: 'Assistant Store Manager', name_he: 'סגן/ית מנהל חנות', fieldSlug: 'retail' },
  { slug: 'sales-associate', name_en: 'Sales Associate', name_he: 'מוכר/ת', fieldSlug: 'retail' },
  { slug: 'cashier', name_en: 'Cashier', name_he: 'קופאי/ת', fieldSlug: 'retail' },
  { slug: 'visual-merchandiser', name_en: 'Visual Merchandiser', name_he: 'מעצב/ת חלונות ראווה', fieldSlug: 'retail' },
  { slug: 'stock-clerk', name_en: 'Stock Clerk', name_he: 'עובד/ת מלאי', fieldSlug: 'retail' },
  { slug: 'e-commerce-manager', name_en: 'E-commerce Manager', name_he: 'מנהל/ת אי-קומרס', fieldSlug: 'retail' },
  { slug: 'category-manager', name_en: 'Category Manager', name_he: 'מנהל/ת קטגוריה', fieldSlug: 'retail' },
  { slug: 'retail-buyer', name_en: 'Retail Buyer', name_he: 'קניין/ית קמעונאי', fieldSlug: 'retail' },
  { slug: 'loss-prevention', name_en: 'Loss Prevention Specialist', name_he: 'מומחה/ית למניעת גניבות', fieldSlug: 'retail' },

  // Construction & Infrastructure
  { slug: 'construction-manager', name_en: 'Construction Manager', name_he: 'מנהל/ת בנייה', fieldSlug: 'construction' },
  { slug: 'site-supervisor', name_en: 'Site Supervisor', name_he: 'מפקח/ת עבודות', fieldSlug: 'construction' },
  { slug: 'construction-worker', name_en: 'Construction Worker', name_he: 'פועל/ת בניין', fieldSlug: 'construction' },
  { slug: 'carpenter', name_en: 'Carpenter', name_he: 'נגר/ית', fieldSlug: 'construction' },
  { slug: 'plumber', name_en: 'Plumber', name_he: 'אינסטלטור/ית', fieldSlug: 'construction' },
  { slug: 'painter', name_en: 'Painter', name_he: 'צבע/ית', fieldSlug: 'construction' },
  { slug: 'tile-setter', name_en: 'Tile Setter', name_he: 'רצף/ית', fieldSlug: 'construction' },
  { slug: 'heavy-equipment-operator', name_en: 'Heavy Equipment Operator', name_he: 'מפעיל/ת ציוד כבד', fieldSlug: 'construction' },
  { slug: 'crane-operator', name_en: 'Crane Operator', name_he: 'מפעיל/ת מנוף', fieldSlug: 'construction' },
  { slug: 'architect', name_en: 'Architect', name_he: 'אדריכל/ית', fieldSlug: 'construction' },
  { slug: 'interior-designer', name_en: 'Interior Designer', name_he: 'מעצב/ת פנים', fieldSlug: 'construction' },
  { slug: 'surveyor', name_en: 'Surveyor', name_he: 'מודד/ת', fieldSlug: 'construction' },

  // Security & Safety
  { slug: 'security-guard', name_en: 'Security Guard', name_he: 'מאבטח/ת', fieldSlug: 'security' },
  { slug: 'security-manager', name_en: 'Security Manager', name_he: 'מנהל/ת ביטחון', fieldSlug: 'security' },
  { slug: 'bodyguard', name_en: 'Bodyguard', name_he: 'שומר/ת ראש', fieldSlug: 'security' },
  { slug: 'cctv-operator', name_en: 'CCTV Operator', name_he: 'מפעיל/ת מצלמות', fieldSlug: 'security' },
  { slug: 'security-consultant', name_en: 'Security Consultant', name_he: 'יועץ/ת ביטחון', fieldSlug: 'security' },
  { slug: 'fire-safety-officer', name_en: 'Fire Safety Officer', name_he: 'קצין/ת בטיחות אש', fieldSlug: 'security' },

  // Drivers & Transportation
  { slug: 'truck-driver', name_en: 'Truck Driver', name_he: 'נהג/ת משאית', fieldSlug: 'drivers' },
  { slug: 'delivery-driver', name_en: 'Delivery Driver', name_he: 'נהג/ת משלוחים', fieldSlug: 'drivers' },
  { slug: 'bus-driver', name_en: 'Bus Driver', name_he: 'נהג/ת אוטובוס', fieldSlug: 'drivers' },
  { slug: 'taxi-driver', name_en: 'Taxi Driver', name_he: 'נהג/ת מונית', fieldSlug: 'drivers' },
  { slug: 'courier', name_en: 'Courier', name_he: 'שליח/ה', fieldSlug: 'drivers' },
  { slug: 'fleet-manager', name_en: 'Fleet Manager', name_he: 'מנהל/ת צי רכבים', fieldSlug: 'drivers' },
  { slug: 'dispatcher', name_en: 'Dispatcher', name_he: 'מוקדן/ית', fieldSlug: 'drivers' },
  { slug: 'forklift-driver', name_en: 'Forklift Driver', name_he: 'נהג/ת מלגזה', fieldSlug: 'drivers' },

  // Social Work & Welfare
  { slug: 'social-worker', name_en: 'Social Worker', name_he: 'עובד/ת סוציאלי', fieldSlug: 'social-work' },
  { slug: 'case-manager', name_en: 'Case Manager', name_he: 'מנהל/ת מקרה', fieldSlug: 'social-work' },
  { slug: 'youth-counselor', name_en: 'Youth Counselor', name_he: 'מדריך/ת נוער', fieldSlug: 'social-work' },
  { slug: 'community-coordinator', name_en: 'Community Coordinator', name_he: 'רכז/ת קהילה', fieldSlug: 'social-work' },
  { slug: 'welfare-officer', name_en: 'Welfare Officer', name_he: 'פקיד/ת רווחה', fieldSlug: 'social-work' },
  { slug: 'family-therapist', name_en: 'Family Therapist', name_he: 'מטפל/ת משפחתי', fieldSlug: 'social-work' },
  { slug: 'rehabilitation-counselor', name_en: 'Rehabilitation Counselor', name_he: 'יועץ/ת שיקום', fieldSlug: 'social-work' },
  { slug: 'nonprofit-manager', name_en: 'Nonprofit Manager', name_he: 'מנהל/ת עמותה', fieldSlug: 'social-work' },
  { slug: 'volunteer-coordinator', name_en: 'Volunteer Coordinator', name_he: 'רכז/ת מתנדבים', fieldSlug: 'social-work' },
  { slug: 'elderly-care-worker', name_en: 'Elderly Care Worker', name_he: 'מטפל/ת בקשישים', fieldSlug: 'social-work' },

  // Data & Analytics
  { slug: 'data-analyst', name_en: 'Data Analyst', name_he: 'אנליסט/ית נתונים', fieldSlug: 'data' },
  { slug: 'data-scientist', name_en: 'Data Scientist', name_he: 'מדען/ית נתונים', fieldSlug: 'data' },
  { slug: 'bi-analyst', name_en: 'BI Analyst', name_he: 'אנליסט/ית BI', fieldSlug: 'data' },
  { slug: 'bi-developer', name_en: 'BI Developer', name_he: 'מפתח/ת BI', fieldSlug: 'data' },
  { slug: 'data-architect', name_en: 'Data Architect', name_he: 'ארכיטקט/ית נתונים', fieldSlug: 'data' },
  { slug: 'analytics-manager', name_en: 'Analytics Manager', name_he: 'מנהל/ת אנליטיקס', fieldSlug: 'data' },
  { slug: 'statistician', name_en: 'Statistician', name_he: 'סטטיסטיקאי/ת', fieldSlug: 'data' },
  { slug: 'research-analyst', name_en: 'Research Analyst', name_he: 'אנליסט/ית מחקר', fieldSlug: 'data' },
  { slug: 'market-research', name_en: 'Market Research Analyst', name_he: 'חוקר/ת שוק', fieldSlug: 'data' },
  { slug: 'quantitative-analyst', name_en: 'Quantitative Analyst', name_he: 'אנליסט/ית כמותי', fieldSlug: 'data' },
  { slug: 'etl-developer', name_en: 'ETL Developer', name_he: 'מפתח/ת ETL', fieldSlug: 'data' },
  { slug: 'data-governance', name_en: 'Data Governance Specialist', name_he: 'מומחה/ית ממשל נתונים', fieldSlug: 'data' },

  // Insurance & Banking
  { slug: 'bank-teller', name_en: 'Bank Teller', name_he: 'פקיד/ת בנק', fieldSlug: 'insurance' },
  { slug: 'bank-manager', name_en: 'Bank Manager', name_he: 'מנהל/ת סניף בנק', fieldSlug: 'insurance' },
  { slug: 'loan-officer', name_en: 'Loan Officer', name_he: 'פקיד/ת הלוואות', fieldSlug: 'insurance' },
  { slug: 'mortgage-advisor', name_en: 'Mortgage Advisor', name_he: 'יועץ/ת משכנתאות', fieldSlug: 'insurance' },
  { slug: 'insurance-agent', name_en: 'Insurance Agent', name_he: 'סוכן/ת ביטוח', fieldSlug: 'insurance' },
  { slug: 'underwriter', name_en: 'Underwriter', name_he: 'חתם/ית', fieldSlug: 'insurance' },
  { slug: 'claims-adjuster', name_en: 'Claims Adjuster', name_he: 'שמאי/ת תביעות', fieldSlug: 'insurance' },
  { slug: 'actuary', name_en: 'Actuary', name_he: 'אקטואר/ית', fieldSlug: 'insurance' },
  { slug: 'investment-banker', name_en: 'Investment Banker', name_he: 'בנקאי/ת השקעות', fieldSlug: 'insurance' },
  { slug: 'wealth-manager', name_en: 'Wealth Manager', name_he: 'מנהל/ת תיקי השקעות', fieldSlug: 'insurance' },
  { slug: 'financial-advisor', name_en: 'Financial Advisor', name_he: 'יועץ/ת פיננסי', fieldSlug: 'insurance' },
  { slug: 'branch-manager', name_en: 'Branch Manager', name_he: 'מנהל/ת סניף', fieldSlug: 'insurance' },
  { slug: 'fraud-analyst', name_en: 'Fraud Analyst', name_he: 'אנליסט/ית הונאות', fieldSlug: 'insurance' },
  { slug: 'relationship-manager', name_en: 'Relationship Manager', name_he: 'מנהל/ת קשרי לקוחות', fieldSlug: 'insurance' },
  { slug: 'pension-advisor', name_en: 'Pension Advisor', name_he: 'יועץ/ת פנסיוני', fieldSlug: 'insurance' },

  // Agriculture & Environment
  { slug: 'farm-manager', name_en: 'Farm Manager', name_he: 'מנהל/ת חווה', fieldSlug: 'agriculture' },
  { slug: 'agricultural-worker', name_en: 'Agricultural Worker', name_he: 'פועל/ת חקלאי', fieldSlug: 'agriculture' },
  { slug: 'agronomist', name_en: 'Agronomist', name_he: 'אגרונום/ית', fieldSlug: 'agriculture' },
  { slug: 'horticulturist', name_en: 'Horticulturist', name_he: 'גנן/ית נוי', fieldSlug: 'agriculture' },
  { slug: 'landscaper', name_en: 'Landscaper', name_he: 'גנן/ית', fieldSlug: 'agriculture' },
  { slug: 'environmental-consultant', name_en: 'Environmental Consultant', name_he: 'יועץ/ת סביבתי', fieldSlug: 'agriculture' },
  { slug: 'sustainability-manager', name_en: 'Sustainability Manager', name_he: 'מנהל/ת קיימות', fieldSlug: 'agriculture' },
  { slug: 'wildlife-biologist', name_en: 'Wildlife Biologist', name_he: 'ביולוג/ית חיות בר', fieldSlug: 'agriculture' },

  // Culture & Entertainment
  { slug: 'actor', name_en: 'Actor / Actress', name_he: 'שחקן/ית', fieldSlug: 'culture' },
  { slug: 'musician', name_en: 'Musician', name_he: 'מוזיקאי/ת', fieldSlug: 'culture' },
  { slug: 'singer', name_en: 'Singer', name_he: 'זמר/ת', fieldSlug: 'culture' },
  { slug: 'dancer', name_en: 'Dancer', name_he: 'רקדן/ית', fieldSlug: 'culture' },
  { slug: 'director', name_en: 'Director', name_he: 'במאי/ת', fieldSlug: 'culture' },
  { slug: 'stage-manager', name_en: 'Stage Manager', name_he: 'מנהל/ת במה', fieldSlug: 'culture' },
  { slug: 'sound-technician', name_en: 'Sound Technician', name_he: 'טכנאי/ת סאונד', fieldSlug: 'culture' },
  { slug: 'lighting-technician', name_en: 'Lighting Technician', name_he: 'טכנאי/ת תאורה', fieldSlug: 'culture' },
  { slug: 'dj', name_en: 'DJ', name_he: 'דיג\'יי', fieldSlug: 'culture' },
  { slug: 'event-planner', name_en: 'Event Planner', name_he: 'מתכנן/ת אירועים', fieldSlug: 'culture' },

  // Sports & Fitness
  { slug: 'personal-trainer', name_en: 'Personal Trainer', name_he: 'מאמן/ת כושר אישי', fieldSlug: 'sports' },
  { slug: 'fitness-instructor', name_en: 'Fitness Instructor', name_he: 'מדריך/ת כושר', fieldSlug: 'sports' },
  { slug: 'gym-manager', name_en: 'Gym Manager', name_he: 'מנהל/ת חדר כושר', fieldSlug: 'sports' },
  { slug: 'sports-coach', name_en: 'Sports Coach', name_he: 'מאמן/ת ספורט', fieldSlug: 'sports' },
  { slug: 'sports-physiotherapist', name_en: 'Sports Physiotherapist', name_he: 'פיזיותרפיסט/ית ספורט', fieldSlug: 'sports' },
  { slug: 'sports-nutritionist', name_en: 'Sports Nutritionist', name_he: 'תזונאי/ת ספורט', fieldSlug: 'sports' },

  // Import & Export
  { slug: 'import-export-manager', name_en: 'Import/Export Manager', name_he: 'מנהל/ת יבוא/יצוא', fieldSlug: 'import-export' },
  { slug: 'international-sales', name_en: 'International Sales Manager', name_he: 'מנהל/ת מכירות בינלאומי', fieldSlug: 'import-export' },
  { slug: 'customs-broker', name_en: 'Customs Broker', name_he: 'עמיל/ת מכס', fieldSlug: 'import-export' },
  { slug: 'trade-compliance', name_en: 'Trade Compliance Specialist', name_he: 'מומחה/ית ציות סחר', fieldSlug: 'import-export' },
  { slug: 'freight-forwarder', name_en: 'Freight Forwarder', name_he: 'עמיל/ת שילוח', fieldSlug: 'import-export' },
  { slug: 'export-coordinator', name_en: 'Export Coordinator', name_he: 'רכז/ת יצוא', fieldSlug: 'import-export' },

  // Freelance & Self-employed
  { slug: 'freelance-developer', name_en: 'Freelance Developer', name_he: 'מפתח/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'freelance-designer', name_en: 'Freelance Designer', name_he: 'מעצב/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'freelance-writer', name_en: 'Freelance Writer', name_he: 'כותב/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'freelance-photographer', name_en: 'Freelance Photographer', name_he: 'צלם/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'freelance-consultant', name_en: 'Freelance Consultant', name_he: 'יועץ/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'freelance-translator', name_en: 'Freelance Translator', name_he: 'מתרגם/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'virtual-assistant', name_en: 'Virtual Assistant', name_he: 'עוזר/ת וירטואלי', fieldSlug: 'freelance' },
  { slug: 'freelance-marketer', name_en: 'Freelance Marketer', name_he: 'משווק/ת עצמאי', fieldSlug: 'freelance' },
  { slug: 'business-owner', name_en: 'Business Owner', name_he: 'בעל/ת עסק', fieldSlug: 'freelance' },
  { slug: 'contractor', name_en: 'Independent Contractor', name_he: 'קבלן/ית עצמאי', fieldSlug: 'freelance' },

  // Students & Entry Level
  { slug: 'intern', name_en: 'Intern', name_he: 'מתמחה', fieldSlug: 'students' },
  { slug: 'student-job', name_en: 'Student Job', name_he: 'עבודת סטודנטים', fieldSlug: 'students' },
  { slug: 'part-time', name_en: 'Part-time Position', name_he: 'משרה חלקית', fieldSlug: 'students' },
  { slug: 'apprentice', name_en: 'Apprentice', name_he: 'חניך/ה', fieldSlug: 'students' },
  { slug: 'junior-position', name_en: 'Junior Position', name_he: 'משרת כניסה', fieldSlug: 'students' },
  { slug: 'trainee', name_en: 'Trainee', name_he: 'מתאמן/ת', fieldSlug: 'students' },
  { slug: 'graduate-program', name_en: 'Graduate Program', name_he: 'תוכנית בוגרים', fieldSlug: 'students' },
  { slug: 'summer-job', name_en: 'Summer Job', name_he: 'עבודת קיץ', fieldSlug: 'students' },
];

// Experience levels (independent of field/role)
export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  { slug: 'entry', name_en: 'Entry Level / Student', name_he: 'ללא ניסיון / סטודנט', years_min: 0, years_max: 0 },
  { slug: 'junior', name_en: 'Junior', name_he: 'זוטר', years_min: 1, years_max: 2 },
  { slug: 'mid', name_en: 'Mid-Level', name_he: 'בינוני', years_min: 3, years_max: 5 },
  { slug: 'senior', name_en: 'Senior', name_he: 'בכיר', years_min: 6, years_max: 10 },
  { slug: 'lead', name_en: 'Lead / Team Lead', name_he: 'מוביל / ראש צוות', years_min: 8, years_max: 15 },
  { slug: 'executive', name_en: 'Executive / Director', name_he: 'מנהל בכיר / דירקטור', years_min: 15, years_max: null },
];

// Helper functions
export function getFieldBySlug(slug: string): JobField | undefined {
  return JOB_FIELDS.find(f => f.slug === slug);
}

export function getRolesByField(fieldSlug: string): JobRole[] {
  return JOB_ROLES.filter(r => r.fieldSlug === fieldSlug);
}

export function getRoleBySlug(slug: string): JobRole | undefined {
  return JOB_ROLES.find(r => r.slug === slug);
}

export function getExperienceLevelBySlug(slug: string): ExperienceLevel | undefined {
  return EXPERIENCE_LEVELS.find(e => e.slug === slug);
}

export function getFieldName(slug: string, language: 'en' | 'he'): string {
  const field = getFieldBySlug(slug);
  return field ? (language === 'he' ? field.name_he : field.name_en) : slug;
}

export function getRoleName(slug: string, language: 'en' | 'he'): string {
  const role = getRoleBySlug(slug);
  return role ? (language === 'he' ? role.name_he : role.name_en) : slug;
}

export function getExperienceLevelName(slug: string, language: 'en' | 'he'): string {
  const level = getExperienceLevelBySlug(slug);
  return level ? (language === 'he' ? level.name_he : level.name_en) : slug;
}
