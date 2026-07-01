import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AccessibilityPreferencesService,
  AppLanguage,
  TextSize,
} from '../services/accessibility-preferences.service';
import { AppContribution, AppStateService } from '../services/app-state.service';

type LocalizedText = Record<AppLanguage, string>;
type ProfileSectionKey = 'my-contributions' | 'journey-history' | 'saved-destinations' | 'settings' | 'privacy' | 'help';
type ProfileSectionAction = 'profile' | 'accessibility' | 'navigation' | 'community' | 'settings' | 'notices';

interface StaticProfileSectionItem {
  title: LocalizedText;
  subtitle: LocalizedText;
  meta?: LocalizedText;
  action?: ProfileSectionAction;
}

interface ProfileSectionItem {
  title: string;
  subtitle: string;
  meta?: string;
  action?: ProfileSectionAction;
}

interface StaticProfileSectionContent {
  title: LocalizedText;
  description: LocalizedText;
  summaryLabel: LocalizedText;
  summaryValue: string;
  summaryCopy: LocalizedText;
  primaryAction: LocalizedText;
  items: StaticProfileSectionItem[];
}

interface ProfileSectionContent {
  title: string;
  description: string;
  summaryLabel: string;
  summaryValue: string;
  summaryCopy: string;
  primaryAction: string;
  items: ProfileSectionItem[];
}

interface SavedDestinationNotice {
  title: LocalizedText;
  subtitle: LocalizedText;
  meta: LocalizedText;
}

const PROFILE_SECTION_COPY: Record<ProfileSectionKey, StaticProfileSectionContent> = {
  'my-contributions': {
    title: { EN: 'My contributions', BM: 'Sumbangan saya' },
    description: {
      EN: 'Track submitted tips, verifications, and community updates.',
      BM: 'Jejaki tip, pengesahan dan kemas kini komuniti yang dihantar.',
    },
    summaryLabel: { EN: 'Approved contributions', BM: 'Sumbangan diluluskan' },
    summaryValue: '0',
    summaryCopy: {
      EN: 'Newly approved updates and review progress appear here.',
      BM: 'Kemas kini yang baru diluluskan dan kemajuan semakan dipaparkan di sini.',
    },
    primaryAction: { EN: 'Add new travel tip', BM: 'Tambah tip perjalanan baharu' },
    items: [],
  },
  'journey-history': {
    title: { EN: 'Journey history', BM: 'Sejarah perjalanan' },
    description: {
      EN: 'Review your recent routes, transport choices, and eco-point activity.',
      BM: 'Semak laluan terkini, pilihan pengangkutan dan aktiviti mata eko anda.',
    },
    summaryLabel: { EN: 'Recent journeys', BM: 'Perjalanan terkini' },
    summaryValue: '0',
    summaryCopy: {
      EN: 'Completed public-transport trips appear here after each journey.',
      BM: 'Perjalanan pengangkutan awam yang selesai akan dipaparkan di sini selepas setiap perjalanan.',
    },
    primaryAction: { EN: 'Plan another trip', BM: 'Rancang perjalanan lain' },
    items: [],
  },
  'saved-destinations': {
    title: { EN: 'Saved destinations', BM: 'Destinasi tersimpan' },
    description: {
      EN: 'Review saved travel notices, favourite stops, and destination reminders in one place.',
      BM: 'Semak notis perjalanan tersimpan, hentian kegemaran dan peringatan destinasi di satu tempat.',
    },
    summaryLabel: { EN: 'Saved places', BM: 'Tempat tersimpan' },
    summaryValue: '0',
    summaryCopy: {
      EN: 'Saved travel notices and destination reminders will appear here.',
      BM: 'Notis perjalanan tersimpan dan peringatan destinasi akan dipaparkan di sini.',
    },
    primaryAction: { EN: 'Open travel notices', BM: 'Buka notis perjalanan' },
    items: [],
  },
  settings: {
    title: { EN: 'Settings', BM: 'Tetapan' },
    description: {
      EN: 'Manage language, notifications, accessibility, and travel preferences.',
      BM: 'Urus bahasa, pemberitahuan, kebolehcapaian dan pilihan perjalanan.',
    },
    summaryLabel: { EN: 'Active preferences', BM: 'Pilihan aktif' },
    summaryValue: '0',
    summaryCopy: {
      EN: 'Language, text size, and accessibility preferences are summarized here.',
      BM: 'Bahasa, saiz teks dan pilihan kebolehcapaian diringkaskan di sini.',
    },
    primaryAction: { EN: 'Open accessibility', BM: 'Buka kebolehcapaian' },
    items: [],
  },
  privacy: {
    title: { EN: 'Privacy & data', BM: 'Privasi & data' },
    description: {
      EN: 'Review how your MyTravel demo data, saved items, and preferences stay available on this device.',
      BM: 'Semak cara data demo MyTravel, item tersimpan, dan pilihan anda kekal tersedia pada peranti ini.',
    },
    summaryLabel: { EN: 'Protected profile areas', BM: 'Bahagian profil yang dilindungi' },
    summaryValue: '3',
    summaryCopy: {
      EN: 'Saved notices, community activity, and accessibility preferences are managed locally in this app demo.',
      BM: 'Notis tersimpan, aktiviti komuniti, dan pilihan kebolehcapaian diurus secara setempat dalam demo aplikasi ini.',
    },
    primaryAction: { EN: 'Open settings', BM: 'Buka tetapan' },
    items: [],
  },
  help: {
    title: { EN: 'Help', BM: 'Bantuan' },
    description: {
      EN: 'Find quick guidance for journey planning, travel notices, and accessibility support across MyTravel.',
      BM: 'Cari panduan ringkas untuk perancangan perjalanan, notis perjalanan, dan sokongan kebolehcapaian di seluruh MyTravel.',
    },
    summaryLabel: { EN: 'Support shortcuts', BM: 'Pintasan sokongan' },
    summaryValue: '3',
    summaryCopy: {
      EN: 'Navigation, Community, and accessibility support are ready whenever you need a refresher.',
      BM: 'Navigasi, Komuniti, dan sokongan kebolehcapaian sedia apabila anda memerlukan panduan semula.',
    },
    primaryAction: { EN: 'Open community guides', BM: 'Buka panduan komuniti' },
    items: [],
  },
};

