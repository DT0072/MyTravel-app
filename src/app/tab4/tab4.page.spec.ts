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
  let originalTextScale: string;

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
    originalTextScale = document.documentElement.style.getPropertyValue('--mt-text-scale');
    document.documentElement.style.setProperty('--mt-text-scale', '1');
    fixture.detectChanges();
  });

  afterEach(() => {
    if (originalTextScale) {
      document.documentElement.style.setProperty('--mt-text-scale', originalTextScale);
      return;
    }

    document.documentElement.style.removeProperty('--mt-text-scale');
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

  it('keeps passport, challenge, and reward data empty until a provider is connected', () => {
    expect(component.passportProviderConnected).toBeFalse();
    expect(component.rewardsProviderConnected).toBeFalse();
    expect(component.stamps).toEqual([]);
    expect(component.passportTotalCount).toBe(0);
    expect(component.selectedStamp).toBeNull();
    expect(component.passportProgressWidth).toBe('0%');
    expect(component.passportStatusLabel).toBe('Provider pending');
    expect(component.challengeMissions).toEqual([]);
    expect(component.unlockSteps).toEqual([]);
    expect(component.seasonProgressWidth).toBe('0%');
    expect(component.rewardProgressSummaryLabel).toBe('0/1,000 points');
  });

  it('keeps the profile identity card provider-ready instead of showing a seeded traveler', () => {
    component.view = 'profile';
    fixture.detectChanges();

    const profileCard = fixture.nativeElement.querySelector('.profile-card') as HTMLElement;

    expect(profileCard.textContent).toContain('Profile provider pending');
    expect(profileCard.textContent).toContain('Awaiting profile identity');
    expect(profileCard.textContent).not.toContain('Traveler');
    expect(profileCard.textContent).not.toContain('MyDigital ID');
  });

  it('keeps challenge and reward promo labels provider-ready when rewards data is unavailable', () => {
    expect(component.rewardsProviderConnected).toBeFalse();
    expect(component.challengeBannerTitleLabel).toBe('Rewards provider pending');
    expect(component.challengeBannerCopyLabel).toBe('Challenge and reward details will appear here when your Firestore rewards provider is connected.');
    expect(component.seasonCardTitleLabel).toBe('Rewards provider pending');
    expect(component.seasonCardActionLabel).toBe('View status');
    expect(component.challengeHeroTitleLabel).toBe('Rewards provider pending');
    expect(component.challengeHeroStatusLabel).toBe('Waiting for rewards data');
    expect(component.challengeSectionLabel).toBe('Rewards status');
    component.view = 'reward';
    expect(component.viewTitle).toBe('Rewards status');
  });

  it('scales Tab4 typography with the shared text-size preference', () => {
    document.documentElement.style.setProperty('--mt-text-scale', '1.4');
    component.view = 'profile';
    fixture.detectChanges();

    const profileHeading = fixture.nativeElement.querySelector('.profile-card h2') as HTMLElement;
    const profileStatus = fixture.nativeElement.querySelector('.profile-card b') as HTMLElement;
    expect(parseFloat(getComputedStyle(profileHeading).fontSize)).toBeGreaterThan(18);
    expect(parseFloat(getComputedStyle(profileStatus).fontSize)).toBeGreaterThan(9);

    component.view = 'points';
    fixture.detectChanges();

    const pointsTotal = fixture.nativeElement.querySelector('.balance-card strong') as HTMLElement;
    const filterButton = fixture.nativeElement.querySelector('.segment-row button') as HTMLButtonElement;
    expect(parseFloat(getComputedStyle(pointsTotal).fontSize)).toBeGreaterThan(24);
    expect(parseFloat(getComputedStyle(filterButton).fontSize)).toBeGreaterThan(14);
    expect(parseFloat(getComputedStyle(filterButton).minHeight)).toBeGreaterThanOrEqual(40);

    component.view = 'accessibility';
    fixture.detectChanges();

    const languageOption = fixture.nativeElement.querySelector('.language-list label') as HTMLElement;
    const textSizeButton = fixture.nativeElement.querySelector('.text-size-row button') as HTMLButtonElement;
    const previewTitle = fixture.nativeElement.querySelector('.preview-card h2') as HTMLElement;
    const previewCopy = fixture.nativeElement.querySelector('.preview-card p') as HTMLElement;
    expect(parseFloat(getComputedStyle(languageOption).fontSize)).toBeGreaterThan(16);
    expect(parseFloat(getComputedStyle(languageOption).minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(textSizeButton).fontSize)).toBeGreaterThan(14);
    expect(parseFloat(getComputedStyle(textSizeButton).minHeight)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(getComputedStyle(previewTitle).fontSize)).toBeGreaterThan(20);
    expect(parseFloat(getComputedStyle(previewCopy).fontSize)).toBeGreaterThan(15);
  });

  it('steps the accessibility preview typography through Standard, Large, and Extra large states', () => {
    component.view = 'accessibility';
    fixture.detectChanges();

    const previewCard = fixture.nativeElement.querySelector('.preview-card') as HTMLElement;
    const previewHeading = previewCard.querySelector('h2') as HTMLElement;
    const previewEmphasis = previewCard.querySelector('b') as HTMLElement;
    const previewCopy = previewCard.querySelector('p') as HTMLElement;

    const standardHeading = parseFloat(getComputedStyle(previewHeading).fontSize);
    const standardEmphasis = parseFloat(getComputedStyle(previewEmphasis).fontSize);
    const standardCopy = parseFloat(getComputedStyle(previewCopy).fontSize);

    expect(previewCard.classList.contains('preview-large')).toBeFalse();
    expect(previewCard.classList.contains('preview-extra-large')).toBeFalse();

    component.textSize = 'Large';
    fixture.detectChanges();

    const largeHeading = parseFloat(getComputedStyle(previewHeading).fontSize);
    const largeEmphasis = parseFloat(getComputedStyle(previewEmphasis).fontSize);
    const largeCopy = parseFloat(getComputedStyle(previewCopy).fontSize);

    expect(previewCard.classList.contains('preview-large')).toBeTrue();
    expect(previewCard.classList.contains('preview-extra-large')).toBeFalse();
    expect(largeHeading).toBeGreaterThan(standardHeading);
    expect(largeEmphasis).toBeGreaterThan(standardEmphasis);
    expect(largeCopy).toBeGreaterThan(standardCopy);

    component.textSize = 'Extra large';
    fixture.detectChanges();

    const extraLargeHeading = parseFloat(getComputedStyle(previewHeading).fontSize);
    const extraLargeEmphasis = parseFloat(getComputedStyle(previewEmphasis).fontSize);
    const extraLargeCopy = parseFloat(getComputedStyle(previewCopy).fontSize);

    expect(previewCard.classList.contains('preview-large')).toBeFalse();
    expect(previewCard.classList.contains('preview-extra-large')).toBeTrue();
    expect(extraLargeHeading).toBeGreaterThan(largeHeading);
    expect(extraLargeEmphasis).toBeGreaterThan(largeEmphasis);
    expect(extraLargeCopy).toBeGreaterThan(largeCopy);
  });

  it('builds localized challenge mission mascot alt text', () => {
    const mission = {
      title: { EN: 'Heritage by public transport', BM: 'Warisan dengan pengangkutan awam' },
      description: { EN: 'Mission copy', BM: 'Salinan misi' },
      progress: '0/3',
      reward: { EN: '+80 points', BM: '+80 mata' },
      image: 'assets/mytravel/wira-ui.png',
      progressWidth: '0%',
    };

    expect(component.challengeMissionAlt(mission)).toBe('Heritage by public transport challenge mascot');

    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });
    component.updateLanguage('BM');

    expect(component.challengeMissionAlt(mission)).toBe('Warisan dengan pengangkutan awam maskot cabaran');
  });

  it('renders accessible pressed states for transaction filters', () => {
    component.view = 'points';
    fixture.detectChanges();

    const filterButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.segment-row button'),
    ) as HTMLButtonElement[];

    expect(filterButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(filterButtons[0].getAttribute('aria-label')).toBe('Filter transactions by All');
    expect(filterButtons[1].getAttribute('aria-pressed')).toBe('false');

    component.selectTransactionFilter('Pending');
    fixture.detectChanges();

    expect(filterButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(filterButtons[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('renders accessible pressed states for passport filters', () => {
    component.passportProviderConnected = true;
    component.stamps = [
      {
        name: 'Selangor',
        active: true,
        image: 'assets/mytravel/manja-ui.png',
        heroImage: 'assets/mytravel/wira-ui.png',
        region: 'state',
        label: { EN: 'Unlocked', BM: 'Dibuka' },
        description: { EN: 'State stamp', BM: 'Cop negeri' },
      },
      {
        name: 'Putrajaya',
        active: false,
        image: 'assets/mytravel/manja-ui.png',
        heroImage: 'assets/mytravel/wira-ui.png',
        region: 'federal',
        label: { EN: 'Locked', BM: 'Dikunci' },
        description: { EN: 'Federal stamp', BM: 'Cop wilayah persekutuan' },
      },
    ];
    component.view = 'passport';
    fixture.detectChanges();

    const filterButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.passport-tabs button'),
    ) as HTMLButtonElement[];

    expect(filterButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(filterButtons[1].getAttribute('aria-label')).toBe('Filter passport stamps by States');

    component.selectPassportFilter('Federal Territories');
    fixture.detectChanges();

    expect(filterButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(filterButtons[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('renders contextual aria labels for passport stamps', () => {
    component.passportProviderConnected = true;
    component.stamps = [
      {
        name: 'Selangor',
        active: true,
        image: 'assets/mytravel/manja-ui.png',
        heroImage: 'assets/mytravel/wira-ui.png',
        region: 'state',
        label: { EN: 'Unlocked', BM: 'Dibuka' },
        description: { EN: 'State stamp', BM: 'Cop negeri' },
      },
      {
        name: 'Labuan',
        active: false,
        image: 'assets/mytravel/manja-ui.png',
        heroImage: 'assets/mytravel/wira-ui.png',
        region: 'federal',
        label: { EN: 'Locked', BM: 'Dikunci' },
        description: { EN: 'Federal stamp', BM: 'Cop wilayah persekutuan' },
      },
    ];
    component.selectedStamp = component.stamps[0];
    component.view = 'passport';
    fixture.detectChanges();

    const stampButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.stamp-grid button'),
    ) as HTMLButtonElement[];

    expect(stampButtons[0].getAttribute('aria-label')).toBe('Passport stamp Selangor, selected, unlocked');
    expect(stampButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(stampButtons[1].getAttribute('aria-label')).toBe('Passport stamp Labuan, locked');
    expect(stampButtons[1].getAttribute('aria-pressed')).toBe('false');

    component.language = 'BM';

    expect(component.passportStampAriaLabel(component.stamps[0])).toBe('Cop pasport Selangor, dipilih, dibuka');
    expect(component.passportStampAriaLabel(component.stamps[1])).toBe('Cop pasport Labuan, dikunci');
  });

  it('shows provider boundary messaging instead of passport and challenge controls when Firestore data is unavailable', () => {
    component.view = 'passport';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.passport-tabs')).toBeNull();
    expect(fixture.nativeElement.querySelector('.stamp-grid')).toBeNull();
    expect((fixture.nativeElement.querySelector('.empty-data-card') as HTMLElement).textContent).toContain(
      'Passport stamps will appear here when your Firestore passport provider is connected.',
    );

    component.view = 'challenges';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.active-mission')).toBeNull();
    expect(fixture.nativeElement.querySelector('.next-reward')).toBeNull();
    expect((fixture.nativeElement.querySelector('.empty-data-card') as HTMLElement).textContent).toContain(
      'Challenge missions will appear here when your Firestore rewards provider is connected.',
    );
  });

  it('renders contextual aria labels for profile dashboard actions', () => {
    component.view = 'profile';
    fixture.detectChanges();

    const statButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.stat-grid button'),
    ) as HTMLButtonElement[];
    const challengeButton = fixture.nativeElement.querySelector('.challenge-banner') as HTMLButtonElement;
    const settingsButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.settings-list button'),
    ) as HTMLButtonElement[];

    expect(statButtons[0].getAttribute('aria-label')).toBe('Open Eco-Points. 0 points');
    expect(statButtons[1].getAttribute('aria-label')).toBe('Open Digital Passport. Provider pending');
    expect(challengeButton.getAttribute('aria-label')).toBe(
      'Open Rewards provider pending. Challenge and reward details will appear here when your Firestore rewards provider is connected.',
    );
    expect(settingsButtons[0].getAttribute('aria-label')).toBe(
      'Open My contributions. Tips, verifications & shared information',
    );
    expect(settingsButtons[settingsButtons.length - 1].getAttribute('aria-label')).toBe(
      'Sign out. Sign out of your MyTravel account',
    );

    component.language = 'BM';

    expect(component.profilePointsCardAriaLabel()).toBe('Buka Mata Eko. 0 mata');
    expect(component.profileMenuItemAriaLabel(component.menuItems[0])).toBe(
      'Buka Sumbangan saya. Tip, pengesahan & maklumat yang dikongsi',
    );
  });

  it('disables accessibility actions when preferences already match defaults', () => {
    component.view = 'accessibility';
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.mt-primary') as HTMLButtonElement;
    const resetButton = fixture.nativeElement.querySelector('.reset-button') as HTMLButtonElement;
    const statusCard = fixture.nativeElement.querySelectorAll('.accessibility-summary')[0] as HTMLElement;

    expect(component.hasPendingAccessibilityChanges).toBeFalse();
    expect(component.canResetAccessibilitySettings).toBeFalse();
    expect(saveButton.disabled).toBeTrue();
    expect(resetButton.disabled).toBeTrue();
    expect(statusCard.textContent).toContain('Default preferences active');
    expect(statusCard.textContent).toContain('This device is currently using the default accessibility preferences.');
  });

  it('enables accessibility actions after local unsaved changes', () => {
    component.view = 'accessibility';
    component.textSize = 'Large';
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.mt-primary') as HTMLButtonElement;
    const resetButton = fixture.nativeElement.querySelector('.reset-button') as HTMLButtonElement;
    const statusCard = fixture.nativeElement.querySelectorAll('.accessibility-summary')[0] as HTMLElement;

    expect(component.hasPendingAccessibilityChanges).toBeTrue();
    expect(component.canResetAccessibilitySettings).toBeTrue();
    expect(saveButton.disabled).toBeFalse();
    expect(resetButton.disabled).toBeFalse();
    expect(statusCard.textContent).toContain('Changes ready to save');
    expect(statusCard.textContent).toContain('Save to apply your latest accessibility updates across the app.');
  });

  it('keeps save disabled but reset enabled for persisted non-default accessibility preferences', () => {
    const nonDefaultPreferences: AccessibilityPreferences = {
      language: 'EN',
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

    accessibilityPreferencesService.getPreferences.and.returnValue(nonDefaultPreferences);

    component.view = 'accessibility';
    component.ionViewWillEnter();
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.mt-primary') as HTMLButtonElement;
    const resetButton = fixture.nativeElement.querySelector('.reset-button') as HTMLButtonElement;
    const statusCard = fixture.nativeElement.querySelectorAll('.accessibility-summary')[0] as HTMLElement;

    expect(component.hasPendingAccessibilityChanges).toBeFalse();
    expect(component.canResetAccessibilitySettings).toBeTrue();
    expect(saveButton.disabled).toBeTrue();
    expect(resetButton.disabled).toBeFalse();
    expect(statusCard.textContent).toContain('Custom preferences active');
    expect(statusCard.textContent).toContain('Your saved accessibility preferences are active. Reset to return to the app defaults.');
  });

  it('skips redundant accessibility persistence when save and reset actions are inactive', () => {
    component.saveAccessibilitySettings();
    component.resetAccessibilitySettings();

    expect(accessibilityPreferencesService.savePreferences).not.toHaveBeenCalled();
    expect(accessibilityPreferencesService.resetPreferences).not.toHaveBeenCalled();
    expect(component.toast).toBe('');
  });

  it('localizes accessibility status messaging in BM', () => {
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

    component.view = 'accessibility';
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.accessibilityStatusTitleLabel).toBe('Pilihan tersuai sedang digunakan');
    expect(component.accessibilityStatusCopyLabel).toBe(
      'Pilihan kebolehcapaian tersimpan anda sedang digunakan. Tetapkan semula untuk kembali ke lalai aplikasi.',
    );

    component.textSize = 'Extra large';

    expect(component.accessibilityStatusTitleLabel).toBe('Perubahan sedia untuk disimpan');
    expect(component.accessibilityStatusCopyLabel).toBe(
      'Simpan untuk menggunakan kemas kini kebolehcapaian terkini anda di seluruh aplikasi.',
    );
  });

  it('renders contextual accessibility control labels', () => {
    component.view = 'accessibility';
    fixture.detectChanges();

    const languageList = fixture.nativeElement.querySelector('.language-list') as HTMLElement;
    const languageInputs = Array.from(
      fixture.nativeElement.querySelectorAll('.language-list input[type="radio"]'),
    ) as HTMLInputElement[];
    const textSizeButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.text-size-row button'),
    ) as HTMLButtonElement[];
    const accessibilityToggles = Array.from(
      fixture.nativeElement.querySelectorAll('.accessibility-list input[type="checkbox"]'),
    ) as HTMLInputElement[];

    expect(languageList.getAttribute('role')).toBe('radiogroup');
    expect(languageList.getAttribute('aria-label')).toBe('App language options');
    expect(languageInputs[0].getAttribute('aria-label')).toBe('Switch app language to Malay (BM)');
    expect(languageInputs[1].getAttribute('aria-label')).toBe('Switch app language to English (EN)');
    expect(textSizeButtons[0].getAttribute('aria-label')).toBe('Set text size to Standard');
    expect(textSizeButtons[2].getAttribute('aria-label')).toBe('Set text size to Extra large');
    expect(accessibilityToggles[0].getAttribute('aria-label')).toBe('Toggle High contrast');
    expect(accessibilityToggles[5].getAttribute('aria-label')).toBe('Toggle Wheelchair-accessible routes');
  });

  it('keeps the selected app language visibly highlighted in the accessibility picker', () => {
    component.view = 'accessibility';
    fixture.detectChanges();

    const languageLabels = Array.from(
      fixture.nativeElement.querySelectorAll('.language-list label'),
    ) as HTMLElement[];

    expect(languageLabels[0].classList.contains('active')).toBeFalse();
    expect(languageLabels[1].classList.contains('active')).toBeTrue();

    component.selectedAppLanguage = 'BM';
    fixture.detectChanges();

    expect(languageLabels[0].classList.contains('active')).toBeTrue();
    expect(languageLabels[1].classList.contains('active')).toBeFalse();
  });

  it('updates the accessibility preview card immediately when a new app language is selected', () => {
    component.view = 'accessibility';
    fixture.detectChanges();

    const previewCard = fixture.nativeElement.querySelector('.preview-card') as HTMLElement;
    const previewHeading = previewCard.querySelector('h2') as HTMLElement;
    const previewTitle = previewCard.querySelector('b') as HTMLElement;
    const previewCopy = previewCard.querySelector('p') as HTMLElement;

    expect(component.language).toBe('EN');
    expect(previewHeading.textContent?.trim()).toBe('Preview');
    expect(previewTitle.textContent?.trim()).toBe('Public transport journey');
    expect(previewCopy.textContent?.trim()).toBe(
      'Easily plan journeys using public transport across Malaysia.',
    );

    component.selectedAppLanguage = 'BM';
    fixture.detectChanges();

    expect(component.language).toBe('EN');
    expect(previewHeading.textContent?.trim()).toBe('Pratonton');
    expect(previewTitle.textContent?.trim()).toBe('Perjalanan pengangkutan awam');
    expect(previewCopy.textContent?.trim()).toBe(
      'Rancang perjalanan dengan mudah menggunakan pengangkutan awam di seluruh Malaysia.',
    );
  });

  it('reflects contrast and underline accessibility toggles in the preview card', () => {
    component.view = 'accessibility';
    component.settings = {
      ...component.settings,
      contrast: false,
      underline: false,
    };
    fixture.detectChanges();

    const previewCard = fixture.nativeElement.querySelector('.preview-card') as HTMLElement;
    const previewTitle = previewCard.querySelector('b') as HTMLElement;
    const previewCopy = previewCard.querySelector('p') as HTMLElement;
    const defaultCopyColor = getComputedStyle(previewCopy).color;

    expect(previewCard.classList.contains('preview-contrast')).toBeFalse();
    expect(previewCard.classList.contains('preview-underline')).toBeFalse();
    expect(getComputedStyle(previewTitle).textDecorationLine).not.toContain('underline');

    component.settings = {
      ...component.settings,
      contrast: true,
      underline: true,
    };
    fixture.detectChanges();

    expect(previewCard.classList.contains('preview-contrast')).toBeTrue();
    expect(previewCard.classList.contains('preview-underline')).toBeTrue();
    expect(getComputedStyle(previewTitle).textDecorationLine).toContain('underline');
    expect(getComputedStyle(previewCopy).color).not.toBe(defaultCopyColor);
  });

  it('localizes contextual accessibility control labels in BM', () => {
    component.language = 'BM';

    expect(component.accessibilityLanguageAriaLabel('BM')).toBe('Tukar bahasa aplikasi kepada Bahasa Melayu (BM)');
    expect(component.textSizeAriaLabel('Extra large')).toBe('Tetapkan saiz teks kepada Sangat besar');
    expect(component.accessibilityOptionAriaLabel(component.accessibilityOptions[0])).toBe('Togol Kontras tinggi');
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

  it('keeps passport and challenge surfaces provider-ready even when local travel activity exists', () => {
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

    expect(component.passportProviderConnected).toBeFalse();
    expect(component.rewardsProviderConnected).toBeFalse();
    expect(component.passportCollectedCount).toBe(0);
    expect(component.stamps).toEqual([]);
    expect(component.passportStatusLabel).toBe('Provider pending');
    expect(component.passportEmptyStateCopyLabel).toBe('You already have 2 completed local journeys. Passport stamps will appear here when your Firestore passport provider is connected.');
    expect(component.challengeMissions).toEqual([]);
    expect(component.unlockSteps).toEqual([]);
    expect(component.seasonProgressWidth).toBe('8%');
    expect(component.challengeHeroStatusLabel).toBe('Local points progress');
    expect(component.challengeEmptyStateCopyLabel).toBe('You already have 80 local Eco-Points. Challenge missions will appear here when your Firestore rewards provider is connected.');
    expect(component.rewardEmptyStateCopyLabel).toBe('You already have 80 of 1,000 local Eco-Points recorded. Reward details will appear here when your Firestore rewards provider is connected.');
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
    expect(component.challengeMissions).toEqual([]);
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
