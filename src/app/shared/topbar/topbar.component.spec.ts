import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopbarComponent } from './topbar.component';

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let originalTextScale: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TopbarComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
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

  it('builds accessible notification labels with singular and plural counts', () => {
    component.notificationCount = 1;
    component.language = 'EN';
    expect(component.notificationsAriaLabel).toBe('Notifications, 1 saved notice');

    component.notificationCount = 3;
    expect(component.notificationsAriaLabel).toBe('Notifications, 3 saved notices');
  });

  it('describes the zero-notification state in both supported languages', () => {
    component.notificationCount = 0;
    component.language = 'EN';
    expect(component.notificationsAriaLabel).toBe('Notifications, no saved notices');

    component.language = 'BM';
    expect(component.notificationsAriaLabel).toBe('Pemberitahuan, tiada notis disimpan');
  });

  it('localizes the Tourism Malaysia logo alt text', () => {
    component.language = 'EN';
    expect(component.brandLogoAlt).toBe('Tourism Malaysia logo');

    component.language = 'BM';
    expect(component.brandLogoAlt).toBe('Logo Tourism Malaysia');
  });

  it('describes the current language and next language action', () => {
    component.language = 'EN';
    expect(component.languageToggleAriaLabel).toBe('App language is English. Switch app language to Malay');

    component.language = 'BM';
    expect(component.languageToggleAriaLabel).toBe('Bahasa aplikasi ialah Bahasa Melayu. Tukar bahasa aplikasi ke Bahasa Inggeris');
  });

  it('localizes the notification aria label in Bahasa Melayu', () => {
    component.language = 'BM';
    component.notificationCount = 2;

    expect(component.notificationsAriaLabel).toBe('Pemberitahuan, 2 notis disimpan');
  });

  it('renders the notification badge as decorative when present', () => {
    component.notificationCount = 2;
    fixture.detectChanges();

    const notificationButton = fixture.nativeElement.querySelector('.mt-icon-button') as HTMLButtonElement;
    const notificationBadge = fixture.nativeElement.querySelector('.topbar-notice-dot') as HTMLElement;

    expect(notificationButton.getAttribute('aria-label')).toBe('Notifications, 2 saved notices');
    expect(notificationBadge.getAttribute('aria-hidden')).toBe('true');
  });

  it('clamps large notification badge counts without losing the full accessibility label', () => {
    component.notificationCount = 128;
    component.language = 'EN';
    fixture.detectChanges();

    const notificationButton = fixture.nativeElement.querySelector('.mt-icon-button') as HTMLButtonElement;
    const notificationBadge = fixture.nativeElement.querySelector('.topbar-notice-dot') as HTMLElement;

    expect(component.notificationBadgeLabel).toBe('99+');
    expect(notificationBadge.textContent?.trim()).toBe('99+');
    expect(notificationButton.getAttribute('aria-label')).toBe('Notifications, 128 saved notices');
  });

  it('keeps decorative topbar glyphs out of the accessibility tree', () => {
    fixture.detectChanges();

    const wordmark = fixture.nativeElement.querySelector('.mt-wordmark') as HTMLElement;
    const languageFragments = Array.from(
      fixture.nativeElement.querySelectorAll('.mt-language span, .mt-language strong'),
    ) as HTMLElement[];

    expect(wordmark.tagName.toLowerCase()).toBe('div');
    expect(wordmark.getAttribute('aria-hidden')).toBe('true');
    languageFragments.forEach((fragment) => {
      expect(fragment.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('scales topbar control typography with the shared text-size preference', () => {
    document.documentElement.style.setProperty('--mt-text-scale', '1.4');
    component.notificationCount = 2;
    fixture.detectChanges();

    const languageButton = fixture.nativeElement.querySelector('.mt-language') as HTMLButtonElement;
    const notificationButton = fixture.nativeElement.querySelector('.mt-icon-button') as HTMLButtonElement;
    const notificationBadge = fixture.nativeElement.querySelector('.topbar-notice-dot') as HTMLElement;

    expect(parseFloat(getComputedStyle(languageButton).fontSize)).toBeGreaterThan(11);
    expect(parseFloat(getComputedStyle(notificationButton).fontSize)).toBeGreaterThan(18);
    expect(parseFloat(getComputedStyle(notificationBadge).fontSize)).toBeGreaterThan(9);
  });

  it('scales the home topbar selected-language pill with the shared text-size preference', () => {
    document.documentElement.style.setProperty('--mt-text-scale', '1.4');
    component.extraClass = 'home-topbar';
    component.language = 'EN';
    fixture.detectChanges();

    const selectedLanguagePill = fixture.nativeElement.querySelector('.home-topbar .mt-language strong') as HTMLElement;
    const topActions = fixture.nativeElement.querySelector('.mt-top-actions') as HTMLElement;

    expect(parseFloat(getComputedStyle(selectedLanguagePill).paddingTop)).toBeGreaterThan(8);
    expect(parseFloat(getComputedStyle(selectedLanguagePill).borderTopLeftRadius)).toBeGreaterThan(14);
    expect(parseFloat(getComputedStyle(topActions).columnGap || getComputedStyle(topActions).gap)).toBeGreaterThan(5);
  });

  it('scales topbar layout rails and brand sizing with the shared text-size preference', () => {
    document.documentElement.style.setProperty('--mt-text-scale', '1.4');
    fixture.detectChanges();

    const topbar = fixture.nativeElement.querySelector('.mt-topbar') as HTMLElement;
    const brand = fixture.nativeElement.querySelector('.mt-brand') as HTMLImageElement;

    expect(parseFloat(getComputedStyle(topbar).minHeight)).toBeGreaterThan(45);
    expect(parseFloat(getComputedStyle(topbar).columnGap || getComputedStyle(topbar).gap)).toBeGreaterThan(6);
    expect(parseFloat(getComputedStyle(brand).width)).toBeGreaterThan(72);
    expect(parseFloat(getComputedStyle(brand).height)).toBeGreaterThan(34);
  });

  it('emits the next language and notification click actions', () => {
    const languageSpy = spyOn(component.languageChange, 'emit');
    const notificationSpy = spyOn(component.notificationClick, 'emit');

    component.language = 'EN';
    component.toggleLanguage();
    component.openNotifications();

    expect(languageSpy).toHaveBeenCalledWith('BM');
    expect(notificationSpy).toHaveBeenCalled();
  });
});