const SECTION_UI_COPY = {
  backToProfile: { EN: 'Back to profile', BM: 'Kembali ke profil' },
  emptyTitle: { EN: 'Nothing here yet', BM: 'Belum ada apa-apa di sini' },
  emptyCopy: { EN: 'Use the action above to add your first item.', BM: 'Gunakan tindakan di atas untuk menambah item pertama anda.' },
  journeyCompletedSingular: { EN: 'journey completed', BM: 'perjalanan selesai' },
  journeyCompletedPlural: { EN: 'journeys completed', BM: 'perjalanan selesai' },
  ecoPointsEarned: { EN: 'Eco-Points earned.', BM: 'Mata Eko diperoleh.' },
  journeysEmpty: { EN: 'Completed journeys will appear here.', BM: 'Perjalanan yang selesai akan dipaparkan di sini.' },
  pendingReview: { EN: 'pending review', BM: 'menunggu semakan' },
  sharedUpdatesEarned: { EN: 'Eco-Points earned from shared updates.', BM: 'Mata Eko diperoleh daripada kemas kini yang dikongsi.' },
  approvedOn: { EN: 'Approved', BM: 'Diluluskan' },
  submittedOn: { EN: 'Submitted', BM: 'Dihantar' },
  pointsPending: { EN: 'points pending', BM: 'mata menunggu' },
  savedNoticeSingular: { EN: 'saved notice', BM: 'notis tersimpan' },
  savedNoticePlural: { EN: 'saved notices', BM: 'notis tersimpan' },
  savedNoticesReady: { EN: 'Saved notices are ready to revisit and share.', BM: 'Notis tersimpan sedia untuk disemak semula dan dikongsi.' },
  savedNoticesEmpty: { EN: 'Save travel notices from Community to keep them here for later.', BM: 'Simpan notis perjalanan dari Komuniti untuk menyimpannya di sini bagi rujukan kemudian.' },
  openNoticeBoard: { EN: 'Open notice board', BM: 'Buka papan notis' },
  languageAndRegion: { EN: 'Language and region', BM: 'Bahasa dan rantau' },
  switchLanguage: { EN: 'Switch content language and locale', BM: 'Tukar bahasa kandungan dan lokaliti' },
  notificationPreferences: { EN: 'Notification preferences', BM: 'Pilihan pemberitahuan' },
  notificationSubtitle: { EN: 'Travel notices and journey reminders', BM: 'Notis perjalanan dan peringatan perjalanan' },
  notificationMeta: { EN: '2 priority alerts enabled', BM: '2 amaran keutamaan diaktifkan' },
  savedTravelData: { EN: 'Saved travel data', BM: 'Data perjalanan tersimpan' },
  savedTravelDataSubtitle: { EN: 'Journeys, notices, and reactions stay available on this device.', BM: 'Perjalanan, notis, dan reaksi kekal tersedia pada peranti ini.' },
  savedTravelDataMeta: { EN: '{count} saved notices · local device storage', BM: '{count} notis tersimpan · storan setempat peranti' },
  communityHistory: { EN: 'Community history', BM: 'Sejarah komuniti' },
  communityHistorySubtitle: { EN: 'Tips, verifications, and post feedback remain in your local profile snapshot.', BM: 'Tip, pengesahan, dan maklum balas siaran kekal dalam ringkasan profil setempat anda.' },
  communityHistoryMeta: { EN: '{count} contributions tracked', BM: '{count} sumbangan dijejaki' },
  permissionsReview: { EN: 'Permissions and support', BM: 'Kebenaran dan sokongan' },
  permissionsReviewSubtitle: { EN: 'Review accessibility controls and shared-device preferences before travelling.', BM: 'Semak kawalan kebolehcapaian dan pilihan peranti kongsi sebelum memulakan perjalanan.' },
  permissionsReviewMeta: { EN: 'Open settings and accessibility controls', BM: 'Buka tetapan dan kawalan kebolehcapaian' },
  journeyPlanningGuide: { EN: 'Journey planning guide', BM: 'Panduan perancangan perjalanan' },
  journeyPlanningGuideSubtitle: { EN: 'Use Navigation to compare routes, accessibility support, and saved recent places.', BM: 'Gunakan Navigasi untuk membandingkan laluan, sokongan kebolehcapaian, dan tempat terkini yang disimpan.' },
  journeyPlanningGuideMeta: { EN: 'Open Navigation planner', BM: 'Buka perancang Navigasi' },
  travelNoticeGuide: { EN: 'Travel notices and tips', BM: 'Notis perjalanan dan tip' },
  travelNoticeGuideSubtitle: { EN: 'Check saved notices, community updates, and nearby verification tasks in one place.', BM: 'Semak notis tersimpan, kemas kini komuniti, dan tugasan pengesahan berdekatan di satu tempat.' },
  travelNoticeGuideMeta: { EN: 'Open Community guides', BM: 'Buka panduan Komuniti' },
  accessibilityGuide: { EN: 'Accessibility support guide', BM: 'Panduan sokongan kebolehcapaian' },
  accessibilityGuideSubtitle: { EN: 'Adjust text size, contrast, motion, and wheelchair-route preferences before a trip.', BM: 'Laraskan saiz teks, kontras, gerakan, dan pilihan laluan kerusi roda sebelum perjalanan.' },
  accessibilityGuideMeta: { EN: 'Open accessibility controls', BM: 'Buka kawalan kebolehcapaian' },
  accessibilitySupport: { EN: 'Accessibility and route support', BM: 'Kebolehcapaian dan sokongan laluan' },
  accessibilityMeta: { EN: 'Text size: {size}', BM: 'Saiz teks: {size}' },
  helperActiveSingular: { EN: '{count} helper active', BM: '{count} bantuan aktif' },
  helperActivePlural: { EN: '{count} helpers active', BM: '{count} bantuan aktif' },
  accessibleRoutesOn: { EN: 'Accessible routes on', BM: 'Laluan mesra akses aktif' },
  accessibleRoutesOff: { EN: 'Accessible routes off', BM: 'Laluan mesra akses tidak aktif' },
  englishRegion: { EN: 'English (EN)', BM: 'Bahasa Inggeris (EN)' },
  malayRegion: { EN: 'Malay (BM)', BM: 'Bahasa Melayu (BM)' },
  standard: { EN: 'Standard', BM: 'Standard' },
  large: { EN: 'Large', BM: 'Besar' },
  extraLarge: { EN: 'Extra large', BM: 'Sangat besar' },
  travelTip: { EN: 'Travel tip', BM: 'Tip perjalanan' },
  verification: { EN: 'Verification', BM: 'Pengesahan' },
  approved: { EN: 'Approved', BM: 'Diluluskan' },
  inReview: { EN: 'In review', BM: 'Dalam semakan' },
  points: { EN: 'points', BM: 'mata' },
} satisfies Record<string, LocalizedText>;

