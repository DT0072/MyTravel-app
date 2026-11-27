import { Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { addDoc, collection } from 'firebase/firestore';
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
import { AuthService } from '../services/auth.service';
import { FirebaseService } from '../services/firebase.service';
import { RemoteCommunityPost, RemoteTravelNotice, TourismDataService } from '../services/tourism-data.service';
import { ManagedTimeouts } from '../shared/utils/managed-timeouts';
import {
  getNextVerificationTask,
  VerificationTaskDefinition,
} from '../shared/utils/verification-tasks';

type LocalizedText = Record<AppLanguage, string>;
type CommunityView = 'community' | 'add' | 'notices' | 'verification' | 'creator';
type CommunityTab = 'tips' | 'verification';
type CreatorProfileTab = 'posts' | 'saved' | 'followers' | 'following';
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
  communityTabsAria: { EN: 'Community sections', BM: 'Bahagian komuniti' },
  tipsTab: { EN: 'Travel tips', BM: 'Tip perjalanan' },
  verificationTab: { EN: 'Verifications', BM: 'Pengesahan' },
  allStates: { EN: 'All states', BM: 'Semua negeri' },
  allCategories: { EN: 'All categories', BM: 'Semua kategori' },
  searchPlaceholder: { EN: 'Search places, food, tips, authors...', BM: 'Cari tempat, makanan, tip, penulis...' },
  searchAria: { EN: 'Search community travel tips', BM: 'Cari tip perjalanan komuniti' },
  clearSearch: { EN: 'Clear search', BM: 'Padam carian' },
  gridView: { EN: 'Discover', BM: 'Teroka' },
  feedView: { EN: 'Feed', BM: 'Suapan' },
  commentsLabel: { EN: 'Comments', BM: 'Komen' },
  addCommentPlaceholder: { EN: 'Share a tip or reply...', BM: 'Kongsi tip atau balasan...' },
  postComment: { EN: 'Post', BM: 'Hantar' },
  commentAdded: { EN: 'Comment added', BM: 'Komen ditambah' },
  postSavedToast: { EN: 'Saved to your bookmarks', BM: 'Disimpan ke penanda buku' },
  postUnsavedToast: { EN: 'Removed from bookmarks', BM: 'Dibuang daripada penanda buku' },
  postSharedToast: { EN: 'Travel tip copied to clipboard', BM: 'Tip perjalanan disalin ke papan klip' },
  savePost: { EN: 'Save', BM: 'Simpan' },
  savedPost: { EN: 'Saved', BM: 'Disimpan' },
  followAuthor: { EN: 'Follow', BM: 'Ikuti' },
  followingAuthor: { EN: 'Following', BM: 'Mengikuti' },
  followedToast: { EN: 'Following explorer', BM: 'Mengikuti pengembara' },
  unfollowedToast: { EN: 'Unfollowed explorer', BM: 'Berhenti mengikuti' },
  navigateHere: { EN: 'Navigate here', BM: 'Navigasi ke sini' },
  transitAccess: { EN: 'Nearest transit', BM: 'Transit terdekat' },
  openingHours: { EN: 'Best hours', BM: 'Waktu terbaik' },
  estimatedBudget: { EN: 'Est. budget', BM: 'Anggaran kos' },
  photosCount: { EN: 'photos', BM: 'foto' },
  verifiedExplorer: { EN: 'Verified Explorer', BM: 'Pengembara Disahkan' },
  myProfileBtn: { EN: 'My Profile', BM: 'Profil Saya' },
  editProfileBtn: { EN: 'Edit profile', BM: 'Edit profil' },
  saveProfileBtn: { EN: 'Save profile', BM: 'Simpan profil' },
  cancelBtn: { EN: 'Cancel', BM: 'Batal' },
  creatorPostsTab: { EN: 'Posts', BM: 'Kiriman' },
  creatorSavedTab: { EN: 'Saved', BM: 'Disimpan' },
  creatorFollowersTab: { EN: 'Followers', BM: 'Pengikut' },
  creatorFollowingTab: { EN: 'Following', BM: 'Mengikuti' },
  likesLabel: { EN: 'Helpful', BM: 'Membantu' },
  editPostBtn: { EN: 'Edit', BM: 'Edit' },
  deletePostBtn: { EN: 'Delete', BM: 'Padam' },
  editTravelTipTitle: { EN: 'Edit travel tip', BM: 'Edit tip perjalanan' },
  saveChangesBtn: { EN: 'Save changes', BM: 'Simpan perubahan' },
  postUpdatedToast: { EN: 'Travel tip updated', BM: 'Tip perjalanan dikemas kini' },
  postDeletedToast: { EN: 'Travel tip deleted', BM: 'Tip perjalanan dipadamkan' },
  profileUpdatedToast: { EN: 'Community profile updated', BM: 'Profil komuniti dikemas kini' },
  bioLabel: { EN: 'Bio', BM: 'Bio' },
  homeStateLabel: { EN: 'Home state', BM: 'Negeri asal' },
  displayNameLabel: { EN: 'Display name', BM: 'Nama paparan' },
  newPostBtn: { EN: 'New post', BM: 'Kiriman baharu' },
  noSavedPostsCopy: { EN: 'Tap Save on any travel note to bookmark it here.', BM: 'Ketik Simpan pada mana-mana nota perjalanan untuk menandainya di sini.' },
  noCreatorPostsCopy: { EN: 'Share your first Malaysian travel note to build your creator feed.', BM: 'Kongsi nota perjalanan Malaysia pertama anda untuk membina suapan anda.' },
  noFollowersCopy: { EN: 'Followers will appear here as explorers discover your travel notes.', BM: 'Pengikut akan dipaparkan di sini apabila pengembara menemui nota anda.' },
  noFollowingCopy: { EN: 'Follow travel creators to see their latest routes and tips here.', BM: 'Ikuti pencipta perjalanan untuk melihat laluan dan tip terkini mereka di sini.' },
  noSearchMatchTitle: { EN: 'No matching tips found', BM: 'Tiada tip sepadan ditemui' },
  noSearchMatchCopy: { EN: 'Try another keyword or clear your filters to explore all community posts.', BM: 'Cuba kata kunci lain atau kosongkan penapis untuk meneroka semua kiriman komuniti.' },
  filterStateAria: { EN: 'Filter tips by state', BM: 'Tapis tip mengikut negeri' },
  filterCategoryAria: { EN: 'Filter tips by category', BM: 'Tapis tip mengikut kategori' },
  sortPostsAria: { EN: 'Sort community tips', BM: 'Susun tip komuniti' },
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
  helpfulPostAriaPrefix: { EN: 'Mark tip as helpful', BM: 'Tandakan tip sebagai membantu' },
  notHelpfulPostAriaPrefix: { EN: 'Mark tip as not helpful', BM: 'Tandakan tip sebagai tidak membantu' },
  reportPostAriaPrefix: { EN: 'Report travel tip', BM: 'Laporkan tip perjalanan' },
  localSubmissionAuthor: { EN: 'Local submission', BM: 'Kiriman setempat' },
  localSubmissionInitials: { EN: 'LS', BM: 'KS' },
  addTip: { EN: 'Add travel tip', BM: 'Tambah tip perjalanan' },
  addTipAria: {
    EN: 'Add a community travel tip. Opens the travel tip form.',
    BM: 'Tambah tip perjalanan komuniti. Membuka borang tip perjalanan.',
  },
  missionTitle: { EN: 'Manja Community Mission', BM: 'Misi Komuniti Manja' },
  missionCopy: { EN: '0 of 2 local community updates submitted.', BM: '0 daripada 2 kemas kini komuniti setempat telah dihantar.' },
  missionProgressCopy: { EN: '{count} of 2 local community updates submitted.', BM: '{count} daripada 2 kemas kini komuniti setempat telah dihantar.' },
  missionCompleteCopy: { EN: '2 of 2 local community updates completed.', BM: '2 daripada 2 kemas kini komuniti setempat telah selesai.' },
  missionContribute: { EN: 'Contribute', BM: 'Sumbang' },
  missionPendingTitle: { EN: 'Verification provider pending', BM: 'Penyedia pengesahan belum disambungkan' },
  missionPendingCopy: {
    EN: 'Verification tasks will appear here when your Firestore verification provider is connected.',
    BM: 'Tugasan pengesahan akan dipaparkan di sini apabila penyedia pengesahan Firestore anda disambungkan.',
  },
  verificationNearby: { EN: 'VERIFICATION NEAR YOU', BM: 'PENGESAHAN BERDEKATAN' },
  verificationPreviewCopy: { EN: 'Confirm available details and earn Eco-Points.', BM: 'Sahkan butiran tersedia dan raih Mata Eko.' },
  noPostsTitle: { EN: 'No community tips yet', BM: 'Belum ada tip komuniti' },
  noPostsCopy: {
    EN: 'Community tips will appear here after local submissions or when your Firestore community provider is connected.',
    BM: 'Tip komuniti akan dipaparkan di sini selepas kiriman setempat atau apabila penyedia komuniti Firestore anda disambungkan.',
  },
  noVerificationTitle: { EN: 'All nearby checkpoints verified', BM: 'Semua pusat semakan berdekatan disahkan' },
  noVerificationCopy: {
    EN: 'Thank you for helping keep Malaysian transit and destination details accurate. New checkpoints will appear as you travel.',
    BM: 'Terima kasih kerana membantu mengekalkan ketepatan maklumat transit dan destinasi Malaysia. Pusat semakan baharu akan muncul semasa anda mengembara.',
  },
  noNoticesTitle: { EN: 'No travel notices yet', BM: 'Belum ada notis perjalanan' },
  noNoticesCopy: {
    EN: 'Travel notices will appear here when your Firestore notices provider is connected.',
    BM: 'Notis perjalanan akan dipaparkan di sini apabila penyedia notis Firestore anda disambungkan.',
  },
  start: { EN: 'Start', BM: 'Mula' },
  viewStatus: { EN: 'View status', BM: 'Lihat status' },
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
  photoGuideTitle: { EN: 'Add your own photo', BM: 'Tambah foto anda sendiri' },
  photoGuideCopy: {
    EN: 'Use a current photo from your visit. Sample photos are not included here.',
    BM: 'Gunakan foto semasa daripada lawatan anda. Foto contoh tidak disertakan di sini.',
  },
  photoPreviewEmptyTitle: { EN: 'No photo selected', BM: 'Belum pilih foto' },
  photoPreviewEmptyCopy: {
    EN: 'Your selected image preview will appear here.',
    BM: 'Pratonton imej yang dipilih akan dipaparkan di sini.',
  },
  selectedPhotoAlt: { EN: 'Selected travel photo preview', BM: 'Pratonton foto perjalanan yang dipilih' },
  uploadPhotoAria: { EN: 'Choose a travel photo', BM: 'Pilih foto perjalanan' },
  noPostPhotoTitle: { EN: 'No photo uploaded', BM: 'Tiada foto dimuat naik' },
  noPostPhotoCopy: {
    EN: 'Submitted without a travel photo.',
    BM: 'Dihantar tanpa foto perjalanan.',
  },
  manjaMascotAlt: { EN: 'Manja travel companion mascot', BM: 'Maskot teman perjalanan Manja' },
  wiraMascotAlt: { EN: 'Wira travel guide mascot', BM: 'Maskot panduan perjalanan Wira' },
  accessible: { EN: 'Accessible', BM: 'Mesra akses' },
  accessibleCopy: { EN: 'Wheelchair access, lifts and ramps available', BM: 'Akses kerusi roda, lif dan tanjakan tersedia' },
  hearingAccessible: { EN: 'Hearing accessible', BM: 'Mesra pendengaran' },
  hearingAccessibleCopy: { EN: 'Sign-language interpreter or hearing assistance', BM: 'Jurubahasa isyarat atau bantuan pendengaran' },
  confirmAccuracy: { EN: 'I confirm this information is accurate and current.', BM: 'Saya mengesahkan maklumat ini tepat dan terkini.' },
  saveDraft: { EN: 'Save draft', BM: 'Simpan draf' },
  submitForReview: { EN: 'Submit for review', BM: 'Hantar untuk semakan' },
  saveDraftAria: {
    EN: 'Save this travel tip draft locally',
    BM: 'Simpan draf tip perjalanan ini secara setempat',
  },
  submitForReviewReadyAria: {
    EN: 'Submit this travel tip for review',
    BM: 'Hantar tip perjalanan ini untuk semakan',
  },
  submitForReviewDisabledAria: {
    EN: 'Complete the required travel tip fields before submitting for review',
    BM: 'Lengkapkan medan wajib tip perjalanan sebelum menghantar untuk semakan',
  },
  verificationTitle: { EN: 'MyTravel Verification', BM: 'Pengesahan MyTravel' },
  backToVerification: { EN: 'Back to community', BM: 'Kembali ke komuniti' },
  verifiedTransitHub: { EN: 'Verified transit hub', BM: 'Hab transit disahkan' },
  verificationQuestion: { EN: 'Are the operating hours still\n6:00 AM – 11:30 PM?', BM: 'Adakah waktu operasi masih\n6:00 PAGI – 11:30 MALAM?' },
  verificationLastUpdated: { EN: 'Last updated on 1 June 2026.', BM: 'Kali terakhir dikemas kini pada 1 Jun 2026.' },
  verificationAnswerGroupAria: { EN: 'Verification answer options', BM: 'Pilihan jawapan pengesahan' },
  verificationAnswerPrefix: { EN: 'Select verification answer', BM: 'Pilih jawapan pengesahan' },
  yes: { EN: 'Yes', BM: 'Ya' },
  no: { EN: 'No', BM: 'Tidak' },
  wiraReviewing: { EN: 'Wira is reviewing with you', BM: 'Wira sedang menyemak bersama anda' },
  pointsAwardedAfterVerification: { EN: 'Points awarded after verification', BM: 'Mata diberikan selepas pengesahan' },
  points: { EN: 'points', BM: 'mata' },
  submitVerification: { EN: 'Submit verification', BM: 'Hantar pengesahan' },
  submitVerificationReadyAria: {
    EN: 'Submit the selected verification answer',
    BM: 'Hantar jawapan pengesahan yang dipilih',
  },
  submitVerificationDisabledAria: {
    EN: 'Select Yes or No before submitting this verification',
    BM: 'Pilih Ya atau Tidak sebelum menghantar pengesahan ini',
  },
  travelNotices: { EN: 'Travel notices', BM: 'Notis perjalanan' },
  noticeFiltersAria: { EN: 'Travel notice filters', BM: 'Penapis notis perjalanan' },
  backToProfile: { EN: 'Back to community', BM: 'Kembali ke komuniti' },
  critical: { EN: 'Critical', BM: 'Kritikal' },
  disruption: { EN: 'Disruption', BM: 'Gangguan' },
  advisory: { EN: 'Advisory', BM: 'Peringatan' },
  allNotices: { EN: 'All', BM: 'Semua' },
  transit: { EN: 'Transit', BM: 'Transit' },
  destinations: { EN: 'Destinations', BM: 'Destinasi' },
  weather: { EN: 'Weather', BM: 'Cuaca' },
  saveNotice: { EN: 'Save', BM: 'Simpan' },
  savedNotice: { EN: 'Saved', BM: 'Disimpan' },
  share: { EN: 'Share', BM: 'Kongsi' },
  noticeFilterAriaPrefix: { EN: 'Filter notices by', BM: 'Tapis notis mengikut' },
  saveNoticeAriaPrefix: { EN: 'Save travel notice', BM: 'Simpan notis perjalanan' },
  savedNoticeAriaPrefix: { EN: 'Saved travel notice', BM: 'Notis perjalanan disimpan' },
  shareNoticeAriaPrefix: { EN: 'Share travel notice', BM: 'Kongsi notis perjalanan' },
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
  reportSheetKicker: { EN: 'COMMUNITY MODERATION', BM: 'MODERASI KOMUNITI' },
  reportSheetTitle: { EN: 'Report travel tip', BM: 'Laporkan tip perjalanan' },
  reportReasonOutdated: { EN: 'Outdated information', BM: 'Maklumat sudah lapuk' },
  reportReasonInaccurate: { EN: 'Inaccurate location or hours', BM: 'Lokasi atau waktu tidak tepat' },
  reportReasonInappropriate: { EN: 'Inappropriate or spam content', BM: 'Kandungan tidak sesuai atau spam' },
  reportReasonDuplicate: { EN: 'Duplicate travel tip', BM: 'Tip perjalanan berganda' },
  reportNotePlaceholder: { EN: 'Optional note for MyTravel moderators...', BM: 'Nota pilihan untuk moderator MyTravel...' },
  submitReport: { EN: 'Submit report', BM: 'Hantar laporan' },
  reportSubmitted: { EN: 'Report submitted for moderator review. Thank you.', BM: 'Laporan dihantar untuk semakan moderator. Terima kasih.' },
  tipCharHint: { EN: 'minimum 20 characters', BM: 'minimum 20 aksara' },
} as const;

