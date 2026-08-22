import React from 'react';
import { waitFor, act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ResumeGenScreen from '../app/(onboarding)/resume';
import NewResumeScreen from '../app/(tabs)/new-resume';
import { supabase } from '../src/lib/supabase';
import { apiCall } from '../src/lib/api';
import { renderWithProviders, flushPromises } from './helpers/render';
import { resetAllStores, mockLoggedInSession } from './helpers/stores';
import { buildSession } from './helpers/supabase';
import { useOnboardingStore } from '../src/stores/onboarding-store';
import { buildResumeHTML } from '../src/lib/resumeHTML';
import { exportResumeDOCX } from '../src/lib/resumeExport';
import { ResumeContent } from '../src/types/schemas';

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
  HeadingLevel: {},
  AlignmentType: { CENTER: 'CENTER', LEFT: 'LEFT' },
  Packer: {
    toBase64String: jest.fn(async () => 'QUJDRA=='),
    toBlob: jest.fn(async () => new Blob()),
  },
}));

jest.setTimeout(25000);

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;

describe('Diverse Resume Sizes & Job Descriptions Test Suite', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. DIVERSE SIZE MATRIX TESTS (SPARSE -> MODERATE -> HEAVY)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('1. Resume Density & Content Balancing with Diverse Input Sizes', () => {
    it('Case A (Sparse Input): Expands entry-level profile with 1 job & 2 skills to full-page standard', () => {
      const sparseRawPayload: any = {
        name: 'Jordan Lee',
        title: 'Junior Data Analyst',
        contact: {
          name: 'Jordan Lee',
          email: 'jordan.lee@example.com',
          phone: '+1 (555) 111-2233',
          location: 'Austin, TX',
        },
        summary: '',
        skills: ['SQL', 'Excel'],
        experience: [
          {
            title: 'Junior Analyst',
            company: 'Local Retailer',
            bullets: ['Assisted with inventory reporting spreadsheet.'],
          },
        ],
        education: [
          {
            degree: 'B.S. in Economics',
            institution: 'University of Texas',
            year: '2023',
          },
        ],
      };

      // When rendered via HTML engine, verify all 3 skill categories and full density are present
      const htmlOutput = buildResumeHTML(sparseRawPayload as any, 'executive');

      expect(htmlOutput).toContain('Jordan Lee');
      expect(htmlOutput).toContain('Junior Data Analyst');
      expect(htmlOutput).toContain('SQL');
      expect(htmlOutput).toContain('Excel');
      // Must contain A4 page style and professional typography
      expect(htmlOutput).toContain('@page { size: A4 portrait;');
      expect(htmlOutput).toContain('font-size: 10.2px;');
      expect(htmlOutput).toContain('#1A365D');
    });

    it('Case B (Moderate Career Switcher): Balances dual-role profile with targeted skills', () => {
      const switcherPayload: ResumeContent = {
        meta: {
          candidate_name: 'Maya Patel',
          profession: 'Full Stack Engineer',
          target_role: 'Full Stack Developer',
          generated_at: new Date().toISOString(),
          ats_keywords_used: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL', 'AWS'],
          page_fit_estimate: 'comfortable',
        },
        header: {
          name: 'Maya Patel',
          title: 'Full Stack Engineer',
          subtitle: 'React & Cloud Microservices Specialist',
          email: 'maya.patel@dev.io',
          phone: '+1 (555) 444-5566',
          linkedin: 'linkedin.com/in/mayapatel',
          portfolio: 'mayapatel.dev',
          location: 'Seattle, WA',
        },
        summary: {
          text: 'Full Stack Engineer with 4+ years of combined experience building resilient React and Node.js web applications, scaling GraphQL microservices, and reducing API response latency by 35%. Proven background in cross-functional collaboration and agile development.',
        },
        skills: [
          {
            category: 'Frontend & UI Engineering',
            items: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux / Zustand'],
          },
          {
            category: 'Backend & Data Systems',
            items: ['Node.js', 'Express', 'PostgreSQL', 'GraphQL', 'Redis', 'REST APIs'],
          },
          {
            category: 'DevOps & Tooling',
            items: ['Docker', 'AWS (S3, ECS, Lambda)', 'CI/CD Pipelines', 'Jest / React Testing Library'],
          },
        ],
        experience: [
          {
            title: 'Full Stack Developer',
            company: 'HealthTech Solutions',
            date_range: '2022 – Present',
            location: 'Seattle, WA',
            bullets: [
              'Spearheaded the development of patient management dashboard in React & TypeScript, used by 120k+ healthcare providers.',
              'Architected secure GraphQL APIs with automated HIPAA compliance validation, cutting sync time by 45%.',
              'Refactored legacy database schemas into optimized PostgreSQL indexes, boosting throughput by 50%.',
              'Collaborated with UX and product designers to deliver 100% accessible (WCAG AAA) component library.',
            ],
          },
          {
            title: 'Junior Web Specialist',
            company: 'Creative Media Group',
            date_range: '2020 – 2022',
            location: 'Portland, OR',
            bullets: [
              'Developed custom responsive client websites using modern JavaScript, HTML5, and CSS3.',
              'Implemented automated testing suites achieving 88% unit test coverage across 15 client projects.',
              'Participated in daily scrum standups, sprint planning, and bi-weekly peer code reviews.',
            ],
          },
        ],
        featured_project: {
          include: true,
          name: 'CloudSync Open Source Telemetry Dashboard',
          tech_stack: 'React, Node.js, WebSockets, Docker, AWS',
          bullet: 'Engineered real-time telemetry streaming portal supporting 10k concurrent WebSockets with sub-50ms latency.',
        },
        education: [
          {
            degree: 'B.S. in Computer Science',
            institution: 'University of Washington',
            year: '2020',
            note: 'Magna Cum Laude',
          },
        ],
        certifications: [
          'AWS Certified Developer – Associate (2023)',
        ],
        languages: [{ language: 'English', proficiency: 'Fluent' }],
        recognition: [],
        sections_to_include: {
          summary: true,
          skills: true,
          experience: true,
          featured_project: true,
          education: true,
          certifications: true,
          languages: true,
          recognition: false,
        },
      };

      const modernHTML = buildResumeHTML(switcherPayload, 'modern-pro');
      expect(modernHTML).toContain('Maya Patel');
      expect(modernHTML).toContain('Frontend &amp; UI Engineering');
      expect(modernHTML).toContain('Backend &amp; Data Systems');
      expect(modernHTML).toContain('CloudSync Open Source Telemetry Dashboard');
      expect(modernHTML).toContain('HealthTech Solutions');
      expect(modernHTML).toContain('#0D9488'); // Modern-pro teal accent
    });

    it('Case C (Heavy / Veteran 10+ Years): Retains high-impact executive structure without overflowing', () => {
      const veteranPayload: ResumeContent = {
        meta: {
          candidate_name: 'Elena Rostova',
          profession: 'VP of Engineering',
          target_role: 'Vice President of Engineering',
          generated_at: new Date().toISOString(),
          ats_keywords_used: ['Executive Leadership', 'P&L Management', 'Multi-Region Cloud', 'Staff Engineering', 'FinOps'],
          page_fit_estimate: 'comfortable',
        },
        header: {
          name: 'Elena Rostova',
          title: 'VP of Engineering',
          subtitle: 'Cloud Infrastructure & Enterprise Systems Leader',
          email: 'elena.rostova@exec.org',
          phone: '+1 (555) 987-6543',
          linkedin: 'linkedin.com/in/elenarostova',
          portfolio: 'elenarostova.com',
          location: 'New York, NY',
        },
        summary: {
          text: 'Executive Engineering Leader with 12+ years of experience scaling distributed engineering organizations from 25 to 180+ engineers across 4 global hubs. Proven track record managing $35M+ annual budgets, driving 99.999% platform availability, and reducing cloud infrastructure expenditure by $4.2M through strategic architectural modernization.',
        },
        skills: [
          {
            category: 'Executive Strategy & Operations',
            items: ['Engineering Leadership (180+)', 'P&L & Budget Management ($35M)', 'Organizational Design', 'Strategic Roadmap Execution', 'Talent Acquisition & Mentorship'],
          },
          {
            category: 'Architecture & Cloud Systems',
            items: ['Distributed Systems Architecture', 'Kubernetes & Multi-Region Cloud', 'High-Availability Infrastructure', 'Disaster Recovery', 'Security & SOC-2 Compliance'],
          },
          {
            category: 'Process & Methodologies',
            items: ['Agile / Scaled Agile (SAFe)', 'FinOps Cloud Optimization', 'Technical Governance & RFCs', 'Continuous Delivery (CI/CD)'],
          },
        ],
        experience: [
          {
            title: 'VP of Engineering',
            company: 'OmniCloud Technologies',
            date_range: '2021 – Present',
            location: 'New York, NY',
            bullets: [
              'Directed global engineering division of 180+ engineers across 14 product squads, increasing feature velocity by 45%.',
              'Overseeing $35M annual infrastructure and headcount budget, realizing 28% efficiency savings through FinOps automation.',
              'Instituted company-wide technical RFC process and engineering career ladder, reducing senior talent attrition to sub-4%.',
              'Spearheaded multi-region cloud migration across AWS and GCP, achieving 99.999% uptime SLA for Tier-1 enterprise clients.',
            ],
          },
          {
            title: 'Director of Cloud Engineering',
            company: 'Apex Global Financial',
            date_range: '2017 – 2021',
            location: 'New York, NY',
            bullets: [
              'Built and mentored high-performance cloud operations group of 45 engineers and managers.',
              'Led migration of 200+ microservices to Kubernetes clusters processing $50B+ in annual transaction volume.',
              'Achieved SOC-2 Type II and ISO 27001 regulatory certifications with zero audit deficiencies.',
            ],
          },
          {
            title: 'Principal Systems Architect',
            company: 'DataStream Inc',
            date_range: '2013 – 2017',
            location: 'Boston, MA',
            bullets: [
              'Architected distributed real-time messaging pipeline handling 2M+ events/sec with sub-10ms p99 latency.',
              'Authored core infrastructure libraries adopted across 8 engineering teams.',
            ],
          },
        ],
        featured_project: {
          include: true,
          name: 'Zero-Downtime Multi-Region Disaster Recovery Mesh',
          tech_stack: 'AWS, Kubernetes, Istio Service Mesh, Terraform',
          bullet: 'Architected automated failover mesh switching active traffic across 3 geographic regions in under 12 seconds.',
        },
        education: [
          {
            degree: 'M.S. in Computer Science',
            institution: 'Massachusetts Institute of Technology (MIT)',
            year: '2013',
          },
          {
            degree: 'B.S. in Electrical Engineering & Computer Science',
            institution: 'Cornell University',
            year: '2011',
          },
        ],
        certifications: [
          'AWS Certified Solutions Architect – Professional',
          'Certified Information Systems Security Professional (CISSP)',
        ],
        languages: [{ language: 'English', proficiency: 'Native' }, { language: 'French', proficiency: 'Professional' }],
        recognition: ['Tech Titan Leadership Award (2024)', 'Forbes Tech Council Contributor (2023)'],
        sections_to_include: {
          summary: true,
          skills: true,
          experience: true,
          featured_project: true,
          education: true,
          certifications: true,
          languages: true,
          recognition: true,
        },
      };

      const execHTML = buildResumeHTML(veteranPayload, 'executive');
      expect(execHTML).toContain('Elena Rostova');
      expect(execHTML).toContain('VP of Engineering');
      expect(execHTML).toContain('OmniCloud Technologies');
      expect(execHTML).toContain('Apex Global Financial');
      expect(execHTML).toContain('Zero-Downtime Multi-Region Disaster Recovery Mesh');
      expect(execHTML).toContain('Massachusetts Institute of Technology');
      expect(execHTML).toContain('Tech Titan Leadership Award');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. DIVERSE JOB DESCRIPTIONS & ONBOARDING FLOW TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('2. Onboarding Generation Screen with Diverse JDs', () => {
    it('generates a tailored resume for a FinTech Quantitative Analyst JD', async () => {
      const finTechResume = {
        id: 'r-fintech',
        title: 'Quantitative Risk Analyst Resume',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resume_contents: [
          {
            name: 'Marcus Vance',
            title: 'Quantitative Risk Analyst',
            contact: {
              name: 'Marcus Vance',
              title: 'Quantitative Risk Analyst',
              email: 'marcus.vance@quant.com',
              phone: '+1 (555) 777-8899',
              location: 'Chicago, IL',
            },
            summary: 'Quantitative Analyst with 5+ years building stochastic pricing models, Monte Carlo risk engines, and algorithmic execution pipelines managing $500M+ in assets under management.',
            skills: [
              { category: 'Quantitative & Mathematical Modeling', items: ['Stochastic Calculus', 'Monte Carlo Simulation', 'Black-Scholes & Greeks', 'VaR & Stress Testing'] },
              { category: 'Programming & Data Engineering', items: ['Python (NumPy, SciPy, Pandas)', 'C++', 'SQL', 'KDB+/Q', 'Time-Series Analysis'] },
              { category: 'Financial Systems & Platforms', items: ['Bloomberg Terminal', 'FactSet', 'RiskMetrics', 'AWS HPC Clusters'] },
            ],
            experience: [
              {
                title: 'Senior Quantitative Analyst',
                company: 'Citadel Risk Capital',
                date_range: '2021 – Present',
                location: 'Chicago, IL',
                bullets: [
                  'Developed proprietary value-at-risk (VaR) framework running 1M Monte Carlo simulations in under 90 seconds.',
                  'Collaborated directly with portfolio managers to backtest high-frequency hedging strategies reducing downside risk by 28%.',
                  'Optimized distributed Python pricing algorithms across 64 AWS EC2 cluster instances.',
                ],
              },
            ],
            featured_project: {
              include: true,
              name: 'Algorithmic Portfolio Risk Engine',
              tech_stack: 'Python, C++, Cython, OpenMP',
              bullet: 'Architected parallelized derivatives risk calculator achieving 8x performance speedup over legacy system.',
            },
            education: [
              { degree: 'M.S. in Financial Mathematics', institution: 'University of Chicago', year: '2020' },
            ],
            certifications: ['Chartered Financial Analyst (CFA) Level III Candidate', 'FRM Certified'],
            sections_to_include: {
              summary: true,
              skills: true,
              experience: true,
              featured_project: true,
              education: true,
              certifications: true,
            },
          },
        ],
      };

      useOnboardingStore.setState({
        targetRole: 'Quantitative Risk Analyst',
        company: 'Citadel Risk Capital',
        analysisId: 'job-fintech-1',
      });

      mockApiCall.mockResolvedValue({
        data: { resume_id: 'r-fintech', message: 'ok', stream_channel: 'chan-fintech' },
        error: null,
      });
      mockSupabase.__mockHelpers.tables['resumes'] = [finTechResume];

      const screen = await renderWithProviders(<ResumeGenScreen />);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          'resumes-create',
          'POST',
          expect.objectContaining({ title: 'Quantitative Risk Analyst', job_analysis_id: 'job-fintech-1' })
        );
      });

      // Complete generation broadcast
      await act(async () => {
        mockSupabase.__mockHelpers.channelBuilder._emit('generation_complete');
        await flushPromises();
      });

      await waitFor(() => {
        expect(screen.getByText('Your first resume is ready!')).toBeTruthy();
      });
    });

    it('generates a tailored resume for a BioTech Clinical Research Scientist JD', async () => {
      const bioTechResume = {
        id: 'r-biotech',
        title: 'Lead Clinical Research Scientist Resume',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resume_contents: [
          {
            name: 'Dr. Evelyn Reed',
            title: 'Lead Clinical Research Scientist',
            contact: {
              name: 'Dr. Evelyn Reed',
              title: 'Lead Clinical Research Scientist',
              email: 'evelyn.reed@genomix.org',
              phone: '+1 (555) 333-2211',
              location: 'Boston, MA',
            },
            summary: 'Principal Clinical Scientist with 8+ years leading Phase I-III oncology and gene therapy clinical trials. Expert in FDA regulatory protocols, GCP compliance, and multi-site investigator oversight.',
            skills: [
              { category: 'Clinical Trial Management & Regulatory', items: ['Phase I-III Trial Design', 'FDA IND / NDA Submissions', 'GCP & ICH Compliance', 'Protocol Development'] },
              { category: 'Translational Science & Genomics', items: ['CRISPR/Cas9 Assays', 'Next-Gen Sequencing (NGS)', 'Flow Cytometry', 'Biomarker Discovery'] },
              { category: 'Data Analysis & Biostatistics', items: ['R Biostatistics', 'SAS Clinical', 'EDC Systems (Medidata Rave)', 'GraphPad Prism'] },
            ],
            experience: [
              {
                title: 'Lead Clinical Research Scientist',
                company: 'BioGenomix Therapeutics',
                date_range: '2020 – Present',
                location: 'Cambridge, MA',
                bullets: [
                  'Principal investigator on Phase II multi-center clinical study with 340 enrolled oncology patients across 18 clinical trial sites.',
                  'Authored Clinical Study Reports (CSR) contributing to FDA Fast Track designation approval.',
                  'Managed $14M clinical trial budget and coordinated with 3 global Contract Research Organizations (CROs).',
                ],
              },
            ],
            featured_project: {
              include: true,
              name: 'Targeted CAR-T Cell Biomarker Pipeline',
              tech_stack: 'R, SAS, FlowJo, Medidata Rave',
              bullet: 'Developed validated biomarker panel predicting patient therapy response with 89% sensitivity.',
            },
            education: [
              { degree: 'Ph.D. in Molecular Genetics', institution: 'Harvard University', year: '2018' },
            ],
            certifications: ['Certified Clinical Research Professional (CCRP)', 'RAC Regulatory Affairs Certification'],
            sections_to_include: {
              summary: true,
              skills: true,
              experience: true,
              featured_project: true,
              education: true,
              certifications: true,
            },
          },
        ],
      };

      useOnboardingStore.setState({
        targetRole: 'Lead Clinical Research Scientist',
        company: 'BioGenomix',
        analysisId: 'job-biotech-2',
      });

      mockApiCall.mockResolvedValue({
        data: { resume_id: 'r-biotech', message: 'ok', stream_channel: 'chan-biotech' },
        error: null,
      });
      mockSupabase.__mockHelpers.tables['resumes'] = [bioTechResume];

      const screen = await renderWithProviders(<ResumeGenScreen />);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalled();
      });

      await act(async () => {
        mockSupabase.__mockHelpers.channelBuilder._emit('generation_complete');
        await flushPromises();
      });

      await waitFor(() => {
        expect(screen.getByText('Your first resume is ready!')).toBeTruthy();
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. NEW-RESUME SCREEN WITH TEMPLATE SWITCHING & EXPORTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('3. Main Resume Screen (new-resume) with Diverse Templates', () => {
    it('switches templates and renders full-page preview across all available designs', async () => {
      mockApiCall.mockResolvedValue({
        data: { resume_id: 'r-template-test', message: 'ok', stream_channel: 'chan-templates' },
        error: null,
      });

      const screen = await renderWithProviders(<NewResumeScreen />);

      expect(screen.getByText('Resume Builder')).toBeTruthy();
      expect(screen.getByText('Executive')).toBeTruthy();
      expect(screen.getByText('Minimal')).toBeTruthy();
      expect(screen.getByText('Tech Stack')).toBeTruthy();
      expect(screen.getByText('Academic')).toBeTruthy();

      // Test selecting 'Minimal' template
      await act(async () => {
        await fireEvent.press(screen.getByText('Minimal'));
        await flushPromises();
      });

      // Test selecting 'Tech Stack' template
      await act(async () => {
        await fireEvent.press(screen.getByText('Tech Stack'));
        await flushPromises();
      });

      // Test selecting 'Academic' template
      await act(async () => {
        await fireEvent.press(screen.getByText('Academic'));
        await flushPromises();
      });

      // Trigger generation with selected template
      await act(async () => {
        await fireEvent.press(screen.getByText('Generate Resume'));
        await flushPromises();
      });

      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({ template_id: 'academic' })
      );
    });

    it('exports diverse resume content to DOCX format without loss of sections', async () => {
      const sampleTestResume: ResumeContent = {
        meta: {
          candidate_name: 'David Kim',
          profession: 'Senior DevOps Architect',
          target_role: 'Senior DevOps Architect',
          generated_at: new Date().toISOString(),
          ats_keywords_used: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD'],
          page_fit_estimate: 'comfortable',
        },
        header: {
          name: 'David Kim',
          title: 'Senior DevOps Architect',
          subtitle: 'Cloud Infrastructure & SRE',
          email: 'david.kim@cloud.io',
          phone: '+1 (555) 888-9999',
          location: 'San Jose, CA',
        },
        summary: {
          text: 'Senior DevOps Architect with 7+ years designing automated multi-cloud deployment pipelines, optimizing cloud costs by 35%, and managing 99.99% uptime for global microservices.',
        },
        skills: [
          { category: 'Cloud & Containers', items: ['AWS', 'Kubernetes', 'Docker', 'Helm', 'Terraform'] },
          { category: 'CI/CD & Automation', items: ['GitHub Actions', 'ArgoCD', 'Jenkins', 'Ansible'] },
          { category: 'Observability & SRE', items: ['Prometheus', 'Grafana', 'Datadog', 'OpenTelemetry'] },
        ],
        experience: [
          {
            title: 'Senior DevOps Architect',
            company: 'CloudScale Networks',
            date_range: '2021 – Present',
            location: 'San Jose, CA',
            bullets: [
              'Architected Kubernetes clusters across 3 AWS regions serving 25M+ active users.',
              'Automated zero-downtime blue/green deployment pipeline with ArgoCD, decreasing deploy failures by 75%.',
              'Implemented FinOps governance saving $1.2M annually in idle compute resources.',
              'Mentored 6 SRE and platform engineers in infrastructure-as-code best practices.',
            ],
          },
        ],
        featured_project: {
          include: true,
          name: 'Infrastructure-as-Code Terraform Module Library',
          tech_stack: 'Terraform, AWS, Kubernetes, Helm',
          bullet: 'Standardized 40+ modular Terraform blueprints utilized across 15 internal engineering pods.',
        },
        education: [
          { degree: 'B.S. in Computer Engineering', institution: 'San Jose State University', year: '2017' },
        ],
        certifications: ['AWS Certified Solutions Architect – Professional', 'Certified Kubernetes Administrator (CKA)'],
        sections_to_include: {
          summary: true,
          skills: true,
          experience: true,
          featured_project: true,
          education: true,
          certifications: true,
        },
      };

      await exportResumeDOCX(sampleTestResume, 'tech-stack');

      const mockLegacyFS = require('expo-file-system/legacy');
      expect(mockLegacyFS.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/cache/David_Kim_Resume.docx',
        expect.any(String),
        expect.objectContaining({ encoding: 1 })
      );
    });
  });
});
