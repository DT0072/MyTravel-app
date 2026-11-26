#!/usr/bin/env python3
"""Build a compact Malaysian GTFS-Static RAPTOR timetable bundle for MyTravel.

Ported from qiphy/JomNaik2's `jomnaik/tool/build_offline_router.py`.
Downloads official Malaysia GTFS-Static archives from api.data.gov.my:
  - rapid-rail-kl (MRT Kajang, MRT Putrajaya, LRT Kelana Jaya, LRT Ampang/Sri Petaling, Monorail, BRT Sunway)
  - ktmb (KTM Komuter Klang Valley & Northern)
  - rapid-bus-mrtfeeder (MRT Feeder Bus)
  - rapid-bus-kl (Major Rapid KL trunk buses)

Outputs:
  src/assets/gtfs/raptor_klang_valley.json
"""

from __future__ import annotations

import csv
import io
import json
import math
import subprocess
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "src/assets/gtfs/raptor_klang_valley.json"

FEEDS = {
    "rapid-kl-rail": "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl",
    "ktmb": "https://api.data.gov.my/gtfs-static/ktmb",
    "rapid-kl-bus-mrtfeeder": "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-mrtfeeder",
    "rapid-kl-bus": "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl",
}


def read_rows(archive: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    if name not in archive.namelist():
        return []
    with archive.open(name) as raw:
        text = io.TextIOWrapper(raw, encoding="utf-8-sig", errors="replace")
        return list(csv.DictReader(text))


def parse_seconds(value: str) -> int:
    parts = value.strip().split(":")
    if len(parts) < 2:
        raise ValueError(f"Invalid GTFS time: {value}")
    h = int(parts[0])
    m = int(parts[1])
    s = int(parts[2]) if len(parts) > 2 else 0
    return h * 3600 + m * 60 + s


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2.0 * r * math.asin(math.sqrt(a))


def is_klang_valley_stop(lat: float, lon: float) -> bool:
    return 2.75 <= lat <= 3.45 and 101.30 <= lon <= 102.00


def main() -> None:
    stops: dict[str, list] = {}
    routes: dict[str, list] = {}
    calendars: dict[str, list] = {}
    exceptions: dict[str, dict[str, int]] = defaultdict(dict)
    trips_out: list[list] = []

    for feed, url in FEEDS.items():
        print(f"Downloading {feed} from {url} ...")
        try:
            raw_bytes = subprocess.check_output(
                ["curl", "-fsSL", "--max-time", "45", url]
            )
        except Exception as exc:
            print(f"  WARNING: failed to fetch {feed}: {exc}")
            continue

        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
            feed_stops: dict[str, list] = {}
            for row in read_rows(archive, "stops.txt"):
                try:
                    lat = float(row["stop_lat"])
                    lon = float(row["stop_lon"])
                except (KeyError, ValueError):
                    continue
                if not is_klang_valley_stop(lat, lon):
                    continue
                sid = f"{feed}:{row['stop_id']}"
                feed_stops[sid] = [
                    (row.get("stop_name") or "Transit stop").strip(),
                    round(lat, 5),
                    round(lon, 5),
                ]

            feed_routes: dict[str, list] = {}
            for row in read_rows(archive, "routes.txt"):
                rid = f"{feed}:{row['route_id']}"
                short_name = (row.get("route_short_name") or row.get("route_id") or "").strip()
                long_name = (row.get("route_long_name") or short_name).strip()
                try:
                    rtype = int(row.get("route_type") or 3)
                except ValueError:
                    rtype = 3
                feed_routes[rid] = [short_name or long_name, long_name, rtype]

            for row in read_rows(archive, "calendar.txt"):
                svcid = f"{feed}:{row['service_id']}"
                start_date = row.get("start_date", "00000000")
                end_date = row.get("end_date", "99999999")
                if feed == "ktmb" and end_date < "20271231":
                    end_date = "20271231"
                days = [
                    1 if row.get(d) == "1" else 0
                    for d in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
                ]
                calendars[svcid] = days + [start_date, end_date]

            for row in read_rows(archive, "calendar_dates.txt"):
                svcid = f"{feed}:{row['service_id']}"
                try:
                    exceptions[svcid][row.get("date", "")] = int(row.get("exception_type") or 0)
                except ValueError:
                    continue

            frequencies: dict[str, list[list[int]]] = defaultdict(list)
            for row in read_rows(archive, "frequencies.txt"):
                try:
                    tid = row["trip_id"]
                    frequencies[tid].append([
                        parse_seconds(row["start_time"]),
                        parse_seconds(row["end_time"]),
                        int(row["headway_secs"]),
                    ])
                except (KeyError, ValueError):
                    continue

            stop_times_by_trip: dict[str, list[tuple[int, str, int, int]]] = defaultdict(list)
            for row in read_rows(archive, "stop_times.txt"):
                sid = f"{feed}:{row.get('stop_id', '')}"
                if sid not in feed_stops:
                    continue
                try:
                    seq = int(row.get("stop_sequence") or 0)
                    arr = parse_seconds(row["arrival_time"])
                    dep = parse_seconds(row["departure_time"])
                    stop_times_by_trip[row["trip_id"]].append((seq, sid, arr, dep))
                except (KeyError, ValueError):
                    continue

            # Deduplicate identical trip patterns per (route_id, service_id) to keep PWA bundle fast & compact!
            # For rail & ktmb, keep all unique schedule patterns; for bus feeds, keep representative frequency/scheduled trips.
            is_bus_feed = "bus" in feed
            seen_route_dir: dict[tuple[str, str], int] = defaultdict(int)
            used_stops: set[str] = set()
            used_routes: set[str] = set()

            for row in read_rows(archive, "trips.txt"):
                tid = row.get("trip_id", "")
                rid = f"{feed}:{row.get('route_id', '')}"
                svcid = f"{feed}:{row.get('service_id', '')}"
                if rid not in feed_routes:
                    continue
                calls = stop_times_by_trip.get(tid)
                if not calls or len(calls) < 2:
                    continue
                calls.sort(key=lambda c: c[0])

                direction = row.get("direction_id", "0")
                # Keep full rail/ktmb trips; cap bus trips per (route, direction) to 2 representative patterns
                # with synthesized frequencies if none provided so RAPTOR stays sub-50ms and bundle stays < 2.5MB.
                if is_bus_feed:
                    if seen_route_dir[(rid, direction)] >= 2:
                        continue
                    seen_route_dir[(rid, direction)] += 1

                compact_calls = [[c[1], c[2], c[3]] for c in calls]
                freqs = frequencies.get(tid, [])
                if is_bus_feed and not freqs:
                    # Synthesize realistic Rapid KL bus headway window (06:00 - 23:00 every 15 min)
                    freqs = [[6 * 3600, 23 * 3600, 900]]

                trips_out.append([
                    f"{feed}:{tid}",
                    rid,
                    svcid,
                    (row.get("trip_headsign") or feed_routes[rid][1]).strip(),
                    compact_calls,
                    freqs,
                ])
                used_routes.add(rid)
                for c in calls:
                    used_stops.add(c[1])

            for sid in used_stops:
                stops[sid] = feed_stops[sid]
            for rid in used_routes:
                routes[rid] = feed_routes[rid]

            print(f"  {feed}: {len(used_stops)} stops, {len(used_routes)} routes")

    # Build interchange footpath transfers (<= 400m between stops of different feeds or rail interchanges)
    print("Building footpath transfers...")
    stop_items = list(stops.items())
    # Grid spatial index (~500m cells)
    grid: dict[tuple[int, int], list[tuple[str, float, float]]] = defaultdict(list)
    for sid, info in stop_items:
        gx = int(info[1] / 0.0045)
        gy = int(info[2] / 0.0045)
        grid[(gx, gy)].append((sid, info[1], info[2]))

    transfers: dict[str, list[list]] = defaultdict(list)
    for sid, info in stop_items:
        lat1, lon1 = info[1], info[2]
        gx = int(lat1 / 0.0045)
        gy = int(lon1 / 0.0045)
        neighbors: list[tuple[float, str]] = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for other_id, lat2, lon2 in grid.get((gx + dx, gy + dy), ()):
                    if other_id == sid:
                        continue
                    d = haversine_meters(lat1, lon1, lat2, lon2)
                    if d <= 380:
                        neighbors.append((d, other_id))
        neighbors.sort(key=lambda x: x[0])
        if neighbors:
            transfers[sid] = [[oid, int(round(d))] for d, oid in neighbors[:6]]

    bundle = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "api.data.gov.my GTFS-Static (JomNaik2 RAPTOR schema)",
        "stops": stops,
        "routes": routes,
        "calendars": calendars,
        "exceptions": dict(exceptions),
        "trips": trips_out,
        "transfers": dict(transfers),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(bundle, separators=(",", ":")), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"Wrote {OUT_PATH} ({size_kb:.1f} KB) with {len(stops)} stops, {len(routes)} routes, {len(trips_out)} trips.")


if __name__ == "__main__":
    main()
