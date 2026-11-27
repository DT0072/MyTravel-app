import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RouteLegDetail, RouteOption } from './navigation.service';

export interface AppJourney {
  id: string;
  from: string;
  to: string;
  mode: string;
  detail: string;
  depart: string;
  arrive: string;
  duration: string;
  fare: string;
  walk: string;
  isAccessible: boolean;
  travelDate: string;
  travelTime: string;
  startedAt: string;
  completedAt: string | null;
  points: number;
  co2Saved?: string;
  steps?: string[];
  waypoints?: [number, number][];
  color?: string;
  legs?: RouteLegDetail[];
}

export interface CommunityTipDraft {
  location: string;
  state: string;
  category: string;
  tip: string;
  accessible: boolean;
  hearingAccessible: boolean;
  confirmed: boolean;
  imageName?: string;
  imagePreview?: string;
}

export interface SavedCommunityTip extends CommunityTipDraft {
  id: string;
  author: string;
  initials: string;
  createdAt: string;
  status: 'In review' | 'Approved';
}

export interface AppContribution {
  id: string;
  title: string;
  type: 'Travel tip' | 'Verification';
  status: 'In review' | 'Approved';
  createdAt: string;
  points: number;
}

export interface PointTransaction {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  status: 'Earned' | 'Pending';
  createdAt: string;
}

export interface VerificationSubmission {
  id: string;
  taskId: string;
  title: string;
  answer: 'yes' | 'no';
  note?: string;
  submittedAt: string;
  status: 'Approved' | 'In review';
}

export type CommunityPostReaction = 'helpful' | 'not-helpful';

export interface SocialProfileState {
  bio: string;
  homeState: string;
  displayNameOverride?: string;
}

interface PersistedAppState {
  version: 2;
  ecoPoints: number;
  activeJourney: AppJourney | null;
  journeyHistory: AppJourney[];
  recentLocationValues: string[];
  postReactions: Record<string, CommunityPostReaction>;
  contributions: AppContribution[];
  communityTips: SavedCommunityTip[];
  tipDraft: CommunityTipDraft | null;
  savedNoticeIds: string[];
  savedDestinationIds?: string[];
  savedEventIds?: string[];
  savedPostIds?: string[];
  followedAuthors?: string[];
  socialProfile?: SocialProfileState;
  redeemedRewardIds?: string[];
  completedVerificationIds: string[];
  verificationSubmissions?: VerificationSubmission[];
  transactions: PointTransaction[];
}

const MAX_COMMUNITY_IMAGE_PREVIEW_LENGTH = 350_000;
const MAX_RECENT_LOCATION_VALUES = 6;
const DEFAULT_RECENT_LOCATION_VALUES: string[] = [];

const EMPTY_TIP_DRAFT: CommunityTipDraft = {
  location: '',
  state: 'Kuala Lumpur',
  category: 'Heritage',
  tip: '',
  accessible: false,
  hearingAccessible: false,
  confirmed: false,
};

function createInitialState(): PersistedAppState {
  return {
    version: 2,
    ecoPoints: 0,
    activeJourney: null,
    journeyHistory: [],
    recentLocationValues: [...DEFAULT_RECENT_LOCATION_VALUES],
    postReactions: {},
    contributions: [],
    communityTips: [],
    tipDraft: null,
    savedNoticeIds: [],
    savedDestinationIds: [],
    savedEventIds: [],
    savedPostIds: [],
    followedAuthors: [],
    socialProfile: {
      bio: 'Exploring Malaysia sustainably by rail, bus & heritage trails.',
      homeState: 'Kuala Lumpur',
    },
    redeemedRewardIds: [],
    completedVerificationIds: [],
    verificationSubmissions: [],
    transactions: [],
  };
}

@Injectable({
  providedIn: 'root',
})
export class AppStateService {
  private readonly storageKey = 'mytravel.app-state.v1';
  private readonly stateSubject = new BehaviorSubject<PersistedAppState>(createInitialState());

  readonly state$ = this.stateSubject.asObservable();

  initialize(): void {
    this.stateSubject.next(this.loadState());
  }

  getSnapshot(): PersistedAppState {
    return structuredClone(this.stateSubject.value);
  }

  getEmptyTipDraft(): CommunityTipDraft {
    return { ...EMPTY_TIP_DRAFT };
  }

  resetState(): void {
    this.updateState(() => createInitialState());
  }

