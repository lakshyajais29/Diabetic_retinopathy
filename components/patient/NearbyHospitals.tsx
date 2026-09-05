'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Stethoscope,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/ui';

export interface Hospital {
  id: string;
  name: string;
  district: string;
  type: 'District Hospital' | 'Ayushman Bharat Center' | 'Retina Specialist Clinic' | 'Medical College';
  address: string;
  phone: string;
  distance: string;
  retinaSpecialistAvailable: boolean;
  ayushmanEmpaneled: boolean;
  timings: string;
  rating: number;
}

const SAMPLE_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'District Government Eye Hospital & Retina Care Center',
    district: 'Sangli / Satara',
    type: 'District Hospital',
    address: 'Civil Hospital Campus, Miraj-Sangli Road, Sangli',
    phone: '+91 0233-2221234',
    distance: '4.2 km from PHC',
    retinaSpecialistAvailable: true,
    ayushmanEmpaneled: true,
    timings: 'Mon-Sat: 8:00 AM - 4:00 PM (Emergency 24x7)',
    rating: 4.8,
  },
  {
    id: 'hosp-2',
    name: 'PM-JAY Ayushman Bharat Vision Health Center',
    district: 'Kadegaon / Vita',
    type: 'Ayushman Bharat Center',
    address: 'Near Main Bus Stand, Vita Road, Kadegaon',
    phone: '+91 02347-242100',
    distance: '1.5 km from PHC',
    retinaSpecialistAvailable: true,
    ayushmanEmpaneled: true,
    timings: 'Mon-Sat: 9:00 AM - 5:00 PM',
    rating: 4.6,
  },
  {
    id: 'hosp-3',
    name: 'Government Medical College & Tertiary Eye Hospital',
    district: 'Miraj',
    type: 'Medical College',
    address: 'Pandharpur Road, Miraj Medical Complex',
    phone: '+91 0233-2232091',
    distance: '12.0 km from PHC',
    retinaSpecialistAvailable: true,
    ayushmanEmpaneled: true,
    timings: 'Open 24x7 for Eye Emergencies & Laser',
    rating: 4.9,
  },
  {
    id: 'hosp-4',
    name: 'Sanjeevani Super Speciality Retina Institute',
    district: 'Kolhapur',
    type: 'Retina Specialist Clinic',
    address: 'Station Road, Opposite Railway Station, Kolhapur',
    phone: '+91 0231-2654321',
    distance: '38 km from PHC',
    retinaSpecialistAvailable: true,
    ayushmanEmpaneled: false,
    timings: 'Mon-Sat: 10:00 AM - 7:00 PM',
    rating: 4.7,
  },
];

export function NearbyHospitals() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [hospitals, setHospitals] = useState<Hospital[]>(SAMPLE_HOSPITALS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchHospitals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (selectedType === 'ayushman') params.set('ayushman', 'true');
        if (selectedType === 'retina') params.set('specialist', 'true');

        const res = await fetch(`/api/hospitals?${params.toString()}`);
        if (res.ok) {
          const payload = await res.json();
          if (!cancelled && payload.data && Array.isArray(payload.data)) {
            setHospitals(payload.data);
          }
        }
      } catch (err) {
        console.warn('Hospital API search error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(fetchHospitals, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, selectedType]);

  return (
    <div className="space-y-5">
      {/* Header Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Government Eye Hospitals & Ayushman PM-JAY Centers
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Empaneled vision health facilities for referral follow-up, retinal laser therapy, and free treatment under Ayushman Bharat.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="clinical-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Enter Pincode, District, or Hospital Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600 mr-1 shrink-0" />}
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              onClick={() => setSelectedType('all')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition',
                selectedType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              All Centers
            </button>
            <button
              onClick={() => setSelectedType('ayushman')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition',
                selectedType === 'ayushman'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Ayushman PM-JAY
            </button>
            <button
              onClick={() => setSelectedType('retina')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition',
                selectedType === 'retina'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Retina Specialists
            </button>
          </div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {hospitals.map((h) => (
          <div key={h.id} className="clinical-card p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 uppercase">
                  {h.type}
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug">
                  {h.name}
                </h3>
              </div>
              <span className="shrink-0 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                {h.distance}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                {h.address}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {h.timings}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="font-semibold text-slate-800">{h.phone}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {h.ayushmanEmpaneled && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  Free Laser / PM-JAY Empaneled
                </span>
              )}
              {h.retinaSpecialistAvailable && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  <Stethoscope className="h-3.5 w-3.5 text-sky-700" />
                  Specialist On-Duty
                </span>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <a
                href={`tel:${h.phone}`}
                className="btn-secondary py-1.5 px-3 text-xs flex-1 text-center"
              >
                <Phone className="h-3.5 w-3.5" />
                Call Facility
              </a>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(h.name + ' ' + h.address)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary py-1.5 px-3 text-xs flex-1 text-center"
              >
                <Navigation className="h-3.5 w-3.5" />
                Get Directions
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
