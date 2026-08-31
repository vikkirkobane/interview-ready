import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent, act } from '@testing-library/react-native';

import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import NewResumeScreen from '../../app/(tabs)/new-resume';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { exportResumePDF, exportResumeDOCX } from '../../src/lib/resumeExport';
import { usePreviewStore } from '../../src/store/previewStore';
import { useNotificationStore } from '../../src/stores/notification-store';
import { renderWithProviders, flushPromises } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/resumeExport', () => ({
  exportResumePDF: jest.fn(async () => {}),
  exportResumeDOCX: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../../src/lib/api', () => {
  const { createApiMock } = require('../helpers/supabase');
  return createApiMock();
});

let mockPickFileOptions: any = null;
jest.mock('../../src/hooks/useFilePicker', () => ({
  useFilePicker: () => ({
    pickFile: jest.fn(async (options: any) => {
      mockPickFileOptions = options;
      if (options.onFilePicked) {
        await options.onFilePicked({
          fileUri: 'file:///mock/job_desc.pdf',
          fileName: 'job_desc.pdf',
          mimeType: 'application/pdf',
          webFile: null,
        });
      }
    }),
    isPicking: false,
  }),
}));

// Generation tests exercise AI + Realtime flows with async state settling;
// raise the per-test budget so slow/cold runs don't trip the 5s default.
jest.setTimeout(15000);

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockApiUpload = (require('../../src/lib/api') as any).apiUploadFile as jest.Mock;
const mockToast = Toast as any;

