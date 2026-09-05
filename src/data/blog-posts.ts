export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  coverImage: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'questions-job-seekers-ask-before-interview',
    title: 'The Questions Job Seekers Ask Most Before an Interview and How to Answer Them',
    date: '2026-09-04',
    description:
      'The questions job seekers ask most before an interview, from "Tell me about yourself" to salary expectations, and how to answer each one with confidence.',
    coverImage: '/blog/images/questions-job-seekers-ask-before-interview.jpg',
    tags: ['interview preparation', 'career advice', 'common questions', 'African professionals'],
  },
  {
    slug: 'resume-building-year1-interview-success',
    title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success',
    date: '2025-08-15',
    description:
      'Many African students wait until their second or third year to start thinking about their resumes. Starting in year one is a strategic move that directly improves interview performance and job-search confidence.',
    coverImage: '/blog/images/resume-building-year1.jpg',
    tags: ['resume', 'career advice', 'interview preparation', 'African students'],
  },
  {
    slug: 'informational-interviews-open-doors',
    title: 'Why Informational Interviews Open Doors a Job Application Never Will',
    date: '2025-08-22',
    description:
      'Informational interviews can open doors a job application never will. A single short chat can bring clarity about a role, forge a genuine connection, and surface opportunities you never knew existed.',
    coverImage: '/blog/images/informational-interviews.jpg',
    tags: ['informational interview', 'career advice', 'networking', 'African professionals'],
  },
  {
    slug: 'get-uncomfortable-career-growth',
    title: 'Why Getting a Little Uncomfortable Is the Next Right Career Move (Even When It Feels Risky)',
    date: '2025-09-02',
    description:
      'Career risk doesn\'t have to mean blowing everything up. It can be one conversation, one application, one small experiment. Sometimes the next right move simply asks us to get a little uncomfortable.',
    coverImage: '/blog/images/get-uncomfortable-career-growth.jpg',
    tags: ['career growth', 'comfort zone', 'growth mindset', 'career advice', 'African professionals'],
  },
  {
    slug: 'choose-your-lane-specialization-growth',
    title: "Why Narrow Isn't Limited: The Career Growth Power of Choosing a Lane",
    date: '2026-09-04',
    description:
      'Being everything to everyone can quietly dilute the expertise you worked so hard to build. There is real power in choosing a lane, going deeper, and becoming known for something specific, narrow doesn\'t mean limited.',
    coverImage: '/blog/images/choose-your-lane-specialization-growth.jpg',
    tags: ['career growth', 'specialization', 'personal branding', 'African professionals'],
  },
  {
    slug: 'ai-mock-interview-practice-guide',
    title: 'AI Mock Interview: How to Practice Common Questions and Get Feedback That Actually Improves Your Answers',
    date: '2026-09-04',
    description:
      'Candidates who complete five or more realistic mock interviews convert offers at roughly 2.4x the rate of those who skip them. Here is how to use an AI mock interview the right way.',
    coverImage: '/blog/images/ai-mock-interview-practice-guide.jpg',
    tags: ['AI mock interview', 'interview practice', 'interview preparation app', 'freshers'],
  },
  {
    slug: 'free-ats-resume-checker-guide',
    title: 'Free ATS Resume Checker: Does Your Fresher Resume Pass the 6-Second Test?',
    date: '2026-09-04',
    description:
      'ATS software filters out roughly 75% of resumes before a human sees them. Learn how a free ATS resume checker can show you exactly what is wrong, and how to fix it.',
    coverImage: '/blog/images/free-ats-resume-checker-guide.jpg',
    tags: ['ATS resume checker', 'fresher resume', 'applicant tracking system', 'resume keywords'],
  },
  {
    slug: 'tell-me-about-yourself-freshers',
    title: "'Tell Me About Yourself' Answer Examples for Freshers: 3 Scripts That Actually Work",
    date: '2026-09-04',
    description:
      'The first question in almost every interview, and for freshers with no work history it can feel like a trap. Here is how to answer it with confidence, plus three scripts you can adapt.',
    coverImage: '/blog/images/tell-me-about-yourself-freshers.jpg',
    tags: ['tell me about yourself', 'interview answers', 'freshers', 'self introduction'],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
