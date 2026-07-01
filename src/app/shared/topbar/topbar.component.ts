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
      ? 'Switch app language to Malay'
      : 'Tukar bahasa aplikasi ke Bahasa Inggeris';
  }

  get notificationsAriaLabel(): string {
    if (this.notificationCount > 0) {
      return this.language === 'EN'
        ? `Notifications, ${this.notificationCount} saved notices`
        : `Pemberitahuan, ${this.notificationCount} notis disimpan`;
    }

    return this.language === 'EN' ? 'Notifications' : 'Pemberitahuan';
  }
}
