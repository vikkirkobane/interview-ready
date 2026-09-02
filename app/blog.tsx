import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { blogPosts } from '../src/data/blog-posts';

export default function BlogIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
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
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
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
        <Text style={[styles.pageHeading, { color: colors.textPrimary }]}>Career Insights</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Practical advice to help you ace interviews and advance your career.
        </Text>

        {blogPosts.map((post) => (
          <Pressable
            key={post.slug}
            style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
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
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.cardDate, { color: colors.textMuted }]}>{post.date}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{post.title}</Text>
              <Text style={[styles.cardDescription, { color: colors.textBody }]} numberOfLines={3}>
                {post.description}
              </Text>
              <View style={styles.cardTags}>
                {post.tags.slice(0, 3).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: `${colors.primary}12` }]}
                  >
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.readMore, { color: colors.primary }]}>Read more →</Text>
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
  pageHeading: {
    ...Typography.headingLg,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  subheading: {
    ...Typography.bodyMd,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
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
  },
  cardTitle: {
    ...Typography.headingMd,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  cardDescription: {
    ...Typography.bodyMd,
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
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tagText: {
    ...Typography.bodySm,
    fontWeight: '600',
    fontSize: 11,
  },
  readMore: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
});
