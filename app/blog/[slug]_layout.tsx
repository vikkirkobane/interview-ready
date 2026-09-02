import React from 'react';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import { getBlogPostBySlug } from '../../src/data/blog-posts';

const SITE_NAME = 'Interview Ready';
const DEFAULT_DESCRIPTION =
  'Accelerate your career with AI-powered mock interviews, instant resume ATS tailoring, cover letter generation, and skill roadmaps.';
const DEFAULT_IMAGE = '/icon_padded.png';

export default function BlogPostLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const post = getBlogPostBySlug(slug ?? '');

  const title = post ? `${post.title} | ${SITE_NAME}` : SITE_NAME;
  const description = post?.description ?? DEFAULT_DESCRIPTION;
  const image = post?.coverImage ?? DEFAULT_IMAGE;
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:site_name" content={SITE_NAME} />
        {url && <meta property="og:url" content={url} />}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* Article metadata */}
        {post?.date && <meta property="article:published_time" content={post.date} />}
        {post?.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Head>
      <Slot />
    </>
  );
}
