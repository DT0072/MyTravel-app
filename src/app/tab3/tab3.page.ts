import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AccessibilityPreferencesService,
  AppLanguage,
} from '../services/accessibility-preferences.service';
import {
  AppStateService,
  CommunityPostReaction,
  CommunityTipDraft,
  SavedCommunityTip,
} from '../services/app-state.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import {
  getNextVerificationTask,
  VerificationTaskDefinition,
} from '../shared/utils/verification-tasks';

type LocalizedText = Record<AppLanguage, string>;
type CommunityView = 'community' | 'add' | 'notices' | 'verification';
type CommunityTab = 'tips' | 'verification';
type NoticeFilter = 'All' | 'Transit' | 'Destinations' | 'Weather';
type NoticeLevel = 'CRITICAL' | 'DISRUPTION' | 'ADVISORY';
type PostStatus = 'In review' | 'Approved';
type PostCategory = 'Heritage' | 'Nature' | 'Food';
type PostCategoryFilter = 'All' | PostCategory;
type PostSort = 'Latest' | 'Most helpful';

const MAX_OFFLINE_IMAGE_FILE_SIZE_BYTES = 250 * 1024;

const COMMUNITY_COPY = {
  pageTitle: { EN: 'Community', BM: 'Komuniti' },
  pageSubtitle: { EN: 'Community-shared and verified information.', BM: 'Maklumat yang dikongsi dan disahkan oleh komuniti.' },
  tipsTab: { EN: 'Travel Tips', BM: 'Tip Perjalanan' },
  verificationTab: { EN: 'Verifications', BM: 'Pengesahan' },
  allStates: { EN: 'All states', BM: 'Semua negeri' },
  allCategories: { EN: 'All categories', BM: 'Semua kategori' },
  categoryLabel: { EN: 'Category', BM: 'Kategori' },
  categoryHeritage: { EN: 'Heritage', BM: 'Warisan' },
  categoryNature: { EN: 'Nature', BM: 'Semula Jadi' },
  categoryFood: { EN: 'Food', BM: 'Makanan' },
  latest: { EN: 'Latest', BM: 'Terkini' },
  mostHelpful: { EN: 'Most helpful', BM: 'Paling membantu' },
  verified: { EN: 'Verified ✓', BM: 'Disahkan ✓' },
  inReview: { EN: 'In review', BM: 'Dalam semakan' },
  ecoPoints: { EN: 'Eco-Points', BM: 'Mata Eko' },
  pending: { EN: 'pending', BM: 'menunggu' },
  helpful: { EN: 'Helpful', BM: 'Membantu' },
  notHelpful: { EN: 'Not helpful', BM: 'Tidak membantu' },
  report: { EN: 'Report', BM: 'Laporkan' },
  addTip: { EN: '+ Add tip', BM: '+ Tambah tip' },
  missionTitle: { EN: 'Manja Community Mission', BM: 'Misi Komuniti Manja' },
  missionCopy: { EN: 'Share 2 useful verified tips', BM: 'Kongsi 2 tip berguna yang disahkan' },
  verificationNearby: { EN: 'VERIFICATION NEAR YOU', BM: 'PENGESAHAN BERDEKATAN' },
  verificationPreviewCopy: { EN: 'Confirm available details and earn Eco-Points.', BM: 'Sahkan butiran tersedia dan raih Mata Eko.' },
  noPostsTitle: { EN: 'No community tips yet', BM: 'Belum ada tip komuniti' },
  noPostsCopy: { EN: 'More community-shared travel guidance will appear soon.', BM: 'Lebih banyak panduan perjalanan yang dikongsi komuniti akan dipaparkan tidak lama lagi.' },
  noVerificationTitle: { EN: 'No verification tasks yet', BM: 'Belum ada tugasan pengesahan' },
  noVerificationCopy: { EN: 'More nearby verification checkpoints will appear soon.', BM: 'Lebih banyak pusat semakan berdekatan akan dipaparkan tidak lama lagi.' },
  noNoticesTitle: { EN: 'No travel notices yet', BM: 'Belum ada notis perjalanan' },
  noNoticesCopy: { EN: 'Current travel advisories will appear here when available.', BM: 'Nasihat perjalanan semasa akan dipaparkan di sini apabila tersedia.' },
  start: { EN: 'Start', BM: 'Mula' },
  addTravelTip: { EN: 'Add travel tip', BM: 'Tambah tip perjalanan' },
  backToCommunity: { EN: 'Back to community', BM: 'Kembali ke komuniti' },
  stepDetails: { EN: 'Details', BM: 'Butiran' },
  stepMedia: { EN: 'Media', BM: 'Media' },
  stepReview: { EN: 'Review', BM: 'Semakan' },
  location: { EN: 'Location', BM: 'Lokasi' },
  locationPlaceholder: { EN: 'Search places or attractions...', BM: 'Cari tempat atau tarikan...' },
  stateOrTerritory: { EN: 'State or territory', BM: 'Negeri atau wilayah' },
  yourTip: { EN: 'Your tip', BM: 'Tip anda' },
  yourTipPlaceholder: { EN: 'Operating hours, ticket prices, facilities, directions, unique features...', BM: 'Waktu operasi, harga tiket, kemudahan, arah, ciri istimewa...' },
  changePhoto: { EN: 'Change photo', BM: 'Tukar foto' },
  addPhoto: { EN: 'Add photo', BM: 'Tambah foto' },
  accessible: { EN: 'Accessible', BM: 'Mesra akses' },
  accessibleCopy: { EN: 'Wheelchair access, lifts and ramps available', BM: 'Akses kerusi roda, lif dan tanjakan tersedia' },
  hearingAccessible: { EN: 'Hearing accessible', BM: 'Mesra pendengaran' },
  hearingAccessibleCopy: { EN: 'Sign-language interpreter or hearing assistance', BM: 'Jurubahasa isyarat atau bantuan pendengaran' },
  confirmAccuracy: { EN: 'I confirm this information is accurate and current.', BM: 'Saya mengesahkan maklumat ini tepat dan terkini.' },
  saveDraft: { EN: 'Save draft', BM: 'Simpan draf' },
  submitForReview: { EN: 'Submit for review →', BM: 'Hantar untuk semakan →' },
  verificationTitle: { EN: 'MyTravel Verification', BM: 'Pengesahan MyTravel' },
  backToVerification: { EN: 'Back to community', BM: 'Kembali ke komuniti' },
  verifiedTransitHub: { EN: 'Verified transit hub', BM: 'Hab transit disahkan' },
  verificationQuestion: { EN: 'Are the operating hours still\n6:00 AM – 11:30 PM?', BM: 'Adakah waktu operasi masih\n6:00 PAGI – 11:30 MALAM?' },
  verificationLastUpdated: { EN: 'Last updated on 1 June 2026.', BM: 'Kali terakhir dikemas kini pada 1 Jun 2026.' },
  yes: { EN: 'Yes', BM: 'Ya' },
  no: { EN: 'No', BM: 'Tidak' },
  wiraReviewing: { EN: 'Wira is reviewing with you', BM: 'Wira sedang menyemak bersama anda' },
  pointsAwardedAfterVerification: { EN: 'Points awarded after verification', BM: 'Mata diberikan selepas pengesahan' },
  points: { EN: 'points', BM: 'mata' },
  submitVerification: { EN: 'Submit verification', BM: 'Hantar pengesahan' },
  travelNotices: { EN: 'Travel Notices', BM: 'Notis Perjalanan' },
  backToProfile: { EN: 'Back to community', BM: 'Kembali ke komuniti' },
  critical: { EN: 'Critical', BM: 'Kritikal' },
  disruption: { EN: 'Disruption', BM: 'Gangguan' },
  advisory: { EN: 'Advisory', BM: 'Peringatan' },
  allNotices: { EN: 'All', BM: 'Semua' },
  transit: { EN: 'Transit', BM: 'Transit' },
  destinations: { EN: 'Destinations', BM: 'Destinasi' },
  weather: { EN: 'Weather', BM: 'Cuaca' },
  saveNotice: { EN: '☆ Save', BM: '☆ Simpan' },
  savedNotice: { EN: '★ Saved', BM: '★ Disimpan' },
  share: { EN: 'Share', BM: 'Kongsi' },
  markedHelpful: { EN: 'Marked as helpful', BM: 'Ditandakan sebagai membantu' },
  feedbackRecorded: { EN: 'Feedback recorded', BM: 'Maklum balas direkodkan' },
  reportOpened: { EN: 'Report options opened', BM: 'Pilihan laporan dibuka' },
  chooseValidImage: { EN: 'Choose a valid image file', BM: 'Pilih fail imej yang sah' },
  chooseSmallerImage: { EN: 'Choose an image smaller than 5 MB', BM: 'Pilih imej yang lebih kecil daripada 5 MB' },
  chooseOfflineImage: {
    EN: 'Choose an image smaller than 250 KB so it can be saved offline',
    BM: 'Pilih imej lebih kecil daripada 250 KB supaya ia boleh disimpan di luar talian',
  },
  draftSaved: { EN: 'Draft saved locally', BM: 'Draf disimpan secara setempat' },
  tipSavedForReview: { EN: 'Your tip was saved for review', BM: 'Tip anda disimpan untuk semakan' },
  noticeSaved: { EN: 'Notice saved', BM: 'Notis disimpan' },
  noticeRemoved: { EN: 'Notice removed', BM: 'Notis dibuang' },
  copiedToClipboard: { EN: 'Notice copied to clipboard', BM: 'Notis disalin ke papan klip' },
  sharingUnavailable: { EN: 'Sharing is not available on this device', BM: 'Perkongsian tidak tersedia pada peranti ini' },
  shareTitle: { EN: 'MyTravel notice', BM: 'Notis MyTravel' },
  verificationAwarded: { EN: 'Eco-Points earned', BM: 'Mata Eko diperoleh' },
  verificationDuplicate: { EN: 'You already completed this verification', BM: 'Anda sudah melengkapkan pengesahan ini' },
  levelCritical: { EN: 'CRITICAL', BM: 'KRITIKAL' },
  levelDisruption: { EN: 'DISRUPTION', BM: 'GANGGUAN' },
  levelAdvisory: { EN: 'ADVISORY', BM: 'PERINGATAN' },
} as const;