interface CommunityPost {
  id: string;
  state: string;
  author: string;
  initials: string;
  category: PostCategory;
  place: LocalizedText;
  copy: LocalizedText;
  longCopy?: LocalizedText;
  images?: string[];
  tags?: string[];
  transitTip?: LocalizedText;
  openHours?: string;
  budget?: string;
  accessibilityTags?: string[];
  points: number;
  image: string | null;
  date: LocalizedText;
  createdAt: string;
  helpfulCount: number;
  status: PostStatus;
  reaction: CommunityPostReaction | null;
}

interface CommunityComment {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  likes: number;
  liked?: boolean;
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
    longCopy: {
      EN: 'Start your morning loop at Armenian Street before 9:00 AM when the shophouses glow in soft golden light and the murals have zero queue.\n\nFrom there, stroll 8 minutes down to Chew Jetty for sea breezes and traditional iced nutmeg juice, then hop on the Rapid Penang CAT free shuttle back towards KOMTAR or Little India for nasi kandar lunch.',
      BM: 'Mulakan pusingan pagi anda di Lebuh Armenian sebelum 9:00 pagi ketika rumah kedai bermandikan cahaya pagi dan mural belum sesak.\n\nKemudian berjalan 8 minit ke Jeti Chew untuk bayu laut dan jus buah pala sejuk, sebelum menaiki bas percuma Rapid Penang CAT ke KOMTAR atau Little India untuk makan tengah hari nasi kandar.',
    },
    images: [
      'assets/mytravel/george-town.png',
      'assets/mytravel/melaka.png',
      'assets/home_1.png',
    ],
    tags: ['#GeorgeTown', '#PenangHeritage', '#UNESCO', '#CATFreeShuttle', '#VM2026'],
    transitTip: {
      EN: 'Rapid Penang CAT Free Shuttle (Stop 9 – Armenian St) · 3 min walk',
      BM: 'Bas Percuma Rapid Penang CAT (Hentian 9 – Lebuh Armenian) · 3 minit jalan kaki',
    },
    openHours: '07:30 – 19:00',
    budget: 'RM15 – RM35',
    accessibilityTags: ['Step-free street loop', 'Shaded five-foot ways'],
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
    state: 'Perak',
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
    longCopy: {
      EN: 'Enter via the main visitor centre carpark on the southern shore—the wooden boardwalk is newly leveled and super smooth for strollers and wheelchairs.\n\nStay until 5:30 PM for mirror-like reflections of the Lenggong limestone hills, and don’t miss the lakeside stalls serving crispy ikan pekasam and fresh ulam.',
      BM: 'Masuk melalui tempat letak kereta pusat pelawat di tebing selatan—pelantar kayu baru diratakan dan sangat lancar untuk kereta sorong dan kerusi roda.\n\nTunggu hingga 5:30 petang untuk pantulan bukit batu kapur Lenggong seperti cermin, dan cuba gerai tepi tasik yang menghidangkan ikan pekasam rangup.',
    },
    images: [
      'assets/mytravel/raban-lake.png',
      'assets/mytravel/timah-tasoh-hero.png',
      'assets/Mount_kinabalu.png',
    ],
    tags: ['#TasikRaban', '#LenggongUNESCO', '#PerakEco', '#WheelchairFriendly'],
    transitTip: {
      EN: 'KTM ETS Kuala Kangsar + Perak Transit Feeder to Lenggong',
      BM: 'KTM ETS Kuala Kangsar + Bas Pengantara Perak Transit ke Lenggong',
    },
    openHours: '07:00 – 19:00',
    budget: 'RM10 – RM25',
    accessibilityTags: ['Level boardwalk', 'Shaded rest pavilions'],
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
  {
    id: 'seeded-pasar-seni-kopitiam',
    state: 'Kuala Lumpur',
    author: 'Mei Ling',
    initials: 'ML',
    place: {
      EN: 'Pasar Seni Heritage Kopitiam Lane',
      BM: 'Lorong Kopitiam Warisan Pasar Seni',
    },
    copy: {
      EN: 'Exit via Pasar Seni LRT Gate B for the sheltered walkway straight to traditional Hainanese coffee and curry laksa stalls.',
      BM: 'Keluar melalui Pintu B LRT Pasar Seni untuk laluan berbumbung terus ke gerai kopi Hainan tradisi dan laksa kari.',
    },
    longCopy: {
      EN: 'Take the LRT Kelana Jaya Line or MRT Kajang Line to Pasar Seni and exit via Gate B—the sheltered linkway keeps you completely dry even during afternoon KL showers.\n\nWalk 3 minutes into Lorong Panggung for charcoal-toasted kaya butter bread, silky soft-boiled eggs, and rich curry laksa, then browse the Central Market art-deco craft stalls right next door.',
      BM: 'Naiki LRT Laluan Kelana Jaya atau MRT Laluan Kajang ke Pasar Seni dan keluar melalui Pintu B—laluan berbumbung melindungi anda walaupun hujan petang di KL.\n\nBerjalan 3 minit ke Lorong Panggung untuk roti bakar arang kaya mentega, telur separuh masak, dan laksa kari pekat, kemudian singgah di gerai kraf Central Market bersebelahan.',
    },
    images: [
      'assets/home_1.png',
      'assets/Thean-ho-temple.png',
      'assets/mytravel/melaka.png',
    ],
    tags: ['#PasarSeni', '#KLKopitiam', '#LRTKelanaJaya', '#CentralMarket', '#HalalFriendly'],
    transitTip: {
      EN: 'LRT Kelana Jaya / MRT Kajang · Pasar Seni Gate B (3 min sheltered walk)',
      BM: 'LRT Kelana Jaya / MRT Kajang · Pasar Seni Pintu B (3 minit laluan berbumbung)',
    },
    openHours: '07:30 – 17:30',
    budget: 'RM12 – RM28',
    accessibilityTags: ['Station lift at Gate B', 'Sheltered walkway'],
    category: 'Food',
    points: 20,
    image: 'assets/home_1.png',
    date: {
      EN: '29 Jun 2026',
      BM: '29 Jun 2026',
    },
    createdAt: '2026-06-29T11:15:00.000Z',
    helpfulCount: 14,
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
    color: '#d97706',
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
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FirebaseService);
  private readonly tourismDataService = inject(TourismDataService, { optional: true });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeSubscription = new Subscription();
  private readonly uiTimeouts = new ManagedTimeouts();
  private pendingPhotoReader: FileReader | null = null;
  private photoSelectionToken = 0;
  private isDestroyed = false;
  private remotePosts: RemoteCommunityPost[] = [];
  private remoteNotices: RemoteTravelNotice[] = [];
  @ViewChild('communityContent') private communityContent?: IonContent;
  readonly copy = COMMUNITY_COPY;
  reportingPost: CommunityPost | null = null;
  selectedPost: CommunityPost | null = null;
  detailPhotoIndex = 0;
  commentDraft = '';
  viewingCreatorName: string | null = null;
  creatorTab: CreatorProfileTab = 'posts';
  isEditingProfile = false;
  editingTipId: string | null = null;
  profileDraft = {
    displayName: '',
    bio: '',
    homeState: 'Kuala Lumpur',
  };
  readonly savedPostIds = new Set<string>();
  readonly followedAuthors = new Set<string>();
  private readonly creatorBios: Record<string, { bio: string; state: string; followers: string[] }> = {
    'Mei Ling': {
      bio: 'KL heritage kopitiam hunter & LRT commuter. Sharing rain-proof food walks across Greater KL.',
      state: 'Kuala Lumpur',
      followers: ['Aisyah', 'Daniel', 'Aiman'],
    },
    Aisyah: {
      bio: 'Penang UNESCO trail walker & ferry enthusiast. Early morning street photography & local eats.',
      state: 'Penang',
      followers: ['Mei Ling', 'Nadia', 'Daniel'],
    },
    Daniel: {
      bio: 'Accessibility & eco-lake explorer across Perak & northern Malaysia.',
      state: 'Perak',
      followers: ['Aisyah', 'Hafiz'],
    },
  };
  readonly postComments: Record<string, CommunityComment[]> = {
    'seeded-pasar-seni-kopitiam': [
      { id: 'c-1', author: 'Aiman', initials: 'AI', text: 'Gate B lift is working smoothly too — great tip for rainy afternoons!', time: '2h ago', likes: 5 },
      { id: 'c-2', author: 'Siti Nur', initials: 'SN', text: 'Tried the charcoal kaya toast at 8:15 AM, zero queue and super crispy!', time: '1d ago', likes: 3 },
    ],
    'seeded-george-town': [
      { id: 'c-3', author: 'Nadia', initials: 'NA', text: 'The CAT free shuttle stops right near Armenian Street, super convenient.', time: '5h ago', likes: 7 },
    ],
    'seeded-raban-lake': [
      { id: 'c-4', author: 'Hafiz', initials: 'HF', text: 'Sunset at 6 PM here is unreal. Bring a hat if visiting midday!', time: '1d ago', likes: 4 },
    ],
  };
  searchQuery = '';
  feedLayout: 'grid' | 'feed' = 'grid';
  reportReason: 'outdated' | 'inaccurate' | 'inappropriate' | 'duplicate' = 'outdated';
  reportNote = '';
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
  communityMissionCompletedCount = 0;
  readonly communityMissionTargetCount = 2;

