import { Component, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import {
  AccessibilityPreferencesService,
  AppLanguage,
} from '../services/accessibility-preferences.service';

type LocalizedText = Record<AppLanguage, string>;
type TabKey = 'explore' | 'navigate' | 'community' | 'profile';

const TABS_COPY = {
  tabBarAria: { EN: 'Primary app sections', BM: 'Bahagian utama aplikasi' },
  explore: { EN: 'Explore', BM: 'Teroka' },
  navigate: { EN: 'Navigate', BM: 'Navigasi' },
  community: { EN: 'Community', BM: 'Komuniti' },
  profile: { EN: 'Profile', BM: 'Profil' },
  exploreTabAria: { EN: 'Open Explore tab', BM: 'Buka tab Teroka' },
  navigateTabAria: { EN: 'Open Navigate tab', BM: 'Buka tab Navigasi' },
  communityTabAria: { EN: 'Open Community tab', BM: 'Buka tab Komuniti' },
  profileTabAria: { EN: 'Open Profile tab', BM: 'Buka tab Profil' },
} as const;

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnDestroy {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly preferencesSubscription = new Subscription();
  readonly copy = TABS_COPY;
  language: AppLanguage = 'EN';
  isHovered = false;

  constructor() {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.preferencesSubscription.add(
      this.accessibilityPreferencesService.preferences$.subscribe((preferences) => {
        this.language = preferences.language;
      }),
    );
  }

  ngOnDestroy(): void {
    this.preferencesSubscription.unsubscribe();
  }

  t(text: LocalizedText): string {
    return text[this.language];
  }

  tabAriaLabel(tab: TabKey): string {
    switch (tab) {
      case 'navigate':
        return this.t(this.copy.navigateTabAria);
      case 'community':
        return this.t(this.copy.communityTabAria);
      case 'profile':
        return this.t(this.copy.profileTabAria);
      default:
        return this.t(this.copy.exploreTabAria);
    }
  }
}
