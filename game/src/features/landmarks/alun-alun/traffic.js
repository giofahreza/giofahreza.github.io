import * as THREE from "three";
import {
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../../rendering/materials.js";

// Midline between the two surveyed carriageways west of the signalised
// junction.  The earlier straight median at north=21 crossed the eastbound
// carriageway for roughly 6.5 metres.  Keeping the path and its taper exported
// lets the visual mesh and navigation collision use the same geometry.
export const ALUN_ALUN_WEST_MEDIAN_PATH = Object.freeze([
  Object.freeze([18.4, 0.15]),
  Object.freeze([18.86, 1.5]),
  Object.freeze([19.23, 3.0]),
  Object.freeze([19.79, 5.0]),
  Object.freeze([20.35, 7.0]),
  Object.freeze([20.94, 9.0]),
  Object.freeze([21.37, 10.5]),
  Object.freeze([21.48, 10.88]),
]);

export const ALUN_ALUN_WEST_MEDIAN_WIDTHS = Object.freeze([
  0.08,
  0.22,
  0.36,
  0.42,
  0.44,
  0.44,
  0.42,
  0.34,
]);

export const ALUN_ALUN_ROAD_SURFACE_Y = 0.047;

function roadRibbonFrame(points, index) {
  const [north, east] = points[index];
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const deltaNorth = next[0] - previous[0];
  const deltaEast = next[1] - previous[1];
  const length = Math.hypot(deltaNorth, deltaEast) || 1;
  return {
    north,
    east,
    lateralNorth: -deltaEast / length,
    lateralEast: deltaNorth / length,
  };
}

function offsetAlunAlunRoadPath(points, offsetOrOffsets) {
  return points.map((_, index) => {
    const frame = roadRibbonFrame(points, index);
    const offset = Array.isArray(offsetOrOffsets)
      ? offsetOrOffsets[index]
      : offsetOrOffsets;
    return [
      frame.north + frame.lateralNorth * offset,
      frame.east + frame.lateralEast * offset,
    ];
  });
}

// Keep this geometry builder exported so the offline traffic validator can
// catch a reversed triangle winding before it becomes a gameplay-only road
// glitch. The first implementation wound every triangle toward -Y, so the
// normal pass culled the asphalt while OutlineEffect exposed it as dark wedges.
export function createAlunAlunRoadRibbonGeometry(points, widthOrWidths) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let pathDistance = 0;
  points.forEach((point, index) => {
    const width = Array.isArray(widthOrWidths)
      ? widthOrWidths[index]
      : widthOrWidths;
    if (index > 0) {
      const previousPoint = points[index - 1];
      pathDistance += Math.hypot(
        point[0] - previousPoint[0],
        point[1] - previousPoint[1],
      );
    }
    const frame = roadRibbonFrame(points, index);
    const offsetNorth = frame.lateralNorth * width * 0.5;
    const offsetEast = frame.lateralEast * width * 0.5;
    positions.push(
      frame.north + offsetNorth,
      0,
      frame.east + offsetEast,
      frame.north - offsetNorth,
      0,
      frame.east - offsetEast,
    );
    const textureU = width / 0.8;
    const textureV = pathDistance / 0.8;
    uvs.push(0, textureV, textureU, textureV);
    if (index < points.length - 1) {
      const row = index * 2;
      // Viewed from above, both triangles now wind counter-clockwise and
      // therefore produce +Y normals with the default FrontSide materials.
      indices.push(row, row + 2, row + 1, row + 1, row + 2, row + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// Build only the two exposed shoulder bands. A former full-width gutter plane
// sat 2.5 mm under the full asphalt plane, which collapsed to the same depth at
// low chase-camera angles. These bands share the asphalt edge but never occupy
// its interior, removing that source of z-fighting entirely.
export function createAlunAlunRoadShoulderGeometry(
  points,
  innerWidth,
  outerWidth,
) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const innerHalfWidth = innerWidth * 0.5;
  const outerHalfWidth = outerWidth * 0.5;
  let pathDistance = 0;

  points.forEach((point, index) => {
    if (index > 0) {
      const previousPoint = points[index - 1];
      pathDistance += Math.hypot(
        point[0] - previousPoint[0],
        point[1] - previousPoint[1],
      );
    }
    const frame = roadRibbonFrame(points, index);
    const pointAtOffset = (offset) => [
      frame.north + frame.lateralNorth * offset,
      0,
      frame.east + frame.lateralEast * offset,
    ];
    positions.push(
      ...pointAtOffset(outerHalfWidth),
      ...pointAtOffset(innerHalfWidth),
      ...pointAtOffset(-innerHalfWidth),
      ...pointAtOffset(-outerHalfWidth),
    );
    const textureV = pathDistance / 0.8;
    uvs.push(0, textureV, 1, textureV, 0, textureV, 1, textureV);

    if (index < points.length - 1) {
      const row = index * 4;
      const nextRow = row + 4;
      indices.push(
        row,
        nextRow,
        row + 1,
        row + 1,
        nextRow,
        nextRow + 1,
        row + 2,
        nextRow + 2,
        row + 3,
        row + 3,
        nextRow + 2,
        nextRow + 3,
      );
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// A roadside band owns both of its boundaries explicitly. This is used where
// the pavement must meet an asphalt edge exactly: rebuilding both surfaces as
// independent centreline ribbons makes their mitres diverge on every bend and
// produces alternating overlaps and gaps.
export function createAlunAlunRoadsideBandGeometry(
  innerBoundary,
  outerBoundary,
) {
  if (innerBoundary.length !== outerBoundary.length) {
    throw new Error("roadside band boundaries must have matching point counts");
  }

  const positions = [];
  const uvs = [];
  const indices = [];
  let pathDistance = 0;
  innerBoundary.forEach((point, index) => {
    if (index > 0) {
      const previousPoint = innerBoundary[index - 1];
      pathDistance += Math.hypot(
        point[0] - previousPoint[0],
        point[1] - previousPoint[1],
      );
    }
    const outerPoint = outerBoundary[index];
    const width = Math.hypot(
      outerPoint[0] - point[0],
      outerPoint[1] - point[1],
    );
    positions.push(
      point[0],
      0,
      point[1],
      outerPoint[0],
      0,
      outerPoint[1],
    );
    const textureV = pathDistance / 0.8;
    uvs.push(0, textureV, width / 0.8, textureV);
    if (index < innerBoundary.length - 1) {
      const row = index * 2;
      indices.push(
        row,
        row + 1,
        row + 2,
        row + 1,
        row + 3,
        row + 2,
      );
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// Nine seconds of green and two seconds of amber are followed by a five-second
// clearance interval. The junction's long, channelised paths need more than
// the former one-second all-red interval for the slowest truck to leave every
// perpendicular conflict point. Starting at the cross green keeps the initial
// scene lively without changing the phase lengths.
export const ALUN_ALUN_TRAFFIC_SIGNAL_TIMING = Object.freeze({
  cycleLength: 32,
  startOffset: 16,
  mainGreenEnd: 9,
  mainAmberEnd: 11,
  crossGreenStart: 16,
  crossGreenEnd: 25,
  crossAmberEnd: 27,
});

// The fixed-time clearance interval is validated against this lower bound.
// Keeping it in the runtime path prevents a future decorative vehicle from
// silently moving too slowly to leave the junction before cross traffic starts.
export const ALUN_ALUN_TRAFFIC_MINIMUM_SPEED = 1.7;

export function getAlunAlunTrafficSignalState(elapsed, route = "main") {
  const timing = ALUN_ALUN_TRAFFIC_SIGNAL_TIMING;
  const cycle = (elapsed + timing.startOffset) % timing.cycleLength;
  if (route === "cross") {
    if (cycle < timing.crossGreenStart) return "red";
    if (cycle < timing.crossGreenEnd) return "green";
    if (cycle < timing.crossAmberEnd) return "amber";
    return "red";
  }
  if (cycle < timing.mainGreenEnd) return "green";
  if (cycle < timing.mainAmberEnd) return "amber";
  return "red";
}

// Runtime traffic and the offline validator share these left-hand lane
// centres. The main road needs the full 1.6 metre offset visible on the
// undivided western approach; the former 1.4 metre offset let long vehicles
// clip each other where the two surveyed carriageways merge.
export const ALUN_ALUN_TRAFFIC_LANE_OFFSETS = Object.freeze({
  main: -0.33,
  cross: -0.33,
});

// Midline of the narrow divider between the two south-arm carriageways. The
// two surveyed OSM centrelines merge near north=10 and separate toward the
// junction. Leaving that gap uncovered exposed a large pale/green map wedge
// where Street View instead shows a tapered blue-white median.
export const ALUN_ALUN_SOUTH_MEDIAN_PATH = Object.freeze([
  Object.freeze([15.5, 14.287]),
  Object.freeze([15.86, 14.226]),
  // Exact edges of the dropped pedestrian opening. The extra margin around
  // the 2.8-metre zebra keeps the avatar radius clear of the adjacent raised
  // median collision while the soil ribbon remains visually continuous.
  Object.freeze([16.22, 14.174]),
  Object.freeze([17.14, 14.045]),
  Object.freeze([17.44, 14.009]),
  Object.freeze([18.0, 13.912]),
  Object.freeze([19.0, 13.739]),
  Object.freeze([19.25, 13.695]),
]);

export const ALUN_ALUN_SOUTH_MEDIAN_WIDTHS = Object.freeze([
  0.02,
  0.09,
  0.19,
  0.32,
  0.38,
  0.34,
  0.27,
  0.02,
]);

const freezePath = (points) =>
  Object.freeze(points.map((point) => Object.freeze(point)));

// Keep every part of the single Street View crossing in one definition. The
// zebra, both curb openings and the median refuge must move together or a small
// but impassable-looking asphalt gap reappears.
export const ALUN_ALUN_SOUTH_CROSSING_DEFINITION = Object.freeze({
  stripeCount: 14,
  stripeStartEast: 11.35,
  stripeEndEast: 13.9,
  stripeStartNorth: 16.4,
  stripeEndNorth: 16.96,
  parkCurbGap: Object.freeze({ edge: 9, start: 0.3, end: 0.82 }),
  parkCurbEdge: freezePath([
    [16.13, 11.96],
    [17.1, 10.85],
  ]),
  medianCurbGapNorth: Object.freeze({ start: 16.22, end: 17.14 }),
  refuge: Object.freeze({
    north: 16.68,
    east: 14.14,
    width: 0.72,
    depth: 0.4,
  }),
  droppedCurb: Object.freeze({
    north: 16.68,
    east: 13.94,
    width: 0.72,
    depth: 0.12,
  }),
});

// Retain the focused export for collision code and existing consumers while
// making the complete crossing definition the source of truth.
export const ALUN_ALUN_SOUTH_CROSSING_REFUGE =
  ALUN_ALUN_SOUTH_CROSSING_DEFINITION.refuge;

// The north-west checker apron and asphalt share this surveyed road edge.
// Previously the apron used an independent three-point wedge that covered the
// entire undivided carriageway; a negative asphalt depth offset then made the
// buried square road cap pop through only after the camera crossed it.
export const ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH = 1.32;
export const ALUN_ALUN_WEST_ROAD_OUTER_WIDTH =
  ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH +
  Math.min(0.28, ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH * 0.18);
export const ALUN_ALUN_WEST_SHARED_ROAD_PATH = freezePath([
  [11.08, -29.16],
  [11.28, -28.46],
  [13.32, -19.4],
  [17.56, -2.74],
]);
export const ALUN_ALUN_WEST_PARK_SIDE_CARRIAGEWAY_PATH = freezePath([
  [17.56, -2.74],
  [18.12, 2.2],
  [19.7, 7.96],
  [20.46, 12.08],
]);
// Clip only the part of the original checker apron that intersected the two
// asphalt ribbons. The middle point is the exact meeting of their independently
// mitred outer boundaries; the points on either side are where those boundaries
// enter and leave the original apron. Following the road all the way around the
// corner would turn the carriageway itself into checker paving.
export const ALUN_ALUN_NORTH_APRON_ROADSIDE_SEAM = freezePath([
  [14.234241339, -12.6501676756],
  [16.7921987068, -2.5992356382],
  [16.9364727922, -1.3327769802],
]);
export const ALUN_ALUN_NORTH_PARK_APRON_OUTLINE = freezePath([
  [13.9, -12.8],
  ...ALUN_ALUN_NORTH_APRON_ROADSIDE_SEAM,
  [17.1, 10.85],
  [16.9, 11.08],
  [16.48, 11.56],
  [16.35, 11.71],
  [15.7, 12.05],
  [13.8, 9.8],
]);

// Continue the checker footway only through the residual ground strip after
// the clipped apron leaves the road. Every edge is shared with an existing
// owner: west-road shoulder, south-approach asphalt, park curb, or the apron
// above. Keeping this as a separate simple polygon avoids the concave apron
// triangulation that previously laid checker paving across the carriageway.
export const ALUN_ALUN_NORTH_PARK_CONTINUATION_BAND_OUTLINE = freezePath([
  [16.9364727922, -1.3327769802],
  [17.3563237698, 2.352735246],
  [18.9421650721, 8.1394872198],
  [19.4747273835, 11.0303555953],
  [19.25, 10.65],
  [18.6, 8.7],
  [18.01, 9.28],
  [18.25, 6.85],
  [16.9777360736, 1.7413374875],
]);

// Surveyed east-side park curb. Street View shows the carriageway meeting this
// checker-paved edge directly, apart from the physical curb/drain itself. Keep
// it shared with index.js so the park and asphalt cannot drift apart again.
export const ALUN_ALUN_PARK_EAST_CURB_PATH = freezePath([
  [-11.03, 17.58],
  [-9.98, 17.67],
  [16.13, 11.96],
  [17.1, 10.85],
  [18.01, 9.28],
]);

// Complete protected paving outline. The generated OSM-road validator uses
// this same polygon so inferred road widths cannot spill back across the
// checker plaza while the landmark and validation silently drift apart.
export const ALUN_ALUN_PARK_OUTLINE = freezePath([
  [9.97, -17.55],
  [-14.93, -12.39],
  [-16.17, -11.46],
  [-17.44, -9.55],
  [-17.47, -7.21],
  [-12.92, 15.29],
  [-12.16, 16.87],
  ...ALUN_ALUN_PARK_EAST_CURB_PATH,
  [18.25, 6.85],
  [12.41, -16.6],
  [11.4, -17.34],
]);

// The south approach used to be rendered as one wide ribbon followed by two
// narrow ribbons that all met at the same centre point. The narrow pair then
// occupied the same asphalt for roughly 27 metres before reaching the median,
// while the independently surveyed footway alternated between covering that
// asphalt and drifting away from it. Build one union outline instead. Its east
// boundary is also the exact curb seam used by the pedestrian bands below.
const SOUTH_APPROACH_SHARED_CORE_WIDTH = 2.42;
const SOUTH_APPROACH_SPLIT_CORE_WIDTH = 1.32;
const SOUTH_APPROACH_SHARED_OUTER_WIDTH =
  SOUTH_APPROACH_SHARED_CORE_WIDTH + 0.28;
const SOUTH_APPROACH_SPLIT_OUTER_WIDTH =
  SOUTH_APPROACH_SPLIT_CORE_WIDTH +
  Math.min(0.28, SOUTH_APPROACH_SPLIT_CORE_WIDTH * 0.18);
const SOUTH_APPROACH_SIDEWALK_WIDTH = 0.38;
const SOUTH_APPROACH_FRONTAGE_WIDTH = 0.5;
const southApproachSharedTransitionPath = freezePath([
  [-12.84, 20.78],
  [-8.5, 19.6],
  [-1.52, 17.94],
  [10.06, 15.2],
  // This midpoint is where the two OSM carriageways actually reach the first
  // physical median point. It supplies the transition tangent only; the outer
  // boundaries below switch to the two measured carriageway edges here.
  [15.5, 14.287],
]);
const southApproachWestSplitPath = freezePath([
  [15.5, 13.624],
  [15.86, 13.52],
  [17.14, 13.2],
  [20.16, 12.78],
]);
const southApproachSharedWestBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachSharedTransitionPath,
    -SOUTH_APPROACH_SHARED_OUTER_WIDTH * 0.5,
  ).slice(0, -1),
);
const southApproachSharedEastBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachSharedTransitionPath,
    SOUTH_APPROACH_SHARED_OUTER_WIDTH * 0.5,
  ).slice(0, -1),
);
const southApproachWestBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachWestSplitPath,
    -SOUTH_APPROACH_SPLIT_OUTER_WIDTH * 0.5,
  ),
);
// The eastern carriageway flares into the open junction. Keeping its roadside
// edge at the narrow 6.6-metre branch width put the box-truck swept envelope
// outside the asphalt. These points retain that measured flare while giving
// the footway one clean boundary to follow.
const southApproachEastBoundary = freezePath([
  [15.536, 15.727],
  [17.55, 15.71],
  [20.55, 15.36],
]);
const southApproachParkSideBoundary = freezePath([
  southApproachSharedWestBoundary[0],
  ...ALUN_ALUN_PARK_EAST_CURB_PATH,
  // Wrap the asphalt around the compact junction corner, replacing the old
  // overlapping underlay patch with one continuous, non-coplanar outline.
  [18.6, 8.7],
  [19.25, 10.65],
  southApproachWestBoundary.at(-1),
]);
const southApproachRoadsideSeam = freezePath([
  ...southApproachSharedEastBoundary,
  ...southApproachEastBoundary,
]);
const southApproachSidewalkCenterline = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    SOUTH_APPROACH_SIDEWALK_WIDTH * 0.5,
  ),
);
const southApproachSidewalkOuterBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    SOUTH_APPROACH_SIDEWALK_WIDTH,
  ),
);
const southApproachFrontageOuterBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    SOUTH_APPROACH_SIDEWALK_WIDTH + SOUTH_APPROACH_FRONTAGE_WIDTH,
  ),
);

