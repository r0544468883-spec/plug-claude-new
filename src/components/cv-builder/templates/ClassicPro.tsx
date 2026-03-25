import { TemplateProps } from '../types';
import { Mail, Phone, MapPin } from 'lucide-react';

export const ClassicPro = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-white text-gray-900 w-full min-h-[297mm] font-serif p-8"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Header - Centered Classic Style */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-4xl font-bold tracking-wide uppercase">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="text-xl text-gray-600 mt-2">{personalInfo.title || 'Professional Title'}</p>
        
        <div className="flex justify-center flex-wrap gap-6 mt-4 text-sm text-gray-600">
          {personalInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {personalInfo.email}
            </span>
          )}
          {personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {personalInfo.phone}
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {personalInfo.location}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {personalInfo.summary && (
        <div className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
            Professional Summary
          </h2>
          <p className={`text-gray-700 leading-relaxed text-justify ${fontSizeClass}`}>
            {personalInfo.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
            Professional Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold">{exp.role}</h3>
                  <span className={`text-gray-500 italic ${fontSizeClass}`}>
                    {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                <p className="text-gray-600 italic">{exp.company}</p>
                {exp.bullets.length > 0 && (
                  <ul className={`mt-2 list-disc ml-5 text-gray-700 ${fontSizeClass}`}>
                    {exp.bullets.map((bullet, idx) => (
                      <li key={idx} className="mb-1">{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline">
                <div>
                  <h3 className="font-bold">{edu.degree} in {edu.field}</h3>
                  <p className="text-gray-600 italic">{edu.institution}</p>
                </div>
                <span className={`text-gray-500 italic ${fontSizeClass}`}>
                  {edu.startDate} - {edu.endDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout for Skills and Certifications */}
      <div className="grid grid-cols-2 gap-8">
        {/* Skills */}
        {(skills.technical.length > 0 || skills.soft.length > 0) && (
          <div className="mb-6">
            <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
              Skills
            </h2>
            
            {skills.technical.length > 0 && (
              <div className="mb-3">
                <h3 className={`font-semibold text-gray-700 ${fontSizeClass}`}>Technical:</h3>
                <p className={`text-gray-600 ${fontSizeClass}`}>
                  {skills.technical.join(' • ')}
                </p>
              </div>
            )}
            
            {skills.soft.length > 0 && (
              <div>
                <h3 className={`font-semibold text-gray-700 ${fontSizeClass}`}>Soft Skills:</h3>
                <p className={`text-gray-600 ${fontSizeClass}`}>
                  {skills.soft.join(' • ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Languages & Certifications */}
        <div>
          {skills.languages.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
                Languages
              </h2>
              <ul className={`${fontSizeClass}`}>
                {skills.languages.map((lang, idx) => (
                  <li key={idx} className="text-gray-700">
                    {lang.name} - <span className="italic capitalize">{lang.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
                Certifications
              </h2>
              <ul className={`${fontSizeClass}`}>
                {certifications.map((cert) => (
                  <li key={cert.id} className="text-gray-700">
                    {cert.name} - {cert.issuer} ({cert.date})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wide border-b pb-1 mb-3" style={{ color: settings.headingColor ?? '#111827', borderColor: settings.headingColor ? `${settings.headingColor}55` : '#d1d5db' }}>
            Projects
          </h2>
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id}>
                <h3 className="font-bold inline">{project.name}</h3>
                {project.url && (
                  <span className={`text-gray-500 ml-2 ${fontSizeClass}`}>({project.url})</span>
                )}
                <p className={`text-gray-700 ${fontSizeClass}`}>{project.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
