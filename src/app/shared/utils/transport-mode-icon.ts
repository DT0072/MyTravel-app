export function getTransportModeIconName(mode: string): string {
  switch (mode) {
    case 'Bus':
      return 'bus-outline';
    case 'Walk':
      return 'walk-outline';
    default:
      return 'train-outline';
  }
}
