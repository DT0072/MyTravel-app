import { Injectable, inject } from '@angular/core';
import { Observable, from as fromPromise, of } from 'rxjs';

import { AppLanguage } from './accessibility-preferences.service';
import { GtfsRaptorItinerary, GtfsRaptorService } from './gtfs-raptor.service';
import { GtfsRealtimeService } from './gtfs-realtime.service';

export interface NavigationRequest {
  from: string;
  to: string;
  mode?: string;
  sort: string;
  travelDate: string;
  travelTime: string;
}

export interface RouteLegDetail {
  type: 'walk' | 'transit';
  icon: 'walk-outline' | 'bus-outline' | 'train-outline';
  badgeLabel: string;
  badgeColor: string;
  headsign?: string;
  fromName: string;
  toName: string;
  departTime: string;
  arriveTime: string;
  durationText: string;
  distanceText?: string;
  stopCount?: number;
  intermediateStops?: string[];
  isAccessible?: boolean;
  liveTracked?: boolean;
  coords: [number, number][];
}

export interface RouteOption {
  mode: string;
  detail: string;
  color: string;
  depart: string;
  arrive: string;
  duration: string;
  fare: string;
  walk: string;
  transfers: number;
  isAccessible: boolean;
  accessibilityNote: string;
  points?: string;
  co2Saved?: string;
  steps?: string[];
  gtfsPowered?: boolean;
  liveTracked?: boolean;
  waypoints?: [number, number][];
  firstBoardingText?: string;
  legs?: RouteLegDetail[];
}

export interface ServiceStatus {
  line: string;
  route: string;
  state: string;
  color: string;
  headway?: string;
  crowding?: string;
  advisory?: string;
}

export interface TransitLocationSuggestion {
  name: string;
  subtitle: string;
  state: string;
  lat: number;
  lng: number;
}

export interface RecentLocation {
  label: string;
  value: string;
  description: string;
}

type LocalizedText = Record<AppLanguage, string>;

interface SeededServiceStatus {
  line: string;
  color: string;
  route: LocalizedText;
  state: LocalizedText;
}

interface SeededRecentLocation {
  label: LocalizedText;
  value: string;
  description: LocalizedText;
}

interface RouteBlueprint {
  mode: string;
  detail: LocalizedText;
  color: string;
  durationMinutes: number;
  fare: string;
  walkMeters: number;
  transfers: number;
  isAccessible: boolean;
  accessibilityNote: LocalizedText;
}

const PLANNER_MODES = ['MRT', 'LRT', 'KTM', 'Bus', 'Walk'] as const;

const SERVICE_STATUSES: (SeededServiceStatus & {
  headway: LocalizedText;
  crowding: LocalizedText;
  advisory: LocalizedText;
})[] = [
  {
    line: 'MRT Kajang Line',
    color: '#0b57d0',
    route: {
      EN: 'Sungai Buloh to Kajang',
      BM: 'Sungai Buloh ke Kajang',
    },
    state: {
      EN: 'Running normally',
      BM: 'Beroperasi seperti biasa',
    },
    headway: { EN: 'Every 4 min', BM: 'Setiap 4 minit' },
    crowding: { EN: 'Moderate', BM: 'Sederhana' },
    advisory: {
      EN: 'All lifts and escalators operational at Pasar Seni & Muzium Negara.',
      BM: 'Semua lif dan eskalator beroperasi di Pasar Seni & Muzium Negara.',
    },
  },
  {
    line: 'LRT Kelana Jaya',
    color: '#d93025',
    route: {
      EN: 'Gombak to Putra Heights',
      BM: 'Gombak ke Putra Heights',
    },
    state: {
      EN: 'Minor platform crowding',
      BM: 'Kesesakan kecil di platform',
    },
    headway: { EN: 'Every 3 min', BM: 'Setiap 3 minit' },
    crowding: { EN: 'Busy at KLCC & Masjid Jamek', BM: 'Sibuk di KLCC & Masjid Jamek' },
    advisory: {
      EN: 'Allow 3–5 extra minutes during peak interchange hours.',
      BM: 'Peruntukkan 3–5 minit tambahan semasa waktu puncak pertukaran.',
    },
  },
  {
    line: 'Monorail',
    color: '#188038',
    route: {
      EN: 'KL Sentral to Titiwangsa',
      BM: 'KL Sentral ke Titiwangsa',
    },
    state: {
      EN: 'Good service',
      BM: 'Perkhidmatan baik',
    },
    headway: { EN: 'Every 6 min', BM: 'Setiap 6 minit' },
    crowding: { EN: 'Light', BM: 'Lancar' },
    advisory: {
      EN: '4-car trains active on Bukit Bintang tourism corridor.',
      BM: 'Tren 4 gerabak aktif di koridor pelancongan Bukit Bintang.',
    },
  },
  {
    line: 'MRT Putrajaya Line',
    color: '#d97706',
    route: {
      EN: 'Kwasa Damansara to Putrajaya Sentral',
      BM: 'Kwasa Damansara ke Putrajaya Sentral',
    },
    state: {
      EN: 'Running normally',
      BM: 'Beroperasi seperti biasa',
    },
    headway: { EN: 'Every 5 min', BM: 'Setiap 5 minit' },
    crowding: { EN: 'Light', BM: 'Lancar' },
    advisory: {
      EN: 'Direct step-free access to Tun Razak Exchange and Putrajaya Sentral.',
      BM: 'Akses tanpa tangga terus ke Tun Razak Exchange dan Putrajaya Sentral.',
    },
  },
  {
    line: 'KTM Komuter & ETS',
    color: '#1e40af',
    route: {
      EN: 'Batu Caves – KL Sentral – Northern ETS',
      BM: 'Batu Caves – KL Sentral – ETS Utara',
    },
    state: {
      EN: 'On schedule',
      BM: 'Mengikut jadual',
    },
    headway: { EN: 'Every 15–30 min', BM: 'Setiap 15–30 minit' },
    crowding: { EN: 'Light', BM: 'Lancar' },
    advisory: {
      EN: 'ETS services to Ipoh, Butterworth (Penang) & Arau (Perlis) operating on time.',
      BM: 'Perkhidmatan ETS ke Ipoh, Butterworth (Pulau Pinang) & Arau (Perlis) tepat pada masanya.',
    },
  },
  {
    line: 'Rapid Bus & GoKL',
    color: '#0d9488',
    route: {
      EN: 'Klang Valley, Penang CAT & Panorama Melaka',
      BM: 'Lembah Klang, Penang CAT & Panorama Melaka',
    },
    state: {
      EN: 'Good service',
      BM: 'Perkhidmatan baik',
    },
    headway: { EN: 'Every 10 min', BM: 'Setiap 10 minit' },
    crowding: { EN: 'Moderate', BM: 'Sederhana' },
    advisory: {
      EN: 'Low-floor accessible buses deployed on core heritage and museum loops.',
      BM: 'Bas lantai rendah mesra akses beroperasi di laluan warisan dan muzium utama.',
    },
  },
];

