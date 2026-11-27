import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, skip } from 'rxjs';
import { AccessibilityPreferencesService, AppLanguage } from '../services/accessibility-preferences.service';
import { AppJourney, AppStateService } from '../services/app-state.service';
import { AuthService, UserProfile } from '../services/auth.service';
import { PassportService } from '../services/passport.service';
import {
  DestinationCategory,
  TourismDataService,
  TourismDestination,
  TourismEvent,
} from '../services/tourism-data.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import {
  buildChallengeProgress,
  buildPassportSummary,
  buildTravelProgress,
} from '../shared/utils/travel-progress';
import {
  buildVerificationProgress,
  VerificationTaskDefinition,
} from '../shared/utils/verification-tasks';
import { getTransportModeIconName } from '../shared/utils/transport-mode-icon';
import { getTransportModeLabel } from '../shared/utils/transport-mode-label';

type LocalizedText = Record<AppLanguage, string>;

interface HomeEvent {
  id: string;
  rawDate?: string;
  dateLabel: string;
  fullDateLabel?: string;
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

interface NicheExperienceCard {
  id: string;
  icon: string;
  category: DestinationCategory;
  title: LocalizedText;
  quote: LocalizedText;
}

const HOME_COPY = {
  welcomeTitle: { EN: 'Welcome to MyTravel', BM: 'Selamat datang ke MyTravel' },
  profileProviderPending: { EN: 'Profile provider pending', BM: 'Penyedia profil belum disambungkan' },
  destination: { EN: 'Featured destination', BM: 'Destinasi pilihan' },
  ecoPoints: { EN: 'Eco-Points', BM: 'Mata Eko' },
  digitalPassport: { EN: 'Digital Passport', BM: 'Pasport Digital' },
  quickEvents: { EN: 'Events &\nActivities', BM: 'Acara &\nAktiviti' },
  quickExplore: { EN: 'Explore\nMalaysia', BM: 'Teroka\nMalaysia' },
  quickVerification: { EN: 'MyTravel\nVerification', BM: 'Pengesahan\nMyTravel' },
  quickNotices: { EN: 'Travel\nNotices', BM: 'Notis\nPerjalanan' },
  currentJourney: { EN: 'Your current journey', BM: 'Perjalanan semasa anda' },
  inTransit: { EN: 'In transit', BM: 'Sedang dalam perjalanan' },
  departs: { EN: 'Departs', BM: 'Berlepas' },
  arrives: { EN: 'Arrives', BM: 'Tiba' },
  completeJourney: { EN: 'Complete journey', BM: 'Selesaikan perjalanan' },
  planJourneyTitle: { EN: 'Plan your next journey', BM: 'Rancang perjalanan seterusnya' },
  readyWhenYouAre: { EN: 'Ready when you are', BM: 'Sedia apabila anda sedia' },
  planJourneyPrompt: {
    EN: 'Choose a route, departure time, and accessibility preference in Navigation.',
    BM: 'Pilih laluan, masa berlepas, dan pilihan kebolehcapaian dalam Navigasi.',
  },
  planJourneyAction: { EN: 'Plan a journey', BM: 'Rancang perjalanan' },
  featuredDestinationAlt: { EN: 'Featured destination scenic view', BM: 'Pemandangan indah destinasi pilihan' },
  wiraMascotAlt: { EN: 'Wira travel guide mascot', BM: 'Maskot panduan perjalanan Wira' },
  manjaMascotAlt: { EN: 'Manja travel companion mascot', BM: 'Maskot teman perjalanan Manja' },
  closeSheet: { EN: 'Close panel', BM: 'Tutup panel' },
  closeEventsSheet: { EN: 'Close events panel', BM: 'Tutup panel acara' },
  closeExploreSheet: { EN: 'Close Explore Malaysia panel', BM: 'Tutup panel Teroka Malaysia' },
  verificationCardTitle: { EN: 'MyTravel Verification', BM: 'Pengesahan MyTravel' },
  weeklyMission: { EN: 'Weekly Mission with Wira', BM: 'Misi Mingguan bersama Wira' },
  weeklyMissionAction: { EN: 'View\nmission', BM: 'Lihat\nmisi' },
  weeklyMissionPendingTitle: { EN: 'Rewards provider pending', BM: 'Penyedia ganjaran belum disambungkan' },
  weeklyMissionPendingAction: { EN: 'View\nstatus', BM: 'Lihat\nstatus' },
  verificationKicker: { EN: 'MYTRAVEL VERIFICATION', BM: 'PENGESAHAN MYTRAVEL' },
  noVerificationTitle: { EN: 'All nearby checkpoints verified', BM: 'Semua pusat semakan berdekatan disahkan' },
  noVerificationCopy: {
    EN: 'Thank you for keeping Malaysian transit and tourism information accurate. New checkpoints will appear as you explore.',
    BM: 'Terima kasih kerana mengekalkan ketepatan maklumat transit dan pelancongan Malaysia. Pusat semakan baharu akan muncul apabila anda meneroka.',
  },
  verificationCardEmptyBadge: { EN: 'Awaiting\nprovider', BM: 'Menunggu\npenyedia' },
  verificationAnswerGroupAria: { EN: 'Verification answer options', BM: 'Pilihan jawapan pengesahan' },
  verificationAnswerPrefix: { EN: 'Select verification answer', BM: 'Pilih jawapan pengesahan' },
  answerYes: { EN: 'Yes', BM: 'Ya' },
  answerNo: { EN: 'No', BM: 'Tidak' },
  verificationNoteLabel: { EN: 'Optional field note', BM: 'Nota lapangan (pilihan)' },
  verificationNotePlaceholder: {
    EN: 'e.g. Lift B working smoothly, clear signage',
    BM: 'cth. Lif B berfungsi baik, papan tanda jelas',
  },
  verificationReviewTitle: { EN: 'Wira is reviewing with you', BM: 'Wira sedang menyemak bersama anda' },
  verificationReviewCopy: { EN: 'Points awarded after verification', BM: 'Mata diberikan selepas pengesahan' },
  verificationSubmit: { EN: 'Submit verification', BM: 'Hantar pengesahan' },
  eventsKicker: { EN: 'EVENTS & ACTIVITIES', BM: 'ACARA & AKTIVITI' },
  eventsTitle: { EN: 'Events & Activities', BM: 'Acara & Aktiviti' },
  noEventsTitle: { EN: 'No events yet', BM: 'Belum ada acara' },
  eventsProviderPendingTitle: { EN: 'Events provider pending', BM: 'Penyedia acara belum disambungkan' },
  eventsProviderPendingCopy: {
    EN: 'Events will appear here when your Firestore events provider is connected.',
    BM: 'Acara akan dipaparkan di sini apabila penyedia acara Firestore anda disambungkan.',
  },
  noEventsAvailableCopy: {
    EN: 'Upcoming events will appear here as soon as organisers publish them.',
    BM: 'Acara akan datang akan dipaparkan di sini sebaik sahaja penganjur menerbitkannya.',
  },
  eventsQuickStatus: { EN: 'Soon', BM: 'Segera' },
  eventsQuickPendingTitle: { EN: 'Events provider pending', BM: 'Penyedia acara belum disambungkan' },
  eventsQuickPendingCopy: {
    EN: 'Events & Activities will unlock here when your Firestore events provider is connected.',
    BM: 'Acara & Aktiviti akan dibuka di sini apabila penyedia acara Firestore anda disambungkan.',
  },
  eventsQuickUnavailableAria: {
    EN: 'Events and Activities unavailable. Events provider pending.',
    BM: 'Acara dan Aktiviti tidak tersedia. Penyedia acara belum disambungkan.',
  },
  exploreKicker: { EN: 'EXPLORE MALAYSIA', BM: 'TEROKA MALAYSIA' },
  exploreTitle: { EN: 'Verified tourism destinations', BM: 'Destinasi pelancongan disahkan' },
  exploreFilterAll: { EN: 'All', BM: 'Semua' },
  exploreFilterHeritage: { EN: 'Heritage', BM: 'Warisan' },
  exploreFilterNature: { EN: 'Nature', BM: 'Alam' },
  exploreFilterFood: { EN: 'Food', BM: 'Makanan' },
  exploreFilterCulture: { EN: 'Culture', BM: 'Budaya' },
  planTransitRoute: { EN: 'Plan transit route', BM: 'Rancang laluan transit' },
  wheelchairFriendly: { EN: 'Step-free access', BM: 'Akses mesra kerusi roda' },
  savePlace: { EN: 'Save', BM: 'Simpan' },
  savedPlace: { EN: 'Saved', BM: 'Disimpan' },
  rsvpEvent: { EN: 'Save event', BM: 'Simpan acara' },
  rsvpedEvent: { EN: 'Saved', BM: 'Disimpan' },
  eventSavedToast: { EN: 'Event saved to your travel plans.', BM: 'Acara disimpan ke rancangan perjalanan anda.' },
  eventRemovedToast: { EN: 'Event removed from saved plans.', BM: 'Acara dibuang daripada rancangan disimpan.' },
  placeSavedToast: { EN: 'Destination saved to your bookmarks.', BM: 'Destinasi disimpan ke penanda buku anda.' },
  placeRemovedToast: { EN: 'Destination removed from bookmarks.', BM: 'Destinasi dibuang daripada penanda buku.' },
  noPassportProgressCopy: {
    EN: 'Passport stamps will appear here when your Firestore passport provider is connected.',
    BM: 'Cop pasport akan dipaparkan di sini apabila penyedia pasport Firestore anda disambungkan.',
  },
  noChallengeProgressCopy: {
    EN: 'Challenge progress will appear here when your Firestore rewards provider is connected.',
    BM: 'Kemajuan cabaran akan dipaparkan di sini apabila penyedia ganjaran Firestore anda disambungkan.',
  },
  notificationToast: { EN: 'Travel notices appear when available', BM: 'Notis perjalanan dipaparkan apabila tersedia' },
  verificationAwarded: { EN: 'Eco-Points earned. Thank you!', BM: 'Mata Eko diperoleh. Terima kasih!' },
  verificationDuplicate: { EN: 'You already completed this verification.', BM: 'Anda sudah menyelesaikan pengesahan ini.' },
  journeyCompleted: { EN: 'Journey completed.', BM: 'Perjalanan selesai.' },
  openNavigation: { EN: 'Open Navigation', BM: 'Buka Navigasi' },
  openProfile: { EN: 'Open Profile', BM: 'Buka Profil' },
  openCommunity: { EN: 'Open Community', BM: 'Buka Komuniti' },
  openVerificationPanel: { EN: 'Open MyTravel Verification panel', BM: 'Buka panel Pengesahan MyTravel' },
  openExplorePanel: { EN: 'Open Explore Malaysia destinations', BM: 'Buka destinasi Teroka Malaysia' },
  journeyRouteConnector: { EN: 'to', BM: 'ke' },
  activeJourneyKicker: { EN: 'LIVE JOURNEY TRACKER', BM: 'PENJEJAK PERJALANAN LANGSUNG' },
  activeJourneyDetailsCue: { EN: 'Tap for live steps ›', BM: 'Ketik untuk langkah langsung ›' },
  activeJourneyStepsTitle: { EN: 'Transit steps', BM: 'Langkah transit' },
  openInNavigation: { EN: 'Open in Navigation', BM: 'Buka dalam Navigasi' },
  openInGoogleMaps: { EN: 'Open directions in Google Maps', BM: 'Buka arah dalam Google Maps' },
  vm2026Tagline: {
    EN: 'Surreal Experiences · Visit Malaysia 2026–2027',
    BM: 'Pengalaman Luar Biasa · Tahun Melawat Malaysia 2026–2027',
  },
  nicheSectionTitle: { EN: 'Featured Niche Experiences', BM: 'Produk Pelancongan Khas' },
  nicheSectionAction: { EN: 'Explore all ›', BM: 'Teroka semua ›' },
  activitiesBannerTitle: { EN: 'Activities & Webinars', BM: 'Aktiviti & Webinar' },
  activitiesBannerCopy: {
    EN: 'Official Tourism Malaysia promotional programmes, forums, and virtual travel briefings.',
    BM: 'Program promosi rasmi Tourism Malaysia, forum, dan taklimat perjalanan maya.',
  },
  activitiesBannerAction: { EN: 'View schedule', BM: 'Lihat jadual' },
  eventsTabAll: { EN: 'All', BM: 'Semua' },
  eventsTabProgrammes: { EN: 'Promotional Programmes', BM: 'Program Promosi' },
  eventsTabWebinars: { EN: 'Activities & Webinars', BM: 'Aktiviti & Webinar' },
  eventsSearchPlaceholder: { EN: 'Search events, webinars, venues...', BM: 'Cari acara, webinar, lokasi...' },
  exploreSearchPlaceholder: { EN: 'Search attractions, cities, states...', BM: 'Cari tarikan, bandar, negeri...' },
  backToEvents: { EN: 'Back to events', BM: 'Kembali ke acara' },
  backToDestinations: { EN: 'Back to destinations', BM: 'Kembali ke destinasi' },
  eventOrganizerLabel: { EN: 'Organiser', BM: 'Penganjur' },
  eventDateLabel: { EN: 'Date', BM: 'Tarikh' },
  eventVenueLabel: { EN: 'Venue', BM: 'Lokasi' },
  eventTransitLabel: { EN: 'Transit & access', BM: 'Transit & akses' },
  webinarSessionLabel: { EN: 'Online session info', BM: 'Maklumat sesi dalam talian' },
  eventHighlightsTitle: { EN: 'Programme highlights', BM: 'Sorotan program' },
  rsvpWebinarAction: { EN: 'Save webinar reminder', BM: 'Simpan peringatan webinar' },
  rsvpedWebinarAction: { EN: 'Reminder saved', BM: 'Peringatan disimpan' },
  visitOfficialPortal: { EN: 'Official Tourism Malaysia page', BM: 'Laman rasmi Tourism Malaysia' },
  planDestinationVisit: { EN: 'Plan trip to', BM: 'Rancang lawatan ke' },
  openVenueMaps: { EN: 'Open in Google Maps', BM: 'Buka dalam Google Maps' },
  shareAction: { EN: 'Share', BM: 'Kongsi' },
  sharedToast: { EN: 'Details copied to clipboard.', BM: 'Butiran disalin ke papan keratan.' },
  noSearchResultsTitle: { EN: 'No matching results', BM: 'Tiada hasil yang sepadan' },
  noSearchResultsCopy: { EN: 'Try another keyword or clear your active filters.', BM: 'Cuba kata kunci lain atau kosongkan penapis aktif anda.' },
  clearFiltersAction: { EN: 'Clear filters', BM: 'Kosongkan penapis' },
  openHoursLabel: { EN: 'Opening hours', BM: 'Waktu operasi' },
  nearestHubLabel: { EN: 'Nearest transit hub', BM: 'Hab transit terdekat' },
  transitLineLabel: { EN: 'Public transport', BM: 'Pengangkutan awam' },
  accessibilityLabel: { EN: 'Accessibility', BM: 'Kebolehcapaian' },
  stepFreeVerified: { EN: 'Step-free route available', BM: 'Laluan bebas tangga tersedia' },
  standardTerrain: { EN: 'Check local terrain on arrival', BM: 'Semak rupa bumi setempat apabila tiba' },
  viewChallengesAction: { EN: 'View challenges', BM: 'Lihat cabaran' },
  viewCommunityAction: { EN: 'Open community meetup', BM: 'Buka perjumpaan komuniti' },
} as const;

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnDestroy {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);
  private readonly authService = inject(AuthService);
  private readonly passportService = inject(PassportService);
  private readonly tourismDataService = inject(TourismDataService);
  private readonly router = inject(Router);
  private readonly authSubscription = new Subscription();
  private readonly uiTimeouts = new ManagedTimeouts();
  private heroCarouselTimer: ReturnType<typeof setInterval> | null = null;
  @ViewChild('verificationSheet') private verificationSheetRef?: ElementRef<HTMLElement>;
  @ViewChild('eventsSheet') private eventsSheetRef?: ElementRef<HTMLElement>;
  @ViewChild('exploreSheet') private exploreSheetRef?: ElementRef<HTMLElement>;
  @ViewChild('journeySheet') private journeySheetRef?: ElementRef<HTMLElement>;
  readonly copy = HOME_COPY;
  currentUser: UserProfile | null = this.authService.currentUser;

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }

  language: AppLanguage = 'EN';
  activeSheet: 'verification' | 'events' | 'explore' | 'journey' | null = null;
  toast = '';
  verificationAnswer: 'yes' | 'no' | null = null;
  verificationNote = '';
  ecoPoints = 0;
  savedNoticeCount = 0;
  savedDestinationIds: string[] = [];
  savedEventIds: string[] = [];
  activeJourney: AppJourney | null = null;
  events: HomeEvent[] = [];
  eventsProviderConnected = false;
  verificationTask: VerificationTaskDefinition | null = null;
  passportCollectedCount = 0;
  passportTotalCount = 0;
  challengeCompletedSteps = 0;
  challengeTotalSteps = 0;
  verificationCompletedCount = 0;
  verificationTotalCount = 0;

  heroDestinations: TourismDestination[] = [];
  allDestinations: TourismDestination[] = [];
  heroSlideIndex = 0;
  heroCarouselPaused = false;
  exploreCategory: 'all' | DestinationCategory = 'all';
  exploreSearchQuery = '';
  eventsFilterTab: 'all' | 'events' | 'webinars' = 'all';
  eventsSearchQuery = '';
  selectedEvent: HomeEvent | null = null;
  selectedDestination: TourismDestination | null = null;

  readonly nicheExperiences: NicheExperienceCard[] = [
    {
      id: 'niche-heritage-rail',
      icon: 'train-outline',
      category: 'heritage',
      title: { EN: 'Heritage & Rail Trails', BM: 'Jejak Warisan & Rel' },
      quote: { EN: 'UNESCO George Town, Melaka & historic ETS towns', BM: 'Tapak UNESCO George Town, Melaka & bandar ETS' },
    },
    {
      id: 'niche-islands-diving',
      icon: 'boat-outline',
      category: 'nature',
      title: { EN: 'Islands & Eco-Parks', BM: 'Pulau & Taman Eko' },
      quote: { EN: 'Kinabalu Geopark, Timah Tasoh & marine sanctuaries', BM: 'Geopark Kinabalu, Timah Tasoh & taman laut' },
    },
    {
      id: 'niche-gastronomy',
      icon: 'restaurant-outline',
      category: 'food',
      title: { EN: 'Kopitiam & Gastronomy', BM: 'Kopitiam & Gastronomi' },
      quote: { EN: 'Pasar Seni kopitiams, hawker lanes & halal trails', BM: 'Kopitiam Pasar Seni, lorong penjaja & jejak halal' },
    },
    {
      id: 'niche-homestay-culture',
      icon: 'color-palette-outline',
      category: 'culture',
      title: { EN: 'Homestay & Culture', BM: 'Inap Desa & Budaya' },
      quote: { EN: 'Living heritage crafts, temples & cultural villages', BM: 'Kraf warisan hidup, kuil & kampung budaya' },
    },
  ];

  private previousFocusedElement: HTMLElement | null = null;

  constructor() {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.heroDestinations = this.tourismDataService.getHeroDestinations();
    this.allDestinations = this.tourismDataService.getAllDestinations();
    this.refreshState();
    this.authSubscription.add(
      this.authService.currentUser$?.pipe(skip(1)).subscribe(() => this.refreshState()),
    );
    this.authSubscription.add(
      this.passportService.stamps$?.pipe(skip(1)).subscribe(() => this.refreshState()),
    );
    this.authSubscription.add(
      this.tourismDataService.destinations$?.pipe(skip(1)).subscribe((destinations) => {
        this.allDestinations = destinations;
        this.heroDestinations = destinations.filter((d) => d.featuredInHero);
      }),
    );
    this.authSubscription.add(
      this.tourismDataService.events$?.pipe(skip(1)).subscribe(() => this.refreshState()),
    );
    this.startHeroCarousel();
  }

  ionViewWillEnter(): void {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
    this.startHeroCarousel();
  }

  ionViewWillLeave(): void {
    this.stopHeroCarousel();
    this.closeActiveSheet();
  }

  ngOnDestroy(): void {
    this.stopHeroCarousel();
    this.authSubscription.unsubscribe();
    this.uiTimeouts.clearAll();
  }

  get activeHeroDestination(): TourismDestination {
    return this.heroDestinations[this.heroSlideIndex] ?? this.heroDestinations[0];
  }

  get filteredDestinations(): TourismDestination[] {
    const query = this.exploreSearchQuery.trim().toLowerCase();
    return this.allDestinations
      .filter((d) => this.exploreCategory === 'all' || d.category === this.exploreCategory)
      .filter((d) => {
        if (!query) return true;
        const haystack = [d.name, d.state, d.nearestHub, d.description.EN, d.description.BM].join(' ').toLowerCase();
        return haystack.includes(query);
      });
  }

  get filteredEvents(): HomeEvent[] {
    const query = this.eventsSearchQuery.trim().toLowerCase();
    return this.events
      .filter((e) => {
        if (this.eventsFilterTab === 'webinars') return e.eventType === 'webinar';
        if (this.eventsFilterTab === 'events') return e.eventType !== 'webinar';
        return true;
      })
      .filter((e) => {
        if (!query) return true;
        const haystack = [e.title.EN, e.title.BM, e.description.EN, e.description.BM, e.venue, e.state, e.organizer ?? ''].join(' ').toLowerCase();
        return haystack.includes(query);
      });
  }

  openNicheExperience(niche: NicheExperienceCard): void {
    this.exploreCategory = niche.category;
    this.exploreSearchQuery = '';
    this.selectedDestination = null;
    this.openSheet('explore');
  }

  openActivitiesAndWebinars(): void {
    if (!this.eventsProviderConnected) {
      return;
    }
    this.eventsFilterTab = 'webinars';
    this.eventsSearchQuery = '';
    this.selectedEvent = null;
    this.openSheet('events');
  }

  openEventDetail(event: HomeEvent): void {
    this.selectedEvent = event;
  }

  backToEventsList(): void {
    this.selectedEvent = null;
  }

  clearEventsFilters(): void {
    this.eventsFilterTab = 'all';
    this.eventsSearchQuery = '';
  }

  openDestinationDetail(destination: TourismDestination): void {
    this.selectedDestination = destination;
    if (this.activeSheet !== 'explore') {
      this.openSheet('explore');
    }
  }

  backToDestinationsList(): void {
    this.selectedDestination = null;
  }

  clearExploreFilters(): void {
    this.exploreCategory = 'all';
    this.exploreSearchQuery = '';
  }

  onDestinationImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.dataset['fallbackApplied']) {
      return;
    }
    img.dataset['fallbackApplied'] = '1';
    img.src = 'assets/mytravel/timah-tasoh-hero.png';
  }

  openOfficialPortal(url?: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.open(url || 'https://www.tourism.gov.my/events', '_blank', 'noopener,noreferrer');
  }

  openEventInGoogleMaps(event: HomeEvent): void {
    if (typeof window === 'undefined') {
      return;
    }
    const query = encodeURIComponent(`${event.venue}, ${event.state}, Malaysia`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  }

  openDestinationInGoogleMaps(destination: TourismDestination): void {
    if (typeof window === 'undefined') {
      return;
    }
    const query = encodeURIComponent(`${destination.name}, ${destination.state}, Malaysia`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  }

  shareEvent(event: HomeEvent): void {
    const title = this.t(event.title);
    const text = `${title} · ${event.fullDateLabel} · ${event.venue}, ${event.state}`;
    this.shareText(title, text, event.officialUrl);
  }

  shareDestination(destination: TourismDestination): void {
    const text = `${destination.name} (${destination.state}) · ${destination.nearestHub}`;
    this.shareText(destination.name, text);
  }

  private shareText(title: string, text: string, url?: string): void {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator.share({ title, text, ...(url ? { url } : {}) }).catch(() => {
        this.copyToClipboard(url ? `${text} ${url}` : text);
      });
      return;
    }
    this.copyToClipboard(url ? `${text} ${url}` : text);
  }

  private copyToClipboard(value: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value).catch(() => {});
    }
    this.notify(this.t(this.copy.sharedToast));
  }

  eventPrimaryActionLabel(event: HomeEvent): string {
    if (event.targetPath === '/tabs/tab3') {
      return this.t(this.copy.viewCommunityAction);
    }
    if (event.targetPath === '/tabs/tab4') {
      return this.t(this.copy.viewChallengesAction);
    }
    return this.t(this.copy.planTransitRoute);
  }

  selectHeroSlide(index: number): void {
    if (index < 0 || index >= this.heroDestinations.length) {
      return;
    }
    this.heroSlideIndex = index;
    this.startHeroCarousel();
  }

  go(path: string, queryParams?: Record<string, string>): void {
    if (queryParams) {
      void this.router.navigate([path], { queryParams });
      return;
    }
    void this.router.navigate([path]);
  }

  planRouteToDestination(destinationName: string): void {
    this.closeActiveSheet();
    void this.router.navigate(['/tabs/tab2'], {
      queryParams: { to: destinationName },
    });
  }

  openNotifications(): void {
    void this.router.navigate(['/tabs/tab3'], { queryParams: { view: 'notices' } });
  }

  openEventTarget(event: HomeEvent): void {
    this.closeActiveSheet();
    if (event.destinationQuery) {
      void this.router.navigate([event.targetPath], {
        queryParams: { to: event.destinationQuery },
      });
      return;
    }
    this.go(event.targetPath);
  }

  isEventSaved(eventId: string): boolean {
    return this.savedEventIds.includes(eventId);
  }

  toggleSaveEvent(eventId: string, clickEvent: Event): void {
    clickEvent.stopPropagation();
    const saved = this.appStateService.toggleSavedEvent?.(eventId) ?? false;
    this.refreshState();
    this.notify(saved ? this.t(this.copy.eventSavedToast) : this.t(this.copy.eventRemovedToast));
  }

  isDestinationSaved(destinationId: string): boolean {
    return this.savedDestinationIds.includes(destinationId);
  }

  toggleSaveDestination(destinationId: string): void {
    const saved = this.appStateService.toggleSavedDestination?.(destinationId) ?? false;
    this.refreshState();
    this.notify(saved ? this.t(this.copy.placeSavedToast) : this.t(this.copy.placeRemovedToast));
  }

  t(text?: LocalizedText): string {
    return text ? text[this.language] : '';
  }

  updateLanguage(language: AppLanguage): void {
    this.language = this.accessibilityPreferencesService.setLanguage(language).language;
    this.loadHomeEvents();
  }

  verificationAnswerAriaLabel(answer: 'yes' | 'no'): string {
    const label = answer === 'yes'
      ? this.t(this.copy.answerYes)
      : this.t(this.copy.answerNo);
    return `${this.t(this.copy.verificationAnswerPrefix)} ${label}`;
  }

  destinationPillAriaLabel(): string {
    const label = this.activeHeroDestination ? this.t(this.activeHeroDestination.tagline) : this.t(this.copy.destination);
    return `${label}. ${this.t(this.copy.openExplorePanel)}.`;
  }

  ecoPointsSummaryAriaLabel(): string {
    return `${this.ecoPoints.toLocaleString()} ${this.t(this.copy.ecoPoints)}. ${this.t(this.copy.openProfile)}.`;
  }

  passportSummaryAriaLabel(): string {
    return `${this.t(this.copy.digitalPassport)}. ${this.sentenceText(this.passportProgressSummary())}. ${this.t(this.copy.openProfile)}.`;
  }

  quickExploreAriaLabel(): string {
    return `${this.singleLineText(this.t(this.copy.quickExplore))}. ${this.t(this.copy.openExplorePanel)}.`;
  }

  quickVerificationAriaLabel(): string {
    return `${this.singleLineText(this.t(this.copy.quickVerification))}. ${this.t(this.copy.openVerificationPanel)}.`;
  }

  quickNoticesAriaLabel(): string {
    return `${this.singleLineText(this.t(this.copy.quickNotices))}. ${this.t(this.copy.openCommunity)}.`;
  }

  planJourneyAriaLabel(): string {
    return `${this.t(this.copy.planJourneyTitle)}. ${this.sentenceText(this.t(this.copy.planJourneyPrompt))}. ${this.t(this.copy.openNavigation)}.`;
  }

  completeJourneyAriaLabel(): string {
    if (!this.activeJourney) {
      return this.t(this.copy.completeJourney);
    }

    return `${this.t(this.copy.completeJourney)}. ${this.activeJourney.from} ${this.t(this.copy.journeyRouteConnector)} ${this.activeJourney.to}. ${this.activeJourneyModeLabel()}.`;
  }

  verificationCardAriaLabel(): string {
    return `${this.t(this.copy.verificationCardTitle)}. ${this.sentenceText(this.verificationCardSummary())}. ${this.sentenceText(this.verificationCardBadge())}. ${this.t(this.copy.openVerificationPanel)}.`;
  }

  weeklyMissionAriaLabel(): string {
    return `${this.sentenceText(this.weeklyMissionTitleLabel)}. ${this.sentenceText(this.weeklyMissionSummary())}. ${this.sentenceText(this.weeklyMissionActionLabel)}. ${this.t(this.copy.openProfile)}.`;
  }

  notify(message: string): void {
    this.toast = message;
    this.uiTimeouts.schedule('toast', () => this.toast = '', 2200);
  }

  openEventsSheet(): void {
    if (!this.eventsProviderConnected) {
      return;
    }

    this.eventsFilterTab = 'all';
    this.eventsSearchQuery = '';
    this.selectedEvent = null;
    this.openSheet('events');
  }

  openExploreSheet(): void {
    this.exploreCategory = 'all';
    this.exploreSearchQuery = '';
    this.selectedDestination = null;
    this.openSheet('explore');
  }

  openVerificationSheet(): void {
    this.openSheet('verification');
  }

  openActiveJourneySheet(): void {
    if (!this.activeJourney) {
      return;
    }
    this.openSheet('journey');
  }

  onActiveJourneyCardKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openActiveJourneySheet();
    }
  }

  openActiveJourneyInNavigation(): void {
    if (!this.activeJourney) {
      return;
    }
    const { from, to } = this.activeJourney;
    this.closeActiveSheet();
    void this.router.navigate(['/tabs/tab2'], {
      queryParams: { from, to },
    });
  }

  openActiveJourneyInGoogleMaps(): void {
    if (!this.activeJourney || typeof window === 'undefined') {
      return;
    }
    const origin = encodeURIComponent(this.activeJourney.from);
    const destination = encodeURIComponent(this.activeJourney.to);
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  closeActiveSheet(): void {
    if (!this.activeSheet) {
      return;
    }

    this.activeSheet = null;
    this.selectedEvent = null;
    this.selectedDestination = null;
    this.verificationAnswer = null;
    this.verificationNote = '';
    this.restoreFocus();
  }

  handleSheetBackdropClick(): void {
    this.closeActiveSheet();
  }

  handleSheetKeydown(event: KeyboardEvent, sheet: HTMLElement): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeActiveSheet();
      return;
    }

    if (event.key === 'Tab') {
      this.trapSheetFocus(event, sheet);
    }
  }

  submitVerification(): void {
    if (!this.verificationTask) {
      return;
    }

    const submittedTask = this.verificationTask;
    const answer = this.verificationAnswer ?? 'yes';
    const note = this.verificationNote.trim();
    const awarded = this.appStateService.submitVerification(
      submittedTask.id,
      submittedTask.title,
      { answer, note: note || undefined },
    );

    if (awarded) {
      void this.tourismDataService.submitVerificationRecord({
        taskId: submittedTask.id,
        title: submittedTask.title,
        answer,
        note: note || undefined,
        submittedBy: this.currentUser?.displayName || 'Guest Traveler',
      });
    }

    this.closeActiveSheet();
    this.refreshState();
    this.notify(awarded ? `+${submittedTask.points} ${this.t(this.copy.verificationAwarded)}` : this.t(this.copy.verificationDuplicate));
  }

  completeJourney(): void {
    const completedJourney = this.appStateService.completeActiveJourney();

    if (!completedJourney) {
      return;
    }

    this.refreshState();
    this.notify(`${this.t(this.copy.journeyCompleted)} +${completedJourney.points} ${this.t(this.copy.ecoPoints).toLowerCase()} ${this.language === 'EN' ? 'earned.' : 'diperoleh.'}`);
  }

  activeJourneyIconName(): string {
    return getTransportModeIconName(this.activeJourney?.mode ?? '');
  }

  activeJourneyModeLabel(): string {
    return getTransportModeLabel(this.language, this.activeJourney?.mode ?? '');
  }

  passportProgressSummary(): string {
    if (this.passportTotalCount === 0) {
      return this.t(this.copy.noPassportProgressCopy);
    }

    return this.language === 'EN'
      ? `${this.passportCollectedCount}/${this.passportTotalCount} stamps unlocked`
      : `${this.passportCollectedCount}/${this.passportTotalCount} cop dibuka`;
  }

  weeklyMissionSummary(): string {
    if (this.challengeTotalSteps === 0) {
      return this.t(this.copy.noChallengeProgressCopy);
    }

    return this.language === 'EN'
      ? `${this.challengeCompletedSteps} of ${this.challengeTotalSteps} challenge steps completed this season.`
      : `${this.challengeCompletedSteps} daripada ${this.challengeTotalSteps} langkah cabaran selesai musim ini.`;
  }

  get challengeProgressWidth(): string {
    if (this.challengeTotalSteps === 0) {
      return '0%';
    }

    return `${Math.round((this.challengeCompletedSteps / this.challengeTotalSteps) * 100)}%`;
  }

  get weeklyMissionTitleLabel(): string {
    return this.challengeTotalSteps === 0
      ? this.t(this.copy.weeklyMissionPendingTitle)
      : this.t(this.copy.weeklyMission);
  }

  get weeklyMissionActionLabel(): string {
    return this.challengeTotalSteps === 0
      ? this.t(this.copy.weeklyMissionPendingAction)
      : this.t(this.copy.weeklyMissionAction);
  }

  verificationCardSummary(): string {
    if (!this.verificationTask) {
      if (this.verificationTotalCount === 0) {
        return this.t(this.copy.noVerificationCopy);
      }

      return this.language === 'EN'
        ? `All ${this.verificationTotalCount} nearby checkpoints are completed.`
        : `Semua ${this.verificationTotalCount} pusat semakan berdekatan telah selesai.`;
    }

    return this.language === 'EN'
      ? `Next checkpoint: ${this.t(this.verificationTask.place)}. ${this.verificationCompletedCount}/${this.verificationTotalCount} completed.`
      : `Pusat semakan seterusnya: ${this.t(this.verificationTask.place)}. ${this.verificationCompletedCount}/${this.verificationTotalCount} selesai.`;
  }

  verificationCardBadge(): string {
    return this.verificationTask
      ? `+${this.verificationTask.points}\n${this.t(this.copy.ecoPoints)}`
      : this.verificationTotalCount === 0
        ? this.t(this.copy.verificationCardEmptyBadge)
      : this.language === 'EN'
        ? 'All\ndone'
        : 'Selesai';
  }

  eventsEmptyStateTitle(): string {
    return this.eventsProviderConnected
      ? this.t(this.copy.noEventsTitle)
      : this.t(this.copy.eventsProviderPendingTitle);
  }

  eventsEmptyStateCopy(): string {
    return this.eventsProviderConnected
      ? this.t(this.copy.noEventsAvailableCopy)
      : this.t(this.copy.eventsProviderPendingCopy);
  }

  private refreshState(): void {
    const state = this.appStateService.getSnapshot();
    this.currentUser = this.authService.currentUser;
    const progress = buildTravelProgress(state);
    const stamps = this.passportService.getStamps();
    const passportSummary = buildPassportSummary(progress);
    const collectedStamps = this.authService.isAuthenticated
      ? stamps.filter((s) => s.active).length
      : passportSummary.collectedCount;
    const totalStamps = this.authService.isAuthenticated
      ? stamps.length
      : passportSummary.totalCount;
    const challengeSummary = buildChallengeProgress(progress, collectedStamps);
    const verificationProgress = buildVerificationProgress(state.completedVerificationIds);
    this.ecoPoints = this.authService.isAuthenticated
      ? Math.max(state.ecoPoints, this.currentUser?.ecoPoints ?? 0)
      : state.ecoPoints;
    this.savedNoticeCount = state.savedNoticeIds.length;
    this.savedDestinationIds = state.savedDestinationIds ?? [];
    this.savedEventIds = state.savedEventIds ?? [];
    this.activeJourney = state.activeJourney;
    this.passportCollectedCount = collectedStamps;
    this.passportTotalCount = totalStamps;
    this.challengeCompletedSteps = challengeSummary.completedSteps;
    this.challengeTotalSteps = challengeSummary.totalSteps;
    this.verificationCompletedCount = verificationProgress.completedCount;
    this.verificationTotalCount = verificationProgress.totalCount;
    this.loadHomeEvents();
    this.verificationTask = verificationProgress.nextTask;
  }

  private formatEventDateLabel(rawDate: string, locale: string): string {
    const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())
      ? `${rawDate.trim()}T00:00:00`
      : rawDate.trim();
    const parsed = new Date(isoCandidate);
    if (Number.isNaN(parsed.getTime())) {
      return rawDate.trim().toUpperCase();
    }
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
    })
      .format(parsed)
      .toUpperCase();
  }

  private formatFullEventDate(rawDate: string, locale: string): string {
    const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())
      ? `${rawDate.trim()}T00:00:00`
      : rawDate.trim();
    const parsed = new Date(isoCandidate);
    if (Number.isNaN(parsed.getTime())) {
      return rawDate.trim();
    }
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  }

  private loadHomeEvents(): void {
    this.eventsProviderConnected = true;
    const locale = this.language === 'BM' ? 'ms-MY' : 'en-MY';
    const rawEvents: TourismEvent[] = this.tourismDataService.getEvents();
    this.events = rawEvents.map((event) => ({
      id: event.id,
      rawDate: event.date,
      dateLabel: this.formatEventDateLabel(event.date, locale),
      fullDateLabel: this.formatFullEventDate(event.date, locale),
      venue: event.venue,
      state: event.state,
      transitHint: event.transitHint,
      title: event.title,
      description: event.description,
      targetPath: event.targetPath,
      destinationQuery: event.destinationQuery,
      eventType: event.eventType ?? 'event',
      categoryBadge: event.categoryBadge,
      organizer: event.organizer,
      officialUrl: event.officialUrl,
      highlights: event.highlights,
    }));
    if (this.selectedEvent) {
      this.selectedEvent = this.events.find((e) => e.id === this.selectedEvent?.id) ?? null;
    }
  }

  toggleHeroCarousel(): void {
    this.heroCarouselPaused = !this.heroCarouselPaused;
    if (this.heroCarouselPaused) {
      this.stopHeroCarousel();
    } else {
      this.startHeroCarousel();
    }
  }

  heroCarouselControlAriaLabel(): string {
    if (this.heroCarouselPaused) {
      return this.language === 'BM' ? 'Mainkan destinasi pilihan' : 'Play featured destinations';
    }
    return this.language === 'BM' ? 'Jeda destinasi pilihan' : 'Pause featured destinations';
  }

  private startHeroCarousel(): void {
    this.stopHeroCarousel();
    const osReducedMotion =
      typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const reducedMotion = this.accessibilityPreferencesService.getPreferences().settings.motion || osReducedMotion;
    if (this.heroCarouselPaused || reducedMotion || this.heroDestinations.length <= 1) {
      return;
    }
    this.heroCarouselTimer = setInterval(() => {
      this.heroSlideIndex = (this.heroSlideIndex + 1) % this.heroDestinations.length;
    }, 6500);
  }

  private stopHeroCarousel(): void {
    if (this.heroCarouselTimer) {
      clearInterval(this.heroCarouselTimer);
      this.heroCarouselTimer = null;
    }
  }

  private singleLineText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private sentenceText(text: string): string {
    return this.singleLineText(text).replace(/[.!?]+$/, '');
  }

  private openSheet(sheet: 'verification' | 'events' | 'explore' | 'journey'): void {
    this.previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.activeSheet = sheet;
    this.uiTimeouts.schedule('sheet-focus', () => {
      const target = sheet === 'verification'
        ? this.verificationSheetRef?.nativeElement
        : sheet === 'events'
          ? this.eventsSheetRef?.nativeElement
          : sheet === 'explore'
            ? this.exploreSheetRef?.nativeElement
            : this.journeySheetRef?.nativeElement;
      target?.focus();
    }, 0);
  }

  private restoreFocus(): void {
    const previousFocusedElement = this.previousFocusedElement;
    this.previousFocusedElement = null;
    this.uiTimeouts.schedule('sheet-focus-restore', () => previousFocusedElement?.focus(), 0);
  }

  private trapSheetFocus(event: KeyboardEvent, sheet: HTMLElement): void {
    const focusableElements = this.getFocusableElements(sheet);

    if (focusableElements.length === 0) {
      event.preventDefault();
      sheet.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  private getFocusableElements(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
  }
}
