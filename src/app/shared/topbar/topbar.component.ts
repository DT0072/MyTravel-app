import { Component, EventEmitter, Input, Output } from '@angular/core';

type AppLanguage = 'EN' | 'BM';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  standalone: false,
})
export class TopbarComponent {
  @Input() light = false;
  @Input() extraClass = '';
  @Input() language: AppLanguage = 'EN';
  @Input() showNotification = true;
  @Input() showLanguageToggle = true;
  @Input() notificationCount = 0;

  @Output() languageChange = new EventEmitter<AppLanguage>();
  @Output() notificationClick = new EventEmitter<void>();

  get classes(): string[] {
    return ['mt-topbar', this.light ? 'light' : '', this.extraClass].filter(Boolean);
  }

  toggleLanguage(): void {
    this.languageChange.emit(this.language === 'EN' ? 'BM' : 'EN');
  }

  openNotifications(): void {
    this.notificationClick.emit();
  }

  get languageToggleAriaLabel(): string {
    return this.language === 'EN'
      ? 'App language is English. Switch app language to Malay'
      : 'Bahasa aplikasi ialah Bahasa Melayu. Tukar bahasa aplikasi ke Bahasa Inggeris';
  }

  get brandLogoAlt(): string {
    return this.language === 'EN'
      ? 'Tourism Malaysia logo'
      : 'Logo Tourism Malaysia';
  }

  get notificationsAriaLabel(): string {
    if (this.notificationCount > 0) {
      const noticeLabel = this.notificationCount === 1 ? 'saved notice' : 'saved notices';

      return this.language === 'EN'
        ? `Notifications, ${this.notificationCount} ${noticeLabel}`
        : `Pemberitahuan, ${this.notificationCount} notis disimpan`;
    }

    return this.language === 'EN'
      ? 'Notifications, no saved notices'
      : 'Pemberitahuan, tiada notis disimpan';
  }

  get notificationBadgeLabel(): string {
    return this.notificationCount > 99 ? '99+' : `${this.notificationCount}`;
  }
}
