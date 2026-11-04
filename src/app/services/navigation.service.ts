import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { AppLanguage } from './accessibility-preferences.service';

export interface NavigationRequest {
  from: string;
  to: string;
  mode: string;
  sort: string;
  travelDate: string;
  travelTime: string;
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
}

export interface ServiceStatus {
  line: string;
  route: string;
  state: string;
  color: string;
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

const SERVICE_STATUSES: SeededServiceStatus[] = [
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
  },
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
  getModes(): string[] {
    return [...PLANNER_MODES];
  }

  getServiceStatuses(language: AppLanguage = 'EN'): Observable<ServiceStatus[]> {
    return of(SERVICE_STATUSES.map((status) => ({
      line: status.line,
      route: status.route[language],
      state: status.state[language],
      color: status.color,
    })));
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

    const blueprints = ROUTE_BLUEPRINTS[request.mode] ?? ROUTE_BLUEPRINTS['MRT'];
    const routeOptions = blueprints
      .map((blueprint) => this.createRouteOption(blueprint, request.travelTime, language))
      .sort((left, right) => this.compareRoutes(left, right, request.sort));

    return of(routeOptions);
  }

  swapLocations(from: string, to: string): { from: string; to: string } {
    return { from: to, to: from };
  }

  private createRouteOption(
    blueprint: RouteBlueprint,
    travelTime: string,
    language: AppLanguage,
  ): RouteOption {
    const depart = this.formatTime(travelTime);
    const arrive = this.formatTime(travelTime, blueprint.durationMinutes);

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
