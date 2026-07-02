import {
  buildChallengeProgress,
  buildPassportSummary,
  buildTravelProgress,
} from './travel-progress';

describe('travel-progress', () => {
  function createState() {
    return {
      version: 2 as const,
      ecoPoints: 80,
      activeJourney: null,
      journeyHistory: [
        {
          id: 'journey-1',
          from: 'KL Sentral',
          to: 'Pasar Seni',
          mode: 'LRT',
          detail: 'Kelana Jaya Line',
          depart: '09:00',
          arrive: '09:12',
          duration: '12 min',
          fare: 'RM 1.80',
          walk: '4 min',
          isAccessible: true,
          travelDate: '2026-07-01',
          travelTime: '09:00',
          startedAt: '2026-07-01T01:00:00.000Z',
          completedAt: '2026-07-01T01:12:00.000Z',
          points: 20,
        },
        {
          id: 'journey-2',
          from: 'Masjid Jamek',
          to: 'Batu Caves',
          mode: 'KTM',
          detail: 'Batu Caves Line',
          depart: '13:00',
          arrive: '13:28',
          duration: '28 min',
          fare: 'RM 2.60',
          walk: '6 min',
          isAccessible: false,
          travelDate: '2026-07-02',
          travelTime: '13:00',
          startedAt: '2026-07-02T05:00:00.000Z',
          completedAt: '2026-07-02T05:28:00.000Z',
          points: 20,
        },
      ],
      recentLocationValues: ['KL Sentral', 'Pasar Seni', 'Merdeka 118'],
      postReactions: {},
      contributions: [
        {
          id: 'contribution-1',
          title: 'Station accessibility update',
          type: 'Verification' as const,
          status: 'Approved' as const,
          createdAt: '2026-06-22T02:00:00.000Z',
          points: 40,
        },
      ],
      communityTips: [],
      tipDraft: null,
      savedNoticeIds: ['notice-kelana-jaya-delay'],
      completedVerificationIds: ['verification-kl-sentral-access'],
      transactions: [],
    };
  }

  it('builds shared passport and challenge progress from saved app state', () => {
    const progress = buildTravelProgress(createState());
    const passportSummary = buildPassportSummary(progress);
    const challengeProgress = buildChallengeProgress(progress, passportSummary.collectedCount);

    expect(progress).toEqual({
      ecoPoints: 80,
      journeyCount: 2,
      approvedContributionCount: 1,
      completedVerificationCount: 1,
      savedNoticeCount: 1,
    });
    expect(passportSummary).toEqual({
      collectedCount: 4,
      totalCount: 4,
    });
    expect(challengeProgress.completedSteps).toBe(5);
    expect(challengeProgress.totalSteps).toBe(7);
    expect(challengeProgress.passportProgress).toBe(2);
  });
});
