import { Injectable, NgZone, inject } from '@angular/core';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';
import { AppLanguage } from './accessibility-preferences.service';
import { FirebaseService } from './firebase.service';

export interface RemoteCommunityPost {
  id: string;
  state: string;
  category: 'Heritage' | 'Nature' | 'Food';
  status: 'Verified' | 'In review';
  author: string;
  date: LocalizedText;
  place: LocalizedText;
  copy: LocalizedText;
  points: number;
  helpful: number;
  image?: string | null;
  createdAt: number;
}

export interface RemoteTravelNotice {
  id: string;
  level: 'CRITICAL' | 'DISRUPTION' | 'ADVISORY';
  color: string;
  title: LocalizedText;
  place: LocalizedText;
  time: string;
  category: 'Transit' | 'Destinations' | 'Weather';
}

export type LocalizedText = Record<AppLanguage, string>;

export type DestinationCategory = 'heritage' | 'nature' | 'food' | 'culture';

export interface TourismDestination {
  id: string;
  name: string;
  state: string;
  category: DestinationCategory;
  image: string;
  nearestHub: string;
  transitLine: string;
  lat: number;
  lng: number;
  wheelchairFriendly: boolean;
  featuredInHero?: boolean;
  tagline: LocalizedText;
  description: LocalizedText;
  openHours: string;
}

export interface TourismEvent {
  id: string;
  date: string;
  venue: string;
  state: string;
  transitHint: string;
  title: LocalizedText;
  description: LocalizedText;
  targetPath: string;
  destinationQuery?: string;
  eventType?: 'event' | 'webinar';
  categoryBadge?: LocalizedText;
  organizer?: string;
  officialUrl?: string;
  highlights?: LocalizedText[];
}

