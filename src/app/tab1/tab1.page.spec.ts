import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { AppStateService } from '../services/app-state.service';
import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;
  let accessibilityPreferencesService: jasmine.SpyObj<AccessibilityPreferencesService>;
  let appStateService: jasmine.SpyObj<AppStateService>;
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

  function createState(): ReturnType<AppStateService['getSnapshot']> {
    return {
      version: 2,
      ecoPoints: 120,
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
    appStateService = jasmine.createSpyObj<AppStateService>(
      'AppStateService',
      ['getSnapshot', 'submitVerification', 'completeActiveJourney'],
    );

    accessibilityPreferencesService.getPreferences.and.returnValue(preferences);
    accessibilityPreferencesService.setLanguage.and.returnValue(preferences);
    appStateService.getSnapshot.and.returnValue(createState());
    appStateService.submitVerification.and.returnValue(true);
    appStateService.completeActiveJourney.and.returnValue(null);

    await TestBed.configureTestingModule({
      declarations: [Tab1Page],
      imports: [IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AccessibilityPreferencesService, useValue: accessibilityPreferencesService },
        { provide: AppStateService, useValue: appStateService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create with seeded home content', () => {
    expect(component).toBeTruthy();
    expect(component.events.length).toBe(3);
    expect(component.events[0].dateLabel).toBe('5 Jul');
    expect(component.verificationTask?.id).toBe('verification-kl-sentral-access');
    expect(component.savedNoticeCount).toBe(0);
    expect(component.passportProgressSummary()).toBe('3/4 stamps unlocked');
    expect(component.weeklyMissionSummary()).toBe('2 of 7 challenge steps completed this season.');
    expect(component.verificationCardSummary()).toBe('Next checkpoint: KL Sentral station. 0/2 completed.');
    expect(component.verificationCardBadge()).toBe('+40\nEco-Points');
  });

  it('skips completed verification tasks when refreshing state', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      savedNoticeIds: ['notice-kelana-jaya-delay', 'notice-melaka-heat'],
      completedVerificationIds: ['verification-kl-sentral-access'],
    });

    component.ionViewWillEnter();

    expect(component.verificationTask?.id).toBe('verification-pasar-seni-access');
    expect(component.savedNoticeCount).toBe(2);
    expect(component.verificationCardSummary()).toBe('Next checkpoint: Pasar Seni station. 1/2 completed.');
  });

  it('updates seeded event date labels when the language changes', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.language).toBe('BM');
    expect(component.events[0].dateLabel.toLowerCase()).toContain('jul');
    expect(component.passportProgressSummary()).toBe('3/4 cop dibuka');
    expect(component.verificationCardSummary()).toBe('Pusat semakan seterusnya: Stesen KL Sentral. 0/2 selesai.');
    expect(component.verificationCardBadge()).toBe('+40\nMata Eko');
  });

  it('derives passport and mission progress from saved travel activity', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      ecoPoints: 80,
      journeyHistory: [
        {
          id: 'journey-1',
          from: 'KL Sentral',
          to: 'Pasar Seni',
          mode: 'LRT',
          detail: 'Kelana Jaya Line',
          depart: '09:00',
          arrive: '09:12',
          duration: '12 min',
          fare: 'RM 1.80',
          walk: '4 min',
          isAccessible: true,
          travelDate: '2026-07-01',
          travelTime: '09:00',
          startedAt: '2026-07-01T01:00:00.000Z',
          completedAt: '2026-07-01T01:12:00.000Z',
          points: 20,
        },
        {
          id: 'journey-2',
          from: 'Masjid Jamek',
          to: 'Batu Caves',
          mode: 'KTM',
          detail: 'Batu Caves Line',
          depart: '13:00',
          arrive: '13:28',
          duration: '28 min',
          fare: 'RM 2.60',
          walk: '6 min',
          isAccessible: false,
          travelDate: '2026-07-02',
          travelTime: '13:00',
          startedAt: '2026-07-02T05:00:00.000Z',
          completedAt: '2026-07-02T05:28:00.000Z',
          points: 20,
        },
      ],
      contributions: [
        {
          id: 'contribution-1',
          title: 'Station accessibility update',
          type: 'Verification',
          status: 'Approved',
          createdAt: '2026-06-22T02:00:00.000Z',
          points: 40,
        },
      ],
      savedNoticeIds: ['notice-kelana-jaya-delay'],
      completedVerificationIds: ['verification-kl-sentral-access'],
    });

    component.ionViewWillEnter();

    expect(component.passportProgressSummary()).toBe('4/4 stamps unlocked');
    expect(component.weeklyMissionSummary()).toBe('5 of 7 challenge steps completed this season.');
    expect(component.verificationCardSummary()).toBe('Next checkpoint: Pasar Seni station. 1/2 completed.');
  });

  it('submits verification, refreshes state, and advances to the next task', () => {
    appStateService.getSnapshot.and.returnValues(
      createState(),
      {
        ...createState(),
        ecoPoints: 160,
        completedVerificationIds: ['verification-kl-sentral-access'],
      },
    );

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.submitVerification();

    expect(appStateService.submitVerification).toHaveBeenCalledWith(
      'verification-kl-sentral-access',
      'KL Sentral accessibility review',
    );
    expect(component.ecoPoints).toBe(160);
    expect(component.verificationTask?.id).toBe('verification-pasar-seni-access');
    expect(component.toast).toContain('+40');
  });

  it('shows completion state when all shared verification checkpoints are done', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      completedVerificationIds: [
        'verification-kl-sentral-access',
        'verification-pasar-seni-access',
      ],
    });

    component.ionViewWillEnter();

    expect(component.verificationTask).toBeNull();
    expect(component.verificationCardSummary()).toBe('All 2 nearby checkpoints are completed.');
    expect(component.verificationCardBadge()).toBe('All\ndone');
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
