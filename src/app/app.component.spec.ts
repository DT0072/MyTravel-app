import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AccessibilityPreferencesService } from './services/accessibility-preferences.service';
import { AppStateService } from './services/app-state.service';

describe('AppComponent', () => {
  const accessibilityPreferencesService = jasmine.createSpyObj<AccessibilityPreferencesService>(
    'AccessibilityPreferencesService',
    ['initialize'],
  );
  const appStateService = jasmine.createSpyObj<AppStateService>('AppStateService', ['initialize']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        { provide: AccessibilityPreferencesService, useValue: accessibilityPreferencesService },
        { provide: AppStateService, useValue: appStateService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(accessibilityPreferencesService.initialize).toHaveBeenCalled();
    expect(appStateService.initialize).toHaveBeenCalled();
  });

});
