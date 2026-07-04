import { firstValueFrom } from 'rxjs';

import { NavigationRequest, NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    service = new NavigationService();
  });

  it('returns empty service statuses and an empty recent-locations list by default', async () => {
    const [statuses, recentLocations] = await Promise.all([
      firstValueFrom(service.getServiceStatuses('BM')),
      firstValueFrom(service.getRecentLocations('BM')),
    ]);

    expect(statuses).toEqual([]);
    expect(recentLocations).toEqual([]);
  });

  it('localizes custom recent locations with generic fallback descriptions', async () => {
    const recentLocations = await firstValueFrom(
      service.getRecentLocations('EN', ['Merdeka 118', 'Batu Caves']),
    );

    expect(recentLocations).toEqual([
      jasmine.objectContaining({
        label: 'Merdeka 118',
        description: 'Your recent route search',
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

  it('returns no route options by default for valid journey requests until a transport provider is connected', async () => {
    const routes = await firstValueFrom(service.buildPlan({
      from: 'Pasar Seni',
      to: 'KLCC',
      mode: 'Bus',
      sort: 'Fastest',
      travelDate: '2026-07-01',
      travelTime: '18:10',
    }));

    expect(routes).toEqual([]);
  });
});
