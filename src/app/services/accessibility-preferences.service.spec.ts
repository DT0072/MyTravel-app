import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import {
  AccessibilityPreferencesService,
  createDefaultAccessibilityPreferences,
} from './accessibility-preferences.service';

describe('AccessibilityPreferencesService', () => {
  const storageKey = 'mytravel.accessibility-preferences';
  let service: AccessibilityPreferencesService;

  beforeEach(() => {
    globalThis.localStorage.removeItem(storageKey);

    TestBed.configureTestingModule({
      providers: [
        AccessibilityPreferencesService,
        { provide: DOCUMENT, useValue: document },
      ],
    });

    service = TestBed.inject(AccessibilityPreferencesService);
  });

  afterEach(() => {
    globalThis.localStorage.removeItem(storageKey);
    document.documentElement.removeAttribute('data-app-language');
    document.documentElement.removeAttribute('data-voice-guidance');
    document.documentElement.removeAttribute('data-wheelchair-routes');
    document.documentElement.classList.remove(
      'mt-high-contrast',
      'mt-reduce-motion',
      'mt-underline-links',
      'mt-reader-enhanced',
    );
    document.documentElement.style.removeProperty('--mt-text-scale');
  });

  it('loads defaults and applies document accessibility attributes', () => {
    service.initialize();

    expect(service.getPreferences()).toEqual(createDefaultAccessibilityPreferences());
    expect(document.documentElement.getAttribute('data-app-language')).toBe('EN');
    expect(document.documentElement.getAttribute('data-wheelchair-routes')).toBe('true');
    expect(document.documentElement.classList.contains('mt-high-contrast')).toBeTrue();
  });

  it('keeps preferences usable when browser storage access is blocked', () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => {
          throw new Error('Storage access blocked');
        },
      });

      expect(() => service.initialize()).not.toThrow();
      expect(() => service.setLanguage('BM')).not.toThrow();
      expect(service.getPreferences().language).toBe('BM');
      expect(document.documentElement.getAttribute('data-app-language')).toBe('BM');
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
      }
    }
  });
});