export const MALAYSIA_TRANSIT_LOCATIONS: TransitLocationSuggestion[] = [
  { name: 'KL Sentral', subtitle: 'National Rail & ERL Transit Hub', state: 'Kuala Lumpur', lat: 3.1342, lng: 101.6861 },
  { name: 'Mid Valley Megamall', subtitle: 'Lingkaran Syed Putra · KTM & LRT Abdullah Hukum', state: 'Kuala Lumpur', lat: 3.1177, lng: 101.6774 },
  { name: 'Sunway University', subtitle: 'Bandar Sunway · BRT Sunmed Station', state: 'Selangor', lat: 3.0672, lng: 101.6038 },
  { name: 'Sunway Pyramid', subtitle: 'Bandar Sunway · BRT Sunway Lagoon', state: 'Selangor', lat: 3.0733, lng: 101.6078 },
  { name: 'Pasar Seni', subtitle: 'Central Market · LRT & MRT Interchange', state: 'Kuala Lumpur', lat: 3.1424, lng: 101.6956 },
  { name: 'KLCC', subtitle: 'Petronas Twin Towers · LRT Kelana Jaya', state: 'Kuala Lumpur', lat: 3.1579, lng: 101.7116 },
  { name: 'Bukit Bintang', subtitle: 'MRT Kajang & KL Monorail Hub', state: 'Kuala Lumpur', lat: 3.1466, lng: 101.7112 },
  { name: 'Tun Razak Exchange (TRX)', subtitle: 'MRT Kajang & Putrajaya Interchange', state: 'Kuala Lumpur', lat: 3.1425, lng: 101.7186 },
  { name: '1 Utama Shopping Centre', subtitle: 'Bandar Utama · MRT Kajang Line', state: 'Selangor', lat: 3.1481, lng: 101.6157 },
  { name: 'Subang Jaya', subtitle: 'LRT Kelana Jaya & KTM Port Klang Interchange', state: 'Selangor', lat: 3.0846, lng: 101.5880 },
  { name: 'TBS (Terminal Bersepadu Selatan)', subtitle: 'Bandar Tasik Selatan · LRT, KTM & ERL', state: 'Kuala Lumpur', lat: 3.0776, lng: 101.7112 },
  { name: 'Dataran Merdeka', subtitle: 'Heritage Square · LRT Masjid Jamek', state: 'Kuala Lumpur', lat: 3.1489, lng: 101.6937 },
  { name: 'Merdeka 118', subtitle: 'MRT Merdeka & LRT Plaza Rakyat', state: 'Kuala Lumpur', lat: 3.1419, lng: 101.7007 },
  { name: 'Thean Hou Temple', subtitle: 'Hilltop Heritage Temple · Near KL Sentral', state: 'Kuala Lumpur', lat: 3.1219, lng: 101.6876 },
  { name: 'Batu Caves', subtitle: 'KTM Komuter Terminus', state: 'Selangor', lat: 3.2379, lng: 101.6840 },
  { name: 'Putrajaya Sentral', subtitle: 'MRT Putrajaya & ERL Transit', state: 'Putrajaya', lat: 2.9317, lng: 101.6713 },
  { name: 'George Town Heritage Core', subtitle: 'UNESCO Heritage · Rapid Penang CAT', state: 'Penang', lat: 5.4141, lng: 100.3288 },
  { name: 'Dutch Square & Jonker Walk', subtitle: 'Historic Melaka · Panorama Bus 17', state: 'Melaka', lat: 2.1944, lng: 102.2491 },
  { name: 'Timah Tasoh Lake', subtitle: 'Northern Eco-Lake · KTM ETS Arau', state: 'Perlis', lat: 6.5553, lng: 100.2179 },
  { name: 'Tasik Raban Lenggong', subtitle: 'UNESCO Valley · KTM ETS Kuala Kangsar', state: 'Perak', lat: 5.0124, lng: 100.9462 },
  { name: 'Kinabalu Park & Kundasang', subtitle: 'UNESCO Highland Park · KK Express', state: 'Sabah', lat: 6.0033, lng: 116.5425 },
];