  constructor() {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
    this.routeSubscription.add(this.route.queryParamMap.subscribe((params) => {
      this.applyRouteState(params.get('view'), params.get('noticeFilter'), params.get('author'));
    }));
    if (this.tourismDataService?.communityPosts$) {
      this.routeSubscription.add(this.tourismDataService.communityPosts$.subscribe((remote) => {
        this.remotePosts = remote;
        this.refreshState();
      }));
    }
    if (this.tourismDataService?.travelNotices$) {
      this.routeSubscription.add(this.tourismDataService.travelNotices$.subscribe((remote) => {
        this.remoteNotices = remote;
        this.refreshState();
      }));
    }
  }

  ionViewWillEnter(): void {
    this.language = this.accessibilityPreferencesService.getPreferences().language;
    this.refreshState();
    const queryMap = this.route.snapshot?.queryParamMap;
    if (queryMap) {
      this.applyRouteState(queryMap.get('view'), queryMap.get('noticeFilter'), queryMap.get('author'));
    } else {
      this.view = 'community';
      this.selectedPost = null;
      this.viewingCreatorName = null;
    }
    void this.tourismDataService?.refreshFromFirestore();
  }

  ionViewWillLeave(): void {
    this.selectedPost = null;
    this.reportingPost = null;
    this.isEditingProfile = false;
    this.viewingCreatorName = null;
    this.view = 'community';
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
    const query = this.searchQuery.trim().toLowerCase();
    return [...this.posts]
      .filter((post) => this.filterState === 'All states' || this.filterState === post.state)
      .filter((post) => this.filterCategory === 'All' || this.filterCategory === post.category)
      .filter((post) => {
        if (!query) return true;
        const haystack = [
          post.state,
          post.category,
          post.author,
          post.place.EN,
          post.place.BM,
          post.copy.EN,
          post.copy.BM,
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .sort((left, right) => this.comparePosts(left, right));
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  resetAllFilters(): void {
    this.searchQuery = '';
    this.filterState = 'All states';
    this.filterCategory = 'All';
    this.postSort = 'Latest';
  }

  onPostImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.dataset['fallbackApplied']) {
      return;
    }
    img.dataset['fallbackApplied'] = '1';
    img.src = 'assets/mytravel/george-town.png';
  }

  setFeedLayout(layout: 'grid' | 'feed'): void {
    this.feedLayout = layout;
  }

  selectCategoryChip(category: PostCategoryFilter): void {
    this.filterCategory = category;
  }

  openPostDetail(post: CommunityPost): void {
    this.selectedPost = post;
    this.detailPhotoIndex = 0;
    this.commentDraft = '';
  }

  closePostDetail(): void {
    this.selectedPost = null;
    this.detailPhotoIndex = 0;
    this.commentDraft = '';
  }

  postGalleryImages(post: CommunityPost): string[] {
    if (post.images && post.images.length > 0) {
      return post.images;
    }
    return post.image ? [post.image] : [];
  }

  prevDetailPhoto(): void {
    if (!this.selectedPost) return;
    const imgs = this.postGalleryImages(this.selectedPost);
    if (imgs.length <= 1) return;
    this.detailPhotoIndex = (this.detailPhotoIndex - 1 + imgs.length) % imgs.length;
    this.scrollDetailGalleryTo(this.detailPhotoIndex);
  }

  nextDetailPhoto(): void {
    if (!this.selectedPost) return;
    const imgs = this.postGalleryImages(this.selectedPost);
    if (imgs.length <= 1) return;
    this.detailPhotoIndex = (this.detailPhotoIndex + 1) % imgs.length;
    this.scrollDetailGalleryTo(this.detailPhotoIndex);
  }

  selectDetailPhoto(index: number): void {
    this.detailPhotoIndex = index;
    this.scrollDetailGalleryTo(index);
  }

  onDetailGalleryScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== this.detailPhotoIndex) {
      this.detailPhotoIndex = idx;
    }
  }

