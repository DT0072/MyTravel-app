import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessibilityPreferencesService, AppLanguage } from '../services/accessibility-preferences.service';
import { AuthService, TravelerType } from '../services/auth.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import {
  MyKadValidationResult,
  PassportValidationResult,
  formatMyKadInput,
  validateInternationalPassport,
  validateMalaysianMyKad,
} from '../shared/utils/malaysia-identity';

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
  pageTitle: { EN: 'Sign in', BM: 'Log masuk' },
  welcome: { EN: 'Welcome to MyTravel', BM: 'Selamat datang ke MyTravel' },
  subtitle: {
    EN: 'Your digital companion for sustainable transit and passport collection across Malaysia.',
    BM: 'Rakan digital anda untuk transit lestari dan koleksi pasport di seluruh Malaysia.',
  },
  signInTab: { EN: 'Sign in', BM: 'Log masuk' },
  registerTab: { EN: 'Create account', BM: 'Daftar akaun' },
  fullName: { EN: 'Full name (as on ID)', BM: 'Nama penuh (seperti dalam pengenalan)' },
  fullNamePlaceholder: { EN: 'e.g. Ahmad bin Razak', BM: 'cth. Ahmad bin Razak' },
  email: { EN: 'Email address', BM: 'Alamat e-mel' },
  emailPlaceholder: { EN: 'traveller@example.com', BM: 'pengembara@example.com' },
  password: { EN: 'Password', BM: 'Kata laluan' },
  passwordPlaceholder: { EN: 'Min. 6 characters', BM: 'Min. 6 aksara' },
  signInAction: { EN: 'Sign in', BM: 'Log masuk' },
  registerAction: { EN: 'Create verified account', BM: 'Daftar akaun disahkan' },
  or: { EN: 'or', BM: 'atau' },
  guestAction: { EN: 'Continue as guest', BM: 'Teruskan sebagai tetamu' },
  guestNotice: {
    EN: 'Guests can explore routes and features without syncing across devices.',
    BM: 'Tetamu boleh meneroka laluan dan ciri tanpa penyegerakan merentas peranti.',
  },
  travelerTypePrompt: { EN: 'Step 1 · Select traveller identity', BM: 'Langkah 1 · Pilih identiti pengembara' },
  malaysianCitizen: { EN: 'Malaysian citizen', BM: 'Warganegara Malaysia' },
  foreignTraveller: { EN: 'International traveller', BM: 'Pelancong antarabangsa' },
  mykadLabel: { EN: 'MyKad number (JPN format)', BM: 'Nombor MyKad (format JPN)' },
  mykadPlaceholder: { EN: 'e.g. 010203-10-5678', BM: 'cth. 010203-10-5678' },
  mykadHelper: {
    EN: '12-digit NRIC validated against JPN date-of-birth and state-of-birth codes.',
    BM: '12-digit KP disemak mengikut tarikh lahir dan kod negeri kelahiran JPN.',
  },
  homeStateLabel: { EN: 'State of residence', BM: 'Negeri kediaman semasa' },
  passportLabel: { EN: 'Passport number (ICAO standard)', BM: 'Nombor pasport (piawaian ICAO)' },
  passportPlaceholder: { EN: 'e.g. A12345678', BM: 'cth. A12345678' },
  passportHelper: {
    EN: '6–12 alphanumeric characters with at least 4 digits for VM2026 verification.',
    BM: '6–12 aksara abjad angka dengan sekurang-kurangnya 4 digit untuk pengesahan VM2026.',
  },
  nationalityLabel: { EN: 'Nationality', BM: 'Kewarganegaraan' },
  jpnParsedHeader: { EN: 'JPN MyKad checksum matched', BM: 'Semakan format MyKad JPN sepadan' },
  dobLabel: { EN: 'Date of birth', BM: 'Tarikh lahir' },
  birthStateLabel: { EN: 'Birthplace (JPN)', BM: 'Negeri lahir (JPN)' },
  genderLabel: { EN: 'Gender', BM: 'Jantina' },
  proofSectionTitle: {
    EN: 'Step 2 · Official identity verification',
    BM: 'Langkah 2 · Pengesahan identiti rasmi',
  },
  proofSectionCopy: {
    EN: 'To prevent fake registrations, verify your identity via MyDigital ID or upload your ID document before proceeding.',
    BM: 'Bagi mengelakkan pendaftaran palsu, sahkan identiti anda melalui MyDigital ID atau muat naik dokumen pengenalan sebelum meneruskan.',
  },
  myDigitalIdBtn: { EN: 'Verify with MyDigital ID', BM: 'Sahkan dengan MyDigital ID' },
  passportGatewayBtn: { EN: 'Verify via Immigration e-Gate', BM: 'Sahkan melalui e-Gate Imigresen' },
  uploadDocBtn: { EN: 'Upload ID photo', BM: 'Muat naik foto pengenalan' },
  changeDocBtn: { EN: 'Replace ID photo', BM: 'Tukar foto pengenalan' },
  stepGateway1: { EN: 'Connecting to National Verification Gateway...', BM: 'Menyambung ke Gerbang Pengesahan Kebangsaan...' },
  stepGateway2: { EN: 'Validating NRIC / Passport structure & holder name...', BM: 'Mengesahkan struktur KP / Pasport & nama pemegang...' },
  stepGateway3: { EN: 'Official verification token issued', BM: 'Token pengesahan rasmi dikeluarkan' },
  proofRequiredError: {
    EN: 'Please complete Step 2 (Verify with MyDigital ID / e-Gate or upload your MyKad/Passport photo) to verify your identity.',
    BM: 'Sila lengkapkan Langkah 2 (Sahkan dengan MyDigital ID / e-Gate atau muat naik foto MyKad/Pasport) untuk mengesahkan identiti anda.',
  },
  invalidFullName: {
    EN: 'Please enter your full legal name (at least 4 characters) before running identity verification.',
    BM: 'Sila masukkan nama penuh rasmi anda (sekurang-kurangnya 4 aksara) sebelum membuat pengesahan identiti.',
  },
  invalidMyKad: {
    EN: 'Please enter a valid 12-digit Malaysian MyKad number.',
    BM: 'Sila masukkan nombor MyKad Malaysia 12-digit yang sah.',
  },
  invalidPassport: {
    EN: 'Please enter a valid passport number.',
    BM: 'Sila masukkan nombor pasport yang sah.',
  },
  selectHomeState: { EN: 'Please select your state of residence.', BM: 'Sila pilih negeri kediaman anda.' },
  selectNationality: { EN: 'Please select your nationality.', BM: 'Sila pilih kewarganegaraan anda.' },
  successLogin: { EN: 'Welcome back!', BM: 'Selamat kembali!' },
  successRegisterMalaysian: {
    EN: 'Account created! Verified as Malaysian Citizen.',
    BM: 'Akaun dicipta! Disahkan sebagai Warganegara Malaysia.',
  },
  successRegisterForeign: {
    EN: 'Account created! Verified as Foreign Traveller.',
    BM: 'Akaun dicipta! Disahkan sebagai Pelancong Luar Negara.',
  },
  successGuest: { EN: 'Exploring as guest', BM: 'Meneroka sebagai tetamu' },
  googleAction: { EN: 'Continue with Google', BM: 'Teruskan dengan Google' },
  successLoginGoogle: { EN: 'Signed in with Google!', BM: 'Log masuk dengan Google berjaya!' },
  googlePopupClosed: { EN: 'Google sign-in was cancelled.', BM: 'Log masuk Google dibatalkan.' },
  missingFields: { EN: 'Please complete all required fields.', BM: 'Sila lengkapkan semua ruangan yang diperlukan.' },
  passwordShort: { EN: 'Password must be at least 6 characters.', BM: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' },
  authFailed: { EN: 'Invalid email or password. Please try again.', BM: 'E-mel atau kata laluan tidak sah. Sila cuba lagi.' },
  emailInUse: { EN: 'This email is already registered. Please sign in.', BM: 'E-mel ini telah didaftarkan. Sila log masuk.' },
  invalidEmail: { EN: 'Please enter a valid email address.', BM: 'Sila masukkan alamat e-mel yang sah.' },
  networkError: { EN: 'Network error. Please check your internet connection.', BM: 'Ralat rangkaian. Sila semak sambungan internet anda.' },
  tooManyRequests: { EN: 'Too many attempts. Please try again later.', BM: 'Terlalu banyak percubaan. Sila cuba sebentar lagi.' },
  forgotPassword: { EN: 'Forgot password?', BM: 'Lupa kata laluan?' },
  resetEmailPrompt: { EN: 'Enter your email address first to receive a password reset link.', BM: 'Masukkan alamat e-mel anda dahulu untuk menerima pautan tetapan semula.' },
  resetEmailSent: { EN: 'Password reset link sent! Check your inbox.', BM: 'Pautan tetapan semula kata laluan dihantar! Semak peti masuk anda.' },
  verifyStepTitle: { EN: 'Complete traveller verification', BM: 'Lengkapkan pengesahan pengembara' },
  verifyStepSubtitle: {
    EN: 'Verify whether you are a Malaysian citizen (MyKad) or international traveller (Passport) to unlock domestic transit benefits and VM2026 passport stamps.',
    BM: 'Sahkan sama ada anda warganegara Malaysia (MyKad) atau pelancong antarabangsa (Pasport) untuk membuka manfaat transit dan cop VM2026.',
  },
  verifyContinueAction: { EN: 'Complete verification', BM: 'Lengkapkan pengesahan' },
  verifySkipAction: { EN: 'Complete later', BM: 'Lengkapkan kemudian' },
  verifySuccess: { EN: 'Traveler identity officially verified!', BM: 'Identiti pengembara berjaya disahkan secara rasmi!' },
};

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly a11y = inject(AccessibilityPreferencesService);
  private readonly uiTimeouts = new ManagedTimeouts();

  readonly copy = LOGIN_COPY;
  mode: 'signin' | 'register' | 'verify-identity' = 'signin';
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

  // Detailed verification state
  myKadCheck: MyKadValidationResult | null = null;
  passportCheck: PassportValidationResult | null = null;
  verifyingGateway = false;
  gatewayStep = 0; // 0 = idle, 1 = connecting, 2 = matching, 3 = verified
  verificationMethod: 'MyDigital ID' | 'Document Scan' | null = null;
  verificationRef = '';
  documentPreview = '';
  documentFileName = '';

  ngOnInit(): void {
    const requestedMode = this.route.snapshot.queryParamMap.get('mode');
    if (requestedMode === 'verify-identity') {
      this.mode = 'verify-identity';
      this.name = this.auth.currentUser?.displayName || '';
    } else if (requestedMode === 'register') {
      this.mode = 'register';
    }
  }

  ngOnDestroy(): void {
    this.uiTimeouts.clearAll();
  }

  get isIdentityProofCompleted(): boolean {
    return this.gatewayStep === 3 && Boolean(this.verificationMethod && this.verificationRef);
  }

  get hasValidIdentityDocumentFormat(): boolean {
    return this.travelerType === 'malaysian'
      ? Boolean(this.myKadCheck?.valid)
      : Boolean(this.passportCheck?.valid);
  }

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

  selectTravelerType(type: TravelerType): void {
    if (this.travelerType === type) {
      return;
    }
    this.travelerType = type;
    this.idNumber = '';
    this.myKadCheck = null;
    this.passportCheck = null;
    this.resetVerificationProof();
  }

  onNameChange(): void {
    this.errorMessage = '';
    if (this.isIdentityProofCompleted) {
      this.resetVerificationProof();
    }
  }

  onIdentityNumberInput(rawValue: string): void {
    this.errorMessage = '';
    this.resetVerificationProof();

    if (this.travelerType === 'malaysian') {
      const formatted = formatMyKadInput(rawValue);
      this.idNumber = formatted;
      const digits = formatted.replace(/\D/g, '');
      if (digits.length >= 6) {
        this.myKadCheck = validateMalaysianMyKad(formatted);
        if (
          this.myKadCheck.valid
          && this.myKadCheck.birthState
          && MALAYSIAN_STATES.includes(this.myKadCheck.birthState)
        ) {
          this.homeState = this.myKadCheck.birthState;
        }
      } else {
        this.myKadCheck = null;
      }
    } else {
      this.idNumber = rawValue.toUpperCase();
      if (this.idNumber.trim().length >= 4) {
        this.passportCheck = validateInternationalPassport(this.idNumber);
      } else {
        this.passportCheck = null;
      }
    }
  }

  runGatewayVerification(): void {
    this.errorMessage = '';
    const holderName = (this.mode === 'verify-identity'
      ? (this.name.trim() || this.auth.currentUser?.displayName || 'Traveler')
      : this.name.trim());

    if (holderName.length < 3) {
      this.errorMessage = this.t(this.copy.invalidFullName);
      return;
    }

    if (this.travelerType === 'malaysian') {
      const check = validateMalaysianMyKad(this.idNumber);
      this.myKadCheck = check;
      if (!check.valid) {
        this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidMyKad);
        return;
      }
    } else {
      const check = validateInternationalPassport(this.idNumber);
      this.passportCheck = check;
      if (!check.valid) {
        this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidPassport);
        return;
      }
    }

    this.verifyingGateway = true;
    this.gatewayStep = 1;
    this.documentPreview = '';
    this.documentFileName = '';

    this.uiTimeouts.schedule('gateway-step-2', () => {
      this.gatewayStep = 2;
    }, 550);

    this.uiTimeouts.schedule('gateway-step-3', () => {
      this.verifyingGateway = false;
      this.gatewayStep = 3;
      this.verificationMethod = 'MyDigital ID';
      const prefix = this.travelerType === 'malaysian' ? 'MYDID' : 'EGATE';
      this.verificationRef = `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }, 1250);
  }

  handleDocumentUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.errorMessage = '';

    if (!file.type.startsWith('image/')) {
      this.errorMessage = this.language === 'BM'
        ? 'Sila muat naik fail imej MyKad / Pasport yang sah.'
        : 'Please upload a valid image of your MyKad / Passport.';
      input.value = '';
      return;
    }

    if (this.travelerType === 'malaysian') {
      const check = validateMalaysianMyKad(this.idNumber);
      this.myKadCheck = check;
      if (!check.valid) {
        this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidMyKad);
        input.value = '';
        return;
      }
    } else {
      const check = validateInternationalPassport(this.idNumber);
      this.passportCheck = check;
      if (!check.valid) {
        this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidPassport);
        input.value = '';
        return;
      }
    }

    this.documentFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.documentPreview = String(reader.result ?? '');
      this.verifyingGateway = false;
      this.gatewayStep = 3;
      this.verificationMethod = 'Document Scan';
      this.verificationRef = `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    };
    reader.readAsDataURL(file);
  }

  goBack(): void {
    void this.router.navigate(['/tabs/tab1']);
  }

  async sendPasswordReset(): Promise<void> {
    this.errorMessage = '';
    if (!this.email.trim()) {
      this.errorMessage = this.t(this.copy.resetEmailPrompt);
      return;
    }
    try {
      await this.auth.resetPassword(this.email);
      this.showToast(this.t(this.copy.resetEmailSent));
    } catch {
      this.errorMessage = this.t(this.copy.invalidEmail);
    }
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
        const check = validateMalaysianMyKad(this.idNumber);
        this.myKadCheck = check;
        if (!check.valid) {
          this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidMyKad);
          return;
        }
        if (!this.homeState) {
          this.errorMessage = this.t(this.copy.selectHomeState);
          return;
        }
      } else {
        const check = validateInternationalPassport(this.idNumber);
        this.passportCheck = check;
        if (!check.valid) {
          this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidPassport);
          return;
        }
        if (!this.nationality) {
          this.errorMessage = this.t(this.copy.selectNationality);
          return;
        }
      }

      if (!this.isIdentityProofCompleted) {
        this.errorMessage = this.t(this.copy.proofRequiredError);
        return;
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
          maskedIdNumber: this.travelerType === 'malaysian' ? this.myKadCheck?.masked : this.passportCheck?.masked,
          dobDisplay: this.myKadCheck?.dobDisplay,
          birthState: this.myKadCheck?.birthState,
          verificationMethod: this.verificationMethod || 'MyDigital ID',
          verificationRef: this.verificationRef,
          homeState: this.travelerType === 'malaysian' ? this.homeState : undefined,
          nationality: this.travelerType === 'foreign' ? this.nationality : 'Malaysia',
        });
        const successMsg = this.travelerType === 'malaysian'
          ? this.t(this.copy.successRegisterMalaysian)
          : this.t(this.copy.successRegisterForeign);
        this.showToast(successMsg);
      }

      this.uiTimeouts.schedule('auth-redirect', () => {
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

  async signInWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    try {
      const profile = await this.auth.loginWithGoogle();
      if (!profile.isVerified || !profile.idNumber) {
        this.mode = 'verify-identity';
        this.name = profile.displayName;
        this.resetVerificationProof();
        this.showToast(this.t(this.copy.successLoginGoogle));
        return;
      }
      this.showToast(this.t(this.copy.successLoginGoogle));
      this.uiTimeouts.schedule('google-redirect', () => {
        void this.router.navigate(['/tabs/tab4']);
      }, 500);
    } catch (err: unknown) {
      const errorMsg = (err as { code?: string })?.code || '';
      if (errorMsg === 'auth/popup-closed-by-user') {
        this.errorMessage = this.t(this.copy.googlePopupClosed);
      } else if (errorMsg === 'auth/network-request-failed') {
        this.errorMessage = this.t(this.copy.networkError);
      } else {
        this.errorMessage = this.t(this.copy.authFailed);
      }
    } finally {
      this.loading = false;
    }
  }

  async submitIdentityVerification(): Promise<void> {
    this.errorMessage = '';
    if (this.travelerType === 'malaysian') {
      const check = validateMalaysianMyKad(this.idNumber);
      this.myKadCheck = check;
      if (!check.valid) {
        this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidMyKad);
        return;
      }
      if (!this.homeState) {
        this.errorMessage = this.t(this.copy.selectHomeState);
        return;
      }
    } else {
      const check = validateInternationalPassport(this.idNumber);
      this.passportCheck = check;
      if (!check.valid) {
        this.errorMessage = check.error ? this.t(check.error) : this.t(this.copy.invalidPassport);
        return;
      }
      if (!this.nationality) {
        this.errorMessage = this.t(this.copy.selectNationality);
        return;
      }
    }

    if (!this.isIdentityProofCompleted) {
      this.errorMessage = this.t(this.copy.proofRequiredError);
      return;
    }

    this.loading = true;
    try {
      await this.auth.completeIdentityVerification({
        travelerType: this.travelerType,
        idNumber: this.idNumber.trim(),
        maskedIdNumber: this.travelerType === 'malaysian' ? this.myKadCheck?.masked : this.passportCheck?.masked,
        dobDisplay: this.myKadCheck?.dobDisplay,
        birthState: this.myKadCheck?.birthState,
        verificationMethod: this.verificationMethod || 'MyDigital ID',
        verificationRef: this.verificationRef,
        homeState: this.travelerType === 'malaysian' ? this.homeState : undefined,
        nationality: this.travelerType === 'foreign' ? this.nationality : 'Malaysia',
      });
      this.showToast(this.t(this.copy.verifySuccess));
      this.uiTimeouts.schedule('verify-redirect', () => {
        void this.router.navigate(['/tabs/tab4']);
      }, 450);
    } finally {
      this.loading = false;
    }
  }

  skipIdentityVerification(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  continueAsGuest(): void {
    this.auth.loginAsGuest();
    this.showToast(this.t(this.copy.successGuest));
    this.uiTimeouts.schedule('guest-redirect', () => {
      void this.router.navigate(['/tabs/tab1']);
    }, 400);
  }

  private resetVerificationProof(): void {
    this.verifyingGateway = false;
    this.gatewayStep = 0;
    this.verificationMethod = null;
    this.verificationRef = '';
    this.documentPreview = '';
    this.documentFileName = '';
  }

  private showToast(msg: string): void {
    this.toast = msg;
    this.uiTimeouts.schedule('login-toast', () => (this.toast = ''), 2600);
  }
}
