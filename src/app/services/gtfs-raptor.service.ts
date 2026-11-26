import { Injectable } from '@angular/core';

export interface GtfsRaptorLeg {
  mode: 'WALK' | 'RAIL' | 'BUS';
  routeId?: string;
  routeShortName?: string;
  routeLongName?: string;
  badgeLabel?: string;
  badgeColor?: string;
  routeType?: number;
  headsign?: string;
  fromStopName: string;
  toStopName: string;
  departSeconds: number;
  arriveSeconds: number;
  distanceMeters: number;
  stopCount?: number;
  intermediateStops?: string[];
  isAccessible?: boolean;
  liveTracked?: boolean;
  coords: [number, number][];
}

export interface GtfsRaptorItinerary {
  legs: GtfsRaptorLeg[];
  departSeconds: number;
  arriveSeconds: number;
  durationMinutes: number;
  walkMeters: number;
  transfers: number;
  fareRm: number;
  primaryMode: string;
  primaryLine: string;
  firstBoardingText: string;
  color: string;
  isAccessible: boolean;
  liveTracked: boolean;
  waypoints: [number, number][];
}

export interface GtfsStopSearchHit {
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  feed: string;
}

interface RawGtfsBundle {
  version: number;
  generatedAt: string;
  stops: Record<string, [string, number, number]>;
  routes: Record<string, [string, string, number]>;
  calendars: Record<string, (number | string)[]>;
  exceptions: Record<string, Record<string, number>>;
  trips: [string, string, string, string, [string, number, number][], [number, number, number][]][];
  transfers: Record<string, [string, number][]>;
}

interface ParsedTrip {
  tripId: string;
  routeId: string;
  serviceId: string;
  headsign: string;
  calls: { stopId: string; arrival: number; departure: number }[];
  frequencies: [number, number, number][];
}

interface RaptorLabel {
  arrival: number;
  prevStop: string | null;
  trip: ParsedTrip | null;
  boardStop: string | null;
  boardTime: number;
  isTransfer: boolean;
  walkMeters: number;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180)
      * Math.cos((lat2 * Math.PI) / 180)
      * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

const UPPERCASE_TRANSIT_TOKENS = new Set([
  'BRT', 'MRT', 'LRT', 'KTM', 'KTMB', 'KL', 'KLCC', 'KLIA', 'KLIA2',
  'USJ', 'TRX', 'IOI', 'UITM', 'UKM', 'UPM', 'UM', 'TBS', 'PWTC', 'TTDI',
]);

function cleanStopDisplayName(raw: string): string {
  const cleaned = raw
    .replace(/\s*-\s*REDONE$/i, '')
    .replace(/^\(M\d+\)\s*/i, '')
    .replace(/^STESEN\s+BRT\s+/i, 'BRT ')
    .replace(/^PERHENTIAN\s+/i, '')
    .trim();

  if (cleaned !== cleaned.toUpperCase()) {
    return cleaned;
  }

  return cleaned
    .split(/(\s+|-|\/|\(|\))/)
    .map((part) => {
      const upper = part.toUpperCase();
      if (UPPERCASE_TRANSIT_TOKENS.has(upper) || /^(SS|PJU|KJ|SBK|PY|AG|SP)\d*$/i.test(upper)) {
        return upper;
      }
      if (/^[A-Z]{2,}$/.test(part)) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }
      return part;
    })
    .join('');
}

@Injectable({
  providedIn: 'root',
})
export class GtfsRaptorService {
  private bundlePromise: Promise<RawGtfsBundle | null> | null = null;
  private cachedBundle: RawGtfsBundle | null = null;
  private parsedTrips: ParsedTrip[] | null = null;

  async loadBundle(): Promise<RawGtfsBundle | null> {
    if (this.cachedBundle) {
      return this.cachedBundle;
    }
    if (!this.bundlePromise) {
      this.bundlePromise = fetch('assets/gtfs/raptor_klang_valley.json')
        .then(async (res) => {
          if (!res.ok) return null;
          const json = (await res.json()) as RawGtfsBundle;
          if (!json || json.version !== 1 || !json.stops || !json.trips) {
            return null;
          }
          this.cachedBundle = json;
          return json;
        })
        .catch(() => null);
    }
    return this.bundlePromise;
  }

