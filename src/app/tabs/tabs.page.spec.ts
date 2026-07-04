import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
} from '../services/accessibility-preferences.service';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;
  let accessibilityPreferencesService: jasmine.SpyObj<AccessibilityPreferencesService>;
  let preferences$: BehaviorSubject<AccessibilityPreferences>;

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

  beforeEach(async () => {
    preferences$ = new BehaviorSubject(preferences);
    accessibilityPreferencesService = jasmine.createSpyObj<AccessibilityPreferencesService>(
      'AccessibilityPreferencesService',
      ['getPreferences'],
      {
        preferences$: preferences$.asObservable(),
      },
    );
    accessibilityPreferencesService.getPreferences.and.returnValue(preferences);

    await TestBed.configureTestingModule({
      declarations: [TabsPage],
      providers: [
        { provide: AccessibilityPreferencesService, useValue: accessibilityPreferencesService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks tab icons as decorative and keeps text labels visible', () => {
    const tabBar = fixture.nativeElement.querySelector('ion-tab-bar') as HTMLElement;
    const tabButtons = Array.from(
      fixture.nativeElement.querySelectorAll('ion-tab-button'),
    ) as HTMLElement[];
    const tabIcons = Array.from(
      fixture.nativeElement.querySelectorAll('ion-tab-button ion-icon'),
    ) as HTMLElement[];
    expect(tabBar.getAttribute('aria-label')).toBe('Primary app sections');
    expect(tabButtons.length).toBe(4);
    expect(tabButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Open Explore tab',
      'Open Navigate tab',
      'Open Community tab',
      'Open Profile tab',
    ]);
    expect(tabIcons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBeTrue();
    expect([
      component.t(component.copy.explore),
      component.t(component.copy.navigate),
      component.t(component.copy.community),
      component.t(component.copy.profile),
    ]).toEqual([
      'Explore',
      'Navigate',
      'Community',
      'Profile',
    ]);
  });

  it('renders localized tab labels from the saved app language', () => {
    const malayPreferences = {
      ...preferences,
      language: 'BM' as const,
    };
    accessibilityPreferencesService.getPreferences.and.returnValue(malayPreferences);
    preferences$.next(malayPreferences);

    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const tabButtons = Array.from(
      fixture.nativeElement.querySelectorAll('ion-tab-button'),
    ) as HTMLElement[];
    const tabBar = fixture.nativeElement.querySelector('ion-tab-bar') as HTMLElement;

    expect(tabBar.getAttribute('aria-label')).toBe('Bahagian utama aplikasi');
    expect(tabButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Buka tab Teroka',
      'Buka tab Navigasi',
      'Buka tab Komuniti',
      'Buka tab Profil',
    ]);
    expect([
      component.t(component.copy.explore),
      component.t(component.copy.navigate),
      component.t(component.copy.community),
      component.t(component.copy.profile),
    ]).toEqual([
      'Teroka',
      'Navigasi',
      'Komuniti',
      'Profil',
    ]);
  });

  it('toggles the hovered class on the shared tab bar state', () => {
    const tabBar = fixture.nativeElement.querySelector('ion-tab-bar') as HTMLElement;

    expect(tabBar.classList.contains('tab-bar-hovered')).toBeFalse();

    component.isHovered = true;
    fixture.detectChanges();

    expect(tabBar.classList.contains('tab-bar-hovered')).toBeTrue();
  });
});
