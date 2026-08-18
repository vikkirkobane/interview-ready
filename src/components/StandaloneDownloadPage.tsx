import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  QrCode, 
  Copy, 
  Check, 
  Mic, 
  BarChart3, 
  Zap, 
  Layers, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  FileCheck
} from 'lucide-react';

interface StandaloneDownloadPageProps {
  onBack?: () => void;
}

export default function StandaloneDownloadPage({ onBack }: StandaloneDownloadPageProps) {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [userEmail, setUserEmail] = useState<string>('');
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Extract email from query params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setUserEmail(emailParam);
    } else {
      const saved = localStorage.getItem('interview_ready_waitlist_email');
      if (saved) setUserEmail(saved);
    }
  }, []);

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/downloads/interview-ready.apk';
    link.download = 'interview-ready.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://appinterviewready.top/download';
  
  // High-contrast QR Code with navy (#1A4F8A) on white
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&color=1A4F8A&bgcolor=FFFFFF&margin=12`;

  const copyPageUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#F9FAFB] text-slate-900 flex flex-col selection:bg-[#1A4F8A]/25 selection:text-slate-900">
      
      {/* SECTION 1 — NAVIGATION BAR (Matching Main Page) */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100/80 transition-all duration-200">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <a href="/" onClick={handleHomeClick} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Interview Ready Logo" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-2">
              <span className="tracking-tight text-slate-900 font-display font-extrabold text-lg">
                Interview Ready
              </span>
              <span className="text-[11px] font-display font-bold uppercase tracking-wider bg-blue-50 text-[#1A4F8A] border border-blue-100 px-2 py-0.5 rounded-full hidden sm:inline-block">
                Mobile App
              </span>
            </div>
          </a>

          {/* Back to Website Action */}
          <div className="flex items-center gap-3">
            <a 
              href="/" 
              onClick={handleHomeClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Home</span>
            </a>
          </div>

        </div>
      </nav>

      {/* SECTION 2 — HERO HEADER */}
      <header className="relative pt-12 pb-8 md:pt-16 md:pb-12 overflow-hidden border-b border-gray-100 bg-white">
        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#0EA5E9]/5 rounded-full filter blur-3xl -z-10 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          
          {/* Early Access Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1A4F8A] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span>Official Mobile Release • v1.0.0 Beta</span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Install <span className="text-[#1A4F8A]">Interview Ready</span> on Your Phone
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            Practice AI mock interviews with real-time audio analysis, instant scoring, and personalized answer critiques anywhere on your smartphone.
          </p>

          {/* User Email Banner if referred */}
          {userEmail && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Access Unlocked for <strong className="text-slate-900 font-bold">{userEmail}</strong>
              </span>
            </div>
          )}

        </div>
      </header>

      {/* SECTION 3 — OS TAB SWITCHER & DOWNLOAD EXPERIENCE */}
      <main className="flex-grow py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          
          {/* Platform Tab Switcher */}
          <div className="flex justify-center">
            <div className="p-1.5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center shadow-xs">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-display text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-[#1A4F8A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Android (Direct APK)
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-display text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-[#1A4F8A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                iOS / iPhone (Safari PWA)
              </button>
            </div>
          </div>

          {/* TAB 1: ANDROID DOWNLOAD */}
          {activeTab === 'android' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Main Download Card */}
              <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  
                  {/* Left Column: APK Details & Download CTA */}
                  <div className="md:col-span-7 space-y-5">
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        VirusTotal Clean & Verified
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-medium">
                        v1.0.0-beta • ~24.8 MB
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                      Interview Ready for Android
                    </h2>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
                      Download the official standalone Android application package directly. Compatible with Android 8.0+ on Samsung, Google Pixel, Tecno, Infinix, Xiaomi, OnePlus, and all Android devices.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={handleDownloadApk}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-[#1A4F8A] hover:bg-[#123761] text-white font-display font-bold text-base px-8 py-4 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                      >
                        <Download className="w-5 h-5" />
                        {downloadStarted ? 'Starting Download...' : 'Download Android APK'}
                      </button>

                      <button
                        onClick={copyPageUrl}
                        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition-colors cursor-pointer"
                        title="Copy download link to send to your phone"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                        {copiedLink ? 'Link Copied!' : 'Copy Link'}
                      </button>
                    </div>

                    {downloadStarted && (
                      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm text-[#1A4F8A] font-medium flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0EA5E9] shrink-0" />
                        Download started! Check your phone's notification panel or Downloads folder to install.
                      </div>
                    )}

                  </div>

                  {/* Right Column: QR Code for Desktop Users */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <img 
                        src={qrCodeUrl} 
                        alt="Scan QR Code to open download on mobile" 
                        className="w-36 h-36 rounded-lg object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="font-display text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#1A4F8A]" />
                        On Desktop? Scan with Phone
                      </span>
                      <p className="text-[11px] text-slate-500 max-w-[200px] leading-tight">
                        Point your mobile camera at this code to open the download page directly on your phone.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Step-by-Step Android Installation Guide */}
              <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center font-display font-extrabold text-sm border border-blue-100">
                    1-4
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">How to Install on Android</h3>
                    <p className="text-xs text-slate-500 font-normal">Takes less than 30 seconds</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Step 1 */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1A4F8A] text-white text-xs font-bold flex items-center justify-center">1</span>
                      <h4 className="font-display text-sm font-bold text-slate-900">Tap Download</h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed font-normal">
                      Tap the <strong className="text-[#1A4F8A]">"Download Android APK"</strong> button above. The installer will save to your Downloads.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1A4F8A] text-white text-xs font-bold flex items-center justify-center">2</span>
                      <h4 className="font-display text-sm font-bold text-slate-900">Allow Download</h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed font-normal">
                      If Chrome prompts <em>"File might be harmful"</em>, tap <strong className="text-slate-900">Download anyway</strong> (standard notice for APKs).
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1A4F8A] text-white text-xs font-bold flex items-center justify-center">3</span>
                      <h4 className="font-display text-sm font-bold text-slate-900">Allow Unknown Sources</h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed font-normal">
                      Open the APK from notification bar. If prompted, toggle <strong className="text-slate-900">"Allow from this source"</strong> in Settings.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1A4F8A] text-white text-xs font-bold flex items-center justify-center">4</span>
                      <h4 className="font-display text-sm font-bold text-slate-900">Tap Install & Launch</h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed font-normal">
                      Tap <strong className="text-[#1A4F8A]">Install</strong>. Once done, tap Open to start practicing your AI mock interviews immediately!
                    </p>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: IOS / IPHONE INSTALLATION */}
          {activeTab === 'ios' && (
            <div className="space-y-8 animate-fadeIn">
              
              <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
                
                <div className="space-y-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#1A4F8A] border border-blue-100 text-xs font-bold uppercase tracking-wider">
                    iOS & iPadOS Native Web App
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Install on iPhone (No App Store Needed)
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
                    Install Interview Ready directly to your iOS home screen as a high-performance standalone Progressive Web App with full offline capabilities and audio support.
                  </p>
                </div>

                {/* 3 Step Visual Guide for iOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  
                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center font-display font-extrabold text-base border border-blue-100">
                      1
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-900">Open in Safari</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      Open <strong className="text-[#1A4F8A]">appinterviewready.top</strong> in <strong className="text-slate-900">Apple Safari</strong> on your iPhone or iPad.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center font-display font-extrabold text-base border border-blue-100">
                      2
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-900">Tap Share Icon</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      Tap the <strong className="text-slate-900">Share button (⎋ with arrow)</strong> at the bottom center of Safari's toolbar.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center font-display font-extrabold text-base border border-blue-100">
                      3
                    </div>
                    <h4 className="font-display text-sm font-bold text-slate-900">Add to Home Screen</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      Scroll down the menu and tap <strong className="text-[#1A4F8A]">"Add to Home Screen"</strong>, then tap <strong className="text-slate-900">Add</strong> in the top right.
                    </p>
                  </div>

                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs sm:text-sm text-[#1A4F8A] font-medium flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                  <div>
                    <strong>Native TestFlight Beta:</strong> We are also packaging an Apple TestFlight build. All subscribers will automatically receive early invitations.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SECTION 4 — APP FEATURES BREAKDOWN (Matching Main Page Card Design) */}
          <div className="space-y-4 pt-4">
            
            <div className="text-center space-y-1 mb-6">
              <span className="text-[#1A4F8A] font-display font-bold uppercase text-xs tracking-wider">
                What's Inside the App
              </span>
              <h3 className="font-display text-2xl font-extrabold text-slate-900">
                Key Features at Your Fingertips
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              <div className="p-6 bg-white border border-gray-200/80 rounded-2xl shadow-xs hover:border-[#0EA5E9]/50 hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center border border-blue-100">
                  <Mic className="w-5 h-5 text-[#1A4F8A]" />
                </div>
                <h4 className="font-display text-base font-bold text-slate-900">Voice Mock Interviews</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Speak answers aloud with real-time microphone capture. The AI dynamically asks follow-up questions tailored to your field.
                </p>
              </div>

              <div className="p-6 bg-white border border-gray-200/80 rounded-2xl shadow-xs hover:border-[#0EA5E9]/50 hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center border border-blue-100">
                  <BarChart3 className="w-5 h-5 text-[#1A4F8A]" />
                </div>
                <h4 className="font-display text-base font-bold text-slate-900">Instant AI Scoring</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Receive breakdowns of confidence, pacing, clarity, and industry keyword delivery with sample recruiter-approved ideal responses.
                </p>
              </div>

              <div className="p-6 bg-white border border-gray-200/80 rounded-2xl shadow-xs hover:border-[#0EA5E9]/50 hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A4F8A] flex items-center justify-center border border-blue-100">
                  <Zap className="w-5 h-5 text-[#1A4F8A]" />
                </div>
                <h4 className="font-display text-base font-bold text-slate-900">Offline Question Bank</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Access 500+ curated interview flashcards and sample behavioral answers even when commuting without mobile data.
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* SECTION 5 — FOOTER (Matching Main Page) */}
      <footer id="footer" className="bg-[#1A4F8A] text-white/80 py-16 border-t border-blue-900/30 mt-12">
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
              <a href="/#features" className="hover:text-white transition-colors font-normal text-blue-100/90">Features</a>
              <a href="/#how-it-works" className="hover:text-white transition-colors font-normal text-blue-100/90">How It Works</a>
              <a href="/#testimonials" className="hover:text-white transition-colors font-normal text-blue-100/90">Testimonials</a>
              <a href="/download" className="hover:text-white font-semibold text-cyan-300 transition-colors flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile App
              </a>
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
              <h4 className="text-white font-display font-bold uppercase tracking-wider text-xs mb-1">Legal & Support</h4>
              <a href="/privacy" className="hover:text-white text-left transition-colors font-normal text-blue-100/90">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-white text-left transition-colors font-normal text-blue-100/90">
                Terms of Service
              </a>
              <a href="mailto:info@appinterviewready.top" className="hover:text-cyan-300 text-left transition-colors font-bold text-cyan-400 flex items-center gap-1.5 pt-1">
                info@appinterviewready.top
              </a>
            </div>

          </div>

          {/* Social icons & copyright */}
          <div className="pt-8 border-t border-blue-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-blue-200 uppercase tracking-wider">
            <span>© 2026 Interview Ready. All rights reserved.</span>
            
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white text-blue-200 transition-colors" aria-label="LinkedIn Profile">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-white text-blue-200 transition-colors" aria-label="Twitter Profile">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
