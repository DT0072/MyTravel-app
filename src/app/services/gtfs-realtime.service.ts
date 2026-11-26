import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type GtfsRealtimeFeedKey = 'rapid-kl-bus' | 'rapid-kl-bus-mrtfeeder' | 'ktmb';

export interface LiveGtfsVehicle {
  id: string;
  feed: GtfsRealtimeFeedKey;
  lat: number;
  lon: number;
  bearing: number | null;
  speedMps: number | null;
  tripId: string | null;
  routeId: string | null;
  timestamp: number | null;
}

export interface GtfsRealtimeFeedStatus {
  ok: boolean;
  vehicleCount: number;
  error?: string;
}

export interface GtfsRealtimeSnapshot {
  updatedAt: string | null;
  source: string;
  loading: boolean;
  totalVehicles: number;
  vehicles: LiveGtfsVehicle[];
  liveRouteKeys: Set<string>;
  feeds: Record<GtfsRealtimeFeedKey, GtfsRealtimeFeedStatus>;
}

const MALAYSIA_VEHICLE_FEEDS: Record<GtfsRealtimeFeedKey, string> = {
  'rapid-kl-bus':
    'https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana/?category=rapid-bus-kl',
  'rapid-kl-bus-mrtfeeder':
    'https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana/?category=rapid-bus-mrtfeeder',
  ktmb: 'https://api.data.gov.my/gtfs-realtime/vehicle-position/ktmb/',
};

// Matches JomNaik2's _maximumBusPositionAge = Duration(seconds: 120)
const MAX_VEHICLE_AGE_SECONDS = 180;

function createEmptySnapshot(): GtfsRealtimeSnapshot {
  return {
    updatedAt: null,
    source: 'api.data.gov.my GTFS-Realtime',
    loading: false,
    totalVehicles: 0,
    vehicles: [],
    liveRouteKeys: new Set<string>(),
    feeds: {
      'rapid-kl-bus': { ok: false, vehicleCount: 0 },
      'rapid-kl-bus-mrtfeeder': { ok: false, vehicleCount: 0 },
      ktmb: { ok: false, vehicleCount: 0 },
    },
  };
}

/**
 * Lightweight zero-dependency protobuf wire reader for GTFS-Realtime FeedMessage.
 * Decodes FeedMessage -> entity(2) -> VehiclePosition(4) -> TripDescriptor(1), Position(2), timestamp(5), VehicleDescriptor(8).
 */
class ProtobufReader {
  private pos = 0;
  private readonly view: DataView;

