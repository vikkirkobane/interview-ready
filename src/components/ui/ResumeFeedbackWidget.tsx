import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

interface ResumeFeedbackWidgetProps {
  resumeId?: string | null;
  templateId?: string | null;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

const FEEDBACK_TAGS = [
  'Too short',
  'Missing details',
  'Formatting',
  'Not tailored to job',
  'Other',
];

export function ResumeFeedbackWidget({
  resumeId,
  templateId,
  onDismiss,
  style,
}: ResumeFeedbackWidgetProps) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const saveFeedback = async (
    targetRating: 1 | -1,
    tags: string[] = [],
    feedbackNote: string = ''
  ) => {
    if (!user || !resumeId) {
      // Offline / guest preview or unsaved resume: still acknowledge smoothly
      setSubmitted(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await supabase.from('resume_feedback').upsert(
        {
          resume_id: resumeId,
          user_id: user.id,
          rating: targetRating,
          feedback_tags: tags,
          feedback_note: feedbackNote.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'resume_id' }
      );
      setSubmitted(true);
    } catch (err) {
      console.warn('[ResumeFeedbackWidget] Failed to record feedback:', err);
      setSubmitted(true); // Don't block UI on feedback error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbsUp = async () => {
    setRating(1);
    await saveFeedback(1);
  };

  const handleThumbsDown = () => {
    setRating(-1);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitNegative = async () => {
    await saveFeedback(-1, selectedTags, note);
  };

  const handleClose = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        },
        style,
      ]}
      accessibilityLabel="Resume generation feedback"
    >
      {/* Dismiss button */}
      <Pressable
        style={styles.closeBtn}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss feedback"
        hitSlop={8}
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>

      {submitted ? (
        <View style={styles.submittedContainer}>
          <Ionicons
            name={rating === 1 ? 'checkmark-circle' : 'heart'}
            size={22}
            color={rating === 1 ? colors.success || '#10B981' : colors.primary}
            style={{ marginRight: 8 }}
          />
          <View style={styles.submittedTextContainer}>
            <Text style={[styles.submittedTitle, { color: colors.textPrimary }]}>
              {rating === 1 ? 'Glad you like it!' : 'Thank you for your feedback!'}
            </Text>
            <Text style={[styles.submittedSubtitle, { color: colors.textSecondary }]}>
              {rating === 1
                ? 'Your feedback helps optimize future outputs.'
                : "We're using this to improve our resume generation models."}
            </Text>
          </View>
        </View>
      ) : rating === -1 ? (
        /* Expanded negative feedback form */
        <View style={styles.negativeForm}>
          <View style={styles.negativeHeader}>
            <Ionicons name="thumbs-down" size={18} color={colors.error || '#EF4444'} style={{ marginRight: 6 }} />
            <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>
              What could be improved?
            </Text>
          </View>

          {/* Quick select tags */}
          <View style={styles.tagsContainer}>
            {FEEDBACK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isSelected ? `${colors.primary}18` : colors.bgMuted,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={tag}
                >
                  <Text
                    style={[
                      styles.tagText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Optional Note input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgPrimary,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Additional details (optional)..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            maxLength={300}
            multiline
            numberOfLines={2}
          />

          {/* Submit button */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmitNegative}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit feedback"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Feedback</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        /* Default minimal prompt row */
        <View style={styles.promptRow}>
          <View style={styles.promptTextContainer}>
            <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>
              How does this resume look?
            </Text>
            <Text style={[styles.promptSubtitle, { color: colors.textMuted }]}>
              Help us refine formatting and career quality
            </Text>
          </View>

          <View style={styles.buttonsGroup}>
            <Pressable
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.bgMuted,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleThumbsUp}
              accessibilityRole="button"
              accessibilityLabel="Looks good"
              hitSlop={6}
            >
              <Ionicons name="thumbs-up-outline" size={17} color={colors.textPrimary} />
            </Pressable>

            <Pressable
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.bgMuted,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleThumbsDown}
              accessibilityRole="button"
              accessibilityLabel="Needs improvement"
              hitSlop={6}
            >
              <Ionicons name="thumbs-down-outline" size={17} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    ...Shadow.sm,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 2,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  promptTextContainer: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  promptSubtitle: {
    fontSize: 11,
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingRight: 24,
  },
  submittedTextContainer: {
    flex: 1,
  },
  submittedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  submittedSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  negativeForm: {
    paddingRight: 16,
  },
  negativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: Spacing.xs,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
  },
  input: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginTop: 6,
    minHeight: 46,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  submitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
