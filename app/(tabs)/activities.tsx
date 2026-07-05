import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { useRecentActivitiesQuery } from '../../src/hooks/useApi';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AllActivitiesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: recentActivities, isLoading } = useRecentActivitiesQuery();

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>All Recent Activity</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Your complete history of resumes, cover letters, job matches, and interviews.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : recentActivities && recentActivities.length > 0 ? (
          <View style={styles.list}>
            {recentActivities.map((activity, i) => {
              const handlePress = () => {
                if (activity.type === 'resume') router.push(`/(tabs)/new-resume?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'cover_letter') router.push(`/(tabs)/cover-letter?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'job_match') router.push(`/(tabs)/job-match-results?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'interview') router.push(`/(tabs)/feedback?id=${activity.id}&fromList=true` as any);
              };

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.item, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={handlePress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${activity.color}15` }]}>
                    <Ionicons name={activity.icon as any} size={20} color={activity.color} />
                  </View>
                  <View style={styles.content}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{activity.title}</Text>
                    <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                      {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activities found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: Spacing.lg,
    paddingBottom: 120,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.displayMd,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodyMd,
  },
  list: {
    gap: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.headingMd,
  },
  itemDate: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  emptyText: {
    ...Typography.bodyMd,
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontStyle: 'italic',
  },
});
