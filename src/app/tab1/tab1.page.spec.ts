import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { AppJourney, AppStateService } from '../services/app-state.service';
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

  it('should create with provider-ready empty home events', () => {
    expect(component).toBeTruthy();
    expect(component.events.length).toBe(0);
    expect(component.verificationTask).toBeNull();
    expect(component.savedNoticeCount).toBe(0);
    expect(component.challengeProgressWidth).toBe('0%');
    expect(component.weeklyMissionTitleLabel).toBe('Rewards provider pending');
    expect(component.weeklyMissionActionLabel).toBe('View\nstatus');
    expect(component.passportProgressSummary()).toBe('Passport stamps will appear here when your Firestore passport provider is connected.');
    expect(component.weeklyMissionSummary()).toBe('Challenge progress will appear here when your Firestore rewards provider is connected.');
    expect(component.verificationCardSummary()).toBe('Verification checkpoints will appear here when your Firestore verification provider is connected.');
    expect(component.verificationCardBadge()).toBe('Awaiting\nprovider');
  });

  it('keeps verification empty-state copy even when completed ids exist locally', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      savedNoticeIds: ['notice-kelana-jaya-delay', 'notice-melaka-heat'],
      completedVerificationIds: ['verification-kl-sentral-access'],
    });

    component.ionViewWillEnter();

    expect(component.verificationTask).toBeNull();
    expect(component.savedNoticeCount).toBe(2);
    expect(component.verificationCardSummary()).toBe('Verification checkpoints will appear here when your Firestore verification provider is connected.');
  });

  it('keeps the events feed empty when the language changes', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.language).toBe('BM');
    expect(component.events).toEqual([]);
    expect(component.weeklyMissionTitleLabel).toBe('Penyedia ganjaran belum disambungkan');
    expect(component.weeklyMissionActionLabel).toBe('Lihat\nstatus');
    expect(component.passportProgressSummary()).toBe('Cop pasport akan dipaparkan di sini apabila penyedia pasport Firestore anda disambungkan.');
    expect(component.weeklyMissionSummary()).toBe('Kemajuan cabaran akan dipaparkan di sini apabila penyedia ganjaran Firestore anda disambungkan.');
    expect(component.verificationCardSummary()).toBe('Pusat semakan pengesahan akan dipaparkan di sini apabila penyedia pengesahan Firestore anda disambungkan.');
    expect(component.verificationCardBadge()).toBe('Menunggu\npenyedia');
  });

  it('keeps passport and mission summaries provider-ready even when local travel activity exists', () => {
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

    expect(component.challengeProgressWidth).toBe('0%');
    expect(component.weeklyMissionTitleLabel).toBe('Rewards provider pending');
    expect(component.weeklyMissionActionLabel).toBe('View\nstatus');
    expect(component.passportProgressSummary()).toBe('Passport stamps will appear here when your Firestore passport provider is connected.');
    expect(component.weeklyMissionSummary()).toBe('Challenge progress will appear here when your Firestore rewards provider is connected.');
    expect(component.verificationCardSummary()).toBe('Verification checkpoints will appear here when your Firestore verification provider is connected.');
  });

  it('ignores verification submission when no provider-backed task exists', () => {
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

    expect(appStateService.submitVerification).not.toHaveBeenCalled();
    expect(component.ecoPoints).toBe(120);
    expect(component.verificationTask).toBeNull();
    expect(component.toast).toBe('');
  });

  it('keeps the provider-ready empty-state when all historical verification ids are present', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      completedVerificationIds: [
        'verification-kl-sentral-access',
        'verification-pasar-seni-access',
      ],
    });

    component.ionViewWillEnter();

    expect(component.verificationTask).toBeNull();
    expect(component.verificationCardSummary()).toBe('Verification checkpoints will appear here when your Firestore verification provider is connected.');
    expect(component.verificationCardBadge()).toBe('Awaiting\nprovider');
  });

  it('opens travel notices directly from the topbar notification action', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.openNotifications();

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/tabs/tab3'],
      { queryParams: { view: 'notices' } },
    );
  });

  it('renders the events quick action as provider-pending instead of opening a dead-end sheet', () => {
    fixture.detectChanges();

    const eventsButton = fixture.nativeElement.querySelector('.events-quick-action') as HTMLButtonElement;
    const pendingNote = fixture.nativeElement.querySelector('.quick-grid-note') as HTMLElement;

    eventsButton.click();
    fixture.detectChanges();

    expect(eventsButton.disabled).toBeTrue();
    expect(eventsButton.getAttribute('aria-label')).toBe('Events and Activities unavailable. Events provider pending.');
    expect(eventsButton.textContent).toContain('Soon');
    expect(component.toast).toBe('');
    expect(component.activeSheet).toBeNull();
    expect(pendingNote.textContent).toContain('Events provider pending');
    expect(pendingNote.textContent).toContain('Events & Activities will unlock here when your Firestore events provider is connected.');
    expect(component.eventsEmptyStateTitle()).toBe('Events provider pending');
    expect(component.eventsEmptyStateCopy()).toBe('Events will appear here when your Firestore events provider is connected.');
  });

  it('keeps home helper typography above the tiny-text readability floor', () => {
    fixture.detectChanges();

    const quickStatus = fixture.nativeElement.querySelector('.quick-status') as HTMLElement;
    const quickNote = fixture.nativeElement.querySelector('.quick-grid-note small') as HTMLElement;
    const journeyBadge = fixture.nativeElement.querySelector('.journey-title span') as HTMLElement;
    const journeyFooterCopy = fixture.nativeElement.querySelector('.journey-empty p') as HTMLElement;
    const actionTitle = fixture.nativeElement.querySelector('.verification-action b') as HTMLElement;
    const actionSupport = fixture.nativeElement.querySelector('.verification-action small') as HTMLElement;
    const actionBadge = fixture.nativeElement.querySelector('.verification-action em') as HTMLElement;

    expect(parseFloat(getComputedStyle(quickStatus).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(quickNote).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(journeyBadge).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(journeyFooterCopy).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(actionTitle).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(actionSupport).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(actionBadge).fontSize)).toBeGreaterThanOrEqual(10);

    component.openVerificationSheet();
    fixture.detectChanges();

    const sheetKicker = fixture.nativeElement.querySelector('.sheet-kicker') as HTMLElement;
    const sheetEmptyTitle = fixture.nativeElement.querySelector('.route-loading b') as HTMLElement;
    const sheetEmptyCopy = fixture.nativeElement.querySelector('.route-loading small') as HTMLElement;
    const sheetCloseButton = fixture.nativeElement.querySelector('.sheet-close') as HTMLElement;

    expect(parseFloat(getComputedStyle(sheetKicker).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(sheetEmptyTitle).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(sheetEmptyCopy).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(sheetCloseButton).width)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(sheetCloseButton).height)).toBeGreaterThanOrEqual(40);
  });

  it('keeps active-journey and provider-backed sheet controls above the compact-control floor', () => {
    component.activeJourney = {
      id: 'journey-kl-sentral-pasar-seni',
      from: 'KL Sentral',
      to: 'Pasar Seni',
      detail: 'Direct MRT route',
      depart: '10:00 AM',
      arrive: '10:20 AM',
      duration: '20 min',
      mode: 'MRT',
      fare: 'RM1.80',
      walk: '180 m',
      isAccessible: true,
      travelDate: '2026-07-03',
      travelTime: '10:00',
      startedAt: '2026-07-03T10:00:00.000Z',
      completedAt: null,
      points: 20,
    } as AppJourney;
    fixture.detectChanges();

    const travelSummaryCopy = fixture.nativeElement.querySelector('.travel-summary small') as HTMLElement;
    const journeyFooterMeta = fixture.nativeElement.querySelector('.journey-footer small') as HTMLElement;
    const journeyFooterAction = fixture.nativeElement.querySelector('.journey-footer button') as HTMLElement;

    expect(parseFloat(getComputedStyle(travelSummaryCopy).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(journeyFooterMeta).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(journeyFooterAction).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(journeyFooterAction).minHeight)).toBeGreaterThanOrEqual(40);

    component.events = [
      {
        dateLabel: '12 JUL',
        title: { EN: 'Forest Rail Walk', BM: 'Jalan Rel Hutan' },
        description: {
          EN: 'Provider-backed event details appear here when available.',
          BM: 'Butiran acara bersumber penyedia dipaparkan di sini apabila tersedia.',
        },
        targetPath: '/tabs/tab3',
      },
    ];
    component.activeSheet = 'events';
    fixture.detectChanges();

    const eventDate = fixture.nativeElement.querySelector('.event-row > span') as HTMLElement;
    const eventCopy = fixture.nativeElement.querySelector('.event-row small') as HTMLElement;
    const eventCloseButton = fixture.nativeElement.querySelector('.events-sheet .sheet-close') as HTMLElement;

    expect(parseFloat(getComputedStyle(eventDate).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(eventDate).minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(eventCopy).fontSize)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(getComputedStyle(eventCloseButton).width)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(eventCloseButton).height)).toBeGreaterThanOrEqual(40);

    component.activeSheet = 'verification';
    component.verificationTask = {
      id: 'verification-kl-sentral-access',
      title: 'KL Sentral access check',
      question: { EN: 'Is the lift working?', BM: 'Adakah lif berfungsi?' },
      station: { EN: 'KL Sentral', BM: 'KL Sentral' },
      place: { EN: 'KL Sentral', BM: 'KL Sentral' },
      badge: { EN: 'Verified transit hub', BM: 'Hab transit disahkan' },
      address: { EN: 'Jalan Stesen Sentral', BM: 'Jalan Stesen Sentral' },
      image: 'assets/mytravel/wira-ui.png',
      points: 20,
    } as never;
    fixture.detectChanges();

    const rewardCopy = fixture.nativeElement.querySelector('.reward-row small') as HTMLElement;

    expect(parseFloat(getComputedStyle(rewardCopy).fontSize)).toBeGreaterThanOrEqual(10);
  });

  it('keeps the featured destination control clear of the raised summary panel', () => {
    fixture.detectChanges();

    const destinationPill = fixture.nativeElement.querySelector('.destination-pill') as HTMLElement;
    const homeBody = fixture.nativeElement.querySelector('.home-body') as HTMLElement;
    const travelSummary = fixture.nativeElement.querySelector('.travel-summary') as HTMLElement;

    expect(parseFloat(getComputedStyle(destinationPill).bottom)).toBeGreaterThanOrEqual(64);
    expect(parseFloat(getComputedStyle(homeBody).marginTop)).toBeGreaterThanOrEqual(-18);
    expect(parseFloat(getComputedStyle(travelSummary).minHeight)).toBeGreaterThanOrEqual(82);
    expect(getComputedStyle(destinationPill).zIndex).toBe('3');
  });

  it('renders the verification sheet as an accessible dialog and closes it on escape', () => {
    component.openVerificationSheet();
    fixture.detectChanges();

    const verificationSheet = fixture.nativeElement.querySelector('.verification-sheet') as HTMLElement;

    expect(verificationSheet.getAttribute('role')).toBe('dialog');
    expect(verificationSheet.getAttribute('aria-modal')).toBe('true');
    expect(verificationSheet.getAttribute('tabindex')).toBe('-1');

    verificationSheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.activeSheet).toBeNull();
  });

  it('renders accessible pressed states for verification answer buttons', () => {
    component.activeSheet = 'verification';
    component.verificationTask = {
      id: 'verification-kl-sentral-access',
      title: 'KL Sentral access check',
      question: { EN: 'Is the lift working?', BM: 'Adakah lif berfungsi?' },
      station: { EN: 'KL Sentral', BM: 'KL Sentral' },
      place: { EN: 'KL Sentral', BM: 'KL Sentral' },
      badge: { EN: 'Verified transit hub', BM: 'Hab transit disahkan' },
      address: { EN: 'Jalan Stesen Sentral', BM: 'Jalan Stesen Sentral' },
      image: 'assets/mytravel/wira-ui.png',
      points: 20,
    } as never;
    fixture.detectChanges();

    const answerButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.answer-grid button'),
    ) as HTMLButtonElement[];

    expect(answerButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(answerButtons[0].getAttribute('aria-label')).toBe('Select verification answer Yes');

    component.verificationAnswer = 'no';
    fixture.detectChanges();

    expect(answerButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(answerButtons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('localizes verification answer accessibility labels in Bahasa Melayu', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.verificationAnswerAriaLabel('yes')).toBe('Pilih jawapan pengesahan Ya');
    expect(component.verificationAnswerAriaLabel('no')).toBe('Pilih jawapan pengesahan Tidak');
  });
});