  searchCachedStops(query: string, limit = 6): GtfsStopSearchHit[] {
    const q = query.trim().toLowerCase();
    if (!q || !this.cachedBundle) {
      return [];
    }

    const hits: GtfsStopSearchHit[] = [];
    const seenNames = new Set<string>();

    // Prefer rail & KTMB stations first, then bus stops
    const entries = Object.entries(this.cachedBundle.stops).sort((a, b) => {
      const aRail = a[0].startsWith('rapid-kl-rail:') || a[0].startsWith('ktmb:') ? 0 : 1;
      const bRail = b[0].startsWith('rapid-kl-rail:') || b[0].startsWith('ktmb:') ? 0 : 1;
      return aRail - bRail;
    });

    for (const [stopId, info] of entries) {
      const displayName = cleanStopDisplayName(info[0]);
      if (!displayName.toLowerCase().includes(q)) {
        continue;
      }
      const dedupKey = `${displayName.toLowerCase()}:${info[1].toFixed(2)}:${info[2].toFixed(2)}`;
      if (seenNames.has(dedupKey)) {
        continue;
      }
      seenNames.add(dedupKey);
      const feedPrefix = stopId.split(':')[0] || 'transit';
      hits.push({
        stopId,
        name: displayName,
        lat: info[1],
        lng: info[2],
        feed: feedPrefix,
      });
      if (hits.length >= limit) {
        break;
      }
    }
    return hits;
  }

