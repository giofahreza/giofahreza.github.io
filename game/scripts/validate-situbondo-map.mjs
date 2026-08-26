import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ALUN_ALUN_PARK_OUTLINE,
} from "../src/features/landmarks/alun-alun/traffic.js";

const path = resolve("public/data/situbondo-map.json");
const map = JSON.parse(await readFile(path, "utf8"));
const failures = [];
const MAP_METERS_PER_WORLD_UNIT = 5;
const SURVEYED_CARRIAGEWAY_WIDTH_METERS = 6.6;
const SURVEYED_CARRIAGEWAY_WIDTH = 66;
const ALUN_ALUN_SURVEYED_ROADS = Object.freeze([
  Object.freeze({
    osmWayId: 331217150,
    style: 0,
    coordinates: Object.freeze([
      1469, 1356, 1546, 1379, 2684, 1752, 2874, 1831, 3615, 2088,
      4222, 2293, 4902, 2524, 5018, 2560, 5051, 2568,
    ]),
  }),
  Object.freeze({
    osmWayId: 331217153,
    style: 0,
    coordinates: Object.freeze([696, 1170, 935, 1221]),
  }),
  Object.freeze({
    osmWayId: 380773860,
    style: 0,
    coordinates: Object.freeze([604, 1023, 398, 985, 110, 906, -137, 878]),
  }),
  Object.freeze({
    osmWayId: 380773862,
    style: 0,
    coordinates: Object.freeze([-137, 878, 79, 986, 373, 1070, 596, 1156]),
  }),
  Object.freeze({
    osmWayId: 380773884,
    style: 3,
    coordinates: Object.freeze([
      2719, 1670, 2731, 1621, 2735, 1570, 2719, 1524, 2668, 1483,
      2598, 1450, 2019, 1235, 1483, 1080, 743, 872, 660, 857,
    ]),
  }),
  Object.freeze({
    osmWayId: 380773887,
    style: 0,
    coordinates: Object.freeze([760, 503, 676, 793, 660, 857, 639, 1008]),
  }),
  Object.freeze({
    osmWayId: 380773891,
    style: 0,
    coordinates: Object.freeze([
      578, 1132, 596, 1156, 618, 1171, 643, 1179, 670, 1179, 696, 1170,
      722, 1150, 738, 1121, 742, 1088, 734, 1056, 711, 1026, 677, 1009,
      639, 1008, 604, 1023, 583, 1045, 571, 1073, 569, 1103, 578, 1132,
    ]),
  }),
  Object.freeze({
    osmWayId: 406394144,
    style: 0,
    coordinates: Object.freeze([711, 1026, 743, 872, 760, 503]),
  }),
  Object.freeze({
    osmWayId: 678149158,
    style: 0,
    coordinates: Object.freeze([935, 1221, 1294, 1303, 1406, 1337, 1469, 1356]),
  }),
  Object.freeze({
    osmWayId: 1428205851,
    style: 0,
    coordinates: Object.freeze([
      2719, 1670, 2649, 1649, 1601, 1314, 1394, 1249, 961, 1130, 734, 1056,
    ]),
  }),
]);
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const coordinateFingerprint = (coordinates) => coordinates.join(",");

function pointToSegmentDistance(point, start, end) {
  const deltaNorth = end[0] - start[0];
  const deltaEast = end[1] - start[1];
  const lengthSquared = deltaNorth ** 2 + deltaEast ** 2;
  if (lengthSquared === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * deltaNorth +
        (point[1] - start[1]) * deltaEast) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    point[0] - (start[0] + deltaNorth * projection),
    point[1] - (start[1] + deltaEast * projection),
  );
}

function segmentCross(start, end, point) {
  return (
    (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0])
  );
}

function pointOnSegment(point, start, end) {
  const epsilon = 1e-9;
  return (
    Math.abs(segmentCross(start, end, point)) <= epsilon &&
    point[0] >= Math.min(start[0], end[0]) - epsilon &&
    point[0] <= Math.max(start[0], end[0]) + epsilon &&
    point[1] >= Math.min(start[1], end[1]) - epsilon &&
    point[1] <= Math.max(start[1], end[1]) + epsilon
  );
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstSideStart = segmentCross(firstStart, firstEnd, secondStart);
  const firstSideEnd = segmentCross(firstStart, firstEnd, secondEnd);
  const secondSideStart = segmentCross(secondStart, secondEnd, firstStart);
  const secondSideEnd = segmentCross(secondStart, secondEnd, firstEnd);
  const strictlyCross =
    ((firstSideStart > 0 && firstSideEnd < 0) ||
      (firstSideStart < 0 && firstSideEnd > 0)) &&
    ((secondSideStart > 0 && secondSideEnd < 0) ||
      (secondSideStart < 0 && secondSideEnd > 0));
  return (
    strictlyCross ||
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  );
}

