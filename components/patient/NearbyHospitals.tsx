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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Find Nearby Government Eye Hospitals & Ayushman Centers
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Empaneled vision health centers for referral follow-up, laser treatment, and free screening under PM-JAY.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="medical-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Enter Pincode, District or Hospital Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mr-1" />}
          <button
            onClick={() => setSelectedType('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedType === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Hospitals
          </button>
          <button
            onClick={() => setSelectedType('ayushman')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedType === 'ayushman' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ayushman PM-JAY
          </button>
          <button
            onClick={() => setSelectedType('retina')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedType === 'retina' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Retina Specialists
          </button>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {hospitals.map((h) => (
          <div key={h.id} className="medical-card p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge-info text-[10.5px] font-bold">{h.type}</span>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">
                  {h.name}
                </h3>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-extrabold text-emerald-800">
                  {h.distance}
                </span>
              </div>
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
                <span className="font-semibold text-slate-900">{h.phone}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {h.ayushmanEmpaneled && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Free Treatment (PM-JAY)
                </span>
              )}
              {h.retinaSpecialistAvailable && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700">
                  <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                  Retina Specialist On-Duty
                </span>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={`tel:${h.phone}`}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                Call Hospital
              </a>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(h.name + ' ' + h.address)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary py-1.5 px-3 text-xs"
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