const SAVED_NOTICE_DETAILS: Record<string, SavedDestinationNotice> = {
  'notice-kelana-jaya-delay': {
    title: {
      EN: 'Kelana Jaya Line delay alert',
      BM: 'Amaran kelewatan Laluan Kelana Jaya',
    },
    subtitle: {
      EN: 'Transit disruption between KLCC and Ampang Park.',
      BM: 'Gangguan transit antara KLCC dan Ampang Park.',
    },
    meta: {
      EN: 'Critical transit notice',
      BM: 'Notis transit kritikal',
    },
  },
  'notice-melaka-heat': {
    title: {
      EN: 'Melaka heritage heat advisory',
      BM: 'Nasihat cuaca panas warisan Melaka',
    },
    subtitle: {
      EN: 'Best reviewed before midday outdoor plans.',
      BM: 'Paling sesuai disemak sebelum pelan luar waktu tengah hari.',
    },
    meta: {
      EN: 'Weather advisory',
      BM: 'Nasihat cuaca',
    },
  },
  'notice-sabah-boardwalk': {
    title: {
      EN: 'Tanjung Aru access update',
      BM: 'Kemas kini akses Tanjung Aru',
    },
    subtitle: {
      EN: 'Boardwalk entrance changes and accessible ramp guidance.',
      BM: 'Perubahan pintu masuk pelantar dan panduan tanjakan mesra akses.',
    },
    meta: {
      EN: 'Destination disruption notice',
      BM: 'Notis gangguan destinasi',
    },
  },
};

