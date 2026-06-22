import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'ion-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  standalone: false,
})
export class TopbarComponent {
  @Input() light = false;
  @Input() extraClass = '';
  @Input() language: 'EN' | 'BM' = 'EN';
  @Input() showNotification = true;
  @Input() showLanguageToggle = true;
  @Input() notificationBadge = false;

  @Output() languageChange = new EventEmitter<'EN' | 'BM'>();
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
}
