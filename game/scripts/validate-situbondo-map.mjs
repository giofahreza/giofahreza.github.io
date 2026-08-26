import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE,
  ALUN_ALUN_JUNCTION_LOOP_PATH,
  ALUN_ALUN_JUNCTION_LOOP_SURFACE_WIDTH,
  ALUN_ALUN_PARK_OUTLINE,
  ALUN_ALUN_SOUTH_APPROACH_DEFINITION,
  createAlunAlunRoadRibbonGeometry,
} from "../src/features/landmarks/alun-alun/traffic.js";
import {
  ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS,
  maskAlunAlunGeneratedRoads,
} from "../src/features/landmarks/alun-alun/generated-road-mask.js";
import {
  createMapNavigation,
} from "../src/world/geospatial-world.js";

const path = resolve("public/data/situbondo-map.json");
const map = JSON.parse(await readFile(path, "utf8"));
const failures = [];
const MAP_METERS_PER_WORLD_UNIT = 5;
const SURVEYED_CARRIAGEWAY_WIDTH_METERS = 6.6;
const SURVEYED_CARRIAGEWAY_WIDTH = 66;
const GENERATED_ROAD_CURB_WIDTH_METERS = 0.18;
const GENERATED_ROAD_SIDEWALK_WIDTH_METERS = Object.freeze([
  2.1,
  1.9,
  1.7,
  1.45,
  1.2,
  0,
]);
const GENERATED_GROUND_SURFACE_LIFT = 0.0008;
const GENERATED_ROAD_SURFACE_LIFT = 0.024;
const GENERATED_SIDEWALK_SURFACE_LIFT = 0.036;
const MASK_CORE_SAMPLE_SPACING = 0.02;
const PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT = 22;
const PEGADAIAN_FRONTAGE_SOURCE_COORDINATES = Object.freeze([
  -2289, 3956, -2354, 3611, -2394, 3346, -2411, 3215,
  -2432, 2984, -2458, 2724, -2452, 2629, -2440, 2597,
  -2416, 2579, -2377, 2553, -2317, 2534, -2199, 2525,
  -1999, 2521, -1929, 2497, -1876, 2447, -1751, 2089,
  -1712, 2021, -1447, 1775, -1317, 1704, -1272, 1616,
  -1251, 1486, -1319, 1128, -1385, 790, -1423, 564,
]);
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
const roadFingerprint = (style, coordinates) =>
  `${style}:${coordinateFingerprint(coordinates)}`;

function decodeRoadCenterline(road) {
  const centerline = [];
  for (let index = 0; index < road[2].length; index += 2) {
    centerline.push([
      road[2][index + 1] / map.coordinatePrecision,
      road[2][index] / map.coordinatePrecision,
    ]);
  }
  return centerline;
}

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