function renderStaticSection(content: StaticProfileSectionContent, language: AppLanguage): ProfileSectionContent {
  return {
    title: content.title[language],
    description: content.description[language],
    summaryLabel: content.summaryLabel[language],
    summaryValue: content.summaryValue,
    summaryCopy: content.summaryCopy[language],
    primaryAction: content.primaryAction[language],
    items: content.items.map((item) => ({
      title: item.title[language],
      subtitle: item.subtitle[language],
      meta: item.meta?.[language],
      action: item.action,
    })),
  };
}

@Component({
  selector: 'app-profile-section',
  templateUrl: './profile-section.page.html',
  styleUrls: ['./profile-section.page.scss'],
  standalone: false,
})
export class ProfileSectionPage implements OnInit {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly backToProfileLabel = SECTION_UI_COPY.backToProfile;
  readonly emptyTitle = SECTION_UI_COPY.emptyTitle;
  readonly emptyCopy = SECTION_UI_COPY.emptyCopy;

  language: AppLanguage = 'EN';
  content: ProfileSectionContent = renderStaticSection(PROFILE_SECTION_COPY.settings, 'EN');
  private section: ProfileSectionKey = 'settings';

  ngOnInit(): void {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.section = this.normalizeSection(this.route.snapshot.data['section']);
    this.refreshContent();
  }

  ionViewWillEnter(): void {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshContent();
  }

  updateLanguage(language: AppLanguage): void {
    this.language = this.accessibilityPreferencesService.setLanguage(language).language;
    this.refreshContent();
  }

  t(text: LocalizedText): string {
    return text[this.language];
  }

