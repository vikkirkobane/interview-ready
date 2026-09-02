import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { getBlogPostBySlug, blogPosts } from '../../src/data/blog-posts';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

/** Tell Expo Router which slugs to pre-render for static export */
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

const NAVBAR_BG = 'rgba(255, 255, 255, 0.95)';
const NAVBAR_BORDER = '#E2E8F0';
const BRAND_COLOR = '#0F172A';
const NAV_LINK_COLOR = '#475569';
const NAV_LINK_FONT = Platform.OS === 'web' ? "'Sora', sans-serif" : undefined;
const BODY_COLOR = '#334155';
const MUTED_COLOR = '#94A3B8';
const ACCENT = '#2563EB';

export default function BlogPostScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();

  const post = getBlogPostBySlug(slug ?? '');
  const [content, setContent] = useState({ markdown: '', loading: true, error: false });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/blog/${slug}.md`);
        if (!res.ok) throw new Error('Not found');
        const text = await res.text();
        const cleaned = text.replace(/^---[\s\S]*?---\s*/, '');
        if (!cancelled) setContent({ markdown: cleaned, loading: false, error: false });
      } catch {
        if (!cancelled) setContent({ markdown: '', loading: false, error: true });
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const markdown = content.markdown;
  const loading = content.loading;
  const error = content.error;

  const currentUrl = Platform.OS === 'web' ? window.location.href : '';
  const shareTitle = post?.title ?? '';

  const markdownStyles = {
    body: {
      color: BODY_COLOR,
      fontSize: 17,
      lineHeight: 28,
      fontFamily: Platform.OS === 'web' ? "'Inter', system-ui, sans-serif" : undefined,
    },
    heading1: {
      color: BRAND_COLOR,
      fontSize: 28,
      fontWeight: '800' as const,
      lineHeight: 36,
      marginTop: 32,
      marginBottom: 16,
      fontFamily: NAV_LINK_FONT,
      letterSpacing: -0.5,
    },
    heading2: {
      color: BRAND_COLOR,
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 30,
      marginTop: 32,
      marginBottom: 12,
      fontFamily: NAV_LINK_FONT,
      letterSpacing: -0.3,
    },
    heading3: {
      color: BRAND_COLOR,
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
      marginTop: 24,
      marginBottom: 10,
      fontFamily: NAV_LINK_FONT,
    },
    paragraph: {
      color: BODY_COLOR,
      fontSize: 17,
      lineHeight: 28,
      marginBottom: 16,
    },
    link: {
      color: ACCENT,
    },
    strong: {
      color: BRAND_COLOR,
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    bullet_list: {
      marginBottom: 16,
    },
    ordered_list: {
      marginBottom: 16,
    },
    list_item: {
      color: BODY_COLOR,
      fontSize: 17,
      lineHeight: 28,
      marginBottom: 8,
    },
    blockquote: {
      borderLeftColor: ACCENT,
      borderLeftWidth: 3,
      paddingLeft: Spacing.md,
      marginLeft: 0,
      marginVertical: 16,
      backgroundColor: '#F8FAFC',
      paddingVertical: 14,
      paddingRight: 14,
      borderRadius: Radius.sm,
    },
    code_inline: {
      backgroundColor: '#F1F5F9',
      color: BRAND_COLOR,
      paddingHorizontal: Spacing.xs,
      borderRadius: Radius.sm,
      fontFamily: Platform.OS === 'web' ? "'Courier', monospace" : undefined,
    },
    hr: {
      borderColor: NAVBAR_BORDER,
      marginVertical: 28,
    },
  };

  // ─── Not found state ───
  if (!post) {
    return (
      <View style={styles.container}>
        <Navbar router={router} />
        <View style={styles.centerContent}>
          <Ionicons name="document-text-outline" size={48} color={MUTED_COLOR} />
          <Text style={styles.errorTitle}>Post not found</Text>
          <Text style={styles.errorSubtitle}>
            This blog post could not be found.
          </Text>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/blog' as any)}
          >
            <Text style={styles.backBtnText}>Back to Blog</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── Navbar (matches landing page) ─── */}
      <Navbar router={router} />

      {/* ─── Sub-header with back + title ─── */}
      <View
        style={[
          styles.subHeader,
          {
            paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.md,
            borderBottomColor: NAVBAR_BORDER,
          },
        ]}
      >
        <Pressable
          style={[styles.backButton, { backgroundColor: '#EFF6FF' }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/blog' as any)}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={ACCENT} />
        </Pressable>
        <Text style={styles.subHeaderTitle}>Blog</Text>
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

        {/* ─── CTA at the top ─── */}
        <Pressable style={styles.topCta} onPress={() => router.push('/(tabs)' as any)}>
          <Ionicons name="play-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.topCtaText}>Try Interview Ready Free</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={MUTED_COLOR} />
            <Text style={styles.metaText}>{post.date}</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tags}>
          {post.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Share */}
        <View style={styles.shareSection}>
          <Text style={styles.shareLabel}>Share this article</Text>
          <View style={styles.shareButtons}>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: '#1DA1F2' }]}
              onPress={() =>
                Platform.OS === 'web'
                  ? window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(currentUrl)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  : null
              }
              accessibilityLabel="Share on Twitter"
            >
              <Ionicons name="logo-twitter" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: '#1877F2' }]}
              onPress={() =>
                Platform.OS === 'web'
                  ? window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  : null
              }
              accessibilityLabel="Share on Facebook"
            >
              <Ionicons name="logo-facebook" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: '#0A66C2' }]}
              onPress={() =>
                Platform.OS === 'web'
                  ? window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  : null
              }
              accessibilityLabel="Share on LinkedIn"
            >
              <Ionicons name="logo-linkedin" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: '#25D366' }]}
              onPress={() =>
                Platform.OS === 'web'
                  ? window.open(
                      `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} ${currentUrl}`)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  : null
              }
              accessibilityLabel="Share on WhatsApp"
            >
              <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: ACCENT }]}
              onPress={async () => {
                if (Platform.OS === 'web') {
                  await Clipboard.setStringAsync(currentUrl);
                  Toast.show({ type: 'success', text1: 'Link copied', text2: 'Blog post URL copied to clipboard' });
                }
              }}
              accessibilityLabel="Copy link"
            >
              <Ionicons name="link-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Markdown Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorSubtitle}>
              Failed to load blog post content.
            </Text>
          </View>
        ) : (
          <Markdown style={markdownStyles}>{markdown}</Markdown>
        )}

        {/* ─── CTA at the bottom ─── */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>
            Ready to put this into practice?
          </Text>
          <Text style={styles.ctaDescription}>
            Interview Ready helps you practice mock interviews, tailor your resume, and prepare with
            AI-powered coaching.
          </Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Text style={styles.ctaButtonText}>Try Interview Ready Free</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Shared Navbar Component ─── */
function Navbar({ router }: { router: any }) {
  return (
    <View style={styles.navbar}>
      <View style={styles.navbarInner}>
        <View style={styles.navLeftGroup}>
          <Pressable style={styles.navBrand} onPress={() => router.replace('/' as any)}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.navLogo}
              contentFit="contain"
            />
            <Text style={styles.brandText} numberOfLines={1}>
              Interview Ready
            </Text>
          </Pressable>

          <View style={styles.navLinks}>
            <Pressable onPress={() => router.replace('/' as any)} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>Features</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/' as any)} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>How It Works</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/' as any)} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>Recruiter Tested</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/' as any)} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>FAQ</Text>
            </Pressable>
            <Pressable
              style={[styles.navLinkItem, styles.navLinkActive]}
              onPress={() => router.push('/blog' as any)}
            >
              <Text style={[styles.navLinkText, styles.navLinkTextActive]}>Blog</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.navRight}>
          <Pressable style={styles.navSecondaryBtn} onPress={() => router.replace('/' as any)}>
            <Text style={styles.navSecondaryBtnText}>Sign In</Text>
          </Pressable>
          <Pressable
            style={styles.navPrimaryBtn}
            onPress={() => router.replace('/' as any)}
          >
            <Text style={styles.navPrimaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ─── Navbar (exact match to landing page) ───
  navbar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 50,
    width: '100%',
    backgroundColor: NAVBAR_BG,
    borderBottomWidth: 1,
    borderBottomColor: NAVBAR_BORDER,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  },
  navbarInner: {
    maxWidth: 1120,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  navLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    flexShrink: 1,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  navLogo: {
    width: 30,
    height: 30,
    flexShrink: 0,
  },
  brandText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 18,
    fontWeight: '800',
    color: BRAND_COLOR,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLinkItem: {
    paddingVertical: 6,
  },
  navLinkActive: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  navLinkText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: NAV_LINK_COLOR,
  },
  navLinkTextActive: {
    color: ACCENT,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  navSecondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navSecondaryBtnText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: NAV_LINK_COLOR,
  },
  navPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    backgroundColor: ACCENT,
    borderRadius: Radius.full,
  },
  navPrimaryBtnText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Sub-header ───
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
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
  subHeaderTitle: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_COLOR,
  },
  headerSpacer: {
    width: 36,
  },

  // ─── Content ───
  content: {
    padding: 24,
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

  // ─── Top CTA ───
  topCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
  },
  topCtaText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Meta ───
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
    color: MUTED_COLOR,
  },

  // ─── Tags ───
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: '#EFF6FF',
  },
  tagText: {
    ...Typography.bodySm,
    fontWeight: '600',
    fontSize: 12,
    color: ACCENT,
  },

  // ─── Share ───
  shareSection: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: NAVBAR_BORDER,
  },
  shareLabel: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: MUTED_COLOR,
    marginBottom: Spacing.sm,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── States ───
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
    fontFamily: NAV_LINK_FONT,
    fontSize: 22,
    fontWeight: '700',
    color: BRAND_COLOR,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...Typography.bodyMd,
    color: MUTED_COLOR,
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: ACCENT,
  },
  backBtnText: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Bottom CTA Card ───
  ctaCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NAVBAR_BORDER,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    ...Shadow.card,
  },
  ctaTitle: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLOR,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  ctaDescription: {
    ...Typography.bodyMd,
    color: NAV_LINK_COLOR,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: ACCENT,
  },
  ctaButtonText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
