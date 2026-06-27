import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

// Mock data based on HTML mockup
const MOCK_APPS = [
  { id: '1', status: 'SAVED', role: 'Senior Product Designer', company: 'Stripe', location: 'Remote', score: 84, date: '2d ago', shapes: ['geoSquare', 'geoDot'] },
  { id: '2', status: 'SAVED', role: 'Design Systems Lead', company: 'Airbnb', location: 'San Francisco', score: 75, date: '3d ago', shapes: ['geoSquare'] },
  { id: '3', status: 'APPLIED', role: 'UX Manager', company: 'Slack', location: 'Remote', score: 92, date: 'Today', shapes: ['geoSquare', 'geoCircle'] },
  { id: '4', status: 'SCREENING', role: 'Product Design Lead', company: 'Intercom', location: 'Dublin', score: 86, date: 'Meeting in 2h', isHighlight: true, shapes: ['geoDiamond'] },
  { id: '5', status: 'INTERVIEW', role: 'Principal UI/UX Architect', company: 'Figma', location: 'SF / Remote', score: 98, date: 'Nov 14', shapes: ['geoSquare'] },
  { id: '6', status: 'OFFER', role: 'Staff Designer', company: 'Linear', location: 'Remote', score: 100, date: 'Received!', isHighlight: true, shapes: ['geoCircle'] },
];

export default function TrackerScreen() {
  const { colors, isDark } = useTheme();

  const COLUMNS = [
    { id: 'SAVED', title: 'Saved', color: colors.border, count: 12 },
    { id: 'APPLIED', title: 'Applied', color: colors.primary, count: 8 },
    { id: 'SCREENING', title: 'Screening', color: colors.warning, count: 3 },
    { id: 'INTERVIEW', title: 'Interview', color: colors.tertiary || '#4d30d7', count: 2 },
    { id: 'OFFER', title: 'Offer', color: colors.success, count: 1 },
  ];

  const renderShape = (shape: string, color: string) => {
    switch(shape) {
      case 'geoSquare': return <Ionicons name="document-text-outline" size={14} color={color} />;
      case 'geoDot': return <Ionicons name="location-outline" size={14} color={color} />;
      case 'geoCircle': return <Ionicons name="people-outline" size={14} color={color} />;
      case 'geoDiamond': return <Ionicons name="briefcase-outline" size={14} color={color} />;
      default: return null;
    }
  };

  const renderCard = (app: any, color: string) => {
    const isOffer = app.status === 'OFFER';
    const isHighlight = app.isHighlight;
    const dateColor = isOffer ? colors.success : (isHighlight ? colors.warning : colors.textMuted);
    
    return (
      <TouchableOpacity 
        key={app.id} 
        style={[
          styles.card, 
          { backgroundColor: colors.bgPrimary, borderColor: colors.border, shadowColor: isDark ? 'transparent' : '#000' }
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardRole, { color: isOffer ? colors.success : colors.textPrimary }]}>{app.role}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={[styles.statusDot, { backgroundColor: color, marginRight: 6 }]} />
              <Text style={[styles.cardCompany, { color: colors.textMuted, marginTop: 0 }]}>{app.company} • {app.location}</Text>
            </View>
          </View>
          
          <View style={styles.scoreWrapper}>
             <ScoreRing score={app.score} size="sm" color={isOffer ? colors.success : colors.primary} animate={false} />
          </View>
        </View>

        <View style={[styles.cardBottom, { borderTopColor: colors.border }, isOffer && { borderTopColor: `${colors.success}33` }]}>
          <View style={styles.iconRow}>
            {app.shapes.map((shape: string, idx: number) => (
              <View key={idx} style={{ marginRight: 6 }}>
                {renderShape(shape, isOffer ? colors.success : colors.textMuted)}
              </View>
            ))}
          </View>
          <Text style={[styles.cardDate, { color: dateColor, fontWeight: isHighlight || isOffer ? '700' : '500' }]}>
            {app.date}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.mainContent}>
        {/* Header Info */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Application Tracker</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={16} color={colors.textInverse} />
            <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Kanban Board */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.kanbanScroll}
        >
          {COLUMNS.map(column => {
            const columnApps = MOCK_APPS.filter(app => app.status === column.id);
            return (
              <View key={column.id} style={styles.kanbanColumn}>
                
                {/* Column Header */}
                <View style={styles.columnHeader}>
                  <View style={styles.columnHeaderLeft}>
                    <View style={[styles.statusDot, { backgroundColor: column.color }]} />
                    <Text style={[styles.columnTitle, { color: colors.textPrimary }]}>{column.title}</Text>
                    <View style={[styles.countBadge, { backgroundColor: colors.bgMuted }]}>
                      <Text style={[styles.countText, { color: colors.textBody }]}>{column.count}</Text>
                    </View>
                  </View>
                  <TouchableOpacity>
                     <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Column Cards */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.columnCardsList}>
                  {columnApps.map(app => renderCard(app, column.color))}
                </ScrollView>

              </View>
            );
          })}
        </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  pageTitle: {
    ...Typography.displayMd,
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: Dimensions.get('window').width * 0.85,
    maxWidth: 350,
    height: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  columnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    ...Typography.label,
  },
});
