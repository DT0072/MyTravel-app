import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { AppStateService } from '../services/app-state.service';
import { Tab3Page } from './tab3.page';

class MockFileReader {
  static instances: MockFileReader[] = [];

  result: string | ArrayBuffer | null = null;
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  aborted = false;

  constructor() {
    MockFileReader.instances.push(this);
  }

  abort(): void {
    this.aborted = true;
    this.onabort?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
  }

  readAsDataURL(): void {
    // No-op in tests. Emission is manually controlled.
  }

  emitLoad(result: string): void {
    this.result = result;
    this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
  }
}

describe('Tab3Page', () => {
  let component: Tab3Page;
  let fixture: ComponentFixture<Tab3Page>;
  let accessibilityPreferencesService: jasmine.SpyObj<AccessibilityPreferencesService>;
  let appStateService: jasmine.SpyObj<AppStateService>;
  let router: Router;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let originalFileReader: typeof FileReader;
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

  function createImageInputEvent(file: Partial<File>): Event {
    return {
      target: {
        files: [file],
        value: '',
      },
    } as unknown as Event;
  }

  beforeEach(async () => {
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    MockFileReader.instances = [];
    originalFileReader = globalThis.FileReader;
    (globalThis as typeof globalThis & { FileReader: typeof FileReader }).FileReader =
      MockFileReader as unknown as typeof FileReader;

    accessibilityPreferencesService = jasmine.createSpyObj<AccessibilityPreferencesService>(
      'AccessibilityPreferencesService',
      ['getPreferences', 'setLanguage'],
    );
    appStateService = jasmine.createSpyObj<AppStateService>(
      'AppStateService',
      ['getSnapshot', 'getEmptyTipDraft', 'saveTipDraft', 'submitTip', 'toggleSavedNotice', 'submitVerification', 'setPostReaction'],
    );

    accessibilityPreferencesService.getPreferences.and.returnValue(preferences);
    accessibilityPreferencesService.setLanguage.and.returnValue(preferences);
    appStateService.getSnapshot.and.returnValue(createState());
    appStateService.getEmptyTipDraft.and.returnValue({
      location: '',
      state: 'Kuala Lumpur',
      category: 'Heritage',
      tip: '',
      accessible: false,
      hearingAccessible: false,
      confirmed: false,
    });

    await TestBed.configureTestingModule({
      declarations: [Tab3Page],
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

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    originalTextScale = document.documentElement.style.getPropertyValue('--mt-text-scale');
    document.documentElement.style.setProperty('--mt-text-scale', '1');
    fixture.detectChanges();
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;

    if (originalTextScale) {
      document.documentElement.style.setProperty('--mt-text-scale', originalTextScale);
      return;
    }

    document.documentElement.style.removeProperty('--mt-text-scale');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.posts.length).toBe(0);
    expect(component.notices).toEqual([]);
    expect(component.verificationTask).toBeNull();
    expect(component.filteredPosts).toEqual([]);
    expect(component.savedNoticeCount).toBe(0);
    expect(component.verificationMissionTitleLabel).toBe('Manja Community Mission');
    expect(component.verificationMissionCopyLabel).toBe('0 of 2 local community updates submitted.');
    expect(component.verificationMissionActionLabel).toBe('Contribute');
    expect(component.verificationMissionWidth).toBe('0%');
  });

  it('presents the community mission card with balanced image, text, and action sizing', () => {
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.mission-card') as HTMLElement;
    const mascot = fixture.nativeElement.querySelector('.mission-card img') as HTMLElement;
    const title = fixture.nativeElement.querySelector('.mission-card b') as HTMLElement;
    const copy = fixture.nativeElement.querySelector('.mission-card small') as HTMLElement;
    const progress = fixture.nativeElement.querySelector('.mission-card i') as HTMLElement;
    const action = fixture.nativeElement.querySelector('.mission-card em') as HTMLElement;

    expect(parseFloat(getComputedStyle(card).minHeight)).toBeGreaterThanOrEqual(84);
    expect(parseFloat(getComputedStyle(mascot).width)).toBeLessThanOrEqual(52);
    expect(parseFloat(getComputedStyle(title).fontSize)).toBeGreaterThanOrEqual(13);
    expect(parseFloat(getComputedStyle(copy).fontSize)).toBeGreaterThanOrEqual(11);
    expect(parseFloat(getComputedStyle(progress).height)).toBeGreaterThanOrEqual(7);
    expect(parseFloat(getComputedStyle(action).minHeight)).toBeGreaterThanOrEqual(40);
    expect(getComputedStyle(action).whiteSpace).toBe('nowrap');
  });

  it('filters locally submitted community posts by state and category', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Penang',
          category: 'Heritage',
          tip: 'Detailed community tip',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'In review',
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.filterState = 'Penang';
    component.filterCategory = 'Heritage';

    expect(component.filteredPosts.length).toBe(1);
    expect(component.filteredPosts[0].id).toBe('tip-1');

    component.filterCategory = 'Food';

    expect(component.filteredPosts.length).toBe(0);
  });

  it('persists post reactions and allows toggling them off', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Kuala Lumpur',
          category: 'Heritage',
          tip: 'Detailed community tip',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'In review',
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const submittedPost = component.posts.find((post) => post.id === 'tip-1');
    expect(submittedPost).toBeDefined();

    component.reactToPost(submittedPost!, 'helpful');
    expect(submittedPost?.reaction).toBe('helpful');
    expect(appStateService.setPostReaction).toHaveBeenCalledWith('tip-1', 'helpful');

    component.reactToPost(submittedPost!, 'helpful');
    expect(submittedPost?.reaction).toBeNull();
    expect(appStateService.setPostReaction).toHaveBeenCalledWith('tip-1', null);
  });

  it('restores persisted reactions and keeps helpful sorting score-based for local posts', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Kuala Lumpur',
          category: 'Heritage',
          tip: 'Detailed community tip',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'Approved',
        },
        {
          id: 'tip-2',
          location: 'Lake Park',
          state: 'Sarawak',
          category: 'Nature',
          tip: 'Bring water and start from the visitor centre entrance.',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-29T00:00:00.000Z',
          status: 'Approved',
        },
      ],
      postReactions: {
        'tip-2': 'helpful',
        'tip-1': 'not-helpful',
      },
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.postSort = 'Most helpful';

    expect(component.posts.find((post) => post.id === 'tip-2')?.reaction).toBe('helpful');
    expect(component.filteredPosts[0].id).toBe('tip-2');
  });

  it('opens the notices surface from route query params', () => {
    queryParamMap$.next(convertToParamMap({
      view: 'notices',
      noticeFilter: 'Transit',
    }));

    expect(component.view).toBe('notices');
    expect(component.noticeFilter).toBe('Transit');
  });

  it('syncs notice routes when opening and closing the notices surface', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.openNotices('Weather');
    expect(component.view).toBe('notices');
    expect(component.noticeFilter).toBe('Weather');
    expect(navigateSpy).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: {
        view: 'notices',
        noticeFilter: 'Weather',
      },
      queryParamsHandling: 'merge',
    }));

    component.returnToCommunity();
    expect(component.view).toBe('community');
    expect(navigateSpy).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: {
        view: null,
        noticeFilter: null,
      },
      queryParamsHandling: 'merge',
    }));
  });

  it('renders accessible selected states for community tabs', () => {
    fixture.detectChanges();

    const tabButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.community-tabs button'),
    ) as HTMLButtonElement[];

    expect(tabButtons[0].getAttribute('role')).toBe('tab');
    expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
    expect(tabButtons[0].getAttribute('tabindex')).toBe('0');
    expect(tabButtons[1].getAttribute('aria-selected')).toBe('false');
    expect(tabButtons[1].getAttribute('tabindex')).toBe('-1');
    expect(fixture.nativeElement.querySelector('#community-panel-tips')).not.toBeNull();

    component.setCommunityTab('verification');
    fixture.detectChanges();

    expect(tabButtons[0].getAttribute('aria-selected')).toBe('false');
    expect(tabButtons[1].getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('#community-panel-verification')).not.toBeNull();
  });

  it('supports arrow-key navigation across community tabs', () => {
    fixture.detectChanges();

    const tabButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.community-tabs button'),
    ) as HTMLButtonElement[];

    tabButtons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(component.communityTab).toBe('verification');
    expect(tabButtons[1].getAttribute('aria-selected')).toBe('true');

    tabButtons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    fixture.detectChanges();

    expect(component.communityTab).toBe('tips');
    expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
  });

  it('renders accessible pressed states for notice filters', () => {
    component.openNotices('Transit');
    fixture.detectChanges();

    const noticeButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.notice-tabs button'),
    ) as HTMLButtonElement[];

    expect(noticeButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(noticeButtons[1].getAttribute('aria-pressed')).toBe('true');
    expect(noticeButtons[1].getAttribute('aria-label')).toBe('Filter notices by Transit');

    component.setNoticeFilter('Weather');
    fixture.detectChanges();

    expect(noticeButtons[1].getAttribute('aria-pressed')).toBe('false');
    expect(noticeButtons[3].getAttribute('aria-pressed')).toBe('true');
  });

  it('scales Tab3 typography with the shared text-size preference', () => {
    document.documentElement.style.setProperty('--mt-text-scale', '1.4');
    fixture.detectChanges();

    const communityTabButton = fixture.nativeElement.querySelector('.community-tabs button') as HTMLButtonElement;
    expect(parseFloat(getComputedStyle(communityTabButton).fontSize)).toBeGreaterThan(9);

    component.openAddTip();
    fixture.detectChanges();

    const addHeading = fixture.nativeElement.querySelector('.sub-heading h1') as HTMLElement;
    const stepCopy = fixture.nativeElement.querySelector('.steps small') as HTMLElement;
    const tipLabel = fixture.nativeElement.querySelector('.tip-form label') as HTMLElement;
    const tipInput = fixture.nativeElement.querySelector('.tip-form input[name="location"]') as HTMLInputElement;
    const confirmRow = fixture.nativeElement.querySelector('.confirm-row') as HTMLElement;

    expect(parseFloat(getComputedStyle(addHeading).fontSize)).toBeGreaterThan(21);
    expect(parseFloat(getComputedStyle(stepCopy).fontSize)).toBeGreaterThan(13);
    expect(parseFloat(getComputedStyle(tipLabel).fontSize)).toBeGreaterThan(14);
    expect(parseFloat(getComputedStyle(tipInput).fontSize)).toBeGreaterThan(14);
    expect(parseFloat(getComputedStyle(tipInput).minHeight)).toBeGreaterThanOrEqual(42);
    expect(parseFloat(getComputedStyle(confirmRow).fontSize)).toBeGreaterThan(14);

    component.openNotices();
    fixture.detectChanges();

    const noticeButton = fixture.nativeElement.querySelector('.notice-tabs button') as HTMLButtonElement;
    expect(parseFloat(getComputedStyle(noticeButton).fontSize)).toBeGreaterThan(7);
  });

  it('keeps compact community metadata and notice controls above the tiny-text readability floor', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Kuala Lumpur',
          category: 'Heritage',
          tip: 'Detailed community tip that stays readable on compact layouts.',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'Approved',
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const authorMeta = fixture.nativeElement.querySelector('.author small') as HTMLElement;
    const postAction = fixture.nativeElement.querySelector('.post-actions button') as HTMLButtonElement;

    expect(parseFloat(getComputedStyle(authorMeta).fontSize)).toBeGreaterThan(9);
    expect(parseFloat(getComputedStyle(postAction).fontSize)).toBeGreaterThan(9);

    component.notices = [
      {
        id: 'notice-1',
        level: 'CRITICAL',
        color: '#c62828',
        title: { EN: 'Service disruption', BM: 'Gangguan perkhidmatan' },
        place: { EN: 'Kelana Jaya Line', BM: 'Laluan Kelana Jaya' },
        time: '10 min ago',
        category: 'Transit',
        saved: false,
      },
    ];
    component.openNotices();
    fixture.detectChanges();

    const noticeFilter = fixture.nativeElement.querySelector('.notice-tabs button') as HTMLButtonElement;
    const noticeTime = fixture.nativeElement.querySelector('.notice-card time') as HTMLElement;

    expect(parseFloat(getComputedStyle(noticeFilter).fontSize)).toBeGreaterThan(9);
    expect(parseFloat(getComputedStyle(noticeTime).fontSize)).toBeGreaterThan(9);
  });

  it('keeps community and notice filters above the cramped control floor', () => {
    fixture.detectChanges();

    const communityFilters = Array.from(
      fixture.nativeElement.querySelectorAll('.filter-row select'),
    ) as HTMLSelectElement[];

    expect(communityFilters.length).toBe(3);
    communityFilters.forEach((filter) => {
      expect(parseFloat(getComputedStyle(filter).fontSize)).toBeGreaterThan(10);
      expect(parseFloat(getComputedStyle(filter).minHeight)).toBeGreaterThanOrEqual(42);
    });

    component.notices = [
      {
        id: 'notice-1',
        level: 'CRITICAL',
        color: '#c62828',
        title: { EN: 'Service disruption', BM: 'Gangguan perkhidmatan' },
        place: { EN: 'Kelana Jaya Line', BM: 'Laluan Kelana Jaya' },
        time: '10 min ago',
        category: 'Transit',
        saved: false,
      },
    ];
    component.openNotices();
    fixture.detectChanges();

    const noticeButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.notice-tabs button'),
    ) as HTMLButtonElement[];

    expect(noticeButtons.length).toBe(4);
    noticeButtons.forEach((button) => {
      expect(parseFloat(getComputedStyle(button).fontSize)).toBeGreaterThan(10);
      expect(parseFloat(getComputedStyle(button).minHeight)).toBeGreaterThanOrEqual(42);
    });
  });

  it('groups notice actions and timestamp into a reflowable footer layout', () => {
    component.notices = [
      {
        id: 'notice-1',
        level: 'CRITICAL',
        color: '#c62828',
        title: { EN: 'Service disruption', BM: 'Gangguan perkhidmatan' },
        place: { EN: 'Kelana Jaya Line', BM: 'Laluan Kelana Jaya' },
        time: '10 min ago',
        category: 'Transit',
        saved: false,
      },
    ];
    component.openNotices();
    fixture.detectChanges();

    const noticeCard = fixture.nativeElement.querySelector('.notice-card') as HTMLElement;
    const noticeFooter = fixture.nativeElement.querySelector('.notice-footer') as HTMLElement;
    const noticeActions = fixture.nativeElement.querySelector('.notice-actions') as HTMLElement;
    const noticeTime = fixture.nativeElement.querySelector('.notice-footer time') as HTMLElement;

    expect(noticeCard).not.toBeNull();
    expect(noticeFooter).not.toBeNull();
    expect(noticeActions).not.toBeNull();
    expect(noticeTime.textContent?.trim()).toBe('10 min ago');
    expect(getComputedStyle(noticeFooter).display).toBe('flex');
    expect(getComputedStyle(noticeFooter).flexWrap).toBe('wrap');
    expect(getComputedStyle(noticeActions).display).toBe('flex');
    expect(getComputedStyle(noticeTime).whiteSpace).toBe('nowrap');
  });

  it('keeps the add-tip form controls above the cramped mobile readability floor', () => {
    component.openAddTip();
    fixture.detectChanges();

    const steps = fixture.nativeElement.querySelector('.steps') as HTMLElement;
    const tipInput = fixture.nativeElement.querySelector('.tip-form input[name="location"]') as HTMLInputElement;
    const photoButton = fixture.nativeElement.querySelector('.photo-row button') as HTMLButtonElement;
    const toggleRow = fixture.nativeElement.querySelector('.toggle-row') as HTMLElement;
    const toggleCopy = fixture.nativeElement.querySelector('.toggle-row small') as HTMLElement;

    expect(parseFloat(getComputedStyle(steps).minHeight)).toBeGreaterThanOrEqual(48);
    expect(parseFloat(getComputedStyle(tipInput).fontSize)).toBeGreaterThan(10);
    expect(parseFloat(getComputedStyle(tipInput).minHeight)).toBeGreaterThanOrEqual(42);
    expect(parseFloat(getComputedStyle(photoButton).fontSize)).toBeGreaterThan(10);
    expect(parseFloat(getComputedStyle(toggleRow).minHeight)).toBeGreaterThanOrEqual(52);
    expect(parseFloat(getComputedStyle(toggleCopy).fontSize)).toBeGreaterThan(10);
  });

  it('hides decorative icons from assistive tech across Tab3 surfaces', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Kuala Lumpur',
          category: 'Heritage',
          tip: 'Detailed community tip',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'In review',
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const postActionIcons = Array.from(
      fixture.nativeElement.querySelectorAll('.post-actions ion-icon'),
    ) as HTMLElement[];
    expect(postActionIcons.length).toBe(3);
    postActionIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    component.openAddTip();
    fixture.detectChanges();

    const addViewIcons = Array.from(
      fixture.nativeElement.querySelectorAll('.sub-heading ion-icon, .photo-placeholder ion-icon'),
    ) as HTMLElement[];
    expect(addViewIcons.length).toBe(3);
    addViewIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    const toggleVisuals = Array.from(
      fixture.nativeElement.querySelectorAll('.toggle-row i'),
    ) as HTMLElement[];
    expect(toggleVisuals.length).toBe(2);
    toggleVisuals.forEach((toggleVisual) => {
      expect(toggleVisual.getAttribute('aria-hidden')).toBe('true');
    });

    component.startVerification();
    fixture.detectChanges();

    const verificationIcons = Array.from(
      fixture.nativeElement.querySelectorAll('.sub-heading ion-icon, .verify-question ion-icon'),
    ) as HTMLElement[];
    expect(verificationIcons.length).toBeGreaterThan(0);
    verificationIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    component.openNotices();
    fixture.detectChanges();

    const noticeIcons = Array.from(
      fixture.nativeElement.querySelectorAll('.sub-heading ion-icon'),
    ) as HTMLElement[];
    expect(noticeIcons.length).toBe(1);
    noticeIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('keeps only the latest photo preview when selections overlap', () => {
    component.handlePhotoSelection(createImageInputEvent({
      name: 'first.png',
      type: 'image/png',
      size: 1024,
    }));
    component.handlePhotoSelection(createImageInputEvent({
      name: 'second.png',
      type: 'image/png',
      size: 1024,
    }));

    const [firstReader, secondReader] = MockFileReader.instances;
    expect(firstReader.aborted).toBeTrue();

    firstReader.emitLoad('data:first');
    expect(component.selectedPhotoPreview).toBe('');

    secondReader.emitLoad('data:second');
    expect(component.selectedPhotoName).toBe('second.png');
    expect(component.selectedPhotoPreview).toBe('data:second');
    expect(component.tipDraft.imageName).toBe('second.png');
    expect(component.tipDraft.imagePreview).toBe('data:second');
  });

  it('rejects images that are too large for offline persistence', () => {
    component.handlePhotoSelection(createImageInputEvent({
      name: 'offline-too-large.png',
      type: 'image/png',
      size: 300 * 1024,
    }));

    expect(MockFileReader.instances.length).toBe(0);
    expect(component.toast).toBe('Choose an image smaller than 250 KB so it can be saved offline');
    expect(component.selectedPhotoName).toBe('');
    expect(component.tipDraft.imagePreview).toBeUndefined();
  });

  it('ignores photo preview callbacks after the page is destroyed', () => {
    component.handlePhotoSelection(createImageInputEvent({
      name: 'preview.png',
      type: 'image/png',
      size: 1024,
    }));

    const [reader] = MockFileReader.instances;
    fixture.destroy();

    expect(reader.aborted).toBeTrue();
    reader.emitLoad('data:late');

    expect(component.selectedPhotoPreview).toBe('');
  });

  it('restores saved draft media preview from app state', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      tipDraft: {
        ...appStateService.getEmptyTipDraft.calls.mostRecent().returnValue,
        location: 'Museum',
        imageName: 'draft.png',
        imagePreview: 'data:draft',
      },
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.selectedPhotoName).toBe('draft.png');
    expect(component.selectedPhotoPreview).toBe('data:draft');
    expect(component.tipDraft.imagePreview).toBe('data:draft');
  });

  it('uses persisted image previews for saved community posts', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Kuala Lumpur',
          category: 'Heritage',
          tip: 'Detailed community tip',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          imageName: 'saved.png',
          imagePreview: 'data:saved',
          author: 'Traveler',
          initials: 'TR',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'In review',
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.posts[0].image).toBe('data:saved');
    expect(component.filteredPosts[0].id).toBe('tip-1');
  });

  it('shows local-submission fallback identity when a tip has no provider-backed profile data', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      communityTips: [
        {
          id: 'tip-1',
          location: 'Museum',
          state: 'Kuala Lumpur',
          category: 'Heritage',
          tip: 'Detailed community tip',
          accessible: true,
          hearingAccessible: false,
          confirmed: true,
          author: '',
          initials: '',
          createdAt: '2026-06-30T00:00:00.000Z',
          status: 'In review',
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.postAuthorLabel(component.posts[0])).toBe('Local submission');
    expect(component.postAuthorInitials(component.posts[0])).toBe('LS');
  });

  it('builds contextual accessibility labels for community post actions', () => {
    const post = {
      id: 'tip-1',
      state: 'Kuala Lumpur',
      author: '',
      initials: '',
      category: 'Heritage' as const,
      place: { EN: 'National Museum', BM: 'Muzium Negara' },
      copy: { EN: 'Detailed community tip', BM: 'Tip komuniti terperinci' },
      points: 20,
      image: 'data:test',
      date: { EN: '1 Jul 2026', BM: '1 Jul 2026' },
      createdAt: '2026-07-01T00:00:00.000Z',
      helpfulCount: 0,
      status: 'In review' as const,
      reaction: null,
    };

    expect(component.helpfulPostAriaLabel(post)).toBe('Mark tip as helpful: National Museum');
    expect(component.notHelpfulPostAriaLabel(post)).toBe('Mark tip as not helpful: National Museum');
    expect(component.reportPostAriaLabel(post)).toBe('Report travel tip: National Museum');
  });

  it('localizes community post accessibility labels in Bahasa Melayu', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    const post = {
      id: 'tip-1',
      state: 'Kuala Lumpur',
      author: '',
      initials: '',
      category: 'Heritage' as const,
      place: { EN: 'National Museum', BM: 'Muzium Negara' },
      copy: { EN: 'Detailed community tip', BM: 'Tip komuniti terperinci' },
      points: 20,
      image: 'data:test',
      date: { EN: '1 Jul 2026', BM: '1 Jul 2026' },
      createdAt: '2026-07-01T00:00:00.000Z',
      helpfulCount: 0,
      status: 'In review' as const,
      reaction: null,
    };

    expect(component.helpfulPostAriaLabel(post)).toBe('Tandakan tip sebagai membantu: Muzium Negara');
    expect(component.notHelpfulPostAriaLabel(post)).toBe('Tandakan tip sebagai tidak membantu: Muzium Negara');
    expect(component.reportPostAriaLabel(post)).toBe('Laporkan tip perjalanan: Muzium Negara');
  });

  it('keeps saved notice counts from local state while the notice feed stays provider-ready', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      savedNoticeIds: ['notice-kelana-jaya-delay'],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.savedNoticeCount).toBe(1);
    expect(component.notices).toEqual([]);
    expect(component.filteredNotices).toEqual([]);
    expect(component.criticalNoticeCount).toBe(0);
    expect(component.disruptionNoticeCount).toBe(0);
    expect(component.advisoryNoticeCount).toBe(0);
  });

  it('builds contextual accessibility labels for notice actions', () => {
    const notice = {
      id: 'notice-1',
      level: 'ADVISORY' as const,
      color: '#f0a500',
      title: { EN: 'Monorail lift maintenance', BM: 'Penyelenggaraan lif monorel' },
      place: { EN: 'Bukit Bintang', BM: 'Bukit Bintang' },
      time: '10 min ago',
      category: 'Transit' as const,
      saved: false,
    };

    expect(component.saveNoticeAriaLabel(notice)).toBe('Save travel notice: Monorail lift maintenance');
    expect(component.shareNoticeAriaLabel(notice)).toBe('Share travel notice: Monorail lift maintenance');

    notice.saved = true;

    expect(component.saveNoticeAriaLabel(notice)).toBe('Saved travel notice: Monorail lift maintenance');
  });

  it('localizes the notice accessibility labels in Bahasa Melayu', () => {
    accessibilityPreferencesService.setLanguage.and.returnValue({
      ...preferences,
      language: 'BM',
    });

    component.updateLanguage('BM');

    const notice = {
      id: 'notice-1',
      level: 'ADVISORY' as const,
      color: '#f0a500',
      title: { EN: 'Monorail lift maintenance', BM: 'Penyelenggaraan lif monorel' },
      place: { EN: 'Bukit Bintang', BM: 'Bukit Bintang' },
      time: '10 min ago',
      category: 'Transit' as const,
      saved: false,
    };

    expect(component.saveNoticeAriaLabel(notice)).toBe('Simpan notis perjalanan: Penyelenggaraan lif monorel');
    expect(component.shareNoticeAriaLabel(notice)).toBe('Kongsi notis perjalanan: Penyelenggaraan lif monorel');
  });

  it('keeps verification provider-ready and does not submit when no task exists', () => {
    appStateService.getSnapshot.and.returnValues(
      createState(),
      {
        ...createState(),
        ecoPoints: 40,
        completedVerificationIds: ['verification-kl-sentral-access'],
      },
    );
    appStateService.submitVerification.and.returnValue(true);

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.submitVerification();

    expect(appStateService.submitVerification).not.toHaveBeenCalled();
    expect(component.verificationTask).toBeNull();
    expect(component.verificationMissionTitleLabel).toBe('Manja Community Mission');
    expect(component.verificationMissionActionLabel).toBe('Contribute');
    expect(component.toast).toBe('');
  });

  it('derives mission progress from local community contributions', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      contributions: [
        {
          id: 'contribution-1',
          title: 'KL Sentral access check',
          type: 'Verification',
          status: 'Approved',
          createdAt: '2026-07-01T01:00:00.000Z',
          points: 40,
        },
      ],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.verificationMissionCopyLabel).toBe('1 of 2 local community updates submitted.');
    expect(component.verificationMissionWidth).toBe('50%');
    expect(component.verificationMissionActionLabel).toBe('Contribute');
  });
});
