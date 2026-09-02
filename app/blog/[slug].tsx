import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { getBlogPostBySlug } from '../../src/data/blog-posts';

export default function BlogPostScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const post = getBlogPostBySlug(slug ?? '');

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(false);

    fetch(`/blog/${slug}.md`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then((text) => {
        // Strip YAML frontmatter (---...---)
        const cleaned = text.replace(/^---[\s\S]*?---\s*/, '');
        setMarkdown(cleaned);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  const markdownStyles = {
    body: {
      color: colors.textBody,
      fontSize: 16,
      lineHeight: 26,
      fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    },
    heading1: {
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: '800' as const,
      lineHeight: 34,
      marginTop: 24,
      marginBottom: 12,
    },
    heading2: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 30,
      marginTop: 28,
      marginBottom: 10,
    },
    heading3: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
      marginTop: 20,
      marginBottom: 8,
    },
    paragraph: {
      color: colors.textBody,
      fontSize: 16,
      lineHeight: 26,
      marginBottom: 14,
    },
    link: {
      color: colors.primary,
    },
    strong: {
      color: colors.textPrimary,
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    bullet_list: {
      marginBottom: 14,
    },
    ordered_list: {
      marginBottom: 14,
    },
    list_item: {
      color: colors.textBody,
      fontSize: 16,
      lineHeight: 26,
      marginBottom: 6,
    },
    blockquote: {
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingLeft: Spacing.md,
      marginLeft: 0,
      marginVertical: 12,
      backgroundColor: `${colors.primary}08`,
      paddingVertical: 12,
      paddingRight: 12,
      borderRadius: Radius.sm,
    },
    code_inline: {
      backgroundColor: `${colors.textPrimary}10`,
      color: colors.textPrimary,
      paddingHorizontal: Spacing.xs,
      borderRadius: Radius.sm,
      fontFamily: Platform.OS === 'web' ? 'Courier, monospace' : undefined,
    },
    hr: {
      borderColor: colors.border,
      marginVertical: 24,
    },
  };

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.md,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            style={[styles.backButton, { backgroundColor: `${colors.primary}15` }]}
            onPress={() => router.replace('/blog' as any)}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Blog</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="document-text-outline" size={48} color={colors.textDisabled} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Post not found</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
            The blog post you're looking for doesn't exist.
          </Text>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/blog' as any)}
          >
            <Text style={[styles.backBtnText, { color: colors.textInverse }]}>Back to Blog</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[styles.backButton, { backgroundColor: `${colors.primary}15` }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/blog' as any)}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Blog</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* Cover Image */}
        <Image
          source={{ uri: post.coverImage }}
          style={styles.coverImage}
          contentFit="cover"
          transition={300}
        />

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{post.date}</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tags}>
          {post.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: `${colors.primary}12` }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Markdown Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
              Failed to load blog post content.
            </Text>
          </View>
        ) : (
          <Markdown style={markdownStyles}>{markdown}</Markdown>
        )}

        {/* CTA */}
        <View style={[styles.ctaCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>
            Ready to put this into practice?
          </Text>
          <Text style={[styles.ctaDescription, { color: colors.textBody }]}>
            Interview Ready helps you practice mock interviews, tailor your resume, and prepare with
            AI-powered coaching.
          </Text>
          <Pressable
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Text style={[styles.ctaButtonText, { color: colors.textInverse }]}>Try Interview Ready Free</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headingMd,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    padding: Spacing.lg,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  coverImage: {
    width: '100%',
    height: 240,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  meta: {
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.bodySm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tagText: {
    ...Typography.bodySm,
    fontWeight: '600',
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.headingMd,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  backBtnText: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
  ctaCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  ctaTitle: {
    ...Typography.headingSm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  ctaDescription: {
    ...Typography.bodyMd,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  ctaButtonText: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
});
