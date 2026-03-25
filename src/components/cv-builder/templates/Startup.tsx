import { TemplateProps } from '../types';
import { Mail, Phone, MapPin, Rocket, Target, Zap, TrendingUp } from 'lucide-react';

export const Startup = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  return (
    <div 
      className="bg-gradient-to-br from-slate-50 to-white text-gray-900 w-full min-h-[297mm] font-sans"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Dynamic Header */}
      <div className="px-8 py-8 relative overflow-hidden">
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: settings.accentColor }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="w-8 h-8" style={{ color: settings.accentColor }} />
            <span 
              className="px-3 py-1 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: settings.accentColor }}
            >
              Open to opportunities
            </span>
          </div>
          
          <h1 className="text-4xl font-black mt-4">
            {personalInfo.fullName || 'Your Name'}
          </h1>
          <p className="text-xl text-gray-500 mt-1">{personalInfo.title || 'Startup Professional'}</p>
          
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            {personalInfo.email && (
              <span className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <Mail className="w-4 h-4" style={{ color: settings.accentColor }} />
                {personalInfo.email}
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <Phone className="w-4 h-4" style={{ color: settings.accentColor }} />
                {personalInfo.phone}
              </span>
            )}
            {personalInfo.location && (
              <span className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <MapPin className="w-4 h-4" style={{ color: settings.accentColor }} />
                {personalInfo.location}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        {/* Value Proposition */}
        {personalInfo.summary && (
          <div 
            className="mb-8 p-6 rounded-xl border-2"
            style={{ borderColor: settings.accentColor, backgroundColor: `${settings.accentColor}10` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" style={{ color: settings.accentColor }} />
              <span className="font-bold" style={{ color: settings.accentColor }}>Value Proposition</span>
            </div>
            <p className={`text-gray-700 leading-relaxed ${fontSizeClass}`}>
              {personalInfo.summary}
            </p>
          </div>
        )}

        {/* Key Skills - Metric Style */}
        {skills.technical.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" style={{ color: settings.accentColor }} />
              <h2 className="text-xl font-bold">Superpowers</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {skills.technical.slice(0, 8).map((skill, idx) => (
                <div 
                  key={idx}
                  className="text-center p-4 rounded-xl bg-gray-50 hover:shadow-md transition-shadow"
                >
                  <div 
                    className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    {skill.charAt(0)}
                  </div>
                  <span className={`font-medium ${fontSizeClass}`}>{skill}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact Stories - Experience */}
        {experience.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: settings.accentColor }} />
              <h2 className="text-xl font-bold">Impact Stories</h2>
            </div>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div 
                  key={exp.id}
                  className="p-5 rounded-xl bg-gray-50 border-l-4"
                  style={{ borderColor: settings.accentColor }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{exp.role}</h3>
                      <p style={{ color: settings.accentColor }}>{exp.company}</p>
                    </div>
                    <span className="text-gray-400 text-sm bg-white px-3 py-1 rounded-full">
                      {exp.startDate} → {exp.current ? 'Now' : exp.endDate}
                    </span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className={`mt-3 space-y-2 ${fontSizeClass}`}>
                      {exp.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-600">
                          <span 
                            className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: settings.accentColor }}
                          />
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

        <div className="grid grid-cols-3 gap-6">
          {/* Education */}
          {education.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                🎓 Education
              </h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id} className={fontSizeClass}>
                    <p className="font-medium">{edu.degree}</p>
                    <p className="text-gray-500">{edu.institution}</p>
                    <p className="text-gray-400">{edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                🚀 Side Projects
              </h2>
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className={fontSizeClass}>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-gray-500">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages & Soft Skills */}
          <div className="bg-gray-50 rounded-xl p-5">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              💪 Soft Skills
            </h2>
            {skills.soft.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.soft.map((skill, idx) => (
                  <span 
                    key={idx}
                    className={`px-2 py-1 bg-white rounded-lg border ${fontSizeClass}`}
                    style={{ borderColor: settings.accentColor }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            
            {skills.languages.length > 0 && (
              <>
                <h3 className="font-medium mt-4 mb-2">🌍 Languages</h3>
                <div className={`space-y-1 ${fontSizeClass}`}>
                  {skills.languages.map((lang, idx) => (
                    <div key={idx} className="flex justify-between text-gray-600">
                      <span>{lang.name}</span>
                      <span className="capitalize">{lang.level}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
