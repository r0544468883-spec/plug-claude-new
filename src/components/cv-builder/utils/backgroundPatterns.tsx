import React from 'react';
import { BackgroundPattern } from '../types';

// ── Metadata ─────────────────────────────────────────────────────────────────

export interface BackgroundConfig {
  id: BackgroundPattern;
  name: string;
  nameHe: string;
}

export const backgroundConfigs: BackgroundConfig[] = [
  { id: 'none',     name: 'None',     nameHe: 'ללא'      },
  { id: 'dots',     name: 'Dots',     nameHe: 'נקודות'   },
  { id: 'grid',     name: 'Grid',     nameHe: 'רשת'      },
  { id: 'diagonal', name: 'Lines',    nameHe: 'קווים'    },
  { id: 'bubbles',  name: 'Bubbles',  nameHe: 'בועות'    },
  { id: 'squares',  name: 'Shapes',   nameHe: 'צורות'    },
  { id: 'waves',    name: 'Waves',    nameHe: 'גלים'     },
  { id: 'corners',  name: 'Corners',  nameHe: 'פינות'    },
];

// ── CSS-only background patterns ─────────────────────────────────────────────

export function getBackgroundCSS(
  pattern: BackgroundPattern,
  accentColor: string,
): React.CSSProperties {
  switch (pattern) {
    case 'dots':
      return {
        backgroundImage: `radial-gradient(circle, ${accentColor}28 1.2px, transparent 1.2px)`,
        backgroundSize: '18px 18px',
      };
    case 'grid':
      return {
        backgroundImage: [
          `linear-gradient(${accentColor}18 1px, transparent 1px)`,
          `linear-gradient(90deg, ${accentColor}18 1px, transparent 1px)`,
        ].join(', '),
        backgroundSize: '22px 22px',
      };
    case 'diagonal':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${accentColor}14, ${accentColor}14 1px, transparent 1px, transparent 18px)`,
      };
    case 'waves': {
      const encoded = encodeURIComponent(accentColor);
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='24'%3E%3Cpath d='M0 12 Q30 4 60 12 Q90 20 120 12' fill='none' stroke='${encoded}' stroke-opacity='0.2' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundSize: '120px 24px',
      };
    }
    default:
      return {};
  }
}

/** Preview CSS used inside the small picker buttons (simplified for decorative patterns). */
export function getPatternPreviewCSS(
  pattern: BackgroundPattern,
  accentColor: string,
): React.CSSProperties {
  if (pattern === 'bubbles')
    return {
      background: [
        `radial-gradient(circle at 85% 10%, ${accentColor}40 22%, transparent 22%)`,
        `radial-gradient(circle at 15% 85%, ${accentColor}30 18%, transparent 18%)`,
      ].join(', '),
    };
  if (pattern === 'squares')
    return {
      background: `linear-gradient(45deg, ${accentColor}22 25%, transparent 25%, transparent 75%, ${accentColor}22 75%)`,
      backgroundSize: '16px 16px',
    };
  if (pattern === 'corners')
    return {
      background: [
        `radial-gradient(circle at 0% 0%, ${accentColor}45 18%, transparent 18%)`,
        `radial-gradient(circle at 100% 100%, ${accentColor}45 18%, transparent 18%)`,
      ].join(', '),
    };
  return getBackgroundCSS(pattern, accentColor);
}

// ── DOM overlay (absolute-positioned decorative elements) ────────────────────

interface OverlayProps {
  pattern: BackgroundPattern;
  accentColor: string;
}

export function BackgroundOverlay({ pattern, accentColor }: OverlayProps): React.ReactElement | null {
  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 2,
  };

  if (pattern === 'bubbles') {
    return (
      <>
        <div style={{ ...base, top: -60,    right: -60,  width: 220, height: 220, borderRadius: '50%', backgroundColor: accentColor, opacity: 0.09 }} />
        <div style={{ ...base, bottom: -50, left: -50,   width: 180, height: 180, borderRadius: '50%', backgroundColor: accentColor, opacity: 0.07 }} />
        <div style={{ ...base, top: '33%',  left: -35,   width: 120, height: 120, borderRadius: '50%', backgroundColor: accentColor, opacity: 0.05 }} />
        <div style={{ ...base, top: '55%',  right: -25,  width: 80,  height: 80,  borderRadius: '50%', backgroundColor: accentColor, opacity: 0.06 }} />
      </>
    );
  }

  if (pattern === 'squares') {
    return (
      <>
        <div style={{ ...base, top: -25,    right: -25,  width: 130, height: 130, transform: 'rotate(30deg)', backgroundColor: accentColor, opacity: 0.07 }} />
        <div style={{ ...base, bottom: -20, left: -20,   width: 110, height: 110, transform: 'rotate(20deg)', backgroundColor: accentColor, opacity: 0.06 }} />
        <div style={{ ...base, top: '40%',  right: -18,  width: 70,  height: 70,  transform: 'rotate(15deg)', backgroundColor: accentColor, opacity: 0.05 }} />
      </>
    );
  }

  if (pattern === 'corners') {
    return (
      <>
        <div style={{ ...base, top: 0,    left: 0,   width: 100, height: 100, borderRadius: '0 0 100% 0',   backgroundColor: accentColor, opacity: 0.13 }} />
        <div style={{ ...base, bottom: 0, right: 0,  width: 100, height: 100, borderRadius: '100% 0 0 0',   backgroundColor: accentColor, opacity: 0.13 }} />
        <div style={{ ...base, top: 0,    right: 0,  width: 55,  height: 55,  borderRadius: '0 0 0 100%',   backgroundColor: accentColor, opacity: 0.08 }} />
        <div style={{ ...base, bottom: 0, left: 0,   width: 55,  height: 55,  borderRadius: '0 100% 0 0',   backgroundColor: accentColor, opacity: 0.08 }} />
      </>
    );
  }

  return null;
}

// ── PLUG watermark — non-removable footer ─────────────────────────────────────

export function PlugWatermark(): React.ReactElement {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid #e5e7eb',
        padding: '4px 0',
        textAlign: 'center',
        fontSize: '7.5px',
        color: '#9ca3af',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        letterSpacing: '0.03em',
        backgroundColor: 'rgba(255,255,255,0.97)',
        userSelect: 'none',
      }}
    >
      קורות חיים אלו הוכנו באמצעות פלאג&nbsp;&nbsp;•&nbsp;&nbsp;www.plug-hr.com
    </div>
  );
}