export const ALUN_ALUN_SOUTH_APPROACH_DEFINITION = Object.freeze({
  sharedCoreWidth: SOUTH_APPROACH_SHARED_CORE_WIDTH,
  splitCoreWidth: SOUTH_APPROACH_SPLIT_CORE_WIDTH,
  splitNorth: 15.5,
  surfaceOutline: freezePath([
    ...southApproachParkSideBoundary,
    ...[...southApproachEastBoundary].reverse(),
    ...[...southApproachSharedEastBoundary].reverse(),
  ]),
  parkCurbSeam: ALUN_ALUN_PARK_EAST_CURB_PATH,
  roadsideSeam: southApproachRoadsideSeam,
  sidewalkCenterline: southApproachSidewalkCenterline,
  sidewalkOuterBoundary: southApproachSidewalkOuterBoundary,
  sidewalkWidth: SOUTH_APPROACH_SIDEWALK_WIDTH,
  frontageOuterBoundary: southApproachFrontageOuterBoundary,
  frontageWidth: SOUTH_APPROACH_FRONTAGE_WIDTH,
  junctionWestJoin: southApproachWestBoundary.at(-1),
  junctionEastJoin: southApproachEastBoundary.at(-1),
});

// Keep the compact junction's custom loop and masking polygon available to
// validation. The generic OSM loop bends farther west at its south-west nose
// than the traffic centreline below; the extra [21.04, 10.86] boundary point
// covers that measured core without reaching the park or either footway.
export const ALUN_ALUN_JUNCTION_LOOP_PATH = freezePath([
  [22.64, 11.56],
  [23.12, 11.92],
  [23.42, 12.36],
  [23.58, 12.86],
  [23.58, 13.4],
  [23.4, 13.92],
  [23.0, 14.44],
  [22.42, 14.76],
  [21.76, 14.84],
  [21.12, 14.68],
  [20.52, 14.22],
  [20.18, 13.54],
  [20.16, 12.78],
  [20.46, 12.08],
  [20.9, 11.9],
  [21.46, 11.9],
  [22.06, 11.9],
  [22.64, 11.82],
]);
export const ALUN_ALUN_JUNCTION_LOOP_CORE_WIDTH = 1.32;
export const ALUN_ALUN_JUNCTION_LOOP_SURFACE_WIDTH =
  ALUN_ALUN_JUNCTION_LOOP_CORE_WIDTH +
  Math.min(0.28, ALUN_ALUN_JUNCTION_LOOP_CORE_WIDTH * 0.18);
export const ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE = freezePath([
  ALUN_ALUN_SOUTH_APPROACH_DEFINITION.junctionWestJoin,
  ALUN_ALUN_SOUTH_APPROACH_DEFINITION.junctionEastJoin,
  [21.4, 15.86],
  [23.7, 15.66],
  [24.72, 15.0],
  [25.0, 13.7],
  [24.62, 12.1],
  [23.52, 10.82],
  [21.6, 10.58],
  [21.04, 10.86],
]);

