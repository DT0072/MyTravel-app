import { getTransportModeIconName } from './transport-mode-icon';

describe('getTransportModeIconName', () => {
  it('maps bus and walking journeys to matching icons', () => {
    expect(getTransportModeIconName('Bus')).toBe('bus-outline');
    expect(getTransportModeIconName('Walk')).toBe('walk-outline');
  });

  it('falls back to the train icon for rail and unknown modes', () => {
    expect(getTransportModeIconName('MRT')).toBe('train-outline');
    expect(getTransportModeIconName('KTM')).toBe('train-outline');
    expect(getTransportModeIconName('')).toBe('train-outline');
  });
});