function segmentDistance(firstStart, firstEnd, secondStart, secondEnd) {
  if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return 0;
  return Math.min(
    pointToSegmentDistance(firstStart, secondStart, secondEnd),
    pointToSegmentDistance(firstEnd, secondStart, secondEnd),
    pointToSegmentDistance(secondStart, firstStart, firstEnd),
    pointToSegmentDistance(secondEnd, firstStart, firstEnd),
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const start = polygon[index];
    const end = polygon[previous];
    if (pointOnSegment(point, start, end)) return true;
    if (
      (start[1] > point[1]) !== (end[1] > point[1]) &&
      point[0] <
        ((end[0] - start[0]) * (point[1] - start[1])) /
          (end[1] - start[1]) +
          start[0]
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function centerlineToPolygonDistance(centerline, polygon) {
  if (centerline.some((point) => pointInPolygon(point, polygon))) return 0;
  let minimumDistance = Infinity;
  for (let lineIndex = 1; lineIndex < centerline.length; lineIndex += 1) {
    for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        segmentDistance(
          centerline[lineIndex - 1],
          centerline[lineIndex],
          polygon[edgeIndex],
          polygon[(edgeIndex + 1) % polygon.length],
        ),
      );
    }
  }
  return minimumDistance;
}

check(map.schemaVersion === 3, "unexpected schema version");
check(map.radiusMeters === 1000, "playable survey radius is not exactly 1 km");
check(map.boundary?.outsideStatus === "restricted", "outside area is not marked restricted");
check(map.coordinatePrecision === 10, "coordinates are not stored at decimetre precision");
check(
  map.stats.renderedBuildings === map.buildings.length,
  "rendered building count does not match payload",
);
check(
  map.stats.sourceBuildingWays === map.buildings.length,
  "a mapped building footprint was dropped",
);
check(map.buildings.length >= 3000, "1 km building population is unexpectedly incomplete");
check(map.roads.length >= 250, "1 km road network is unexpectedly incomplete");
check(map.places.length >= 100, "semantic place layer is unexpectedly incomplete");
check(map.stats.semanticPlaces === map.places.length, "semantic place count does not match payload");
check(map.placeTypes.length >= 12, "semantic place taxonomy is incomplete");

const roadsByFingerprint = new Map();
map.roads.forEach((road, index) => {
  const fingerprint = coordinateFingerprint(road[2]);
  const matches = roadsByFingerprint.get(fingerprint) ?? [];
  matches.push({ index, road });
  roadsByFingerprint.set(fingerprint, matches);
});
ALUN_ALUN_SURVEYED_ROADS.forEach(({ osmWayId, style, coordinates }) => {
  const matches = roadsByFingerprint.get(coordinateFingerprint(coordinates)) ?? [];
  check(matches.length === 1, `OSM way ${osmWayId} does not have one exact map road part`);
  if (matches.length !== 1) return;
  const [{ road }] = matches;
  check(road[0] === style, `OSM way ${osmWayId} changed road style`);
  check(
    road[1] === SURVEYED_CARRIAGEWAY_WIDTH,
    `OSM way ${osmWayId} is not ${SURVEYED_CARRIAGEWAY_WIDTH_METERS.toFixed(1)} m wide`,
  );
});

let farthestBuildingCenter = 0;
map.buildings.forEach((building) => {
  const east = building[0] / map.coordinatePrecision;
  const north = building[1] / map.coordinatePrecision;
  farthestBuildingCenter = Math.max(farthestBuildingCenter, Math.hypot(east, north));
  check(
    building[2] > 0 && building[3] > 0 && building[4] > 0,
    "building has a non-positive dimension",
  );
  check(
    Array.isArray(building[7]) && building[7].length >= 6 && building[7].length % 2 === 0,
    "building is missing its exact footprint polygon",
  );
  building[7]?.forEach((coordinate) => {
    check(Number.isInteger(coordinate), "building footprint is not quantized");
  });
});
check(
  farthestBuildingCenter <= map.radiusMeters + 0.2,
  "a building center lies outside the 1 km development zone",
);

function validateLine(coordinates, label) {
  check(
    coordinates.length >= 4 && coordinates.length % 2 === 0,
    `${label} coordinate list is malformed`,
  );
  let farthest = 0;
  for (let index = 0; index < coordinates.length; index += 2) {
    const east = coordinates[index] / map.coordinatePrecision;
    const north = coordinates[index + 1] / map.coordinatePrecision;
    farthest = Math.max(farthest, Math.hypot(east, north));
  }
  check(farthest <= map.radiusMeters + 0.2, `${label} lies outside the 1 km circle`);
  return farthest;
}

let roadPointCount = 0;
let farthestRoadPoint = 0;
let closestParkRoadClearance = Infinity;
let closestParkRoadIndex = -1;
const parkOutlineMeters = ALUN_ALUN_PARK_OUTLINE.map(([north, east]) => [
  north * MAP_METERS_PER_WORLD_UNIT,
  east * MAP_METERS_PER_WORLD_UNIT,
]);
map.roads.forEach((road, roadIndex) => {
  roadPointCount += road[2].length / 2;
  farthestRoadPoint = Math.max(
    farthestRoadPoint,
    validateLine(road[2], "clipped road"),
  );
  const centerline = [];
  for (let index = 0; index < road[2].length; index += 2) {
    centerline.push([
      road[2][index + 1] / map.coordinatePrecision,
      road[2][index] / map.coordinatePrecision,
    ]);
  }
  const centerlineDistance = centerlineToPolygonDistance(
    centerline,
    parkOutlineMeters,
  );
  const roadClearance =
    centerlineDistance - road[1] / map.coordinatePrecision * 0.5;
  if (roadClearance < closestParkRoadClearance) {
    closestParkRoadClearance = roadClearance;
    closestParkRoadIndex = roadIndex;
  }
  check(
    roadClearance > 1e-6,
    `road ${roadIndex} crosses the protected Alun-Alun park outline ` +
      `(clearance ${roadClearance.toFixed(3)} m)`,
  );
});
map.waterways.forEach((waterway) => validateLine(waterway[1], "waterway"));
map.railways.forEach((railway) => validateLine(railway[1], "railway"));
map.bridges.forEach((bridge) => validateLine(bridge[2], "bridge"));

const representedPlaceTypes = new Set();
const matchedSemanticBuildings = new Set();
map.places.forEach((place) => {
  const distance = Math.hypot(place[0], place[1]) / map.coordinatePrecision;
  check(distance <= map.radiusMeters + 0.2, "a semantic place lies outside the 1 km circle");
  check(Number.isInteger(place[2]) && map.placeTypes[place[2]], "place has an invalid type");
  check(typeof place[4] === "string" && place[4].length > 0, "place is missing its mapped name");
  check(
    place[5] === -1 || map.buildings[place[5]],
    "place references an invalid real building",
  );
  if (place[5] >= 0) matchedSemanticBuildings.add(place[5]);
  representedPlaceTypes.add(place[2]);
});
check(representedPlaceTypes.size >= 10, "too few semantic place types are represented");
check(map.waterways.length > 0, "no animated waterways are available");
check(map.bridges.length > 0, "no tagged bridges are available");
check(matchedSemanticBuildings.size >= 90, "too few semantic places match a real building");
check(
  map.stats.animatedSemanticBuildings === matchedSemanticBuildings.size,
  "animated semantic building count does not match payload",
);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  const area = (Math.PI * map.radiusMeters ** 2) / 1_000_000;
  console.log(`Center: ${map.center.lat}, ${map.center.lon}`);
  console.log(`Playable radius: ${(map.radiusMeters / 1000).toFixed(2)} km (${area.toFixed(2)} km²)`);
  console.log(`Outside status: ${map.boundary.outsideStatus} / ${map.boundary.outsideLabel}`);
  console.log(`Buildings: ${map.buildings.length.toLocaleString("en-US")}`);
  console.log(
    `Road parts: ${map.roads.length.toLocaleString("en-US")} (${roadPointCount.toLocaleString("en-US")} points)`,
  );
  console.log(`Living places: ${map.places.length.toLocaleString("en-US")} across ${representedPlaceTypes.size} types`);
  console.log(`Purpose-animated real buildings: ${matchedSemanticBuildings.size.toLocaleString("en-US")}`);
  console.log(`Waterways: ${map.waterways.length}; tagged bridges: ${map.bridges.length}`);
  console.log(`Farthest building center: ${farthestBuildingCenter.toFixed(1)} m`);
  console.log(`Farthest clipped road point: ${farthestRoadPoint.toFixed(1)} m`);
  console.log(
    `Closest road-to-park clearance: ${closestParkRoadClearance.toFixed(2)} m ` +
      `(road ${closestParkRoadIndex})`,
  );
  console.log("Map validation passed");
}
