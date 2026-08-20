import React, { useState, useEffect, useRef } from 'react';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfServiceModal from './components/TermsOfServiceModal';
import StandalonePrivacyPolicy from './components/StandalonePrivacyPolicy';
import StandaloneTermsOfService from './components/StandaloneTermsOfService';
import StandaloneDownloadPage from './components/StandaloneDownloadPage';
import { GoogleSheetsManager } from './components/GoogleSheetsManager';
import { EmailSubmission, appendSubmissionsToSheet } from './lib/googleSheets';
import { getAccessToken } from './lib/firebase';
import { 
  CheckCircle, 
  FileText, 
  ArrowRight, 
  Lock, 
  Shield, 
  Sparkles, 
  Download, 
  Menu, 
  X, 
  Briefcase, 
  Layers, 
  Zap, 
  Star,
  ChevronDown,
  Building,
  AlertCircle,
  HelpCircle,
  Heart,
  Globe,
  Plus,
  Clock,
  Sheet,
  Smartphone,
  Copy,
  Check
} from 'lucide-react';

// Define the content for the interactive live optimizer simulator
interface ProfessionDemo {
  id: string;
  profession: string;
  location: string;
  avatarInitial: string;
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
    location: 'Nairobi, Kenya',
    avatarInitial: 'S',
    originalText: 'Responsible for writing clean React code, fixing bugs, and helping with server deployment.',
    optimizedText: 'Engineered 14+ scalable React components and optimized Docker deployment pipelines, reducing page-load latency by 35% and scaling performance for 50,000+ monthly active users.',
    originalScore: 42,
    optimizedScore: 97,
    keywords: ['React Components', 'Docker Pipelines', 'Latency Reduction', 'Scalability', 'Performance Optimization'],
    metricsAdded: '+35% page-load speed, 50k+ active users'
  },
  {
    id: 'nurse',
    profession: 'Registered Nurse',
    location: 'Lagos, Nigeria',
    avatarInitial: 'N',
    originalText: 'Helped admit patients, did basic clinical paperwork, and worked night shifts in the ward.',
    optimizedText: 'Managed fast-track clinical admission protocols for up to 45 patients daily in a high-volume ward, ensuring 100% compliance with international safety policies and reducing average intake delays by 18 minutes.',
    originalScore: 48,
    optimizedScore: 95,
    keywords: ['Clinical Admission Protocols', 'Patient Intake Optimization', 'Safety Compliance', 'High-Volume Care'],
    metricsAdded: '-18 min intake delay, 45+ daily patients'
  },
  {
    id: 'finance',
    profession: 'Finance Analyst',
    location: 'Accra, Ghana',
    avatarInitial: 'F',
    originalText: 'Looked over monthly accounting statements, made financial spreadsheets, and reported to managers.',
    optimizedText: 'Built financial models and variance dashboards analyzing $1.2M in operational budgets, detecting $85k in annual cost redundancies and presenting forecast insights directly to executive leadership.',
    originalScore: 39,
    optimizedScore: 98,
    keywords: ['Financial Models', 'Variance Dashboards', 'Budget Analysis', 'Cost Redundancy Auditing', 'Executive Reporting'],
    metricsAdded: '$85k saved, modeled $1.2M budget'
  }
];

import { validateAndSanitizeEmail } from './lib/security';

