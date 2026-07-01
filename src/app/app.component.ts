import { Component, inject } from '@angular/core';
import { AccessibilityPreferencesService } from './services/accessibility-preferences.service';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);

  constructor() {
    this.accessibilityPreferencesService.initialize();
    this.appStateService.initialize();
  }
}