  private scrollDetailGalleryTo(index: number): void {
    const track = document.querySelector('.detail-gallery-track') as HTMLElement | null;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  }

  isAuthorFollowed(author: string): boolean {
    return this.followedAuthors.has(author);
  }

  toggleFollowAuthor(author: string, event?: Event): void {
    event?.stopPropagation();
    const followed = this.appStateService.toggleFollowedAuthor(author);
    if (followed) {
      this.followedAuthors.add(author);
      this.showToast(this.t(this.copy.followedToast));
    } else {
      this.followedAuthors.delete(author);
      this.showToast(this.t(this.copy.unfollowedToast));
    }
  }

  get myCreatorDisplayName(): string {
    const social = this.appStateService.getSnapshot()?.socialProfile;
    if (social?.displayNameOverride) return social.displayNameOverride;
    const user = this.authService.currentUser;
    if (user && !user.isGuest && user.displayName) return user.displayName;
    return 'Traveler';
  }

  get myCreatorInitials(): string {
    const name = this.myCreatorDisplayName;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'TR';
  }

  openMyCreatorProfile(): void {
    this.openCreatorProfile(this.myCreatorDisplayName);
  }

  openCreatorProfile(authorName: string, event?: Event): void {
    event?.stopPropagation();
    const clean = authorName.trim() || this.myCreatorDisplayName;
    this.selectedPost = null;
    this.viewingCreatorName = clean;
    this.creatorTab = 'posts';
    this.isEditingProfile = false;
    this.view = 'creator';
    const isOwn = clean.toLowerCase() === this.myCreatorDisplayName.toLowerCase();
    this.syncRouteState('creator', 'All', isOwn ? null : clean);
    void this.communityContent?.scrollToTop(0);
  }

