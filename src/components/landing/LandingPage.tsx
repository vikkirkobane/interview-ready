import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
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
    q: 'Is it free to use?',
    a: 'Yes. Core formatting templates and general drafting are free of charge. No credit card is required to join or create an account.',
  },
  {
    q: 'What makes Interview Ready different from general AI writing bots?',
    a: 'Unlike generic templates, Interview Ready explicitly matches recruiter-tested phrasing structures and integrates specific industry keywords. It generates documents designed from ground up to satisfy modern ATS screeners.',
  },
  {
    q: 'Which industries or professions does it support?',
    a: 'We offer universal profession support. It works dynamically for developers, healthcare administrators, nurses, lawyers, teachers, NGO workers, hospitality staff, accountants, and beyond.',
  },
  {
    q: 'Can I export directly to Microsoft Word format?',
    a: 'Yes. Every output generated exports directly in dual formats: an editable Microsoft Word (DOCX) file for personalized adjustments, and a print-ready PDF layout.',
  },
  {
    q: 'Is my work history data secure?',
    a: 'Your privacy is fully protected. All data processed is encrypted and never shared with secondary brokers or utilized for generic model training. You retain total ownership of your records.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Samuel O.',
    role: 'Software Engineer',
    location: 'Nairobi, Kenya',
    image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?q=80&w=120&auto=format&fit=crop',
    quote: 'I submitted three applications utilizing the optimized cv format from Interview Ready. Within a single week, I received interview callbacks from all three companies. The achievements generated were far more metrics-focused than what I could write myself.',
    score: '98% ATS Match',
  },
  {
    name: 'Amina K.',
    role: 'Registered Nurse',
    location: 'Lagos, Nigeria',
    image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=120&auto=format&fit=crop',
    quote: 'Applying to healthcare roles in the UK meant meeting strict documentation standards. Interview Ready aligned my achievements and CV layout perfectly on the first attempt. Recommending this to every healthcare peer looking to relocate.',
    score: '96% ATS Match',
  },
  {
    name: 'David M.',
    role: 'Finance Analyst',
    location: 'Accra, Ghana',
    image: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=120&auto=format&fit=crop',
    quote: 'The accompanying cover letter written by the editor was remarkably natural and company-specific. My interviewer literally highlighted my professional story during our initial discussion. This is a game-changer for applications.',
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
  const [simulatedScore, setSimulatedScore] = useState(activeDemo.optimizedScore);
  const [simulatedText, setSimulatedText] = useState(activeDemo.optimizedText);
  const [showOptimized, setShowOptimized] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Smooth Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scoreCounterRef = useRef<any>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<{ [key: string]: number }>({});
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);
    };
  }, []);

  const handleSelectDemo = (demo: ProfessionDemo) => {
    if (demo.id === activeDemo.id && !isOptimizing) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);

    setActiveDemo(demo);
    setIsOptimizing(true);
    setShowOptimized(false);
    setSimulatedScore(demo.originalScore);
    setSimulatedText(demo.originalText);

    // Smooth subtle fade & scale down
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.35,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // After brief optimization pulse, smoothly animate score upward and fade in
    timerRef.current = setTimeout(() => {
      let currentScore = demo.originalScore;
      const targetScore = demo.optimizedScore;
      const step = Math.max(1, Math.floor((targetScore - currentScore) / 8));

      scoreCounterRef.current = setInterval(() => {
        currentScore += step;
        if (currentScore >= targetScore) {
          currentScore = targetScore;
          clearInterval(scoreCounterRef.current);
        }
        setSimulatedScore(currentScore);
      }, 30);

      setSimulatedText(demo.optimizedText);
      setShowOptimized(true);
      setIsOptimizing(false);

      // Smooth fade and spring in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);
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
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 70), animated: true });
    }
  };

  return (
    <View style={styles.root}>
      {/* 1. STICKY NAVBAR */}
      <View style={styles.navbar}>
        <View style={[styles.navbarInner, !isDesktop && styles.navbarInnerMobile]}>
          {/* Left Group: Brand + Desktop Nav Links */}
          <View style={styles.navLeftGroup}>
            <Pressable
              style={styles.navBrand}
              onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
            >
              <Image
                source={require('../../../assets/logo.png')}
                style={[styles.navLogo, !isDesktop && styles.navLogoMobile]}
                contentFit="contain"
              />
              <Text style={[styles.brandText, !isDesktop && styles.brandTextMobile]} numberOfLines={1}>
                Interview Ready
              </Text>
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
          </View>

          {/* Nav Right CTA */}
          <View style={[styles.navRight, !isDesktop && styles.navRightMobile]}>
            {session ? (
              <Pressable
                style={[styles.navPrimaryBtn, !isDesktop && styles.navPrimaryBtnMobile]}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={[styles.navPrimaryBtnText, !isDesktop && styles.navPrimaryBtnTextMobile]}>
                  {width < 380 ? 'Dashboard' : 'Go to Dashboard'}
                </Text>
                {isDesktop && <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />}
              </Pressable>
            ) : (
              <>
                {isDesktop && (
                  <Pressable style={styles.navSecondaryBtn} onPress={handleSignIn}>
                    <Text style={styles.navSecondaryBtnText}>Sign In</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.navPrimaryBtn, !isDesktop && styles.navPrimaryBtnMobile]}
                  onPress={handleGetStarted}
                >
                  <Text style={[styles.navPrimaryBtnText, !isDesktop && styles.navPrimaryBtnTextMobile]}>Get Started</Text>
                  {isDesktop && <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />}
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
                <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={22} color="#0F172A" />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.mobileNavText}>Testimonials</Text>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedTagText}>VERIFIED</Text>
                </View>
              </View>
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
            <Pressable style={[styles.heroPrimaryBtn, { marginTop: 12 }]} onPress={handleGetStarted}>
              <Text style={styles.heroPrimaryBtnText}>Get Started for Free</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
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
                <Text style={styles.heroTitle}>
                  Land More{'\n'}
                  <Text style={styles.heroTitleAccent}>Interviews Faster.</Text>
                </Text>

                <Text style={styles.heroSubtitle}>
                  Interview Ready writes, formats, and exports professional resumes and cover letters in seconds. ATS-optimized, recruiter-tested, and tailored to any job description you target.
                </Text>

                {/* Social Proof Avatars */}
                <View style={styles.heroProof}>
                  <View style={styles.proofAvatars}>
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=120&auto=format&fit=crop' }}
                      style={[styles.avatarImg, { zIndex: 3 }]}
                      contentFit="cover"
                    />
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=120&auto=format&fit=crop' }}
                      style={[styles.avatarImg, { marginLeft: -8, zIndex: 2 }]}
                      contentFit="cover"
                    />
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=120&auto=format&fit=crop' }}
                      style={[styles.avatarImg, { marginLeft: -8, zIndex: 1 }]}
                      contentFit="cover"
                    />
                  </View>
                  <Text style={styles.proofText}>Early Access open for ambitious African professionals.</Text>
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
                  Free to start • No subscription required for core formatting tools.
                </Text>
              </View>

              {/* Right Column: High-Fidelity Phone Mockup with Live Interactive Simulator */}
              <View style={styles.heroRight}>
                {/* Glow Accent behind phone */}
                <View style={styles.phoneGlow} />

                {/* Phone Shell */}
                <View style={[styles.phoneFrame, Platform.OS === 'web' && ({ className: 'phone-float' } as any)]}>
                  {/* Speaker / Notch */}
                  <View style={styles.phoneNotch}>
                    <View style={styles.notchPill} />
                  </View>

                  {/* Internal Screen */}
                  <View style={styles.phoneScreen}>
                    {/* Simulator App Header */}
                    <View style={styles.simHeader}>
                      <View style={styles.simBrand}>
                        <Image
                          source={require('../../../assets/logo.png')}
                          style={styles.simLogo}
                          contentFit="contain"
                        />
                        <Text style={styles.simBrandText}>Interview Ready</Text>
                      </View>
                      <View style={styles.simBadge}>
                        <Text style={styles.simBadgeText}>AI Active</Text>
                      </View>
                    </View>

                    {/* Simulator Content Area */}
                    <View style={styles.simContent}>
                      {/* Select Profession Title */}
                      <View style={styles.simTitleWrap}>
                        <Text style={styles.simSubtitleUpper}>ATS OPTIMIZER ENGINE</Text>
                        <Text style={styles.simSubtitle}>Select a beta user profile:</Text>
                      </View>

                      {/* Mini Tabs */}
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

                      {/* Animated Score Gauge Card */}
                      <Animated.View
                        style={[
                          styles.simScoreCard,
                          {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                          },
                        ]}
                      >
                        <View>
                          <Text style={styles.simScoreLabel}>ATS MATCH SCORE</Text>
                          <Text style={styles.simScoreSub}>Resume Compatibility</Text>
                        </View>
                        <View style={styles.gaugeBox}>
                          <Svg width={44} height={44} viewBox="0 0 44 44">
                            <Circle cx="22" cy="22" r="18" stroke="#E5E7EB" strokeWidth="3" fill="none" />
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
                          <Text style={[styles.gaugeVal, { color: simulatedScore > 60 ? '#10B981' : '#EF4444' }]}>
                            {simulatedScore}%
                          </Text>
                        </View>
                      </Animated.View>

                      {/* Original vs Optimized Bullet Content */}
                      <Animated.View
                        style={[
                          styles.bulletArea,
                          {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                          },
                        ]}
                      >
                        {/* Before State */}
                        <View style={styles.beforeBox}>
                          <View style={styles.stateTagBefore}>
                            <Text style={styles.stateTagBeforeText}>Weak CV</Text>
                          </View>
                          <Text style={styles.stateTitleBefore}>BEFORE AI TREATMENT</Text>
                          <Text style={styles.stateBodyBefore}>{activeDemo.originalText}</Text>
                        </View>

                        {/* AI Conversion Process Indicator */}
                        {isOptimizing ? (
                          <View style={styles.optimizingRow}>
                            <View style={styles.pingDot} />
                            <Text style={styles.optimizingText}>ATS KEYWORD INJECTOR...</Text>
                          </View>
                        ) : (
                          <View style={{ height: 16 }} />
                        )}

                        {/* After State */}
                        <View style={[styles.afterBox, showOptimized && styles.afterBoxActive]}>
                          <View style={styles.stateHeader}>
                            <Text style={styles.stateTitleOptimized}>INTERVIEW READY CV</Text>
                            {showOptimized && (
                              <View style={styles.recruiterBadge}>
                                <Text style={styles.recruiterBadgeText}>Recruiter Proof ✓</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.stateBodyOptimized}>
                            {simulatedText}
                          </Text>
                        </View>

                        {/* Keyword badging */}
                        {!isOptimizing && showOptimized && (
                          <View style={styles.keywordsWrap}>
                            {activeDemo.keywords.map((kw, i) => (
                              <View key={i} style={styles.kwBadge}>
                                <Text style={styles.kwText}>+ {kw}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </Animated.View>
                    </View>

                    {/* Simulated Device Action Bar */}
                    <View style={styles.simFooter}>
                      <Text style={styles.simLocation}>{activeDemo.location}</Text>
                      <View style={styles.simStatus}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={styles.simStatusText}>Keywords Injected</Text>
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
                Applying to global remote roles or local corporations should not feel like gambling. Traditional resumes fail silently without you ever knowing why.
              </Text>
            </View>

            <View style={[styles.cardsGrid, isDesktop ? styles.cardsGrid3Col : styles.cardsGrid1Col]}>
              <View style={styles.problemCard}>
                <View style={styles.problemIconWrap}>
                  <Ionicons name="alert-circle" size={24} color="#1A4F8A" />
                </View>
                <Text style={styles.problemCardTitle}>The ATS Blocker</Text>
                <Text style={styles.problemCardBody}>
                  Applicant Tracking Systems filter out up to 75% of submissions before a human recruiter even sees them. If you lack the exact keywords, you get rejected instantly.
                </Text>
              </View>

              <View style={styles.problemCard}>
                <View style={styles.problemIconWrap}>
                  <Ionicons name="time" size={24} color="#1A4F8A" />
                </View>
                <Text style={styles.problemCardTitle}>The Time Sink</Text>
                <Text style={styles.problemCardBody}>
                  Writing a customized cover letter and tweaking your professional bio for every single position description takes hours. You lose momentum before you even submit.
                </Text>
              </View>

              <View style={styles.problemCard}>
                <View style={styles.problemIconWrap}>
                  <Ionicons name="layers" size={24} color="#1A4F8A" />
                </View>
                <Text style={styles.problemCardTitle}>The Formatting Nightmare</Text>
                <Text style={styles.problemCardBody}>
                  Word files break across operating systems, and automated reading scripts garble PDF headers. If your layout is wrong, your application is disqualified.
                </Text>
              </View>
            </View>

            {/* Transition pivot line */}
            <View style={styles.problemPivot}>
              <Text style={styles.pivotText}>That's exactly why we built Interview Ready.</Text>
              <Pressable
                style={styles.pivotLink}
                onPress={() => scrollToSection('how-it-works')}
              >
                <Text style={styles.pivotLinkText}>SEE HOW IT WORKS</Text>
                <Ionicons name="chevron-down" size={16} color="#1A4F8A" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* 4. CORE FEATURES SECTION (Alternating Rows) */}
        <View
          style={styles.featuresSection}
          onLayout={(e) => {
            sectionPositions.current['features'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            {/* Feature 1: AI Resume Tailoring */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktop : styles.featureRowMobile]}>
              <View style={styles.featureVisualCol}>
                <View style={styles.graphicCard}>
                  <View style={styles.graphicHeader}>
                    <View style={styles.mockDotRow}>
                      <View style={[styles.mockDot, { backgroundColor: '#E2E8F0' }]} />
                      <View style={[styles.mockDot, { backgroundColor: '#CBD5E1' }]} />
                      <View style={[styles.mockDot, { backgroundColor: 'rgba(26, 79, 138, 0.3)' }]} />
                    </View>
                    <Text style={styles.graphicFormatTag}>PDF + DOCX ready</Text>
                  </View>
                  <View style={styles.mockTemplateContent}>
                    <View style={{ width: '35%', height: 14, backgroundColor: 'rgba(26, 79, 138, 0.25)', borderRadius: 6, marginBottom: 8 }} />
                    <View style={{ width: '100%', height: 10, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 12 }} />
                    <View style={styles.mockBulletItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <View style={styles.mockBulletBadge}>
                        <Text style={styles.mockBulletBadgeText}>Tailored bullet achievements</Text>
                      </View>
                    </View>
                    <View style={[styles.mockBulletItem, { marginTop: 6 }]}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <View style={{ width: '80%', height: 10, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                    </View>
                    <View style={styles.mockDownloadRow}>
                      <View style={styles.mockDownloadPill}>
                        <Ionicons name="download-outline" size={12} color="#475569" />
                        <Text style={styles.mockDownloadPillText}>Resume.pdf</Text>
                      </View>
                      <View style={styles.mockDownloadPill}>
                        <Ionicons name="download-outline" size={12} color="#475569" />
                        <Text style={styles.mockDownloadPillText}>Resume.docx</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.featureTextCol}>
                <Text style={styles.featureNumber}>01</Text>
                <Text style={styles.featureTitle}>AI Resume Tailoring</Text>
                <Text style={styles.featureBody}>
                  Simply paste your existing work history alongside your target job description. Our engine immediately drafts a professional resume structured with correct keywords, strong metric-driven verbs, and clean summaries.
                </Text>
                <Text style={styles.featureBenefit}>
                  <Text style={styles.benefitLabel}>Benefit: </Text>
                  Creates tailored resume drafts in 30 seconds instead of hours, completely meeting international ATS standards.
                </Text>
              </View>
            </View>

            {/* Feature 2: Recruiter-Tested Cover Letters */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktopReverse : styles.featureRowMobile]}>
              <View style={styles.featureVisualCol}>
                <View style={styles.graphicCard}>
                  <View style={styles.graphicHeader}>
                    <View style={[styles.mockDot, { backgroundColor: '#CBD5E1' }]} />
                    <Text style={styles.graphicFormatTag}>Cover Letter Writer</Text>
                  </View>
                  <View style={styles.mockLetterContent}>
                    <Text style={styles.mockLetterTo}>To: hiring@company.com</Text>
                    <View style={styles.mockLetterSubjectBox}>
                      <Text style={styles.mockLetterSubjectText}>Subject: Applying for Remote Role</Text>
                    </View>
                    <Text style={styles.mockLetterSalutation}>"Dear Hiring Manager,"</Text>
                    <View style={styles.mockLetterBodyBox}>
                      <Text style={styles.mockLetterBodyText}>
                        Instead of summarizing my resume, I want to share how I solved budget variance challenges...
                      </Text>
                    </View>
                    <View style={{ width: '100%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 8 }} />
                    <View style={{ width: '75%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 4 }} />
                  </View>
                </View>
              </View>

              <View style={styles.featureTextCol}>
                <Text style={styles.featureNumber}>02</Text>
                <Text style={styles.featureTitle}>Recruiter-Tested Cover Letters</Text>
                <Text style={styles.featureBody}>
                  Generate high-conversion cover letters calibrated to 280–380 words. Instead of stale layouts, our letter structure writes in a specific, metric-backed professional voice optimized for readability and emotional engagement.
                </Text>
                <Text style={styles.featureBenefit}>
                  <Text style={styles.benefitLabel}>Benefit: </Text>
                  Delivers narrative cover letters written in your human voice, not a repetitive corporate bot template.
                </Text>
              </View>
            </View>

            {/* Feature 3: ATS Keyword Integration */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktop : styles.featureRowMobile]}>
              <View style={styles.featureVisualCol}>
                <View style={styles.graphicCard}>
                  <Text style={styles.graphicHeaderSmall}>JOB DESCRIPTION KEY TERMS</Text>
                  <View style={styles.mockKeywordsGrid}>
                    <View style={styles.mockKwBadgeActive}>
                      <Text style={styles.mockKwBadgeActiveText}>✓ Cloud Architecture</Text>
                    </View>
                    <View style={styles.mockKwBadgeActive}>
                      <Text style={styles.mockKwBadgeActiveText}>✓ Budget Control</Text>
                    </View>
                    <View style={styles.mockKwBadgeActive}>
                      <Text style={styles.mockKwBadgeActiveText}>✓ Metric-Driven</Text>
                    </View>
                    <View style={styles.mockKwBadgeInactive}>
                      <Text style={styles.mockKwBadgeInactiveText}>CI/CD Pipeline</Text>
                    </View>
                    <View style={styles.mockKwBadgeInactive}>
                      <Text style={styles.mockKwBadgeInactiveText}>Patient Safety</Text>
                    </View>
                  </View>
                  <View style={styles.mockVerdictBox}>
                    <Text style={styles.mockVerdictLabel}>ATS OPTIMIZER VERDICT</Text>
                    <Text style={styles.mockVerdictText}>Top 15 keywords naturally integrated into work achievements.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.featureTextCol}>
                <Text style={styles.featureNumber}>03</Text>
                <Text style={styles.featureTitle}>ATS Keyword Integration</Text>
                <Text style={styles.featureBody}>
                  Our technology performs a comparative analysis of your bio against the target job profile. It extracts missing skills and inserts the top 15–20 high-value terms into your experience statements logically and gracefully.
                </Text>
                <Text style={styles.featureBenefit}>
                  <Text style={styles.benefitLabel}>Benefit: </Text>
                  Clears applicant screening filters so your submission lands directly on human recruiter desks for actual review.
                </Text>
              </View>
            </View>

            {/* Feature 4: Universal Careers & Word Export */}
            <View style={[styles.featureRow, isDesktop ? styles.featureRowDesktopReverse : styles.featureRowMobile]}>
              <View style={styles.featureVisualCol}>
                <View style={[styles.graphicCard, { alignItems: 'center' }]}>
                  <View style={styles.mockDualGrid}>
                    <View style={styles.mockDualBox}>
                      <Ionicons name="globe-outline" size={16} color="#1A4F8A" />
                      <Text style={styles.mockDualText}>GLOBAL REMOTE</Text>
                    </View>
                    <View style={styles.mockDualBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.mockDualText}>RECRUITER VERIFIED</Text>
                    </View>
                  </View>
                  <Pressable style={styles.mockBundleBtn} onPress={handleGetStarted}>
                    <Ionicons name="download" size={14} color="#FFFFFF" />
                    <Text style={styles.mockBundleBtnText}>Download DOCX + PDF Bundle</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.featureTextCol}>
                <Text style={styles.featureNumber}>04</Text>
                <Text style={styles.featureTitle}>Universal Careers & Word Export</Text>
                <Text style={styles.featureBody}>
                  Whether you are an engineer in Nairobi, a registered nurse in Lagos, or an analyst in Accra, Interview Ready caters to every profession. Download your custom documents in both print-ready PDF and editable DOCX formats.
                </Text>
                <Text style={styles.featureBenefit}>
                  <Text style={styles.benefitLabel}>Benefit: </Text>
                  Provides fully formatted Microsoft Word-compatible layouts. You maintain 100% control with no hidden file locks or fees.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. HOW IT WORKS (3 Steps) */}
        <View
          style={styles.stepsSection}
          onLayout={(e) => {
            sectionPositions.current['how-it-works'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <Text style={styles.problemHeading}>Three Steps to Your Next Callback</Text>
              <Text style={styles.sectionSub}>
                We eliminated the complex setup. Prepare polished, targeted applications in under three minutes.
              </Text>
            </View>

            <View style={[styles.stepsGrid, isDesktop ? styles.stepsGrid3Col : styles.stepsGrid1Col]}>
              <View style={styles.stepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>01</Text>
                </View>
                <Text style={styles.stepTitle}>Input Your Work History</Text>
                <Text style={styles.stepBody}>
                  Type in your general experience details or simply paste a draft of your current raw curriculum vitae.
                </Text>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>02</Text>
                </View>
                <Text style={styles.stepTitle}>Paste Target Job Spec</Text>
                <Text style={styles.stepBody}>
                  Copy the text of the job description from LinkedIn, BrighterMonday, or any application portal.
                </Text>
              </View>

              <View style={styles.stepCard}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#1A4F8A' }]}>
                  <Text style={[styles.stepNumberText, { color: '#FFFFFF' }]}>03</Text>
                </View>
                <Text style={styles.stepTitle}>Download DOCX & PDF</Text>
                <Text style={styles.stepBody}>
                  Export ATS-optimized achievements and a custom cover letter formatted perfectly for instant submission.
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 36 }}>
              <Pressable style={styles.heroPrimaryBtn} onPress={handleGetStarted}>
                <Text style={styles.heroPrimaryBtnText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* 5.5 CORPORATE APPROVALS & PARTNERS */}
        <View style={styles.partnersSection}>
          <View style={styles.container}>
            <Text style={styles.partnersTag}>CORPORATE APPROVALS</Text>
            <Text style={styles.partnersSub}>
              Ecosystem partners supporting the next wave of African professional talent
            </Text>
            <View style={styles.partnersGrid}>
              {/* Partner 1: Tunga Academy */}
              <View style={styles.partnerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E33439', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '900' }}>TUNGA</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#1E3146', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>TUNGA</Text>
                    <Text style={{ color: '#64748B', fontSize: 8, fontWeight: '700', letterSpacing: 1 }}>ACADEMY</Text>
                  </View>
                </View>
              </View>

              {/* Partner 2: StartHub Africa */}
              <View style={styles.partnerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Svg width={28} height={32} viewBox="0 0 44 50">
                    <Path d="M20,5 C10,12 8,25 15,33 C18,36 21,41 21,45" stroke="#851C1D" strokeWidth="4" strokeLinecap="round" fill="none" />
                    <Path d="M24,5 C34,12 36,25 29,33 C26,36 23,41 23,45" stroke="#E6A024" strokeWidth="4" strokeLinecap="round" fill="none" />
                    <Circle cx="22" cy="12" r="4" fill="#1F3245" />
                  </Svg>
                  <View>
                    <Text style={{ color: '#1F3245', fontSize: 16, fontWeight: '800' }}>StartHub</Text>
                    <Text style={{ color: '#425E34', fontSize: 8, fontWeight: '700', letterSpacing: 1 }}>AFRICA</Text>
                  </View>
                </View>
              </View>

              {/* Partner 3: VC4A */}
              <View style={styles.partnerCard}>
                <View>
                  <Text style={{ color: '#0F172A', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }}>
                    VC4<Text style={{ color: '#009688' }}>A</Text>
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: 8, fontWeight: '700', letterSpacing: 1 }}>ECOSYSTEM</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 6. TESTIMONIALS & RESULTS */}
        <View
          style={styles.testimonialsSection}
          onLayout={(e) => {
            sectionPositions.current['testimonials'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.container}>
            <View style={styles.sectionHeader}>
              <Text style={styles.partnersTag}>BETA USER RESULTS</Text>
              <Text style={styles.problemHeading}>Ambitious professionals are getting callbacks.</Text>
            </View>

            <View style={[styles.cardsGrid, isDesktop ? styles.cardsGrid3Col : styles.cardsGrid1Col]}>
              {TESTIMONIALS.map((item, idx) => (
                <View key={idx} style={styles.testimonialCard}>
                  <View style={styles.testimonialStars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name="star" size={16} color="#0EA5E9" />
                    ))}
                  </View>
                  <Text style={styles.testimonialQuote}>"{item.quote}"</Text>
                  <View style={styles.testimonialFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Image source={{ uri: item.image }} style={styles.testimonialAvatar} contentFit="cover" />
                      <View>
                        <Text style={styles.testimonialName}>{item.name}</Text>
                        <Text style={styles.testimonialRole}>{item.role}</Text>
                        <Text style={styles.testimonialPlaced}>{item.location}</Text>
                      </View>
                    </View>
                    <View style={styles.testimonialScoreBadge}>
                      <Text style={styles.testimonialScoreText}>{item.score}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Aggregate metrics bar */}
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>10,000+</Text>
                <Text style={styles.metricLabel}>RESUMES GENERATED</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricNumber, { color: '#0F172A' }]}>94%</Text>
                <Text style={styles.metricLabel}>INTERVIEW RATE INCREASE</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>DOCX + PDF</Text>
                <Text style={styles.metricLabel}>INSTANT DUAL EXPORT</Text>
              </View>
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
              <Text style={styles.problemHeading}>Frequently Asked Questions</Text>
              <Text style={styles.sectionSub}>
                Have questions about how Interview Ready can help your application? Find your answers below.
              </Text>
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
                        size={18}
                        color={isOpen ? '#1A4F8A' : '#94A3B8'}
                      />
                    </View>
                    {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* 8. FINAL CONVERSION CTA */}
        <View style={styles.ctaSection}>
          <View style={styles.container}>
            <View style={styles.ctaCard}>
              <View style={styles.earlyBadge}>
                <Text style={styles.earlyBadgeText}>EARLY ACCESS PRIORITY</Text>
              </View>
              <Text style={styles.ctaTitle}>Your next opportunity is one application away.</Text>
              <Text style={styles.ctaSub}>
                Join the priority queue today. Prepare tailored resumes and cover letters in under 3 minutes and boost your interview callback rate.
              </Text>
              <View style={styles.ctaActions}>
                <Pressable style={styles.heroPrimaryBtn} onPress={handleGetStarted}>
                  <Text style={styles.heroPrimaryBtnText}>Get Started for Free</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
                {!session && (
                  <Pressable style={styles.heroSecondaryBtn} onPress={handleSignIn}>
                    <Text style={styles.heroSecondaryBtnText}>Sign In</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.ctaDisclaimer}>Free to start • Standard privacy policies apply.</Text>
            </View>
          </View>
        </View>

        {/* 9. FOOTER */}
        <View style={styles.footer}>
          <View style={styles.container}>
            <View style={styles.footerGrid}>
              <View style={styles.footerColMain}>
                <View style={styles.footerBrand}>
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={[styles.navLogo, { tintColor: '#FFFFFF' }]}
                    contentFit="contain"
                  />
                  <Text style={styles.footerBrandText}>Interview Ready</Text>
                </View>
                <Text style={styles.footerTagline}>
                  We build automated career utilities for ambitious professionals across Africa and beyond, helping candidates compete on a global scale.
                </Text>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerHeading}>Product</Text>
                <Pressable onPress={() => scrollToSection('features')}><Text style={styles.footerLink}>Features</Text></Pressable>
                <Pressable onPress={() => scrollToSection('how-it-works')}><Text style={styles.footerLink}>How It Works</Text></Pressable>
                <Pressable onPress={() => scrollToSection('testimonials')}><Text style={styles.footerLink}>Testimonials</Text></Pressable>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerHeading}>Legal & Support</Text>
                <Pressable onPress={() => setShowPrivacy(true)}><Text style={styles.footerLink}>Privacy Policy</Text></Pressable>
                <Pressable onPress={() => setShowTerms(true)}><Text style={styles.footerLink}>Terms of Service</Text></Pressable>
                <Text style={styles.footerLink}>Support: info@appinterviewready.top</Text>
              </View>
            </View>

            <View style={styles.footerBottom}>
              <Text style={styles.copyright}>© 2026 Interview Ready. All rights reserved.</Text>
              <View style={styles.footerSocials}>
                <Pressable
                  onPress={() => Linking.openURL('https://www.linkedin.com/company/interview-ready-app')}
                  accessibilityLabel="Visit Interview Ready on LinkedIn"
                  style={styles.socialBtn}
                >
                  <Ionicons name="logo-linkedin" size={20} color="#93C5FD" />
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL('https://twitter.com')}
                  accessibilityLabel="Visit Interview Ready on Twitter"
                  style={styles.socialBtn}
                >
                  <Ionicons name="logo-twitter" size={20} color="#93C5FD" />
                </Pressable>
              </View>
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
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: '100%',
    maxWidth: 1120,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
  },

  // 1. NAVBAR
  navbar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 50,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backdropFilter: 'blur(12px)',
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
  navbarInnerMobile: {
    paddingHorizontal: 16,
    gap: 10,
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
  navLogoMobile: {
    width: 26,
    height: 26,
  },
  brandText: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  brandTextMobile: {
    fontSize: 16,
    letterSpacing: -0.3,
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
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  navRightMobile: {
    gap: 8,
  },
  navSecondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
  },
  navSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  navPrimaryBtn: {
    backgroundColor: '#1A4F8A',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#1A4F8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  navPrimaryBtnMobile: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 0,
  },
  navPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navPrimaryBtnTextMobile: {
    fontSize: 13,
    fontWeight: '700',
  },
  mobileMenuToggle: {
    padding: 6,
  },
  mobileDropdown: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  mobileNavText: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  verifiedTag: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 0.5,
  },

  // 2. HERO
  heroSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 64,
    overflow: 'hidden',
  },
  heroGrid: {
    alignItems: 'center',
    gap: 48,
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
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phoneGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderRadius: 140,
    filter: 'blur(48px)' as any,
  },
  earlyBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  earlyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 56,
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  heroTitleAccent: {
    color: '#0EA5E9',
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: '#475569',
    fontWeight: '400',
    marginBottom: 24,
  },
  heroProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  proofAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  proofText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroPrimaryBtn: {
    backgroundColor: '#1A4F8A',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1A4F8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  heroPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSecondaryBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Radius.xl,
  },
  heroSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  heroDisclaimer: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // PHONE MOCKUP
  phoneFrame: {
    width: 330,
    minHeight: 560,
    backgroundColor: '#0D1117',
    borderRadius: 44,
    borderWidth: 6,
    borderColor: '#1E293B',
    padding: 10,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  phoneNotch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
    height: 22,
    backgroundColor: '#0D1117',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notchPill: {
    width: 44,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
  },
  phoneScreen: {
    borderRadius: 34,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    flex: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  simHeader: {
    backgroundColor: '#1A4F8A',
    paddingTop: 24,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simLogo: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
  },
  simBrandText: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  simBadge: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  simBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  simContent: {
    padding: 12,
    gap: 10,
  },
  simTitleWrap: {
    alignItems: 'center',
  },
  simSubtitleUpper: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  simSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  simTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    borderRadius: Radius.lg,
    gap: 3,
  },
  simTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: Radius.md,
    ...(Platform.OS === 'web' ? ({ transition: 'all 0.2s ease-in-out' } as any) : {}),
  },
  simTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  simTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  simTabTextActive: {
    color: '#1A4F8A',
  },
  simScoreCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: Radius.xl,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  simScoreLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  simScoreSub: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  gaugeBox: {
    width: 44,
    height: 44,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeVal: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '800',
  },
  bulletArea: {
    gap: 8,
  },
  beforeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: Radius.lg,
    padding: 10,
    position: 'relative',
  },
  stateTagBefore: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stateTagBeforeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B91C1C',
  },
  stateTitleBefore: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stateBodyBefore: {
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
  },
  optimizingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A4F8A',
  },
  optimizingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 0.6,
  },
  afterBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    padding: 10,
  },
  afterBoxActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stateTitleOptimized: {
    fontSize: 8,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  recruiterBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recruiterBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#065F46',
  },
  stateBodyOptimized: {
    fontSize: 10,
    lineHeight: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  kwBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kwText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  simFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simLocation: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  simStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },

  // 3. PROBLEM STATEMENT
  problemSection: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionHeader: {
    textAlign: 'center',
    alignItems: 'center',
    maxWidth: 640,
    marginHorizontal: 'auto',
    marginBottom: 48,
  },
  problemHeading: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 32,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: -0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSub: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.xl,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  problemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  problemCardTitle: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  problemCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  problemPivot: {
    alignItems: 'center',
    marginTop: 48,
    gap: 8,
  },
  pivotText: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  pivotLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  pivotLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 1,
  },

  // 4. FEATURES (ALTERNATING ROWS)
  featuresSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  featureRow: {
    alignItems: 'center',
    gap: 48,
    marginBottom: 80,
  },
  featureRowDesktop: {
    flexDirection: 'row',
  },
  featureRowDesktopReverse: {
    flexDirection: 'row-reverse',
  },
  featureRowMobile: {
    flexDirection: 'column',
  },
  featureTextCol: {
    flex: 1,
    maxWidth: 540,
  },
  featureVisualCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureNumber: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 28,
    fontWeight: '800',
    color: 'rgba(14, 165, 233, 0.4)',
    letterSpacing: 3,
    marginBottom: 6,
  },
  featureTitle: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  featureBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 16,
  },
  featureBenefit: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  benefitLabel: {
    fontWeight: '800',
    color: '#1A4F8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  graphicCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  graphicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  graphicHeaderSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  graphicFormatTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  mockDotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  mockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockTemplateContent: {
    paddingTop: 16,
  },
  mockBulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockBulletBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mockBulletBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  mockDownloadRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  mockDownloadPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mockDownloadPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  mockLetterContent: {
    paddingTop: 12,
    gap: 8,
  },
  mockLetterTo: {
    fontSize: 9,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  mockLetterSubjectBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mockLetterSubjectText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: '#1E293B',
  },
  mockLetterSalutation: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A4F8A',
  },
  mockLetterBodyBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 8,
    padding: 8,
  },
  mockLetterBodyText: {
    fontSize: 10,
    lineHeight: 14,
    color: '#065F46',
  },
  mockKeywordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mockKwBadgeActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mockKwBadgeActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  mockKwBadgeInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mockKwBadgeInactiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  mockVerdictBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  mockVerdictLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  mockVerdictText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    marginTop: 2,
  },
  mockDualGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  mockDualBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockDualText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  mockBundleBtn: {
    backgroundColor: '#1A4F8A',
    width: '100%',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mockBundleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 5. HOW IT WORKS
  stepsSection: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.xl,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  stepTitle: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },

  // 5.5 CORPORATE PARTNERS
  partnersSection: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  partnersTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  partnersSub: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 32,
  },
  partnersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    minWidth: 160,
  },

  // 6. TESTIMONIALS
  testimonialsSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  testimonialCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    padding: 24,
    justifyContent: 'space-between',
    gap: 16,
  },
  testimonialStars: {
    flexDirection: 'row',
    gap: 3,
  },
  testimonialQuote: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontStyle: 'italic',
  },
  testimonialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  testimonialName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  testimonialRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A4F8A',
  },
  testimonialPlaced: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  testimonialScoreBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  testimonialScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A4F8A',
  },
  metricsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 64,
    paddingTop: 48,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 24,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNumber: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 36,
    fontWeight: '800',
    color: '#1A4F8A',
    letterSpacing: -1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginTop: 4,
  },

  // 7. FAQ
  faqSection: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  faqList: {
    maxWidth: 720,
    marginHorizontal: 'auto',
    gap: 12,
    width: '100%',
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.xl,
    padding: 18,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    paddingRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },

  // 8. FINAL CTA
  ctaSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 88,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ctaCard: {
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: 680,
    marginHorizontal: 'auto',
  },
  ctaTitle: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
    lineHeight: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 32,
  },
  ctaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  ctaDisclaimer: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // 9. FOOTER
  footer: {
    backgroundColor: '#1A4F8A',
    paddingVertical: 64,
  },
  footerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    marginBottom: 48,
  },
  footerColMain: {
    flex: 2,
    minWidth: 260,
  },
  footerCol: {
    flex: 1,
    minWidth: 140,
    gap: 12,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  footerBrandText: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerTagline: {
    fontSize: 13,
    lineHeight: 20,
    color: '#BFDBFE',
  },
  footerHeading: {
    fontFamily: Platform.OS === 'web' ? "'Sora', sans-serif" : undefined,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 13,
    color: '#DBEAFE',
  },
  footerBottom: {
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSocials: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  socialBtn: {
    padding: 6,
    borderRadius: Radius.md,
  },
  copyright: {
    fontSize: 12,
    color: '#93C5FD',
  },
});
