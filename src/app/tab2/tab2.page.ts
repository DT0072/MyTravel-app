import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
  AppLanguage,
} from '../services/accessibility-preferences.service';
import {
  MALAYSIA_TRANSIT_LOCATIONS,
  NavigationService,
  RecentLocation,
  RouteOption,
  ServiceStatus,
  TransitLocationSuggestion,
} from '../services/navigation.service';
import { AppJourney, AppStateService } from '../services/app-state.service';
import { GtfsRealtimeService, GtfsRealtimeSnapshot } from '../services/gtfs-realtime.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import { getTransportModeIconName } from '../shared/utils/transport-mode-icon';
import { getTransportModeLabel } from '../shared/utils/transport-mode-label';

type LocalizedText = Record<AppLanguage, string>;

const NAVIGATION_COPY = {
  pageTitle: { EN: 'Navigation', BM: 'Navigasi' },
  pageSubtitle: { EN: 'Plan your journey by public transport.', BM: 'Rancang perjalanan anda dengan pengangkutan awam.' },
  from: { EN: 'From', BM: 'Dari' },
  to: { EN: 'To', BM: 'Ke' },
  fromAria: { EN: 'From location', BM: 'Lokasi asal' },
  toAria: { EN: 'Destination', BM: 'Destinasi' },
  swapLocations: { EN: 'Swap locations', BM: 'Tukar lokasi' },
  date: { EN: 'Date', BM: 'Tarikh' },
  time: { EN: 'Time', BM: 'Masa' },
  travelDate: { EN: 'Travel date', BM: 'Tarikh perjalanan' },
  departureTime: { EN: 'Departure time', BM: 'Masa berlepas' },
  transportMode: { EN: 'Transport mode', BM: 'Mod pengangkutan' },
  transportModeAria: { EN: 'Transport mode options', BM: 'Pilihan mod pengangkutan' },
  transportModePrefix: { EN: 'Select transport mode', BM: 'Pilih mod pengangkutan' },
  accessibleRoutesNote: { EN: 'Accessible routes are prioritised from your saved preferences.', BM: 'Laluan mesra akses diutamakan berdasarkan pilihan tersimpan anda.' },
  findRoute: { EN: 'Find route', BM: 'Cari laluan' },
  findRouteNeedsFields: { EN: 'Find route. Enter origin and destination first.', BM: 'Cari laluan. Masukkan lokasi asal dan destinasi dahulu.' },
  findRouteFromPrefix: { EN: 'Find route from', BM: 'Cari laluan dari' },
  routeToConnector: { EN: 'to', BM: 'ke' },
  serviceStatus: { EN: 'Service status', BM: 'Status perkhidmatan' },
  viewAll: { EN: 'View all', BM: 'Lihat semua' },
  viewAllServiceStatuses: { EN: 'Show all service updates', BM: 'Tunjukkan semua kemas kini perkhidmatan' },
  openServiceStatusPrefix: { EN: 'Open service update', BM: 'Buka kemas kini perkhidmatan' },
  transitMap: { EN: 'Transit map', BM: 'Peta transit' },
  transitMapAlt: { EN: 'Kuala Lumpur transit map', BM: 'Peta transit Kuala Lumpur' },
  wiraTip: { EN: 'Wira tip', BM: 'Tip Wira' },
  greenRoute: { EN: 'Green route: +20 points', BM: 'Laluan hijau: +20 mata' },
  wiraMascotAlt: { EN: 'Wira travel guide mascot', BM: 'Maskot panduan perjalanan Wira' },
  recentLocations: { EN: 'Recent locations', BM: 'Lokasi terkini' },
  manage: { EN: 'Manage', BM: 'Urus' },
  done: { EN: 'Done', BM: 'Selesai' },
  manageRecentLocations: { EN: 'Manage recent locations', BM: 'Urus lokasi terkini' },
  finishManagingRecentLocations: { EN: 'Finish managing recent locations', BM: 'Selesai mengurus lokasi terkini' },
  useRecentLocationPrefix: { EN: 'Use recent location', BM: 'Guna lokasi terkini' },
  removeRecentLocationPrefix: { EN: 'Remove recent location', BM: 'Buang lokasi terkini' },
  noRecentLocations: { EN: 'No recent locations saved yet.', BM: 'Belum ada lokasi terkini yang disimpan.' },
  journeyOptions: { EN: 'Journey options', BM: 'Pilihan perjalanan' },
  journeyOptionsCopy: { EN: 'Choose the route that suits you.', BM: 'Pilih laluan yang sesuai untuk anda.' },
  backToPlanner: { EN: 'Back to journey planner', BM: 'Kembali ke perancang perjalanan' },
  checkingRoutes: { EN: 'Checking route options', BM: 'Menyemak pilihan laluan' },
  sortFastest: { EN: 'Fastest', BM: 'Terpantas' },
  sortLessWalking: { EN: 'Less walking', BM: 'Kurang berjalan' },
  sortAccessible: { EN: 'Accessible', BM: 'Mesra akses' },
  sortRoutesAria: { EN: 'Route sorting options', BM: 'Pilihan susunan laluan' },
  sortRoutesPrefix: { EN: 'Sort routes by', BM: 'Susun laluan mengikut' },
  sortAccessibleNote: { EN: 'Accessibility preference is active. Pick another filter any time if you want a different route mix.', BM: 'Pilihan kebolehcapaian sedang aktif. Pilih penapis lain pada bila-bila masa jika anda mahu gabungan laluan yang berbeza.' },
  loadingTitle: { EN: 'Preparing live route suggestions...', BM: 'Menyediakan cadangan laluan semasa...' },
  loadingCopy: { EN: 'Checking the best public-transport options for this trip.', BM: 'Menyemak pilihan pengangkutan awam terbaik untuk perjalanan ini.' },
  noRoutesTitle: { EN: 'No live routes yet', BM: 'Belum ada laluan semasa' },
  noRoutesCopy: { EN: 'Connect Firestore route and ETA data to show transport options here.', BM: 'Sambungkan data laluan dan ETA Firestore untuk memaparkan pilihan pengangkutan di sini.' },
  noServiceStatuses: {
    EN: 'Service updates will appear here when your Firestore transport-status provider is connected.',
    BM: 'Kemas kini perkhidmatan akan dipaparkan di sini apabila penyedia status pengangkutan Firestore anda disambungkan.',
  },
  walk: { EN: 'Walk', BM: 'Jalan kaki' },
  fare: { EN: 'Fare', BM: 'Tambang' },
  transfers: { EN: 'Transfers', BM: 'Pertukaran' },
  accessible: { EN: 'Accessible', BM: 'Mesra akses' },
  yes: { EN: 'Yes', BM: 'Ya' },
  limited: { EN: 'Limited', BM: 'Terhad' },
  viewRouteDetailsPrefix: { EN: 'View details for', BM: 'Lihat butiran untuk' },
  routeInfoTitle: { EN: 'Service & route information', BM: 'Maklumat perkhidmatan & laluan' },
  routeInfoCopy: { EN: 'Times, fares and service availability may change.', BM: 'Masa, tambang, dan ketersediaan perkhidmatan boleh berubah.' },
  routeDetails: { EN: 'ROUTE DETAILS', BM: 'BUTIRAN LALUAN' },
  closeRouteDetails: { EN: 'Close route details', BM: 'Tutup butiran laluan' },
  departure: { EN: 'Departure', BM: 'Berlepas' },
  arrival: { EN: 'Arrival', BM: 'Tiba' },
  duration: { EN: 'Duration', BM: 'Tempoh' },
  accessibilitySupport: { EN: 'Accessibility support', BM: 'Sokongan kebolehcapaian' },
  walkingDistance: { EN: 'Walking distance', BM: 'Jarak berjalan kaki' },
  walkingDistanceCopy: { EN: 'Stations and timings are shown as a planning preview.', BM: 'Stesen dan masa ditunjukkan sebagai pratonton perancangan.' },
  startJourney: { EN: 'Start this journey', BM: 'Mulakan perjalanan ini' },
  startJourneyPrefix: { EN: 'Start this journey by', BM: 'Mulakan perjalanan ini dengan' },
  chooseAnotherRoute: { EN: 'Choose another route', BM: 'Pilih laluan lain' },
  chooseAnotherRouteLabel: { EN: 'Close route details and choose another route', BM: 'Tutup butiran laluan dan pilih laluan lain' },
  plannerErrorMissingFields: { EN: 'Enter both a starting point and destination.', BM: 'Masukkan titik permulaan dan destinasi.' },
  plannerErrorSameLocation: { EN: 'Starting point and destination must be different.', BM: 'Titik permulaan dan destinasi mestilah berbeza.' },
  plannerErrorMissingTime: { EN: 'Choose a valid travel date and time.', BM: 'Pilih tarikh dan masa perjalanan yang sah.' },
  swappedToast: { EN: 'Origin and destination swapped', BM: 'Lokasi asal dan destinasi telah ditukar' },
  recentSelected: { EN: 'selected as your starting point', BM: 'dipilih sebagai lokasi permulaan anda' },
  recentRemoved: { EN: 'removed from recent locations', BM: 'dibuang daripada lokasi terkini' },
  allLinesShown: { EN: 'All line updates are shown in the service list below', BM: 'Semua kemas kini laluan dipaparkan dalam senarai perkhidmatan di bawah' },
  journeyStarted: { EN: 'journey started', BM: 'perjalanan dimulakan' },
  fromPlaceholder: { EN: 'e.g. KL Sentral or current location', BM: 'cth. KL Sentral atau lokasi semasa' },
  toPlaceholder: { EN: 'e.g. Pasar Seni, George Town, Melaka', BM: 'cth. Pasar Seni, George Town, Melaka' },
  useMyLocation: { EN: 'Use my current location', BM: 'Guna lokasi semasa saya' },
  locatingToast: { EN: 'Detecting nearest Malaysian transit hub...', BM: 'Mengesan hab transit Malaysia terdekat...' },
  locatedToast: { EN: 'Current location set to nearest transit hub', BM: 'Lokasi semasa ditetapkan ke hab transit terdekat' },
  exploreLiveMap: { EN: 'Open interactive map', BM: 'Buka peta interaktif' },
  liveMapKicker: { EN: 'LIVE TRANSIT & TOURISM MAP', BM: 'PETA TRANSIT & PELANCONGAN LANGSUNG' },
  liveMapTitle: { EN: 'Malaysia transit explorer', BM: 'Peneroka transit Malaysia' },
  openInGoogleMaps: { EN: 'Open directions in Google Maps', BM: 'Buka arah dalam Google Maps' },
  serviceStatusKicker: { EN: 'GTFS REALTIME & PRASARANA', BM: 'GTFS MASA NYATA & PRASARANA' },
  serviceStatusTitle: { EN: 'Live transit service status', BM: 'Status perkhidmatan transit langsung' },
  routeStepsTitle: { EN: 'Step-by-step transit guide', BM: 'Panduan transit langkah demi langkah' },
  ecoImpactLabel: { EN: 'Eco impact', BM: 'Impak eko' },
  closeServiceStatus: { EN: 'Close service status', BM: 'Tutup status perkhidmatan' },
  closeInteractiveMap: { EN: 'Close interactive map', BM: 'Tutup peta interaktif' },
  gtfsLiveFeed: { EN: 'GTFS-RT Live', BM: 'GTFS-RT Langsung' },
  gtfsSyncing: { EN: 'Syncing live Malaysia GTFS-RT...', BM: 'Menyegerakkan GTFS-RT Malaysia...' },
  gtfsVehiclesActive: { EN: 'live vehicles tracked', BM: 'kenderaan langsung dijejaki' },
  refreshLiveFeed: { EN: 'Refresh live GTFS', BM: 'Muat semula GTFS langsung' },
  activeNavKicker: { EN: 'ACTIVE NAVIGATION IN PROGRESS', BM: 'NAVIGASI AKTIF SEDANG BERJALAN' },
  activeNavLockNotice: {
    EN: 'Complete or exit your current navigation below before searching for another destination.',
    BM: 'Selesaikan atau tamatkan navigasi semasa anda di bawah sebelum mencari destinasi lain.',
  },
  activeNavLockedToast: {
    EN: 'End or complete your current navigation first before searching another destination.',
    BM: 'Tamatkan atau selesaikan navigasi semasa anda dahulu sebelum mencari destinasi lain.',
  },
  completeActiveNav: { EN: 'Complete journey', BM: 'Selesaikan perjalanan' },
  exitActiveNav: { EN: 'End current navigation', BM: 'Tamatkan navigasi semasa' },
  activeNavCompletedToast: { EN: 'Journey completed! +20 Eco-Points earned.', BM: 'Perjalanan selesai! +20 Mata Eko diperoleh.' },
  activeNavExitedToast: { EN: 'Navigation ended. You can now search a new destination.', BM: 'Navigasi ditamatkan. Anda kini boleh mencari destinasi baharu.' },
  allModesHint: {
    EN: 'Multi-modal search compares MRT, LRT, KTM, Monorail & Bus routes automatically.',
    BM: 'Carian pelbagai mod membandingkan laluan MRT, LRT, KTM, Monorel & Bas secara automatik.',
  },
  detailsAction: { EN: 'Details', BM: 'Butiran' },
  fromPrefix: { EN: 'from', BM: 'dari' },
  toPrefix: { EN: 'to', BM: 'ke' },
  stopsUnit: { EN: 'stops', BM: 'hentian' },
  stopSingular: { EN: 'stop', BM: 'hentian' },
  walkFollowHint: { EN: 'Follow pedestrian walkway to', BM: 'Ikut laluan pejalan kaki ke' },
} as const;

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnDestroy {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);
  private readonly navigationService = inject(NavigationService);
  private readonly gtfsRealtime = inject(GtfsRealtimeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private routePlanSubscription?: Subscription;
  private localizedDataSubscription = new Subscription();
  private queryParamsSubscription = new Subscription();
  private readonly uiTimeouts = new ManagedTimeouts();
  rtSnapshot: GtfsRealtimeSnapshot = this.gtfsRealtime.snapshot;
  @ViewChild('navigationContent') private navigationContent?: any;
  @ViewChild('resultsHeading') private resultsHeadingRef?: ElementRef<HTMLElement>;
  @ViewChild('routeSheet') private routeSheetRef?: ElementRef<HTMLElement>;
  readonly copy = NAVIGATION_COPY;
  view: 'planner' | 'results' = 'planner';
  from = '';
  to = '';
  language: AppLanguage = 'EN';
  plannerDate = this.getToday();
  plannerTime = this.getCurrentTime();
  activeMode = '';
  modes: string[] = [];
  sort = 'Fastest';
  activeJourney: AppJourney | null = null;
  routes: RouteOption[] = [];
  serviceStatuses: ServiceStatus[] = [];
  allServiceStatuses: ServiceStatus[] = [];
  recentLocations: RecentLocation[] = [];
  savedNoticeCount = 0;
  isLoadingRoutes = false;
  selectedRoute: RouteOption | null = null;
  highlightedRouteIndex = 0;
  activeOverlaySheet: 'service' | 'map' | null = null;
  highlightedLine = '';
  activeInputField: 'from' | 'to' | null = null;
  locationSuggestions: TransitLocationSuggestion[] = [];
  mapHubs = MALAYSIA_TRANSIT_LOCATIONS.slice(0, 6);
  selectedMapLocation: TransitLocationSuggestion = MALAYSIA_TRANSIT_LOCATIONS[0];
  toast = '';
  plannerError = '';
  preferAccessibleRoutes = false;
  managingRecentLocations = false;
  private hasManualSortSelection = false;
  private previousFocusedElement: HTMLElement | null = null;

  constructor() {
    this.applyAccessibilityPreferences(this.accessibilityPreferencesService.getPreferences());
    this.modes = this.navigationService.getModes();
    this.refreshLocalizedData();
    this.buildRoutes();
    this.activeJourney = this.appStateService.getSnapshot().activeJourney;
    if (this.appStateService.state$) {
      this.queryParamsSubscription.add(
        this.appStateService.state$.subscribe((state) => {
          this.activeJourney = state.activeJourney;
        }),
      );
    }
    this.queryParamsSubscription.add(
      this.gtfsRealtime.snapshot$.subscribe((snap) => {
        this.rtSnapshot = snap;
        this.refreshLocalizedData();
      }),
    );
    void this.gtfsRealtime.refresh();
    this.queryParamsSubscription.add(
      this.route.queryParams.subscribe((params) => {
        const queryTo = typeof params['to'] === 'string' ? params['to'].trim() : '';
        const queryFrom = typeof params['from'] === 'string' ? params['from'].trim() : '';
        if (this.appStateService.getSnapshot().activeJourney && (queryTo || queryFrom)) {
          this.notify(this.t(this.copy.activeNavLockedToast));
          return;
        }
        if (queryTo) {
          this.to = queryTo;
          if (!this.from.trim()) {
            this.from = 'KL Sentral';
          }
          this.view = 'planner';
          this.plannerError = '';
          this.selectedMapLocation = this.navigationService.findLocationCoords(queryTo);
        }
        if (queryFrom) {
          this.from = queryFrom;
        }
      }),
    );
  }

  ionViewWillEnter(): void {
    this.activeJourney = this.appStateService.getSnapshot().activeJourney;
    this.applyAccessibilityPreferences(this.accessibilityPreferencesService.getPreferences(), this.view === 'results');
    this.refreshLocalizedData();
    void this.gtfsRealtime.refresh();
  }

  refreshLiveGtfs(): void {
    void this.gtfsRealtime.refresh(true).then(() => {
      if (this.view === 'results') {
        this.buildRoutes();
      }
    });
  }

  ngOnDestroy(): void {
    this.routePlanSubscription?.unsubscribe();
    this.localizedDataSubscription.unsubscribe();
    this.queryParamsSubscription.unsubscribe();
    this.uiTimeouts.clearAll();
  }

  swap(): void {
    const swapped = this.navigationService.swapLocations(this.from, this.to);
    this.from = swapped.from;
    this.to = swapped.to;
    this.notify(this.t(this.copy.swappedToast));
  }

  findRoute(): void {
    if (this.activeJourney) {
      this.notify(this.t(this.copy.activeNavLockedToast));
      return;
    }
    this.plannerError = '';

    if (!this.from.trim() || !this.to.trim()) {
      this.plannerError = this.t(this.copy.plannerErrorMissingFields);
      return;
    }

    if (this.from.trim().toLowerCase() === this.to.trim().toLowerCase()) {
      this.plannerError = this.t(this.copy.plannerErrorSameLocation);
      return;
    }

    if (!this.plannerDate || !this.plannerTime) {
      this.plannerError = this.t(this.copy.plannerErrorMissingTime);
      return;
    }

    this.appStateService.recordRecentLocations([this.from, this.to]);
    this.view = 'results';
    this.buildRoutes();
    this.refreshLocalizedData();
    this.resetResultsViewport();
  }

  selectMode(mode: string): void {
    this.activeMode = mode;
    this.buildRoutes();
  }

  selectSort(sort: string): void {
    this.hasManualSortSelection = true;
    this.sort = sort;
    this.buildRoutes();
  }

  updateFrom(value: string): void {
    this.from = value;
    this.plannerError = '';
  }

  t(text: LocalizedText): string {
    return text[this.language];
  }

  updateLanguage(language: AppLanguage): void {
    const preferences = this.accessibilityPreferencesService.setLanguage(language);
    this.applyAccessibilityPreferences(preferences, this.view === 'results');
    this.refreshLocalizedData();
  }

  modeLabel(mode: string): string {
    return getTransportModeLabel(this.language, mode);
  }

  modeIconName(mode: string): string {
    return getTransportModeIconName(mode);
  }

  resultsSummaryIconName(): string {
    return this.modeIconName(this.activeMode || this.routes[0]?.mode || '');
  }

  resultsSummaryModeLabel(): string {
    return this.modeLabel(this.activeMode || this.routes[0]?.mode || '');
  }

  sortLabel(sort: string): string {
    if (sort === 'Less walking') {
      return this.t(this.copy.sortLessWalking);
    }

    if (sort === 'Accessible') {
      return this.t(this.copy.sortAccessible);
    }

    return this.t(this.copy.sortFastest);
  }

  modeButtonAriaLabel(mode: string): string {
    return `${this.t(this.copy.transportModePrefix)} ${this.modeLabel(mode)}`;
  }

  sortButtonAriaLabel(sort: string): string {
    return `${this.t(this.copy.sortRoutesPrefix)} ${this.sortLabel(sort)}`;
  }

  findRouteButtonAriaLabel(): string {
    const from = this.from.trim();
    const to = this.to.trim();

    if (!from || !to) {
      return this.t(this.copy.findRouteNeedsFields);
    }

    return `${this.t(this.copy.findRouteFromPrefix)} ${from} ${this.t(this.copy.routeToConnector)} ${to}`;
  }

  serviceStatusOverviewAriaLabel(): string {
    return this.t(this.copy.viewAllServiceStatuses);
  }

  serviceStatusAriaLabel(status: ServiceStatus): string {
    return `${this.t(this.copy.openServiceStatusPrefix)}: ${status.line}. ${status.route}. ${status.state}.`;
  }

  manageRecentLocationsAriaLabel(): string {
    return this.managingRecentLocations
      ? this.t(this.copy.finishManagingRecentLocations)
      : this.t(this.copy.manageRecentLocations);
  }

  recentLocationAriaLabel(location: RecentLocation): string {
    return `${this.t(this.copy.useRecentLocationPrefix)}: ${location.label}. ${location.description}.`;
  }

  removeRecentLocationAriaLabel(location: RecentLocation): string {
    return `${this.t(this.copy.removeRecentLocationPrefix)}: ${location.label}`;
  }

  routeDetailsAriaLabel(route: RouteOption): string {
    return `${this.t(this.copy.viewRouteDetailsPrefix)} ${this.modeLabel(route.mode)}`;
  }

  startJourneyButtonAriaLabel(): string {
    if (!this.selectedRoute) {
      return this.t(this.copy.startJourney);
    }

    return `${this.t(this.copy.startJourneyPrefix)} ${this.modeLabel(this.selectedRoute.mode)} ${this.t(this.copy.routeToConnector)} ${this.to}`;
  }

  chooseAnotherRouteAriaLabel(): string {
    return this.t(this.copy.chooseAnotherRouteLabel);
  }

  journeyDepartureSummary(): string {
    const departureDateTime = this.buildPlannerDateTime();

    if (!departureDateTime) {
      return this.plannerTime || this.plannerDate;
    }

    return new Intl.DateTimeFormat(this.language === 'BM' ? 'ms-MY' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(departureDateTime);
  }

  journeyArrivalSummary(): string {
    const primaryRoute = this.routes[0];

    if (primaryRoute) {
      return `${primaryRoute.arrive} · ${this.resultsSummaryModeLabel()}`;
    }

    if (this.isLoadingRoutes) {
      return this.t(this.copy.checkingRoutes);
    }

    return this.t(this.copy.noRoutesTitle);
  }

  useRecentLocation(location: RecentLocation): void {
    this.updateFrom(location.value);
    this.notify(`${location.label} ${this.t(this.copy.recentSelected)}`);
  }

  manageRecentLocations(): void {
    this.managingRecentLocations = !this.managingRecentLocations;
  }

  removeRecentLocation(location: RecentLocation): void {
    this.appStateService.removeRecentLocation(location.value);
    this.recentLocations = this.recentLocations.filter((item) => item.value !== location.value);
    this.notify(`${location.label} ${this.t(this.copy.recentRemoved)}`);
  }

  openServiceStatus(status?: ServiceStatus): void {
    this.allServiceStatuses = this.navigationService.getAllServiceStatuses(this.language);
    if (this.allServiceStatuses.length === 0) {
      this.notify(this.t(this.copy.noServiceStatuses));
      return;
    }
    this.highlightedLine = status?.line ?? '';
    this.activeOverlaySheet = 'service';
  }

  openInteractiveMap(): void {
    const focusQuery = this.to.trim() || this.from.trim() || 'KL Sentral';
    this.selectedMapLocation = this.navigationService.findLocationCoords(focusQuery);
    this.activeOverlaySheet = 'map';
  }

  selectMapHub(hub: TransitLocationSuggestion): void {
    this.selectedMapLocation = hub;
  }

  useMapHubAsDestination(hub: TransitLocationSuggestion): void {
    this.to = hub.name;
    if (!this.from.trim()) {
      this.from = 'KL Sentral';
    }
    this.plannerError = '';
    this.closeOverlaySheet();
    this.notify(`${hub.name} → ${this.t(this.copy.to)}`);
  }

  closeOverlaySheet(): void {
    this.activeOverlaySheet = null;
    this.highlightedLine = '';
  }

  onLocationInputFocus(field: 'from' | 'to'): void {
    this.activeInputField = field;
    const query = field === 'from' ? this.from : this.to;
    this.locationSuggestions = this.navigationService.getLocationSuggestions(query);
  }

  onLocationInputChange(field: 'from' | 'to', value: string): void {
    this.plannerError = '';
    this.activeInputField = field;
    this.locationSuggestions = this.navigationService.getLocationSuggestions(value);
  }

  onLocationInputBlur(): void {
    this.uiTimeouts.schedule('blur-suggestions', () => {
      this.activeInputField = null;
    }, 180);
  }

  pickLocationSuggestion(field: 'from' | 'to', suggestion: TransitLocationSuggestion): void {
    if (field === 'from') {
      this.from = suggestion.name;
    } else {
      this.to = suggestion.name;
    }
    this.plannerError = '';
    this.activeInputField = null;
  }

  useCurrentLocation(): void {
    this.notify(this.t(this.copy.locatingToast));
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nearest = this.findNearestTransitHub(pos.coords.latitude, pos.coords.longitude);
          this.from = nearest.name;
          this.plannerError = '';
          this.notify(`${this.t(this.copy.locatedToast)}: ${nearest.name}`);
        },
        () => {
          this.from = 'KL Sentral';
          this.plannerError = '';
          this.notify(`${this.t(this.copy.locatedToast)}: KL Sentral`);
        },
        { timeout: 3500 },
      );
    } else {
      this.from = 'KL Sentral';
      this.plannerError = '';
      this.notify(`${this.t(this.copy.locatedToast)}: KL Sentral`);
    }
  }

  openExternalGoogleMaps(): void {
    const origin = encodeURIComponent(this.from.trim() || 'KL Sentral, Kuala Lumpur');
    const destination = encodeURIComponent(this.to.trim() || this.selectedMapLocation.name);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private findNearestTransitHub(lat: number, lng: number): TransitLocationSuggestion {
    let best = MALAYSIA_TRANSIT_LOCATIONS[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const loc of MALAYSIA_TRANSIT_LOCATIONS) {
      const dist = Math.hypot(loc.lat - lat, loc.lng - lng);
      if (dist < bestDist) {
        bestDist = dist;
        best = loc;
      }
    }
    return best;
  }

  get activePreviewRoute(): RouteOption | null {
    return this.selectedRoute ?? this.routes[this.highlightedRouteIndex] ?? this.routes[0] ?? null;
  }

  highlightRoute(index: number): void {
    if (index < 0 || index >= this.routes.length) {
      return;
    }
    this.highlightedRouteIndex = index;
    if (this.selectedRoute) {
      this.selectedRoute = this.routes[index];
    }
  }

  openRouteDetails(route: RouteOption, index?: number): void {
    if (typeof index === 'number' && index >= 0 && index < this.routes.length) {
      this.highlightedRouteIndex = index;
    } else {
      const foundIdx = this.routes.indexOf(route);
      if (foundIdx >= 0) {
        this.highlightedRouteIndex = foundIdx;
      }
    }
    this.previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.selectedRoute = route;
    this.uiTimeouts.schedule('route-sheet-focus', () => this.routeSheetRef?.nativeElement.focus(), 0);
  }

  closeRouteDetails(): void {
    this.selectedRoute = null;
    const previousFocusedElement = this.previousFocusedElement;
    this.previousFocusedElement = null;
    this.uiTimeouts.schedule('route-sheet-focus-restore', () => previousFocusedElement?.focus(), 0);
  }

  completeActiveNavigation(): void {
    const completed = this.appStateService.completeActiveJourney();
    if (!completed) {
      return;
    }
    this.activeJourney = null;
    this.view = 'planner';
    this.notify(this.t(this.copy.activeNavCompletedToast));
  }

  exitActiveNavigation(): void {
    this.appStateService.cancelActiveJourney?.();
    this.activeJourney = null;
    this.view = 'planner';
    this.notify(this.t(this.copy.activeNavExitedToast));
  }

  openActiveJourneyGoogleMaps(): void {
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

  startJourney(): void {
    if (!this.selectedRoute) {
      return;
    }

    const journey = this.appStateService.startJourney(this.selectedRoute, {
      from: this.from,
      to: this.to,
      travelDate: this.plannerDate,
      travelTime: this.plannerTime,
    });
    this.activeJourney = journey;
    this.closeRouteDetails();
    this.notify(`${this.modeLabel(journey.mode)} ${this.t(this.copy.journeyStarted)}`);
    this.uiTimeouts.schedule('start-journey-nav', () => void this.router.navigate(['/tabs/tab1']), 500);
  }

  routeDialogAriaLabel(): string {
    if (!this.selectedRoute) {
      return this.t(this.copy.routeInfoTitle);
    }

    return `${this.modeLabel(this.selectedRoute.mode)} ${this.t(this.copy.routeDetails).toLowerCase()}`;
  }

  handleRouteSheetKeydown(event: KeyboardEvent, sheet: HTMLElement): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeRouteDetails();
      return;
    }

    if (event.key === 'Tab') {
      this.trapRouteSheetFocus(event, sheet);
    }
  }

  openNotifications(): void {
    void this.router.navigate(['/tabs/tab3'], { queryParams: { view: 'notices' } });
  }

  notify(message: string): void {
    this.toast = message;
    this.uiTimeouts.schedule('toast', () => this.toast = '', 2200);
  }

  private buildRoutes(): void {
    this.isLoadingRoutes = true;
    this.routePlanSubscription?.unsubscribe();
    this.routePlanSubscription = this.navigationService.buildPlan({
      from: this.from,
      to: this.to,
      mode: this.activeMode || undefined,
      sort: this.sort,
      travelDate: this.plannerDate,
      travelTime: this.plannerTime,
    }, this.language).subscribe({
      next: (routes) => {
        this.routes = routes;
        this.highlightedRouteIndex = 0;
        if (this.selectedRoute && routes.length > 0) {
          this.selectedRoute = routes[0];
        }
        this.isLoadingRoutes = false;
      },
      error: () => {
        this.routes = [];
        this.highlightedRouteIndex = 0;
        this.isLoadingRoutes = false;
      },
    });
  }

  private resetResultsViewport(): void {
    this.uiTimeouts.schedule('navigation-results-viewport', () => {
      void this.navigationContent?.scrollToTop(0);
      this.resultsHeadingRef?.nativeElement.focus({ preventScroll: true });
    }, 0);
  }

  private refreshLocalizedData(): void {
    this.savedNoticeCount = this.appStateService.getSnapshot().savedNoticeIds.length;
    this.localizedDataSubscription.unsubscribe();
    this.localizedDataSubscription = new Subscription();
    this.localizedDataSubscription.add(
      this.navigationService.getServiceStatuses(this.language).subscribe((statuses) => this.serviceStatuses = statuses),
    );
    const recentLocationValues = this.appStateService.getSnapshot().recentLocationValues;
    this.localizedDataSubscription.add(
      this.navigationService.getRecentLocations(this.language, recentLocationValues).subscribe((locations) => this.recentLocations = locations),
    );
  }

  private applyAccessibilityPreferences(
    preferences: AccessibilityPreferences,
    rebuildRoutes = false,
  ): void {
    this.language = preferences.language;
    this.preferAccessibleRoutes = preferences.settings.wheelchair;

    if (!this.hasManualSortSelection || this.sort === 'Fastest' || this.sort === 'Accessible') {
      this.sort = this.preferAccessibleRoutes ? 'Accessible' : 'Fastest';
    }

    if (rebuildRoutes) {
      this.buildRoutes();
    }
  }

  private getToday(): string {
    const date = new Date();
    const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000));
    return offsetDate.toISOString().slice(0, 10);
  }

  private getCurrentTime(): string {
    const date = new Date();
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private buildPlannerDateTime(): Date | null {
    if (!this.plannerDate || !this.plannerTime) {
      return null;
    }

    const dateTime = new Date(`${this.plannerDate}T${this.plannerTime}`);

    return Number.isNaN(dateTime.getTime()) ? null : dateTime;
  }

  private trapRouteSheetFocus(event: KeyboardEvent, sheet: HTMLElement): void {
    const focusableElements = Array.from(sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

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
}
