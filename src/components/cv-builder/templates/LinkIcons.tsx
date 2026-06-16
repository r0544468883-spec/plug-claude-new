import { ExternalLink, LinkType } from '../types';
import { Globe, Github, Linkedin, Twitter, Palette, Briefcase, Link as LinkIcon } from 'lucide-react';

const iconMap: Record<LinkType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  linkedin: Linkedin,
  github: Github,
  portfolio: Briefcase,
  website: Globe,
  twitter: Twitter,
  dribbble: Palette,
  behance: Palette,
  other: LinkIcon,
};

export function CVLinkItems({ links, className, iconClassName, style }: {
  links?: ExternalLink[];
  className?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
}) {
  const filtered = (links ?? []).filter((l) => l.url);
  if (filtered.length === 0) return null;

  return (
    <>
      {filtered.map((link) => {
        const Icon = iconMap[link.type] || LinkIcon;
        const display = link.label || link.type.charAt(0).toUpperCase() + link.type.slice(1);
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            style={style}
          >
            <Icon className={iconClassName || 'w-4 h-4'} />
            {display}
          </a>
        );
      })}
    </>
  );
}