interface CommunityPost {
  id: string;
  state: string;
  author: string;
  initials: string;
  category: PostCategory;
  place: LocalizedText;
  copy: LocalizedText;
  points: number;
  image: string;
  date: LocalizedText;
  createdAt: string;
  helpfulCount: number;
  status: PostStatus;
  reaction: CommunityPostReaction | null;
}

interface CommunityNotice {
  id: string;
  level: NoticeLevel;
  color: string;
  title: LocalizedText;
  place: LocalizedText;
  time: string;
  category: Exclude<NoticeFilter, 'All'>;
  saved: boolean;
}

const SEEDED_POSTS: Omit<CommunityPost, 'reaction'>[] = [
  {
    id: 'seeded-george-town',
    state: 'Penang',
    author: 'Aisyah',
    initials: 'AY',
    place: {
      EN: 'George Town Heritage Walk',
      BM: 'Jalan Warisan George Town',
    },
    copy: {
      EN: 'Start early before 9 AM for cooler streets, easier trishaw pickups, and shorter queues at the clan jetties.',
      BM: 'Mulakan awal sebelum 9 pagi untuk jalan yang lebih nyaman, mudah mendapatkan beca, dan barisan lebih pendek di jeti warisan.',
    },
    category: 'Heritage',
    points: 20,
    image: 'assets/mytravel/george-town.png',
    date: {
      EN: '28 Jun 2026',
      BM: '28 Jun 2026',
    },
    createdAt: '2026-06-28T09:30:00.000Z',
    helpfulCount: 18,
    status: 'Approved',
  },
  {
    id: 'seeded-raban-lake',
    state: 'Sarawak',
    author: 'Daniel',
    initials: 'DL',
    place: {
      EN: 'Tasik Raban boardwalk access',
      BM: 'Akses pelantar Tasik Raban',
    },
    copy: {
      EN: 'The lakeside route is smoother from the visitor centre entrance, with shaded rest stops every few hundred metres.',
      BM: 'Laluan tepi tasik lebih lancar dari pintu masuk pusat pelawat, dengan tempat rehat berbumbung setiap beberapa ratus meter.',
    },
    category: 'Nature',
    points: 20,
    image: 'assets/mytravel/raban-lake.png',
    date: {
      EN: '26 Jun 2026',
      BM: '26 Jun 2026',
    },
    createdAt: '2026-06-26T08:00:00.000Z',
    helpfulCount: 11,
    status: 'Approved',
  },
];

