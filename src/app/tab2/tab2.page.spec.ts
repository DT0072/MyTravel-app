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
      recentLocationValues: ['KL Sentral', 'Pasar Seni', 'Merdeka 118'],
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
    expect(navigationService.getRecentLocations).toHaveBeenCalledWith('EN', ['KL Sentral', 'Pasar Seni', 'Merdeka 118']);
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
});
