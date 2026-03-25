import { TemplateProps } from '../types';

export const Traditional = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-white text-black w-full min-h-[297mm] font-serif p-10"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Simple Traditional Header */}
      <div className="text-center mb-6 pb-4 border-b-2 border-black">
        <h1 className="text-3xl font-bold uppercase tracking-wide">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        
        <div className="mt-2 text-sm">
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.phone && (
            <>
              <span className="mx-2">•</span>
              <span>{personalInfo.phone}</span>
            </>
          )}
          {personalInfo.email && (
            <>
              <span className="mx-2">•</span>
              <span>{personalInfo.email}</span>
            </>
          )}
        </div>
      </div>

      {/* Objective / Summary */}
      {personalInfo.summary && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Objective
          </h2>
          <p className={`text-gray-800 ${fontSizeClass}`}>
            {personalInfo.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between font-bold">
                  <span>{exp.company}</span>
                  <span className={fontSizeClass}>{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                </div>
                <p className="italic">{exp.role}</p>
                {exp.bullets.length > 0 && (
                  <ul className={`mt-1 list-disc ml-5 ${fontSizeClass}`}>
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

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Education
          </h2>
          <div className="space-y-2">
            {education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between font-bold">
                  <span>{edu.institution}</span>
                  <span className={fontSizeClass}>{edu.startDate} – {edu.endDate}</span>
                </div>
                <p className="italic">{edu.degree} in {edu.field}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(skills.technical.length > 0 || skills.soft.length > 0) && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Skills
          </h2>
          <div className={fontSizeClass}>
            {skills.technical.length > 0 && (
              <p className="mb-1">
                <span className="font-bold">Technical:</span> {skills.technical.join(', ')}
              </p>
            )}
            {skills.soft.length > 0 && (
              <p>
                <span className="font-bold">Interpersonal:</span> {skills.soft.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Languages */}
      {skills.languages.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Languages
          </h2>
          <p className={fontSizeClass}>
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
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Certifications
          </h2>
          <ul className={`list-disc ml-5 ${fontSizeClass}`}>
            {certifications.map((cert) => (
              <li key={cert.id}>
                {cert.name}, {cert.issuer} ({cert.date})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Projects / Activities */}
      {projects.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">
            Projects & Activities
          </h2>
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id} className={fontSizeClass}>
                <span className="font-bold">{project.name}</span>
                {project.url && <span className="text-gray-600"> – {project.url}</span>}
                <p>{project.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* References */}
      <div className="mt-8 text-center text-gray-500 text-sm italic">
        References available upon request
      </div>
    </div>
  );
};
