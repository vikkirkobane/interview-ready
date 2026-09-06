import React from 'react';
import { waitFor, fireEvent, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from '../../app/(auth)/login';
import ReferralCodeScreen from '../../app/(onboarding)/referral-code';
import RoleScreen from '../../app/(onboarding)/role';
import ProfileScreen from '../../app/(onboarding)/profile';
import AnalyzeScreen from '../../app/(onboarding)/analyze';
import ResumeGenScreen from '../../app/(onboarding)/resume';
import PreviewScreen from '../../app/preview';

// Stores & helpers
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { usePreviewStore } from '../../src/store/previewStore';
import { exportResumePDF, exportResumeDOCX } from '../../src/lib/resumeExport';
import { buildResumeHTML } from '../../src/lib/resumeHTML';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';
import {
  triggerLoginNotificationEmail,
  triggerWelcomeEmail,
  triggerWaitlistConfirmationEmail,
} from '../../src/lib/emailNotificationService';

// Mocks
jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return {
    supabase: mock.supabase,
    supabaseUrl: 'https://test-project.supabase.co',
  };
});

jest.mock('../../src/lib/api', () => {
  const { createApiMock } = require('../helpers/supabase');
  return createApiMock();
});

jest.mock('../../src/lib/resumeExport', () => ({
  exportResumePDF: jest.fn(async () => {}),
  exportResumeDOCX: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/coverLetterExport', () => ({
  exportCoverLetterPDF: jest.fn(async () => {}),
  exportCoverLetterDOCX: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/resumeHTML', () => ({
  buildResumeHTML: jest.fn((resume: any, templateId?: string) => `<html><body>Resume HTML for ${templateId || 'modern'}</body></html>`),
}));

jest.mock('../../src/lib/airtableService', () => ({
  syncUserToAirtable: jest.fn().mockResolvedValue({ success: true }),
}));

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockExportPDF = exportResumePDF as jest.Mock;
const mockExportDOCX = exportResumeDOCX as jest.Mock;
const mockToast = Toast as any;

const TEST_CANDIDATE = {
  id: 'candidate-uuid-12345',
  email: 'alex.chen@example.com',
  password: 'Password123!',
  firstName: 'Alex',
  lastName: 'Chen',
  targetRole: 'Staff Software Engineer',
  yearsExperience: '6-10',
  workPreference: 'REMOTE',
  currentRole: 'Senior Backend Engineer',
  company: 'Stripe',
  location: 'San Francisco, CA',
  skills: ['Go', 'Kubernetes', 'Distributed Systems', 'PostgreSQL', 'System Design'],
  selectedTemplateId: 'executive',
  jdText: 'We are seeking a Staff Software Engineer to lead distributed systems architecture using Go, Kubernetes, Kafka, and microservices.',
};

const RESUME_FIXTURE = {
  id: 'resume-staff-eng-99',
  title: 'Staff Software Engineer Resume',
  user_id: TEST_CANDIDATE.id,
  target_role: TEST_CANDIDATE.targetRole,
  template_id: TEST_CANDIDATE.selectedTemplateId,
  ats_score: 88,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  resume_contents: [
    {
      name: `${TEST_CANDIDATE.firstName} ${TEST_CANDIDATE.lastName}`,
      title: TEST_CANDIDATE.targetRole,
      contact: {
        name: `${TEST_CANDIDATE.firstName} ${TEST_CANDIDATE.lastName}`,
        title: TEST_CANDIDATE.targetRole,
        location: TEST_CANDIDATE.location,
        email: TEST_CANDIDATE.email,
        phone: '+1 (555) 345-6789',
        linkedin: 'linkedin.com/in/alexchen',
      },
      summary: 'Staff Systems Architect with 8+ years designing high-throughput resilient services in Go, Kubernetes, and Kafka.',
      skills: [
        { category: 'Languages & Core', items: ['Go', 'TypeScript', 'SQL'] },
        { category: 'Distributed Infrastructure', items: ['Kubernetes', 'Kafka', 'PostgreSQL', 'Docker'] },
      ],
      experience: [
        {
          title: 'Senior Backend Engineer',
          company: 'Stripe',
          date_range: '2021 - Present',
          location: 'San Francisco, CA',
          bullets: [
            'Architected payment ingest pipeline processing 45,000 requests/sec with p99 latency < 12ms.',
            'Reduced compute infrastructure spend by 32% across 80 Kubernetes clusters.',
          ],
        },
      ],
      education: [
        {
          degree: 'B.S. in Computer Science',
          school: 'University of California, Berkeley',
          graduation_date: '2018',
        },
      ],
      projects: [],
      certifications: [],
      languages: [],
      awards: [],
    },
  ],
};