  startJourney(
    route: RouteOption,
    request: { from: string; to: string; travelDate: string; travelTime: string },
  ): AppJourney {
    const journey: AppJourney = {
      id: this.createId('journey'),
      from: request.from.trim(),
      to: request.to.trim(),
      mode: route.mode,
      detail: route.detail,
      depart: route.depart,
      arrive: route.arrive,
      duration: route.duration,
      fare: route.fare,
      walk: route.walk,
      isAccessible: route.isAccessible,
      travelDate: request.travelDate,
      travelTime: request.travelTime,
      startedAt: new Date().toISOString(),
      completedAt: null,
      points: 20,
      co2Saved: route.co2Saved,
      steps: route.steps,
      waypoints: route.waypoints,
      color: route.color,
      legs: route.legs,
    };

    this.updateState((state) => ({ ...state, activeJourney: journey }));
    return journey;
  }

  cancelActiveJourney(): AppJourney | null {
    const activeJourney = this.stateSubject.value.activeJourney;
    if (!activeJourney) {
      return null;
    }
    this.updateState((state) => ({ ...state, activeJourney: null }));
    return activeJourney;
  }

  completeActiveJourney(): AppJourney | null {
    const activeJourney = this.stateSubject.value.activeJourney;

    if (!activeJourney) {
      return null;
    }

    const completedAt = new Date().toISOString();
    const completedJourney: AppJourney = {
      ...activeJourney,
      completedAt,
    };
    const transaction: PointTransaction = {
      id: this.createId('transaction'),
      title: 'Public transport journey',
      subtitle: `${completedJourney.mode}: ${completedJourney.from} → ${completedJourney.to}`,
      points: completedJourney.points,
      status: 'Earned',
      createdAt: completedAt,
    };

    this.updateState((state) => ({
      ...state,
      ecoPoints: state.ecoPoints + completedJourney.points,
      activeJourney: null,
      journeyHistory: [completedJourney, ...state.journeyHistory],
      transactions: [transaction, ...state.transactions],
    }));

    return completedJourney;
  }

  submitVerification(
    id: string,
    title: string,
    options?: { answer?: 'yes' | 'no'; note?: string },
  ): boolean {
    const state = this.stateSubject.value;

    if (state.completedVerificationIds.includes(id)) {
      return false;
    }

    const createdAt = new Date().toISOString();
    const contribution: AppContribution = {
      id: this.createId('contribution'),
      title,
      type: 'Verification',
      status: 'Approved',
      createdAt,
      points: 40,
    };
    const transaction: PointTransaction = {
      id: this.createId('transaction'),
      title: 'MyTravel Verification',
      subtitle: title,
      points: 40,
      status: 'Earned',
      createdAt,
    };
    const submission: VerificationSubmission = {
      id: this.createId('verification'),
      taskId: id,
      title,
      answer: options?.answer ?? 'yes',
      note: options?.note?.trim() || undefined,
      submittedAt: createdAt,
      status: 'Approved',
    };

    this.updateState((current) => ({
      ...current,
      ecoPoints: current.ecoPoints + 40,
      completedVerificationIds: [...current.completedVerificationIds, id],
      verificationSubmissions: [submission, ...(current.verificationSubmissions ?? [])],
      contributions: [contribution, ...current.contributions],
      transactions: [transaction, ...current.transactions],
    }));
    return true;
  }

  saveTipDraft(draft: CommunityTipDraft): void {
    const sanitizedDraft = this.sanitizeCommunityTipMedia(draft);
    this.updateState((state) => ({ ...state, tipDraft: sanitizedDraft }));
  }

  submitTip(
    draft: CommunityTipDraft,
    authorInfo?: { author?: string; initials?: string },
  ): SavedCommunityTip {
    const sanitizedDraft = this.sanitizeCommunityTipMedia(draft);
    const createdAt = new Date().toISOString();
    const tip: SavedCommunityTip = {
      ...sanitizedDraft,
      id: this.createId('tip'),
      author: authorInfo?.author?.trim() || '',
      initials: authorInfo?.initials?.trim() || '',
      createdAt,
      status: 'In review',
    };
    const contribution: AppContribution = {
      id: this.createId('contribution'),
      title: sanitizedDraft.location,
      type: 'Travel tip',
      status: 'In review',
      createdAt,
      points: 20,
    };
    const transaction: PointTransaction = {
      id: this.createId('transaction'),
      title: 'Travel tip submitted',
      subtitle: sanitizedDraft.location,
      points: 20,
      status: 'Pending',
      createdAt,
    };

    this.updateState((state) => ({
      ...state,
      communityTips: [tip, ...state.communityTips],
      contributions: [contribution, ...state.contributions],
      transactions: [transaction, ...state.transactions],
      tipDraft: null,
    }));
    return tip;
  }