export const MALAYSIA_DESTINATIONS: TourismDestination[] = [
  {
    id: 'timah-tasoh',
    name: 'Timah Tasoh Lake',
    state: 'Perlis',
    category: 'nature',
    image: 'assets/mytravel/timah-tasoh-hero.png',
    nearestHub: 'ETS Arau',
    transitLine: 'KTM ETS Northern Line + Bas.My Perlis',
    lat: 6.5553,
    lng: 100.2179,
    wheelchairFriendly: true,
    featuredInHero: true,
    tagline: {
      EN: 'Timah Tasoh, Perlis',
      BM: 'Tasik Timah Tasoh, Perlis',
    },
    description: {
      EN: 'Tranquil northern mirror lake framed by Nakawan limestone hills, ideal for sunrise viewing and eco-boat rides.',
      BM: 'Tasik tenang di utara berlatarbelakangkan bukit batu kapur Nakawan, sesuai untuk matahari terbit dan bot eko.',
    },
    openHours: '07:00 – 19:00',
  },
  {
    id: 'george-town',
    name: 'George Town Heritage Core',
    state: 'Penang',
    category: 'heritage',
    image: 'assets/mytravel/george-town.png',
    nearestHub: 'KOMTAR Terminal',
    transitLine: 'Rapid Penang CAT Free Shuttle & Ferry',
    lat: 5.4141,
    lng: 100.3288,
    wheelchairFriendly: true,
    featuredInHero: true,
    tagline: {
      EN: 'George Town, Penang',
      BM: 'George Town, Pulau Pinang',
    },
    description: {
      EN: 'UNESCO World Heritage shophouses, vibrant street murals, clan jetties, and iconic Penang hawker cuisine.',
      BM: 'Rumah kedai Warisan Dunia UNESCO, mural jalanan, jeti kaum, dan kulinari penjaja Pulau Pinang yang ikonik.',
    },
    openHours: '24 Hours (Museums 09:00 – 17:00)',
  },
  {
    id: 'melaka-red-square',
    name: 'Dutch Square & Jonker Walk',
    state: 'Melaka',
    category: 'heritage',
    image: 'assets/mytravel/melaka.png',
    nearestHub: 'Melaka Sentral',
    transitLine: 'Panorama Melaka Bus 17 & River Cruise',
    lat: 2.1944,
    lng: 102.2491,
    wheelchairFriendly: true,
    featuredInHero: true,
    tagline: {
      EN: 'Dutch Square, Melaka',
      BM: 'Dataran Belanda, Melaka',
    },
    description: {
      EN: 'Historic terracotta Stadthuys, A Famosa fortress trail, Melaka River boardwalk, and Baba Nyonya heritage.',
      BM: 'Bangunan Stadthuys bersejarah, laluan Kota A Famosa, persiaran Sungai Melaka, dan warisan Baba Nyonya.',
    },
    openHours: '08:00 – 22:00',
  },
  {
    id: 'thean-hou-temple',
    name: 'Thean Hou Temple',
    state: 'Kuala Lumpur',
    category: 'culture',
    image: 'assets/Thean-ho-temple.png',
    nearestHub: 'KL Sentral',
    transitLine: 'LRT Kelana Jaya / MRT Kajang + Rapid KL',
    lat: 3.1219,
    lng: 101.6876,
    wheelchairFriendly: true,
    featuredInHero: true,
    tagline: {
      EN: 'Thean Hou Temple, KL',
      BM: 'Tokong Thean Hou, KL',
    },
    description: {
      EN: 'Six-tiered hilltop temple overlooking Kuala Lumpur skyline with red lanterns, medicinal herb garden, and step-free lifts.',
      BM: 'Tokong enam tingkat di puncak bukit menghadap latar langit Kuala Lumpur dengan tanglung merah dan lif mesra akses.',
    },
    openHours: '08:00 – 20:00',
  },
  {
    id: 'mount-kinabalu',
    name: 'Kinabalu Park & Kundasang',
    state: 'Sabah',
    category: 'nature',
    image: 'assets/Mount_kinabalu.png',
    nearestHub: 'Kota Kinabalu Bus Terminal',
    transitLine: 'Sabah Park Express Shuttle',
    lat: 6.0033,
    lng: 116.5425,
    wheelchairFriendly: false,
    featuredInHero: true,
    tagline: {
      EN: 'Kinabalu Park, Sabah',
      BM: 'Taman Kinabalu, Sabah',
    },
    description: {
      EN: 'Malaysia’s first UNESCO World Heritage Site featuring highland botanical trails and panoramic Mount Kinabalu views.',
      BM: 'Tapak Warisan Dunia UNESCO pertama Malaysia dengan denai botani tanah tinggi dan pemandangan Gunung Kinabalu.',
    },
    openHours: '07:00 – 17:00',
  },
  {
    id: 'pasar-seni-central-market',
    name: 'Pasar Seni & Petaling Street',
    state: 'Kuala Lumpur',
    category: 'food',
    image: 'assets/home_1.png',
    nearestHub: 'Pasar Seni',
    transitLine: 'LRT Kelana Jaya & MRT Kajang Interchange',
    lat: 3.1424,
    lng: 101.6956,
    wheelchairFriendly: true,
    tagline: {
      EN: 'Pasar Seni, Kuala Lumpur',
      BM: 'Pasar Seni, Kuala Lumpur',
    },
    description: {
      EN: 'Art-deco heritage market, local craft stalls, kopitiams, and direct sheltered walkway from Pasar Seni station.',
      BM: 'Pasar warisan art-deco, gerai kraf tempatan, kopitiam, dan laluan berbumbung terus dari stesen Pasar Seni.',
    },
    openHours: '10:00 – 21:30',
  },
  {
    id: 'raban-lake-perak',
    name: 'Tasik Raban Lenggong',
    state: 'Perak',
    category: 'food',
    image: 'assets/mytravel/raban-lake.png',
    nearestHub: 'ETS Kuala Kangsar',
    transitLine: 'KTM ETS + Perak Transit Feeder',
    lat: 5.0124,
    lng: 100.9462,
    wheelchairFriendly: true,
    tagline: {
      EN: 'Tasik Raban, Perak',
      BM: 'Tasik Raban, Perak',
    },
    description: {
      EN: 'Scenic freshwater lake near Lenggong Valley UNESCO archaeological site, famous for traditional ikan pekasam.',
      BM: 'Tasik air tawar indah berdekatan tapak arkeologi UNESCO Lembah Lenggong, terkenal dengan ikan pekasam tradisi.',
    },
    openHours: '08:00 – 19:00',
  },
];

