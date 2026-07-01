import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AccessibilityPreferences,
  AccessibilityPreferencesService,
  AccessibilitySettingKey,
  AppLanguage,
  TextSize,
  createDefaultAccessibilityPreferences,
} from '../services/accessibility-preferences.service';
import { AppStateService, PointTransaction } from '../services/app-state.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import {
  PASSPORT_STAMP_DEFINITIONS,
  buildChallengeProgress,
  buildTravelProgress,
} from '../shared/utils/travel-progress';

type LocalizedText = Record<AppLanguage, string>;
type ProfileView = 'profile' | 'points' | 'passport' | 'accessibility' | 'challenges' | 'reward';
type TransactionFilter = 'All' | 'Earned' | 'Pending';
type PassportFilter = 'All' | 'States' | 'Federal Territories';
type ProfileMenuItemId =
  | 'contributions'
  | 'journey-history'
  | 'saved-destinations'
  | 'settings'
  | 'accessibility'
  | 'privacy'
  | 'help'
  | 'signout';

const PROFILE_COPY = {
  pageTitle: { EN: 'Profile', BM: 'Profil' },
  pageSubtitle: { EN: 'Manage your account, rewards and digital passport.', BM: 'Urus akaun, ganjaran dan pasport digital anda.' },
  travelerInitials: { EN: 'TR', BM: 'PG' },
  travelerName: { EN: 'Traveler', BM: 'Pengembara' },
  myDigitalVerified: { EN: '◆ MyDigital ID · Verified', BM: '◆ MyDigital ID · Disahkan' },
  ecoExplorer: { EN: 'Eco-Explorer', BM: 'Peneroka Eko' },
  ecoPoints: { EN: 'Eco-Points', BM: 'Mata Eko' },
  digitalPassport: { EN: 'Digital Passport', BM: 'Pasport Digital' },
  passportFiveOfSixteen: { EN: '5 of 16', BM: '5 daripada 16' },
  challengeBannerTitle: { EN: 'VM2026 challenges & rewards', BM: 'Cabaran & ganjaran VM2026' },
  challengeBannerCopy: { EN: 'Complete verified travel, community\nand passport missions.', BM: 'Lengkapkan misi perjalanan, komuniti\ndan pasport yang disahkan.' },
  accountSettings: { EN: 'Account & settings', BM: 'Akaun & tetapan' },
  menuContributions: { EN: 'My contributions', BM: 'Sumbangan saya' },
  menuContributionsCopy: { EN: 'Tips, verifications & shared information', BM: 'Tip, pengesahan & maklumat yang dikongsi' },
  menuJourneyHistory: { EN: 'Journey history', BM: 'Sejarah perjalanan' },
  menuJourneyHistoryCopy: { EN: 'Recent journeys & activities', BM: 'Perjalanan & aktiviti terkini' },
  menuSavedDestinations: { EN: 'Saved destinations', BM: 'Destinasi tersimpan' },
  menuSavedDestinationsCopy: { EN: 'Saved notices & destination reminders', BM: 'Notis tersimpan & peringatan destinasi' },
  menuSettings: { EN: 'Settings', BM: 'Tetapan' },
  menuSettingsCopy: { EN: 'Language, alerts & account preferences', BM: 'Bahasa, amaran & pilihan akaun' },
  menuAccessibility: { EN: 'Accessibility', BM: 'Kebolehcapaian' },
  menuAccessibilityCopy: { EN: 'Text size, contrast & accessibility support', BM: 'Saiz teks, kontras & sokongan kebolehcapaian' },
  menuPrivacy: { EN: 'Privacy & data', BM: 'Privasi & data' },
  menuPrivacyCopy: { EN: 'Permissions, privacy & data protection', BM: 'Kebenaran, privasi & perlindungan data' },
  menuHelp: { EN: 'Help', BM: 'Bantuan' },
  menuHelpCopy: { EN: 'FAQs, contact us & guides', BM: 'Soalan lazim, hubungi kami & panduan' },
  menuSignOut: { EN: 'Sign out', BM: 'Log keluar' },
  menuSignOutCopy: { EN: 'Sign out of your MyTravel account', BM: 'Log keluar daripada akaun MyTravel anda' },
  ecoPointsTitle: { EN: 'Eco-Points', BM: 'Mata Eko' },
  accessibilityLanguageTitle: { EN: 'Accessibility & Language', BM: 'Kebolehcapaian & Bahasa' },
  challengesTitle: { EN: 'MyTravel Challenges', BM: 'Cabaran MyTravel' },
  rewardTitle: { EN: 'VM2026 Reward', BM: 'Ganjaran VM2026' },
  backToProfile: { EN: 'Back to profile', BM: 'Kembali ke profil' },
  currentBalance: { EN: 'Current balance', BM: 'Baki semasa' },
  pointsLabel: { EN: 'points', BM: 'mata' },
  balanceCardCopy: { EN: '♧ Thank you!\nYour points support sustainable tourism in Malaysia.', BM: '♧ Terima kasih!\nMata anda menyokong pelancongan lestari di Malaysia.' },
  seasonTitle: { EN: 'VM2026 Challenge Season', BM: 'Musim Cabaran VM2026' },
  viewAllMissions: { EN: 'View all missions', BM: 'Lihat semua misi' },
  filterAll: { EN: 'All', BM: 'Semua' },
  filterEarned: { EN: 'Earned', BM: 'Diperoleh' },
  filterPending: { EN: 'Pending', BM: 'Menunggu' },
  transactionHistory: { EN: 'Transaction history', BM: 'Sejarah transaksi' },
  noTransactions: { EN: 'No {filter} transactions yet.', BM: 'Belum ada transaksi {filter}.' },
  howToEarn: { EN: 'How to earn points', BM: 'Cara mendapatkan mata' },
  earnTransit: { EN: 'Use public transport', BM: 'Gunakan pengangkutan awam' },
  earnTransitCopy: { EN: 'Earn points for verified journeys.', BM: 'Raih mata untuk perjalanan yang disahkan.' },
  earnVisits: { EN: 'Verified visits', BM: 'Lawatan disahkan' },
  earnVisitsCopy: { EN: 'Share and verify places you visit.', BM: 'Kongsi dan sahkan tempat yang anda lawati.' },
  earnCommunity: { EN: 'Community contributions', BM: 'Sumbangan komuniti' },
  earnCommunityCopy: { EN: 'Share useful tips and information.', BM: 'Kongsi tip dan maklumat yang berguna.' },
  earnVerification: { EN: 'Information verification', BM: 'Pengesahan maklumat' },
  earnVerificationCopy: { EN: 'Confirm locations and services.', BM: 'Sahkan lokasi dan perkhidmatan.' },
  viewRewards: { EN: 'View rewards', BM: 'Lihat ganjaran' },
  passportAll: { EN: 'All', BM: 'Semua' },
  passportStates: { EN: 'States', BM: 'Negeri' },
  passportFederal: { EN: 'Federal Territories', BM: 'Wilayah Persekutuan' },
  passportAllDestinations: { EN: 'All destinations (16)', BM: 'Semua destinasi (16)' },
  passportStateDestinations: { EN: 'States (13)', BM: 'Negeri (13)' },
  passportFederalDestinations: { EN: 'Federal Territories (3)', BM: 'Wilayah Persekutuan (3)' },
  noPassportData: { EN: 'No passport stamps yet.', BM: 'Belum ada cop pasport.' },
  noPassportCopy: { EN: 'Offline passport highlights will stay available here while you build more travel stamps.', BM: 'Sorotan pasport luar talian akan kekal tersedia di sini semasa anda membina lebih banyak cop perjalanan.' },
  noChallengeData: { EN: 'No active missions yet.', BM: 'Belum ada misi aktif.' },
  noChallengeCopy: { EN: 'Season missions are prepared locally and will refresh as your travel activity grows.', BM: 'Misi musim disediakan secara tempatan dan akan dikemas kini apabila aktiviti perjalanan anda bertambah.' },
  manjaGuide: { EN: 'Manja Guide', BM: 'Panduan Manja' },
  manjaGuideCopy: { EN: 'Verified stamps unlock regional badges and rewards.', BM: 'Cop yang disahkan membuka lencana dan ganjaran serantau.' },
  appLanguage: { EN: 'App language', BM: 'Bahasa aplikasi' },
  malay: { EN: 'Malay (BM)', BM: 'Bahasa Melayu (BM)' },
  english: { EN: 'English (EN)', BM: 'Bahasa Inggeris (EN)' },
  textSize: { EN: 'Text size', BM: 'Saiz teks' },
  textStandard: { EN: 'Standard', BM: 'Standard' },
  textLarge: { EN: 'Large', BM: 'Besar' },
  textExtraLarge: { EN: 'Extra large', BM: 'Sangat besar' },
  accessibilitySettings: { EN: 'Accessibility settings', BM: 'Tetapan kebolehcapaian' },
  highContrast: { EN: 'High contrast', BM: 'Kontras tinggi' },
  highContrastCopy: { EN: 'Increase color contrast for readability.', BM: 'Tingkatkan kontras warna untuk kebolehbacaan.' },
  reduceMotion: { EN: 'Reduce motion', BM: 'Kurangkan pergerakan' },
  reduceMotionCopy: { EN: 'Limit animations and screen transitions.', BM: 'Hadkan animasi dan peralihan skrin.' },
  underlineLinks: { EN: 'Underline links', BM: 'Gariskan pautan' },
  underlineLinksCopy: { EN: 'Always underline links and actions.', BM: 'Sentiasa gariskan pautan dan tindakan.' },
  screenReader: { EN: 'Enhanced screen reader', BM: 'Pembaca skrin dipertingkat' },
  screenReaderCopy: { EN: 'Improve screen reader compatibility.', BM: 'Tingkatkan keserasian pembaca skrin.' },
  voiceGuidance: { EN: 'Voice guidance', BM: 'Panduan suara' },
  voiceGuidanceCopy: { EN: 'Get voice guidance while navigating.', BM: 'Dapatkan panduan suara semasa bernavigasi.' },
  wheelchairRoutes: { EN: 'Wheelchair-accessible routes', BM: 'Laluan mesra kerusi roda' },
  wheelchairRoutesCopy: { EN: 'Prioritize wheelchair-accessible routes.', BM: 'Utamakan laluan mesra kerusi roda.' },
  preview: { EN: 'Preview', BM: 'Pratonton' },
  previewTitle: { EN: 'Public transport journey', BM: 'Perjalanan pengangkutan awam' },
  previewCopy: { EN: 'Easily plan journeys using public transport across Malaysia.', BM: 'Rancang perjalanan dengan mudah menggunakan pengangkutan awam di seluruh Malaysia.' },
  savedPreferenceEffects: { EN: 'Saved preference effects', BM: 'Kesan pilihan tersimpan' },
  savedPreferenceEffectsCopy: { EN: 'High contrast, reduced motion, underline support, and accessible-route defaults apply across the app when enabled.', BM: 'Kontras tinggi, gerakan dikurangkan, sokongan garis bawah dan laluan mesra akses digunakan di seluruh aplikasi apabila diaktifkan.' },
  saveSettings: { EN: 'Save settings', BM: 'Simpan tetapan' },
  resetDefaults: { EN: 'Reset to defaults', BM: 'Tetapkan semula ke lalai' },
  challengeHeroTitle: { EN: 'Explore Malaysia.\nCreate positive impact.', BM: 'Terokai Malaysia.\nCipta impak positif.' },
  seasonProgress: { EN: 'Season progress', BM: 'Kemajuan musim' },
  activeMissions: { EN: 'Active missions', BM: 'Misi aktif' },
  missionHeritage: { EN: 'Heritage by public transport', BM: 'Warisan dengan pengangkutan awam' },
  missionHeritageCopy: { EN: 'Visit 3 heritage sites using MRT, LRT, KTM or bus.', BM: 'Lawati 3 lokasi warisan menggunakan MRT, LRT, KTM atau bas.' },
  missionCommunity: { EN: 'Community supports community', BM: 'Komuniti menyokong komuniti' },
  missionCommunityCopy: { EN: 'Share 2 useful tips approved by the community.', BM: 'Kongsi 2 tip berguna yang diluluskan oleh komuniti.' },
  missionExplore: { EN: 'Explore new states', BM: 'Teroka negeri baharu' },
  missionExploreCopy: { EN: 'Earn 2 Digital Passport stamps from new states.', BM: 'Raih 2 cop Pasport Digital dari negeri baharu.' },
  nextReward: { EN: 'Next reward', BM: 'Ganjaran seterusnya' },
  nextRewardTitle: { EN: 'Wira & Manja Badge', BM: 'Lencana Wira & Manja' },
  nextRewardCopy: { EN: 'Reach 1,000 season points to unlock the VM2026 collectible badge.', BM: 'Capai 1,000 mata musim untuk membuka lencana koleksi VM2026.' },
  collectibleBadge: { EN: 'Collectible Badge', BM: 'Lencana Koleksi' },
  rewardHeroCopy: { EN: 'Official digital badge for your MyTravel profile and Digital Passport collection.', BM: 'Lencana digital rasmi untuk profil MyTravel dan koleksi Pasport Digital anda.' },
  yourProgress: { EN: 'Your progress', BM: 'Kemajuan anda' },
  howToUnlock: { EN: 'How to unlock', BM: 'Cara membuka' },
  unlockOne: { EN: 'Complete missions', BM: 'Lengkapkan misi' },
  unlockOneCopy: { EN: 'Tourism, travel, community or passport missions.', BM: 'Misi pelancongan, perjalanan, komuniti atau pasport.' },
  unlockTwo: { EN: 'Wait for verification', BM: 'Tunggu pengesahan' },
  unlockTwoCopy: { EN: 'Points are credited after review.', BM: 'Mata dikreditkan selepas semakan.' },
  unlockThree: { EN: 'Redeem securely', BM: 'Tebus dengan selamat' },
  unlockThreeCopy: { EN: 'Rewards are recorded in account history.', BM: 'Ganjaran direkodkan dalam sejarah akaun.' },
  digitalRewardsFirst: { EN: 'Digital rewards first', BM: 'Ganjaran digital diutamakan' },
  digitalRewardsFirstCopy: { EN: 'No purchase required. Physical rewards, if offered, will show clear stock and terms.', BM: 'Tiada pembelian diperlukan. Ganjaran fizikal, jika ditawarkan, akan memaparkan stok dan terma yang jelas.' },
  backToChallenges: { EN: 'Back to challenges', BM: 'Kembali ke cabaran' },
  signOutComplete: {
    EN: 'Signed out on this device. Offline travel activity was cleared.',
    BM: 'Log keluar pada peranti ini. Aktiviti perjalanan luar talian telah dipadamkan.',
  },
  accessibilitySaved: { EN: 'Accessibility settings saved and applied', BM: 'Tetapan kebolehcapaian disimpan dan digunakan' },
  accessibilityReset: { EN: 'Accessibility settings reset to defaults', BM: 'Tetapan kebolehcapaian ditetapkan semula ke lalai' },
  stampSelected: { EN: '{name} stamp selected', BM: 'Cop {name} dipilih' },
  stampLocked: { EN: '{name} stamp is still locked', BM: 'Cop {name} masih dikunci' },
  transactionPublicTransport: { EN: 'Public transport journey', BM: 'Perjalanan pengangkutan awam' },
  transactionVerifiedTip: { EN: 'Verified travel tip', BM: 'Tip perjalanan disahkan' },
  transactionVerification: { EN: 'MyTravel Verification', BM: 'Pengesahan MyTravel' },
  transactionTipSubmitted: { EN: 'Travel tip submitted', BM: 'Tip perjalanan dihantar' },
  approvedContributionSingular: { EN: 'approved contribution', BM: 'sumbangan diluluskan' },
  approvedContributionPlural: { EN: 'approved contributions', BM: 'sumbangan diluluskan' },
  pendingReviewSingular: { EN: 'pending review', BM: 'menunggu semakan' },
  pendingReviewPlural: { EN: 'pending reviews', BM: 'menunggu semakan' },
  completedJourneySingular: { EN: 'completed journey', BM: 'perjalanan selesai' },
  completedJourneyPlural: { EN: 'completed journeys', BM: 'perjalanan selesai' },
  savedNoticeSingular: { EN: 'saved notice', BM: 'notis tersimpan' },
  savedNoticePlural: { EN: 'saved notices', BM: 'notis tersimpan' },
  savedNoticeReadyCopy: { EN: 'ready to revisit', BM: 'sedia untuk disemak semula' },
  savedNoticeEmptyCopy: { EN: 'Save travel notices in Community for quick access here.', BM: 'Simpan notis perjalanan di Komuniti untuk akses pantas di sini.' },
  activeHelperSingular: { EN: 'accessibility helper active', BM: 'bantuan kebolehcapaian aktif' },
  activeHelperPlural: { EN: 'accessibility helpers active', BM: 'bantuan kebolehcapaian aktif' },
  ecoPointsEarnedSummary: { EN: 'Eco-Points earned', BM: 'Mata Eko diperoleh' },
} as const;