  isViewingOwnProfile(): boolean {
    if (!this.viewingCreatorName) return false;
    const target = this.viewingCreatorName.toLowerCase();
    const user = this.authService.currentUser;
    return (
      target === this.myCreatorDisplayName.toLowerCase() ||
      (Boolean(user && !user.isGuest && user.displayName) && target === user!.displayName.toLowerCase()) ||
      target === 'traveler'
    );
  }

  creatorProfileMeta(): { name: string; initials: string; bio: string; state: string; posts: CommunityPost[]; followers: string[]; following: string[]; totalHelpful: number } {
    const name = this.viewingCreatorName || this.myCreatorDisplayName;
    const isOwn = this.isViewingOwnProfile();
    const snapshot = this.appStateService.getSnapshot();
    const social = snapshot.socialProfile;
    const preset = this.creatorBios[name];
    const posts = this.posts.filter((p) => {
      const pAuthor = this.postAuthorLabel(p);
      if (isOwn) {
        return (
          pAuthor.toLowerCase() === name.toLowerCase() ||
          snapshot.communityTips.some((tip) => tip.id === p.id)
        );
      }
      return pAuthor.toLowerCase() === name.toLowerCase();
    });
    const baseFollowers = preset?.followers ?? (isOwn ? ['Aisyah', 'Mei Ling'] : ['Aiman']);
    const followers = !isOwn && this.isAuthorFollowed(name) && !baseFollowers.includes(this.myCreatorDisplayName)
      ? [this.myCreatorDisplayName, ...baseFollowers]
      : baseFollowers;
    const following = isOwn
      ? Array.from(this.followedAuthors)
      : (name === 'Mei Ling' ? ['Aisyah', 'Daniel'] : ['Mei Ling']);
    const totalHelpful = posts.reduce((sum, p) => sum + this.postHelpfulDisplayCount(p), 0);

    return {
      name,
      initials: isOwn ? this.myCreatorInitials : name.slice(0, 2).toUpperCase(),
      bio: isOwn
        ? (social?.bio || 'Exploring Malaysia sustainably by rail, bus & heritage trails.')
        : (preset?.bio || `Verified Malaysia explorer sharing transit & heritage tips.`),
      state: isOwn
        ? (social?.homeState || 'Kuala Lumpur')
        : (preset?.state || posts[0]?.state || 'Malaysia'),
      posts,
      followers,
      following,
      totalHelpful,
    };
  }

