import { TemplateProps } from '../types';
import { Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Award, Folder, Globe } from 'lucide-react';

export const Creative = ({ data, scale = 1 }: TemplateProps) => {
  const { personalInfo, experience, education, skills, certifications, projects, settings } = data;
  
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  }[settings.fontSize];

  // Generate complementary color
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  return (
    <div 
      className="bg-white text-gray-900 w-full min-h-[297mm] font-sans"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {/* Creative Header with Gradient */}
      <div 
        className="px-8 py-8 text-white relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.accentColor}dd 50%, ${settings.accentColor}aa 100%)`
        }}
      >
        {/* Decorative circles */}
        <div 
          className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-20"
          style={{ backgroundColor: 'white' }}
        />
        <div 
          className="absolute -right-10 top-20 w-32 h-32 rounded-full opacity-10"
          style={{ backgroundColor: 'white' }}
        />
        
        <div className="relative z-10 flex items-center gap-5">
          {personalInfo.photo && (
            <img
              src={personalInfo.photo}
              alt={personalInfo.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shrink-0"
            />
          )}
          <div>
          <h1 className="text-4xl font-black">{personalInfo.fullName || 'Your Name'}</h1>
          <p className="text-2xl font-light mt-2 opacity-90">{personalInfo.title || 'Professional Title'}</p>
          
          <div className="flex flex-wrap gap-6 mt-6">
            {personalInfo.email && (
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Mail className="w-4 h-4" />
                {personalInfo.email}
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Phone className="w-4 h-4" />
                {personalInfo.phone}
              </span>
            )}
            {personalInfo.location && (
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4" />
                {personalInfo.location}
              </span>
            )}
          </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Summary with Quote Style */}
        {personalInfo.summary && (
          <div className="mb-8 relative">
            <div 
              className="absolute left-0 top-0 bottom-0 w-1 rounded"
              style={{ backgroundColor: settings.accentColor }}
            />
            <p className={`text-gray-600 leading-relaxed pl-6 italic ${fontSizeClass}`}>
              "{personalInfo.summary}"
            </p>
          </div>
        )}

        {/* Experience with Icons */}
        {experience.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: settings.accentColor }}
              >
                <Briefcase className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Experience</h2>
            </div>
            
            <div className="space-y-5 ml-12 border-l-2 border-gray-200 pl-6">
              {experience.map((exp) => (
                <div key={exp.id} className="relative">
                  <div 
                    className="absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white"
                    style={{ backgroundColor: settings.accentColor }}
                  />
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{exp.role}</h3>
                      <p style={{ color: settings.accentColor }}>{exp.company}</p>
                    </div>
                    <span className="text-gray-400 text-sm bg-gray-100 px-3 py-1 rounded-full">
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className={`mt-2 space-y-1 text-gray-600 ${fontSizeClass}`}>
                      {exp.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span style={{ color: settings.accentColor }}>▸</span>
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

        <div className="grid grid-cols-2 gap-8">
          {/* Education */}
          {education.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Education</h2>
              </div>
              <div className="space-y-3 ml-12">
                {education.map((edu) => (
                  <div key={edu.id} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold">{edu.degree}</h3>
                    <p className="text-gray-600">{edu.field}</p>
                    <p style={{ color: settings.accentColor }}>{edu.institution}</p>
                    <p className={`text-gray-400 ${fontSizeClass}`}>{edu.startDate} - {edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {(skills.technical.length > 0 || skills.soft.length > 0) && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Code className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Skills</h2>
              </div>
              <div className="ml-12">
                {skills.technical.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {skills.technical.map((skill, idx) => (
                      <span 
                        key={idx}
                        className={`px-3 py-1 rounded-full text-white ${fontSizeClass}`}
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {skills.soft.length > 0 && (
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
                )}
              </div>
            </div>
          )}
        </div>

        {/* Certifications & Languages in Pills */}
        <div className="grid grid-cols-2 gap-8">
          {certifications.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Award className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Certifications</h2>
              </div>
              <div className="ml-12 space-y-2">
                {certifications.map((cert) => (
                  <div key={cert.id} className={`flex justify-between ${fontSizeClass}`}>
                    <span className="font-medium">{cert.name}</span>
                    <span className="text-gray-400">{cert.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {skills.languages.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Languages</h2>
              </div>
              <div className="ml-12 flex flex-wrap gap-2">
                {skills.languages.map((lang, idx) => (
                  <span 
                    key={idx}
                    className={`px-3 py-1 bg-gray-100 rounded-full ${fontSizeClass}`}
                  >
                    {lang.name} • <span className="capitalize text-gray-500">{lang.level}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: settings.accentColor }}
              >
                <Folder className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Projects</h2>
            </div>
            <div className="ml-12 grid grid-cols-2 gap-4">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-gray-50 p-4 rounded-lg border-l-4"
                  style={{ borderColor: settings.accentColor }}
                >
                  <h3 className="font-bold">{project.name}</h3>
                  <p className={`text-gray-600 ${fontSizeClass}`}>{project.description}</p>
                  {project.url && (
                    <a 
                      href={project.url}
                      className={`mt-2 inline-block ${fontSizeClass}`}
                      style={{ color: settings.accentColor }}
                    >
                      View Project →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
