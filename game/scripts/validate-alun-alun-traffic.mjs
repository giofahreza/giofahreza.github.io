import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createAmbientAnimationSystem } from "../src/animation/ambient.js";
import {
  GROUND_EPSILON,
  MAX_WALKABLE_STEP_HEIGHT,
  PLANET_RADIUS,
} from "../src/config/runtime.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import {
  ALUN_ALUN_FRONTAGE_APRON_Y,
  ALUN_ALUN_FRONTAGE_CURB_DEPTH,
  ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
  ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH,
  ALUN_ALUN_FRONTAGE_SIDEWALK_WIDTH,
  ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
  ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES,
  ALUN_ALUN_INTERIOR_TACTILE_PAVER_DEFINITION,
  ALUN_ALUN_PARK_OUTLINE,
  ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION,
  ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH,
  ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH,
  ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS,
  ALUN_ALUN_ROAD_SURFACE_Y,
  ALUN_ALUN_SOUTH_APPROACH_DEFINITION,
  ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION,
  ALUN_ALUN_SOUTH_CROSSING_DEFINITION,
  ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE,
  ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS,
  ALUN_ALUN_SOUTH_PARK_TREE_CENTERS,
  ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION,
  ALUN_ALUN_TRAFFIC_LANE_OFFSETS,
  ALUN_ALUN_TRAFFIC_MINIMUM_SPEED,
  ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS,
  ALUN_ALUN_TRAFFIC_SIGNAL_TIMING,
  ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH,
  ALUN_ALUN_WEST_PARK_SIDE_CARRIAGEWAY_PATH,
  ALUN_ALUN_WEST_PARK_TREE_CENTERS,
  ALUN_ALUN_WEST_FRONTAGE_DEFINITION,
  ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES,
  ALUN_ALUN_WEST_GREEN_EDGE_WHITE_LINES,
  ALUN_ALUN_WEST_GREEN_EDGE_WIDTH,
  ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE,
  ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER,
  ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE,
  ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM,
  ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER,
  ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE,
  ALUN_ALUN_WEST_PROPERTY_SIDEWALK_WIDTH,
  ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS,
  ALUN_ALUN_WEST_UTILITY_SUPPORTS,
  ALUN_ALUN_WEST_UTILITY_CORRIDOR_DEFINITION,
  ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH,
  ALUN_ALUN_WEST_SHARED_ROAD_PATH,
  ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH,
  ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,
  ALUN_ALUN_WEST_LOCAL_ROAD_PATH,
  ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE,
  ALUN_ALUN_WEST_SOUTH_PARK_ROADSIDE_SEAM,
  createAlunAlunTrafficFactory,
  createAlunAlunRoadRibbonGeometry,
  createAlunAlunRoadsideBandGeometry,
  createAlunAlunRoadShoulderGeometry,
  getAlunAlunTrafficSignalState,
} from "../src/features/landmarks/alun-alun/traffic.js";
import {
  ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES,
  ALUN_ALUN_PARK_LAWN_OUTLINE,
  ALUN_ALUN_PARK_NAVIGATION_SURFACES,
  ALUN_ALUN_PARK_SURFACE_HEIGHTS,
  ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES,
  ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES,
  ALUN_ALUN_TRUE_SOUTHEAST_COLLISION_OBSTACLES,
  ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES,
} from "../src/features/landmarks/alun-alun/index.js";
import { ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS } from "../src/features/landmarks/alun-alun/generated-road-mask.js";
import { createStops } from "../src/data/stops.js";

const MAP_METERS_PER_WORLD_UNIT = 5;
const SAMPLE_SPACING = 0.02;
const TANGENT_WINDOW = 0.16;
const EXPECTED_ROUTE_NAMES = Object.freeze([
  "mainEastbound",
  "mainWestbound",
  "crossNorthbound",
  "crossSouthbound",
]);
const EXPECTED_PEDESTRIAN_ROUTE_NAMES = Object.freeze([
  "southCrossing",
  "southEast",
  "northWest",
  "northEast",
]);
const OPPOSING_ROUTE_PAIRS = Object.freeze([
  Object.freeze(["mainEastbound", "mainWestbound"]),
  Object.freeze(["crossNorthbound", "crossSouthbound"]),
]);
const PERPENDICULAR_ROUTE_PAIRS = Object.freeze([
  Object.freeze(["mainEastbound", "crossNorthbound"]),
  Object.freeze(["mainEastbound", "crossSouthbound"]),
  Object.freeze(["mainWestbound", "crossNorthbound"]),
  Object.freeze(["mainWestbound", "crossSouthbound"]),
]);

// Runtime lane variation is folded into the widest vehicle envelope below, so
// each route can be sampled at the same nominal lane centre used by the game.
const VEHICLE_HALF_LENGTH = 0.59;
const VEHICLE_BODY_HALF_WIDTH = 0.2;
const LANE_VARIATION = 0.08;
// The widest pickup wheel plus its maximum lane deviation reaches 0.2888
// world units. Round outward so the validator covers wheels as well as body.
const VEHICLE_HALF_WIDTH = Math.max(
  VEHICLE_BODY_HALF_WIDTH + LANE_VARIATION,
  0.29,
);
const REQUIRED_CLEARANCE = 0.02;
const RIDER_COLLISION_RADIUS = 0.06;
const PEDESTRIAN_REQUIRED_CLEARANCE = 0.02;
// Ten centimetres is deliberately non-zero: touching polygons are already a
// visual collision, while a small positive margin catches curved-route SAT
// near misses before interpolation or model changes turn them into overlap.
const PRODUCTION_FLEET_REQUIRED_CLEARANCE = 0.02;
const PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE = 0.02;
const CROSSING_STRIPE_THICKNESS = 0.078;

// These route-specific envelopes include the widest wheel/body on each route
// plus that route's furthest runtime lane variation from its nominal centre.
// Keeping the opposing directions separate avoids applying the unusually wide
// eastbound pickup envelope to every lane while still covering every vehicle
// currently spawned by the Alun-Alun factory.
const ROUTE_SWEPT_HALF_WIDTHS = Object.freeze({
  mainEastbound: 0.289,
  mainWestbound: 0.245,
  crossNorthbound: 0.26,
  crossSouthbound: 0.263,
});
// The longest model on each route, rounded outward by roughly .005 world
// units. Applying the cross-street box-truck length to the shorter main-road
// fleet creates a false overlap where the two main routes bend differently.
const ROUTE_SWEPT_HALF_LENGTHS = Object.freeze({
  mainEastbound: 0.419,
  mainWestbound: 0.401,
  crossNorthbound: 0.548,
  crossSouthbound: 0.583,
});
const ROUTE_PAIR_HASH_CELL_SIZE = 1.5;
const PHASE_REGRESSION_FRAME_RATES = Object.freeze([30, 60, 120]);
const PHASE_REGRESSION_WARMUP_CYCLES = 2;
const PHASE_REGRESSION_CHECK_CYCLES = 6;
const PHASE_DISTANCE_EPSILON = 1e-6;
// The analytical check uses a slightly slower constant speed for headroom. The
// dynamic regression imports the runtime-enforced fleet floor so the timing
// test cannot silently drift away from the vehicles used by the game.
const MIN_VALIDATED_CLEARING_SPEED = 1.5;
const MIN_PHASE_REGRESSION_SPEED = ALUN_ALUN_TRAFFIC_MINIMUM_SPEED;
const PHASE_REGRESSION_PHASES = Object.freeze([0.04, 0.29, 0.58, 0.83]);
const PHASE_REGRESSION_SPEEDS = Object.freeze([
  MIN_PHASE_REGRESSION_SPEED,
  2.15,
  2.65,
  3,
]);
// Deliberately retain large legacy-looking values on synthetic details. The
// runtime must ignore these when choosing the physical stop target; otherwise
// this fleet will cross the real bar on amber/red and fail the regression.
const PHASE_REGRESSION_QUEUE_OFFSETS = Object.freeze([0, 0.75, 2.5, 5]);
const PRODUCTION_FLEET_FRAME_RATES = Object.freeze([30, 60, 120]);
const PRODUCTION_FLEET_CHECK_CYCLES = 4;
const PRODUCTION_FLEET_SOURCE_URL = new URL(
  "../src/features/landmarks/alun-alun/index.js",
  import.meta.url,
);
const TRAFFIC_SOURCE_URL = new URL(
  "../src/features/landmarks/alun-alun/traffic.js",
  import.meta.url,
);
const MOSQUE_SOURCE_URL = new URL(
  "../src/features/landmarks/mosque.js",
  import.meta.url,
);
const PENDOPO_SOURCE_URL = new URL(
  "../src/features/landmarks/pendopo.js",
  import.meta.url,
);
const SITUBONDO_MAP_URL = new URL(
  "../public/data/situbondo-map.json",
  import.meta.url,
);

const isFiniteNumber = (value) => Number.isFinite(value);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

function sourceLineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findMatchingOpeningBracket(source, closingIndex) {
  let depth = 0;
  for (let index = closingIndex; index >= 0; index -= 1) {
    if (source[index] === "]") depth += 1;
    else if (source[index] === "[") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseProductionFleetLiteral(literal, sourceLabel) {
  // These source arrays intentionally contain only JSON values, hexadecimal
  // colour literals, and trailing commas. Normalising those two JavaScript
  // conveniences keeps this extraction declarative; no source is evaluated.
  const json = literal
    .replace(/\b0x[\da-f]+\b/gi, (value) =>
      String(Number.parseInt(value.slice(2), 16)),
    )
    .replace(/,\s*]/g, "]");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `${sourceLabel}: production fleet array is no longer declarative JSON ` +
        `(${error.message})`,
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${sourceLabel}: production fleet array must not be empty`);
  }
  return parsed;
}

function loadProductionFleetConfigs() {
  const source = readFileSync(PRODUCTION_FLEET_SOURCE_URL, "utf8");
  const sectionStart = source.indexOf("addAlunAlunRoadContext(group);");
  const sectionEnd = source.indexOf(
    "group.userData.localObstacles =",
    sectionStart,
  );
  if (sectionStart < 0 || sectionEnd < 0) {
    throw new Error(
      "could not locate the production traffic block in alun-alun/index.js",
    );
  }

  const section = source.slice(sectionStart, sectionEnd);
  const blocks = [];
  let cursor = 0;
  while (cursor < section.length) {
    const relativeClosingIndex = section.indexOf("].forEach", cursor);
    if (relativeClosingIndex < 0) break;
    const nextClosingIndex = section.indexOf(
      "].forEach",
      relativeClosingIndex + 1,
    );
    const callbackEnd = nextClosingIndex < 0 ? section.length : nextClosingIndex;
    const callbackSource = section.slice(
      relativeClosingIndex + 1,
      callbackEnd,
    );
    const vehicleCall = callbackSource.match(
      /addAlunAlun(StreetVehicle|Motorbike)\s*\(/,
    );
    cursor = relativeClosingIndex + 1;
    if (!vehicleCall) continue;

    const relativeOpeningIndex = findMatchingOpeningBracket(
      section,
      relativeClosingIndex,
    );
    if (relativeOpeningIndex < 0) {
      throw new Error("production fleet array has no matching opening bracket");
    }
    const absoluteOpeningIndex = sectionStart + relativeOpeningIndex;
    const literal = section.slice(
      relativeOpeningIndex,
      relativeClosingIndex + 1,
    );
    const kind = vehicleCall[1] === "StreetVehicle" ? "vehicle" : "motorbike";
    const routeGroup = callbackSource.includes('"cross"') ? "cross" : "main";
    const sourceLabel =
      `alun-alun/index.js:${sourceLineNumber(source, absoluteOpeningIndex)}`;
    const rows = parseProductionFleetLiteral(literal, sourceLabel);
    const rowStarts = [...literal.matchAll(/\[\s*0x[\da-f]+/gi)].map(
      (match) => match.index,
    );
    if (rowStarts.length !== rows.length) {
      throw new Error(
        `${sourceLabel}: every production fleet row must start with a hex colour`,
      );
    }
    blocks.push({
      kind,
      routeGroup,
      rows,
      rowStarts,
      literal,
      absoluteOpeningIndex,
      source,
    });
  }

  const expectedBlocks = [
    "main/vehicle",
    "main/motorbike",
    "cross/vehicle",
    "cross/motorbike",
  ];
  const actualBlocks = blocks.map((block) =>
    `${block.routeGroup}/${block.kind}`,
  );
  if (
    actualBlocks.length !== expectedBlocks.length ||
    expectedBlocks.some((name) => !actualBlocks.includes(name))
  ) {
    throw new Error(
      `production fleet blocks mismatch (expected ${expectedBlocks.join(", ")}; ` +
        `found ${actualBlocks.join(", ") || "none"})`,
    );
  }

  const configs = [];
  for (const block of blocks) {
    const expectedRowLength =
      block.kind === "vehicle" && block.routeGroup === "cross" ? 7 : 6;
    block.rows.forEach((row, rowIndex) => {
      const sourceIndex =
        block.absoluteOpeningIndex + block.rowStarts[rowIndex];
      const sourceLine = sourceLineNumber(block.source, sourceIndex);
      if (!Array.isArray(row) || row.length !== expectedRowLength) {
        throw new Error(
          `alun-alun/index.js:${sourceLine}: ${block.routeGroup} ` +
            `${block.kind} row needs ${expectedRowLength} values`,
        );
      }
      const [color, phase, suppliedLane, signedSpeed, queueOffset, variant] = row;
      if (
        ![color, phase, suppliedLane, signedSpeed, queueOffset].every(
          isFiniteNumber,
        ) ||
        typeof variant !== "string" ||
        phase < 0 ||
        phase >= 1 ||
        signedSpeed === 0 ||
        queueOffset < 0
      ) {
        throw new Error(
          `alun-alun/index.js:${sourceLine}: invalid production fleet values`,
        );
      }
      const cargoColor = row[6] ?? null;
      if (cargoColor !== null && !isFiniteNumber(cargoColor)) {
        throw new Error(
          `alun-alun/index.js:${sourceLine}: cargo colour must be numeric or null`,
        );
      }
      configs.push({
        cargoColor,
        color,
        kind: block.kind,
        phase,
        queueOffset,
        routeGroup: block.routeGroup,
        signedSpeed,
        sourceLine,
        suppliedLane,
        variant,
      });
    });
  }
  return configs;
}

function validateSignalTiming() {
  const timing = ALUN_ALUN_TRAFFIC_SIGNAL_TIMING;
  const orderedKeys = [
    "mainGreenEnd",
    "mainAmberEnd",
    "crossGreenStart",
    "crossGreenEnd",
    "crossAmberEnd",
    "cycleLength",
  ];
  if (
    !timing ||
    ![timing.startOffset, ...orderedKeys.map((key) => timing[key])].every(
      isFiniteNumber,
    )
  ) {
    throw new Error("traffic signal timing values must be finite");
  }
  if (
    timing.mainGreenEnd <= 0 ||
    orderedKeys.some(
      (key, index) =>
        index > 0 && timing[key] <= timing[orderedKeys[index - 1]],
    )
  ) {
    throw new Error(
      "traffic signal phases must be strictly ordered within one cycle",
    );
  }
  if (
    timing.startOffset < 0 ||
    timing.startOffset >= timing.cycleLength
  ) {
    throw new Error("traffic signal startOffset must lie inside the cycle");
  }

  const stateAtCyclePosition = (cyclePosition, route) =>
    getAlunAlunTrafficSignalState(
      cyclePosition - timing.startOffset,
      route,
    );
  const expectedStates = [
    [timing.mainGreenEnd * 0.5, "main", "green"],
    [
      (timing.mainGreenEnd + timing.mainAmberEnd) * 0.5,
      "main",
      "amber",
    ],
    [
      (timing.mainAmberEnd + timing.crossGreenStart) * 0.5,
      "main",
      "red",
    ],
    [timing.crossGreenStart * 0.5, "cross", "red"],
    [
      (timing.crossGreenStart + timing.crossGreenEnd) * 0.5,
      "cross",
      "green",
    ],
    [
      (timing.crossGreenEnd + timing.crossAmberEnd) * 0.5,
      "cross",
      "amber",
    ],
    [
      (timing.crossAmberEnd + timing.cycleLength) * 0.5,
      "cross",
      "red",
    ],
  ];
  for (const [cyclePosition, route, expectedState] of expectedStates) {
    const actualState = stateAtCyclePosition(cyclePosition, route);
    if (actualState !== expectedState) {
      throw new Error(
        `${route} signal is ${actualState} instead of ${expectedState} at ` +
          `cycle position ${cyclePosition.toFixed(3)}`,
      );
    }
  }

  const sampleStep = 1 / Math.max(...PHASE_REGRESSION_FRAME_RATES);
  for (
    let cyclePosition = 0;
    cyclePosition < timing.cycleLength;
    cyclePosition += sampleStep
  ) {
    const mainState = stateAtCyclePosition(cyclePosition, "main");
    const crossState = stateAtCyclePosition(cyclePosition, "cross");
    if (mainState === "green" && crossState === "green") {
      throw new Error(
        `main and cross signals are green together at cycle position ` +
          cyclePosition.toFixed(3),
      );
    }
  }
}

function validateCollections(routeDefinitions, collisionObstacles) {
  if (
    !routeDefinitions ||
    typeof routeDefinitions !== "object" ||
    Array.isArray(routeDefinitions)
  ) {
    throw new Error("traffic route definitions must be an object");
  }

  const routeNames = Object.keys(routeDefinitions);
  const missingRouteNames = EXPECTED_ROUTE_NAMES.filter(
    (name) => !routeNames.includes(name),
  );
  const unexpectedRouteNames = routeNames.filter(
    (name) => !EXPECTED_ROUTE_NAMES.includes(name),
  );
  if (
    routeNames.length !== EXPECTED_ROUTE_NAMES.length ||
    missingRouteNames.length > 0 ||
    unexpectedRouteNames.length > 0
  ) {
    const details = [];
    if (missingRouteNames.length > 0) {
      details.push(`missing ${missingRouteNames.join(", ")}`);
    }
    if (unexpectedRouteNames.length > 0) {
      details.push(`unexpected ${unexpectedRouteNames.join(", ")}`);
    }
    throw new Error(
      `expected exactly ${EXPECTED_ROUTE_NAMES.join(", ")} ` +
        `(${details.join("; ") || `${routeNames.length} routes supplied`})`,
    );
  }

  if (!Array.isArray(collisionObstacles) || collisionObstacles.length === 0) {
    throw new Error("at least one traffic collision obstacle is required");
  }
}

function buildRoute(name, definition) {
  if (!definition || !Array.isArray(definition.points)) {
    throw new Error(`${name}: points must be an array`);
  }
  if (definition.points.length < 2) {
    throw new Error(`${name}: at least two route points are required`);
  }
  definition.points.forEach((point, pointIndex) => {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      !point.every(isFiniteNumber)
    ) {
      throw new Error(
        `${name}: point ${pointIndex} must contain finite north/east values`,
      );
    }
  });
  if (
    !Number.isInteger(definition.stopIndex) ||
    definition.stopIndex < 0 ||
    definition.stopIndex >= definition.points.length
  ) {
    throw new Error(`${name}: stopIndex is outside the route`);
  }

  const distances = [0];
  for (let pointIndex = 1; pointIndex < definition.points.length; pointIndex += 1) {
    const start = definition.points[pointIndex - 1];
    const end = definition.points[pointIndex];
    const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (segmentLength <= 0.0001) {
      throw new Error(
        `${name}: points ${pointIndex - 1} and ${pointIndex} are duplicates`,
      );
    }
    distances.push(distances.at(-1) + segmentLength);
  }

  return {
    name,
    points: definition.points,
    distances,
    length: distances.at(-1),
    stopDistance: distances[definition.stopIndex],
  };
}

function validatePedestrianCollections(routeDefinitions, crossingDefinition) {
  if (
    !routeDefinitions ||
    typeof routeDefinitions !== "object" ||
    Array.isArray(routeDefinitions)
  ) {
    throw new Error("pedestrian route definitions must be an object");
  }
  const routeNames = Object.keys(routeDefinitions);
  const missingRouteNames = EXPECTED_PEDESTRIAN_ROUTE_NAMES.filter(
    (name) => !routeNames.includes(name),
  );
  const unexpectedRouteNames = routeNames.filter(
    (name) => !EXPECTED_PEDESTRIAN_ROUTE_NAMES.includes(name),
  );
  if (missingRouteNames.length > 0 || unexpectedRouteNames.length > 0) {
    throw new Error(
      `pedestrian routes mismatch (missing: ` +
        `${missingRouteNames.join(", ") || "none"}; unexpected: ` +
        `${unexpectedRouteNames.join(", ") || "none"})`,
    );
  }
  if (!crossingDefinition || typeof crossingDefinition !== "object") {
    throw new Error("south crossing definition must be an object");
  }
}

function buildPedestrianRoute(name, definition) {
  if (!definition || !Array.isArray(definition.points)) {
    throw new Error(`${name}: pedestrian points must be an array`);
  }
  if (definition.points.length < 2) {
    throw new Error(`${name}: pedestrian route needs at least two points`);
  }
  if (!isFiniteNumber(definition.width) || definition.width < 0.15) {
    throw new Error(
      `${name}: pedestrian width must be at least 0.15 world / 0.75 m`,
    );
  }
  if (![1, -1].includes(definition.curbSide)) {
    throw new Error(`${name}: curbSide must be -1 or 1`);
  }

  const distances = [0];
  definition.points.forEach((point, pointIndex) => {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      !point.every(isFiniteNumber)
    ) {
      throw new Error(
        `${name}: pedestrian point ${pointIndex} must contain finite north/east values`,
      );
    }
    if (pointIndex === 0) return;
    const previous = definition.points[pointIndex - 1];
    const segmentLength = Math.hypot(
      point[0] - previous[0],
      point[1] - previous[1],
    );
    if (segmentLength <= 0.0001) {
      throw new Error(
        `${name}: pedestrian points ${pointIndex - 1} and ${pointIndex} are duplicates`,
      );
    }
    distances.push(distances.at(-1) + segmentLength);
  });

  return {
    name,
    points: definition.points,
    distances,
    length: distances.at(-1),
    width: definition.width,
  };
}

function validateCrossingDefinition(
  crossing,
  collisionObstacles,
  crossingRouteDefinition,
) {
  const numericKeys = [
    "stripeStartEast",
    "stripeEndEast",
    "stripeStartNorth",
    "stripeEndNorth",
  ];
  if (!numericKeys.every((key) => isFiniteNumber(crossing[key]))) {
    throw new Error("south crossing stripe bounds must be finite");
  }
  if (
    !Number.isInteger(crossing.stripeCount) ||
    crossing.stripeCount < 2 ||
    crossing.stripeEndEast <= crossing.stripeStartEast ||
    crossing.stripeEndNorth <= crossing.stripeStartNorth
  ) {
    throw new Error("south crossing stripe dimensions are invalid");
  }
  if (
    !Array.isArray(crossing.parkCurbEdge) ||
    crossing.parkCurbEdge.length !== 2 ||
    crossing.parkCurbEdge.some(
      (point) =>
        !Array.isArray(point) ||
        point.length !== 2 ||
        !point.every(isFiniteNumber),
    ) ||
    !crossing.parkCurbGap ||
    ![crossing.parkCurbGap.start, crossing.parkCurbGap.end].every(
      isFiniteNumber,
    ) ||
    crossing.parkCurbGap.start < 0 ||
    crossing.parkCurbGap.end > 1 ||
    crossing.parkCurbGap.end <= crossing.parkCurbGap.start
  ) {
    throw new Error("south crossing park curb opening is invalid");
  }

  const stripeCenterNorth =
    (crossing.stripeStartNorth + crossing.stripeEndNorth) * 0.5;
  const curbEdgeStart = crossing.parkCurbEdge[0];
  const curbEdgeEnd = crossing.parkCurbEdge[1];
  const curbGapPoints = [crossing.parkCurbGap.start, crossing.parkCurbGap.end]
    .map((amount) => [
      curbEdgeStart[0] + (curbEdgeEnd[0] - curbEdgeStart[0]) * amount,
      curbEdgeStart[1] + (curbEdgeEnd[1] - curbEdgeStart[1]) * amount,
    ]);
  const curbGapDelta = [
    curbGapPoints[1][0] - curbGapPoints[0][0],
    curbGapPoints[1][1] - curbGapPoints[0][1],
  ];
  const curbGapLengthSquared = dot(curbGapDelta, curbGapDelta);
  const entryDelta = [
    stripeCenterNorth - curbGapPoints[0][0],
    crossing.stripeStartEast - curbGapPoints[0][1],
  ];
  const entryAmount = Math.max(
    0,
    Math.min(1, dot(entryDelta, curbGapDelta) / curbGapLengthSquared),
  );
  const parkEntryGap = Math.hypot(
    entryDelta[0] - curbGapDelta[0] * entryAmount,
    entryDelta[1] - curbGapDelta[1] * entryAmount,
  ) - CROSSING_STRIPE_THICKNESS * 0.5;
  if (parkEntryGap > 0.005) {
    throw new Error(
      `zebra misses the diagonal park curb opening by ` +
        `${formatDistance(parkEntryGap)}`,
    );
  }

  const { droppedCurb, refuge } = crossing;
  if (
    !droppedCurb ||
    !refuge ||
    ![
      droppedCurb.north,
      droppedCurb.east,
      droppedCurb.width,
      droppedCurb.depth,
      refuge.north,
      refuge.east,
      refuge.width,
      refuge.depth,
    ].every(isFiniteNumber)
  ) {
    throw new Error("south crossing refuge and dropped curb must be finite");
  }
  const crossingRoutePoints = crossingRouteDefinition?.points;
  const crossingRouteStart = crossingRoutePoints?.[0];
  const crossingRouteEnd = crossingRoutePoints?.at(-1);
  if (
    !Array.isArray(crossingRoutePoints) ||
    crossingRoutePoints.length < 2 ||
    !crossingRouteStart ||
    !crossingRouteEnd ||
    crossingRouteStart[1] > crossing.stripeStartEast ||
    crossingRouteEnd[1] < refuge.east + refuge.depth * 0.5 - 0.001 ||
    crossingRouteDefinition.width <
      crossing.stripeEndNorth - crossing.stripeStartNorth - 0.001
  ) {
    throw new Error(
      "south crossing pedestrian route must span the park curb, zebra and refuge",
    );
  }
  const stripeHalfWidth =
    (crossing.stripeEndNorth - crossing.stripeStartNorth) * 0.5;
  const zebraToCurbEastGap =
    Math.abs(droppedCurb.east - crossing.stripeEndEast) -
    droppedCurb.depth * 0.5 -
    CROSSING_STRIPE_THICKNESS * 0.5;
  const curbToRefugeEastGap =
    Math.abs(refuge.east - droppedCurb.east) -
    refuge.depth * 0.5 -
    droppedCurb.depth * 0.5;
  const northCoverage = Math.min(
    droppedCurb.width * 0.5 - Math.abs(droppedCurb.north - stripeCenterNorth),
    refuge.width * 0.5 - Math.abs(refuge.north - stripeCenterNorth),
  );
  if (
    zebraToCurbEastGap > 0.001 ||
    curbToRefugeEastGap > 0.001 ||
    northCoverage < stripeHalfWidth - 0.001
  ) {
    throw new Error(
      `zebra, dropped curb and refuge are not physically continuous`,
    );
  }

  const refugeCollisionGap = Math.min(
    ...collisionObstacles
      .filter((obstacle) => obstacle.playerCollision === false)
      .map((obstacle) =>
        pointObstacleSignedGap(refuge.north, refuge.east, obstacleEnvelope(obstacle)),
      ),
  );
  if (!Number.isFinite(refugeCollisionGap) || refugeCollisionGap > 0) {
    throw new Error("walkable refuge is not aligned with its collision opening");
  }
}

function validateObstacle(obstacle, obstacleIndex) {
  const label = obstacle?.label ?? `obstacle ${obstacleIndex}`;
  if (
    !obstacle ||
    ![obstacle.north, obstacle.east, obstacle.width, obstacle.depth].every(
      isFiniteNumber,
    )
  ) {
    throw new Error(`${label}: collision box values must be finite`);
  }
  if (obstacle.width <= 0 || obstacle.depth <= 0) {
    throw new Error(`${label}: collision box dimensions must be positive`);
  }
  if (obstacle.yaw !== undefined && !isFiniteNumber(obstacle.yaw)) {
    throw new Error(`${label}: yaw must be finite when supplied`);
  }
}

// This is intentionally kept equivalent to sampleRoadRouteCenter() in
// animation/ambient.js. The validator must inspect the same smoothed tangent
// used to place and rotate live traffic, not the sharp source polyline alone.
function sampleRouteCenter(route, distance) {
  const clampedDistance = Math.max(0, Math.min(route.length, distance));
  let segmentIndex = route.distances.length - 2;
  for (let index = 0; index < route.distances.length - 1; index += 1) {
    if (clampedDistance <= route.distances[index + 1]) {
      segmentIndex = index;
      break;
    }
  }

  const start = route.points[segmentIndex];
  const end = route.points[segmentIndex + 1];
  const segmentStart = route.distances[segmentIndex];
  const segmentLength = Math.max(
    0.0001,
    route.distances[segmentIndex + 1] - segmentStart,
  );
  const amount = Math.max(
    0,
    Math.min(1, (clampedDistance - segmentStart) / segmentLength),
  );
  return {
    north: start[0] + (end[0] - start[0]) * amount,
    east: start[1] + (end[1] - start[1]) * amount,
  };
}

function sampleLane(route, distance, laneOffset) {
  const center = sampleRouteCenter(route, distance);
  const before = sampleRouteCenter(route, distance - TANGENT_WINDOW);
  const after = sampleRouteCenter(route, distance + TANGENT_WINDOW);
  const tangentLength = Math.max(
    0.0001,
    Math.hypot(after.north - before.north, after.east - before.east),
  );
  const forward = [
    (after.north - before.north) / tangentLength,
    (after.east - before.east) / tangentLength,
  ];
  const lateral = [-forward[1], forward[0]];
  return {
    distance,
    north: center.north + lateral[0] * laneOffset,
    east: center.east + lateral[1] * laneOffset,
    forward,
    lateral,
  };
}

function sampleLeftLane(route, distance) {
  const laneOffset = route.name.startsWith("main")
    ? ALUN_ALUN_TRAFFIC_LANE_OFFSETS.main
    : ALUN_ALUN_TRAFFIC_LANE_OFFSETS.cross;
  return sampleLane(route, distance, laneOffset);
}

function sampleRoute(route) {
  const sampleCount = Math.max(1, Math.ceil(route.length / SAMPLE_SPACING));
  const samples = [];
  for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
    const distance = Math.min(
      route.length,
      (sampleIndex / sampleCount) * route.length,
    );
    samples.push(sampleLeftLane(route, distance));
  }
  return samples;
}

function samplePedestrianRoute(route) {
  const sampleCount = Math.max(1, Math.ceil(route.length / SAMPLE_SPACING));
  const samples = [];
  for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
    const distance = Math.min(
      route.length,
      (sampleIndex / sampleCount) * route.length,
    );
    samples.push({ distance, ...sampleRouteCenter(route, distance) });
  }
  return samples;
}

function productionRouteName(config) {
  if (config.routeGroup === "cross") {
    return config.signedSpeed >= 0
      ? "crossNorthbound"
      : "crossSouthbound";
  }
  return config.signedSpeed >= 0 ? "mainEastbound" : "mainWestbound";
}

function createProductionFleet(configs, routesByName) {
  const details = [];
  const group = new THREE.Group();
  const factory = createAlunAlunTrafficFactory({
    collections: { animatedStopDetails: details },
    helpers: {},
    materials: {},
    roadside: {},
  });

  for (const config of configs) {
    const previousDetailCount = details.length;
    if (config.kind === "vehicle") {
      factory.addAlunAlunStreetVehicle(
        group,
        config.color,
        config.phase,
        config.suppliedLane,
        config.signedSpeed,
        config.queueOffset,
        config.variant,
        config.routeGroup,
        config.cargoColor,
      );
    } else {
      factory.addAlunAlunMotorbike(
        group,
        config.color,
        config.phase,
        config.suppliedLane,
        config.signedSpeed,
        config.queueOffset,
        config.variant,
        config.routeGroup,
      );
    }
    if (details.length !== previousDetailCount + 1) {
      throw new Error(
        `alun-alun/index.js:${config.sourceLine}: vehicle factory emitted ` +
          `${details.length - previousDetailCount} animation details instead of 1`,
      );
    }

    const detail = details.at(-1);
    const routeName = productionRouteName(config);
    const validationRoute = routesByName.get(routeName);
    const expectedSpeed = Math.max(
      ALUN_ALUN_TRAFFIC_MINIMUM_SPEED,
      Math.abs(config.signedSpeed),
    );
    const expectedType =
      config.routeGroup === "cross" ? "crossStreetVehicle" : "streetVehicle";
    if (
      detail.type !== expectedType ||
      detail.route !== config.routeGroup ||
      Math.abs(detail.phase - config.phase) > 1e-9 ||
      Math.abs(detail.speed - expectedSpeed) > 1e-9 ||
      Math.abs(detail.queueOffset - config.queueOffset) > 1e-9 ||
      Math.abs(detail.routePath.length - validationRoute.length) > 1e-8 ||
      Math.abs(detail.routePath.stopDistance - validationRoute.stopDistance) > 1e-8
    ) {
      throw new Error(
        `alun-alun/index.js:${config.sourceLine}: production ${config.variant} ` +
          `runtime metadata drifted from its source fleet row`,
      );
    }

    detail.object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(detail.object);
    const centerNorth = (bounds.min.x + bounds.max.x) * 0.5;
    const centerEast = (bounds.min.z + bounds.max.z) * 0.5;
    if (Math.abs(centerNorth) > 0.001 || Math.abs(centerEast) > 0.001) {
      throw new Error(
        `alun-alun/index.js:${config.sourceLine}: ${config.variant} model is ` +
          `not centred on its animation origin`,
      );
    }
    const geometryHalfLength = Math.max(
      Math.abs(bounds.min.x),
      Math.abs(bounds.max.x),
    );
    const geometryHalfWidth = Math.max(
      Math.abs(bounds.min.z),
      Math.abs(bounds.max.z),
    );
    if (
      ![geometryHalfLength, geometryHalfWidth, detail.halfLength].every(
        isFiniteNumber,
      ) ||
      geometryHalfLength <= 0 ||
      geometryHalfWidth <= 0 ||
      detail.halfLength + 0.001 < geometryHalfLength
    ) {
      throw new Error(
        `alun-alun/index.js:${config.sourceLine}: ${config.variant} has an ` +
          `invalid or undersized runtime envelope`,
      );
    }
    detail.validation = {
      config,
      halfLength: Math.max(detail.halfLength, geometryHalfLength),
      halfWidth: geometryHalfWidth,
      routeName,
    };
  }

  return { details, group };
}

// Existing route/obstacle checks use route-wide maxima. Keep those conservative
// boxes at least as large as every model plus its real production lane offset.
function validateProductionSweptEnvelopeCoverage(productionDetails) {
  const envelopes = new Map();
  for (const detail of productionDetails) {
    const { halfLength, halfWidth, routeName } = detail.validation;
    const nominalLaneOffset = routeName.startsWith("main")
      ? ALUN_ALUN_TRAFFIC_LANE_OFFSETS.main
      : ALUN_ALUN_TRAFFIC_LANE_OFFSETS.cross;
    const sweptHalfWidth =
      halfWidth + Math.abs(detail.laneOffset - nominalLaneOffset);
    const current = envelopes.get(routeName) ?? {
      halfLength: 0,
      halfWidth: 0,
    };
    current.halfLength = Math.max(current.halfLength, halfLength);
    current.halfWidth = Math.max(current.halfWidth, sweptHalfWidth);
    envelopes.set(routeName, current);
  }
  for (const routeName of EXPECTED_ROUTE_NAMES) {
    if (!envelopes.has(routeName)) {
      throw new Error(`${routeName}: production fleet is empty`);
    }
    const envelope = envelopes.get(routeName);
    if (
      envelope.halfLength > ROUTE_SWEPT_HALF_LENGTHS[routeName] + 0.001 ||
      envelope.halfWidth > ROUTE_SWEPT_HALF_WIDTHS[routeName] + 0.001
    ) {
      throw new Error(
        `${routeName}: production model/lane envelope ` +
          `${formatDistance(envelope.halfLength)} half-length × ` +
          `${formatDistance(envelope.halfWidth)} half-width exceeds the ` +
          `static swept envelope used by route audits`,
      );
    }
  }
}

function obstacleEnvelope(obstacle) {
  const yaw = obstacle.yaw ?? 0;
  return {
    center: [obstacle.north, obstacle.east],
    widthAxis: [Math.cos(yaw), -Math.sin(yaw)],
    depthAxis: [Math.sin(yaw), Math.cos(yaw)],
    halfWidth: obstacle.width * 0.5,
    halfDepth: obstacle.depth * 0.5,
  };
}

function pointObstacleSignedGap(north, east, obstacle) {
  const centerDelta = [
    north - obstacle.center[0],
    east - obstacle.center[1],
  ];
  const outsideWidth =
    Math.abs(dot(centerDelta, obstacle.widthAxis)) - obstacle.halfWidth;
  const outsideDepth =
    Math.abs(dot(centerDelta, obstacle.depthAxis)) - obstacle.halfDepth;
  const outsideDistance = Math.hypot(
    Math.max(outsideWidth, 0),
    Math.max(outsideDepth, 0),
  );
  const insideDistance = Math.min(Math.max(outsideWidth, outsideDepth), 0);
  return outsideDistance + insideDistance;
}

function pedestrianClearance(sample, route, obstacle) {
  return (
    pointObstacleSignedGap(sample.north, sample.east, obstacle) -
    route.width * 0.5 -
    RIDER_COLLISION_RADIUS
  );
}

// Returns a separating-axis gap. Positive values are separated; zero or
// negative values mean the requested clearance envelopes overlap.
function envelopeGap(routeSample, obstacle) {
  const vehicleCenter = [routeSample.north, routeSample.east];
  const centerDelta = [
    obstacle.center[0] - vehicleCenter[0],
    obstacle.center[1] - vehicleCenter[1],
  ];
  const axes = [
    routeSample.forward,
    routeSample.lateral,
    obstacle.widthAxis,
    obstacle.depthAxis,
  ];

  let separatingGap = -Infinity;
  for (const axis of axes) {
    const vehicleRadius =
      VEHICLE_HALF_LENGTH * Math.abs(dot(routeSample.forward, axis)) +
      VEHICLE_HALF_WIDTH * Math.abs(dot(routeSample.lateral, axis));
    const obstacleRadius =
      obstacle.halfWidth * Math.abs(dot(obstacle.widthAxis, axis)) +
      obstacle.halfDepth * Math.abs(dot(obstacle.depthAxis, axis));
    const axisGap =
      Math.abs(dot(centerDelta, axis)) - vehicleRadius - obstacleRadius;
    separatingGap = Math.max(separatingGap, axisGap);
  }
  return separatingGap;
}

function routePairEnvelopeGap(
  firstSample,
  firstHalfLength,
  firstHalfWidth,
  secondSample,
  secondHalfLength,
  secondHalfWidth,
) {
  const centerDelta = [
    secondSample.north - firstSample.north,
    secondSample.east - firstSample.east,
  ];
  const axes = [
    firstSample.forward,
    firstSample.lateral,
    secondSample.forward,
    secondSample.lateral,
  ];

  let separatingGap = -Infinity;
  for (const axis of axes) {
    const firstRadius =
      firstHalfLength * Math.abs(dot(firstSample.forward, axis)) +
      firstHalfWidth * Math.abs(dot(firstSample.lateral, axis));
    const secondRadius =
      secondHalfLength * Math.abs(dot(secondSample.forward, axis)) +
      secondHalfWidth * Math.abs(dot(secondSample.lateral, axis));
    const axisGap =
      Math.abs(dot(centerDelta, axis)) - firstRadius - secondRadius;
    separatingGap = Math.max(separatingGap, axisGap);
  }
  return separatingGap;
}

function polygonArea(polygon) {
  let twiceArea = 0;
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    twiceArea += point[0] * next[1] - next[0] * point[1];
  });
  return Math.abs(twiceArea) * 0.5;
}

function pointDistance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

function samePoint(first, second, epsilon = 1e-8) {
  return pointDistance(first, second) <= epsilon;
}

function cross2D(start, end, point) {
  return (
    (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0])
  );
}

function pointOnSegment2D(point, start, end, epsilon = 1e-9) {
  return (
    Math.abs(cross2D(start, end, point)) <= epsilon &&
    point[0] >= Math.min(start[0], end[0]) - epsilon &&
    point[0] <= Math.max(start[0], end[0]) + epsilon &&
    point[1] >= Math.min(start[1], end[1]) - epsilon &&
    point[1] <= Math.max(start[1], end[1]) + epsilon
  );
}

function segmentsIntersect2D(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd,
  epsilon = 1e-9,
) {
  const firstCross = cross2D(firstStart, firstEnd, secondStart);
  const secondCross = cross2D(firstStart, firstEnd, secondEnd);
  const thirdCross = cross2D(secondStart, secondEnd, firstStart);
  const fourthCross = cross2D(secondStart, secondEnd, firstEnd);
  if (
    ((firstCross > epsilon && secondCross < -epsilon) ||
      (firstCross < -epsilon && secondCross > epsilon)) &&
    ((thirdCross > epsilon && fourthCross < -epsilon) ||
      (thirdCross < -epsilon && fourthCross > epsilon))
  ) {
    return true;
  }
  return (
    pointOnSegment2D(secondStart, firstStart, firstEnd, epsilon) ||
    pointOnSegment2D(secondEnd, firstStart, firstEnd, epsilon) ||
    pointOnSegment2D(firstStart, secondStart, secondEnd, epsilon) ||
    pointOnSegment2D(firstEnd, secondStart, secondEnd, epsilon)
  );
}

function pointOnPolygonBoundary2D(point, polygon, epsilon = 1e-8) {
  return polygon.some((start, index) =>
    pointOnSegment2D(
      point,
      start,
      polygon[(index + 1) % polygon.length],
      epsilon,
    ),
  );
}

// Boundary contact is intentional at an asphalt/curb or facade/apron seam.
// Only proper crossings or a strictly interior vertex count as overlap.
function polygonsHaveInteriorOverlap2D(firstPolygon, secondPolygon) {
  for (let firstIndex = 0; firstIndex < firstPolygon.length; firstIndex += 1) {
    const firstEnd = firstPolygon[(firstIndex + 1) % firstPolygon.length];
    for (
      let secondIndex = 0;
      secondIndex < secondPolygon.length;
      secondIndex += 1
    ) {
      const secondEnd =
        secondPolygon[(secondIndex + 1) % secondPolygon.length];
      const firstCrossStart = cross2D(
        firstPolygon[firstIndex],
        firstEnd,
        secondPolygon[secondIndex],
      );
      const firstCrossEnd = cross2D(
        firstPolygon[firstIndex],
        firstEnd,
        secondEnd,
      );
      const secondCrossStart = cross2D(
        secondPolygon[secondIndex],
        secondEnd,
        firstPolygon[firstIndex],
      );
      const secondCrossEnd = cross2D(
        secondPolygon[secondIndex],
        secondEnd,
        firstEnd,
      );
      const firstStraddles =
        (firstCrossStart > 1e-8 && firstCrossEnd < -1e-8) ||
        (firstCrossStart < -1e-8 && firstCrossEnd > 1e-8);
      const secondStraddles =
        (secondCrossStart > 1e-8 && secondCrossEnd < -1e-8) ||
        (secondCrossStart < -1e-8 && secondCrossEnd > 1e-8);
      if (firstStraddles && secondStraddles) return true;
    }
  }

  return (
    firstPolygon.some(
      (point) =>
        pointInsidePolygon(point, secondPolygon) &&
        !pointOnPolygonBoundary2D(point, secondPolygon),
    ) ||
    secondPolygon.some(
      (point) =>
        pointInsidePolygon(point, firstPolygon) &&
        !pointOnPolygonBoundary2D(point, firstPolygon),
    )
  );
}

function sharedBoundaryLength2D(
  firstPolygon,
  secondPolygon,
  epsilon = 1e-8,
) {
  let sharedLength = 0;
  firstPolygon.forEach((firstStart, firstIndex) => {
    const firstEnd = firstPolygon[(firstIndex + 1) % firstPolygon.length];
    const delta = [
      firstEnd[0] - firstStart[0],
      firstEnd[1] - firstStart[1],
    ];
    const length = Math.hypot(...delta);
    if (length <= epsilon) return;
    const direction = [delta[0] / length, delta[1] / length];
    secondPolygon.forEach((secondStart, secondIndex) => {
      const secondEnd =
        secondPolygon[(secondIndex + 1) % secondPolygon.length];
      if (
        Math.abs(cross2D(firstStart, firstEnd, secondStart)) > epsilon ||
        Math.abs(cross2D(firstStart, firstEnd, secondEnd)) > epsilon
      ) {
        return;
      }
      const projection = (point) =>
        (point[0] - firstStart[0]) * direction[0] +
        (point[1] - firstStart[1]) * direction[1];
      const projected = [projection(secondStart), projection(secondEnd)];
      sharedLength += Math.max(
        0,
        Math.min(length, Math.max(...projected)) -
          Math.max(0, Math.min(...projected)),
      );
    });
  });
  return sharedLength;
}

function polygonTriangles(label, polygon) {
  const faces = THREE.ShapeUtils.triangulateShape(
    polygon.map(([north, east]) => new THREE.Vector2(north, east)),
    [],
  );
  const triangles = faces.map((face) => face.map((index) => polygon[index]));
  const triangulatedArea = triangles.reduce(
    (area, triangle) => area + polygonArea(triangle),
    0,
  );
  const expectedArea = polygonArea(polygon);
  if (
    triangles.length === 0 ||
    Math.abs(triangulatedArea - expectedArea) >
      Math.max(1e-8, expectedArea * 1e-8)
  ) {
    throw new Error(`${label} cannot be triangulated without losing area`);
  }
  return triangles;
}

function validateFiniteSimplePolygon(label, polygon, minimumArea = 1e-5) {
  if (
    !Array.isArray(polygon) ||
    polygon.length < 3 ||
    polygon.some(
      (point) =>
        !Array.isArray(point) ||
        point.length !== 2 ||
        !point.every(isFiniteNumber),
    )
  ) {
    throw new Error(`${label} must be one finite polygon`);
  }
  if (polygonArea(polygon) < minimumArea) {
    throw new Error(`${label} has no usable area`);
  }
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (samePoint(point, next, 1e-10)) {
      throw new Error(`${label} has duplicate vertices at edge ${index}`);
    }
  });
  for (let first = 0; first < polygon.length; first += 1) {
    const firstEnd = (first + 1) % polygon.length;
    for (let second = first + 1; second < polygon.length; second += 1) {
      const secondEnd = (second + 1) % polygon.length;
      if (firstEnd === second || secondEnd === first) continue;
      if (
        segmentsIntersect2D(
          polygon[first],
          polygon[firstEnd],
          polygon[second],
          polygon[secondEnd],
        )
      ) {
        throw new Error(
          `${label} self-intersects at edges ${first}/${second}`,
        );
      }
    }
  }
  polygonTriangles(label, polygon);
}

function pointSegmentDistance(point, start, end) {
  const delta = [end[0] - start[0], end[1] - start[1]];
  const lengthSquared = dot(delta, delta);
  if (lengthSquared <= 1e-18) return pointDistance(point, start);
  const fromStart = [point[0] - start[0], point[1] - start[1]];
  const amount = Math.max(
    0,
    Math.min(1, dot(fromStart, delta) / lengthSquared),
  );
  return pointDistance(point, [
    start[0] + delta[0] * amount,
    start[1] + delta[1] * amount,
  ]);
}

function polygonsOverlapOrTouch(firstPolygon, secondPolygon) {
  for (let first = 0; first < firstPolygon.length; first += 1) {
    const firstEnd = (first + 1) % firstPolygon.length;
    for (let second = 0; second < secondPolygon.length; second += 1) {
      const secondEnd = (second + 1) % secondPolygon.length;
      if (
        segmentsIntersect2D(
          firstPolygon[first],
          firstPolygon[firstEnd],
          secondPolygon[second],
          secondPolygon[secondEnd],
        )
      ) {
        return true;
      }
    }
  }
  return (
    pointInsidePolygon(firstPolygon[0], secondPolygon) ||
    pointInsidePolygon(secondPolygon[0], firstPolygon)
  );
}

function polygonClearance(firstPolygon, secondPolygon) {
  if (polygonsOverlapOrTouch(firstPolygon, secondPolygon)) return 0;
  let minimum = Infinity;
  firstPolygon.forEach((point, firstIndex) => {
    const firstEnd = firstPolygon[(firstIndex + 1) % firstPolygon.length];
    secondPolygon.forEach((otherPoint, secondIndex) => {
      const secondEnd =
        secondPolygon[(secondIndex + 1) % secondPolygon.length];
      minimum = Math.min(
        minimum,
        pointSegmentDistance(point, otherPoint, secondEnd),
        pointSegmentDistance(otherPoint, point, firstEnd),
      );
    });
  });
  return minimum;
}

function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (
    let endIndex = 0, startIndex = polygon.length - 1;
    endIndex < polygon.length;
    startIndex = endIndex, endIndex += 1
  ) {
    const start = polygon[startIndex];
    const end = polygon[endIndex];
    const crossesEast =
      (start[1] > point[1]) !== (end[1] > point[1]);
    if (!crossesEast) continue;
    const crossingNorth =
      start[0] +
      ((point[1] - start[1]) * (end[0] - start[0])) /
        (end[1] - start[1]);
    if (point[0] < crossingNorth) inside = !inside;
  }
  return inside;
}

function polygonBounds(polygon) {
  return polygon.reduce(
    (bounds, point) => ({
      minimumNorth: Math.min(bounds.minimumNorth, point[0]),
      maximumNorth: Math.max(bounds.maximumNorth, point[0]),
      minimumEast: Math.min(bounds.minimumEast, point[1]),
      maximumEast: Math.max(bounds.maximumEast, point[1]),
    }),
    {
      minimumNorth: Infinity,
      maximumNorth: -Infinity,
      minimumEast: Infinity,
      maximumEast: -Infinity,
    },
  );
}

function vehiclePolygon(sample, halfLength, halfWidth) {
  const along = [
    sample.forward[0] * halfLength,
    sample.forward[1] * halfLength,
  ];
  const across = [
    sample.lateral[0] * halfWidth,
    sample.lateral[1] * halfWidth,
  ];
  return [
    [sample.north + along[0] + across[0], sample.east + along[1] + across[1]],
    [sample.north - along[0] + across[0], sample.east - along[1] + across[1]],
    [sample.north - along[0] - across[0], sample.east - along[1] - across[1]],
    [sample.north + along[0] - across[0], sample.east + along[1] - across[1]],
  ];
}

function polygonPairGap(firstPolygon, secondPolygon) {
  const axes = [];
  for (const polygon of [firstPolygon, secondPolygon]) {
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      const edge = [next[0] - point[0], next[1] - point[1]];
      const edgeLength = Math.hypot(edge[0], edge[1]);
      if (edgeLength <= 1e-9) return;
      axes.push([-edge[1] / edgeLength, edge[0] / edgeLength]);
    });
  }

  let separatingGap = -Infinity;
  for (const axis of axes) {
    const firstProjection = firstPolygon.map((point) => dot(point, axis));
    const secondProjection = secondPolygon.map((point) => dot(point, axis));
    const firstMinimum = Math.min(...firstProjection);
    const firstMaximum = Math.max(...firstProjection);
    const secondMinimum = Math.min(...secondProjection);
    const secondMaximum = Math.max(...secondProjection);
    const axisGap = Math.max(
      secondMinimum - firstMaximum,
      firstMinimum - secondMaximum,
    );
    separatingGap = Math.max(separatingGap, axisGap);
  }
  return separatingGap;
}

function clipPolygonAtAxis(polygon, axisIndex, boundary, keepLess) {
  if (polygon.length < 3) return [];
  const clipped = [];
  const inside = (point) =>
    keepLess
      ? point[axisIndex] <= boundary + 1e-10
      : point[axisIndex] >= boundary - 1e-10;
  polygon.forEach((end, index) => {
    const start = polygon[(index + polygon.length - 1) % polygon.length];
    const startInside = inside(start);
    const endInside = inside(end);
    if (startInside !== endInside) {
      const delta = end[axisIndex] - start[axisIndex];
      if (Math.abs(delta) > 1e-12) {
        const amount = (boundary - start[axisIndex]) / delta;
        clipped.push([
          start[0] + (end[0] - start[0]) * amount,
          start[1] + (end[1] - start[1]) * amount,
        ]);
      }
    }
    if (endInside) clipped.push(end);
  });
  return polygonArea(clipped) > 1e-9 ? clipped : [];
}

function polygonOutsideRectangle(polygon, rectangle) {
  const fragments = [
    clipPolygonAtAxis(polygon, 0, rectangle.minimumNorth, true),
    clipPolygonAtAxis(polygon, 0, rectangle.maximumNorth, false),
  ];
  let middle = clipPolygonAtAxis(
    polygon,
    0,
    rectangle.minimumNorth,
    false,
  );
  middle = clipPolygonAtAxis(
    middle,
    0,
    rectangle.maximumNorth,
    true,
  );
  fragments.push(
    clipPolygonAtAxis(middle, 1, rectangle.minimumEast, true),
    clipPolygonAtAxis(middle, 1, rectangle.maximumEast, false),
  );
  return fragments.filter((fragment) => fragment.length >= 3);
}

function buildPedestrianRibbonFragments(route, allowedZebraZone) {
  const halfWidth = route.width * 0.5;
  const edges = route.points.map(([north, east], index) => {
    const previous = route.points[Math.max(0, index - 1)];
    const next = route.points[Math.min(route.points.length - 1, index + 1)];
    const deltaNorth = next[0] - previous[0];
    const deltaEast = next[1] - previous[1];
    const length = Math.max(0.0001, Math.hypot(deltaNorth, deltaEast));
    const offset = [
      (-deltaEast / length) * halfWidth,
      (deltaNorth / length) * halfWidth,
    ];
    return {
      left: [north + offset[0], east + offset[1]],
      right: [north - offset[0], east - offset[1]],
    };
  });

  const fragments = [];
  for (let segmentIndex = 0; segmentIndex < edges.length - 1; segmentIndex += 1) {
    const segmentPolygon = [
      edges[segmentIndex].left,
      edges[segmentIndex].right,
      edges[segmentIndex + 1].right,
      edges[segmentIndex + 1].left,
    ];
    polygonOutsideRectangle(segmentPolygon, allowedZebraZone).forEach(
      (polygon, fragmentIndex) => {
        fragments.push({
          bounds: polygonBounds(polygon),
          fragmentIndex,
          polygon,
          route,
          segmentIndex,
        });
      },
    );
  }
  return fragments;
}

function validatePedestrianVehicleSeparation(
  routesByName,
  routeSamplesByName,
  pedestrianRoutes,
  productionDetails,
) {
  // This is the one intentional pedestrian/vehicle intersection. The east
  // bounds include the half-thickness of the first and last painted stripes;
  // no sidewalk, apron, or unmarked carriageway is implicitly exempted.
  const allowedZebraZone = {
    minimumNorth: ALUN_ALUN_SOUTH_CROSSING_DEFINITION.stripeStartNorth,
    maximumNorth: ALUN_ALUN_SOUTH_CROSSING_DEFINITION.stripeEndNorth,
    minimumEast:
      ALUN_ALUN_SOUTH_CROSSING_DEFINITION.stripeStartEast -
      CROSSING_STRIPE_THICKNESS * 0.5,
    maximumEast:
      ALUN_ALUN_SOUTH_CROSSING_DEFINITION.stripeEndEast +
      CROSSING_STRIPE_THICKNESS * 0.5,
  };
  const fragments = pedestrianRoutes.flatMap((route) =>
    buildPedestrianRibbonFragments(route, allowedZebraZone),
  );
  const closestByPair = new Map();
  let checkedComparisons = 0;
  let closest = null;

  for (const productionDetail of productionDetails) {
    const { routeName } = productionDetail.validation;
    const vehicleEnvelope = productionDetail.validation;
    const route = routesByName.get(routeName);
    for (const nominalSample of routeSamplesByName.get(routeName)) {
      const sample = sampleLane(
        route,
        nominalSample.distance,
        productionDetail.laneOffset,
      );
      const polygon = vehiclePolygon(
        sample,
        vehicleEnvelope.halfLength,
        vehicleEnvelope.halfWidth,
      );
      const bounds = polygonBounds(polygon);
      for (const fragment of fragments) {
        if (
          bounds.maximumNorth + PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE <
            fragment.bounds.minimumNorth ||
          bounds.minimumNorth - PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE >
            fragment.bounds.maximumNorth ||
          bounds.maximumEast + PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE <
            fragment.bounds.minimumEast ||
          bounds.minimumEast - PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE >
            fragment.bounds.maximumEast
        ) {
          continue;
        }
        checkedComparisons += 1;
        const rawGap = polygonPairGap(polygon, fragment.polygon);
        const detail = {
          fragment,
          productionDetail,
          rawGap,
          route,
          sample,
          vehicleEnvelope,
        };
        if (!closest || rawGap < closest.rawGap) closest = detail;
        const pairKey = `${routeName}/${fragment.route.name}`;
        const current = closestByPair.get(pairKey);
        if (!current || rawGap < current.rawGap) {
          closestByPair.set(pairKey, detail);
        }
      }
    }
  }

  return {
    allowedZebraZone,
    checkedComparisons,
    closest,
    fragmentCount: fragments.length,
    violations: [...closestByPair.values()].filter(
      (detail) => detail.rawGap < PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE,
    ),
  };
}

function hashKey(northIndex, eastIndex) {
  return `${northIndex},${eastIndex}`;
}

function buildSampleHash(samples) {
  const hash = new Map();
  for (const sample of samples) {
    const northIndex = Math.floor(sample.north / ROUTE_PAIR_HASH_CELL_SIZE);
    const eastIndex = Math.floor(sample.east / ROUTE_PAIR_HASH_CELL_SIZE);
    const key = hashKey(northIndex, eastIndex);
    const bucket = hash.get(key);
    if (bucket) bucket.push(sample);
    else hash.set(key, [sample]);
  }
  return hash;
}

function findClosestRoutePairEnvelope(
  firstRoute,
  firstSamples,
  secondRoute,
  secondSamples,
) {
  const firstHalfLength = ROUTE_SWEPT_HALF_LENGTHS[firstRoute.name];
  const firstHalfWidth = ROUTE_SWEPT_HALF_WIDTHS[firstRoute.name];
  const secondHalfLength = ROUTE_SWEPT_HALF_LENGTHS[secondRoute.name];
  const secondHalfWidth = ROUTE_SWEPT_HALF_WIDTHS[secondRoute.name];
  const firstBoundingRadius = Math.hypot(
    firstHalfLength,
    firstHalfWidth,
  );
  const secondBoundingRadius = Math.hypot(
    secondHalfLength,
    secondHalfWidth,
  );
  const broadPhaseDistance =
    firstBoundingRadius + secondBoundingRadius + REQUIRED_CLEARANCE;
  const neighborRange = Math.ceil(
    broadPhaseDistance / ROUTE_PAIR_HASH_CELL_SIZE,
  );
  const secondSampleHash = buildSampleHash(secondSamples);
  let closest = null;
  let checkedComparisons = 0;

  for (const firstSample of firstSamples) {
    const northIndex = Math.floor(
      firstSample.north / ROUTE_PAIR_HASH_CELL_SIZE,
    );
    const eastIndex = Math.floor(
      firstSample.east / ROUTE_PAIR_HASH_CELL_SIZE,
    );
    for (
      let northOffset = -neighborRange;
      northOffset <= neighborRange;
      northOffset += 1
    ) {
      for (
        let eastOffset = -neighborRange;
        eastOffset <= neighborRange;
        eastOffset += 1
      ) {
        const candidates = secondSampleHash.get(
          hashKey(northIndex + northOffset, eastIndex + eastOffset),
        );
        if (!candidates) continue;
        for (const secondSample of candidates) {
          const centerDistance = Math.hypot(
            secondSample.north - firstSample.north,
            secondSample.east - firstSample.east,
          );
          if (centerDistance > broadPhaseDistance) continue;
          checkedComparisons += 1;
          const rawGap = routePairEnvelopeGap(
            firstSample,
            firstHalfLength,
            firstHalfWidth,
            secondSample,
            secondHalfLength,
            secondHalfWidth,
          );
          if (!closest || rawGap < closest.rawGap) {
            closest = {
              firstHalfLength,
              firstHalfWidth,
              firstRoute,
              firstSample,
              rawGap,
              secondHalfLength,
              secondHalfWidth,
              secondRoute,
              secondSample,
            };
          }
        }
      }
    }
  }

  return { checkedComparisons, closest };
}

function findRouteConflictExtent(
  firstRoute,
  firstSamples,
  secondRoute,
  secondSamples,
) {
  const firstHalfLength = ROUTE_SWEPT_HALF_LENGTHS[firstRoute.name];
  const firstHalfWidth = ROUTE_SWEPT_HALF_WIDTHS[firstRoute.name];
  const secondHalfLength = ROUTE_SWEPT_HALF_LENGTHS[secondRoute.name];
  const secondHalfWidth = ROUTE_SWEPT_HALF_WIDTHS[secondRoute.name];
  const broadPhaseDistance =
    Math.hypot(firstHalfLength, firstHalfWidth) +
    Math.hypot(secondHalfLength, secondHalfWidth) +
    REQUIRED_CLEARANCE;
  const neighborRange = Math.ceil(
    broadPhaseDistance / ROUTE_PAIR_HASH_CELL_SIZE,
  );
  const secondSampleHash = buildSampleHash(secondSamples);
  let firstMinimumDistance = Infinity;
  let firstMaximumDistance = -Infinity;
  let secondMinimumDistance = Infinity;
  let secondMaximumDistance = -Infinity;
  let conflictComparisons = 0;

  for (const firstSample of firstSamples) {
    const northIndex = Math.floor(
      firstSample.north / ROUTE_PAIR_HASH_CELL_SIZE,
    );
    const eastIndex = Math.floor(
      firstSample.east / ROUTE_PAIR_HASH_CELL_SIZE,
    );
    for (
      let northOffset = -neighborRange;
      northOffset <= neighborRange;
      northOffset += 1
    ) {
      for (
        let eastOffset = -neighborRange;
        eastOffset <= neighborRange;
        eastOffset += 1
      ) {
        const candidates = secondSampleHash.get(
          hashKey(northIndex + northOffset, eastIndex + eastOffset),
        );
        if (!candidates) continue;
        for (const secondSample of candidates) {
          if (
            Math.hypot(
              secondSample.north - firstSample.north,
              secondSample.east - firstSample.east,
            ) > broadPhaseDistance
          ) {
            continue;
          }
          const rawGap = routePairEnvelopeGap(
            firstSample,
            firstHalfLength,
            firstHalfWidth,
            secondSample,
            secondHalfLength,
            secondHalfWidth,
          );
          if (rawGap >= REQUIRED_CLEARANCE) continue;
          conflictComparisons += 1;
          firstMinimumDistance = Math.min(
            firstMinimumDistance,
            firstSample.distance,
          );
          firstMaximumDistance = Math.max(
            firstMaximumDistance,
            firstSample.distance,
          );
          secondMinimumDistance = Math.min(
            secondMinimumDistance,
            secondSample.distance,
          );
          secondMaximumDistance = Math.max(
            secondMaximumDistance,
            secondSample.distance,
          );
        }
      }
    }
  }

  if (conflictComparisons === 0) return null;
  return {
    conflictComparisons,
    firstMinimumDistance,
    firstMaximumDistance,
    secondMinimumDistance,
    secondMaximumDistance,
  };
}

function validatePhaseClearance(routesByName, routeSamplesByName) {
  const timing = ALUN_ALUN_TRAFFIC_SIGNAL_TIMING;
  const clearanceSecondsByGroup = {
    main: timing.crossGreenStart - timing.mainGreenEnd,
    cross:
      timing.cycleLength - timing.crossGreenEnd,
  };
  const maximumConflictDistanceByRoute = new Map();
  let conflictComparisons = 0;

  for (const [firstRouteName, secondRouteName] of PERPENDICULAR_ROUTE_PAIRS) {
    const firstRoute = routesByName.get(firstRouteName);
    const secondRoute = routesByName.get(secondRouteName);
    const extent = findRouteConflictExtent(
      firstRoute,
      routeSamplesByName.get(firstRouteName),
      secondRoute,
      routeSamplesByName.get(secondRouteName),
    );
    if (!extent) continue;
    conflictComparisons += extent.conflictComparisons;
    maximumConflictDistanceByRoute.set(
      firstRouteName,
      Math.max(
        maximumConflictDistanceByRoute.get(firstRouteName) ?? -Infinity,
        extent.firstMaximumDistance,
      ),
    );
    maximumConflictDistanceByRoute.set(
      secondRouteName,
      Math.max(
        maximumConflictDistanceByRoute.get(secondRouteName) ?? -Infinity,
        extent.secondMaximumDistance,
      ),
    );
  }

  const violations = [];
  let minimumHeadroom = Infinity;
  let minimumHeadroomDetail = null;
  for (const route of routesByName.values()) {
    const maximumConflictDistance = maximumConflictDistanceByRoute.get(
      route.name,
    );
    if (!Number.isFinite(maximumConflictDistance)) {
      violations.push({ route, reason: "has no sampled perpendicular conflict" });
      continue;
    }
    const halfLength = ROUTE_SWEPT_HALF_LENGTHS[route.name];
    const centerAtPhysicalBar = route.stopDistance - halfLength;
    const requiredTravel = Math.max(
      0,
      maximumConflictDistance - centerAtPhysicalBar + SAMPLE_SPACING,
    );
    const routeGroup = route.name.startsWith("main") ? "main" : "cross";
    const availableSeconds = clearanceSecondsByGroup[routeGroup];
    const availableTravel = availableSeconds * MIN_VALIDATED_CLEARING_SPEED;
    const headroom = availableTravel - requiredTravel;
    if (headroom < minimumHeadroom) {
      minimumHeadroom = headroom;
      minimumHeadroomDetail = {
        availableSeconds,
        availableTravel,
        requiredTravel,
        route,
      };
    }
    if (headroom < REQUIRED_CLEARANCE) {
      violations.push({
        availableSeconds,
        availableTravel,
        headroom,
        requiredTravel,
        route,
        reason: "cannot clear its final perpendicular conflict before release",
      });
    }
  }

  return {
    conflictComparisons,
    minimumHeadroom,
    minimumHeadroomDetail,
    violations,
  };
}

function createPhaseRegressionFleet(routesByName) {
  const details = [];
  for (const route of routesByName.values()) {
    PHASE_REGRESSION_PHASES.forEach((phase, vehicleIndex) => {
      const object = new THREE.Object3D();
      details.push({
        object,
        type: route.name.startsWith("main")
          ? "streetVehicle"
          : "crossStreetVehicle",
        phase,
        route: route.name.startsWith("main") ? "main" : "cross",
        routeName: route.name,
        routePath: route,
        laneOffset: route.name.startsWith("main")
          ? ALUN_ALUN_TRAFFIC_LANE_OFFSETS.main
          : ALUN_ALUN_TRAFFIC_LANE_OFFSETS.cross,
        speed: PHASE_REGRESSION_SPEEDS[vehicleIndex],
        queueOffset: PHASE_REGRESSION_QUEUE_OFFSETS[vehicleIndex],
        travel: phase * route.length,
        halfLength: ROUTE_SWEPT_HALF_LENGTHS[route.name],
        baseY: 0,
        headingOffset: 0,
      });
    });
  }
  return details;
}

function createPhaseRegressionAnimation(details) {
  const inertMaterial = { emissiveIntensity: 0 };
  return createAmbientAnimationSystem({
    collections: {
      animatedBoats: [],
      animatedFlowers: [],
      animatedFoliage: [],
      animatedStopDetails: details,
      chimneySmoke: [],
      driftingClouds: [],
      lakeRipples: [],
    },
    constants: {
      LOGICAL_THETA_PERIOD: 1_000,
    },
    getReducedMotion: () => false,
    getSignalState: getAlunAlunTrafficSignalState,
    materials: {
      paintedSkyMaterial: { map: { offset: { x: 0 } } },
      targetMaterial: inertMaterial,
      townWindowMaterial: inertMaterial,
      waterMaterial: inertMaterial,
    },
    placeOnPlanet: () => {},
    state: {
      gameState: {
        complete: false,
        started: false,
        targetIndex: -1,
      },
      stops: [],
    },
  }).updateAmbientAnimation;
}

// Rebuild the exact index.js fleet through the production model factory. SAT is
// checked before its first update and throughout four signal cycles, so neither
// a bad initial phase nor queue convergence can hide a same-route collision.
function runProductionFleetRegression(configs, routesByName) {
  const frameRateResults = [];
  const violations = [];

  for (const frameRate of PRODUCTION_FLEET_FRAME_RATES) {
    const delta = 1 / frameRate;
    const { details } = createProductionFleet(configs, routesByName);
    const updateAmbientAnimation = createPhaseRegressionAnimation(details);
    const detailsByRoute = new Map();
    for (const detail of details) {
      const routeDetails = detailsByRoute.get(detail.validation.routeName);
      if (routeDetails) routeDetails.push(detail);
      else detailsByRoute.set(detail.validation.routeName, [detail]);
    }

    let checkedFrames = 0;
    let checkedPairComparisons = 0;
    let minimumGap = Infinity;
    let minimumGapDetail = null;
    let firstViolation = null;
    const inspectFrame = (elapsed) => {
      checkedFrames += 1;
      for (const [routeName, routeDetails] of detailsByRoute) {
        const sampled = routeDetails.map((detail) => ({
          detail,
          sample: sampleLane(
            detail.routePath,
            detail.travel,
            detail.laneOffset,
          ),
        }));
        for (let firstIndex = 0; firstIndex < sampled.length; firstIndex += 1) {
          const first = sampled[firstIndex];
          for (
            let secondIndex = firstIndex + 1;
            secondIndex < sampled.length;
            secondIndex += 1
          ) {
            const second = sampled[secondIndex];
            const firstEnvelope = first.detail.validation;
            const secondEnvelope = second.detail.validation;
            checkedPairComparisons += 1;
            const rawGap = routePairEnvelopeGap(
              first.sample,
              firstEnvelope.halfLength,
              firstEnvelope.halfWidth,
              second.sample,
              secondEnvelope.halfLength,
              secondEnvelope.halfWidth,
            );
            const detail = {
              elapsed,
              firstDetail: first.detail,
              firstSample: first.sample,
              frameRate,
              rawGap,
              routeName,
              secondDetail: second.detail,
              secondSample: second.sample,
            };
            if (rawGap < minimumGap) {
              minimumGap = rawGap;
              minimumGapDetail = detail;
            }
            if (
              !firstViolation &&
              rawGap < PRODUCTION_FLEET_REQUIRED_CLEARANCE
            ) {
              firstViolation = detail;
            }
          }
        }
      }
    };

    inspectFrame(0);
    const totalSteps = Math.ceil(
      ALUN_ALUN_TRAFFIC_SIGNAL_TIMING.cycleLength *
        PRODUCTION_FLEET_CHECK_CYCLES *
        frameRate,
    );
    for (let step = 1; step <= totalSteps; step += 1) {
      const elapsed = step * delta;
      updateAmbientAnimation(delta, elapsed);
      inspectFrame(elapsed);
    }
    if (firstViolation) violations.push(firstViolation);
    frameRateResults.push({
      checkedFrames,
      checkedPairComparisons,
      frameRate,
      minimumGap,
      minimumGapDetail,
    });
  }

  return { frameRateResults, violations };
}

function runPhaseTrafficRegression(routesByName) {
  const frameRateResults = [];
  const violations = [];
  for (const frameRate of PHASE_REGRESSION_FRAME_RATES) {
    const delta = 1 / frameRate;
    const details = createPhaseRegressionFleet(routesByName);
    const updateAmbientAnimation = createPhaseRegressionAnimation(details);
    const warmupSeconds =
      ALUN_ALUN_TRAFFIC_SIGNAL_TIMING.cycleLength *
      PHASE_REGRESSION_WARMUP_CYCLES;
    const checkedSeconds =
      ALUN_ALUN_TRAFFIC_SIGNAL_TIMING.cycleLength *
      PHASE_REGRESSION_CHECK_CYCLES;
    const totalSteps = Math.ceil(
      (warmupSeconds + checkedSeconds) * frameRate,
    );
    let checkedFrames = 0;
    let checkedPairComparisons = 0;
    let minimumGap = Infinity;
    let minimumGapDetail = null;
    let firstStopBarViolation = null;
    let firstConflictViolation = null;

    for (let step = 0; step < totalSteps; step += 1) {
      const elapsed = step * delta;
      const previousTravel = new Map(
        details.map((detail) => [detail, detail.travel]),
      );
      updateAmbientAnimation(delta, elapsed);
      if (elapsed < warmupSeconds) continue;
      checkedFrames += 1;

      for (const detail of details) {
        const previous = previousTravel.get(detail);
        const current = detail.travel;
        const physicalStopTarget =
          detail.routePath.stopDistance - detail.halfLength;
        const wrapped = current < previous - PHASE_DISTANCE_EPSILON;
        const signalState = getAlunAlunTrafficSignalState(
          elapsed,
          detail.route,
        );
        if (
          !firstStopBarViolation &&
          signalState !== "green" &&
          !wrapped &&
          previous < physicalStopTarget - PHASE_DISTANCE_EPSILON &&
          current > physicalStopTarget + PHASE_DISTANCE_EPSILON
        ) {
          firstStopBarViolation = {
            current,
            detail,
            elapsed,
            frameRate,
            physicalStopTarget,
            previous,
            signalState,
          };
        }
      }

      const mainDetails = details.filter((detail) => detail.route === "main");
      const crossDetails = details.filter((detail) => detail.route === "cross");
      for (const mainDetail of mainDetails) {
        const mainSample = sampleLeftLane(
          mainDetail.routePath,
          mainDetail.travel,
        );
        for (const crossDetail of crossDetails) {
          const crossSample = sampleLeftLane(
            crossDetail.routePath,
            crossDetail.travel,
          );
          if (
            Math.abs(mainSample.north - crossSample.north) > 2 ||
            Math.abs(mainSample.east - crossSample.east) > 2
          ) {
            continue;
          }
          checkedPairComparisons += 1;
          const rawGap = routePairEnvelopeGap(
            mainSample,
            ROUTE_SWEPT_HALF_LENGTHS[mainDetail.routeName],
            ROUTE_SWEPT_HALF_WIDTHS[mainDetail.routeName],
            crossSample,
            ROUTE_SWEPT_HALF_LENGTHS[crossDetail.routeName],
            ROUTE_SWEPT_HALF_WIDTHS[crossDetail.routeName],
          );
          if (rawGap < minimumGap) {
            minimumGap = rawGap;
            minimumGapDetail = {
              crossDetail,
              crossSample,
              elapsed,
              frameRate,
              mainDetail,
              mainSample,
              rawGap,
            };
          }
          // The regression fleet uses every route's maximum swept dimensions
          // for all four synthetic vehicles, so its positive near-miss margin is
          // intentionally more conservative than the real mixed fleet. Fail on
          // an actual SAT overlap; report the positive minimum separately.
          if (!firstConflictViolation && rawGap < 0) {
            firstConflictViolation = {
              crossDetail,
              crossSample,
              elapsed,
              frameRate,
              mainDetail,
              mainSample,
              rawGap,
            };
          }
        }
      }
    }

    if (firstStopBarViolation) {
      violations.push({ type: "stopBar", ...firstStopBarViolation });
    }
    if (firstConflictViolation) {
      violations.push({ type: "phaseConflict", ...firstConflictViolation });
    }
    frameRateResults.push({
      checkedFrames,
      checkedPairComparisons,
      frameRate,
      minimumGap,
      minimumGapDetail,
    });
  }

  return { frameRateResults, violations };
}

function formatCoordinate(value) {
  return value.toFixed(3);
}

function formatDistance(value) {
  return `${value.toFixed(3)} world / ${(value * MAP_METERS_PER_WORLD_UNIT).toFixed(2)} m`;
}

function validateRoadSurfaceGeometry() {
  const samplePath = [
    [0, 0],
    [1.2, 0],
    [2.4, 0.25],
  ];
  const ribbon = createAlunAlunRoadRibbonGeometry(
    samplePath,
    [1.1, 1.2, 1.3],
  );
  const straightPath = [[0, 0], [2, 0]];
  const innerWidth = 1.2;
  const shoulder = createAlunAlunRoadShoulderGeometry(
    straightPath,
    innerWidth,
    1.5,
  );
  const bandInnerBoundary = [[0, 0], [1.2, 0], [2.4, 0.25]];
  const bandOuterBoundary = [[0, 0.4], [1.2, 0.4], [2.4, 0.65]];
  const roadsideBand = createAlunAlunRoadsideBandGeometry(
    bandInnerBoundary,
    bandOuterBoundary,
  );

  try {
    for (const [label, geometry] of [
      ["road ribbon", ribbon],
      ["road shoulder", shoulder],
      ["roadside band", roadsideBand],
    ]) {
      const normals = geometry.getAttribute("normal");
      if (!normals || normals.count === 0) {
        throw new Error(`${label} geometry has no vertex normals`);
      }
      for (let index = 0; index < normals.count; index += 1) {
        if (
          !Number.isFinite(normals.getY(index)) ||
          normals.getY(index) < 0.999
        ) {
          throw new Error(
            `${label} triangle winding must face +Y (normal ${index} has ` +
              `Y=${normals.getY(index).toFixed(3)})`,
          );
        }
      }
    }

    const shoulderPositions = shoulder.getAttribute("position");
    const innerHalfWidth = innerWidth * 0.5;
    for (let index = 0; index < shoulderPositions.count; index += 1) {
      if (Math.abs(shoulderPositions.getZ(index)) < innerHalfWidth - 1e-6) {
        throw new Error(
          "road shoulder geometry must not overlap the asphalt interior",
        );
      }
    }

    const bandPositions = roadsideBand.getAttribute("position");
    bandInnerBoundary.forEach((point, index) => {
      const vertexIndex = index * 2;
      if (
        Math.abs(bandPositions.getX(vertexIndex) - point[0]) > 1e-6 ||
        Math.abs(bandPositions.getZ(vertexIndex) - point[1]) > 1e-6
      ) {
        throw new Error(
          "roadside band must preserve its shared inner boundary exactly",
        );
      }
    });
  } finally {
    ribbon.dispose();
    shoulder.dispose();
    roadsideBand.dispose();
  }
}

function validateParkSurfaceOwnership() {
  const westernAsphaltUnion = ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE;
  const perimeterAsphaltFill =
    ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE;
  const perimeterRoadSeam = ALUN_ALUN_WEST_SOUTH_PARK_ROADSIDE_SEAM;
  const parkOutline = ALUN_ALUN_PARK_OUTLINE;
  const southOutline = ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline;
  const trueSoutheastOutline =
    ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.asphaltOutline;
  const surfaceHeights = ALUN_ALUN_PARK_SURFACE_HEIGHTS;
  if (
    !Object.values(surfaceHeights).every(isFiniteNumber) ||
    surfaceHeights.outerCurbHeight <= 0 ||
    surfaceHeights.tactileHeight <= 0 ||
    surfaceHeights.checkerStep < 0 ||
    surfaceHeights.palePathStep < 0 ||
    surfaceHeights.lawn >= surfaceHeights.ceramic
  ) {
    throw new Error("park surface height stack is invalid");
  }
  const outerCurbTop =
    surfaceHeights.outerCurbCenter + surfaceHeights.outerCurbHeight * 0.5;
  const outerCurbBottom =
    surfaceHeights.outerCurbCenter - surfaceHeights.outerCurbHeight * 0.5;
  const highestChecker =
    surfaceHeights.checker +
    (ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES.length - 1) *
      surfaceHeights.checkerStep;
  const tactileBottom =
    surfaceHeights.tactileCenter - surfaceHeights.tactileHeight * 0.5;
  const roadToCeramicRise =
    surfaceHeights.ceramic - ALUN_ALUN_ROAD_SURFACE_Y;
  if (roadToCeramicRise < 0.008) {
    throw new Error(
      "park ceramic must be physically higher than the highway by at least 0.008 world units",
    );
  }
  if (
    outerCurbBottom > ALUN_ALUN_ROAD_SURFACE_Y ||
    surfaceHeights.ceramic > outerCurbTop ||
    highestChecker > outerCurbTop ||
    surfaceHeights.palePath + surfaceHeights.palePathStep > outerCurbTop
  ) {
    throw new Error(
      "blue-white curb must span from below the highway to above every ceramic finish",
    );
  }
  if (tactileBottom + 1e-9 < highestChecker) {
    throw new Error(
      "tactile pavers must sit on top of the raised checker ceramic",
    );
  }
  const samePoint = (first, second, epsilon = 1e-8) =>
    Math.hypot(first[0] - second[0], first[1] - second[1]) <= epsilon;
  const cross = (start, end, point) =>
    (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0]);
  const pointOnSegment = (point, start, end, epsilon = 1e-8) =>
    Math.abs(cross(start, end, point)) <= epsilon &&
    point[0] >= Math.min(start[0], end[0]) - epsilon &&
    point[0] <= Math.max(start[0], end[0]) + epsilon &&
    point[1] >= Math.min(start[1], end[1]) - epsilon &&
    point[1] <= Math.max(start[1], end[1]) + epsilon;
  const pointOnBoundary = (point, polygon, epsilon = 1e-8) =>
    polygon.some((start, index) =>
      pointOnSegment(point, start, polygon[(index + 1) % polygon.length], epsilon),
    );
  const segmentsIntersect = (firstStart, firstEnd, secondStart, secondEnd) => {
    const firstCross = cross(firstStart, firstEnd, secondStart);
    const secondCross = cross(firstStart, firstEnd, secondEnd);
    const thirdCross = cross(secondStart, secondEnd, firstStart);
    const fourthCross = cross(secondStart, secondEnd, firstEnd);
    if (
      ((firstCross > 1e-9 && secondCross < -1e-9) ||
        (firstCross < -1e-9 && secondCross > 1e-9)) &&
      ((thirdCross > 1e-9 && fourthCross < -1e-9) ||
        (thirdCross < -1e-9 && fourthCross > 1e-9))
    ) {
      return true;
    }
    return (
      pointOnSegment(secondStart, firstStart, firstEnd) ||
      pointOnSegment(secondEnd, firstStart, firstEnd) ||
      pointOnSegment(firstStart, secondStart, secondEnd) ||
      pointOnSegment(firstEnd, secondStart, secondEnd)
    );
  };
  const validateSimplePolygon = (label, polygon) => {
    if (
      !Array.isArray(polygon) ||
      polygon.length < 3 ||
      polygonArea(polygon) < 0.01 ||
      polygon.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(Number.isFinite),
      )
    ) {
      throw new Error(label + " must be one finite, usable polygon");
    }
    for (let first = 0; first < polygon.length; first += 1) {
      const firstEnd = (first + 1) % polygon.length;
      for (let second = first + 1; second < polygon.length; second += 1) {
        const secondEnd = (second + 1) % polygon.length;
        const adjacent =
          first === second ||
          firstEnd === second ||
          secondEnd === first;
        if (adjacent) continue;
        if (
          segmentsIntersect(
            polygon[first],
            polygon[firstEnd],
            polygon[second],
            polygon[secondEnd],
          )
        ) {
          throw new Error(
            label + " self-intersects at edges " + first + "/" + second,
          );
        }
      }
    }
  };
  const samplePolygonInteriors = (polygon, subdivisions, callback) => {
    const vertices = polygon.map(
      ([north, east]) => new THREE.Vector2(north, east),
    );
    const faces = THREE.ShapeUtils.triangulateShape(vertices, []);
    let sampleCount = 0;
    faces.forEach((face, faceIndex) => {
      const triangle = face.map((vertexIndex) => polygon[vertexIndex]);
      for (let firstWeight = 1; firstWeight < subdivisions; firstWeight += 1) {
        for (
          let secondWeight = 1;
          secondWeight < subdivisions - firstWeight;
          secondWeight += 1
        ) {
          const thirdWeight = subdivisions - firstWeight - secondWeight;
          const point = [
            (triangle[0][0] * firstWeight +
              triangle[1][0] * secondWeight +
              triangle[2][0] * thirdWeight) /
              subdivisions,
            (triangle[0][1] * firstWeight +
              triangle[1][1] * secondWeight +
              triangle[2][1] * thirdWeight) /
              subdivisions,
          ];
          callback(point, faceIndex);
          sampleCount += 1;
        }
      }
    });
    return sampleCount;
  };

  validateSimplePolygon("western Ahmad Yani asphalt union", westernAsphaltUnion);
  if (
    westernAsphaltUnion.length !== 37 ||
    polygonArea(westernAsphaltUnion) < 140
  ) {
    throw new Error(
      "western Ahmad Yani asphalt must remain one complete 37-point union",
    );
  }
  validateSimplePolygon(
    "west-south park asphalt fill",
    perimeterAsphaltFill,
  );
  if (
    perimeterAsphaltFill.length !== 18 ||
    polygonArea(perimeterAsphaltFill) < 40
  ) {
    throw new Error(
      "west-south park asphalt fill does not cover the complete curb strip",
    );
  }
  validateSimplePolygon(
    "raised ceramic lawn hole",
    ALUN_ALUN_PARK_LAWN_OUTLINE,
  );
  if (
    polygonArea(ALUN_ALUN_PARK_LAWN_OUTLINE) >= polygonArea(parkOutline) ||
    ALUN_ALUN_PARK_LAWN_OUTLINE.some(
      (point) => !pointInsidePolygon(point, parkOutline),
    )
  ) {
    throw new Error(
      "raised ceramic must remain an outer ring around the inset lawn",
    );
  }
  perimeterRoadSeam.slice(0, -1).forEach((point, index) => {
    if (!samePoint(point, perimeterAsphaltFill[index])) {
      throw new Error(
        "west-south park asphalt fill must preserve the surveyed road seam",
      );
    }
  });
  const expectedPerimeterCurbReturn = [5, 4, 3, 2, 1, 0, 14, 13]
    .map((index) => parkOutline[index]);
  expectedPerimeterCurbReturn.forEach((point, index) => {
    if (!samePoint(point, perimeterAsphaltFill[index + 9])) {
      throw new Error(
        "west-south park asphalt fill must return along the unchanged blue curb",
      );
    }
  });
  const northwestReturn =
    ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.northwest.path;
  if (
    !samePoint(perimeterAsphaltFill[8], northwestReturn.at(-1)) ||
    !samePoint(perimeterAsphaltFill[9], northwestReturn.at(-2)) ||
    !pointInsidePolygon(perimeterRoadSeam.at(-1), trueSoutheastOutline)
  ) {
    throw new Error(
      "west-south park asphalt fill must clip to the exact northwest return seam",
    );
  }

  let ceramicSamples = 0;
  ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES.forEach((polygon, polygonIndex) => {
    const label = "interior checker path " + polygonIndex;
    validateSimplePolygon(label, polygon);
    polygon.forEach((point, pointIndex) => {
      if (
        !pointInsidePolygon(point, parkOutline) &&
        !pointOnBoundary(point, parkOutline)
      ) {
        throw new Error(
          label + " vertex " + pointIndex + " crosses outside the blue curb",
        );
      }
    });
    ceramicSamples += samplePolygonInteriors(
      polygon,
      16,
      (point, faceIndex) => {
        if (
          !pointInsidePolygon(point, parkOutline) &&
          !pointOnBoundary(point, parkOutline)
        ) {
          throw new Error(
            label + " leaves the blue curb in triangle " + faceIndex,
          );
        }
      },
    );
  });

  const tactilePavers = ALUN_ALUN_INTERIOR_TACTILE_PAVER_DEFINITION;
  if (
    !Object.values(tactilePavers).every(Number.isFinite) ||
    tactilePavers.step <= 0 ||
    tactilePavers.width <= 0 ||
    tactilePavers.depth <= 0 ||
    tactilePavers.startEast > tactilePavers.endEast
  ) {
    throw new Error("interior tactile paver definition is invalid");
  }
  let tactilePaverCount = 0;
  for (let index = 0; ; index += 1) {
    const east = tactilePavers.startEast + index * tactilePavers.step;
    if (east > tactilePavers.endEast + 1e-9) break;
    const corners = [-1, 1].flatMap((northSide) =>
      [-1, 1].map((eastSide) => [
        tactilePavers.north + northSide * tactilePavers.width * 0.5,
        east + eastSide * tactilePavers.depth * 0.5,
      ]),
    );
    corners.forEach((corner, cornerIndex) => {
      if (
        !pointInsidePolygon(corner, parkOutline) &&
        !pointOnBoundary(corner, parkOutline)
      ) {
        throw new Error(
          "tactile paver " +
            index +
            " corner " +
            cornerIndex +
            " crosses outside the blue curb",
        );
      }
    });
    tactilePaverCount += 1;
  }

  let asphaltSamples = 0;
  [
    ["western Ahmad Yani asphalt union", westernAsphaltUnion],
    ["west-south park asphalt", perimeterAsphaltFill],
  ].forEach(([label, polygon]) => {
    polygon.forEach((point, pointIndex) => {
      if (
        pointInsidePolygon(point, parkOutline) &&
        !pointOnBoundary(point, parkOutline)
      ) {
        throw new Error(
          label + " vertex " + pointIndex + " enters the ceramic park",
        );
      }
    });
    asphaltSamples += samplePolygonInteriors(
      polygon,
      18,
      (point, faceIndex) => {
        if (pointInsidePolygon(point, parkOutline)) {
          throw new Error(
            label + " enters the ceramic park in triangle " + faceIndex,
          );
        }
      },
    );
  });

  const roadGeometries = [
    createAlunAlunRoadRibbonGeometry(
      ALUN_ALUN_WEST_LOCAL_ROAD_PATH,
      ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH,
    ),
    createAlunAlunRoadRibbonGeometry(
      ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH,
      ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH,
    ),
  ];
  const pointInsideTriangle = (point, triangle) => {
    const first = cross(triangle[0], triangle[1], point);
    const second = cross(triangle[1], triangle[2], point);
    const third = cross(triangle[2], triangle[0], point);
    return (
      (first >= -1e-8 && second >= -1e-8 && third >= -1e-8) ||
      (first <= 1e-8 && second <= 1e-8 && third <= 1e-8)
    );
  };
  const pointInsideRoadRibbon = (point) => roadGeometries.some((geometry) => {
    const positions = geometry.getAttribute("position");
    const indices = geometry.getIndex();
    for (let offset = 0; offset < indices.count; offset += 3) {
      const triangle = [0, 1, 2].map((corner) => {
        const vertex = indices.getX(offset + corner);
        return [positions.getX(vertex), positions.getZ(vertex)];
      });
      if (pointInsideTriangle(point, triangle)) return true;
    }
    return false;
  });
  const pointInsideRoadContext = (point) =>
    pointInsideRoadRibbon(point) ||
    pointInsidePolygon(point, southOutline) ||
    pointInsidePolygon(point, trueSoutheastOutline) ||
    pointInsidePolygon(point, westernAsphaltUnion);
  const pointInsidePreexistingAsphalt = (point) => pointInsideRoadContext(point);
  const pointInsideCompleteAsphalt = (point) =>
    pointInsidePreexistingAsphalt(point) ||
    pointInsidePolygon(point, perimeterAsphaltFill);

  try {
    const validateAsphaltJoin = (
      label,
      fill,
      existingAsphaltContains,
      segmentCount,
    ) => {
      // Samples immediately across every road-facing edge must have exactly
      // one owner on either side, never an overlap or a bare-ground crack.
      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const start = fill[segmentIndex];
        const end = fill[segmentIndex + 1];
        const deltaNorth = end[0] - start[0];
        const deltaEast = end[1] - start[1];
        const length = Math.hypot(deltaNorth, deltaEast);
        const normal = [-deltaEast / length, deltaNorth / length];
        const sampleCount = Math.ceil(length / SAMPLE_SPACING);
        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
          const amount = (sampleIndex + 0.5) / sampleCount;
          const midpoint = [
            start[0] + deltaNorth * amount,
            start[1] + deltaEast * amount,
          ];
          const firstSample = [
            midpoint[0] + normal[0] * 0.002,
            midpoint[1] + normal[1] * 0.002,
          ];
          const secondSample = [
            midpoint[0] - normal[0] * 0.002,
            midpoint[1] - normal[1] * 0.002,
          ];
          const firstInFill = pointInsidePolygon(firstSample, fill);
          const secondInFill = pointInsidePolygon(secondSample, fill);
          const firstInRoad = existingAsphaltContains(firstSample);
          const secondInRoad = existingAsphaltContains(secondSample);
          if (
            firstInFill === secondInFill ||
            firstInRoad === secondInRoad ||
            firstInFill === firstInRoad ||
            secondInFill === secondInRoad
          ) {
            throw new Error(
              label +
                " joins existing asphalt incorrectly at segment " +
                segmentIndex +
                ", sample " +
                sampleIndex,
            );
          }
        }
      }
    };
    validateAsphaltJoin(
      "west-south park asphalt",
      perimeterAsphaltFill,
      pointInsidePreexistingAsphalt,
      9,
    );

    // Dense samples around all fifteen blue curb edges encode the requested
    // ownership rule: ceramic on the park side, asphalt on the exterior side.
    let curbSamples = 0;
    parkOutline.forEach((_, edgeIndex) => {
      const curbStart = parkOutline[edgeIndex];
      const curbEnd = parkOutline[(edgeIndex + 1) % parkOutline.length];
      const deltaNorth = curbEnd[0] - curbStart[0];
      const deltaEast = curbEnd[1] - curbStart[1];
      const curbLength = Math.hypot(deltaNorth, deltaEast);
      const normal = [-deltaEast / curbLength, deltaNorth / curbLength];
      const sampleCount = Math.ceil(curbLength / SAMPLE_SPACING);
      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        const amount = (sampleIndex + 0.5) / sampleCount;
        const midpoint = [
          curbStart[0] + deltaNorth * amount,
          curbStart[1] + deltaEast * amount,
        ];
        const firstSample = [
          midpoint[0] + normal[0] * 0.01,
          midpoint[1] + normal[1] * 0.01,
        ];
        const secondSample = [
          midpoint[0] - normal[0] * 0.01,
          midpoint[1] - normal[1] * 0.01,
        ];
        const firstInPark = pointInsidePolygon(firstSample, parkOutline);
        const secondInPark = pointInsidePolygon(secondSample, parkOutline);
        if (firstInPark === secondInPark) {
          throw new Error(
            "blue curb does not separate park and road at edge " +
              edgeIndex +
              ", sample " +
              sampleIndex,
          );
        }
        const ceramicSample = firstInPark ? firstSample : secondSample;
        const roadSample = firstInPark ? secondSample : firstSample;
        if (
          pointInsideCompleteAsphalt(ceramicSample) ||
          !pointInsideCompleteAsphalt(roadSample)
        ) {
          throw new Error(
            "blue curb ownership is not ceramic-inside/asphalt-outside at edge " +
              edgeIndex +
              ", sample " +
              sampleIndex,
          );
        }
        curbSamples += 1;
      }
    });

    const landmarkSource = readFileSync(PRODUCTION_FLEET_SOURCE_URL, "utf8");
    if (
      !/addAlunAlunSurface\(\s*group,\s*ALUN_ALUN_PARK_OUTLINE,\s*ALUN_ALUN_PARK_SURFACE_HEIGHTS\.ceramic,\s*tileMaterial,\s*0\.6,\s*\[lawnOutline\],\s*\)/s.test(
        landmarkSource,
      )
    ) {
      throw new Error(
        "the raised park ceramic must retain the inset lawn as an exact hole",
      );
    }
    const trafficSource = readFileSync(TRAFFIC_SOURCE_URL, "utf8");
    const asphaltStart = trafficSource.indexOf("const asphaltSurface =");
    const asphaltEnd = trafficSource.indexOf("const asphaltTrim =", asphaltStart);
    if (asphaltStart < 0 || asphaltEnd < 0) {
      throw new Error("could not locate the custom asphalt material definition");
    }
    if (/polygonOffset\s*:/.test(trafficSource.slice(asphaltStart, asphaltEnd))) {
      throw new Error(
        "custom asphalt must not use a camera-dependent polygon depth offset",
      );
    }
    if (
      !/const westernAsphaltUnion = addRoadSurface\(\s*ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,\s*\)/s.test(
        trafficSource,
      ) ||
      !/const perimeterAsphaltFill = addRoadSurface\(\s*ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE,\s*\)/s.test(
        trafficSource,
      )
    ) {
      throw new Error(
        "western union and clipped west-south fill must render at the shared road surface height",
      );
    }

    return {
      asphaltSamples,
      ceramicSamples,
      curbSamples,
      roadToCeramicRise,
      tactilePaverCount,
    };
  } finally {
    roadGeometries.forEach((geometry) => geometry.dispose());
  }
}

function validateParkNavigationSurfaces() {
  const [ceramicRing, ...checkerSurfaces] =
    ALUN_ALUN_PARK_NAVIGATION_SURFACES;
  const expectedCeramicRise =
    ALUN_ALUN_PARK_SURFACE_HEIGHTS.ceramic - ALUN_ALUN_ROAD_SURFACE_Y;
  if (
    ceramicRing?.shape !== "polygon" ||
    ceramicRing.points !== ALUN_ALUN_PARK_OUTLINE ||
    ceramicRing.holes?.length !== 1 ||
    ceramicRing.holes[0] !== ALUN_ALUN_PARK_LAWN_OUTLINE ||
    Math.abs(ceramicRing.liftOffset - expectedCeramicRise) > 1e-9 ||
    checkerSurfaces.length !== ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES.length
  ) {
    throw new Error(
      "park navigation must use the exact raised ceramic ring and lawn hole",
    );
  }
  checkerSurfaces.forEach((surface, index) => {
    const expectedOffset =
      ALUN_ALUN_PARK_SURFACE_HEIGHTS.checker +
      index * ALUN_ALUN_PARK_SURFACE_HEIGHTS.checkerStep -
      ALUN_ALUN_ROAD_SURFACE_Y;
    if (
      surface.shape !== "polygon" ||
      surface.points !== ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES[index] ||
      Math.abs(surface.liftOffset - expectedOffset) > 1e-9
    ) {
      throw new Error(`checker navigation surface ${index} is misaligned`);
    }
  });

  const mappedNavigation = {
    userData: {
      navigation: {
        surfaceLiftAt: () => GROUND_EPSILON,
      },
    },
  };
  const navigation = createNavigationSystem({
    constants: {
      GROUND_EPSILON,
      MAP_METERS_PER_WORLD_UNIT,
      MAX_WALKABLE_STEP_HEIGHT,
      PLANET_RADIUS,
      RIDER_COLLISION_RADIUS,
    },
    getGeospatialWorld: () => mappedNavigation,
  });
  const registered = navigation.registerStopNavigation({
    theta: 0,
    phi: 0,
    yaw: 0,
    baseScale: 1,
    name: "Alun-Alun navigation regression",
    group: {
      position: new THREE.Vector3(PLANET_RADIUS, 0, 0),
      userData: {
        navigation: { surfaces: ALUN_ALUN_PARK_NAVIGATION_SURFACES },
      },
    },
  });
  if (
    !registered ||
    navigation.walkableSurfaces.length !==
      ALUN_ALUN_PARK_NAVIGATION_SURFACES.length
  ) {
    throw new Error("park polygon navigation surfaces were not registered");
  }
  const liftAtLocalPoint = ([north, east]) =>
    navigation.navigationSurfaceLiftAt(east, -north);
  let curbTransitionSamples = 0;
  ALUN_ALUN_PARK_OUTLINE.forEach((start, index) => {
    const end =
      ALUN_ALUN_PARK_OUTLINE[(index + 1) % ALUN_ALUN_PARK_OUTLINE.length];
    const deltaNorth = end[0] - start[0];
    const deltaEast = end[1] - start[1];
    const length = Math.hypot(deltaNorth, deltaEast);
    const midpoint = [(start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5];
    const firstSample = [
      midpoint[0] - (deltaEast / length) * 0.03,
      midpoint[1] + (deltaNorth / length) * 0.03,
    ];
    const secondSample = [
      midpoint[0] + (deltaEast / length) * 0.03,
      midpoint[1] - (deltaNorth / length) * 0.03,
    ];
    const firstInside = pointInsidePolygon(firstSample, ALUN_ALUN_PARK_OUTLINE);
    const secondInside = pointInsidePolygon(
      secondSample,
      ALUN_ALUN_PARK_OUTLINE,
    );
    if (firstInside === secondInside) {
      throw new Error(`could not straddle park navigation edge ${index}`);
    }
    const inside = firstInside ? firstSample : secondSample;
    const outside = firstInside ? secondSample : firstSample;
    const insideLift = liftAtLocalPoint(inside);
    const outsideLift = liftAtLocalPoint(outside);
    if (
      insideLift + 1e-7 < GROUND_EPSILON + expectedCeramicRise ||
      Math.abs(outsideLift - GROUND_EPSILON) > 1e-7 ||
      navigation.surfaceTransitionIsBlocked(
        outside[1],
        -outside[0],
        inside[1],
        -inside[0],
      )
    ) {
      throw new Error(
        `park navigation does not preserve the walkable curb step at edge ${index}`,
      );
    }
    curbTransitionSamples += 1;
  });

  const lawnBounds = ALUN_ALUN_PARK_LAWN_OUTLINE.reduce(
    (bounds, [north, east]) => ({
      minNorth: Math.min(bounds.minNorth, north),
      maxNorth: Math.max(bounds.maxNorth, north),
      minEast: Math.min(bounds.minEast, east),
      maxEast: Math.max(bounds.maxEast, east),
    }),
    {
      minNorth: Infinity,
      maxNorth: -Infinity,
      minEast: Infinity,
      maxEast: -Infinity,
    },
  );
  let bareLawnSample = null;
  for (
    let north = lawnBounds.minNorth + 0.2;
    north < lawnBounds.maxNorth && !bareLawnSample;
    north += 0.4
  ) {
    for (
      let east = lawnBounds.minEast + 0.2;
      east < lawnBounds.maxEast;
      east += 0.4
    ) {
      const point = [north, east];
      if (
        pointInsidePolygon(point, ALUN_ALUN_PARK_LAWN_OUTLINE) &&
        !ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES.some((polygon) =>
          pointInsidePolygon(point, polygon),
        )
      ) {
        bareLawnSample = point;
        break;
      }
    }
  }
  if (
    !bareLawnSample ||
    Math.abs(liftAtLocalPoint(bareLawnSample) - GROUND_EPSILON) > 1e-7
  ) {
    throw new Error(
      "raised ceramic navigation must preserve the inset lawn hole",
    );
  }

  checkerSurfaces.forEach((surface, index) => {
    const polygon = surface.points;
    const faces = THREE.ShapeUtils.triangulateShape(
      polygon.map(([north, east]) => new THREE.Vector2(north, east)),
      [],
    );
    const point = faces[0].reduce(
      (sum, vertexIndex) => [
        sum[0] + polygon[vertexIndex][0] / 3,
        sum[1] + polygon[vertexIndex][1] / 3,
      ],
      [0, 0],
    );
    const expectedLift = GROUND_EPSILON + surface.liftOffset;
    if (Math.abs(liftAtLocalPoint(point) - expectedLift) > 1e-7) {
      throw new Error(`checker navigation lift ${index} is incorrect`);
    }
  });

  return {
    curbTransitionSamples,
    surfaceCount: navigation.walkableSurfaces.length,
  };
}

function validateWestFrontageSurfaceDefinition() {
  const frontage = ALUN_ALUN_WEST_FRONTAGE_DEFINITION;
  const pegadaian = ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION;
  const westernUnion = ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE;
  const sidewalkWidth = frontage.sidewalkWidth;
  const ownershipOffset = 0.002;
  const pointOnPolygonBoundary = (point, polygon, epsilon = 1e-8) =>
    polygon.some((start, index) =>
      pointOnSegment2D(
        point,
        start,
        polygon[(index + 1) % polygon.length],
        epsilon,
      ),
    );
  const pointInsideOrOnPolygon = (point, polygon, epsilon = 1e-8) =>
    pointInsidePolygon(point, polygon) ||
    pointOnPolygonBoundary(point, polygon, epsilon);

  const sourceMap = JSON.parse(readFileSync(SITUBONDO_MAP_URL, "utf8"));
  const sourceRoad102 = sourceMap.roads?.[102];
  const sourceRoad103 = sourceMap.roads?.[103];
  const decodeRoadCenterline = (road) => {
    const points = [];
    for (let index = 0; index < road[2].length; index += 2) {
      points.push([
        road[2][index + 1] /
          sourceMap.coordinatePrecision /
          MAP_METERS_PER_WORLD_UNIT,
        road[2][index] /
          sourceMap.coordinatePrecision /
          MAP_METERS_PER_WORLD_UNIT,
      ]);
    }
    return points;
  };
  if (
    sourceMap.coordinatePrecision <= 0 ||
    sourceRoad102?.[0] !== 0 ||
    sourceRoad103?.[0] !== 0 ||
    sourceRoad102?.[1] !== 110 ||
    sourceRoad103?.[1] !== 110 ||
    sourceRoad102[1] / 10 !== 11 ||
    sourceRoad103[1] / 10 !== 11 ||
    sourceRoad102[2].slice(-2).some(
      (coordinate, index) => coordinate !== sourceRoad103[2][index],
    )
  ) {
    throw new Error(
      "source roads 102 and 103 must remain joined 11-metre Jalan Jenderal Achmad Yani sections",
    );
  }
  const decodedRoad103 = decodeRoadCenterline(sourceRoad103);
  if (
    decodedRoad103.length !== ALUN_ALUN_WEST_SHARED_ROAD_PATH.length ||
    decodedRoad103.some(
      (point, index) =>
        !samePoint(point, ALUN_ALUN_WEST_SHARED_ROAD_PATH[index]),
    ) ||
    !samePoint(
      decodeRoadCenterline(sourceRoad102).at(-1),
      ALUN_ALUN_WEST_SHARED_ROAD_PATH[0],
    ) ||
    Math.abs(ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH - 2.2) > 1e-12 ||
    Math.abs(ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH - 1.32) >
      1e-12 ||
    Math.abs(pegadaian.coreWidth - 1.04) > 1e-12
  ) {
    throw new Error(
      "frontage road widths must stay 11.0 m shared / 6.6 m split / 5.2 m Pegadaian",
    );
  }

  if (
    Math.abs(sidewalkWidth - ALUN_ALUN_FRONTAGE_SIDEWALK_WIDTH) > 1e-12 ||
    Math.abs(sidewalkWidth - 0.2) > 1e-12 ||
    Math.abs(frontage.curbDepth - ALUN_ALUN_FRONTAGE_CURB_DEPTH) > 1e-12 ||
    Math.abs(frontage.curbHeight - ALUN_ALUN_FRONTAGE_CURB_HEIGHT) > 1e-12 ||
    Math.abs(frontage.curbDepth - 0.03) > 1e-12 ||
    Math.abs(frontage.curbHeight - 0.03) > 1e-12 ||
    Math.abs(
      frontage.roadsideBandWidth -
        (frontage.curbDepth + frontage.sidewalkWidth),
    ) > 1e-12 ||
    Math.abs(
      frontage.roadsideBandWidth - ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH,
    ) > 1e-12 ||
    Math.abs(frontage.roadsideBandWidth - 0.23) > 1e-12 ||
    ![
      ALUN_ALUN_ROAD_SURFACE_Y,
      ALUN_ALUN_FRONTAGE_APRON_Y,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    ].every(isFiniteNumber) ||
    ALUN_ALUN_FRONTAGE_APRON_Y <= ALUN_ALUN_ROAD_SURFACE_Y ||
    ALUN_ALUN_FRONTAGE_SIDEWALK_Y < ALUN_ALUN_FRONTAGE_APRON_Y ||
    ALUN_ALUN_FRONTAGE_SIDEWALK_Y - ALUN_ALUN_ROAD_SURFACE_Y >
      MAX_WALKABLE_STEP_HEIGHT
  ) {
    throw new Error(
      "frontage needs a 15 cm curb followed by an exact one-metre clear, walkably raised tread",
    );
  }

  validateFiniteSimplePolygon("western Ahmad Yani asphalt union", westernUnion);
  if (
    westernUnion.length !== 37 ||
    frontage.branchRoadsideSeam.length !==
      frontage.branchSidewalkOuterBoundary.length ||
    frontage.ahmadYaniRoadsideSeam.length !==
      frontage.ahmadYaniSidewalkOuterBoundary.length ||
    pegadaian.oppositeSidewalkInnerBoundary.length !==
      pegadaian.oppositeSidewalkOuterBoundary.length ||
    frontage.branchRoadsideSeam.length !== 3 ||
    frontage.ahmadYaniRoadsideSeam.length !== 4 ||
    pegadaian.oppositeSidewalkInnerBoundary.length !== 4
  ) {
    throw new Error(
      "frontage no longer describes one 37-point asphalt union and the three surveyed footway bands",
    );
  }

  const polygonDefinitions = [
    ["western Ahmad Yani asphalt union", westernUnion],
    ["Pegadaian branch sidewalk", frontage.branchSidewalkOutline],
    ["Ahmad Yani sidewalk", frontage.ahmadYaniSidewalkOutline],
    ["Pegadaian opposite sidewalk", pegadaian.oppositeSidewalkOutline],
    ...frontage.propertyAprons.map((apron) => [apron.label, apron.outline]),
  ];
  polygonDefinitions.forEach(([label, polygon]) =>
    validateFiniteSimplePolygon(label, polygon),
  );

  const validateBandOutline = (
    label,
    innerBoundary,
    outerBoundary,
    outline,
  ) => {
    const expectedOutline = [
      ...innerBoundary,
      ...[...outerBoundary].reverse(),
    ];
    if (
      outline.length !== expectedOutline.length ||
      outline.some((point, index) =>
        !samePoint(point, expectedOutline[index]),
      )
    ) {
      throw new Error(`${label} outline diverges from its shared boundaries`);
    }
  };
  validateBandOutline(
    "Pegadaian branch sidewalk",
    frontage.branchRoadsideSeam,
    frontage.branchSidewalkOuterBoundary,
    frontage.branchSidewalkOutline,
  );
  validateBandOutline(
    "Ahmad Yani sidewalk",
    frontage.ahmadYaniRoadsideSeam,
    frontage.ahmadYaniSidewalkOuterBoundary,
    frontage.ahmadYaniSidewalkOutline,
  );
  validateBandOutline(
    "Pegadaian opposite sidewalk",
    pegadaian.oppositeSidewalkInnerBoundary,
    pegadaian.oppositeSidewalkOuterBoundary,
    pegadaian.oppositeSidewalkOutline,
  );
  if (
    !samePoint(
      frontage.branchRoadsideSeam.at(-1),
      frontage.ahmadYaniRoadsideSeam[0],
    ) ||
    !samePoint(
      frontage.branchSidewalkOuterBoundary.at(-1),
      frontage.ahmadYaniSidewalkOuterBoundary[0],
    )
  ) {
    throw new Error(
      "the Pegadaian and Ahmad Yani sidewalks must share both exact corner vertices",
    );
  }

  let clearTreadSamples = 0;
  let curbDepthSamples = 0;
  const validateBandWidths = (
    label,
    innerBoundary,
    outerBoundary,
    curbCenterline,
    expectedWidths,
    { miterPointIndexes = [], returnSegmentIndex = -1 } = {},
  ) => {
    if (
      expectedWidths.length !== innerBoundary.length ||
      curbCenterline.length !== innerBoundary.length
    ) {
      throw new Error(`${label} width definition is incomplete`);
    }
    for (let index = 0; index < innerBoundary.length - 1; index += 1) {
      const start = innerBoundary[index];
      const end = innerBoundary[index + 1];
      const delta = [end[0] - start[0], end[1] - start[1]];
      const length = Math.hypot(...delta);
      if (length <= 1e-8) {
        throw new Error(`${label} has a zero-length segment ${index}`);
      }
      const normal = [-delta[1] / length, delta[0] / length];
      const startOffset = [
        outerBoundary[index][0] - start[0],
        outerBoundary[index][1] - start[1],
      ];
      const endOffset = [
        outerBoundary[index + 1][0] - end[0],
        outerBoundary[index + 1][1] - end[1],
      ];
      const startWidth = dot(startOffset, normal);
      const endWidth = dot(endOffset, normal);
      if (startWidth * endWidth <= 0) {
        throw new Error(`${label} flips sides at segment ${index}`);
      }
      const widths = [Math.abs(startWidth), Math.abs(endWidth)];
      const expected = [expectedWidths[index], expectedWidths[index + 1]];
      const endpointDistances = [index, index + 1].map((pointIndex) =>
        pointDistance(innerBoundary[pointIndex], outerBoundary[pointIndex]),
      );
      if (
        endpointDistances.some(
          (width, pointIndex) =>
            !miterPointIndexes.includes(index + pointIndex) &&
            Math.abs(width - expected[pointIndex]) > 0.00002,
        ) ||
        (index === returnSegmentIndex
          ? widths[1] <= widths[0]
          : widths.some(
              (width, pointIndex) =>
                Math.abs(width - expected[pointIndex]) > 0.002,
            ))
      ) {
        throw new Error(
          `${label} total curb+tread width diverges at segment ${index}`,
        );
      }
      [index, index + 1].forEach((pointIndex, localIndex) => {
        const curbOffset = [
          curbCenterline[pointIndex][0] - innerBoundary[pointIndex][0],
          curbCenterline[pointIndex][1] - innerBoundary[pointIndex][1],
        ];
        if (
          (!miterPointIndexes.includes(pointIndex) &&
            Math.abs(Math.hypot(...curbOffset) - frontage.curbDepth * 0.5) >
              1e-8) ||
          (index !== returnSegmentIndex &&
            Math.abs(
              Math.abs(dot(curbOffset, normal)) -
                frontage.curbDepth * 0.5,
            ) > 0.00015)
        ) {
          throw new Error(
            `${label} curb is not centred in its 15 cm roadside strip at segment ${index}`,
          );
        }
        curbDepthSamples += 1;
        if (
          Math.abs(expectedWidths[pointIndex] - frontage.roadsideBandWidth) <=
          1e-8
        ) {
          if (
            Math.abs(
              (miterPointIndexes.includes(pointIndex)
                ? widths[localIndex]
                : endpointDistances[localIndex]) -
                frontage.curbDepth -
                sidewalkWidth,
            ) > (miterPointIndexes.includes(pointIndex) ? 0.002 : 1e-8)
          ) {
            throw new Error(
              `${label} clear tread is not exactly one metre after its curb`,
            );
          }
          clearTreadSamples += 1;
        }
      });
    }
  };
  validateBandWidths(
    "Pegadaian branch sidewalk",
    frontage.branchRoadsideSeam,
    frontage.branchSidewalkOuterBoundary,
    frontage.branchCurbCenterline,
    [0.326, frontage.roadsideBandWidth, frontage.roadsideBandWidth],
    { miterPointIndexes: [2] },
  );
  validateBandWidths(
    "Ahmad Yani sidewalk",
    frontage.ahmadYaniRoadsideSeam,
    frontage.ahmadYaniSidewalkOuterBoundary,
    frontage.ahmadYaniCurbCenterline,
    frontage.ahmadYaniRoadsideSeam.map(() => frontage.roadsideBandWidth),
    { miterPointIndexes: [0] },
  );
  validateBandWidths(
    "Pegadaian opposite sidewalk",
    pegadaian.oppositeSidewalkInnerBoundary,
    pegadaian.oppositeSidewalkOuterBoundary,
    pegadaian.oppositeCurbCenterline,
    [0.326, frontage.roadsideBandWidth, frontage.roadsideBandWidth, 0.456],
    { returnSegmentIndex: 2 },
  );

  if (
    !Array.isArray(pegadaian.path) ||
    pegadaian.path.length !== 2 ||
    Math.abs(pegadaian.coreWidth - 1.04) > 1e-12 ||
    !samePoint(
      pegadaian.path[0],
      [
        (pegadaian.surfaceOutline[0][0] +
          pegadaian.surfaceOutline.at(-1)[0]) * 0.5,
        (pegadaian.surfaceOutline[0][1] +
          pegadaian.surfaceOutline.at(-1)[1]) * 0.5,
      ],
    ) ||
    Math.abs(
      pointDistance(
        pegadaian.surfaceOutline[0],
        pegadaian.surfaceOutline.at(-1),
      ) - pegadaian.coreWidth,
    ) > 1e-8
  ) {
    throw new Error(
      "straight Pegadaian suffix must retain its 5.2 m core at the generated-road join",
    );
  }

  westernUnion.forEach((point, pointIndex) => {
    if (
      pointInsidePolygon(point, ALUN_ALUN_PARK_OUTLINE) &&
      !pointOnPolygonBoundary(point, ALUN_ALUN_PARK_OUTLINE)
    ) {
      throw new Error(
        `western asphalt union vertex ${pointIndex} enters the ceramic park`,
      );
    }
  });
  let unionExteriorSamples = 0;
  polygonTriangles("western Ahmad Yani asphalt union", westernUnion).forEach(
    (triangle) => {
      const subdivisions = 14;
      for (let first = 1; first < subdivisions; first += 1) {
        for (let second = 1; second < subdivisions - first; second += 1) {
          const third = subdivisions - first - second;
          const point = [
            (triangle[0][0] * first +
              triangle[1][0] * second +
              triangle[2][0] * third) /
              subdivisions,
            (triangle[0][1] * first +
              triangle[1][1] * second +
              triangle[2][1] * third) /
              subdivisions,
          ];
          if (pointInsidePolygon(point, ALUN_ALUN_PARK_OUTLINE)) {
            throw new Error("western asphalt union crosses inside the blue curb");
          }
          unionExteriorSamples += 1;
        }
      }
    },
  );

  const mainEastboundPoints =
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainEastbound.points;
  const shopSideRoadPath = [
    mainEastboundPoints[2],
    mainEastboundPoints[3],
    mainEastboundPoints[4],
    mainEastboundPoints[6],
  ];
  const coreRoadGeometries = [
    [
      "11 m shared Ahmad Yani core",
      createAlunAlunRoadRibbonGeometry(
        ALUN_ALUN_WEST_SHARED_ROAD_PATH,
        ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH,
      ),
    ],
    [
      "6.6 m park-side split core",
      createAlunAlunRoadRibbonGeometry(
        ALUN_ALUN_WEST_PARK_SIDE_CARRIAGEWAY_PATH,
        ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH,
      ),
    ],
    [
      "6.6 m shop-side split core",
      createAlunAlunRoadRibbonGeometry(
        shopSideRoadPath,
        ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH,
      ),
    ],
  ];
  let coreCoverageSamples = 0;
  const validateGeometryInsideUnion = (label, geometry) => {
    const positions = geometry.getAttribute("position");
    const indices = geometry.getIndex();
    for (let offset = 0; offset < indices.count; offset += 3) {
      const triangle = [0, 1, 2].map((corner) => {
        const vertex = indices.getX(offset + corner);
        return [positions.getX(vertex), positions.getZ(vertex)];
      });
      const subdivisions = 12;
      for (let first = 1; first < subdivisions; first += 1) {
        for (let second = 1; second < subdivisions - first; second += 1) {
          const third = subdivisions - first - second;
          const point = [
            (triangle[0][0] * first +
              triangle[1][0] * second +
              triangle[2][0] * third) /
              subdivisions,
            (triangle[0][1] * first +
              triangle[1][1] * second +
              triangle[2][1] * third) /
              subdivisions,
          ];
          if (!pointInsideOrOnPolygon(point, westernUnion)) {
            throw new Error(`${label} escapes the western asphalt union`);
          }
          coreCoverageSamples += 1;
        }
      }
    }
  };
  try {
    coreRoadGeometries.forEach(([label, geometry]) =>
      validateGeometryInsideUnion(label, geometry),
    );
  } finally {
    coreRoadGeometries.forEach(([, geometry]) => geometry.dispose());
  }
  polygonTriangles("Pegadaian clipped road core", pegadaian.surfaceOutline)
    .forEach((triangle) => {
      const point = [
        (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3,
        (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3,
      ];
      if (!pointInsideOrOnPolygon(point, westernUnion)) {
        throw new Error("Pegadaian clipped road core escapes the asphalt union");
      }
      coreCoverageSamples += 1;
    });

  let trafficEnvelopeSamples = 0;
  [
    ["mainEastbound", mainEastboundPoints.slice(0, 11)],
    [
      "mainWestbound",
      ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainWestbound.points.slice(8),
    ],
  ].forEach(([name, points]) => {
    const route = buildRoute(name, { points, stopIndex: 0 });
    sampleRoute(route).forEach((sample) => {
      const envelope = vehiclePolygon(
        sample,
        ROUTE_SWEPT_HALF_LENGTHS[name],
        ROUTE_SWEPT_HALF_WIDTHS[name],
      );
      if (envelope.some((point) => !pointInsideOrOnPolygon(point, westernUnion))) {
        throw new Error(
          `${name} swept envelope escapes the western asphalt union at ` +
            `north/east ${sample.north.toFixed(3)}/${sample.east.toFixed(3)}`,
        );
      }
      trafficEnvelopeSamples += 1;
    });
  });

  const polygonsHaveInteriorOverlap = (first, second) => {
    for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
      const firstEnd = first[(firstIndex + 1) % first.length];
      for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
        const secondEnd = second[(secondIndex + 1) % second.length];
        const firstCrossStart = cross2D(first[firstIndex], firstEnd, second[secondIndex]);
        const firstCrossEnd = cross2D(first[firstIndex], firstEnd, secondEnd);
        const secondCrossStart = cross2D(second[secondIndex], secondEnd, first[firstIndex]);
        const secondCrossEnd = cross2D(second[secondIndex], secondEnd, firstEnd);
        const firstStraddles =
          (firstCrossStart > 1e-8 && firstCrossEnd < -1e-8) ||
          (firstCrossStart < -1e-8 && firstCrossEnd > 1e-8);
        const secondStraddles =
          (secondCrossStart > 1e-8 && secondCrossEnd < -1e-8) ||
          (secondCrossStart < -1e-8 && secondCrossEnd > 1e-8);
        if (firstStraddles && secondStraddles) {
          return true;
        }
      }
    }
    return (
      first.some(
        (point) =>
          pointInsidePolygon(point, second) &&
          !pointOnPolygonBoundary(point, second),
      ) ||
      second.some(
        (point) =>
          pointInsidePolygon(point, first) &&
          !pointOnPolygonBoundary(point, first),
      )
    );
  };

  const apronIds = new Set();
  frontage.propertyAprons.forEach((apron, index) => {
    if (
      !apron.id ||
      apronIds.has(apron.id) ||
      !apron.label ||
      !apron.material ||
      apron.height !== ALUN_ALUN_FRONTAGE_APRON_Y
    ) {
      throw new Error(`frontage apron ${index + 1} has invalid metadata`);
    }
    apronIds.add(apron.id);
    if (
      polygonsHaveInteriorOverlap(apron.outline, westernUnion) ||
      [
        frontage.branchSidewalkOutline,
        frontage.ahmadYaniSidewalkOutline,
        pegadaian.oppositeSidewalkOutline,
      ].some((sidewalk) => polygonsHaveInteriorOverlap(apron.outline, sidewalk))
    ) {
      throw new Error(`${apron.label} overlaps the road or clear sidewalk`);
    }
    frontage.propertyAprons.slice(index + 1).forEach((other) => {
      if (polygonsHaveInteriorOverlap(apron.outline, other.outline)) {
        throw new Error(`${apron.label} overlaps ${other.label}`);
      }
    });
  });
  const planetBanAprons = frontage.propertyAprons.filter(
    (apron) => apron.id === "planet-ban",
  );
  if (
    planetBanAprons.length !== 1 ||
    planetBanAprons[0].material !== "redTile"
  ) {
    throw new Error("Planet Ban must retain its distinct red-tile forecourt");
  }

  const validateSharedBoundaryOwnership = (
    label,
    boundary,
    firstContains,
    secondContains,
  ) => {
    let sampleTotal = 0;
    boundary.slice(0, -1).forEach((start, segmentIndex) => {
      const end = boundary[segmentIndex + 1];
      const delta = [end[0] - start[0], end[1] - start[1]];
      const length = Math.hypot(...delta);
      const normal = [-delta[1] / length, delta[0] / length];
      const sampleCount = Math.max(1, Math.ceil(length / SAMPLE_SPACING));
      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        const amount = (sampleIndex + 0.5) / sampleCount;
        const midpoint = [
          start[0] + delta[0] * amount,
          start[1] + delta[1] * amount,
        ];
        const plus = [
          midpoint[0] + normal[0] * ownershipOffset,
          midpoint[1] + normal[1] * ownershipOffset,
        ];
        const minus = [
          midpoint[0] - normal[0] * ownershipOffset,
          midpoint[1] - normal[1] * ownershipOffset,
        ];
        const plusOwners = [firstContains(plus), secondContains(plus)];
        const minusOwners = [firstContains(minus), secondContains(minus)];
        const valid =
          (plusOwners[0] &&
            !plusOwners[1] &&
            !minusOwners[0] &&
            minusOwners[1]) ||
          (!plusOwners[0] &&
            plusOwners[1] &&
            minusOwners[0] &&
            !minusOwners[1]);
        if (!valid) {
          throw new Error(
            `${label} has a gap or overlap at segment ${segmentIndex}, sample ${sampleIndex}`,
          );
        }
        sampleTotal += 1;
      }
    });
    return sampleTotal;
  };

  let ownershipSamples = 0;
  [
    [
      "Pegadaian branch asphalt/sidewalk seam",
      frontage.branchRoadsideSeam,
      frontage.branchSidewalkOutline,
    ],
    [
      "Ahmad Yani asphalt/sidewalk seam",
      frontage.ahmadYaniRoadsideSeam,
      frontage.ahmadYaniSidewalkOutline,
    ],
    [
      "Pegadaian opposite asphalt/sidewalk seam",
      pegadaian.oppositeSidewalkInnerBoundary,
      pegadaian.oppositeSidewalkOutline,
    ],
  ].forEach(([label, boundary, sidewalk]) => {
    ownershipSamples += validateSharedBoundaryOwnership(
      label,
      boundary,
      (point) => pointInsidePolygon(point, westernUnion),
      (point) => pointInsidePolygon(point, sidewalk),
    );
  });

  const perimeterFill = ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE;
  const clippedFillSeam = [perimeterFill.at(-1), perimeterFill[0]];
  if (
    !samePoint(clippedFillSeam[0], westernUnion[3]) ||
    !pointOnSegment2D(clippedFillSeam[1], westernUnion[2], westernUnion[3]) ||
    polygonsHaveInteriorOverlap(perimeterFill, westernUnion)
  ) {
    throw new Error(
      "west-south park fill must be clipped exactly against the western asphalt union",
    );
  }
  ownershipSamples += validateSharedBoundaryOwnership(
    "western union/west-south fill seam",
    clippedFillSeam,
    (point) => pointInsidePolygon(point, westernUnion),
    (point) => pointInsidePolygon(point, perimeterFill),
  );

  const rectanglePolygon = (definition) => {
    const envelope = obstacleEnvelope(definition);
    const width = envelope.widthAxis.map(
      (value) => value * envelope.halfWidth,
    );
    const depth = envelope.depthAxis.map(
      (value) => value * envelope.halfDepth,
    );
    return [
      [
        envelope.center[0] - width[0] - depth[0],
        envelope.center[1] - width[1] - depth[1],
      ],
      [
        envelope.center[0] + width[0] - depth[0],
        envelope.center[1] + width[1] - depth[1],
      ],
      [
        envelope.center[0] + width[0] + depth[0],
        envelope.center[1] + width[1] + depth[1],
      ],
      [
        envelope.center[0] - width[0] + depth[0],
        envelope.center[1] - width[1] + depth[1],
      ],
    ];
  };
  const expectedCollisionBoxes = [
    {
      label: "Planet Ban",
      north: 26.04,
      east: 4.7,
      width: 4.8,
      depth: 3.21,
    },
    {
      label: "frontage blue office",
      north: 25.7,
      east: 6.9,
      width: 2.8,
      depth: 1.09,
    },
    {
      label: "frontage beige row",
      north: 25.85,
      east: 9.65,
      width: 2.95,
      depth: 4.4,
    },
  ];
  const resolvedCollisionBoxes = expectedCollisionBoxes.map((expected) => {
    const actual = ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES.find(
      (obstacle) => obstacle.label === expected.label,
    );
    if (
      !actual ||
      ["north", "east", "width", "depth"].some(
        (key) => Math.abs(actual[key] - expected[key]) > 1e-12,
      ) ||
      (actual.yaw ?? 0) !== 0
    ) {
      throw new Error(`${expected.label} footprint constraint has changed`);
    }
    return actual;
  });
  const footprintDefinitions = [
    {
      label: "Kantor Pos",
      apronIds: ["post-west-annex", "post-office-entry"],
      polygon: rectanglePolygon({
        north: 25.1,
        east: 0.42,
        width: 4.65,
        depth: 5.25,
      }),
    },
    {
      label: "Planet Ban",
      apronIds: ["planet-ban"],
      polygon: rectanglePolygon(resolvedCollisionBoxes[0]),
    },
    {
      label: "frontage blue office",
      apronIds: ["blue-office"],
      polygon: rectanglePolygon(resolvedCollisionBoxes[1]),
    },
    {
      label: "frontage beige row",
      apronIds: ["pos-90-west-bay", "pos-90-centre-bay", "pos-90-east-bay"],
      polygon: rectanglePolygon(resolvedCollisionBoxes[2]),
    },
    {
      label: "Pegadaian OSM footprint",
      apronIds: ["pegadaian"],
      polygon: [
        [22.86, -25.26],
        [22.56, -19.78],
        [19.42, -19.94],
        [19.7, -25.42],
      ],
    },
  ];
  const sidewalkPolygons = [
    frontage.branchSidewalkOutline,
    frontage.ahmadYaniSidewalkOutline,
    pegadaian.oppositeSidewalkOutline,
  ];
  let minimumApronClearance = Infinity;
  let minimumSidewalkClearance = Infinity;
  footprintDefinitions.forEach(({ label, apronIds: ids, polygon }) => {
    validateFiniteSimplePolygon(`${label} footprint`, polygon);
    const assignedAprons = ids.map((id) =>
      frontage.propertyAprons.find((apron) => apron.id === id),
    );
    if (assignedAprons.some((apron) => !apron)) {
      throw new Error(`${label} is missing its property-specific frontage apron`);
    }
    const apronClearance = Math.min(
      ...assignedAprons.map((apron) => polygonClearance(apron.outline, polygon)),
    );
    const sidewalkClearance = Math.min(
      ...sidewalkPolygons.map((sidewalk) => polygonClearance(sidewalk, polygon)),
    );
    if (apronClearance > 0.5) {
      throw new Error(
        `${label} apron is ${formatDistance(apronClearance)} from its surveyed frontage`,
      );
    }
    if (sidewalkClearance < RIDER_COLLISION_RADIUS) {
      throw new Error(`${label} footprint encroaches on the clear sidewalk`);
    }
    minimumApronClearance = Math.min(minimumApronClearance, apronClearance);
    minimumSidewalkClearance = Math.min(
      minimumSidewalkClearance,
      sidewalkClearance,
    );
  });

  return {
    clearTreadSamples,
    coreCoverageSamples,
    curbDepthSamples,
    footprintCount: footprintDefinitions.length,
    minimumApronClearance,
    minimumSidewalkClearance,
    ownershipSamples,
    sidewalkWidth,
    trafficEnvelopeSamples,
    unionExteriorSamples,
  };
}

function validateWestLocalCorridorDefinition() {
  const asphaltInfill = ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE;
  const roadsideSeam = ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM;
  const curbCenterline = ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE;
  const clearTreadInner = ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER;
  const sidewalkOuter = ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER;
  const sidewalkOutline = ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE;
  const clearTreadOutline = [
    ...clearTreadInner,
    ...[...sidewalkOuter].reverse(),
  ];
  const pointOnPolygonBoundary = (point, polygon, epsilon = 1e-8) =>
    polygon.some((start, index) =>
      pointOnSegment2D(
        point,
        start,
        polygon[(index + 1) % polygon.length],
        epsilon,
      ),
    );
  const pointInsideOrOnPolygon = (point, polygon) =>
    pointInsidePolygon(point, polygon) ||
    pointOnPolygonBoundary(point, polygon);
  const pointToPolygonBoundary = (point, polygon) =>
    polygon.reduce(
      (minimum, start, index) =>
        Math.min(
          minimum,
          pointSegmentDistance(
            point,
            start,
            polygon[(index + 1) % polygon.length],
          ),
        ),
      Infinity,
    );

  validateFiniteSimplePolygon(
    "KH Wahid Hasyim property-side asphalt infill",
    asphaltInfill,
    40,
  );
  validateFiniteSimplePolygon(
    "KH Wahid Hasyim curb-and-sidewalk band",
    sidewalkOutline,
    9,
  );
  validateFiniteSimplePolygon(
    "KH Wahid Hasyim 1.5-metre clear tread",
    clearTreadOutline,
    8,
  );
  const boundaryDefinitions = [
    ["roadside seam", roadsideSeam],
    ["curb centreline", curbCenterline],
    ["clear-tread inner boundary", clearTreadInner],
    ["sidewalk outer boundary", sidewalkOuter],
  ];
  if (
    asphaltInfill.length !== 5 ||
    boundaryDefinitions.some(
      ([, path]) =>
        !Array.isArray(path) ||
        path.length !== 2 ||
        path.some(
          (point) =>
            !Array.isArray(point) ||
            point.length !== 2 ||
            !point.every(isFiniteNumber),
        ) ||
        samePoint(path[0], path[1]),
    ) ||
    !samePoint(roadsideSeam[1], asphaltInfill.at(-2)) ||
    !pointOnSegment2D(
      asphaltInfill.at(-1),
      roadsideSeam[0],
      roadsideSeam[1],
      1e-8,
    )
  ) {
    throw new Error(
      "KH Wahid Hasyim asphalt and pedestrian boundaries must retain their exact shared frontage seam",
    );
  }
  const northClipStart = asphaltInfill[0];
  const northClipEnd = asphaltInfill.at(-1);
  for (let index = 0; index <= 100; index += 1) {
    const amount = index / 100;
    const point = [
      northClipStart[0] +
        (northClipEnd[0] - northClipStart[0]) * amount,
      northClipStart[1] +
        (northClipEnd[1] - northClipStart[1]) * amount,
    ];
    if (!pointOnPolygonBoundary(point, ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE)) {
      throw new Error(
        "KH Wahid Hasyim asphalt infill must remain clipped to the Ahmad Yani union boundary",
      );
    }
  }
  const northClipDelta = [
    northClipEnd[0] - northClipStart[0],
    northClipEnd[1] - northClipStart[1],
  ];
  const northClipLength = Math.hypot(...northClipDelta);
  const northClipNormal = [
    -northClipDelta[1] / northClipLength,
    northClipDelta[0] / northClipLength,
  ];
  for (let index = 1; index < 100; index += 1) {
    const amount = index / 100;
    const boundaryPoint = [
      northClipStart[0] +
        (northClipEnd[0] - northClipStart[0]) * amount,
      northClipStart[1] +
        (northClipEnd[1] - northClipStart[1]) * amount,
    ];
    const owners = [-1, 1].map((side) => {
      const sample = [
        boundaryPoint[0] + northClipNormal[0] * side * 0.002,
        boundaryPoint[1] + northClipNormal[1] * side * 0.002,
      ];
      return [
        pointInsidePolygon(sample, asphaltInfill),
        pointInsidePolygon(sample, ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE),
      ];
    });
    if (
      owners.filter(([infillOwned]) => infillOwned).length !== 1 ||
      owners.filter(([, unionOwned]) => unionOwned).length !== 1 ||
      owners.some(([infillOwned, unionOwned]) => infillOwned && unionOwned)
    ) {
      throw new Error(
        "KH Wahid Hasyim and Ahmad Yani asphalt owners must meet without a coplanar overlap",
      );
    }
  }
  const expectedSidewalkOutline = [
    ...roadsideSeam,
    ...[...sidewalkOuter].reverse(),
  ];
  if (
    sidewalkOutline.length !== expectedSidewalkOutline.length ||
    sidewalkOutline.some(
      (point, index) => !samePoint(point, expectedSidewalkOutline[index]),
    )
  ) {
    throw new Error(
      "KH Wahid Hasyim navigation sidewalk must use the complete curb-and-tread outline",
    );
  }

  const seamDelta = [
    roadsideSeam[1][0] - roadsideSeam[0][0],
    roadsideSeam[1][1] - roadsideSeam[0][1],
  ];
  const seamLength = Math.hypot(...seamDelta);
  const seamTangent = [seamDelta[0] / seamLength, seamDelta[1] / seamLength];
  const propertyNormal = [-seamTangent[1], seamTangent[0]];
  if (
    Math.abs(ALUN_ALUN_WEST_PROPERTY_SIDEWALK_WIDTH - 0.3) > 1e-12 ||
    Math.abs(ALUN_ALUN_FRONTAGE_CURB_DEPTH - 0.03) > 1e-12 ||
    Math.abs(ALUN_ALUN_FRONTAGE_CURB_HEIGHT - 0.03) > 1e-12
  ) {
    throw new Error(
      "KH Wahid Hasyim must retain a 15 cm curb and 1.50 m clear sidewalk",
    );
  }
  roadsideSeam.forEach((seamPoint, index) => {
    const projectedOffset = (point) =>
      dot(
        [point[0] - seamPoint[0], point[1] - seamPoint[1]],
        propertyNormal,
      );
    const curbCenterOffset = projectedOffset(curbCenterline[index]);
    const clearInnerOffset = projectedOffset(clearTreadInner[index]);
    const outerOffset = projectedOffset(sidewalkOuter[index]);
    if (
      Math.abs(curbCenterOffset - ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5) >
        1e-8 ||
      Math.abs(clearInnerOffset - ALUN_ALUN_FRONTAGE_CURB_DEPTH) > 1e-8 ||
      Math.abs(
        outerOffset -
          ALUN_ALUN_FRONTAGE_CURB_DEPTH -
          ALUN_ALUN_WEST_PROPERTY_SIDEWALK_WIDTH,
      ) > 1e-8 ||
      Math.abs(
        outerOffset -
          clearInnerOffset -
          ALUN_ALUN_WEST_PROPERTY_SIDEWALK_WIDTH,
      ) > 1e-8
    ) {
      throw new Error(
        `KH Wahid Hasyim clear tread is not exactly 1.50 m after the curb at endpoint ${index}`,
      );
    }
  });

  const westRoadGeometry = createAlunAlunRoadRibbonGeometry(
    ALUN_ALUN_WEST_LOCAL_ROAD_PATH,
    ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH,
  );
  const positions = westRoadGeometry.getAttribute("position");
  const indices = westRoadGeometry.getIndex();
  const westRoadTriangles = [];
  for (let offset = 0; offset < indices.count; offset += 3) {
    westRoadTriangles.push(
      [0, 1, 2].map((corner) => {
        const vertex = indices.getX(offset + corner);
        return [positions.getX(vertex), positions.getZ(vertex)];
      }),
    );
  }
  const pointInsideTriangle = (point, triangle) => {
    const first = cross2D(triangle[0], triangle[1], point);
    const second = cross2D(triangle[1], triangle[2], point);
    const third = cross2D(triangle[2], triangle[0], point);
    return (
      (first >= -1e-8 && second >= -1e-8 && third >= -1e-8) ||
      (first <= 1e-8 && second <= 1e-8 && third <= 1e-8)
    );
  };
  const diskIntersectsTriangle = (center, radius, triangle) =>
    pointInsideTriangle(center, triangle) ||
    triangle.some((start, index) =>
      pointSegmentDistance(
        center,
        start,
        triangle[(index + 1) % triangle.length],
      ) <= radius + 1e-8,
    );
  const diskIntersectsPolygon = (center, radius, polygon) =>
    pointInsideOrOnPolygon(center, polygon) ||
    pointToPolygonBoundary(center, polygon) <= radius + 1e-8;
  const roadPolygons = [
    asphaltInfill,
    ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE,
    ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,
    ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline,
  ];
  const pointInsideCompleteWestAsphalt = (point) =>
    roadPolygons.some((polygon) => pointInsideOrOnPolygon(point, polygon)) ||
    westRoadTriangles.some((triangle) => pointInsideTriangle(point, triangle));
  const diskIntersectsCompleteWestAsphalt = (center, radius) =>
    roadPolygons.some((polygon) =>
      diskIntersectsPolygon(center, radius, polygon),
    ) ||
    westRoadTriangles.some((triangle) =>
      diskIntersectsTriangle(center, radius, triangle),
    );

  let greenEdgeSamples = 0;
  if (
    Math.abs(ALUN_ALUN_WEST_GREEN_EDGE_WIDTH - 0.25) > 1e-12 ||
    ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES.length !== 1 ||
    ALUN_ALUN_WEST_GREEN_EDGE_WHITE_LINES.length !==
      ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES.length
  ) {
    throw new Error(
      "the west park green edge must remain one continuous 1.25-metre painted asphalt band",
    );
  }
  ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES.forEach((outline, outlineIndex) => {
    validateFiniteSimplePolygon(
      `west park green edge ${outlineIndex + 1}`,
      outline,
      5,
    );
    if (outline.length < 6 || outline.length % 2 !== 0) {
      throw new Error(`west park green edge ${outlineIndex + 1} is incomplete`);
    }
    const boundaryPointCount = outline.length * 0.5;
    const innerBoundary = outline.slice(0, boundaryPointCount);
    const outerBoundary = outline.slice(boundaryPointCount).reverse();
    const whiteLine = ALUN_ALUN_WEST_GREEN_EDGE_WHITE_LINES[outlineIndex];
    if (
      !Array.isArray(whiteLine) ||
      whiteLine.length !== outerBoundary.length ||
      whiteLine.some(
        (point, pointIndex) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(isFiniteNumber) ||
          !samePoint(point, outerBoundary[pointIndex]),
      )
    ) {
      throw new Error(
        `west park green edge ${outlineIndex + 1} white line must follow its complete road-side boundary`,
      );
    }
    for (let segmentIndex = 0; segmentIndex < innerBoundary.length - 1; segmentIndex += 1) {
      const start = innerBoundary[segmentIndex];
      const end = innerBoundary[segmentIndex + 1];
      const delta = [end[0] - start[0], end[1] - start[1]];
      const length = Math.hypot(...delta);
      const normal = [-delta[1] / length, delta[0] / length];
      [segmentIndex, segmentIndex + 1].forEach((pointIndex) => {
        const offset = [
          outerBoundary[pointIndex][0] - innerBoundary[pointIndex][0],
          outerBoundary[pointIndex][1] - innerBoundary[pointIndex][1],
        ];
        if (
          Math.abs(
            Math.abs(dot(offset, normal)) - ALUN_ALUN_WEST_GREEN_EDGE_WIDTH,
          ) > 1e-8
        ) {
          throw new Error(
            `west park green edge width diverges at segment ${segmentIndex}`,
          );
        }
      });
    }
    polygonTriangles(`west park green edge ${outlineIndex + 1}`, outline)
      .forEach((triangle) => {
        const subdivisions = 12;
        for (let first = 1; first < subdivisions; first += 1) {
          for (let second = 1; second < subdivisions - first; second += 1) {
            const third = subdivisions - first - second;
            const sample = [
              (triangle[0][0] * first +
                triangle[1][0] * second +
                triangle[2][0] * third) /
                subdivisions,
              (triangle[0][1] * first +
                triangle[1][1] * second +
                triangle[2][1] * third) /
                subdivisions,
            ];
            if (
              pointInsidePolygon(sample, ALUN_ALUN_PARK_OUTLINE) ||
              !pointInsideCompleteWestAsphalt(sample)
            ) {
              throw new Error(
                `west park green edge ${outlineIndex + 1} leaves asphalt or enters the park`,
              );
            }
            greenEdgeSamples += 1;
          }
        }
      });
  });

  const validateCenters = (label, centers, expectedCount) => {
    if (
      !Array.isArray(centers) ||
      centers.length !== expectedCount ||
      new Set(centers.map((point) => point.join(","))).size !== centers.length ||
      centers.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(isFiniteNumber),
      )
    ) {
      throw new Error(`${label} must retain ${expectedCount} unique finite centres`);
    }
  };
  validateCenters("west park tree row", ALUN_ALUN_WEST_PARK_TREE_CENTERS, 18);
  validateCenters(
    "west property tree row",
    ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS,
    8,
  );
  validateCenters("west utility row", ALUN_ALUN_WEST_UTILITY_SUPPORTS, 6);

  let minimumPlacementClearance = Infinity;
  let minimumParkTreeInnerClearance = Infinity;
  let minimumParkTreeRoadCurbClearance = Infinity;
  let maximumParkTreeRoadCurbClearance = -Infinity;
  const validateClearDisk = (label, center, radius) => {
    if (
      diskIntersectsCompleteWestAsphalt(center, radius) ||
      diskIntersectsPolygon(center, radius, clearTreadOutline)
    ) {
      throw new Error(`${label} footprint enters the road or clear sidewalk`);
    }
    const clearance = Math.min(
      ...roadPolygons.map(
        (polygon) => pointToPolygonBoundary(center, polygon) - radius,
      ),
      pointToPolygonBoundary(center, clearTreadOutline) - radius,
      ...westRoadTriangles.flatMap((triangle) =>
        triangle.map(
          (start, index) =>
            pointSegmentDistance(
              center,
              start,
              triangle[(index + 1) % triangle.length],
            ) - radius,
        ),
      ),
    );
    minimumPlacementClearance = Math.min(
      minimumPlacementClearance,
      clearance,
    );
  };
  ALUN_ALUN_WEST_PARK_TREE_CENTERS.forEach((center, index) => {
    const trunkBaseRadius = (1.3 + (index % 3) * 0.14) * 0.12 * 0.42;
    const treeWellRadius = 0.29;
    const footprintRadius = Math.max(trunkBaseRadius, treeWellRadius);
    const roadCurbClearance = pointToPolygonBoundary(
      center,
      ALUN_ALUN_PARK_OUTLINE,
    );
    const innerBoundaryClearance = pointToPolygonBoundary(
      center,
      ALUN_ALUN_PARK_LAWN_OUTLINE,
    );
    if (
      !pointInsidePolygon(center, ALUN_ALUN_PARK_OUTLINE) ||
      roadCurbClearance <= footprintRadius + 1e-8
    ) {
      throw new Error(
        `west park tree ${index + 1} footprint crosses the blue curb`,
      );
    }
    if (
      pointInsideOrOnPolygon(center, ALUN_ALUN_PARK_LAWN_OUTLINE) ||
      innerBoundaryClearance <= footprintRadius + 1e-8
    ) {
      throw new Error(
        `west park tree ${index + 1} footprint crosses the pedestrian ring's inner lawn boundary`,
      );
    }
    if (
      roadCurbClearance <= innerBoundaryClearance + 1e-8 ||
      roadCurbClearance < 2.5 - 1e-8 ||
      roadCurbClearance > 2.8 + 1e-8
    ) {
      throw new Error(
        `west park tree ${index + 1} must stay slightly beyond the pedestrian-ring midpoint toward its inner boundary`,
      );
    }
    minimumParkTreeInnerClearance = Math.min(
      minimumParkTreeInnerClearance,
      innerBoundaryClearance - footprintRadius,
    );
    minimumParkTreeRoadCurbClearance = Math.min(
      minimumParkTreeRoadCurbClearance,
      roadCurbClearance,
    );
    maximumParkTreeRoadCurbClearance = Math.max(
      maximumParkTreeRoadCurbClearance,
      roadCurbClearance,
    );
    validateClearDisk(`west park tree ${index + 1}`, center, footprintRadius);
  });
  ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS.forEach((center, index) => {
    const trunkBaseRadius = (1.42 + (index % 4) * 0.1) * 0.12 * 0.55;
    validateClearDisk(
      `west property tree ${index + 1}`,
      center,
      trunkBaseRadius,
    );
  });
  ALUN_ALUN_WEST_UTILITY_SUPPORTS.forEach((center, index) =>
    validateClearDisk(`west utility support ${index + 1}`, center, 0.035),
  );

  asphaltInfill.forEach((point, pointIndex) => {
    if (
      pointInsidePolygon(point, ALUN_ALUN_PARK_OUTLINE) &&
      !pointOnPolygonBoundary(point, ALUN_ALUN_PARK_OUTLINE)
    ) {
      throw new Error(
        `KH Wahid Hasyim asphalt infill vertex ${pointIndex} enters the park`,
      );
    }
  });
  let asphaltExteriorSamples = 0;
  polygonTriangles("KH Wahid Hasyim property-side asphalt infill", asphaltInfill)
    .forEach((triangle) => {
      const sample = [
        (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3,
        (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3,
      ];
      if (pointInsidePolygon(sample, ALUN_ALUN_PARK_OUTLINE)) {
        throw new Error("KH Wahid Hasyim asphalt infill enters the park");
      }
      asphaltExteriorSamples += 1;
    });

  const trafficSource = readFileSync(TRAFFIC_SOURCE_URL, "utf8");
  if (
    !/const ROAD_SURFACE_Y = ALUN_ALUN_ROAD_SURFACE_Y;/.test(trafficSource) ||
    !/const addRoadSurface = \(\s*points,\s*y = ROAD_SURFACE_Y,/s.test(
      trafficSource,
    ) ||
    !/const westPropertyAsphaltInfill = addRoadSurface\(\s*ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE,?\s*\);/s.test(
      trafficSource,
    ) ||
    !/const westPropertySidewalk = addRoadsideBand\(\s*ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER,\s*ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER,\s*ALUN_ALUN_FRONTAGE_SIDEWALK_Y,\s*pedestrianStone,?\s*\);/s.test(
      trafficSource,
    ) ||
    !/addSegmentedCurbAlongPath\(\s*ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE,\s*\[sidewalkCurbBlue, sidewalkCurbWhite\]/s.test(
      trafficSource,
    ) ||
    !/ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES\.forEach\(/.test(trafficSource) ||
    !/ALUN_ALUN_WEST_UTILITY_SUPPORTS\.map\(/.test(trafficSource) ||
    !/const westBenchYaw\s*=\s*-Math\.atan2\(\s*westParkEdgeDelta\[1\],\s*westParkEdgeDelta\[0\]\s*\)\s*\+\s*Math\.PI;/s.test(
      trafficSource,
    ) ||
    !/addParkBench\(\s*north,\s*east,\s*westBenchYaw,\s*`West park outward-facing bench \$\{index \+ 1\}`/s.test(
      trafficSource,
    )
  ) {
    throw new Error(
      "KH Wahid Hasyim asphalt, markings, sidewalk, curb, utilities, and west-facing park benches must retain their audited rendering",
    );
  }
  const landmarkSource = readFileSync(PRODUCTION_FLEET_SOURCE_URL, "utf8");
  if (
    !/ALUN_ALUN_WEST_PARK_TREE_CENTERS\.forEach\(/.test(landmarkSource) ||
    !/ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS\.forEach\(/.test(
      landmarkSource,
    )
  ) {
    throw new Error(
      "both surveyed KH Wahid Hasyim tree rows must render from their audited centres",
    );
  }
  const mosqueSource = readFileSync(MOSQUE_SOURCE_URL, "utf8");
  if (
    /label:\s*["']front sidewalk["']/.test(mosqueSource) ||
    !/label:\s*["']front forecourt["']/.test(mosqueSource)
  ) {
    throw new Error(
      "the mosque must keep only its property forecourt; the obsolete overlapping front-sidewalk box must stay removed",
    );
  }

  westRoadGeometry.dispose();
  return {
    asphaltExteriorSamples,
    greenEdgeSamples,
    minimumPlacementClearance,
    minimumParkTreeInnerClearance,
    minimumParkTreeRoadCurbClearance,
    maximumParkTreeRoadCurbClearance,
    parkTreeCount: ALUN_ALUN_WEST_PARK_TREE_CENTERS.length,
    propertyTreeCount: ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS.length,
    sidewalkWidth: ALUN_ALUN_WEST_PROPERTY_SIDEWALK_WIDTH,
    utilitySupportCount: ALUN_ALUN_WEST_UTILITY_SUPPORTS.length,
  };
}

function validateSouthCorridorDefinition() {
  const corridor = ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION;
  const approach = ALUN_ALUN_SOUTH_APPROACH_DEFINITION;
  const roadSurface = ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE;
  const pointOnPolygonBoundary = (point, polygon, epsilon = 1e-8) =>
    polygon.some((start, index) =>
      pointOnSegment2D(
        point,
        start,
        polygon[(index + 1) % polygon.length],
        epsilon,
      ),
    );
  const pointInsideOrOnPolygon = (point, polygon, epsilon = 1e-8) =>
    pointInsidePolygon(point, polygon) ||
    pointOnPolygonBoundary(point, polygon, epsilon);
  const pointToPolygonBoundary = (point, polygon) =>
    polygon.reduce(
      (minimum, start, index) =>
        Math.min(
          minimum,
          pointSegmentDistance(
            point,
            start,
            polygon[(index + 1) % polygon.length],
          ),
        ),
      Infinity,
    );
  const validateFinitePath = (label, path, expectedLength = null) => {
    if (
      !Array.isArray(path) ||
      path.length < 2 ||
      (expectedLength !== null && path.length !== expectedLength) ||
      path.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(isFiniteNumber),
      ) ||
      path.some((point, index) =>
        index > 0 ? samePoint(point, path[index - 1], 1e-10) : false,
      )
    ) {
      throw new Error(`${label} must be one finite, non-degenerate path`);
    }
  };

  if (
    Math.abs(ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH - 1.04) > 1e-12 ||
    Math.abs(ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH - 1.2272) > 1e-12
  ) {
    throw new Error(
      "Jalan Kartini must retain its exact 5.20 m traffic core and 6.136 m rendered road surface",
    );
  }
  validateFinitePath(
    "Jalan Kartini centreline",
    ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH,
    7,
  );

  const polygonDefinitions = [
    ["Jalan Kartini full-width road surface", roadSurface, 30],
    ["Jalan Kartini curb-and-sidewalk band", corridor.sidewalkOutline, 10],
    ["south-approach curb-and-sidewalk band", approach.sidewalkOutline, 2],
    ["south-approach frontage apron", approach.frontageApronOutline, 3],
    ...corridor.propertyAprons.map((apron) => [
      apron.label,
      apron.outline,
      0.2,
    ]),
  ];
  polygonDefinitions.forEach(([label, polygon, minimumArea]) =>
    validateFiniteSimplePolygon(label, polygon, minimumArea),
  );

  const validateRibbonWidth = (label, width) => {
    const geometry = createAlunAlunRoadRibbonGeometry(
      ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH,
      width,
    );
    try {
      const positions = geometry.getAttribute("position");
      if (positions.count !== ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH.length * 2) {
        throw new Error(`${label} has an incomplete rendered ribbon`);
      }
      ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH.forEach((point, index, path) => {
        const previous = path[Math.max(0, index - 1)];
        const next = path[Math.min(path.length - 1, index + 1)];
        const tangent = [next[0] - previous[0], next[1] - previous[1]];
        const tangentLength = Math.hypot(...tangent);
        const normal = [-tangent[1] / tangentLength, tangent[0] / tangentLength];
        const first = [
          positions.getX(index * 2),
          positions.getZ(index * 2),
        ];
        const second = [
          positions.getX(index * 2 + 1),
          positions.getZ(index * 2 + 1),
        ];
        const projectedWidth = Math.abs(
          dot([first[0] - second[0], first[1] - second[1]], normal),
        );
        const projectedCentreOffset = Math.abs(
          dot(
            [
              (first[0] + second[0]) * 0.5 - point[0],
              (first[1] + second[1]) * 0.5 - point[1],
            ],
            normal,
          ),
        );
        if (
          Math.abs(projectedWidth - width) > 2e-6 ||
          projectedCentreOffset > 2e-6
        ) {
          throw new Error(
            `${label} diverges from its surveyed width at station ${index}`,
          );
        }
      });
    } finally {
      geometry.dispose();
    }
  };
  validateRibbonWidth(
    "Jalan Kartini 5.20-metre traffic core",
    ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH,
  );
  validateRibbonWidth(
    "Jalan Kartini 6.136-metre road surface",
    ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH,
  );

  const boundarySets = [
    {
      label: "Jalan Kartini",
      seam: corridor.roadsideSeam,
      curb: corridor.curbCenterline,
      clearInner: corridor.clearTreadInner,
      outer: corridor.sidewalkOuterBoundary,
    },
    {
      label: "south approach",
      seam: approach.roadsideSeam,
      curb: approach.curbCenterline,
      clearInner: approach.clearTreadInner,
      outer: approach.sidewalkOuterBoundary,
    },
  ];
  if (
    Math.abs(corridor.curbDepth - 0.03) > 1e-12 ||
    Math.abs(corridor.curbHeight - 0.03) > 1e-12 ||
    Math.abs(corridor.sidewalkWidth - 0.3) > 1e-12 ||
    Math.abs(corridor.roadsideBandWidth - 0.33) > 1e-12 ||
    Math.abs(approach.sidewalkWidth - 0.3) > 1e-12 ||
    Math.abs(approach.roadsideBandWidth - 0.33) > 1e-12
  ) {
    throw new Error(
      "the south corridor must retain a 15 cm curb outside an exact 1.50 m clear tread",
    );
  }
  let clearTreadSamples = 0;
  boundarySets.forEach(
    ({ label, seam, curb, clearInner, outer }) => {
    [seam, curb, clearInner, outer].forEach((path) =>
      validateFinitePath(label, path, seam.length),
    );
    seam.forEach((seamPoint, index) => {
      const previous = seam[Math.max(0, index - 1)];
      const next = seam[Math.min(seam.length - 1, index + 1)];
      const tangent = [next[0] - previous[0], next[1] - previous[1]];
      const tangentLength = Math.hypot(...tangent);
      const candidateNormals = [
        [-tangent[1] / tangentLength, tangent[0] / tangentLength],
        [tangent[1] / tangentLength, -tangent[0] / tangentLength],
      ];
      const normal = candidateNormals.find(
        (candidate) =>
          dot(
            [
              clearInner[index][0] - seamPoint[0],
              clearInner[index][1] - seamPoint[1],
            ],
            candidate,
          ) > 0,
      );
      const projectedOffset = (point) =>
        dot(
          [point[0] - seamPoint[0], point[1] - seamPoint[1]],
          normal,
        );
      const curbOffset = projectedOffset(curb[index]);
      const clearInnerOffset = projectedOffset(clearInner[index]);
      const outerOffset = projectedOffset(outer[index]);
      if (
        Math.abs(curbOffset - corridor.curbDepth * 0.5) > 1e-8 ||
        Math.abs(clearInnerOffset - corridor.curbDepth) > 1e-8 ||
        Math.abs(outerOffset - corridor.roadsideBandWidth) > 1e-8 ||
        Math.abs(outerOffset - clearInnerOffset - corridor.sidewalkWidth) >
          1e-8
      ) {
        throw new Error(
          `${label} does not preserve its 15 cm curb and exact 1.50 m clear tread at station ${index}`,
        );
      }
      clearTreadSamples += 1;
    });
    },
  );

  for (const [label, westPath, southPath] of [
    [
      "roadside seam",
      ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM,
      corridor.roadsideSeam,
    ],
    [
      "curb centreline",
      ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE,
      corridor.curbCenterline,
    ],
    [
      "clear-tread inner boundary",
      ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER,
      corridor.clearTreadInner,
    ],
    [
      "sidewalk outer boundary",
      ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER,
      corridor.sidewalkOuterBoundary,
    ],
  ]) {
    if (!samePoint(westPath.at(-1), southPath[0])) {
      throw new Error(
        `KH Wahid Hasyim and Jalan Kartini ${label} must share one exact corner`,
      );
    }
  }

  const expectedAprons = [
    {
      id: "library-row",
      material: "paleConcrete",
      startIndex: 0,
      endIndex: 7,
    },
    {
      id: "pendopo-entry",
      material: "concrete",
      startIndex: 7,
      endIndex: 8,
    },
    {
      id: "pendopo-entry-extension",
      material: "concrete",
      parentId: "pendopo-entry",
    },
    {
      id: "east-civic-row",
      material: "paleConcrete",
      startIndex: 8,
      endIndex: corridor.sidewalkOuterBoundary.length - 1,
    },
  ];
  if (corridor.propertyAprons.length !== expectedAprons.length) {
    throw new Error(
      "Jalan Kartini must retain separate Library, Pendopo, and east-civic frontage aprons",
    );
  }
  expectedAprons.forEach((expected, apronIndex) => {
    const apron = corridor.propertyAprons[apronIndex];
    const ownedBoundary = Number.isInteger(expected.startIndex)
      ? corridor.sidewalkOuterBoundary.slice(
          expected.startIndex,
          expected.endIndex + 1,
        )
      : null;
    if (
      apron.id !== expected.id ||
      apron.material !== expected.material ||
      apron.height !== ALUN_ALUN_FRONTAGE_APRON_Y ||
      !apron.label ||
      (ownedBoundary &&
        (apron.outline.length < ownedBoundary.length + 2 ||
          ownedBoundary.some(
            (point, index) => !samePoint(point, apron.outline[index]),
          )))
    ) {
      throw new Error(
        `south frontage apron ${expected.id} no longer owns its exact property boundary`,
      );
    }
  });
  const standardAprons = [
    corridor.propertyAprons.find((apron) => apron.id === "library-row"),
    corridor.propertyAprons.find((apron) => apron.id === "pendopo-entry"),
    corridor.propertyAprons.find((apron) => apron.id === "east-civic-row"),
  ];
  if (
    !samePoint(standardAprons[0].outline[7], standardAprons[1].outline[0]) ||
    !samePoint(standardAprons[1].outline[1], standardAprons[2].outline[0])
  ) {
    throw new Error(
      "the Library, Pendopo, and east-civic aprons must meet continuously behind the sidewalk",
    );
  }
  const pendopoEntry = standardAprons[1];
  const pendopoExtension = corridor.propertyAprons.find(
    (apron) => apron.id === "pendopo-entry-extension",
  );
  if (
    !pendopoExtension ||
    !pendopoExtension.outline
      .slice(0, 2)
      .every((point) => pointOnPolygonBoundary(point, pendopoEntry.outline))
  ) {
    throw new Error(
      "the wall-aligned Pendopo apron must begin on the property edge of its public entrance apron",
    );
  }

  const validateUniqueCenters = (label, centers, expectedCount) => {
    if (
      !Array.isArray(centers) ||
      centers.length !== expectedCount ||
      new Set(centers.map((point) => point.join(","))).size !== centers.length ||
      centers.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(isFiniteNumber),
      )
    ) {
      throw new Error(`${label} must retain ${expectedCount} unique finite centres`);
    }
  };
  validateUniqueCenters(
    "south park inner-half tree row",
    ALUN_ALUN_SOUTH_PARK_TREE_CENTERS,
    14,
  );

  const gazeboStop = createStops().find((stop) => stop.kind === "gazebo");
  if (
    !gazeboStop ||
    Math.abs(gazeboStop.theta - 3.08) > 1e-12 ||
    Math.abs(gazeboStop.phi - 14.1) > 1e-12 ||
    Math.abs(gazeboStop.yaw + Math.PI * 0.46) > 1e-12 ||
    Math.abs((gazeboStop.scale ?? 1) - 1) > 1e-12
  ) {
    throw new Error(
      "the south tree opening must remain aligned with the surveyed Gazebo Situbondo stop",
    );
  }
  const gazeboCenter = [-gazeboStop.phi, gazeboStop.theta];
  const transformGazeboPoint = ([localX, localZ]) => {
    const cosine = Math.cos(gazeboStop.yaw);
    const sine = Math.sin(gazeboStop.yaw);
    return [
      gazeboCenter[0] + cosine * localX + sine * localZ,
      gazeboCenter[1] - sine * localX + cosine * localZ,
    ];
  };
  const gazeboRectangle = (x, z, width, depth) =>
    [
      [x - width * 0.5, z - depth * 0.5],
      [x + width * 0.5, z - depth * 0.5],
      [x + width * 0.5, z + depth * 0.5],
      [x - width * 0.5, z + depth * 0.5],
    ].map(transformGazeboPoint);
  const gazeboProtectedFootprints = [
    ["Gazebo navigation plinth", gazeboRectangle(0, 0, 6.7, 2.36)],
    ...Array.from({ length: 6 }, (_, index) => [
      `Gazebo stair ${index + 1}`,
      gazeboRectangle(
        0,
        1.53 - index * 0.14,
        2.44 - index * 0.045,
        0.2,
      ),
    ]),
    ["Gazebo roof", gazeboRectangle(0, 0, 6.82, 2.05)],
  ];
  gazeboProtectedFootprints.forEach(([label, polygon]) =>
    validateFiniteSimplePolygon(label, polygon, 0.1),
  );

  const treeWellRadius = 0.29;
  let minimumTreeCurbClearance = Infinity;
  let maximumTreeCurbClearance = -Infinity;
  let minimumTreeLawnClearance = Infinity;
  let minimumGazeboClearance = Infinity;
  ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.forEach((center, index) => {
    const curbDistance = pointToPolygonBoundary(center, ALUN_ALUN_PARK_OUTLINE);
    const lawnDistance = pointToPolygonBoundary(
      center,
      ALUN_ALUN_PARK_LAWN_OUTLINE,
    );
    if (
      !pointInsidePolygon(center, ALUN_ALUN_PARK_OUTLINE) ||
      pointInsideOrOnPolygon(center, ALUN_ALUN_PARK_LAWN_OUTLINE) ||
      curbDistance <= treeWellRadius + 1e-8 ||
      lawnDistance <= treeWellRadius + 1e-8 ||
      curbDistance <= lawnDistance + 1e-8
    ) {
      throw new Error(
        `south park tree ${index + 1} must remain completely in the pedestrian ring's inner half`,
      );
    }
    gazeboProtectedFootprints.forEach(([label, polygon]) => {
      const clearance = pointToPolygonBoundary(center, polygon) - treeWellRadius;
      if (pointInsideOrOnPolygon(center, polygon) || clearance <= 1e-8) {
        throw new Error(`south park tree ${index + 1} enters the ${label}`);
      }
      minimumGazeboClearance = Math.min(minimumGazeboClearance, clearance);
    });
    minimumTreeCurbClearance = Math.min(minimumTreeCurbClearance, curbDistance);
    maximumTreeCurbClearance = Math.max(maximumTreeCurbClearance, curbDistance);
    minimumTreeLawnClearance = Math.min(
      minimumTreeLawnClearance,
      lawnDistance - treeWellRadius,
    );
  });
  const westTreeHalf = ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.slice(0, 8);
  const eastTreeHalf = ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.slice(8);
  if (
    Math.min(...eastTreeHalf.map((point) => point[1])) -
      Math.max(...westTreeHalf.map((point) => point[1])) <
    8
  ) {
    throw new Error(
      "the south park tree row must preserve the broad ceremonial Gazebo opening",
    );
  }

  if (
    !Array.isArray(ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS) ||
    ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS.length !== 3
  ) {
    throw new Error("the south park edge must retain three south-facing benches");
  }
  const expectedBenchYaw = 1.7710468509;
  let minimumBenchTreeClearance = Infinity;
  ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS.forEach((definition, index) => {
    const { center, yaw } = definition;
    if (
      !Array.isArray(center) ||
      center.length !== 2 ||
      !center.every(isFiniteNumber) ||
      !isFiniteNumber(yaw) ||
      Math.abs(yaw - expectedBenchYaw) > 1e-10 ||
      -Math.sin(yaw) >= -0.95
    ) {
      throw new Error(`south park bench ${index + 1} must face south`);
    }
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    const footprint = [
      [-0.36, -0.12],
      [0.36, -0.12],
      [0.36, 0.12],
      [-0.36, 0.12],
    ].map(([localX, localZ]) => [
      center[0] + cosine * localX + sine * localZ,
      center[1] - sine * localX + cosine * localZ,
    ]);
    footprint.forEach((corner, cornerIndex) => {
      if (
        !pointInsideOrOnPolygon(corner, ALUN_ALUN_PARK_OUTLINE) ||
        pointInsideOrOnPolygon(corner, ALUN_ALUN_PARK_LAWN_OUTLINE)
      ) {
        throw new Error(
          `south park bench ${index + 1} corner ${cornerIndex + 1} leaves the pedestrian ring`,
        );
      }
    });
    const benchHalfDiagonal = Math.hypot(0.36, 0.12);
    ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.forEach((treeCenter) => {
      const clearance =
        pointDistance(center, treeCenter) - benchHalfDiagonal - treeWellRadius;
      if (clearance <= 1e-8) {
        throw new Error(`south park bench ${index + 1} collides with a tree well`);
      }
      minimumBenchTreeClearance = Math.min(
        minimumBenchTreeClearance,
        clearance,
      );
    });
  });

  const expectedPromenadeObstacleCount =
    ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.length +
    ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS.length;
  if (
    !Array.isArray(ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES) ||
    ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES.length !==
      expectedPromenadeObstacleCount
  ) {
    throw new Error(
      "every south promenade tree and bench must have one shared navigation obstacle",
    );
  }
  ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.forEach((center, index) => {
    const obstacle = ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES[index];
    if (
      obstacle.label !== `south promenade tree ${index + 1}` ||
      !samePoint([obstacle.north, obstacle.east], center) ||
      obstacle.width !== 0.16 ||
      obstacle.depth !== 0.16 ||
      obstacle.yaw !== undefined
    ) {
      throw new Error(
        `south promenade tree ${index + 1} collision does not match its rendered trunk`,
      );
    }
  });
  ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS.forEach((definition, index) => {
    const obstacle =
      ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES[
        ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.length + index
      ];
    if (
      obstacle.label !== `south-facing promenade bench ${index + 1}` ||
      !samePoint([obstacle.north, obstacle.east], definition.center) ||
      obstacle.width !== 0.76 ||
      obstacle.depth !== 0.3 ||
      obstacle.yaw !== definition.yaw
    ) {
      throw new Error(
        `south-facing promenade bench ${index + 1} collision does not match its rendered group`,
      );
    }
    const cosine = Math.cos(obstacle.yaw);
    const sine = Math.sin(obstacle.yaw);
    [
      [-obstacle.width * 0.5, -obstacle.depth * 0.5],
      [obstacle.width * 0.5, -obstacle.depth * 0.5],
      [obstacle.width * 0.5, obstacle.depth * 0.5],
      [-obstacle.width * 0.5, obstacle.depth * 0.5],
    ]
      .map(([localX, localZ]) => [
        obstacle.north + cosine * localX + sine * localZ,
        obstacle.east - sine * localX + cosine * localZ,
      ])
      .forEach((corner) => {
        if (
          !pointInsideOrOnPolygon(corner, ALUN_ALUN_PARK_OUTLINE) ||
          pointInsideOrOnPolygon(corner, ALUN_ALUN_PARK_LAWN_OUTLINE)
        ) {
          throw new Error(
            `south-facing promenade bench ${index + 1} collision leaves the pedestrian ring`,
          );
        }
      });
  });

  const trafficSource = readFileSync(TRAFFIC_SOURCE_URL, "utf8");
  const landmarkSource = readFileSync(PRODUCTION_FLEET_SOURCE_URL, "utf8");
  if (
    !/ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS\.forEach\(/.test(trafficSource) ||
    !/`South park south-facing bench \$\{index \+ 1\}`/.test(trafficSource) ||
    !/ALUN_ALUN_SOUTH_PARK_TREE_CENTERS\.forEach\(/.test(landmarkSource) ||
    !/group\.userData\.localObstacles\s*=\s*\[[\s\S]*\.\.\.ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES,/.test(
      landmarkSource,
    )
  ) {
    throw new Error(
      "the audited south trees and south-facing benches must remain connected to their renderers",
    );
  }

  const pendopoSource = readFileSync(PENDOPO_SOURCE_URL, "utf8");
  if (
    /\bconst\s+(?:road|paintedRoadLine|forecourt)\s*=\s*new THREE\.Mesh/.test(
      pendopoSource,
    ) ||
    /label:\s*["'](?:front road|forecourt)["']/.test(pendopoSource)
  ) {
    throw new Error(
      "Pendopo must not duplicate Jalan Kartini, its public curb, or its shared frontage apron",
    );
  }
  const numberPattern = "(-?\\d+(?:\\.\\d+)?)";
  const renderedTreePattern = new RegExp(
    `addAlunAlunTree\\(\\s*group,\\s*${numberPattern},\\s*${numberPattern},`,
    "g",
  );
  const obstacleTreePattern = new RegExp(
    `\\{\\s*shape:\\s*["']circle["'],\\s*x:\\s*${numberPattern},\\s*z:\\s*${numberPattern},\\s*radius:\\s*${numberPattern},\\s*label:\\s*["']tree trunk["']\\s*\\}`,
    "g",
  );
  const renderedPendopoTrees = [...pendopoSource.matchAll(renderedTreePattern)]
    .map((match) => [Number(match[1]), Number(match[2])])
    .sort((first, second) => first[0] - second[0]);
  const pendopoTreeObstacles = [...pendopoSource.matchAll(obstacleTreePattern)]
    .map((match) => ({
      center: [Number(match[1]), Number(match[2])],
      radius: Number(match[3]),
    }))
    .sort((first, second) => first.center[0] - second.center[0]);
  if (
    renderedPendopoTrees.length !== 2 ||
    pendopoTreeObstacles.length !== renderedPendopoTrees.length ||
    renderedPendopoTrees.some(
      (center, index) =>
        !samePoint(center, pendopoTreeObstacles[index].center) ||
        Math.abs(pendopoTreeObstacles[index].radius - 0.22) > 1e-12,
    )
  ) {
    throw new Error(
      "Pendopo tree navigation obstacles must match both rendered tree trunks exactly",
    );
  }

  return {
    apronCount: corridor.propertyAprons.length,
    benchCount: ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS.length,
    clearTreadSamples,
    maximumTreeCurbClearance,
    minimumBenchTreeClearance,
    minimumGazeboClearance,
    minimumTreeCurbClearance,
    minimumTreeLawnClearance,
    obstacleCount: ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES.length,
    treeCount: ALUN_ALUN_SOUTH_PARK_TREE_CENTERS.length,
  };
}

function validateWestUtilityCorridorDefinition() {
  const utility = ALUN_ALUN_WEST_UTILITY_CORRIDOR_DEFINITION;
  const frontage = ALUN_ALUN_WEST_FRONTAGE_DEFINITION;
  const expectedStations = [-10.5, -4.8, 3.06, 7.67];
  const expectedConductorOffsets = [
    -0.21,
    -0.15,
    -0.1,
    -0.05,
    0,
    0.05,
    0.09,
    0.13,
  ];
  if (
    !utility ||
    !Array.isArray(utility.stationEasts) ||
    !Array.isArray(utility.supports) ||
    utility.stationEasts.length !== expectedStations.length ||
    utility.supports.length !== expectedStations.length ||
    utility.stationEasts.some(
      (station, index) => station !== expectedStations[index],
    ) ||
    Math.abs(utility.propertySetback - 0.06) > 1e-12 ||
    Math.abs(utility.poleTopRadius - 0.025) > 1e-12 ||
    Math.abs(utility.poleBaseRadius - 0.035) > 1e-12 ||
    Math.abs(utility.poleHeight - 2.15) > 1e-12 ||
    Math.abs(utility.crossArmLength - 0.62) > 1e-12 ||
    utility.transformerSupportIndex !== 2
  ) {
    throw new Error(
      "the west PLN corridor must retain four surveyed supports behind the frontage sidewalk",
    );
  }
  if (
    new Set(utility.stationEasts).size !== utility.stationEasts.length ||
    !Array.isArray(utility.insulatorOffsets) ||
    utility.insulatorOffsets.length !== 3 ||
    utility.insulatorOffsets.some(
      (offset) =>
        !isFiniteNumber(offset) ||
        Math.abs(offset) + utility.poleTopRadius >
          utility.crossArmLength * 0.5,
    ) ||
    !Array.isArray(utility.conductors) ||
    utility.conductors.length !== expectedConductorOffsets.length ||
    utility.conductors.some(
      (conductor, index) =>
        ![conductor.lateralOffset, conductor.height, conductor.sag].every(
          isFiniteNumber,
        ) ||
        conductor.height <= conductor.sag * 2 ||
        conductor.sag <= 0 ||
        Math.abs(
          conductor.lateralOffset - expectedConductorOffsets[index],
        ) > 1e-12 ||
        Math.abs(conductor.lateralOffset) + 0.0035 >
          utility.crossArmLength * 0.5,
    )
  ) {
    throw new Error(
      "PLN insulators and conductors must remain finite and inside their local crossarms",
    );
  }

  const pointOnPolygonBoundary = (point, polygon, epsilon = 1e-8) =>
    polygon.some((start, index) =>
      pointOnSegment2D(
        point,
        start,
        polygon[(index + 1) % polygon.length],
        epsilon,
      ),
    );
  const pointInsideOrOnPolygon = (point, polygon) =>
    pointInsidePolygon(point, polygon) ||
    pointOnPolygonBoundary(point, polygon);
  const pointToPolygonBoundary = (point, polygon) =>
    polygon.reduce(
      (minimum, start, index) =>
        Math.min(
          minimum,
          pointSegmentDistance(
            point,
            start,
            polygon[(index + 1) % polygon.length],
          ),
        ),
      Infinity,
    );
  const protectedSurfaces = [
    ["western asphalt", ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE],
    ["Ahmad Yani sidewalk", frontage.ahmadYaniSidewalkOutline],
    ["Pegadaian branch sidewalk", frontage.branchSidewalkOutline],
  ];
  let minimumSurfaceClearance = Infinity;

  utility.supports.forEach((support, supportIndex) => {
    const stationEast = expectedStations[supportIndex];
    const boundary = frontage.ahmadYaniSidewalkOuterBoundary;
    const segmentIndex = boundary.findIndex((start, index) => {
      const end = boundary[index + 1];
      return (
        end &&
        stationEast >= Math.min(start[1], end[1]) - 1e-10 &&
        stationEast <= Math.max(start[1], end[1]) + 1e-10
      );
    });
    if (segmentIndex < 0) {
      throw new Error(
        `PLN support ${supportIndex} is outside the Ahmad Yani boundary`,
      );
    }
    const start = boundary[segmentIndex];
    const end = boundary[segmentIndex + 1];
    const delta = [end[0] - start[0], end[1] - start[1]];
    const length = Math.hypot(...delta);
    const amount = (stationEast - start[1]) / delta[1];
    const expectedBoundaryPoint = [
      start[0] + delta[0] * amount,
      stationEast,
    ];
    const expectedTangent = [delta[0] / length, delta[1] / length];
    const expectedPropertyNormal = [
      expectedTangent[1],
      -expectedTangent[0],
    ];
    const expectedCenter = [
      expectedBoundaryPoint[0] +
        expectedPropertyNormal[0] * utility.propertySetback,
      expectedBoundaryPoint[1] +
        expectedPropertyNormal[1] * utility.propertySetback,
    ];
    const expectedYaw = Math.atan2(
      -expectedPropertyNormal[1],
      expectedPropertyNormal[0],
    );
    if (
      support.index !== supportIndex ||
      support.stationEast !== stationEast ||
      !samePoint(support.boundaryPoint, expectedBoundaryPoint, 1e-10) ||
      !samePoint(support.tangent, expectedTangent, 1e-10) ||
      !samePoint(
        support.propertyNormal,
        expectedPropertyNormal,
        1e-10,
      ) ||
      !samePoint(support.center, expectedCenter, 1e-10) ||
      Math.abs(support.crossArmYaw - expectedYaw) > 1e-10 ||
      Math.abs(pointDistance(support.center, support.boundaryPoint) - 0.06) >
        1e-10 ||
      !pointOnPolygonBoundary(support.boundaryPoint, boundary)
    ) {
      throw new Error(
        `PLN support ${supportIndex} no longer follows the property-side sidewalk normal`,
      );
    }
    if (
      frontage.loweredCurbEastSpans.some(
        ([minimumEast, maximumEast]) =>
          support.center[1] + utility.poleBaseRadius >= minimumEast &&
          support.center[1] - utility.poleBaseRadius <= maximumEast,
      )
    ) {
      throw new Error(
        `PLN support ${supportIndex} obstructs a lowered driveway curb`,
      );
    }
    protectedSurfaces.forEach(([label, polygon]) => {
      const edgeDistance = pointToPolygonBoundary(support.center, polygon);
      const completeBaseClearance = edgeDistance - utility.poleBaseRadius;
      if (
        pointInsideOrOnPolygon(support.center, polygon) ||
        completeBaseClearance <= 1e-8
      ) {
        throw new Error(
          `PLN support ${supportIndex} base enters the ${label}`,
        );
      }
      minimumSurfaceClearance = Math.min(
        minimumSurfaceClearance,
        completeBaseClearance,
      );
    });
  });

  return {
    minimumSurfaceClearance,
    supportCount: utility.supports.length,
  };
}

function validateFrontageNavigationSurfaces() {
  const frontage = ALUN_ALUN_WEST_FRONTAGE_DEFINITION;
  const pegadaian = ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION;
  const expected = [
    {
      points: ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,
      height: ALUN_ALUN_ROAD_SURFACE_Y,
    },
    {
      points: ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE,
      height: ALUN_ALUN_ROAD_SURFACE_Y,
    },
    {
      points: ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    },
    {
      points: frontage.branchSidewalkOutline,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    },
    {
      points: frontage.ahmadYaniSidewalkOutline,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    },
    {
      points: pegadaian.oppositeSidewalkOutline,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    },
    ...frontage.propertyAprons.map((apron) => ({
      points: apron.outline,
      height: apron.height,
    })),
  ];
  if (
    ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES.length !== expected.length ||
    ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES.some((surface, index) =>
      surface.shape !== "polygon" ||
      surface.points !== expected[index].points ||
      Math.abs(surface.height - expected[index].height) > 1e-12 ||
      surface.liftOffset !== undefined ||
      !surface.label
    )
  ) {
    throw new Error(
      "frontage navigation must use the exact rendered polygons and absolute local heights",
    );
  }

  const testBaseLift = -0.013;
  const expectedRoadLift = testBaseLift + ALUN_ALUN_ROAD_SURFACE_Y;
  const mappedNavigation = {
    userData: {
      navigation: {
        // Deliberately expose raw ground beneath every local polygon. This
        // catches the narrow custom-shoulder trough that formerly lowered the
        // camera between the mapped road core and asymmetric asphalt infill.
        surfaceLiftAt: () => GROUND_EPSILON,
      },
    },
  };
  const navigation = createNavigationSystem({
    constants: {
      GROUND_EPSILON,
      MAP_METERS_PER_WORLD_UNIT,
      MAX_WALKABLE_STEP_HEIGHT,
      PLANET_RADIUS,
      RIDER_COLLISION_RADIUS,
    },
    getGeospatialWorld: () => mappedNavigation,
  });
  const registered = navigation.registerStopNavigation({
    theta: 0,
    phi: 0,
    yaw: 0,
    baseScale: 1,
    name: "Alun-Alun frontage navigation regression",
    group: {
      position: new THREE.Vector3(PLANET_RADIUS + testBaseLift, 0, 0),
      userData: {
        navigation: { surfaces: ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES },
      },
    },
  });
  if (
    !registered ||
    navigation.walkableSurfaces.length !== expected.length
  ) {
    throw new Error("frontage polygon navigation surfaces were not registered");
  }
  const liftAtLocalPoint = ([north, east]) =>
    navigation.navigationSurfaceLiftAt(east, -north);

  expected.forEach((definition, index) => {
    const triangles = polygonTriangles(
      `frontage navigation surface ${index + 1}`,
      definition.points,
    );
    let sample = null;
    for (const triangle of triangles) {
      const candidates = [
        [1 / 3, 1 / 3, 1 / 3],
        [0.6, 0.2, 0.2],
        [0.2, 0.6, 0.2],
        [0.2, 0.2, 0.6],
      ];
      sample = candidates
        .map((weights) => [
          triangle.reduce(
            (total, point, corner) => total + point[0] * weights[corner],
            0,
          ),
          triangle.reduce(
            (total, point, corner) => total + point[1] * weights[corner],
            0,
          ),
        ])
        .find((point) =>
          expected.every(
            (other, otherIndex) =>
              otherIndex === index ||
              other.height === definition.height ||
              !pointInsidePolygon(point, other.points),
          ),
        );
      if (sample) break;
    }
    const expectedLift = testBaseLift + definition.height;
    if (
      !sample ||
      Math.abs(liftAtLocalPoint(sample) - expectedLift) > 1e-7
    ) {
      throw new Error(
        `frontage navigation surface ${index + 1} does not preserve its absolute height`,
      );
    }
  });

  let transitionSamples = 0;
  const validateTransition = (
    label,
    boundary,
    firstPolygon,
    firstHeight,
    secondPolygon,
    secondHeight,
  ) => {
    boundary.slice(0, -1).forEach((start, segmentIndex) => {
      const end = boundary[segmentIndex + 1];
      const delta = [end[0] - start[0], end[1] - start[1]];
      const length = Math.hypot(...delta);
      const normal = [-delta[1] / length, delta[0] / length];
      const midpoint = [
        (start[0] + end[0]) * 0.5,
        (start[1] + end[1]) * 0.5,
      ];
      const candidates = [1, -1].map((side) => [
        midpoint[0] + normal[0] * 0.01 * side,
        midpoint[1] + normal[1] * 0.01 * side,
      ]);
      const first = candidates.find((point) =>
        pointInsidePolygon(point, firstPolygon),
      );
      const second = candidates.find((point) =>
        pointInsidePolygon(point, secondPolygon),
      );
      if (
        !first ||
        !second ||
        samePoint(first, second) ||
        Math.abs(
          liftAtLocalPoint(first) - (testBaseLift + firstHeight),
        ) > 1e-7 ||
        Math.abs(
          liftAtLocalPoint(second) - (testBaseLift + secondHeight),
        ) > 1e-7 ||
        navigation.surfaceTransitionIsBlocked(
          first[1],
          -first[0],
          second[1],
          -second[0],
        )
      ) {
        throw new Error(
          `${label} is not a walkable absolute-height transition at segment ${segmentIndex}`,
        );
      }
      transitionSamples += 1;
    });
  };

  // The mapped road is the second owner at the inner seam; use a deliberately
  // broad road-side polygon only to identify the sample on that side. Its
  // returned lift still comes from the mapped road or the exact infill.
  const broadRoadSide = [
    [-100, -100],
    [100, -100],
    [100, 100],
    [-100, 100],
  ];
  const validateRoadSideTransition = (label, boundary, sidewalkPolygon) => {
    boundary.slice(0, -1).forEach((start, segmentIndex) => {
      const end = boundary[segmentIndex + 1];
      const delta = [end[0] - start[0], end[1] - start[1]];
      const length = Math.hypot(...delta);
      const normal = [-delta[1] / length, delta[0] / length];
      const midpoint = [
        (start[0] + end[0]) * 0.5,
        (start[1] + end[1]) * 0.5,
      ];
      const candidates = [1, -1].map((side) => [
        midpoint[0] + normal[0] * 0.01 * side,
        midpoint[1] + normal[1] * 0.01 * side,
      ]);
      const sidewalk = candidates.find((point) =>
        pointInsidePolygon(point, sidewalkPolygon),
      );
      const road = candidates.find(
        (point) =>
          pointInsidePolygon(point, broadRoadSide) &&
          !pointInsidePolygon(point, sidewalkPolygon),
      );
      if (
        !sidewalk ||
        !road ||
        Math.abs(
          liftAtLocalPoint(sidewalk) -
            (testBaseLift + ALUN_ALUN_FRONTAGE_SIDEWALK_Y),
        ) > 1e-7 ||
        Math.abs(liftAtLocalPoint(road) - expectedRoadLift) > 1e-7 ||
        navigation.surfaceTransitionIsBlocked(
          road[1],
          -road[0],
          sidewalk[1],
          -sidewalk[0],
        )
      ) {
        throw new Error(
          `${label} is not a walkable road-to-sidewalk step at segment ${segmentIndex}`,
        );
      }
      transitionSamples += 1;
    });
  };
  validateRoadSideTransition(
    "KH Wahid Hasyim property-side inner seam",
    ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM,
    ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE,
  );
  validateRoadSideTransition(
    "Pegadaian branch inner seam",
    frontage.branchRoadsideSeam,
    frontage.branchSidewalkOutline,
  );
  validateRoadSideTransition(
    "Ahmad Yani frontage inner seam",
    frontage.ahmadYaniRoadsideSeam,
    frontage.ahmadYaniSidewalkOutline,
  );
  validateRoadSideTransition(
    "Pegadaian opposite inner seam",
    pegadaian.oppositeSidewalkInnerBoundary,
    pegadaian.oppositeSidewalkOutline,
  );

  return {
    surfaceCount: navigation.walkableSurfaces.length,
    transitionSamples,
  };
}

function validateTrueSoutheastJunction() {
  const definition = ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION;
  const returnNames = ["northwest", "southwest", "southeast", "northeast"];
  const actualReturnNames = Object.keys(definition.cornerReturns ?? {});
  if (
    actualReturnNames.length !== returnNames.length ||
    returnNames.some((name) => !actualReturnNames.includes(name))
  ) {
    throw new Error(
      "true south-east junction must define all four corner returns",
    );
  }
  if (
    !Array.isArray(definition.center) ||
    definition.center.length !== 2 ||
    !definition.center.every(isFiniteNumber) ||
    !samePoint(definition.center, definition.monument?.center) ||
    definition.center[0] > -11 ||
    definition.center[0] < -15 ||
    definition.center[1] < 16 ||
    definition.center[1] > 20
  ) {
    throw new Error(
      "true south-east monument must remain at the satellite-registered junction centre",
    );
  }
  if (
    definition.roadSurfaceY !== ALUN_ALUN_ROAD_SURFACE_Y ||
    definition.roadsideBands.length !== 0
  ) {
    throw new Error(
      "true south-east junction must use one road-height union without straight arm-cap sidewalk wedges",
    );
  }
  validateFiniteSimplePolygon(
    "true south-east four-way asphalt union",
    definition.asphaltOutline,
    4,
  );

  const headingChange = (first, second) => {
    const firstLength = Math.hypot(...first);
    const secondLength = Math.hypot(...second);
    const cosine =
      dot(first, second) / Math.max(1e-12, firstLength * secondLength);
    return Math.acos(Math.max(-1, Math.min(1, cosine)));
  };
  const returnHeadingChanges = new Map();
  let returnPointCount = 0;
  returnNames.forEach((name) => {
    const corner = definition.cornerReturns[name];
    const path = corner.path;
    if (
      !Array.isArray(path) ||
      path.length < 5 ||
      path.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(isFiniteNumber),
      )
    ) {
      throw new Error(`true south-east ${name} return path is incomplete`);
    }
    const directions = path.slice(0, -1).map((point, index) => {
      const next = path[index + 1];
      const direction = [next[0] - point[0], next[1] - point[1]];
      if (Math.hypot(...direction) < 0.04) {
        throw new Error(
          `true south-east ${name} return has a collapsed segment at ${index}`,
        );
      }
      return direction;
    });
    const changes = directions
      .slice(0, -1)
      .map((direction, index) => headingChange(direction, directions[index + 1]));
    const totalChange = changes.reduce((total, change) => total + change, 0);
    returnHeadingChanges.set(name, totalChange);
    if (
      totalChange < 0.3 ||
      totalChange > 2.8 ||
      Math.max(...changes) > 0.82
    ) {
      throw new Error(
        `true south-east ${name} return is sharp or insufficiently rounded ` +
          `(total ${(totalChange * 180 / Math.PI).toFixed(1)} degrees)`,
      );
    }
    for (const key of [
      "curbCenterline",
      "clearTreadInner",
      "sidewalkOuterBoundary",
    ]) {
      if (!Array.isArray(corner[key]) || corner[key].length !== path.length) {
        throw new Error(
          `true south-east ${name} ${key} must follow every return station`,
        );
      }
    }
    path.forEach((point, index) => {
      if (
        Math.abs(
          pointDistance(point, corner.curbCenterline[index]) -
            ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
        ) > 0.012 ||
        Math.abs(
          pointDistance(point, corner.clearTreadInner[index]) -
            ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        ) > 0.012 ||
        Math.abs(
          pointDistance(
            corner.clearTreadInner[index],
            corner.sidewalkOuterBoundary[index],
          ) - ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.sidewalkWidth,
        ) > 0.015
      ) {
        throw new Error(
          `true south-east ${name} curb/sidewalk offsets diverge at station ${index}`,
        );
      }
    });
    validateFiniteSimplePolygon(
      `true south-east ${name} sidewalk`,
      corner.sidewalkOutline,
    );

    // The exported path is the asphalt ownership boundary. Probe both sides
    // of every segment so a reversed offset cannot put raised paving in a
    // vehicle mouth while still producing a mathematically valid polygon.
    path.slice(0, -1).forEach((point, index) => {
      const next = path[index + 1];
      const pathMidpoint = [
        (point[0] + next[0]) * 0.5,
        (point[1] + next[1]) * 0.5,
      ];
      const clearMidpoint = [
        (corner.clearTreadInner[index][0] +
          corner.clearTreadInner[index + 1][0]) *
          0.5,
        (corner.clearTreadInner[index][1] +
          corner.clearTreadInner[index + 1][1]) *
          0.5,
      ];
      const outward = [
        clearMidpoint[0] - pathMidpoint[0],
        clearMidpoint[1] - pathMidpoint[1],
      ];
      const outwardLength = Math.hypot(...outward);
      const roadSample = [
        pathMidpoint[0] - (outward[0] / outwardLength) * 0.002,
        pathMidpoint[1] - (outward[1] / outwardLength) * 0.002,
      ];
      const propertySample = [
        pathMidpoint[0] + (outward[0] / outwardLength) * 0.002,
        pathMidpoint[1] + (outward[1] / outwardLength) * 0.002,
      ];
      if (
        !pointInsidePolygon(roadSample, definition.asphaltOutline) ||
        pointInsidePolygon(propertySample, definition.asphaltOutline)
      ) {
        throw new Error(
          `true south-east ${name} return reverses asphalt/footway ownership at segment ${index}`,
        );
      }
    });
    returnPointCount += path.length;
  });

  // This is the exact corner the user identifies as north-to-east. Keep its
  // natural traversal order monotonic and lock its normalized shape to the
  // west-to-south reference instead of merely allowing any rounded polygon.
  const southWestProfile = definition.cornerReturns.southwest.path;
  const northEastProfile = [
    ...definition.cornerReturns.northeast.path,
  ].reverse();
  if (northEastProfile.length !== southWestProfile.length) {
    throw new Error(
      "true south-east north-to-east return must retain every west-to-south reference station",
    );
  }
  const southWestStart = southWestProfile[0];
  const southWestEnd = southWestProfile.at(-1);
  const northEastStart = northEastProfile[0];
  const northEastEnd = northEastProfile.at(-1);
  let maximumProfileDivergence = 0;
  northEastProfile.forEach((point, index) => {
    if (index > 0) {
      const previous = northEastProfile[index - 1];
      if (point[0] >= previous[0] || point[1] <= previous[1]) {
        throw new Error(
          `true south-east north-to-east return hooks backward at station ${index}`,
        );
      }
    }
    const source = southWestProfile[index];
    const sourceNorthProgress =
      (source[0] - southWestStart[0]) /
      (southWestEnd[0] - southWestStart[0]);
    const sourceEastProgress =
      (source[1] - southWestStart[1]) /
      (southWestEnd[1] - southWestStart[1]);
    const targetNorthProgress =
      (point[0] - northEastStart[0]) /
      (northEastEnd[0] - northEastStart[0]);
    const targetEastProgress =
      (point[1] - northEastStart[1]) /
      (northEastEnd[1] - northEastStart[1]);
    maximumProfileDivergence = Math.max(
      maximumProfileDivergence,
      Math.abs(targetNorthProgress - sourceEastProgress),
      Math.abs(targetEastProgress - sourceNorthProgress),
    );
  });
  const southWestHeadingChange = returnHeadingChanges.get("southwest");
  const northEastHeadingChange = returnHeadingChanges.get("northeast");
  if (
    maximumProfileDivergence > 1e-10 ||
    northEastHeadingChange > Math.PI * (100 / 180) ||
    Math.abs(northEastHeadingChange - southWestHeadingChange) >
      Math.PI * (3 / 180)
  ) {
    throw new Error(
      "true south-east north-to-east return must match the restrained west-to-south curve profile",
    );
  }

  const northwest = definition.cornerReturns.northwest;
  if (
    northwest.existingParkCurb !== true ||
    returnNames.slice(1).some(
      (name) => definition.cornerReturns[name].existingParkCurb === true,
    ) ||
    northwest.path.some(
      (point) =>
        !pointOnPolygonBoundary2D(point, ALUN_ALUN_PARK_OUTLINE) &&
        !pointOnPolygonBoundary2D(
          point,
          ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE,
        ),
    )
  ) {
    throw new Error(
      "northwest return must reuse only the already-rendered park/local-road curb",
    );
  }

  const renderedPedestrianReturns = returnNames
    .slice(1)
    .map((name) => ({
      label: `${name} sidewalk`,
      polygon: definition.cornerReturns[name].sidewalkOutline,
    }));
  const expectedApronBuildingIndexes = [50, 169, 170, 569, 596];
  const actualApronBuildingIndexes = definition.frontageAprons
    .map((apron) => Number.parseInt(apron.id?.replace("building-", ""), 10))
    .sort((first, second) => first - second);
  if (
    actualApronBuildingIndexes.length !== expectedApronBuildingIndexes.length ||
    actualApronBuildingIndexes.some(
      (buildingIndex, index) =>
        buildingIndex !== expectedApronBuildingIndexes[index],
    )
  ) {
    throw new Error(
      "true south-east frontage aprons must serve buildings 50/169/170/569/596",
    );
  }

  const sourceMap = JSON.parse(readFileSync(SITUBONDO_MAP_URL, "utf8"));
  const decodeBuildingFootprint = (buildingIndex) => {
    const coordinates = sourceMap.buildings?.[buildingIndex]?.[7];
    if (!Array.isArray(coordinates) || coordinates.length < 6) return null;
    const footprint = [];
    for (let index = 0; index < coordinates.length; index += 2) {
      footprint.push([
        coordinates[index + 1] /
          sourceMap.coordinatePrecision /
          MAP_METERS_PER_WORLD_UNIT,
        coordinates[index] /
          sourceMap.coordinatePrecision /
          MAP_METERS_PER_WORLD_UNIT,
      ]);
    }
    return footprint;
  };
  let facadeContactLength = 0;
  const apronSurfaces = definition.frontageAprons.map((apron) => {
    validateFiniteSimplePolygon(apron.label, apron.outline);
    const buildingIndex = Number.parseInt(
      apron.id.replace("building-", ""),
      10,
    );
    const footprint = decodeBuildingFootprint(buildingIndex);
    if (!footprint) {
      throw new Error(`${apron.label} references a missing map footprint`);
    }
    validateFiniteSimplePolygon(
      `map building ${buildingIndex} footprint`,
      footprint,
    );
    const sharedFacade = sharedBoundaryLength2D(apron.outline, footprint);
    if (
      sharedFacade < 0.08 ||
      polygonsHaveInteriorOverlap2D(apron.outline, footprint)
    ) {
      throw new Error(
        `${apron.label} must meet, but never enter, building ${buildingIndex}'s exact facade`,
      );
    }
    const sharedSidewalk = renderedPedestrianReturns.reduce(
      (length, surface) =>
        length + sharedBoundaryLength2D(apron.outline, surface.polygon),
      0,
    );
    if (sharedSidewalk < 0.08) {
      throw new Error(`${apron.label} does not close the sidewalk-to-facade gap`);
    }
    facadeContactLength += sharedFacade;
    return { label: apron.label, polygon: apron.outline };
  });

  const raisedSurfaces = [
    { label: "northwest park ceramic", polygon: ALUN_ALUN_PARK_OUTLINE },
    ...renderedPedestrianReturns,
    ...apronSurfaces,
  ];
  const roadSurfaces = [
    { label: "true south-east asphalt", polygon: definition.asphaltOutline },
    {
      label: "Jalan Kartini local-road asphalt",
      polygon: ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE,
    },
    {
      label: "south-approach asphalt",
      polygon: ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline,
    },
    {
      label: "west-south park asphalt",
      polygon: ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE,
    },
  ];
  raisedSurfaces.forEach((raised) => {
    roadSurfaces.forEach((road) => {
      if (polygonsHaveInteriorOverlap2D(raised.polygon, road.polygon)) {
        throw new Error(
          `${raised.label} intrudes into ${road.label} at the true south-east opening`,
        );
      }
    });
  });
  raisedSurfaces.forEach((first, firstIndex) => {
    raisedSurfaces.slice(firstIndex + 1).forEach((second) => {
      if (polygonsHaveInteriorOverlap2D(first.polygon, second.polygon)) {
        throw new Error(`${first.label} overlaps ${second.label}`);
      }
    });
  });
  roadSurfaces.forEach((first, firstIndex) => {
    roadSurfaces.slice(firstIndex + 1).forEach((second) => {
      if (polygonsHaveInteriorOverlap2D(first.polygon, second.polygon)) {
        throw new Error(
          `${first.label} overlaps ${second.label}; road-height owners must meet only at a seam`,
        );
      }
    });
  });

  const expectedNavigationSurfaces = [
    [definition.asphaltOutline, ALUN_ALUN_ROAD_SURFACE_Y],
    ...returnNames.slice(1).map((name) => [
      definition.cornerReturns[name].sidewalkOutline,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    ]),
    ...definition.frontageAprons.map((apron) => [
      apron.outline,
      ALUN_ALUN_FRONTAGE_APRON_Y,
    ]),
  ];
  expectedNavigationSurfaces.forEach(([points, height], index) => {
    const matches = ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES.filter(
      (surface) => surface.points === points,
    );
    if (
      matches.length !== 1 ||
      matches[0].shape !== "polygon" ||
      matches[0].height !== height ||
      matches[0].liftOffset !== undefined
    ) {
      throw new Error(
        `true south-east rendered/navigation polygon ${index + 1} is not identical`,
      );
    }
  });
  if (
    ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES.some(
      (surface) =>
        surface.points ===
          ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionSidewalkOutline ||
        surface.points ===
          ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionApronOutline,
    )
  ) {
    throw new Error(
      "obsolete Jalan Kartini transition paving is still navigable",
    );
  }

  const trafficSource = readFileSync(TRAFFIC_SOURCE_URL, "utf8");
  const landmarkSource = readFileSync(PRODUCTION_FLEET_SOURCE_URL, "utf8");
  const factoryStart = trafficSource.indexOf(
    "export function createAlunAlunTrafficFactory",
  );
  const factorySource = trafficSource.slice(factoryStart);
  if (
    factoryStart < 0 ||
    /transitionSidewalkOutline|transitionApronOutline/.test(factorySource) ||
    !/addRoadSurface\(\s*ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION\.asphaltOutline,?\s*\)/.test(
      factorySource,
    ) ||
    !/ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION\.cornerReturns\.southwest/.test(
      factorySource,
    ) ||
    !/ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION\.cornerReturns\.southeast/.test(
      factorySource,
    ) ||
    !/ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION\.cornerReturns\.northeast/.test(
      factorySource,
    ) ||
    !/ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION\.frontageAprons\.forEach\(/.test(
      factorySource,
    ) ||
    !/addAlunAlunCurb\(\s*group,\s*ALUN_ALUN_PARK_OUTLINE,/.test(
      landmarkSource,
    )
  ) {
    throw new Error(
      "true south-east road, returns, aprons, or reused northwest curb are not all rendered",
    );
  }
  if (
    !/\.\.\.ALUN_ALUN_TRUE_SOUTHEAST_COLLISION_OBSTACLES,/.test(
      landmarkSource,
    ) ||
    !/\.\.\.ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES,/.test(
      landmarkSource,
    )
  ) {
    throw new Error(
      "true south-east navigation/collision exports are not registered by the landmark",
    );
  }

  const replacementExpectations = [
    ["true south-east Jalan Cendrawasih arm", 1, 5],
    ["true south-east Jalan Diponegoro arm", 0, 6],
  ];
  replacementExpectations.forEach(([label, retainedStart, retainedCount]) => {
    const replacement = ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.find(
      (candidate) => candidate.label === label,
    );
    if (
      !replacement ||
      (replacement.retainedPointStart ?? 0) !== retainedStart ||
      replacement.retainedPointCount !== retainedCount
    ) {
      throw new Error(
        `${label} must suppress only its junction-side generic curb segment`,
      );
    }
  });

  const monument = definition.monument;
  if (
    ![
      monument.yaw,
      monument.islandWidth,
      monument.islandDepth,
      monument.collisionWidth,
      monument.collisionDepth,
      monument.visualHeight,
    ].every(isFiniteNumber) ||
    monument.islandWidth <= 0.2 ||
    monument.islandDepth <= 0.2 ||
    monument.islandWidth >= 1 ||
    monument.islandDepth >= 1 ||
    monument.collisionWidth < monument.islandWidth ||
    monument.collisionDepth < monument.islandDepth ||
    monument.collisionWidth - monument.islandWidth > 0.2 ||
    monument.collisionDepth - monument.islandDepth > 0.2 ||
    monument.visualHeight <= 0.4 ||
    monument.visualHeight >= 1.2 ||
    !Number.isInteger(monument.curbBlocks) ||
    monument.curbBlocks < 12
  ) {
    throw new Error("true south-east monument is not compact or collision-aligned");
  }
  const monumentObstacles = ALUN_ALUN_TRUE_SOUTHEAST_COLLISION_OBSTACLES;
  const monumentObstacle = monumentObstacles[0];
  if (
    monumentObstacles.length !== 1 ||
    monumentObstacle.label !== "true south-east compact monument island" ||
    monumentObstacle.north !== monument.center[0] ||
    monumentObstacle.east !== monument.center[1] ||
    monumentObstacle.width !== monument.collisionWidth ||
    monumentObstacle.depth !== monument.collisionDepth ||
    monumentObstacle.yaw !== monument.yaw
  ) {
    throw new Error(
      "true south-east monument render and collision definitions diverge",
    );
  }
  const monumentEnvelope = obstacleEnvelope(monumentObstacle);
  const widthVector = monumentEnvelope.widthAxis.map(
    (value) => value * monumentEnvelope.halfWidth,
  );
  const depthVector = monumentEnvelope.depthAxis.map(
    (value) => value * monumentEnvelope.halfDepth,
  );
  const monumentPolygon = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([widthSign, depthSign]) => [
    monument.center[0] +
      widthVector[0] * widthSign +
      depthVector[0] * depthSign,
    monument.center[1] +
      widthVector[1] * widthSign +
      depthVector[1] * depthSign,
  ]);
  if (
    !pointInsidePolygon(monument.center, definition.asphaltOutline) ||
    pointObstacleSignedGap(
      monument.center[0],
      monument.center[1],
      monumentEnvelope,
    ) >= 0 ||
    raisedSurfaces.some((surface) =>
      polygonsHaveInteriorOverlap2D(monumentPolygon, surface.polygon),
    )
  ) {
    throw new Error(
      "true south-east monument must block only its compact asphalt island",
    );
  }

  let productionRouteSamples = 0;
  for (const routeName of ["crossNorthbound", "crossSouthbound"]) {
    const route = buildRoute(
      routeName,
      ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS[routeName],
    );
    const halfLength = ROUTE_SWEPT_HALF_LENGTHS[routeName];
    const halfWidth = ROUTE_SWEPT_HALF_WIDTHS[routeName];
    for (const sample of sampleRoute(route)) {
      // Only the lower intersection portion can meet these local surfaces.
      if (sample.north < -24.5 || sample.north > -8) continue;
      const vehicle = vehiclePolygon(sample, halfLength, halfWidth);
      for (const surface of raisedSurfaces) {
        const clearance = polygonClearance(vehicle, surface.polygon);
        if (
          polygonsHaveInteriorOverlap2D(vehicle, surface.polygon) ||
          clearance < REQUIRED_CLEARANCE
        ) {
          throw new Error(
            `${routeName} production swept envelope hits ${surface.label} ` +
              `at route distance ${formatDistance(sample.distance)}, ` +
              `north/east ${formatCoordinate(sample.north)}/` +
              `${formatCoordinate(sample.east)} ` +
              `(clearance ${formatDistance(clearance)})`,
          );
        }
      }
      const monumentClearance = envelopeGap(sample, monumentEnvelope);
      if (monumentClearance < REQUIRED_CLEARANCE) {
        throw new Error(
          `${routeName} production swept envelope hits the monument at ` +
            `route distance ${formatDistance(sample.distance)}, north/east ` +
            `${formatCoordinate(sample.north)}/${formatCoordinate(sample.east)} ` +
            `(clearance ${formatDistance(monumentClearance)})`,
        );
      }
      productionRouteSamples += 1;
    }
  }

  const testBaseLift = -0.013;
  const allNavigationSurfaces = [
    ...ALUN_ALUN_PARK_NAVIGATION_SURFACES,
    ...ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES,
    ...ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES,
  ];
  const navigation = createNavigationSystem({
    constants: {
      GROUND_EPSILON,
      MAP_METERS_PER_WORLD_UNIT,
      MAX_WALKABLE_STEP_HEIGHT,
      PLANET_RADIUS,
      RIDER_COLLISION_RADIUS,
    },
    getGeospatialWorld: () => ({
      userData: { navigation: { surfaceLiftAt: () => GROUND_EPSILON } },
    }),
  });
  const registered = navigation.registerStopNavigation({
    theta: 0,
    phi: 0,
    yaw: 0,
    baseScale: 1,
    name: "true south-east junction navigation regression",
    group: {
      position: new THREE.Vector3(PLANET_RADIUS + testBaseLift, 0, 0),
      userData: { navigation: { surfaces: allNavigationSurfaces } },
    },
  });
  if (!registered) {
    throw new Error("true south-east navigation surfaces did not register");
  }
  const roadLift = testBaseLift + ALUN_ALUN_ROAD_SURFACE_Y;
  const liftAt = ([north, east]) =>
    navigation.navigationSurfaceLiftAt(east, -north);
  const ringClearance =
    RIDER_COLLISION_RADIUS + PEDESTRIAN_REQUIRED_CLEARANCE + 0.005;
  const ringSamples = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const direction = [Math.cos(angle), Math.sin(angle)];
    const widthProjection = Math.abs(
      dot(direction, monumentEnvelope.widthAxis),
    );
    const depthProjection = Math.abs(
      dot(direction, monumentEnvelope.depthAxis),
    );
    const distance = Math.min(
      widthProjection > 1e-12
        ? (monumentEnvelope.halfWidth + ringClearance) / widthProjection
        : Infinity,
      depthProjection > 1e-12
        ? (monumentEnvelope.halfDepth + ringClearance) / depthProjection
        : Infinity,
    );
    return [
      monument.center[0] + direction[0] * distance,
      monument.center[1] + direction[1] * distance,
    ];
  });
  ringSamples.forEach((sample, index) => {
    const next = ringSamples[(index + 1) % ringSamples.length];
    if (
      !pointInsidePolygon(sample, definition.asphaltOutline) ||
      raisedSurfaces.some((surface) =>
        pointInsidePolygon(sample, surface.polygon),
      ) ||
      pointObstacleSignedGap(sample[0], sample[1], monumentEnvelope) <
        RIDER_COLLISION_RADIUS + PEDESTRIAN_REQUIRED_CLEARANCE ||
      Math.abs(liftAt(sample) - roadLift) > 1e-7 ||
      navigation.surfaceTransitionIsBlocked(
        sample[1],
        -sample[0],
        next[1],
        -next[0],
      )
    ) {
      throw new Error(
        `true south-east monument circulation ring is blocked at sample ${index}`,
      );
    }
  });

  const midpoint = (first, second) => [
    (first[0] + second[0]) * 0.5,
    (first[1] + second[1]) * 0.5,
  ];
  const returns = definition.cornerReturns;
  const armCenters = {
    north: midpoint(returns.northwest.path[0], returns.northeast.path.at(-1)),
    west: midpoint(returns.northwest.path.at(-1), returns.southwest.path[0]),
    south: midpoint(returns.southwest.path.at(-1), returns.southeast.path[0]),
    east: midpoint(returns.southeast.path.at(-1), returns.northeast.path[0]),
  };
  const lineIntersection = (firstStart, firstEnd, secondStart, secondEnd) => {
    const firstDelta = [
      firstEnd[0] - firstStart[0],
      firstEnd[1] - firstStart[1],
    ];
    const secondDelta = [
      secondEnd[0] - secondStart[0],
      secondEnd[1] - secondStart[1],
    ];
    const denominator =
      firstDelta[0] * secondDelta[1] -
      firstDelta[1] * secondDelta[0];
    if (Math.abs(denominator) < 1e-8) return null;
    const offset = [
      secondStart[0] - firstStart[0],
      secondStart[1] - firstStart[1],
    ];
    const amount =
      (offset[0] * secondDelta[1] - offset[1] * secondDelta[0]) /
      denominator;
    return [
      firstStart[0] + firstDelta[0] * amount,
      firstStart[1] + firstDelta[1] * amount,
    ];
  };
  const turnControl = lineIntersection(
    armCenters.north,
    armCenters.south,
    armCenters.west,
    armCenters.east,
  );
  if (!turnControl || !pointInsidePolygon(turnControl, definition.asphaltOutline)) {
    throw new Error("true south-east arm centre lines do not meet on asphalt");
  }
  // A north/east right turn naturally runs just inside the junction centre;
  // using the four-arm line intersection as its Bezier control would place
  // the longest vehicle's front corner against the newly restrained curb.
  const northEastTurnControl = [turnControl[0], turnControl[1] - 0.2];
  const cubicPoint = (start, control, end, amount) => {
    const remaining = 1 - amount;
    return [
      remaining ** 3 * start[0] +
        3 * remaining ** 2 * amount * control[0] +
        3 * remaining * amount ** 2 * control[0] +
        amount ** 3 * end[0],
      remaining ** 3 * start[1] +
        3 * remaining ** 2 * amount * control[1] +
        3 * remaining * amount ** 2 * control[1] +
        amount ** 3 * end[1],
    ];
  };
  const cubicTangent = (start, control, end, amount) => {
    const remaining = 1 - amount;
    const tangent = [
      3 * remaining ** 2 * (control[0] - start[0]) +
        3 * amount ** 2 * (end[0] - control[0]),
      3 * remaining ** 2 * (control[1] - start[1]) +
        3 * amount ** 2 * (end[1] - control[1]),
    ];
    const length = Math.hypot(...tangent);
    return [tangent[0] / length, tangent[1] / length];
  };
  let sweptSamples = 0;
  let sweptCoverageChecks = 0;
  let minimumRaisedClearance = Infinity;
  let minimumMonumentClearance = Infinity;
  [
    ["south-to-east", armCenters.south, turnControl, armCenters.east],
    ["east-to-south", armCenters.east, turnControl, armCenters.south],
    [
      "north-to-east",
      armCenters.north,
      northEastTurnControl,
      armCenters.east,
    ],
    [
      "east-to-north",
      armCenters.east,
      northEastTurnControl,
      armCenters.north,
    ],
  ].forEach(([label, start, control, end]) => {
    for (let index = 0; index <= 240; index += 1) {
      const amount = 0.04 + (index / 240) * 0.92;
      const center = cubicPoint(start, control, end, amount);
      const forward = cubicTangent(start, control, end, amount);
      const lateral = [-forward[1], forward[0]];
      const sample = {
        north: center[0],
        east: center[1],
        forward,
        lateral,
      };
      const vehicle = vehiclePolygon(
        sample,
        VEHICLE_HALF_LENGTH,
        VEHICLE_HALF_WIDTH,
      );
      for (const longitudinal of [-1, -0.5, 0, 0.5, 1]) {
        for (const lateralAmount of [-1, -0.5, 0, 0.5, 1]) {
          const point = [
            center[0] +
              forward[0] * VEHICLE_HALF_LENGTH * longitudinal +
              lateral[0] * VEHICLE_HALF_WIDTH * lateralAmount,
            center[1] +
              forward[1] * VEHICLE_HALF_LENGTH * longitudinal +
              lateral[1] * VEHICLE_HALF_WIDTH * lateralAmount,
          ];
          sweptCoverageChecks += 1;
          if (
            !pointInsidePolygon(point, definition.asphaltOutline) ||
            Math.abs(liftAt(point) - roadLift) > 1e-7
          ) {
            throw new Error(
              `${label} swept envelope leaves road-height asphalt at ` +
                `${formatCoordinate(point[0])}/${formatCoordinate(point[1])}`,
            );
          }
        }
      }
      raisedSurfaces.forEach((surface) => {
        if (polygonsHaveInteriorOverlap2D(vehicle, surface.polygon)) {
          throw new Error(`${label} swept envelope hits ${surface.label}`);
        }
        minimumRaisedClearance = Math.min(
          minimumRaisedClearance,
          polygonClearance(vehicle, surface.polygon),
        );
      });
      minimumMonumentClearance = Math.min(
        minimumMonumentClearance,
        envelopeGap(sample, monumentEnvelope),
      );
      sweptSamples += 1;
    }
  });
  if (
    minimumRaisedClearance < REQUIRED_CLEARANCE ||
    minimumMonumentClearance < REQUIRED_CLEARANCE
  ) {
    throw new Error(
      `true south-east swept turns lack clearance from raised paving/monument ` +
        `(${formatDistance(minimumRaisedClearance)} / ` +
        `${formatDistance(minimumMonumentClearance)})`,
    );
  }

  return {
    facadeContactLength,
    navigationPolygonCount: expectedNavigationSurfaces.length,
    productionRouteSamples,
    returnPointCount,
    ringSamples: ringSamples.length,
    sweptCoverageChecks,
    sweptSamples,
  };
}

function validateSouthCorridorNavigationSurfaces() {
  const corridor = ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION;
  const approach = ALUN_ALUN_SOUTH_APPROACH_DEFINITION;
  const expected = [
    {
      points: ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE,
      height: ALUN_ALUN_ROAD_SURFACE_Y,
    },
    {
      points: ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE,
      height: ALUN_ALUN_ROAD_SURFACE_Y,
    },
    {
      points: approach.surfaceOutline,
      height: ALUN_ALUN_ROAD_SURFACE_Y,
    },
    {
      points: ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.asphaltOutline,
      height: ALUN_ALUN_ROAD_SURFACE_Y,
    },
    {
      points: corridor.sidewalkOutline,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    },
    {
      points: approach.sidewalkOutline,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    },
    ...corridor.propertyAprons.map((apron) => ({
      points: apron.outline,
      height: apron.height,
    })),
    {
      points: approach.frontageApronOutline,
      height: ALUN_ALUN_FRONTAGE_APRON_Y,
    },
    ...[
      ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southwest,
      ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southeast,
      ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.northeast,
      ...ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.roadsideBands,
    ].map((definition) => ({
      points: definition.sidewalkOutline,
      height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    })),
    ...ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.frontageAprons.map(
      (definition) => ({
        points: definition.outline,
        height: ALUN_ALUN_FRONTAGE_APRON_Y,
      }),
    ),
  ];
  if (
    ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES.length !== expected.length ||
    ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES.some(
      (surface, index) =>
        surface.shape !== "polygon" ||
        surface.points !== expected[index].points ||
        Math.abs(surface.height - expected[index].height) > 1e-12 ||
        surface.liftOffset !== undefined ||
        !surface.label,
    )
  ) {
    throw new Error(
      "south-corridor navigation must use every exact rendered road, sidewalk, and property-apron polygon at an absolute height",
    );
  }

  const testBaseLift = -0.013;
  const combinedSurfaces = [
    ...ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES,
    ...ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES,
  ];
  const navigation = createNavigationSystem({
    constants: {
      GROUND_EPSILON,
      MAP_METERS_PER_WORLD_UNIT,
      MAX_WALKABLE_STEP_HEIGHT,
      PLANET_RADIUS,
      RIDER_COLLISION_RADIUS,
    },
    getGeospatialWorld: () => ({
      userData: {
        navigation: {
          surfaceLiftAt: () => GROUND_EPSILON,
        },
      },
    }),
  });
  const registered = navigation.registerStopNavigation({
    theta: 0,
    phi: 0,
    yaw: 0,
    baseScale: 1,
    name: "Alun-Alun south-corridor navigation regression",
    group: {
      position: new THREE.Vector3(PLANET_RADIUS + testBaseLift, 0, 0),
      userData: { navigation: { surfaces: combinedSurfaces } },
    },
  });
  if (
    !registered ||
    navigation.walkableSurfaces.length !== combinedSurfaces.length
  ) {
    throw new Error("south-corridor polygon navigation surfaces were not registered");
  }
  const liftAtLocalPoint = ([north, east]) =>
    navigation.navigationSurfaceLiftAt(east, -north);

  expected.forEach((definition, index) => {
    const triangles = polygonTriangles(
      `south-corridor navigation surface ${index + 1}`,
      definition.points,
    );
    let sample = null;
    for (const triangle of triangles) {
      const candidates = [
        [1 / 3, 1 / 3, 1 / 3],
        [0.6, 0.2, 0.2],
        [0.2, 0.6, 0.2],
        [0.2, 0.2, 0.6],
      ];
      sample = candidates
        .map((weights) => [
          triangle.reduce(
            (total, point, corner) => total + point[0] * weights[corner],
            0,
          ),
          triangle.reduce(
            (total, point, corner) => total + point[1] * weights[corner],
            0,
          ),
        ])
        .find((point) =>
          combinedSurfaces.every(
            (other) =>
              other.points === definition.points ||
              other.height === definition.height ||
              !pointInsidePolygon(point, other.points),
          ),
        );
      if (sample) break;
    }
    if (
      !sample ||
      Math.abs(
        liftAtLocalPoint(sample) - (testBaseLift + definition.height),
      ) > 1e-7
    ) {
      throw new Error(
        `south-corridor navigation surface ${index + 1} does not preserve its absolute rendered height`,
      );
    }
  });

  let roadSamples = 0;
  ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH.slice(0, -1).forEach((start, index) => {
    const end = ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH[index + 1];
    for (const amount of [0.25, 0.5, 0.75]) {
      const sample = [
        start[0] + (end[0] - start[0]) * amount,
        start[1] + (end[1] - start[1]) * amount,
      ];
      if (
        Math.abs(
          liftAtLocalPoint(sample) -
            (testBaseLift + ALUN_ALUN_ROAD_SURFACE_Y),
        ) > 1e-7
      ) {
        throw new Error(
          `Jalan Kartini navigation leaves its full-width asphalt at segment ${index}`,
        );
      }
      roadSamples += 1;
    }
  });

  const trueSoutheastPedestrianBands = [
    ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southwest,
    ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southeast,
    ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.northeast,
    ...ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.roadsideBands,
  ];
  const clearTreadPaths = [
    [corridor.clearTreadInner, corridor.sidewalkOuterBoundary],
    [approach.clearTreadInner, approach.sidewalkOuterBoundary],
    ...trueSoutheastPedestrianBands.map((definition) => [
      definition.clearTreadInner,
      definition.sidewalkOuterBoundary,
    ]),
  ];
  let treadSamples = 0;
  clearTreadPaths.forEach(([clearInnerPath, sidewalkOuterPath], pathIndex) => {
    if (clearInnerPath.length !== sidewalkOuterPath.length) {
      throw new Error(
        `south-corridor clear-tread navigation path ${pathIndex + 1} is incomplete`,
      );
    }
    let previousTreadSample = null;
    clearInnerPath.forEach((inner, index) => {
      const outer = sidewalkOuterPath[index];
      const sample = [
        (inner[0] + outer[0]) * 0.5,
        (inner[1] + outer[1]) * 0.5,
      ];
      if (
        Math.abs(pointDistance(inner, outer) - corridor.sidewalkWidth) >
          0.015 ||
        Math.abs(
          liftAtLocalPoint(sample) -
            (testBaseLift + ALUN_ALUN_FRONTAGE_SIDEWALK_Y),
        ) > 1e-7 ||
        (previousTreadSample &&
          navigation.surfaceTransitionIsBlocked(
            previousTreadSample[1],
            -previousTreadSample[0],
            sample[1],
            -sample[0],
          ))
      ) {
        throw new Error(
          `south-corridor navigation does not follow visible clear tread ` +
            `${pathIndex + 1} at station ${index}`,
        );
      }
      previousTreadSample = sample;
      treadSamples += 1;
    });
  });

  return {
    roadSamples,
    surfaceCount: ALUN_ALUN_SOUTH_CORRIDOR_NAVIGATION_SURFACES.length,
    treadSamples,
  };
}

function validateFrontageVehicleSeparation(routes) {
  const frontage = ALUN_ALUN_WEST_FRONTAGE_DEFINITION;
  const protectedPolygons = [
    [
      "KH Wahid Hasyim sidewalk",
      ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE,
    ],
    [
      "Pegadaian branch sidewalk",
      frontage.branchSidewalkOutline,
    ],
    [
      "Ahmad Yani sidewalk",
      frontage.ahmadYaniSidewalkOutline,
    ],
    [
      "Pegadaian opposite sidewalk",
      ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION.oppositeSidewalkOutline,
    ],
    ...frontage.propertyAprons.map((apron) => [apron.label, apron.outline]),
  ].map(([label, polygon]) => ({
    bounds: polygonBounds(polygon),
    label,
    triangles: polygonTriangles(label, polygon),
  }));
  let checkedComparisons = 0;
  let minimumGap = Infinity;
  let minimumDetail = null;
  routes.forEach((route) => {
    const halfLength = ROUTE_SWEPT_HALF_LENGTHS[route.name];
    const halfWidth = ROUTE_SWEPT_HALF_WIDTHS[route.name];
    const broadPhaseRadius = Math.hypot(halfLength, halfWidth);
    sampleRoute(route).forEach((sample) => {
      const vehicle = vehiclePolygon(sample, halfLength, halfWidth);
      protectedPolygons.forEach((protectedSurface) => {
        const bounds = protectedSurface.bounds;
        if (
          sample.north < bounds.minimumNorth - broadPhaseRadius ||
          sample.north > bounds.maximumNorth + broadPhaseRadius ||
          sample.east < bounds.minimumEast - broadPhaseRadius ||
          sample.east > bounds.maximumEast + broadPhaseRadius
        ) {
          return;
        }
        protectedSurface.triangles.forEach((triangle) => {
          const rawGap = polygonPairGap(vehicle, triangle);
          checkedComparisons += 1;
          if (rawGap < minimumGap) {
            minimumGap = rawGap;
            minimumDetail = {
              protectedSurface,
              rawGap,
              route,
              sample,
            };
          }
        });
      });
    });
  });
  if (!minimumDetail || !Number.isFinite(minimumGap)) {
    throw new Error("frontage vehicle broad phase did not inspect the new surfaces");
  }
  if (minimumGap < REQUIRED_CLEARANCE) {
    const { protectedSurface, route, sample } = minimumDetail;
    throw new Error(
      `${route.name} swept vehicle envelope encroaches on ${protectedSurface.label} at north/east ${formatCoordinate(sample.north)}/${formatCoordinate(sample.east)} (minimum clearance ${minimumGap.toFixed(6)} world / ${formatDistance(minimumGap)})`,
    );
  }
  return { checkedComparisons, minimumDetail, minimumGap };
}

function validateSouthApproachSurfaceDefinition() {
  const definition = ALUN_ALUN_SOUTH_APPROACH_DEFINITION;
  const {
    clearTreadInner,
    curbCenterline,
    frontageOuterBoundary,
    junctionEastJoin,
    junctionWestJoin,
    parkCurbSeam,
    roadsideSeam,
    roadsideBandWidth,
    sidewalkCenterline,
    sidewalkOuterBoundary,
    sidewalkWidth,
    surfaceOutline,
  } = definition;
  const boundaryCollections = [
    ["roadside seam", roadsideSeam],
    ["curb centreline", curbCenterline],
    ["clear-tread inner boundary", clearTreadInner],
    ["sidewalk centreline", sidewalkCenterline],
    ["sidewalk outer boundary", sidewalkOuterBoundary],
    ["frontage outer boundary", frontageOuterBoundary],
  ];
  const pointDistance = (first, second) =>
    Math.hypot(first[0] - second[0], first[1] - second[1]);
  const samePoint = (first, second, epsilon = 1e-8) =>
    pointDistance(first, second) <= epsilon;

  if (!Array.isArray(surfaceOutline) || surfaceOutline.length < 8) {
    throw new Error("south approach needs one complete asphalt union outline");
  }
  if (polygonArea(surfaceOutline) < 1) {
    throw new Error("south approach asphalt union has no usable area");
  }
  if (!Array.isArray(parkCurbSeam) || parkCurbSeam.length < 2) {
    throw new Error("south approach needs the surveyed park curb seam");
  }
  boundaryCollections.forEach(([label, points]) => {
    if (!Array.isArray(points) || points.length !== roadsideSeam.length) {
      throw new Error(
        `south approach ${label} must match the roadside seam point count`,
      );
    }
  });

  const reversedSeam = [...roadsideSeam].reverse();
  const seamStartIndex = surfaceOutline.findIndex((point) =>
    samePoint(point, reversedSeam[0]),
  );
  if (
    seamStartIndex < 0 ||
    seamStartIndex + reversedSeam.length > surfaceOutline.length ||
    reversedSeam.some(
      (point, index) =>
        !samePoint(point, surfaceOutline[seamStartIndex + index]),
    )
  ) {
    throw new Error(
      "south approach asphalt must terminate on the complete shared curb seam",
    );
  }
  if (
    seamStartIndex === 0 ||
    !samePoint(surfaceOutline[seamStartIndex - 1], junctionWestJoin) ||
    !samePoint(surfaceOutline[seamStartIndex], junctionEastJoin)
  ) {
    throw new Error(
      "south approach junction edge must join the asphalt union only once",
    );
  }

  // The first legacy park-curb segment now belongs to the satellite-traced
  // northwest return. The north approach retains the remainder only.
  const renderedParkCurbSeam = parkCurbSeam.slice(1);
  const parkSeamStartIndex = surfaceOutline.findIndex((point) =>
    samePoint(point, renderedParkCurbSeam[0]),
  );
  if (
    parkSeamStartIndex < 0 ||
    parkSeamStartIndex + renderedParkCurbSeam.length > surfaceOutline.length ||
    renderedParkCurbSeam.some(
      (point, index) =>
        !samePoint(point, surfaceOutline[parkSeamStartIndex + index]),
    )
  ) {
    throw new Error(
      "south approach asphalt must share its retained park curb boundary",
    );
  }

  for (let index = 0; index < renderedParkCurbSeam.length - 1; index += 1) {
    const start = renderedParkCurbSeam[index];
    const end = renderedParkCurbSeam[index + 1];
    const deltaNorth = end[0] - start[0];
    const deltaEast = end[1] - start[1];
    const length = Math.hypot(deltaNorth, deltaEast);
    const roadward = [-deltaEast / length, deltaNorth / length];
    const midpoint = [
      (start[0] + end[0]) * 0.5,
      (start[1] + end[1]) * 0.5,
    ];
    const asphaltSample = [
      midpoint[0] + roadward[0] * 0.002,
      midpoint[1] + roadward[1] * 0.002,
    ];
    const parkSample = [
      midpoint[0] - roadward[0] * 0.002,
      midpoint[1] - roadward[1] * 0.002,
    ];
    if (
      !pointInsidePolygon(asphaltSample, surfaceOutline) ||
      pointInsidePolygon(parkSample, surfaceOutline)
    ) {
      throw new Error(
        `south approach asphalt/park curb seam overlaps or gaps at segment ${index}`,
      );
    }
  }

  const pedestrianRoute = ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS.southEast;
  if (
    Math.abs(pedestrianRoute.width - sidewalkWidth) > 1e-9 ||
    pedestrianRoute.points.length !== sidewalkCenterline.length ||
    pedestrianRoute.points.some(
      (point, index) => !samePoint(point, sidewalkCenterline[index]),
    )
  ) {
    throw new Error(
      "south-east pedestrian route must follow the shared roadside band",
    );
  }

  roadsideSeam.forEach((seamPoint, index) => {
    const curbPoint = curbCenterline[index];
    const clearInnerPoint = clearTreadInner[index];
    const centerPoint = sidewalkCenterline[index];
    const sidewalkOuterPoint = sidewalkOuterBoundary[index];
    const frontageOuterPoint = frontageOuterBoundary[index];
    const expectedCenter = [
      (clearInnerPoint[0] + sidewalkOuterPoint[0]) * 0.5,
      (clearInnerPoint[1] + sidewalkOuterPoint[1]) * 0.5,
    ];
    if (
      Math.abs(
        pointDistance(seamPoint, curbPoint) -
          ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
      ) > 1e-8 ||
      Math.abs(
        pointDistance(seamPoint, clearInnerPoint) -
          ALUN_ALUN_FRONTAGE_CURB_DEPTH,
      ) > 1e-8 ||
      Math.abs(
        pointDistance(seamPoint, sidewalkOuterPoint) - roadsideBandWidth,
      ) > 1e-8 ||
      Math.abs(
        pointDistance(clearInnerPoint, sidewalkOuterPoint) - sidewalkWidth,
      ) > 1e-8 ||
      !samePoint(centerPoint, expectedCenter) ||
      Math.abs(
        pointDistance(sidewalkOuterPoint, frontageOuterPoint) -
          definition.frontageWidth,
      ) > 1e-8
    ) {
      throw new Error(
        `south approach roadside bands diverge at point ${index}`,
      );
    }
  });

  for (let index = 0; index < roadsideSeam.length - 1; index += 1) {
    const seamMidpoint = [
      (roadsideSeam[index][0] + roadsideSeam[index + 1][0]) * 0.5,
      (roadsideSeam[index][1] + roadsideSeam[index + 1][1]) * 0.5,
    ];
    const outerMidpoint = [
      (sidewalkOuterBoundary[index][0] +
        sidewalkOuterBoundary[index + 1][0]) * 0.5,
      (sidewalkOuterBoundary[index][1] +
        sidewalkOuterBoundary[index + 1][1]) * 0.5,
    ];
    const outward = [
      outerMidpoint[0] - seamMidpoint[0],
      outerMidpoint[1] - seamMidpoint[1],
    ];
    const outwardLength = Math.hypot(...outward);
    const pedestrianSample = [
      seamMidpoint[0] + outward[0] * 0.5,
      seamMidpoint[1] + outward[1] * 0.5,
    ];
    const asphaltSample = [
      seamMidpoint[0] - (outward[0] / outwardLength) * 0.002,
      seamMidpoint[1] - (outward[1] / outwardLength) * 0.002,
    ];
    if (
      outwardLength < sidewalkWidth * 0.9 ||
      pointInsidePolygon(pedestrianSample, surfaceOutline) ||
      !pointInsidePolygon(asphaltSample, surfaceOutline)
    ) {
      throw new Error(
        `south approach asphalt/footway seam overlaps or gaps at segment ${index}`,
      );
    }
  }
}

let routes;
let pedestrianRoutes;
let productionFleetConfigs;
let frontageNavigationResult;
let frontageSurfaceResult;
let southCorridorResult;
let southNavigationResult;
let westLocalCorridorResult;
let utilityCorridorResult;
let parkNavigationResult;
let parkSurfaceOwnershipResult;
let trueSoutheastResult;
try {
  validateSignalTiming();
  validateRoadSurfaceGeometry();
  parkSurfaceOwnershipResult = validateParkSurfaceOwnership();
  parkNavigationResult = validateParkNavigationSurfaces();
  frontageSurfaceResult = validateWestFrontageSurfaceDefinition();
  westLocalCorridorResult = validateWestLocalCorridorDefinition();
  southCorridorResult = validateSouthCorridorDefinition();
  utilityCorridorResult = validateWestUtilityCorridorDefinition();
  frontageNavigationResult = validateFrontageNavigationSurfaces();
  southNavigationResult = validateSouthCorridorNavigationSurfaces();
  validateSouthApproachSurfaceDefinition();
  trueSoutheastResult = validateTrueSoutheastJunction();
  validateCollections(
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS,
    ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES,
  );
  routes = EXPECTED_ROUTE_NAMES.map((name) =>
    buildRoute(name, ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS[name]),
  );
  ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES.forEach(validateObstacle);
  validatePedestrianCollections(
    ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS,
    ALUN_ALUN_SOUTH_CROSSING_DEFINITION,
  );
  pedestrianRoutes = EXPECTED_PEDESTRIAN_ROUTE_NAMES.map((name) =>
    buildPedestrianRoute(
      name,
      ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS[name],
    ),
  );
  validateCrossingDefinition(
    ALUN_ALUN_SOUTH_CROSSING_DEFINITION,
    ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES,
    ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS.southCrossing,
  );
  productionFleetConfigs = loadProductionFleetConfigs();
} catch (error) {
  console.error(`Alun-Alun traffic validation could not start: ${error.message}`);
  process.exit(1);
}

const obstacles = ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES.map(
  (obstacle, obstacleIndex) => ({
    definition: obstacle,
    obstacleIndex,
    envelope: obstacleEnvelope(obstacle),
  }),
);
const routesByName = new Map(routes.map((route) => [route.name, route]));
const routeSamplesByName = new Map(
  routes.map((route) => [route.name, sampleRoute(route)]),
);
let frontageVehicleResult;
let productionFleet;
let pedestrianVehicleResult;
try {
  frontageVehicleResult = validateFrontageVehicleSeparation(routes);
  productionFleet = createProductionFleet(
    productionFleetConfigs,
    routesByName,
  );
  validateProductionSweptEnvelopeCoverage(productionFleet.details);
  pedestrianVehicleResult = validatePedestrianVehicleSeparation(
    routesByName,
    routeSamplesByName,
    pedestrianRoutes,
    productionFleet.details,
  );
} catch (error) {
  console.error(
    `Alun-Alun production fleet validation could not start: ${error.message}`,
  );
  process.exit(1);
}
const obstacleViolations = [];
const routePairViolations = [];
const pedestrianViolations = [];
let checkedSamples = 0;
let checkedPedestrianSamples = 0;
let closestClearance = Infinity;
let closestClearanceDetail = null;
let closestPedestrianClearance = Infinity;
let closestPedestrianClearanceDetail = null;

for (const route of routes) {
  const closestByObstacle = new Map();
  for (const routeSample of routeSamplesByName.get(route.name)) {
    checkedSamples += 1;

    for (const obstacle of obstacles) {
      const rawGap = envelopeGap(routeSample, obstacle.envelope);
      if (rawGap < closestClearance) {
        closestClearance = rawGap;
        closestClearanceDetail = {
          distance: routeSample.distance,
          obstacle,
          route,
          routeSample,
        };
      }
      const current = closestByObstacle.get(obstacle.obstacleIndex);
      if (!current || rawGap < current.rawGap) {
        closestByObstacle.set(obstacle.obstacleIndex, {
          distance: routeSample.distance,
          obstacle,
          rawGap,
          route,
          routeSample,
        });
      }
    }
  }

  for (const closest of closestByObstacle.values()) {
    if (closest.rawGap < REQUIRED_CLEARANCE) {
      obstacleViolations.push(closest);
    }
  }
}

const playerCollisionObstacles = obstacles.filter(
  (obstacle) => obstacle.definition.playerCollision !== false,
);
for (const route of pedestrianRoutes) {
  const closestByObstacle = new Map();
  for (const sample of samplePedestrianRoute(route)) {
    checkedPedestrianSamples += 1;
    for (const obstacle of playerCollisionObstacles) {
      const rawGap = pedestrianClearance(sample, route, obstacle.envelope);
      if (rawGap < closestPedestrianClearance) {
        closestPedestrianClearance = rawGap;
        closestPedestrianClearanceDetail = {
          obstacle,
          rawGap,
          route,
          sample,
        };
      }
      const current = closestByObstacle.get(obstacle.obstacleIndex);
      if (!current || rawGap < current.rawGap) {
        closestByObstacle.set(obstacle.obstacleIndex, {
          obstacle,
          rawGap,
          route,
          sample,
        });
      }
    }
  }
  for (const closest of closestByObstacle.values()) {
    if (closest.rawGap < PEDESTRIAN_REQUIRED_CLEARANCE) {
      pedestrianViolations.push(closest);
    }
  }
}

let checkedRoutePairComparisons = 0;
let closestRoutePairDetail = null;
for (const [firstRouteName, secondRouteName] of OPPOSING_ROUTE_PAIRS) {
  const firstRoute = routesByName.get(firstRouteName);
  const secondRoute = routesByName.get(secondRouteName);
  const result = findClosestRoutePairEnvelope(
    firstRoute,
    routeSamplesByName.get(firstRouteName),
    secondRoute,
    routeSamplesByName.get(secondRouteName),
  );
  checkedRoutePairComparisons += result.checkedComparisons;
  if (
    result.closest &&
    (!closestRoutePairDetail ||
      result.closest.rawGap < closestRoutePairDetail.rawGap)
  ) {
    closestRoutePairDetail = result.closest;
  }
  if (result.closest?.rawGap < REQUIRED_CLEARANCE) {
    routePairViolations.push(result.closest);
  }
}

let phaseClearanceResult;
let phaseTrafficRegression;
let productionFleetRegression;
try {
  phaseClearanceResult = validatePhaseClearance(
    routesByName,
    routeSamplesByName,
  );
  phaseTrafficRegression = runPhaseTrafficRegression(routesByName);
  productionFleetRegression = runProductionFleetRegression(
    productionFleetConfigs,
    routesByName,
  );
} catch (error) {
  console.error(
    `Alun-Alun runtime regressions could not run: ${error.message}`,
  );
  process.exit(1);
}

if (
  obstacleViolations.length > 0 ||
  routePairViolations.length > 0 ||
  pedestrianViolations.length > 0 ||
  pedestrianVehicleResult.violations.length > 0 ||
  phaseClearanceResult.violations.length > 0 ||
  phaseTrafficRegression.violations.length > 0 ||
  productionFleetRegression.violations.length > 0
) {
  obstacleViolations.sort((a, b) => a.rawGap - b.rawGap);
  routePairViolations.sort((a, b) => a.rawGap - b.rawGap);
  pedestrianViolations.sort((a, b) => a.rawGap - b.rawGap);
  pedestrianVehicleResult.violations.sort((a, b) => a.rawGap - b.rawGap);
  console.error(
    `Alun-Alun traffic validation failed: ` +
      `${obstacleViolations.length} route/obstacle and ` +
      `${routePairViolations.length} opposing-route and ` +
      `${pedestrianViolations.length} pedestrian clearance and ` +
      `${pedestrianVehicleResult.violations.length} pedestrian/vehicle-ribbon and ` +
      `${phaseClearanceResult.violations.length} phase-clearance and ` +
      `${phaseTrafficRegression.violations.length} runtime phase and ` +
      `${productionFleetRegression.violations.length} production same-route violation(s).`,
  );
  console.error(
    `Required SAT clearance: ${formatDistance(REQUIRED_CLEARANCE)}; ` +
      `vehicle envelope: ${(VEHICLE_HALF_LENGTH * 2 * MAP_METERS_PER_WORLD_UNIT).toFixed(2)} m long × ` +
      `${(VEHICLE_HALF_WIDTH * 2 * MAP_METERS_PER_WORLD_UNIT).toFixed(2)} m lateral ` +
      `(includes runtime lane variation).`,
  );
  const zebra = pedestrianVehicleResult.allowedZebraZone;
  console.error(
    `Pedestrian/vehicle ribbon clearance: ` +
      `${formatDistance(PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE)}; only zebra ` +
      `north ${formatCoordinate(zebra.minimumNorth)}–` +
      `${formatCoordinate(zebra.maximumNorth)}, east ` +
      `${formatCoordinate(zebra.minimumEast)}–` +
      `${formatCoordinate(zebra.maximumEast)} is exempt. Production ` +
      `same-route clearance: ` +
      `${formatDistance(PRODUCTION_FLEET_REQUIRED_CLEARANCE)}.`,
  );
  console.error(
    `Production same-route minimum SAT gaps: ` +
      productionFleetRegression.frameRateResults
        .map(
          (result) =>
            `${result.frameRate} Hz ${formatDistance(result.minimumGap)}`,
        )
        .join("; ") +
      `. Parsed ${productionFleetConfigs.length} index.js vehicles.`,
  );
  for (const violation of obstacleViolations) {
    const label =
      violation.obstacle.definition.label ??
      `obstacle ${violation.obstacle.obstacleIndex}`;
    const shortfall = REQUIRED_CLEARANCE - violation.rawGap;
    const condition =
      violation.rawGap <= 0
        ? `envelopes overlap by at least ${formatDistance(-violation.rawGap)}`
        : `clearance is ${formatDistance(violation.rawGap)}`;
    console.error(
      `- ${violation.route.name} vs ${label}: ${condition}; ` +
        `shortfall ${formatDistance(shortfall)} at route distance ` +
        `${formatDistance(violation.distance)}, ` +
        `north=${formatCoordinate(violation.routeSample.north)}, ` +
        `east=${formatCoordinate(violation.routeSample.east)}.`,
    );
  }
  for (const violation of routePairViolations) {
    const shortfall = REQUIRED_CLEARANCE - violation.rawGap;
    const condition =
      violation.rawGap <= 0
        ? `vehicle envelopes overlap by at least ${formatDistance(-violation.rawGap)}`
        : `clearance is ${formatDistance(violation.rawGap)}`;
    console.error(
      `- ${violation.firstRoute.name} vs ${violation.secondRoute.name}: ` +
        `${condition}; shortfall ${formatDistance(shortfall)}.`,
    );
    console.error(
      `  ${violation.firstRoute.name}: distance ` +
        `${formatDistance(violation.firstSample.distance)}, ` +
        `north=${formatCoordinate(violation.firstSample.north)}, ` +
        `east=${formatCoordinate(violation.firstSample.east)}, ` +
        `swept half-length=${formatDistance(violation.firstHalfLength)}, ` +
        `swept half-width=${formatDistance(violation.firstHalfWidth)}.`,
    );
    console.error(
      `  ${violation.secondRoute.name}: distance ` +
        `${formatDistance(violation.secondSample.distance)}, ` +
        `north=${formatCoordinate(violation.secondSample.north)}, ` +
        `east=${formatCoordinate(violation.secondSample.east)}, ` +
        `swept half-length=${formatDistance(violation.secondHalfLength)}, ` +
      `swept half-width=${formatDistance(violation.secondHalfWidth)}.`,
    );
  }
  for (const violation of pedestrianViolations) {
    const label =
      violation.obstacle.definition.label ??
      `obstacle ${violation.obstacle.obstacleIndex}`;
    console.error(
      `- pedestrian ${violation.route.name} vs ${label}: clearance ` +
        `${formatDistance(violation.rawGap)}; required ` +
        `${formatDistance(PEDESTRIAN_REQUIRED_CLEARANCE)} at ` +
        `north=${formatCoordinate(violation.sample.north)}, ` +
      `east=${formatCoordinate(violation.sample.east)}.`,
    );
  }
  for (const violation of pedestrianVehicleResult.violations) {
    const productionConfig = violation.productionDetail.validation.config;
    const shortfall =
      PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE - violation.rawGap;
    const condition =
      violation.rawGap <= 0
        ? `swept vehicle and pedestrian ribbon overlap by at least ` +
          `${formatDistance(-violation.rawGap)}`
        : `clearance is ${formatDistance(violation.rawGap)}`;
    console.error(
      `- pedestrian ribbon ${violation.fragment.route.name} segment ` +
        `${violation.fragment.segmentIndex + 1} vs swept ` +
        `${violation.route.name} ${productionConfig.kind} ` +
        `${productionConfig.variant} (index.js:${productionConfig.sourceLine}): ` +
        `${condition}; shortfall ` +
        `${formatDistance(shortfall)} outside the allowed zebra zone at ` +
        `vehicle route distance ${formatDistance(violation.sample.distance)}, ` +
        `north=${formatCoordinate(violation.sample.north)}, ` +
        `east=${formatCoordinate(violation.sample.east)}.`,
    );
  }
  for (const violation of phaseClearanceResult.violations) {
    if (!Number.isFinite(violation.headroom)) {
      console.error(`- ${violation.route.name}: ${violation.reason}.`);
      continue;
    }
    console.error(
      `- ${violation.route.name}: ${violation.reason}; ` +
        `needs ${formatDistance(violation.requiredTravel)}, but ` +
        `${violation.availableSeconds.toFixed(2)} s at ` +
        `${MIN_VALIDATED_CLEARING_SPEED.toFixed(2)} world/s provides ` +
        `${formatDistance(violation.availableTravel)} ` +
        `(shortfall ${formatDistance(-violation.headroom)}).`,
    );
  }
  for (const violation of phaseTrafficRegression.violations) {
    if (violation.type === "stopBar") {
      console.error(
        `- ${violation.detail.routeName} crossed its physical stop bar on ` +
          `${violation.signalState} at ${violation.frameRate} Hz, ` +
          `elapsed=${violation.elapsed.toFixed(3)} s: ` +
          `${formatDistance(violation.previous)} -> ` +
          `${formatDistance(violation.current)}, bar target ` +
          `${formatDistance(violation.physicalStopTarget)}.`,
      );
      continue;
    }
    console.error(
      `- phase conflict at ${violation.frameRate} Hz, ` +
        `elapsed=${violation.elapsed.toFixed(3)} s: ` +
        `${violation.mainDetail.routeName} vs ` +
        `${violation.crossDetail.routeName}, SAT gap ` +
        `${formatDistance(violation.rawGap)}; ` +
        `main north/east=${formatCoordinate(violation.mainSample.north)}/` +
        `${formatCoordinate(violation.mainSample.east)}, ` +
        `cross north/east=${formatCoordinate(violation.crossSample.north)}/` +
        `${formatCoordinate(violation.crossSample.east)}.`,
    );
  }
  for (const violation of productionFleetRegression.violations) {
    const first = violation.firstDetail.validation;
    const second = violation.secondDetail.validation;
    const condition =
      violation.rawGap <= 0
        ? `SAT overlap ${formatDistance(-violation.rawGap)}`
        : `SAT clearance ${formatDistance(violation.rawGap)}`;
    console.error(
      `- production same-route ${violation.routeName} at ` +
        `${violation.frameRate} Hz, elapsed=${violation.elapsed.toFixed(3)} s: ` +
        `${condition}; required ` +
        `${formatDistance(PRODUCTION_FLEET_REQUIRED_CLEARANCE)}.`,
    );
    for (const [label, detail, sample] of [
      ["first", first, violation.firstSample],
      ["second", second, violation.secondSample],
    ]) {
      const config = detail.config;
      console.error(
        `  ${label}: ${config.kind} ${config.variant} from ` +
          `index.js:${config.sourceLine}; phase=${config.phase.toFixed(3)}, ` +
          `speed=${violation[`${label}Detail`].speed.toFixed(2)}, ` +
          `queueOffset=${config.queueOffset.toFixed(2)}, ` +
          `laneOffset=${violation[`${label}Detail`].laneOffset.toFixed(3)}, ` +
          `distance=${formatDistance(sample.distance)}, ` +
          `north=${formatCoordinate(sample.north)}, ` +
          `east=${formatCoordinate(sample.east)}, ` +
          `half-length=${formatDistance(detail.halfLength)}, ` +
          `half-width=${formatDistance(detail.halfWidth)}.`,
      );
    }
  }
  process.exitCode = 1;
} else {
  const closestLabel =
    closestClearanceDetail?.obstacle.definition.label ?? "unknown obstacle";
  console.log("Alun-Alun traffic validation passed");
  console.log(
    `Blue-curb surface ownership: ceramic inside / asphalt outside; ` +
      `ceramic rise ${formatDistance(parkSurfaceOwnershipResult.roadToCeramicRise)}; ` +
      `${parkSurfaceOwnershipResult.curbSamples} curb samples, ` +
      `${parkSurfaceOwnershipResult.ceramicSamples} ceramic samples, ` +
      `${parkSurfaceOwnershipResult.asphaltSamples} asphalt samples, ` +
      `${parkSurfaceOwnershipResult.tactilePaverCount} interior tactile pavers`,
  );
  console.log(
    `Raised park navigation: ${parkNavigationResult.surfaceCount} exact polygons; ` +
      `${parkNavigationResult.curbTransitionSamples} walkable curb transitions`,
  );
  console.log(
    `Full-width west frontage: 11.0 m shared / 6.6 m split / 5.2 m branch; ` +
      `37-point asphalt union with ` +
      `${frontageSurfaceResult.coreCoverageSamples.toLocaleString("en-US")} ` +
      `core and ${frontageSurfaceResult.trafficEnvelopeSamples.toLocaleString("en-US")} ` +
      `swept-envelope coverage samples; ` +
      `${frontageSurfaceResult.sidewalkWidth.toFixed(2)} ` +
      `world / ${(frontageSurfaceResult.sidewalkWidth * MAP_METERS_PER_WORLD_UNIT).toFixed(2)} m sidewalk; ` +
      `${frontageSurfaceResult.ownershipSamples.toLocaleString("en-US")} ` +
      `seam-ownership samples; ${frontageSurfaceResult.footprintCount} ` +
      `surveyed footprints; minimum apron/sidewalk clearances ` +
      `${formatDistance(frontageSurfaceResult.minimumApronClearance)} / ` +
      `${formatDistance(frontageSurfaceResult.minimumSidewalkClearance)}.`,
  );
  console.log(
    `Dense KH Wahid Hasyim west edge: full-width asphalt plus ` +
      `${(westLocalCorridorResult.sidewalkWidth * MAP_METERS_PER_WORLD_UNIT).toFixed(2)} m ` +
      `clear sidewalk; ${westLocalCorridorResult.parkTreeCount} park trees, ` +
      `${westLocalCorridorResult.propertyTreeCount} property trees, and ` +
      `${westLocalCorridorResult.utilitySupportCount} utility supports clear ` +
      `the road/tread; minimum complete-footprint clearance ` +
      `${formatDistance(westLocalCorridorResult.minimumPlacementClearance)}; ` +
      `park row ${formatDistance(westLocalCorridorResult.minimumParkTreeRoadCurbClearance)}` +
      `–${formatDistance(westLocalCorridorResult.maximumParkTreeRoadCurbClearance)} ` +
      `inside the road curb with ${formatDistance(westLocalCorridorResult.minimumParkTreeInnerClearance)} ` +
      `minimum inner-boundary clearance; ` +
      `${westLocalCorridorResult.greenEdgeSamples.toLocaleString("en-US")} ` +
      `green-edge asphalt ownership samples.`,
  );
  console.log(
    `Dense Jalan Kartini south edge: 5.20 m core / 6.136 m surface, ` +
      `15 cm curb and 1.50 m clear tread across ` +
      `${southCorridorResult.clearTreadSamples} audited stations; ` +
      `${southCorridorResult.apronCount} property-owned aprons; ` +
      `${southCorridorResult.treeCount} inner-half park trees clear the Gazebo ` +
      `by at least ${formatDistance(southCorridorResult.minimumGazeboClearance)}; ` +
      `${southCorridorResult.benchCount} south-facing benches clear tree wells ` +
      `by at least ${formatDistance(southCorridorResult.minimumBenchTreeClearance)}; ` +
      `${southCorridorResult.obstacleCount} exact shared promenade obstacles; ` +
      `${southNavigationResult.surfaceCount} absolute-height navigation polygons, ` +
      `${southNavigationResult.roadSamples} road and ` +
      `${southNavigationResult.treadSamples} tread samples.`,
  );
  console.log(
    `True south-east junction: 4 rounded returns / ` +
      `${trueSoutheastResult.returnPointCount} surveyed stations; ` +
      `${trueSoutheastResult.navigationPolygonCount} exact render/navigation ` +
      `polygons; facade contact ` +
      `${formatDistance(trueSoutheastResult.facadeContactLength)}; ` +
      `${trueSoutheastResult.productionRouteSamples.toLocaleString("en-US")} ` +
      `production-route samples; ${trueSoutheastResult.sweptSamples.toLocaleString("en-US")} ` +
      `synthetic S↔E + N↔E samples / ` +
      `${trueSoutheastResult.sweptCoverageChecks.toLocaleString("en-US")} ` +
      `road-height coverage checks; ${trueSoutheastResult.ringSamples} ` +
      `walkable monument-ring samples.`,
  );
  console.log(
    `Frontage navigation: ${frontageNavigationResult.surfaceCount} absolute-height ` +
      `polygons; ${frontageNavigationResult.transitionSamples} walkable transitions; ` +
      `${frontageVehicleResult.checkedComparisons.toLocaleString("en-US")} ` +
      `swept-envelope comparisons; minimum vehicle clearance ` +
      `${formatDistance(frontageVehicleResult.minimumGap)} ` +
      `(${frontageVehicleResult.minimumDetail.route.name} vs ` +
      `${frontageVehicleResult.minimumDetail.protectedSurface.label}).`,
  );
  console.log(
    `West PLN corridor: ${utilityCorridorResult.supportCount} property-side ` +
      `supports; complete pole bases clear asphalt, sidewalk, and lowered ` +
      `driveways; minimum surface clearance ` +
      `${formatDistance(utilityCorridorResult.minimumSurfaceClearance)}.`,
  );
  console.log(
    `Routes: ${routes.length}; collision boxes: ${obstacles.length}; ` +
      `route samples: ${checkedSamples.toLocaleString("en-US")}`,
  );
  const closestPedestrianLabel =
    closestPedestrianClearanceDetail?.obstacle.definition.label ??
    "unknown obstacle";
  console.log(
    `Pedestrian routes: ${pedestrianRoutes.length}; crossing: connected; ` +
      `path samples: ${checkedPedestrianSamples.toLocaleString("en-US")}; ` +
      `minimum edge+rider clearance: ` +
      `${formatDistance(closestPedestrianClearance)} ` +
      `(${closestPedestrianClearanceDetail.route.name} vs ` +
      `${closestPedestrianLabel})`,
  );
  const pedestrianVehicleClosest = pedestrianVehicleResult.closest;
  const pedestrianVehicleClosestConfig =
    pedestrianVehicleClosest.productionDetail.validation.config;
  const zebra = pedestrianVehicleResult.allowedZebraZone;
  console.log(
    `Pedestrian/vehicle swept-ribbon audit: ` +
      `${pedestrianVehicleResult.fragmentCount} ribbon fragments outside ` +
      `the explicit zebra; ` +
      `${pedestrianVehicleResult.checkedComparisons.toLocaleString("en-US")} ` +
      `nearby SAT comparisons; minimum clearance ` +
      `${formatDistance(pedestrianVehicleClosest.rawGap)} ` +
      `(${pedestrianVehicleClosest.fragment.route.name} vs ` +
      `${pedestrianVehicleClosest.route.name} ` +
      `${pedestrianVehicleClosestConfig.variant}); required ` +
      `${formatDistance(PEDESTRIAN_VEHICLE_REQUIRED_CLEARANCE)}.`,
  );
  console.log(
    `Allowed zebra zone: north ${formatCoordinate(zebra.minimumNorth)}–` +
      `${formatCoordinate(zebra.maximumNorth)}, east ` +
      `${formatCoordinate(zebra.minimumEast)}–` +
      `${formatCoordinate(zebra.maximumEast)}; no unmarked ribbon exemption.`,
  );
  console.log(
    `Opposing route pairs: ${OPPOSING_ROUTE_PAIRS.length}; ` +
      `nearby envelope comparisons: ` +
      `${checkedRoutePairComparisons.toLocaleString("en-US")}`,
  );
  console.log(
    `Left-lane offsets: main ${ALUN_ALUN_TRAFFIC_LANE_OFFSETS.main.toFixed(2)}, ` +
      `cross ${ALUN_ALUN_TRAFFIC_LANE_OFFSETS.cross.toFixed(2)} world; ` +
      `minimum checked SAT clearance: ${formatDistance(closestClearance)} ` +
      `(${closestClearanceDetail.route.name} vs ${closestLabel})`,
  );
  if (closestRoutePairDetail) {
    console.log(
      `Minimum opposing-route SAT clearance: ` +
        `${formatDistance(closestRoutePairDetail.rawGap)} ` +
        `(${closestRoutePairDetail.firstRoute.name} vs ` +
        `${closestRoutePairDetail.secondRoute.name})`,
    );
  } else {
    console.log(
      "Opposing route envelopes remain outside the spatial-hash broad phase",
    );
  }
  const timing = ALUN_ALUN_TRAFFIC_SIGNAL_TIMING;
  console.log(
    `Signal cycle: ${timing.cycleLength.toFixed(1)} s; ` +
      `main green/amber ${timing.mainGreenEnd.toFixed(1)}/` +
      `${(timing.mainAmberEnd - timing.mainGreenEnd).toFixed(1)} s; ` +
      `cross green/amber ` +
      `${(timing.crossGreenEnd - timing.crossGreenStart).toFixed(1)}/` +
      `${(timing.crossAmberEnd - timing.crossGreenEnd).toFixed(1)} s; ` +
      `all-red ${(
        timing.crossGreenStart - timing.mainAmberEnd
      ).toFixed(1)}/${(
        timing.cycleLength - timing.crossAmberEnd
      ).toFixed(1)} s.`,
  );
  console.log(
    `Analytical constant-speed phase clearance: ` +
      `${phaseClearanceResult.conflictComparisons.toLocaleString("en-US")} ` +
      `conflicting envelope comparisons; minimum headroom ` +
      `${formatDistance(phaseClearanceResult.minimumHeadroom)} ` +
      `at ${MIN_VALIDATED_CLEARING_SPEED.toFixed(2)} world/s ` +
      `(${phaseClearanceResult.minimumHeadroomDetail.route.name}).`,
  );
  const regressionFrameSummary = phaseTrafficRegression.frameRateResults
    .map(
      (result) =>
        `${result.frameRate} Hz ${formatDistance(result.minimumGap)}`,
    )
    .join("; ");
  const regressionFrames = phaseTrafficRegression.frameRateResults.reduce(
    (total, result) => total + result.checkedFrames,
    0,
  );
  const regressionComparisons = phaseTrafficRegression.frameRateResults.reduce(
    (total, result) => total + result.checkedPairComparisons,
    0,
  );
  console.log(
    `Runtime phase regression: ` +
      `${PHASE_REGRESSION_CHECK_CYCLES} checked cycles after ` +
      `${PHASE_REGRESSION_WARMUP_CYCLES} warm-up cycles at ` +
      `${PHASE_REGRESSION_FRAME_RATES.join("/")} Hz; ` +
      `fleet speed ${MIN_PHASE_REGRESSION_SPEED.toFixed(2)}–` +
      `${Math.max(...PHASE_REGRESSION_SPEEDS).toFixed(2)} world/s; ` +
      `${regressionFrames.toLocaleString("en-US")} frames and ` +
      `${regressionComparisons.toLocaleString("en-US")} nearby ` +
      `main/cross comparisons; no SAT overlap or amber/red stop-bar crossing; ` +
      `minimum gaps: ${regressionFrameSummary}.`,
  );
  const productionFrameSummary = productionFleetRegression.frameRateResults
    .map(
      (result) =>
        `${result.frameRate} Hz ${formatDistance(result.minimumGap)}`,
    )
    .join("; ");
  const productionFrames = productionFleetRegression.frameRateResults.reduce(
    (total, result) => total + result.checkedFrames,
    0,
  );
  const productionComparisons =
    productionFleetRegression.frameRateResults.reduce(
      (total, result) => total + result.checkedPairComparisons,
      0,
    );
  console.log(
    `Production same-route regression: ${productionFleetConfigs.length} ` +
      `vehicles parsed from index.js with their actual phases, speeds, lane and ` +
      `queue offsets; ${PRODUCTION_FLEET_CHECK_CYCLES} signal cycles at ` +
      `${PRODUCTION_FLEET_FRAME_RATES.join("/")} Hz; ` +
      `${productionFrames.toLocaleString("en-US")} frames and ` +
      `${productionComparisons.toLocaleString("en-US")} same-route SAT comparisons; ` +
      `required clearance ${formatDistance(PRODUCTION_FLEET_REQUIRED_CLEARANCE)}; ` +
      `minimum gaps: ${productionFrameSummary}.`,
  );
}
