import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
  AppLanguage,
} from '../services/accessibility-preferences.service';
import {
  NavigationService,
  RecentLocation,
  RouteOption,
  ServiceStatus,
} from '../services/navigation.service';
import { AppStateService } from '../services/app-state.service';
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
  serviceStatus: { EN: 'Service status', BM: 'Status perkhidmatan' },
  viewAll: { EN: 'View all', BM: 'Lihat semua' },
  viewAllServiceStatuses: { EN: 'Show all service updates', BM: 'Tunjukkan semua kemas kini perkhidmatan' },
  openServiceStatusPrefix: { EN: 'Open service update', BM: 'Buka kemas kini perkhidmatan' },
  transitMap: { EN: 'Transit map', BM: 'Peta transit' },
  transitMapAlt: { EN: 'Kuala Lumpur transit map', BM: 'Peta transit Kuala Lumpur' },
  wiraTip: { EN: 'Wira Tip', BM: 'Tip Wira' },
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
  chooseAnotherRoute: { EN: 'Choose another route', BM: 'Pilih laluan lain' },
  plannerErrorMissingFields: { EN: 'Enter both a starting point and destination.', BM: 'Masukkan titik permulaan dan destinasi.' },
  plannerErrorSameLocation: { EN: 'Starting point and destination must be different.', BM: 'Titik permulaan dan destinasi mestilah berbeza.' },
  plannerErrorMissingTime: { EN: 'Choose a valid travel date and time.', BM: 'Pilih tarikh dan masa perjalanan yang sah.' },
  swappedToast: { EN: 'Origin and destination swapped', BM: 'Lokasi asal dan destinasi telah ditukar' },
  recentSelected: { EN: 'selected as your starting point', BM: 'dipilih sebagai lokasi permulaan anda' },
  recentRemoved: { EN: 'removed from recent locations', BM: 'dibuang daripada lokasi terkini' },
  allLinesShown: { EN: 'All line updates are shown in the service list below', BM: 'Semua kemas kini laluan dipaparkan dalam senarai perkhidmatan di bawah' },
  journeyStarted: { EN: 'journey started', BM: 'perjalanan dimulakan' },
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
  private readonly router = inject(Router);
  private routePlanSubscription?: Subscription;
  private localizedDataSubscription = new Subscription();
  private readonly uiTimeouts = new ManagedTimeouts();
  @ViewChild('routeSheet') private routeSheetRef?: ElementRef<HTMLElement>;
  readonly copy = NAVIGATION_COPY;
  view: 'planner' | 'results' = 'planner';
  from = '';
  to = '';
  language: AppLanguage = 'EN';
  plannerDate = this.getToday();
  plannerTime = this.getCurrentTime();
  activeMode = 'MRT';
  modes: string[] = [];
  sort = 'Fastest';
  routes: RouteOption[] = [];
  serviceStatuses: ServiceStatus[] = [];
  recentLocations: RecentLocation[] = [];
  savedNoticeCount = 0;
  isLoadingRoutes = false;
  selectedRoute: RouteOption | null = null;
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
  }

  ionViewWillEnter(): void {
    this.applyAccessibilityPreferences(this.accessibilityPreferencesService.getPreferences(), this.view === 'results');
    this.refreshLocalizedData();
  }

  ngOnDestroy(): void {
    this.routePlanSubscription?.unsubscribe();
    this.localizedDataSubscription.unsubscribe();
    this.uiTimeouts.clearAll();
  }

  swap(): void {
    const swapped = this.navigationService.swapLocations(this.from, this.to);
    this.from = swapped.from;
    this.to = swapped.to;
    this.notify(this.t(this.copy.swappedToast));
  }

  findRoute(): void {
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
    if (!status) {
      if (this.serviceStatuses.length === 0) {
        this.notify(this.t(this.copy.noServiceStatuses));
        return;
      }

      this.notify(this.t(this.copy.allLinesShown));
      return;
    }

    this.notify(`${status.line}: ${status.state}`);
  }

  openRouteDetails(route: RouteOption): void {
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
      mode: this.activeMode,
      sort: this.sort,
      travelDate: this.plannerDate,
      travelTime: this.plannerTime,
    }, this.language).subscribe({
      next: (routes) => {
        this.routes = routes;
        this.isLoadingRoutes = false;
      },
      error: () => {
        this.routes = [];
        this.isLoadingRoutes = false;
      },
    });
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
