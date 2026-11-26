import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccessibilityPreferencesService, AppLanguage } from '../services/accessibility-preferences.service';
import { AppStateService, SavedCommunityTip, VerificationSubmission } from '../services/app-state.service';

export type AdminSection = 'locations' | 'community' | 'verifications';
export type LocationRecordStatus = 'Needs Review' | 'Verified' | 'Conflict' | 'Rejected';

export interface AdminLocationRecord {
  id: string;
  name: string;
  category: string;
  state: string;
  source: 'AI Auto-Crawler' | 'Community Scout' | 'Tourism Malaysia';
  confidence: number;
  hours: string;
  coords: string;
  transitHub: string;
  updatedAt: string;
  status: LocationRecordStatus;
  notes: string;
}

const INITIAL_ADMIN_LOCATIONS: AdminLocationRecord[] = [
  {
    id: 'loc-pasar-seni',
    name: 'Pasar Seni Station & Central Market',
    category: 'Transit & Heritage',
    state: 'Kuala Lumpur',
    source: 'Community Scout',
    confidence: 96,
    hours: '06:00 AM – 11:30 PM',
    coords: '3.1424° N, 101.6956° E',
    transitHub: 'LRT Kelana Jaya / MRT Kajang',
    updatedAt: 'Today, 09:15 AM',
    status: 'Needs Review',
    notes: 'Community scout reported Gate B lift indicator updated; operating hours match GTFS Static feed.',
  },
  {
    id: 'loc-kl-sentral',
    name: 'KL Sentral Main Concourse',
    category: 'Transit Hub',
    state: 'Kuala Lumpur',
    source: 'AI Auto-Crawler',
    confidence: 98,
    hours: '05:30 AM – 12:00 AM',
    coords: '3.1342° N, 101.6861° E',
    transitHub: 'KL Sentral Interchange',
    updatedAt: 'Today, 08:40 AM',
    status: 'Verified',
    notes: 'All 4 rail lines & ERL accessibility signage verified by 12 scouts.',
  },
  {
    id: 'loc-george-town',
    name: 'George Town Clan Jetties',
    category: 'UNESCO Heritage',
    state: 'Penang',
    source: 'AI Auto-Crawler',
    confidence: 89,
    hours: '09:00 AM – 09:00 PM',
    coords: '5.4126° N, 100.3401° E',
    transitHub: 'Rapid Penang CAT Weld Quay',
    updatedAt: 'Yesterday',
    status: 'Conflict',
    notes: 'AI crawler detected 08:30 AM opening while community tip states 09:00 AM. Requires admin confirmation.',
  },
  {
    id: 'loc-melaka-stadthuys',
    name: 'Dutch Square & Stadthuys',
    category: 'Heritage Museum',
    state: 'Melaka',
    source: 'Tourism Malaysia',
    confidence: 99,
    hours: '09:00 AM – 05:30 PM',
    coords: '2.1944° N, 102.2491° E',
    transitHub: 'Panorama Melaka Bus 17',
    updatedAt: '2 days ago',
    status: 'Verified',
    notes: 'Official Visit Malaysia 2026 heritage zone with ramp access verified.',
  },
  {
    id: 'loc-timah-tasoh',
    name: 'Timah Tasoh Lake Eco Jetty',
    category: 'Nature & Eco',
    state: 'Perlis',
    source: 'AI Auto-Crawler',
    confidence: 84,
    hours: '07:00 AM – 07:00 PM',
    coords: '6.5553° N, 100.2179° E',
    transitHub: 'KTM ETS Arau + Bas.My',
    updatedAt: '3 days ago',
    status: 'Needs Review',
    notes: 'New eco-boat jetty schedule discovered from Perlis Tourism portal.',
  },
];

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false,
})
export class AdminPage implements OnInit {
  private readonly router = inject(Router);
  private readonly appState = inject(AppStateService);
  private readonly a11y = inject(AccessibilityPreferencesService);

  language: AppLanguage = 'EN';
  activeSection: AdminSection = 'locations';
  searchQuery = '';
  statusFilter: 'All' | LocationRecordStatus = 'All';
  locations: AdminLocationRecord[] = [...INITIAL_ADMIN_LOCATIONS];
  selectedLocation: AdminLocationRecord = this.locations[0];
  communityTips: SavedCommunityTip[] = [];
  verificationSubmissions: VerificationSubmission[] = [];
  toast = '';

  ngOnInit(): void {
    this.language = this.a11y.getPreferences().language;
    this.refreshData();
  }

  ionViewWillEnter(): void {
    this.language = this.a11y.getPreferences().language;
    this.refreshData();
  }

  toggleLanguage(): void {
    const next: AppLanguage = this.language === 'EN' ? 'BM' : 'EN';
    this.language = this.a11y.setLanguage(next).language;
  }

  goBackToApp(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  get needsReviewCount(): number {
    return this.locations.filter((l) => l.status === 'Needs Review').length;
  }

  get verifiedCount(): number {
    return this.locations.filter((l) => l.status === 'Verified').length;
  }

  get conflictCount(): number {
    return this.locations.filter((l) => l.status === 'Conflict').length;
  }

  get aiDiscoveredCount(): number {
    return this.locations.filter((l) => l.source === 'AI Auto-Crawler').length;
  }

  get filteredLocations(): AdminLocationRecord[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.locations.filter((loc) => {
      const matchesStatus = this.statusFilter === 'All' || loc.status === this.statusFilter;
      const matchesQuery = !q
        || loc.name.toLowerCase().includes(q)
        || loc.state.toLowerCase().includes(q)
        || loc.category.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }

  selectLocation(loc: AdminLocationRecord): void {
    this.selectedLocation = loc;
  }

  updateLocationStatus(loc: AdminLocationRecord, status: LocationRecordStatus): void {
    loc.status = status;
    loc.updatedAt = this.language === 'BM' ? 'Baru sahaja' : 'Just now';
    this.notify(
      this.language === 'BM'
        ? `${loc.name} dikemas kini kepada ${status}.`
        : `${loc.name} marked as ${status}.`,
    );
  }

  approveTip(tip: SavedCommunityTip): void {
    this.appState.updateCommunityTipStatus(tip.id, 'Approved');
    this.refreshData();
    this.notify(
      this.language === 'BM'
        ? `Tip "${tip.location}" diluluskan (+20 Mata Eko diberikan).`
        : `Tip "${tip.location}" approved (+20 Eco-Points awarded).`,
    );
  }

  markTipInReview(tip: SavedCommunityTip): void {
    this.appState.updateCommunityTipStatus(tip.id, 'In review');
    this.refreshData();
    this.notify(
      this.language === 'BM'
        ? `Tip "${tip.location}" dikembalikan ke semakan.`
        : `Tip "${tip.location}" returned to review.`,
    );
  }

  private refreshData(): void {
    const state = this.appState.getSnapshot();
    this.communityTips = state.communityTips;
    this.verificationSubmissions = state.verificationSubmissions ?? [];
  }

  private notify(msg: string): void {
    this.toast = msg;
    setTimeout(() => (this.toast = ''), 2600);
  }
}
