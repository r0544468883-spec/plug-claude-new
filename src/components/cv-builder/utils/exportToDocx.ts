import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  SectionType,
  TabStopPosition,
  TabStopType,
} from 'docx';
import type { CVData } from '../types';
import { colorPresets } from '../types';

function hexToRGB(hex: string): string {
  return hex.replace('#', '');
}

/** Build a professional .docx from structured CV data */
export async function exportToDocx(data: CVData): Promise<Blob> {
  const isHe = data.settings.cvLanguage === 'he';
  const accent = hexToRGB(
    data.settings.accentColor || colorPresets[data.settings.colorPreset]?.primary || '3b82f6',
  );

  const children: Paragraph[] = [];

  // ─── Header: Name + Title ───
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: data.personalInfo.fullName,
          bold: true,
          size: 36,
          color: accent,
          font: isHe ? 'David' : 'Calibri',
        }),
      ],
    }),
  );

  if (data.personalInfo.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: data.personalInfo.title,
            size: 22,
            color: '555555',
            font: isHe ? 'David' : 'Calibri',
          }),
        ],
      }),
    );
  }

  // Contact line
  const contactParts: string[] = [];
  if (data.personalInfo.email) contactParts.push(data.personalInfo.email);
  if (data.personalInfo.phone) contactParts.push(data.personalInfo.phone);
  if (data.personalInfo.location) contactParts.push(data.personalInfo.location);

  if (contactParts.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: contactParts.join('  |  '),
            size: 18,
            color: '666666',
            font: isHe ? 'David' : 'Calibri',
          }),
        ],
      }),
    );
  }

  // Divider
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent } },
    }),
  );

  // Helper: section heading
  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accent } },
      children: [
        new TextRun({
          text,
          bold: true,
          size: 24,
          color: accent,
          font: isHe ? 'David' : 'Calibri',
        }),
      ],
    });

  // ─── Summary ───
  if (data.personalInfo.summary) {
    children.push(heading(isHe ? 'תקציר מקצועי' : 'Professional Summary'));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: data.personalInfo.summary,
            size: 20,
            font: isHe ? 'David' : 'Calibri',
          }),
        ],
      }),
    );
  }

  // ─── Experience ───
  if (data.experience.length) {
    children.push(heading(isHe ? 'ניסיון תעסוקתי' : 'Work Experience'));

    for (const exp of data.experience) {
      const dateRange = exp.current
        ? `${exp.startDate} – ${isHe ? 'היום' : 'Present'}`
        : `${exp.startDate} – ${exp.endDate || ''}`;

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: exp.role, bold: true, size: 21, font: isHe ? 'David' : 'Calibri' }),
            new TextRun({ text: '\t' }),
            new TextRun({ text: dateRange, size: 18, color: '888888', font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );

      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: exp.company, italics: true, size: 20, color: '444444', font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );

      for (const bullet of exp.bullets) {
        if (!bullet.trim()) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [
              new TextRun({ text: bullet, size: 20, font: isHe ? 'David' : 'Calibri' }),
            ],
          }),
        );
      }
    }
  }

  // ─── Education ───
  if (data.education.length) {
    children.push(heading(isHe ? 'השכלה' : 'Education'));

    for (const edu of data.education) {
      const dateRange = `${edu.startDate} – ${edu.endDate || ''}`;
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: `${edu.degree}${edu.field ? `, ${edu.field}` : ''}`, bold: true, size: 21, font: isHe ? 'David' : 'Calibri' }),
            new TextRun({ text: '\t' }),
            new TextRun({ text: dateRange, size: 18, color: '888888', font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: edu.institution, italics: true, size: 20, color: '444444', font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );
    }
  }

  // ─── Skills ───
  const hasSkills = data.skills.technical.length || data.skills.soft.length;
  if (hasSkills) {
    children.push(heading(isHe ? 'כישורים' : 'Skills'));

    if (data.skills.technical.length) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: isHe ? 'כישורים טכניים: ' : 'Technical: ', bold: true, size: 20, font: isHe ? 'David' : 'Calibri' }),
            new TextRun({ text: data.skills.technical.join(', '), size: 20, font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );
    }

    if (data.skills.soft.length) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: isHe ? 'כישורים רכים: ' : 'Soft Skills: ', bold: true, size: 20, font: isHe ? 'David' : 'Calibri' }),
            new TextRun({ text: data.skills.soft.join(', '), size: 20, font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );
    }
  }

  // ─── Languages ───
  if (data.skills.languages.length) {
    children.push(heading(isHe ? 'שפות' : 'Languages'));
    const langLine = data.skills.languages
      .map((l) => `${l.name} (${l.level})`)
      .join(', ');
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: langLine, size: 20, font: isHe ? 'David' : 'Calibri' }),
        ],
      }),
    );
  }

  // ─── Certifications ───
  if (data.certifications.length) {
    children.push(heading(isHe ? 'הסמכות' : 'Certifications'));
    for (const cert of data.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          children: [
            new TextRun({ text: cert.name, bold: true, size: 20, font: isHe ? 'David' : 'Calibri' }),
            new TextRun({ text: cert.issuer ? ` — ${cert.issuer}` : '', size: 20, font: isHe ? 'David' : 'Calibri' }),
            new TextRun({ text: cert.date ? ` (${cert.date})` : '', size: 18, color: '888888', font: isHe ? 'David' : 'Calibri' }),
          ],
        }),
      );
    }
  }

  // ─── Projects ───
  if (data.projects.length) {
    children.push(heading(isHe ? 'פרויקטים' : 'Projects'));
    for (const proj of data.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
          children: [
            new TextRun({ text: proj.name, bold: true, size: 20, font: isHe ? 'David' : 'Calibri' }),
            ...(proj.url ? [new TextRun({ text: ` — ${proj.url}`, size: 18, color: accent, font: isHe ? 'David' : 'Calibri' })] : []),
          ],
        }),
      );
      if (proj.description) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: proj.description, size: 20, font: isHe ? 'David' : 'Calibri' }),
            ],
          }),
        );
      }
    }
  }

  // ─── Build Document ───
  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
          bidi: isHe,
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
