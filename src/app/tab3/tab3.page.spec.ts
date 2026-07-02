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
    fixture.detectChanges();
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.posts.length).toBeGreaterThan(0);
    expect(component.notices.length).toBeGreaterThan(0);
    expect(component.verificationTask?.id).toBe('verification-kl-sentral-access');
    expect(component.filteredPosts[0].id).toBe('seeded-george-town');
    expect(component.savedNoticeCount).toBe(0);
  });

  it('filters community posts by state and category', () => {
    component.filterState = 'Penang';
    component.filterCategory = 'Heritage';

    expect(component.filteredPosts.length).toBe(1);
    expect(component.filteredPosts[0].id).toBe('seeded-george-town');

    component.filterCategory = 'Food';

    expect(component.filteredPosts.length).toBe(0);
  });

  it('persists post reactions and allows toggling them off', () => {
    const seededPost = component.posts.find((post) => post.id === 'seeded-george-town');
    expect(seededPost).toBeDefined();

    component.reactToPost(seededPost!, 'helpful');
    expect(seededPost?.reaction).toBe('helpful');
    expect(appStateService.setPostReaction).toHaveBeenCalledWith('seeded-george-town', 'helpful');

    component.reactToPost(seededPost!, 'helpful');
    expect(seededPost?.reaction).toBeNull();
    expect(appStateService.setPostReaction).toHaveBeenCalledWith('seeded-george-town', null);
  });

  it('restores persisted reactions and keeps helpful sorting score-based', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      postReactions: {
        'seeded-raban-lake': 'helpful',
        'seeded-george-town': 'not-helpful',
      },
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.postSort = 'Most helpful';

    expect(component.posts.find((post) => post.id === 'seeded-raban-lake')?.reaction).toBe('helpful');
    expect(component.filteredPosts[0].id).toBe('seeded-george-town');
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

  it('restores saved seeded notices from app state', () => {
    appStateService.getSnapshot.and.returnValue({
      ...createState(),
      savedNoticeIds: ['notice-kelana-jaya-delay'],
    });

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.savedNoticeCount).toBe(1);
    expect(component.notices.find((notice) => notice.id === 'notice-kelana-jaya-delay')?.saved).toBeTrue();
    expect(component.criticalNoticeCount).toBe(1);
    expect(component.disruptionNoticeCount).toBe(1);
    expect(component.advisoryNoticeCount).toBe(1);
  });

  it('advances to the next verification checkpoint after submission', () => {
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

    expect(appStateService.submitVerification).toHaveBeenCalledWith(
      'verification-kl-sentral-access',
      'KL Sentral accessibility review',
    );
    expect(component.verificationTask?.id).toBe('verification-pasar-seni-access');
    expect(component.toast).toContain('+40');
  });
});
