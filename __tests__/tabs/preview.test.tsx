import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import PreviewScreen from '../../app/preview';
import { supabase } from '../../src/lib/supabase';
import { exportResumePDF } from '../../src/lib/resumeExport';
import { usePreviewStore } from '../../src/store/previewStore';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../../src/lib/resumeExport', () => ({
  exportResumePDF: jest.fn(async () => {}),
  exportResumeDOCX: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/coverLetterExport', () => ({
  exportCoverLetterPDF: jest.fn(async () => {}),
  exportCoverLetterDOCX: jest.fn(async () => {}),
}));

const mockSupabase = supabase as any;
const mockExportPDF = exportResumePDF as jest.Mock;

describe('Document Preview — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockExportPDF.mockClear();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  it('shows an empty state when no document is selected', async () => {
    const screen = await renderWithProviders(<PreviewScreen />);
    expect(screen.getByText('No document available to preview.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Go Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows the preview and downloads a PDF', async () => {
    usePreviewStore.getState().setPreview(
      'resume',
      { header: { name: 'Jane' } },
      '<html><body>Preview</body></html>',
      'executive'
    );

    const screen = await renderWithProviders(<PreviewScreen />);
    expect(screen.getByText('Document Preview')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Download PDF'));
    await waitFor(() => {
      expect(mockExportPDF).toHaveBeenCalled();
    });
  });

  it('clears the preview when going back', async () => {
    usePreviewStore.getState().setPreview(
      'resume',
      { header: { name: 'Jane' } },
      '<html><body>Preview</body></html>'
    );
    const screen = await renderWithProviders(<PreviewScreen />);
    await fireEvent.press(screen.getByText('←'));
    expect(usePreviewStore.getState().documentType).toBeNull();
    expect(router.back).toHaveBeenCalled();
  });
});
