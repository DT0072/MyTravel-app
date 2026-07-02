import { firstValueFrom } from 'rxjs';

import { NavigationRequest, NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    service = new NavigationService();
  });

  it('returns localized service statuses and recent locations', async () => {
    const [statuses, recentLocations] = await Promise.all([
      firstValueFrom(service.getServiceStatuses('BM')),
      firstValueFrom(service.getRecentLocations('BM')),
    ]);

    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses[0].route).toContain('ke');
    expect(statuses[0].state).toBe('Beroperasi seperti biasa');
    expect(recentLocations.length).toBeGreaterThan(0);
    expect(recentLocations[0].description).toContain('lapangan terbang');
  });

  it('localizes custom recent locations with seeded matches and generic fallbacks', async () => {
    const recentLocations = await firstValueFrom(
      service.getRecentLocations('EN', ['Merdeka 118', 'Batu Caves']),
    );

    expect(recentLocations).toEqual([
      jasmine.objectContaining({
        label: 'Merdeka 118',
        description: 'Landmark district near MRT and LRT',
      }),
      jasmine.objectContaining({
        label: 'Batu Caves',
        description: 'Your recent route search',
      }),
    ]);
  });

  it('returns no routes when the request is incomplete or duplicated', async () => {
    const incompleteRequest: NavigationRequest = {
      from: '',
      to: 'KL Sentral',
      mode: 'MRT',
      sort: 'Fastest',
      travelDate: '2026-07-01',
      travelTime: '09:15',
    };
    const duplicateRequest: NavigationRequest = {
      ...incompleteRequest,
      from: 'Pasar Seni',
      to: 'pasar seni',
    };

    const [incompleteRoutes, duplicateRoutes] = await Promise.all([
      firstValueFrom(service.buildPlan(incompleteRequest)),
      firstValueFrom(service.buildPlan(duplicateRequest)),
    ]);

    expect(incompleteRoutes).toEqual([]);
    expect(duplicateRoutes).toEqual([]);
  });

  it('prioritizes accessible routes when requested', async () => {
    const routes = await firstValueFrom(service.buildPlan({
      from: 'KL Sentral',
      to: 'Merdeka 118',
      mode: 'Walk',
      sort: 'Accessible',
      travelDate: '2026-07-01',
      travelTime: '09:15',
    }, 'BM'));

    expect(routes.length).toBe(3);
    expect(routes[0].isAccessible).toBeTrue();
    expect(routes[0].transfers).toBeLessThanOrEqual(routes[1].transfers);
    expect(routes[0].detail).toContain('jambatan');
    expect(routes[0].fare).toBe('Percuma');
    expect(routes[0].arrive).toBe('10:03 AM');
  });

  it('prioritizes shorter durations for fastest sort', async () => {
    const routes = await firstValueFrom(service.buildPlan({
      from: 'Pasar Seni',
      to: 'KLCC',
      mode: 'Bus',
      sort: 'Fastest',
      travelDate: '2026-07-01',
      travelTime: '18:10',
    }));

    expect(routes[0].mode).toBe('Express Bus');
    expect(routes[0].duration).toBe('29 min');
    expect(routes[0].arrive).toBe('06:39 PM');
  });
});