  creatorSavedPosts(): CommunityPost[] {
    return this.posts.filter((p) => this.savedPostIds.has(p.id));
  }

  startEditProfile(): void {
    const meta = this.creatorProfileMeta();
    this.profileDraft = {
      displayName: meta.name,
      bio: meta.bio,
      homeState: meta.state,
    };
    this.isEditingProfile = true;
  }

  saveCreatorProfile(): void {
    const updated = this.appStateService.updateSocialProfile({
      displayNameOverride: this.profileDraft.displayName,
      bio: this.profileDraft.bio,
      homeState: this.profileDraft.homeState,
    });
    this.viewingCreatorName = updated.displayNameOverride || this.myCreatorDisplayName;
    this.isEditingProfile = false;
    this.showToast(this.t(this.copy.profileUpdatedToast));
  }

  canManagePost(post: CommunityPost): boolean {
    const snapshot = this.appStateService.getSnapshot();
    return snapshot.communityTips.some((tip) => tip.id === post.id);
  }

  startEditPost(post: CommunityPost, event?: Event): void {
    event?.stopPropagation();
    const tip = this.appStateService.getSnapshot().communityTips.find((t) => t.id === post.id);
    if (!tip) return;
    this.editingTipId = tip.id;
    this.tipDraft = {
      location: tip.location,
      state: tip.state,
      category: tip.category,
      tip: tip.tip,
      accessible: tip.accessible,
      hearingAccessible: tip.hearingAccessible,
      confirmed: true,
      imageName: tip.imageName,
      imagePreview: tip.imagePreview,
    };
    this.selectedPhotoName = tip.imageName ?? '';
    this.selectedPhotoPreview = tip.imagePreview ?? '';
    this.selectedPost = null;
    this.view = 'add';
    this.syncRouteState('add');
    void this.communityContent?.scrollToTop(0);
  }

  deleteUserPost(post: CommunityPost, event?: Event): void {
    event?.stopPropagation();
    if (this.appStateService.deleteCommunityTip(post.id)) {
      this.refreshState();
      if (this.selectedPost?.id === post.id) {
        this.selectedPost = null;
      }
      this.showToast(this.t(this.copy.postDeletedToast));
    }
  }

