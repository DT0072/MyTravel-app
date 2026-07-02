import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AccessibilityPreferencesService,
  AppLanguage,
} from '../services/accessibility-preferences.service';
import { AppJourney, AppStateService } from '../services/app-state.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import {
  buildChallengeProgress,
  buildPassportSummary,
  buildTravelProgress,
} from '../shared/utils/travel-progress';
import {
  buildVerificationProgress,
  VerificationTaskDefinition,
} from '../shared/utils/verification-tasks';

type LocalizedText = Record<AppLanguage, string>;

interface HomeEvent {
  dateLabel: string;
  title: LocalizedText;
  description: LocalizedText;
  targetPath: string;
}

interface SeededHomeEvent {
  date: string;
  title: LocalizedText;
  description: LocalizedText;
  targetPath: string;
}

const HOME_COPY = {
  welcome: { EN: 'Welcome,', BM: 'Selamat datang,' },
  travelerName: { EN: 'Traveler', BM: 'Pengembara' },
  destination: { EN: 'Featured destination', BM: 'Destinasi pilihan' },
  ecoPoints: { EN: 'Eco-Points', BM: 'Mata Eko' },
  digitalPassport: { EN: 'Digital Passport', BM: 'Pasport Digital' },
  quickEvents: { EN: 'Events &\nActivities', BM: 'Acara &\nAktiviti' },
  quickExplore: { EN: 'Explore\nMalaysia', BM: 'Teroka\nMalaysia' },
  quickVerification: { EN: 'MyTravel\nVerification', BM: 'Pengesahan\nMyTravel' },
  quickNotices: { EN: 'Travel\nNotices', BM: 'Notis\nPerjalanan' },
  currentJourney: { EN: 'Your current journey', BM: 'Perjalanan semasa anda' },
  inTransit: { EN: 'In transit', BM: 'Sedang dalam perjalanan' },
  departs: { EN: 'Departs', BM: 'Berlepas' },
  arrives: { EN: 'Arrives', BM: 'Tiba' },
  completeJourney: { EN: 'Complete journey', BM: 'Selesaikan perjalanan' },
  planJourneyTitle: { EN: 'Plan your next journey', BM: 'Rancang perjalanan seterusnya' },
  readyWhenYouAre: { EN: 'Ready when you are', BM: 'Sedia apabila anda sedia' },
  planJourneyPrompt: {
    EN: 'Choose a route, departure time, and accessibility preference in Navigation.',
    BM: 'Pilih laluan, masa berlepas, dan pilihan kebolehcapaian dalam Navigasi.',
  },
  planJourneyAction: { EN: 'Plan a journey', BM: 'Rancang perjalanan' },
  verificationCardTitle: { EN: 'MyTravel Verification', BM: 'Pengesahan MyTravel' },
  weeklyMission: { EN: 'Weekly Mission with Wira', BM: 'Misi Mingguan bersama Wira' },
  weeklyMissionAction: { EN: 'View\nmission', BM: 'Lihat\nmisi' },
  verificationKicker: { EN: 'MYTRAVEL VERIFICATION', BM: 'PENGESAHAN MYTRAVEL' },
  noVerificationTitle: { EN: 'No verification task yet', BM: 'Belum ada tugasan pengesahan' },
  noVerificationCopy: { EN: 'More checkpoint verifications will appear soon.', BM: 'Lebih banyak pengesahan pusat semakan akan dipaparkan tidak lama lagi.' },
  answerYes: { EN: 'Yes', BM: 'Ya' },
  answerNo: { EN: 'No', BM: 'Tidak' },
  verificationReviewTitle: { EN: 'Wira is reviewing with you', BM: 'Wira sedang menyemak bersama anda' },
  verificationReviewCopy: { EN: 'Points awarded after verification', BM: 'Mata diberikan selepas pengesahan' },
  verificationSubmit: { EN: 'Submit verification', BM: 'Hantar pengesahan' },
  eventsKicker: { EN: 'EVENTS & ACTIVITIES', BM: 'ACARA & AKTIVITI' },
  eventsTitle: { EN: 'Events & Activities', BM: 'Acara & Aktiviti' },
  noEventsTitle: { EN: 'No events yet', BM: 'Belum ada acara' },
  noEventsCopy: { EN: 'Upcoming cultural and eco-travel activities will appear soon.', BM: 'Aktiviti budaya dan eko-pelancongan yang akan datang akan dipaparkan tidak lama lagi.' },
  notificationToast: { EN: 'Travel notices appear when available', BM: 'Notis perjalanan dipaparkan apabila tersedia' },
  verificationAwarded: { EN: 'Eco-Points earned. Thank you!', BM: 'Mata Eko diperoleh. Terima kasih!' },
  verificationDuplicate: { EN: 'You already completed this verification.', BM: 'Anda sudah menyelesaikan pengesahan ini.' },
  journeyCompleted: { EN: 'Journey completed.', BM: 'Perjalanan selesai.' },
} as const;

