
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, ActivityIndicator } from "react-native";
import { Typography, Spacing, Radius, Shadow, useTheme } from "../../src/theme";
import { ScoreRing } from "../../src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useJobApplicationsListQuery, useCreateJobApplicationMutation, useUpdateJobApplicationStatusMutation } from "../../src/hooks/useApi";
import { useRouter } from "expo-router";

export default function TrackerScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const { data: appsData, isLoading } = useJobApplicationsListQuery();
  const createJob = useCreateJobApplicationMutation();
  const updateStatus = useUpdateJobApplicationStatusMutation();

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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const renderCard = (app: any, color: string) => {
    const isOffer = app.status === "OFFER";
    const dateColor = isOffer ? colors.success : colors.textMuted;
    
    return (
      <TouchableOpacity 
        key={app.id} 
        style={[
          styles.card, 
          { backgroundColor: colors.bgPrimary, borderColor: colors.border, shadowColor: isDark ? "transparent" : "#000" }
        ]}
        activeOpacity={0.8}
        onPress={() => setSelectedApp(app)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardRole, { color: isOffer ? colors.success : colors.textPrimary }]}>{app.job_title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <View style={[styles.statusDot, { backgroundColor: color, marginRight: 6 }]} />
              <Text style={[styles.cardCompany, { color: colors.textMuted, marginTop: 0 }]}>{app.company} {app.location ? `• ${app.location}` : ""}</Text>
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
      </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setSelectedApp(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedApp && (
              <ScrollView style={{ marginTop: Spacing.md }}>
                <Text style={[Typography.displaySm, { color: colors.textPrimary }]}>{selectedApp.job_title}</Text>
                <Text style={[Typography.bodyLg, { color: colors.textMuted, marginBottom: Spacing.xl }]}>{selectedApp.company} {selectedApp.location ? `• ${selectedApp.location}` : ""}</Text>

                <Text style={[Typography.headingMd, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
                  {COLUMNS.map(col => (
                    <TouchableOpacity
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
                    </TouchableOpacity>
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
                    <TouchableOpacity 
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setSelectedApp(null);
                        router.push(`/job-analyzer?job_id=${selectedApp.id}`);
                      }}
                    >
                      <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Analyze Job Match</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[Typography.headingMd, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>Job Description</Text>
                <View style={[styles.jdBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                  <Text style={[Typography.bodyMd, { color: colors.textBody }]} numberOfLines={10}>
                    {selectedApp.raw_jd || "No job description provided."}
                  </Text>
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
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
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

              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.xl, opacity: createJob.isPending ? 0.7 : 1 }]}
                onPress={handleAddNew}
                disabled={createJob.isPending}
              >
                {createJob.isPending ? (
                   <ActivityIndicator color={colors.textInverse} />
                ) : (
                   <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Save Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.mainContent}>
        {/* Header Info */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Application Tracker</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setIsAddModalVisible(true)}>
            <Ionicons name="add" size={16} color={colors.textInverse} />
            <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add New</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
           <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
             <ActivityIndicator size="large" color={colors.primary} />
           </View>
        ) : (
          {/* Kanban Board */}
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
                    <TouchableOpacity>
                       <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Column Cards */}
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.columnCardsList}>
                    {columnApps.map((app: any) => renderCard(app, column.color))}
                  </ScrollView>

                </View>
              );
            })}
          </ScrollView>
        )}
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
    paddingBottom: 120, // Space for bottom tabs
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
    ...Typography.headingSm,
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
    height: 120,
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

