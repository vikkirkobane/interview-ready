import { Platform } from 'react-native';
import { CoverLetter } from '../types/schemas';
import { buildCoverLetterHTML } from './coverLetterHTML';

declare let window: any;
declare let document: any;

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

// expo-file-system is intentionally NOT used — see resumeExport.ts for rationale.

export async function exportCoverLetterPDF(cl: CoverLetter): Promise<void> {
  const html = buildCoverLetterHTML(cl);
  const filename = `${cl.header.candidate_name.replace(/\s+/g, '_')}_Cover_Letter.pdf`;

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
    if (!printToFileAsync || !shareAsync) {
      throw new Error('PDF export requires expo-print and expo-sharing.');
    }
    const { uri } = await printToFileAsync({ html });
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Download ${filename}` });
  }
}

export async function exportCoverLetterDOCX(cl: CoverLetter): Promise<void> {
  try {
    const { Document, Paragraph, TextRun, AlignmentType, Packer } = await import('docx');
    const h = cl.header;
    const p = cl.paragraphs;
    const children: any[] = [];

    // Header
    children.push(new Paragraph({
      children: [new TextRun({ text: h.candidate_name, bold: true, size: 48, color: '1A3A5C' })],
      alignment: AlignmentType.LEFT,
    }));

    const contactParts = [h.phone, h.email, h.linkedin, h.portfolio].filter(Boolean);
    if (contactParts.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join('  ·  '), size: 20, color: '555555' })],
      }));
    }

    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ text: '' }));

    // Date
    children.push(new Paragraph({ children: [new TextRun({ text: h.date, size: 22 })] }));
    children.push(new Paragraph({ text: '' }));

    // Recipient
    if (h.hiring_manager) {
      children.push(new Paragraph({ children: [new TextRun({ text: h.hiring_manager, bold: true, size: 22 })] }));
    }
    children.push(new Paragraph({ children: [new TextRun({ text: h.company_name, bold: true, size: 22 })] }));
    if (h.company_address) {
      children.push(new Paragraph({ children: [new TextRun({ text: h.company_address, size: 22 })] }));
    }
    children.push(new Paragraph({ text: '' }));

    // Salutation
    children.push(new Paragraph({ children: [new TextRun({ text: cl.salutation, bold: true, size: 22 })] }));
    children.push(new Paragraph({ text: '' }));

    // Body
    const addPara = (text: string) => {
      if (text) {
        children.push(new Paragraph({ children: [new TextRun({ text, size: 22 })] }));
        children.push(new Paragraph({ text: '' }));
      }
    };

    addPara(p.opening?.text);
    addPara(p.body_1?.text);
    addPara(p.body_2?.text);
    addPara(p.closing?.text);

    // Sign off
    children.push(new Paragraph({ children: [new TextRun({ text: cl.sign_off.closing_phrase, size: 22 })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: cl.sign_off.name, bold: true, size: 22 })] }));

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const filename = `${h.candidate_name.replace(/\s+/g, '_')}_Cover_Letter.docx`;

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
      if (!shareAsync) {
        throw new Error('DOCX export requires expo-sharing.');
      }
      
      const FileSystem = require('expo-file-system');
      
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
