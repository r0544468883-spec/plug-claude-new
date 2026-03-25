import { TemplateProps } from '../types';
import { Mail, MapPin, Github, Globe, Terminal, Code2, Database } from 'lucide-react';

export const Developer = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-slate-900 text-slate-100 w-full min-h-[297mm] font-mono"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Terminal-style Header */}
      <div className="bg-slate-800 px-8 py-6 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-slate-400 text-sm">~/resume</span>
        </div>
        
        <div className="flex items-center gap-2 text-green-400">
          <Terminal className="w-5 h-5" />
          <span className="text-lg">$</span>
          <h1 className="text-2xl font-bold">{personalInfo.fullName || 'dev_name'}</h1>
        </div>
        <p className="text-slate-400 mt-1 ml-7"># {personalInfo.title || 'Software Developer'}</p>
        
        <div className="flex flex-wrap gap-4 mt-4 ml-7 text-sm">
          {personalInfo.email && (
            <span className="flex items-center gap-1 text-slate-300">
              <Mail className="w-4 h-4" style={{ color: settings.accentColor }} />
              {personalInfo.email}
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-4 h-4" style={{ color: settings.accentColor }} />
              {personalInfo.location}
            </span>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-1/3 bg-slate-800/50 p-6 border-r border-slate-700">
          {/* Tech Stack */}
          {skills.technical.length > 0 && (
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-lg font-bold mb-3" style={{ color: settings.accentColor }}>
                <Code2 className="w-5 h-5" />
                tech_stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.technical.map((skill, idx) => (
                  <span 
                    key={idx}
                    className={`px-2 py-1 rounded text-xs bg-slate-700 border border-slate-600`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Soft Skills */}
          {skills.soft.length > 0 && (
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-lg font-bold mb-3" style={{ color: settings.accentColor }}>
                <Database className="w-5 h-5" />
                soft_skills
              </h2>
              <ul className={`space-y-1 text-slate-300 ${fontSizeClass}`}>
                {skills.soft.map((skill, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span style={{ color: settings.accentColor }}>→</span>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Languages */}
          {skills.languages.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: settings.accentColor }}>
                languages
              </h2>
              <ul className={`space-y-1 ${fontSizeClass}`}>
                {skills.languages.map((lang, idx) => (
                  <li key={idx} className="text-slate-300">
                    {lang.name}: <span className="text-slate-500">{lang.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: settings.accentColor }}>
                certifications
              </h2>
              <ul className={`space-y-2 ${fontSizeClass}`}>
                {certifications.map((cert) => (
                  <li key={cert.id} className="text-slate-300">
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-slate-500">{cert.issuer}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="w-2/3 p-6">
          {/* About */}
          {personalInfo.summary && (
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-lg font-bold mb-3" style={{ color: settings.accentColor }}>
                <span className="text-slate-500">/**</span> about_me <span className="text-slate-500">*/</span>
              </h2>
              <p className={`text-slate-300 leading-relaxed ${fontSizeClass}`}>
                {personalInfo.summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: settings.accentColor }}>
                work_experience[]
              </h2>
              <div className="space-y-4">
                {experience.map((exp, index) => (
                  <div key={exp.id} className="border-l-2 pl-4" style={{ borderColor: settings.accentColor }}>
                    <div className="text-slate-500 text-xs mb-1">
                      [{index}] // {exp.startDate} - {exp.current ? 'present' : exp.endDate}
                    </div>
                    <h3 className="font-bold text-slate-100">{exp.role}</h3>
                    <p style={{ color: settings.accentColor }}>{exp.company}</p>
                    {exp.bullets.length > 0 && (
                      <ul className={`mt-2 space-y-1 text-slate-300 ${fontSizeClass}`}>
                        {exp.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-slate-500">-</span>
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

          {/* Projects */}
          {projects.length > 0 && (
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-lg font-bold mb-4" style={{ color: settings.accentColor }}>
                <Github className="w-5 h-5" />
                projects[]
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {projects.map((project) => (
                  <div 
                    key={project.id}
                    className="bg-slate-800 border border-slate-700 rounded p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: settings.accentColor }}>📁</span>
                      <h3 className="font-bold">{project.name}</h3>
                    </div>
                    <p className={`text-slate-400 mt-1 ${fontSizeClass}`}>{project.description}</p>
                    {project.url && (
                      <a 
                        href={project.url}
                        className={`flex items-center gap-1 mt-2 ${fontSizeClass}`}
                        style={{ color: settings.accentColor }}
                      >
                        <Globe className="w-3 h-3" />
                        {project.url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: settings.accentColor }}>
                education[]
              </h2>
              <div className="space-y-2">
                {education.map((edu) => (
                  <div key={edu.id} className={fontSizeClass}>
                    <span className="text-slate-300">{edu.degree}</span>
                    <span className="text-slate-500"> @ </span>
                    <span style={{ color: settings.accentColor }}>{edu.institution}</span>
                    <span className="text-slate-500 ml-2">({edu.endDate})</span>
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
