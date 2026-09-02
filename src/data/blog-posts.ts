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
    slug: 'resume-building-year1-interview-success',
    title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success',
    date: '2025-09-02',
    description:
      'Many African students wait until their second or third year to start thinking about their resumes. Starting in year one is a strategic move that directly improves interview performance and job-search confidence.',
    coverImage: '/blog/images/resume-building-year1.jpg',
    tags: ['resume', 'career advice', 'interview preparation', 'African students'],
  },
  {
    slug: 'informational-interviews-open-doors',
    title: 'Why Informational Interviews Open Doors a Job Application Never Will',
    date: '2025-09-02',
    description:
      'Informational interviews can open doors a job application never will. A single short chat can bring clarity about a role, forge a genuine connection, and surface opportunities you never knew existed.',
    coverImage: '/blog/images/informational-interviews.jpg',
    tags: ['informational interview', 'career advice', 'networking', 'African professionals'],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