  constructor(private readonly buf: Uint8Array, private readonly end = buf.length) {
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  get hasMore(): boolean {
    return this.pos < this.end;
  }

  readVarint(): number {
    let result = 0;
    let shift = 0;
    while (this.pos < this.end) {
      const byte = this.buf[this.pos++];
      result += (byte & 0x7f) * Math.pow(2, shift);
      if ((byte & 0x80) === 0) {
        return result;
      }
      shift += 7;
      if (shift > 56) {
        break;
      }
    }
    return result;
  }

  readTag(): { field: number; wireType: number } {
    const tag = this.readVarint();
    return { field: Math.floor(tag / 8), wireType: tag & 0x7 };
  }

  readFloat32(): number {
    const val = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return val;
  }

  readBytes(): Uint8Array {
    const len = this.readVarint();
    const slice = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return slice;
  }

  readString(): string {
    const bytes = this.readBytes();
    return new TextDecoder('utf-8').decode(bytes);
  }

  skip(wireType: number): void {
    switch (wireType) {
      case 0:
        this.readVarint();
        break;
      case 1:
        this.pos += 8;
        break;
      case 2: {
        const len = this.readVarint();
        this.pos += len;
        break;
      }
      case 5:
        this.pos += 4;
        break;
      default:
        this.pos = this.end;
        break;
    }
  }
}

function decodeTripDescriptor(bytes: Uint8Array): { tripId: string | null; routeId: string | null } {
  const reader = new ProtobufReader(bytes);
  let tripId: string | null = null;
  let routeId: string | null = null;
  while (reader.hasMore) {
    const { field, wireType } = reader.readTag();
    if (field === 1 && wireType === 2) {
      tripId = reader.readString() || null;
    } else if (field === 5 && wireType === 2) {
      routeId = reader.readString() || null;
    } else {
      reader.skip(wireType);
    }
  }
  return { tripId, routeId };
}

function decodePosition(bytes: Uint8Array): {
  lat: number | null;
  lon: number | null;
  bearing: number | null;
  speedMps: number | null;
} {
  const reader = new ProtobufReader(bytes);
  let lat: number | null = null;
  let lon: number | null = null;
  let bearing: number | null = null;
  let speedMps: number | null = null;
  while (reader.hasMore) {
    const { field, wireType } = reader.readTag();
    if (field === 1 && wireType === 5) {
      lat = reader.readFloat32();
    } else if (field === 2 && wireType === 5) {
      lon = reader.readFloat32();
    } else if (field === 3 && wireType === 5) {
      bearing = reader.readFloat32();
    } else if (field === 5 && wireType === 5) {
      speedMps = reader.readFloat32();
    } else {
      reader.skip(wireType);
    }
  }
  return { lat, lon, bearing, speedMps };
}

function decodeVehicleDescriptor(bytes: Uint8Array): string | null {
  const reader = new ProtobufReader(bytes);
  let id: string | null = null;
  while (reader.hasMore) {
    const { field, wireType } = reader.readTag();
    if (field === 1 && wireType === 2) {
      id = reader.readString() || null;
    } else {
      reader.skip(wireType);
    }
  }
  return id;
}

function decodeVehiclePosition(
  bytes: Uint8Array,
  feed: GtfsRealtimeFeedKey,
  entityId: string,
): LiveGtfsVehicle | null {
  const reader = new ProtobufReader(bytes);
  let tripId: string | null = null;
  let routeId: string | null = null;
  let lat: number | null = null;
  let lon: number | null = null;
  let bearing: number | null = null;
  let speedMps: number | null = null;
  let timestamp: number | null = null;
  let vehicleId: string | null = null;

  while (reader.hasMore) {
    const { field, wireType } = reader.readTag();
    if (field === 1 && wireType === 2) {
      const trip = decodeTripDescriptor(reader.readBytes());
      tripId = trip.tripId;
      routeId = trip.routeId;
    } else if (field === 2 && wireType === 2) {
      const pos = decodePosition(reader.readBytes());
      lat = pos.lat;
      lon = pos.lon;
      bearing = pos.bearing;
      speedMps = pos.speedMps;
    } else if (field === 5 && wireType === 0) {
      timestamp = reader.readVarint();
    } else if (field === 8 && wireType === 2) {
      vehicleId = decodeVehicleDescriptor(reader.readBytes());
    } else {
      reader.skip(wireType);
    }
  }

  if (
    lat === null
    || lon === null
    || !Number.isFinite(lat)
    || !Number.isFinite(lon)
    || lat < -90
    || lat > 90
    || lon < -180
    || lon > 180
  ) {
    return null;
  }

  return {
    id: `${feed}:${vehicleId || entityId}`,
    feed,
    lat,
    lon,
    bearing,
    speedMps,
    tripId,
    routeId,
    timestamp,
  };
}

function decodeFeedMessage(buffer: ArrayBuffer, feed: GtfsRealtimeFeedKey): LiveGtfsVehicle[] {
  const reader = new ProtobufReader(new Uint8Array(buffer));
  const vehicles: LiveGtfsVehicle[] = [];
  let entityIndex = 0;

  while (reader.hasMore) {
    const { field, wireType } = reader.readTag();
    if (field === 2 && wireType === 2) {
      const entityBytes = reader.readBytes();
      const entityReader = new ProtobufReader(entityBytes);
      let entityId = String(entityIndex++);
      let vehicleBytes: Uint8Array | null = null;

      while (entityReader.hasMore) {
        const sub = entityReader.readTag();
        if (sub.field === 1 && sub.wireType === 2) {
          entityId = entityReader.readString() || entityId;
        } else if (sub.field === 4 && sub.wireType === 2) {
          vehicleBytes = entityReader.readBytes();
        } else {
          entityReader.skip(sub.wireType);
        }
      }

      if (vehicleBytes) {
        const parsed = decodeVehiclePosition(vehicleBytes, feed, entityId);
        if (parsed) {
          vehicles.push(parsed);
        }
      }
    } else {
      reader.skip(wireType);
    }
  }

  return vehicles;
}

@Injectable({
  providedIn: 'root',
})
export class GtfsRealtimeService {
  private readonly snapshotSubject = new BehaviorSubject<GtfsRealtimeSnapshot>(createEmptySnapshot());
  readonly snapshot$: Observable<GtfsRealtimeSnapshot> = this.snapshotSubject.asObservable();
  private lastFetchMs = 0;
  private inFlightPromise: Promise<GtfsRealtimeSnapshot> | null = null;