  updateCommunityTip(tipId: string, draft: CommunityTipDraft): SavedCommunityTip | null {
    const sanitizedDraft = this.sanitizeCommunityTipMedia(draft);
    let updatedTip: SavedCommunityTip | null = null;
    this.updateState((state) => ({
      ...state,
      communityTips: state.communityTips.map((tip) => {
        if (tip.id !== tipId) return tip;
        updatedTip = {
          ...tip,
          ...sanitizedDraft,
        };
        return updatedTip;
      }),
      tipDraft: null,
    }));
    return updatedTip;
  }

  deleteCommunityTip(tipId: string): boolean {
    const existed = this.stateSubject.value.communityTips.some((tip) => tip.id === tipId);
    if (!existed) return false;
    this.updateState((state) => ({
      ...state,
      communityTips: state.communityTips.filter((tip) => tip.id !== tipId),
    }));
    return true;
  }

  updateSocialProfile(updates: Partial<SocialProfileState>): SocialProfileState {
    const current = this.stateSubject.value.socialProfile ?? {
      bio: 'Exploring Malaysia sustainably by rail, bus & heritage trails.',
      homeState: 'Kuala Lumpur',
    };
    const next: SocialProfileState = {
      bio: typeof updates.bio === 'string' ? updates.bio.trim() : current.bio,
      homeState: typeof updates.homeState === 'string' ? updates.homeState.trim() : current.homeState,
      displayNameOverride: typeof updates.displayNameOverride === 'string'
        ? updates.displayNameOverride.trim() || undefined
        : current.displayNameOverride,
    };
    this.updateState((state) => ({ ...state, socialProfile: next }));
    return next;
  }

  toggleFollowedAuthor(author: string): boolean {
    const clean = author.trim();
    if (!clean) return false;
    const current = this.stateSubject.value.followedAuthors ?? [];
    const isFollowing = current.includes(clean);
    this.updateState((state) => ({
      ...state,
      followedAuthors: isFollowing
        ? current.filter((a) => a !== clean)
        : [clean, ...current],
    }));
    return !isFollowing;
  }

  toggleSavedPost(postId: string): boolean {
    const current = this.stateSubject.value.savedPostIds ?? [];
    const isSaved = current.includes(postId);
    this.updateState((state) => ({
      ...state,
      savedPostIds: isSaved
        ? current.filter((id) => id !== postId)
        : [postId, ...current],
    }));
    return !isSaved;
  }

  toggleSavedNotice(id: string): boolean {
    const isSaved = this.stateSubject.value.savedNoticeIds.includes(id);

    this.updateState((state) => ({
      ...state,
      savedNoticeIds: isSaved
        ? state.savedNoticeIds.filter((noticeId) => noticeId !== id)
        : [...state.savedNoticeIds, id],
    }));

    return !isSaved;
  }

  toggleSavedDestination(id: string): boolean {
    const current = this.stateSubject.value.savedDestinationIds ?? [];
    const isSaved = current.includes(id);

    this.updateState((state) => ({
      ...state,
      savedDestinationIds: isSaved
        ? (state.savedDestinationIds ?? []).filter((item) => item !== id)
        : [...(state.savedDestinationIds ?? []), id],
    }));

    return !isSaved;
  }

  toggleSavedEvent(id: string): boolean {
    const current = this.stateSubject.value.savedEventIds ?? [];
    const isSaved = current.includes(id);

    this.updateState((state) => ({
      ...state,
      savedEventIds: isSaved
        ? (state.savedEventIds ?? []).filter((item) => item !== id)
        : [...(state.savedEventIds ?? []), id],
    }));

    return !isSaved;
  }

  redeemReward(rewardId: string, title: string, cost: number): boolean {
    const state = this.stateSubject.value;
    const redeemed = state.redeemedRewardIds ?? [];
    if (redeemed.includes(rewardId) || state.ecoPoints < cost) {
      return false;
    }

    const createdAt = new Date().toISOString();
    const transaction: PointTransaction = {
      id: this.createId('transaction'),
      title: 'Reward redeemed',
      subtitle: title,
      points: -Math.abs(cost),
      status: 'Earned',
      createdAt,
    };

    this.updateState((current) => ({
      ...current,
      ecoPoints: Math.max(0, current.ecoPoints - Math.abs(cost)),
      redeemedRewardIds: [...(current.redeemedRewardIds ?? []), rewardId],
      transactions: [transaction, ...current.transactions],
    }));
    return true;
  }

