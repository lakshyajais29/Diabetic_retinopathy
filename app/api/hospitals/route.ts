import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface HospitalData {
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

const FALLBACK_HOSPITALS: HospitalData[] = [
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
    address: 'Pandharpur Road, Miraj, Sangli District',
    phone: '+91 0233-2232091',
    distance: '8.7 km from PHC',
    retinaSpecialistAvailable: true,
    ayushmanEmpaneled: true,
    timings: '24x7 Emergency Retinal Laser Services',
    rating: 4.9,
  },
  {
    id: 'hosp-4',
    name: 'Sanjeevani Retina Specialist Eye Clinic',
    district: 'Sangli City',
    type: 'Retina Specialist Clinic',
    address: 'Station Road, Opposite ST Stand, Sangli',
    phone: '+91 0233-2554321',
    distance: '5.1 km from PHC',
    retinaSpecialistAvailable: true,
    ayushmanEmpaneled: false,
    timings: 'Mon-Sat: 10:00 AM - 7:00 PM',
    rating: 4.7,
  },
  {
    id: 'hosp-5',
    name: 'Sub-District Health Center & Tele-Ophthalmology Node',
    district: 'Walwa / Islampur',
    type: 'Ayushman Bharat Center',
    address: 'Tehsil Office Circle, Islampur',
    phone: '+91 02342-220111',
    distance: '12.3 km from PHC',
    retinaSpecialistAvailable: false,
    ayushmanEmpaneled: true,
    timings: 'Mon-Sat: 8:00 AM - 2:00 PM',
    rating: 4.4,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const districtFilter = searchParams.get('district');
    const specialistOnly = searchParams.get('specialist') === 'true';
    const ayushmanOnly = searchParams.get('ayushman') === 'true';

    let hospitals: HospitalData[] = [];

    // Try database if configured
    if (process.env.DATABASE_URL) {
      try {
        const dbHospitals = await db.hospital.findMany({
          where: {
            AND: [
              query
                ? {
                    OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { district: { contains: query, mode: 'insensitive' } },
                      { address: { contains: query, mode: 'insensitive' } },
                    ],
                  }
                : {},
              districtFilter ? { district: districtFilter } : {},
              specialistOnly ? { retinaSpecialistAvailable: true } : {},
              ayushmanOnly ? { ayushmanEmpaneled: true } : {},
            ],
          },
          orderBy: { rating: 'desc' },
        });

        hospitals = dbHospitals.map((h: { id: string; name: string; district: string; type: string; address: string; phone: string; distanceText: string | null; retinaSpecialistAvailable: boolean; ayushmanEmpaneled: boolean; timings: string; rating: number }) => ({
          id: h.id,
          name: h.name,
          district: h.district,
          type: h.type as HospitalData['type'],
          address: h.address,
          phone: h.phone,
          distance: h.distanceText || 'Nearby PHC',
          retinaSpecialistAvailable: h.retinaSpecialistAvailable,
          ayushmanEmpaneled: h.ayushmanEmpaneled,
          timings: h.timings,
          rating: h.rating,
        }));
      } catch (err) {
        console.warn('DB query failed, falling back to mock hospitals', err);
      }
    }

    if (hospitals.length === 0) {
      hospitals = FALLBACK_HOSPITALS.filter((h: HospitalData) => {
        const matchesQuery =
          !query ||
          h.name.toLowerCase().includes(query) ||
          h.district.toLowerCase().includes(query) ||
          h.address.toLowerCase().includes(query);
        const matchesDistrict = !districtFilter || h.district.includes(districtFilter);
        const matchesSpecialist = !specialistOnly || h.retinaSpecialistAvailable;
        const matchesAyushman = !ayushmanOnly || h.ayushmanEmpaneled;

        return matchesQuery && matchesDistrict && matchesSpecialist && matchesAyushman;
      });
    }

    return NextResponse.json({
      success: true,
      count: hospitals.length,
      data: hospitals,
    });
  } catch (err) {
    console.error('Hospital API error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hospital records' },
      { status: 500 }
    );
  }
}