function offsetSegmentMidpoint(start, end, offset) {
  const deltaNorth = end[0] - start[0];
  const deltaEast = end[1] - start[1];
  const length = Math.hypot(deltaNorth, deltaEast);
  if (length === 0) return [Infinity, Infinity];
  return [
    (start[0] + end[0]) * 0.5 - deltaEast / length * offset,
    (start[1] + end[1]) * 0.5 + deltaNorth / length * offset,
  ];
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

function roadRibbonTriangles(points, width) {
  const geometry = createAlunAlunRoadRibbonGeometry(points, width);
  try {
    const positions = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const triangles = [];
    for (let offset = 0; offset < index.count; offset += 3) {
      triangles.push(
        [0, 1, 2].map((corner) => {
          const vertex = index.getX(offset + corner);
          return [positions.getX(vertex), positions.getZ(vertex)];
        }),
      );
    }
    return triangles;
  } finally {
    geometry.dispose();
  }
}

function pointInTriangle(point, triangle) {
  const first = segmentCross(triangle[0], triangle[1], point);
  const second = segmentCross(triangle[1], triangle[2], point);
  const third = segmentCross(triangle[2], triangle[0], point);
  const epsilon = 1e-8;
  return (
    (first >= -epsilon && second >= -epsilon && third >= -epsilon) ||
    (first <= epsilon && second <= epsilon && third <= epsilon)
  );
}

function triangleMaximumEdgeLength(triangle) {
  return Math.max(
    Math.hypot(
      triangle[0][0] - triangle[1][0],
      triangle[0][1] - triangle[1][1],
    ),
    Math.hypot(
      triangle[1][0] - triangle[2][0],
      triangle[1][1] - triangle[2][1],
    ),
    Math.hypot(
      triangle[2][0] - triangle[0][0],
      triangle[2][1] - triangle[0][1],
    ),
  );
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

const sourceRoadsBeforeMask = JSON.stringify(map.roads);
const renderableRoads = maskAlunAlunGeneratedRoads(map.roads);
check(
  JSON.stringify(map.roads) === sourceRoadsBeforeMask,
  "Alun-Alun generated-road masking mutates source map data",
);
const sourceRoadsByFingerprint = new Map();
map.roads.forEach((road) => {
  const fingerprint = roadFingerprint(road[0], road[2]);
  const matches = sourceRoadsByFingerprint.get(fingerprint) ?? [];
  matches.push(road);
  sourceRoadsByFingerprint.set(fingerprint, matches);
});
const renderableRoadFingerprints = new Set(
  renderableRoads.map((road) => roadFingerprint(road[0], road[2])),
);
const pegadaianFrontageReplacement =
  ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.find(
    (replacement) => replacement.label === "Pegadaian frontage branch",
  );
check(
  pegadaianFrontageReplacement?.style === 3 &&
    coordinateFingerprint(pegadaianFrontageReplacement.coordinates) ===
      coordinateFingerprint(PEGADAIAN_FRONTAGE_SOURCE_COORDINATES),
  "Pegadaian frontage replacement no longer has the exact style-3 road fingerprint",
);
check(
  pegadaianFrontageReplacement?.retainedPointCount ===
    PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT &&
    pegadaianFrontageReplacement.coordinates.slice(
      (PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT - 1) * 2,
      PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT * 2,
    ).join(",") === "-1319,1128",
  "Pegadaian frontage replacement is not retained through [-1319,1128] at point 22",
);
const pegadaianSourceFingerprint = roadFingerprint(
  3,
  PEGADAIAN_FRONTAGE_SOURCE_COORDINATES,
);
const pegadaianSourceMatches =
  sourceRoadsByFingerprint.get(pegadaianSourceFingerprint) ?? [];
const pegadaianSourceRoad = pegadaianSourceMatches[0] ?? null;
check(
  pegadaianSourceMatches.length === 1 &&
    map.roads[3] === pegadaianSourceRoad &&
    pegadaianSourceRoad[1] === 52,
  "Pegadaian frontage source is not the exact 5.2 m map road 3",
);
ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.forEach((replacement) => {
  const sourceFingerprint = roadFingerprint(
    replacement.style,
    replacement.coordinates,
  );
  const sourceMatches = sourceRoadsByFingerprint.get(sourceFingerprint) ?? [];
  check(
    sourceMatches.length === 1,
    `generated-road replacement ${replacement.label} has ` +
      `${sourceMatches.length} exact source matches`,
  );
  const retainedCoordinates = replacement.coordinates.slice(
    0,
    replacement.retainedPointCount * 2,
  );
  if (retainedCoordinates.length < 4) {
    check(
      !renderableRoadFingerprints.has(sourceFingerprint),
      `generated-road replacement ${replacement.label} is still rendered`,
    );
    return;
  }
  check(
    renderableRoadFingerprints.has(
      roadFingerprint(replacement.style, retainedCoordinates),
    ),
    `generated-road replacement ${replacement.label} retained the wrong prefix`,
  );
});
const pegadaianRetainedCoordinates =
  PEGADAIAN_FRONTAGE_SOURCE_COORDINATES.slice(
    0,
    PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT * 2,
  );
const pegadaianRetainedRenderableMatches = renderableRoads.filter(
  (road) =>
    roadFingerprint(road[0], road[2]) ===
    roadFingerprint(3, pegadaianRetainedCoordinates),
);
check(
  pegadaianRetainedRenderableMatches.length === 1 &&
    pegadaianRetainedRenderableMatches[0][1] === 52 &&
    !renderableRoadFingerprints.has(pegadaianSourceFingerprint),
  "Pegadaian frontage mask did not render exactly one 22-point retained prefix",
);
const fullyReplacedRoadCount = ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.filter(
  (replacement) => replacement.retainedPointCount < 2,
).length;
check(
  renderableRoads.length === map.roads.length - fullyReplacedRoadCount,
  "Alun-Alun generated-road mask removed an unexpected number of road parts",
);

// Navigation keeps source carriageway cores so the custom asphalt has a
// continuous movement height, but it must not retain a roadside band that is
// no longer rendered. This point lies inside the park and inside road 110's
// former inferred sidewalk; walking across it previously lifted the rider and
// camera over an invisible crossover. A centreline midpoint verifies that the
// source road core remains active after roadside masking.
const parkSideReplacement = ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.find(
  (replacement) => replacement.label === "west park-side carriageway",
);
const parkSideSourceRoad = parkSideReplacement
  ? sourceRoadsByFingerprint.get(
      roadFingerprint(
        parkSideReplacement.style,
        parkSideReplacement.coordinates,
      ),
    )?.[0]
  : null;
const parkSideCenterline = parkSideSourceRoad
  ? decodeRoadCenterline(parkSideSourceRoad)
  : [];
const formerParkSidewalkPoint = [86.7, 17.1];
const formerParkSidewalkDistance = parkSideCenterline.length >= 2
  ? Math.min(
      ...parkSideCenterline.slice(1).map((end, index) =>
        pointToSegmentDistance(
          formerParkSidewalkPoint,
          parkSideCenterline[index],
          end,
        ),
      ),
    )
  : Infinity;
const parkSideHalfWidth = parkSideSourceRoad
  ? parkSideSourceRoad[1] / map.coordinatePrecision * 0.5
  : 0;
const parkSideSidewalkWidth = parkSideSourceRoad
  ? GENERATED_ROAD_SIDEWALK_WIDTH_METERS[parkSideSourceRoad[0]] ?? 0
  : 0;
const navigation = createMapNavigation(map);

// The Pegadaian source branch keeps its first 22 points as a generated road,
// then replaces both remaining curved segments with surveyed tangent-plane
// geometry. Derive samples from the exact source centreline: halfway along a
// segment avoids join/end-cap ambiguity, and the middle of the former
// sidewalk band is far enough from both its curb and outer edge to catch even
// small masking regressions.
const pegadaianCenterline = pegadaianSourceRoad
  ? decodeRoadCenterline(pegadaianSourceRoad)
  : [];
check(
  pegadaianCenterline.length === 24,
  "Pegadaian frontage source does not contain the expected 24 points",
);
const pegadaianHalfWidth = pegadaianSourceRoad
  ? pegadaianSourceRoad[1] / map.coordinatePrecision * 0.5
  : 0;
const pegadaianGeneratedSidewalkWidth = pegadaianSourceRoad
  ? GENERATED_ROAD_SIDEWALK_WIDTH_METERS[pegadaianSourceRoad[0]] ?? 0
  : 0;
const pegadaianFormerSidewalkSampleOffset =
  pegadaianHalfWidth +
  GENERATED_ROAD_CURB_WIDTH_METERS +
  pegadaianGeneratedSidewalkWidth * 0.5;
const pegadaianRetainedSegment = pegadaianCenterline.length === 24
  ? pegadaianCenterline.slice(
      PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT - 2,
      PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT,
    )
  : [];
const pegadaianRetainedSidewalkSamples =
  pegadaianRetainedSegment.length === 2
    ? [-1, 1].map((side) =>
        offsetSegmentMidpoint(
          pegadaianRetainedSegment[0],
          pegadaianRetainedSegment[1],
          side * pegadaianFormerSidewalkSampleOffset,
        ),
      )
    : [];
pegadaianRetainedSidewalkSamples.forEach((point, index) => {
  const lift = navigation.surfaceLiftAt(point[1], point[0]);
  check(
    Math.abs(lift - GENERATED_SIDEWALK_SURFACE_LIFT) < 1e-9,
    `Pegadaian retained-prefix generic sidewalk side ${index + 1} has lift ` +
      `${lift.toFixed(4)}`,
  );
});

const pegadaianMaskedSuffixSegments = [];
if (pegadaianCenterline.length === 24) {
  for (
    let index = PEGADAIAN_FRONTAGE_RETAINED_POINT_COUNT - 1;
    index < pegadaianCenterline.length - 1;
    index += 1
  ) {
    pegadaianMaskedSuffixSegments.push([
      pegadaianCenterline[index],
      pegadaianCenterline[index + 1],
    ]);
  }
}
check(
  pegadaianMaskedSuffixSegments.length === 2,
  "Pegadaian frontage mask does not own exactly two source suffix segments",
);
pegadaianMaskedSuffixSegments.forEach((segment, segmentIndex) => {
  [-1, 1].forEach((side) => {
    const point = offsetSegmentMidpoint(
      segment[0],
      segment[1],
      side * pegadaianFormerSidewalkSampleOffset,
    );
    const lift = navigation.surfaceLiftAt(point[1], point[0]);
    check(
      Math.abs(lift - GENERATED_GROUND_SURFACE_LIFT) < 1e-9,
      `Pegadaian masked suffix segment ${segmentIndex + 1} side ` +
        `${side < 0 ? "left" : "right"} still has generic sidewalk lift ` +
        `${lift.toFixed(4)}`,
    );
  });
  const roadCorePoint = offsetSegmentMidpoint(segment[0], segment[1], 0);
  const roadCoreLift = navigation.surfaceLiftAt(
    roadCorePoint[1],
    roadCorePoint[0],
  );
  check(
    Math.abs(roadCoreLift - GENERATED_ROAD_SURFACE_LIFT) < 1e-9,
    `Pegadaian masked suffix segment ${segmentIndex + 1} road-core lift ` +
      `changed to ${roadCoreLift.toFixed(4)}`,
  );
});

const formerParkSidewalkLift = navigation.surfaceLiftAt(
  formerParkSidewalkPoint[1],
  formerParkSidewalkPoint[0],
);
check(
  parkSideSourceRoad &&
    pointInPolygon(
      formerParkSidewalkPoint,
      ALUN_ALUN_PARK_OUTLINE.map(([north, east]) => [
        north * MAP_METERS_PER_WORLD_UNIT,
        east * MAP_METERS_PER_WORLD_UNIT,
      ]),
    ) &&
    formerParkSidewalkDistance > parkSideHalfWidth &&
    formerParkSidewalkDistance <=
      parkSideHalfWidth +
        GENERATED_ROAD_CURB_WIDTH_METERS +
        parkSideSidewalkWidth,
  "park-side navigation regression point is no longer inside the suppressed " +
    "generated sidewalk",
);
check(
  Math.abs(formerParkSidewalkLift - GENERATED_GROUND_SURFACE_LIFT) < 1e-9,
  `suppressed park-side sidewalk still lifts navigation to ` +
    `${formerParkSidewalkLift.toFixed(4)}`,
);
const sourceRoadCorePoint = parkSideCenterline.length >= 2
  ? [
      (parkSideCenterline[0][0] + parkSideCenterline[1][0]) * 0.5,
      (parkSideCenterline[0][1] + parkSideCenterline[1][1]) * 0.5,
    ]
  : [Infinity, Infinity];
const sourceRoadCoreLift = navigation.surfaceLiftAt(
  sourceRoadCorePoint[1],
  sourceRoadCorePoint[0],
);
check(
  parkSideSourceRoad &&
    Math.abs(sourceRoadCoreLift - GENERATED_ROAD_SURFACE_LIFT) < 1e-9,
  `masked park-side source road core lift changed to ` +
    `${sourceRoadCoreLift.toFixed(4)}`,
);

// Road #126's generated centreline bends farther west than the custom traffic
// loop. Once the generated road is masked, every point in its former core must
// still be owned by a custom asphalt ribbon or union polygon. Sample at 10 cm
// or better in real-world units so the former roughly 1 m² wedge cannot regress.
const compactLoopReplacement = ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.find(
  (replacement) => replacement.label === "compact junction loop",
);
const compactLoopSourceRoad = compactLoopReplacement
  ? sourceRoadsByFingerprint.get(
      roadFingerprint(
        compactLoopReplacement.style,
        compactLoopReplacement.coordinates,
      ),
    )?.[0]
  : null;
const adjacentJunctionLabels = new Set([
  "east inbound carriageway",
  "east opposing carriageway",
  "east outbound carriageway",
  "north-arm junction connector",
  "west park-side carriageway",
  "west post-office-side carriageway",
]);
const junctionCoverageTriangles = roadRibbonTriangles(
  ALUN_ALUN_JUNCTION_LOOP_PATH,
  ALUN_ALUN_JUNCTION_LOOP_SURFACE_WIDTH,
);
ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.filter((replacement) =>
  adjacentJunctionLabels.has(replacement.label),
).forEach((replacement) => {
  const sourceRoad = sourceRoadsByFingerprint.get(
    roadFingerprint(replacement.style, replacement.coordinates),
  )?.[0];
  if (!sourceRoad) return;
  const coreWidth =
    sourceRoad[1] /
    map.coordinatePrecision /
    MAP_METERS_PER_WORLD_UNIT;
  const renderedWidth = coreWidth + Math.min(0.28, coreWidth * 0.18);
  junctionCoverageTriangles.push(
    ...roadRibbonTriangles(
      decodeRoadCenterline(sourceRoad).map(([north, east]) => [
        north / MAP_METERS_PER_WORLD_UNIT,
        east / MAP_METERS_PER_WORLD_UNIT,
      ]),
      renderedWidth,
    ),
  );
});
let compactLoopCoverageSamples = 0;
let firstCompactLoopCoverageGap = null;
if (compactLoopSourceRoad) {
  const sourceCoreTriangles = roadRibbonTriangles(
    decodeRoadCenterline(compactLoopSourceRoad).map(([north, east]) => [
      north / MAP_METERS_PER_WORLD_UNIT,
      east / MAP_METERS_PER_WORLD_UNIT,
    ]),
    compactLoopSourceRoad[1] /
      map.coordinatePrecision /
      MAP_METERS_PER_WORLD_UNIT,
  );
  sourceCoreTriangles.forEach((triangle) => {
    const subdivisions = Math.max(
      1,
      Math.ceil(
        triangleMaximumEdgeLength(triangle) / MASK_CORE_SAMPLE_SPACING,
      ),
    );
    for (let first = 0; first <= subdivisions; first += 1) {
      for (let second = 0; second <= subdivisions - first; second += 1) {
        const firstWeight = first / subdivisions;
        const secondWeight = second / subdivisions;
        const thirdWeight = 1 - firstWeight - secondWeight;
        const point = [
          triangle[0][0] * thirdWeight +
            triangle[1][0] * firstWeight +
            triangle[2][0] * secondWeight,
          triangle[0][1] * thirdWeight +
            triangle[1][1] * firstWeight +
            triangle[2][1] * secondWeight,
        ];
        compactLoopCoverageSamples += 1;
        const covered =
          pointInPolygon(point, ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE) ||
          pointInPolygon(
            point,
            ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline,
          ) ||
          junctionCoverageTriangles.some((coverageTriangle) =>
            pointInTriangle(point, coverageTriangle),
          );
        if (!covered && !firstCompactLoopCoverageGap) {
          firstCompactLoopCoverageGap = point;
        }
      }
    }
  });
}
check(
  compactLoopSourceRoad && !firstCompactLoopCoverageGap,
  firstCompactLoopCoverageGap
    ? `masked compact junction core has an uncovered point at north ` +
      `${firstCompactLoopCoverageGap[0].toFixed(3)}, east ` +
      `${firstCompactLoopCoverageGap[1].toFixed(3)}`
    : "masked compact junction core source road is missing",
);

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
  const centerline = decodeRoadCenterline(road);
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
let closestGeneratedParkClearance = Infinity;
renderableRoads.forEach((road, roadIndex) => {
  const centerlineDistance = centerlineToPolygonDistance(
    decodeRoadCenterline(road),
    parkOutlineMeters,
  );
  const halfRenderedEnvelope =
    road[1] / map.coordinatePrecision * 0.5 +
    GENERATED_ROAD_CURB_WIDTH_METERS +
    (GENERATED_ROAD_SIDEWALK_WIDTH_METERS[road[0]] ?? 0);
  const renderedClearance = centerlineDistance - halfRenderedEnvelope;
  closestGeneratedParkClearance = Math.min(
    closestGeneratedParkClearance,
    renderedClearance,
  );
  check(
    renderedClearance > 1e-6,
    `renderable generated road ${roadIndex} crosses the complete Alun-Alun ` +
      `park envelope (clearance ${renderedClearance.toFixed(3)} m)`,
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
  console.log(
    `Renderable generated roads: ${renderableRoads.length}; closest complete ` +
      `envelope-to-park clearance: ${closestGeneratedParkClearance.toFixed(2)} m`,
  );
  console.log(
    `Masked compact-junction core coverage: ` +
      `${compactLoopCoverageSamples.toLocaleString("en-US")} samples`,
  );
  console.log("Map validation passed");
}
