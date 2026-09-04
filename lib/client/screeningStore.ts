export interface ScreeningRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  gender: 'M' | 'F' | 'Other';
  timestamp: string;
  qualityVerdict: 'good' | 'borderline' | 'ungradeable';
  qualityScore: number;
  icdrGrade: number; // 0..4
  gradeLabel: string;
  referralRequired: boolean;
  referralUrgency: 'Immediate' | 'Within 14 Days' | 'Routine (6-12 Months)' | 'None';
  confidenceScore: number;
  status: 'Pending Doctor Review' | 'Approved by Doctor' | 'Recapture Requested' | 'Overridden';
  doctorNotes?: string;
  reviewedAt?: string;
  imageDataUrl?: string;
  lesionSummary: string;
}

const STORAGE_KEY = 'retinasetu_screening_history';

/** Sample initial data so the Doctor Dashboard is pre-populated for presentations. */
const INITIAL_DEMO_RECORDS: ScreeningRecord[] = [
  {
    id: 'rec-101',
    patientId: 'PAT-8842',
    patientName: 'Ramesh Kumar',
    patientAge: 58,
    gender: 'M',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    qualityVerdict: 'good',
    qualityScore: 84,
    icdrGrade: 3,
    gradeLabel: 'Severe NPDR',
    referralRequired: true,
    referralUrgency: 'Immediate',
    confidenceScore: 88,
    status: 'Pending Doctor Review',
    lesionSummary: '14 Microaneurysms, 6 Hemorrhages, Venous Beading',
  },
  {
    id: 'rec-102',
    patientId: 'PAT-8843',
    patientName: 'Sunita Devi',
    patientAge: 62,
    gender: 'F',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    qualityVerdict: 'good',
    qualityScore: 91,
    icdrGrade: 0,
    gradeLabel: 'No DR Detected',
    referralRequired: false,
    referralUrgency: 'Routine (6-12 Months)',
    confidenceScore: 96,
    status: 'Approved by Doctor',
    doctorNotes: 'Clean retina. Annual screening advised.',
    reviewedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    lesionSummary: 'No pathological retinal lesions detected',
  },
  {
    id: 'rec-103',
    patientId: 'PAT-8844',
    patientName: 'Mohd. Rafiq',
    patientAge: 51,
    gender: 'M',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    qualityVerdict: 'borderline',
    qualityScore: 52,
    icdrGrade: 2,
    gradeLabel: 'Moderate NPDR',
    referralRequired: true,
    referralUrgency: 'Within 14 Days',
    confidenceScore: 74,
    status: 'Pending Doctor Review',
    lesionSummary: '4 Microaneurysms, 2 Hard Exudates near arcade',
  },
  {
    id: 'rec-104',
    patientId: 'PAT-8845',
    patientName: 'Anandi Bai',
    patientAge: 67,
    gender: 'F',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    qualityVerdict: 'ungradeable',
    qualityScore: 22,
    icdrGrade: 0,
    gradeLabel: 'Ungradeable Capture',
    referralRequired: true,
    referralUrgency: 'Immediate',
    confidenceScore: 15,
    status: 'Recapture Requested',
    doctorNotes: 'Media opacity / lens smudge. Please clean lens and recapture.',
    reviewedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    lesionSummary: 'Quality gate failed — severe blur & motion artefact',
  },
];

export function getScreeningHistory(): ScreeningRecord[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_RECORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
      return INITIAL_DEMO_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_RECORDS;
  }
}

export function saveScreeningRecord(record: ScreeningRecord): ScreeningRecord[] {
  if (typeof window === 'undefined') return [];
  const current = getScreeningHistory();
  const updated = [record, ...current.filter((r) => r.id !== record.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function updateDoctorStatus(
  id: string,
  status: ScreeningRecord['status'],
  notes?: string,
): ScreeningRecord[] {
  if (typeof window === 'undefined') return [];
  const current = getScreeningHistory();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        status,
        doctorNotes: notes ?? item.doctorNotes,
        reviewedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearScreeningHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
}
