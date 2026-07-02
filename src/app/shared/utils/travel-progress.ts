import { AppStateService } from '../../services/app-state.service';

export interface TravelProgressSnapshot {
  ecoPoints: number;
  journeyCount: number;
  approvedContributionCount: number;
  completedVerificationCount: number;
  savedNoticeCount: number;
}

export interface ChallengeProgressSummary {
  heritageProgress: number;
  heritageTarget: number;
  communityProgress: number;
  communityTarget: number;
  passportProgress: number;
  passportTarget: number;
  completedSteps: number;
  totalSteps: number;
}

export function buildTravelProgress(
  state: ReturnType<AppStateService['getSnapshot']>,
): TravelProgressSnapshot {
  return {
    ecoPoints: state.ecoPoints,
    journeyCount: state.journeyHistory.length,
    approvedContributionCount: state.contributions.filter((contribution) => contribution.status === 'Approved').length,
    completedVerificationCount: state.completedVerificationIds.length,
    savedNoticeCount: state.savedNoticeIds.length,
  };
}

export function buildPassportSummary(
  progress: TravelProgressSnapshot,
): { collectedCount: number; totalCount: number } {
  void progress;
  return {
    collectedCount: 0,
    totalCount: 0,
  };
}

export function buildChallengeProgress(
  progress: TravelProgressSnapshot,
  unlockedStampCount: number,
): ChallengeProgressSummary {
  void progress;
  void unlockedStampCount;

  return {
    heritageProgress: 0,
    heritageTarget: 0,
    communityProgress: 0,
    communityTarget: 0,
    passportProgress: 0,
    passportTarget: 0,
    completedSteps: 0,
    totalSteps: 0,
  };
}
