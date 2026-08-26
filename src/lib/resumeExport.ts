import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { ResumeContent } from '../types/schemas';
import { buildResumeHTML } from './resumeHTML';
import { buildFileName, renameToCache, formatPersonName, downloadBlob } from './exportUtils';

declare let window: any;

// Helper for dynamic imports on native vs web
let printToFileAsync: any;
let shareAsync: any;


try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Print = require('expo-print');
  printToFileAsync = Print.printToFileAsync;
} catch {
  // Ignore
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing');
  shareAsync = Sharing.shareAsync;
} catch {
  // Ignore
}

// expo-file-system is intentionally NOT used — all file I/O goes through
// expo-print (PDF) and expo-sharing (share sheet). This avoids the
// deprecated uploadAsync warning and the /next module deprecation.

// Template-specific styles for DOCX export
function getTemplateStyles(templateId?: string) {
  const styles: Record<string, any> = {
    executive: {
      nameSize: 48,
      titleSize: 28,
      primaryColor: '1A3A5C',
      secondaryColor: '1A3A5C',
      headerAlignment: 'LEFT' as any,
      sectionSpacing: 240,
      fontFamily: 'Inter',
    },
    minimal: {
      nameSize: 52,
      titleSize: 26,
      primaryColor: '000000',
      secondaryColor: '666666',
      headerAlignment: 'LEFT' as any,
      sectionSpacing: 300,
      fontFamily: 'Inter',
      nameWeight: 300,
    },
    'tech-stack': {
      nameSize: 40,
      titleSize: 24,
      primaryColor: '2563EB',
      secondaryColor: '2563EB',
      headerAlignment: 'LEFT' as any,
      sectionSpacing: 180,
      fontFamily: 'Courier New',
    },
    academic: {
      nameSize: 42,
      titleSize: 26,
      primaryColor: '1E40AF',
      secondaryColor: '1E40AF',
      headerAlignment: 'CENTER' as any,
      sectionSpacing: 260,
      fontFamily: 'Georgia',
    },
  };

  return styles[templateId || 'executive'] || styles.executive;
}




export async function exportResumePDF(resume: ResumeContent, templateId?: string): Promise<void> {
  const html = buildResumeHTML(resume, templateId);
  const filename = buildFileName(resume.header?.name, 'Resume', 'pdf');

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.document.title = filename;
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  } else {
    // Native PDF generation — expo-print generates the PDF, expo-sharing delivers it.
    // The printed temp file has a generic name, so we copy it to the cache directory
    // under the proper filename before sharing so the OS delivers a correctly-named file.
    if (!printToFileAsync || !shareAsync) {
      throw new Error('PDF export requires expo-print and expo-sharing.');
    }
    const { uri } = await printToFileAsync({ html });
    const namedUri = await renameToCache(uri, filename);
    await shareAsync(namedUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: `Download ${filename}` });
  }
}

