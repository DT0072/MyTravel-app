import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { ProfileSectionPage } from './profile-section.page';
import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { AppStateService } from '../services/app-state.service';

describe('ProfileSectionPage', () => {
  let fixture: ComponentFixture<ProfileSectionPage>;
  let component: ProfileSectionPage;
  let router: Router;

  const routeStub = {
    snapshot: {
      data: {
        section: 'settings',
      },
    },
  };

  const preferences: AccessibilityPreferences = {
    language: 'BM',
    textSize: 'Large',
    settings: {
      contrast: true,
      motion: false,
      underline: true,
      reader: false,
      voice: true,
      wheelchair: false,
    },
  };

  const accessibilityPreferencesService = jasmine.createSpyObj<AccessibilityPreferencesService>(
    'AccessibilityPreferencesService',
    ['getPreferences', 'setLanguage'],
  );
  const appStateService = jasmine.createSpyObj<AppStateService>('AppStateService', ['getSnapshot']);

  function createState(overrides: Partial<ReturnType<AppStateService['getSnapshot']>> = {}): ReturnType<AppStateService['getSnapshot']> {
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
      ...overrides,
    };
  }

  function setPreferences(next: AccessibilityPreferences): void {
    accessibilityPreferencesService.getPreferences.and.callFake(() => structuredClone(next));
    accessibilityPreferencesService.setLanguage.and.callFake((language) => ({
      ...structuredClone(next),
      language,
    }));
  }

  beforeEach(async () => {
    setPreferences(preferences);
    appStateService.getSnapshot.and.returnValue(createState());

    await TestBed.configureTestingModule({
      declarations: [ProfileSectionPage],
      imports: [IonicModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: AccessibilityPreferencesService, useValue: accessibilityPreferencesService },
        { provide: AppStateService, useValue: appStateService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    routeStub.snapshot.data.section = 'settings';
    accessibilityPreferencesService.getPreferences.calls.reset();
    accessibilityPreferencesService.setLanguage.calls.reset();
    appStateService.getSnapshot.calls.reset();
    setPreferences(preferences);
    appStateService.getSnapshot.and.returnValue(createState());

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('renders localized settings summaries from saved preferences', () => {
    fixture.detectChanges();

    expect(component.content.title).toBe('Tetapan');
    expect(component.content.summaryValue).toBe('5');
    expect(component.content.summaryCopy).toContain('Bahasa Melayu (BM) dipilih');
    expect(component.content.items[1].meta).toBe('Belum ada notis tersimpan. Buka notis Komuniti apabila tersedia.');
    expect(component.content.items[2].subtitle).toContain('3 bantuan aktif');
    expect(component.content.items[2].meta).toBe('Saiz teks: Besar');
  });

  it('renders destination-aware aria labels for the settings actions', () => {
    fixture.detectChanges();

    const primaryAction = fixture.nativeElement.querySelector('.section-summary .mt-primary') as HTMLButtonElement;
    const sectionItems = Array.from(
      fixture.nativeElement.querySelectorAll('.section-list .section-item'),
    ) as HTMLButtonElement[];

    expect(primaryAction.getAttribute('aria-label')).toBe('Buka kebolehcapaian. Membuka kawalan kebolehcapaian.');
    expect(sectionItems[0].getAttribute('aria-label')).toBe(
      'Bahasa dan rantau. Bahasa Melayu (BM) · Malaysia. Tukar bahasa kandungan dan lokaliti. Membuka ringkasan profil anda.',
    );
    expect(sectionItems[2].getAttribute('aria-label')).toBe(
      'Kebolehcapaian dan sokongan laluan. 3 bantuan aktif · Laluan mesra akses tidak aktif. Saiz teks: Besar. Membuka kawalan kebolehcapaian.',
    );
  });

  it('keeps a single top-level heading on the profile section page', () => {
    fixture.detectChanges();

    const pageHeadings = Array.from(
      fixture.nativeElement.querySelectorAll('h1'),
    ) as HTMLElement[];
    const sectionHeading = fixture.nativeElement.querySelector('.mt-page-heading h2') as HTMLElement;

    expect(pageHeadings.length).toBe(1);
    expect(pageHeadings[0].textContent?.trim()).toBe('Tetapan');
    expect(sectionHeading.textContent?.trim()).toBe('Tetapan');
  });

  it('marks the back icon as decorative because the button already carries the label', () => {
    fixture.detectChanges();

    const backIcon = fixture.nativeElement.querySelector('.sub-heading .mt-back ion-icon') as HTMLElement;

    expect(backIcon.getAttribute('aria-hidden')).toBe('true');
  });

  it('refreshes content when the app language changes', () => {
    routeStub.snapshot.data.section = 'my-contributions';
    appStateService.getSnapshot.and.returnValue(createState({
      contributions: [
        {
          id: 'tip-1',
          title: 'Community route tip',
          type: 'Travel tip',
          status: 'Approved',
          createdAt: '2026-06-21T02:00:00.000Z',
          points: 15,
        },
        {
          id: 'verification-1',
          title: 'Station operating hours check',
          type: 'Verification',
          status: 'In review',
          createdAt: '2026-06-22T02:00:00.000Z',
          points: 40,
        },
      ],
    }));

    setPreferences({ ...preferences, language: 'EN' });
    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.content.title).toBe('My contributions');
    expect(component.content.summaryCopy).toContain('1 pending review');

    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    expect(component.content.title).toBe('Sumbangan saya');
    expect(component.content.summaryCopy).toContain('1 menunggu semakan');
    expect(component.content.items[0].subtitle).toBe('Tip perjalanan · Diluluskan');
  });

  it('renders saved notices in the saved destinations section', () => {
    routeStub.snapshot.data.section = 'saved-destinations';
    appStateService.getSnapshot.and.returnValue(createState({
      savedNoticeIds: ['notice-kelana-jaya-delay', 'notice-melaka-heat'],
    }));
    setPreferences({ ...preferences, language: 'EN' });

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.content.title).toBe('Saved destinations');
    expect(component.content.summaryValue).toBe('2');
    expect(component.content.summaryCopy).toContain('2 saved notices');
    expect(component.content.primaryAction).toBe('Open notice board');
    expect(component.content.items[0].title).toBe('Saved travel notice');
    expect(component.content.items[0].subtitle).toBe('This saved notice will show provider-backed details after Firestore notices are connected.');
    expect(component.content.items[1].meta).toBe('notice-melaka-heat');
    expect(component.content.items[0].action).toBe('notices');
  });

  it('renders localized privacy summaries from local profile data', () => {
    routeStub.snapshot.data.section = 'privacy';
    appStateService.getSnapshot.and.returnValue(createState({
      savedNoticeIds: ['notice-kelana-jaya-delay', 'notice-melaka-heat'],
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
    }));

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.content.title).toBe('Privasi & data');
    expect(component.content.summaryCopy).toContain('2 notis tersimpan');
    expect(component.content.items[0].meta).toBe('2 notis tersimpan · storan setempat peranti');
    expect(component.content.items[1].meta).toBe('1 sumbangan dijejaki');
    expect(component.content.items[2].action).toBe('accessibility');
  });

  it('renders help shortcuts with localized saved-notice guidance', () => {
    routeStub.snapshot.data.section = 'help';
    appStateService.getSnapshot.and.returnValue(createState({
      savedNoticeIds: ['notice-kelana-jaya-delay'],
    }));
    setPreferences({ ...preferences, language: 'EN' });

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.content.title).toBe('Help');
    expect(component.content.primaryAction).toBe('Open community guides');
    expect(component.content.items[0].action).toBe('navigation');
    expect(component.content.items[1].meta).toBe('1 saved notice ready in Community');
    expect(component.content.items[1].action).toBe('notices');
    expect(component.content.items[2].action).toBe('accessibility');
  });

  it('renders destination-aware aria labels for help shortcuts', () => {
    routeStub.snapshot.data.section = 'help';
    setPreferences({ ...preferences, language: 'EN' });

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const primaryAction = fixture.nativeElement.querySelector('.section-summary .mt-primary') as HTMLButtonElement;
    const sectionItems = Array.from(
      fixture.nativeElement.querySelectorAll('.section-list .section-item'),
    ) as HTMLButtonElement[];

    expect(primaryAction.getAttribute('aria-label')).toBe('Open community guides. Opens the Community board.');
    expect(sectionItems[1].getAttribute('aria-label')).toBe(
      'Travel notices and tips. Check saved notices, community updates, and nearby verification tasks in one place. No saved notices yet. Open Community notices when they are available. Opens saved travel notices in Community.',
    );
  });

  it('renders a zero-state notice guide when no saved notices exist', () => {
    routeStub.snapshot.data.section = 'help';
    setPreferences({ ...preferences, language: 'EN' });

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.content.items[1].meta).toBe('No saved notices yet. Open Community notices when they are available.');
    expect(component.content.items[1].action).toBe('notices');
  });

  it('opens the notice board deep link from saved destinations actions', () => {
    routeStub.snapshot.data.section = 'saved-destinations';
    appStateService.getSnapshot.and.returnValue(createState({
      savedNoticeIds: ['notice-kelana-jaya-delay'],
    }));
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.handlePrimaryAction();
    component.handleItemClick(component.content.items[0]);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/tabs/tab3'],
      { queryParams: { view: 'notices' } },
    );
  });

  it('opens the notice board deep link from the help notice shortcut', () => {
    routeStub.snapshot.data.section = 'help';
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ProfileSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.handleItemClick(component.content.items[1]);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/tabs/tab3'],
      { queryParams: { view: 'notices' } },
    );
  });
});