export const SEEDED_TOURISM_EVENTS: TourismEvent[] = [
  {
    id: 'evt-car-free-merdeka',
    date: '2026-07-05',
    venue: 'Dataran Merdeka',
    state: 'Kuala Lumpur',
    transitHint: 'LRT Masjid Jamek (4 min walk)',
    title: {
      EN: 'Car-Free Morning at Dataran Merdeka',
      BM: 'Pagi Tanpa Kenderaan di Dataran Merdeka',
    },
    description: {
      EN: 'Join a guided heritage walk and earn bonus eco-points for arriving by train.',
      BM: 'Sertai berjalan kaki warisan berpandu dan kumpul mata eko bonus apabila tiba dengan tren.',
    },
    targetPath: '/tabs/tab2',
    destinationQuery: 'Dataran Merdeka',
    eventType: 'event',
    categoryBadge: { EN: 'Promotional Programme', BM: 'Program Promosi' },
    organizer: 'DBKL & Tourism Malaysia',
    officialUrl: 'https://www.tourism.gov.my/events',
    highlights: [
      { EN: 'Free guided heritage trail around Sultan Abdul Samad Building & River of Life', BM: 'Jejak warisan berpandu percuma sekitar Bangunan Sultan Abdul Samad & River of Life' },
      { EN: 'Earn +20 Eco-Points when arriving via LRT Masjid Jamek or Pasar Seni', BM: 'Raih +20 Mata Eko apabila tiba melalui LRT Masjid Jamek atau Pasar Seni' },
    ],
  },
  {
    id: 'evt-wira-accessible-meetup',
    date: '2026-07-12',
    venue: 'Pasar Seni',
    state: 'Kuala Lumpur',
    transitHint: 'LRT/MRT Pasar Seni (Step-free)',
    title: {
      EN: 'Accessible Travel Meetup with Wira',
      BM: 'Perjumpaan Perjalanan Mesra Akses bersama Wira',
    },
    description: {
      EN: 'Share route tips, accessibility feedback, and community travel stories.',
      BM: 'Kongsi tip laluan, maklum balas kebolehcapaian, dan cerita perjalanan komuniti.',
    },
    targetPath: '/tabs/tab3',
    destinationQuery: 'Pasar Seni',
    eventType: 'event',
    categoryBadge: { EN: 'Community Activity', BM: 'Aktiviti Komuniti' },
    organizer: 'MyTravel Community & Prasarana',
    highlights: [
      { EN: 'Step-free station audit walk and kopitiam networking at Central Market', BM: 'Lawatan audit stesen bebas tangga dan sesi komuniti di Pasar Seni' },
      { EN: 'Meet fellow MyTravel scouts and unlock community verification badges', BM: 'Temui pengakap MyTravel lain dan buka lencana pengesahan komuniti' },
    ],
  },
  {
    id: 'evt-vm2026-weekend-challenge',
    date: '2026-07-19',
    venue: 'KL Sentral',
    state: 'Kuala Lumpur',
    transitHint: 'All KL Rail Lines Interchange',
    title: {
      EN: 'Explore Malaysia Weekend Challenge',
      BM: 'Cabaran Hujung Minggu Teroka Malaysia',
    },
    description: {
      EN: 'Complete one rail journey and one community contribution to unlock a new stamp.',
      BM: 'Lengkapkan satu perjalanan rel dan satu sumbangan komuniti untuk membuka cop baharu.',
    },
    targetPath: '/tabs/tab4',
    destinationQuery: 'KL Sentral',
    eventType: 'event',
    categoryBadge: { EN: 'VM2026 Challenge', BM: 'Cabaran VM2026' },
    organizer: 'Tourism Malaysia VM2026 Secretariat',
    officialUrl: 'https://www.tourism.gov.my/events',
    highlights: [
      { EN: 'Bonus Digital Passport stamp progress for verified public-transit journeys', BM: 'Kemajuan cop Pasport Digital bonus untuk perjalanan transit awam disahkan' },
      { EN: 'Redeem Wira & Manja rewards directly in your Profile tab', BM: 'Tebus ganjaran Wira & Manja terus dalam tab Profil anda' },
    ],
  },
  {
    id: 'evt-george-town-festival',
    date: '2026-08-08',
    venue: 'George Town Heritage Core',
    state: 'Penang',
    transitHint: 'Rapid Penang CAT Free Shuttle',
    title: {
      EN: 'Visit Malaysia 2026 Heritage Walk',
      BM: 'Jalan Warisan Tahun Melawat Malaysia 2026',
    },
    description: {
      EN: 'Evening lantern trail, cultural performances, and eco-commuter stamp checkpoint in Penang.',
      BM: 'Laluan tanglung malam, persembahan budaya, dan pusat cop pengembara eko di Pulau Pinang.',
    },
    targetPath: '/tabs/tab2',
    destinationQuery: 'George Town',
    eventType: 'event',
    categoryBadge: { EN: 'Promotional Programme', BM: 'Program Promosi' },
    organizer: 'Tourism Malaysia',
    officialUrl: 'https://www.tourism.gov.my/events',
    highlights: [
      { EN: 'Evening lantern walk through Armenian Street, Clan Jetties, and Esplanade', BM: 'Laluan tanglung malam melalui Lebuh Armenian, Jeti Kaum, dan Padang Kota Lama' },
      { EN: 'Free Rapid Penang CAT shuttle loop connects Weld Quay & KOMTAR', BM: 'Bas ulang-alik percuma Rapid Penang CAT menghubungkan Weld Quay & KOMTAR' },
    ],
  },
  {
    id: 'evt-maef-art-kl-2026',
    date: '2026-11-27',
    venue: 'World Trade Centre (WTC), Kuala Lumpur',
    state: 'Kuala Lumpur',
    transitHint: 'LRT PWTC Station (3 min sheltered walk)',
    title: {
      EN: 'Malaysia Art Ecosystem Fair (MAEF) 2026 "ART KL"',
      BM: 'Pameran Ekosistem Seni Malaysia (MAEF) 2026 "ART KL"',
    },
    description: {
      EN: 'National contemporary art exhibition and cultural showcase at Dewan Tun Razak 3 & 4, WTC Kuala Lumpur.',
      BM: 'Pameran seni kontemporari kebangsaan dan pertunjukan budaya di Dewan Tun Razak 3 & 4, WTC Kuala Lumpur.',
    },
    targetPath: '/tabs/tab2',
    destinationQuery: 'PWTC',
    eventType: 'event',
    categoryBadge: { EN: 'Exhibitions & Fairs', BM: 'Pameran & Ekspo' },
    organizer: 'Tourism Malaysia Domestic Division',
    officialUrl: 'https://www.tourism.gov.my/events',
    highlights: [
      { EN: '27–29 November 2026 · 10:00 AM – 8:00 PM at Dewan Tun Razak 3 & 4', BM: '27–29 November 2026 · 10:00 pagi – 8:00 malam di Dewan Tun Razak 3 & 4' },
      { EN: 'Direct sheltered walkway from LRT PWTC Station (Ampang & Sri Petaling Lines)', BM: 'Laluan berbumbung terus dari Stesen LRT PWTC (Laluan Ampang & Sri Petaling)' },
    ],
  },
  {
    id: 'webinar-desaru-coast-update',
    date: '2026-11-18',
    venue: 'Tourism Malaysia Webinar Portal · Desaru Coast',
    state: 'Johor',
    transitHint: 'Online Webinar + Desaru Coast Ferry & Shuttle Guide',
    title: {
      EN: 'Tourism Malaysia Webinar: Introduction to Desaru Coast & Eco-Trails',
      BM: 'Webinar Tourism Malaysia: Pengenalan Desaru Coast & Denai Eko',
    },
    description: {
      EN: 'Interactive webinar covering coastal resort connectivity, public ferry links, and family eco-attractions in Johor.',
      BM: 'Webinar interaktif merangkumi sambungan resort pantai, feri awam, dan tarikan eko keluarga di Johor.',
    },
    targetPath: '/tabs/tab2',
    destinationQuery: 'Desaru Coast',
    eventType: 'webinar',
    categoryBadge: { EN: 'Official Webinar', BM: 'Webinar Rasmi' },
    organizer: 'Tourism Malaysia',
    officialUrl: 'https://www.tourism.gov.my/activities',
    highlights: [
      { EN: 'Live Q&A with Johor tourism specialists and ferry/shuttle planners', BM: 'Sesi soal jawab langsung bersama pakar pelancongan Johor dan perancang feri' },
      { EN: 'Covers Tanah Merah–Desaru ferry schedules and mangrove eco-tours', BM: 'Merangkumi jadual feri Tanah Merah–Desaru dan lawatan eko paya bakau' },
    ],
  },
  {
    id: 'webinar-sustainable-islands-parks',
    date: '2026-11-30',
    venue: 'Tourism Malaysia Virtual Studio · Sabah & Terengganu',
    state: 'Sabah',
    transitHint: 'Online Session (10:00 – 11:00) + Kinabalu Shuttle Info',
    title: {
      EN: 'Sustainable Islands & National Parks Webinar (VM2026–2027)',
      BM: 'Webinar Pulau Lestari & Taman Negara (VM2026–2027)',
    },
    description: {
      EN: 'Discover low-carbon island hopping, marine conservation parks, and UNESCO geopark trails across Malaysia.',
      BM: 'Terokai lawatan pulau rendah karbon, taman pemuliharaan marin, dan denai geopark UNESCO di seluruh Malaysia.',
    },
    targetPath: '/tabs/tab2',
    destinationQuery: 'Kinabalu Park',
    eventType: 'webinar',
    categoryBadge: { EN: 'Official Webinar', BM: 'Webinar Rasmi' },
    organizer: 'Tourism Malaysia Sustainability Unit',
    officialUrl: 'https://www.tourism.gov.my/activities',
    highlights: [
      { EN: 'Live online briefing · 10:00 AM – 11:00 AM MYT via Tourism Malaysia portal', BM: 'Taklimat dalam talian · 10:00 – 11:00 pagi MYT melalui portal Tourism Malaysia' },
      { EN: 'Low-carbon ferry routes, marine park conservation fees & Kinabalu Park shuttles', BM: 'Laluan feri rendah karbon, yuran pemuliharaan taman laut & ulang-alik Taman Kinabalu' },
    ],
  },
  {
    id: 'act-apec-tourism-working-group',
    date: '2026-10-15',
    venue: 'Pulau Langkawi, Kedah',
    state: 'Kedah',
    transitHint: 'Kuala Perlis Jetty Ferry + Langkawi Eco-Shuttle',
    title: {
      EN: 'APEC Tourism Working Group & Sustainable Geopark Forum',
      BM: 'Kumpulan Kerja Pelancongan APEC & Forum Geopark Lestari',
    },
    description: {
      EN: 'Regional sustainable tourism forum and Langkawi UNESCO Global Geopark field showcase.',
      BM: 'Forum pelancongan lestari serantau dan pameran lapangan Geopark Global UNESCO Langkawi.',
    },
    targetPath: '/tabs/tab2',
    destinationQuery: 'Langkawi',
    eventType: 'webinar',
    categoryBadge: { EN: 'Activity & Forum', BM: 'Aktiviti & Forum' },
    organizer: 'MOTAC & Tourism Malaysia',
    officialUrl: 'https://www.tourism.gov.my/activities',
    highlights: [
      { EN: 'Hybrid regional forum featuring UNESCO Global Geopark conservation sessions', BM: 'Forum serantau hibrid menampilkan sesi pemuliharaan Geopark Global UNESCO' },
      { EN: 'Accessible via KTM ETS Arau + Kuala Perlis Jetty Ferry to Kuah Jetty', BM: 'Boleh diakses melalui KTM ETS Arau + Feri Jeti Kuala Perlis ke Jeti Kuah' },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class TourismDataService {
  private readonly fb = inject(FirebaseService);
  private readonly ngZone = inject(NgZone);
  private readonly destinationsSubject = new BehaviorSubject<TourismDestination[]>(MALAYSIA_DESTINATIONS);
  private readonly eventsSubject = new BehaviorSubject<TourismEvent[]>(SEEDED_TOURISM_EVENTS);
  private readonly communityPostsSubject = new BehaviorSubject<RemoteCommunityPost[]>([]);
  private readonly travelNoticesSubject = new BehaviorSubject<RemoteTravelNotice[]>([]);
  private syncInFlight = false;

  readonly destinations$ = this.destinationsSubject.asObservable();
  readonly events$ = this.eventsSubject.asObservable();
  readonly communityPosts$ = this.communityPostsSubject.asObservable();
  readonly travelNotices$ = this.travelNoticesSubject.asObservable();

  constructor() {
    this.ngZone.runOutsideAngular(() => {
      void this.hydrateBundledFirestoreSnapshot().then(() => this.syncFromFirestore());
      try {
        onAuthStateChanged(this.fb.auth, (user) => {
          if (user) {
            void this.syncFromFirestore();
          }
        });
      } catch {
        // Test environment without initialized Firebase Auth
      }
    });
  }

  refreshFromFirestore(): Promise<void> {
    return this.syncFromFirestore();
  }

  getHeroDestinations(): TourismDestination[] {
    return this.destinationsSubject.value.filter((d) => d.featuredInHero);
  }

  getAllDestinations(): TourismDestination[] {
    return this.destinationsSubject.value;
  }

  getEvents(): TourismEvent[] {
    return this.eventsSubject.value;
  }

  async submitVerificationRecord(record: {
    taskId: string;
    title: string;
    answer: 'yes' | 'no';
    note?: string;
    submittedBy: string;
  }): Promise<void> {
    try {
      await addDoc(collection(this.fb.db, 'verifications'), {
        ...record,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Offline / restricted rules fallback: local AppStateService already persists it.
    }
  }

  private toLocalized(value: unknown, fallback = ''): LocalizedText {
    if (typeof value === 'string') {
      const trimmed = value.trim() || fallback;
      return { EN: trimmed, BM: trimmed };
    }
    if (value && typeof value === 'object') {
      const rec = value as Record<string, unknown>;
      const en = typeof rec['EN'] === 'string' ? rec['EN'] : typeof rec['en'] === 'string' ? rec['en'] : fallback;
      const bm = typeof rec['BM'] === 'string' ? rec['BM'] : typeof rec['bm'] === 'string' ? rec['bm'] : en;
      return { EN: en || fallback, BM: bm || en || fallback };
    }
    return { EN: fallback, BM: fallback };
  }

  private normalizeDestinationCategory(raw: unknown): DestinationCategory {
    const val = String(raw || '').toLowerCase();
    if (val.includes('nature') || val.includes('park') || val.includes('lake') || val.includes('eco')) return 'nature';
    if (val.includes('food') || val.includes('culinary') || val.includes('market')) return 'food';
    if (val.includes('culture') || val.includes('temple') || val.includes('mosque') || val.includes('art')) return 'culture';
    return 'heritage';
  }

  private normalizePostCategory(raw: unknown): 'Heritage' | 'Nature' | 'Food' {
    const val = String(raw || '').toLowerCase();
    if (val.includes('nature') || val.includes('park') || val.includes('eco')) return 'Nature';
    if (val.includes('food') || val.includes('eat') || val.includes('cafe')) return 'Food';
    return 'Heritage';
  }

  private mapFirestoreAttraction(id: string, data: Record<string, unknown>): TourismDestination | null {
    const name = String(data['att_name'] ?? data['name'] ?? data['title'] ?? '').trim();
    const state = String(data['state'] ?? data['region'] ?? 'Malaysia').trim();
    if (!name) return null;
    const coords = (data['coordinates'] && typeof data['coordinates'] === 'object')
      ? (data['coordinates'] as Record<string, unknown>)
      : {};
    const acc = (data['accessibility'] && typeof data['accessibility'] === 'object')
      ? (data['accessibility'] as Record<string, unknown>)
      : {};
    const openHrs = String(data['att_openHrs'] ?? '').trim();
    const closeHrs = String(data['att_closeHrs'] ?? '').trim();
    const openHours = openHrs && closeHrs
      ? `${openHrs} – ${closeHrs}`
      : String(data['openHours'] ?? data['operatingHours'] ?? (openHrs || '09:00 – 18:00'));
    const cityOrArea = String(data['city_or_area'] ?? data['att_location'] ?? state).trim();
    const price = String(data['att_price'] ?? data['price_tier'] ?? '').trim();
    const rawDesc = String(data['att_desc'] ?? data['description'] ?? data['summary'] ?? name).trim();
    const fullDesc = price ? `${rawDesc} (${price})` : rawDesc;

    const category = this.normalizeDestinationCategory(`${data['category'] ?? ''} ${name} ${rawDesc}`);
    const rawImage = String(data['att_image'] ?? data['image'] ?? data['imageUrl'] ?? data['photoUrl'] ?? '').trim();
    const isEphemeralCdn = !rawImage
      || /cdninstagram\.com|fbcdn\.net|&amp;/i.test(rawImage);
    const categoryFallbackImage = category === 'heritage'
      ? 'assets/mytravel/george-town.png'
      : category === 'food'
        ? 'assets/home_1.png'
        : category === 'culture'
          ? 'assets/Thean-ho-temple.png'
          : 'assets/mytravel/timah-tasoh-hero.png';

    return {
      id,
      name,
      state,
      category,
      image: isEphemeralCdn ? categoryFallbackImage : rawImage,
      nearestHub: String(data['nearestHub'] ?? data['transitHub'] ?? `${cityOrArea} Transit Hub`),
      transitLine: String(data['transitLine'] ?? data['transit'] ?? `${state} Public Transit`),
      lat: Number(coords['lat'] ?? data['lat'] ?? data['latitude'] ?? 3.139),
      lng: Number(coords['lng'] ?? data['lng'] ?? data['longitude'] ?? 101.6869),
      wheelchairFriendly: Boolean(acc['wheelchair_accessible'] ?? data['wheelchairFriendly'] ?? data['accessible'] ?? true),
      featuredInHero: Boolean(data['featuredInHero'] ?? data['featured'] ?? false),
      tagline: this.toLocalized(data['tagline'], `${cityOrArea}, ${state}`),
      description: this.toLocalized(data['description'] ? data['description'] : fullDesc, fullDesc),
      openHours,
    };
  }

  private mapFirestoreEvent(id: string, data: Record<string, unknown>): TourismEvent | null {
    const title = this.toLocalized(data['event_name'] ?? data['title'] ?? data['name']);
    if (!title.EN) return null;
    const venue = String(data['event_location'] ?? data['venue'] ?? data['location'] ?? 'Malaysia').trim();
    const state = String(data['state'] ?? 'Malaysia').trim();
    const openHrs = String(data['event_openHrs'] ?? '').trim();
    const closeHrs = String(data['event_closeHrs'] ?? '').trim();
    const price = String(data['event_price'] ?? '').trim();
    const timeNote = openHrs && closeHrs ? `${openHrs} – ${closeHrs}` : openHrs;
    const transitHint = [timeNote, price, `${state} Transit`].filter(Boolean).join(' · ');

    return {
      id,
      date: String(data['event_date'] ?? data['date'] ?? data['startDate'] ?? '2026-08-31'),
      venue,
      state,
      transitHint: String(data['transitHint'] ?? data['transit'] ?? transitHint),
      title,
      description: this.toLocalized(data['event_desc'] ?? data['description'] ?? data['details'], venue),
      targetPath: String(data['targetPath'] ?? '/tabs/tab2'),
      destinationQuery: String(data['destinationQuery'] ?? venue),
    };
  }

  private async hydrateBundledFirestoreSnapshot(): Promise<void> {
    if (typeof fetch !== 'function') return;
    try {
      const res = await fetch('assets/mytravel/firestore-seed.json');
      if (!res.ok) return;
      const payload = (await res.json()) as {
        attdatas?: Array<Record<string, unknown>>;
        eventdatas?: Array<Record<string, unknown>>;
      };
      const seededAtts = (payload.attdatas ?? [])
        .map((d) => this.mapFirestoreAttraction(String(d['id'] ?? ''), d))
        .filter((item): item is TourismDestination => item !== null);
      const seededEvents = (payload.eventdatas ?? [])
        .map((d) => this.mapFirestoreEvent(String(d['id'] ?? ''), d))
        .filter((item): item is TourismEvent => item !== null);

      if (seededAtts.length > 0 || seededEvents.length > 0) {
        this.ngZone.run(() => {
          if (seededAtts.length > 0) {
            const merged = [
              ...MALAYSIA_DESTINATIONS,
              ...seededAtts.filter((r) => !MALAYSIA_DESTINATIONS.some((m) => m.id === r.id || m.name.toLowerCase() === r.name.toLowerCase())),
            ];
            this.destinationsSubject.next(merged);
          }
          if (seededEvents.length > 0) {
            const mergedEvents = [
              ...seededEvents,
              ...SEEDED_TOURISM_EVENTS.filter((e) => !seededEvents.some((r) => r.id === e.id)),
            ];
            this.eventsSubject.next(mergedEvents);
          }
        });
      }
    } catch {
      // Offline / unit-test environment without bundled JSON
    }
  }

  private async syncFromFirestore(): Promise<void> {
    if (this.syncInFlight) return;
    this.syncInFlight = true;
    try {
      // 1. Live Firestore Attractions ('attdatas', 'malaysia_pois', 'tourism_destinations')
      const remoteDestinations: TourismDestination[] = [];
      for (const colName of ['attdatas', 'malaysia_pois', 'tourism_destinations']) {
        try {
          const snap = await getDocs(collection(this.fb.db, colName));
          snap.forEach((docSnap) => {
            const mapped = this.mapFirestoreAttraction(docSnap.id, docSnap.data() as Record<string, unknown>);
            if (mapped && !remoteDestinations.some((r) => r.id === mapped.id || r.name.toLowerCase() === mapped.name.toLowerCase())) {
              remoteDestinations.push(mapped);
            }
          });
          if (remoteDestinations.length > 0) break;
        } catch {
          // Collection unavailable or restricted
        }
      }
      if (remoteDestinations.length > 0) {
        this.ngZone.run(() => {
          const merged = [
            ...MALAYSIA_DESTINATIONS,
            ...remoteDestinations.filter((r) => !MALAYSIA_DESTINATIONS.some((m) => m.id === r.id || m.name.toLowerCase() === r.name.toLowerCase())),
          ];
          this.destinationsSubject.next(merged);
        });
      }

      // 2. Live Firestore Events ('eventdatas', 'events', 'tourism_events')
      const remoteEvents: TourismEvent[] = [];
      for (const colName of ['eventdatas', 'events', 'tourism_events']) {
        try {
          const snap = await getDocs(collection(this.fb.db, colName));
          snap.forEach((docSnap) => {
            const mapped = this.mapFirestoreEvent(docSnap.id, docSnap.data() as Record<string, unknown>);
            if (mapped && !remoteEvents.some((r) => r.id === mapped.id)) {
              remoteEvents.push(mapped);
            }
          });
          if (remoteEvents.length > 0) break;
        } catch {
          // Collection unavailable or restricted
        }
      }
      if (remoteEvents.length > 0) {
        this.ngZone.run(() => {
          const mergedEvents = [
            ...remoteEvents,
            ...SEEDED_TOURISM_EVENTS.filter((e) => !remoteEvents.some((r) => r.id === e.id)),
          ];
          this.eventsSubject.next(mergedEvents);
        });
      }

      // 3. Community Posts ('community_posts')
      try {
        const postSnap = await getDocs(collection(this.fb.db, 'community_posts'));
        const remotePosts: RemoteCommunityPost[] = [];
        postSnap.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const placeText = String(data['location'] ?? data['place'] ?? data['title'] ?? '').trim();
          const tipText = String(data['tip'] ?? data['copy'] ?? data['content'] ?? '').trim();
          if (!placeText || !tipText) return;
          const rawDate = String(data['createdAt'] ?? '');
          const parsedTs = Date.parse(rawDate) || Date.now();
          const formattedDate = new Date(parsedTs).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
          remotePosts.push({
            id: `fs-${docSnap.id}`,
            state: String(data['state'] ?? 'Kuala Lumpur'),
            category: this.normalizePostCategory(data['category']),
            status: data['status'] === 'Verified' ? 'Verified' : 'In review',
            author: String(data['author'] ?? 'MyTravel Explorer'),
            date: { EN: formattedDate, BM: formattedDate },
            place: this.toLocalized(data['place'] ?? placeText, placeText),
            copy: this.toLocalized(data['copy'] ?? tipText, tipText),
            points: Number(data['points'] ?? 15),
            helpful: Number(data['helpful'] ?? 0),
            image: typeof data['image'] === 'string' ? data['image'] : typeof data['imageUrl'] === 'string' ? data['imageUrl'] : null,
            createdAt: parsedTs,
          });
        });
        if (remotePosts.length > 0) {
          this.communityPostsSubject.next(remotePosts);
        }
      } catch {
        // Collection unavailable or restricted
      }

      // 4. Travel Notices ('travel_notices')
      try {
        const noticeSnap = await getDocs(collection(this.fb.db, 'travel_notices'));
        const remoteNotices: RemoteTravelNotice[] = [];
        noticeSnap.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const title = this.toLocalized(data['title']);
          if (!title.EN) return;
          const levelRaw = String(data['level'] ?? 'ADVISORY').toUpperCase();
          const level: 'CRITICAL' | 'DISRUPTION' | 'ADVISORY' =
            levelRaw === 'CRITICAL' ? 'CRITICAL' : levelRaw === 'DISRUPTION' ? 'DISRUPTION' : 'ADVISORY';
          const color = level === 'CRITICAL' ? '#dc2626' : level === 'DISRUPTION' ? '#d97706' : '#0284c7';
          const catRaw = String(data['category'] ?? 'Transit');
          const category: 'Transit' | 'Destinations' | 'Weather' =
            catRaw === 'Weather' ? 'Weather' : catRaw === 'Destinations' ? 'Destinations' : 'Transit';
          remoteNotices.push({
            id: `fs-notice-${docSnap.id}`,
            level,
            color,
            title,
            place: this.toLocalized(data['place'] ?? data['description'], ''),
            time: String(data['time'] ?? 'Live'),
            category,
          });
        });
        if (remoteNotices.length > 0) {
          this.travelNoticesSubject.next(remoteNotices);
        }
      } catch {
        // Collection unavailable or restricted
      }
    } finally {
      this.syncInFlight = false;
    }
  }
}