  async plan(params: {
    fromLat: number;
    fromLon: number;
    toLat: number;
    toLon: number;
    fromLabel?: string;
    toLabel?: string;
    departureDate: Date;
    preferredMode?: string;
    wheelchairPreferred?: boolean;
    liveRouteKeys?: Set<string>;
  }): Promise<GtfsRaptorItinerary[]> {
    const bundle = await this.loadBundle();
    if (!bundle) {
      return [];
    }

    const trips = this.getParsedTrips(bundle);
    const walkingSpeed = params.wheelchairPreferred ? 0.85 : 1.25;
    const when = params.departureDate;
    const startSeconds = when.getHours() * 3600 + when.getMinutes() * 60;

    const origins = this.findNearbyStops(bundle.stops, params.fromLat, params.fromLon, 1350, 14);
    const destinations = this.findNearbyStops(bundle.stops, params.toLat, params.toLon, 1350, 14);

    if (origins.length === 0 || destinations.length === 0) {
      return [];
    }

    const activeTrips = trips.filter((trip) => this.isServiceActive(trip.serviceId, when, bundle));
    if (activeTrips.length === 0) {
      return [];
    }

    // Multi-round Pareto RAPTOR (up to 3 rounds = 0, 1, or 2 transfers)
    const maxRounds = 3;
    const rounds: Map<string, RaptorLabel>[] = [];
    // Allow slight slack across rounds so 1-transfer & 2-transfer alternatives aren't pruned aggressively
    const bestArrival = new Map<string, number>();

    const round0 = new Map<string, RaptorLabel>();
    for (const o of origins) {
      const walkSecs = Math.round(o.distance / walkingSpeed);
      const arr = startSeconds + walkSecs;
      round0.set(o.stopId, {
        arrival: arr,
        prevStop: null,
        trip: null,
        boardStop: null,
        boardTime: startSeconds,
        isTransfer: false,
        walkMeters: Math.round(o.distance),
      });
      bestArrival.set(o.stopId, arr);
    }
    rounds.push(round0);

    let markedStops = new Set<string>(round0.keys());

    for (let k = 1; k <= maxRounds; k++) {
      const prevRound = rounds[k - 1];
      const currRound = new Map<string, RaptorLabel>();
      const nextMarked = new Set<string>();

      for (const trip of activeTrips) {
        let touchesMarked = false;
        for (const c of trip.calls) {
          if (markedStops.has(c.stopId)) {
            touchesMarked = true;
            break;
          }
        }
        if (!touchesMarked) continue;

        let boardedStop: string | null = null;
        let boardedTime = 0;
        let offset = 0;

        for (const call of trip.calls) {
          if (boardedStop !== null && call.stopId !== boardedStop) {
            const arrAtStop = call.arrival + offset;
            const currentRoundBest = currRound.get(call.stopId)?.arrival ?? Number.POSITIVE_INFINITY;
            const globalBest = bestArrival.get(call.stopId) ?? Number.POSITIVE_INFINITY;
            // Keep if strictly better in this round AND within +18 min of global best to preserve diverse transfer alternatives!
            if (
              arrAtStop < currentRoundBest
              && arrAtStop <= globalBest + 1080
              && arrAtStop - startSeconds <= 10800
            ) {
              if (arrAtStop < globalBest) {
                bestArrival.set(call.stopId, arrAtStop);
              }
              currRound.set(call.stopId, {
                arrival: arrAtStop,
                prevStop: boardedStop,
                trip,
                boardStop: boardedStop,
                boardTime: boardedTime,
                isTransfer: false,
                walkMeters: 0,
              });
              nextMarked.add(call.stopId);
            }
          }

          const prevLabel = prevRound.get(call.stopId);
          if (prevLabel) {
            const priorRouteId = prevLabel.trip?.routeId
              ?? (prevLabel.isTransfer && prevLabel.prevStop
                ? prevRound.get(prevLabel.prevStop)?.trip?.routeId
                : undefined);
            if (priorRouteId === trip.routeId) {
              continue;
            }
            const minBoardTime = prevLabel.arrival + (k > 1 ? 150 : 45);
            const candidateDep = this.nextDepartureOffset(trip, call.departure, minBoardTime);
            if (candidateDep !== null) {
              const depTime = call.departure + candidateDep;
              if (boardedStop === null || depTime < boardedTime) {
                boardedStop = call.stopId;
                boardedTime = depTime;
                offset = candidateDep;
              }
            }
          }
        }
      }

      // Footpath interchange transfers
      const transferSnapshot = Array.from(currRound.entries());
      for (const [stopId, label] of transferSnapshot) {
        const links = bundle.transfers[stopId];
        if (!links) continue;
        for (const [targetStopId, distMeters] of links) {
          const transferSecs = Math.max(90, Math.round(distMeters / walkingSpeed));
          const arrAtTarget = label.arrival + transferSecs;
          const currentRoundBest = currRound.get(targetStopId)?.arrival ?? Number.POSITIVE_INFINITY;
          if (arrAtTarget < currentRoundBest) {
            if (arrAtTarget < (bestArrival.get(targetStopId) ?? Number.POSITIVE_INFINITY)) {
              bestArrival.set(targetStopId, arrAtTarget);
            }
            currRound.set(targetStopId, {
              arrival: arrAtTarget,
              prevStop: stopId,
              trip: null,
              boardStop: null,
              boardTime: label.arrival,
              isTransfer: true,
              walkMeters: distMeters,
            });
            nextMarked.add(targetStopId);
          }
        }
      }

      rounds.push(currRound);
      markedStops = nextMarked;
      if (markedStops.size === 0) {
        break;
      }
    }

    const itineraries: GtfsRaptorItinerary[] = [];
    const seenLineChains = new Set<string>();

    for (let k = 1; k < rounds.length; k++) {
      for (const dest of destinations) {
        const label = rounds[k].get(dest.stopId);
        if (!label) continue;

        const egressWalkSecs = Math.round(dest.distance / walkingSpeed);
        const totalArrival = label.arrival + egressWalkSecs;
        const reconstructed = this.reconstructItinerary(
          k,
          dest.stopId,
          dest.distance,
          totalArrival,
          rounds,
          bundle,
          params,
        );
        if (!reconstructed) continue;

        const transitOnly = reconstructed.legs.filter((l) => l.mode !== 'WALK');
        const hasConsecutiveSameBadge = transitOnly.some(
          (leg, idx) => idx > 0 && leg.badgeLabel && leg.badgeLabel === transitOnly[idx - 1].badgeLabel,
        );
        if (hasConsecutiveSameBadge) continue;

        const chainKey = transitOnly
          .map((l) => `${l.badgeLabel}:${l.fromStopName}->${l.toStopName}`)
          .join('|');
        if (!chainKey || seenLineChains.has(chainKey)) continue;
        seenLineChains.add(chainKey);
        itineraries.push(reconstructed);
      }
    }

    // Deduplicate near-identical line combinations (keep best timing per distinct route sequence, plus 1 later timing if < 3 options)
    itineraries.sort((a, b) => {
      if (params.preferredMode) {
        const aMatches = this.matchesPreferredMode(a, params.preferredMode) ? 0 : 1;
        const bMatches = this.matchesPreferredMode(b, params.preferredMode) ? 0 : 1;
        if (aMatches !== bMatches) return aMatches - bMatches;
      }
      return a.durationMinutes - b.durationMinutes || a.transfers - b.transfers || a.walkMeters - b.walkMeters;
    });

    const diverse: GtfsRaptorItinerary[] = [];
    const routePatternCount = new Map<string, number>();
    for (const item of itineraries) {
      const pattern = item.legs
        .filter((l) => l.mode !== 'WALK')
        .map((l) => l.badgeLabel)
        .join('>');
      const count = routePatternCount.get(pattern) ?? 0;
      if (count >= 2) continue;
      routePatternCount.set(pattern, count + 1);
      diverse.push(item);
      if (diverse.length >= 5) break;
    }

    return diverse;
  }

