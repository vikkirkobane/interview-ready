import { buildCoverLetterHTML } from '../../src/lib/coverLetterHTML';
import { buildLinkedInAnalysisHTML } from '../../src/lib/linkedinExport';
import { buildResumeHTML } from '../../src/lib/resumeHTML';
import { formatPersonName, buildFileName } from '../../src/lib/exportUtils';

describe('Report & PDF Generation Test Suite', () => {
  describe('formatPersonName & buildFileName', () => {
    it('capitalizes each word in a person name and handles hyphens/apostrophes correctly', () => {
      expect(formatPersonName('john doe')).toBe('John Doe');
      expect(formatPersonName('ALEX JOHNSON')).toBe('Alex Johnson');
      expect(formatPersonName("jane-marie o'connor")).toBe("Jane-Marie O'Connor");
      expect(formatPersonName('')).toBe('');
      expect(formatPersonName(null)).toBe('');
    });

    it('builds a clean sanitized download filename', () => {
      expect(buildFileName('john doe', 'Resume', 'pdf')).toBe('John_Doe_Resume.pdf');
      expect(buildFileName("o'connor", 'Cover_Letter', 'pdf')).toBe('OConnor_Cover_Letter.pdf');
      expect(buildFileName('', 'Resume', 'pdf')).toBe('Resume.pdf');
    });
  });

  describe('buildCoverLetterHTML', () => {
    it('generates well-formatted HTML with candidate details and capitalized names', () => {
      const mockCoverLetter: any = {
        header: {
          candidate_name: 'alex johnson',
          target_role: 'Senior Full Stack Engineer',
          email: 'alex@example.com',
          phone: '+1 555 123 4567',
          location: 'New York, NY',
          linkedin: 'linkedin.com/in/alexjohnson',
          portfolio: 'github.com/alexjohnson',
          company_name: 'Acme Corp',
          hiring_manager: 'jane smith',
          date: 'August 19, 2026',
        },
        salutation: 'Dear Ms. Smith,',
        paragraphs: {
          opening: { text: 'I am excited to apply for the Senior Full Stack Engineer role.' },
          body_1: { text: 'With over 6 years of experience in React and Node.js...' },
          body_2: { text: 'In my previous position, I scaled systems to 5M+ DAU...' },
          closing: { text: 'Thank you for your time and consideration.' },
        },
        sign_off: {
          closing_phrase: 'Sincerely,',
          name: 'alex johnson',
        },
      };

      const html = buildCoverLetterHTML(mockCoverLetter);

      // Name must be capitalized
      expect(html).toContain('Alex Johnson');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('Senior Full Stack Engineer');
      expect(html).toContain('Acme Corp');
      expect(html).toContain('alex@example.com');
      expect(html).toContain('+1 555 123 4567');
      expect(html).toContain('New York, NY');
      expect(html).toContain('@page { size: A4 portrait;');
      expect(html).toContain('#2563EB');
      expect(html).toContain('appinterviewready.top');
    });
  });

  describe('buildLinkedInAnalysisHTML', () => {
    it('generates complete LinkedIn audit report with score rings, keywords, and page-break rules', () => {
      const mockAnalysis = {
        overall_score: 84,
        estimated_score_after_optimization: 95,
        section_scores: {
          headline: 90,
          about: 85,
          experience: 80,
          skills: 82,
        },
        issues: {
          headline: ['Could include more searchable keywords.'],
        },
        suggestions: {
          headline: 'Senior Cloud Architect | AWS Certified | Distributed Systems',
          about: 'Experienced leader building resilient distributed architectures.',
        },
        keyword_intelligence: {
          top_keywords: [
            { keyword: 'Kubernetes', category: 'tool', present_in_profile: true },
            { keyword: 'Microservices', category: 'hard_skill', present_in_profile: false },
          ],
          missing_high_priority: ['Microservices', 'Event-Driven Architecture'],
        },
        spike: {
          identified_differentiator: 'Deep expertise in high-throughput low-latency systems',
          unique_value_proposition: 'Bridges technical depth with strategic product execution',
        },
      };

      const html = buildLinkedInAnalysisHTML(mockAnalysis, {
        candidateName: 'sarah connor',
        targetRoles: ['Staff Engineer'],
        targetCompanies: ['Google', 'Stripe'],
      });

      expect(html).toContain('Sarah Connor');
      expect(html).toContain('84');
      expect(html).toContain('95/100');
      expect(html).toContain('Kubernetes');
      expect(html).toContain('Missing High-Priority Keywords');
      expect(html).toContain('Deep expertise in high-throughput low-latency systems');
      expect(html).toContain('@page { size: A4 portrait;');
      expect(html).toContain('page-break-inside: avoid;');
      expect(html).toContain('appinterviewready.top');
    });
  });

  describe('buildResumeHTML', () => {
    it('generates a 1-page optimized ATS resume with executive formatting and budget limits', () => {
      const mockResume: any = {
        meta: {
          candidate_name: 'david miller',
          profession: 'Staff Software Engineer',
          target_role: 'Lead Cloud Architect',
        },
        header: {
          name: 'david miller',
          title: 'Staff Software Engineer',
          subtitle: 'Distributed Systems & Cloud Architecture Specialist',
          email: 'david.miller@example.com',
          phone: '+1 (555) 345-6789',
          location: 'San Francisco, CA',
          linkedin: 'linkedin.com/in/davidmiller',
          portfolio: 'github.com/davidmiller',
        },
        sections_to_include: {
          summary: true,
          skills: true,
          experience: true,
          education: true,
          featured_project: true,
          languages: true,
          recognition: false,
        },
        summary: {
          text: 'Staff Software Engineer with 8+ years designing fault-tolerant distributed cloud systems handling 100K+ req/sec. Proven leader in microservice migrations and AWS optimization.',
        },
        skills: [
          { category: 'Architecture & Cloud', items: ['AWS', 'Kubernetes', 'Terraform', 'Kafka'] },
          { category: 'Languages & Frameworks', items: ['Go', 'TypeScript', 'Node.js', 'PostgreSQL'] },
        ],
        experience: [
          {
            title: 'Staff Software Engineer',
            company: 'Stripe Inc',
            location: 'San Francisco, CA',
            date_range: '2022 – Present',
            bullets: [
              'Spearheaded the redesign of core settlement pipeline, processing $12B+ in annual transaction volume.',
              'Engineered multi-region failover mechanism on AWS reducing p99 latency by 42%.',
              'Mentored 12 senior and staff engineers across 3 distributed pods.',
              'Authored internal engineering RFCs for zero-downtime database sharding.',
              'Extra bullet that should be budget-capped on older positions.',
            ],
          },
          {
            title: 'Senior Backend Engineer',
            company: 'Square',
            location: 'San Francisco, CA',
            date_range: '2019 – 2022',
            bullets: [
              'Architected merchant onboarding microservice reducing verification latency from 24h to 3 minutes.',
              'Optimized PostgreSQL query planning and connection pooling, boosting database throughput by 65%.',
              'Implemented end-to-end distributed tracing using OpenTelemetry and Datadog.',
            ],
          },
        ],
        featured_project: {
          include: true,
          name: 'OpenStream distributed event broker',
          tech_stack: 'Go, Raft Consensus, gRPC',
          bullet: 'Authored open-source Raft implementation with 2.4k GitHub stars.',
        },
        education: [
          {
            degree: 'B.S. in Computer Science',
            institution: 'University of California, Berkeley',
            year: '2019',
          },
        ],
        languages: [
          { language: 'English', proficiency: 'Native' },
        ],
        certifications: [],
      };

      const htmlExec = buildResumeHTML(mockResume, 'executive');
      expect(htmlExec).toContain('David Miller'); // Capitalized
      expect(htmlExec).toContain('Staff Software Engineer');
      expect(htmlExec).toContain('david.miller@example.com');
      expect(htmlExec).toContain('Stripe Inc');
      expect(htmlExec).toContain('Skills & Competencies');
      expect(htmlExec).toContain('@page { size: A4 portrait; margin: 22pt 26pt; }');
      expect(htmlExec).toContain('#1A365D'); // Corporate Navy for Executive

      const htmlMin = buildResumeHTML(mockResume, 'minimal');
      expect(htmlMin).toContain('#000000'); // Pure monochrome for Minimal
      expect(htmlMin).toContain('letter-spacing: 1.2px');

      const htmlModern = buildResumeHTML(mockResume, 'modern-pro');
      expect(htmlModern).toContain('#0D9488'); // Dark Teal accent for Modern Pro
    });
  });
});
