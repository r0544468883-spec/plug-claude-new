import { TemplateProps } from '../types';
import { Mail, Phone, MapPin, Linkedin } from 'lucide-react';

export const Executive = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-white text-gray-900 w-full min-h-[297mm] font-serif"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Elegant Header */}
      <div className="px-10 pt-10 pb-6">
        <div className="border-b-4 pb-6 flex items-start gap-5" style={{ borderColor: settings.accentColor }}>
          {personalInfo.photo && (
            <img
              src={personalInfo.photo}
              alt={personalInfo.fullName}
              className="w-24 h-24 rounded object-cover border shrink-0"
              style={{ borderColor: settings.accentColor }}
            />
          )}
          <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: settings.accentColor }}>
            {personalInfo.fullName || 'Your Name'}
          </h1>
          <p className="text-xl text-gray-600 mt-2 font-light italic">
            {personalInfo.title || 'Executive Title'}
          </p>
          
          <div className="flex gap-8 mt-4 text-sm text-gray-600">
            {personalInfo.email && (
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: settings.accentColor }} />
                {personalInfo.email}
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: settings.accentColor }} />
                {personalInfo.phone}
              </span>
            )}
            {personalInfo.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: settings.accentColor }} />
                {personalInfo.location}
              </span>
            )}
          </div>
          </div>
        </div>
      </div>

      <div className="px-10 pb-10">
        {/* Executive Summary */}
        {personalInfo.summary && (
          <div className="mb-8">
            <h2 
              className="text-lg font-bold uppercase tracking-widest mb-3"
              style={{ color: settings.accentColor }}
            >
              Executive Summary
            </h2>
            <p className={`text-gray-700 leading-relaxed ${fontSizeClass}`}>
              {personalInfo.summary}
            </p>
          </div>
        )}

        {/* Core Competencies - Skills in elegant grid */}
        {skills.technical.length > 0 && (
          <div className="mb-8">
            <h2 
              className="text-lg font-bold uppercase tracking-widest mb-3"
              style={{ color: settings.accentColor }}
            >
              Core Competencies
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {skills.technical.map((skill, idx) => (
                <div 
                  key={idx}
                  className={`text-center py-2 border ${fontSizeClass}`}
                  style={{ borderColor: settings.accentColor, color: settings.accentColor }}
                >
                  {skill}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professional Experience */}
        {experience.length > 0 && (
          <div className="mb-8">
            <h2 
              className="text-lg font-bold uppercase tracking-widest mb-4"
              style={{ color: settings.accentColor }}
            >
              Professional Experience
            </h2>
            <div className="space-y-6">
              {experience.map((exp) => (
                <div key={exp.id} className="border-l-2 pl-4" style={{ borderColor: settings.accentColor }}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-lg font-bold">{exp.role}</h3>
                    <span className={`text-gray-500 ${fontSizeClass}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <p className="font-semibold" style={{ color: settings.accentColor }}>{exp.company}</p>
                  {exp.bullets.length > 0 && (
                    <ul className={`mt-3 space-y-2 text-gray-700 ${fontSizeClass}`}>
                      {exp.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: settings.accentColor }} />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-10">
          {/* Education */}
          {education.length > 0 && (
            <div>
              <h2 
                className="text-lg font-bold uppercase tracking-widest mb-3"
                style={{ color: settings.accentColor }}
              >
                Education
              </h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <h3 className="font-bold">{edu.degree}</h3>
                    <p className="text-gray-600">{edu.field}</p>
                    <p style={{ color: settings.accentColor }}>{edu.institution}</p>
                    <p className={`text-gray-500 ${fontSizeClass}`}>{edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Board & Affiliations (using certifications) */}
          {certifications.length > 0 && (
            <div>
              <h2 
                className="text-lg font-bold uppercase tracking-widest mb-3"
                style={{ color: settings.accentColor }}
              >
                Certifications & Affiliations
              </h2>
              <div className="space-y-2">
                {certifications.map((cert) => (
                  <div key={cert.id} className={fontSizeClass}>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-gray-500">{cert.issuer}, {cert.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Languages */}
        {skills.languages.length > 0 && (
          <div className="mt-8">
            <h2 
              className="text-lg font-bold uppercase tracking-widest mb-3"
              style={{ color: settings.accentColor }}
            >
              Languages
            </h2>
            <div className="flex gap-6">
              {skills.languages.map((lang, idx) => (
                <span key={idx} className={fontSizeClass}>
                  <span className="font-semibold">{lang.name}</span>
                  <span className="text-gray-500 ml-1">({lang.level})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