  goBack(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  handlePrimaryAction(): void {
    switch (this.section) {
      case 'my-contributions':
        void this.router.navigate(['/tabs/tab3']);
        return;
      case 'journey-history':
        void this.router.navigate(['/tabs/tab2']);
        return;
      case 'saved-destinations':
        this.openNoticeBoard();
        return;
      case 'settings':
        void this.router.navigate(['/tabs/tab4'], { queryParams: { view: 'accessibility' } });
        return;
      case 'privacy':
        void this.router.navigate(['/tabs/profile/settings']);
        return;
      case 'help':
        void this.router.navigate(['/tabs/tab3']);
        return;
    }
  }

  handleItemClick(item: ProfileSectionItem): void {
    switch (item.action) {
      case 'accessibility':
        void this.router.navigate(['/tabs/tab4'], { queryParams: { view: 'accessibility' } });
        return;
      case 'navigation':
        void this.router.navigate(['/tabs/tab2']);
        return;
      case 'community':
        void this.router.navigate(['/tabs/tab3']);
        return;
      case 'notices':
        this.openNoticeBoard();
        return;
      case 'settings':
      case 'profile':
        void this.router.navigate(['/tabs/tab4']);
        return;
      default:
        break;
    }

    if (this.section === 'journey-history') {
      void this.router.navigate(['/tabs/tab2']);
      return;
    }

    if (this.section === 'saved-destinations' || this.section === 'help') {
      this.openNoticeBoard();
      return;
    }

    if (this.section === 'privacy') {
      void this.router.navigate(['/tabs/profile/settings']);
      return;
    }

    void this.router.navigate(['/tabs/tab4']);
  }

  private refreshContent(): void {
    switch (this.section) {
      case 'journey-history':
        this.content = this.buildJourneyHistoryContent();
        return;
      case 'my-contributions':
        this.content = this.buildContributionContent();
        return;
      case 'settings':
        this.content = this.buildSettingsContent();
        return;
      case 'saved-destinations':
        this.content = this.buildSavedDestinationsContent();
        return;
      case 'privacy':
        this.content = this.buildPrivacyContent();
        return;
      case 'help':
        this.content = this.buildHelpContent();
        return;
      default:
        this.content = renderStaticSection(PROFILE_SECTION_COPY[this.section], this.language);
    }
  }

  private buildJourneyHistoryContent(): ProfileSectionContent {
    const staticContent = renderStaticSection(PROFILE_SECTION_COPY['journey-history'], this.language);
    const journeys = this.appStateService.getSnapshot().journeyHistory;
    const earnedJourneys = journeys.filter((journey) => journey.points > 0).length;
    const totalPoints = journeys.reduce((total, journey) => total + journey.points, 0);

    return {
      ...staticContent,
      summaryValue: String(journeys.length),
      summaryCopy: journeys.length
        ? `${earnedJourneys} ${this.countLabel(earnedJourneys, SECTION_UI_COPY.journeyCompletedSingular, SECTION_UI_COPY.journeyCompletedPlural)} · ${totalPoints} ${this.t(SECTION_UI_COPY.ecoPointsEarned)}`
        : this.t(SECTION_UI_COPY.journeysEmpty),
      items: journeys.map((journey) => ({
        title: `${journey.from} → ${journey.to}`,
        subtitle: `${journey.mode} · ${journey.duration}`,
        meta: `${this.formatDate(journey.completedAt ?? journey.startedAt)} · ${journey.fare} · +${journey.points} ${this.t(SECTION_UI_COPY.points)}`,
      })),
    };
  }

  private buildContributionContent(): ProfileSectionContent {
    const staticContent = renderStaticSection(PROFILE_SECTION_COPY['my-contributions'], this.language);
    const contributions = this.appStateService.getSnapshot().contributions;
    const approvedCount = contributions.filter((contribution) => contribution.status === 'Approved').length;
    const pendingCount = contributions.length - approvedCount;
    const approvedPoints = contributions.reduce(
      (total, item) => total + (item.status === 'Approved' ? item.points : 0),
      0,
    );

    return {
      ...staticContent,
      summaryValue: String(approvedCount),
      summaryCopy: contributions.length
        ? `${pendingCount} ${this.t(SECTION_UI_COPY.pendingReview)} · ${approvedPoints} ${this.t(SECTION_UI_COPY.sharedUpdatesEarned)}`
        : staticContent.summaryCopy,
      items: contributions.map((contribution) => this.buildContributionItem(contribution)),
    };
  }

  private buildSettingsContent(): ProfileSectionContent {
    const staticContent = renderStaticSection(PROFILE_SECTION_COPY.settings, this.language);
    const preferences = this.accessibilityPreferencesService.getPreferences();
    const helperCount = Object.values(preferences.settings).filter(Boolean).length;
    const languageLabel = this.languageRegionLabel(preferences.language);

    return {
      ...staticContent,
      summaryValue: String(helperCount + 2),
      summaryCopy: this.language === 'EN'
        ? `${languageLabel} selected · ${helperCount} accessibility helpers active.`
        : `${languageLabel} dipilih · ${helperCount} bantuan kebolehcapaian aktif.`,
      items: [
        {
          title: this.t(SECTION_UI_COPY.languageAndRegion),
          subtitle: `${languageLabel} · Malaysia`,
          meta: this.t(SECTION_UI_COPY.switchLanguage),
          action: 'profile',
        },
        {
          title: this.t(SECTION_UI_COPY.notificationPreferences),
          subtitle: this.t(SECTION_UI_COPY.notificationSubtitle),
          meta: this.t(SECTION_UI_COPY.notificationMeta),
          action: 'profile',
        },
        {
          title: this.t(SECTION_UI_COPY.accessibilitySupport),
          subtitle: `${this.helperSummary(helperCount)} · ${preferences.settings.wheelchair ? this.t(SECTION_UI_COPY.accessibleRoutesOn) : this.t(SECTION_UI_COPY.accessibleRoutesOff)}`,
          meta: this.interpolate(this.t(SECTION_UI_COPY.accessibilityMeta), {
            size: this.textSizeLabel(preferences.textSize),
          }),
          action: 'accessibility',
        },
      ],
    };
  }

  private buildSavedDestinationsContent(): ProfileSectionContent {
    const staticContent = renderStaticSection(PROFILE_SECTION_COPY['saved-destinations'], this.language);
    const savedNoticeIds = this.appStateService.getSnapshot().savedNoticeIds;

    return {
      ...staticContent,
      summaryValue: String(savedNoticeIds.length),
      summaryCopy: savedNoticeIds.length
        ? `${savedNoticeIds.length} ${this.countLabel(savedNoticeIds.length, SECTION_UI_COPY.savedNoticeSingular, SECTION_UI_COPY.savedNoticePlural)} · ${this.t(SECTION_UI_COPY.savedNoticesReady)}`
        : this.t(SECTION_UI_COPY.savedNoticesEmpty),
      primaryAction: this.t(SECTION_UI_COPY.openNoticeBoard),
      items: savedNoticeIds.map((id) => this.buildSavedDestinationItem(id)),
    };
  }

  private buildPrivacyContent(): ProfileSectionContent {
    const staticContent = renderStaticSection(PROFILE_SECTION_COPY.privacy, this.language);
    const state = this.appStateService.getSnapshot();
    const preferences = this.accessibilityPreferencesService.getPreferences();
    const helperCount = Object.values(preferences.settings).filter(Boolean).length;

    return {
      ...staticContent,
      summaryValue: '3',
      summaryCopy: this.language === 'EN'
        ? `${state.savedNoticeIds.length} saved notices · ${state.contributions.length} community entries are stored locally on this device.`
        : `${state.savedNoticeIds.length} notis tersimpan · ${state.contributions.length} entri komuniti disimpan secara setempat pada peranti ini.`,
      primaryAction: this.t(PROFILE_SECTION_COPY.privacy.primaryAction),
      items: [
        {
          title: this.t(SECTION_UI_COPY.savedTravelData),
          subtitle: this.t(SECTION_UI_COPY.savedTravelDataSubtitle),
          meta: this.interpolate(this.t(SECTION_UI_COPY.savedTravelDataMeta), {
            count: String(state.savedNoticeIds.length),
          }),
          action: 'community',
        },
        {
          title: this.t(SECTION_UI_COPY.communityHistory),
          subtitle: this.t(SECTION_UI_COPY.communityHistorySubtitle),
          meta: this.interpolate(this.t(SECTION_UI_COPY.communityHistoryMeta), {
            count: String(state.contributions.length),
          }),
          action: 'community',
        },
        {
          title: this.t(SECTION_UI_COPY.permissionsReview),
          subtitle: `${this.helperSummary(helperCount)} · ${preferences.settings.wheelchair ? this.t(SECTION_UI_COPY.accessibleRoutesOn) : this.t(SECTION_UI_COPY.accessibleRoutesOff)}`,
          meta: this.t(SECTION_UI_COPY.permissionsReviewMeta),
          action: 'accessibility',
        },
      ],
    };
  }

  private buildHelpContent(): ProfileSectionContent {
    const staticContent = renderStaticSection(PROFILE_SECTION_COPY.help, this.language);
    const preferences = this.accessibilityPreferencesService.getPreferences();
    const savedNoticeCount = this.appStateService.getSnapshot().savedNoticeIds.length;

    return {
      ...staticContent,
      items: [
        {
          title: this.t(SECTION_UI_COPY.journeyPlanningGuide),
          subtitle: this.t(SECTION_UI_COPY.journeyPlanningGuideSubtitle),
          meta: this.t(SECTION_UI_COPY.journeyPlanningGuideMeta),
          action: 'navigation',
        },
        {
          title: this.t(SECTION_UI_COPY.travelNoticeGuide),
          subtitle: this.t(SECTION_UI_COPY.travelNoticeGuideSubtitle),
          meta: this.language === 'EN'
            ? `${savedNoticeCount} ${this.countLabel(savedNoticeCount, SECTION_UI_COPY.savedNoticeSingular, SECTION_UI_COPY.savedNoticePlural)} ready in Community`
            : `${savedNoticeCount} ${this.countLabel(savedNoticeCount, SECTION_UI_COPY.savedNoticeSingular, SECTION_UI_COPY.savedNoticePlural)} sedia dalam Komuniti`,
          action: 'notices',
        },
        {
          title: this.t(SECTION_UI_COPY.accessibilityGuide),
          subtitle: this.t(SECTION_UI_COPY.accessibilityGuideSubtitle),
          meta: this.interpolate(this.t(SECTION_UI_COPY.accessibilityMeta), {
            size: this.textSizeLabel(preferences.textSize),
          }),
          action: 'accessibility',
        },
      ],
    };
  }

  private buildContributionItem(contribution: AppContribution): ProfileSectionItem {
    const isApproved = contribution.status === 'Approved';

    return {
      title: contribution.title,
      subtitle: `${this.contributionTypeLabel(contribution.type)} · ${this.contributionStatusLabel(contribution.status)}`,
      meta: isApproved
        ? `${this.t(SECTION_UI_COPY.approvedOn)} ${this.formatDate(contribution.createdAt)} · +${contribution.points} ${this.t(SECTION_UI_COPY.points)}`
        : `${this.t(SECTION_UI_COPY.submittedOn)} ${this.formatDate(contribution.createdAt)} · +${contribution.points} ${this.t(SECTION_UI_COPY.pointsPending)}`,
    };
  }

  private buildSavedDestinationItem(id: string): ProfileSectionItem {
    const notice = SAVED_NOTICE_DETAILS[id];

    if (!notice) {
      return {
        title: this.language === 'EN' ? 'Saved travel notice' : 'Notis perjalanan tersimpan',
        subtitle: this.language === 'EN' ? 'Open Community to review the latest details.' : 'Buka Komuniti untuk menyemak butiran terkini.',
        meta: id,
        action: 'notices',
      };
    }

    return {
      title: this.t(notice.title),
      subtitle: this.t(notice.subtitle),
      meta: this.t(notice.meta),
      action: 'notices',
    };
  }

  private openNoticeBoard(): void {
    void this.router.navigate(['/tabs/tab3'], {
      queryParams: { view: 'notices' },
    });
  }

  private contributionTypeLabel(type: AppContribution['type']): string {
    return type === 'Verification' ? this.t(SECTION_UI_COPY.verification) : this.t(SECTION_UI_COPY.travelTip);
  }

  private contributionStatusLabel(status: AppContribution['status']): string {
    return status === 'Approved' ? this.t(SECTION_UI_COPY.approved) : this.t(SECTION_UI_COPY.inReview);
  }

  private languageRegionLabel(language: AppLanguage): string {
    return language === 'BM'
      ? this.t(SECTION_UI_COPY.malayRegion)
      : this.t(SECTION_UI_COPY.englishRegion);
  }

  private textSizeLabel(textSize: TextSize): string {
    switch (textSize) {
      case 'Large':
        return this.t(SECTION_UI_COPY.large);
      case 'Extra large':
        return this.t(SECTION_UI_COPY.extraLarge);
      default:
        return this.t(SECTION_UI_COPY.standard);
    }
  }

  private helperSummary(count: number): string {
    return this.interpolate(
      this.countLabel(count, SECTION_UI_COPY.helperActiveSingular, SECTION_UI_COPY.helperActivePlural),
      { count: String(count) },
    );
  }

  private countLabel(count: number, singular: LocalizedText, plural: LocalizedText): string {
    return count === 1 ? this.t(singular) : this.t(plural);
  }

  private interpolate(template: string, values: Record<string, string>): string {
    return Object.entries(values).reduce(
      (content, [key, value]) => content.replace(`{${key}}`, value),
      template,
    );
  }

  private normalizeSection(section: unknown): ProfileSectionKey {
    return this.isProfileSectionKey(section) ? section : 'settings';
  }

  private isProfileSectionKey(section: unknown): section is ProfileSectionKey {
    return typeof section === 'string' && section in PROFILE_SECTION_COPY;
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.language === 'BM' ? 'ms-MY' : 'en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }
}