const definePedestrianRoute = (points, width, curbSide) => Object.freeze({
  points: freezePath(points),
  width,
  curbSide,
});

export const ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS = Object.freeze({
  // This is the only marked vehicle/pedestrian conflict at the junction. Keep
  // it explicit so validation covers the whole walk from the checker-paved
  // park curb, over the zebra and dropped curb, onto the median refuge.
  southCrossing: definePedestrianRoute([
    [16.68, 11.08],
    [16.68, 13.9],
    [16.68, 14.34],
  ], 0.56, 1),
  southEast: definePedestrianRoute(
    ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkCenterline,
    ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkWidth,
    -1,
  ),
  northWest: definePedestrianRoute([
    // Start after the curb return. Extending this ribbon into the open
    // intersection put pedestrians inside both the northbound and eastbound
    // swept vehicle envelopes.
    [24.9, 12.32],
    [27.18, 12.67],
    [27.52, 12.75],
    [29.43, 13.04],
    [32.48, 13.85],
  ], 0.3, 1),
  northEast: definePedestrianRoute([
    // The footway begins behind the signal pole instead of projecting into
    // the channelised junction.  Street View shows pedestrians joining the
    // north arm at the curb return, not walking through the turning lane.
    [24.9, 14.7],
    [26.9, 14.92],
    [27.5, 14.98],
    // Hold the line until clear of the ARUM facade, then turn behind its
    // north-west corner; a diagonal shortcut here clipped the shop collider.
    [27.92, 15.0],
    [28.1, 15.2],
    [28.89, 15.55],
    [31.92, 16.4],
  ], 0.28, -1),
});

const defineTrafficRoute = (points, stopIndex) => Object.freeze({
  points: freezePath(points),
  stopIndex,
});

export const ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS = Object.freeze({
  mainEastbound: defineTrafficRoute([
    [13.2, -20.0],
    [15.5, -11.0],
    [17.56, -2.74],
    [19.72, 1.58],
    [21.4, 7.46],
    [22.72, 11.05],
    [23.12, 11.92],
    [23.42, 12.36],
    [23.58, 12.86],
    [23.58, 13.4],
    [23.4, 13.92],
    [24.42, 18.7],
    [26.06, 25.88],
    [27.12, 29.38],
  ], 5),
  mainWestbound: defineTrafficRoute([
    [26.28, 32.02],
    [24.98, 27.88],
    [22.6, 19.22],
    [21.34, 15.35],
    [21.12, 14.68],
    [20.52, 14.22],
    [20.18, 13.54],
    [20.16, 12.78],
    [20.46, 12.08],
    [19.7, 7.96],
    [18.12, 2.2],
    [17.56, -2.74],
    [15.5, -11.0],
    [13.2, -20.0],
  ], 3),
  crossNorthbound: defineTrafficRoute([
    [-15.8, 21.58],
    [-12.84, 20.78],
    [-8.5, 19.6],
    [-1.52, 17.94],
    [10.06, 15.2],
    [15.86, 13.52],
    [16.15, 13.45],
    [17.14, 13.2],
    [19.7, 12.85],
    [20.05, 12.68],
    [20.28, 12.4],
    [20.46, 12.08],
    [20.9, 11.9],
    [21.46, 11.9],
    [22.06, 11.9],
    [22.64, 11.82],
    [23.12, 11.92],
    [23.42, 12.36],
    [23.58, 12.86],
    [29.16, 14.28],
    [32.2, 15.1],
  ], 6),
  crossSouthbound: defineTrafficRoute([
    [32.2, 15.1],
    [29.16, 14.28],
    [24.25, 13.4],
    [23.95, 13.48],
    [23.7, 13.62],
    [23.5, 13.78],
    [23.4, 13.92],
    [23.0, 14.44],
    [22.42, 14.76],
    [21.76, 14.84],
    [21.12, 14.68],
    [20.52, 14.22],
    [17.44, 14.86],
    [10.06, 15.2],
    [-1.52, 17.94],
    [-8.5, 19.6],
    [-12.84, 20.78],
    [-15.8, 21.58],
  ], 2),
});