describe('Candidate End-to-End User Story: Login -> Onboarding -> Resume Generation -> Download & Email Verification', () => {
  let dispatchedEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
    emailType: string;
  }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    dispatchedEmails = [];

    // Intercept fetch calls to capture emails and mock Edge functions
    global.fetch = jest.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes('/functions/v1/email-send')) {
        const body = JSON.parse(init?.body as string || '{}');
        dispatchedEmails.push(body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { message_id: 'msg-' + Math.random() } }),
        };
      }

      if (urlStr.includes('/functions/v1/referral-apply')) {
        const body = JSON.parse(init?.body as string || '{}');
        const code = (body.referralCode || '').toUpperCase();
        if (code === 'LINKEDIN20') {
          // Trigger promo reward email in edge function
          dispatchedEmails.push({
            to: TEST_CANDIDATE.email,
            subject: '20 Practice Credits Added to Your Account - Interview Ready',
            html: '<p>Hello Alex, 20 promo credits added.</p>',
            text: 'Hello Alex,\r\n\r\n20 promo credits have been added to your account.',
            emailType: 'promo_reward',
          });
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                is_promo: true,
                credits_granted: 20,
                promo_code: 'LINKEDIN20',
                message: 'Success! Promo code applied! You received 20 bonus credits!',
              },
            }),
          };
        }
      }

      if (urlStr.includes('referral-stats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              referral_code: 'ALEX1234',
              total_referrals: 0,
              credits_earned: 20,
              referrals: [],
            },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    }) as any;

    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: {
        first_name: TEST_CANDIDATE.firstName,
        last_name: TEST_CANDIDATE.lastName,
        full_name: `${TEST_CANDIDATE.firstName} ${TEST_CANDIDATE.lastName}`,
        onboarding_completed: false,
      },
    });

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    useAuthStore.setState({ user: session.user, session, loading: false });
  });

  it('Stage 1: Candidate logs in successfully and triggers login security alert email', async () => {
    mockSupabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: TEST_CANDIDATE.id,
          email: TEST_CANDIDATE.email,
          user_metadata: {
            first_name: TEST_CANDIDATE.firstName,
            last_name: TEST_CANDIDATE.lastName,
            full_name: `${TEST_CANDIDATE.firstName} ${TEST_CANDIDATE.lastName}`,
            onboarding_completed: false,
          },
        },
        session: buildSession({
          id: TEST_CANDIDATE.id,
          email: TEST_CANDIDATE.email,
          user_metadata: { onboarding_completed: false },
        }),
      },
      error: null,
    });

    const screen = await renderWithProviders(<LoginScreen />);
    
    // Fill credentials matching login.tsx placeholders
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    await fireEvent.changeText(emailInput, TEST_CANDIDATE.email);
    await fireEvent.changeText(passwordInput, TEST_CANDIDATE.password);

    // Press Sign In
    const signInButton = screen.getByText('Sign In');
    await fireEvent.press(signInButton);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/referral-code');
    });

    // Verify security login email was dispatched
    await waitFor(() => {
      expect(dispatchedEmails.some((e) => e.emailType === 'login_alert')).toBe(true);
    });

    const loginEmail = dispatchedEmails.find((e) => e.emailType === 'login_alert');
    expect(loginEmail).toBeDefined();
    expect(loginEmail!.to).toBe(TEST_CANDIDATE.email);
    expect(loginEmail!.subject).not.toContain('\u2014'); // Zero em-dashes
    expect(loginEmail!.subject).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u); // Zero emojis in subject
    expect(loginEmail!.text).toContain(TEST_CANDIDATE.email);
  });

  it('Stage 2: Candidate enters promo code LINKEDIN20, receives credits & promo email, advances to Role step', async () => {
    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: { onboarding_completed: false },
    });
    mockLoggedInSession(mockSupabase, session);

    const screen = await renderWithProviders(<ReferralCodeScreen />);

    expect(screen.getByText('Got a referral or promo code?')).toBeTruthy();
    const codeInput = screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234');
    await fireEvent.changeText(codeInput, 'LINKEDIN20');

    const applyBtn = screen.getByText('Apply Code');
    await fireEvent.press(applyBtn);

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text1: 'Promo Code Applied! 🎉',
          text2: 'You received 20 free AI credits!',
        })
      );
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/role');
    });

    // Check promo email received
    expect(dispatchedEmails.some((e) => e.emailType === 'promo_reward')).toBe(true);
    const promoEmail = dispatchedEmails.find((e) => e.emailType === 'promo_reward');
    expect(promoEmail!.subject).toBe('20 Practice Credits Added to Your Account - Interview Ready');
    expect(promoEmail!.subject).not.toContain('\u2014');
    expect(promoEmail!.subject).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u);
  });

  it('Stage 3: Candidate specifies target role and preferences on Role screen', async () => {
    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: {
        first_name: TEST_CANDIDATE.firstName,
        last_name: TEST_CANDIDATE.lastName,
        onboarding_completed: false,
      },
    });
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.__mockHelpers.tables['user_profiles'] = [];
    mockApiCall.mockResolvedValue({ data: { success: true }, error: null });

    const screen = await renderWithProviders(<RoleScreen />);

    // Enter target role using exact placeholder from role.tsx
    const roleInput = screen.getByPlaceholderText('e.g. Software Engineer');
    await fireEvent.changeText(roleInput, TEST_CANDIDATE.targetRole);

    // Select experience '6-10'
    const expOption = screen.getByText('6-10');
    await fireEvent.press(expOption);

    // Select Remote
    const remoteOption = screen.getByText('Remote');
    await fireEvent.press(remoteOption);

    // Press Continue
    const continueBtn = screen.getByText('Continue');
    await fireEvent.press(continueBtn);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/profile');
    });

    expect(useOnboardingStore.getState().targetRole).toBe(TEST_CANDIDATE.targetRole);
    expect(useOnboardingStore.getState().yearsExperience).toBe('6-10');
  });

  it('Stage 4: Candidate configures profile and selects Executive template', async () => {
    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: { onboarding_completed: false },
    });
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.__mockHelpers.tables['user_profiles'] = [];
    mockApiCall.mockResolvedValue({ data: { success: true }, error: null });

    useOnboardingStore.setState({
      firstName: TEST_CANDIDATE.firstName,
      lastName: TEST_CANDIDATE.lastName,
      targetRole: TEST_CANDIDATE.targetRole,
    });

    const screen = await renderWithProviders(<ProfileScreen />);

    expect(screen.getByText('STEP 2 OF 5')).toBeTruthy();

    // Fill current role & company
    const currentRoleInput = screen.getByPlaceholderText('e.g. Senior Product Manager');
    await fireEvent.changeText(currentRoleInput, TEST_CANDIDATE.currentRole);

    const companyInput = screen.getByPlaceholderText('e.g. Acme Corp');
    await fireEvent.changeText(companyInput, TEST_CANDIDATE.company);

    const locationInput = screen.getByPlaceholderText('e.g. Austin, TX');
    await fireEvent.changeText(locationInput, TEST_CANDIDATE.location);

    // Select Executive template
    const executiveOption = screen.getByText('Executive');
    await fireEvent.press(executiveOption);
    expect(useOnboardingStore.getState().selectedTemplateId).toBe('executive');

    // Add suggested skill chip
    const leadershipSkill = screen.getByText('Leadership');
    await fireEvent.press(leadershipSkill);
    expect(useOnboardingStore.getState().skills).toContain('Leadership');

    // Press Continue
    const continueBtn = screen.getByText('Continue');
    await fireEvent.press(continueBtn);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/analyze');
    });
  });

  it('Stage 5: Candidate analyzes target job description and inspects ATS fit score', async () => {
    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: { onboarding_completed: false },
    });
    mockLoggedInSession(mockSupabase, session);

    mockApiCall.mockResolvedValueOnce({
      data: {
        job_id: 'job-analysis-101',
        analysis: {
          recommendation_level: 'GREAT_FIT',
          required_skills: [
            { skill: 'Go', importance: 'HIGH' },
            { skill: 'Kubernetes', importance: 'HIGH' },
            { skill: 'Kafka', importance: 'MEDIUM' },
          ],
          nice_to_haves: ['AWS', 'gRPC'],
          red_flags: [],
        },
      },
      error: null,
    });

    const screen = await renderWithProviders(<AnalyzeScreen />);

    const jdTextInput = screen.getByPlaceholderText(/Paste the job description content here/);
    await fireEvent.changeText(jdTextInput, TEST_CANDIDATE.jdText);

    // Analyze JD
    const analyzeBtn = screen.getByText('Analyze Job');
    await fireEvent.press(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText('ANALYSIS RESULT')).toBeTruthy();
      expect(screen.getByText('Fit Score')).toBeTruthy();
      expect(screen.getByText('Required Skills')).toBeTruthy();
      expect(screen.getByText('Go')).toBeTruthy();
      expect(screen.getByText('Kubernetes')).toBeTruthy();
    });

    expect(useOnboardingStore.getState().analysisId).toBe('job-analysis-101');

    // Click Continue to resume step
    const continueBtn = screen.getByText('Continue');
    await fireEvent.press(continueBtn);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/resume');
    });
  });

  it('Stage 6: Candidate generates AI resume and downloads PDF and DOCX', async () => {
    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: { onboarding_completed: false },
    });
    mockLoggedInSession(mockSupabase, session);

    useOnboardingStore.setState({
      targetRole: TEST_CANDIDATE.targetRole,
      analysisId: 'job-analysis-101',
      selectedTemplateId: 'executive',
      currentRole: TEST_CANDIDATE.currentRole,
      company: TEST_CANDIDATE.company,
      location: TEST_CANDIDATE.location,
    });

    mockApiCall.mockResolvedValueOnce({
      data: {
        resume_id: RESUME_FIXTURE.id,
        message: 'Resume generation started',
        stream_channel: 'chan-resume-101',
      },
      error: null,
    });
    mockSupabase.__mockHelpers.tables['resumes'] = [RESUME_FIXTURE];

    const screen = await renderWithProviders(<ResumeGenScreen />);

    // Verify generation started with correct params
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({
          title: TEST_CANDIDATE.targetRole,
          job_analysis_id: 'job-analysis-101',
        })
      );
    });

    expect(screen.getByText('Your resume is generating...')).toBeTruthy();

    // Emit generation completion event over Realtime channel
    await waitFor(() => {
      expect(mockSupabase.__mockHelpers.channelBuilder._listeners.length).toBeGreaterThan(0);
    });

    await act(async () => {
      mockSupabase.__mockHelpers.channelBuilder._emit('generation_complete');
    });

    // Verify ready state
    await waitFor(() => {
      expect(screen.getByText('Your first resume is ready!')).toBeTruthy();
    });

    // Test downloading PDF from ResumeGenScreen
    const downloadPdfBtn = screen.getByText('Download PDF');
    await fireEvent.press(downloadPdfBtn);
    await waitFor(() => {
      expect(mockExportPDF).toHaveBeenCalled();
    });

    // Test downloading DOCX from ResumeGenScreen
    const downloadDocxBtn = screen.getByText('Download .docx');
    await fireEvent.press(downloadDocxBtn);
    await waitFor(() => {
      expect(mockExportDOCX).toHaveBeenCalled();
    });

    // Open Fullscreen Preview
    const fullscreenBtn = screen.getByText('View Fullscreen Preview');
    await fireEvent.press(fullscreenBtn);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/preview');
    });

    expect(usePreviewStore.getState().templateId).toBe('executive');
    expect(usePreviewStore.getState().resumeId).toBe(RESUME_FIXTURE.id);
  });

  it('Stage 7: Candidate views resume in PreviewScreen, interacts with feedback widget, and downloads', async () => {
    const session = buildSession({
      id: TEST_CANDIDATE.id,
      email: TEST_CANDIDATE.email,
      user_metadata: { onboarding_completed: true },
    });
    mockLoggedInSession(mockSupabase, session);

    usePreviewStore.getState().setPreview(
      'resume',
      RESUME_FIXTURE.resume_contents[0],
      '<html><body>Executive Resume for Alex Chen</body></html>',
      'executive',
      RESUME_FIXTURE.id
    );

    const screen = await renderWithProviders(<PreviewScreen />);

    expect(screen.getByText('Document Preview')).toBeTruthy();
    expect(screen.getByLabelText('Download PDF')).toBeTruthy();
    expect(screen.getByLabelText('Download DOCX')).toBeTruthy();

    // Verify downloads in PreviewScreen
    await fireEvent.press(screen.getByLabelText('Download PDF'));
    await waitFor(() => {
      expect(mockExportPDF).toHaveBeenCalled();
    });

    await fireEvent.press(screen.getByLabelText('Download DOCX'));
    await waitFor(() => {
      expect(mockExportDOCX).toHaveBeenCalled();
    });
  });

  it('Stage 8: Comprehensive Email Delivery & Anti-Spam Verification for the User Journey', async () => {
    // 1. Send Welcome Email
    const welcomeSuccess = await triggerWelcomeEmail(TEST_CANDIDATE.email, TEST_CANDIDATE.firstName);
    expect(welcomeSuccess).toBe(true);

    // 2. Send Login Alert Email
    const loginSuccess = await triggerLoginNotificationEmail(TEST_CANDIDATE.email, TEST_CANDIDATE.firstName);
    expect(loginSuccess).toBe(true);

    // 3. Send Account Confirmation Email
    const waitlistSuccess = await triggerWaitlistConfirmationEmail(TEST_CANDIDATE.email, TEST_CANDIDATE.firstName);
    expect(waitlistSuccess).toBe(true);

    // Ensure all 3 emails were dispatched
    expect(dispatchedEmails.length).toBeGreaterThanOrEqual(3);

    const bannedKeywords = [
      'free ai credits',
      'vip waitlist',
      'check your spam folder',
      'queue position',
    ];

    for (const email of dispatchedEmails) {
      // Rule 1: Zero em-dashes
      expect(email.subject).not.toContain('\u2014');
      expect(email.subject).not.toContain('&mdash;');
      expect(email.html).not.toContain('\u2014');

      // Rule 2: Zero emojis in subjects
      expect(email.subject).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);

      // Rule 3: No spam trigger phrases
      const lowerSubject = email.subject.toLowerCase();
      const lowerHtml = email.html.toLowerCase();
      const lowerText = (email.text || '').toLowerCase();

      for (const phrase of bannedKeywords) {
        expect(lowerSubject).not.toContain(phrase);
        expect(lowerHtml).not.toContain(phrase);
        expect(lowerText).not.toContain(phrase);
      }

      // Rule 4: Valid recipient
      expect(email.to).toBe(TEST_CANDIDATE.email);
    }
  });
});
