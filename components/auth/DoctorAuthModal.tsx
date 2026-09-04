'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldAlert, Sparkles, UserCheck, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-fade-up">
      <div className="medical-card-hero w-full max-w-md p-6 shadow-2xl bg-white border-emerald-500/30 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-md shadow-emerald-500/20">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-1.5">
                Doctor Portal Access
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Ophthalmologist Passcode Authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Demo Hint Banner */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs font-medium text-emerald-900 flex items-start gap-2.5">
          <UserCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-emerald-950">SIH Judge Demo Credentials:</span>
            <p className="mt-0.5 text-emerald-800">
              Registration ID: <code className="font-bold text-emerald-950">DOC-8842</code> · PIN:{' '}
              <code className="font-bold text-emerald-950">1234</code>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              Doctor Registration ID / Medical License
            </label>
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="e.g. DOC-8842 or MCI-9921"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              Security Access PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 4-digit PIN (1234)"
              maxLength={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button type="submit" className="gradient-btn-primary py-2.5 px-5 text-xs">
              <Lock className="h-3.5 w-3.5" />
              Authenticate & Open Console
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
