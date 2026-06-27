import { create } from 'zustand';

type DocumentType = 'resume' | 'cover_letter';

interface PreviewState {
  documentType: DocumentType | null;
  documentData: any | null; // Raw CoverLetter or DraftResume
  htmlPreview: string | null;
  templateId?: string | null;
  setPreview: (type: DocumentType, data: any, html: string, templateId?: string) => void;
  clearPreview: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  documentType: null,
  documentData: null,
  htmlPreview: null,
  templateId: null,
  setPreview: (type, data, html, templateId) => set({ documentType: type, documentData: data, htmlPreview: html, templateId }),
  clearPreview: () => set({ documentType: null, documentData: null, htmlPreview: null, templateId: null }),
}));
