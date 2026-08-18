import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout, initAuth } from '../lib/firebase';
import {
  EmailSubmission,
  createSubmissionsSpreadsheet,
  appendSubmissionsToSheet,
  fetchSheetSubmissions,
} from '../lib/googleSheets';
import { Sheet, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, LogOut, FileSpreadsheet, Plus, ShieldCheck } from 'lucide-react';

interface GoogleSheetsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: EmailSubmission[];
  onSubmissionsUpdated: (updated: EmailSubmission[]) => void;
}

export const GoogleSheetsManager: React.FC<GoogleSheetsManagerProps> = ({
  isOpen,
  onClose,
  submissions,
  onSubmissionsUpdated,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem('interview_ready_sheets_id') || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => localStorage.getItem('interview_ready_sheets_url') || '');
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [remoteSubmissions, setRemoteSubmissions] = useState<Array<{ email: string; date: string; spot: string; status: string }>>([]);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Login
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setStatusMessage({ type: 'success', text: `Signed in as ${result.user.email}` });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sign in with Google.' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setStatusMessage({ type: 'info', text: 'Signed out of Google.' });
  };

  // Create new Spreadsheet
  const handleCreateSpreadsheet = async () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Please sign in with Google first.' });
      return;
    }

    setIsCreatingSheet(true);
    setStatusMessage(null);

    try {
      const res = await createSubmissionsSpreadsheet(accessToken, 'Interview Ready - Email Submissions');
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem('interview_ready_sheets_id', res.spreadsheetId);
      localStorage.setItem('interview_ready_sheets_url', res.spreadsheetUrl);

      setStatusMessage({
        type: 'success',
        text: 'Google Sheet created successfully! Now syncing pending submissions...',
      });

      // Auto sync existing unsynced submissions
      if (submissions.length > 0) {
        await syncSubmissionsToSheet(res.spreadsheetId, accessToken, submissions);
      }
    } catch (err: any) {
      console.error('Create spreadsheet error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create Google Sheet.' });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Sync submissions helper
  const syncSubmissionsToSheet = async (
    targetSheetId: string,
    token: string,
    allSubmissions: EmailSubmission[]
  ) => {
    const unsynced = allSubmissions.filter((s) => !s.syncedToSheets);
    if (unsynced.length === 0) {
      setStatusMessage({ type: 'info', text: 'All recorded submissions are already synced to Google Sheets.' });
      return;
    }

    setIsSyncing(true);
    try {
      await appendSubmissionsToSheet(token, targetSheetId, unsynced);

      // Update synced status in local state
      const updated = allSubmissions.map((s) => ({ ...s, syncedToSheets: true }));
      onSubmissionsUpdated(updated);

      setStatusMessage({
        type: 'success',
        text: `Successfully synced ${unsynced.length} email submission(s) to Google Sheets!`,
      });

      // Refresh remote view
      loadRemoteSheetData(targetSheetId, token);
    } catch (err: any) {
      console.error('Sync error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sync submissions to Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual Trigger Sync
  const handleSyncNow = () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Please sign in with Google to sync.' });
      return;
    }
    if (!spreadsheetId) {
      setStatusMessage({ type: 'error', text: 'Please create or select a Google Sheet first.' });
      return;
    }
    syncSubmissionsToSheet(spreadsheetId, accessToken, submissions);
  };

  // Load Remote Sheet Rows
  const loadRemoteSheetData = async (targetId: string, token: string) => {
    try {
      const data = await fetchSheetSubmissions(token, targetId);
      setRemoteSubmissions(data);
    } catch (err) {
      console.error('Load sheet data error:', err);
    }
  };

  useEffect(() => {
    if (spreadsheetId && accessToken && isOpen) {
      loadRemoteSheetData(spreadsheetId, accessToken);
    }
  }, [spreadsheetId, accessToken, isOpen]);

  if (!isOpen) return null;

  const unsyncedCount = submissions.filter((s) => !s.syncedToSheets).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                Google Sheets Sync Manager
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Live OAuth Integration
                </span>
              </h3>
              <p className="text-xs text-slate-400">Record email submissions & dates directly into Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Authentication */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Step 1: Authorization</span>
                <h4 className="font-bold text-slate-900 text-sm">Google Account Connection</h4>
              </div>
              {user && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
              )}
            </div>

            {!user ? (
              <div className="pt-2">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 px-4 rounded-xl border border-slate-300 shadow-sm transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}
                </button>
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Grants permission to automatically write lead submissions to your Google Sheets.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800">{user.displayName || 'Google Account'}</div>
                    <div className="text-[11px] text-slate-500">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Spreadsheet Destination */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Step 2: Target Spreadsheet</span>
                <h4 className="font-bold text-slate-900 text-sm">Google Sheets File</h4>
              </div>
            </div>

            {spreadsheetId ? (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Interview Ready - Email Submissions</span>
                  </div>
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Open in Google Sheets
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  Spreadsheet ID: {spreadsheetId}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 p-4 space-y-3">
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-medium text-slate-700">No Google Sheet connected yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                    Click below to create a pre-formatted "Interview Ready - Email Submissions" spreadsheet in your Google Drive.
                  </p>
                </div>
                <button
                  onClick={handleCreateSpreadsheet}
                  disabled={!user || isCreatingSheet}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isCreatingSheet ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Spreadsheet...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Google Sheet Automatically
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sync Stats & Quick Trigger */}
          <div className="flex items-center justify-between bg-emerald-900/5 p-4 rounded-xl border border-emerald-900/10">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                Sync Overview
                {unsyncedCount > 0 ? (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                    {unsyncedCount} Pending Sync
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Fully Synced
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Total Local Submissions: <strong>{submissions.length}</strong> | Synced: <strong>{submissions.length - unsyncedCount}</strong>
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={!user || !spreadsheetId || isSyncing}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2 px-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Recorded Submissions Preview */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
              Recorded Submissions Log ({submissions.length})
            </h4>
            {submissions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                No email submissions captured yet. Enter an email in the website form to test live recording.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Email Address</th>
                      <th className="p-2.5">Submission Date</th>
                      <th className="p-2.5">Spot</th>
                      <th className="p-2.5 text-right">Sync Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {submissions.map((sub, idx) => (
                      <tr key={sub.id || idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">{sub.email}</td>
                        <td className="p-2.5 text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500">#{sub.waitlistSpot || '-'}</td>
                        <td className="p-2.5 text-right">
                          {sub.syncedToSheets ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              In Sheets
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Submissions automatically sync to Google Sheets when connected.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
