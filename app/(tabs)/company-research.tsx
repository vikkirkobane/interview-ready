import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { Card, Button, ScoreRing } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import {
  useCompanyResearchMutation,
  CompanyResearchResult,
} from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultTab =
  | 'overview'
  | 'products'
  | 'culture'
  | 'intelligence'
  | 'interview';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const copy = async (text: string) => {
  await Clipboard.setStringAsync(text);
  Toast.show({ type: 'success', text1: 'Copied!' });
};

const ScoreBar = ({
  score,
  label,
  color,
  colors,
}: {
  score: number;
  label: string;
  color: string;
  colors: any;
}) => (
  <View style={{ marginBottom: Spacing.md }}>
    <View style={s.scoreBarHeader}>
      <Text style={[s.scoreBarLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[s.scoreBarValue, { color }]}>{score}/100</Text>
    </View>
    <View style={[s.scoreBarTrack, { backgroundColor: colors.border }]}>
      <View
        style={[
          s.scoreBarFill,
          { width: `${score}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  </View>
);

const Chip = ({ text, color, colors }: { text: string; color: string; colors: any }) => (
  <View style={[s.chip, { backgroundColor: color + '18', borderColor: color + '40' }]}>
    <Text style={[s.chipText, { color }]}>{text}</Text>
  </View>
);

const BulletList = ({
  items,
  icon,
  iconColor,
  colors,
}: {
  items: string[];
  icon: string;
  iconColor: string;
  colors: any;
}) => (
  <View style={s.bulletList}>
    {items.map((item, i) => (
      <View key={i} style={s.bulletRow}>
        <Ionicons name={icon as any} size={15} color={iconColor} style={{ marginTop: 2, flexShrink: 0 }} />
        <Text style={[s.bulletText, { color: colors.textSecondary }]}>{item}</Text>
      </View>
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompanyResearchScreen() {
  const { colors } = useTheme();
  const researchMutation = useCompanyResearchMutation();

  const [companyUrl, setCompanyUrl] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<CompanyResearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('overview');

  const handleResearch = async () => {
    const trimmed = companyUrl.trim();
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Enter a company website URL' });
      return;
    }
    // Basic URL normalisation
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    try {
      const res = await researchMutation.mutateAsync({ company_url: url, context: context.trim() || undefined });
      setResult(res.data);
      setActiveTab('overview');
      Toast.show({ type: 'success', text1: `${res.data.company_name} researched!` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Research Failed', text2: e.message });
    }
  };

  const isLoading = researchMutation.isPending;

  // ── Input Screen ─────────────────────────────────────────────────────────
  if (!result) {
    return (
      <ScrollView
        style={[s.screen, { backgroundColor: colors.bgSecondary }]}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: '#0ea5e940' }]}>
            <Ionicons name="business" size={36} color="#0ea5e9" />
          </View>
          <Text style={[s.heroTitle, { color: colors.textPrimary }]}>Company Research</Text>
          <Text style={[s.heroSubtitle, { color: colors.textMuted }]}>
            Drop any company URL and get a complete intelligence brief: culture, growth signals, red flags, and tailored interview prep — in seconds.
          </Text>
        </View>

        {/* What you get */}
        <Card style={[s.featureCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[s.featureTitle, { color: colors.textPrimary }]}>What you'll get</Text>
          {[
            { icon: 'stats-chart-outline', color: '#0ea5e9', text: 'Opportunity & culture fit scores' },
            { icon: 'flag-outline',         color: '#f59e0b', text: 'Growth signals & honest red flags' },
            { icon: 'mic-outline',          color: '#8b5cf6', text: 'Interview talking points (5–7 tailored)' },
            { icon: 'help-circle-outline',  color: '#10b981', text: 'Smart questions to ask the interviewer' },
            { icon: 'grid-outline',         color: '#ec4899', text: 'Tech stack, competitors & business model' },
          ].map((item, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.featureIconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={[s.featureText, { color: colors.textSecondary }]}>{item.text}</Text>
            </View>
          ))}
        </Card>

        {/* Input Form */}
        <Card style={[s.formCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Company Website URL *</Text>
          <TextInput
            style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder="e.g. https://stripe.com or stripe.com"
            placeholderTextColor={colors.textMuted}
            value={companyUrl}
            onChangeText={setCompanyUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={[s.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.lg }]}>
            Your Context <Text style={[s.optional, { color: colors.textMuted }]}>(optional but recommended)</Text>
          </Text>
          <TextInput
            style={[s.input, s.multiline, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder={`e.g. "I'm interviewing for a Senior Product Manager role next week. I want to understand their culture and prepare smart questions."`}
            placeholderTextColor={colors.textMuted}
            value={context}
            onChangeText={setContext}
            multiline
          />

          <Button
            title={isLoading ? 'Researching...' : 'Research Company (2 Credits)'}
            onPress={handleResearch}
            disabled={isLoading || !companyUrl.trim()}
            style={{ marginTop: Spacing.lg }}
          />
        </Card>

        {isLoading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={[s.loadingTitle, { color: colors.textPrimary }]}>Researching company…</Text>
            <Text style={[s.loadingText, { color: colors.textMuted }]}>
              Scraping website → AI analysis → building your brief
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Results Screen ────────────────────────────────────────────────────────
  const TABS: { id: ResultTab; label: string; icon: string }[] = [
    { id: 'overview',     label: 'Overview',     icon: 'home-outline'       },
    { id: 'products',     label: 'Products',     icon: 'cube-outline'       },
    { id: 'culture',      label: 'Culture',      icon: 'people-outline'     },
    { id: 'intelligence', label: 'Intel',        icon: 'analytics-outline'  },
    { id: 'interview',    label: 'Interview',    icon: 'mic-outline'        },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSecondary }}>
      {/* Results header */}
      <View style={[s.resultsHeader, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { setResult(null); setCompanyUrl(''); setContext(''); }} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.resultsCompany, { color: colors.textPrimary }]} numberOfLines={1}>
            {result.company_name}
          </Text>
          {result.tagline ? (
            <Text style={[s.resultsTagline, { color: colors.textMuted }]} numberOfLines={1}>
              {result.tagline}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.border }]}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? '#0ea5e9' : colors.textMuted} />
            <Text style={[s.tabLabel, { color: activeTab === tab.id ? '#0ea5e9' : colors.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.resultsContent}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <View style={s.gap}>
            {/* Scores */}
            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Opportunity Scores</Text>
              <ScoreBar score={result.opportunity_score} label="Overall Opportunity" color="#0ea5e9" colors={colors} />
              {result.cultural_fit_score != null && (
                <ScoreBar score={result.cultural_fit_score} label="Cultural Fit" color="#8b5cf6" colors={colors} />
              )}
            </Card>

            {/* Verdict */}
            <Card style={[s.verdictCard, { backgroundColor: '#0ea5e9' }]}>
              <View style={s.verdictHeader}>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={s.verdictTitle}>AI Verdict</Text>
              </View>
              <Text style={s.verdictText}>{result.summary_verdict}</Text>
            </Card>

            {/* Quick facts */}
            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Quick Facts</Text>
              {[
                { label: 'Industry',      value: result.industry,      icon: 'layers-outline'    },
                { label: 'Business Model',value: result.business_model, icon: 'cash-outline'     },
                { label: 'Company Size',  value: result.company_size,  icon: 'people-outline'    },
                { label: 'Headquarters',  value: result.headquarters,  icon: 'location-outline'  },
                { label: 'Founded',       value: result.founded,       icon: 'calendar-outline'  },
                { label: 'Financials',    value: result.financials,    icon: 'trending-up-outline'},
              ]
                .filter((f) => f.value)
                .map((fact, i) => (
                  <View key={i} style={[s.factRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                    <Ionicons name={fact.icon as any} size={16} color="#0ea5e9" style={{ marginRight: Spacing.sm }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.factLabel, { color: colors.textMuted }]}>{fact.label}</Text>
                      <Text style={[s.factValue, { color: colors.textPrimary }]}>{fact.value}</Text>
                    </View>
                  </View>
                ))}
            </Card>

            {/* Overview paragraph */}
            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Company Overview</Text>
              <Text style={[s.bodyText, { color: colors.textSecondary }]}>{result.overview}</Text>
            </Card>
          </View>
        )}

        {/* ── PRODUCTS ── */}
        {activeTab === 'products' && (
          <View style={s.gap}>
            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Key Products & Services</Text>
              <View style={s.chipRow}>
                {result.key_products_services.map((p, i) => (
                  <Chip key={i} text={p} color="#0ea5e9" colors={colors} />
                ))}
              </View>
            </Card>

            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Mission & Values</Text>
              <Text style={[s.bodyText, { color: colors.textSecondary }]}>{result.mission_values}</Text>
            </Card>

            {result.tech_stack && result.tech_stack.length > 0 && (
              <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Tech Stack</Text>
                <View style={s.chipRow}>
                  {result.tech_stack.map((t, i) => (
                    <Chip key={i} text={t} color="#8b5cf6" colors={colors} />
                  ))}
                </View>
              </Card>
            )}

            {result.competitors && result.competitors.length > 0 && (
              <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Competitors</Text>
                <View style={s.chipRow}>
                  {result.competitors.map((c, i) => (
                    <Chip key={i} text={c} color="#f59e0b" colors={colors} />
                  ))}
                </View>
              </Card>
            )}

            {result.recent_news && result.recent_news.length > 0 && (
              <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Recent News</Text>
                {result.recent_news.map((news, i) => (
                  <View key={i} style={[s.newsItem, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                    <Text style={[s.newsHeadline, { color: colors.textPrimary }]}>📰 {news.headline}</Text>
                    <Text style={[s.bodyText, { color: colors.textSecondary }]}>{news.summary}</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}

        {/* ── CULTURE ── */}
        {activeTab === 'culture' && (
          <View style={s.gap}>
            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Culture Insights</Text>
              <Text style={[s.bodyText, { color: colors.textSecondary }]}>{result.culture_insights}</Text>
            </Card>

            {result.growth_signals.length > 0 && (
              <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <View style={s.sectionHeaderRow}>
                  <Ionicons name="trending-up" size={18} color="#10b981" />
                  <Text style={[s.cardTitle, { color: colors.textPrimary, marginLeft: 6 }]}>Growth Signals</Text>
                </View>
                <BulletList items={result.growth_signals} icon="checkmark-circle" iconColor="#10b981" colors={colors} />
              </Card>
            )}

            {result.red_flags.length > 0 && (
              <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: '#f59e0b' }]}>
                <View style={s.sectionHeaderRow}>
                  <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                  <Text style={[s.cardTitle, { color: colors.textPrimary, marginLeft: 6 }]}>Red Flags</Text>
                </View>
                <BulletList items={result.red_flags} icon="alert-circle" iconColor="#f59e0b" colors={colors} />
              </Card>
            )}

            {result.red_flags.length === 0 && (
              <Card style={[s.card, { backgroundColor: '#10b98110', borderColor: '#10b981' }]}>
                <View style={s.sectionHeaderRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={[s.cardTitle, { color: '#10b981', marginLeft: 6 }]}>No Red Flags Detected</Text>
                </View>
                <Text style={[s.bodyText, { color: colors.textSecondary }]}>
                  No significant red flags were identified in the available data.
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* ── INTELLIGENCE ── */}
        {activeTab === 'intelligence' && (
          <View style={s.gap}>
            <Card style={[s.verdictCard, { backgroundColor: '#0ea5e9' }]}>
              <View style={s.verdictHeader}>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={s.verdictTitle}>Strategic Verdict</Text>
              </View>
              <Text style={s.verdictText}>{result.summary_verdict}</Text>
            </Card>

            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Opportunity Scores</Text>
              <ScoreBar score={result.opportunity_score} label="Overall Opportunity" color="#0ea5e9" colors={colors} />
              {result.cultural_fit_score != null && (
                <ScoreBar score={result.cultural_fit_score} label="Cultural Fit" color="#8b5cf6" colors={colors} />
              )}
            </Card>

            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Growth Signals</Text>
              <BulletList items={result.growth_signals} icon="trending-up" iconColor="#10b981" colors={colors} />
            </Card>

            {result.red_flags.length > 0 && (
              <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: '#f59e0b' }]}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Risks & Red Flags</Text>
                <BulletList items={result.red_flags} icon="warning-outline" iconColor="#f59e0b" colors={colors} />
              </Card>
            )}
          </View>
        )}

        {/* ── INTERVIEW ── */}
        {activeTab === 'interview' && (
          <View style={s.gap}>
            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <View style={s.cardTitleRow}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Talking Points to Demonstrate</Text>
                <TouchableOpacity
                  onPress={() => copy(result.interview_talking_points.join('\n'))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[s.hint, { color: colors.textMuted }]}>
                Show knowledge of these in your interview answers.
              </Text>
              {result.interview_talking_points.map((point, i) => (
                <View key={i} style={[s.talkingPoint, { backgroundColor: '#0ea5e912', borderColor: '#0ea5e940' }]}>
                  <View style={[s.pointNum, { backgroundColor: '#0ea5e9' }]}>
                    <Text style={s.pointNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[s.bodyText, { color: colors.textSecondary, flex: 1 }]}>{point}</Text>
                </View>
              ))}
            </Card>

            <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <View style={s.cardTitleRow}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Smart Questions to Ask</Text>
                <TouchableOpacity
                  onPress={() => copy(result.smart_questions_to_ask.map((q, i) => `${i + 1}. ${q}`).join('\n'))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[s.hint, { color: colors.textMuted }]}>
                These questions show strategic thinking and genuine interest.
              </Text>
              {result.smart_questions_to_ask.map((q, i) => (
                <View key={i} style={[s.questionRow, { borderTopColor: colors.border }]}>
                  <Ionicons name="help-circle-outline" size={18} color="#8b5cf6" style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text style={[s.bodyText, { color: colors.textSecondary, flex: 1 }]}>{q}</Text>
                </View>
              ))}
            </Card>

            {/* Research again CTA */}
            <TouchableOpacity
              style={[s.newResearchBtn, { borderColor: colors.border }]}
              onPress={() => { setResult(null); setCompanyUrl(''); setContext(''); }}
            >
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <Text style={[s.newResearchText, { color: colors.textMuted }]}>Research Another Company</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:          { flex: 1 },
  content:         { padding: Spacing.lg, paddingBottom: 120 },

  // Hero
  hero:            { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  heroIcon:        { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  heroTitle:       { ...Typography.headingLg, textAlign: 'center', marginBottom: Spacing.xs },
  heroSubtitle:    { ...Typography.bodyMd, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },

  // Feature list
  featureCard:     { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  featureTitle:    { ...Typography.subtitle1, marginBottom: Spacing.md },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  featureIconBox:  { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  featureText:     { ...Typography.bodyMd, flex: 1 },

  // Form
  formCard:        { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  fieldLabel:      { ...Typography.subtitle1, marginBottom: Spacing.xs },
  optional:        { ...Typography.bodySm, fontWeight: '400' },
  input:           { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, ...Typography.bodyMd },
  multiline:       { height: 100, textAlignVertical: 'top' },

  // Loading
  loadingBox:      { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  loadingTitle:    { ...Typography.headingMd, marginTop: Spacing.md },
  loadingText:     { ...Typography.bodyMd, textAlign: 'center' },

  // Results header
  resultsHeader:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, gap: Spacing.md },
  backBtn:         { padding: Spacing.xs },
  resultsCompany:  { ...Typography.headingMd },
  resultsTagline:  { ...Typography.bodySm, marginTop: 1 },

  // Tab bar
  tabBar:          { flexGrow: 0, borderBottomWidth: 1 },
  tabBarContent:   { paddingHorizontal: Spacing.md },
  tab:             { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  tabActive:       { borderBottomColor: '#0ea5e9', borderBottomWidth: 2 },
  tabLabel:        { ...Typography.bodySm },

  resultsContent:  { padding: Spacing.lg, paddingBottom: 120 },
  gap:             { gap: Spacing.lg },

  // Cards
  card:            { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  cardTitle:       { ...Typography.subtitle1, marginBottom: Spacing.sm },
  cardTitleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  bodyText:        { ...Typography.bodyMd, lineHeight: 22 },
  hint:            { ...Typography.bodySm, marginBottom: Spacing.md },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },

  // Verdict card
  verdictCard:     { padding: Spacing.xl, borderRadius: Radius.lg },
  verdictHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  verdictTitle:    { ...Typography.subtitle1, color: '#fff' },
  verdictText:     { ...Typography.bodyMd, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },

  // Score bar
  scoreBarHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreBarLabel:   { ...Typography.bodyMd, fontWeight: '600' },
  scoreBarValue:   { ...Typography.bodyMd, fontWeight: '700' },
  scoreBarTrack:   { height: 8, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill:    { height: '100%', borderRadius: 4 },

  // Quick facts
  factRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm },
  factLabel:       { ...Typography.bodySm, marginBottom: 2 },
  factValue:       { ...Typography.bodyMd, fontWeight: '500' },

  // Chips
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  chip:            { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  chipText:        { ...Typography.bodySm, fontWeight: '600' },

  // Bullet list
  bulletList:      { gap: Spacing.sm, marginTop: Spacing.xs },
  bulletRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  bulletText:      { ...Typography.bodyMd, flex: 1, lineHeight: 22 },

  // News
  newsItem:        { paddingTop: Spacing.md, marginTop: Spacing.md },
  newsHeadline:    { ...Typography.subtitle1, marginBottom: Spacing.xs },

  // Talking points
  talkingPoint:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm },
  pointNum:        { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  pointNumText:    { ...Typography.bodySm, color: '#fff', fontWeight: '700' },

  // Questions
  questionRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.sm },

  // New research CTA
  newResearchBtn:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.full, paddingVertical: Spacing.md },
  newResearchText: { ...Typography.bodyMd },
});
