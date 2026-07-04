import {
  buildVerificationProgress,
  getNextVerificationTask,
} from './verification-tasks';

describe('verification-tasks', () => {
  it('returns no verification task until a provider-backed queue is connected', () => {
    expect(getNextVerificationTask([])).toBeNull();
    expect(getNextVerificationTask(['verification-kl-sentral-access'])).toBeNull();
  });

  it('builds an empty progress summary until a provider-backed queue is connected', () => {
    expect(buildVerificationProgress([])).toEqual({
      completedCount: 0,
      totalCount: 0,
      remainingCount: 0,
      nextTask: null,
    });

    expect(buildVerificationProgress([
      'verification-kl-sentral-access',
      'verification-kl-sentral-access',
      'unknown-task',
    ])).toEqual({
      completedCount: 0,
      totalCount: 0,
      remainingCount: 0,
      nextTask: null,
    });
  });
});