const RECENT_LOCATIONS: SeededRecentLocation[] = [
  {
    label: {
      EN: 'KL Sentral',
      BM: 'KL Sentral',
    },
    value: 'KL Sentral',
    description: {
      EN: 'Transit hub and airport rail link',
      BM: 'Hab transit dan sambungan rel lapangan terbang',
    },
  },
  {
    label: {
      EN: 'Pasar Seni',
      BM: 'Pasar Seni',
    },
    value: 'Pasar Seni',
    description: {
      EN: 'Central Market and heritage area',
      BM: 'Pasar Seni dan kawasan warisan',
    },
  },
  {
    label: {
      EN: 'Merdeka 118',
      BM: 'Merdeka 118',
    },
    value: 'Merdeka 118',
    description: {
      EN: 'Landmark district near MRT and LRT',
      BM: 'Daerah mercu tanda berhampiran MRT dan LRT',
    },
  },
];

const ROUTE_BLUEPRINTS: Record<string, RouteBlueprint[]> = {
  MRT: [
    {
      mode: 'MRT',
      detail: {
        EN: 'Direct Kajang Line connection with one interchange',
        BM: 'Sambungan terus Laluan Kajang dengan satu pertukaran',
      },
      color: '#0b57d0',
      durationMinutes: 26,
      fare: 'RM2.80',
      walkMeters: 260,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Lifts and tactile paving are available at both stations.',
        BM: 'Lif dan laluan taktil tersedia di kedua-dua stesen.',
      },
    },
    {
      mode: 'MRT + Walk',
      detail: {
        EN: 'Shortest walking transfer through covered concourse',
        BM: 'Pertukaran berjalan kaki paling singkat melalui ruang legar berbumbung',
      },
      color: '#1967d2',
      durationMinutes: 31,
      fare: 'RM2.50',
      walkMeters: 140,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Best option for step-free access with shorter transfer paths.',
        BM: 'Pilihan terbaik untuk akses tanpa tangga dengan laluan pertukaran lebih pendek.',
      },
    },
    {
      mode: 'MRT Feeder',
      detail: {
        EN: 'MRT ride with feeder bus for the last stretch',
        BM: 'Perjalanan MRT dengan bas pengantara untuk bahagian akhir',
      },
      color: '#4285f4',
      durationMinutes: 34,
      fare: 'RM2.10',
      walkMeters: 110,
      transfers: 2,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Board only low-floor feeder buses for wheelchair access.',
        BM: 'Naik bas pengantara lantai rendah sahaja untuk akses kerusi roda.',
      },
    },
  ],
  LRT: [
    {
      mode: 'LRT',
      detail: {
        EN: 'Fast Kelana Jaya Line trip with timed transfer',
        BM: 'Perjalanan pantas Laluan Kelana Jaya dengan pertukaran berjadual',
      },
      color: '#d93025',
      durationMinutes: 24,
      fare: 'RM2.60',
      walkMeters: 250,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Wide fare gates and platform lifts are available.',
        BM: 'Pintu tambang luas dan lif platform tersedia.',
      },
    },
    {
      mode: 'LRT + Walk',
      detail: {
        EN: 'Less walking by using the street-level pedestrian link',
        BM: 'Kurang berjalan dengan menggunakan laluan pejalan kaki aras jalan',
      },
      color: '#ea4335',
      durationMinutes: 29,
      fare: 'RM2.40',
      walkMeters: 120,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Street crossing includes curb cuts and signalised crossings.',
        BM: 'Lintasan jalan mempunyai cerun tepi jalan dan isyarat pejalan kaki.',
      },
    },
    {
      mode: 'LRT Connector',
      detail: {
        EN: 'LRT option that links directly to bus interchange bays',
        BM: 'Pilihan LRT yang bersambung terus ke teluk pertukaran bas',
      },
      color: '#f28b82',
      durationMinutes: 33,
      fare: 'RM2.10',
      walkMeters: 180,
      transfers: 2,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Recommended when you need sheltered access between services.',
        BM: 'Disyorkan jika anda memerlukan akses berbumbung antara perkhidmatan.',
      },
    },
  ],
  KTM: [
    {
      mode: 'KTM',
      detail: {
        EN: 'Commuter rail trip with direct platform transfer',
        BM: 'Perjalanan rel komuter dengan pertukaran platform terus',
      },
      color: '#188038',
      durationMinutes: 30,
      fare: 'RM3.00',
      walkMeters: 300,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Ramps are available, but boarding gaps may need staff assistance.',
        BM: 'Rampa tersedia, tetapi jurang semasa menaiki mungkin memerlukan bantuan kakitangan.',
      },
    },
    {
      mode: 'KTM + Shuttle',
      detail: {
        EN: 'Lower walking route using the station shuttle connection',
        BM: 'Laluan kurang berjalan menggunakan sambungan shuttle stesen',
      },
      color: '#34a853',
      durationMinutes: 36,
      fare: 'RM2.70',
      walkMeters: 130,
      transfers: 2,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Shuttle stop is near the accessible station exit.',
        BM: 'Perhentian shuttle berhampiran pintu keluar stesen yang mesra akses.',
      },
    },
    {
      mode: 'KTM Limited',
      detail: {
        EN: 'Fastest rail-only option with moderate walking',
        BM: 'Pilihan rel sahaja terpantas dengan berjalan kaki sederhana',
      },
      color: '#81c995',
      durationMinutes: 28,
      fare: 'RM3.20',
      walkMeters: 210,
      transfers: 0,
      isAccessible: false,
      accessibilityNote: {
        EN: 'Some platforms may have limited lift access during peak hours.',
        BM: 'Sesetengah platform mungkin mempunyai akses lif terhad pada waktu puncak.',
      },
    },
  ],
  Bus: [
    {
      mode: 'Bus Rapid KL',
      detail: {
        EN: 'Direct bus lane service with one short stopover',
        BM: 'Perkhidmatan lorong bas terus dengan satu hentian singkat',
      },
      color: '#fbbc04',
      durationMinutes: 38,
      fare: 'RM1.80',
      walkMeters: 180,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Low-floor buses and priority seating are available on this route.',
        BM: 'Bas lantai rendah dan tempat duduk keutamaan tersedia pada laluan ini.',
      },
    },
    {
      mode: 'Bus + MRT',
      detail: {
        EN: 'Balanced route combining feeder bus and rail interchange',
        BM: 'Laluan seimbang menggabungkan bas pengantara dan pertukaran rel',
      },
      color: '#f9ab00',
      durationMinutes: 32,
      fare: 'RM2.20',
      walkMeters: 150,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Best balance of cost, shelter, and step-free access.',
        BM: 'Gabungan terbaik dari segi kos, perlindungan, dan akses tanpa tangga.',
      },
    },
    {
      mode: 'Express Bus',
      detail: {
        EN: 'Fastest surface route with limited stops',
        BM: 'Laluan permukaan terpantas dengan hentian terhad',
      },
      color: '#fdd663',
      durationMinutes: 29,
      fare: 'RM2.50',
      walkMeters: 240,
      transfers: 0,
      isAccessible: false,
      accessibilityNote: {
        EN: 'Some express coaches do not support wheelchair boarding.',
        BM: 'Sesetengah bas ekspres tidak menyokong menaiki kerusi roda.',
      },
    },
  ],
  Walk: [
    {
      mode: 'Walk',
      detail: {
        EN: 'Direct pedestrian route using shaded sidewalks',
        BM: 'Laluan pejalan kaki terus menggunakan laluan berbumbung',
      },
      color: '#5f6368',
      durationMinutes: 42,
      fare: 'Free',
      walkMeters: 2800,
      transfers: 0,
      isAccessible: false,
      accessibilityNote: {
        EN: 'Includes stairs and uneven pavement in several blocks.',
        BM: 'Melibatkan tangga dan permukaan tidak rata di beberapa blok.',
      },
    },
    {
      mode: 'Walk + Link Bridge',
      detail: {
        EN: 'Uses indoor bridge links to reduce weather exposure',
        BM: 'Menggunakan jambatan penghubung dalaman untuk mengurangkan pendedahan cuaca',
      },
      color: '#80868b',
      durationMinutes: 48,
      fare: 'Free',
      walkMeters: 2500,
      transfers: 0,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Preferred step-free walking route with elevators on bridge sections.',
        BM: 'Laluan berjalan kaki tanpa tangga yang disyorkan dengan lif di bahagian jambatan.',
      },
    },
    {
      mode: 'Walk + Shuttle',
      detail: {
        EN: 'Short walking route with a free district shuttle segment',
        BM: 'Laluan berjalan kaki singkat dengan segmen shuttle daerah percuma',
      },
      color: '#9aa0a6',
      durationMinutes: 35,
      fare: 'Free',
      walkMeters: 900,
      transfers: 1,
      isAccessible: true,
      accessibilityNote: {
        EN: 'Lowest walking demand and wheelchair-friendly boarding.',
        BM: 'Keperluan berjalan paling rendah dan mesra untuk menaiki kerusi roda.',
      },
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly gtfsRaptor = inject(GtfsRaptorService);
  private readonly gtfsRealtime = inject(GtfsRealtimeService);

  constructor() {
    void this.gtfsRaptor.loadBundle();
  }

  getModes(): string[] {
    return [...PLANNER_MODES];
  }

  getServiceStatuses(language: AppLanguage = 'EN'): Observable<ServiceStatus[]> {
    return of(this.getAllServiceStatuses(language).slice(0, 3));
  }

  getAllServiceStatuses(language: AppLanguage = 'EN'): ServiceStatus[] {
    const rt = this.gtfsRealtime.snapshot;
    return SERVICE_STATUSES.map((status) => {
      let state = status.state[language];
      if (status.line.includes('Rapid Bus') && rt.feeds['rapid-kl-bus'].ok) {
        const busCount = rt.feeds['rapid-kl-bus'].vehicleCount + rt.feeds['rapid-kl-bus-mrtfeeder'].vehicleCount;
        state = language === 'BM'
          ? `${busCount} bas aktif (GTFS-RT)`
          : `${busCount} live buses (GTFS-RT)`;
      } else if (status.line.includes('KTM') && rt.feeds.ktmb.ok && rt.feeds.ktmb.vehicleCount > 0) {
        const ktmCount = rt.feeds.ktmb.vehicleCount;
        state = language === 'BM'
          ? `${ktmCount} tren aktif (GTFS-RT)`
          : `${ktmCount} live trains (GTFS-RT)`;
      }
      return {
        line: status.line,
        route: status.route[language],
        state,
        color: status.color,
        headway: status.headway[language],
        crowding: status.crowding[language],
        advisory: status.advisory[language],
      };
    });
  }

  getLocationSuggestions(query: string): TransitLocationSuggestion[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return MALAYSIA_TRANSIT_LOCATIONS.slice(0, 7);
    }
    const curated = MALAYSIA_TRANSIT_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q)
        || loc.subtitle.toLowerCase().includes(q)
        || loc.state.toLowerCase().includes(q),
    );
    const gtfsHits = this.gtfsRaptor
      .searchCachedStops(query, 6)
      .filter((hit) => !curated.some((c) => c.name.toLowerCase() === hit.name.toLowerCase()))
      .map((hit) => ({
        name: hit.name,
        subtitle: hit.feed.includes('rail') ? 'Rapid KL Rail / BRT Station' : hit.feed.includes('ktmb') ? 'KTMB Station' : 'Rapid KL Bus Stop',
        state: 'Klang Valley',
        lat: hit.lat,
        lng: hit.lng,
      }));
    return [...curated, ...gtfsHits].slice(0, 8);
  }

  findLocationCoords(query: string): TransitLocationSuggestion {
    const exact = this.findExactLocation(query);
    return exact ?? MALAYSIA_TRANSIT_LOCATIONS[0];
  }

  getRecentLocations(language: AppLanguage = 'EN', values?: string[]): Observable<RecentLocation[]> {
    const recentValues = Array.isArray(values)
      ? values
      : RECENT_LOCATIONS.map((location) => location.value);

    return of(recentValues.map((value) => this.createRecentLocation(value, language)));
  }

  buildPlan(request: NavigationRequest, language: AppLanguage = 'EN'): Observable<RouteOption[]> {
    const from = request.from.trim();
    const to = request.to.trim();

    if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
      return of([]);
    }

    const fromLoc = this.findExactLocation(from);
    const toLoc = this.findExactLocation(to);
    const isKlangValleyTrip =
      Boolean(fromLoc && toLoc)
      && this.isInKlangValley(fromLoc!.lat, fromLoc!.lng)
      && this.isInKlangValley(toLoc!.lat, toLoc!.lng)
      && request.mode !== 'Walk';

    if (isKlangValleyTrip && fromLoc && toLoc) {
      return fromPromise(this.buildGtfsRaptorPlan(request, fromLoc, toLoc, language));
    }

    return of(this.buildFallbackBlueprintPlan(request, language));
  }

  private async buildGtfsRaptorPlan(
    request: NavigationRequest,
    fromLoc: TransitLocationSuggestion,
    toLoc: TransitLocationSuggestion,
    language: AppLanguage,
  ): Promise<RouteOption[]> {
    const departureDate = this.parseRequestDateTime(request.travelDate, request.travelTime);
    const rtSnapshot = this.gtfsRealtime.snapshot;
    const itineraries = await this.gtfsRaptor.plan({
      fromLat: fromLoc.lat,
      fromLon: fromLoc.lng,
      toLat: toLoc.lat,
      toLon: toLoc.lng,
      fromLabel: request.from.trim(),
      toLabel: request.to.trim(),
      departureDate,
      preferredMode: request.mode || undefined,
      wheelchairPreferred: request.sort === 'Accessible',
      liveRouteKeys: rtSnapshot.liveRouteKeys,
    });

    if (itineraries.length === 0) {
      return this.buildFallbackBlueprintPlan(request, language);
    }

    return itineraries
      .map((itinerary) => this.mapRaptorItineraryToRouteOption(itinerary, language, fromLoc, toLoc))
      .sort((left, right) => this.compareRoutes(left, right, request.sort));
  }

  private buildFallbackBlueprintPlan(request: NavigationRequest, language: AppLanguage): RouteOption[] {
    const fromText = request.from.trim();
    const toText = request.to.trim();
    const fromCoords = this.findLocationCoords(fromText);
    const toCoords = this.findLocationCoords(toText);
    const fallbackWaypoints: [number, number][] = [
      [fromCoords.lat, fromCoords.lng],
      [toCoords.lat, toCoords.lng],
    ];

    // If a specific mode was explicitly requested (e.g. unit tests), honour it;
    // otherwise provide ALL suitable multi-modal route plans across MRT, LRT, KTM, Bus, and Walk+Shuttle!
    const blueprints: RouteBlueprint[] = request.mode && ROUTE_BLUEPRINTS[request.mode]
      ? ROUTE_BLUEPRINTS[request.mode]
      : [
          ROUTE_BLUEPRINTS['MRT'][0],
          ROUTE_BLUEPRINTS['LRT'][0],
          ROUTE_BLUEPRINTS['KTM'][0],
          ROUTE_BLUEPRINTS['Bus'][1],
          ROUTE_BLUEPRINTS['MRT'][2],
        ];

    return blueprints
      .map((blueprint) => {
        const base = this.createRouteOption(blueprint, request.travelTime, language, fromText, toText);
        const midLat = (fromCoords.lat + toCoords.lat) / 2;
        const midLng = (fromCoords.lng + toCoords.lng) / 2;
        const fallbackLegs: RouteLegDetail[] = [
          {
            type: 'walk',
            icon: 'walk-outline',
            badgeLabel: language === 'BM' ? 'Jalan kaki' : 'Walk',
            badgeColor: '#2563eb',
            fromName: fromText || 'Origin',
            toName: `${blueprint.mode} Station`,
            departTime: base.depart,
            arriveTime: base.depart,
            durationText: language === 'BM' ? 'Kira-kira 4 minit' : 'About 4 min',
            distanceText: base.walk,
            coords: [[fromCoords.lat, fromCoords.lng], [midLat, midLng]],
          },
          {
            type: 'transit',
            icon: blueprint.mode.includes('Bus') ? 'bus-outline' : 'train-outline',
            badgeLabel: blueprint.mode,
            badgeColor: blueprint.color,
            headsign: blueprint.detail[language],
            fromName: `${fromText || 'Origin'} Station`,
            toName: toText || 'Destination',
            departTime: base.depart,
            arriveTime: base.arrive,
            durationText: base.duration,
            stopCount: Math.max(2, blueprint.transfers + 3),
            isAccessible: blueprint.isAccessible,
            coords: [[fromCoords.lat, fromCoords.lng], [toCoords.lat, toCoords.lng]],
          },
        ];
        return {
          ...base,
          waypoints: fallbackWaypoints,
          firstBoardingText: `${base.depart} from ${fromText || 'Origin'}`,
          legs: fallbackLegs,
        };
      })
      .sort((left, right) => this.compareRoutes(left, right, request.sort));
  }

  private mapRaptorItineraryToRouteOption(
    itinerary: GtfsRaptorItinerary,
    language: AppLanguage,
    fromLoc?: TransitLocationSuggestion,
    toLoc?: TransitLocationSuggestion,
  ): RouteOption {
    const transitLegs = itinerary.legs.filter((l) => l.mode !== 'WALK');
    const lineSummary = transitLegs
      .map((l) => l.routeShortName || l.routeLongName || l.mode)
      .join(' → ');
    const depart = this.formatSecondsAsTime(itinerary.departSeconds);
    const arrive = this.formatSecondsAsTime(itinerary.arriveSeconds);
    const co2Kg = (itinerary.durationMinutes * 0.058).toFixed(1);
    const co2Saved = language === 'BM'
      ? `${co2Kg} kg CO₂ dijimatkan`
      : `${co2Kg} kg CO₂ saved`;

    const steps = itinerary.legs.map((leg) => {
      if (leg.mode === 'WALK') {
        const dist = this.formatWalkDistance(leg.distanceMeters);
        return language === 'BM'
          ? `Berjalan ${dist} dari ${leg.fromStopName} ke ${leg.toStopName}`
          : `Walk ${dist} from ${leg.fromStopName} to ${leg.toStopName}`;
      }
      const depStr = this.formatSecondsAsTime(leg.departSeconds);
      const arrStr = this.formatSecondsAsTime(leg.arriveSeconds);
      const liveTag = leg.liveTracked ? ' (Live GPS)' : '';
      return language === 'BM'
        ? `Naik ${leg.routeShortName || leg.mode}${liveTag} di ${leg.fromStopName} (${depStr}) → turun di ${leg.toStopName} (${arrStr})`
        : `Board ${leg.routeShortName || leg.mode}${liveTag} at ${leg.fromStopName} (${depStr}) → alight at ${leg.toStopName} (${arrStr})`;
    });

    const detail = language === 'BM'
      ? `GTFS RAPTOR · ${lineSummary}${itinerary.liveTracked ? ' · GPS Langsung' : ''}`
      : `GTFS RAPTOR · ${lineSummary}${itinerary.liveTracked ? ' · Live GPS' : ''}`;

    const accessibilityNote = itinerary.isAccessible
      ? (language === 'BM'
          ? 'Laluan rel & bas lantai rendah mesra kerusi roda dengan lif stesen.'
          : 'Step-free rail stations and low-floor accessible transit connections.')
      : (language === 'BM'
          ? 'Sesetengah hentian bas mungkin memerlukan bantuan menaiki.'
          : 'Some surface bus stops may have limited wheelchair boarding ramps.');

    const waypoints: [number, number][] = [];
    if (fromLoc) {
      waypoints.push([fromLoc.lat, fromLoc.lng]);
    }
    if (itinerary.waypoints.length > 0) {
      waypoints.push(...itinerary.waypoints);
    }
    if (toLoc) {
      waypoints.push([toLoc.lat, toLoc.lng]);
    }

    const structuredLegs: RouteLegDetail[] = itinerary.legs.map((leg) => {
      const legMins = Math.max(1, Math.round((leg.arriveSeconds - leg.departSeconds) / 60));
      const durationText = this.formatDuration(legMins, language);
      const depStr = this.formatSecondsAsTime(leg.departSeconds);
      const arrStr = this.formatSecondsAsTime(leg.arriveSeconds);
      if (leg.mode === 'WALK') {
        return {
          type: 'walk',
          icon: 'walk-outline',
          badgeLabel: language === 'BM' ? 'Jalan kaki' : 'Walk',
          badgeColor: '#2563eb',
          fromName: leg.fromStopName,
          toName: leg.toStopName,
          departTime: depStr,
          arriveTime: arrStr,
          durationText: language === 'BM' ? `Kira-kira ${durationText}` : `About ${durationText}`,
          distanceText: this.formatWalkDistance(leg.distanceMeters),
          coords: leg.coords,
        };
      }
      const isBusOrBrt = leg.mode === 'BUS' || (leg.badgeLabel ?? '').toUpperCase().includes('BRT');
      return {
        type: 'transit',
        icon: isBusOrBrt ? 'bus-outline' : 'train-outline',
        badgeLabel: leg.badgeLabel || leg.routeShortName || leg.mode,
        badgeColor: leg.badgeColor || itinerary.color,
        headsign: leg.headsign
          ? (language === 'BM' ? `Dari ${leg.fromStopName} ke ${leg.toStopName}` : `From ${leg.fromStopName} to ${leg.toStopName}`)
          : undefined,
        fromName: leg.fromStopName,
        toName: leg.toStopName,
        departTime: depStr,
        arriveTime: arrStr,
        durationText,
        stopCount: leg.stopCount,
        intermediateStops: leg.intermediateStops,
        isAccessible: leg.isAccessible,
        liveTracked: leg.liveTracked,
        coords: leg.coords,
      };
    });

    return {
      mode: itinerary.primaryMode,
      detail,
      color: itinerary.color,
      depart,
      arrive,
      duration: this.formatDuration(itinerary.durationMinutes, language),
      fare: `RM${itinerary.fareRm.toFixed(2)}`,
      walk: this.formatWalkDistance(itinerary.walkMeters),
      transfers: itinerary.transfers,
      isAccessible: itinerary.isAccessible,
      accessibilityNote,
      points: '+20',
      co2Saved,
      steps,
      gtfsPowered: true,
      liveTracked: itinerary.liveTracked,
      waypoints,
      firstBoardingText: itinerary.firstBoardingText,
      legs: structuredLegs,
    };
  }

  private findExactLocation(query: string): TransitLocationSuggestion | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const curated = MALAYSIA_TRANSIT_LOCATIONS.find(
      (loc) => loc.name.toLowerCase() === q || loc.name.toLowerCase().includes(q) || q.includes(loc.name.toLowerCase()),
    );
    if (curated) return curated;

    const gtfsHits = this.gtfsRaptor.searchCachedStops(query, 1);
    if (gtfsHits.length > 0) {
      const hit = gtfsHits[0];
      return {
        name: hit.name,
        subtitle: 'Transit Station',
        state: 'Klang Valley',
        lat: hit.lat,
        lng: hit.lng,
      };
    }
    return null;
  }

  private isInKlangValley(lat: number, lon: number): boolean {
    return lat >= 2.75 && lat <= 3.45 && lon >= 101.30 && lon <= 102.00;
  }

  private parseRequestDateTime(travelDate: string, travelTime: string): Date {
    const parsed = new Date(`${travelDate}T${travelTime}`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private formatSecondsAsTime(totalSeconds: number): string {
    const normalized = ((totalSeconds % 86400) + 86400) % 86400;
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const twelveHour = hours % 12 || 12;
    return `${String(twelveHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  swapLocations(from: string, to: string): { from: string; to: string } {
    return { from: to, to: from };
  }

  private createRouteOption(
    blueprint: RouteBlueprint,
    travelTime: string,
    language: AppLanguage,
    from = '',
    to = '',
  ): RouteOption {
    const depart = this.formatTime(travelTime);
    const arrive = this.formatTime(travelTime, blueprint.durationMinutes);
    const co2Kg = (blueprint.durationMinutes * 0.055).toFixed(1);
    const co2Saved = language === 'BM'
      ? `${co2Kg} kg CO₂ dijimatkan`
      : `${co2Kg} kg CO₂ saved`;
    const steps = language === 'BM'
      ? [
          `Berjalan ${Math.max(60, Math.round(blueprint.walkMeters * 0.45))} m dari ${from || 'lokasi asal'} ke stesen ${blueprint.mode}`,
          `Naik ${blueprint.mode} (${blueprint.detail.BM})`,
          blueprint.transfers > 0
            ? `Buat ${blueprint.transfers} pertukaran berpandu melalui laluan berbumbung`
            : `Perjalanan terus tanpa pertukaran`,
          `Tiba di ${to || 'destinasi'} pada ${arrive}`,
        ]
      : [
          `Walk ${Math.max(60, Math.round(blueprint.walkMeters * 0.45))} m from ${from || 'origin'} to ${blueprint.mode} boarding point`,
          `Board ${blueprint.mode} (${blueprint.detail.EN})`,
          blueprint.transfers > 0
            ? `Complete ${blueprint.transfers} signposted transfer${blueprint.transfers > 1 ? 's' : ''} via sheltered concourse`
            : `Direct service with zero transfers`,
          `Arrive at ${to || 'destination'} by ${arrive}`,
        ];

    return {
      mode: blueprint.mode,
      detail: blueprint.detail[language],
      color: blueprint.color,
      depart,
      arrive,
      duration: this.formatDuration(blueprint.durationMinutes, language),
      fare: blueprint.fare === 'Free' && language === 'BM' ? 'Percuma' : blueprint.fare,
      walk: this.formatWalkDistance(blueprint.walkMeters),
      transfers: blueprint.transfers,
      isAccessible: blueprint.isAccessible,
      accessibilityNote: blueprint.accessibilityNote[language],
      points: '+20',
      co2Saved,
      steps,
    };
  }

  private compareRoutes(left: RouteOption, right: RouteOption, sort: string): number {
    if (sort === 'Less walking') {
      return this.parseWalkDistance(left.walk) - this.parseWalkDistance(right.walk)
        || this.parseDuration(left.duration) - this.parseDuration(right.duration);
    }

    if (sort === 'Accessible') {
      return Number(right.isAccessible) - Number(left.isAccessible)
        || left.transfers - right.transfers
        || this.parseWalkDistance(left.walk) - this.parseWalkDistance(right.walk)
        || this.parseDuration(left.duration) - this.parseDuration(right.duration);
    }

    return this.parseDuration(left.duration) - this.parseDuration(right.duration)
      || this.parseWalkDistance(left.walk) - this.parseWalkDistance(right.walk);
  }

  private createRecentLocation(value: string, language: AppLanguage): RecentLocation {
    const seededLocation = RECENT_LOCATIONS.find(
      (location) => location.value.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    if (seededLocation) {
      return {
        label: seededLocation.label[language],
        value: seededLocation.value,
        description: seededLocation.description[language],
      };
    }

    return {
      label: value,
      value,
      description: language === 'BM'
        ? 'Carian lokasi terkini anda'
        : 'Your recent route search',
    };
  }

  private formatTime(rawTime: string, additionalMinutes = 0): string {
    const [hoursPart, minutesPart] = rawTime.split(':').map((value) => Number.parseInt(value, 10));

    if (Number.isNaN(hoursPart) || Number.isNaN(minutesPart)) {
      return '09:00';
    }

    const totalMinutes = (hoursPart * 60) + minutesPart + additionalMinutes;
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const twelveHour = hours % 12 || 12;

    return `${String(twelveHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  private formatDuration(durationMinutes: number, language: AppLanguage): string {
    if (durationMinutes < 60) {
      return language === 'BM' ? `${durationMinutes} minit` : `${durationMinutes} min`;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return language === 'BM' ? `${hours} jam` : `${hours} hr`;
    }

    return language === 'BM'
      ? `${hours} jam ${minutes} minit`
      : `${hours} hr ${minutes} min`;
  }

  private formatWalkDistance(walkMeters: number): string {
    if (walkMeters >= 1000) {
      return `${(walkMeters / 1000).toFixed(1)} km`;
    }

    return `${walkMeters} m`;
  }

  private parseDuration(duration: string): number {
    const values = (duration.match(/\d+/g) ?? []).map((value) => Number.parseInt(value, 10));

    if (values.length === 0) {
      return Number.POSITIVE_INFINITY;
    }

    if (duration.includes('hr') || duration.includes('jam')) {
      return (values[0] * 60) + (values[1] ?? 0);
    }

    return values[0];
  }

  private parseWalkDistance(walk: string): number {
    if (walk.includes('km')) {
      return Math.round(Number.parseFloat(walk) * 1000);
    }

    const walkMeters = Number.parseInt(walk, 10);
    return Number.isNaN(walkMeters) ? Number.POSITIVE_INFINITY : walkMeters;
  }
}
