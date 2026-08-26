import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createAmbientAnimationSystem } from "../src/animation/ambient.js";
import {
  ALUN_ALUN_NORTH_APRON_ROADSIDE_SEAM,
  ALUN_ALUN_NORTH_PARK_APRON_OUTLINE,
  ALUN_ALUN_NORTH_PARK_CONTINUATION_BAND_OUTLINE,
  ALUN_ALUN_PARK_OUTLINE,
  ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS,
  ALUN_ALUN_SOUTH_APPROACH_DEFINITION,
  ALUN_ALUN_SOUTH_CROSSING_DEFINITION,
  ALUN_ALUN_TRAFFIC_LANE_OFFSETS,
  ALUN_ALUN_TRAFFIC_MINIMUM_SPEED,
  ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS,
  ALUN_ALUN_TRAFFIC_SIGNAL_TIMING,
  ALUN_ALUN_WEST_PARK_SIDE_CARRIAGEWAY_PATH,
  ALUN_ALUN_WEST_ROAD_OUTER_WIDTH,
  ALUN_ALUN_WEST_SHARED_ROAD_PATH,
  createAlunAlunTrafficFactory,
  createAlunAlunRoadRibbonGeometry,
  createAlunAlunRoadsideBandGeometry,
  createAlunAlunRoadShoulderGeometry,
  getAlunAlunTrafficSignalState,
} from "../src/features/landmarks/alun-alun/traffic.js";
import {
  ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES,
} from "../src/features/landmarks/alun-alun/index.js";

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

