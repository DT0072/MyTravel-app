import { AppLanguage } from '../../services/accessibility-preferences.service';

type LocalizedText = Record<AppLanguage, string>;

export interface VerificationTaskDefinition {
  id: string;
  title: string;
  image: string;
  place: LocalizedText;
  station: LocalizedText;
  address: LocalizedText;
  badge: LocalizedText;
  question: LocalizedText;
  lastUpdated: LocalizedText;
  points: number;
}

export interface VerificationProgressSummary {
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  nextTask: VerificationTaskDefinition | null;
}

export const SEEDED_VERIFICATION_TASKS: VerificationTaskDefinition[] = [
  {
    id: 'verification-kl-sentral-access',
    title: 'KL Sentral accessibility review',
    image: 'assets/mytravel/transit-map.png',
    place: {
      EN: 'KL Sentral station',
      BM: 'Stesen KL Sentral',
    },
    station: {
      EN: 'Checkpoint: KL Sentral concourse',
      BM: 'Pusat semakan: ruang legar KL Sentral',
    },
    address: {
      EN: 'Main concourse accessibility desk',
      BM: 'Meja kebolehcapaian ruang legar utama',
    },
    badge: {
      EN: 'Verified transit hub',
      BM: 'Hab transit disahkan',
    },
    question: {
      EN: 'Were the lift indicators and operating hours still clearly displayed at KL Sentral today?',
      BM: 'Adakah penunjuk lif dan waktu operasi masih dipaparkan dengan jelas di KL Sentral hari ini?',
    },
    lastUpdated: {
      EN: 'Last updated on 1 June 2026.',
      BM: 'Kali terakhir dikemas kini pada 1 Jun 2026.',
    },
    points: 40,
  },
  {
    id: 'verification-pasar-seni-access',
    title: 'Pasar Seni accessibility review',
    image: 'assets/mytravel/wira-ui.png',
    place: {
      EN: 'Pasar Seni station',
      BM: 'Stesen Pasar Seni',
    },
    station: {
      EN: 'Checkpoint: Pasar Seni platform access',
      BM: 'Pusat semakan: akses platform Pasar Seni',
    },
    address: {
      EN: 'Platform access corridor',
      BM: 'Koridor akses platform',
    },
    badge: {
      EN: 'Verified transit hub',
      BM: 'Hab transit disahkan',
    },
    question: {
      EN: 'Is the tactile path to the platform clear and is the lift still available at Pasar Seni?',
      BM: 'Adakah laluan taktil ke platform jelas dan adakah lif masih tersedia di Pasar Seni?',
    },
    lastUpdated: {
      EN: 'Last updated on 3 June 2026.',
      BM: 'Kali terakhir dikemas kini pada 3 Jun 2026.',
    },
    points: 40,
  },
];

export function getNextVerificationTask(
  completedVerificationIds: string[],
): VerificationTaskDefinition | null {
  const completedIdSet = new Set(completedVerificationIds);

  return SEEDED_VERIFICATION_TASKS.find(
    (task) => !completedIdSet.has(task.id),
  ) ?? null;
}

export function buildVerificationProgress(
  completedVerificationIds: string[],
): VerificationProgressSummary {
  const seededTaskIds = new Set(SEEDED_VERIFICATION_TASKS.map((task) => task.id));
  const completedCount = Array.from(new Set(completedVerificationIds)).filter(
    (id) => seededTaskIds.has(id),
  ).length;
  const totalCount = SEEDED_VERIFICATION_TASKS.length;

  return {
    completedCount,
    totalCount,
    remainingCount: Math.max(totalCount - completedCount, 0),
    nextTask: getNextVerificationTask(completedVerificationIds),
  };
}