  private reconstructItinerary(
    finalRound: number,
    destStopId: string,
    egressDist: number,
    totalArrival: number,
    rounds: Map<string, RaptorLabel>[],
    bundle: RawGtfsBundle,
    params: {
      fromLat: number;
      fromLon: number;
      toLat: number;
      toLon: number;
      fromLabel?: string;
      toLabel?: string;
      liveRouteKeys?: Set<string>;
    },
  ): GtfsRaptorItinerary | null {
    const legs: GtfsRaptorLeg[] = [];
    const waypointList: [number, number][] = [];
    let currStop = destStopId;
    let k = finalRound;
    let walkMeters = Math.round(egressDist);

    const destStopRaw = bundle.stops[destStopId];
    const destStopName = destStopRaw ? cleanStopDisplayName(destStopRaw[0]) : 'Transit stop';

    if (egressDist > 20 && destStopRaw) {
      const label = rounds[k].get(currStop)!;
      legs.unshift({
        mode: 'WALK',
        fromStopName: destStopName,
        toStopName: params.toLabel || 'Destination',
        departSeconds: label.arrival,
        arriveSeconds: totalArrival,
        distanceMeters: Math.round(egressDist),
        coords: [
          [destStopRaw[1], destStopRaw[2]],
          [params.toLat, params.toLon],
        ],
      });
    }

    if (destStopRaw) {
      waypointList.unshift([destStopRaw[1], destStopRaw[2]]);
    }

    while (k >= 0) {
      const label = rounds[k].get(currStop);
      if (!label) return null;

      if (label.isTransfer && label.prevStop) {
        const fromSt = bundle.stops[label.prevStop];
        const toSt = bundle.stops[currStop];
        const fromName = fromSt ? cleanStopDisplayName(fromSt[0]) : 'Station';
        const toName = toSt ? cleanStopDisplayName(toSt[0]) : 'Station';
        walkMeters += label.walkMeters;
        legs.unshift({
          mode: 'WALK',
          fromStopName: fromName,
          toStopName: toName,
          departSeconds: label.boardTime,
          arriveSeconds: label.arrival,
          distanceMeters: label.walkMeters,
          coords: fromSt && toSt ? [[fromSt[1], fromSt[2]], [toSt[1], toSt[2]]] : [],
        });
        currStop = label.prevStop;
        continue;
      }

      if (label.trip && label.boardStop) {
        const routeInfo = bundle.routes[label.trip.routeId] ?? ['Transit', 'Public Transit', 3];
        const [shortName, longName, routeType] = routeInfo;
        const isBus = routeType === 3 && !shortName.toUpperCase().includes('BRT');
        const fromSt = bundle.stops[label.boardStop];
        const toSt = bundle.stops[currStop];
        const fromName = fromSt ? cleanStopDisplayName(fromSt[0]) : 'Origin station';
        const toName = toSt ? cleanStopDisplayName(toSt[0]) : 'Destination station';

        const routeIdLower = label.trip.routeId.toLowerCase();
        const shortLower = shortName.toLowerCase();
        const isLive = Boolean(
          params.liveRouteKeys
          && (params.liveRouteKeys.has(routeIdLower) || params.liveRouteKeys.has(shortLower)),
        );

        const boardIdx = label.trip.calls.findIndex((c) => c.stopId === label.boardStop);
        const alightIdx = label.trip.calls.findIndex((c) => c.stopId === currStop);
        const legCoords: [number, number][] = [];
        const intermediateStops: string[] = [];

        if (boardIdx !== -1 && alightIdx !== -1 && boardIdx <= alightIdx) {
          for (let idx = boardIdx; idx <= alightIdx; idx++) {
            const st = bundle.stops[label.trip.calls[idx].stopId];
            if (st) {
              legCoords.push([st[1], st[2]]);
              if (idx > boardIdx && idx < alightIdx) {
                intermediateStops.push(cleanStopDisplayName(st[0]));
              }
            }
          }
        } else {
          if (fromSt) legCoords.push([fromSt[1], fromSt[2]]);
          if (toSt) legCoords.push([toSt[1], toSt[2]]);
        }

        const stopCount = Math.max(1, intermediateStops.length + 1);
        const badge = this.resolveLineBadge(shortName, longName, label.trip.routeId);

        legs.unshift({
          mode: isBus ? 'BUS' : 'RAIL',
          routeId: label.trip.routeId,
          routeShortName: shortName,
          routeLongName: longName,
          badgeLabel: badge.label,
          badgeColor: badge.color,
          routeType,
          headsign: label.trip.headsign || `Towards ${toName}`,
          fromStopName: fromName,
          toStopName: toName,
          departSeconds: label.boardTime,
          arriveSeconds: label.arrival,
          distanceMeters: 0,
          stopCount,
          intermediateStops,
          isAccessible: !isBus || shortName.startsWith('T') || shortName.includes('BRT'),
          liveTracked: isLive,
          coords: legCoords,
        });

        waypointList.unshift(...legCoords);
        currStop = label.boardStop;
        k -= 1;
        continue;
      }

      if (k === 0) {
        walkMeters += label.walkMeters;
        const firstSt = bundle.stops[currStop];
        if (label.walkMeters > 20 && firstSt) {
          const stopName = cleanStopDisplayName(firstSt[0]);
          legs.unshift({
            mode: 'WALK',
            fromStopName: params.fromLabel || 'Your location',
            toStopName: stopName,
            departSeconds: label.boardTime,
            arriveSeconds: label.arrival,
            distanceMeters: label.walkMeters,
            coords: [
              [params.fromLat, params.fromLon],
              [firstSt[1], firstSt[2]],
            ],
          });
        }
        break;
      }

      k -= 1;
    }

    const transitLegs = legs.filter((l) => l.mode !== 'WALK');
    if (transitLegs.length === 0) {
      return null;
    }

    // Reject nonsensical loops where user boards & alights same station
    if (transitLegs.some((l) => l.fromStopName.toLowerCase() === l.toStopName.toLowerCase())) {
      return null;
    }

    const departSeconds = legs[0].departSeconds;
    const arriveSeconds = legs[legs.length - 1].arriveSeconds;
    const durationMinutes = Math.max(4, Math.round((arriveSeconds - departSeconds) / 60));
    const primaryLeg = transitLegs[0];
    const primaryMode = this.classifyMode(primaryLeg);
    const fareRm = this.estimateMalaysiaFare(transitLegs, durationMinutes);
    const isAccessible = transitLegs.every((l) => l.isAccessible !== false);
    const liveTracked = transitLegs.some((l) => l.liveTracked);

    const allWaypoints: [number, number][] = [
      [params.fromLat, params.fromLon],
      ...waypointList,
      [params.toLat, params.toLon],
    ];

    const firstBoardTime = this.formatClockTime(primaryLeg.departSeconds);
    const firstBoardingText = `${firstBoardTime} from ${primaryLeg.fromStopName}`;

    return {
      legs,
      departSeconds,
      arriveSeconds,
      durationMinutes,
      walkMeters,
      transfers: Math.max(0, transitLegs.length - 1),
      fareRm,
      primaryMode,
      primaryLine: primaryLeg.badgeLabel || primaryLeg.routeLongName || primaryMode,
      firstBoardingText,
      color: primaryLeg.badgeColor || '#0b57d0',
      isAccessible,
      liveTracked,
      waypoints: allWaypoints,
    };
  }