function validateWestApronRoadSeam() {
  const seam = ALUN_ALUN_NORTH_APRON_ROADSIDE_SEAM;
  const apron = ALUN_ALUN_NORTH_PARK_APRON_OUTLINE;
  const continuation = ALUN_ALUN_NORTH_PARK_CONTINUATION_BAND_OUTLINE;
  const samePoint = (first, second, epsilon = 1e-8) =>
    Math.hypot(first[0] - second[0], first[1] - second[1]) <= epsilon;
  if (
    seam.length !== 3 ||
    apron.length < 8 ||
    polygonArea(apron) < 1 ||
    continuation.length !== 9 ||
    polygonArea(continuation) < 1
  ) {
    throw new Error("north-west checker apron needs one usable 3-point road seam");
  }
  const seamStartIndex = apron.findIndex((point) => samePoint(point, seam[0]));
  if (
    seamStartIndex < 1 ||
    seamStartIndex + seam.length >= apron.length ||
    seam.some(
      (point, index) => !samePoint(point, apron[seamStartIndex + index]),
    )
  ) {
    throw new Error("north-west checker apron must contain the complete road seam");
  }
  if (!samePoint(continuation[0], seam.at(-1))) {
    throw new Error("north-west continuation must begin at the clipped apron exit");
  }

  const cross = (start, end, point) =>
    (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0]);
  const pointOnSegment = (point, start, end) =>
    Math.abs(cross(start, end, point)) <= 1e-8 &&
    point[0] >= Math.min(start[0], end[0]) - 1e-9 &&
    point[0] <= Math.max(start[0], end[0]) + 1e-9 &&
    point[1] >= Math.min(start[1], end[1]) - 1e-9 &&
    point[1] <= Math.max(start[1], end[1]) + 1e-9;
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
  [
    ["north-west checker apron", apron],
    ["north-west continuation band", continuation],
  ].forEach(([label, polygon]) => {
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
            `${label} self-intersects at edges ${first}/${second}`,
          );
        }
      }
    }
  });

  const apronExitEdge = [seam.at(-1), apron[seamStartIndex + seam.length]];
  if (
    !pointOnSegment(continuation.at(-1), ...apronExitEdge) ||
    !samePoint(continuation[6], ALUN_ALUN_PARK_OUTLINE[11]) ||
    !samePoint(continuation[7], ALUN_ALUN_PARK_OUTLINE[12]) ||
    !pointOnSegment(
      continuation[8],
      ALUN_ALUN_PARK_OUTLINE[12],
      ALUN_ALUN_PARK_OUTLINE[13],
    )
  ) {
    throw new Error(
      "north-west continuation must terminate on the apron and park curb",
    );
  }
  const southOutline = ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline;
  if (
    !pointOnSegment(continuation[3], southOutline[7], southOutline[8]) ||
    !samePoint(continuation[4], southOutline[7]) ||
    !samePoint(continuation[5], southOutline[6]) ||
    !samePoint(continuation[6], southOutline[5])
  ) {
    throw new Error(
      "north-west continuation must share the south-approach asphalt edge",
    );
  }

  const roadGeometries = [
    createAlunAlunRoadRibbonGeometry(
      ALUN_ALUN_WEST_SHARED_ROAD_PATH,
      ALUN_ALUN_WEST_ROAD_OUTER_WIDTH,
    ),
    createAlunAlunRoadRibbonGeometry(
      ALUN_ALUN_WEST_PARK_SIDE_CARRIAGEWAY_PATH,
      ALUN_ALUN_WEST_ROAD_OUTER_WIDTH,
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
  const pointInsideRoad = (point) => roadGeometries.some((geometry) => {
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

  try {
    seam.slice(0, -1).forEach((start, segmentIndex) => {
      const end = seam[segmentIndex + 1];
      const deltaNorth = end[0] - start[0];
      const deltaEast = end[1] - start[1];
      const length = Math.hypot(deltaNorth, deltaEast);
      const normal = [-deltaEast / length, deltaNorth / length];
      for (let sampleIndex = 1; sampleIndex < 10; sampleIndex += 1) {
        const amount = sampleIndex / 10;
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
        const firstInApron = pointInsidePolygon(firstSample, apron);
        const secondInApron = pointInsidePolygon(secondSample, apron);
        const firstInRoad = pointInsideRoad(firstSample);
        const secondInRoad = pointInsideRoad(secondSample);
        if (
          firstInApron === secondInApron ||
          firstInRoad === secondInRoad ||
          firstInApron === firstInRoad ||
          secondInApron === secondInRoad
        ) {
          throw new Error(
            `north-west asphalt/checker seam overlaps or gaps at segment ` +
              `${segmentIndex}, sample ${sampleIndex}`,
          );
        }
      }
    });

    const continuationRoadEdge = continuation.slice(0, 4);
    continuationRoadEdge.slice(0, -1).forEach((start, segmentIndex) => {
      const end = continuationRoadEdge[segmentIndex + 1];
      const deltaNorth = end[0] - start[0];
      const deltaEast = end[1] - start[1];
      const length = Math.hypot(deltaNorth, deltaEast);
      const normal = [-deltaEast / length, deltaNorth / length];
      for (let sampleIndex = 1; sampleIndex < 10; sampleIndex += 1) {
        const amount = sampleIndex / 10;
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
        const firstInBand = pointInsidePolygon(firstSample, continuation);
        const secondInBand = pointInsidePolygon(secondSample, continuation);
        const firstInRoad = pointInsideRoad(firstSample);
        const secondInRoad = pointInsideRoad(secondSample);
        if (
          firstInBand === secondInBand ||
          firstInRoad === secondInRoad ||
          firstInBand === firstInRoad ||
          secondInBand === secondInRoad
        ) {
          throw new Error(
            `north-west continuation/road edge overlaps or gaps at segment ` +
              `${segmentIndex}, sample ${sampleIndex}`,
          );
        }
      }
    });

    const continuationVertices = continuation.map(
      ([north, east]) => new THREE.Vector2(north, east),
    );
    const continuationTriangles = THREE.ShapeUtils.triangulateShape(
      continuationVertices,
      [],
    );
    continuationTriangles.forEach((face, faceIndex) => {
      const triangle = face.map((vertexIndex) => continuation[vertexIndex]);
      const subdivisions = 10;
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
          if (
            pointInsideRoad(point) ||
            pointInsidePolygon(point, apron) ||
            pointInsidePolygon(point, ALUN_ALUN_PARK_OUTLINE) ||
            pointInsidePolygon(point, southOutline)
          ) {
            throw new Error(
              `north-west continuation overlaps an owned surface in triangle ` +
                `${faceIndex}`,
            );
          }
        }
      }
    });
  } finally {
    roadGeometries.forEach((geometry) => geometry.dispose());
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
}

function validateSouthApproachSurfaceDefinition() {
  const definition = ALUN_ALUN_SOUTH_APPROACH_DEFINITION;
  const {
    frontageOuterBoundary,
    junctionEastJoin,
    junctionWestJoin,
    parkCurbSeam,
    roadsideSeam,
    sidewalkCenterline,
    sidewalkOuterBoundary,
    sidewalkWidth,
    surfaceOutline,
  } = definition;
  const boundaryCollections = [
    ["roadside seam", roadsideSeam],
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

  const parkSeamStartIndex = surfaceOutline.findIndex((point) =>
    samePoint(point, parkCurbSeam[0]),
  );
  if (
    parkSeamStartIndex < 0 ||
    parkSeamStartIndex + parkCurbSeam.length > surfaceOutline.length ||
    parkCurbSeam.some(
      (point, index) =>
        !samePoint(point, surfaceOutline[parkSeamStartIndex + index]),
    )
  ) {
    throw new Error(
      "south approach asphalt must share the complete park curb boundary",
    );
  }

  for (let index = 0; index < parkCurbSeam.length - 1; index += 1) {
    const start = parkCurbSeam[index];
    const end = parkCurbSeam[index + 1];
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
    const centerPoint = sidewalkCenterline[index];
    const sidewalkOuterPoint = sidewalkOuterBoundary[index];
    const frontageOuterPoint = frontageOuterBoundary[index];
    const expectedCenter = [
      (seamPoint[0] + sidewalkOuterPoint[0]) * 0.5,
      (seamPoint[1] + sidewalkOuterPoint[1]) * 0.5,
    ];
    if (
      Math.abs(pointDistance(seamPoint, sidewalkOuterPoint) - sidewalkWidth) >
        1e-8 ||
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
try {
  validateSignalTiming();
  validateRoadSurfaceGeometry();
  validateWestApronRoadSeam();
  validateSouthApproachSurfaceDefinition();
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
let productionFleet;
let pedestrianVehicleResult;
try {
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