  updateCommunityTipStatus(tipId: string, status: 'Approved' | 'In review'): void {
    this.updateState((state) => {
      const targetTip = state.communityTips.find((tip) => tip.id === tipId);
      if (!targetTip || targetTip.status === status) {
        return state;
      }

      const awardPoints = status === 'Approved' && targetTip.status !== 'Approved' ? 20 : 0;
      const createdAt = new Date().toISOString();

      return {
        ...state,
        ecoPoints: state.ecoPoints + awardPoints,
        communityTips: state.communityTips.map((tip) =>
          tip.id === tipId ? { ...tip, status } : tip,
        ),
        contributions: state.contributions.map((contribution) =>
          contribution.title === targetTip.location && contribution.type === 'Travel tip'
            ? { ...contribution, status }
            : contribution,
        ),
        transactions: awardPoints > 0
          ? [
              {
                id: this.createId('transaction'),
                title: 'Travel tip approved',
                subtitle: targetTip.location,
                points: awardPoints,
                status: 'Earned',
                createdAt,
              },
              ...state.transactions,
            ]
          : state.transactions,
      };
    });
  }

  recordRecentLocations(values: string[]): void {
    const nextValues = this.mergeRecentLocationValues(values, this.stateSubject.value.recentLocationValues);

    if (this.hasSameRecentLocations(nextValues, this.stateSubject.value.recentLocationValues)) {
      return;
    }

    this.updateState((state) => ({
      ...state,
      recentLocationValues: nextValues,
    }));
  }

  removeRecentLocation(value: string): void {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return;
    }

