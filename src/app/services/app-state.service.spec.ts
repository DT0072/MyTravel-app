import { AppStateService, CommunityTipDraft } from './app-state.service';

describe('AppStateService', () => {
  const storageKey = 'mytravel.app-state.v1';
  let service: AppStateService;

  function createDraft(overrides: Partial<CommunityTipDraft> = {}): CommunityTipDraft {
    return {
      location: 'Museum',
      state: 'Kuala Lumpur',
      category: 'Heritage',
      tip: 'A useful travel tip for nearby visitors.',
      accessible: true,
      hearingAccessible: false,
      confirmed: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    globalThis.localStorage.removeItem(storageKey);
    service = new AppStateService();
  });

  afterEach(() => {
    globalThis.localStorage.removeItem(storageKey);
  });

  it('strips oversized image previews when saving a draft', () => {
    service.saveTipDraft(createDraft({
      imageName: 'large.png',
      imagePreview: `data:image/png;base64,${'a'.repeat(400_000)}`,
    }));

    expect(service.getSnapshot().tipDraft).toEqual(createDraft());
  });

  it('strips oversized image previews when submitting a tip', () => {
    const savedTip = service.submitTip(createDraft({
      imageName: 'large.png',
      imagePreview: `data:image/png;base64,${'a'.repeat(400_000)}`,
    }));

    expect(savedTip.imageName).toBeUndefined();
    expect(savedTip.imagePreview).toBeUndefined();
    expect(service.getSnapshot().communityTips[0].imagePreview).toBeUndefined();
  });

  it('sanitizes oversized draft media before persistence', () => {
    let setItemCalls = 0;
    const originalSetItem = globalThis.localStorage.setItem.bind(globalThis.localStorage);

    spyOn(globalThis.localStorage, 'setItem').and.callFake((key: string, value: string) => {
      setItemCalls += 1;

      if (setItemCalls > 1) {
        throw new Error('Quota exceeded');
      }

      originalSetItem(key, value);
    });

    service.saveTipDraft(createDraft({
      imageName: 'large.png',
      imagePreview: `data:image/png;base64,${'a'.repeat(400_000)}`,
    }));

    const persistedState = JSON.parse(globalThis.localStorage.getItem(storageKey) ?? '{}') as {
      tipDraft?: CommunityTipDraft | null;
    };

    expect(setItemCalls).toBe(1);
    expect(service.getSnapshot().tipDraft).toEqual(createDraft());
    expect(persistedState.tipDraft).toEqual(createDraft());
  });

  it('records recent locations in deduplicated newest-first order', () => {
    service.recordRecentLocations(['Batu Caves', 'KL Sentral', '  Batu Caves  ']);

    expect(service.getSnapshot().recentLocationValues).toEqual([
      'Batu Caves',
      'KL Sentral',
      'Pasar Seni',
      'Merdeka 118',
    ]);
  });

  it('removes recent locations and preserves the updated list in storage', () => {
    service.removeRecentLocation('Pasar Seni');

    expect(service.getSnapshot().recentLocationValues).toEqual([
      'KL Sentral',
      'Merdeka 118',
    ]);

    const persistedState = JSON.parse(globalThis.localStorage.getItem(storageKey) ?? '{}') as {
      recentLocationValues?: string[];
    };

    expect(persistedState.recentLocationValues).toEqual([
      'KL Sentral',
      'Merdeka 118',
    ]);
  });

  it('persists community post reactions and clears them when toggled off', () => {
    service.setPostReaction('seeded-george-town', 'helpful');

    expect(service.getSnapshot().postReactions).toEqual({
      'seeded-george-town': 'helpful',
    });

    service.setPostReaction('seeded-george-town', null);

    expect(service.getSnapshot().postReactions).toEqual({});
  });

  it('resets offline app state back to the initial signed-out snapshot', () => {
    service.recordRecentLocations(['Batu Caves']);
    service.toggleSavedNotice('notice-kelana-jaya-delay');
    service.setPostReaction('seeded-george-town', 'helpful');
    service.saveTipDraft(createDraft());
    service.submitVerification('verification-kl-sentral-access', 'KL Sentral accessibility review');

    service.resetState();

    expect(service.getSnapshot()).toEqual({
      version: 2,
      ecoPoints: 0,
      activeJourney: null,
      journeyHistory: [],
      recentLocationValues: ['KL Sentral', 'Pasar Seni', 'Merdeka 118'],
      postReactions: {},
      contributions: [],
      communityTips: [],
      tipDraft: null,
      savedNoticeIds: [],
      completedVerificationIds: [],
      transactions: [],
    });

    expect(JSON.parse(globalThis.localStorage.getItem(storageKey) ?? '{}')).toEqual(service.getSnapshot());
  });
});
