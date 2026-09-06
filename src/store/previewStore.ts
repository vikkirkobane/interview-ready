import { create } from 'zustand';

type DocumentType = 'resume' | 'cover_letter';

interface PreviewState {
  documentType: DocumentType | null;
  documentData: any | null; // Raw CoverLetter or DraftResume
  htmlPreview: string | null;
  templateId?: string | null;
  resumeId?: string | null;
  setPreview: (type: DocumentType, data: any, html: string, templateId?: string, resumeId?: string | null) => void;
  clearPreview: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  documentType: null,
  documentData: null,
  htmlPreview: null,
  templateId: null,
  resumeId: null,
  setPreview: (type, data, html, templateId, resumeId) => set({ documentType: type, documentData: data, htmlPreview: html, templateId, resumeId: resumeId || null }),
  clearPreview: () => set({ documentType: null, documentData: null, htmlPreview: null, templateId: null, resumeId: null }),
}));
