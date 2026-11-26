import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { AppLanguage } from '../../services/accessibility-preferences.service';
import {
  GtfsRealtimeService,
  GtfsRealtimeSnapshot,
  LiveGtfsVehicle,
} from '../../services/gtfs-realtime.service';
import {
  NavigationService,
  RouteLegDetail,
  RouteOption,
} from '../../services/navigation.service';

@Component({
  selector: 'app-live-transit-map',
  templateUrl: './live-transit-map.component.html',
  styleUrls: ['./live-transit-map.component.scss'],
  standalone: false,
})
export class LiveTransitMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) private mapContainerRef!: ElementRef<HTMLDivElement>;

  @Input() fromName = '';
  @Input() toName = '';
  @Input() waypoints: [number, number][] = [];
  @Input() legs: RouteLegDetail[] = [];
  @Input() alternativeRoutes: RouteOption[] = [];
  @Input() activeRouteIndex = 0;
  @Input() routeColor = '#0b57d0';
  @Input() centerLat = 3.139;
  @Input() centerLng = 101.6869;
  @Input() compact = false;
  @Input() language: AppLanguage = 'EN';

  @Output() routeSelect = new EventEmitter<number>();

  private readonly gtfsRealtime = inject(GtfsRealtimeService);
  private readonly navService = inject(NavigationService);
  private readonly ngZone = inject(NgZone);

  private map: L.Map | null = null;
  private vehicleLayer = L.layerGroup();
  private routeLayer = L.layerGroup();
  private rtSub?: Subscription;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private initTimers: ReturnType<typeof setTimeout>[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  snapshot: GtfsRealtimeSnapshot = this.gtfsRealtime.snapshot;

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initMap();
    });

    this.rtSub = this.gtfsRealtime.snapshot$.subscribe((snap) => {
      if (this.destroyed) return;
      this.snapshot = snap;
      this.renderLiveVehicles(snap.vehicles);
    });

    void this.gtfsRealtime.refresh();
    this.pollTimer = setInterval(() => {
      if (!this.destroyed) {
        void this.gtfsRealtime.refresh();
      }
    }, 60_000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map || this.destroyed) {
      return;
    }
    if (
      changes['waypoints']
      || changes['legs']
      || changes['alternativeRoutes']
      || changes['activeRouteIndex']
      || changes['fromName']
      || changes['toName']
      || changes['centerLat']
      || changes['centerLng']
      || changes['routeColor']
    ) {
      this.renderRouteAndFocus();
      this.renderLiveVehicles(this.snapshot.vehicles);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.rtSub?.unsubscribe();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    for (const timer of this.initTimers) {
      clearTimeout(timer);
    }
    this.initTimers = [];
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.map) {
      try {
        this.map.stop();
        this.map.off();
        this.map.remove();
      } catch {
        // Ignore teardown race if container already detached
      }
      this.map = null;
    }
  }

  refreshNow(event: Event): void {
    event.stopPropagation();
    void this.gtfsRealtime.refresh(true);
  }

  recenterMap(event: Event): void {
    event.stopPropagation();
    this.renderRouteAndFocus();
  }

  get liveBadgeLabel(): string {
    if (this.snapshot.loading && this.snapshot.totalVehicles === 0) {
      return this.language === 'BM' ? 'Menyegerakkan GTFS-RT...' : 'Syncing GTFS-RT...';
    }
    if (this.snapshot.totalVehicles > 0) {
      return this.language === 'BM'
        ? `${this.snapshot.totalVehicles} Kenderaan Langsung`
        : `${this.snapshot.totalVehicles} Live Vehicles`;
    }
    return this.language === 'BM' ? 'Peta Transit Langsung' : 'Live Transit Map';
  }

  private initMap(): void {
    if (this.destroyed) return;
    const container = this.mapContainerRef.nativeElement;
    this.map = L.map(container, {
      center: [this.centerLat, this.centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: !this.compact,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    if (!this.compact) {
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    }

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.routeLayer.addTo(this.map);
    this.vehicleLayer.addTo(this.map);

    this.renderRouteAndFocus();
    this.renderLiveVehicles(this.snapshot.vehicles);

    this.initTimers.push(
      setTimeout(() => {
        if (!this.destroyed && this.map) {
          this.map.invalidateSize({ animate: false });
        }
      }, 120),
      setTimeout(() => {
        if (!this.destroyed && this.map) {
          this.map.invalidateSize({ animate: false });
          this.renderRouteAndFocus();
        }
      }, 380),
    );

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.destroyed && this.map) {
          this.map.invalidateSize({ animate: false });
        }
      });
      this.resizeObserver.observe(container);
    }
  }

  private renderRouteAndFocus(): void {
    if (!this.map || this.destroyed) {
      return;
    }
    this.routeLayer.clearLayers();
    const allBoundsPts: [number, number][] = [];

    // 1. Multi-route overview mode (Image 1: draw non-selected alternatives first, then selected route on top)
    if (this.alternativeRoutes && this.alternativeRoutes.length > 0) {
      const safeActiveIdx = Math.min(Math.max(0, this.activeRouteIndex), this.alternativeRoutes.length - 1);
      const activeRoute = this.alternativeRoutes[safeActiveIdx];
      const activePts = this.collectRoutePoints(activeRoute);
      const placedLabelCoords: [number, number][] = [];
      let activeLabelCoord: [number, number] | null = null;
      if (activePts.length >= 2) {
        activeLabelCoord = this.pickSpacedLabelPoint(
          activePts,
          placedLabelCoords,
          activePts[0],
          activePts[activePts.length - 1],
          0,
        );
        if (activeLabelCoord) {
          placedLabelCoords.push(activeLabelCoord);
        }
      }

      // Draw alternative routes underneath in lavender-blue (#6b84d6) with non-overlapping duration pills
      this.alternativeRoutes.forEach((altRoute, idx) => {
        if (idx === safeActiveIdx) return;
        const altPts = this.collectRoutePoints(altRoute);
        if (altPts.length < 2) return;
        allBoundsPts.push(...altPts);

        L.polyline(altPts, {
          color: '#ffffff',
          weight: 7,
          opacity: 0.78,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(this.routeLayer);

        const altLine = L.polyline(altPts, {
          color: '#6b84d6',
          weight: 4.5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        });
        altLine.on('click', () => {
          this.ngZone.run(() => this.routeSelect.emit(idx));
        });
        altLine.addTo(this.routeLayer);

        const altLabelPt = this.pickSpacedLabelPoint(
          altPts,
          placedLabelCoords,
          altPts[0],
          altPts[altPts.length - 1],
          idx,
        );
        if (altLabelPt) {
          placedLabelCoords.push(altLabelPt);
          const pillMarker = L.marker(altLabelPt, {
            icon: L.divIcon({
              className: 'mt-duration-callout-wrap',
              html: `<span class="mt-duration-pill alt">🚆 ${this.escapeHtml(altRoute.duration)}</span>`,
              iconSize: [96, 26],
              iconAnchor: [48, 13],
            }),
            zIndexOffset: 100 + idx,
          });
          pillMarker.on('click', () => {
            this.ngZone.run(() => this.routeSelect.emit(idx));
          });
          pillMarker.addTo(this.routeLayer);
        }
      });

      // Draw active/selected route on top with per-leg line colors + interchange circles + active blue duration pill
      if (activePts.length >= 2) {
        allBoundsPts.push(...activePts);
        this.drawDetailedLegsOrWaypoints(activeRoute.legs || [], activePts, activeRoute.color);
        this.drawEndpoints(activePts[0], activePts[activePts.length - 1]);

        if (activeLabelCoord) {
          L.marker(activeLabelCoord, {
            icon: L.divIcon({
              className: 'mt-duration-callout-wrap',
              html: `<span class="mt-duration-pill selected">🚆 ${this.escapeHtml(activeRoute.duration)}</span>`,
              iconSize: [104, 28],
              iconAnchor: [52, 14],
            }),
            zIndexOffset: 600,
          }).addTo(this.routeLayer);
        }
      }

      if (allBoundsPts.length >= 2) {
        this.map.fitBounds(L.latLngBounds(allBoundsPts), { padding: [44, 44], maxZoom: 15, animate: false });
      }
      return;
    }

    // 2. Single detailed route mode (Image 2 / Active Navigation / Tab 1 Live Journey Tracker)
    const pts = this.resolveSingleRoutePoints();
    if (pts.length >= 2) {
      this.drawDetailedLegsOrWaypoints(this.legs || [], pts, this.routeColor);
      this.drawEndpoints(pts[0], pts[pts.length - 1]);
      this.map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 15, animate: false });
      return;
    }

    // 3. Single hub focus mode
    const singleIcon = L.divIcon({
      className: 'mt-map-endpoint-icon',
      html: `<span class="mt-pin origin">●</span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker([this.centerLat, this.centerLng], { icon: singleIcon }).addTo(this.routeLayer);
    this.map.setView([this.centerLat, this.centerLng], this.compact ? 13 : 14, { animate: false });
  }

  private drawDetailedLegsOrWaypoints(
    legs: RouteLegDetail[],
    fallbackPts: [number, number][],
    fallbackColor: string,
  ): void {
    const legsWithCoords = legs.filter((l) => l.coords && l.coords.length >= 2);
    if (legsWithCoords.length > 0) {
      for (const leg of legsWithCoords) {
        if (leg.type === 'walk') {
          L.polyline(leg.coords, {
            color: '#ffffff',
            weight: 6.5,
            opacity: 0.9,
          }).addTo(this.routeLayer);
          L.polyline(leg.coords, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.95,
            dashArray: '3, 7',
            lineCap: 'round',
          }).addTo(this.routeLayer);
        } else {
          const col = leg.badgeColor || fallbackColor || '#0b57d0';
          L.polyline(leg.coords, {
            color: '#ffffff',
            weight: 9,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(this.routeLayer);
          L.polyline(leg.coords, {
            color: col,
            weight: 5.5,
            opacity: 0.98,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(this.routeLayer);

          // Boarding & alighting interchange station nodes
          const boardPt = leg.coords[0];
          const alightPt = leg.coords[leg.coords.length - 1];
          for (const [pt, stName] of [[boardPt, leg.fromName], [alightPt, leg.toName]] as [[number, number], string][]) {
            L.circleMarker(pt, {
              radius: 5.5,
              color: '#1e293b',
              weight: 2,
              fillColor: '#ffffff',
              fillOpacity: 1,
            })
              .bindPopup(`<b>${this.escapeHtml(stName)}</b><br><small>${this.escapeHtml(leg.badgeLabel)}</small>`)
              .addTo(this.routeLayer);
          }

          // Intermediate stop dots
          for (let i = 1; i < leg.coords.length - 1; i++) {
            L.circleMarker(leg.coords[i], {
              radius: 3.5,
              color: col,
              weight: 1.5,
              fillColor: '#ffffff',
              fillOpacity: 1,
            }).addTo(this.routeLayer);
          }
        }
      }
      return;
    }

    // Fallback single polyline
    L.polyline(fallbackPts, {
      color: '#ffffff',
      weight: 8,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(this.routeLayer);

    L.polyline(fallbackPts, {
      color: fallbackColor || '#0b57d0',
      weight: 5,
      opacity: 0.96,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(this.routeLayer);
  }

  private drawEndpoints(startPt: [number, number], endPt: [number, number]): void {
    const originIcon = L.divIcon({
      className: 'mt-map-endpoint-icon',
      html: `<span class="mt-pin origin">A</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const destIcon = L.divIcon({
      className: 'mt-map-endpoint-icon',
      html: `<span class="mt-pin dest">B</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    L.marker(startPt, { icon: originIcon, zIndexOffset: 700 })
      .bindPopup(`<strong>${this.escapeHtml(this.fromName || 'Origin')}</strong>`)
      .addTo(this.routeLayer);

    L.marker(endPt, { icon: destIcon, zIndexOffset: 700 })
      .bindPopup(`<strong>${this.escapeHtml(this.toName || 'Destination')}</strong>`)
      .addTo(this.routeLayer);
  }

  private collectRoutePoints(route: RouteOption): [number, number][] {
    if (route.waypoints && route.waypoints.length >= 2) {
      return route.waypoints;
    }
    if (route.legs && route.legs.length > 0) {
      const merged: [number, number][] = [];
      for (const l of route.legs) {
        if (l.coords) merged.push(...l.coords);
      }
      if (merged.length >= 2) return merged;
    }
    return this.resolveSingleRoutePoints();
  }

  private resolveSingleRoutePoints(): [number, number][] {
    if (this.waypoints && this.waypoints.length >= 2) {
      return this.waypoints;
    }
    if (this.legs && this.legs.length > 0) {
      const merged: [number, number][] = [];
      for (const l of this.legs) {
        if (l.coords) merged.push(...l.coords);
      }
      if (merged.length >= 2) return merged;
    }
    if (this.fromName.trim() && this.toName.trim()) {
      const fromCoord = this.navService.findLocationCoords(this.fromName);
      const toCoord = this.navService.findLocationCoords(this.toName);
      return [
        [fromCoord.lat, fromCoord.lng],
        [toCoord.lat, toCoord.lng],
      ];
    }
    return [];
  }

  private pickSpacedLabelPoint(
    pts: [number, number][],
    placedPoints: [number, number][],
    startPt: [number, number],
    endPt: [number, number],
    seed: number,
  ): [number, number] | null {
    const candidateRatios = [0.48, 0.36, 0.60, 0.28, 0.68];
    const rotated = candidateRatios.map((_, i) => candidateRatios[(i + seed) % candidateRatios.length]);
    let bestPt: [number, number] | null = null;
    let bestClearance = -1;

    for (const ratio of rotated) {
      let pt: [number, number];
      if (pts.length === 2) {
        pt = [
          pts[0][0] + (pts[1][0] - pts[0][0]) * ratio,
          pts[0][1] + (pts[1][1] - pts[0][1]) * ratio,
        ];
      } else {
        const idx = Math.min(pts.length - 2, Math.max(1, Math.floor(pts.length * ratio)));
        pt = pts[idx];
      }

      const endpointDist = Math.min(
        Math.hypot(pt[0] - startPt[0], pt[1] - startPt[1]),
        Math.hypot(pt[0] - endPt[0], pt[1] - endPt[1]),
      );
      let pillDist = Number.POSITIVE_INFINITY;
      for (const existing of placedPoints) {
        pillDist = Math.min(pillDist, Math.hypot(pt[0] - existing[0], pt[1] - existing[1]));
      }
      const clearance = Math.min(endpointDist * 1.15, pillDist);
      if (clearance > bestClearance) {
        bestClearance = clearance;
        bestPt = pt;
      }
    }

    // If an alternative route's best label spot is practically on top of an already-labeled route (< ~900m), skip duplicate pill clutter
    if (placedPoints.length > 0 && bestClearance < 0.008) {
      return null;
    }
    return bestPt;
  }

  private renderLiveVehicles(vehicles: LiveGtfsVehicle[]): void {
    if (!this.map || this.destroyed) {
      return;
    }
    this.vehicleLayer.clearLayers();
    if (!vehicles || vehicles.length === 0) {
      return;
    }

    const refCenter = this.map.getCenter();
    const sorted = [...vehicles]
      .map((v) => ({
        v,
        dist: Math.hypot(v.lat - refCenter.lat, v.lon - refCenter.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, this.compact ? 60 : 120);

    for (const { v } of sorted) {
      const color =
        v.feed === 'ktmb'
          ? '#1e40af'
          : v.feed === 'rapid-kl-bus-mrtfeeder'
            ? '#0d9488'
            : '#0b57d0';
      const speedKmh = v.speedMps !== null ? Math.round(v.speedMps * 3.6) : null;
      const routeTag = v.routeId ? this.escapeHtml(v.routeId) : (v.feed === 'ktmb' ? 'KTMB' : 'Rapid Bus');
      const marker = L.circleMarker([v.lat, v.lon], {
        radius: this.compact ? 4 : 5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      });

      if (!this.compact) {
        const speedLine = speedKmh !== null ? `<br><small>${speedKmh} km/h · Live GPS</small>` : '<br><small>Live GTFS-RT</small>';
        marker.bindPopup(`<b>Route ${routeTag}</b>${speedLine}`);
      }
      marker.addTo(this.vehicleLayer);
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch] || ch));
  }
}
