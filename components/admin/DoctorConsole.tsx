'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  getScreeningHistory,
  updateDoctorStatus,
  clearScreeningHistory,
  type ScreeningRecord,
} from '@/lib/client/screeningStore';

import { Lock } from 'lucide-react';

export function DoctorConsole() {
  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [doctorNoteInput, setDoctorNoteInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const reloadRecords = () => {
    setRecords(getScreeningHistory());
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('retinaSetu_docAuth');
      if (auth === 'true') setAuthenticated(true);
    }
    reloadRecords();
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === '8842') {
      sessionStorage.setItem('retinaSetu_docAuth', 'true');
      setAuthenticated(true);
    } else {
      setPinError('Invalid Access PIN. Access restricted to registered ophthalmologists (SIH Demo PIN: 1234).');
    }
  };

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 animate-fade-up">
        <div className="medical-card-hero p-7 shadow-2xl bg-white border-emerald-500/30 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
              <Lock className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Doctor Console Lock
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Restricted to Registered Ophthalmologists
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs font-medium text-emerald-900 flex items-start gap-2.5">
            <UserCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-emerald-950">SIH Judge Demo Access:</span>
              <p className="mt-0.5 text-emerald-800">
                Enter Doctor PIN: <code className="font-bold text-emerald-950">1234</code>
              </p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                Security Access PIN
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN (1234)"
                maxLength={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                required
              />
            </div>

            {pinError && (
              <p className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                {pinError}
              </p>
            )}

            <button type="submit" className="gradient-btn-primary w-full py-3 text-xs font-extrabold">
              <Lock className="h-4 w-4" />
              Authenticate & Unlock Console
            </button>
          </form>
        </div>
      </div>
    );
  }


  const handleAction = (id: string, newStatus: ScreeningRecord['status']) => {
    const updated = updateDoctorStatus(id, newStatus, doctorNoteInput);
    setRecords(updated);
    if (selectedRecord?.id === id) {
      setSelectedRecord(updated.find((r) => r.id === id) || null);
    }
    setDoctorNoteInput('');
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.gradeLabel.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'pending') return matchesSearch && r.status === 'Pending Doctor Review';
    if (statusFilter === 'high-risk')
      return matchesSearch && (r.icdrGrade >= 3 || r.referralUrgency === 'Immediate');
    if (statusFilter === 'approved') return matchesSearch && r.status === 'Approved by Doctor';
    return matchesSearch;
  });

  const pendingCount = records.filter((r) => r.status === 'Pending Doctor Review').length;
  const highRiskCount = records.filter(
    (r) => r.referralRequired && (r.icdrGrade >= 3 || r.referralUrgency === 'Immediate'),
  ).length;
  const approvedCount = records.filter((r) => r.status === 'Approved by Doctor').length;

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8 animate-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
              <UserCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-2">
                District Ophthalmologist Console
                <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
                Validate AI-screened diabetic retinopathy cases, review high-risk referrals, and sign off patient records.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={reloadRecords} className="gradient-btn-secondary">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Queue
          </button>
          <button
            onClick={() => {
              clearScreeningHistory();
              reloadRecords();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 shadow-sm transition"
          >
            Reset Demo Data
          </button>
        </div>
      </div>

      {/* Overview Metric Hero Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="medical-card-hero border-rose-200 bg-gradient-to-br from-white via-rose-50/30 to-rose-100/20 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-rose-700 uppercase">
              High Risk / Urgent Cases
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-600 shadow-sm">
              <ShieldAlert className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold text-slate-900 tabular tracking-tight">{highRiskCount}</p>
          <p className="mt-1 text-xs font-medium text-rose-700">Requires immediate specialist sign-off</p>
        </div>

        <div className="medical-card-hero border-amber-200 bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-amber-800 uppercase">
              Pending Doctor Review
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700 shadow-sm">
              <Clock className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold text-slate-900 tabular tracking-tight">{pendingCount}</p>
          <p className="mt-1 text-xs font-medium text-amber-800">Awaiting clinical decision in queue</p>
        </div>

        <div className="medical-card-hero border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-100/20 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-emerald-800 uppercase">
              Approved & Signed Off
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold text-slate-900 tabular tracking-tight">{approvedCount}</p>
          <p className="mt-1 text-xs font-medium text-emerald-800">Completed doctor sign-offs today</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="medical-card-hero flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between p-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient ID, name, or ICDR grade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-inner"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Cases
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('high-risk')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === 'high-risk' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              High Risk
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved
            </button>
          </div>
        </div>
      </div>

      {/* Patient Referral Queue Table */}
      <div className="medical-card-hero overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-4">Patient</th>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Quality Gate</th>
                <th className="px-5 py-4">AI ICDR Grade</th>
                <th className="px-5 py-4">Referral Urgency</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No patient records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors duration-150 group">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{r.patientName}</div>
                      <div className="text-[11px] font-medium text-slate-500">
                        {r.patientId} • {r.patientAge}y/{r.gender}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap tabular font-mono font-medium">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          r.qualityVerdict === 'good'
                            ? 'badge-emerald'
                            : r.qualityVerdict === 'borderline'
                            ? 'badge-amber'
                            : 'badge-rose'
                        }
                      >
                        {r.qualityVerdict.toUpperCase()} ({r.qualityScore}/100)
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{r.gradeLabel}</div>
                      <div className="text-[10px] text-slate-500 font-medium">ICDR Grade {r.icdrGrade}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-xl px-3 py-1 text-[11px] font-extrabold ${
                          r.referralUrgency === 'Immediate'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm animate-pulse'
                            : r.referralUrgency === 'Within 14 Days'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.referralUrgency}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          r.status === 'Approved by Doctor'
                            ? 'badge-emerald'
                            : r.status === 'Recapture Requested'
                            ? 'badge-rose'
                            : 'badge-amber'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setDoctorNoteInput(r.doctorNotes || '');
                        }}
                        className="gradient-btn-secondary py-1.5 px-3.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-fade-up">
          <div className="medical-card-hero w-full max-w-2xl p-7 shadow-2xl space-y-6 bg-white border-emerald-500/30">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 font-display">
                  Case Review: {selectedRecord.patientName} ({selectedRecord.patientId})
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {selectedRecord.patientAge} Yrs / {selectedRecord.gender} • Screened at{' '}
                  {new Date(selectedRecord.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="glass-panel p-4 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Quality Gate Verdict
                </span>
                <p className="text-base font-extrabold text-slate-900">
                  {selectedRecord.qualityVerdict.toUpperCase()} ({selectedRecord.qualityScore}/100)
                </p>
              </div>
              <div className="glass-panel p-4 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  AI ICDR Classification
                </span>
                <p className="text-base font-extrabold text-slate-900">{selectedRecord.gradeLabel}</p>
              </div>
            </div>

            <div className="glass-panel p-4 space-y-1.5 text-xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Clinical Findings & Lesion Burden
              </span>
              <p className="text-slate-800 font-semibold">{selectedRecord.lesionSummary}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800">
                Doctor Assessment & Clinical Notes:
              </label>
              <textarea
                value={doctorNoteInput}
                onChange={(e) => setDoctorNoteInput(e.target.value)}
                placeholder="Enter notes or specific instructions for PHC screener..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition shadow-inner"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                onClick={() => handleAction(selectedRecord.id, 'Recapture Requested')}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 transition shadow-sm"
              >
                <XCircle className="h-4 w-4" />
                Request Recapture
              </button>
              <button
                onClick={() => handleAction(selectedRecord.id, 'Approved by Doctor')}
                className="gradient-btn-primary"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & Sign Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