  searchByTag(tag: string): void {
    this.searchQuery = tag.replace(/^#/, '');
    this.closePostDetail();
  }

  navigateToPost(post: CommunityPost): void {
    const dest = this.t(post.place);
    this.closePostDetail();
    void this.router.navigate(['/tabs/tab2'], { queryParams: { destination: dest } });
  }

  toggleCommentLike(comment: CommunityComment): void {
    comment.liked = !comment.liked;
    comment.likes = Math.max(0, comment.likes + (comment.liked ? 1 : -1));
  }

  isPostSaved(post: CommunityPost): boolean {
    return this.savedPostIds.has(post.id);
  }

  toggleSavePost(post: CommunityPost, event?: Event): void {
    event?.stopPropagation();
    const saved = this.appStateService.toggleSavedPost(post.id);
    if (saved) {
      this.savedPostIds.add(post.id);
      this.showToast(this.t(this.copy.postSavedToast));
    } else {
      this.savedPostIds.delete(post.id);
      this.showToast(this.t(this.copy.postUnsavedToast));
    }
  }

  postCommentCount(post: CommunityPost): number {
    return (this.postComments[post.id] ?? []).length;
  }

  selectedPostComments(): CommunityComment[] {
    if (!this.selectedPost) return [];
    return this.postComments[this.selectedPost.id] ?? [];
  }

  onCommentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void this.submitComment();
    }
  }

  async submitComment(): Promise<void> {
    if (!this.selectedPost) return;
    const text = this.commentDraft.trim();
    if (!text) return;
    const currentUser = this.authService.currentUser;
    const author = currentUser?.displayName || 'Explorer';
    const initials = currentUser?.initials || author.slice(0, 2).toUpperCase();
    const comment: CommunityComment = {
      id: `c-${Date.now()}`,
      author,
      initials,
      text,
      time: this.language === 'EN' ? 'Just now' : 'Baru sahaja',
      likes: 0,
      liked: false,
    };
    const postId = this.selectedPost.id;
    this.postComments[postId] = [comment, ...(this.postComments[postId] ?? [])];
    this.commentDraft = '';
    this.showToast(this.t(this.copy.commentAdded));
    try {
      await addDoc(collection(this.fb.db, 'community_posts', postId, 'comments'), {
        author,
        initials,
        text,
        createdAt: new Date().toISOString(),
        uid: currentUser?.uid ?? null,
      });
    } catch {
      // Offline / rules fallback
    }
  }

  async sharePost(post: CommunityPost, event?: Event): Promise<void> {
    event?.stopPropagation();
    const text = `${this.t(post.place)} (${post.state})\n${this.t(post.copy)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: this.t(post.place), text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(this.t(this.copy.postSharedToast));
    } catch {
      this.showToast(this.t(this.copy.sharingUnavailable));
    }
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

  communityTabTabIndex(tab: CommunityTab): number {
    return this.communityTab === tab ? 0 : -1;
  }

  onCommunityTabKeydown(event: KeyboardEvent, tab: CommunityTab): void {
    const tabOrder: CommunityTab[] = ['tips', 'verification'];
    const currentIndex = tabOrder.indexOf(tab);

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + direction + tabOrder.length) % tabOrder.length;
      const nextTab = tabOrder[nextIndex];
      this.setCommunityTab(nextTab);
      this.focusCommunityTab(nextTab);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.setCommunityTab('tips');
      this.focusCommunityTab('tips');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.setCommunityTab('verification');
      this.focusCommunityTab('verification');
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setCommunityTab(tab);
    }
  }

  openAddTip(): void {
    this.editingTipId = null;
    this.view = 'add';
    this.syncRouteState('add');
    void this.communityContent?.scrollToTop(0);
  }

  openCommunityMission(): void {
    if (this.verificationTask) {
      this.startVerification();
      return;
    }

    this.openAddTip();
  }

  startVerification(): void {
    this.view = 'verification';
    this.verificationAnswer = null;
    this.syncRouteState('verification');
    void this.communityContent?.scrollToTop(0);
  }

  openNotices(filter: NoticeFilter = 'All'): void {
    this.view = 'notices';
    this.noticeFilter = filter;
    this.syncRouteState('notices', filter);
    void this.communityContent?.scrollToTop(0);
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
    void this.communityContent?.scrollToTop(0);
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
    if (!this.canSubmitTip()) {
      return;
    }

    if (this.editingTipId) {
      this.appStateService.updateCommunityTip(this.editingTipId, this.tipDraft);
      this.editingTipId = null;
      this.refreshState();
      this.tipDraft = this.appStateService.getEmptyTipDraft();
      this.selectedPhotoName = '';
      this.selectedPhotoPreview = '';
      this.view = this.viewingCreatorName ? 'creator' : 'community';
      this.syncRouteState(this.view);
      this.showToast(this.t(this.copy.postUpdatedToast));
      return;
    }

    const user = this.authService.currentUser;
    const savedTip = this.appStateService.submitTip(this.tipDraft, {
      author: (user && !user.isGuest ? user.displayName : undefined) || this.myCreatorDisplayName,
      initials: (user && !user.isGuest ? user.initials : undefined) || this.myCreatorInitials,
    });
    void this.persistTipToFirestore(savedTip);
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

  openReportSheet(post: CommunityPost): void {
    this.reportingPost = post;
    this.reportReason = 'outdated';
    this.reportNote = '';
  }

  closeReportSheet(): void {
    this.reportingPost = null;
    this.reportNote = '';
  }

  submitReport(): void {
    if (!this.reportingPost) {
      return;
    }
    const reportedPost = this.reportingPost;
    const reason = this.reportReason;
    const note = this.reportNote.trim();
    this.closeReportSheet();
    void this.persistReportToFirestore(reportedPost, reason, note);
    this.showToast(this.t(this.copy.reportSubmitted));
  }

  postHelpfulDisplayCount(post: CommunityPost): number {
    return post.helpfulCount + (post.reaction === 'helpful' ? 1 : 0);
  }

  get activeTipStep(): 1 | 2 | 3 {
    if (this.canSubmitTip()) {
      return 3;
    }
    if (this.tipDraft.location.trim().length > 0 && this.tipDraft.tip.trim().length >= 20) {
      return 2;
    }
    return 1;
  }

  saveNotice(notice: CommunityNotice): void {
    notice.saved = this.appStateService.toggleSavedNotice(notice.id);
    this.savedNoticeCount = this.appStateService.getSnapshot().savedNoticeIds.length;
    this.showToast(notice.saved ? this.t(this.copy.noticeSaved) : this.t(this.copy.noticeRemoved));
  }

  private async persistTipToFirestore(tip: SavedCommunityTip): Promise<void> {
    try {
      await addDoc(collection(this.fb.db, 'community_posts'), {
        localId: tip.id,
        location: tip.location,
        state: tip.state,
        category: tip.category,
        tip: tip.tip,
        accessible: tip.accessible,
        hearingAccessible: tip.hearingAccessible,
        author: tip.author || 'Traveler',
        initials: tip.initials || 'TR',
        status: tip.status,
        createdAt: tip.createdAt,
      });
    } catch {
      // Offline / rules fallback: local AppStateService already persists it.
    }
  }

  private async persistReportToFirestore(
    post: CommunityPost,
    reason: string,
    note: string,
  ): Promise<void> {
    try {
      await addDoc(collection(this.fb.db, 'community_reports'), {
        postId: post.id,
        place: post.place.EN,
        reason,
        note,
        reportedAt: new Date().toISOString(),
        status: 'open',
      });
    } catch {
      // Offline / rules fallback
    }
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
    return `+${post.points} ${this.t(this.copy.ecoPoints)}${pendingLabel}`;
  }

  helpfulPostAriaLabel(post: CommunityPost): string {
    return `${this.t(this.copy.helpfulPostAriaPrefix)}: ${this.t(post.place)}`;
  }

  notHelpfulPostAriaLabel(post: CommunityPost): string {
    return `${this.t(this.copy.notHelpfulPostAriaPrefix)}: ${this.t(post.place)}`;
  }

  reportPostAriaLabel(post: CommunityPost): string {
    return `${this.t(this.copy.reportPostAriaPrefix)}: ${this.t(post.place)}`;
  }

  addTipAriaLabel(): string {
    return this.t(this.copy.addTipAria);
  }

  communityMissionAriaLabel(): string {
    return [
      this.verificationMissionTitleLabel,
      this.verificationMissionCopyLabel,
      this.verificationMissionActionLabel,
    ].map((part) => part.replace(/[.!?]+$/, '')).join('. ') + '.';
  }

  verificationAnswerAriaLabel(answer: 'yes' | 'no'): string {
    const label = answer === 'yes'
      ? this.t(this.copy.yes)
      : this.t(this.copy.no);

    return `${this.t(this.copy.verificationAnswerPrefix)} ${label}`;
  }

  saveDraftAriaLabel(): string {
    return this.t(this.copy.saveDraftAria);
  }

  canSubmitTip(): boolean {
    return this.tipDraft.location.trim().length > 0
      && this.tipDraft.tip.trim().length >= 20
      && this.tipDraft.confirmed;
  }

  submitTipAriaLabel(isReady: boolean): string {
    return isReady
      ? this.t(this.copy.submitForReviewReadyAria)
      : this.t(this.copy.submitForReviewDisabledAria);
  }

  submitVerificationAriaLabel(): string {
    return this.verificationAnswer
      ? this.t(this.copy.submitVerificationReadyAria)
      : this.t(this.copy.submitVerificationDisabledAria);
  }

  postHasImage(post: CommunityPost): boolean {
    return Boolean(post.image);
  }

  noticeFilterAriaLabel(filter: NoticeFilter): string {
    return `${this.t(this.copy.noticeFilterAriaPrefix)} ${this.noticeCategoryLabel(filter)}`;
  }

  saveNoticeAriaLabel(notice: CommunityNotice): string {
    const prefix = notice.saved
      ? this.t(this.copy.savedNoticeAriaPrefix)
      : this.t(this.copy.saveNoticeAriaPrefix);
    return `${prefix}: ${this.t(notice.title)}`;
  }

  shareNoticeAriaLabel(notice: CommunityNotice): string {
    return `${this.t(this.copy.shareNoticeAriaPrefix)}: ${this.t(notice.title)}`;
  }

  get verificationMissionTitleLabel(): string {
    return this.t(this.copy.missionTitle);
  }

  get verificationMissionCopyLabel(): string {
    if (this.communityMissionCompletedCount >= this.communityMissionTargetCount) {
      return this.t(this.copy.missionCompleteCopy);
    }

    return this.t(this.copy.missionProgressCopy).replace(
      '{count}',
      String(this.communityMissionCompletedCount),
    );
  }

  get verificationMissionActionLabel(): string {
    if (this.verificationTask) {
      return this.t(this.copy.start);
    }

    return this.communityMissionCompletedCount >= this.communityMissionTargetCount
      ? this.t(this.copy.viewStatus)
      : this.t(this.copy.missionContribute);
  }

  get verificationMissionWidth(): string {
    return this.progressWidth(
      this.communityMissionCompletedCount,
      this.communityMissionTargetCount,
    );
  }

  postAuthorLabel(post: CommunityPost): string {
    return this.isProviderBackedIdentity(post.author, post.initials)
      ? post.author
      : this.t(this.copy.localSubmissionAuthor);
  }

  postAuthorInitials(post: CommunityPost): string {
    return this.isProviderBackedIdentity(post.author, post.initials)
      ? post.initials
      : this.t(this.copy.localSubmissionInitials);
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
    this.savedPostIds.clear();
    for (const id of state.savedPostIds ?? []) {
      this.savedPostIds.add(id);
    }
    this.followedAuthors.clear();
    for (const author of state.followedAuthors ?? []) {
      this.followedAuthors.add(author);
    }
    const reactions = this.reactionMap(state.postReactions);
    const savedTips = state.communityTips.map((tip) => this.mapSavedTip(tip, reactions));
    const firestorePosts: CommunityPost[] = this.remotePosts.map((rp) => ({
      id: rp.id,
      state: rp.state,
      author: rp.author,
      initials: rp.author.slice(0, 2).toUpperCase(),
      category: rp.category,
      place: rp.place,
      copy: rp.copy,
      points: rp.points,
      image: rp.image ?? null,
      date: rp.date,
      createdAt: new Date(rp.createdAt).toISOString(),
      helpfulCount: rp.helpful,
      status: rp.status === 'Verified' ? 'Approved' : 'In review',
      reaction: reactions.get(rp.id) ?? null,
    }));
    const existingIds = new Set(savedTips.map((p) => p.id));
    this.posts = [
      ...savedTips,
      ...firestorePosts.filter((fp) => !existingIds.has(fp.id)),
      ...this.buildSeededPosts(reactions),
    ];
    this.tipDraft = state.tipDraft ? { ...state.tipDraft } : this.appStateService.getEmptyTipDraft();
    this.selectedPhotoName = this.tipDraft.imageName ?? '';
    this.selectedPhotoPreview = this.tipDraft.imagePreview ?? '';
    this.savedNoticeCount = state.savedNoticeIds.length;
    const savedNoticeIds = new Set(state.savedNoticeIds);
    const mergedNotices: Array<Omit<CommunityNotice, 'saved'>> = [
      ...this.remoteNotices,
      ...SEEDED_NOTICES,
    ];
    this.notices = mergedNotices.map((notice) => ({
      ...notice,
      saved: savedNoticeIds.has(notice.id),
    }));
    this.verificationTask = getNextVerificationTask(state.completedVerificationIds);
    this.communityMissionCompletedCount = Math.min(
      state.contributions.filter((contribution) => contribution.type === 'Travel tip' || contribution.type === 'Verification').length,
      this.communityMissionTargetCount,
    );
  }

  private buildSeededPosts(reactions: Map<string, CommunityPost['reaction']>): CommunityPost[] {
    return SEEDED_POSTS.map((post) => ({
      ...post,
      reaction: reactions.get(post.id) ?? null,
    }));
  }

  private focusCommunityTab(tab: CommunityTab): void {
    const tabId = tab === 'tips'
      ? 'community-tab-tips'
      : 'community-tab-verification';
    document.getElementById(tabId)?.focus();
  }

  private progressWidth(current: number, target: number): string {
    if (target <= 0) {
      return '0%';
    }

    return `${Math.round((Math.min(current, target) / target) * 100)}%`;
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
      image: tip.imagePreview || null,
      date: this.formatDate(tip.createdAt),
      createdAt: tip.createdAt,
      helpfulCount: 0,
      status: tip.status,
      reaction: reactions.get(tip.id) ?? null,
    };
  }

  private isProviderBackedIdentity(author: string, initials: string): boolean {
    const normalizedAuthor = author.trim();
    const normalizedInitials = initials.trim();

    if (!normalizedAuthor || !normalizedInitials) {
      return false;
    }

    return !(normalizedAuthor === 'Traveler' && normalizedInitials === 'TR');
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
    requestedAuthor: string | null = null,
  ): void {
    this.view = this.isCommunityView(requestedView) ? requestedView : 'community';

    if (this.view === 'community') {
      this.selectedPost = null;
      this.reportingPost = null;
      this.isEditingProfile = false;
      this.viewingCreatorName = null;
    }

    if (this.view === 'creator') {
      const targetAuthor = requestedAuthor?.trim();
      this.viewingCreatorName = targetAuthor || this.myCreatorDisplayName;
      this.creatorTab = 'posts';
      this.selectedPost = null;
      this.isEditingProfile = false;
    }

    if (this.view === 'notices') {
      this.noticeFilter = this.isNoticeFilter(requestedNoticeFilter)
        ? requestedNoticeFilter
        : 'All';
    }
  }

  private syncRouteState(
    view: CommunityView,
    noticeFilter: NoticeFilter = 'All',
    author: string | null = null,
  ): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        view: view === 'community' ? null : view,
        noticeFilter: view === 'notices' && noticeFilter !== 'All' ? noticeFilter : null,
        author: view === 'creator' && author ? author : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private isCommunityView(value: string | null): value is CommunityView {
    return value === 'community' || value === 'add' || value === 'notices' || value === 'verification' || value === 'creator';
  }

  private isNoticeFilter(value: string | null): value is NoticeFilter {
    return value === 'All' || value === 'Transit' || value === 'Destinations' || value === 'Weather';
  }
}
