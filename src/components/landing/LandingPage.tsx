import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '../../stores/auth-store';
import PrivacyModal from './PrivacyModal';
import TermsModal from './TermsModal';
import { Radius } from '../../theme';

interface ProfessionDemo {
  id: string;
  profession: string;
  tabLabel: string;
  location: string;
  originalText: string;
  optimizedText: string;
  originalScore: number;
  optimizedScore: number;
  keywords: string[];
  metricsAdded: string;
}

const DEMO_DATA: ProfessionDemo[] = [
  {
    id: 'software',
    profession: 'Software Engineer',
    tabLabel: 'Software',
    location: 'Nairobi, Kenya',
    originalText: 'Responsible for writing clean React code, fixing bugs, and helping with server deployment.',
    optimizedText: 'Engineered 14+ scalable React components and optimized Docker deployment pipelines, reducing page-load latency by 35% and scaling performance for 50,000+ monthly active users.',
    originalScore: 42,
    optimizedScore: 97,
    keywords: ['React Components', 'Docker Pipelines', 'Latency Reduction', 'Scalability', 'Performance Optimization'],
    metricsAdded: '+35% page-load speed, 50k+ active users',
  },
  {
    id: 'nurse',
    profession: 'Registered Nurse',
    tabLabel: 'Nurse',
    location: 'Lagos, Nigeria',
    originalText: 'Helped admit patients, did basic clinical paperwork, and worked night shifts in the ward.',
    optimizedText: 'Managed fast-track clinical admission protocols for up to 45 patients daily in a high-volume ward, ensuring 100% compliance with international safety policies and reducing average intake delays by 18 minutes.',
    originalScore: 48,
    optimizedScore: 95,
    keywords: ['Clinical Admission Protocols', 'Patient Intake Optimization', 'Safety Compliance', 'High-Volume Care'],
    metricsAdded: '-18 min intake delay, 45+ daily patients',
  },
  {
    id: 'finance',
    profession: 'Finance Analyst',
    tabLabel: 'Finance',
    location: 'Accra, Ghana',
    originalText: 'Looked over monthly accounting statements, made financial spreadsheets, and reported to managers.',
    optimizedText: 'Built financial models and variance dashboards analyzing $1.2M in operational budgets, detecting $85k in annual cost redundancies and presenting forecast insights directly to executive leadership.',
    originalScore: 39,
    optimizedScore: 98,
    keywords: ['Financial Models', 'Variance Dashboards', 'Budget Analysis', 'Cost Redundancy Auditing', 'Executive Reporting'],
    metricsAdded: '$85k saved, modeled $1.2M budget',
  },
];

