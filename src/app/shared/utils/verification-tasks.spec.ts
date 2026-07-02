import {
  buildVerificationProgress,
  getNextVerificationTask,
  SEEDED_VERIFICATION_TASKS,
} from './verification-tasks';

describe('verification-tasks', () => {
  it('returns the first incomplete verification task from the shared queue', () => {
    expect(getNextVerificationTask([])?.id).toBe('verification-kl-sentral-access');
    expect(
      getNextVerificationTask(['verification-kl-sentral-access'])?.id,
    ).toBe('verification-pasar-seni-access');
    expect(
      getNextVerificationTask([
        'verification-kl-sentral-access',
        'verification-pasar-seni-access',
      ]),
    ).toBeNull();
  });

  it('exposes one shared verification queue for Home and Community', () => {
    expect(SEEDED_VERIFICATION_TASKS.map((task) => task.title)).toEqual([
      'KL Sentral accessibility review',
      'Pasar Seni accessibility review',
    ]);
  });

  it('builds a stable progress summary from completed verification ids', () => {
    expect(buildVerificationProgress([])).toEqual({
      completedCount: 0,
      totalCount: 2,
      remainingCount: 2,
      nextTask: SEEDED_VERIFICATION_TASKS[0],
    });

    expect(
      buildVerificationProgress([
        'verification-kl-sentral-access',
        'verification-kl-sentral-access',
        'unknown-task',
      ]),
    ).toEqual({
      completedCount: 1,
      totalCount: 2,
      remainingCount: 1,
      nextTask: SEEDED_VERIFICATION_TASKS[1],
    });
  });
});
