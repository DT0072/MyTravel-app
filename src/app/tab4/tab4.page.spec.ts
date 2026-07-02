import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { AppStateService } from '../services/app-state.service';
import { Tab4Page } from './tab4.page';

describe('Tab4Page', () => {
  let component: Tab4Page;
  let fixture: ComponentFixture<Tab4Page>;
  let accessibilityPreferencesService: jasmine.SpyObj<AccessibilityPreferencesService>;
  let appStateService: jasmine.SpyObj<AppStateService>;
  let router: Router;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

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
    queryParamMap$ = new BehaviorSubject(convertToParamMap({ view: 'points' }));
    accessibilityPreferencesService = jasmine.createSpyObj<AccessibilityPreferencesService>(
      'AccessibilityPreferencesService',
      ['getPreferences', 'savePreferences', 'resetPreferences', 'setLanguage'],
    );
    appStateService = jasmine.createSpyObj<AppStateService>('AppStateService', ['getSnapshot', 'resetState']);

    accessibilityPreferencesService.getPreferences.and.returnValue(preferences);
    accessibilityPreferencesService.savePreferences.and.returnValue(preferences);
    accessibilityPreferencesService.resetPreferences.and.returnValue(preferences);
    accessibilityPreferencesService.setLanguage.and.returnValue(preferences);
    appStateService.getSnapshot.and.returnValue(createState());

    await TestBed.configureTestingModule({
      declarations: [Tab4Page],
      imports: [FormsModule, IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AccessibilityPreferencesService, useValue: accessibilityPreferencesService },
        { provide: AppStateService, useValue: appStateService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab4Page);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.view).toBe('points');
  });

  it('ignores route query param changes after the page is destroyed', () => {
    fixture.destroy();
    queryParamMap$.next(convertToParamMap({ view: 'passport' }));

    expect(component.view).toBe('points');
  });

  it('seeds passport stamps and challenge missions for offline mode', () => {
    expect(component.stamps.length).toBe(4);
    expect(component.passportTotalCount).toBe(4);
    expect(component.selectedStamp?.name).toBe('Selangor');
    expect(component.stamps[0].active).toBeFalse();
    expect(component.challengeMissions.map((mission) => mission.progress)).toEqual([
      '0 / 3 complete',
      '0 / 2 complete',
      '0 / 2 complete',
    ]);
  });

  it('renders state-aware profile menu summaries', () => {
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
          title: 'Taman Jaya elevator update',
          type: 'Verification',
          status: 'Approved',
          createdAt: '2026-07-01T02:00:00.000Z',
          points: 40,
        },
        {
          id: 'contribution-2',
          title: 'Jonker Street shade tip',
          type: 'Travel tip',
          status: 'In review',
          createdAt: '2026-07-01T03:00:00.000Z',
          points: 20,
        },
      ],
      savedNoticeIds: ['notice-kelana-jaya-delay', 'notice-melaka-heat'],
      transactions: [],
    });

    component.view = 'profile';
    component.ionViewWillEnter();
    fixture.detectChanges();

    const descriptions = Array.from(
      fixture.nativeElement.querySelectorAll('.settings-list button small'),
    ).map((node) => (node as HTMLElement).textContent?.trim() ?? '');

    expect(descriptions).toContain('1 approved contribution · 1 pending review');
    expect(descriptions).toContain('2 completed journeys · 40 Eco-Points earned');
    expect(descriptions).toContain('2 saved notices · ready to revisit');
    expect(descriptions).toContain('English (EN) · 4 accessibility helpers active');
  });

  it('derives passport unlocks and challenge progress from saved travel activity', () => {
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
          title: 'Taman Jaya elevator update',
          type: 'Verification',
          status: 'Approved',
          createdAt: '2026-07-01T02:00:00.000Z',
          points: 40,
        },
      ],
      savedNoticeIds: ['notice-melaka-heat'],
      completedVerificationIds: ['checkpoint-kl-sentral'],
    });

    component.ionViewWillEnter();

    expect(component.passportCollectedCount).toBe(4);
    expect(component.stamps.every((stamp) => stamp.active)).toBeTrue();
    expect(component.challengeMissions.map((mission) => mission.progress)).toEqual([
      '2 / 3 complete',
      '1 / 2 complete',
      '2 / 2 complete',
    ]);
    expect(component.challengeMissions.map((mission) => mission.progressWidth)).toEqual([
      '67%',
      '50%',
      '100%',
    ]);
    expect(component.seasonProgressWidth).toBe('8%');
  });

  it('localizes empty saved destinations and settings summaries on the profile menu', () => {
    const bmPreferences: AccessibilityPreferences = {
      language: 'BM',
      textSize: 'Large',
      settings: {
        contrast: true,
        motion: false,
        underline: false,
        reader: false,
        voice: false,
        wheelchair: true,
      },
    };

    accessibilityPreferencesService.getPreferences.and.returnValue(bmPreferences);
    accessibilityPreferencesService.setLanguage.and.returnValue(bmPreferences);
    appStateService.getSnapshot.and.returnValue(createState());

    component.view = 'profile';
    component.ionViewWillEnter();
    fixture.detectChanges();

    const descriptions = Array.from(
      fixture.nativeElement.querySelectorAll('.settings-list button small'),
    ).map((node) => (node as HTMLElement).textContent?.trim() ?? '');

    expect(descriptions).toContain('Simpan notis perjalanan di Komuniti untuk akses pantas di sini.');
    expect(descriptions).toContain('Bahasa Melayu (BM) · 2 bantuan kebolehcapaian aktif');
    expect(component.challengeMissions[0].progress).toBe('0 / 3 selesai');
  });

  it('routes privacy and help menu items to dedicated profile sections', () => {
    const privacyItem = component.menuItems.find((item) => item.id === 'privacy');
    const helpItem = component.menuItems.find((item) => item.id === 'help');

    expect(privacyItem?.target).toBe('/tabs/profile/privacy');
    expect(helpItem?.target).toBe('/tabs/profile/help');
  });

  it('clears local app state and returns to Home when signing out', () => {
    const signOutItem = component.menuItems.find((item) => item.id === 'signout');
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    appStateService.getSnapshot.and.returnValue(createState());
    component.ecoPoints = 80;
    component.savedNoticeCount = 1;
    component.view = 'reward';

    component.handleMenu(signOutItem!);

    expect(appStateService.resetState).toHaveBeenCalled();
    expect(component.ecoPoints).toBe(0);
    expect(component.savedNoticeCount).toBe(0);
    expect(component.view).toBe('profile');
    expect(component.toast).toBe('Signed out on this device. Offline travel activity was cleared.');
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/tab1']);
  });
});
