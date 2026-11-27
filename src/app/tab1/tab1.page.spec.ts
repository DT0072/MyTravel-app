import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
      imports: [FormsModule, IonicModule.forRoot()],
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

  it('should create with seeded home events and verification tasks', () => {
    expect(component).toBeTruthy();
    expect(component.events.length).toBeGreaterThanOrEqual(8);
    expect(component.verificationTask?.id).toBe('verification-kl-sentral-access');
    expect(component.savedNoticeCount).toBe(0);
    expect(component.challengeProgressWidth).toBe('29%');
    expect(component.weeklyMissionTitleLabel).toBe('Weekly Mission with Wira');
    expect(component.weeklyMissionActionLabel).toBe('View\nmission');
    expect(component.passportProgressSummary()).toBe('3/4 stamps unlocked');
    expect(component.weeklyMissionSummary()).toBe('2 of 7 challenge steps completed this season.');
    expect(component.verificationCardSummary()).toBe('Next checkpoint: KL Sentral station. 0/2 completed.');
    expect(component.verificationCardBadge()).toBe('+40\nEco-Points');
  });

  it('advances to the next verification task when completed ids exist locally', () => {
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

  it('localizes the events feed and dashboard summaries when the language changes', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.language).toBe('BM');
    expect(component.events.length).toBeGreaterThanOrEqual(8);
    expect(component.weeklyMissionTitleLabel).toBe('Misi Mingguan bersama Wira');
    expect(component.weeklyMissionActionLabel).toBe('Lihat\nmisi');
    expect(component.passportProgressSummary()).toBe('3/4 cop dibuka');
    expect(component.weeklyMissionSummary()).toBe('2 daripada 7 langkah cabaran selesai musim ini.');
    expect(component.verificationCardSummary()).toBe('Pusat semakan seterusnya: Stesen KL Sentral. 0/2 selesai.');
    expect(component.verificationCardBadge()).toBe('+40\nMata Eko');
  });

  it('updates passport and mission summaries when local travel activity exists', () => {
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

    expect(component.challengeProgressWidth).toBe('71%');
    expect(component.weeklyMissionTitleLabel).toBe('Weekly Mission with Wira');
    expect(component.weeklyMissionActionLabel).toBe('View\nmission');
    expect(component.passportProgressSummary()).toBe('4/4 stamps unlocked');
    expect(component.weeklyMissionSummary()).toBe('5 of 7 challenge steps completed this season.');
    expect(component.verificationCardSummary()).toBe('Next checkpoint: Pasar Seni station. 1/2 completed.');
  });

  it('ignores verification submission when no provider-backed task exists', () => {
    appStateService.getSnapshot.and.returnValues(
      {
        ...createState(),
        completedVerificationIds: [
          'verification-kl-sentral-access',
          'verification-pasar-seni-access',
        ],
      },
      {
        ...createState(),
        ecoPoints: 160,
        completedVerificationIds: [
          'verification-kl-sentral-access',
          'verification-pasar-seni-access',
        ],
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

  it('keeps verification submit feedback stable when refresh clears the active task', () => {
    appStateService.getSnapshot.and.returnValues(
      createState(),
      {
        ...createState(),
        completedVerificationIds: [
          'verification-kl-sentral-access',
          'verification-pasar-seni-access',
        ],
      },
    );

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

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

    expect(() => component.submitVerification()).not.toThrow();
    expect(appStateService.submitVerification).toHaveBeenCalledWith(
      'verification-kl-sentral-access',
      'KL Sentral access check',
      jasmine.objectContaining({ answer: 'yes' }),
    );
    expect(component.verificationTask).toBeNull();
    expect(component.toast).toBe('+20 Eco-Points earned. Thank you!');
  });

  it('shows the all-done state when all historical verification ids are present', () => {
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

  it('opens the events sheet when clicking the events quick action', () => {
    fixture.detectChanges();

    const eventsButton = fixture.nativeElement.querySelector('.events-quick-action') as HTMLButtonElement;

    eventsButton.click();
    fixture.detectChanges();

    expect(eventsButton.disabled).toBeFalse();
    expect(eventsButton.getAttribute('aria-label')).toBe('Events & Activities');
    expect(component.activeSheet).toBe('events');
    expect(component.events.length).toBeGreaterThanOrEqual(8);
  });

  it('opens event detail view instead of jumping directly to navigation when clicking an event row', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();

    component.openEventsSheet();
    fixture.detectChanges();

    const firstEventButton = fixture.nativeElement.querySelector('.event-row') as HTMLButtonElement;
    firstEventButton.click();
    fixture.detectChanges();

    expect(component.selectedEvent).toBeTruthy();
    expect(component.activeSheet).toBe('events');
    expect(navigateSpy).not.toHaveBeenCalled();

    component.backToEventsList();
    expect(component.selectedEvent).toBeNull();
  });

  it('adds contextual accessible names to home dashboard action cards', () => {
    fixture.detectChanges();

    const destinationButton = fixture.nativeElement.querySelector('.destination-pill') as HTMLButtonElement;
    const summaryButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.travel-summary button'),
    ) as HTMLButtonElement[];
    const quickButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.quick-grid button'),
    ) as HTMLButtonElement[];
    const journeyButton = fixture.nativeElement.querySelector('.journey-empty') as HTMLButtonElement;
    const verificationButton = fixture.nativeElement.querySelector('.verification-action') as HTMLButtonElement;
    const missionButton = fixture.nativeElement.querySelector('.mission-action') as HTMLButtonElement;

    expect(destinationButton.getAttribute('aria-label')).toBe('Timah Tasoh, Perlis. Open Explore Malaysia destinations.');
    expect(summaryButtons[0].getAttribute('aria-label')).toBe('120 Eco-Points. Open Profile.');
    expect(summaryButtons[1].getAttribute('aria-label')).toBe('Digital Passport. 3/4 stamps unlocked. Open Profile.');
    expect(quickButtons[1].getAttribute('aria-label')).toBe('Explore Malaysia. Open Explore Malaysia destinations.');
    expect(quickButtons[2].getAttribute('aria-label')).toBe('MyTravel Verification. Open MyTravel Verification panel.');
    expect(quickButtons[3].getAttribute('aria-label')).toBe('Travel Notices. Open Community.');
    expect(journeyButton.getAttribute('aria-label')).toBe('Plan your next journey. Choose a route, departure time, and accessibility preference in Navigation. Open Navigation.');
    expect(verificationButton.getAttribute('aria-label')).toBe('MyTravel Verification. Next checkpoint: KL Sentral station. 0/2 completed. +40 Eco-Points. Open MyTravel Verification panel.');
    expect(missionButton.getAttribute('aria-label')).toBe('Weekly Mission with Wira. 2 of 7 challenge steps completed this season. View mission. Open Profile.');
  });

  it('marks decorative home and sheet icons as hidden from assistive technology', () => {
    fixture.detectChanges();

    const identityIcon = fixture.nativeElement.querySelector('.identity-mark ion-icon') as HTMLElement;
    const destinationIcon = fixture.nativeElement.querySelector('.destination-pill ion-icon') as HTMLElement;
    const summaryIcon = fixture.nativeElement.querySelector('.summary-icon ion-icon') as HTMLElement;
    const quickActionIcon = fixture.nativeElement.querySelector('.quick-icon ion-icon') as HTMLElement;
    const journeyActionIcon = fixture.nativeElement.querySelector('.journey-empty ion-icon') as HTMLElement;
    const missionIcon = fixture.nativeElement.querySelector('.action-icon ion-icon') as HTMLElement;

    expect(identityIcon.getAttribute('aria-hidden')).toBe('true');
    expect(destinationIcon.getAttribute('aria-hidden')).toBe('true');
    expect(summaryIcon.getAttribute('aria-hidden')).toBe('true');
    expect(quickActionIcon.getAttribute('aria-hidden')).toBe('true');
    expect(journeyActionIcon.getAttribute('aria-hidden')).toBe('true');
    expect(missionIcon.getAttribute('aria-hidden')).toBe('true');

    component.openVerificationSheet();
    fixture.detectChanges();

    const verificationCloseIcon = fixture.nativeElement.querySelector('.verification-sheet .sheet-close ion-icon') as HTMLElement;
    expect(verificationCloseIcon.getAttribute('aria-hidden')).toBe('true');

    component.activeSheet = 'events';
    component.events = [
      {
        id: 'evt-test-1',
        dateLabel: '12 JUL',
        title: { EN: 'Accessible travel workshop', BM: 'Bengkel perjalanan mesra akses' },
        description: { EN: 'Provider-backed event summary', BM: 'Ringkasan acara berasaskan penyedia' },
        venue: 'KL Sentral',
        state: 'Kuala Lumpur',
        transitHint: 'MRT/LRT KL Sentral',
        targetPath: '/tabs/tab3',
      },
    ];
    fixture.detectChanges();

    const eventsCloseIcon = fixture.nativeElement.querySelector('.events-sheet .sheet-close ion-icon') as HTMLElement;
    const eventChevronIcon = fixture.nativeElement.querySelector('.event-row ion-icon') as HTMLElement;

    expect(eventsCloseIcon.getAttribute('aria-hidden')).toBe('true');
    expect(eventChevronIcon.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps home helper typography above the tiny-text readability floor', () => {
    component.eventsProviderConnected = false;
    component.verificationTask = null;
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
    expect(parseFloat(getComputedStyle(journeyFooterAction).minHeight)).toBeGreaterThanOrEqual(44);

    component.events = [
      {
        id: 'evt-test-2',
        dateLabel: '12 JUL',
        title: { EN: 'Forest Rail Walk', BM: 'Jalan Rel Hutan' },
        description: {
          EN: 'Provider-backed event details appear here when available.',
          BM: 'Butiran acara bersumber penyedia dipaparkan di sini apabila tersedia.',
        },
        venue: 'Pasar Seni',
        state: 'Kuala Lumpur',
        transitHint: 'MRT Pasar Seni',
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
    expect(parseFloat(getComputedStyle(eventCloseButton).width)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(eventCloseButton).height)).toBeGreaterThanOrEqual(44);

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

  it('matches the active-journey icon to the saved transport mode', () => {
    component.activeJourney = {
      id: 'journey-kl-sentral-bukit-bintang',
      from: 'KL Sentral',
      to: 'Bukit Bintang',
      detail: 'Direct bus route',
      depart: '10:00 AM',
      arrive: '10:28 AM',
      duration: '28 min',
      mode: 'Bus',
      fare: 'RM1.50',
      walk: '120 m',
      isAccessible: true,
      travelDate: '2026-07-03',
      travelTime: '10:00',
      startedAt: '2026-07-03T10:00:00.000Z',
      completedAt: null,
      points: 20,
    } as AppJourney;
    fixture.detectChanges();

    const routeIcon = fixture.nativeElement.querySelector('.route-line ion-icon') as HTMLElement & { name?: string };

    expect(component.activeJourneyIconName()).toBe('bus-outline');
    expect(routeIcon.name).toBe('bus-outline');

    component.activeJourney = {
      ...component.activeJourney,
      mode: 'Walk',
    };
    fixture.detectChanges();

    expect(component.activeJourneyIconName()).toBe('walk-outline');
    expect(routeIcon.name).toBe('walk-outline');
  });

  it('keeps the featured destination control clear of the raised summary panel', () => {
    fixture.detectChanges();

    const identityPill = fixture.nativeElement.querySelector('.identity-pill') as HTMLElement;
    const heroShade = fixture.nativeElement.querySelector('.hero-shade') as HTMLElement;
    const heroWira = fixture.nativeElement.querySelector('.hero-wira') as HTMLElement;
    const destinationPill = fixture.nativeElement.querySelector('.destination-pill') as HTMLElement;
    const homeContent = fixture.nativeElement.querySelector('.home-content') as HTMLElement;
    const homeScrollShell = fixture.nativeElement.querySelector('.home-scroll-shell') as HTMLElement;
    const homeBody = fixture.nativeElement.querySelector('.home-body') as HTMLElement;
    const travelSummary = fixture.nativeElement.querySelector('.travel-summary') as HTMLElement;
    const journeyCard = fixture.nativeElement.querySelector('.journey-card') as HTMLElement;
    const verificationAction = fixture.nativeElement.querySelector('.verification-action') as HTMLElement;

    expect(homeContent).toBeTruthy();
    expect(homeScrollShell).toBeTruthy();
    expect(getComputedStyle(homeContent).getPropertyValue('--overflow').trim()).toBe('auto');
    expect(getComputedStyle(homeContent).getPropertyValue('--padding-bottom').trim()).toBe('0');
    expect(parseFloat(getComputedStyle(homeScrollShell).minHeight)).toBeGreaterThanOrEqual(100);
    expect(parseFloat(getComputedStyle(identityPill).minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(identityPill).borderTopLeftRadius)).toBeGreaterThanOrEqual(24);
    expect(parseFloat(getComputedStyle(identityPill).lineHeight)).toBeGreaterThanOrEqual(13);
    expect(getComputedStyle(heroShade).backgroundImage).toContain('radial-gradient');
    expect(parseFloat(getComputedStyle(heroWira).width)).toBeLessThanOrEqual(140);
    expect(parseFloat(getComputedStyle(destinationPill).bottom)).toBeGreaterThanOrEqual(48);
    expect(getComputedStyle(destinationPill).backgroundColor).toContain('0.78');
    expect(getComputedStyle(destinationPill).textShadow).not.toBe('none');
    expect(parseFloat(getComputedStyle(destinationPill).borderTopLeftRadius)).toBeGreaterThanOrEqual(23);
    expect(parseFloat(getComputedStyle(homeBody).marginTop)).toBeGreaterThanOrEqual(-18);
    expect(parseFloat(getComputedStyle(travelSummary).minHeight)).toBeGreaterThanOrEqual(82);
    expect(getComputedStyle(destinationPill).zIndex).toBe('3');

    if (window.innerWidth >= 600) {
      expect(getComputedStyle(homeBody).display).toBe('grid');
      expect(parseFloat(getComputedStyle(journeyCard).minHeight)).toBeLessThanOrEqual(128);
      expect(parseFloat(getComputedStyle(verificationAction).minHeight)).toBeLessThanOrEqual(128);
    }
  });

  it('makes the home dashboard scroll-safe above the floating tabbar', () => {
    fixture.detectChanges();

    const homeScrollShell = fixture.nativeElement.querySelector('.home-scroll-shell') as HTMLElement;
    const homeBody = fixture.nativeElement.querySelector('.home-body') as HTMLElement;

    expect(homeScrollShell.classList.contains('mt-tabbar-scroll-screen')).toBeTrue();
    expect(getComputedStyle(homeScrollShell).overflowY).toBe('auto');
    expect(parseFloat(getComputedStyle(homeScrollShell).paddingBottom)).toBeGreaterThanOrEqual(170);
    expect(parseFloat(getComputedStyle(homeBody).paddingBottom)).toBeGreaterThanOrEqual(138);
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
    expect(parseFloat(getComputedStyle(answerButtons[0]).minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(answerButtons[1]).minHeight)).toBeGreaterThanOrEqual(44);

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

  it('localizes home dashboard accessible names in Bahasa Melayu', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.destinationPillAriaLabel()).toBe('Tasik Timah Tasoh, Perlis. Buka destinasi Teroka Malaysia.');
    expect(component.quickExploreAriaLabel()).toBe('Teroka Malaysia. Buka destinasi Teroka Malaysia.');
    expect(component.quickVerificationAriaLabel()).toBe('Pengesahan MyTravel. Buka panel Pengesahan MyTravel.');
    expect(component.passportSummaryAriaLabel()).toBe('Pasport Digital. 3/4 cop dibuka. Buka Profil.');
    expect(component.weeklyMissionAriaLabel()).toBe('Misi Mingguan bersama Wira. 2 daripada 7 langkah cabaran selesai musim ini. Lihat misi. Buka Profil.');
  });
});
