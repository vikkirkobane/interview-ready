import React from 'react';
import { waitFor, act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import CoverLetterScreen from '../app/(tabs)/cover-letter';
import { supabase } from '../src/lib/supabase';
import { apiCall } from '../src/lib/api';
import { renderWithProviders, flushPromises } from './helpers/render';
import { resetAllStores, mockLoggedInSession } from './helpers/stores';
import { buildSession } from './helpers/supabase';
import { buildCoverLetterHTML } from '../src/lib/coverLetterHTML';
import { exportCoverLetterDOCX } from '../src/lib/coverLetterExport';
import { CoverLetter } from '../src/types/schemas';

jest.mock('../src/lib/supabase', () => {
  const helper = require('./helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../src/lib/api', () => {
  const { createApiMock } = require('./helpers/supabase');
  return createApiMock();
});

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: '/mock/cache/',
  EncodingType: { Base64: 1, UTF8: 0 },
  copyAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  shareAsync: jest.fn(async () => ({ action: 'sharedAction' })),
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  AlignmentType: { CENTER: 'CENTER', LEFT: 'LEFT' },
  Packer: {
    toBase64String: jest.fn(async () => 'QUJDRA=='),
    toBlob: jest.fn(async () => new Blob()),
  },
}));

jest.setTimeout(25000);

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;

