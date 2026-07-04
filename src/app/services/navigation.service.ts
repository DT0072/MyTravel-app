import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { AppLanguage } from './accessibility-preferences.service';

export interface NavigationRequest {
  from: string;
  to: string;
  mode: string;
  sort: string;
  travelDate: string;
  travelTime: string;
}

export interface RouteOption {
  mode: string;
  detail: string;
  color: string;
  depart: string;
  arrive: string;
  duration: string;
  fare: string;
  walk: string;
  transfers: number;
  isAccessible: boolean;
  accessibilityNote: string;
  points?: string;
}

export interface ServiceStatus {
  line: string;
  route: string;
  state: string;
  color: string;
}

export interface RecentLocation {
  label: string;
  value: string;
  description: string;
}

const PLANNER_MODES = ['MRT', 'LRT', 'KTM', 'Bus', 'Walk'] as const;

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  getModes(): string[] {
    return [...PLANNER_MODES];
  }

  getServiceStatuses(language: AppLanguage = 'EN'): Observable<ServiceStatus[]> {
    void language;
    return of([]);
  }

  getRecentLocations(language: AppLanguage = 'EN', values?: string[]): Observable<RecentLocation[]> {
    const recentValues = Array.isArray(values) ? values : [];

    return of(recentValues.map((value) => this.createRecentLocation(value, language)));
  }

  buildPlan(request: NavigationRequest, language: AppLanguage = 'EN'): Observable<RouteOption[]> {
    const from = request.from.trim();
    const to = request.to.trim();
    void language;

    if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
      return of([]);
    }

    return of([]);
  }

  swapLocations(from: string, to: string): { from: string; to: string } {
    return { from: to, to: from };
  }

  private createRecentLocation(value: string, language: AppLanguage): RecentLocation {
    return {
      label: value,
      value,
      description: language === 'BM'
        ? 'Carian lokasi terkini anda'
        : 'Your recent route search',
    };
  }
}
