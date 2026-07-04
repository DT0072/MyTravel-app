import { AppLanguage } from '../../services/accessibility-preferences.service';

export function getTransportModeLabel(language: AppLanguage, mode: string): string {
  switch (mode) {
    case 'Bus':
      return language === 'EN' ? 'Bus' : 'Bas';
    case 'Walk':
      return language === 'EN' ? 'Walk' : 'Jalan kaki';
    default:
      return mode;
  }
}
