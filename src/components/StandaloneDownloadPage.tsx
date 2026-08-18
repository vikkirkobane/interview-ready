import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  QrCode, 
  HelpCircle, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Layers,
  Zap,
  Mic,
  BarChart3,
  Copy,
  Check
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
    // Trigger download
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
  
  // Public QR Code SVG API for fast, zero-dependency high-res rendering
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&color=00F0FF&bgcolor=0B192C&margin=10`;

  const copyPageUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#050C1A] text-slate-100 font-sans flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
      {/* Background glowing effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/10 blur-[130px] rounded-full"></div>
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-cyan-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 bg-[#0A192F]/80 backdrop-blur-md py-4 px-6 border-b border-slate-800/80 sticky top-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a 
            href="/" 
            onClick={handleHomeClick} 
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                Interview Ready
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Mobile App
                </span>
              </span>
            </div>
          </a>

          <a 
            href="/" 
            onClick={handleHomeClick}
            className="text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2 rounded-xl transition-all duration-200 border border-slate-700 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Website
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow py-8 px-4 md:py-14">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Hero Welcome Card */}
          <div className="text-center space-y-4">
            {userEmail && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Access Unlocked for <strong className="text-white">{userEmail}</strong>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Install <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Interview Ready</span> on Your Phone
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Practice role-specific mock interviews with real-time AI audio, scoring, and feedback anywhere, anytime on your mobile device.
            </p>
          </div>

          {/* OS Switcher Tabs */}
          <div className="flex justify-center">
            <div className="p-1 bg-[#0A192F] border border-slate-800 rounded-2xl flex items-center shadow-xl">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'android'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Android (Direct APK)
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'ios'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                iOS / iPhone (Safari PWA)
              </button>
            </div>
          </div>

          {/* Tab 1: Android Direct APK */}
          {activeTab === 'android' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Download Action Card */}
              <div className="bg-gradient-to-b from-[#0B1A30] to-[#071120] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-7 space-y-5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Safe & Clean
                      </span>
                      <span className="text-xs text-slate-400 font-medium">v1.0.0-beta • 24.8 MB</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white">Interview Ready for Android</h2>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Download the official Android APK directly. Compatible with Android 8.0 and higher on Samsung, Google Pixel, Xiaomi, OnePlus, and all Android smartphones.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={handleDownloadApk}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-extrabold text-base px-8 py-4 rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Download className="w-5 h-5 stroke-[2.5]" />
                        {downloadStarted ? 'Downloading APK...' : 'Download Android APK'}
                      </button>

                      <button
                        onClick={copyPageUrl}
                        className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-colors"
                        title="Copy page link to send to your phone"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedLink ? 'Link Copied!' : 'Copy Link'}
                      </button>
                    </div>

                    {downloadStarted && (
                      <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        Download started! Check your phone's notification bar or Downloads folder to install.
                      </div>
                    )}
                  </div>

                  {/* QR Code section for desktop users */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-[#060D1A]/90 rounded-2xl border border-slate-800/80 text-center space-y-3">
                    <div className="p-2 bg-[#0B192C] rounded-xl border border-cyan-500/30 shadow-inner">
                      <img 
                        src={qrCodeUrl} 
                        alt="Scan QR code with phone" 
                        className="w-36 h-36 rounded-lg object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                        On Desktop? Scan with Phone
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Point your phone camera here to open and download instantly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Android Installation Guide */}
              <div className="bg-[#0A192F]/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                    1-4
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">How to Install on Android</h3>
                    <p className="text-xs text-slate-400">Takes less than 30 seconds</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Step 1 */}
                  <div className="p-4 bg-[#071120] border border-slate-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center">1</span>
                      <h4 className="text-sm font-semibold text-white">Download the APK</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                      Tap the <strong className="text-cyan-300">"Download Android APK"</strong> button above. The file will save to your phone's storage.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 bg-[#071120] border border-slate-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center">2</span>
                      <h4 className="text-sm font-semibold text-white">Allow Download</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                      If Chrome asks <em>"File might be harmful"</em>, tap <strong className="text-white">Download anyway</strong>. (Standard Android notice for non-Play Store files).
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 bg-[#071120] border border-slate-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center">3</span>
                      <h4 className="text-sm font-semibold text-white">Enable Unknown Sources</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                      Tap the downloaded file. If prompted, toggle <strong className="text-white">"Allow from this source"</strong> in Settings to proceed.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 bg-[#071120] border border-slate-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center">4</span>
                      <h4 className="text-sm font-semibold text-white">Tap Install & Launch</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                      Press <strong className="text-cyan-300">Install</strong>. Once finished, tap Open to start practicing your AI mock interviews!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: iOS / iPhone Installation */}
          {activeTab === 'ios' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-gradient-to-b from-[#0B1A30] to-[#071120] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="space-y-3">
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">
                    iOS & iPadOS Native Web App
                  </span>
                  <h2 className="text-2xl font-bold text-white">Install on iPhone (No App Store Required)</h2>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Install Interview Ready directly onto your iOS home screen as a standalone Progressive Web App (PWA) with offline readiness and full-screen microphone access.
                  </p>
                </div>

                {/* 3 Step Visual Guide for iOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-5 bg-[#071120] border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-white">Open in Safari</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Make sure you are browsing this page in <strong className="text-white">Apple Safari</strong> on your iPhone or iPad.
                    </p>
                  </div>

                  <div className="p-5 bg-[#071120] border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-white">Tap the Share Button</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tap the <strong className="text-white">Share icon (⎋ with arrow)</strong> in the center of Safari's bottom toolbar.
                    </p>
                  </div>

                  <div className="p-5 bg-[#071120] border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-white">Add to Home Screen</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Scroll down the menu and tap <strong className="text-cyan-300">"Add to Home Screen"</strong>, then tap <strong className="text-white">Add</strong> in the top right.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-950/30 border border-blue-500/20 rounded-2xl text-xs text-blue-200 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <strong>Native TestFlight Beta:</strong> We are rolling out our native iOS App Store TestFlight build soon. All subscribers will automatically receive an invitation.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Highlights Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
            <div className="p-5 bg-[#071120]/80 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <Mic className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Voice Mock Interviews</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Speak answers aloud and receive dynamic follow-up questions just like a real interview panel.
              </p>
            </div>

            <div className="p-5 bg-[#071120]/80 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Instant Scoring & Analysis</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive immediate breakdown of confidence, pacing, clarity, and keyword delivery with sample ideal answers.
              </p>
            </div>

            <div className="p-5 bg-[#071120]/80 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Offline Practice Mode</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Access curated interview question banks and flashcards even without an active internet connection.
              </p>
            </div>
          </div>

          {/* FAQ & Support Section */}
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Interview Ready. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="mailto:info@appinterviewready.top" className="text-cyan-400 hover:underline">
                Contact Support (info@appinterviewready.top)
              </a>
              <span>•</span>
              <a href="/privacy" className="hover:text-slate-300">Privacy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-slate-300">Terms</a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