const SEEDED_NOTICES: Omit<CommunityNotice, 'saved'>[] = [
  {
    id: 'notice-kelana-jaya-delay',
    level: 'CRITICAL',
    color: '#cf3d2e',
    title: {
      EN: 'Kelana Jaya Line delays between KLCC and Ampang Park',
      BM: 'Kelewatan Laluan Kelana Jaya antara KLCC dan Ampang Park',
    },
    place: {
      EN: 'Expect 15 to 20 minute delays during evening peak service.',
      BM: 'Jangkakan kelewatan 15 hingga 20 minit semasa perkhidmatan puncak petang.',
    },
    time: '5:40 PM',
    category: 'Transit',
  },
  {
    id: 'notice-melaka-heat',
    level: 'ADVISORY',
    color: '#e39b22',
    title: {
      EN: 'Melaka heritage zone heat advisory',
      BM: 'Nasihat cuaca panas zon warisan Melaka',
    },
    place: {
      EN: 'Bring water and plan indoor museum stops between 12 PM and 3 PM.',
      BM: 'Bawa air dan rancang hentian muzium dalaman antara 12 tengah hari hingga 3 petang.',
    },
    time: '11:15 AM',
    category: 'Weather',
  },
  {
    id: 'notice-sabah-boardwalk',
    level: 'DISRUPTION',
    color: '#0d7a69',
    title: {
      EN: 'Temporary closure at Tanjung Aru boardwalk entrance',
      BM: 'Penutupan sementara di pintu masuk pelantar Tanjung Aru',
    },
    place: {
      EN: 'Use the southern accessible ramp while resurfacing works continue.',
      BM: 'Gunakan tanjakan mesra akses di bahagian selatan sementara kerja baik pulih diteruskan.',
    },
    time: '2:05 PM',
    category: 'Destinations',
  },
];

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnDestroy {
  private readonly accessibilityPreferencesService = inject(AccessibilityPreferencesService);
  private readonly appStateService = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeSubscription = new Subscription();
  private readonly uiTimeouts = new ManagedTimeouts();
  private pendingPhotoReader: FileReader | null = null;
  private photoSelectionToken = 0;
  private isDestroyed = false;
  readonly copy = COMMUNITY_COPY;
  readonly stateOptions = [
    'Kuala Lumpur',
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
    'Putrajaya',
    'Labuan',
  ];
  readonly categoryOptions: readonly PostCategory[] = ['Heritage', 'Nature', 'Food'];
  view: CommunityView = 'community';
  communityTab: CommunityTab = 'tips';
  filterState = 'All states';
  filterCategory: PostCategoryFilter = 'All';
  postSort: PostSort = 'Latest';
  noticeFilter: NoticeFilter = 'All';
  language: AppLanguage = 'EN';
  verificationAnswer: 'yes' | 'no' | null = null;
  toast = '';
  savedNoticeCount = 0;
  tipDraft: CommunityTipDraft = this.appStateService.getEmptyTipDraft();
  selectedPhotoName = '';
  selectedPhotoPreview = '';
  posts: CommunityPost[] = [];
  notices: CommunityNotice[] = [];
  verificationTask: VerificationTaskDefinition | null = null;

  constructor() {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
    this.routeSubscription.add(this.route.queryParamMap.subscribe((params) => {
      this.applyRouteState(params.get('view'), params.get('noticeFilter'));
    }));
  }

  ionViewWillEnter(): void {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.routeSubscription.unsubscribe();
    this.cancelPendingPhotoRead();
    this.uiTimeouts.clearAll();
  }

  t(text: LocalizedText): string {
    return text[this.language];
  }

  updateLanguage(language: AppLanguage): void {
    this.language = this.accessibilityPreferencesService.setLanguage(language).language;
  }

  get filteredNotices(): CommunityNotice[] {
    if (this.noticeFilter === 'All') {
      return this.notices;
    }

    return this.notices.filter((notice) => notice.category === this.noticeFilter);
  }

  get filteredPosts(): CommunityPost[] {
    return [...this.posts]
      .filter((post) => this.filterState === 'All states' || this.filterState === post.state)
      .filter((post) => this.filterCategory === 'All' || this.filterCategory === post.category)
      .sort((left, right) => this.comparePosts(left, right));
  }

  get criticalNoticeCount(): number {
    return this.notices.filter((notice) => notice.level === 'CRITICAL').length;
  }

  get disruptionNoticeCount(): number {
    return this.notices.filter((notice) => notice.level === 'DISRUPTION').length;
  }

  get advisoryNoticeCount(): number {
    return this.notices.filter((notice) => notice.level === 'ADVISORY').length;
  }

  setCommunityTab(tab: CommunityTab): void {
    this.communityTab = tab;
  }

  openAddTip(): void {
    this.view = 'add';
    this.syncRouteState('add');
  }

  startVerification(): void {
    this.view = 'verification';
    this.verificationAnswer = null;
    this.syncRouteState('verification');
  }

  openNotices(filter: NoticeFilter = 'All'): void {
    this.view = 'notices';
    this.noticeFilter = filter;
    this.syncRouteState('notices', filter);
  }

  setNoticeFilter(filter: NoticeFilter): void {
    this.noticeFilter = filter;

    if (this.view === 'notices') {
      this.syncRouteState('notices', filter);
    }
  }

  returnToCommunity(): void {
    this.view = 'community';
    this.syncRouteState('community');
  }

  reactToPost(post: CommunityPost, reaction: CommunityPostReaction): void {
    post.reaction = post.reaction === reaction ? null : reaction;
    this.appStateService.setPostReaction(post.id, post.reaction);
    this.showToast(reaction === 'helpful' ? this.t(this.copy.markedHelpful) : this.t(this.copy.feedbackRecorded));
  }

  handlePhotoSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.cancelPendingPhotoRead();

    if (!file.type.startsWith('image/')) {
      this.showToast(this.t(this.copy.chooseValidImage));
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showToast(this.t(this.copy.chooseSmallerImage));
      input.value = '';
      return;
    }

    if (file.size > MAX_OFFLINE_IMAGE_FILE_SIZE_BYTES) {
      this.showToast(this.t(this.copy.chooseOfflineImage));
      input.value = '';
      return;
    }

    this.selectedPhotoName = file.name;
    this.tipDraft.imageName = file.name;
    const reader = new FileReader();
    const selectionToken = ++this.photoSelectionToken;
    this.pendingPhotoReader = reader;
    reader.onload = () => {
      if (this.isDestroyed || selectionToken !== this.photoSelectionToken || this.pendingPhotoReader !== reader) {
        return;
      }

      this.selectedPhotoPreview = String(reader.result ?? '');
      this.tipDraft.imagePreview = this.selectedPhotoPreview;
      this.pendingPhotoReader = null;
    };
    reader.onerror = () => {
      if (this.pendingPhotoReader === reader) {
        this.pendingPhotoReader = null;
      }
    };
    reader.onabort = () => {
      if (this.pendingPhotoReader === reader) {
        this.pendingPhotoReader = null;
      }
    };
    reader.readAsDataURL(file);
  }

  saveDraft(): void {
    this.appStateService.saveTipDraft(this.tipDraft);
    this.showToast(this.t(this.copy.draftSaved));
  }

  submitTip(): void {
    const savedTip = this.appStateService.submitTip(this.tipDraft);
    const reactions = this.reactionMap(this.appStateService.getSnapshot().postReactions);
    this.posts = [
      this.mapSavedTip(savedTip, reactions),
      ...this.posts,
    ];
    this.tipDraft = this.appStateService.getEmptyTipDraft();
    this.selectedPhotoName = '';
    this.selectedPhotoPreview = '';
    this.view = 'community';
    this.communityTab = 'tips';
    this.filterState = 'All states';
    this.filterCategory = 'All';
    this.postSort = 'Latest';
    this.syncRouteState('community');
    this.showToast(this.t(this.copy.tipSavedForReview));
  }

  saveNotice(notice: CommunityNotice): void {
    notice.saved = this.appStateService.toggleSavedNotice(notice.id);
    this.showToast(notice.saved ? this.t(this.copy.noticeSaved) : this.t(this.copy.noticeRemoved));
  }

  async shareNotice(notice: CommunityNotice): Promise<void> {
    const text = `${this.t(notice.title)}\n${this.t(notice.place)}\n${notice.time}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: this.t(this.copy.shareTitle), text });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      this.showToast(this.t(this.copy.copiedToClipboard));
    } catch {
      this.showToast(this.t(this.copy.sharingUnavailable));
    }
  }

  postStatusLabel(status: PostStatus): string {
    return status === 'Approved' ? this.t(this.copy.verified) : this.t(this.copy.inReview);
  }

  postPointsLabel(post: CommunityPost): string {
    const pendingLabel = post.status === 'In review' ? ` ${this.t(this.copy.pending)}` : '';
    return `♧ +${post.points} ${this.t(this.copy.ecoPoints)}${pendingLabel}`;
  }

  categoryLabel(category: string): string {
    switch (category) {
      case 'Nature':
        return this.t(this.copy.categoryNature);
      case 'Food':
        return this.t(this.copy.categoryFood);
      default:
        return this.t(this.copy.categoryHeritage);
    }
  }

  noticeCategoryLabel(category: NoticeFilter): string {
    switch (category) {
      case 'Transit':
        return this.t(this.copy.transit);
      case 'Destinations':
        return this.t(this.copy.destinations);
      case 'Weather':
        return this.t(this.copy.weather);
      default:
        return this.t(this.copy.allNotices);
    }
  }

  noticeLevelLabel(level: NoticeLevel): string {
    switch (level) {
      case 'DISRUPTION':
        return this.t(this.copy.levelDisruption);
      case 'ADVISORY':
        return this.t(this.copy.levelAdvisory);
      default:
        return this.t(this.copy.levelCritical);
    }
  }

  showToast(message: string): void {
    this.toast = message;
    this.uiTimeouts.schedule('toast', () => this.toast = '', 2200);
  }

  submitVerification(): void {
    if (!this.verificationTask) {
      return;
    }

    const submittedTask = this.verificationTask;
    const awarded = this.appStateService.submitVerification(
      submittedTask.id,
      submittedTask.title,
    );
    this.verificationAnswer = null;
    this.view = 'community';
    this.refreshState();
    this.syncRouteState('community');
    this.showToast(awarded ? `+${submittedTask.points} ${this.t(this.copy.verificationAwarded)}` : this.t(this.copy.verificationDuplicate));
  }

  private refreshState(): void {
    const state = this.appStateService.getSnapshot();
    const reactions = this.reactionMap(state.postReactions);
    const savedTips = state.communityTips.map((tip) => this.mapSavedTip(tip, reactions));
    this.posts = [
      ...savedTips,
      ...this.buildSeededPosts(reactions),
    ];
    this.tipDraft = state.tipDraft ? { ...state.tipDraft } : this.appStateService.getEmptyTipDraft();
    this.selectedPhotoName = this.tipDraft.imageName ?? '';
    this.selectedPhotoPreview = this.tipDraft.imagePreview ?? '';
    this.savedNoticeCount = state.savedNoticeIds.length;
    const savedNoticeIds = new Set(state.savedNoticeIds);
    this.notices = SEEDED_NOTICES.map((notice) => ({
      ...notice,
      saved: savedNoticeIds.has(notice.id),
    }));
    this.verificationTask = getNextVerificationTask(state.completedVerificationIds);
  }

  private buildSeededPosts(reactions: Map<string, CommunityPost['reaction']>): CommunityPost[] {
    return SEEDED_POSTS.map((post) => ({
      ...post,
      reaction: reactions.get(post.id) ?? null,
    }));
  }

  private reactionMap(
    reactions: Record<string, CommunityPostReaction>,
  ): Map<string, CommunityPost['reaction']> {
    return new Map(Object.entries(reactions));
  }

  private mapSavedTip(
    tip: SavedCommunityTip,
    reactions: Map<string, CommunityPost['reaction']>,
  ): CommunityPost {
    return {
      id: tip.id,
      state: tip.state,
      author: tip.author,
      initials: tip.initials,
      category: this.normalizeCategory(tip.category),
      place: this.localizeUserText(tip.location),
      copy: this.localizeUserText(tip.tip),
      points: 20,
      image: tip.imagePreview || 'assets/home_1.png',
      date: this.formatDate(tip.createdAt),
      createdAt: tip.createdAt,
      helpfulCount: 0,
      status: tip.status,
      reaction: reactions.get(tip.id) ?? null,
    };
  }

  private localizeUserText(value: string): LocalizedText {
    return { EN: value, BM: value };
  }

  private cancelPendingPhotoRead(): void {
    if (!this.pendingPhotoReader) {
      return;
    }

    try {
      this.pendingPhotoReader.abort();
    } catch {
      // Ignore abort failures from already-finished reads.
    } finally {
      this.pendingPhotoReader = null;
    }
  }

  private formatDate(value: string): LocalizedText {
    const date = new Date(value);

    return {
      EN: new Intl.DateTimeFormat('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date),
      BM: new Intl.DateTimeFormat('ms-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date),
    };
  }

  private normalizeCategory(category: string): PostCategory {
    if (category === 'Nature' || category === 'Food') {
      return category;
    }

    return 'Heritage';
  }

  private comparePosts(left: CommunityPost, right: CommunityPost): number {
    if (this.postSort === 'Most helpful') {
      return this.getHelpfulScore(right) - this.getHelpfulScore(left)
        || this.compareCreatedAt(right.createdAt, left.createdAt);
    }

    return this.compareCreatedAt(right.createdAt, left.createdAt);
  }

  private getHelpfulScore(post: CommunityPost): number {
    const reactionDelta = post.reaction === 'helpful'
      ? 1
      : post.reaction === 'not-helpful'
        ? -1
        : 0;

    return post.helpfulCount + reactionDelta;
  }

  private compareCreatedAt(left: string, right: string): number {
    return new Date(left).getTime() - new Date(right).getTime();
  }

  private applyRouteState(
    requestedView: string | null,
    requestedNoticeFilter: string | null,
  ): void {
    this.view = this.isCommunityView(requestedView) ? requestedView : 'community';

    if (this.view === 'notices') {
      this.noticeFilter = this.isNoticeFilter(requestedNoticeFilter)
        ? requestedNoticeFilter
        : 'All';
    }
  }

  private syncRouteState(
    view: CommunityView,
    noticeFilter: NoticeFilter = 'All',
  ): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        view: view === 'community' ? null : view,
        noticeFilter: view === 'notices' && noticeFilter !== 'All' ? noticeFilter : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private isCommunityView(value: string | null): value is CommunityView {
    return value === 'community' || value === 'add' || value === 'notices' || value === 'verification';
  }

  private isNoticeFilter(value: string | null): value is NoticeFilter {
    return value === 'All' || value === 'Transit' || value === 'Destinations' || value === 'Weather';
  }
}
