import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'EN' | 'BM';
export type TextSize = 'Standard' | 'Large' | 'Extra large';

export interface AccessibilitySettings {
  contrast: boolean;
  motion: boolean;
  underline: boolean;
  reader: boolean;
  voice: boolean;
  wheelchair: boolean;
}

export type AccessibilitySettingKey = keyof AccessibilitySettings;

export interface AccessibilityPreferences {
  language: AppLanguage;
  textSize: TextSize;
  settings: AccessibilitySettings;
}

type PartialAccessibilityPreferences = Partial<Omit<AccessibilityPreferences, 'settings'>> & {
  settings?: Partial<AccessibilitySettings>;
};

export function createDefaultAccessibilityPreferences(): AccessibilityPreferences {
  return {
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
}

@Injectable({
  providedIn: 'root',
})
export class AccessibilityPreferencesService {
  private readonly storageKey = 'mytravel.accessibility-preferences';
  private readonly document = inject(DOCUMENT);
  private readonly preferencesSubject = new BehaviorSubject<AccessibilityPreferences>(createDefaultAccessibilityPreferences());

  readonly preferences$ = this.preferencesSubject.asObservable();

  initialize(): void {
    const preferences = this.loadPreferences();
    this.preferencesSubject.next(preferences);
    this.applyPreferences(preferences);
  }

  getPreferences(): AccessibilityPreferences {
    return this.clonePreferences(this.preferencesSubject.value);
  }

  savePreferences(preferences: AccessibilityPreferences): AccessibilityPreferences {
    const normalized = this.normalizePreferences(preferences);
    this.preferencesSubject.next(normalized);
    this.persistPreferences(normalized);
    this.applyPreferences(normalized);
    return this.clonePreferences(normalized);
  }

  setLanguage(language: AppLanguage): AccessibilityPreferences {
    return this.savePreferences({
      ...this.preferencesSubject.value,
      language,
    });
  }

  resetPreferences(): AccessibilityPreferences {
    return this.savePreferences(createDefaultAccessibilityPreferences());
  }

  private loadPreferences(): AccessibilityPreferences {
    if (!this.canUseStorage()) {
      return createDefaultAccessibilityPreferences();
    }

    try {
      const rawPreferences = globalThis.localStorage.getItem(this.storageKey);

      if (!rawPreferences) {
        return createDefaultAccessibilityPreferences();
      }

      return this.normalizePreferences(JSON.parse(rawPreferences) as PartialAccessibilityPreferences);
    } catch {
      return createDefaultAccessibilityPreferences();
    }
  }

  private persistPreferences(preferences: AccessibilityPreferences): void {
    if (!this.canUseStorage()) {
      return;
    }

    try {
      globalThis.localStorage.setItem(this.storageKey, JSON.stringify(preferences));
    } catch {
      // Ignore storage write failures and keep the in-memory preferences active.
    }
  }

  private applyPreferences(preferences: AccessibilityPreferences): void {
    const rootElement = this.document.documentElement;
    const textScale = this.getTextScale(preferences.textSize);

    rootElement.style.setProperty('--mt-text-scale', textScale);
    rootElement.classList.toggle('mt-high-contrast', preferences.settings.contrast);
    rootElement.classList.toggle('mt-reduce-motion', preferences.settings.motion);
    rootElement.classList.toggle('mt-underline-links', preferences.settings.underline);
    rootElement.classList.toggle('mt-reader-enhanced', preferences.settings.reader);
    rootElement.setAttribute('data-app-language', preferences.language);
    rootElement.setAttribute('data-voice-guidance', String(preferences.settings.voice));
    rootElement.setAttribute('data-wheelchair-routes', String(preferences.settings.wheelchair));
  }

  private normalizePreferences(preferences: PartialAccessibilityPreferences): AccessibilityPreferences {
    const defaults = createDefaultAccessibilityPreferences();
    const settings = preferences.settings ?? {};

    return {
      language: preferences.language === 'BM' ? 'BM' : defaults.language,
      textSize: this.isTextSize(preferences.textSize) ? preferences.textSize : defaults.textSize,
      settings: {
        contrast: this.toBoolean(settings.contrast, defaults.settings.contrast),
        motion: this.toBoolean(settings.motion, defaults.settings.motion),
        underline: this.toBoolean(settings.underline, defaults.settings.underline),
        reader: this.toBoolean(settings.reader, defaults.settings.reader),
        voice: this.toBoolean(settings.voice, defaults.settings.voice),
        wheelchair: this.toBoolean(settings.wheelchair, defaults.settings.wheelchair),
      },
    };
  }

  private clonePreferences(preferences: AccessibilityPreferences): AccessibilityPreferences {
    return {
      language: preferences.language,
      textSize: preferences.textSize,
      settings: { ...preferences.settings },
    };
  }

  private getTextScale(textSize: TextSize): string {
    switch (textSize) {
      case 'Large':
        return '1.08';
      case 'Extra large':
        return '1.16';
      default:
        return '1';
    }
  }

  private isTextSize(value: unknown): value is TextSize {
    return value === 'Standard' || value === 'Large' || value === 'Extra large';
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private canUseStorage(): boolean {
    return typeof globalThis.localStorage !== 'undefined';
  }
}
