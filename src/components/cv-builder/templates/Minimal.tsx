import { TemplateProps } from '../types';

export const Minimal = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-white text-gray-900 w-full min-h-[297mm] font-sans p-10"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Minimal Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="text-gray-500 mt-1">{personalInfo.title || 'Professional Title'}</p>
        
        <div className="flex gap-4 mt-3 text-sm text-gray-500">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>•</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>•</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
      </div>

      {/* Summary */}
      {personalInfo.summary && (
        <div className="mb-8">
          <p className={`text-gray-600 leading-relaxed ${fontSizeClass}`}>
            {personalInfo.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-8">
          <h2 
            className="text-xs uppercase tracking-widest mb-4 pb-2 border-b"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            Experience
          </h2>
          <div className="space-y-5">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{exp.role}</h3>
                    <p className="text-gray-500">{exp.company}</p>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                {exp.bullets.length > 0 && (
                  <ul className={`mt-2 space-y-1 text-gray-600 ${fontSizeClass}`}>
                    {exp.bullets.map((bullet, idx) => (
                      <li key={idx} className="pl-4 relative before:content-['–'] before:absolute before:left-0 before:text-gray-400">
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

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-8">
          <h2 
            className="text-xs uppercase tracking-widest mb-4 pb-2 border-b"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between">
                <div>
                  <h3 className="font-medium">{edu.degree}, {edu.field}</h3>
                  <p className="text-gray-500">{edu.institution}</p>
                </div>
                <span className="text-gray-400 text-sm">{edu.endDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(skills.technical.length > 0 || skills.soft.length > 0) && (
        <div className="mb-8">
          <h2 
            className="text-xs uppercase tracking-widest mb-4 pb-2 border-b"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            Skills
          </h2>
          <div className={`text-gray-600 ${fontSizeClass}`}>
            {skills.technical.length > 0 && (
              <p className="mb-2">
                <span className="text-gray-900">Technical:</span> {skills.technical.join(', ')}
              </p>
            )}
            {skills.soft.length > 0 && (
              <p>
                <span className="text-gray-900">Soft:</span> {skills.soft.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Languages */}
      {skills.languages.length > 0 && (
        <div className="mb-8">
          <h2 
            className="text-xs uppercase tracking-widest mb-4 pb-2 border-b"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            Languages
          </h2>
          <p className={`text-gray-600 ${fontSizeClass}`}>
            {skills.languages.map((lang, idx) => (
              <span key={idx}>
                {lang.name} ({lang.level}){idx < skills.languages.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="mb-8">
          <h2 
            className="text-xs uppercase tracking-widest mb-4 pb-2 border-b"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            Certifications
          </h2>
          <div className={`space-y-1 ${fontSizeClass}`}>
            {certifications.map((cert) => (
              <p key={cert.id} className="text-gray-600">
                {cert.name} – {cert.issuer}, {cert.date}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-8">
          <h2 
            className="text-xs uppercase tracking-widest mb-4 pb-2 border-b"
            style={{ color: settings.accentColor, borderColor: settings.accentColor }}
          >
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id}>
                <h3 className="font-medium">
                  {project.name}
                  {project.url && (
                    <span className="text-gray-400 font-normal ml-2 text-sm">{project.url}</span>
                  )}
                </h3>
                <p className={`text-gray-600 ${fontSizeClass}`}>{project.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