const FAQS = [
  {
    q: 'How does the ATS optimization engine work?',
    a: 'Our engine extracts hard skills, technical requirements, and core competencies from your target job posting, then formats your career achievements using the exact keyword hierarchy preferred by top Applicant Tracking Systems (Workday, Greenhouse, Lever, Taleo).',
  },
  {
    q: 'Can I export both PDF and Word (.docx) formats?',
    a: 'Yes! Every resume you generate can be downloaded in high-res, print-ready PDF and clean, fully editable Microsoft Word (.docx) formats.',
  },
  {
    q: 'What is included in the AI Mock Interview prep?',
    a: 'You get realistic, role-specific technical and behavioral interview sessions tailored to your job description. The AI listens, scores your answers, and gives real-time constructive coaching on how to improve your answers.',
  },
  {
    q: 'Is it free to get started?',
    a: 'Yes. You receive free AI credits upon creating your account to generate resumes, cover letters, and practice interview questions immediately.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Samuel O.',
    role: 'Full-Stack Developer',
    placedAt: 'Placed at Series B Fintech',
    quote: 'I applied for 3 months with 0 callbacks. After tailoring my resume with Interview Ready, I landed 4 first-round interviews within 2 weeks.',
    score: '98% ATS Match',
  },
  {
    name: 'Amina K.',
    role: 'Clinical Operations Lead',
    placedAt: 'Placed at International Health NGO',
    quote: 'The AI transformed my basic duties into high-impact metrics. The recruiter specifically praised how clear and quantifiable my bullet points were.',
    score: '96% ATS Match',
  },
  {
    name: 'David M.',
    role: 'Financial Analyst',
    placedAt: 'Placed at Global Advisory Firm',
    quote: 'The mock interview tool prepared me for the exact behavioral questions they asked during my final partner round. Unbelievably accurate.',
    score: '99% ATS Match',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const [activeDemo, setActiveDemo] = useState<ProfessionDemo>(DEMO_DATA[0]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [simulatedScore, setSimulatedScore] = useState(activeDemo.originalScore);
  const [showOptimized, setShowOptimized] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<{ [key: string]: number }>({});
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelectDemo = (demo: ProfessionDemo) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveDemo(demo);
    setIsOptimizing(true);
    setShowOptimized(false);
    setSimulatedScore(demo.originalScore);

    timerRef.current = setTimeout(() => {
      setSimulatedScore(demo.optimizedScore);
      setShowOptimized(true);
      setIsOptimizing(false);
    }, 100);
  };

  const handleGetStarted = () => {
    if (session) {
      const isCompleted = session.user?.user_metadata?.onboarding_completed;
      if (isCompleted) {
        router.push('/(tabs)');
      } else {
        router.push('/(onboarding)/referral-code' as any);
      }
    } else {
      router.push('/(auth)/welcome');
    }
  };

  const handleSignIn = () => {
    if (session) {
      router.push('/(tabs)');
    } else {
      router.push('/(auth)/login');
    }
  };

  const scrollToSection = (key: string) => {
    setMobileMenuOpen(false);
    const y = sectionPositions.current[key];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  };

  return (
    <View style={styles.root}>
      {/* 1. STICKY NAVBAR */}
      <View style={styles.navbar}>
        <View style={styles.navbarInner}>
          {/* Logo & Brand */}
          <Pressable
            style={styles.navBrand}
            onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.navLogo}
              contentFit="contain"
            />
            <Text style={styles.brandText}>Interview Ready</Text>
          </Pressable>

          {/* Desktop Nav Links */}
          {isDesktop && (
            <View style={styles.navLinks}>
              <Pressable onPress={() => scrollToSection('features')} style={styles.navLinkItem}>
                <Text style={styles.navLinkText}>Features</Text>
              </Pressable>
              <Pressable onPress={() => scrollToSection('how-it-works')} style={styles.navLinkItem}>
                <Text style={styles.navLinkText}>How It Works</Text>
              </Pressable>
              <Pressable onPress={() => scrollToSection('testimonials')} style={styles.navLinkItem}>
                <Text style={styles.navLinkText}>Recruiter Tested</Text>
              </Pressable>
              <Pressable onPress={() => scrollToSection('faq')} style={styles.navLinkItem}>
                <Text style={styles.navLinkText}>FAQ</Text>
              </Pressable>
            </View>
          )}

          {/* Nav Right CTA */}
          <View style={styles.navRight}>
            {session ? (
              <Pressable style={styles.navPrimaryBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.navPrimaryBtnText}>Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <>
                {isDesktop && (
                  <Pressable style={styles.navSecondaryBtn} onPress={handleSignIn}>
                    <Text style={styles.navSecondaryBtnText}>Sign In</Text>
                  </Pressable>
                )}
                <Pressable style={styles.navPrimaryBtn} onPress={handleGetStarted}>
                  <Text style={styles.navPrimaryBtnText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </Pressable>
              </>
            )}

            {/* Mobile menu toggle */}
            {!isDesktop && (
              <Pressable
                style={styles.mobileMenuToggle}
                onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
                accessibilityLabel="Toggle menu"
              >
                <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={24} color="#0F172A" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Mobile Dropdown Menu */}
        {!isDesktop && mobileMenuOpen && (
          <View style={styles.mobileDropdown}>
            <Pressable style={styles.mobileNavItem} onPress={() => scrollToSection('features')}>
              <Text style={styles.mobileNavText}>Features</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            <Pressable style={styles.mobileNavItem} onPress={() => scrollToSection('how-it-works')}>
              <Text style={styles.mobileNavText}>How It Works</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            <Pressable style={styles.mobileNavItem} onPress={() => scrollToSection('testimonials')}>
              <Text style={styles.mobileNavText}>Testimonials</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            <Pressable style={styles.mobileNavItem} onPress={() => scrollToSection('faq')}>
              <Text style={styles.mobileNavText}>FAQ</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            {!session && (
              <Pressable style={styles.mobileNavItem} onPress={handleSignIn}>
                <Text style={[styles.mobileNavText, { color: '#1A4F8A', fontWeight: '700' }]}>Sign In</Text>
                <Ionicons name="log-in-outline" size={18} color="#1A4F8A" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* 2. HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.container}>
            <View style={[styles.heroGrid, isDesktop ? styles.heroGridDesktop : styles.heroGridMobile]}>
              {/* Left Column: Headline & Action */}
              <View style={styles.heroLeft}>
                <View style={styles.earlyBadge}>
                  <Text style={styles.earlyBadgeText}>AI-POWERED CAREER PLATFORM</Text>
                </View>

                <Text style={styles.heroTitle}>
                  Land More{'\n'}
                  <Text style={styles.heroTitleAccent}>Interviews Faster.</Text>
                </Text>

                <Text style={styles.heroSubtitle}>
                  Interview Ready writes, formats, and exports ATS-optimized resumes, tailored cover letters, and provides dynamic AI interview coaching tailored to any target job description.
                </Text>

                {/* Social Proof Avatars */}
                <View style={styles.heroProof}>
                  <View style={styles.proofAvatars}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#38BDF8' }]}>
                      <Text style={styles.avatarInitial}>S</Text>
                    </View>
                    <View style={[styles.avatarCircle, { backgroundColor: '#818CF8', marginLeft: -8 }]}>
                      <Text style={styles.avatarInitial}>A</Text>
                    </View>
                    <View style={[styles.avatarCircle, { backgroundColor: '#34D399', marginLeft: -8 }]}>
                      <Text style={styles.avatarInitial}>D</Text>
                    </View>
                  </View>
                  <Text style={styles.proofText}>Trusted by 10,000+ ambitious global job seekers</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.heroActions}>
                  <Pressable style={styles.heroPrimaryBtn} onPress={handleGetStarted}>
                    <Text style={styles.heroPrimaryBtnText}>
                      {session ? 'Go to Dashboard' : 'Get Started for Free'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>

                  {!session && (
                    <Pressable style={styles.heroSecondaryBtn} onPress={handleSignIn}>
                      <Text style={styles.heroSecondaryBtnText}>Sign In</Text>
                    </Pressable>
                  )}
                </View>

                <Text style={styles.heroDisclaimer}>
                  Free to start • No credit card required • Instant PDF & DOCX export
                </Text>
              </View>

              {/* Right Column: Live Interactive ATS Simulator */}
              <View style={styles.heroRight}>
                <View style={styles.phoneFrame}>
                  {/* Phone Notch */}
                  <View style={styles.phoneNotch}>
                    <View style={styles.notchPill} />
                  </View>

                  <View style={styles.phoneScreen}>
                    {/* Screen Top Bar */}
                    <View style={styles.simHeader}>
                      <View style={styles.simBrand}>
                        <Image source={require('../../../assets/logo.png')} style={{ width: 16, height: 16 }} />
                        <Text style={styles.simBrandText}>ATS Optimizer</Text>
                      </View>
                      <View style={styles.simBadge}>
                        <Text style={styles.simBadgeText}>AI Active</Text>
                      </View>
                    </View>

                    {/* Profile Selector */}
                    <View style={styles.simTabs}>
                      {DEMO_DATA.map((demo) => {
                        const isSelected = activeDemo.id === demo.id;
                        return (
                          <Pressable
                            key={demo.id}
                            style={[styles.simTab, isSelected && styles.simTabActive]}
                            onPress={() => handleSelectDemo(demo)}
                          >
                            <Text style={[styles.simTabText, isSelected && styles.simTabTextActive]}>
                              {demo.tabLabel}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Gauge Card */}
                    <View style={styles.simScoreCard}>
                      <View>
                        <Text style={styles.simScoreLabel}>ATS Match Score</Text>
                        <Text style={styles.simScoreSub}>Resume Compatibility</Text>
                      </View>
                      <View style={styles.gaugeBox}>
                        <Svg width={44} height={44} viewBox="0 0 44 44">
                          <Circle cx="22" cy="22" r="18" stroke="#E2E8F0" strokeWidth="3.5" fill="none" />
                          <Circle
                            cx="22"
                            cy="22"
                            r="18"
                            stroke={simulatedScore > 60 ? '#10B981' : '#EF4444'}
                            strokeWidth="3.5"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 18}`}
                            strokeDashoffset={`${2 * Math.PI * 18 * (1 - simulatedScore / 100)}`}
                            strokeLinecap="round"
                            transform="rotate(-90 22 22)"
                          />
                        </Svg>
                        <Text style={[styles.gaugeVal, { color: simulatedScore > 60 ? '#047857' : '#B91C1C' }]}>
                          {simulatedScore}%
                        </Text>
                      </View>
                    </View>

                    {/* Before State */}
                    <View style={styles.beforeBox}>
                      <View style={styles.stateTagBefore}>
                        <Text style={styles.stateTagBeforeText}>Weak CV</Text>
                      </View>
                      <Text style={styles.stateTitle}>Before AI Treatment</Text>
                      <Text style={styles.stateBody}>{activeDemo.originalText}</Text>
                    </View>

                    {/* Status indicator */}
                    {isOptimizing ? (
                      <View style={styles.optimizingRow}>
                        <Text style={styles.optimizingText}>⚡ Injecting High-Impact ATS Keywords...</Text>
                      </View>
                    ) : (
                      <View style={{ height: 16 }} />
                    )}

                    {/* After State */}
                    <View style={[styles.afterBox, showOptimized && styles.afterBoxActive]}>
                      <View style={styles.stateHeader}>
                        <Text style={styles.stateTitleOptimized}>Interview Ready CV</Text>
                        {showOptimized && (
                          <View style={styles.recruiterBadge}>
                            <Text style={styles.recruiterBadgeText}>Recruiter Proof ✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stateBodyOptimized}>
                        {showOptimized ? activeDemo.optimizedText : '...'}
                      </Text>
                    </View>

                    {/* Injected Keywords */}
                    {showOptimized && (
                      <View style={styles.keywordsWrap}>
                        {activeDemo.keywords.slice(0, 3).map((kw, i) => (
                          <View key={i} style={styles.kwBadge}>
                            <Text style={styles.kwText}>+ {kw}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Footer bar */}
                    <View style={styles.simFooter}>
                      <Text style={styles.simLocation}>{activeDemo.location}</Text>
                      <View style={styles.simStatus}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.simStatusText}>ATS Ready</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 3. PROBLEM STATEMENT SECTION */}
        <View style={styles.problemSection}>
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <Text style={styles.problemHeading}>Job applications are broken.</Text>
              <Text style={styles.sectionSub}>
                Applying to global remote roles or local companies shouldn't feel like gambling. Traditional resumes fail silently without you ever knowing why.
              </Text>
            </View>

            <View style={[styles.cardsGrid, isDesktop ? styles.cardsGrid3Col : styles.cardsGrid1Col]}>
              <View style={styles.problemCard}>
                <View style={styles.problemIconWrap}>
                  <Ionicons name="warning-outline" size={24} color="#1A4F8A" />
                </View>
                <Text style={styles.problemCardTitle}>The ATS Blocker</Text>
                <Text style={styles.problemCardBody}>
                  Applicant Tracking Systems filter out up to 75% of submissions before a recruiter even opens them. Without the exact keyword density, you get disqualified instantly.
                </Text>
              </View>

              <View style={styles.problemCard}>
                <View style={styles.problemIconWrap}>
                  <Ionicons name="time-outline" size={24} color="#1A4F8A" />
                </View>
                <Text style={styles.problemCardTitle}>The Time Sink</Text>
                <Text style={styles.problemCardBody}>
                  Customizing your resume and writing tailored cover letters for every role takes hours. Candidates get exhausted and burn out before sending 10 applications.
                </Text>
              </View>

              <View style={styles.problemCard}>
                <View style={styles.problemIconWrap}>
                  <Ionicons name="layers-outline" size={24} color="#1A4F8A" />
                </View>
                <Text style={styles.problemCardTitle}>The Formatting Trap</Text>
                <Text style={styles.problemCardBody}>
                  Complex graphics and non-standard layouts break automated document parsers. We generate clean, standardized structures that score 95%+ every time.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. CORE FEATURES SECTION */}
        <View
          style={styles.featuresSection}
          onLayout={(e) => {
            sectionPositions.current['features'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTag}>
                <Text style={styles.sectionTagText}>INTELLIGENT SUITE</Text>
              </View>
              <Text style={styles.sectionTitle}>Built for Serious Candidates</Text>
              <Text style={styles.sectionSub}>
                Everything you need to turn a job posting into an interview invitation.
              </Text>
            </View>

            {/* Feature 1 */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktop : styles.featureRowMobile]}>
              <View style={styles.featureTextCol}>
                <View style={styles.featureBadge}>
                  <Ionicons name="document-text-outline" size={18} color="#1A4F8A" />
                  <Text style={styles.featureBadgeText}>ATS Resume Builder</Text>
                </View>
                <Text style={styles.featureTitle}>Targeted Resumes That Pass the Bots</Text>
                <Text style={styles.featureBody}>
                  Automatically align your work history, metrics, and technical skills with the exact keywords found in your target job description. Generate full-page, dense bullet points that highlight results.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>5+ Metric-Dense Bullets per Role</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>Executive, Modern & Classic Templates</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>1-Click PDF & DOCX Download</Text>
                  </View>
                </View>
              </View>
              <View style={styles.featureCardVisual}>
                <View style={styles.mockResumeCard}>
                  <View style={styles.mockResumeHeader}>
                    <View style={styles.mockDotRow}>
                      <View style={[styles.mockDot, { backgroundColor: '#EF4444' }]} />
                      <View style={[styles.mockDot, { backgroundColor: '#F59E0B' }]} />
                      <View style={[styles.mockDot, { backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.mockResumeFormat}>ATS High-Score Layout</Text>
                  </View>
                  <View style={styles.mockLineHeader} />
                  <View style={styles.mockLineSub} />
                  <View style={styles.mockBadgeItem}>
                    <Ionicons name="sparkles" size={14} color="#1A4F8A" />
                    <Text style={styles.mockBadgeItemText}>Quantified Achievement: +35% Latency Reduction</Text>
                  </View>
                  <View style={styles.mockBadgeItem}>
                    <Ionicons name="sparkles" size={14} color="#1A4F8A" />
                    <Text style={styles.mockBadgeItemText}>Categorized Skills: React, TypeScript, Docker, CI/CD</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Feature 2 */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktopReverse : styles.featureRowMobile]}>
              <View style={styles.featureTextCol}>
                <View style={styles.featureBadge}>
                  <Ionicons name="search-outline" size={18} color="#1A4F8A" />
                  <Text style={styles.featureBadgeText}>Job Description Match Analyzer</Text>
                </View>
                <Text style={styles.featureTitle}>Real-Time Match Score & Skills Gap</Text>
                <Text style={styles.featureBody}>
                  Paste any job URL or text. Get an instant compatibility score, breakdown of missing requirements, and suggestions on how to bridge the gap.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>Instant 0–100% Match Calculation</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>Red Flag & Dealbreaker Detection</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>Actionable Rewrite Suggestions</Text>
                  </View>
                </View>
              </View>
              <View style={styles.featureCardVisual}>
                <View style={styles.mockMatchCard}>
                  <View style={styles.matchScoreBadge}>
                    <Text style={styles.matchScoreNumber}>94%</Text>
                    <Text style={styles.matchScoreLabel}>Match Score</Text>
                  </View>
                  <View style={styles.matchItemRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.matchItemText}>Required Skills Matched (9/10)</Text>
                  </View>
                  <View style={styles.matchItemRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.matchItemText}>Experience Level Aligned (5+ Years)</Text>
                  </View>
                  <View style={styles.matchItemRow}>
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={styles.matchItemText}>Missing: Kubernetes Certification</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Feature 3 */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktop : styles.featureRowMobile]}>
              <View style={styles.featureTextCol}>
                <View style={styles.featureBadge}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#1A4F8A" />
                  <Text style={styles.featureBadgeText}>AI Mock Interview Prep</Text>
                </View>
                <Text style={styles.featureTitle}>Practice Realistic Interviews with Instant Feedback</Text>
                <Text style={styles.featureBody}>
                  Simulate rigorous technical and behavioral questions generated directly from your target job description. Receive constructive scoring and talking points.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>Role-Specific Interview Scenarios</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>STAR-Method Answer Coaching</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.pointText}>Confidence & Delivery Insights</Text>
                  </View>
                </View>
              </View>
              <View style={styles.featureCardVisual}>
                <View style={styles.mockChatCard}>
                  <View style={styles.mockChatBubbleAI}>
                    <Text style={styles.mockChatAuthor}>AI Interviewer</Text>
                    <Text style={styles.mockChatText}>
                      "Tell me about a time you optimized a slow database query that was impacting user latency."
                    </Text>
                  </View>
                  <View style={styles.mockChatBubbleFeedback}>
                    <Ionicons name="bulb-outline" size={14} color="#047857" />
                    <Text style={styles.mockChatFeedbackText}>
                      Feedback: Strong use of STAR format. Quantify the throughput metric for higher impact.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. HOW IT WORKS */}
        <View
          style={styles.stepsSection}
          onLayout={(e) => {
            sectionPositions.current['how-it-works'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTag}>
                <Text style={styles.sectionTagText}>SIMPLE 3-STEP PROCESS</Text>
              </View>
              <Text style={styles.sectionTitle}>How Interview Ready Works</Text>
              <Text style={styles.sectionSub}>From blank page to top-tier applicant in 60 seconds.</Text>
            </View>

            <View style={[styles.stepsGrid, isDesktop ? styles.stepsGrid3Col : styles.stepsGrid1Col]}>
              <View style={styles.stepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Paste Target Job</Text>
                <Text style={styles.stepBody}>
                  Paste the job posting URL or raw description text. You can also upload your existing resume or fill in your background.
                </Text>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>AI Generates Tailored Assets</Text>
                <Text style={styles.stepBody}>
                  Our AI extracts keywords, crafts metric-dense experience bullets, and designs an ATS-compliant resume and matching cover letter.
                </Text>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Practice & Ace the Interview</Text>
                <Text style={styles.stepBody}>
                  Download print-ready PDF/DOCX files, run interactive mock interview sessions, and apply with complete confidence.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6. TESTIMONIALS */}
        <View
          style={styles.testimonialsSection}
          onLayout={(e) => {
            sectionPositions.current['testimonials'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTag}>
                <Text style={styles.sectionTagText}>PROVEN OUTCOMES</Text>
              </View>
              <Text style={styles.sectionTitle}>Recruiter Tested & Candidate Approved</Text>
              <Text style={styles.sectionSub}>Real results from candidates who leveled up their applications.</Text>
            </View>

            <View style={[styles.cardsGrid, isDesktop ? styles.cardsGrid3Col : styles.cardsGrid1Col]}>
              {TESTIMONIALS.map((item, idx) => (
                <View key={idx} style={styles.testimonialCard}>
                  <View style={styles.testimonialStars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name="star" size={16} color="#F59E0B" />
                    ))}
                  </View>
                  <Text style={styles.testimonialQuote}>"{item.quote}"</Text>
                  <View style={styles.testimonialFooter}>
                    <View>
                      <Text style={styles.testimonialName}>{item.name}</Text>
                      <Text style={styles.testimonialRole}>{item.role}</Text>
                      <Text style={styles.testimonialPlaced}>{item.placedAt}</Text>
                    </View>
                    <View style={styles.testimonialScoreBadge}>
                      <Text style={styles.testimonialScoreText}>{item.score}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 7. FAQ ACCORDION */}
        <View
          style={styles.faqSection}
          onLayout={(e) => {
            sectionPositions.current['faq'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              <Text style={styles.sectionSub}>Everything you need to know about the platform.</Text>
            </View>

            <View style={styles.faqList}>
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <Pressable
                    key={index}
                    style={styles.faqItem}
                    onPress={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <View style={styles.faqQuestionRow}>
                      <Text style={styles.faqQuestion}>{faq.q}</Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#1A4F8A"
                      />
                    </View>
                    {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* 8. FINAL CONVERSION BANNER */}
        <View style={styles.ctaSection}>
          <View style={styles.container}>
            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>Ready to Land Your Next Role?</Text>
              <Text style={styles.ctaSubtitle}>
                Join thousands of candidates using Interview Ready to build high-scoring resumes and ace their interviews.
              </Text>
              <Pressable style={styles.ctaBtn} onPress={handleGetStarted}>
                <Text style={styles.ctaBtnText}>
                  {session ? 'Launch Dashboard' : 'Get Started for Free'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#1A4F8A" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* 9. FOOTER */}
        <View style={styles.footer}>
          <View style={styles.container}>
            <View style={[styles.footerInner, isDesktop ? styles.footerInnerDesktop : styles.footerInnerMobile]}>
              <View style={styles.footerBrand}>
                <View style={styles.navBrand}>
                  <Image source={require('../../../assets/logo.png')} style={styles.footerLogo} />
                  <Text style={styles.brandText}>Interview Ready</Text>
                </View>
                <Text style={styles.footerTagline}>Paste a job. Land the interview.</Text>
              </View>

              <View style={styles.footerLinks}>
                <Pressable onPress={() => setShowPrivacy(true)}>
                  <Text style={styles.footerLinkText}>Privacy Policy</Text>
                </Pressable>
                <Pressable onPress={() => setShowTerms(true)}>
                  <Text style={styles.footerLinkText}>Terms of Service</Text>
                </Pressable>
                <Text style={styles.footerLinkText}>Support: info@appinterviewready.top</Text>
              </View>
            </View>

            <View style={styles.footerBottom}>
              <Text style={styles.footerCopy}>
                © {new Date().getFullYear()} Interview Ready. All rights reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  container: {
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  // 1. NAVBAR
  navbar: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 0 } as any) : {}),
  },
  navbarInner: {
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
    paddingHorizontal: 20,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLogo: {
    width: 32,
    height: 32,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLinkItem: {
    paddingVertical: 6,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navSecondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  navSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A4F8A',
  },
  navPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A4F8A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    shadowColor: '#1A4F8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  navPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mobileMenuToggle: {
    padding: 8,
    borderRadius: 8,
  },
  mobileDropdown: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  mobileNavText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },

  // 2. HERO
  heroSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 48,
  },
  heroGrid: {
    alignItems: 'center',
    gap: 40,
  },
  heroGridDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroGridMobile: {
    flexDirection: 'column',
  },
  heroLeft: {
    flex: 1,
    maxWidth: 580,
  },
  earlyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 16,
  },
  earlyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
    marginBottom: 18,
  },
  heroTitleAccent: {
    color: '#0EA5E9',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
    marginBottom: 24,
  },
  heroProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  proofAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  proofText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A4F8A',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    shadowColor: '#1A4F8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  heroSecondaryBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  heroDisclaimer: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },

  // HERO SIMULATOR MOCKUP
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: 320,
    backgroundColor: '#0F172A',
    borderRadius: 40,
    padding: 10,
    borderWidth: 5,
    borderColor: '#1E293B',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 8,
  },
  phoneNotch: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  notchPill: {
    width: 48,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  phoneScreen: {
    backgroundColor: '#F8FAFC',
    borderRadius: 30,
    overflow: 'hidden',
    padding: 12,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A4F8A',
    marginHorizontal: -12,
    marginTop: -12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  simBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simBrandText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  simBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  simBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  simTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 10,
  },
  simTab: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 6,
  },
  simTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  simTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  simTabTextActive: {
    color: '#1A4F8A',
    fontWeight: '700',
  },
  simScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  simScoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  simScoreSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  gaugeBox: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeVal: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '800',
  },
  beforeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    position: 'relative',
  },
  stateTagBefore: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 100,
  },
  stateTagBeforeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#DC2626',
  },
  stateTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  stateBody: {
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
    marginTop: 4,
  },
  optimizingRow: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  optimizingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  afterBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 8,
  },
  afterBoxActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateTitleOptimized: {
    fontSize: 8,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
  recruiterBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 100,
  },
  recruiterBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#047857',
  },
  stateBodyOptimized: {
    fontSize: 10,
    lineHeight: 14,
    color: '#0F172A',
    marginTop: 4,
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  kwBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  kwText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  simFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 10,
  },
  simLocation: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  simStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },

  // 3. PROBLEM SECTION
  problemSection: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 64,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 44,
  },
  problemHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A4F8A',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 12,
  },
  sectionTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSub: {
    fontSize: 16,
    lineHeight: 24,
    color: '#64748B',
    maxWidth: 620,
    textAlign: 'center',
  },
  cardsGrid: {
    gap: 24,
  },
  cardsGrid3Col: {
    flexDirection: 'row',
  },
  cardsGrid1Col: {
    flexDirection: 'column',
  },
  problemCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  problemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  problemCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  problemCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },

  // 4. FEATURES SECTION
  featuresSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 72,
  },
  featureRow: {
    alignItems: 'center',
    gap: 40,
    marginVertical: 36,
  },
  featureRowDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureRowDesktopReverse: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  featureRowMobile: {
    flexDirection: 'column',
  },
  featureTextCol: {
    flex: 1,
    maxWidth: 520,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 12,
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  featureTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 36,
    marginBottom: 14,
  },
  featureBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#64748B',
    marginBottom: 20,
  },
  featurePoints: {
    gap: 10,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  featureCardVisual: {
    flex: 1,
    maxWidth: 460,
    width: '100%',
  },
  mockResumeCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  mockResumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  mockDotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockResumeFormat: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  mockLineHeader: {
    width: '60%',
    height: 14,
    backgroundColor: '#1A4F8A',
    borderRadius: 4,
    marginBottom: 8,
  },
  mockLineSub: {
    width: '85%',
    height: 8,
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
    marginBottom: 16,
  },
  mockBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  mockBadgeItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  mockMatchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  matchScoreBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  matchScoreNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#047857',
  },
  matchScoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 2,
  },
  matchItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  mockChatCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    padding: 24,
    gap: 14,
  },
  mockChatBubbleAI: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 14,
  },
  mockChatAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A4F8A',
    marginBottom: 4,
  },
  mockChatText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1E293B',
  },
  mockChatBubbleFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
  },
  mockChatFeedbackText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#065F46',
    flex: 1,
    fontWeight: '500',
  },

  // 5. HOW IT WORKS
  stepsSection: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 72,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stepsGrid: {
    gap: 24,
  },
  stepsGrid3Col: {
    flexDirection: 'row',
  },
  stepsGrid1Col: {
    flexDirection: 'column',
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A4F8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },

  // 6. TESTIMONIALS
  testimonialsSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 72,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  testimonialCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  testimonialStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
  },
  testimonialQuote: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 18,
  },
  testimonialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  testimonialRole: {
    fontSize: 12,
    color: '#64748B',
  },
  testimonialPlaced: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A4F8A',
    marginTop: 2,
  },
  testimonialScoreBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testimonialScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A4F8A',
  },

  // 7. FAQ
  faqSection: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 72,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  faqList: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    padding: 20,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },

  // 8. FINAL CTA
  ctaSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 72,
  },
  ctaCard: {
    backgroundColor: '#1A4F8A',
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    textAlign: 'center',
    shadowColor: '#1A4F8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#DBEAFE',
    maxWidth: 580,
    textAlign: 'center',
    marginBottom: 28,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    color: '#1A4F8A',
    fontSize: 16,
    fontWeight: '700',
  },

  // 9. FOOTER
  footer: {
    backgroundColor: '#0F172A',
    paddingVertical: 48,
  },
  footerInner: {
    gap: 24,
    alignItems: 'center',
  },
  footerInnerDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerInnerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  footerBrand: {
    gap: 6,
  },
  footerLogo: {
    width: 28,
    height: 28,
  },
  footerTagline: {
    fontSize: 13,
    color: '#94A3B8',
  },
  footerLinks: {
    gap: 12,
    alignItems: 'flex-start',
  },
  footerLinkText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 24,
    marginTop: 32,
    alignItems: 'center',
  },
  footerCopy: {
    fontSize: 12,
    color: '#64748B',
  },
});