  get snapshot(): GtfsRealtimeSnapshot {
    return this.snapshotSubject.value;
  }

  async refresh(force = false): Promise<GtfsRealtimeSnapshot> {
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    const nowMs = Date.now();
    // Respect api.data.gov.my rate limits (cache for 55 seconds unless explicitly forced after >= 15s)
    const minInterval = force ? 15_000 : 55_000;
    if (this.lastFetchMs > 0 && nowMs - this.lastFetchMs < minInterval) {
      return this.snapshot;
    }

    this.inFlightPromise = this.performRefresh();
    try {
      return await this.inFlightPromise;
    } finally {
      this.inFlightPromise = null;
    }
  }

  private async performRefresh(): Promise<GtfsRealtimeSnapshot> {
    const previous = this.snapshot;
    this.snapshotSubject.next({ ...previous, loading: true });

    const feedKeys = Object.keys(MALAYSIA_VEHICLE_FEEDS) as GtfsRealtimeFeedKey[];
    const results = await Promise.all(
      feedKeys.map((key) => this.fetchOneFeed(key, MALAYSIA_VEHICLE_FEEDS[key])),
    );

    const vehicles: LiveGtfsVehicle[] = [];
    const feeds = { ...createEmptySnapshot().feeds };
    const liveRouteKeys = new Set<string>();
    const nowSec = Math.floor(Date.now() / 1000);

    for (const res of results) {
      if (res.status.ok) {
        feeds[res.key] = res.status;
        for (const v of res.vehicles) {
          vehicles.push(v);
          const isFresh = v.timestamp === null || Math.abs(nowSec - v.timestamp) <= MAX_VEHICLE_AGE_SECONDS;
          if (isFresh && v.routeId) {
            liveRouteKeys.add(`${v.feed}:${v.routeId}`.toLowerCase());
            liveRouteKeys.add(v.routeId.toLowerCase());
          }
        }
      } else {
        // Preserve previous cached vehicles for this feed if rate-limited (HTTP 429) or transient error
        const cachedFeedVehicles = previous.vehicles.filter((v) => v.feed === res.key);
        if (cachedFeedVehicles.length > 0) {
          feeds[res.key] = { ok: true, vehicleCount: cachedFeedVehicles.length };
          for (const v of cachedFeedVehicles) {
            vehicles.push(v);
            if (v.routeId) {
              liveRouteKeys.add(`${v.feed}:${v.routeId}`.toLowerCase());
              liveRouteKeys.add(v.routeId.toLowerCase());
            }
          }
        } else {
          feeds[res.key] = res.status;
        }
      }
    }

    this.lastFetchMs = Date.now();
    const nextSnapshot: GtfsRealtimeSnapshot = {
      updatedAt: new Date().toISOString(),
      source: 'api.data.gov.my GTFS-Realtime (Prasarana & KTMB)',
      loading: false,
      totalVehicles: vehicles.length,
      vehicles,
      liveRouteKeys,
      feeds,
    };
    this.snapshotSubject.next(nextSnapshot);
    return nextSnapshot;
  }

  private async fetchOneFeed(
    key: GtfsRealtimeFeedKey,
    url: string,
  ): Promise<{ key: GtfsRealtimeFeedKey; vehicles: LiveGtfsVehicle[]; status: GtfsRealtimeFeedStatus }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return {
          key,
          vehicles: [],
          status: { ok: false, vehicleCount: 0, error: `HTTP ${response.status}` },
        };
      }
      const buffer = await response.arrayBuffer();
      const vehicles = decodeFeedMessage(buffer, key);
      return {
        key,
        vehicles,
        status: { ok: true, vehicleCount: vehicles.length },
      };
    } catch (err) {
      return {
        key,
        vehicles: [],
        status: {
          ok: false,
          vehicleCount: 0,
          error: err instanceof Error ? err.message.slice(0, 120) : 'Network error',
        },
      };
    }
  }
}