  private resolveLineBadge(shortName: string, longName: string, routeId: string): { label: string; color: string } {
    const s = shortName.trim();
    const upper = `${s} ${longName} ${routeId}`.toUpperCase();

    if (upper.includes('BRT') || upper.includes('SUNWAY LINE')) {
      return { label: 'BRT Sunway Line', color: '#146c43' };
    }
    if (upper.includes('PORT KLANG') || upper.includes('PELABUHAN KLANG')) {
      return { label: 'Port Klang Line', color: '#c5221f' };
    }
    if (upper.includes('SEREMBAN') || upper.includes('BATU CAVES')) {
      return { label: 'Seremban Line', color: '#1e40af' };
    }
    if (s === 'KJL' || upper.includes('KELANA JAYA')) {
      return { label: 'KJL', color: '#d93025' };
    }
    if (s === 'KGL' || upper.includes('KAJANG')) {
      return { label: 'MRT Kajang', color: '#15803d' };
    }
    if (s === 'PYL' || upper.includes('PUTRAJAYA')) {
      return { label: 'MRT Putrajaya', color: '#d97706' };
    }
    if (s === 'AGL' || upper.includes('AMPANG')) {
      return { label: 'LRT Ampang', color: '#ea580c' };
    }
    if (s === 'SPL' || upper.includes('SRI PETALING')) {
      return { label: 'LRT Sri Petaling', color: '#991b1b' };
    }
    if (s === 'MRL' || upper.includes('MONORAIL')) {
      return { label: 'KL Monorail', color: '#4d7c0f' };
    }
    return { label: s || longName || 'Bus', color: '#1a73e8' };
  }

