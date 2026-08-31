
import React, { useState } from "react";
import { Pressable, View, Text, StyleSheet, ScrollView, Dimensions, Modal, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { Typography, Spacing, Radius, Shadow, useTheme } from "../../src/theme";
import { ScoreRing } from "../../src/components/ui";
import { useAuthStore } from "../../src/stores/auth-store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useJobApplicationsListQuery, useCreateJobApplicationMutation, useUpdateJobApplicationStatusMutation, useDeleteJobApplicationMutation } from "../../src/hooks/useApi";
import { getUserFriendlyErrorMessage } from "../../src/lib/errorHandler";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TrackerScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  const router = useRouter();

  const { data: appsData, isLoading } = useJobApplicationsListQuery();
  const createJob = useCreateJobApplicationMutation();
  const updateStatus = useUpdateJobApplicationStatusMutation();
  const deleteMutation = useDeleteJobApplicationMutation();

  const applications = appsData || [];

  const COLUMNS = [
    { id: "SAVED", title: "Saved", color: colors.border },
    { id: "APPLIED", title: "Applied", color: colors.primary },
    { id: "SCREENING", title: "Screening", color: colors.warning },
    { id: "INTERVIEW", title: "Interview", color: colors.tertiary || "#4d30d7" },
    { id: "OFFER", title: "Offer", color: colors.success },
  ];

  // Modals state
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", company: "", jd: "" });

  const [selectedApp, setSelectedApp] = useState<any>(null);

  const handleAddNew = async () => {
    if (!newJob.title || !newJob.company || !newJob.jd) return;
    await createJob.mutateAsync({
      job_title: newJob.title,
      company: newJob.company,
      raw_jd: newJob.jd,
    });
    setIsAddModalVisible(false);
    setNewJob({ title: "", company: "", jd: "" });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedApp) return;
    await updateStatus.mutateAsync({ id: selectedApp.id, status: newStatus });
    setSelectedApp({ ...selectedApp, status: newStatus });
  };

  const handleDelete = () => {
    if (!selectedApp) return;
    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job application? This will also delete any associated job match analysis.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(selectedApp.id);
              setSelectedApp(null);
            } catch (e: any) {
              Alert.alert('Error', getUserFriendlyErrorMessage(e.message, 'Failed to delete job application.'));
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const renderCard = (app: any, color: string) => {
    const isOffer = app.status === "OFFER";
    const dateColor = isOffer ? colors.success : colors.textMuted;
    
    return (
      <Pressable 
        key={app.id} 
        style={[
          styles.card, 
          { backgroundColor: colors.bgPrimary, borderColor: colors.border, boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.1)" }
        ]}
        
        onPress={() => setSelectedApp(app)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardRole, { color: isOffer ? colors.success : colors.textPrimary }]}>{app.job_title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <View style={[styles.statusDot, { backgroundColor: color, marginRight: 6 }]} />
              <Text style={[styles.cardCompany, { color: colors.textMuted, marginTop: 0 }]}>{app.company} {app.location ? ` ${app.location}` : ""}</Text>
            </View>
          </View>
          
          <View style={styles.scoreWrapper}>
             <ScoreRing score={app.ats_score || app.match_score || 0} size="sm" color={isOffer ? colors.success : colors.primary} animate={false} />
          </View>
        </View>

        <View style={[styles.cardBottom, { borderTopColor: colors.border }, isOffer && { borderTopColor: `${colors.success}33` }]}>
          <View style={styles.iconRow}>
            {app.is_remote && (
               <View style={{ marginRight: 6 }}>
                  <Ionicons name="location-outline" size={14} color={isOffer ? colors.success : colors.textMuted} />
               </View>
            )}
          </View>
          <Text style={[styles.cardDate, { color: dateColor, fontWeight: isOffer ? "700" : "500" }]}>
            {formatDate(app.updated_at)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* Details Modal */}
      <Modal visible={!!selectedApp} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Job Details</Text>
              <Pressable onPress={() => setSelectedApp(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            
            {selectedApp && (
              <ScrollView style={{ marginTop: Spacing.md }}>
                <Text style={[Typography.displayMd, { color: colors.textPrimary }]}>{selectedApp.job_title}</Text>
                <Text style={[Typography.bodyLg, { color: colors.textMuted, marginBottom: Spacing.xl }]}>{selectedApp.company} {selectedApp.location ? ` ${selectedApp.location}` : ""}</Text>

                <Text style={[Typography.headingMd, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
                  {COLUMNS.map(col => (
                    <Pressable
                      key={col.id}
                      style={[
                        styles.statusBtn,
                        { borderColor: selectedApp.status === col.id ? col.color : colors.border },
                        selectedApp.status === col.id && { backgroundColor: `${col.color}1A` }
                      ]}
                      onPress={() => handleStatusChange(col.id)}
                    >
                      <Text style={{ color: selectedApp.status === col.id ? col.color : colors.textMuted, fontWeight: "600" }}>
                        {col.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[Typography.headingMd, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>ATS Score</Text>
                {selectedApp.ats_score || selectedApp.match_score ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl }}>
                    <ScoreRing score={selectedApp.ats_score || selectedApp.match_score} size="md" color={colors.primary} animate={true} />
                    <Text style={[Typography.bodyMd, { color: colors.textPrimary, marginLeft: Spacing.md }]}>Analysis Completed</Text>
                  </View>
                ) : (
                  <View style={{ marginBottom: Spacing.xl }}>
                    <Text style={[Typography.bodyMd, { color: colors.textMuted, marginBottom: Spacing.md }]}>No ATS score or analysis found for this job.</Text>
                    <Pressable 
                      style={[styles.primaryBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                      onPress={() => {
                        setSelectedApp(null);
                        router.push(`/job-analyzer?job_id=${selectedApp.id}`);
                      }}
                    >
                      <MaterialCommunityIcons name="star-four-points" size={20} color={colors.textInverse} />
                      <Text style={[styles.primaryBtnText, { color: colors.textInverse, fontWeight: '600' }]}>Analyze Job Match</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={[Typography.headingMd, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>Job Description</Text>
                <View style={[styles.jdBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border, marginBottom: Spacing.xl }]}>
                  <Text style={[Typography.bodyMd, { color: colors.textBody }]} numberOfLines={10}>
                    {selectedApp.raw_jd || "No job description provided."}
                  </Text>
                </View>

                <Text style={[Typography.headingMd, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>Quick Actions</Text>
                <View style={{ flexDirection: 'column', gap: Spacing.md, paddingBottom: Spacing.xxl }}>
                  <Pressable 
                    style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => {
                      setSelectedApp(null);
                      router.push({
                        pathname: '/interviews',
                        params: { 
                          role: selectedApp.job_title, 
                          jobDescription: selectedApp.raw_jd || '' 
                        }
                      });
                    }}
                  >
                    <Ionicons name="chatbubbles-outline" size={20} color={colors.textPrimary} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>Practice Mock Interview</Text>
                  </Pressable>

                  <Pressable 
                    style={{ backgroundColor: colors.bgSecondary, borderColor: colors.error, borderWidth: 1, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                    onPress={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Delete Job</Text>
                      </>
                    )}
                  </Pressable>
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add New Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Job</Text>
              <Pressable onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Job Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Senior Product Designer"
                placeholderTextColor={colors.textMuted}
                value={newJob.title}
                onChangeText={t => setNewJob({...newJob, title: t})}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>Company</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Stripe"
                placeholderTextColor={colors.textMuted}
                value={newJob.company}
                onChangeText={t => setNewJob({...newJob, company: t})}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>Job Description</Text>
              <TextInput
                style={[styles.inputArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Paste the full job description here..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                value={newJob.jd}
                onChangeText={t => setNewJob({...newJob, jd: t})}
              />

              <Pressable 
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.xl, opacity: createJob.isPending ? 0.7 : 1 }]}
                onPress={handleAddNew}
                disabled={createJob.isPending}
              >
                {createJob.isPending ? (
                   <ActivityIndicator color={colors.textInverse} />
                ) : (
                   <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Save Job</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.mainContent}>
        {/* Header Info */}
        <View style={styles.pageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
            <Pressable 
              style={[styles.backBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]} 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Application Tracker</Text>
          </View>
          <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setIsAddModalVisible(true)}>
            <Ionicons name="add" size={16} color={colors.textInverse} />
            <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add New</Text>
          </Pressable>
        </View>

        {isLoading ? (
           <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
             <ActivityIndicator size="large" color={colors.primary} />
           </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.kanbanScroll}
          >
            {COLUMNS.map(column => {
              const columnApps = applications.filter((app: any) => app.status === column.id);
              return (
                <View key={column.id} style={styles.kanbanColumn}>
                  
                  {/* Column Header */}
                  <View style={styles.columnHeader}>
                    <View style={styles.columnHeaderLeft}>
                      <View style={[styles.statusDot, { backgroundColor: column.color }]} />
                      <Text style={[styles.columnTitle, { color: colors.textPrimary }]}>{column.title}</Text>
                      <View style={[styles.countBadge, { backgroundColor: colors.bgMuted }]}>
                        <Text style={[styles.countText, { color: colors.textBody }]}>{columnApps.length}</Text>
                      </View>
                    </View>
                    <Pressable>
                       <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  {/* Column Cards */}
                  <ScrollView showsVerticalScrollIndicator={Platform.OS === 'web'} contentContainerStyle={styles.columnCardsList}>
                    {columnApps.map((app: any) => renderCard(app, column.color))}
                  </ScrollView>

                </View>
              );
            })}
          </ScrollView>
        )}
        <View style={{ height: bottomNavPadding }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mainContent: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pageTitle: {
    ...Typography.displayMd,
    flexShrink: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: 6,
    flexShrink: 0,
  },
  addButtonText: {
    ...Typography.headingMd,
  },
  kanbanScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl, // Space for bottom tabs
    gap: Spacing.lg,
  },
  kanbanColumn: {
    width: Dimensions.get("window").width * 0.85,
    maxWidth: 350,
    height: "100%",
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  columnHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    ...Typography.headingMd,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  columnCardsList: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadow.card,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  cardRole: {
    ...Typography.headingMd,
    lineHeight: 22,
  },
  cardCompany: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  scoreWrapper: {},
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDate: {
    ...Typography.label,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: "90%",
    ...Shadow.modal,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    ...Typography.headingLg,
  },
  inputLabel: {
    ...Typography.headingMd,
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMd,
  },
  inputArea: {
    minHeight: 120,
    maxHeight: 180,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyMd,
  },
  primaryBtn: {
    height: 48,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    ...Typography.headingMd,
  },
  statusBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  jdBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  }
});