const SEEDED_HOME_EVENTS: SeededHomeEvent[] = [
  {
    date: '2026-07-05',
    title: {
      EN: 'Car-Free Morning at Dataran Merdeka',
      BM: 'Pagi Tanpa Kenderaan di Dataran Merdeka',
    },
    description: {
      EN: 'Join a guided heritage walk and earn bonus eco-points for arriving by train.',
      BM: 'Sertai berjalan kaki warisan berpandu dan kumpul mata eko bonus apabila tiba dengan tren.',
    },
    targetPath: '/tabs/tab2',
  },
  {
    date: '2026-07-12',
    title: {
      EN: 'Accessible Travel Meetup with Wira',
      BM: 'Perjumpaan Perjalanan Mesra Akses bersama Wira',
    },
    description: {
      EN: 'Share route tips, accessibility feedback, and community travel stories.',
      BM: 'Kongsi tip laluan, maklum balas kebolehcapaian, dan cerita perjalanan komuniti.',
    },
    targetPath: '/tabs/tab3',
  },
  {
    date: '2026-07-19',
    title: {
      EN: 'Explore Malaysia Weekend Challenge',
      BM: 'Cabaran Hujung Minggu Teroka Malaysia',
    },
    description: {
      EN: 'Complete one rail journey and one community contribution to unlock a new stamp.',
      BM: 'Lengkapkan satu perjalanan rel dan satu sumbangan komuniti untuk membuka cop baharu.',
    },
    targetPath: '/tabs/tab4',
  },
];

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnDestroy {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);
  private readonly router = inject(Router);
  private readonly uiTimeouts = new ManagedTimeouts();
  readonly copy = HOME_COPY;
  language: AppLanguage = 'EN';
  activeSheet: 'verification' | 'events' | null = null;
  toast = '';
  verificationAnswer: 'yes' | 'no' | null = null;
  ecoPoints = 0;
  savedNoticeCount = 0;
  activeJourney: AppJourney | null = null;
  events: HomeEvent[] = [];
  verificationTask: VerificationTaskDefinition | null = null;
  passportCollectedCount = 0;
  passportTotalCount = 0;
  challengeCompletedSteps = 0;
  challengeTotalSteps = 0;
  verificationCompletedCount = 0;
  verificationTotalCount = 0;

  constructor() {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
  }

  ionViewWillEnter(): void {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
  }

  ngOnDestroy(): void {
    this.uiTimeouts.clearAll();
  }

  go(path: string): void {
    void this.router.navigate([path]);
  }

  openNotifications(): void {
    void this.router.navigate(['/tabs/tab3'], { queryParams: { view: 'notices' } });
  }

  t(text: LocalizedText): string {
    return text[this.language];
  }

  updateLanguage(language: AppLanguage): void {
    this.language = this.accessibilityPreferencesService.setLanguage(language).language;
    this.events = this.buildHomeEvents();
  }

  notify(message: string): void {
    this.toast = message;
    this.uiTimeouts.schedule('toast', () => this.toast = '', 2200);
  }

  submitVerification(): void {
    if (!this.verificationTask) {
      return;
    }

    const awarded = this.appStateService.submitVerification(
      this.verificationTask.id,
      this.verificationTask.title,
    );
    this.activeSheet = null;
    this.verificationAnswer = null;
    this.refreshState();
    this.notify(awarded ? `+${this.verificationTask.points} ${this.t(this.copy.verificationAwarded)}` : this.t(this.copy.verificationDuplicate));
  }

  completeJourney(): void {
    const completedJourney = this.appStateService.completeActiveJourney();

    if (!completedJourney) {
      return;
    }

    this.refreshState();
    this.notify(`${this.t(this.copy.journeyCompleted)} +${completedJourney.points} ${this.t(this.copy.ecoPoints).toLowerCase()} ${this.language === 'EN' ? 'earned.' : 'diperoleh.'}`);
  }

  passportProgressSummary(): string {
    return this.language === 'EN'
      ? `${this.passportCollectedCount}/${this.passportTotalCount} stamps unlocked`
      : `${this.passportCollectedCount}/${this.passportTotalCount} cop dibuka`;
  }

  weeklyMissionSummary(): string {
    return this.language === 'EN'
      ? `${this.challengeCompletedSteps} of ${this.challengeTotalSteps} challenge steps completed this season.`
      : `${this.challengeCompletedSteps} daripada ${this.challengeTotalSteps} langkah cabaran selesai musim ini.`;
  }

  verificationCardSummary(): string {
    if (!this.verificationTask) {
      return this.language === 'EN'
        ? `All ${this.verificationTotalCount} nearby checkpoints are completed.`
        : `Semua ${this.verificationTotalCount} pusat semakan berdekatan telah selesai.`;
    }

    return this.language === 'EN'
      ? `Next checkpoint: ${this.t(this.verificationTask.place)}. ${this.verificationCompletedCount}/${this.verificationTotalCount} completed.`
      : `Pusat semakan seterusnya: ${this.t(this.verificationTask.place)}. ${this.verificationCompletedCount}/${this.verificationTotalCount} selesai.`;
  }

  verificationCardBadge(): string {
    return this.verificationTask
      ? `+${this.verificationTask.points}\n${this.t(this.copy.ecoPoints)}`
      : this.language === 'EN'
        ? 'All\ndone'
        : 'Selesai';
  }

  private refreshState(): void {
    const state = this.appStateService.getSnapshot();
    const progress = buildTravelProgress(state);
    const passportSummary = buildPassportSummary(progress);
    const challengeSummary = buildChallengeProgress(progress, passportSummary.collectedCount);
    const verificationProgress = buildVerificationProgress(state.completedVerificationIds);
    this.ecoPoints = state.ecoPoints;
    this.savedNoticeCount = state.savedNoticeIds.length;
    this.activeJourney = state.activeJourney;
    this.passportCollectedCount = passportSummary.collectedCount;
    this.passportTotalCount = passportSummary.totalCount;
    this.challengeCompletedSteps = challengeSummary.completedSteps;
    this.challengeTotalSteps = challengeSummary.totalSteps;
    this.verificationCompletedCount = verificationProgress.completedCount;
    this.verificationTotalCount = verificationProgress.totalCount;
    this.events = this.buildHomeEvents();
    this.verificationTask = verificationProgress.nextTask;
  }

  private buildHomeEvents(): HomeEvent[] {
    return SEEDED_HOME_EVENTS.map((event) => ({
      dateLabel: this.formatEventDate(event.date),
      title: event.title,
      description: event.description,
      targetPath: event.targetPath,
    }));
  }

  private formatEventDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(this.language === 'BM' ? 'ms-MY' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }
}
