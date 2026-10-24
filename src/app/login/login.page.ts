import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccessibilityPreferencesService, AppLanguage } from '../services/accessibility-preferences.service';
import { AuthService, TravelerType } from '../services/auth.service';

type LocalizedText = Record<AppLanguage, string>;

export const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
];

export const COMMON_NATIONALITIES = [
  'Singapore',
  'Indonesia',
  'China',
  'Australia',
  'United Kingdom',
  'Japan',
  'South Korea',
  'Thailand',
  'United States',
  'India',
  'Germany',
  'France',
  'Philippines',
  'Vietnam',
  'Taiwan',
  'Netherlands',
  'Canada',
  'Other Country',
];

const LOGIN_COPY = {
  pageTitle: { EN: 'Sign In', BM: 'Log Masuk' },
  welcome: { EN: 'Welcome to MyTravel', BM: 'Selamat Datang ke MyTravel' },
  subtitle: {
    EN: 'Your digital companion for sustainable transit and passport collection across Malaysia.',
    BM: 'Rakan digital anda untuk transit lestari dan koleksi pasport di seluruh Malaysia.',
  },
  signInTab: { EN: 'Sign In', BM: 'Log Masuk' },
  registerTab: { EN: 'Create Account', BM: 'Daftar Akaun' },
  fullName: { EN: 'Full name', BM: 'Nama penuh' },
  fullNamePlaceholder: { EN: 'e.g. John Doe', BM: 'cth. John Doe' },
  email: { EN: 'Email address', BM: 'Alamat e-mel' },
  emailPlaceholder: { EN: 'traveller@example.com', BM: 'pengembara@example.com' },
  password: { EN: 'Password', BM: 'Kata laluan' },
  passwordPlaceholder: { EN: 'Min. 6 characters', BM: 'Min. 6 aksara' },
  signInAction: { EN: 'Sign In', BM: 'Log Masuk' },
  registerAction: { EN: 'Create Account', BM: 'Daftar Akaun' },
  or: { EN: 'or', BM: 'atau' },
  guestAction: { EN: 'Continue as Guest', BM: 'Teruskan sebagai Tetamu' },
  guestNotice: {
    EN: 'Guests can explore routes and features without syncing across devices.',
    BM: 'Tetamu boleh meneroka laluan dan ciri tanpa penyegerakan merentas peranti.',
  },
  travelerTypePrompt: { EN: 'Select Traveler Identity', BM: 'Pilih Identiti Pengembara' },
  malaysianCitizen: { EN: 'Malaysian Citizen', BM: 'Warganegara Malaysia' },
  foreignTraveller: { EN: 'Foreign Traveller', BM: 'Pelancong Luar Negara' },
  mykadLabel: { EN: 'MyKad / NRIC Number', BM: 'Nombor MyKad / Kad Pengenalan' },
  mykadPlaceholder: { EN: 'e.g. 010203-10-5678 (12 digits)', BM: 'cth. 010203-10-5678 (12 digit)' },
  mykadHelper: {
    EN: 'Instant verification with 12-digit MyKad for domestic transit benefits.',
    BM: 'Pengesahan MyKad 12-digit untuk manfaat dan subsidi transit domestik.',
  },
  homeStateLabel: { EN: 'State of Origin / Residence', BM: 'Negeri Asal / Kediaman' },
  passportLabel: { EN: 'Passport Number', BM: 'Nombor Pasport' },
  passportPlaceholder: { EN: 'e.g. A12345678', BM: 'cth. A12345678' },
  passportHelper: {
    EN: 'Official passport number for tourist verification & VM2026 stamps.',
    BM: 'Nombor pasport rasmi untuk pengesahan pelancong & cop VM2026.',
  },
  nationalityLabel: { EN: 'Country of Origin / Nationality', BM: 'Negara Asal / Kewarganegaraan' },
  invalidMyKad: {
    EN: 'Please enter a valid 12-digit Malaysian MyKad number (e.g. 010203-10-5678).',
    BM: 'Sila masukkan nombor MyKad Malaysia 12-digit yang sah (cth. 010203-10-5678).',
  },
  invalidPassport: {
    EN: 'Please enter a valid passport number (min. 6 characters).',
    BM: 'Sila masukkan nombor pasport yang sah (min. 6 aksara).',
  },
  selectHomeState: { EN: 'Please select your state of origin.', BM: 'Sila pilih negeri asal anda.' },
  selectNationality: { EN: 'Please select your nationality.', BM: 'Sila pilih kewarganegaraan anda.' },
  verifiedBadgeMalaysian: {
    EN: 'Verified Malaysian Citizen — Local benefits & digital passport ready',
    BM: 'Warganegara Malaysia Disahkan — Manfaat tempatan & pasport digital sedia',
  },
  verifiedBadgeForeign: {
    EN: 'Verified International Traveller — VM2026 digital stamp collector ready',
    BM: 'Pelancong Antarabangsa Disahkan — Pengumpul cop digital VM2026 sedia',
  },
  successLogin: { EN: 'Welcome back!', BM: 'Selamat kembali!' },
  successRegister: { EN: 'Account created! Welcome to MyTravel.', BM: 'Akaun dicipta! Selamat datang ke MyTravel.' },
  successRegisterMalaysian: {
    EN: 'Account created! Verified as Malaysian Citizen.',
    BM: 'Akaun dicipta! Disahkan sebagai Warganegara Malaysia.',
  },
  successRegisterForeign: {
    EN: 'Account created! Verified as Foreign Traveller.',
    BM: 'Akaun dicipta! Disahkan sebagai Pelancong Luar Negara.',
  },
  successGuest: { EN: 'Exploring as guest', BM: 'Meneroka sebagai tetamu' },
  missingFields: { EN: 'Please complete all required fields.', BM: 'Sila lengkapkan semua ruangan yang diperlukan.' },
  passwordShort: { EN: 'Password must be at least 6 characters.', BM: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' },
  authFailed: { EN: 'Invalid email or password. Please try again.', BM: 'E-mel atau kata laluan tidak sah. Sila cuba lagi.' },
  emailInUse: { EN: 'This email is already registered. Please sign in.', BM: 'E-mel ini telah didaftarkan. Sila log masuk.' },
  invalidEmail: { EN: 'Please enter a valid email address.', BM: 'Sila masukkan alamat e-mel yang sah.' },
  networkError: { EN: 'Network error. Please check your internet connection.', BM: 'Ralat rangkaian. Sila semak sambungan internet anda.' },
  tooManyRequests: { EN: 'Too many attempts. Please try again later.', BM: 'Terlalu banyak percubaan. Sila cuba sebentar lagi.' },
};

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly a11y = inject(AccessibilityPreferencesService);

  readonly copy = LOGIN_COPY;
  mode: 'signin' | 'register' = 'signin';
  email = '';
  password = '';
  name = '';
  travelerType: TravelerType = 'malaysian';
  idNumber = '';
  homeState = 'Kuala Lumpur';
  nationality = 'Singapore';
  malaysianStates = MALAYSIAN_STATES;
  nationalities = COMMON_NATIONALITIES;
  showPassword = false;
  loading = false;
  errorMessage = '';
  toast = '';
  language: AppLanguage = this.a11y.getPreferences().language;

  t(text: LocalizedText): string {
    return text[this.language];
  }

  updateLanguage(lang: AppLanguage): void {
    this.language = lang;
    this.a11y.setLanguage(lang);
  }

  setMode(mode: 'signin' | 'register'): void {
    this.mode = mode;
    this.errorMessage = '';
  }

  goBack(): void {
    void this.router.navigate(['/tabs/tab1']);
  }

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage = this.t(this.copy.missingFields);
      return;
    }

    if (this.mode === 'register') {
      if (!this.name.trim()) {
        this.errorMessage = this.t(this.copy.missingFields);
        return;
      }

      if (this.travelerType === 'malaysian') {
        const cleanMyKad = this.idNumber.replace(/[^0-9]/g, '');
        if (cleanMyKad.length !== 12) {
          this.errorMessage = this.t(this.copy.invalidMyKad);
          return;
        }
        if (!this.homeState) {
          this.errorMessage = this.t(this.copy.selectHomeState);
          return;
        }
      } else {
        const cleanPassport = this.idNumber.trim();
        if (cleanPassport.length < 6) {
          this.errorMessage = this.t(this.copy.invalidPassport);
          return;
        }
        if (!this.nationality) {
          this.errorMessage = this.t(this.copy.selectNationality);
          return;
        }
      }
    }

    if (this.password.length < 6) {
      this.errorMessage = this.t(this.copy.passwordShort);
      return;
    }

    this.loading = true;

    try {
      if (this.mode === 'signin') {
        await this.auth.login(this.email.trim(), this.password);
        this.showToast(this.t(this.copy.successLogin));
      } else {
        await this.auth.register(this.email.trim(), this.password, this.name.trim(), {
          travelerType: this.travelerType,
          idNumber: this.idNumber.trim(),
          homeState: this.travelerType === 'malaysian' ? this.homeState : undefined,
          nationality: this.travelerType === 'foreign' ? this.nationality : 'Malaysia',
        });
        const successMsg = this.travelerType === 'malaysian'
          ? this.t(this.copy.successRegisterMalaysian)
          : this.t(this.copy.successRegisterForeign);
        this.showToast(successMsg);
      }

      setTimeout(() => {
        void this.router.navigate(['/tabs/tab4']);
      }, 500);
    } catch (err: unknown) {
      const errorMsg = (err as { code?: string })?.code || '';
      if (errorMsg === 'auth/email-already-in-use') {
        this.errorMessage = this.t(this.copy.emailInUse);
      } else if (errorMsg === 'auth/invalid-email') {
        this.errorMessage = this.t(this.copy.invalidEmail);
      } else if (errorMsg === 'auth/network-request-failed') {
        this.errorMessage = this.t(this.copy.networkError);
      } else if (errorMsg === 'auth/too-many-requests') {
        this.errorMessage = this.t(this.copy.tooManyRequests);
      } else {
        this.errorMessage = this.t(this.copy.authFailed);
      }
    } finally {
      this.loading = false;
    }
  }

  continueAsGuest(): void {
    this.auth.loginAsGuest();
    this.showToast(this.t(this.copy.successGuest));
    setTimeout(() => {
      void this.router.navigate(['/tabs/tab1']);
    }, 400);
  }

  private showToast(message: string): void {
    this.toast = message;
    setTimeout(() => {
      this.toast = '';
    }, 2400);
  }
}