describe('Resume Builder (new-resume) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<NewResumeScreen key={Math.random()} />);


  /** Simulate the server's Realtime generation_complete broadcast for a channel. */
  const emitGenerationComplete = async (content: any) => {
    const { channelBuilder } = mockSupabase.__mockHelpers;
    await act(async () => {
      channelBuilder._emit('generation_complete', {
        payload: { content },
      });
      await flushPromises();
    });
  };


  it('renders the resume builder form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Resume Builder')).toBeTruthy();
    expect(screen.getByText('1. Target Job Description (Optional)')).toBeTruthy();
    expect(screen.getByText('2. Choose a Template')).toBeTruthy();
    expect(screen.getByText('Generate Resume')).toBeTruthy();
  });

  it('generates a base resume without a job description', async () => {
    mockApiCall.mockResolvedValue({
      data: { resume_id: 'r1', message: 'ok', stream_channel: 'chan-1' },
      error: null,
    });

    const screen = await renderScreen();
    await act(async () => {
      await fireEvent.press(screen.getByText('Generate Resume'));
      await flushPromises();
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({
          title: 'Base Resume',
          template_id: 'executive',
          is_base: true,
        })
      );
    });
    await waitFor(() => {
      expect(router.setParams).toHaveBeenCalledWith({ id: 'r1' });
    });

    // Show the "Generating" info toast immediately (not success).
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: 'Generating resume...' })
    );

    // Success toast only appears after the Realtime broadcast arrives.
    await emitGenerationComplete({
      header: { name: 'Jane Smith', title: 'Software Engineer', email: 'j@x.com' },
      summary: { text: 'Summary' },
      experience: [],
      skills: [],
      education: [],
      recognition: [],
      featured_project: { include: false },
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Resume generated!' })
      );
    });
  });

  it('generates a tailored resume when a job description is provided', async () => {


    router.__setMockParams({});
    mockApiCall.mockImplementation((fn: string) => {
      if (fn === 'jobs-analyze') {
        return { data: { job_id: 'job-9' }, error: null };
      }
      if (fn === 'resumes-create') {
        return { data: { resume_id: 'r2', message: 'ok', stream_channel: 'chan-2' }, error: null };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      await screen.findByPlaceholderText('Or paste the full job description here...'),
      'We are hiring a senior engineer with 5+ years of experience in distributed systems and Go.'
    );

    await act(async () => {
      await fireEvent.press(screen.getByText('Generate Tailored Resume'));
      await flushPromises();
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'jobs-analyze',
        'POST',
        expect.objectContaining({ job_description: expect.stringContaining('distributed systems') })
      );
    });
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({ title: 'Tailored Resume', job_analysis_id: 'job-9' })
      );
    });

    // Emit the Realtime completion so the screen's 90s fallback timer is
    // cleared and the Jest process can exit cleanly (mirrors test 2).
    await emitGenerationComplete({
      header: { name: 'Jane Smith', title: 'Software Engineer', email: 'j@x.com' },
      summary: { text: 'Summary' },
      experience: [],
      skills: [],
      education: [],
      recognition: [],
      featured_project: { include: false },
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Resume generated!' })
      );
    });
  });

  it('renders the attachment toolbar and formats hint in Step 1', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Attach JD Document')).toBeTruthy();
    expect(screen.getByText('PDF, DOCX, PNG, JPG (Max 5MB)')).toBeTruthy();
  });

  it('attaches a JD file, displays the attachment badge, and allows removing it', async () => {
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Extracted text from attached JD for Resume tailoring.',
        file_name: 'job_desc.pdf',
        mime_type: 'application/pdf',
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Attach JD Document'));

    await waitFor(() => {
      expect(screen.getByText('Attached File:')).toBeTruthy();
      expect(screen.getByText('job_desc.pdf')).toBeTruthy();
    });

    // Remove attachment
    await fireEvent.press(screen.getByLabelText('Remove file attachment'));
    await waitFor(() => {
      expect(screen.queryByText('Attached File:')).toBeNull();
    });
  });

  it('normalizes URL and requests tailoring via jobs-analyze', async () => {
    mockApiCall.mockImplementation((fn: string) => {
      if (fn === 'jobs-analyze') {
        return { data: { job_id: 'job-9' }, error: null };
      }
      if (fn === 'resumes-create') {
        return { data: { resume_id: 'r2', message: 'ok', stream_channel: 'chan-2' }, error: null };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'linkedin.com/jobs/view/999'
    );
    await fireEvent.press(screen.getByText('Generate Tailored Resume'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'jobs-analyze',
        'POST',
        expect.objectContaining({ job_url: 'https://linkedin.com/jobs/view/999' })
      );
    });
  });

  it('shows concise error notification when URL scrape fails in new-resume', async () => {
    mockApiCall.mockImplementation((fn: string) => {
      if (fn === 'jobs-analyze') {
        return {
          data: null,
          error: 'Could not read job link. Please paste the job text or attach a file instead.',
        };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'https://blocked-site.com/job/555'
    );
    await fireEvent.press(screen.getByText('Generate Tailored Resume'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Could not read job link',
          text2: 'Please paste the job text or attach a file instead.',
        })
      );
    });
    expect(screen.getByText('Link inaccessible. Paste text or attach file.')).toBeTruthy();
  });

  it('enhances resume summary using AI Rewrite in the editor', async () => {
    router.__setMockParams({ id: 'resume-123' });
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'resume-123',
        user_id: 'test-user-id',
        title: 'Lead PM Resume',
        resume_contents: [
          {
            templateId: 'executive',
            contact: { name: 'Alex Morgan', title: 'Product Lead', email: 'alex@example.com' },
            summary: 'Experienced product leader building scalable apps.',
            experience: [{ id: 'exp-1', title: 'Lead PM', company: 'Tech Corp', bullets: ['Led cross-functional team'] }],
            skills: [{ id: 'sk-1', category: 'Core', items: ['Product Management'] }],
            education: [],
            certifications: [],
            awards: [],
            sections_to_include: { summary: true, experience: true, skills: true },
          },
        ],
      },
    ];

    mockApiCall.mockImplementation((fn: string, method: string, payload: any) => {
      if (fn === 'resumes-section-rewrite') {
        return Promise.resolve({
          data: {
            rewritten: 'Strategic Product Leader with 8+ years scaling B2B platforms to $50M ARR.',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const screen = await renderScreen();
    await waitFor(() => expect(screen.getByText('AI Rewrite')).toBeTruthy());

    await fireEvent.press(screen.getByText('AI Rewrite'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-section-rewrite',
        'POST',
        expect.objectContaining({
          section_type: 'summary',
          text: 'Experienced product leader building scalable apps.',
        })
      );
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Summary improved!' })
      );
      expect(screen.getByDisplayValue('Strategic Product Leader with 8+ years scaling B2B platforms to $50M ARR.')).toBeTruthy();
    });
  });

  it('allows user to start over and generate a new resume from the editor view', async () => {
    router.__setMockParams({ id: 'resume-456' });
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'resume-456',
        user_id: 'test-user-id',
        title: 'Full Stack Engineer Resume',
        resume_contents: [
          {
            templateId: 'executive',
            contact: { name: 'Jordan Dev', title: 'Senior Engineer', email: 'jordan@example.com' },
            summary: 'Full stack developer with 5+ years experience.',
            experience: [{ id: 'exp-1', title: 'Senior Engineer', company: 'Cloud Scale', bullets: ['Built distributed APIs'] }],
            skills: [{ id: 'sk-1', category: 'Core', items: ['TypeScript', 'Node.js'] }],
            education: [],
            certifications: [],
            awards: [],
            sections_to_include: { summary: true, experience: true, skills: true },
          },
        ],
      },
    ];

    const screen = await renderScreen();

    // Editor view should render with the top return arrow and bottom action CTA
    await waitFor(() => {
      expect(screen.getByLabelText('Back to resume generator')).toBeTruthy();
      expect(screen.getByText('Start Over & Create New Resume')).toBeTruthy();
    });

    // Press the Top Return Arrow button -> takes user directly to the first screen of the page
    await fireEvent.press(screen.getByLabelText('Back to resume generator'));

    // Should return back to the initial resume creation form state
    await waitFor(() => {
      expect(screen.getByText('1. Target Job Description (Optional)')).toBeTruthy();
      expect(screen.getByText('2. Choose a Template')).toBeTruthy();
      expect(screen.getByText('Generate Resume')).toBeTruthy();
    });

    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: 'Ready for new resume' })
    );
  });

  it('navigates to preview screen with resume data and templateId when preview button is clicked', async () => {
    router.__setMockParams({ id: 'resume-preview-test' });
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'resume-preview-test',
        user_id: 'test-user-id',
        title: 'Executive Resume',
        resume_contents: [
          {
            templateId: 'minimal',
            header: { name: 'Morgan Taylor', title: 'Director of Engineering', email: 'morgan@example.com' },
            summary: 'Experienced engineering leader.',
            experience: [{ id: 'exp-1', title: 'Director', company: 'TechCorp', bullets: ['Led 50+ engineers'] }],
            skills: [{ id: 'sk-1', category: 'Leadership', items: ['Management', 'Architecture'] }],
            education: [{ id: 'edu-1', degree: 'B.S. CS', institution: 'MIT', year: '2015' }],
            certifications: [{ id: 'cert-1', name: 'PMP', issuer: 'PMI', year: '2020' }],
            awards: [],
            sections_to_include: { summary: true, experience: true, skills: true, education: true, certifications: true },
          },
        ],
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByLabelText('Preview resume')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Preview resume'));

    expect(usePreviewStore.getState().documentType).toBe('resume');
    expect(usePreviewStore.getState().templateId).toBe('minimal');
    expect(router.push).toHaveBeenCalledWith('/preview');
  });

  it('exports resume as PDF when clicking download PDF option at the resume screen', async () => {
    router.__setMockParams({ id: 'resume-export-pdf' });
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'resume-export-pdf',
        user_id: 'test-user-id',
        title: 'Software Engineer Resume',
        resume_contents: [
          {
            templateId: 'executive',
            header: { name: 'Alex Johnson', title: 'Software Engineer', email: 'alex@example.com' },
            summary: 'Full stack engineer with strong TypeScript skills.',
            experience: [{ id: 'exp-1', title: 'Engineer', company: 'Startup', bullets: ['Built mobile apps'] }],
            skills: [{ id: 'sk-1', category: 'Tech', items: ['React Native', 'TypeScript'] }],
            education: [],
            certifications: [],
            awards: [],
            sections_to_include: { summary: true, experience: true, skills: true },
          },
        ],
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByLabelText('Download resume')).toBeTruthy();
    });

    // Open Download Modal
    await fireEvent.press(screen.getByLabelText('Download resume'));
    await waitFor(() => {
      expect(screen.getByLabelText('Download PDF resume')).toBeTruthy();
    });

    // Click PDF download option
    await fireEvent.press(screen.getByLabelText('Download PDF resume'));

    await waitFor(() => {
      expect(exportResumePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ name: 'Alex Johnson' }),
          summary: { text: 'Full stack engineer with strong TypeScript skills.' },
        }),
        'executive'
      );
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'PDF Downloaded!' })
      );
    });
  });

  it('exports resume as DOCX when clicking download DOCX option at the resume screen', async () => {
    router.__setMockParams({ id: 'resume-export-docx' });
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'resume-export-docx',
        user_id: 'test-user-id',
        title: 'DevOps Resume',
        resume_contents: [
          {
            templateId: 'tech-stack',
            header: { name: 'Sam Rivera', title: 'DevOps Engineer', email: 'sam@example.com' },
            summary: 'DevOps professional automating cloud infrastructure.',
            experience: [{ id: 'exp-1', title: 'Cloud Engineer', company: 'InfraCo', bullets: ['Maintained k8s'] }],
            skills: [{ id: 'sk-1', category: 'Cloud', items: ['AWS', 'Kubernetes'] }],
            education: [],
            certifications: [],
            awards: [],
            sections_to_include: { summary: true, experience: true, skills: true },
          },
        ],
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByLabelText('Download resume')).toBeTruthy();
    });

    // Open Download Modal
    await fireEvent.press(screen.getByLabelText('Download resume'));
    await waitFor(() => {
      expect(screen.getByLabelText('Download DOCX resume')).toBeTruthy();
    });

    // Click DOCX download option
    await fireEvent.press(screen.getByLabelText('Download DOCX resume'));

    await waitFor(() => {
      expect(exportResumeDOCX).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ name: 'Sam Rivera' }),
          summary: { text: 'DevOps professional automating cloud infrastructure.' },
        }),
        'tech-stack'
      );
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'DOCX Downloaded!' })
      );
    });
  });
});