  private nextDepartureOffset(
    trip: ParsedTrip,
    baseDeparture: number,
    minBoardTime: number,
  ): number | null {
    if (trip.frequencies.length > 0) {
      const tripStart = trip.calls[0].departure;
      const deltaFromStart = baseDeparture - tripStart;
      for (const [winStart, winEnd, headway] of trip.frequencies) {
        if (headway <= 0) continue;
        const firstDepAtStop = winStart + deltaFromStart;
        const lastDepAtStop = winEnd + deltaFromStart;
        if (minBoardTime <= firstDepAtStop) {
          return winStart - tripStart;
        }
        if (minBoardTime <= lastDepAtStop) {
          const steps = Math.ceil((minBoardTime - firstDepAtStop) / headway);
          const chosenStart = winStart + steps * headway;
          if (chosenStart <= winEnd) {
            return chosenStart - tripStart;
          }
        }
      }
      return null;
    }

    if (baseDeparture >= minBoardTime && baseDeparture - minBoardTime <= 5400) {
      return 0;
    }
    return null;
  }

  private isServiceActive(serviceId: string, date: Date, bundle: RawGtfsBundle): boolean {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const ymd = `${y}${m}${d}`;

    const exc = bundle.exceptions[serviceId]?.[ymd];
    if (exc === 1) return true;
    if (exc === 2) return false;

    const cal = bundle.calendars[serviceId];
    if (!cal) return true;

    const gtfsDayIdx = (date.getDay() + 6) % 7;
    return cal[gtfsDayIdx] === 1;
  }

