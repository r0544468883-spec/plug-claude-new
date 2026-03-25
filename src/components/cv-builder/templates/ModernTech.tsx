import { TemplateProps } from '../types';
import { Mail, Phone, MapPin, Globe, Github, Linkedin } from 'lucide-react';

export const ModernTech = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-white text-gray-900 w-full min-h-[297mm] font-sans"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Header with accent color */}
      <div
        className="px-8 py-6 text-white flex items-center gap-5"
        style={{ backgroundColor: settings.accentColor }}
      >
        {personalInfo.photo && (
          <img
            src={personalInfo.photo}
            alt={personalInfo.fullName}
            className="w-20 h-20 rounded-full object-cover border-2 border-white/40 shrink-0"
          />
        )}
        <div>
        <h1 className="text-3xl font-bold">{personalInfo.fullName || 'Your Name'}</h1>
        <p className="text-xl opacity-90 mt-1">{personalInfo.title || 'Professional Title'}</p>
        
        <div className="flex flex-wrap gap-4 mt-4 text-sm opacity-90">
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
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-1/3 bg-gray-50 p-6 min-h-full">
          {/* Skills */}
          {(skills.technical.length > 0 || skills.soft.length > 0) && (
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Skills
              </h2>
              
              {skills.technical.length > 0 && (
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-700 mb-2">Technical</h3>
                  <div className="flex flex-wrap gap-1">
                    {skills.technical.map((skill, idx) => (
                      <span 
                        key={idx}
                        className={`px-2 py-1 rounded text-white ${fontSizeClass}`}
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {skills.soft.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Soft Skills</h3>
                  <ul className={`list-disc list-inside text-gray-600 ${fontSizeClass}`}>
                    {skills.soft.map((skill, idx) => (
                      <li key={idx}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Languages */}
          {skills.languages.length > 0 && (
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Languages
              </h2>
              <ul className={`space-y-1 ${fontSizeClass}`}>
                {skills.languages.map((lang, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{lang.name}</span>
                    <span className="text-gray-500 capitalize">{lang.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Certifications
              </h2>
              <ul className={`space-y-2 ${fontSizeClass}`}>
                {certifications.map((cert) => (
                  <li key={cert.id}>
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-gray-500">{cert.issuer} • {cert.date}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="w-2/3 p-6">
          {/* Summary */}
          {personalInfo.summary && (
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Professional Summary
              </h2>
              <p className={`text-gray-700 leading-relaxed ${fontSizeClass}`}>
                {personalInfo.summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Experience
              </h2>
              <div className="space-y-4">
                {experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900">{exp.role}</h3>
                        <p className="text-gray-600">{exp.company}</p>
                      </div>
                      <span className={`text-gray-500 ${fontSizeClass}`}>
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>
                    {exp.bullets.length > 0 && (
                      <ul className={`mt-2 list-disc list-inside text-gray-700 ${fontSizeClass}`}>
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
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Education
              </h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id} className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{edu.degree} in {edu.field}</h3>
                      <p className="text-gray-600">{edu.institution}</p>
                    </div>
                    <span className={`text-gray-500 ${fontSizeClass}`}>
                      {edu.startDate} - {edu.endDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="mb-6">
              <h2 
                className="text-lg font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: settings.headingColor ?? settings.accentColor, color: settings.headingColor ?? settings.accentColor }}
              >
                Projects
              </h2>
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{project.name}</h3>
                      {project.url && (
                        <a 
                          href={project.url}
                          className="text-blue-500 hover:underline"
                          style={{ color: settings.accentColor }}
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className={`text-gray-700 ${fontSizeClass}`}>{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