export function createAlunAlunTrafficFactory({
  collections: {
    animatedStopDetails,
  },
  helpers: {
    addIndonesianFlag,
    getSitubondoSignMaterial,
  },
  materials: {
    inkMaterial,
    trunkMaterial,
  },
  roadside: {
    addAlunAlunTree,
    addAlunAlunEastJunctionFrontage,
    addAlunAlunIntersectionBoards,
    addAlunAlunMedianPlanter,
    addAlunAlunParkedPickup,
    addAlunAlunParkedVehicle,
    addAlunAlunPostOffice,
    addAlunAlunRoadBarrier,
    addAlunAlunVendorCart,
    addAlunAlunWestRoadsideContext,
  },
}) {
  function addAlunAlunTrafficSignal(
    group,
    north,
    east,
    roadDirection,
    faceDirection,
    signalMaterials,
    yaw = 0,
    headReach = 0.96,
  ) {
    const signal = new THREE.Group();
    signal.position.set(north, 0.05, east);
    signal.rotation.y = yaw;
    const poleMaterial = toonMaterial({ color: 0x7d8581 });
    const housingMaterial = toonMaterial({ color: 0x252b2b });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.043, 1.7, 8), poleMaterial);
    pole.position.y = 0.85;
    signal.add(pole);
    const arm = new THREE.Mesh(
      roundedBox(headReach + 0.08, 0.04, 0.04, 0.011),
      poleMaterial,
    );
    arm.position.set(roadDirection * headReach * 0.5, 1.64, 0);
    signal.add(arm);
    const headX = roadDirection * headReach;
    const housing = new THREE.Mesh(roundedBox(0.12, 0.25, 0.1, 0.02), housingMaterial);
    housing.position.set(headX, 1.48, 0);
    signal.add(housing);
    [
      [1.56, signalMaterials.red],
      [1.48, signalMaterials.amber],
      [1.4, signalMaterials.green],
    ].forEach(([height, material]) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 7), material);
      bulb.position.set(headX, height, faceDirection * 0.061);
      bulb.scale.z = 0.42;
      signal.add(bulb);
    });
    signal.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(signal);
    group.add(signal);
    return signal;
  }

  const createAnimatedRoadRoute = (points, stopIndex) => {
    const distances = [0];
    for (let index = 1; index < points.length; index += 1) {
      distances.push(
        distances[index - 1] + Math.hypot(
          points[index][0] - points[index - 1][0],
          points[index][1] - points[index - 1][1],
        ),
      );
    }
    return Object.freeze({
      points: Object.freeze(points.map((point) => Object.freeze(point))),
      distances: Object.freeze(distances),
      length: distances.at(-1),
      stopDistance: distances[stopIndex],
    });
  };

  // The four traffic paths use the same surveyed OSM centrelines as the road
  // meshes below. Each direction takes the left-hand lane around the small
  // channelising island instead of travelling through it.
  const MAIN_EASTBOUND_ROUTE = createAnimatedRoadRoute(
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainEastbound.points,
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainEastbound.stopIndex,
  );
  const MAIN_WESTBOUND_ROUTE = createAnimatedRoadRoute(
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainWestbound.points,
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainWestbound.stopIndex,
  );
  const CROSS_NORTHBOUND_ROUTE = createAnimatedRoadRoute(
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.crossNorthbound.points,
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.crossNorthbound.stopIndex,
  );
  const CROSS_SOUTHBOUND_ROUTE = createAnimatedRoadRoute(
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.crossSouthbound.points,
    ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.crossSouthbound.stopIndex,
  );

  function addAlunAlunRoadContext(group) {
    const context = new THREE.Group();
    context.name = "Jl. Nasional 1 Street View context";
    const asphaltSurface = hideMaterialOutline(
      toonMaterial({
        color: 0x414947,
        // The corresponding generated OSM fragments are removed before their
        // buffers are built. Keep the custom asphalt at its physical depth so
        // a squared road end can never be pulled through the higher checker
        // pavement as the chase camera crosses it.
      }),
    );
    const asphaltTrim = toonMaterial({ color: 0x303635 });
    const roadWhite = toonMaterial({ color: 0xe7e4d8 });
    const roadYellow = toonMaterial({ color: 0xf0c047 });
    const gutterMaterial = hideMaterialOutline(
      toonMaterial({ color: 0x555850 }),
    );
    const pedestrianCanvas = document.createElement("canvas");
    pedestrianCanvas.width = 64;
    pedestrianCanvas.height = 64;
    const pedestrianDrawing = pedestrianCanvas.getContext("2d");
    [
      [0, 0, "#d0aa90"],
      [32, 0, "#e8dfcf"],
      [0, 32, "#e8dfcf"],
      [32, 32, "#b9afa1"],
    ].forEach(([x, y, color]) => {
      pedestrianDrawing.fillStyle = color;
      pedestrianDrawing.fillRect(x, y, 32, 32);
      pedestrianDrawing.strokeStyle = "rgba(76,72,66,.2)";
      pedestrianDrawing.lineWidth = 2;
      pedestrianDrawing.strokeRect(x, y, 32, 32);
    });
    const pedestrianTexture = new THREE.CanvasTexture(pedestrianCanvas);
    pedestrianTexture.colorSpace = THREE.SRGBColorSpace;
    pedestrianTexture.wrapS = THREE.RepeatWrapping;
    pedestrianTexture.wrapT = THREE.RepeatWrapping;
    pedestrianTexture.minFilter = THREE.LinearMipmapLinearFilter;
    pedestrianTexture.magFilter = THREE.NearestFilter;
    const pedestrianStone = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        map: pedestrianTexture,
        color: 0xffffff,
        side: THREE.DoubleSide,
      }),
    );
    const pedestrianConcrete = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        color: 0xbcb9af,
        side: THREE.DoubleSide,
      }),
    );
    const drainMaterial = toonMaterial({ color: 0x343a39 });
    const medianSoil = hideMaterialOutline(
      toonMaterial({ color: 0x514a3b }),
    );
    const medianDark = toonMaterial({ color: 0x292d2c });
    const medianBlue = toonMaterial({ color: 0x3978a9 });
    const medianWhite = toonMaterial({ color: 0xe7e6dc });
    // Shop-side curbs in Street View are weathered. Reserve the saturated
    // blue/white paint for the park edge and physical medians so footways do
    // not read as additional traffic islands.
    const sidewalkCurbBlue = toonMaterial({ color: 0x6f8e9d });
    const sidewalkCurbWhite = toonMaterial({ color: 0xd3d1c8 });
    const medianGrass = hideMaterialOutline(
      toonMaterial({ color: 0x657f51 }),
    );
    const flatSurfaceMaterials = new Set([
      asphaltSurface,
      gutterMaterial,
      roadWhite,
      roadYellow,
      pedestrianStone,
      pedestrianConcrete,
      medianSoil,
      medianGrass,
    ]);
    const postGrey = toonMaterial({ color: 0x596360 });
    const wireMaterial = toonMaterial({ color: 0x252c2d });
    const blue = toonMaterial({ color: 0x246aa0 });
    const createSignalMaterials = () => ({
      red: toonMaterial({
        color: 0xe05245,
        emissive: 0xe05245,
        emissiveIntensity: 1.1,
      }),
      amber: toonMaterial({
        color: 0xd6a53c,
        emissive: 0xd6a53c,
        emissiveIntensity: 0.04,
      }),
      green: toonMaterial({
        color: 0x4b9a68,
        emissive: 0x4b9a68,
        emissiveIntensity: 0.04,
      }),
    });
    const mainSignalMaterials = createSignalMaterials();
    const crossSignalMaterials = createSignalMaterials();

    // The Alun-Alun landmark is sunk by about .01025 world units. These local
    // lifts therefore finish just above the global .034-.036 inferred
    // sidewalks/curbs, but remain below the checker paving at .052+.
    const ROAD_SURFACE_Y = ALUN_ALUN_ROAD_SURFACE_Y;
    const ROAD_MARK_Y = 0.049;
    const createRoadSurfaceGeometry = (points) => {
      const shape = new THREE.Shape();
      points.forEach(([north, east], index) => {
        if (index === 0) shape.moveTo(north, -east);
        else shape.lineTo(north, -east);
      });
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI * 0.5);
      return geometry;
    };
    const addRoadSurface = (points, y = ROAD_SURFACE_Y) => {
      const surface = new THREE.Mesh(createRoadSurfaceGeometry(points), asphaltSurface);
      surface.position.y = y;
      surface.receiveShadow = true;
      context.add(surface);
      return surface;
    };
    const addPavedApron = (points, y = 0.063) => {
      const surface = new THREE.Mesh(createRoadSurfaceGeometry(points), gutterMaterial);
      surface.position.y = y;
      surface.receiveShadow = true;
      context.add(surface);
      return surface;
    };
    const addRoadRibbon = (
      points,
      widthOrWidths,
      y = ROAD_SURFACE_Y,
      material = asphaltSurface,
    ) => {
      const ribbon = new THREE.Mesh(
        createAlunAlunRoadRibbonGeometry(points, widthOrWidths),
        material,
      );
      ribbon.position.y = y;
      ribbon.receiveShadow = true;
      context.add(ribbon);
      return ribbon;
    };
    const addRoadsideBand = (
      innerBoundary,
      outerBoundary,
      y,
      material,
    ) => {
      const band = new THREE.Mesh(
        createAlunAlunRoadsideBandGeometry(
          innerBoundary,
          outerBoundary,
        ),
        material,
      );
      band.position.y = y;
      band.receiveShadow = true;
      context.add(band);
      return band;
    };
    const addRoadShoulderBands = (
      points,
      innerWidth,
      outerWidth,
      material = asphaltSurface,
    ) => {
      const shoulder = new THREE.Mesh(
        createAlunAlunRoadShoulderGeometry(
          points,
          innerWidth,
          outerWidth,
        ),
        material,
      );
      shoulder.position.y = ROAD_SURFACE_Y;
      shoulder.receiveShadow = true;
      context.add(shoulder);
      return shoulder;
    };
    const addRoadMark = (startNorth, startEast, endNorth, endEast, material, thickness = 0.032) => {
      const deltaNorth = endNorth - startNorth;
      const deltaEast = endEast - startEast;
      const length = Math.hypot(deltaNorth, deltaEast);
      const mark = new THREE.Mesh(
        roundedBox(length, 0.002, thickness, 0.001),
        material,
      );
      mark.position.set(
        (startNorth + endNorth) * 0.5,
        ROAD_MARK_Y,
        (startEast + endEast) * 0.5,
      );
      mark.rotation.y = -Math.atan2(deltaEast, deltaNorth);
      context.add(mark);
      return mark;
    };
    const offsetRoadPoint = (points, index, offset) => {
      const [north, east] = points[index];
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const deltaNorth = next[0] - previous[0];
      const deltaEast = next[1] - previous[1];
      const length = Math.hypot(deltaNorth, deltaEast) || 1;
      return [
        north - (deltaEast / length) * offset,
        east + (deltaNorth / length) * offset,
      ];
    };
    const offsetRoadPoints = (points, offset) =>
      points.map((_, index) => offsetRoadPoint(points, index, offset));
    const addRoadPathMark = (points, material, thickness = 0.032, offset = 0) => {
      const linePoints = offset === 0 ? points : offsetRoadPoints(points, offset);
      for (let index = 0; index < linePoints.length - 1; index += 1) {
        const [startNorth, startEast] = linePoints[index];
        const [endNorth, endEast] = linePoints[index + 1];
        addRoadMark(startNorth, startEast, endNorth, endEast, material, thickness);
      }
    };
    const addSegmentedCurbAlongPath = (
      points,
      materials,
      { skip = () => false } = {},
    ) => {
      let curbIndex = 0;
      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        const deltaNorth = end[0] - start[0];
        const deltaEast = end[1] - start[1];
        const length = Math.hypot(deltaNorth, deltaEast);
        const segmentCount = Math.max(1, Math.ceil(length / 0.22));
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const amount = (segment + 0.5) / segmentCount;
          const north = THREE.MathUtils.lerp(start[0], end[0], amount);
          const east = THREE.MathUtils.lerp(start[1], end[1], amount);
          if (skip(north, east)) continue;
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(length / segmentCount + 0.01, 0.065, 0.075),
            materials[curbIndex % materials.length],
          );
          curb.position.set(north, 0.082, east);
          curb.rotation.y = -Math.atan2(deltaEast, deltaNorth);
          context.add(curb);
          curbIndex += 1;
        }
      }
    };
    const addStopBar = (route, pointIndex, width) => {
      const center = route.points[pointIndex];
      const previous = route.points[Math.max(0, pointIndex - 1)];
      const next = route.points[Math.min(route.points.length - 1, pointIndex + 1)];
      const deltaNorth = next[0] - previous[0];
      const deltaEast = next[1] - previous[1];
      const length = Math.hypot(deltaNorth, deltaEast) || 1;
      const acrossNorth = -deltaEast / length * width * 0.5;
      const acrossEast = deltaNorth / length * width * 0.5;
      addRoadMark(
        center[0] - acrossNorth,
        center[1] - acrossEast,
        center[0] + acrossNorth,
        center[1] + acrossEast,
        roadWhite,
        0.075,
      );
    };

    // Local dimensions are world units (five metres each), while the surveyed
    // road widths are metres. The old 8.8-unit value made every approach about
    // 44 metres wide and buried the Alun-Alun pedestrian apron. These widths
    // follow the OSM centre lines and the proportions visible in Street View.
    // The undivided western approach carries two 3.3 metre lanes. The former
    // 12.1 metre ribbon ended as a broad square cap at the split and extended
    // under the checker pavement, where it popped into view after walking past
    // the seam. Match the surveyed 6.6 metre carriageway instead.
    const MAIN_SHARED_ROAD_WIDTH = ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH;
    // 6.6 metres keeps the widest production vehicle and its lane variation
    // inside each carriageway with a useful rendered shoulder margin. The old
    // 6.2-metre width left only about 5 mm at the eastbound swept envelope.
    const MAIN_CARRIAGEWAY_WIDTH = ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH;
    const NORTH_CROSS_STREET_WIDTH = 1.7;
    const LOCAL_STREET_WIDTH = 1.04;
    const addExistingRoadPath = (
      points,
      {
        centerLine = false,
        edgeLines = false,
        width = MAIN_SHARED_ROAD_WIDTH,
      } = {},
    ) => {
      const edgeOffset = width * 0.45;
      const shoulderWidth = width + Math.min(0.28, width * 0.18);
      addRoadShoulderBands(
        points,
        width,
        shoulderWidth,
      );
      addRoadRibbon(points, width, ROAD_SURFACE_Y);
      if (edgeLines) {
        addRoadPathMark(
          points,
          roadWhite,
          0.026,
          edgeOffset,
        );
        addRoadPathMark(
          points,
          roadWhite,
          0.026,
          -edgeOffset,
        );
      }
      if (centerLine) addRoadPathMark(points, roadYellow, 0.03);
    };

    // Mask the generic map-road geometry locally, then redraw the surveyed OSM
    // paths. Street View shows plain asphalt here, without invented edge lines.
    [
      {
        width: MAIN_SHARED_ROAD_WIDTH,
        centerLine: false,
        points: ALUN_ALUN_WEST_SHARED_ROAD_PATH,
      },
      {
        width: LOCAL_STREET_WIDTH,
        centerLine: false,
        edgeLines: false,
        points: [
        [13.32, -19.4],
        [12.36, -19.26],
        [-6.32, -15.5],
        [-17.66, -12.68],
        ],
      },
      {
        width: LOCAL_STREET_WIDTH,
        centerLine: false,
        edgeLines: false,
        points: [
        [-17.66, -12.68],
        [-18.74, -11.62],
        [-19.06, -10.52],
        [-19.06, -7.7],
        [-17.88, -2.54],
        [-15.36, 9.92],
        [-14.44, 13.78],
        [-12.84, 20.78],
        ],
      },
      {
        width: MAIN_CARRIAGEWAY_WIDTH,
        centerLine: false,
        points: [...ALUN_ALUN_WEST_PARK_SIDE_CARRIAGEWAY_PATH].reverse(),
      },
      {
        width: MAIN_CARRIAGEWAY_WIDTH,
        centerLine: false,
        points: [
        [17.56, -2.74],
        [19.72, 1.58],
        [21.4, 7.46],
          [23.12, 11.92],
        ],
      },
      {
        width: NORTH_CROSS_STREET_WIDTH,
        centerLine: false,
        edgeLines: false,
        points: [
          [23.58, 12.86],
          [29.16, 14.28],
          [32.2, 15.1],
        ],
      },
      {
        width: MAIN_CARRIAGEWAY_WIDTH,
        centerLine: false,
        points: [
          [23.4, 13.92],
          [24.42, 18.7],
          [26.06, 25.88],
          [26.74, 28.12],
          [27.12, 29.38],
        ],
      },
      {
        // OSM road #307 is the opposing carriageway beside #99/#187. Omitting
        // it exposed the global sidewalk and sent westbound traffic off-road.
        width: MAIN_CARRIAGEWAY_WIDTH,
        centerLine: false,
        edgeLines: false,
        points: [
          [21.12, 14.68],
          [22.6, 19.22],
          [24.98, 27.88],
          [26.28, 32.02],
        ],
      },
      {
        width: MAIN_CARRIAGEWAY_WIDTH,
        centerLine: false,
        points: [
          [17.14, 13.2],
          [17.44, 14.86],
          [21.6, 29.66],
        ],
      },
    ].forEach(({ points, ...options }) => addExistingRoadPath(points, options));
    const southApproachSurface = addRoadSurface(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline,
    );
    southApproachSurface.name = "South approach unified asphalt surface";
    addExistingRoadPath(
      ALUN_ALUN_JUNCTION_LOOP_PATH,
      {
        centerLine: false,
        edgeLines: false,
        width: ALUN_ALUN_JUNCTION_LOOP_CORE_WIDTH,
      },
    );
    // The mask begins at the exact terminal edge of the unified south surface.
    // Sharing that edge, instead of extending the old mask 25 metres down the
    // approach, removes the last coplanar asphalt overlap at this junction.
    const junctionAsphaltSurface = addRoadSurface(
      ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE,
    );
    junctionAsphaltSurface.name = "Clipped junction asphalt union";
    // Reintroduce only the pedestrian strips that really border the junction.
    // The asphalt union above intentionally masks the generic OSM sidewalk
    // wedges, so these surveyed ribbons keep a continuous walkable-looking
    // route without spilling pale paving back across the vehicle lanes.
    const addPropertySideApron = (route, apronWidth, name) => {
      const propertySide = -route.curbSide;
      const apronCenterOffset =
        propertySide * (route.width + apronWidth) * 0.5;
      const apron = addRoadRibbon(
        offsetRoadPoints(route.points, apronCenterOffset),
        apronWidth,
        0.058,
        pedestrianConcrete,
      );
      apron.name = name;
      return apron;
    };
    // Street View shows paving from the curb-side footway all the way to the
    // adjoining walls and storefronts. The generic map surface left broad
    // grass wedges behind the narrower route ribbons.
    addRoadsideBand(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkOuterBoundary,
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.frontageOuterBoundary,
      0.058,
      pedestrianConcrete,
    ).name = "South-east property frontage apron";
    addRoadsideBand(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.roadsideSeam,
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkOuterBoundary,
      0.061,
      pedestrianStone,
    ).name = "South-east pedestrian approach";
    addSegmentedCurbAlongPath(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.roadsideSeam,
      [sidewalkCurbBlue, sidewalkCurbWhite],
    );
    // The north arm is pinched by the beige row on its west side and ARUM on
    // its east side. Parallel offsets cut through both real building bodies,
    // so each footway bends through the measured gap between facade and road.
    [
      ["North-arm west pedestrian path", "northWest"],
      ["North-arm east pedestrian path", "northEast"],
    ].forEach(([name, routeName]) => {
      const { points, curbSide, width } =
        ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS[routeName];
      const route = ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS[routeName];
      addPropertySideApron(
        route,
        routeName === "northWest" ? 0.5 : 0.46,
        `${name} frontage apron`,
      );
      const path = addRoadRibbon(
        points,
        width,
        0.061,
        pedestrianConcrete,
      );
      path.name = name;
      addSegmentedCurbAlongPath(
        offsetRoadPoints(points, curbSide * width * 0.5),
        [sidewalkCurbBlue, sidewalkCurbWhite],
      );
    });
    // The western approach has the surveyed double-yellow centre marking. Its
    // very thin raised geometry stays below the checker pedestrian paving.
    [-0.06, 0.06].forEach((offset) =>
      addRoadMark(
        14.58 + offset,
        -19.12,
        17.68 + offset,
        -2.95,
        roadYellow,
        0.026,
      ),
    );
    const postOfficeWestApron = addPavedApron(
      [
        [18.72, -12.25],
        [20.35, -11.85],
        [20.36, -4.86],
        [19.0, -4.95],
      ],
    );
    postOfficeWestApron.name = "Kantor Pos west frontage apron";
    const postOfficeFrontageApron = addPavedApron(
      [
        [19.0, -4.95],
        [20.36, -4.86],
        [22.56, -2.18],
        [22.72, 2.9],
        [21.36, 2.95],
        [20.45, 0.4],
        [18.6, -2.74],
      ],
      0.063,
    );
    postOfficeFrontageApron.name = "Kantor Pos tapered frontage apron";
    // Exact ribbons replace the former straight asphalt boxes. The park's
    // checker apron remains the highest layer and therefore wraps the corner
    // continuously, as it does in Street View.
    [-11.4, -4.1, 4.3, 11.7].forEach((east) => {
      const drain = new THREE.Mesh(
        roundedBox(0.32, 0.025, 0.62, 0.008),
        drainMaterial,
      );
      drain.position.set(17.42, 0.051, east);
      context.add(drain);
    });

    // Follow the real split between OSM carriageways #110 and #111.  A
    // variable-width ribbon makes the western nose merge naturally where the
    // two carriageways meet, then widens toward the signalised junction.
    addRoadRibbon(
      ALUN_ALUN_WEST_MEDIAN_PATH,
      ALUN_ALUN_WEST_MEDIAN_WIDTHS,
      0.083,
      medianSoil,
    );
    [-1, 1].forEach((side, sideIndex) => {
      const edgePoints = ALUN_ALUN_WEST_MEDIAN_PATH.map((_, index) =>
        offsetRoadPoint(
          ALUN_ALUN_WEST_MEDIAN_PATH,
          index,
          ALUN_ALUN_WEST_MEDIAN_WIDTHS[index] * 0.5 * side,
        ),
      );
      let curbIndex = sideIndex;
      for (let index = 0; index < edgePoints.length - 1; index += 1) {
        const start = edgePoints[index];
        const end = edgePoints[index + 1];
        const deltaNorth = end[0] - start[0];
        const deltaEast = end[1] - start[1];
        const length = Math.hypot(deltaNorth, deltaEast);
        const segmentCount = Math.max(1, Math.ceil(length / 0.2));
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const amount = (segment + 0.5) / segmentCount;
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(length / segmentCount + 0.01, 0.075, 0.08),
            curbIndex % 2 === 0 ? medianBlue : medianWhite,
          );
          curb.position.set(
            THREE.MathUtils.lerp(start[0], end[0], amount),
            0.086,
            THREE.MathUtils.lerp(start[1], end[1], amount),
          );
          curb.rotation.y = -Math.atan2(deltaEast, deltaNorth);
          context.add(curb);
          curbIndex += 1;
        }
      }
    });
    const medianLastIndex = ALUN_ALUN_WEST_MEDIAN_PATH.length - 1;
    const medianEndPoint = ALUN_ALUN_WEST_MEDIAN_PATH[medianLastIndex];
    const medianPreviousPoint = ALUN_ALUN_WEST_MEDIAN_PATH[medianLastIndex - 1];
    const medianEndDeltaNorth = medianEndPoint[0] - medianPreviousPoint[0];
    const medianEndDeltaEast = medianEndPoint[1] - medianPreviousPoint[1];
    const medianEndCap = new THREE.Mesh(
      roundedBox(
        ALUN_ALUN_WEST_MEDIAN_WIDTHS[medianLastIndex] + 0.08,
        0.075,
        0.1,
        0.018,
      ),
      medianBlue,
    );
    medianEndCap.position.set(medianEndPoint[0], 0.086, medianEndPoint[1]);
    medianEndCap.rotation.y = -Math.atan2(
      medianEndDeltaNorth,
      -medianEndDeltaEast,
    );
    context.add(medianEndCap);
    const keepLeftSign = new THREE.Group();
    keepLeftSign.position.set(medianEndPoint[0], 0.11, medianEndPoint[1]);
    const keepLeftPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.03, 0.68, 7),
      medianDark,
    );
    keepLeftPole.position.y = 0.34;
    keepLeftSign.add(keepLeftPole);
    const keepLeftFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.17, 24),
      blue,
    );
    keepLeftFace.position.set(-0.018, 0.77, 0);
    keepLeftFace.rotation.y = -Math.PI * 0.5;
    keepLeftSign.add(keepLeftFace);
    const keepLeftMark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.045, 0.2),
      roadWhite,
    );
    keepLeftMark.position.set(-0.024, 0.77, 0.015);
    keepLeftMark.rotation.y = -Math.PI * 0.5;
    keepLeftMark.rotation.z = -0.42;
    keepLeftSign.add(keepLeftMark);
    const keepLeftHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.09, 3),
      roadWhite,
    );
    keepLeftHead.position.set(-0.028, 0.69, 0.047);
    keepLeftHead.rotation.y = -Math.PI * 0.5;
    keepLeftHead.rotation.z = -0.42;
    keepLeftSign.add(keepLeftHead);
    context.add(keepLeftSign);
    [
      [19.18, 2.8],
      [20.35, 7.0],
    ].forEach(([north, east], index) => {
      const planter = addAlunAlunMedianPlanter(context, north, east, index * 0.72);
      planter.scale.setScalar(0.72);
    });

    // Street View shows a small black/yellow bollard cluster protecting the
    // blue-white median nose at the junction.
    [
      [21.3, 10.78],
      [21.47, 10.83],
      [21.64, 10.88],
      [21.38, 11.07],
      [21.55, 11.12],
    ].forEach(([north, east], index) => {
      const bollard = new THREE.Group();
      bollard.position.set(north, 0.12, east);
      for (let segment = 0; segment < 4; segment += 1) {
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.027, 0.032, 0.085, 8),
          segment % 2 === 0 ? medianDark : roadYellow,
        );
        stripe.position.y = 0.0425 + segment * 0.085;
        bollard.add(stripe);
      }
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 8, 6),
        index % 2 === 0 ? roadYellow : medianDark,
      );
      cap.position.y = 0.365;
      bollard.add(cap);
      context.add(bollard);
    });

    // Street View shows one compact zebra from the checker-paved park corner
    // to the blue-white divider nose. It does not continue across the opposing
    // carriageway, as the former 20 metre stripe field did.
    const crossing = ALUN_ALUN_SOUTH_CROSSING_DEFINITION;
    for (let index = 0; index < crossing.stripeCount; index += 1) {
      const east = THREE.MathUtils.lerp(
        crossing.stripeStartEast,
        crossing.stripeEndEast,
        index / (crossing.stripeCount - 1),
      );
      addRoadMark(
        crossing.stripeStartNorth,
        east,
        crossing.stripeEndNorth,
        east,
        roadWhite,
        0.078,
      );
    }

    // Rebuild the complete south-arm divider, rather than placing a short box
    // in the middle of the generic map wedge. The narrow end begins only after
    // the two carriageways have separated and the far end stops before the
    // open intersection envelope around the channelising island.
    addRoadRibbon(
      ALUN_ALUN_SOUTH_MEDIAN_PATH,
      ALUN_ALUN_SOUTH_MEDIAN_WIDTHS,
      0.078,
      medianSoil,
    ).name = "South-arm tapered median";
    [-1, 1].forEach((side, sideIndex) => {
      const edgePoints = ALUN_ALUN_SOUTH_MEDIAN_PATH.map((_, index) =>
        offsetRoadPoint(
          ALUN_ALUN_SOUTH_MEDIAN_PATH,
          index,
          ALUN_ALUN_SOUTH_MEDIAN_WIDTHS[index] * 0.5 * side,
        ),
      );
      addSegmentedCurbAlongPath(
        edgePoints,
        sideIndex === 0
          ? [medianBlue, medianWhite]
          : [medianWhite, medianBlue],
        {
          // The zebra arrives from the park on the west edge. Keep this curb
          // opening low and unobstructed so the refuge is visibly usable.
          skip: (north) =>
            side < 0 &&
            north >= crossing.medianCurbGapNorth.start &&
            north <= crossing.medianCurbGapNorth.end,
        },
      );
    });

    const crossingMedianStart = ALUN_ALUN_SOUTH_MEDIAN_PATH[2];
    const crossingMedianEnd = ALUN_ALUN_SOUTH_MEDIAN_PATH[3];
    const crossingMedianYaw = -Math.atan2(
      crossingMedianEnd[1] - crossingMedianStart[1],
      crossingMedianEnd[0] - crossingMedianStart[0],
    );
    const refugePad = new THREE.Mesh(
      roundedBox(
        crossing.refuge.width,
        0.018,
        crossing.refuge.depth,
        0.045,
      ),
      pedestrianStone,
    );
    refugePad.name = "South crossing pedestrian refuge";
    refugePad.position.set(
      crossing.refuge.north,
      0.072,
      crossing.refuge.east,
    );
    refugePad.rotation.y = crossingMedianYaw;
    context.add(refugePad);

    const droppedCurb = new THREE.Mesh(
      roundedBox(
        crossing.droppedCurb.width,
        0.025,
        crossing.droppedCurb.depth,
        0.018,
      ),
      medianWhite,
    );
    droppedCurb.name = "South crossing dropped curb";
    droppedCurb.position.set(
      crossing.droppedCurb.north,
      0.061,
      crossing.droppedCurb.east,
    );
    droppedCurb.rotation.y = crossingMedianYaw;
    context.add(droppedCurb);

    // Street View terminates the zebra at a signed median nose. A compact
    // keep-left marker and three striped bollards make the refuge read as part
    // of that tapered divider rather than as an unrelated paving tile. They
    // sit beyond the open curb gap, inside the median's existing collision.
    const crossingKeepLeft = new THREE.Group();
    crossingKeepLeft.position.set(17.34, 0.11, 14.02);
    crossingKeepLeft.scale.setScalar(0.76);
    const crossingSignPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.03, 0.68, 7),
      medianDark,
    );
    crossingSignPole.position.y = 0.34;
    crossingKeepLeft.add(crossingSignPole);
    const crossingSignFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.17, 24),
      blue,
    );
    crossingSignFace.position.set(-0.018, 0.77, 0);
    crossingSignFace.rotation.y = -Math.PI * 0.5;
    crossingKeepLeft.add(crossingSignFace);
    const crossingSignMark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.045, 0.2),
      roadWhite,
    );
    crossingSignMark.position.set(-0.024, 0.77, 0.015);
    crossingSignMark.rotation.y = -Math.PI * 0.5;
    crossingSignMark.rotation.z = -0.42;
    crossingKeepLeft.add(crossingSignMark);
    const crossingSignHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.09, 3),
      roadWhite,
    );
    crossingSignHead.position.set(-0.028, 0.69, 0.047);
    crossingSignHead.rotation.y = -Math.PI * 0.5;
    crossingSignHead.rotation.z = -0.42;
    crossingKeepLeft.add(crossingSignHead);
    context.add(crossingKeepLeft);
    [17.13, 17.29, 17.45].forEach((north, index) => {
      const bollard = new THREE.Group();
      bollard.position.set(north, 0.105, 14.02 + (index % 2) * 0.025);
      for (let segment = 0; segment < 4; segment += 1) {
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.021, 0.026, 0.065, 8),
          segment % 2 === 0 ? medianDark : roadYellow,
        );
        stripe.position.y = 0.0325 + segment * 0.065;
        bollard.add(stripe);
      }
      context.add(bollard);
    });

    // Stop bars sit behind the zebra and island envelope on every approach.
    // Their locations are the same points used by the queueing system below,
    // so vehicles no longer stop at an invisible or unrelated line.
    addStopBar(
      MAIN_EASTBOUND_ROUTE,
      ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainEastbound.stopIndex,
      1.28,
    );
    addStopBar(
      MAIN_WESTBOUND_ROUTE,
      ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.mainWestbound.stopIndex,
      1.28,
    );
    addStopBar(
      CROSS_NORTHBOUND_ROUTE,
      ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.crossNorthbound.stopIndex,
      1.28,
    );
    addStopBar(
      CROSS_SOUTHBOUND_ROUTE,
      ALUN_ALUN_TRAFFIC_ROUTE_DEFINITIONS.crossSouthbound.stopIndex,
      1.28,
    );

    const junctionIsland = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.64, 0.11, 20),
      medianBlue,
    );
    junctionIsland.position.set(21.9, 0.105, 13.08);
    junctionIsland.scale.set(1.12, 1, 0.62);
    context.add(junctionIsland);
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const islandCurb = new THREE.Mesh(
        roundedBox(0.22, 0.075, 0.1, 0.012),
        index % 2 === 0 ? medianWhite : medianBlue,
      );
      islandCurb.position.set(
        21.9 + Math.cos(angle) * 0.68,
        0.12,
        13.08 + Math.sin(angle) * 0.42,
      );
      islandCurb.rotation.y = -angle;
      context.add(islandCurb);
    }
    const junctionIslandSoil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.5, 0.055, 20),
      medianSoil,
    );
    junctionIslandSoil.position.set(21.9, 0.205, 13.08);
    junctionIslandSoil.scale.set(1.12, 1, 0.62);
    context.add(junctionIslandSoil);
    const islandShrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 10, 7),
      toonMaterial({ color: 0x5d8052 }),
    );
    islandShrub.position.set(21.9, 0.38, 13.08);
    islandShrub.scale.set(1.35, 0.68, 0.72);
    context.add(islandShrub);

    // The two surveyed east-side carriageways are separated by a narrow,
    // tapered physical median. Cover the generic white auto-sidewalk in that
    // gap with the low soil bed and blue-white curb seen in Street View.
    const eastApproachMedianOutline = [
      [23.2, 15.6],
      [24.0, 18.9],
      [25.48, 25.9],
      [26.15, 28.3],
      [25.58, 28.2],
      [25.0, 25.9],
      [23.15, 19.0],
      [22.15, 15.8],
    ];
    const eastApproachMedian = new THREE.Mesh(
      createRoadSurfaceGeometry(eastApproachMedianOutline),
      medianSoil,
    );
    eastApproachMedian.position.y = 0.078;
    eastApproachMedian.receiveShadow = true;
    context.add(eastApproachMedian);
    const eastApproachMedianGrass = new THREE.Mesh(
      createRoadSurfaceGeometry([
        [23.82, 18.92],
        [25.34, 25.92],
        [25.98, 28.12],
        [25.7, 28.08],
        [24.86, 25.94],
        [23.3, 19.06],
      ]),
      medianGrass,
    );
    eastApproachMedianGrass.position.y = 0.081;
    eastApproachMedianGrass.receiveShadow = true;
    context.add(eastApproachMedianGrass);
    const addSegmentedMedianCurb = (points) => {
      points.forEach((start, edgeIndex) => {
        const end = points[edgeIndex + 1];
        if (!end) return;
        const deltaNorth = end[0] - start[0];
        const deltaEast = end[1] - start[1];
        const length = Math.hypot(deltaNorth, deltaEast);
        const segmentCount = Math.max(1, Math.ceil(length / 0.24));
        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
          const amount = (segmentIndex + 0.5) / segmentCount;
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(length / segmentCount + 0.01, 0.07, 0.08),
            segmentIndex % 2 === 0 ? medianBlue : medianWhite,
          );
          curb.position.set(
            THREE.MathUtils.lerp(start[0], end[0], amount),
            0.105,
            THREE.MathUtils.lerp(start[1], end[1], amount),
          );
          curb.rotation.y = -Math.atan2(deltaEast, deltaNorth);
          context.add(curb);
        }
      });
    };
    addSegmentedMedianCurb(eastApproachMedianOutline.slice(0, 4));
    addSegmentedMedianCurb(eastApproachMedianOutline.slice(4));
    addSegmentedMedianCurb([
      eastApproachMedianOutline[3],
      eastApproachMedianOutline[4],
    ]);
    addSegmentedMedianCurb([
      eastApproachMedianOutline[7],
      eastApproachMedianOutline[0],
    ]);
    addAlunAlunRoadBarrier(context, 22.85, 16.55, 0.25);
    addAlunAlunIntersectionBoards(context);

    [-10.5, -4.8, 4.8, 10.4].forEach((east, index) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 2.15, 8), postGrey);
      pole.position.set(17.15, 1.08, east);
      context.add(pole);
      const crossArm = new THREE.Mesh(
        roundedBox(0.62, 0.035, 0.035, 0.008),
        postGrey,
      );
      crossArm.position.set(17.15, 1.82 + index * 0.035, east);
      context.add(crossArm);
      [-0.22, 0, 0.22].forEach((northOffset) => {
        const insulator = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.032, 0.12, 7),
          asphaltTrim,
        );
        insulator.position.set(
          17.15 + northOffset,
          1.9 + index * 0.035,
          east,
        );
        context.add(insulator);
      });
    });
    const transformerAssembly = new THREE.Group();
    transformerAssembly.position.set(17.16, 0.05, 4.8);
    const transformerMaterial = toonMaterial({ color: 0x777b74 });
    const transformer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.4, 12),
      transformerMaterial,
    );
    transformer.position.y = 1.55;
    transformerAssembly.add(transformer);
    [1.31, 1.79].forEach((height) => {
      const rack = new THREE.Mesh(
        roundedBox(0.5, 0.045, 0.05, 0.012),
        postGrey,
      );
      rack.position.y = height;
      transformerAssembly.add(rack);
    });
    [-0.13, 0, 0.13].forEach((northOffset) => {
      const bushing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 0.12, 7),
        asphaltTrim,
      );
      bushing.position.set(northOffset, 1.84, 0);
      transformerAssembly.add(bushing);
    });
    const serviceBox = new THREE.Mesh(
      roundedBox(0.18, 0.28, 0.13, 0.025),
      transformerMaterial,
    );
    serviceBox.position.set(-0.08, 0.75, 0);
    transformerAssembly.add(serviceBox);
    mergeDirectMeshesByMaterial(transformerAssembly);
    context.add(transformerAssembly);

    [-11.8, 4.8].forEach((east) => {
      const lampCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(17.02, 0.08, east),
        new THREE.Vector3(17.02, 1.35, east),
        new THREE.Vector3(17.08, 2.12, east),
        new THREE.Vector3(17.42, 2.42, east),
        new THREE.Vector3(17.72, 2.46, east),
      ]);
      const lampPole = new THREE.Mesh(
        new THREE.TubeGeometry(lampCurve, 28, 0.035, 7, false),
        postGrey,
      );
      context.add(lampPole);
      const lampHead = new THREE.Mesh(
        roundedBox(0.34, 0.07, 0.13, 0.025),
        asphaltTrim,
      );
      lampHead.position.set(17.78, 2.43, east);
      lampHead.rotation.z = -0.08;
      context.add(lampHead);
      const lampGlow = new THREE.Mesh(
        roundedBox(0.22, 0.018, 0.085, 0.006),
        toonMaterial({
          color: 0xffe7ae,
          emissive: 0xf0b55f,
          emissiveIntensity: 0.08,
        }),
      );
      lampGlow.position.set(17.79, 2.39, east);
      lampGlow.rotation.z = -0.08;
      context.add(lampGlow);
    });

    const cableSupports = [-15.8, -10.5, -4.8, 4.8, 10.4, 15.8];
    [
      [16.94, 1.4, 0.075, 0.1],
      [17.0, 1.47, 0.095, 0.8],
      [17.05, 1.54, 0.065, 1.5],
      [17.1, 1.61, 0.11, 2.2],
      [17.15, 1.69, 0.08, 2.9],
      [17.2, 1.78, 0.12, 3.6],
      [17.24, 1.9, 0.095, 4.3],
      [17.28, 2.03, 0.135, 5.0],
    ].forEach(([north, height, sag, phase]) => {
      const points = [];
      cableSupports.forEach((east, supportIndex) => {
        if (supportIndex > 0) {
          const previousEast = cableSupports[supportIndex - 1];
          points.push(
            new THREE.Vector3(
              north + Math.sin(phase + supportIndex) * 0.012,
              height - sag * (0.92 + Math.sin(phase + supportIndex) * 0.08),
              (previousEast + east) * 0.5,
            ),
          );
        }
        points.push(
          new THREE.Vector3(
            north + Math.sin(phase + supportIndex * 0.7) * 0.008,
            height + Math.sin(phase + supportIndex * 0.9) * 0.012,
            east,
          ),
        );
      });
      const wire = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points, false, "centripetal"),
          96,
          0.0035,
          5,
          false,
        ),
        wireMaterial,
      );
      context.add(wire);
    });

    const trafficSign = new THREE.Group();
    trafficSign.position.set(15.6, 0.06, 1.2);
    const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.12, 8), postGrey);
    signPole.position.y = 0.56;
    trafficSign.add(signPole);
    const signBoard = new THREE.Mesh(roundedBox(0.05, 0.44, 0.74, 0.03), blue);
    signBoard.position.set(0, 1.02, 0);
    trafficSign.add(signBoard);
    [
      ["ANDA MEMASUKI", 1.14, 0.095],
      ["KAWASAN", 1.02, 0.1],
      ["TERTIB LALU LINTAS", 0.9, 0.095],
    ].forEach(([text, height, faceHeight]) => {
      const signFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.64, faceHeight),
        getSitubondoSignMaterial(text, "#f5f0df", 800),
      );
      signFace.position.set(0.036, height, 0);
      signFace.rotation.y = Math.PI * 0.5;
      trafficSign.add(signFace);
    });
    context.add(trafficSign);

    addAlunAlunPostOffice(context);
    addAlunAlunWestRoadsideContext(context);
    addAlunAlunEastJunctionFrontage(context);
    const postFlag = addIndonesianFlag(context, 22.1, -2.45, 1.8);
    animatedStopDetails.push({ object: postFlag, type: "parkFlag", phase: 2.4 });

    addAlunAlunParkedPickup(context, 20.95, -5.55, 0xe7e4da, 0.08, 1.08);
    addAlunAlunParkedVehicle(context, 24.55, -8.1, 0xf0eee7, 0, 0.98);
    addAlunAlunParkedVehicle(context, 24.55, -10.15, 0xd7d6cf, 0, 0.94);
    // Keep the vendor on the checker-paved park apron, clear of both the
    // northbound vehicle envelope and the dropped-curb/zebra access.
    addAlunAlunVendorCart(context, 16.2, 9.45);

    [
      [24.9, -7.0, 3.45, 1.52],
      [24.95, -10.25, 3.8, 1.68],
      [24.8, -13.6, 3.55, 1.58],
    ].forEach(([north, east, height, spread], index) =>
      addAlunAlunTree(context, north, east, height, spread, 31 + index * 0.86, false, 0.018),
    );

    // The west-approach signal is mounted on the curved median nose and hangs
    // above the matching eastbound stop bar.  Its former position was 27 m
    // away beside the cross street.
    addAlunAlunTrafficSignal(
      context,
      21.72,
      10.65,
      1,
      -1,
      mainSignalMaterials,
      0,
      1.3,
    );
    addAlunAlunTrafficSignal(
      context,
      23.15,
      15.72,
      -1,
      1,
      mainSignalMaterials,
      0,
      2.12,
    );
    addAlunAlunTrafficSignal(
      context,
      17.32,
      11.55,
      -1,
      -1,
      crossSignalMaterials,
      Math.PI * 0.5,
      1.58,
    );
    addAlunAlunTrafficSignal(
      context,
      24.6,
      15.05,
      1,
      1,
      crossSignalMaterials,
      Math.PI * 0.5,
      1.32,
    );
    animatedStopDetails.push({
      object: context,
      type: "trafficSignal",
      phase: 0,
      route: "main",
      materials: mainSignalMaterials,
    });
    animatedStopDetails.push({
      object: context,
      type: "trafficSignal",
      phase: 0,
      route: "cross",
      materials: crossSignalMaterials,
    });

    context.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(context);
    context.children.forEach((child) => {
      if (!child.isMesh || !flatSurfaceMaterials.has(child.material)) return;
      child.castShadow = false;
      // The landmark placement pass runs after this factory. Preserve the
      // flat-surface exception when that pass configures all other shadows.
      child.userData.disableShadowCasting = true;
    });
    group.add(context);
  }

  function getAnimatedRoadRoute(route, speed) {
    if (route === "cross") {
      return speed >= 0 ? CROSS_NORTHBOUND_ROUTE : CROSS_SOUTHBOUND_ROUTE;
    }
    return speed >= 0 ? MAIN_EASTBOUND_ROUTE : MAIN_WESTBOUND_ROUTE;
  }

  function getAnimatedLaneOffset(route, speed, suppliedLane) {
    if (route === "cross") {
      const surveyedLaneCenter = speed >= 0 ? -1.05 : 1.05;
      // Negative is the left side of travel in sampleRoadRoute().  Preserve a
      // real left-hand lane centre on shared approaches, then add only a small
      // variation so parallel vehicles do not overlap.
      return ALUN_ALUN_TRAFFIC_LANE_OFFSETS.cross +
        (suppliedLane - surveyedLaneCenter) * 0.1;
    }
    const surveyedLaneCenter = speed >= 0 ? 22.2 : 19.5;
    return ALUN_ALUN_TRAFFIC_LANE_OFFSETS.main +
      (suppliedLane - surveyedLaneCenter) * 0.08;
  }

  function addAlunAlunStreetVehicle(
    group,
    color,
    phase,
    laneNorth,
    speed,
    queueOffset = 0,
    variant = "sedan",
    route = "main",
    cargoColor = null,
  ) {
    const vehicle = new THREE.Group();
    const bodyMaterial = toonMaterial({ color });
    const darkMaterial = toonMaterial({ color: 0x253635 });
    const glassMaterial = toonMaterial({ color: 0x385458 });
    const vehicleConfig = {
      sedan: {
        length: 0.76,
        bodyHeight: 0.28,
        cabinLength: 0.36,
        cabinHeight: 0.22,
        cabinX: -0.06,
        scale: 0.86,
        wheelRadius: 0.075,
      },
      mpv: {
        length: 0.88,
        bodyHeight: 0.32,
        cabinLength: 0.6,
        cabinHeight: 0.29,
        cabinX: -0.06,
        scale: 0.9,
        wheelRadius: 0.075,
      },
      minivan: {
        length: 0.86,
        bodyHeight: 0.36,
        cabinLength: 0.68,
        cabinHeight: 0.34,
        cabinX: -0.06,
        scale: 0.92,
        wheelRadius: 0.075,
      },
      pickup: {
        length: 0.9,
        bodyHeight: 0.23,
        cabinLength: 0.38,
        cabinHeight: 0.31,
        cabinX: -0.2,
        scale: 0.92,
        wheelRadius: 0.075,
      },
      boxTruck: {
        length: 1.18,
        bodyHeight: 0.22,
        cabinLength: 0.38,
        cabinHeight: 0.38,
        cabinX: -0.36,
        scale: 0.98,
        wheelRadius: 0.085,
      },
      cargoTruck: {
        length: 1.12,
        bodyHeight: 0.22,
        cabinLength: 0.36,
        cabinHeight: 0.36,
        cabinX: -0.34,
        scale: 0.97,
        wheelRadius: 0.085,
      },
    }[variant] ?? {
      length: 0.76,
      bodyHeight: 0.28,
      cabinLength: 0.36,
      cabinHeight: 0.22,
      cabinX: -0.06,
      scale: 0.86,
      wheelRadius: 0.075,
    };

    const body = new THREE.Mesh(
      roundedBox(vehicleConfig.length, vehicleConfig.bodyHeight, 0.4, 0.065),
      bodyMaterial,
    );
    body.position.y = 0.22 + vehicleConfig.bodyHeight * 0.08;
    vehicle.add(body);
    const cabin = new THREE.Mesh(
      roundedBox(vehicleConfig.cabinLength, vehicleConfig.cabinHeight, 0.34, 0.055),
      glassMaterial,
    );
    cabin.position.set(
      vehicleConfig.cabinX,
      0.36 + vehicleConfig.cabinHeight * 0.45,
      0,
    );
    vehicle.add(cabin);
    if (["mpv", "minivan", "boxTruck", "cargoTruck"].includes(variant)) {
      const roofCap = new THREE.Mesh(
        roundedBox(vehicleConfig.cabinLength + 0.05, 0.055, 0.37, 0.018),
        bodyMaterial,
      );
      roofCap.position.set(cabin.position.x, cabin.position.y + vehicleConfig.cabinHeight * 0.54, 0);
      vehicle.add(roofCap);
    }
    if (variant === "pickup") {
      const bed = new THREE.Mesh(
        roundedBox(0.34, 0.14, 0.38, 0.025),
        bodyMaterial,
      );
      bed.position.set(0.27, 0.34, 0);
      vehicle.add(bed);
      [-0.17, 0.17].forEach((z) => {
        const rail = new THREE.Mesh(
          roundedBox(0.34, 0.035, 0.025, 0.008),
          darkMaterial,
        );
        rail.position.set(0.27, 0.48, z);
        vehicle.add(rail);
      });
    }
    if (variant === "boxTruck" || variant === "cargoTruck") {
      const cargoMaterial = toonMaterial({
        color: cargoColor ?? (variant === "boxTruck" ? 0xd5d0c2 : 0xb69b55),
      });
      const cargo = new THREE.Mesh(
        roundedBox(
          variant === "boxTruck" ? 0.64 : 0.6,
          variant === "boxTruck" ? 0.5 : 0.36,
          0.39,
          0.04,
        ),
        cargoMaterial,
      );
      cargo.position.set(0.23, variant === "boxTruck" ? 0.5 : 0.44, 0);
      vehicle.add(cargo);
      if (variant === "boxTruck") {
        [0.35, 0.5, 0.65].forEach((height) => {
          const rearSlat = new THREE.Mesh(
            roundedBox(0.025, 0.025, 0.31, 0.006),
            darkMaterial,
          );
          rearSlat.position.set(0.555, height, 0);
          vehicle.add(rearSlat);
        });
      } else {
        [-0.18, 0.18].forEach((z) => {
          const sideRail = new THREE.Mesh(
            roundedBox(0.58, 0.03, 0.025, 0.006),
            darkMaterial,
          );
          sideRail.position.set(0.23, 0.63, z);
          vehicle.add(sideRail);
        });
      }
    }
    const wheelX = vehicleConfig.length * 0.32;
    [-wheelX, wheelX].forEach((x) => {
      [-0.21, 0.21].forEach((z) => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(
            vehicleConfig.wheelRadius,
            vehicleConfig.wheelRadius,
            0.06,
            12,
          ),
          darkMaterial,
        );
        wheel.position.set(x, 0.11 + (vehicleConfig.wheelRadius - 0.075), z);
        wheel.rotation.x = Math.PI * 0.5;
        vehicle.add(wheel);
      });
    });
    vehicle.scale.setScalar(vehicleConfig.scale);
    mergeDirectMeshesByMaterial(vehicle);
    group.add(vehicle);
    const routePath = getAnimatedRoadRoute(route, speed);
    animatedStopDetails.push({
      object: vehicle,
      type: route === "cross" ? "crossStreetVehicle" : "streetVehicle",
      phase,
      route: route === "cross" ? "cross" : "main",
      routePath,
      laneOffset: getAnimatedLaneOffset(route, speed, laneNorth),
      speed: Math.max(ALUN_ALUN_TRAFFIC_MINIMUM_SPEED, Math.abs(speed)),
      queueOffset,
      travel: (phase % 1) * routePath.length,
      // Traffic spacing and stop-line placement operate on the model envelope,
      // not its group origin. The body is the longest longitudinal part of all
      // current four-wheel variants.
      halfLength: vehicleConfig.length * vehicleConfig.scale * 0.5,
      // Wheel bottoms are 0.035 local units above the group origin before the
      // model scale is applied.
      baseY: ALUN_ALUN_ROAD_SURFACE_Y - 0.035 * vehicleConfig.scale,
      headingOffset: Math.PI,
    });
  }

  function addAlunAlunMotorbike(
    group,
    color,
    phase,
    laneNorth,
    speed,
    queueOffset = 0,
    variant = "scooter",
    route = "main",
  ) {
    const bike = new THREE.Group();
    const bodyMaterial = toonMaterial({ color });
    const dark = toonMaterial({ color: 0x242b2c });
    const skinMaterial = toonMaterial({ color: 0xc9936f });
    [-0.23, 0.23].forEach((x) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.027, 6, 16), dark);
      wheel.position.set(x, 0.145, 0);
      bike.add(wheel);
    });
    const chassis = new THREE.Mesh(roundedBox(0.5, 0.11, 0.14, 0.035), bodyMaterial);
    chassis.position.y = 0.23;
    bike.add(chassis);
    const fairing = new THREE.Mesh(roundedBox(0.18, 0.24, 0.16, 0.04), bodyMaterial);
    fairing.position.set(0.12, 0.36, 0);
    fairing.rotation.z = -0.18;
    bike.add(fairing);
    const seat = new THREE.Mesh(roundedBox(0.24, 0.07, 0.16, 0.025), dark);
    seat.position.set(-0.08, 0.36, 0);
    bike.add(seat);
    const handlebar = new THREE.Mesh(roundedBox(0.04, 0.04, 0.32, 0.012), dark);
    handlebar.position.set(0.19, 0.52, 0);
    bike.add(handlebar);
    const riderBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 4, 7), bodyMaterial);
    riderBody.position.set(-0.08, 0.57, 0);
    riderBody.rotation.z = -0.24;
    bike.add(riderBody);
    [-0.065, 0.065].forEach((z, index) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 3, 6), dark);
      leg.position.set(-0.04 + index * 0.025, 0.35, z);
      leg.rotation.z = 0.52;
      bike.add(leg);
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 9, 7), skinMaterial);
    head.position.set(0.015, 0.75, 0);
    bike.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 7), dark);
    helmet.position.set(0.015, 0.785, 0);
    helmet.scale.y = 0.72;
    bike.add(helmet);
    if (variant === "delivery") {
      const cargoBox = new THREE.Mesh(
        roundedBox(0.2, 0.22, 0.2, 0.025),
        bodyMaterial,
      );
      cargoBox.position.set(-0.25, 0.5, 0);
      bike.add(cargoBox);
    } else if (variant === "commuter") {
      const frontBasket = new THREE.Mesh(
        roundedBox(0.13, 0.12, 0.18, 0.02),
        dark,
      );
      frontBasket.position.set(0.25, 0.39, 0);
      bike.add(frontBasket);
    }
    const bikeScale = variant === "delivery" ? 0.84 : 0.82;
    bike.scale.setScalar(bikeScale);
    bike.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(bike);
    group.add(bike);
    const routePath = getAnimatedRoadRoute(route, speed);
    animatedStopDetails.push({
      object: bike,
      type: route === "cross" ? "crossStreetVehicle" : "streetVehicle",
      phase,
      route: route === "cross" ? "cross" : "main",
      routePath,
      laneOffset: getAnimatedLaneOffset(route, speed, laneNorth),
      speed: Math.max(ALUN_ALUN_TRAFFIC_MINIMUM_SPEED, Math.abs(speed)),
      queueOffset,
      travel: (phase % 1) * routePath.length,
      // The front/rear torus extents exceed the chassis, basket and delivery
      // box, so they define the longitudinal envelope used by traffic spacing.
      halfLength: (0.23 + 0.105 + 0.027) * bikeScale,
      // Torus wheel bottom: 0.145 - 0.105 - 0.027 local units.
      baseY:
        ALUN_ALUN_ROAD_SURFACE_Y -
        (0.145 - 0.105 - 0.027) * bikeScale,
      headingOffset: 0,
    });
  }

  function addAlunAlunWalker(
    group,
    color,
    phase,
    radiusX,
    radiusZ,
    speed,
    centerX = -0.8,
    centerZ = 0.2,
    route = null,
  ) {
    const walker = new THREE.Group();
    const legs = new THREE.Group();
    [-0.045, 0.045].forEach((z, index) => {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.025, 0.15, 3, 6),
        index === 0 ? inkMaterial : trunkMaterial,
      );
      leg.position.set(0, 0.13, z);
      legs.add(leg);
    });
    walker.add(legs);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.22, 4, 7),
      toonMaterial({ color }),
    );
    body.position.y = 0.34;
    walker.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 9, 7),
      toonMaterial({ color: 0xc9936f }),
    );
    head.position.y = 0.55;
    walker.add(head);
    walker.scale.setScalar(0.78);
    group.add(walker);
    animatedStopDetails.push({
      object: walker,
      legs,
      type: "parkWalker",
      phase,
      centerX,
      centerZ,
      radiusX,
      radiusZ,
      speed,
      route,
    });
    return walker;
  }


  return {
    addAlunAlunMotorbike,
    addAlunAlunRoadContext,
    addAlunAlunStreetVehicle,
    addAlunAlunWalker,
    alunAlunTraffic: {
      constants: {},
      getSignalState: getAlunAlunTrafficSignalState,
    },
  };
}