    this.updateState((state) => ({
      ...state,
      recentLocationValues: state.recentLocationValues.filter(
        (item) => item.trim().toLowerCase() !== normalizedValue.toLowerCase(),
      ),
    }));
  }

  setPostReaction(postId: string, reaction: CommunityPostReaction | null): void {
    const normalizedId = postId.trim();

    if (!normalizedId) {
      return;
    }

    this.updateState((state) => {
      const nextPostReactions = { ...state.postReactions };

      if (!reaction) {
        delete nextPostReactions[normalizedId];
      } else {
        nextPostReactions[normalizedId] = reaction;
      }

      return {
        ...state,
        postReactions: nextPostReactions,
      };
    });
  }

  awardEcoPoints(
    points: number,
    options?: { title?: string; subtitle?: string; status?: 'Earned' | 'Pending' },
  ): void {
    const createdAt = new Date().toISOString();
    const transaction: PointTransaction | null = options?.title
      ? {
          id: this.createId('transaction'),
          title: options.title,
          subtitle: options.subtitle || '',
          points,
          status: options.status || 'Earned',
          createdAt,
        }
      : null;

    this.updateState((state) => ({
      ...state,
      ecoPoints: Math.max(0, state.ecoPoints + points),
      transactions: transaction ? [transaction, ...state.transactions] : state.transactions,
    }));
  }

  syncEcoPoints(points: number): void {
    const normalizedPoints = Math.max(0, points);
    if (this.stateSubject.value.ecoPoints === normalizedPoints) {
      return;
    }

    this.updateState((state) => ({
      ...state,
      ecoPoints: normalizedPoints,
    }));
  }

  private updateState(updater: (state: PersistedAppState) => PersistedAppState): void {
    const nextState = updater(this.getSnapshot());
    this.stateSubject.next(nextState);
    const persistedState = this.persistState(nextState);

    if (persistedState !== nextState) {
      this.stateSubject.next(persistedState);
    }
  }

  private loadState(): PersistedAppState {
    if (!this.canUseStorage()) {
      return createInitialState();
    }

    try {
      const rawState = globalThis.localStorage.getItem(this.storageKey);

      if (!rawState) {
        return createInitialState();
      }

      const parsedState = JSON.parse(rawState) as Partial<PersistedAppState>;
      return this.normalizeState(parsedState);
    } catch {
      return createInitialState();
    }
  }

  private normalizeState(state: Partial<PersistedAppState>): PersistedAppState {
    const defaults = createInitialState();

    if (state.version !== 2) {
      return defaults;
    }

    return {
      version: 2,
      ecoPoints: typeof state.ecoPoints === 'number' ? state.ecoPoints : defaults.ecoPoints,
      activeJourney: state.activeJourney ?? null,
      journeyHistory: Array.isArray(state.journeyHistory) ? state.journeyHistory : defaults.journeyHistory,
      recentLocationValues: this.normalizeRecentLocationValues(state.recentLocationValues, defaults.recentLocationValues),
      postReactions: this.normalizePostReactions(state.postReactions),
      contributions: Array.isArray(state.contributions) ? state.contributions : defaults.contributions,
      communityTips: Array.isArray(state.communityTips)
        ? state.communityTips.map((tip) => this.sanitizeCommunityTipMedia(tip))
        : [],
      tipDraft: state.tipDraft ? this.sanitizeCommunityTipMedia(state.tipDraft) : null,
      savedNoticeIds: Array.isArray(state.savedNoticeIds) ? state.savedNoticeIds : [],
      savedDestinationIds: Array.isArray(state.savedDestinationIds) ? state.savedDestinationIds : [],
      savedEventIds: Array.isArray(state.savedEventIds) ? state.savedEventIds : [],
      redeemedRewardIds: Array.isArray(state.redeemedRewardIds) ? state.redeemedRewardIds : [],
      completedVerificationIds: Array.isArray(state.completedVerificationIds) ? state.completedVerificationIds : [],
      verificationSubmissions: Array.isArray(state.verificationSubmissions) ? state.verificationSubmissions : [],
      transactions: Array.isArray(state.transactions) ? state.transactions : defaults.transactions,
    };
  }

  private sanitizeCommunityTipMedia<T extends CommunityTipDraft>(draft: T): T {
    if (!draft.imagePreview || draft.imagePreview.length <= MAX_COMMUNITY_IMAGE_PREVIEW_LENGTH) {
      return { ...draft };
    }

    const { imageName: _imageName, imagePreview: _imagePreview, ...draftWithoutMedia } = draft;
    return draftWithoutMedia as T;
  }

  private normalizeRecentLocationValues(
    values: unknown,
    fallbackValues: string[] = DEFAULT_RECENT_LOCATION_VALUES,
  ): string[] {
    const sourceValues = Array.isArray(values) ? values : fallbackValues;
    const normalizedValues: string[] = [];

    for (const value of sourceValues) {
      if (typeof value !== 'string') {
        continue;
      }

      const trimmedValue = value.trim();

      if (!trimmedValue || normalizedValues.some((item) => item.toLowerCase() === trimmedValue.toLowerCase())) {
        continue;
      }

      normalizedValues.push(trimmedValue);

      if (normalizedValues.length === MAX_RECENT_LOCATION_VALUES) {
        break;
      }
    }

    return normalizedValues;
  }

  private mergeRecentLocationValues(values: string[], existingValues: string[]): string[] {
    const normalizedNewValues = this.normalizeRecentLocationValues(values, []);
    const normalizedExistingValues = this.normalizeRecentLocationValues(existingValues, []);

    return this.normalizeRecentLocationValues([
      ...normalizedNewValues,
      ...normalizedExistingValues.filter((existingValue) => (
        !normalizedNewValues.some((newValue) => newValue.toLowerCase() === existingValue.toLowerCase())
      )),
    ], []);
  }

  private hasSameRecentLocations(left: string[], right: string[]): boolean {
    return left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  private normalizePostReactions(
    reactions: unknown,
  ): Record<string, CommunityPostReaction> {
    if (!reactions || typeof reactions !== 'object') {
      return {};
    }

    return Object.entries(reactions).reduce<Record<string, CommunityPostReaction>>((normalized, [postId, reaction]) => {
      if ((reaction === 'helpful' || reaction === 'not-helpful') && postId.trim()) {
        normalized[postId] = reaction;
      }

      return normalized;
    }, {});
  }

  private persistState(state: PersistedAppState): PersistedAppState {
    if (!this.canUseStorage()) {
      return state;
    }

    try {
      globalThis.localStorage.setItem(this.storageKey, JSON.stringify(state));
      return state;
    } catch {
      const compactedState = this.compactStateForStorage(state);

      if (compactedState !== state) {
        try {
          globalThis.localStorage.setItem(this.storageKey, JSON.stringify(compactedState));
          return compactedState;
        } catch {
          // Keep the current session usable when browser storage is unavailable.
        }
      }

      return state;
    }
  }

  private compactStateForStorage(state: PersistedAppState): PersistedAppState {
    let changed = false;
    const communityTips = state.communityTips.map((tip) => {
      const sanitizedTip = this.sanitizeCommunityTipMedia(tip);
      changed = changed || sanitizedTip.imagePreview !== tip.imagePreview || sanitizedTip.imageName !== tip.imageName;
      return sanitizedTip;
    });
    const tipDraft = state.tipDraft ? this.sanitizeCommunityTipMedia(state.tipDraft) : null;

    if (state.tipDraft) {
      changed = changed
        || tipDraft?.imagePreview !== state.tipDraft.imagePreview
        || tipDraft?.imageName !== state.tipDraft.imageName;
    }

    if (!changed) {
      return state;
    }

    return {
      ...state,
      communityTips,
      tipDraft,
    };
  }

  private canUseStorage(): boolean {
    try {
      return typeof globalThis.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private createId(prefix: string): string {
    const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${randomId}`;
  }
}
