import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
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

const HOME_COPY = {
  welcomeTitle: { EN: 'Welcome to MyTravel', BM: 'Selamat datang ke MyTravel' },
  profileProviderPending: { EN: 'Profile provider pending', BM: 'Penyedia profil belum disambungkan' },
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
  featuredDestinationAlt: { EN: 'Featured destination scenic view', BM: 'Pemandangan indah destinasi pilihan' },
  wiraMascotAlt: { EN: 'Wira travel guide mascot', BM: 'Maskot panduan perjalanan Wira' },
  manjaMascotAlt: { EN: 'Manja travel companion mascot', BM: 'Maskot teman perjalanan Manja' },
  closeSheet: { EN: 'Close panel', BM: 'Tutup panel' },
  closeEventsSheet: { EN: 'Close events panel', BM: 'Tutup panel acara' },
  verificationCardTitle: { EN: 'MyTravel Verification', BM: 'Pengesahan MyTravel' },
  weeklyMission: { EN: 'Weekly Mission with Wira', BM: 'Misi Mingguan bersama Wira' },
  weeklyMissionAction: { EN: 'View\nmission', BM: 'Lihat\nmisi' },
  weeklyMissionPendingTitle: { EN: 'Rewards provider pending', BM: 'Penyedia ganjaran belum disambungkan' },
  weeklyMissionPendingAction: { EN: 'View\nstatus', BM: 'Lihat\nstatus' },
  verificationKicker: { EN: 'MYTRAVEL VERIFICATION', BM: 'PENGESAHAN MYTRAVEL' },
  noVerificationTitle: { EN: 'No verification task yet', BM: 'Belum ada tugasan pengesahan' },
  noVerificationCopy: {
    EN: 'Verification checkpoints will appear here when your Firestore verification provider is connected.',
    BM: 'Pusat semakan pengesahan akan dipaparkan di sini apabila penyedia pengesahan Firestore anda disambungkan.',
  },
  verificationCardEmptyBadge: { EN: 'Awaiting\nprovider', BM: 'Menunggu\npenyedia' },
  verificationAnswerGroupAria: { EN: 'Verification answer options', BM: 'Pilihan jawapan pengesahan' },
  verificationAnswerPrefix: { EN: 'Select verification answer', BM: 'Pilih jawapan pengesahan' },
  answerYes: { EN: 'Yes', BM: 'Ya' },
  answerNo: { EN: 'No', BM: 'Tidak' },
  verificationReviewTitle: { EN: 'Wira is reviewing with you', BM: 'Wira sedang menyemak bersama anda' },
  verificationReviewCopy: { EN: 'Points awarded after verification', BM: 'Mata diberikan selepas pengesahan' },
  verificationSubmit: { EN: 'Submit verification', BM: 'Hantar pengesahan' },
  eventsKicker: { EN: 'EVENTS & ACTIVITIES', BM: 'ACARA & AKTIVITI' },
  eventsTitle: { EN: 'Events & Activities', BM: 'Acara & Aktiviti' },
  noEventsTitle: { EN: 'No events yet', BM: 'Belum ada acara' },
  noEventsCopy: {
    EN: 'Events will appear here when your Firestore events provider is connected.',
    BM: 'Acara akan dipaparkan di sini apabila penyedia acara Firestore anda disambungkan.',
  },
  noPassportProgressCopy: {
    EN: 'Passport stamps will appear here when your Firestore passport provider is connected.',
    BM: 'Cop pasport akan dipaparkan di sini apabila penyedia pasport Firestore anda disambungkan.',
  },
  noChallengeProgressCopy: {
    EN: 'Challenge progress will appear here when your Firestore rewards provider is connected.',
    BM: 'Kemajuan cabaran akan dipaparkan di sini apabila penyedia ganjaran Firestore anda disambungkan.',
  },
  notificationToast: { EN: 'Travel notices appear when available', BM: 'Notis perjalanan dipaparkan apabila tersedia' },
  verificationAwarded: { EN: 'Eco-Points earned. Thank you!', BM: 'Mata Eko diperoleh. Terima kasih!' },
  verificationDuplicate: { EN: 'You already completed this verification.', BM: 'Anda sudah menyelesaikan pengesahan ini.' },
  journeyCompleted: { EN: 'Journey completed.', BM: 'Perjalanan selesai.' },
} as const;

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
  @ViewChild('verificationSheet') private verificationSheetRef?: ElementRef<HTMLElement>;
  @ViewChild('eventsSheet') private eventsSheetRef?: ElementRef<HTMLElement>;
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
  private previousFocusedElement: HTMLElement | null = null;

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

  verificationAnswerAriaLabel(answer: 'yes' | 'no'): string {
    const label = answer === 'yes'
      ? this.t(this.copy.answerYes)
      : this.t(this.copy.answerNo);
    return `${this.t(this.copy.verificationAnswerPrefix)} ${label}`;
  }

  notify(message: string): void {
    this.toast = message;
    this.uiTimeouts.schedule('toast', () => this.toast = '', 2200);
  }

  openEventsSheet(): void {
    this.openSheet('events');
  }

  openVerificationSheet(): void {
    this.openSheet('verification');
  }

  closeActiveSheet(): void {
    if (!this.activeSheet) {
      return;
    }

    this.activeSheet = null;
    this.verificationAnswer = null;
    this.restoreFocus();
  }

  handleSheetBackdropClick(): void {
    this.closeActiveSheet();
  }

  handleSheetKeydown(event: KeyboardEvent, sheet: HTMLElement): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeActiveSheet();
      return;
    }

    if (event.key === 'Tab') {
      this.trapSheetFocus(event, sheet);
    }
  }

  submitVerification(): void {
    if (!this.verificationTask) {
      return;
    }

    const awarded = this.appStateService.submitVerification(
      this.verificationTask.id,
      this.verificationTask.title,
    );
    this.closeActiveSheet();
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
    if (this.passportTotalCount === 0) {
      return this.t(this.copy.noPassportProgressCopy);
    }

    return this.language === 'EN'
      ? `${this.passportCollectedCount}/${this.passportTotalCount} stamps unlocked`
      : `${this.passportCollectedCount}/${this.passportTotalCount} cop dibuka`;
  }

  weeklyMissionSummary(): string {
    if (this.challengeTotalSteps === 0) {
      return this.t(this.copy.noChallengeProgressCopy);
    }

    return this.language === 'EN'
      ? `${this.challengeCompletedSteps} of ${this.challengeTotalSteps} challenge steps completed this season.`
      : `${this.challengeCompletedSteps} daripada ${this.challengeTotalSteps} langkah cabaran selesai musim ini.`;
  }

  get challengeProgressWidth(): string {
    if (this.challengeTotalSteps === 0) {
      return '0%';
    }

    return `${Math.round((this.challengeCompletedSteps / this.challengeTotalSteps) * 100)}%`;
  }

  get weeklyMissionTitleLabel(): string {
    return this.challengeTotalSteps === 0
      ? this.t(this.copy.weeklyMissionPendingTitle)
      : this.t(this.copy.weeklyMission);
  }

  get weeklyMissionActionLabel(): string {
    return this.challengeTotalSteps === 0
      ? this.t(this.copy.weeklyMissionPendingAction)
      : this.t(this.copy.weeklyMissionAction);
  }

  verificationCardSummary(): string {
    if (!this.verificationTask) {
      if (this.verificationTotalCount === 0) {
        return this.t(this.copy.noVerificationCopy);
      }

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
      : this.verificationTotalCount === 0
        ? this.t(this.copy.verificationCardEmptyBadge)
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
    return [];
  }

  private openSheet(sheet: 'verification' | 'events'): void {
    this.previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.activeSheet = sheet;
    this.uiTimeouts.schedule('sheet-focus', () => {
      const target = sheet === 'verification'
        ? this.verificationSheetRef?.nativeElement
        : this.eventsSheetRef?.nativeElement;
      target?.focus();
    }, 0);
  }

  private restoreFocus(): void {
    const previousFocusedElement = this.previousFocusedElement;
    this.previousFocusedElement = null;
    this.uiTimeouts.schedule('sheet-focus-restore', () => previousFocusedElement?.focus(), 0);
  }

  private trapSheetFocus(event: KeyboardEvent, sheet: HTMLElement): void {
    const focusableElements = this.getFocusableElements(sheet);

    if (focusableElements.length === 0) {
      event.preventDefault();
      sheet.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  private getFocusableElements(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
  }
}
