import { Platform } from 'react-native';
import { ResumeContent } from '../types/schemas';
import { buildResumeHTML } from './resumeHTML';

declare let window: any;
declare let document: any;

// Helper for dynamic imports on native vs web
let printToFileAsync: any;
let shareAsync: any;
let FileSystem: any;

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

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  FileSystem = require('expo-file-system');
} catch {
  // Ignore
}

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

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  } else {
    // Native PDF generation
    if (!printToFileAsync || !shareAsync || !FileSystem) {
      throw new Error('PDF export requires expo-print, expo-sharing, and expo-file-system.');
    }
    const { uri } = await printToFileAsync({ html });
    const filename = `${resume.header.name.replace(/\\s+/g, '_')}_Resume.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.moveAsync({ from: uri, to: newUri });
    
    await shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Resume PDF' });
  }
}

export async function exportResumeDOCX(resume: ResumeContent, templateId?: string): Promise<void> {
  try {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = await import('docx');

    const h = resume.header;
    const children: any[] = [];
    
    // Get template-specific styles
    const templateStyles = getTemplateStyles(templateId);

    // Header
    children.push(new Paragraph({
      children: [new TextRun({ text: h.name, bold: true, size: templateStyles.nameSize, color: templateStyles.primaryColor })],
      alignment: templateStyles.headerAlignment,
    }));

    children.push(new Paragraph({
      children: [new TextRun({ text: h.title, bold: true, size: templateStyles.titleSize, color: templateStyles.primaryColor })],
      alignment: templateStyles.headerAlignment,
    }));

    if (h.subtitle) {
      children.push(new Paragraph({
        children: [new TextRun({ text: h.subtitle, size: 24, color: templateStyles.secondaryColor })],
        alignment: templateStyles.headerAlignment,
      }));
    }

    const contactParts = [h.email, h.phone, h.linkedin, h.portfolio, h.location].filter(Boolean);
    if (contactParts.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join('  ·  '), size: 20, color: '555555' })],
        alignment: templateStyles.headerAlignment,
      }));
    }

    children.push(new Paragraph({ text: '' }));

    // Summary
    if (resume.sections_to_include?.summary && resume.summary) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'SUMMARY', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: resume.summary.text, size: 22 })] }));
      children.push(new Paragraph({ text: '' }));
    }

    // Skills
    if (resume.sections_to_include?.skills && resume.skills && resume.skills.length > 0) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'SKILLS', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const cat of resume.skills) {
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
    if (resume.sections_to_include?.experience && resume.experience && resume.experience.length > 0) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'EXPERIENCE', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const exp of resume.experience) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: exp.title, bold: true, size: 24 }),
            new TextRun({ text: ` · ${exp.company}`, bold: true, size: 24, color: templateStyles.primaryColor }),
          ]
        }));
        children.push(new Paragraph({ children: [new TextRun({ text: `${exp.date_range} | ${exp.location || ''}`, size: 20, color: '666666' })] }));
        for (const bullet of exp.bullets) {
          children.push(new Paragraph({ children: [new TextRun({ text: `• ${bullet}`, size: 20 })], indent: { left: 360 } }));
        }
        children.push(new Paragraph({ text: '' }));
      }
    }

    // Featured Project
    if (resume.sections_to_include?.featured_project && resume.featured_project && resume.featured_project.include) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'FEATURED PROJECT', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: resume.featured_project.name, bold: true, size: 24 })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: resume.featured_project.tech_stack || '', size: 20, color: '666666' })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `• ${resume.featured_project.bullet}`, size: 20 })], indent: { left: 360 } }));
      children.push(new Paragraph({ text: '' }));
    }

    // Education
    if (resume.sections_to_include?.education && resume.education && resume.education.length > 0) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'EDUCATION', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const edu of resume.education) {
        children.push(new Paragraph({ children: [new TextRun({ text: edu.degree, bold: true, size: 24 })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: `${edu.institution}${edu.note ? ' · ' + edu.note : ''}`, size: 20, color: '555555' })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: edu.year, size: 20, color: '666666' })] }));
        children.push(new Paragraph({ text: '' }));
      }
    }

    // Recognition
    if (resume.sections_to_include?.recognition && resume.recognition && resume.recognition.length > 0) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: 'RECOGNITION', bold: true, size: 22, color: templateStyles.primaryColor })], 
        heading: HeadingLevel.HEADING_2,
        alignment: templateId === 'academic' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }));
      for (const item of resume.recognition) {
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${item}`, size: 20 })], indent: { left: 360 } }));
      }
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const filename = `${h.name.replace(/\s+/g, '_')}_Resume.docx`;

    if (Platform.OS === 'web') {
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      if (!FileSystem || !shareAsync) {
        throw new Error('DOCX export requires expo-file-system and expo-sharing.');
      }
      const base64Data = await Packer.toBase64String(doc);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: 'Download Resume DOCX',
        UTI: 'org.openxmlformats.wordprocessingml.document',
      });
    }
  } catch (e: any) {
    throw new Error('DOCX export failed: ' + e.message);
  }
}
