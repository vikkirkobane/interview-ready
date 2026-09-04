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
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