  private findNearbyStops(
    stops: Record<string, [string, number, number]>,
    lat: number,
    lon: number,
    maxDist: number,
    limit: number,
  ): { stopId: string; distance: number }[] {
    const found: { stopId: string; distance: number }[] = [];
    for (const [stopId, info] of Object.entries(stops)) {
      if (Math.abs(info[1] - lat) > 0.016 || Math.abs(info[2] - lon) > 0.016) {
        continue;
      }
      const d = haversineMeters(lat, lon, info[1], info[2]);
      if (d <= maxDist) {
        found.push({ stopId, distance: d });
      }
    }
    // Slight preference for rail/BRT stations within walking range so rail options aren't crowded out by 14 bus poles
    found.sort((a, b) => {
      const aBonus = a.stopId.startsWith('rapid-kl-rail:') || a.stopId.startsWith('ktmb:') ? -180 : 0;
      const bBonus = b.stopId.startsWith('rapid-kl-rail:') || b.stopId.startsWith('ktmb:') ? -180 : 0;
      return (a.distance + aBonus) - (b.distance + bBonus);
    });
    return found.slice(0, limit);
  }

  private getParsedTrips(bundle: RawGtfsBundle): ParsedTrip[] {
    if (!this.parsedTrips) {
      this.parsedTrips = bundle.trips.map((raw) => ({
        tripId: raw[0],
        routeId: raw[1],
        serviceId: raw[2],
        headsign: raw[3],
        calls: raw[4].map((c) => ({ stopId: c[0], arrival: c[1], departure: c[2] })),
        frequencies: raw[5] ?? [],
      }));
    }
    return this.parsedTrips;
  }

  private classifyMode(leg: GtfsRaptorLeg): string {
    const text = `${leg.badgeLabel ?? ''} ${leg.routeShortName ?? ''} ${leg.routeLongName ?? ''} ${leg.routeId ?? ''}`.toUpperCase();
    if (text.includes('BRT')) return 'BRT';
    if (text.includes('KTMB') || text.includes('KOMUTER') || text.includes('PORT KLANG') || text.includes('SEREMBAN')) return 'KTM';
    if (text.includes('MRT') || text.includes('KAJANG') || text.includes('PUTRAJAYA') || text.includes('KGL') || text.includes('PYL')) {
      return leg.mode === 'BUS' ? 'MRT Feeder' : 'MRT';
    }
    if (text.includes('LRT') || text.includes('KELANA') || text.includes('AMPANG') || text.includes('SRI PETALING') || text.includes('KJL')) {
      return 'LRT';
    }
    if (text.includes('MONORAIL') || text.includes('MRL')) return 'Monorail';
    return leg.mode === 'BUS' ? 'Bus' : 'MRT';
  }

  private matchesPreferredMode(itinerary: GtfsRaptorItinerary, preferred: string): boolean {
    const pref = preferred.toUpperCase();
    return itinerary.primaryMode.toUpperCase().includes(pref)
      || itinerary.legs.some((l) => this.classifyMode(l).toUpperCase().includes(pref));
  }

  private estimateMalaysiaFare(transitLegs: GtfsRaptorLeg[], durationMinutes: number): number {
    const hasRail = transitLegs.some((l) => l.mode === 'RAIL');
    const hasBus = transitLegs.some((l) => l.mode === 'BUS');
    if (hasBus && !hasRail) {
      return transitLegs.length > 1 ? 2.0 : 1.0;
    }
    const base = 1.3 + Math.min(durationMinutes, 75) * 0.055;
    const rounded = Math.round(base * 10) / 10;
    return Math.min(6.8, Math.max(1.3, rounded));
  }

  private formatClockTime(totalSeconds: number): string {
    const normalized = ((totalSeconds % 86400) + 86400) % 86400;
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const twelveHour = hours % 12 || 12;
    return `${twelveHour}:${String(minutes).padStart(2, '0')} ${period}`;
  }
}