export async function exportResumeDOCX(resume: ResumeContent, templateId?: string): Promise<void> {
  try {
    const shouldInclude = (section: keyof NonNullable<ResumeContent['sections_to_include']>, hasContent: boolean): boolean => {
      if (!hasContent) return false;
      if (!resume.sections_to_include) return true;
      return resume.sections_to_include[section] !== false;
    };

    const h = resume.header || (resume as any).contact || ({} as any);
    const rawName = h.name || (resume as any).name || resume.meta?.candidate_name || '';
    const candidateName = formatPersonName(rawName) || 'Resume';
    const candidateTitle = h.title || (resume as any).title || resume.meta?.profession || resume.meta?.target_role || '';
    const candidateSubtitle = h.subtitle || (resume as any).subtitle || '';

    const children: any[] = [];
    
    // Get template-specific styles
    const templateStyles = getTemplateStyles(templateId);

    // Header
    children.push(new Paragraph({
      children: [new TextRun({ text: candidateName, bold: true, size: templateStyles.nameSize, color: templateStyles.primaryColor })],
      alignment: templateStyles.headerAlignment,
    }));

    if (candidateTitle) {
      children.push(new Paragraph({
        children: [new TextRun({ text: candidateTitle, bold: true, size: templateStyles.titleSize, color: templateStyles.primaryColor })],
        alignment: templateStyles.headerAlignment,
      }));
    }

    if (candidateSubtitle) {
      children.push(new Paragraph({
        children: [new TextRun({ text: candidateSubtitle, size: 24, color: templateStyles.secondaryColor })],
        alignment: templateStyles.headerAlignment,
      }));
    }

    const contactParts = [
      h.email || (resume as any).email,
      h.phone || (resume as any).phone,
      h.linkedin || (resume as any).linkedin,
      h.portfolio || (resume as any).portfolio,
      h.location || (resume as any).location,
    ].map(val => (val ? String(val).trim() : '')).filter(Boolean);

    if (contactParts.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join('  ·  '), size: 20, color: '555555' })],
        alignment: templateStyles.headerAlignment,
      }));
    }

    children.push(new Paragraph({ text: '' }));

    // Summary
    const rawSummary = typeof resume.summary === 'string' ? resume.summary : resume.summary?.text || (resume.summary as any)?.summary || '';
    if (shouldInclude('summary', !!rawSummary.trim())) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: rawSummary.trim(), size: 22 })] }));
      children.push(new Paragraph({ text: '' }));
    }

    // Skills
    const rawSkills = resume.skills || [];
    const normalizedSkills = rawSkills.map((s: any) => {
      if (typeof s === 'string') return { category: 'Core Competencies', items: [s] };
      const cat = s.category || s.name || 'Core Competencies';
      const items = Array.isArray(s.items) ? s.items : Array.isArray(s.skills) ? s.skills : typeof s.items === 'string' ? [s.items] : [];
      return { category: cat, items };
    }).filter((s: any) => s.items.length > 0);

    if (shouldInclude('skills', normalizedSkills.length > 0)) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'SKILLS', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const cat of normalizedSkills) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: cat.category + ': ', bold: true, size: 22, color: templateStyles.primaryColor }),
            new TextRun({ text: cat.items.join(' · '), size: 22 })
          ]
        }));
      }
      children.push(new Paragraph({ text: '' }));
    }

    // Experience
    const rawExp = resume.experience || [];
    const normalizedExp = rawExp.map((e: any) => {
      const title = e.title || e.role || e.position || '';
      const company = e.company || e.organization || e.employer || '';
      const date_range = e.date_range || e.dates || e.year || e.duration || '';
      const location = e.location || '';
      const bullets = Array.isArray(e.bullets) ? e.bullets : typeof e.description === 'string' && e.description.trim() ? [e.description] : [];
      return { title, company, date_range, location, bullets };
    }).filter((e: any) => e.title || e.company || e.bullets.length > 0);

    if (shouldInclude('experience', normalizedExp.length > 0)) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'EXPERIENCE', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const exp of normalizedExp) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: exp.title, bold: true, size: 24 }),
            ...(exp.company ? [new TextRun({ text: ` · ${exp.company}`, bold: true, size: 24, color: templateStyles.primaryColor })] : []),
          ]
        }));
        const metaLine = [exp.date_range, exp.location].filter(Boolean).join(' | ');
        if (metaLine) {
          children.push(new Paragraph({ children: [new TextRun({ text: metaLine, size: 20, color: '666666' })] }));
        }
        for (const bullet of exp.bullets) {
          children.push(new Paragraph({ children: [new TextRun({ text: `• ${bullet}`, size: 20 })], indent: { left: 360 } }));
        }
        children.push(new Paragraph({ text: '' }));
      }
    }

    // Featured Project
    const proj = resume.featured_project || (Array.isArray((resume as any).projects) && (resume as any).projects[0]) || null;
    const projHasContent = proj && (proj.name || proj.title);
    if (shouldInclude('featured_project', !!projHasContent && (proj.include !== false || !resume.sections_to_include))) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'FEATURED PROJECT', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: proj.name || proj.title, bold: true, size: 24 })] }));
      if (proj.tech_stack) {
        children.push(new Paragraph({ children: [new TextRun({ text: proj.tech_stack, size: 20, color: '666666' })] }));
      }
      if (proj.bullet) {
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${proj.bullet}`, size: 20 })], indent: { left: 360 } }));
      }
      children.push(new Paragraph({ text: '' }));
    }

    // Education & Certifications
    const rawEdu = resume.education || [];
    const normalizedEdu = rawEdu.map((e: any) => ({
      degree: e.degree || e.degree_name || e.title || '',
      institution: e.institution || e.school || e.university || '',
      year: e.year || e.graduation_year || e.date || '',
      note: e.note || e.gpa || '',
    })).filter((e: any) => e.degree || e.institution);

    const rawCerts = resume.certifications || [];
    const normalizedCerts = rawCerts.map((c: any) => {
      if (typeof c === 'string') return c;
      return [c.name || c.title, c.issuer, c.year].filter(Boolean).join(' - ');
    }).filter(Boolean);

    const hasEdu = shouldInclude('education', normalizedEdu.length > 0);
    const hasCerts = shouldInclude('certifications', normalizedCerts.length > 0);

    if (hasEdu || hasCerts) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: hasEdu && hasCerts ? 'EDUCATION & CERTIFICATIONS' : hasEdu ? 'EDUCATION' : 'CERTIFICATIONS', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      if (hasEdu) {
        for (const edu of normalizedEdu) {
          children.push(new Paragraph({ children: [new TextRun({ text: edu.degree, bold: true, size: 24 })] }));
          children.push(new Paragraph({ children: [new TextRun({ text: `${edu.institution}${edu.note ? ' · ' + edu.note : ''}`, size: 20, color: '555555' })] }));
          if (edu.year) {
            children.push(new Paragraph({ children: [new TextRun({ text: edu.year, size: 20, color: '666666' })] }));
          }
          children.push(new Paragraph({ text: '' }));
        }
      }
      if (hasCerts && normalizedCerts.length > 0) {
        for (const cert of normalizedCerts) {
          children.push(new Paragraph({ children: [new TextRun({ text: `• ${cert}`, size: 20 })], indent: { left: 360 } }));
        }
        children.push(new Paragraph({ text: '' }));
      }
    }

    // Languages
    const rawLang = resume.languages || [];
    const normalizedLang = rawLang.map((l: any) => {
      if (typeof l === 'string') return l;
      return `${l.language || l.name || ''}${l.proficiency ? ` (${l.proficiency})` : ''}`;
    }).filter(Boolean);

    if (shouldInclude('languages', normalizedLang.length > 0)) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'LANGUAGES', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: normalizedLang.join(' · '), size: 22 })] }));
      children.push(new Paragraph({ text: '' }));
    }

    // Recognition
    const rawRec = resume.recognition || (resume as any).awards || [];
    const normalizedRec = rawRec.map((item: any) => {
      if (typeof item === 'string') return item;
      return [item.name || item.title, item.issuer, item.year].filter(Boolean).join(' - ');
    }).filter(Boolean);

    if (shouldInclude('recognition', normalizedRec.length > 0)) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'RECOGNITION & AWARDS', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const item of normalizedRec) {
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${item}`, size: 20 })], indent: { left: 360 } }));
      }
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const filename = buildFileName(candidateName, 'Resume', 'docx');

    if (Platform.OS === 'web') {
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, filename);
    } else {
      // Native DOCX export — write to a temporary path using expo-file-system
      // then share with expo-sharing.
      if (!shareAsync) {
        throw new Error('DOCX export requires expo-sharing.');
      }
      
      const base64Data = await Packer.toBase64String(doc);
      if (FileSystem.cacheDirectory) {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        await shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: `Download ${filename}`,
          UTI: 'org.openxmlformats.wordprocessingml.document',
        });
      } else {
        throw new Error('Could not access cache directory for DOCX export.');
      }
    }
  } catch (e: any) {
    throw new Error('DOCX export failed: ' + e.message);
  }
}
