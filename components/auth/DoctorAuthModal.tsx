'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldAlert, UserCheck, X } from 'lucide-react';

export function DoctorAuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [docId, setDocId] = useState('DOC-8842');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Demo credentials for SIH judges: PIN is 1234
    if (pin === '1234' || pin === '8842') {
      sessionStorage.setItem('retinaSetu_docAuth', 'true');
      sessionStorage.setItem('retinaSetu_docId', docId || 'DOC-8842');
      onClose();
      router.push('/admin');
    } else {
      setError('Invalid Access PIN. Access restricted to registered ophthalmologists (SIH Demo PIN: 1234).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-up">
      <div className="clinical-card w-full max-w-md p-6 shadow-2xl bg-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-700 text-white">
              <Lock className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Ophthalmologist Login
              </h3>
              <p className="text-xs text-slate-500">
                Authorized clinical sign-off portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Demo Callout */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-start gap-2">
          <UserCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-950">SIH Evaluator Demo PIN:</span>
            <p className="mt-0.5 text-emerald-800">
              Enter <code className="font-bold text-emerald-950 bg-emerald-100 px-1 py-0.5 rounded">1234</code>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Physician / Specialist ID
            </label>
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Access PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (1234)"
              maxLength={6}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              required
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-3 text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold">
              Access Triage Workstation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
