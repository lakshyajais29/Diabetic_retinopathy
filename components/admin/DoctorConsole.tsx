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
  UserCheck,
  XCircle,
  Lock,
} from 'lucide-react';
import {
  fetchScreeningHistoryAsync,
  updateDoctorStatus,
  clearScreeningHistory,
  type ScreeningRecord,
} from '@/lib/client/screeningStore';
import { cn } from '@/lib/ui';

export function DoctorConsole() {
  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [doctorNoteInput, setDoctorNoteInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const reloadRecords = async () => {
    const data = await fetchScreeningHistoryAsync();
    setRecords(data);
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
      <div className="mx-auto max-w-md py-12 px-4 animate-fade-up">
        <div className="clinical-card p-6 sm:p-7 shadow-lg bg-white space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Ophthalmologist Workstation
              </h2>
              <p className="text-xs text-slate-500">
                District Tele-Ophthalmology Referral Queue
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
            <UserCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950">SIH Evaluator Demo Access:</span>
              <p className="mt-0.5 text-emerald-800">
                Security PIN: <code className="font-bold text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded">1234</code>
              </p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Medical Officer PIN
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN (1234)"
                maxLength={6}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                required
              />
            </div>

            {pinError && (
              <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                {pinError}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-bold">
              <Lock className="h-3.5 w-3.5" />
              Authenticate & Access Triage Queue
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 animate-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white shadow-xs">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              District Ophthalmologist Workstation
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Validate AI-screened diabetic retinopathy referrals and authorize treatment sign-off.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reloadRecords} className="btn-secondary py-1.5 px-3 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => {
              clearScreeningHistory();
              reloadRecords();
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition"
          >
            Reset Demo Data
          </button>
        </div>
      </div>

      {/* KPI Triage Metrics */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="clinical-card border-rose-200 bg-rose-50/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-rose-800 uppercase">
              High Risk / Immediate
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular">{highRiskCount}</p>
          <p className="mt-1 text-xs text-rose-800">Requires urgent specialist review</p>
        </div>

        <div className="clinical-card border-amber-200 bg-amber-50/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-amber-800 uppercase">
              Pending Doctor Review
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular">{pendingCount}</p>
          <p className="mt-1 text-xs text-amber-800">Awaiting clinical decision in queue</p>
        </div>

        <div className="clinical-card border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
              Approved & Signed Off
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular">{approvedCount}</p>
          <p className="mt-1 text-xs text-emerald-800">Completed doctor sign-offs</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="clinical-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient ID, name, or ICDR grade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-bold transition',
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              All Cases
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-bold transition',
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('high-risk')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-bold transition',
                statusFilter === 'high-risk'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              High Risk
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-bold transition',
                statusFilter === 'approved'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Approved
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Mobile Card View (sm:hidden)                                       */}
      {/* ================================================================== */}
      <div className="space-y-3 sm:hidden">
        {filteredRecords.length === 0 ? (
          <div className="clinical-card p-8 text-center text-xs text-slate-500">
            No patient encounters found matching criteria.
          </div>
        ) : (
          filteredRecords.map((r) => (
            <div key={r.id} className="clinical-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{r.patientName}</p>
                  <p className="text-[11px] text-slate-500">
                    {r.patientId} · {r.patientAge}y/{r.gender}
                  </p>
                </div>
                <span className="font-mono text-[10.5px] text-slate-500">
                  {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-50 border border-slate-100 p-2">
                  <p className="text-[10px] text-slate-500 font-medium">Quality</p>
                  <p className="font-bold text-slate-800 capitalize">
                    {r.qualityVerdict} ({r.qualityScore}/100)
                  </p>
                </div>
                <div className="rounded bg-slate-50 border border-slate-100 p-2">
                  <p className="text-[10px] text-slate-500 font-medium">Severity</p>
                  <p className="font-bold text-slate-800">{r.gradeLabel}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span
                  className={cn(
                    'clinical-badge text-[10px]',
                    r.status === 'Approved by Doctor'
                      ? 'badge-safe'
                      : r.status === 'Recapture Requested'
                      ? 'badge-critical'
                      : 'badge-warning',
                  )}
                >
                  {r.status}
                </span>

                <button
                  onClick={() => {
                    setSelectedRecord(r);
                    setDoctorNoteInput(r.doctorNotes || '');
                  }}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Review Case
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================================================================== */}
      {/* Desktop Triage Table (hidden sm:block)                             */}
      {/* ================================================================== */}
      <div className="clinical-card overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Patient Encounter</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Quality Score</th>
                <th className="px-4 py-3">AI ICDR Severity</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Triage Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No patient records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{r.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.patientId} · {r.patientAge}y / {r.gender}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular font-mono text-slate-500">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'clinical-badge text-[10.5px]',
                          r.qualityVerdict === 'good'
                            ? 'badge-safe'
                            : r.qualityVerdict === 'borderline'
                            ? 'badge-warning'
                            : 'badge-critical',
                        )}
                      >
                        {r.qualityVerdict.toUpperCase()} ({r.qualityScore}/100)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{r.gradeLabel}</div>
                      <div className="text-[10px] text-slate-500">ICDR Grade {r.icdrGrade}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-md px-2 py-0.5 text-[11px] font-bold',
                          r.referralUrgency === 'Immediate'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : r.referralUrgency === 'Within 14 Days'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {r.referralUrgency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'clinical-badge text-[10.5px]',
                          r.status === 'Approved by Doctor'
                            ? 'badge-safe'
                            : r.status === 'Recapture Requested'
                            ? 'badge-critical'
                            : 'badge-warning',
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setDoctorNoteInput(r.doctorNotes || '');
                        }}
                        className="btn-secondary py-1 px-3 text-xs"
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

      {/* ================================================================== */}
      {/* Case Review Modal                                                  */}
      {/* ================================================================== */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-up">
          <div className="clinical-card w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-5 bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Case Review: {selectedRecord.patientName} ({selectedRecord.patientId})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRecord.patientAge} Yrs / {selectedRecord.gender} · Encounter timestamp:{' '}
                  {new Date(selectedRecord.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Quality Gate Verdict
                </span>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {selectedRecord.qualityVerdict.toUpperCase()} ({selectedRecord.qualityScore}/100)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  AI ICDR Classification
                </span>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{selectedRecord.gradeLabel}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Clinical Recommendation Headline:
              </span>
              <p className="text-slate-800 font-medium leading-relaxed">
                {selectedRecord.lesionSummary}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Ophthalmologist Clinical Directions & Observations:
              </label>
              <textarea
                value={doctorNoteInput}
                onChange={(e) => setDoctorNoteInput(e.target.value)}
                placeholder="Specify follow-up, laser schedule, anti-VEGF consultation, or feedback for PHC operator..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                onClick={() => handleAction(selectedRecord.id, 'Recapture Requested')}
                className="btn-secondary text-rose-700 hover:text-rose-800 hover:border-rose-300 py-2 px-3.5 text-xs font-bold"
              >
                <XCircle className="h-3.5 w-3.5" />
                Request Recapture
              </button>
              <button
                onClick={() => handleAction(selectedRecord.id, 'Approved by Doctor')}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve & Sign Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
