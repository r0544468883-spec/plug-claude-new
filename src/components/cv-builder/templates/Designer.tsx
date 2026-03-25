import { TemplateProps } from '../types';
import { Mail, Phone, MapPin, Palette, Layers, Eye } from 'lucide-react';

export const Designer = ({ data, scale = 1 }: TemplateProps) => {
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
      {/* Creative Header with Asymmetric Design */}
      <div className="relative">
        <div 
          className="absolute top-0 left-0 w-2/3 h-48"
          style={{ backgroundColor: settings.accentColor }}
        />
        <div className="relative z-10 px-10 pt-10 pb-6">
          <h1 className="text-5xl font-black text-white">
            {personalInfo.fullName || 'Your Name'}
          </h1>
          <p className="text-2xl font-light text-white/80 mt-2">
            {personalInfo.title || 'Creative Designer'}
          </p>
        </div>
        
        {/* Contact Card */}
        <div className="absolute right-10 top-10 bg-white shadow-xl p-6 rounded-lg w-64">
          <div className="space-y-3 text-sm">
            {personalInfo.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4" style={{ color: settings.accentColor }} />
                <span>{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4" style={{ color: settings.accentColor }} />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4" style={{ color: settings.accentColor }} />
                <span>{personalInfo.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-10 pt-16 pb-10">
        {/* About / Creative Statement */}
        {personalInfo.summary && (
          <div className="mb-10 max-w-2xl">
            <p className={`text-xl font-light leading-relaxed text-gray-600 italic ${fontSizeClass === 'small' ? 'text-base' : ''}`}>
              "{personalInfo.summary}"
            </p>
          </div>
        )}

        {/* Portfolio Projects - Visual Cards */}
        {projects.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="w-6 h-6" style={{ color: settings.accentColor }} />
              <h2 className="text-2xl font-bold">Selected Work</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {projects.map((project) => (
                <div 
                  key={project.id}
                  className="group relative bg-gray-100 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div 
                    className="absolute top-0 left-0 w-full h-1 rounded-t-lg"
                    style={{ backgroundColor: settings.accentColor }}
                  />
                  <h3 className="font-bold text-lg mb-2">{project.name}</h3>
                  <p className={`text-gray-600 ${fontSizeClass}`}>{project.description}</p>
                  {project.url && (
                    <a 
                      href={project.url}
                      className={`inline-flex items-center gap-1 mt-3 font-medium ${fontSizeClass}`}
                      style={{ color: settings.accentColor }}
                    >
                      <Eye className="w-4 h-4" />
                      View Project
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-10">
          {/* Experience */}
          <div className="col-span-2">
            {experience.length > 0 && (
              <div className="mb-8">
                <h2 
                  className="text-xl font-bold mb-4 pb-2 border-b-2"
                  style={{ borderColor: settings.accentColor }}
                >
                  Experience
                </h2>
                <div className="space-y-5">
                  {experience.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{exp.role}</h3>
                        <span className={`text-gray-400 ${fontSizeClass}`}>
                          {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                        </span>
                      </div>
                      <p style={{ color: settings.accentColor }}>{exp.company}</p>
                      {exp.bullets.length > 0 && (
                        <ul className={`mt-2 space-y-1 text-gray-600 ${fontSizeClass}`}>
                          {exp.bullets.map((bullet, idx) => (
                            <li key={idx}>• {bullet}</li>
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
              <div>
                <h2 
                  className="text-xl font-bold mb-4 pb-2 border-b-2"
                  style={{ borderColor: settings.accentColor }}
                >
                  Education
                </h2>
                <div className="space-y-3">
                  {education.map((edu) => (
                    <div key={edu.id}>
                      <h3 className="font-bold">{edu.degree} in {edu.field}</h3>
                      <p style={{ color: settings.accentColor }}>{edu.institution}</p>
                      <p className={`text-gray-400 ${fontSizeClass}`}>{edu.endDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Skills */}
          <div>
            {skills.technical.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-5 h-5" style={{ color: settings.accentColor }} />
                  <h2 className="text-xl font-bold">Tools & Skills</h2>
                </div>
                <div className="space-y-2">
                  {skills.technical.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: settings.accentColor }}
                      />
                      <span className={fontSizeClass}>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {skills.soft.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">Strengths</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.soft.map((skill, idx) => (
                    <span 
                      key={idx}
                      className={`px-3 py-1 rounded-full border ${fontSizeClass}`}
                      style={{ borderColor: settings.accentColor, color: settings.accentColor }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {skills.languages.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">Languages</h2>
                <ul className={`space-y-1 ${fontSizeClass}`}>
                  {skills.languages.map((lang, idx) => (
                    <li key={idx} className="text-gray-600">
                      {lang.name} <span className="text-gray-400">• {lang.level}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {certifications.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Certifications</h2>
                <ul className={`space-y-2 ${fontSizeClass}`}>
                  {certifications.map((cert) => (
                    <li key={cert.id}>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-gray-400">{cert.issuer}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
