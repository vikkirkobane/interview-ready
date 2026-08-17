import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ResumeContent } from '../types/schemas';
import { buildResumeHTML } from './resumeHTML';
import { buildFileName, renameToCache } from './exportUtils';

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
        children.push(new Paragraph({ children: [new TextRun({ text: [exp.date_range, exp.location].filter(Boolean).join(' | '), size: 20, color: '666666' })] }));
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
    const filename = buildFileName(h.name, 'Resume', 'docx');

    if (Platform.OS === 'web') {
      const blob = await Packer.toBlob(doc);
      const { downloadBlob } = await import('./exportUtils');
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
