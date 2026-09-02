import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { blogPosts } from '../src/data/blog-posts';

const NAVBAR_BG = 'rgba(255, 255, 255, 0.95)';
const NAVBAR_BORDER = '#E2E8F0';
const BRAND_COLOR = '#0F172A';
const NAV_LINK_COLOR = '#475569';
const NAV_LINK_FONT = Platform.OS === 'web' ? "'Sora', sans-serif" : undefined;

export default function BlogIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* ─── Navbar (matches landing page) ─── */}
      <View style={styles.navbar}>
        <View style={styles.navbarInner}>
          <View style={styles.navLeftGroup}>
            <Pressable
              style={styles.navBrand}
              onPress={() => router.replace('/' as any)}
            >
              <Image
                source={require('../assets/logo.png')}
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
              <Pressable style={[styles.navLinkItem, styles.navLinkActive]}>
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
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#2563EB" />
        </Pressable>
        <Text style={styles.subHeaderTitle}>Blog</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <Text style={styles.pageHeading}>Career Insights</Text>
        <Text style={styles.subheading}>
          Practical advice to help you ace interviews and advance your career.
        </Text>

        {blogPosts.map((post) => (
          <Pressable
            key={post.slug}
            style={styles.card}
            onPress={() => router.push(`/blog/${post.slug}` as any)}
          >
            <Image
              source={{ uri: post.coverImage }}
              style={styles.cardImage}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.cardBody}>
              <View style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                <Text style={styles.cardDate}>{post.date}</Text>
              </View>
              <Text style={styles.cardTitle}>{post.title}</Text>
              <Text style={styles.cardDescription} numberOfLines={3}>
                {post.description}
              </Text>
              <View style={styles.cardTags}>
                {post.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.readMore}>Read more →</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
    borderBottomColor: '#2563EB',
  },
  navLinkText: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: NAV_LINK_COLOR,
  },
  navLinkTextActive: {
    color: '#2563EB',
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
    backgroundColor: '#2563EB',
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
  pageHeading: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 28,
    fontWeight: '800',
    color: BRAND_COLOR,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subheading: {
    ...Typography.bodyMd,
    color: NAV_LINK_COLOR,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  // ─── Blog Cards ───
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: '#FFFFFF',
    ...Shadow.card,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardBody: {
    padding: Spacing.lg,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardDate: {
    ...Typography.bodySm,
    color: '#94A3B8',
  },
  cardTitle: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLOR,
    marginBottom: Spacing.sm,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  cardDescription: {
    ...Typography.bodyMd,
    color: NAV_LINK_COLOR,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
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
    fontSize: 11,
    color: '#2563EB',
  },
  readMore: {
    fontFamily: NAV_LINK_FONT,
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
});
