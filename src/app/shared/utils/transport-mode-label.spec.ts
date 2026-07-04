import { getTransportModeLabel } from './transport-mode-label';

describe('getTransportModeLabel', () => {
  it('localizes bus and walk labels for Bahasa Melayu', () => {
    expect(getTransportModeLabel('BM', 'Bus')).toBe('Bas');
    expect(getTransportModeLabel('BM', 'Walk')).toBe('Jalan kaki');
  });

  it('preserves English labels and unknown modes', () => {
    expect(getTransportModeLabel('EN', 'Bus')).toBe('Bus');
    expect(getTransportModeLabel('EN', 'Walk')).toBe('Walk');
    expect(getTransportModeLabel('BM', 'MRT')).toBe('MRT');
  });
});