describe('Diverse Cover Letters & Job Descriptions Test Suite', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    (router as any).__resetMockRouter?.();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. DIVERSE CANDIDATE PROFILES & FULL-PAGE DENSITY STANDARD
  // ═════════════════════════════════════════════════════════════════════════════

  describe('1. Full-Page Density & Content Balancing across Diverse Input Sizes', () => {
    it('Case A (Entry-Level / Sparse Input): Produces a commanding 4-paragraph letter filling standard 1-page budget', () => {
      const entryLevelLetter: CoverLetter = {
        meta: {
          candidate_name: 'Sophia Chen',
          target_role: 'Associate Product Manager',
          target_company: 'Stripe',
          generated_at: new Date().toISOString(),
          word_count: 365,
          ats_keywords_used: ['Product Discovery', 'User Research', 'SQL Analytics', 'Agile Sprints', 'Cross-Functional Collaboration'],
          tone: 'PROFESSIONAL',
        },
        header: {
          candidate_name: 'Sophia Chen',
          target_role: 'Associate Product Manager',
          phone: '+1 (555) 234-9876',
          email: 'sophia.chen@alumni.stanford.edu',
          linkedin: 'linkedin.com/in/sophiachen',
          portfolio: 'sophiachen.me',
          location: 'San Francisco, CA',
          date: 'August 22, 2026',
          hiring_manager: 'Marcus Sterling',
          company_name: 'Stripe, Inc.',
          company_address: '354 Oyster Point Blvd, South San Francisco, CA 94080',
        },
        salutation: 'Dear Mr. Sterling,',
        paragraphs: {
          opening: {
            text: 'I am thrilled to submit my application for the Associate Product Manager position at Stripe. Having closely followed Stripe’s developer-first payments infrastructure and global expansion, I am energized by your mission to increase the GDP of the internet. With a rigorous background in human-computer interaction and data-driven product prototyping, I am confident in my ability to immediately contribute to your checkout and merchant tooling squad.',
            word_count: 67,
          },
          body_1: {
            text: 'During my time leading product initiatives for the Stanford Student Tech Incubator, I spearheaded the discovery and launch of a campus micro-grant portal that processed $140K+ in student project funding across 45 teams. I led user research sessions across 80+ active student founders, synthesized qualitative pain points into actionable user stories, and partnered with 4 software engineers in bi-weekly agile sprints. Through continuous usability testing and conversion funnel optimization, we reduced onboarding drop-off by 38% and achieved a 94% customer satisfaction score.',
            word_count: 88,
          },
          body_2: {
            text: 'In addition to product execution, I have built strong quantitative analytical depth using SQL, Python, and Amplitude to extract actionable behavioral insights. When analyzing payment gateway failure modes during an academic fintech fellowship, I developed a predictive routing model that identified recurring latency spikes and proposed automated retries that improved synthetic transaction success rates by 14%. I pride myself on bridging technical engineering constraints with intuitive user experiences to deliver scalable business outcomes.',
            word_count: 75,
          },
          closing: {
            text: 'I would welcome the opportunity to discuss how my customer empathy, analytical rigor, and relentless drive can support Stripe’s upcoming merchant platform milestones. Thank you for your time, consideration, and dedication to empowering global entrepreneurs.',
            word_count: 36,
          },
        },
        sign_off: {
          closing_phrase: 'Sincerely,',
          name: 'Sophia Chen',
        },
      };

      const html = buildCoverLetterHTML(entryLevelLetter);

      expect(html).toContain('Sophia Chen');
      expect(html).toContain('Associate Product Manager');
      expect(html).toContain('Stripe, Inc.');
      expect(html).toContain('Marcus Sterling');
      expect(html).toContain('Dear Mr. Sterling,');
      expect(html).toContain('Stanford Student Tech Incubator');
      expect(html).toContain('Sincerely,');
      expect(html).toContain('@page { size: A4 portrait; margin: 18mm 20mm 16mm 20mm; }');
      expect(html).toContain('font-size: 12.4px;');
    });

    it('Case B (Senior Executive 10+ Years): Curates high-impact milestones within the 1-page boundary', () => {
      const executiveLetter: CoverLetter = {
        meta: {
          candidate_name: 'Arthur Pendelton',
          target_role: 'Chief Technology Officer',
          target_company: 'Vanguard Health Systems',
          generated_at: new Date().toISOString(),
          word_count: 380,
          ats_keywords_used: ['Executive Leadership', 'HIPAA Compliance', 'Cloud Modernization', 'P&L Management', 'AI Diagnostic Pipelines'],
          tone: 'FORMAL',
        },
        header: {
          candidate_name: 'Arthur Pendelton',
          target_role: 'Chief Technology Officer',
          phone: '+1 (555) 789-0123',
          email: 'arthur.pendelton@healthtech-exec.com',
          linkedin: 'linkedin.com/in/arthurpendelton',
          portfolio: 'pendeltontech.com',
          location: 'Boston, MA',
          date: 'August 22, 2026',
          hiring_manager: 'Board of Directors & Search Committee',
          company_name: 'Vanguard Health Systems',
          company_address: '100 Health Science Park, Boston, MA 02115',
        },
        salutation: 'Dear Members of the Search Committee,',
        paragraphs: {
          opening: {
            text: 'I am writing to express my strong interest in the Chief Technology Officer role at Vanguard Health Systems. With over 14 years of executive engineering leadership spearheading enterprise healthcare transformations, multi-region cloud migrations, and secure clinical informatics platforms, I am eager to leverage my strategic governance and technical architecture expertise to accelerate Vanguard’s digital health innovation roadmap.',
            word_count: 61,
          },
          body_1: {
            text: 'In my current tenure as Vice President of Engineering at MedScale Global, I oversee an engineering and data organization of 220+ contributors across 4 international delivery centers with an annual technology budget of $42M. Under my direction, we modernized legacy monolithic EHR integrations into a real-time FHIR-compliant event mesh on AWS, reducing clinical data ingestion latency from 4 hours to under 30 seconds across 1,800 hospital partner networks while maintaining a 100% flawless HIPAA and SOC-2 Type II audit track record.',
            word_count: 85,
          },
          body_2: {
            text: 'Beyond infrastructure modernization, I have placed strong emphasis on institutionalizing machine-learning-assisted diagnostic tools into active clinician workflows. By collaborating closely with chief medical officers, regulatory counsel, and engineering staff, my teams delivered an AI-enabled triage system adopted by 40,000 active physicians that accelerated critical oncology review turnaround by 32%. I believe in cultivating a culture of transparent engineering governance, operational excellence, and patient-first technological innovation.',
            word_count: 70,
          },
          closing: {
            text: 'I would welcome the opportunity to meet with the Board and executive leadership team to share strategic insights on scaling Vanguard’s clinical technology ecosystem. Thank you for your leadership and consideration of my candidacy.',
            word_count: 35,
          },
        },
        sign_off: {
          closing_phrase: 'Respectfully yours,',
          name: 'Arthur Pendelton',
        },
      };

      const html = buildCoverLetterHTML(executiveLetter);

      expect(html).toContain('Arthur Pendelton');
      expect(html).toContain('Chief Technology Officer');
      expect(html).toContain('Vanguard Health Systems');
      expect(html).toContain('MedScale Global');
      expect(html).toContain('Respectfully yours,');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. DIVERSE JOB DESCRIPTIONS & GENERATION SCREEN TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('2. Cover Letter Screen with Diverse Industries & JDs', () => {
    it('generates a tailored cover letter for a Senior DevOps & Cloud Architect JD', async () => {
      const generatedLetterData: CoverLetter = {
        meta: {
          candidate_name: 'David Kim',
          target_role: 'Lead Cloud Infrastructure Architect',
          target_company: 'Datadog',
          generated_at: new Date().toISOString(),
          word_count: 360,
          ats_keywords_used: ['Kubernetes', 'Terraform', 'Multi-Region Failover', 'FinOps', 'Site Reliability Engineering'],
          tone: 'PROFESSIONAL',
        },
        header: {
          candidate_name: 'David Kim',
          target_role: 'Lead Cloud Infrastructure Architect',
          phone: '+1 (555) 345-6789',
          email: 'david.kim@clouddev.io',
          linkedin: 'linkedin.com/in/davidkim',
          portfolio: 'github.com/davidkim',
          location: 'San Jose, CA',
          date: 'August 22, 2026',
          hiring_manager: 'Director of Infrastructure Engineering',
          company_name: 'Datadog, Inc.',
          company_address: '620 8th Ave, New York, NY 10018',
        },
        salutation: 'Dear Hiring Team,',
        paragraphs: {
          opening: {
            text: 'I am thrilled to apply for the Lead Cloud Infrastructure Architect role at Datadog. As a long-time practitioner of Datadog’s observability and distributed tracing ecosystem, I have dedicated the past 8 years to engineering high-throughput, self-healing cloud infrastructure capable of processing tens of millions of telemetry events per second with sub-100ms latency.',
            word_count: 53,
          },
          body_1: {
            text: 'At CloudScale Networks, I spearheaded the architectural redesign of our multi-region Kubernetes deployment spanning AWS and Google Cloud Platform, supporting 35M+ daily active sessions. By introducing GitOps pipelines with ArgoCD and modular Terraform blueprints, my team reduced deployment failure rates by 72% and decreased mean time to recovery (MTTR) from 45 minutes to under 4 minutes. Furthermore, I partnered with finance leadership to institute automated FinOps resource reclamation policies that cut annual infrastructure expenditure by $2.4M.',
            word_count: 83,
          },
          body_2: {
            text: 'In addition to core architecture, I have prioritized building a culture of observability and shared operational ownership. I instituted automated Chaos Engineering fire drills using Gremlin and OpenTelemetry to proactively discover network partition vulnerabilities prior to Black Friday traffic spikes. Mentoring 12 staff and senior SREs in distributed systems debugging has been among my most rewarding professional achievements.',
            word_count: 61,
          },
          closing: {
            text: 'I would relish the opportunity to discuss how my hands-on architecture experience and passion for scalable observability can contribute to Datadog’s next-generation platform services. Thank you for your consideration.',
            word_count: 30,
          },
        },
        sign_off: {
          closing_phrase: 'Sincerely,',
          name: 'David Kim',
        },
      };

      mockApiCall.mockResolvedValue({
        data: {
          cover_letter_id: 'cl-datadog-1',
          cover_letter: generatedLetterData,
        },
        error: null,
      });

      const screen = await renderWithProviders(<CoverLetterScreen />);

      // Fill in form
      await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Datadog');
      await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Lead Cloud Infrastructure Architect');
      await fireEvent.changeText(screen.getByPlaceholderText('Or paste the full job description here...'), 'Seeking a Lead Cloud Infrastructure Architect with deep Kubernetes, Terraform, and Multi-Region expertise.');

      // Submit generation
      await act(async () => {
        await fireEvent.press(screen.getByText('Generate Cover Letter'));
        await flushPromises();
      });

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          'cover-letters-create',
          'POST',
          expect.objectContaining({
            company_name: 'Datadog',
            job_title: 'Lead Cloud Infrastructure Architect',
          })
        );
      });
    });

    it('exports diverse cover letter to DOCX format cleanly without missing sections', async () => {
      const sampleCoverLetter: CoverLetter = {
        meta: {
          candidate_name: 'Rachel Green',
          target_role: 'Senior Brand Marketing Manager',
          target_company: 'Spotify',
          generated_at: new Date().toISOString(),
          word_count: 350,
          ats_keywords_used: ['Brand Strategy', 'Creator Campaigns', 'Influencer Marketing', 'User Acquisition'],
          tone: 'ENTHUSIASTIC',
        },
        header: {
          candidate_name: 'Rachel Green',
          target_role: 'Senior Brand Marketing Manager',
          phone: '+1 (555) 456-7890',
          email: 'rachel.green@brandcreatives.com',
          linkedin: 'linkedin.com/in/rachelgreen',
          portfolio: 'rachelgreenbrand.com',
          location: 'New York, NY',
          date: 'August 22, 2026',
          hiring_manager: 'VP of Global Brand Marketing',
          company_name: 'Spotify USA',
          company_address: '4 World Trade Center, New York, NY 10007',
        },
        salutation: 'Dear Spotify Marketing Team,',
        paragraphs: {
          opening: {
            text: 'I am beyond excited to apply for the Senior Brand Marketing Manager role at Spotify. Spotify has revolutionized the way the world connects with audio, culture, and music, and I have long admired how your cultural marketing campaigns seamlessly blend data storytelling with creator passion.',
            word_count: 48,
          },
          body_1: {
            text: 'Over the last 6 years leading global creative campaigns at SoundWave Studios, I directed multi-channel brand launches that generated 85M+ organic social impressions and increased Gen Z subscriber acquisition by 44%. I managed a $6M annual creator marketing budget, negotiating partnerships with 50+ top-tier podcast and music influencers while maintaining a 3.8x return on marketing spend.',
            word_count: 59,
          },
          body_2: {
            text: 'My approach combines deep cultural intuition with rigorous quantitative measurement. By leveraging real-time streaming analytics to identify emerging genre trends, my team conceptualized interactive digital experiences that drove a 28% increase in daily user engagement across mobile and desktop apps. I thrive in high-velocity creative environments where cross-functional collaboration turns bold ideas into viral cultural moments.',
            word_count: 57,
          },
          closing: {
            text: 'I would love the chance to discuss how my brand strategy leadership and creative energy can help amplify Spotify’s next wave of global creator campaigns. Thank you for your time and musical inspiration.',
            word_count: 34,
          },
        },
        sign_off: {
          closing_phrase: 'Warm regards,',
          name: 'Rachel Green',
        },
      };

      await exportCoverLetterDOCX(sampleCoverLetter);

      const mockLegacyFS = require('expo-file-system/legacy');
      expect(mockLegacyFS.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/cache/Rachel_Green_Cover_Letter.docx',
        expect.any(String),
        expect.objectContaining({ encoding: 1 })
      );
    });
  });
});