export default function App() {
  const [activeDemo, setActiveDemo] = useState<ProfessionDemo>(DEMO_DATA[0]);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [simulatedScore, setSimulatedScore] = useState<number>(42);
  const [simulatedText, setSimulatedText] = useState<string>(DEMO_DATA[0].originalText);
  const [showOptimizedBadge, setShowOptimizedBadge] = useState<boolean>(false);
  
  // Waitlist form state
  const [email, setEmail] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState<boolean>(false);
  const [waitlistNumber, setWaitlistNumber] = useState<number>(384);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [emailApiFeedback, setEmailApiFeedback] = useState<string>('');
  const [downloadLink, setDownloadLink] = useState<string>('/download');
  const [copiedSpot, setCopiedSpot] = useState<boolean>(false);

  const copySpotCode = (code: string | number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code.toString());
      setCopiedSpot(true);
      setTimeout(() => setCopiedSpot(false), 2500);
    }
  };

  // Mobile navigation overlay state
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Active section tracking state for dynamic navbar highlights
  const [activeSection, setActiveSection] = useState<string>('testimonials');

  // FAQ expanded state (only one open at a time)
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  // Privacy Policy modal visibility state
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState<boolean>(false);

  // Terms of Service modal visibility state
  const [showTermsOfService, setShowTermsOfService] = useState<boolean>(false);

  // Google Sheets integration state
  const [showSheetsManager, setShowSheetsManager] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<EmailSubmission[]>(() => {
    const saved = localStorage.getItem('interview_ready_all_submissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const handleSubmissionsUpdated = (updated: EmailSubmission[]) => {
    setSubmissions(updated);
    localStorage.setItem('interview_ready_all_submissions', JSON.stringify(updated));
  };

  // Standalone page view for direct routing (e.g., from mobile apps or direct links)
  const [standalonePage, setStandalonePage] = useState<'privacy' | 'terms' | 'download' | null>(null);

  // Parse path, query, and hash to check for direct standalone page requests
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (
        path === '/download' || 
        path === '/install' || 
        path === '/app' || 
        search.includes('page=download') || 
        search.includes('view=download') ||
        hash === '#/download' || 
        hash === '#/install'
      ) {
        setStandalonePage('download');
      } else if (
        path === '/privacy' || 
        path === '/privacy-policy' || 
        search.includes('page=privacy') || 
        search.includes('view=privacy') ||
        hash === '#/privacy' || 
        hash === '#/privacy-policy'
      ) {
        setStandalonePage('privacy');
      } else if (
        path === '/terms' || 
        path === '/terms-of-service' || 
        search.includes('page=terms') || 
        search.includes('view=terms') ||
        hash === '#/terms' || 
        hash === '#/terms-of-service'
      ) {
        setStandalonePage('terms');
      } else {
        setStandalonePage(null);
      }
    };

    checkRoute();
    
    // Listen to route changes
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Load waitlist status from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('interview_ready_waitlist_email');
    if (saved) {
      setWaitlistSubmitted(true);
      const savedNum = localStorage.getItem('interview_ready_waitlist_number');
      if (savedNum) setWaitlistNumber(parseInt(savedNum));
    }
  }, []);

  // Active section tracking via IntersectionObserver for dynamic highlights
  useEffect(() => {
    if (standalonePage !== null) return;

    const sectionIds = ['features', 'how-it-works', 'testimonials', 'faq'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -40% 0px', // Focused middle region of viewport
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [standalonePage]);

  // Simulator optimization effect
  const runSimulatorOptimization = (demo: ProfessionDemo) => {
    setIsOptimizing(true);
    setShowOptimizedBadge(false);
    setSimulatedText(demo.originalText);
    setSimulatedScore(demo.originalScore);

    let currentScore = demo.originalScore;
    const targetScore = demo.optimizedScore;
    const duration = 1200; // ms
    const intervalTime = Math.floor(duration / (targetScore - currentScore));

    setTimeout(() => {
      setSimulatedText(demo.optimizedText);
      setIsOptimizing(false);
      setShowOptimizedBadge(true);

      const timer = setInterval(() => {
        currentScore += 1;
        if (currentScore >= targetScore) {
          setSimulatedScore(targetScore);
          clearInterval(timer);
        } else {
          setSimulatedScore(currentScore);
        }
      }, intervalTime);
    }, 1000);
  };

  // Run simulator when selecting a different tab
  useEffect(() => {
    runSimulatorOptimization(activeDemo);
  }, [activeDemo]);

  // Handle Waitlist Form submission with live Spaceship SMTP email dispatch
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Bot Honeypot check
    if (honeypot) {
      setWaitlistSubmitted(true);
      return;
    }

    // 2. Strict RFC 5322 validation and sanitization
    const emailValidation = validateAndSanitizeEmail(email);
    if (!emailValidation.isValid) {
      setFormError(emailValidation.error || 'Please enter a valid professional email address.');
      return;
    }

    const sanitizedEmail = emailValidation.email;
    setFormError('');
    setIsSubmitting(true);
    
    // Generate a random high waitlist spot
    const spot = Math.floor(Math.random() * 200) + 400;
    setWaitlistNumber(spot);
    setWaitlistSubmitted(true);
    
    const newSub: EmailSubmission = {
      id: Date.now().toString(),
      email: sanitizedEmail,
      submittedAt: new Date().toISOString(),
      waitlistSpot: spot,
      syncedToSheets: false,
    };

    // Save locally
    try {
      const allSubmissions: EmailSubmission[] = JSON.parse(
        localStorage.getItem('interview_ready_all_submissions') || '[]'
      );
      allSubmissions.push(newSub);
      localStorage.setItem('interview_ready_all_submissions', JSON.stringify(allSubmissions));
      localStorage.setItem('interview_ready_waitlist_email', sanitizedEmail);
      localStorage.setItem('interview_ready_waitlist_number', spot.toString());
      setSubmissions(allSubmissions);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Live call to /api/subscribe to record email and send download email via Spaceship
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: sanitizedEmail, 
          waitlistSpot: spot,
          hp: honeypot 
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          setDownloadLink(data.downloadUrl);
        }
        if (data.message) {
          setEmailApiFeedback(data.message);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          setEmailApiFeedback(`Note: ${errData.error}`);
        }
      }
    } catch (apiErr) {
      console.warn('API subscription dispatch warning:', apiErr);
    } finally {
      setIsSubmitting(false);
    }

    // 2. Attempt live sync to Google Sheets if connected
    const sheetId = localStorage.getItem('interview_ready_sheets_id');
    const token = getAccessToken();

    let isSynced = false;
    if (sheetId && token) {
      try {
        await appendSubmissionsToSheet(token, sheetId, [newSub]);
        isSynced = true;
      } catch (err) {
        console.warn('Auto-sync to Google Sheets pending authentication or connection:', err);
      }
    }

    newSub.syncedToSheets = isSynced;

    const updatedSubmissions = [newSub, ...submissions];
    setSubmissions(updatedSubmissions);
    localStorage.setItem('interview_ready_all_submissions', JSON.stringify(updatedSubmissions));
    
    localStorage.setItem('interview_ready_waitlist_email', email);
    localStorage.setItem('interview_ready_waitlist_number', spot.toString());
  };

  // Scroll reveal IntersectionObserver trigger
  useEffect(() => {
    if (standalonePage !== null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [standalonePage]);

  if (standalonePage === 'download') {
    return <StandaloneDownloadPage onBack={() => {
      setStandalonePage(null);
      window.history.pushState({}, '', '/');
    }} />;
  }

  if (standalonePage === 'privacy') {
    return <StandalonePrivacyPolicy onBack={() => {
      setStandalonePage(null);
      window.history.pushState({}, '', '/');
    }} />;
  }

  if (standalonePage === 'terms') {
    return <StandaloneTermsOfService onBack={() => {
      setStandalonePage(null);
      window.history.pushState({}, '', '/');
    }} />;
  }

  return (
    <div className="min-h-screen font-sans bg-[#F9FAFB] text-slate-900 flex flex-col selection:bg-[#1A4F8A]/25 selection:text-slate-900" id="app-root">
      
      {/* SECTION 1 — NAVIGATION BAR (Sticky) */}
      <nav id="navbar" className="sticky top-0 z-50 w-full transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-slate-200/50 h-16 flex items-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo & Wordmark */}
          <a href="#hero" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Interview Ready Logo" className="w-8 h-8 object-contain" />
            <span className="tracking-tight text-slate-900 font-display font-extrabold text-lg">Interview Ready</span>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold font-display">
            <a 
              href="#features" 
              onClick={() => setActiveSection('features')}
              className={`pb-0.5 border-b-2 transition-all duration-200 ${
                activeSection === 'features' 
                  ? "text-slate-900 font-bold border-[#0EA5E9]" 
                  : "text-slate-600 hover:text-[#1A4F8A] border-transparent"
              }`}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setActiveSection('how-it-works')}
              className={`pb-0.5 border-b-2 transition-all duration-200 ${
                activeSection === 'how-it-works' 
                  ? "text-slate-900 font-bold border-[#0EA5E9]" 
                  : "text-slate-600 hover:text-[#1A4F8A] border-transparent"
              }`}
            >
              How It Works
            </a>
            <a 
              href="#testimonials" 
              onClick={() => setActiveSection('testimonials')}
              className={`pb-0.5 border-b-2 transition-all duration-200 ${
                activeSection === 'testimonials' 
                  ? "text-slate-900 font-bold border-[#0EA5E9]" 
                  : "text-slate-600 hover:text-[#1A4F8A] border-transparent"
              }`}
            >
              Recruiter Tested
            </a>
            <a 
              href="#faq" 
              onClick={() => setActiveSection('faq')}
              className={`pb-0.5 border-b-2 transition-all duration-200 ${
                activeSection === 'faq' 
                  ? "text-slate-900 font-bold border-[#0EA5E9]" 
                  : "text-slate-600 hover:text-[#1A4F8A] border-transparent"
              }`}
            >
              FAQ
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a 
              href="#waitlist" 
              className="px-5 py-2.5 bg-[#1A4F8A] hover:bg-[#123761] text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              Get Early Access
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-200 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white md:hidden animate-fade-in flex flex-col justify-between p-6 shadow-xl border-t border-slate-100">
          <div className="flex flex-col gap-4 text-base font-semibold text-slate-700 font-display">
            <a 
              href="#features" 
              onClick={() => { setActiveSection('features'); setMobileMenuOpen(false); }}
              className="py-3 border-b border-slate-100 flex items-center justify-between hover:text-[#1A4F8A]"
            >
              <span className={`tracking-wide ${activeSection === 'features' ? 'text-[#1A4F8A] font-bold' : ''}`}>Features</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => { setActiveSection('how-it-works'); setMobileMenuOpen(false); }}
              className="py-3 border-b border-slate-100 flex items-center justify-between hover:text-[#1A4F8A]"
            >
              <span className={`tracking-wide ${activeSection === 'how-it-works' ? 'text-[#1A4F8A] font-bold' : ''}`}>How It Works</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="#testimonials" 
              onClick={() => { setActiveSection('testimonials'); setMobileMenuOpen(false); }}
              className="py-3 border-b border-slate-100 flex items-center justify-between hover:text-[#1A4F8A]"
            >
              <span className="flex items-center gap-2 tracking-wide">
                <span className={activeSection === 'testimonials' ? 'text-[#1A4F8A] font-bold' : ''}>Testimonials</span>
                <span className="text-[10px] bg-blue-50 border border-blue-100 text-[#1A4F8A] px-2 py-0.5 font-bold rounded-full uppercase tracking-wider">Verified</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
            <a 
              href="#faq" 
              onClick={() => { setActiveSection('faq'); setMobileMenuOpen(false); }}
              className="py-3 border-b border-slate-100 flex items-center justify-between hover:text-[#1A4F8A]"
            >
              <span className={`tracking-wide ${activeSection === 'faq' ? 'text-[#1A4F8A] font-bold' : ''}`}>FAQ</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <a 
              href="#waitlist" 
              onClick={() => setMobileMenuOpen(false)}
              className="bg-[#1A4F8A] text-white py-3.5 rounded-xl text-center font-semibold text-sm tracking-wide shadow-sm"
            >
              Join the Priority Waitlist
            </a>
            <p className="text-center text-xs text-slate-500 font-medium">
              Launch targeted remote ready applications in minutes.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 2 — HERO */}
      <header id="hero" className="relative overflow-hidden pt-12 pb-20 md:py-28 bg-white border-b border-gray-100">
        {/* Subtle grid line background decoration */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200/50 to-transparent"></div>
        <div className="absolute right-0 top-0 w-[400px] h-full bg-slate-50/50 border-l border-gray-100 -z-10 hidden lg:block"></div>
        
        <div className="w-full max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left: Text & Pitch */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left hero-animate">
            
            {/* H1 Headline - Outcomes Focused */}
            <h1 className="text-slate-900 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Land More <br className="hidden sm:inline" />
              <span className="text-[#0EA5E9]">
                Interviews Faster.
              </span>
            </h1>
 
            {/* Sub-headline */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
              Interview Ready writes, formats, and exports professional resumes and cover letters in seconds. ATS-optimized, recruiter-tested, and tailored to any job description you target.
            </p>
  
            {/* Micro Social Proof above Fold */}
            <div className="flex items-center gap-3 py-1 text-xs text-slate-500 font-medium tracking-wide">
              <div className="flex -space-x-1.5">
                <img 
                  src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=120&auto=format&fit=crop" 
                  alt="African Candidate Portrait" 
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-xs" 
                />
                <img 
                  src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=120&auto=format&fit=crop" 
                  alt="African Candidate Portrait" 
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-xs" 
                />
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=120&auto=format&fit=crop" 
                  alt="African Candidate Portrait" 
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-xs" 
                />
              </div>
              <span>Early Access open for ambitious African professionals.</span>
            </div>
  
            {/* Hero CTA & Form */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              {!waitlistSubmitted ? (
                <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row w-full max-w-lg gap-2">
                  {/* Anti-Spam Bot Honeypot Trap (Hidden from users) */}
                  <input
                    type="text"
                    name="hp"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden absolute opacity-0 pointer-events-none"
                  />
                  <div className="relative flex-grow">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your professional email" 
                      maxLength={254}
                      autoComplete="email"
                      className="w-full px-4 py-3.5 border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm sm:text-base font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A4F8A] transition-all duration-150 shadow-sm"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-[#1A4F8A] hover:bg-[#123761] text-white px-7 py-3.5 rounded-xl font-semibold shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-75"
                  >
                    {isSubmitting ? 'Sending...' : 'Get Mobile App'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="bg-white border-2 border-emerald-300/80 rounded-2xl p-5 text-slate-900 w-full max-w-lg shadow-lg space-y-4">
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-display font-extrabold text-base text-slate-900">
                        Priority Spot Reserved! 🎉
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {emailApiFeedback || 'We sent your access credentials to your inbox.'}
                      </p>
                    </div>
                  </div>

                  {/* Access Code Display & One-Click Copy */}
                  <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Your Waitlist Access Code
                      </span>
                      <span className="font-display font-extrabold text-2xl text-[#1A4F8A]">
                        #{waitlistNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copySpotCode(waitlistNumber || '')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1A4F8A] border border-blue-200 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                      title="Copy your access code"
                    >
                      {copiedSpot ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#1A4F8A]" />}
                      <span>{copiedSpot ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Direct Unlock Action */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setStandalonePage('download');
                        window.history.pushState({}, '', `/download?spot=${waitlistNumber}&email=${encodeURIComponent(email)}`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#1A4F8A] hover:bg-[#123761] text-white text-sm font-bold px-5 py-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      Proceed to Download & Unlock APK →
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Key in code <strong>#{waitlistNumber}</strong> on the download page to unlock the APK installer.
                    </p>
                    <p className="text-[11px] text-center text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-1 font-bold">
                      Please open and download this link in a different browser (such as Samsung Internet, Firefox, Brave, Opera, or Edge) instead of Google Chrome.
                    </p>
                  </div>

                </div>
              )}
            </div>
            {formError && <p className="text-red-500 text-xs font-semibold">{formError}</p>}
  
            {/* Reassurance text */}
            <p className="text-xs text-slate-400 font-medium">
              Free to start • No subscription required for core formatting tools.
            </p>
          </div>

          {/* Hero Right: High Fidelity Phone Mockup with Live Interactive Simulator */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end hero-animate relative">
            
            {/* Glow Accent behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#0EA5E9]/15 rounded-full filter blur-3xl -z-10"></div>

            {/* Interactive Simulator Wrapper */}
            <div className="phone-float w-[310px] sm:w-[330px] rounded-[44px] bg-[#0D1117] p-3 shadow-2xl border-[6px] border-gray-800 relative">
              
              {/* Speaker / Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#0D1117] rounded-b-2xl flex items-center justify-center z-20">
                <div className="w-12 h-1 bg-gray-700 rounded-full"></div>
              </div>

              {/* Internal Screen Content */}
              <div className="w-full bg-[#F9FAFB] rounded-[34px] min-h-[550px] overflow-hidden flex flex-col justify-between text-gray-800 text-xs relative select-none border border-gray-100">
                
                {/* Simulator App Header */}
                <div className="bg-[#1A4F8A] text-white pt-7 pb-4 px-4 flex items-center justify-between border-b border-blue-900/10">
                  <div className="flex items-center gap-1.5">
                    <img src="/logo.png" alt="Interview Ready Logo" className="w-5 h-5 object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                    <span className="font-display font-bold text-xs tracking-wide">Interview Ready</span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#0EA5E9] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    AI Active
                  </span>
                </div>

                {/* Simulator Content Area */}
                <div className="p-3 flex-grow flex flex-col justify-start space-y-3.5">
                  
                  {/* Select Profession Title */}
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ATS Optimizer Engine</p>
                    <p className="text-gray-700 text-[11px] font-medium mt-0.5">Select a beta user profile:</p>
                  </div>

                  {/* Profession Mini Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-gray-200/60 p-1 rounded-lg">
                    {DEMO_DATA.map((demo) => (
                      <button
                        key={demo.id}
                        onClick={() => {
                          if (!isOptimizing) setActiveDemo(demo);
                        }}
                        className={`py-1.5 rounded-md font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                          activeDemo.id === demo.id 
                            ? 'bg-white text-[#1A4F8A] shadow-xs' 
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                        disabled={isOptimizing}
                      >
                        {demo.profession.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Realtime ATS Score Gauge */}
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between shadow-xs">
                    <div>
                      <p className="text-gray-400 text-[8px] font-semibold uppercase tracking-wider">ATS Match Score</p>
                      <p className="text-gray-800 text-[11px] font-bold mt-0.5 font-display">Resume Compatibility</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center">
                        {/* Circular track */}
                        <svg className="w-11 h-11 transform -rotate-90">
                          <circle cx="22" cy="22" r="18" stroke="#E5E7EB" strokeWidth="3" fill="transparent" />
                          <circle 
                            cx="22" 
                            cy="22" 
                            r="18" 
                            stroke={simulatedScore > 60 ? '#10B981' : '#EF4444'} 
                            strokeWidth="3.5" 
                            fill="transparent" 
                            strokeDasharray={`${2 * Math.PI * 18}`}
                            strokeDashoffset={`${2 * Math.PI * 18 * (1 - simulatedScore / 100)}`}
                            className="transition-all duration-300"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-mono font-bold text-gray-800">{simulatedScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Original vs Optimized Bullet Content */}
                  <div className="flex-grow flex flex-col space-y-2">
                    
                    {/* Before State */}
                    <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 relative">
                      <div className="absolute top-1 right-2 text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Weak CV</div>
                      <p className="text-gray-400 font-semibold uppercase text-[8px] tracking-wider">Before AI Treatment</p>
                      <p className="text-gray-500 text-[10px] leading-relaxed mt-1 font-normal">{activeDemo.originalText}</p>
                    </div>

                    {/* AI Conversion Process Indicator */}
                    {isOptimizing ? (
                      <div className="flex items-center justify-center gap-2 py-1 text-[#1A4F8A]">
                        <span className="inline-block w-2 h-2 bg-[#1A4F8A] rounded-full animate-ping shrink-0"></span>
                        <span className="font-semibold text-[9px] uppercase tracking-wider animate-pulse">ATS Keyword Injector...</span>
                      </div>
                    ) : (
                      <div className="h-4"></div>
                    )}

                    {/* After State */}
                    <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
                      showOptimizedBadge 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-white border-gray-100'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] text-emerald-800 font-bold tracking-wider uppercase">Interview Ready CV</span>
                        {showOptimizedBadge && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold animate-bounce">Recruiter Proof ✓</span>
                        )}
                      </div>
                      <p className={`text-[10px] leading-relaxed mt-1 font-normal transition-colors duration-300 ${
                        isOptimizing ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {simulatedText}
                      </p>
                    </div>

                    {/* Keyword badging */}
                    {!isOptimizing && showOptimizedBadge && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {activeDemo.keywords.map((kw, i) => (
                          <span key={i} className="text-[8px] bg-blue-50 text-[#1A4F8A] px-1.5 py-0.5 rounded-full border border-blue-100/40 font-bold">
                            + {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Simulated Device Action Bar */}
                <div className="bg-white p-3 border-t border-gray-100 flex items-center justify-between text-gray-500 font-semibold text-[10px] uppercase font-sans">
                  <span>{activeDemo.location}</span>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <CheckCircle className="w-3 h-3" />
                    <span>Keywords Injected</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </header>

      {/* SECTION 3 — PROBLEM STATEMENT */}
      <section id="problem" className="py-20 md:py-28 bg-[#F3F4F6] border-y border-gray-200/50">
        <div className="w-full max-w-6xl mx-auto px-6 reveal">
          
          {/* Section Headline */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-[#1A4F8A] font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              Job applications are broken.
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Applying to global remote roles or local corporations should not feel like gambling. Traditional resumes fail silently without you ever knowing why.
            </p>
          </div>

          {/* 3 Pain Point Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 md:mt-16">
            
            {/* Card 1 */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-8 flex flex-col space-y-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center text-[#1A4F8A] bg-blue-50 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-slate-900 font-display text-lg font-bold tracking-tight">The ATS Blocker</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Applicant Tracking Systems filter out up to 75% of submissions before a human recruiter even sees them. If you lack the exact keywords, you get rejected instantly.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-8 flex flex-col space-y-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center text-[#1A4F8A] bg-blue-50 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-slate-900 font-display text-lg font-bold tracking-tight">The Time Sink</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Writing a customized cover letter and tweaking your professional bio for every single position description takes hours. You lose momentum before you even submit.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-8 flex flex-col space-y-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center text-[#1A4F8A] bg-blue-50 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-slate-900 font-display text-lg font-bold tracking-tight">The Formatting Nightmare</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Word files break across operating systems, and automated reading scripts garble PDF headers. If your layout is wrong, your application is disqualified.
              </p>
            </div>

          </div>

          {/* Transition pivot line */}
          <div className="text-center mt-12 md:mt-16">
            <p className="text-[#1A4F8A] font-semibold text-base sm:text-lg font-display">
              That's exactly why we built Interview Ready.
            </p>
            <div className="mt-4">
              <a href="#how-it-works" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#1A4F8A] hover:text-[#123761] transition-colors">
                See how it works <ChevronDown className="w-4 h-4 animate-bounce" />
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4 — FEATURES (Alternating rows, no card grid) */}
      <section id="features" className="py-20 md:py-28 bg-white border-b border-gray-100">
        <div className="w-full max-w-6xl mx-auto px-6 space-y-24 md:space-y-36">
          
          {/* Feature 1: AI Resume Builder */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center reveal">
            {/* Left Column: Graphics */}
            <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
              <div className="w-full max-w-[400px] bg-[#F9FAFB] border border-gray-200/60 p-6 rounded-2xl shadow-sm relative">
                {/* Header graphic */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1A4F8A]/30"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium tracking-wide">PDF + DOCX ready</span>
                </div>
                {/* Dynamic Resume Page Template */}
                <div className="space-y-4 pt-4">
                  <div className="w-1/3 h-4 bg-[#1A4F8A]/25 rounded-lg"></div>
                  <div className="w-full h-3 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="w-full h-5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center px-2 text-[9px] font-bold uppercase tracking-wide">
                        Tailored bullet achievements
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="w-5/6 h-3 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                  {/* Miniature Download tags */}
                  <div className="flex items-center gap-2 pt-4">
                    <div className="px-2.5 py-1.5 bg-white border border-gray-200 text-slate-700 text-[10px] font-semibold flex items-center gap-1.5 rounded-lg">
                      <Download className="w-2.5 h-2.5" /> Resume.pdf
                    </div>
                    <div className="px-2.5 py-1.5 bg-white border border-gray-200 text-slate-700 text-[10px] font-semibold flex items-center gap-1.5 rounded-lg">
                      <Download className="w-2.5 h-2.5" /> Resume.docx
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Right Column: Text */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-4">
              <span className="text-[28px] tracking-[0.2em] font-bold text-[#0EA5E9]/30 uppercase font-display mb-2 block">01</span>
              <h3 className="text-slate-900 font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                AI Resume Tailoring
              </h3>
              <p className="text-slate-600 text-base font-normal leading-relaxed">
                Simply paste your existing work history alongside your target job description. Our engine immediately drafts a professional resume structured with correct keywords, strong metric-driven verbs, and clean summaries.
              </p>
              <div className="pt-2">
                <p className="text-[#1A4F8A] text-xs font-bold uppercase tracking-wider">
                  Benefit: <span className="text-slate-600 font-normal normal-case tracking-normal">Creates tailored resume drafts in 30 seconds instead of hours, completely meeting international ATS standards.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2: AI Cover Letter Writer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center reveal">
            {/* Left Column: Text */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[28px] tracking-[0.2em] font-bold text-[#0EA5E9]/30 uppercase font-display mb-2 block">02</span>
              <h3 className="text-slate-900 font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                Recruiter-Tested Cover Letters
              </h3>
              <p className="text-slate-600 text-base font-normal leading-relaxed">
                Generate high-conversion cover letters calibrated to 280–380 words. Instead of stale layouts, our letter structure writes in a specific, metric-backed professional voice optimized for readability and emotional engagement.
              </p>
              <div className="pt-2">
                <p className="text-[#1A4F8A] text-xs font-bold uppercase tracking-wider">
                  Benefit: <span className="text-slate-600 font-normal normal-case tracking-normal">Delivers narrative cover letters written in your human voice, not a repetitive corporate bot template.</span>
                </p>
              </div>
            </div>
            {/* Right Column: Graphics */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[400px] bg-[#F9FAFB] border border-gray-200/60 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                  <span className="text-[10px] text-slate-500 font-medium tracking-wide">Cover Letter Writer</span>
                </div>
                <div className="space-y-2 pt-3 text-[10px]">
                  <div className="text-gray-400 font-mono uppercase text-[9px] tracking-wider">To: hiring@company.com</div>
                  <div className="w-11/12 h-6 bg-white border border-gray-200 text-gray-800 px-2 flex items-center font-mono rounded-lg">
                    Subject: Applying for Remote Role
                  </div>
                  <div className="space-y-1.5 pt-1.5 text-gray-600 font-normal leading-relaxed">
                    <p className="text-[#1A4F8A] font-semibold">"Dear Hiring Manager,"</p>
                    <p className="bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-100 font-normal">
                      Instead of summarizing my resume, I want to share how I solved budget variance challenges...
                    </p>
                    <p className="w-full h-2 bg-gray-200 rounded-lg"></p>
                    <p className="w-3/4 h-2 bg-gray-200 rounded-lg"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: ATS Keyword Optimisation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center reveal">
            {/* Left Column: Graphics */}
            <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
              <div className="w-full max-w-[400px] bg-[#F9FAFB] border border-gray-200/60 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#1A4F8A]/5 rounded-bl-full"></div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Job Description Key Terms</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 font-bold uppercase tracking-wide flex items-center gap-1">✓ Cloud Architecture</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 font-bold uppercase tracking-wide flex items-center gap-1">✓ Budget Control</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 font-bold uppercase tracking-wide flex items-center gap-1">✓ Metric-Driven</span>
                  <span className="text-[9px] bg-white text-gray-500 px-2 py-1 border border-gray-200 rounded-lg font-bold uppercase tracking-wide">CI/CD Pipeline</span>
                  <span className="text-[9px] bg-white text-gray-500 px-2 py-1 border border-gray-200 rounded-lg font-bold uppercase tracking-wide">Patient Safety</span>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider">ATS Optimizer Verdict</p>
                  <p className="text-emerald-600 text-[10px] font-medium mt-0.5">Top 15 keywords naturally integrated into work achievements.</p>
                </div>
              </div>
            </div>
            {/* Right Column: Text */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-4">
              <span className="text-[28px] tracking-[0.2em] font-bold text-[#0EA5E9]/30 uppercase font-display mb-2 block">03</span>
              <h3 className="text-slate-900 font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                ATS Keyword Integration
              </h3>
              <p className="text-slate-600 text-base font-normal leading-relaxed">
                Our technology performs a comparative analysis of your bio against the target job profile. It extracts missing skills and inserts the top 15–20 high-value terms into your experience statements logically and gracefully.
              </p>
              <div className="pt-2">
                <p className="text-[#1A4F8A] text-xs font-bold uppercase tracking-wider">
                  Benefit: <span className="text-slate-600 font-normal normal-case tracking-normal">Clears applicant screening filters so your submission lands directly on human recruiter desks for actual review.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Feature 4: Universal Profession Support & Export */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center reveal">
            {/* Left Column: Text */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[28px] tracking-[0.2em] font-bold text-[#0EA5E9]/30 uppercase font-display mb-2 block">04</span>
              <h3 className="text-slate-900 font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                Universal Careers & Word Export
              </h3>
              <p className="text-slate-600 text-base font-normal leading-relaxed">
                Whether you are an engineer in Nairobi, a registered nurse in Lagos, or an analyst in Accra, Interview Ready caters to every profession. Download your custom documents in both print-ready PDF and editable DOCX formats.
              </p>
              <div className="pt-2">
                <p className="text-[#1A4F8A] text-xs font-bold uppercase tracking-wider">
                  Benefit: <span className="text-slate-600 font-normal normal-case tracking-normal">Provides fully formatted Microsoft Word-compatible layouts. You maintain 100% control with no hidden file locks or fees.</span>
                </p>
              </div>
            </div>
            {/* Right Column: Graphics */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[400px] bg-[#F9FAFB] border border-gray-200/60 p-6 rounded-2xl shadow-sm text-center">
                <div className="grid grid-cols-2 gap-3 mb-4 text-left">
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#1A4F8A]" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-700">Global Remote</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-700">Recruiter Verified</span>
                  </div>
                </div>
                <a href="#waitlist" className="bg-[#1A4F8A] hover:bg-[#123761] text-white p-4 rounded-xl text-xs font-semibold tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-xs">
                  <Download className="w-4 h-4" /> Download DOCX + PDF Bundle
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5 — HOW IT WORKS (3 Steps) */}
      <section id="how-it-works" className="py-20 md:py-28 bg-[#F3F4F6] border-y border-gray-200/50">
        <div className="w-full max-w-6xl mx-auto px-6 reveal">
          
          {/* Section title */}
          <div className="text-center max-w-xl mx-auto space-y-4">
            <h2 className="text-[#1A4F8A] font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              Three Steps to Your Next Callback
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              We eliminated the complex setup. Prepare polished, targeted applications in under three minutes.
            </p>
          </div>

          {/* 3 steps grid with line connections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-12 md:mt-16 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 relative z-10">
              <div className="w-12 h-12 flex items-center justify-center text-slate-700 bg-white border border-gray-200 text-sm font-bold rounded-xl shadow-xs">
                01
              </div>
              <h3 className="text-slate-900 font-display text-base font-bold tracking-tight">Input Your Work History</h3>
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                Type in your general experience details or simply paste a draft of your current raw curriculum vitae.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 relative z-10">
              <div className="w-12 h-12 flex items-center justify-center text-slate-700 bg-white border border-gray-200 text-sm font-bold rounded-xl shadow-xs">
                02
              </div>
              <h3 className="text-slate-900 font-display text-base font-bold tracking-tight">Paste Target Job Spec</h3>
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                Copy the text of the job description from LinkedIn, BrighterMonday, or any application portal.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 relative z-10">
              <div className="w-12 h-12 flex items-center justify-center text-white bg-[#1A4F8A] text-sm font-bold rounded-xl shadow-sm">
                03
              </div>
              <h3 className="text-slate-900 font-display text-base font-bold tracking-tight">Download DOCX & PDF</h3>
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                Export ATS-optimized achievements and a custom cover letter formatted perfectly for instant submission.
              </p>
            </div>

          </div>

          {/* Bottom CTA block */}
          <div className="text-center mt-12 md:mt-16">
            <a 
              href="#waitlist" 
              className="inline-flex items-center gap-2 bg-[#1A4F8A] hover:bg-[#123761] text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all duration-200 cursor-pointer"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </a>
          </div>

        </div>
      </section>

      {/* SECTION 5.5 — CORPORATE APPROVALS & PARTNERS */}
      <section className="py-14 bg-slate-50 border-y border-gray-100 text-slate-900">
        <div className="w-full max-w-6xl mx-auto px-6 text-center">
          <span className="text-[#1A4F8A] text-xs font-extrabold uppercase tracking-widest block mb-3">Corporate Approvals</span>
          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-800 tracking-tight mb-8">
            Ecosystem partners supporting the next wave of African professional talent
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <a 
              href="https://academy.tunga.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center justify-center focus:outline-none bg-white p-4 rounded-xl border border-gray-100 shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-300 min-w-[160px] h-[72px]"
            >
              <svg viewBox="0 0 160 50" className="h-9 sm:h-11 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Tunga red circle icon */}
                <circle cx="25" cy="25" r="22" fill="#E33439" />
                <text x="25" y="29.5" fill="#FFFFFF" fontSize="10" fontWeight="900" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" letterSpacing="0.5">TUNGA</text>
                
                {/* Bold text beside it */}
                <text x="56" y="29" fill="#1E3146" fontSize="20" fontWeight="900" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.5">TUNGA</text>
                <text x="56" y="41" fill="#64748B" fontSize="8" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" letterSpacing="1.2">ACADEMY</text>
              </svg>
            </a>
            <a 
              href="https://starthubafrica.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center justify-center focus:outline-none bg-white p-4 rounded-xl border border-gray-100 shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-300 min-w-[180px] h-[72px]"
            >
              <svg viewBox="0 0 200 60" className="h-10 sm:h-12 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Lightbulb element */}
                <g transform="translate(5, 5)">
                  {/* Maroon outer left curve */}
                  <path d="M20,5 C10,12 8,25 15,33 C18,36 21,41 21,45" stroke="#851C1D" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {/* Golden outer right curve */}
                  <path d="M22,5 C32,12 34,25 27,33 C24,36 21,41 21,45" stroke="#E6A024" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {/* Inner blue persona/flame */}
                  <path d="M17,28 C15,22 17,17 21,17 C25,17 27,22 25,28 C23,31 19,31 17,28 Z" fill="#1F3245" />
                  <circle cx="21" cy="12" r="3.5" fill="#1F3245" />
                  {/* Base screws */}
                  <path d="M16,48 L26,48" stroke="#1F3245" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M17,51 L25,51" stroke="#1F3245" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Left Leaf */}
                  <path d="M11,40 C6,38 2,30 5,22 C5,27 8,33 11,35" fill="#425E34" />
                  {/* Right Leaf */}
                  <path d="M31,40 C36,38 40,30 37,22 C37,27 34,33 31,35" fill="#425E34" />
                </g>
                {/* Text component */}
                <text x="54" y="30" fill="#1F3245" fontSize="20" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-0.5">StartHub</text>
                <text x="54" y="44" fill="#425E34" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" letterSpacing="1">AFRICA</text>
              </svg>
            </a>
            <a 
              href="https://vc4a.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center justify-center focus:outline-none bg-white p-4 rounded-xl border border-gray-100 shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-300 min-w-[160px] h-[72px]"
            >
              <svg viewBox="0 0 150 50" className="h-10 sm:h-12 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* VC4 in black/dark-slate, A in teal */}
                <text x="5" y="34" fill="#0F172A" fontSize="30" fontWeight="900" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-1.5">
                  VC4<tspan fill="#009688">A</tspan>
                </text>
                {/* Ecosystem tag */}
                <text x="6" y="45" fill="#64748B" fontSize="8" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" letterSpacing="1.8">ECOSYSTEM</text>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 6 — SOCIAL PROOF / TESTIMONIALS */}
      <section id="testimonials" className="py-20 md:py-28 bg-white relative overflow-hidden border-b border-gray-100 text-slate-900">
        
        {/* Abstract background graphics */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0EA5E9]/5 rounded-full filter blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0EA5E9]/5 rounded-full filter blur-3xl -z-10"></div>

        <div className="w-full max-w-6xl mx-auto px-6 reveal">
          
          {/* Section Header */}
          <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
            <span className="text-[#1A4F8A] text-xs font-bold uppercase tracking-wider">Beta User Results</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Ambitious professionals are getting callbacks.
            </h2>
          </div>

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="bg-[#F9FAFB] border border-gray-200/60 rounded-2xl p-7 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-sm transition-shadow">
              <div className="space-y-3">
                {/* 5 stars */}
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#0EA5E9] stroke-none" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">
                  "I submitted three applications utilizing the optimized cv format from Interview Ready. Within a single week, I received interview callbacks from all three companies. The achievements generated were far more metrics-focused than what I could write myself."
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?q=80&w=120&auto=format&fit=crop" 
                  alt="Software Engineer Nairobi" 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-blue-100/60 shadow-xs" 
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Software Engineer</h4>
                  <p className="text-slate-400 text-[10px] font-semibold tracking-wider uppercase">Nairobi, Kenya</p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#F9FAFB] border border-gray-200/60 rounded-2xl p-7 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-sm transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#0EA5E9] stroke-none" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">
                  "Applying to healthcare roles in the UK meant meeting strict documentation standards. Interview Ready aligned my achievements and CV layout perfectly on the first attempt. Recommending this to every healthcare peer looking to relocate."
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=120&auto=format&fit=crop" 
                  alt="Registered Nurse Lagos" 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-blue-100/60 shadow-xs" 
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Registered Nurse</h4>
                  <p className="text-slate-400 text-[10px] font-semibold tracking-wider uppercase">Lagos, Nigeria</p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#F9FAFB] border border-gray-200/60 rounded-2xl p-7 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-sm transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#0EA5E9] stroke-none" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic">
                  "The accompanying cover letter written by the editor was remarkably natural and company-specific. My interviewer literally highlighted my professional story during our initial discussion. This is a game-changer for applications."
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=120&auto=format&fit=crop" 
                  alt="Finance Analyst Accra" 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-blue-100/60 shadow-xs" 
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Finance Analyst</h4>
                  <p className="text-slate-400 text-[10px] font-semibold tracking-wider uppercase">Accra, Ghana</p>
                </div>
              </div>
            </div>

          </div>

          {/* Aggregate metrics bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 pt-12 md:pt-16 mt-16 border-t border-gray-200 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1A4F8A] font-display">10,000+</p>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Resumes Generated</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">94%</p>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Interview Rate Increase</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1A4F8A] font-display">DOCX + PDF</p>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Instant Dual Export</p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 7 — FAQ (Native/Interactive accordion) */}
      <section id="faq" className="py-20 md:py-28 bg-[#F3F4F6] border-y border-gray-200/50">
        <div className="w-full max-w-4xl mx-auto px-6 reveal">
          
          {/* Section Header */}
          <div className="text-center max-w-xl mx-auto space-y-4 mb-12">
            <h2 className="text-[#1A4F8A] font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-normal leading-relaxed">
              Have questions about how Interview Ready can help your application? Find your answers below.
            </p>
          </div>

          {/* Accordion Questions */}
          <div className="space-y-4 max-w-3xl mx-auto">
            
            {/* Q1 */}
            <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button 
                onClick={() => setFaqOpenIndex(faqOpenIndex === 0 ? null : 0)}
                className="w-full p-5 text-left font-bold text-slate-800 text-sm sm:text-base hover:bg-slate-50 flex justify-between items-center transition-colors focus:outline-none"
              >
                <span>Is it free to use?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${faqOpenIndex === 0 ? 'rotate-180 text-[#1A4F8A]' : ''}`} />
              </button>
              {faqOpenIndex === 0 && (
                <div className="p-5 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-gray-100 bg-gray-50/50 font-normal">
                  Yes. Core formatting templates and general drafting are free of charge. No credit card is required to join our early testing waitlist.
                </div>
              )}
            </div>

            {/* Q2 */}
            <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button 
                onClick={() => setFaqOpenIndex(faqOpenIndex === 1 ? null : 1)}
                className="w-full p-5 text-left font-bold text-slate-800 text-sm sm:text-base hover:bg-slate-50 flex justify-between items-center transition-colors focus:outline-none"
              >
                <span>What makes Interview Ready different from general AI writing bots?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${faqOpenIndex === 1 ? 'rotate-180 text-[#1A4F8A]' : ''}`} />
              </button>
              {faqOpenIndex === 1 && (
                <div className="p-5 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-gray-100 bg-gray-50/50 font-normal">
                  Unlike generic templates, Interview Ready explicitly matches recruiter-tested phrasing structures and integrates specific industry keywords. It generates documents designed from ground up to satisfy modern ATS screeners.
                </div>
              )}
            </div>

            {/* Q3 */}
            <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button 
                onClick={() => setFaqOpenIndex(faqOpenIndex === 2 ? null : 2)}
                className="w-full p-5 text-left font-bold text-slate-800 text-sm sm:text-base hover:bg-slate-50 flex justify-between items-center transition-colors focus:outline-none"
              >
                <span>Which industries or professions does it support?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${faqOpenIndex === 2 ? 'rotate-180 text-[#1A4F8A]' : ''}`} />
              </button>
              {faqOpenIndex === 2 && (
                <div className="p-5 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-gray-100 bg-gray-50/50 font-normal">
                  We offer universal profession support. It works dynamically for developers, healthcare administrators, lawyers, teachers, NGO workers, hospitality staff, accountants, and beyond.
                </div>
              )}
            </div>

            {/* Q4 */}
            <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button 
                onClick={() => setFaqOpenIndex(faqOpenIndex === 3 ? null : 3)}
                className="w-full p-5 text-left font-bold text-slate-800 text-sm sm:text-base hover:bg-slate-50 flex justify-between items-center transition-colors focus:outline-none"
              >
                <span>Can I export directly to Microsoft Word format?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${faqOpenIndex === 3 ? 'rotate-180 text-[#1A4F8A]' : ''}`} />
              </button>
              {faqOpenIndex === 3 && (
                <div className="p-5 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-gray-100 bg-gray-50/50 font-normal">
                  Yes. Every output generated exports directly in dual formats: an editable Microsoft Word (DOCX) file for personalized adjustments, and a print-ready PDF layout.
                </div>
              )}
            </div>

            {/* Q5 */}
            <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button 
                onClick={() => setFaqOpenIndex(faqOpenIndex === 4 ? null : 4)}
                className="w-full p-5 text-left font-bold text-slate-800 text-sm sm:text-base hover:bg-slate-50 flex justify-between items-center transition-colors focus:outline-none"
              >
                <span>Is my work history data secure?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${faqOpenIndex === 4 ? 'rotate-180 text-[#1A4F8A]' : ''}`} />
              </button>
              {faqOpenIndex === 4 && (
                <div className="p-5 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-gray-100 bg-gray-50/50 font-normal">
                  Your privacy is fully protected. All data processed is encrypted and never shared with secondary brokers or utilized for generic model training. You retain total ownership of your records.
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 8 — FINAL CTA (Waitlist Capture) */}
      <section id="waitlist" className="py-24 bg-white relative overflow-hidden border-t border-gray-100">
        
        {/* Glow decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0EA5E9]/5 rounded-full filter blur-3xl -z-10"></div>

        <div className="w-full max-w-4xl mx-auto px-6 text-center reveal space-y-8 relative z-10">
          
          <span className="text-[#1A4F8A] bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full inline-block">
            Early Access Priority
          </span>

          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight text-slate-900">
            Your next opportunity is one application away.
          </h2>
          
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto font-normal leading-relaxed">
            Join the priority queue today. Prepare tailored resumes and cover letters in under 3 minutes and boost your interview callback rate.
          </p>

          <div className="max-w-md mx-auto pt-4">
            {!waitlistSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-2.5">
                {/* Anti-Spam Bot Honeypot Trap (Hidden from users) */}
                <input
                  type="text"
                  name="hp"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden absolute opacity-0 pointer-events-none"
                />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your professional email" 
                  maxLength={254}
                  autoComplete="email"
                  className="w-full px-4 py-3.5 border border-gray-300 focus:border-[#1A4F8A] focus:ring-1 focus:ring-[#1A4F8A] focus:outline-none bg-white text-slate-900 placeholder-slate-400 rounded-xl shadow-xs text-sm sm:text-base font-normal transition-all duration-200"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#1A4F8A] text-white px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold tracking-wide shadow-md hover:bg-[#123761] transition-all duration-200 flex items-center justify-center gap-2 shrink-0 active:scale-95 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? 'Sending...' : 'Join Waitlist'} <ArrowRight className="w-4 h-4 text-white/80" />
                </button>
              </form>
            ) : (
              <div className="bg-white border-2 border-emerald-300/80 rounded-2xl p-6 text-slate-900 text-center shadow-lg space-y-4">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-extrabold text-xl text-slate-900">Priority Spot Reserved! 🎉</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {emailApiFeedback || "We've dispatched your mobile app download credentials to your inbox!"}
                  </p>
                </div>

                {/* Access Code Display & One-Click Copy */}
                <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl shadow-2xs text-left">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Your Waitlist Access Code
                    </span>
                    <span className="font-display font-extrabold text-2xl text-[#1A4F8A]">
                      #{waitlistNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copySpotCode(waitlistNumber || '')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#1A4F8A] border border-blue-200 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                    title="Copy your access code"
                  >
                    {copiedSpot ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#1A4F8A]" />}
                    <span>{copiedSpot ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setStandalonePage('download');
                      window.history.pushState({}, '', `/download?spot=${waitlistNumber}&email=${encodeURIComponent(email)}`);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#1A4F8A] hover:bg-[#123761] text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    Unlock & Download APK with this Code →
                  </button>
                  <p className="text-[11px] text-center text-slate-500 mt-2">
                    Key in code <strong>#{waitlistNumber}</strong> on the download page to unlock the APK installer.
                  </p>
                </div>
              </div>
            )}
            {formError && <p className="text-red-600 text-xs font-mono font-semibold mt-2">{formError}</p>}
          </div>

          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold pt-2">
            No subscription requested. Standard privacy policies apply.
          </p>

        </div>
      </section>

      {/* SECTION 9 — FOOTER */}
      <footer id="footer" className="bg-[#1A4F8A] text-white/80 py-16 border-t border-blue-900/30">
        <div className="w-full max-w-6xl mx-auto px-6">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 items-start mb-12">
            
            {/* Column 1: Brand & Details */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xl font-bold font-display text-white">
                <img src="/logo.png" alt="Interview Ready Logo" className="w-6 h-6 object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                <span className="tracking-tight text-white font-display font-extrabold">Interview Ready</span>
              </div>
              <p className="text-sm text-blue-100/90 font-normal leading-relaxed max-w-xs">
                We build automated career utilities for ambitious professionals across Africa and beyond, helping candidates compete on a global scale.
              </p>

            </div>

            {/* Column 2: Product */}
            <div className="md:col-span-2 flex flex-col space-y-3.5 text-sm">
              <h4 className="text-white font-display font-bold uppercase tracking-wider text-xs mb-1">Product</h4>
              <a href="#features" className="hover:text-white transition-colors font-normal text-blue-100/90">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors font-normal text-blue-100/90">How It Works</a>
              <a href="#testimonials" className="hover:text-white transition-colors font-normal text-blue-100/90">Testimonials</a>
            </div>

            {/* Column 3: Company */}
            <div className="md:col-span-2 flex flex-col space-y-3.5 text-sm">
              <h4 className="text-white font-display font-bold uppercase tracking-wider text-xs mb-1">Company</h4>
              <span className="text-blue-200/50 cursor-not-allowed font-normal">About (Coming Soon)</span>
              <span className="text-blue-200/50 cursor-not-allowed font-normal">Press Materials</span>
              <span className="text-blue-200/50 cursor-not-allowed font-normal">Partner Network</span>
            </div>

            {/* Column 4: Legal & Policies */}
            <div className="md:col-span-3 flex flex-col space-y-3.5 text-sm">
              <h4 className="text-white font-display font-bold uppercase tracking-wider text-xs mb-1">Legal</h4>
              <button 
                onClick={() => setShowPrivacyPolicy(true)}
                className="hover:text-white text-left transition-colors cursor-pointer font-normal text-blue-100/90 focus:outline-none w-fit"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setShowTermsOfService(true)}
                className="hover:text-white text-left transition-colors cursor-pointer font-normal text-blue-100/90 focus:outline-none w-fit"
              >
                Terms of Service
              </button>
            </div>

          </div>

          {/* Social icons & copyright */}
          <div className="pt-8 border-t border-blue-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-blue-200 uppercase tracking-wider">
            <span>© 2026 Interview Ready. All rights reserved.</span>
            
            {/* Inline SVG Social Icons */}
            <div className="flex items-center gap-4">
              {/* LinkedIn */}
              <a 
                href="https://www.linkedin.com/company/interview-ready-app" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-white text-blue-200 transition-colors" 
                aria-label="LinkedIn Profile"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              {/* Twitter / X */}
              <a href="#" className="hover:text-white text-blue-200 transition-colors" aria-label="Twitter Profile">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>
      </footer>

      <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />
      <TermsOfServiceModal isOpen={showTermsOfService} onClose={() => setShowTermsOfService(false)} />
      <GoogleSheetsManager
        isOpen={showSheetsManager}
        onClose={() => setShowSheetsManager(false)}
        submissions={submissions}
        onSubmissionsUpdated={handleSubmissionsUpdated}
      />

    </div>
  );
}

// Minimal MapPin helper icon component
function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
