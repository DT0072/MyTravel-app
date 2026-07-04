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

export function getNextVerificationTask(
  completedVerificationIds: string[],
): VerificationTaskDefinition | null {
  void completedVerificationIds;
  return null;
}

export function buildVerificationProgress(
  completedVerificationIds: string[],
): VerificationProgressSummary {
  void completedVerificationIds;
  const completedCount = 0;
  const totalCount = 0;

  return {
    completedCount,
    totalCount,
    remainingCount: 0,
    nextTask: null,
  };
}
