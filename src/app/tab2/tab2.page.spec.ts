import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { of, Subject } from 'rxjs';

import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { AppStateService } from '../services/app-state.service';
import {
  NavigationService,
  RecentLocation,
  RouteOption,
  ServiceStatus,
} from '../services/navigation.service';
import { Tab2Page } from './tab2.page';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;
  let accessibilityPreferencesService: jasmine.SpyObj<AccessibilityPreferencesService>;
  let appStateService: jasmine.SpyObj<AppStateService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let router: Router;

  const preferences: AccessibilityPreferences = {
    language: 'EN',
    textSize: 'Standard',
    settings: {
      contrast: true,
      motion: false,
      underline: true,
      reader: true,
      voice: false,
      wheelchair: true,
    },
  };

  function createRoute(mode: string): RouteOption {
    return {
      mode,
      detail: `${mode} route`,
      color: '#0754cc',
      depart: '10:00 AM',
      arrive: '10:30 AM',
      duration: '30 min',
      fare: 'RM2.00',
      walk: '220 m',
      transfers: 1,
      isAccessible: true,
      accessibilityNote: 'Accessible route',
      points: '+20',
    };
  }

  function createState(): ReturnType<AppStateService['getSnapshot']> {
    return {
      version: 2,
      ecoPoints: 0,
      activeJourney: null,
      journeyHistory: [],
      recentLocationValues: [],
      postReactions: {},
      contributions: [],
      communityTips: [],
      tipDraft: null,
      savedNoticeIds: [],
      completedVerificationIds: [],
      transactions: [],
    };
  }

  beforeEach(async () => {
    accessibilityPreferencesService = jasmine.createSpyObj<AccessibilityPreferencesService>(
      'AccessibilityPreferencesService',
      ['getPreferences', 'setLanguage'],
    );
    appStateService = jasmine.createSpyObj<AppStateService>('AppStateService', ['startJourney', 'getSnapshot', 'recordRecentLocations', 'removeRecentLocation']);
    navigationService = jasmine.createSpyObj<NavigationService>(
      'NavigationService',
      ['getModes', 'getServiceStatuses', 'getRecentLocations', 'buildPlan', 'swapLocations'],
    );

    accessibilityPreferencesService.getPreferences.and.returnValue(preferences);
    accessibilityPreferencesService.setLanguage.and.returnValue(preferences);
    navigationService.getModes.and.returnValue(['MRT', 'Bus']);
    navigationService.getServiceStatuses.and.returnValue(of<ServiceStatus[]>([]));
    navigationService.getRecentLocations.and.returnValue(of<RecentLocation[]>([]));
    navigationService.buildPlan.and.returnValue(of<RouteOption[]>([createRoute('MRT')]));
    appStateService.getSnapshot.and.returnValue(createState());

    await TestBed.configureTestingModule({
      declarations: [Tab2Page],
      imports: [FormsModule, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AccessibilityPreferencesService, useValue: accessibilityPreferencesService },
        { provide: AppStateService, useValue: appStateService },
        { provide: NavigationService, useValue: navigationService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.savedNoticeCount).toBe(0);
  });

  it('refreshes saved notice count when the page re-enters', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      savedNoticeIds: ['notice-kelana-jaya-delay'],
    });

    component.ionViewWillEnter();

    expect(component.savedNoticeCount).toBe(1);
  });

  it('persists planned locations into recent locations after a valid search', () => {
    component.from = 'Batu Caves';
    component.to = 'KLCC';
    component.plannerDate = '2026-07-01';
    component.plannerTime = '09:15';

    component.findRoute();

    expect(appStateService.recordRecentLocations).toHaveBeenCalledWith(['Batu Caves', 'KLCC']);
    expect(component.view).toBe('results');
    expect(navigationService.getRecentLocations).toHaveBeenCalledWith('EN', []);
  });

  it('shows state-aware departure and arrival summaries on the results card', () => {
    component.from = 'Batu Caves';
    component.to = 'KLCC';
    component.plannerDate = '2026-07-01';
    component.plannerTime = '09:15';

    component.findRoute();

    expect(component.journeyDepartureSummary()).toContain('1 Jul');
    expect(component.journeyDepartureSummary()).toContain('9:15');
    expect(component.journeyArrivalSummary()).toBe('10:30 AM · MRT');
  });

  it('falls back to a live loading summary while route options are still resolving', () => {
    const pendingRoutes$ = new Subject<RouteOption[]>();

    navigationService.buildPlan.and.returnValue(pendingRoutes$.asObservable());

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.journeyArrivalSummary()).toBe('Checking route options');
  });

  it('persists recent location removals', () => {
    component.recentLocations = [
      {
        label: 'KL Sentral',
        value: 'KL Sentral',
        description: 'Transit hub and airport rail link',
      },
    ];

    component.removeRecentLocation(component.recentLocations[0]);

    expect(appStateService.removeRecentLocation).toHaveBeenCalledWith('KL Sentral');
    expect(component.recentLocations).toEqual([]);
  });

  it('builds localized accessibility labels for recent-location removal and route details', () => {
    const location: RecentLocation = {
      label: 'KL Sentral',
      value: 'KL Sentral',
      description: 'Transit hub',
    };
    const route = createRoute('Bus');

    expect(component.removeRecentLocationAriaLabel(location)).toBe('Remove recent location: KL Sentral');
    expect(component.routeDetailsAriaLabel(route)).toBe('View details for Bus');
  });

  it('localizes Tab 2 accessibility labels in Bahasa Melayu', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    const location: RecentLocation = {
      label: 'KL Sentral',
      value: 'KL Sentral',
      description: 'Hab transit',
    };
    const route = createRoute('Bus');

    expect(component.removeRecentLocationAriaLabel(location)).toBe('Buang lokasi terkini: KL Sentral');
    expect(component.routeDetailsAriaLabel(route)).toBe('Lihat butiran untuk Bas');
  });

  it('shows the empty-state transport status message when no provider data exists', () => {
    component.serviceStatuses = [];

    component.openServiceStatus();

    expect(component.toast).toBe('Service updates will appear here when your Firestore transport-status provider is connected.');
  });

  it('renders accessible pressed states for transport mode options', () => {
    fixture.detectChanges();

    const modeButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.mode-row button'),
    ) as HTMLButtonElement[];

    expect(modeButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(modeButtons[0].getAttribute('aria-label')).toBe('Select transport mode MRT');

    component.selectMode('Bus');
    fixture.detectChanges();

    expect(modeButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(modeButtons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps navigation planner helper typography above the tiny-text readability floor', () => {
    component.serviceStatuses = [
      {
        line: 'MRT Kajang',
        route: 'Kajang to SBK13',
        state: 'Normal',
        color: '#0754cc',
      },
    ];
    component.recentLocations = [
      {
        label: 'KL Sentral',
        value: 'KL Sentral',
        description: 'Transit hub and airport rail link',
      },
    ];
    fixture.detectChanges();

    const plannerLabel = fixture.nativeElement.querySelector('.planner-card label') as HTMLElement;
    const plannerInput = fixture.nativeElement.querySelector('.planner-card label input') as HTMLElement;
    const dateCaption = fixture.nativeElement.querySelector('.date-row label span') as HTMLElement;
    const dateInput = fixture.nativeElement.querySelector('.date-row label input') as HTMLElement;
    const modeButton = fixture.nativeElement.querySelector('.mode-row button') as HTMLElement;
    const sectionTitle = fixture.nativeElement.querySelector('.service-card .section-title b') as HTMLElement;
    const sectionAction = fixture.nativeElement.querySelector('.service-card .section-title button') as HTMLElement;
    const serviceLabel = fixture.nativeElement.querySelector('.service-row b') as HTMLElement;
    const serviceCopy = fixture.nativeElement.querySelector('.service-row small') as HTMLElement;
    const serviceRow = fixture.nativeElement.querySelector('.service-row') as HTMLElement;
    const recentLabel = fixture.nativeElement.querySelector('.recent-row b') as HTMLElement;
    const recentCopy = fixture.nativeElement.querySelector('.recent-row small') as HTMLElement;
    const recentAction = fixture.nativeElement.querySelector('.recent-row > button:first-child') as HTMLElement;

    expect(parseFloat(getComputedStyle(plannerLabel).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(plannerInput).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(plannerInput).minHeight)).toBeGreaterThanOrEqual(42);
    expect(parseFloat(getComputedStyle(dateCaption).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(dateInput).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(dateInput).minHeight)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(modeButton).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(modeButton).minHeight)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(sectionTitle).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(sectionAction).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(sectionAction).minHeight)).toBeGreaterThanOrEqual(36);
    expect(parseFloat(getComputedStyle(serviceLabel).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(serviceCopy).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(serviceRow).minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(recentLabel).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(recentCopy).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(recentAction).minHeight)).toBeGreaterThanOrEqual(40);
  });

  it('renders accessible pressed states for route sort options', () => {
    component.view = 'results';
    fixture.detectChanges();

    const sortButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.sort-row button'),
    ) as HTMLButtonElement[];

    expect(sortButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(sortButtons[0].getAttribute('aria-label')).toBe('Sort routes by Fastest');
    expect(sortButtons[2].getAttribute('aria-pressed')).toBe('true');

    component.selectSort('Fastest');
    fixture.detectChanges();

    expect(sortButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(sortButtons[2].getAttribute('aria-pressed')).toBe('false');
  });

  it('localizes transport mode and sort accessibility labels in Bahasa Melayu', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.modeButtonAriaLabel('Bus')).toBe('Pilih mod pengangkutan Bas');
    expect(component.sortButtonAriaLabel('Less walking')).toBe('Susun laluan mengikut Kurang berjalan');
  });

  it('marks decorative Tab 2 icons as hidden from assistive technology', () => {
    component.view = 'planner';
    fixture.detectChanges();

    const swapIcon = fixture.nativeElement.querySelector('.swap-button ion-icon') as HTMLElement;
    const modeIcon = fixture.nativeElement.querySelector('.mode-row button ion-icon') as HTMLElement;
    const findRouteIcon = fixture.nativeElement.querySelector('.find-route ion-icon') as HTMLElement;

    expect(swapIcon.getAttribute('aria-hidden')).toBe('true');
    expect(modeIcon.getAttribute('aria-hidden')).toBe('true');
    expect(findRouteIcon.getAttribute('aria-hidden')).toBe('true');

    component.view = 'results';
    component.routes = [createRoute('MRT')];
    component.from = 'KL Sentral';
    component.to = 'Pasar Seni';
    component.selectedRoute = createRoute('MRT');
    fixture.detectChanges();

    const routeDetailsIcon = fixture.nativeElement.querySelector('.route-meta button ion-icon') as HTMLElement;
    const closeSheetIcon = fixture.nativeElement.querySelector('.sheet-close ion-icon') as HTMLElement;

    expect(routeDetailsIcon.getAttribute('aria-hidden')).toBe('true');
    expect(closeSheetIcon.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the newest route results when earlier requests finish later', () => {
    const initialRoutes$ = new Subject<RouteOption[]>();
    const staleRoutes$ = new Subject<RouteOption[]>();
    const latestRoutes$ = new Subject<RouteOption[]>();

    navigationService.buildPlan.and.returnValues(
      initialRoutes$.asObservable(),
      staleRoutes$.asObservable(),
      latestRoutes$.asObservable(),
    );

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.selectMode('Bus');
    component.selectSort('Accessible');

    latestRoutes$.next([createRoute('Latest route')]);
    expect(component.routes).toEqual([createRoute('Latest route')]);
    expect(component.isLoadingRoutes).toBeFalse();

    staleRoutes$.next([createRoute('Stale route')]);
    initialRoutes$.next([createRoute('Initial route')]);

    expect(component.routes).toEqual([createRoute('Latest route')]);
  });

  it('stops pending route updates after the page is destroyed', () => {
    const pendingRoutes$ = new Subject<RouteOption[]>();

    navigationService.buildPlan.and.returnValue(pendingRoutes$.asObservable());

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    fixture.destroy();
    pendingRoutes$.next([createRoute('Late route')]);

    expect(component.routes).toEqual([]);
    expect(component.isLoadingRoutes).toBeTrue();
  });

  it('opens travel notices directly from the topbar notification action', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.openNotifications();

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/tabs/tab3'],
      { queryParams: { view: 'notices' } },
    );
  });

  it('renders the route details sheet as an accessible dialog and closes it on escape', () => {
    component.view = 'results';
    component.selectedRoute = createRoute('MRT');
    fixture.detectChanges();

    const routeSheet = fixture.nativeElement.querySelector('.route-sheet') as HTMLElement;

    expect(routeSheet.getAttribute('role')).toBe('dialog');
    expect(routeSheet.getAttribute('aria-modal')).toBe('true');
    expect(routeSheet.getAttribute('tabindex')).toBe('-1');
    expect(routeSheet.getAttribute('aria-label')).toBe('MRT route details');

    routeSheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.selectedRoute).toBeNull();
  });

  it('keeps navigation result and route-detail helper typography above the tiny-text readability floor', () => {
    component.view = 'results';
    component.from = 'KL Sentral';
    component.to = 'Pasar Seni';
    component.isLoadingRoutes = true;
    fixture.detectChanges();

    const sortButton = fixture.nativeElement.querySelector('.sort-row button') as HTMLElement;
    const routeLoadingTitle = fixture.nativeElement.querySelector('.route-loading b') as HTMLElement;
    const routeLoadingCopy = fixture.nativeElement.querySelector('.route-loading small') as HTMLElement;

    expect(parseFloat(getComputedStyle(sortButton).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(sortButton).minHeight)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(routeLoadingTitle).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(routeLoadingCopy).fontSize)).toBeGreaterThanOrEqual(10);

    component.isLoadingRoutes = false;
    component.routes = [createRoute('MRT')];
    component.selectedRoute = createRoute('MRT');
    fixture.detectChanges();

    const routeSummaryTitle = fixture.nativeElement.querySelector('.route-summary b') as HTMLElement;
    const routeSummaryCopy = fixture.nativeElement.querySelector('.route-summary small') as HTMLElement;
    const sheetKicker = fixture.nativeElement.querySelector('.sheet-kicker') as HTMLElement;
    const routeMetaLabel = fixture.nativeElement.querySelector('.route-meta small') as HTMLElement;
    const routeMetaValue = fixture.nativeElement.querySelector('.route-meta b') as HTMLElement;
    const routeMetaAction = fixture.nativeElement.querySelector('.route-meta button') as HTMLElement;
    const routeDetailMeta = fixture.nativeElement.querySelector('.route-detail-grid small') as HTMLElement;
    const routeDetailNoteTitle = fixture.nativeElement.querySelector('.route-detail-note b') as HTMLElement;
    const routeDetailNoteCopy = fixture.nativeElement.querySelector('.route-detail-note small') as HTMLElement;
    const closeSheetButton = fixture.nativeElement.querySelector('.sheet-close') as HTMLElement;

    expect(parseFloat(getComputedStyle(routeSummaryTitle).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(routeSummaryCopy).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(sheetKicker).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(routeMetaLabel).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(routeMetaValue).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(routeMetaAction).width)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(routeMetaAction).height)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(routeDetailMeta).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(routeDetailNoteTitle).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(routeDetailNoteCopy).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(closeSheetButton).width)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(closeSheetButton).height)).toBeGreaterThanOrEqual(40);
  });
});
