import { AppLanguage } from '../../services/accessibility-preferences.service';
import { AppStateService } from '../../services/app-state.service';

type LocalizedText = Record<AppLanguage, string>;

export interface TravelProgressSnapshot {
  ecoPoints: number;
  journeyCount: number;
  approvedContributionCount: number;
  completedVerificationCount: number;
  savedNoticeCount: number;
}

export interface PassportStampDefinition {
  name: string;
  region: 'state' | 'federal';
  unlockedImage: string;
  heroImage: string;
  label: LocalizedText;
  description: LocalizedText;
  isUnlocked(progress: TravelProgressSnapshot): boolean;
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

export const PASSPORT_STAMP_DEFINITIONS: PassportStampDefinition[] = [
  {
    name: 'Selangor',
    region: 'state',
    unlockedImage: 'assets/mytravel/stamp-selangor.png',
    heroImage: 'assets/mytravel/transit-map.png',
    label: { EN: 'Urban mobility stamp', BM: 'Cop mobiliti bandar' },
    description: {
      EN: 'Celebrate verified Klang Valley journeys and connected city travel.',
      BM: 'Raikan perjalanan Lembah Klang yang disahkan dan perjalanan bandar yang saling berhubung.',
    },
    isUnlocked: (progress) => progress.journeyCount >= 1 || progress.ecoPoints >= 20,
  },
  {
    name: 'Melaka',
    region: 'state',
    unlockedImage: 'assets/mytravel/stamp-melaka.png',
    heroImage: 'assets/mytravel/melaka.png',
    label: { EN: 'Heritage storyteller', BM: 'Pencerita warisan' },
    description: {
      EN: 'Unlocked by sharing useful heritage-friendly tips and destination updates.',
      BM: 'Dibuka dengan berkongsi tip mesra warisan dan kemas kini destinasi yang berguna.',
    },
    isUnlocked: (progress) => progress.approvedContributionCount >= 1 || progress.savedNoticeCount >= 1,
  },
  {
    name: 'Penang',
    region: 'state',
    unlockedImage: 'assets/mytravel/stamp-penang.png',
    heroImage: 'assets/mytravel/george-town.png',
    label: { EN: 'Culture connector', BM: 'Penghubung budaya' },
    description: {
      EN: 'Marks steady eco-friendly exploration through repeat journeys and points earned.',
      BM: 'Menandakan penerokaan lestari yang konsisten melalui perjalanan berulang dan mata yang diperoleh.',
    },
    isUnlocked: (progress) => progress.journeyCount >= 2 || progress.ecoPoints >= 60,
  },
  {
    name: 'Perlis',
    region: 'state',
    unlockedImage: 'assets/mytravel/stamp-perlis.png',
    heroImage: 'assets/mytravel/timah-tasoh-hero.png',
    label: { EN: 'Nature trail keeper', BM: 'Penjaga denai alam' },
    description: {
      EN: 'Reserved for travelers who verify places carefully and build trusted travel data.',
      BM: 'Dikhaskan untuk pengembara yang mengesahkan tempat dengan teliti dan membina data perjalanan yang dipercayai.',
    },
    isUnlocked: (progress) => progress.completedVerificationCount >= 1 || progress.ecoPoints >= 80,
  },
];

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
  return {
    collectedCount: PASSPORT_STAMP_DEFINITIONS.filter((stamp) => stamp.isUnlocked(progress)).length,
    totalCount: PASSPORT_STAMP_DEFINITIONS.length,
  };
}

export function buildChallengeProgress(
  progress: TravelProgressSnapshot,
  unlockedStampCount: number,
): ChallengeProgressSummary {
  const heritageTarget = 3;
  const communityTarget = 2;
  const passportTarget = 2;
  const heritageProgress = Math.min(progress.journeyCount, heritageTarget);
  const communityProgress = Math.min(progress.approvedContributionCount, communityTarget);
  const passportProgress = Math.min(unlockedStampCount, passportTarget);

  return {
    heritageProgress,
    heritageTarget,
    communityProgress,
    communityTarget,
    passportProgress,
    passportTarget,
    completedSteps: heritageProgress + communityProgress + passportProgress,
    totalSteps: heritageTarget + communityTarget + passportTarget,
  };
}
