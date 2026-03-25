import { TemplateProps } from '../types';
import { Mail, Phone, MapPin, BookOpen } from 'lucide-react';

export const Academic = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-white text-gray-900 w-full min-h-[297mm] font-serif p-10"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Academic Header */}
      <div className="text-center mb-8 pb-4 border-b-2" style={{ borderColor: settings.accentColor }}>
        <h1 className="text-3xl font-bold" style={{ color: settings.accentColor }}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="text-lg text-gray-600 mt-1">{personalInfo.title || 'Academic Title'}</p>
        
        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>|</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>|</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
      </div>

      {/* Research Interests / Summary */}
      {personalInfo.summary && (
        <div className="mb-6">
          <h2 
            className="font-bold mb-2 flex items-center gap-2"
            style={{ color: settings.accentColor }}
          >
            <BookOpen className="w-4 h-4" />
            RESEARCH INTERESTS
          </h2>
          <p className={`text-gray-700 ${fontSizeClass}`}>
            {personalInfo.summary}
          </p>
        </div>
      )}

      {/* Education - Primary for academics */}
      {education.length > 0 && (
        <div className="mb-6">
          <h2 
            className="font-bold mb-3 border-b pb-1"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            EDUCATION
          </h2>
          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id} className={fontSizeClass}>
                <div className="flex justify-between">
                  <p className="font-bold">{edu.degree} in {edu.field}</p>
                  <span className="text-gray-500">{edu.startDate} – {edu.endDate}</span>
                </div>
                <p className="italic" style={{ color: settings.accentColor }}>{edu.institution}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Academic/Professional Experience */}
      {experience.length > 0 && (
        <div className="mb-6">
          <h2 
            className="font-bold mb-3 border-b pb-1"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            ACADEMIC EXPERIENCE
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className={fontSizeClass}>
                <div className="flex justify-between">
                  <p className="font-bold">{exp.role}</p>
                  <span className="text-gray-500">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                </div>
                <p className="italic" style={{ color: settings.accentColor }}>{exp.company}</p>
                {exp.bullets.length > 0 && (
                  <ul className="mt-1 list-disc ml-5 text-gray-700">
                    {exp.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications (using projects) */}
      {projects.length > 0 && (
        <div className="mb-6">
          <h2 
            className="font-bold mb-3 border-b pb-1"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            PUBLICATIONS & PROJECTS
          </h2>
          <ul className={`space-y-2 ${fontSizeClass}`}>
            {projects.map((project) => (
              <li key={project.id}>
                <p>
                  <span className="font-semibold">{project.name}</span>
                  {project.url && <span className="text-gray-500"> [{project.url}]</span>}
                </p>
                <p className="text-gray-600 ml-4">{project.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Skills / Expertise */}
        {skills.technical.length > 0 && (
          <div className="mb-6">
            <h2 
              className="font-bold mb-2 border-b pb-1"
              style={{ color: settings.accentColor, borderColor: settings.accentColor }}
            >
              AREAS OF EXPERTISE
            </h2>
            <ul className={`list-disc ml-5 ${fontSizeClass}`}>
              {skills.technical.map((skill, idx) => (
                <li key={idx}>{skill}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Languages */}
        {skills.languages.length > 0 && (
          <div className="mb-6">
            <h2 
              className="font-bold mb-2 border-b pb-1"
              style={{ color: settings.accentColor, borderColor: settings.accentColor }}
            >
              LANGUAGES
            </h2>
            <ul className={`${fontSizeClass}`}>
              {skills.languages.map((lang, idx) => (
                <li key={idx}>
                  {lang.name} – <span className="capitalize">{lang.level}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Awards & Honors (using certifications) */}
      {certifications.length > 0 && (
        <div className="mb-6">
          <h2 
            className="font-bold mb-2 border-b pb-1"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            AWARDS & HONORS
          </h2>
          <ul className={`space-y-1 ${fontSizeClass}`}>
            {certifications.map((cert) => (
              <li key={cert.id}>
                <span className="font-semibold">{cert.name}</span>, {cert.issuer} ({cert.date})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