interface AccessibilityOption {
  key: AccessibilitySettingKey;
  title: LocalizedText;
  description: LocalizedText;
}

interface ProfileMenuItem {
  id: ProfileMenuItemId;
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
  action: 'route' | 'view' | 'signout';
  target: string;
}

interface ProfileStamp {
  name: string;
  active: boolean;
  image: string;
  heroImage: string;
  region: 'state' | 'federal';
  label: LocalizedText;
  description: LocalizedText;
}

interface ProfileTransaction {
  title: LocalizedText;
  subtitle: LocalizedText;
  points: string;
  accent: string;
  status: 'Earned' | 'Pending';
}

interface ChallengeMission {
  title: LocalizedText;
  description: LocalizedText;
  progress: string;
  reward: LocalizedText;
  image: string;
  progressWidth: string;
}

interface UnlockStep {
  number: string;
  title: LocalizedText;
  description: LocalizedText;
}

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnDestroy {
  private readonly challengeSeasonTarget = 1000;
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeSubscription = new Subscription();
  private readonly uiTimeouts = new ManagedTimeouts();
  readonly copy = PROFILE_COPY;
  readonly textSizes: TextSize[] = ['Standard', 'Large', 'Extra large'];
  readonly accessibilityOptions: AccessibilityOption[] = [
    { key: 'contrast', title: this.copy.highContrast, description: this.copy.highContrastCopy },
    { key: 'motion', title: this.copy.reduceMotion, description: this.copy.reduceMotionCopy },
    { key: 'underline', title: this.copy.underlineLinks, description: this.copy.underlineLinksCopy },
    { key: 'reader', title: this.copy.screenReader, description: this.copy.screenReaderCopy },
    { key: 'voice', title: this.copy.voiceGuidance, description: this.copy.voiceGuidanceCopy },
    { key: 'wheelchair', title: this.copy.wheelchairRoutes, description: this.copy.wheelchairRoutesCopy },
  ];
  readonly menuItems: ProfileMenuItem[] = [
    { id: 'contributions', title: this.copy.menuContributions, description: this.copy.menuContributionsCopy, icon: 'chatbubbles-outline', action: 'route', target: '/tabs/profile/my-contributions' },
    { id: 'journey-history', title: this.copy.menuJourneyHistory, description: this.copy.menuJourneyHistoryCopy, icon: 'time-outline', action: 'route', target: '/tabs/profile/journey-history' },
    { id: 'saved-destinations', title: this.copy.menuSavedDestinations, description: this.copy.menuSavedDestinationsCopy, icon: 'bookmark-outline', action: 'route', target: '/tabs/profile/saved-destinations' },
    { id: 'settings', title: this.copy.menuSettings, description: this.copy.menuSettingsCopy, icon: 'settings-outline', action: 'route', target: '/tabs/profile/settings' },
    { id: 'accessibility', title: this.copy.menuAccessibility, description: this.copy.menuAccessibilityCopy, icon: 'accessibility-outline', action: 'view', target: 'accessibility' },
    { id: 'privacy', title: this.copy.menuPrivacy, description: this.copy.menuPrivacyCopy, icon: 'shield-outline', action: 'route', target: '/tabs/profile/privacy' },
    { id: 'help', title: this.copy.menuHelp, description: this.copy.menuHelpCopy, icon: 'help-circle-outline', action: 'route', target: '/tabs/profile/help' },
    { id: 'signout', title: this.copy.menuSignOut, description: this.copy.menuSignOutCopy, icon: 'log-out-outline', action: 'signout', target: '' },
  ];
  stamps: ProfileStamp[] = [];
  challengeMissions: ChallengeMission[] = [];
  readonly unlockSteps: UnlockStep[] = [
    { number: '1', title: this.copy.unlockOne, description: this.copy.unlockOneCopy },
    { number: '2', title: this.copy.unlockTwo, description: this.copy.unlockTwoCopy },
    { number: '3', title: this.copy.unlockThree, description: this.copy.unlockThreeCopy },
  ];
  view: ProfileView = 'profile';
  language: AppLanguage = 'EN';
  selectedAppLanguage: AppLanguage = 'EN';
  toast = '';
  textSize: TextSize = 'Standard';
  transactionFilter: TransactionFilter = 'All';
  passportFilter: PassportFilter = 'All';
  ecoPoints = 0;
  settings = createDefaultAccessibilityPreferences().settings;
  selectedStamp: ProfileStamp | null = null;
  transactions: ProfileTransaction[] = [];
  approvedContributionCount = 0;
  pendingContributionCount = 0;
  journeyHistoryCount = 0;
  journeyHistoryPoints = 0;
  savedNoticeCount = 0;

  get filteredTransactions(): ProfileTransaction[] {
    if (this.transactionFilter === 'All') {
      return this.transactions;
    }

    return this.transactions.filter((transaction) => transaction.status === this.transactionFilter);
  }

  get filteredStamps(): ProfileStamp[] {
    if (this.passportFilter === 'All') {
      return this.stamps;
    }

    return this.stamps.filter((stamp) => stamp.region === (this.passportFilter === 'States' ? 'state' : 'federal'));
  }

  get passportTotalCount(): number {
    return this.stamps.length;
  }

  get passportCollectedCount(): number {
    return this.stamps.filter((stamp) => stamp.active).length;
  }

  get passportStateCount(): number {
    return this.stamps.filter((stamp) => stamp.region === 'state').length;
  }

  get passportFederalCount(): number {
    return this.stamps.filter((stamp) => stamp.region === 'federal').length;
  }

  get passportProgressWidth(): string {
    if (this.passportTotalCount === 0) {
      return '0%';
    }

    return `${Math.round((this.passportCollectedCount / this.passportTotalCount) * 100)}%`;
  }

  get seasonProgressWidth(): string {
    return this.progressWidth(this.ecoPoints, this.challengeSeasonTarget);
  }

  get viewTitle(): string {
    switch (this.view) {
      case 'points':
        return this.t(this.copy.ecoPointsTitle);
      case 'passport':
        return this.t(this.copy.digitalPassport);
      case 'accessibility':
        return this.t(this.copy.accessibilityLanguageTitle);
      case 'challenges':
        return this.t(this.copy.challengesTitle);
      case 'reward':
        return this.t(this.copy.rewardTitle);
      default:
        return this.t(this.copy.pageTitle);
    }
  }

  get passportSectionLabel(): string {
    switch (this.passportFilter) {
      case 'States':
        return `${this.t(this.copy.passportStates)} (${this.passportStateCount})`;
      case 'Federal Territories':
        return `${this.t(this.copy.passportFederal)} (${this.passportFederalCount})`;
      default:
        return `${this.t(this.copy.passportAll)} (${this.passportTotalCount})`;
    }
  }

  constructor() {
    this.applyAccessibilityPreferences(this.accessibilityPreferencesService.getPreferences());
    this.refreshAppState();

    this.routeSubscription.add(this.route.queryParamMap.subscribe((params) => {
      const requestedView = params.get('view');

      if (requestedView && this.isProfileView(requestedView)) {
        this.view = requestedView;
      }
    }));
  }

  ionViewWillEnter(): void {
    this.applyAccessibilityPreferences(this.accessibilityPreferencesService.getPreferences());
    this.refreshAppState();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    this.uiTimeouts.clearAll();
  }

  t(text: LocalizedText): string {
    return text[this.language];
  }

  open(view: ProfileView): void {
    this.view = view;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'profile' ? null : view },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: this.settings.motion ? 'auto' : 'smooth' });
  }

  updateLanguage(language: AppLanguage): void {
    const preferences = this.accessibilityPreferencesService.setLanguage(language);
    this.applyAccessibilityPreferences(preferences);
    this.refreshAppState();
  }

  handleMenu(item: ProfileMenuItem): void {
    if (item.action === 'view') {
      this.open(item.target as ProfileView);
      return;
    }

    if (item.action === 'signout') {
      this.appStateService.resetState();
      this.refreshAppState();
      this.view = 'profile';
      this.showToast(this.t(this.copy.signOutComplete));
      void this.router.navigate(['/tabs/tab1']);
      return;
    }

    void this.router.navigate([item.target]);
  }

  selectTransactionFilter(filter: TransactionFilter): void {
    this.transactionFilter = filter;
  }

  menuDescription(item: ProfileMenuItem): string {
    switch (item.id) {
      case 'contributions':
        return this.approvedContributionCount || this.pendingContributionCount
          ? `${this.approvedContributionCount} ${this.countLabel(this.approvedContributionCount, this.copy.approvedContributionSingular, this.copy.approvedContributionPlural)} · ${this.pendingContributionCount} ${this.countLabel(this.pendingContributionCount, this.copy.pendingReviewSingular, this.copy.pendingReviewPlural)}`
          : this.t(item.description);
      case 'journey-history':
        return this.journeyHistoryCount
          ? `${this.journeyHistoryCount} ${this.countLabel(this.journeyHistoryCount, this.copy.completedJourneySingular, this.copy.completedJourneyPlural)} · ${this.journeyHistoryPoints} ${this.t(this.copy.ecoPointsEarnedSummary)}`
          : this.t(item.description);
      case 'saved-destinations':
        return this.savedNoticeCount
          ? `${this.savedNoticeCount} ${this.countLabel(this.savedNoticeCount, this.copy.savedNoticeSingular, this.copy.savedNoticePlural)} · ${this.t(this.copy.savedNoticeReadyCopy)}`
          : this.t(this.copy.savedNoticeEmptyCopy);
      case 'settings':
        return `${this.languageLabel(this.selectedAppLanguage)} · ${this.activeHelperSummary(this.settings)}`;
      default:
        return this.t(item.description);
    }
  }

  selectPassportFilter(filter: PassportFilter): void {
    this.passportFilter = filter;
  }

  selectStamp(stamp: ProfileStamp): void {
    this.selectedStamp = stamp;
    this.showToast(
      (stamp.active ? this.t(this.copy.stampSelected) : this.t(this.copy.stampLocked)).replace('{name}', stamp.name),
    );
  }

  textSizeLabel(size: TextSize): string {
    switch (size) {
      case 'Large':
        return this.t(this.copy.textLarge);
      case 'Extra large':
        return this.t(this.copy.textExtraLarge);
      default:
        return this.t(this.copy.textStandard);
    }
  }

  transactionFilterLabel(filter: TransactionFilter): string {
    switch (filter) {
      case 'Earned':
        return this.t(this.copy.filterEarned);
      case 'Pending':
        return this.t(this.copy.filterPending);
      default:
        return this.t(this.copy.filterAll);
    }
  }

  saveAccessibilitySettings(): void {
    const preferences = this.accessibilityPreferencesService.savePreferences(this.buildAccessibilityPreferences());
    this.applyAccessibilityPreferences(preferences);
    this.refreshAppState();
    this.showToast(this.t(this.copy.accessibilitySaved));
  }

  resetAccessibilitySettings(): void {
    const preferences = this.accessibilityPreferencesService.resetPreferences();
    this.applyAccessibilityPreferences(preferences);
    this.refreshAppState();
    this.showToast(this.t(this.copy.accessibilityReset));
  }

  showToast(message: string): void {
    this.toast = message;
    this.uiTimeouts.schedule('toast', () => this.toast = '', 2200);
  }

  private isProfileView(view: string): view is ProfileView {
    return ['profile', 'points', 'passport', 'accessibility', 'challenges', 'reward'].includes(view);
  }

  private buildAccessibilityPreferences(): AccessibilityPreferences {
    return {
      language: this.selectedAppLanguage,
      textSize: this.textSize,
      settings: { ...this.settings },
    };
  }

  private applyAccessibilityPreferences(preferences: AccessibilityPreferences): void {
    this.language = preferences.language;
    this.selectedAppLanguage = preferences.language;
    this.textSize = preferences.textSize;
    this.settings = { ...preferences.settings };
  }

  private refreshAppState(): void {
    const state = this.appStateService.getSnapshot();
    const progress = buildTravelProgress(state);
    this.ecoPoints = state.ecoPoints;
    this.transactions = state.transactions.map((transaction) => this.mapTransaction(transaction));
    this.approvedContributionCount = state.contributions.filter((contribution) => contribution.status === 'Approved').length;
    this.pendingContributionCount = state.contributions.filter((contribution) => contribution.status !== 'Approved').length;
    this.journeyHistoryCount = state.journeyHistory.length;
    this.journeyHistoryPoints = state.journeyHistory.reduce((total, journey) => total + journey.points, 0);
    this.savedNoticeCount = state.savedNoticeIds.length;
    this.stamps = this.buildPassportStamps(progress);
    this.syncSelectedStamp();
    this.challengeMissions = this.buildChallengeMissions(progress, this.passportCollectedCount);
  }

  private countLabel(count: number, singular: LocalizedText, plural: LocalizedText): string {
    return count === 1 ? this.t(singular) : this.t(plural);
  }

  private activeHelperSummary(settings: AccessibilityPreferences['settings']): string {
    const activeHelpers = Object.values(settings).filter(Boolean).length;
    return `${activeHelpers} ${this.countLabel(activeHelpers, this.copy.activeHelperSingular, this.copy.activeHelperPlural)}`;
  }

  private languageLabel(language: AppLanguage): string {
    return language === 'BM' ? this.t(this.copy.malay) : this.t(this.copy.english);
  }

  private buildPassportStamps(progress: ReturnType<typeof buildTravelProgress>): ProfileStamp[] {
    return PASSPORT_STAMP_DEFINITIONS.map((stamp) => {
      const active = stamp.isUnlocked(progress);

      return {
        name: stamp.name,
        active,
        image: active ? stamp.unlockedImage : 'assets/mytravel/stamp-locked.png',
        heroImage: stamp.heroImage,
        region: stamp.region,
        label: stamp.label,
        description: stamp.description,
      };
    });
  }

  private syncSelectedStamp(): void {
    const previousSelection = this.selectedStamp
      ? this.stamps.find((stamp) => stamp.name === this.selectedStamp?.name)
      : undefined;

    this.selectedStamp = previousSelection ?? this.stamps.find((stamp) => stamp.active) ?? this.stamps[0] ?? null;
  }

  private buildChallengeMissions(progress: ReturnType<typeof buildTravelProgress>, unlockedStampCount: number): ChallengeMission[] {
    const challengeProgress = buildChallengeProgress(progress, unlockedStampCount);

    return [
      {
        title: this.copy.missionHeritage,
        description: this.copy.missionHeritageCopy,
        progress: this.progressLabel(challengeProgress.heritageProgress, challengeProgress.heritageTarget),
        reward: this.pointRewardLabel(120),
        image: 'assets/mytravel/wira-ui.png',
        progressWidth: this.progressWidth(challengeProgress.heritageProgress, challengeProgress.heritageTarget),
      },
      {
        title: this.copy.missionCommunity,
        description: this.copy.missionCommunityCopy,
        progress: this.progressLabel(challengeProgress.communityProgress, challengeProgress.communityTarget),
        reward: this.pointRewardLabel(80),
        image: 'assets/mytravel/manja-ui.png',
        progressWidth: this.progressWidth(challengeProgress.communityProgress, challengeProgress.communityTarget),
      },
      {
        title: this.copy.missionExplore,
        description: this.copy.missionExploreCopy,
        progress: this.progressLabel(challengeProgress.passportProgress, challengeProgress.passportTarget),
        reward: this.pointRewardLabel(60),
        image: 'assets/mytravel/manja-ui.png',
        progressWidth: this.progressWidth(challengeProgress.passportProgress, challengeProgress.passportTarget),
      },
    ];
  }

  private pointRewardLabel(points: number): LocalizedText {
    return {
      EN: `+${points} points`,
      BM: `+${points} mata`,
    };
  }

  private progressLabel(current: number, target: number): string {
    return this.language === 'BM'
      ? `${current} / ${target} selesai`
      : `${current} / ${target} complete`;
  }

  private progressWidth(current: number, target: number): string {
    return `${Math.round((Math.min(current, target) / target) * 100)}%`;
  }

  private mapTransaction(transaction: PointTransaction): ProfileTransaction {
    return {
      title: this.localizeTransactionTitle(transaction.title),
      subtitle: this.localizeTransactionSubtitle(transaction.subtitle),
      points: `${transaction.status === 'Earned' ? '+' : ''}${transaction.points} ♧`,
      accent: transaction.status === 'Pending' ? '#ff9800' : '#0754cc',
      status: transaction.status,
    };
  }

  private localizeTransactionTitle(title: string): LocalizedText {
    switch (title) {
      case 'Public transport journey':
        return this.copy.transactionPublicTransport;
      case 'Verified travel tip':
        return this.copy.transactionVerifiedTip;
      case 'MyTravel Verification':
        return this.copy.transactionVerification;
      case 'Travel tip submitted':
        return this.copy.transactionTipSubmitted;
      default:
        return { EN: title, BM: title };
    }
  }

  private localizeTransactionSubtitle(subtitle: string): LocalizedText {
    return { EN: subtitle, BM: subtitle };
  }
}
