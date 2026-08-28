import * as THREE from "three";
import {
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../../rendering/materials.js";

// Midline between the two surveyed carriageways west of the Ahmad Jafar
// junction. The earlier straight median at north=21 crossed the eastbound
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

function intersectAlunAlunLines(startA, endA, startB, endB) {
  const deltaANorth = endA[0] - startA[0];
  const deltaAEast = endA[1] - startA[1];
  const deltaBNorth = endB[0] - startB[0];
  const deltaBEast = endB[1] - startB[1];
  const denominator =
    deltaANorth * deltaBEast - deltaAEast * deltaBNorth;
  if (Math.abs(denominator) < 1e-12) {
    throw new Error("Cannot miter parallel Alun-Alun frontage lines");
  }
  const startDeltaNorth = startB[0] - startA[0];
  const startDeltaEast = startB[1] - startA[1];
  const amountA =
    (startDeltaNorth * deltaBEast - startDeltaEast * deltaBNorth) /
    denominator;
  return [
    startA[0] + deltaANorth * amountA,
    startA[1] + deltaAEast * amountA,
  ];
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

// The real Ahmad Jafar junction has no visible signal installation. Runtime
// traffic still needs deterministic right-of-way gaps because the four route
// envelopes physically cross around the monument island. Keep this legacy
// export as the internal release schedule consumed by ambient.js and older
// validators; it no longer describes, or renders, a traffic-light cycle.
export const ALUN_ALUN_TRAFFIC_SIGNAL_TIMING = Object.freeze({
  cycleLength: 32,
  startOffset: 16,
  mainGreenEnd: 9,
  mainAmberEnd: 11,
  crossGreenStart: 16,
  crossGreenEnd: 25,
  crossAmberEnd: 27,
});

// The internal release clearance is validated against this lower bound.
// Keeping it in the runtime path prevents a future decorative vehicle from
// moving too slowly to leave the shared circulation envelope.
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

const freezePath = (points) =>
  Object.freeze(points.map((point) => Object.freeze(point)));

// Keep every surveyed curb return on the same deterministic cubic sampler.
// Rendering, navigation and validation can then share the exact points rather
// than approximating the same corner with unrelated diagonal caps.
const sampleAlunAlunCubicPath = (controls, segments) => {
  const [start, controlA, controlB, end] = controls;
  return freezePath(
    Array.from({ length: segments + 1 }, (_, index) => {
      const amount = index / segments;
      const inverse = 1 - amount;
      const startWeight = inverse * inverse * inverse;
      const controlAWeight = 3 * inverse * inverse * amount;
      const controlBWeight = 3 * inverse * amount * amount;
      const endWeight = amount * amount * amount;
      return [
        start[0] * startWeight +
          controlA[0] * controlAWeight +
          controlB[0] * controlBWeight +
          end[0] * endWeight,
        start[1] * startWeight +
          controlA[1] * controlAWeight +
          controlB[1] * controlBWeight +
          end[1] * endWeight,
      ];
    }),
  );
};

// Google satellite imagery and the OSM source both show Jalan Jenderal Achmad
// Yani continuing past road 102 at its full 11-metre width. The split
// carriageways beside the park remain separate 6.6-metre ribbons; conflating
// these two widths was the source of the visible 11 m -> 6.6 m pinch.
export const ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH = 2.2;
export const ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH = 1.32;
export const ALUN_ALUN_WEST_ROAD_OUTER_WIDTH =
  ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH +
  Math.min(0.28, ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH * 0.18);
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
// Exact park-side boundary chain where the shared western ribbon meets the
// split carriageway. The middle point is the intersection of their separately
// mitred outer edges; retaining the two collinear neighbours keeps the asphalt
// fill locked to both generated ribbon geometries.
export const ALUN_ALUN_NORTH_PARK_ROADSIDE_SEAM = freezePath([
  [14.234241339, -12.6501676756],
  [16.7921987068, -2.5992356382],
  [16.9364727922, -1.3327769802],
]);

// Street View shows a one-metre *clear* red/cream tiled tread behind a normal
// 15 cm curb. Keep the curb outside that clear tread: the complete roadside
// band is therefore 0.23 world units (15 cm curb + 1.00 m tread), rather than
// centring an oversized curb over the nominal one-metre sidewalk.
export const ALUN_ALUN_FRONTAGE_SIDEWALK_WIDTH = 0.2;
export const ALUN_ALUN_FRONTAGE_CURB_DEPTH = 0.03;
export const ALUN_ALUN_FRONTAGE_CURB_HEIGHT = 0.03;
export const ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH =
  ALUN_ALUN_FRONTAGE_CURB_DEPTH + ALUN_ALUN_FRONTAGE_SIDEWALK_WIDTH;
export const ALUN_ALUN_FRONTAGE_SIDEWALK_Y = 0.073;
export const ALUN_ALUN_FRONTAGE_APRON_Y = 0.069;

export const ALUN_ALUN_ROAD_102_PARK_EDGE = Object.freeze([
  10.0119389271,
  -28.8968545183,
]);
export const ALUN_ALUN_ROAD_102_SHOP_EDGE = Object.freeze([
  12.1480610729,
  -29.4231454817,
]);
export const ALUN_ALUN_ROAD_102_SHOP_SIDEWALK_OUTER = Object.freeze([
  12.5908209358,
  -29.5322312451,
]);
export const ALUN_ALUN_ROAD_3_WEST_INTERSECTION = Object.freeze([
  12.3265948589,
  -28.7957773295,
]);
export const ALUN_ALUN_ROAD_3_EAST_INTERSECTION = Object.freeze([
  12.6007829347,
  -27.6876849414,
]);

const westFrontageRoadsideSeam = freezePath([
  // The retained style-3 sidewalk is 1.45 m wide. Taper its complete envelope
  // to the 1.15 m custom curb+tread stack over the next five real metres.
  [22.4629640099, -25.8691340522],
  [21.4795435382, -26.0504739973],
  ALUN_ALUN_ROAD_3_EAST_INTERSECTION,
  [18.637329559028817, -3.0152576341412196],
  [20.34890119431536, 1.3432203067572948],
  [23.453096368834025, 10.809912681355291],
]);
const branchFrontageRoadsideSeam = freezePath(
  westFrontageRoadsideSeam.slice(0, 3),
);
const ahmadYaniFrontageRoadsideSeam = freezePath(
  westFrontageRoadsideSeam.slice(2),
);
const branchFrontageSidewalkOuterPoints = offsetAlunAlunRoadPath(
  branchFrontageRoadsideSeam,
  branchFrontageRoadsideSeam.map((_, index) =>
    -(index === 0
      ? 0.326
      : ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH),
  ),
);
const ahmadYaniFrontageSidewalkOuterPoints = offsetAlunAlunRoadPath(
  ahmadYaniFrontageRoadsideSeam,
  -ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH,
);
// Both pedestrian bands meet at an acute outside corner. Their independent
// endpoint frames crossed each other and put two coplanar surfaces over the
// carriageway. Clip both offsets to their exact shared miter instead.
const frontageSidewalkMiter = intersectAlunAlunLines(
  branchFrontageSidewalkOuterPoints.at(-2),
  branchFrontageSidewalkOuterPoints.at(-1),
  ahmadYaniFrontageSidewalkOuterPoints[0],
  ahmadYaniFrontageSidewalkOuterPoints[1],
);
branchFrontageSidewalkOuterPoints[branchFrontageSidewalkOuterPoints.length - 1] =
  frontageSidewalkMiter;
ahmadYaniFrontageSidewalkOuterPoints[0] = frontageSidewalkMiter;
const branchFrontageSidewalkOuterBoundary = freezePath(
  branchFrontageSidewalkOuterPoints,
);
const ahmadYaniFrontageSidewalkOuterBoundary = freezePath(
  ahmadYaniFrontageSidewalkOuterPoints,
);

const branchFrontageCurbCenterlinePoints = offsetAlunAlunRoadPath(
  branchFrontageRoadsideSeam,
  -ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
);
const ahmadYaniFrontageCurbCenterlinePoints = offsetAlunAlunRoadPath(
  ahmadYaniFrontageRoadsideSeam,
  -ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
);
const frontageCurbMiter = intersectAlunAlunLines(
  branchFrontageCurbCenterlinePoints.at(-2),
  branchFrontageCurbCenterlinePoints.at(-1),
  ahmadYaniFrontageCurbCenterlinePoints[0],
  ahmadYaniFrontageCurbCenterlinePoints[1],
);
branchFrontageCurbCenterlinePoints[
  branchFrontageCurbCenterlinePoints.length - 1
] = frontageCurbMiter;
ahmadYaniFrontageCurbCenterlinePoints[0] = frontageCurbMiter;
const branchFrontageCurbCenterline = freezePath(
  branchFrontageCurbCenterlinePoints,
);
const ahmadYaniFrontageCurbCenterline = freezePath(
  ahmadYaniFrontageCurbCenterlinePoints,
);

const defineFrontageApron = (id, label, material, outline) =>
  Object.freeze({
    id,
    label,
    material,
    height: ALUN_ALUN_FRONTAGE_APRON_Y,
    outline: freezePath(outline),
  });

// Satellite and Street View show separate property finishes, not one invented
// grey slab. The gaps between these surveyed aprons intentionally retain the
// tree/landscaped frontage visible west of Kantor Pos.
const westFrontagePropertyAprons = Object.freeze([
  defineFrontageApron(
    "pegadaian",
    "Pegadaian and Lesehan concrete frontage",
    "concrete",
    [
      [19.36, -26.207432519114214],
      [21.4378355132, -25.8242872588],
      [22.40384718779289, -25.548538978401357],
      [22.5931969225, -25.5781935749],
      [22.31, -25.46],
      [19.36, -25.46],
    ],
  ),
  defineFrontageApron(
    "roadside-kiosk",
    "Bicau Story kiosk pad",
    "paleConcrete",
    [
      [16.406672137283426, -13.1],
      [16.773670590397796, -11.6],
      [22.95, -11.6],
      [22.95, -13.1],
    ],
  ),
  defineFrontageApron(
    "post-west-annex",
    "Kantor Pos west-annex driveway",
    "concrete",
    [
      [18.461863474723902, -4.7],
      [18.859551120066246, -3.0745668055237974],
      [19.230786191506567, -2.13],
      [20.39, -2.13],
      [20.39, -4.7],
    ],
  ),
  defineFrontageApron(
    "post-office-entry",
    "Kantor Pos gated entry paving",
    "paleConcrete",
    [
      [20.04434071553552, -0.06],
      [20.421641364360543, 0.9],
      [22.42, 0.9],
      [22.42, -0.06],
    ],
  ),
  defineFrontageApron(
    "planet-ban",
    "Planet Ban red-tile forecourt",
    "redTile",
    [
      [21.153861909517673, 3.06],
      [22.26220225240527, 6.44],
      [24.14, 6.44],
      [24.14, 3.06],
    ],
  ),
  defineFrontageApron(
    "blue-office",
    "Blue-office concrete forecourt",
    "paleConcrete",
    [
      [22.26220225240527, 6.44],
      [22.66553320558626, 7.67],
      [24.25, 7.67],
      [24.25, 6.44],
    ],
  ),
  defineFrontageApron(
    "pos-90-west-bay",
    "pos 90 west-bay tan threshold",
    "tanPaver",
    [
      [22.66553320558626, 7.67],
      [23.200028696387086, 9.3],
      [24.33, 9.3],
      [24.33, 7.67],
    ],
  ),
  defineFrontageApron(
    "pos-90-centre-bay",
    "pos 90 centre-bay concrete threshold",
    "concrete",
    [
      [23.200028696387086, 9.3],
      [23.659104578056503, 10.7],
      [24.33, 10.7],
      [24.33, 9.3],
    ],
  ),
  defineFrontageApron(
    "pos-90-east-bay",
    "pos 90 east-bay muted-red threshold",
    "redTile",
    [
      [23.659104578056503, 10.7],
      [23.671646691689897, 10.738248489602412],
      [24.33, 10.7393226919],
      [24.33, 10.7],
    ],
  ),
]);

export const ALUN_ALUN_WEST_FRONTAGE_DEFINITION = Object.freeze({
  sidewalkWidth: ALUN_ALUN_FRONTAGE_SIDEWALK_WIDTH,
  curbDepth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
  curbHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
  roadsideBandWidth: ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH,
  branchRoadsideSeam: branchFrontageRoadsideSeam,
  branchSidewalkOuterBoundary: branchFrontageSidewalkOuterBoundary,
  branchCurbCenterline: branchFrontageCurbCenterline,
  ahmadYaniRoadsideSeam: ahmadYaniFrontageRoadsideSeam,
  ahmadYaniSidewalkOuterBoundary:
    ahmadYaniFrontageSidewalkOuterBoundary,
  ahmadYaniCurbCenterline: ahmadYaniFrontageCurbCenterline,
  // The Pegadaian branch turns sharply into Ahmad Yani. Both exact bands share
  // the road corner and the outer miter, so their only contact is one edge.
  branchSidewalkOutline: freezePath([
    ...branchFrontageRoadsideSeam,
    ...[...branchFrontageSidewalkOuterBoundary].reverse(),
  ]),
  ahmadYaniSidewalkOutline: freezePath([
    ...ahmadYaniFrontageRoadsideSeam,
    ...[...ahmadYaniFrontageSidewalkOuterBoundary].reverse(),
  ]),
  propertyAprons: westFrontagePropertyAprons,
  // Keep the footway continuous through vehicle entrances; curb blocks are
  // lowered flush across these measured driveway spans.
  loweredCurbEastSpans: Object.freeze([
    Object.freeze([-0.06, 0.9]),
    Object.freeze([3.65, 6.05]),
    Object.freeze([9.3, 10.7]),
  ]),
});

// Street View places the PLN line on the property side of the public
// footway. The former utility row used one fixed north coordinate even though
// Jalan Jenderal Achmad Yani bends around the Alun-Alun; that put one pole in
// the live carriageway and the following poles inside the park. Derive every
// support from the surveyed sidewalk boundary so the complete assembly keeps
// following the frontage when that boundary is refined.
const interpolateFrontageBoundaryAtEast = (boundary, stationEast) => {
  const segmentIndex = boundary.findIndex((start, index) => {
    const end = boundary[index + 1];
    if (!end) return false;
    return (
      stationEast >= Math.min(start[1], end[1]) - 1e-10 &&
      stationEast <= Math.max(start[1], end[1]) + 1e-10
    );
  });
  if (segmentIndex < 0) {
    throw new Error(
      `PLN frontage station ${stationEast} lies outside the sidewalk boundary`,
    );
  }
  const start = boundary[segmentIndex];
  const end = boundary[segmentIndex + 1];
  const deltaNorth = end[0] - start[0];
  const deltaEast = end[1] - start[1];
  const length = Math.hypot(deltaNorth, deltaEast);
  if (length <= 1e-10 || Math.abs(deltaEast) <= 1e-10) {
    throw new Error("PLN frontage requires finite non-vertical segments");
  }
  const amount = (stationEast - start[1]) / deltaEast;
  const tangent = [deltaNorth / length, deltaEast / length];
  // The boundary runs west-to-east. Its right-hand normal points away from
  // the carriageway and into the shop/property frontage.
  const propertyNormal = [tangent[1], -tangent[0]];
  return {
    boundaryPoint: [
      start[0] + deltaNorth * amount,
      stationEast,
    ],
    tangent,
    propertyNormal,
  };
};

const westUtilityPoleStations = Object.freeze([-10.5, -4.8, 3.06, 7.67]);
const westUtilityPropertySetback = 0.06;
const westUtilitySupports = Object.freeze(
  westUtilityPoleStations.map((stationEast, index) => {
    const frame = interpolateFrontageBoundaryAtEast(
      ahmadYaniFrontageSidewalkOuterBoundary,
      stationEast,
    );
    const center = [
      frame.boundaryPoint[0] +
        frame.propertyNormal[0] * westUtilityPropertySetback,
      frame.boundaryPoint[1] +
        frame.propertyNormal[1] * westUtilityPropertySetback,
    ];
    return Object.freeze({
      index,
      stationEast,
      boundaryPoint: Object.freeze(frame.boundaryPoint),
      center: Object.freeze(center),
      tangent: Object.freeze(frame.tangent),
      propertyNormal: Object.freeze(frame.propertyNormal),
      crossArmYaw: Math.atan2(
        -frame.propertyNormal[1],
        frame.propertyNormal[0],
      ),
    });
  }),
);

export const ALUN_ALUN_WEST_UTILITY_CORRIDOR_DEFINITION = Object.freeze({
  stationEasts: westUtilityPoleStations,
  propertySetback: westUtilityPropertySetback,
  poleTopRadius: 0.025,
  poleBaseRadius: 0.035,
  poleHeight: 2.15,
  crossArmLength: 0.62,
  crossArmBaseHeight: 1.82,
  supportHeightStep: 0.035,
  transformerSupportIndex: 2,
  insulatorOffsets: Object.freeze([-0.22, 0, 0.22]),
  conductors: Object.freeze(
    [
      [-0.21, 1.4, 0.075],
      [-0.15, 1.47, 0.095],
      [-0.1, 1.54, 0.065],
      [-0.05, 1.61, 0.11],
      [0, 1.69, 0.08],
      [0.05, 1.78, 0.12],
      [0.09, 1.9, 0.095],
      [0.13, 2.03, 0.135],
    ].map(([lateralOffset, height, sag]) =>
      Object.freeze({ lateralOffset, height, sag }),
    ),
  ),
  supports: westUtilitySupports,
});

// Road 3 is the narrow branch beside Pegadaian. The generated final two
// segments bend twice within roughly 56 metres and bring a 1.45 m generic
// sidewalk into the new frontage. Replace only that suffix with one chord,
// restore both pedestrian sides, and clip its end exactly at the shared-road
// boundary so there is no squared asphalt cap in the junction.
const pegadaianOppositeSidewalkInnerBoundary = freezePath([
  [22.6570359901, -26.8908659478],
  [21.6736155183, -27.072205893],
  ALUN_ALUN_ROAD_3_WEST_INTERSECTION,
  ALUN_ALUN_ROAD_102_SHOP_EDGE,
]);
const pegadaianOppositeSidewalkOuterPoints = offsetAlunAlunRoadPath(
  pegadaianOppositeSidewalkInnerBoundary,
  [0.326, ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH,
    ALUN_ALUN_FRONTAGE_ROADSIDE_BAND_WIDTH, 0.456],
);
pegadaianOppositeSidewalkOuterPoints[
  pegadaianOppositeSidewalkOuterPoints.length - 1
] = [...ALUN_ALUN_ROAD_102_SHOP_SIDEWALK_OUTER];
const pegadaianOppositeSidewalkOuterBoundary = freezePath(
  pegadaianOppositeSidewalkOuterPoints,
);
const pegadaianOppositeCurbCenterline = freezePath(
  offsetAlunAlunRoadPath(
    pegadaianOppositeSidewalkInnerBoundary,
    ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
  ),
);
export const ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION = Object.freeze({
  coreWidth: 1.04,
  path: freezePath([
    [22.56, -26.38],
    [11.28, -28.46],
  ]),
  surfaceOutline: freezePath([
    [22.6570359901, -26.8908659478],
    ALUN_ALUN_ROAD_3_WEST_INTERSECTION,
    ALUN_ALUN_ROAD_3_EAST_INTERSECTION,
    [22.4629640099, -25.8691340522],
  ]),
  oppositeSidewalkInnerBoundary: pegadaianOppositeSidewalkInnerBoundary,
  oppositeSidewalkOuterBoundary: pegadaianOppositeSidewalkOuterBoundary,
  oppositeCurbCenterline: pegadaianOppositeCurbCenterline,
  oppositeSidewalkOutline: freezePath([
    ...pegadaianOppositeSidewalkInnerBoundary,
    ...[...pegadaianOppositeSidewalkOuterBoundary].reverse(),
  ]),
});

// These two local-road ribbons run around the non-signalised half of the
// Alun-Alun. Keep their independently surveyed endpoint frames unchanged: a
// single combined path would move both road edges by roughly 0.13 world units
// at the south-west bend. The shared exports let the curb infill and validator
// follow the exact rendered shoulder envelope instead of approximating it.
export const ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH = 1.04;
export const ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH =
  ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH +
  Math.min(0.28, ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH * 0.18);
export const ALUN_ALUN_WEST_LOCAL_ROAD_PATH = freezePath([
  [13.32, -19.4],
  [12.36, -19.26],
  [-6.32, -15.5],
  [-17.66, -12.68],
]);

// Google satellite imagery and the June 2025 Street View survey show the
// western KH Wahid Hasyim corridor as one broad, continuously paved street.
// The OSM centre line is correct, but its generic 5.2-metre ribbon leaves an
// 8-metre raw-ground strip in front of SD Al-Abror and the mosque. Keep that
// traffic core untouched and complete only the property-side asphalt envelope.
// Its northern closing edge is clipped to the Ahmad Yani union boundary; the
// southern taper rejoins the independently rendered local-road shoulder. This
// keeps each coplanar asphalt area under exactly one owner.
export const ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE = freezePath([
  [12.0952212095, -19.8326079914],
  [-6.4513744767, -16.0993710928],
  [-17.9732347121, -13.2343972888],
  [-15.5568172014, -15.6489171352],
  [11.7951928564, -21.1649738856],
]);

// The frontage is surveyed as one straight SD-to-mosque property line. A
// 15-cm curb sits outside a full 1.50-metre clear red/cream tread; these paths
// stay separate so the validator can measure the usable tread rather than the
// combined curb-and-paving band.
export const ALUN_ALUN_WEST_PROPERTY_SIDEWALK_WIDTH = 0.3;
export const ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM = freezePath([
  [14.0837575923, -21.6265068016],
  [-15.5568172014, -15.6489171352],
]);
export const ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE = freezePath([
  [14.0949052608, -21.644056931],
  [-15.5642185182, -15.6627265064],
]);
export const ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER = freezePath([
  [14.1060544986, -21.6616073768],
  [-15.5716198349, -15.6765358775],
]);
export const ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER = freezePath([
  [14.2309033811, -21.9928253146],
  [-15.7196461693, -15.952723301],
]);
export const ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE = freezePath([
  ...ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM,
  ...[...ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER].reverse(),
]);

// The green edge/cycle marking seen beside the park is paint on the existing
// asphalt, not a raised island and not a narrower traffic lane. It wraps the
// north-west corner and crosses the pedestrian entrance at road level, just as
// the Street View marking does.
export const ALUN_ALUN_WEST_GREEN_EDGE_WIDTH = 0.25;
export const ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES = Object.freeze([
  freezePath([
    [12.41, -16.6],
    [11.4, -17.34],
    [9.97, -17.55],
    [-14.93, -12.39],
    [-14.9807294209, -12.6347989499],
    [9.9625717751, -17.8037722098],
    [11.4977074888, -17.5783326993],
    [12.557754341, -16.8016647087],
  ]),
]);
export const ALUN_ALUN_WEST_GREEN_EDGE_WHITE_LINES = Object.freeze([
  freezePath([
    [12.557754341, -16.8016647087],
    [11.4977074888, -17.5783326993],
    [9.9625717751, -17.8037722098],
    [-14.9807294209, -12.6347989499],
  ]),
]);

// Mature trees form the continuous shaded wall visible along both sides of
// the real corridor. Street View places the park-side row slightly beyond the
// middle of the broad pedestrian ring, nearer its inner lawn boundary than the
// blue-white road curb. Keep the natural station jitter and central checker
// entrance open; property-side trunks remain behind the school/mosque
// frontage and therefore never consume the tread.
export const ALUN_ALUN_WEST_PARK_TREE_CENTERS = freezePath([
  [9.9765830271, -14.9063365071],
  [8.6199131458, -14.5537080439],
  [7.551881872, -14.4345057022],
  [6.2094162286, -14.013333533],
  [5.2531548464, -13.8968682206],
  [3.9751745552, -13.5094842053],
  [2.6893371025, -13.4064208981],
  [-1.7946718065, -12.3750799729],
  [-3.1895421216, -12.1575097448],
  [-4.0778732698, -11.8610847609],
  [-5.4791850416, -11.7238793737],
  [-6.6869463761, -11.3918966051],
  [-7.6988685508, -11.1004973732],
  [-9.096121969, -10.9437080698],
  [-9.9983034289, -10.6648378252],
  [-11.3128089031, -10.4537090537],
  [-12.5516213623, -10.0744417458],
  [-13.575105126, -10.0359581712],
]);
export const ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS = freezePath([
  [10.2, -21.6],
  [7, -20.9],
  [3.8, -20.2],
  [0.160462167, -19.6460529514],
  [-3.239537833, -18.8960529514],
  [-6.468468508, -18.2394608941],
  [-10.0641, -17.3177],
  [-14.1597, -16.4917],
]);

export const ALUN_ALUN_WEST_UTILITY_SUPPORTS = freezePath([
  [10.3584682143, -21.5791223105],
  [5.4571444287, -20.5906764853],
  [-0.6695103032, -19.3551192037],
  [-6.7961650351, -18.1195619222],
  [-11.5994623449, -17.1508850135],
  [-15.3734816598, -16.389781728],
]);
export const ALUN_ALUN_WEST_PARK_LAMP_CENTERS = freezePath([
  [8.9365251831, -17.1520098163],
  [3.0365251831, -15.9293592139],
  [-3.3634748169, -14.6030941537],
  [-9.7634748169, -13.2768290935],
  [-14.2634748169, -12.344298973],
]);
export const ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH = freezePath([
  [-17.66, -12.68],
  [-18.74, -11.62],
  [-19.06, -10.52],
  [-19.06, -7.7],
  [-17.88, -2.54],
  [-15.36, 9.92],
  [-14.44, 13.78],
  [-12.84, 20.78],
]);

// The southern checker promenade is broad in Google Street View. Its mature
// shade trees sit in the inner half of that promenade, close to the lawn
// boundary rather than against Jalan Kartini's blue-white curb. Leave the
// ceremonial Gazebo opening clear between the two halves of the row.
export const ALUN_ALUN_SOUTH_PARK_TREE_CENTERS = freezePath([
  [-13.87061, -8.878938],
  [-14.527896, -7.898951],
  [-14.636965, -6.74826],
  [-14.598647, -5.573418],
  [-14.362804, -4.417227],
  [-14.126961, -3.261035],
  [-13.891119, -2.104844],
  [-13.655276, -0.948653],
  [-11.768535, 8.300877],
  [-11.532692, 9.457069],
  [-11.29685, 10.61326],
  [-11.061007, 11.769451],
  [-10.792858, 12.914703],
  [-10.277754, 13.976338],
]);

export const ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS = Object.freeze([
  Object.freeze({
    center: Object.freeze([-15.6195266034, -4]),
    yaw: 1.7710468509,
  }),
  Object.freeze({
    center: Object.freeze([-13.1432820234, 8.2]),
    yaw: 1.7710468509,
  }),
  Object.freeze({
    center: Object.freeze([-12.1690218608, 13]),
    yaw: 1.7710468509,
  }),
]);

const southLocalRoadPropertyBoundary = freezePath(
  offsetAlunAlunRoadPath(
    ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH,
    ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH * 0.5,
  ),
);
export const ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE = freezePath([
  ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE[2],
  ...southLocalRoadPropertyBoundary,
  ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH.at(-1),
  [-13.1941924531, 19.4772921639],
  [-12.6228292458, 18.9763926554],
  [-13.8422809711, 13.6413027668],
  [-14.7595930975, 9.7934436431],
  [-17.2794968436, -2.6660988467],
  [-18.4530002738, -7.7897568517],
  [-18.4484343197, -10.470076271],
  [-18.2250957274, -11.2862657493],
  [-17.3530584491, -12.1240448056],
  [-17.5119215747, -12.0845356938],
  ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH[0],
  [-17.8080784253, -13.2754643062],
]);

// Exact park-side union boundary of the two separate local-road shoulders.
// The middle corner is their clipped envelope intersection, so the infill
// neither overlaps the road nor leaves a camera-dependent ground sliver.
export const ALUN_ALUN_WEST_SOUTH_PARK_ROADSIDE_SEAM = freezePath([
  [12.3789405679, -18.6379082978],
  [-6.188625523299314, -14.90062890721055],
  [-17.353058449129374, -12.124044805610474],
  [-18.225095727448945, -11.286265749272465],
  [-18.448434319731245, -10.470076270998469],
  [-18.45300027383373, -7.789756851738872],
  [-17.279496843586397, -2.6660988466929814],
  [-14.759593097532946, 9.793443643107436],
  [-13.84228097111075, 13.64130276677708],
  [-12.622829245777579, 18.97639265543822],
]);

// Checker paths belong strictly inside the blue-white park curb. The north
// end of the first path is clipped at its two exact intersections with the
// long diagonal curb instead of retaining a small ceramic triangle outside.
export const ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES = Object.freeze([
  freezePath([
    [-15, -1.15],
    [16.2576759062, -1.15],
    [16.6, 0.2245719178],
    [16.6, 1.15],
    [-15, 1.15],
  ]),
  freezePath([
    [-1.2, -13.5],
    [1.2, -13.5],
    [1.2, 14.2],
    [-1.2, 14.2],
  ]),
]);

// The former tactile row began on the carriageway side of the blue curb.
// Preserve its original 0.145-unit grid phase, but start at the first paver whose
// complete footprint is inside the park outline.
export const ALUN_ALUN_INTERIOR_TACTILE_PAVER_DEFINITION = Object.freeze({
  north: 14.48,
  startEast: -7.94,
  endEast: 10.55,
  step: 0.145,
  width: 0.085,
  depth: 0.13,
});

// The two north-arm corners join the exact road-side edges of the pedestrian
// ribbons. Seven samples preserve a visibly gentle radius without inflating
// either raised footway into the vehicle throat.
const northwestCornerReturnControls = freezePath([
  [23.453096368834025, 10.809912681355291],
  [23.6244672622, 11.3325330186],
  [24.809457379, 12.1511604203],
  // Exact outer edge of the rendered north-arm shoulder.  The rejected
  // endpoint at [25.3788, 12.5485] sat about 1.2 m inside the live road.
  [25.439090625636037, 12.311548447333228],
]);
const northwestCornerReturnPath = sampleAlunAlunCubicPath(
  northwestCornerReturnControls,
  6,
);
const northeastCornerReturnControls = freezePath([
  [25.4158965228, 14.6209054258],
  [24.79102065307773, 14.4618868352972],
  [24.394321473545077, 14.847824038294876],
  // Project onto the east-outbound outer shoulder instead of ending inside
  // its asphalt ribbon.
  [24.529844105816817, 15.482920295411473],
]);
const northeastCornerReturnPath = sampleAlunAlunCubicPath(
  northeastCornerReturnControls,
  6,
);
const northwestCornerSidewalkOuterPoints = offsetAlunAlunRoadPath(
  northwestCornerReturnPath,
  -0.3,
);
// Share the complete end seam with the route sidewalk.  Leaving the computed
// miter here produced a visible 15.7 cm crack and a small coplanar overlap.
northwestCornerSidewalkOuterPoints.at(-1)[0] = 25.513064861461;
northwestCornerSidewalkOuterPoints.at(-1)[1] = 12.020811775353044;
const northwestCornerSidewalkOuterPath = freezePath(
  northwestCornerSidewalkOuterPoints,
);
const northwestCornerSidewalkOutline = freezePath([
  ...northwestCornerReturnPath,
  ...[...northwestCornerSidewalkOuterPath].reverse(),
]);
const northeastCornerSidewalkOuterPath = freezePath([
  [25.384103477237495, 14.899094574171896],
  [25.129962233606594, 14.865373636428837],
  [24.979337570283324, 14.893733839621715],
  [24.882969771212565, 14.954813262851395],
  [24.81847971176452, 15.05059765312964],
  [24.78457962162103, 15.203326567694138],
  [24.808861288215866, 15.459480757743348],
]);
const northeastCornerSidewalkOutline = freezePath([
  ...northeastCornerReturnPath,
  ...[...northeastCornerSidewalkOuterPath].reverse(),
]);

// The park-side corner previously kinked through two unrelated line segments.
// This cubic keeps the same road tangents while rounding the fourth corner of
// the compact junction along the real blue-white park curb.
const southwestCornerReturnControls = freezePath([
  [17.1, 10.85],
  [17.758024207959304, 10.097003225943477],
  [18.4916592435874, 7.820361175021323],
  [18.25, 6.85],
]);
const southwestCornerReturnPath = sampleAlunAlunCubicPath(
  southwestCornerReturnControls,
  6,
);
const southwestParkRoadJoin = Object.freeze([12.41, -16.6]);

// Surveyed east-side park curb. Street View shows the carriageway meeting this
// checker-paved edge directly, apart from the physical curb/drain itself. Keep
// it shared with index.js so the park and asphalt cannot drift apart again.
export const ALUN_ALUN_PARK_EAST_CURB_PATH = freezePath([
  [-11.03, 17.58],
  [-9.98, 17.67],
  [16.13, 11.96],
  ...southwestCornerReturnPath,
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
  southwestParkRoadJoin,
  [11.4, -17.34],
]);

// One clipped polygon owns the complete western Ahmad Yani surface. It joins
// road 102 at the source-map 11 m edges, stays 11 m wide along the shared
// section, then opens around the two unchanged 6.6 m split carriageways. The
// park-side return follows the existing blue-white curb, preventing the wide
// road from recreating the old buried square cap under the ceramic apron.
export const ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE = freezePath([
  ALUN_ALUN_ROAD_102_PARK_EDGE,
  [10.2078742315, -28.2139383482],
  [12.2513929801, -19.1390804011],
  [12.8975853325, -16.6],
  southwestParkRoadJoin,
  ...[...southwestCornerReturnPath].reverse(),
  [18.6, 8.7],
  [19.25, 10.65],
  [19.4747273835, 11.0303555953],
  [18.9421650721, 8.1394872198],
  [17.3563237698, 2.352735246],
  [16.9364727922, -1.3327769802],
  [16.7982481471, -2.5461327817],
  [16.9144402105, -2.5757038711],
  [17.472816754, 2.3294366492],
  [19.0577670103, 8.1121078134],
  [19.782384989, 12.0446992394],
  [19.5118124957, 12.6556900677],
  [19.5397059499, 13.7000735125],
  [20.0107840182, 14.6398798446],
  [20.4992831392, 15.0181963085],
  [20.55, 15.36],
  [21.4, 15.86],
  ...[...northeastCornerReturnPath].reverse(),
  ...[...northwestCornerReturnPath].reverse(),
  [20.34890119431536, 1.3432203067572948],
  [18.637329559028817, -3.0152576341412196],
  ALUN_ALUN_ROAD_3_EAST_INTERSECTION,
  [22.4629640099, -25.8691340522],
  [22.6570359901, -26.8908659478],
  ALUN_ALUN_ROAD_3_WEST_INTERSECTION,
  ALUN_ALUN_ROAD_102_SHOP_EDGE,
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
const SOUTH_APPROACH_SIDEWALK_WIDTH = 0.3;
const SOUTH_APPROACH_ROADSIDE_BAND_WIDTH =
  ALUN_ALUN_FRONTAGE_CURB_DEPTH + SOUTH_APPROACH_SIDEWALK_WIDTH;
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
  // The final chain is the exact shared border with the western Ahmad Yani
  // owner.  It clips away the former 43.98 m2 coplanar corner overlap while
  // preserving every centimetre of the visible carriageway.
  [18.6, 8.7],
  [19.25, 10.65],
  [19.650208451369195, 11.327360815727694],
  [19.782384989, 12.0446992394],
  [19.5118124957, 12.6556900677],
  [19.5397059499, 13.7000735125],
  [20.0107840182, 14.6398798446],
  [20.4992831392, 15.0181963085],
  [20.55, 15.36],
]);
const southApproachRoadsideSeam = freezePath([
  ...southApproachSharedEastBoundary,
  ...southApproachEastBoundary,
]);
// Street View shows the raised footway ending before the Hasanudin-side
// diagonal carriageway opens into the junction.  Continuing all seven
// stations put a blue-white curb and pale apron directly across that live
// asphalt fan.  Retain the four genuine approach stations and leave the last
// three stations flush for the turquoise road edge and road-edge hardstand.
const southApproachPedestrianRoadsideSeam = freezePath(
  southApproachRoadsideSeam.slice(0, 4),
);
const southApproachSidewalkCenterline = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    ALUN_ALUN_FRONTAGE_CURB_DEPTH + SOUTH_APPROACH_SIDEWALK_WIDTH * 0.5,
  ).slice(0, 4),
);
const southApproachCurbCenterline = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
  ).slice(0, 4),
);
const southApproachClearTreadInner = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    ALUN_ALUN_FRONTAGE_CURB_DEPTH,
  ).slice(0, 4),
);
const southApproachSidewalkOuterBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    SOUTH_APPROACH_ROADSIDE_BAND_WIDTH,
  ).slice(0, 4),
);
const southApproachFrontageOuterBoundary = freezePath(
  offsetAlunAlunRoadPath(
    southApproachRoadsideSeam,
    SOUTH_APPROACH_ROADSIDE_BAND_WIDTH + SOUTH_APPROACH_FRONTAGE_WIDTH,
  ).slice(0, 4),
);
// The former final three sidewalk/apron stations are flush in Street View,
// and their northern portion is crossed by the real diagonal Hasanudin
// carriageway.  Keep the unobstructed southern strip, then subtract every
// existing asphalt owner from the two northern pieces.  The intersection
// points below lie on rendered ribbon edges, so the three polygons meet their
// neighbours without a coplanar overlay through the live road.
const southApproachTerminalHardstandOutlines = Object.freeze([
  freezePath([
    [10.343298547350814, 16.5199401248045],
    [15.536, 15.727],
    [15.628697686969359, 16.551807334369993],
    [10.514352969475445, 17.33212260717629],
  ]),
  freezePath([
    [15.536, 15.727],
    [16.871582341243048, 15.715726464845517],
    [17.0914825508127, 16.498070473756368],
    [16.9331353672737, 16.542578488706805],
    [15.628697686969359, 16.551807334369993],
  ]),
  freezePath([
    [18.458087101953982, 15.604056504772036],
    [20.178408281194205, 15.403352367194008],
    [20.282002645343564, 15.412217593174683],
    [20.48696420725258, 16.202943037258013],
    [18.685374572063388, 16.412668431521876],
  ]),
]);

export const ALUN_ALUN_SOUTH_APPROACH_DEFINITION = Object.freeze({
  sharedCoreWidth: SOUTH_APPROACH_SHARED_CORE_WIDTH,
  splitCoreWidth: SOUTH_APPROACH_SPLIT_CORE_WIDTH,
  splitNorth: 15.5,
  surfaceOutline: freezePath([
    ...southApproachParkSideBoundary,
    ...[...southApproachEastBoundary].reverse().slice(1),
    ...[...southApproachSharedEastBoundary].reverse(),
  ]),
  parkCurbSeam: ALUN_ALUN_PARK_EAST_CURB_PATH,
  roadsideSeam: southApproachRoadsideSeam,
  pedestrianRoadsideSeam: southApproachPedestrianRoadsideSeam,
  sidewalkCenterline: southApproachSidewalkCenterline,
  curbCenterline: southApproachCurbCenterline,
  clearTreadInner: southApproachClearTreadInner,
  sidewalkOuterBoundary: southApproachSidewalkOuterBoundary,
  sidewalkWidth: SOUTH_APPROACH_SIDEWALK_WIDTH,
  roadsideBandWidth: SOUTH_APPROACH_ROADSIDE_BAND_WIDTH,
  sidewalkOutline: freezePath([
    ...southApproachPedestrianRoadsideSeam,
    ...[...southApproachSidewalkOuterBoundary].reverse(),
  ]),
  frontageOuterBoundary: southApproachFrontageOuterBoundary,
  frontageWidth: SOUTH_APPROACH_FRONTAGE_WIDTH,
  terminalHardstandOutlines: southApproachTerminalHardstandOutlines,
  terminalHardstandHeight: ALUN_ALUN_ROAD_SURFACE_Y,
  frontageApronOutline: freezePath([
    ...southApproachSidewalkOuterBoundary,
    ...[...southApproachFrontageOuterBoundary].reverse(),
  ]),
  junctionWestJoin: Object.freeze([
    20.178408281194205,
    15.403352367194008,
  ]),
  junctionEastJoin: southApproachEastBoundary.at(-1),
});

// Jalan Kartini already has the broad asphalt envelope visible in satellite
// imagery; the missing piece was its property-side public realm. Wrap a
// continuous 15-cm curb and full 1.50-metre clear tread around the south-west
// corner, then taper it into the rebuilt south approach. Extra paving is split
// by property so the Pendopo entrance can remain a deep ceremonial apron
// without turning every neighbouring frontage into one invented slab.
export const ALUN_ALUN_SOUTH_PROPERTY_SIDEWALK_WIDTH = 0.3;
export const ALUN_ALUN_SOUTH_PROPERTY_ROADSIDE_BAND_WIDTH =
  ALUN_ALUN_FRONTAGE_CURB_DEPTH +
  ALUN_ALUN_SOUTH_PROPERTY_SIDEWALK_WIDTH;
const southPropertyRoadsideSeam = freezePath([
  ALUN_ALUN_WEST_PROPERTY_ROADSIDE_SEAM.at(-1),
  ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE[2],
  ...southLocalRoadPropertyBoundary.slice(0, 5),
  [-18.2349946952, -1.2],
  [-16.3197109663, 8.27],
  ...southLocalRoadPropertyBoundary.slice(5),
]);
const offsetSouthPropertyPathWithWestJoin = (offset, westJoin) => {
  const points = offsetAlunAlunRoadPath(southPropertyRoadsideSeam, offset);
  points[0] = [...westJoin];
  return freezePath(points);
};
const southPropertyCurbCenterline = offsetSouthPropertyPathWithWestJoin(
  ALUN_ALUN_FRONTAGE_CURB_DEPTH * 0.5,
  ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE.at(-1),
);
const southPropertyClearTreadInner = offsetSouthPropertyPathWithWestJoin(
  ALUN_ALUN_FRONTAGE_CURB_DEPTH,
  ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER.at(-1),
);
const southPropertySidewalkOuterBoundary =
  offsetSouthPropertyPathWithWestJoin(
    ALUN_ALUN_SOUTH_PROPERTY_ROADSIDE_BAND_WIDTH,
    ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER.at(-1),
  );
const SOUTH_PROPERTY_STANDARD_APRON_DEPTH = 0.52;
const southPropertyStandardApronOuter = freezePath(
  offsetAlunAlunRoadPath(
    southPropertyRoadsideSeam,
    ALUN_ALUN_SOUTH_PROPERTY_ROADSIDE_BAND_WIDTH +
      SOUTH_PROPERTY_STANDARD_APRON_DEPTH,
  ),
);
const defineSouthPropertyApron = (
  id,
  label,
  material,
  startIndex,
  endIndex,
  outerBoundary,
) => Object.freeze({
  id,
  label,
  material,
  height: ALUN_ALUN_FRONTAGE_APRON_Y,
  outline: freezePath([
    ...southPropertySidewalkOuterBoundary.slice(startIndex, endIndex + 1),
    ...outerBoundary.slice(startIndex, endIndex + 1).reverse(),
  ]),
});
const southPropertyAprons = Object.freeze([
  defineSouthPropertyApron(
    "library-row",
    "Jalan Kartini library-row pale apron",
    "paleConcrete",
    0,
    7,
    southPropertyStandardApronOuter,
  ),
  defineSouthPropertyApron(
    "pendopo-entry",
    "Pendopo ceremonial concrete entrance apron",
    "concrete",
    7,
    8,
    southPropertyStandardApronOuter,
  ),
  Object.freeze({
    id: "pendopo-entry-extension",
    label: "Pendopo wall-aligned ceremonial entrance apron",
    material: "concrete",
    height: ALUN_ALUN_FRONTAGE_APRON_Y,
    outline: freezePath([
      [-18.8281359, 0.1551159009],
      [-17.2923400731, 7.7487618248],
      [-18.3323502767, 7.6456802285],
      [-19.2916508464, 0.0520343047],
    ]),
  }),
  defineSouthPropertyApron(
    "east-civic-row",
    "Jalan Kartini east civic pale apron",
    "paleConcrete",
    8,
    southPropertyRoadsideSeam.length - 1,
    southPropertyStandardApronOuter,
  ),
]);
const southPropertyTransitionRoadsideSeam = freezePath([
  southPropertyRoadsideSeam.at(-1),
  ALUN_ALUN_SOUTH_LOCAL_ROAD_PATH.at(-1),
  southApproachRoadsideSeam[0],
]);
const southPropertyTransitionCurbCenterline = freezePath([
  [-13.4527960588, 20.9200676634],
  [-12.8516172665, 20.7894888945],
  [-12.4818712304, 22.0971821379],
]);
const southPropertyTransitionClearTreadInner = freezePath([
  [-13.4674189379, 20.9234100287],
  [-12.863234533, 20.7989777891],
  [-12.4779349139, 22.1116564397],
]);
const southPropertyTransitionSidewalkOuter = freezePath([
  [-13.759876521, 20.9902573332],
  [-13.0955798625, 20.9887556799],
  [-12.3992085842, 22.4011424756],
]);
const southPropertyTransitionFrontageOuterPoints = offsetAlunAlunRoadPath(
  southPropertyTransitionRoadsideSeam,
  [
    ALUN_ALUN_SOUTH_PROPERTY_ROADSIDE_BAND_WIDTH +
      SOUTH_PROPERTY_STANDARD_APRON_DEPTH,
    0.84,
    SOUTH_APPROACH_ROADSIDE_BAND_WIDTH + SOUTH_APPROACH_FRONTAGE_WIDTH,
  ],
);
southPropertyTransitionFrontageOuterPoints[0] = [
  ...southPropertyStandardApronOuter.at(-1),
];
southPropertyTransitionFrontageOuterPoints.at(-1)[0] =
  southApproachFrontageOuterBoundary[0][0];
southPropertyTransitionFrontageOuterPoints.at(-1)[1] =
  southApproachFrontageOuterBoundary[0][1];
const southPropertyTransitionFrontageOuter = freezePath(
  southPropertyTransitionFrontageOuterPoints,
);

export const ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION = Object.freeze({
  curbDepth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
  curbHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
  sidewalkWidth: ALUN_ALUN_SOUTH_PROPERTY_SIDEWALK_WIDTH,
  roadsideBandWidth: ALUN_ALUN_SOUTH_PROPERTY_ROADSIDE_BAND_WIDTH,
  roadsideSeam: southPropertyRoadsideSeam,
  curbCenterline: southPropertyCurbCenterline,
  clearTreadInner: southPropertyClearTreadInner,
  sidewalkOuterBoundary: southPropertySidewalkOuterBoundary,
  sidewalkOutline: freezePath([
    ...southPropertyRoadsideSeam,
    ...[...southPropertySidewalkOuterBoundary].reverse(),
  ]),
  transitionRoadsideSeam: southPropertyTransitionRoadsideSeam,
  transitionCurbCenterline: southPropertyTransitionCurbCenterline,
  transitionClearTreadInner: southPropertyTransitionClearTreadInner,
  transitionSidewalkOuterBoundary: southPropertyTransitionSidewalkOuter,
  transitionSidewalkOutline: freezePath([
    ...southPropertyTransitionRoadsideSeam,
    ...[...southPropertyTransitionSidewalkOuter].reverse(),
  ]),
  propertyAprons: southPropertyAprons,
  transitionApronOutline: freezePath([
    ...southPropertyTransitionSidewalkOuter,
    ...[...southPropertyTransitionFrontageOuter].reverse(),
  ]),
  transitionApronHeight: ALUN_ALUN_FRONTAGE_APRON_Y,
});

// The blue-white outline is the ownership boundary: checker ceramic remains
// on the park side, while this single asphalt polygon fills the complete
// former exterior apron and continuation wedge. Its road-facing vertices are
// the exact west-ribbon, split-carriageway and south-approach seams; its final
// vertices run back along the unchanged park curb. The west cap reaches park
// semantic park-road join so the complete visible diagonal has asphalt outside it,
// including the strip that the former checker apron left as bare map ground.
export const ALUN_ALUN_NORTH_PARK_ASPHALT_FILL_OUTLINE = freezePath([
  [13.2290109128, -16.6],
  ...ALUN_ALUN_NORTH_PARK_ROADSIDE_SEAM,
  [17.3563237698, 2.352735246],
  [18.9421650721, 8.1394872198],
  [19.4747273835, 11.0303555953],
  [19.25, 10.65],
  [18.6, 8.7],
  ...southwestCornerReturnPath,
  southwestParkRoadJoin,
]);

// Complete the same ceramic-inside/asphalt-outside ownership rule around the
// nine non-signalised curb edges. The road-facing half follows the existing
// shoulder union; the return follows the unchanged blue-white curb exactly.
// The first and final joins are shared with the existing north and south
// asphalt surfaces, respectively, so this adds no coplanar road overlap.
export const ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE = freezePath([
  ...ALUN_ALUN_WEST_SOUTH_PARK_ROADSIDE_SEAM,
  ALUN_ALUN_PARK_OUTLINE[7],
  ALUN_ALUN_PARK_OUTLINE[6],
  ALUN_ALUN_PARK_OUTLINE[5],
  ALUN_ALUN_PARK_OUTLINE[4],
  ALUN_ALUN_PARK_OUTLINE[3],
  ALUN_ALUN_PARK_OUTLINE[2],
  ALUN_ALUN_PARK_OUTLINE[1],
  ALUN_ALUN_PARK_OUTLINE[0],
  [11.4, -17.34],
  southwestParkRoadJoin,
  [12.8975853325, -16.6],
]);

// The showroom frontage begins on the exact outer shoulder.  Street View is
// flush at the junction nose, then gradually recovers a conventional tread
// only farther along Hasanudin; the former continuous raised curb created a
// splitter island that does not exist in May 2025 imagery.
const southeastParcelRoadsideSeam = freezePath([
  [19.82193109333018, 19.38],
  [20.2468480832, 21.9678531114],
  [21.0900974747, 24.9678531114],
  [21.9333468662, 27.9678531114],
]);
const southeastParcelSidewalkOutline = freezePath([
  [21.0900974747, 24.9678531114],
  [21.9333468662, 27.9678531114],
  [22.2510354895, 27.8785561986],
  [21.407786098, 24.8785561986],
]);
const southeastParcelApronOutline = freezePath([
  [21.407786098, 24.8785561986],
  [22.2510354895, 27.8785561986],
  [22.3280509133, 27.8569084622],
  [21.4848015218, 24.8569084622],
]);
const southeastParcelFlushTaperOutline = freezePath([
  [20.2468480832, 21.9678531114],
  [21.0900974747, 24.9678531114],
  [21.407786098, 24.8785561986],
  [21.4848015218, 24.8569084622],
]);
const southeastParcelCurbCenterline = freezePath([
  [21.1045378667, 24.9637941608],
  [21.9477872582, 27.9637941608],
]);
const southeastParcelClearTreadInner = freezePath([
  [21.1189782586, 24.9597352102],
  [21.9622276501, 27.9597352102],
]);

export const ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE = freezePath([
  [20.178408281194205, 15.403352367194008],
  [20.282002645343564, 15.412217593174683],
  [20.56115445697166, 16.489163134379517],
  [21.15178729692002, 18.351045550713103],
  [21.57447195504054, 19.458474344439068],
  [22.08, 19.5],
  [21.4, 15.86],
  [20.55, 15.36],
]);

// The shop-side corner used to be one long diagonal cut from the south arm
// to the east arm.  In the street-level view that read as a triangular
// splitter/sidewalk projecting into both roads.  The real curb return is a
// shallow ellipse: it remains flush at the two road tangents and bows toward
// the property, opening the full turning fan while keeping a recognisable
// rounded corner.
const southeastCornerReturnControls = freezePath([
  [18.685374572063388, 16.412668431521876],
  [19.03731449018672, 16.371709753846392],
  [19.546168177437124, 17.70022934936256],
  [19.82193109333018, 19.38],
]);
const southeastCornerReturnPath = sampleAlunAlunCubicPath(
  southeastCornerReturnControls,
  12,
);
const southeastCornerReturnOuterPath = freezePath(
  offsetAlunAlunRoadPath(southeastCornerReturnPath, 0.2),
);
const southeastRoundedCornerShoulderOutline = freezePath([
  ...southeastCornerReturnPath,
  ...[...southeastCornerReturnOuterPath].reverse(),
]);
const southeastRoundedCornerAsphaltOutline = freezePath([
  ...southeastCornerReturnOuterPath,
  [19.519442513512153, 19.38],
]);
const southeastGreenEdgePath = freezePath([
  // Continue the May 2025 turquoise shoulder through the now-flush approach;
  // then follow the rounded curb on the asphalt side instead of cutting a
  // straight diagonal across the turning fan.
  [10.32, 16.366],
  [12.92, 15.969],
  [15.6, 15.56],
  [17.55, 15.54],
  ...southeastCornerReturnPath,
]);

// Street View shows the complete fan between the south approach, eastbound
// shoulder and Hasanudin frontage as one open asphalt hardstand.  Its outer
// boundary consumes the rounded return above rather than closing the fan with
// the former straight, sharp diagonal.
const southeastOpenFrontageAsphaltOutline = freezePath([
  [18.685374572063388, 16.412668431521876],
  [20.48696420725258, 16.202943037258013],
  [20.56115445697166, 16.489163134379517],
  [21.15178729692002, 18.351045550713103],
  [21.544519779660614, 19.38],
  ...[...southeastCornerReturnPath].reverse().slice(0, -1),
]);
const southeastHasanudinApproachSurfaceOutline = freezePath([
  [16.373614807943607, 13.338503347961998],
  [16.688305713374678, 15.063679010835294],
  // Follow the two real OSM 567 frontage returns instead of navigating
  // through either the shop threshold or its wall.
  [17.98144892432081, 19.66432421134393],
  [18.48, 19.46],
  [19.14, 22.32],
  [18.7800538544, 22.5055392503],
  [20.850254448751883, 29.870739290080554],
  [22.34974555124812, 29.449260709919447],
  [18.191694286625324, 14.656320989164705],
  [17.906385192056394, 13.061496652038],
]);

// The rejected broad hardstand ran underneath both real OSM buildings 617
// and 567. OSM 617 needs this surveyed threshold; OSM 567 already meets the
// clipped road directly along its real facade, so adding another slab there
// would put raised paving back inside that building footprint.
const southeastHasanudinFrontageThresholds = Object.freeze([
  Object.freeze({
    buildingIndex: 617,
    label: "OSM 617 road-facing threshold",
    outline: freezePath([
      [17.1145111927, 16.58],
      [17.8003431352, 19.02],
      [17.8, 19.02],
      [16.8, 16.58],
    ]),
    facadeSegment: freezePath([
      [16.8, 16.58],
      [17.8, 19.02],
    ]),
    height: ALUN_ALUN_FRONTAGE_APRON_Y,
  }),
]);

// The large SEWA BILLBOARD facade in the May 2025 frame is the Bakti Motor
// building represented by OSM 2122, across the junction on Ahmad Yani.  The
// earlier custom shell on OSM 617 put this frontage in the live south/east
// turning fan.  Keep one surveyed definition for its art, apron, barriers and
// collision so they cannot drift apart again.
const southeastShowroomDefinition = Object.freeze({
  replacementBuildingIndex: 2122,
  center: Object.freeze([30.82, 23.74]),
  width: 6.22,
  depth: 4.32,
  yaw: 0.1465036732051035,
  facadeSide: "localNegativeX",
  facadeSegment: freezePath([
    [27.4279986752, 22.0571372568],
    [28.0586329634, 26.3308593342],
  ]),
  roadEdge: freezePath([
    [25.9862597881, 22.06],
    [27.0127225825, 26.34],
  ]),
  curbCenterline: freezePath([
    [26.0008459377, 22.0565026510],
    [27.0273087321, 26.3365026510],
  ]),
  sidewalkOutline: freezePath([
    [25.9862597881, 22.06],
    [27.0127225825, 26.34],
    [27.2363804012, 26.2863606473],
    [26.2099176067, 22.0063606473],
  ]),
  sidewalkHeight: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
  forecourtOutline: freezePath([
    [26.2099176067, 22.0063606473],
    [27.2363804012, 26.2863606473],
    [28.0586329634, 26.3308593342],
    [27.4279986752, 22.0571372568],
  ]),
  forecourtHeight: ALUN_ALUN_FRONTAGE_APRON_Y,
});
const southeastShowroomBarrierSupports = Object.freeze(
  [-0.78, -0.26, 0.26, 0.78].map((localZ) => {
    // Four short barriers sit parallel to the long local -X storefront.  A
    // 60 cm physical gap from the facade leaves them wholly on the apron.
    const localX = -southeastShowroomDefinition.width * 0.5 - 0.12;
    const cosine = Math.cos(southeastShowroomDefinition.yaw);
    const sine = Math.sin(southeastShowroomDefinition.yaw);
    return Object.freeze({
      center: Object.freeze([
        southeastShowroomDefinition.center[0] +
          localX * cosine + localZ * sine,
        southeastShowroomDefinition.center[1] -
          localX * sine + localZ * cosine,
      ]),
      yaw: southeastShowroomDefinition.yaw,
    });
  }),
);

const dwiPutriSidewalkSeam = freezePath([
  // Exact intersection between the shop body face and the curved outer edge.
  [24.49, 11.480064378782883],
  northwestCornerSidewalkOuterPath[3],
  northwestCornerSidewalkOuterPath[2],
  northwestCornerSidewalkOuterPath[1],
  northwestCornerSidewalkOuterPath[0],
]);

// May 2025 Street View shows an open, unsignalised four-way junction. The
// former east/south raised medians, refuge and four signal poles are absent;
// the only raised object inside the circulation area is this compact planted
// island and its distinctive green-and-gold monument. One shared definition
// drives rendering, player collision, navigation and offline validation.
export const ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION = Object.freeze({
  control: "unsignalised-priority",
  physicalSignalCount: 0,
  visibleStopBarCount: 0,
  junctionAsphaltOutline: ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE,
  openFrontageAsphaltOutline: southeastOpenFrontageAsphaltOutline,
  hasanudinApproachSurfaceOutline: southeastHasanudinApproachSurfaceOutline,
  hasanudinFrontageThresholds: southeastHasanudinFrontageThresholds,
  cornerReturns: Object.freeze({
    southwest: Object.freeze({
      controls: southwestCornerReturnControls,
      path: southwestCornerReturnPath,
      renderName: "Rounded south-west park curb return",
    }),
    southeast: Object.freeze({
      controls: southeastCornerReturnControls,
      path: southeastCornerReturnPath,
      asphaltOutline: southeastRoundedCornerAsphaltOutline,
      shoulderOutline: southeastRoundedCornerShoulderOutline,
      shoulderOuterPath: southeastCornerReturnOuterPath,
      renderName: "Rounded south-east turquoise flush return",
    }),
    northeast: Object.freeze({
      controls: northeastCornerReturnControls,
      path: northeastCornerReturnPath,
      sidewalkOuterPath: northeastCornerSidewalkOuterPath,
      sidewalkOutline: northeastCornerSidewalkOutline,
      renderName: "Rounded north-east sidewalk return",
    }),
    northwest: Object.freeze({
      controls: northwestCornerReturnControls,
      path: northwestCornerReturnPath,
      sidewalkOuterPath: northwestCornerSidewalkOuterPath,
      sidewalkOutline: northwestCornerSidewalkOutline,
      renderName: "Rounded north-west sidewalk return",
    }),
  }),
  // This was previously covered by a 63-metre raised median. It now remains
  // plain asphalt beneath the two surveyed carriageway ribbons.
  eastAsphaltInfillOutline: freezePath([
    // Both ends lie on the western union's exact [21.4, 15.86] ->
    // rounded north-east shoulder edge. The opposing points follow the two generated
    // carriageway shoulders, leaving neither an overlap nor a raw-ground gap.
    [22.981859023057787, 15.669419602718628],
    [23.6597754419, 18.8690800439],
    [25.303796549, 26.0662411896],
    [25.980771508972506, 28.3],
    [25.927973180568674, 28.3],
    [25.7284807739, 27.6648117775],
    [23.3474956006, 19.0014141653],
    [22.29465546389013, 15.75221302830859],
  ]),
  // Exact shoulder intersections let all asphalt owners meet at one physical
  // road height.  No layer needs to be hidden above or below another one.
  asphaltInfillY: ALUN_ALUN_ROAD_SURFACE_Y,
  monumentIsland: Object.freeze({
    // Fixed-point midpoint of the four rendered lane centres at the crossing.
    // This is the visual centre of the open throat; the masked OSM loop's
    // centroid sat 1.27 m west of the balanced lane clearances.
    center: Object.freeze([21.87766932270916, 13.362868525896415]),
    width: 0.86,
    depth: 0.54,
    yaw: 0,
    curbHeight: 0.04,
    collisionWidth: 0.98,
    collisionDepth: 0.66,
    curbBlocks: Object.freeze({ count: 16, width: 0.15, depth: 0.06 }),
    // Street View proportions: a low 15--20 cm island and a roughly
    // five-metre monument.  The taller former silhouette dominated the open
    // junction and hid the showroom from the south-west approach.
    visualHeight: 0.86,
    modelScale: 0.82,
  }),
  // Worn white approach guides and the turquoise edge sweep are the only
  // strong lane graphics visible in the reference frame.
  southGuidePath: freezePath([
    [-12.84, 20.78],
    [-8.5, 19.6],
    [-1.52, 17.94],
    [10.06, 15.2],
    [15.5, 14.287],
    [19.15, 13.72],
  ]),
  eastGuidePath: freezePath([
    [22.32, 15.18],
    [23.28, 19.08],
    [25.2, 26.0],
    [26.05, 29.38],
  ]),
  greenEdgePath: southeastGreenEdgePath,
  barrierSupports: southeastShowroomBarrierSupports,
  // addAlunAlunRoadBarrier already applies its surveyed 0.58 base scale.
  // Keep the junction multiplier neutral so the orange barriers remain about
  // one metre tall and agree with their shared collision footprint.
  barrierScale: 1,
  barrierCollision: Object.freeze({ width: 0.2, depth: 0.52 }),
  contextTrees: Object.freeze([
    Object.freeze({
      // Rooted in the narrow curb pocket beside the DWI PUTRI kiosk.  The
      // earlier [24.28, 12.0] position left the complete trunk/collider on the
      // rendered carriageway even though the traffic centreline cleared it.
      center: Object.freeze([24.62, 11.67]),
      height: 3.3,
      spread: 1.6,
      trunkScale: 0.52,
      collisionWidth: 0.3,
      collisionDepth: 0.3,
    }),
    Object.freeze({
      center: Object.freeze([15.6, 9.3]),
      height: 3.05,
      spread: 1.5,
      trunkScale: 0.48,
      collisionWidth: 0.26,
      collisionDepth: 0.26,
    }),
    Object.freeze({
      center: Object.freeze([22.2, 25.2]),
      height: 2.75,
      spread: 1.28,
      trunkScale: 0.48,
      collisionWidth: 0.22,
      collisionDepth: 0.22,
    }),
  ]),
  utilityCorridor: Object.freeze({
    poleHeight: 2.55,
    poleRadius: 0.045,
    crossArmLength: 0.56,
    conductorOffsets: Object.freeze([-0.22, -0.13, -0.04, 0.05, 0.14, 0.23]),
    supports: Object.freeze([
      Object.freeze({ center: Object.freeze([24.28, 8.02]), yaw: -0.08 }),
      Object.freeze({ center: Object.freeze([27.52, 12.32]), yaw: -0.08 }),
      Object.freeze({ center: Object.freeze([20.29, 21.09]), yaw: 0.274012807 }),
      Object.freeze({ center: Object.freeze([21.25, 24.55]), yaw: 0.274012807 }),
      Object.freeze({ center: Object.freeze([22.08, 27.45]), yaw: 0.274012807 }),
    ]),
    collisionWidth: 0.14,
    collisionDepth: 0.14,
  }),
  parkedVehicles: Object.freeze([
    Object.freeze({
      kind: "vehicle",
      center: Object.freeze([23.04, 8.18]),
      yaw: 0.04,
      scale: 0.86,
      color: 0xe6e2d8,
      collisionWidth: 0.42,
      collisionDepth: 0.82,
    }),
  ]),
  showroom: southeastShowroomDefinition,
  dwiPutriFrontageConnector: Object.freeze({
    // A low, curb-free threshold now follows the complete exposed shutter
    // facade, then rounds into the property side of the north-west footway.
    // The short former connector left most of this shop row visibly set back.
    // The two final points notch around utility support 1 while preserving a
    // continuous apron up to the neighbouring blue office.
    outline: freezePath([
      [24.49, 7.46],
      ...dwiPutriSidewalkSeam,
      [24.38, 8.13],
      [24.38, 7.9],
    ]),
    sidewalkSeam: dwiPutriSidewalkSeam,
    facadeSegment: freezePath([
      [24.49, 7.46],
      [24.49, 11.480064378782883],
    ]),
    height: ALUN_ALUN_FRONTAGE_APRON_Y,
  }),
  parcel: Object.freeze({
    // Keep the first property-side bay flush and visually continuous with the
    // turning fan.  Rendering the complete parcel in pale forecourt concrete
    // made this safe, road-height bay read like a sharp sidewalk splitter
    // from the east approach.  The split point lies on the property edge at
    // the first distant sidewalk station, so no usable asphalt is invented.
    noseHardstandOutline: freezePath([
      [19.82193109333018, 19.38],
      [21.544519779660614, 19.38],
      [21.57447195504054, 19.458474344439068],
      [21.864517859775134, 19.482299622694075],
      [22.547599782368795, 21.9678531114],
      [20.2468480832, 21.9678531114],
    ]),
    noseHardstandHeight: ALUN_ALUN_ROAD_SURFACE_Y,
    // Asphalt backing owns only the area outside the two raised pedestrian
    // bands.  This removes the broad grey triangular "sidewalk" while also
    // avoiding a hidden coplanar slab beneath the real narrow tread/apron.
    landOutline: freezePath([
      [20.2468480832, 21.9678531114],
      [22.547599782368795, 21.9678531114],
      [24.2315192261, 28.0951882225],
      [21.969138117905715, 28.0951882225],
      [21.9333468662, 27.9678531114],
      [22.2510354895, 27.8785561986],
      [22.3280509133, 27.8569084622],
      [21.4848015218, 24.8569084622],
    ]),
    roadsideSeam: southeastParcelRoadsideSeam,
    curbCenterline: southeastParcelCurbCenterline,
    clearTreadInner: southeastParcelClearTreadInner,
    sidewalkOutline: southeastParcelSidewalkOutline,
    sidewalkHeight: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    apronOutline: southeastParcelApronOutline,
    apronHeight: ALUN_ALUN_FRONTAGE_APRON_Y,
    flushTaperOutline: southeastParcelFlushTaperOutline,
    flushTaperHeight: ALUN_ALUN_ROAD_SURFACE_Y,
    forecourtHeight: ALUN_ALUN_ROAD_SURFACE_Y,
  }),
});

const definePedestrianRoute = (
  points,
  width,
  curbSide,
  frontageApronWidth = 0,
) => {
  const frozenPoints = freezePath(points);
  const firstBoundary = freezePath(
    offsetAlunAlunRoadPath(frozenPoints, width * 0.5),
  );
  const secondBoundary = freezePath(
    offsetAlunAlunRoadPath(frozenPoints, -width * 0.5),
  );
  const propertySide = -curbSide;
  const frontageBoundary = freezePath(
    offsetAlunAlunRoadPath(
      frozenPoints,
      propertySide * (width * 0.5 + frontageApronWidth),
    ),
  );
  const propertySideBoundary =
    propertySide > 0 ? firstBoundary : secondBoundary;
  return Object.freeze({
    points: frozenPoints,
    width,
    curbSide,
    frontageApronWidth,
    sidewalkOutline: freezePath([
      ...firstBoundary,
      ...[...secondBoundary].reverse(),
    ]),
    frontageApronOutline:
      frontageApronWidth > 0
        ? freezePath([
            ...propertySideBoundary,
            ...[...frontageBoundary].reverse(),
          ])
        : null,
  });
};

export const ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS = Object.freeze({
  southEast: definePedestrianRoute(
    ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkCenterline,
    ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkWidth,
    -1,
  ),
  northWest: definePedestrianRoute([
    // Start after the curb return. Extending this ribbon into the open
    // intersection put pedestrians inside both the northbound and eastbound
    // swept vehicle envelopes.
    [25.47607774354852, 12.166180111343137],
    [26.1, 12.324929167046466],
    [27.18, 12.6],
    [27.52, 12.75],
    [29.43, 13.04],
    [32.48, 13.85],
  ], 0.3, 1, 0.5),
  northEast: definePedestrianRoute([
    // The footway begins at the curb return instead of projecting into the
    // open circulation area. Street View shows pedestrians joining the north
    // arm here, outside the swept turning envelope.
    [25.4, 14.76],
    [26.1, 14.84],
    [26.9, 14.92],
    [27.5, 14.98],
    // Hold the line until clear of the eastern frontage, then turn behind its
    // north-west corner; a diagonal shortcut here clipped the shop collider.
    [27.92, 15.0],
    [28.1, 15.2],
    [28.89, 15.55],
    [31.92, 16.4],
  ], 0.28, -1, 0.46),
});

// These four ribbons are the rendered OSM-aligned arms immediately around the
// compact junction. Exporting the shared definitions lets offline swept-turn
// validation inspect the same road triangles instead of approximating the
// visible surface from the straight ambient-traffic routes.
export const ALUN_ALUN_SOUTHEAST_ROAD_RIBBON_DEFINITIONS = Object.freeze([
  Object.freeze({
    label: "north-arm junction road",
    width: 1.7,
    points: freezePath([
      [23.58, 12.86],
      [29.16, 14.28],
      [32.2, 15.1],
    ]),
  }),
  Object.freeze({
    label: "east outbound carriageway",
    width: ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH,
    points: freezePath([
      [23.4, 13.92],
      [24.42, 18.7],
      [26.06, 25.88],
      [26.74, 28.12],
      [27.12, 29.38],
    ]),
  }),
  Object.freeze({
    label: "east opposing carriageway",
    width: ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH,
    points: freezePath([
      [21.12, 14.68],
      [22.6, 19.22],
      [24.98, 27.88],
      [26.28, 32.02],
    ]),
  }),
  Object.freeze({
    label: "Hasanudin diagonal carriageway",
    width: ALUN_ALUN_WEST_SPLIT_CARRIAGEWAY_CORE_WIDTH,
    points: freezePath([
      [17.14, 13.2],
      [17.44, 14.86],
      [21.6, 29.66],
    ]),
    // Render the same clipped core-plus-shoulder envelope that navigation
    // uses. The former narrower polygon silently left a walkable raw-ground
    // strip along this frontage because the explicit-surface branch bypasses
    // addExistingRoadPath()'s automatic shoulder expansion.
    surfaceOutline: southeastHasanudinApproachSurfaceOutline,
  }),
]);

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
  ], 9),
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
    addAlunAlunTyreShop,
    addAlunAlunVendorCart,
    addAlunAlunWestRoadsideContext,
  },
}) {
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
  // meshes below. Each direction takes the left-hand lane around the monument
  // island instead of travelling through it.
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
    const junctionDefinition = ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION;
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
    const westGreenEdge = hideMaterialOutline(
      toonMaterial({ color: 0x45a578 }),
    );
    const gutterMaterial = hideMaterialOutline(
      toonMaterial({ color: 0x555850 }),
    );
    const junctionForecourtMaterial = hideMaterialOutline(
      toonMaterial({ color: 0x666a65 }),
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
    // The canvas contains a 2x2 checker. Five repeats across the former
    // 0.8-world UV span make each square roughly 0.08 world / 40 cm, matching
    // the Street View paving instead of the previous two-metre blocks.
    pedestrianTexture.repeat.set(5, 5);
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
    const pedestrianPaleConcrete = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        color: 0xd0c8b8,
        side: THREE.DoubleSide,
      }),
    );
    const planetBanTileCanvas = document.createElement("canvas");
    planetBanTileCanvas.width = 64;
    planetBanTileCanvas.height = 64;
    const planetBanTileDrawing = planetBanTileCanvas.getContext("2d");
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        planetBanTileDrawing.fillStyle =
          (row + column) % 2 === 0 ? "#bd7867" : "#b66f60";
        planetBanTileDrawing.fillRect(column * 16, row * 16, 16, 16);
        planetBanTileDrawing.strokeStyle = "rgba(91,57,51,.32)";
        planetBanTileDrawing.lineWidth = 1;
        planetBanTileDrawing.strokeRect(column * 16, row * 16, 16, 16);
      }
    }
    const planetBanTileTexture = new THREE.CanvasTexture(planetBanTileCanvas);
    planetBanTileTexture.colorSpace = THREE.SRGBColorSpace;
    planetBanTileTexture.wrapS = THREE.RepeatWrapping;
    planetBanTileTexture.wrapT = THREE.RepeatWrapping;
    // ShapeGeometry UVs are in local world coordinates. Four cells over a
    // 0.32-world repeat make each forecourt paver about 40 cm square.
    planetBanTileTexture.repeat.set(3.125, 3.125);
    planetBanTileTexture.minFilter = THREE.LinearMipmapLinearFilter;
    planetBanTileTexture.magFilter = THREE.NearestFilter;
    const planetBanRedTile = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        map: planetBanTileTexture,
        color: 0xffffff,
        side: THREE.DoubleSide,
      }),
    );
    const pos90TanPaver = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        color: 0xc8c0ae,
        side: THREE.DoubleSide,
      }),
    );
    const medianSoil = hideMaterialOutline(
      toonMaterial({ color: 0x514a3b }),
    );
    const medianDark = toonMaterial({ color: 0x292d2c });
    const medianBlue = toonMaterial({ color: 0x3978a9 });
    const medianWhite = toonMaterial({ color: 0xe7e6dc });
    // Ahmad Yani's public footway has the same clearly legible, weathered
    // blue-white curb visible in Street View.
    const sidewalkCurbBlue = toonMaterial({ color: 0x4d82a5 });
    const sidewalkCurbWhite = toonMaterial({ color: 0xe1ddd0 });
    const flatSurfaceMaterials = new Set([
      asphaltSurface,
      gutterMaterial,
      junctionForecourtMaterial,
      roadWhite,
      roadYellow,
      westGreenEdge,
      pedestrianStone,
      pedestrianConcrete,
      pedestrianPaleConcrete,
      planetBanRedTile,
      pos90TanPaver,
      medianSoil,
    ]);
    const postGrey = toonMaterial({ color: 0x596360 });
    const wireMaterial = toonMaterial({ color: 0x252c2d });
    const blue = toonMaterial({ color: 0x246aa0 });

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
    const addRoadSurface = (
      points,
      y = ROAD_SURFACE_Y,
      material = asphaltSurface,
    ) => {
      const surface = new THREE.Mesh(
        createRoadSurfaceGeometry(points),
        material,
      );
      surface.position.y = y;
      surface.receiveShadow = true;
      context.add(surface);
      return surface;
    };
    const addPavedApron = (
      points,
      y = 0.063,
      material = gutterMaterial,
    ) => {
      const surface = new THREE.Mesh(
        createRoadSurfaceGeometry(points),
        material,
      );
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
    const addDashedRoadPathMark = (
      points,
      material,
      thickness = 0.026,
      dashLength = 0.42,
      gapLength = 0.34,
    ) => {
      let phaseDistance = 0;
      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        const deltaNorth = end[0] - start[0];
        const deltaEast = end[1] - start[1];
        const segmentLength = Math.hypot(deltaNorth, deltaEast);
        if (segmentLength <= 1e-9) continue;
        const patternLength = dashLength + gapLength;
        let distance = -phaseDistance;
        while (distance < segmentLength) {
          const dashStart = Math.max(0, distance);
          const dashEnd = Math.min(segmentLength, distance + dashLength);
          if (dashEnd > dashStart + 1e-6) {
            const startAmount = dashStart / segmentLength;
            const endAmount = dashEnd / segmentLength;
            addRoadMark(
              THREE.MathUtils.lerp(start[0], end[0], startAmount),
              THREE.MathUtils.lerp(start[1], end[1], startAmount),
              THREE.MathUtils.lerp(start[0], end[0], endAmount),
              THREE.MathUtils.lerp(start[1], end[1], endAmount),
              material,
              thickness,
            );
          }
          distance += patternLength;
        }
        phaseDistance = (phaseDistance + segmentLength) % patternLength;
      }
    };
    const addSegmentedCurbAlongPath = (
      points,
      materials,
      {
        lowered = () => false,
        loweredMaterial = null,
        skip = () => false,
        name = "",
        depth = 0.075,
        normalHeight = 0.065,
        normalCenterY = 0.082,
      } = {},
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
          const isLowered = lowered(north, east);
          const curbHeight = isLowered
            ? ALUN_ALUN_FRONTAGE_SIDEWALK_Y - ROAD_SURFACE_Y
            : normalHeight;
          const curbCenterY = isLowered
            ? ROAD_SURFACE_Y + curbHeight * 0.5
            : normalCenterY;
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(
              length / segmentCount + 0.01,
              curbHeight,
              depth,
            ),
            isLowered && loweredMaterial
              ? loweredMaterial
              : materials[curbIndex % materials.length],
          );
          curb.position.set(north, curbCenterY, east);
          curb.rotation.y = -Math.atan2(deltaEast, deltaNorth);
          if (name) curb.name = `${name} ${curbIndex + 1}`;
          context.add(curb);
          curbIndex += 1;
        }
      }
    };
    // Local dimensions are world units (five metres each), while the surveyed
    // road widths are metres. The old 8.8-unit value made every approach about
    // 44 metres wide and buried the Alun-Alun pedestrian apron. These widths
    // follow the OSM centre lines and the proportions visible in Street View.
    // The shared Ahmad Yani approach remains 11 metres wide, while each split
    // carriageway remains 6.6 metres. The shared surface is rendered by the
    // clipped union below, so its wide endpoint can never sit beneath the park.
    const MAIN_SHARED_ROAD_WIDTH = ALUN_ALUN_WEST_SHARED_ROAD_CORE_WIDTH;
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
      const ribbon = addRoadRibbon(points, width, ROAD_SURFACE_Y);
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
      return ribbon;
    };

    // Mask the generic map-road geometry locally, then redraw the surveyed OSM
    // paths. Street View shows plain asphalt here, without invented edge lines.
    const renderedRoadRibbonDefinitions = [
      {
        label: "west perimeter local road",
        width: ALUN_ALUN_PERIMETER_LOCAL_ROAD_CORE_WIDTH,
        points: ALUN_ALUN_WEST_LOCAL_ROAD_PATH,
      },
      ...ALUN_ALUN_SOUTHEAST_ROAD_RIBBON_DEFINITIONS,
    ];
    renderedRoadRibbonDefinitions.forEach(
      ({ label, points, width, surfaceOutline }) => {
        const ribbon = surfaceOutline
          ? addRoadSurface(surfaceOutline, ROAD_SURFACE_Y)
          : addExistingRoadPath(points, {
              width,
              centerLine: false,
              edgeLines: false,
            });
        ribbon.name = `Surveyed ${label} asphalt ribbon`;
      },
    );
    const westernAsphaltUnion = addRoadSurface(
      ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,
    );
    westernAsphaltUnion.name =
      "Full-width Jalan Jenderal Achmad Yani western asphalt union";
    const southLocalRoadSurface = addRoadSurface(
      ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE,
    );
    southLocalRoadSurface.name =
      "Clipped full-width Jalan Kartini local-road asphalt";
    const southApproachSurface = addRoadSurface(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.surfaceOutline,
    );
    southApproachSurface.name = "South approach unified asphalt surface";
    ALUN_ALUN_SOUTH_APPROACH_DEFINITION.terminalHardstandOutlines.forEach(
      (outline, index) => {
        const hardstand = addRoadSurface(
          outline,
          ALUN_ALUN_SOUTH_APPROACH_DEFINITION.terminalHardstandHeight,
        );
        hardstand.name =
          `Flush south-approach road-edge hardstand ${index + 1}`;
      },
    );
    const junctionAsphalt = addRoadSurface(
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.junctionAsphaltOutline,
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.asphaltInfillY,
    );
    junctionAsphalt.name = "Open Ahmad Jafar junction asphalt infill";
    const openFrontageAsphalt = addRoadSurface(
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.openFrontageAsphaltOutline,
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.asphaltInfillY,
    );
    openFrontageAsphalt.name =
      "Open Ahmad Jafar rounded-corner asphalt hardstand";
    const roundedCornerAsphalt = addRoadSurface(
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southeast
        .asphaltOutline,
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.asphaltInfillY,
    );
    roundedCornerAsphalt.name =
      "Rounded Ahmad Jafar south-east corner asphalt";
    const roundedCornerShoulder = addRoadSurface(
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southeast
        .shoulderOutline,
      ROAD_MARK_Y - 0.0005,
      westGreenEdge,
    );
    roundedCornerShoulder.name =
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southeast
        .renderName;
    const eastApproachAsphalt = addRoadSurface(
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.eastAsphaltInfillOutline,
      ALUN_ALUN_SOUTHEAST_JUNCTION_DEFINITION.asphaltInfillY,
    );
    eastApproachAsphalt.name = "Undivided Ahmad Yani east asphalt infill";
    const perimeterAsphaltFill = addRoadSurface(
      ALUN_ALUN_WEST_SOUTH_PARK_ASPHALT_FILL_OUTLINE,
    );
    perimeterAsphaltFill.name =
      "West-south park curb-aligned asphalt fill";
    const westPropertyAsphaltInfill = addRoadSurface(
      ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE,
    );
    westPropertyAsphaltInfill.name =
      "KH Wahid Hasyim full-width property-side asphalt infill";
    ALUN_ALUN_WEST_GREEN_EDGE_OUTLINES.forEach((outline, index) => {
      const greenEdge = addRoadSurface(
        outline,
        ROAD_MARK_Y - 0.0005,
        westGreenEdge,
      );
      greenEdge.name = `West park green edge marking ${index + 1}`;
    });
    ALUN_ALUN_WEST_GREEN_EDGE_WHITE_LINES.forEach((line) =>
      addRoadPathMark(line, roadWhite, 0.028),
    );
    // Reintroduce only the pedestrian strips that really border the junction.
    // The asphalt union above intentionally masks the generic OSM sidewalk
    // wedges, so these surveyed ribbons keep a continuous walkable-looking
    // route without spilling pale paving back across the vehicle lanes.
    // Street View shows paving from the curb-side footway all the way to the
    // adjoining walls and storefronts. The generic map surface left broad
    // grass wedges behind the narrower route ribbons.
    addRoadsideBand(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkOuterBoundary,
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.frontageOuterBoundary,
      ALUN_ALUN_FRONTAGE_APRON_Y,
      pedestrianConcrete,
    ).name = "South-east property frontage apron";
    addRoadsideBand(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.clearTreadInner,
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.sidewalkOuterBoundary,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianStone,
    ).name = "South-east red-cream 1.5-metre clear sidewalk";
    addSegmentedCurbAlongPath(
      ALUN_ALUN_SOUTH_APPROACH_DEFINITION.curbCenterline,
      [sidewalkCurbBlue, sidewalkCurbWhite],
      {
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    // The north arm is pinched by the beige row on its west side and the
    // eastern frontage on its east side. Parallel offsets cut through both
    // real building bodies, so each footway bends through the measured gap
    // between facade and road.
    [
      ["North-arm west pedestrian path", "northWest"],
      ["North-arm east pedestrian path", "northEast"],
    ].forEach(([name, routeName]) => {
      const { points, curbSide, width } =
        ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS[routeName];
      const route = ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS[routeName];
      const apron = addPavedApron(
        route.frontageApronOutline,
        ALUN_ALUN_FRONTAGE_APRON_Y,
        pedestrianConcrete,
      );
      apron.name = `${name} frontage apron`;
      const path = addPavedApron(
        route.sidewalkOutline,
        ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
        pedestrianConcrete,
      );
      path.name = name;
      addSegmentedCurbAlongPath(
        offsetRoadPoints(points, curbSide * width * 0.5),
        routeName === "northWest"
          ? [medianDark, roadYellow]
          : [medianDark, medianWhite],
        {
          depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
          normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
          normalCenterY:
            ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
        },
      );
    });
    [
      ["northwest", "northWest", [medianDark, medianWhite]],
      ["northeast", "northEast", [medianDark, medianWhite]],
    ].forEach(([returnName, routeName, curbMaterials]) => {
      const cornerReturn = junctionDefinition.cornerReturns[returnName];
      const sidewalk = addPavedApron(
        cornerReturn.sidewalkOutline,
        ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
        pedestrianConcrete,
      );
      sidewalk.name = cornerReturn.renderName;
      addSegmentedCurbAlongPath(cornerReturn.path, curbMaterials, {
        name: cornerReturn.renderName,
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      });
    });
    addPavedApron(
      junctionDefinition.dwiPutriFrontageConnector.outline,
      junctionDefinition.dwiPutriFrontageConnector.height,
      pedestrianConcrete,
    ).name = "DWI PUTRI rounded flush storefront connector";

    const parcel = junctionDefinition.parcel;
    junctionDefinition.hasanudinFrontageThresholds.forEach((threshold) => {
      addPavedApron(
        threshold.outline,
        threshold.height,
        junctionForecourtMaterial,
      ).name = threshold.label;
    });
    addPavedApron(
      junctionDefinition.showroom.forecourtOutline,
      junctionDefinition.showroom.forecourtHeight,
      junctionForecourtMaterial,
    ).name = "SEWA Billboard facade apron";
    addPavedApron(
      junctionDefinition.showroom.sidewalkOutline,
      junctionDefinition.showroom.sidewalkHeight,
      pedestrianConcrete,
    ).name = "SEWA Billboard roadside sidewalk";
    addSegmentedCurbAlongPath(
      junctionDefinition.showroom.curbCenterline,
      [medianDark, medianWhite],
      {
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    addRoadSurface(
      parcel.noseHardstandOutline,
      parcel.noseHardstandHeight,
      asphaltSurface,
    ).name = "Ahmad Jafar flush rounded-corner throat hardstand";
    addRoadSurface(
      parcel.landOutline,
      parcel.forecourtHeight,
      asphaltSurface,
    ).name = "Ahmad Jafar frontage asphalt backing";
    addRoadSurface(
      parcel.flushTaperOutline,
      parcel.flushTaperHeight,
      asphaltSurface,
    ).name = "Ahmad Jafar flush east-side sidewalk recovery";
    addPavedApron(
      parcel.apronOutline,
      parcel.apronHeight,
      gutterMaterial,
    ).name = "Ahmad Jafar parcel frontage apron";
    addPavedApron(
      parcel.sidewalkOutline,
      parcel.sidewalkHeight,
      pedestrianConcrete,
    ).name = "Hasanudin tapered parcel sidewalk";
    addSegmentedCurbAlongPath(
      parcel.curbCenterline,
      [medianDark, medianWhite],
      {
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    // May 2025 imagery shows one worn pale centre guide on the approach, not
    // the saturated double-yellow stripe that cut diagonally across the view.
    addRoadPathMark(
      ALUN_ALUN_WEST_SHARED_ROAD_PATH,
      roadWhite,
      0.025,
    );
    const frontageApronMaterials = {
      concrete: pedestrianConcrete,
      paleConcrete: pedestrianPaleConcrete,
      redTile: planetBanRedTile,
      tanPaver: pos90TanPaver,
    };
    ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.propertyAprons.forEach(
      (definition) => {
        const apron = addPavedApron(
          definition.outline,
          definition.height,
          frontageApronMaterials[definition.material],
        );
        apron.name = definition.label;
      },
    );
    addPavedApron(
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionApronOutline,
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionApronHeight,
      pedestrianPaleConcrete,
    ).name = "Jalan Kartini to south-approach frontage taper";
    ALUN_ALUN_WEST_FRONTAGE_DEFINITION.propertyAprons.forEach((definition) => {
      const apron = addPavedApron(
        definition.outline,
        definition.height,
        frontageApronMaterials[definition.material],
      );
      apron.name = definition.label;
    });
    const branchFrontageSidewalk = addRoadsideBand(
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.branchRoadsideSeam,
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.branchSidewalkOuterBoundary,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianConcrete,
    );
    branchFrontageSidewalk.name =
      "Pegadaian weathered one-metre sidewalk";
    const ahmadYaniFrontageSidewalk = addRoadsideBand(
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniRoadsideSeam,
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniSidewalkOuterBoundary,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianStone,
    );
    ahmadYaniFrontageSidewalk.name =
      "Ahmad Yani red-cream one-metre clear sidewalk";
    const oppositePegadaianSidewalk = addRoadsideBand(
      ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION.oppositeSidewalkInnerBoundary,
      ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION.oppositeSidewalkOuterBoundary,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianConcrete,
    );
    oppositePegadaianSidewalk.name =
      "Pegadaian opposite one-metre sidewalk";
    const westPropertySidewalk = addRoadsideBand(
      ALUN_ALUN_WEST_PROPERTY_CLEAR_TREAD_INNER,
      ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianStone,
    );
    westPropertySidewalk.name =
      "KH Wahid Hasyim red-cream 1.5-metre clear sidewalk";
    const southPropertySidewalk = addRoadsideBand(
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.clearTreadInner,
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.sidewalkOuterBoundary,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianStone,
    );
    southPropertySidewalk.name =
      "Jalan Kartini red-cream 1.5-metre clear sidewalk";
    const southPropertyTransitionSidewalk = addRoadsideBand(
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionClearTreadInner,
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionSidewalkOuterBoundary,
      ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
      pedestrianStone,
    );
    southPropertyTransitionSidewalk.name =
      "Jalan Kartini sidewalk east transition";
    const curbIsLowered = (_north, east) =>
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.loweredCurbEastSpans.some(
        ([start, end]) => east >= start && east <= end,
      );
    addSegmentedCurbAlongPath(
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniCurbCenterline,
      [sidewalkCurbBlue, sidewalkCurbWhite],
      {
        lowered: curbIsLowered,
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    addSegmentedCurbAlongPath(
      ALUN_ALUN_WEST_FRONTAGE_DEFINITION.branchCurbCenterline,
      [sidewalkCurbWhite],
      {
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    addSegmentedCurbAlongPath(
      ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION.oppositeCurbCenterline,
      [sidewalkCurbWhite],
      {
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    addSegmentedCurbAlongPath(
      ALUN_ALUN_WEST_PROPERTY_CURB_CENTERLINE,
      [sidewalkCurbBlue, sidewalkCurbWhite],
      {
        depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
        normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
        normalCenterY:
          ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
      },
    );
    [
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.curbCenterline,
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.transitionCurbCenterline,
    ].forEach((curbPath) =>
      addSegmentedCurbAlongPath(
        curbPath,
        [sidewalkCurbBlue, sidewalkCurbWhite],
        {
          depth: ALUN_ALUN_FRONTAGE_CURB_DEPTH,
          normalHeight: ALUN_ALUN_FRONTAGE_CURB_HEIGHT,
          normalCenterY:
            ROAD_SURFACE_Y + ALUN_ALUN_FRONTAGE_CURB_HEIGHT * 0.5,
        },
      ),
    );

    // Street View's western corridor is visually enclosed by a property-side
    // PLN bundle and slim park lamps. Every base below is either behind the
    // public sidewalk or inside the park curb; none occupies asphalt or the
    // 1.50-metre clear tread.
    const westUtilityFrames = ALUN_ALUN_WEST_UTILITY_SUPPORTS.map(
      (center, index, supports) => {
        const previous = supports[Math.max(0, index - 1)];
        const next = supports[Math.min(supports.length - 1, index + 1)];
        const deltaNorth = next[0] - previous[0];
        const deltaEast = next[1] - previous[1];
        const length = Math.hypot(deltaNorth, deltaEast) || 1;
        return {
          center,
          normal: [-deltaEast / length, deltaNorth / length],
        };
      },
    );
    westUtilityFrames.forEach(({ center, normal }, index) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 2.15, 8),
        postGrey,
      );
      pole.name = `KH Wahid Hasyim PLN pole ${index + 1}`;
      pole.position.set(center[0], 1.12, center[1]);
      context.add(pole);

      const crossArm = new THREE.Mesh(
        roundedBox(0.52, 0.045, 0.045, 0.012),
        postGrey,
      );
      crossArm.position.set(center[0], 2.03, center[1]);
      crossArm.rotation.y = -Math.atan2(normal[1], normal[0]);
      context.add(crossArm);
      [-0.18, -0.09, 0, 0.09, 0.18].forEach((offset) => {
        const insulator = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.024, 0.1, 7),
          asphaltTrim,
        );
        insulator.position.set(
          center[0] + normal[0] * offset,
          2.1,
          center[1] + normal[1] * offset,
        );
        context.add(insulator);
      });
    });
    [-0.18, -0.09, 0, 0.09, 0.18].forEach(
      (lateralOffset, conductorIndex) => {
        westUtilityFrames.slice(0, -1).forEach((start, index) => {
          const end = westUtilityFrames[index + 1];
          const endpoint = (frame) =>
            new THREE.Vector3(
              frame.center[0] + frame.normal[0] * lateralOffset,
              2.1,
              frame.center[1] + frame.normal[1] * lateralOffset,
            );
          const startPoint = endpoint(start);
          const endPoint = endpoint(end);
          const midpoint = new THREE.Vector3(
            (startPoint.x + endPoint.x) * 0.5,
            Math.min(startPoint.y, endPoint.y) - 0.18,
            (startPoint.z + endPoint.z) * 0.5,
          );
          const wire = new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.QuadraticBezierCurve3(
                startPoint,
                midpoint,
                endPoint,
              ),
              24,
              0.0045,
              5,
              false,
            ),
            wireMaterial,
          );
          wire.name =
            `KH Wahid Hasyim conductor ${conductorIndex + 1}, span ${index + 1}`;
          context.add(wire);
        });
      },
    );

    const westParkEdgeDelta = [
      ALUN_ALUN_PARK_OUTLINE[1][0] - ALUN_ALUN_PARK_OUTLINE[0][0],
      ALUN_ALUN_PARK_OUTLINE[1][1] - ALUN_ALUN_PARK_OUTLINE[0][1],
    ];
    const westParkEdgeLength = Math.hypot(...westParkEdgeDelta);
    const westParkRoadNormal = [
      -westParkEdgeDelta[1] / westParkEdgeLength,
      westParkEdgeDelta[0] / westParkEdgeLength,
    ];
    ALUN_ALUN_WEST_PARK_LAMP_CENTERS.forEach((center, index) => {
      const lampCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(center[0], 0.06, center[1]),
        new THREE.Vector3(center[0], 1.2, center[1]),
        new THREE.Vector3(
          center[0] + westParkRoadNormal[0] * 0.08,
          1.9,
          center[1] + westParkRoadNormal[1] * 0.08,
        ),
        new THREE.Vector3(
          center[0] + westParkRoadNormal[0] * 0.38,
          2.18,
          center[1] + westParkRoadNormal[1] * 0.38,
        ),
      ]);
      const lampPole = new THREE.Mesh(
        new THREE.TubeGeometry(lampCurve, 24, 0.035, 7, false),
        postGrey,
      );
      lampPole.name = `West park curved street lamp ${index + 1}`;
      context.add(lampPole);
      const lampHead = new THREE.Mesh(
        roundedBox(0.32, 0.065, 0.12, 0.022),
        asphaltTrim,
      );
      lampHead.position.set(
        center[0] + westParkRoadNormal[0] * 0.43,
        2.16,
        center[1] + westParkRoadNormal[1] * 0.43,
      );
      lampHead.rotation.y =
        -Math.atan2(westParkRoadNormal[1], westParkRoadNormal[0]);
      context.add(lampHead);
    });

    const parkBenchMaterial = toonMaterial({ color: 0x8b7358 });
    const addParkBench = (north, east, yaw, name) => {
      const bench = new THREE.Group();
      bench.name = name;
      bench.position.set(north, 0.075, east);
      bench.rotation.y = yaw;
      const seat = new THREE.Mesh(
        roundedBox(0.72, 0.07, 0.24, 0.018),
        parkBenchMaterial,
      );
      seat.position.y = 0.24;
      bench.add(seat);
      const back = new THREE.Mesh(
        roundedBox(0.72, 0.28, 0.055, 0.018),
        parkBenchMaterial,
      );
      back.position.set(0, 0.4, 0.1);
      bench.add(back);
      [-0.25, 0.25].forEach((offset) => {
        const leg = new THREE.Mesh(
          roundedBox(0.055, 0.24, 0.055, 0.012),
          postGrey,
        );
        leg.position.set(offset, 0.12, 0);
        bench.add(leg);
      });
      mergeDirectMeshesByMaterial(bench);
      context.add(bench);
    };
    const westBenchYaw =
      -Math.atan2(westParkEdgeDelta[1], westParkEdgeDelta[0]) + Math.PI;
    [
      [6.35, -15.46],
      [-4.15, -13.28],
      [-10.45, -11.97],
    ].forEach(([north, east], index) =>
      addParkBench(
        north,
        east,
        westBenchYaw,
        `West park outward-facing bench ${index + 1}`,
      ),
    );
    ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS.forEach(
      ({ center: [north, east], yaw }, index) =>
        addParkBench(
          north,
          east,
          yaw,
          `South park south-facing bench ${index + 1}`,
        ),
    );
    // Exact ribbons replace the former straight asphalt boxes. The park's
    // checker apron remains the highest layer and therefore wraps the corner
    // continuously, as it does in Street View.
    // Follow the real split between OSM carriageways #110 and #111.  A
    // variable-width ribbon makes the western nose merge naturally where the
    // two carriageways meet, then widens toward the open junction.
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
            curbIndex % 2 === 0 ? medianDark : roadYellow,
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
      medianDark,
    );
    medianEndCap.position.set(medianEndPoint[0], 0.086, medianEndPoint[1]);
    medianEndCap.rotation.y = -Math.atan2(
      medianEndDeltaNorth,
      -medianEndDeltaEast,
    );
    context.add(medianEndCap);
    [
      [19.18, 2.8],
      [20.35, 7.0],
    ].forEach(([north, east], index) => {
      const planter = addAlunAlunMedianPlanter(context, north, east, index * 0.72);
      planter.scale.setScalar(0.72);
    });

    // The real junction has no zebra, refuge, south splitter or painted stop
    // bars. Keep only its restrained white guides and turquoise roadside sweep.
    addRoadPathMark(junctionDefinition.southGuidePath, roadWhite, 0.028);
    addDashedRoadPathMark(
      junctionDefinition.eastGuidePath,
      roadWhite,
      0.026,
      0.42,
      0.34,
    );
    addRoadPathMark(junctionDefinition.greenEdgePath, westGreenEdge, 0.17);
    addRoadPathMark(
      offsetRoadPoints(junctionDefinition.greenEdgePath, -0.085),
      roadWhite,
      0.025,
    );

    const island = junctionDefinition.monumentIsland;
    const [islandNorth, islandEast] = island.center;
    const junctionCurb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, island.curbHeight, 28),
      medianDark,
    );
    junctionCurb.name = "Ahmad Jafar monument island base";
    junctionCurb.position.set(
      islandNorth,
      ROAD_SURFACE_Y + island.curbHeight * 0.5,
      islandEast,
    );
    junctionCurb.scale.set(island.width, 1, island.depth);
    context.add(junctionCurb);
    const islandHalfWidth = island.width * 0.5;
    const islandHalfDepth = island.depth * 0.5;
    for (let index = 0; index < island.curbBlocks.count; index += 1) {
      const angle = (index / island.curbBlocks.count) * Math.PI * 2;
      const curbBlock = new THREE.Mesh(
        roundedBox(
          island.curbBlocks.width,
          island.curbHeight + 0.008,
          island.curbBlocks.depth,
          0.012,
        ),
        index % 2 === 0 ? medianDark : roadYellow,
      );
      curbBlock.position.set(
        islandNorth + Math.cos(angle) * islandHalfWidth,
        ROAD_SURFACE_Y + island.curbHeight * 0.58,
        islandEast + Math.sin(angle) * islandHalfDepth,
      );
      // Follow the derivative of the ellipse rather than a circular tangent;
      // otherwise the long curb blocks turn into a starburst near the ends.
      const tangentNorth = -islandHalfWidth * Math.sin(angle);
      const tangentEast = islandHalfDepth * Math.cos(angle);
      curbBlock.rotation.y = -Math.atan2(tangentEast, tangentNorth);
      context.add(curbBlock);
    }
    const islandSoilHeight = 0.025;
    const islandSoil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, islandSoilHeight, 28),
      medianSoil,
    );
    islandSoil.position.set(
      islandNorth,
      ROAD_SURFACE_Y + island.curbHeight + islandSoilHeight * 0.5,
      islandEast,
    );
    islandSoil.scale.set(island.width * 0.82, 1, island.depth * 0.74);
    context.add(islandSoil);
    const monumentHedge = toonMaterial({ color: 0x416947 });
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const shrub = new THREE.Mesh(
        new THREE.SphereGeometry(0.075 + (index % 3) * 0.006, 9, 6),
        monumentHedge,
      );
      shrub.position.set(
        islandNorth + Math.cos(angle) * islandHalfWidth * 0.7,
        ROAD_SURFACE_Y + island.curbHeight + 0.075 + (index % 2) * 0.006,
        islandEast + Math.sin(angle) * islandHalfDepth * 0.6,
      );
      shrub.scale.y = 0.58;
      context.add(shrub);
    }

    const monument = new THREE.Group();
    monument.name = "Tugu simpang Jalan Ahmad Jafar";
    monument.position.set(
      islandNorth,
      ROAD_SURFACE_Y + island.curbHeight,
      islandEast,
    );
    const monumentGreen = toonMaterial({ color: 0x315d49 });
    const monumentPale = toonMaterial({ color: 0xcfd2bf });
    const monumentGold = toonMaterial({
      color: 0xc79a3c,
      emissive: 0x6f4a11,
      emissiveIntensity: 0.08,
    });
    const monumentFoundation = new THREE.Mesh(
      roundedBox(0.42, 0.09, 0.3, 0.025),
      monumentGreen,
    );
    monumentFoundation.position.y = 0.055;
    monument.add(monumentFoundation);
    const monumentCore = new THREE.Mesh(
      roundedBox(0.2, 0.43, 0.16, 0.018),
      monumentGreen,
    );
    monumentCore.position.y = 0.33;
    monument.add(monumentCore);
    [-0.13, 0.13].forEach((northOffset) => {
      [-0.105, 0.105].forEach((eastOffset) => {
        const column = new THREE.Mesh(
          roundedBox(0.105, 0.46, 0.105, 0.014),
          monumentPale,
        );
        column.position.set(northOffset, 0.34, eastOffset);
        column.rotation.x = -Math.sign(eastOffset) * 0.075;
        monument.add(column);

        const greenInset = new THREE.Mesh(
          roundedBox(0.025, 0.34, 0.052, 0.008),
          monumentGreen,
        );
        greenInset.position.set(northOffset - 0.061, 0.34, eastOffset);
        greenInset.rotation.x = column.rotation.x;
        monument.add(greenInset);
      });
    });
    const cornice = new THREE.Mesh(
      roundedBox(0.46, 0.07, 0.32, 0.02),
      monumentPale,
    );
    cornice.position.y = 0.61;
    monument.add(cornice);
    const cap = new THREE.Mesh(
      roundedBox(0.54, 0.075, 0.4, 0.022),
      monumentGreen,
    );
    cap.position.y = 0.685;
    monument.add(cap);
    const crownStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.065, 0.12, 10),
      monumentGold,
    );
    crownStem.position.y = 0.79;
    monument.add(crownStem);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 10),
      monumentGold,
    );
    crown.position.y = 0.885;
    monument.add(crown);
    const crownBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.101, 0.014, 7, 20),
      monumentGreen,
    );
    crownBand.position.y = 0.885;
    crownBand.rotation.x = Math.PI * 0.5;
    monument.add(crownBand);
    const crownMeridian = new THREE.Mesh(
      new THREE.TorusGeometry(0.101, 0.01, 7, 20),
      monumentGreen,
    );
    crownMeridian.position.y = 0.885;
    crownMeridian.rotation.y = Math.PI * 0.5;
    monument.add(crownMeridian);
    const finial = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.06, 8),
      monumentGold,
    );
    finial.position.y = 1.02;
    monument.add(finial);
    monument.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    monument.scale.setScalar(island.modelScale);
    context.add(monument);

    junctionDefinition.barrierSupports.forEach(({ center, yaw }) => {
      const barrier = addAlunAlunRoadBarrier(
        context,
        center[0],
        center[1],
        yaw,
      );
      barrier.scale.multiplyScalar(junctionDefinition.barrierScale);
    });
    addAlunAlunIntersectionBoards(context);

    const utilityCorridor = ALUN_ALUN_WEST_UTILITY_CORRIDOR_DEFINITION;
    utilityCorridor.supports.forEach((support, index) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(
          utilityCorridor.poleTopRadius,
          utilityCorridor.poleBaseRadius,
          utilityCorridor.poleHeight,
          8,
        ),
        postGrey,
      );
      pole.name = `PLN frontage pole ${index + 1}`;
      pole.position.set(
        support.center[0],
        utilityCorridor.poleHeight * 0.5 + 0.005,
        support.center[1],
      );
      context.add(pole);
      const crossArm = new THREE.Mesh(
        roundedBox(
          utilityCorridor.crossArmLength,
          0.035,
          0.035,
          0.008,
        ),
        postGrey,
      );
      crossArm.name = `PLN frontage crossarm ${index + 1}`;
      crossArm.position.set(
        support.center[0],
        utilityCorridor.crossArmBaseHeight +
          index * utilityCorridor.supportHeightStep,
        support.center[1],
      );
      crossArm.rotation.y = support.crossArmYaw;
      context.add(crossArm);
      utilityCorridor.insulatorOffsets.forEach((lateralOffset) => {
        const insulator = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.032, 0.12, 7),
          asphaltTrim,
        );
        insulator.position.set(
          support.center[0] +
            support.propertyNormal[0] * lateralOffset,
          1.9 + index * 0.035,
          support.center[1] +
            support.propertyNormal[1] * lateralOffset,
        );
        context.add(insulator);
      });
    });
    const transformerSupport =
      utilityCorridor.supports[utilityCorridor.transformerSupportIndex];
    const transformerAssembly = new THREE.Group();
    transformerAssembly.name = "Planet Ban frontage transformer";
    transformerAssembly.position.set(
      transformerSupport.center[0],
      0.05,
      transformerSupport.center[1],
    );
    transformerAssembly.rotation.y = transformerSupport.crossArmYaw;
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

    // Street View only shows the western frontage lamp. The former east=4.8
    // duplicate occupied this same corridor and read as another road pole.
    [-11.8].forEach((east) => {
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

    utilityCorridor.conductors.forEach((conductor, conductorIndex) => {
      utilityCorridor.supports.slice(0, -1).forEach((start, supportIndex) => {
        const end = utilityCorridor.supports[supportIndex + 1];
        const endpoint = (support) =>
          new THREE.Vector3(
            support.center[0] +
              support.propertyNormal[0] * conductor.lateralOffset,
            conductor.height,
            support.center[1] +
              support.propertyNormal[1] * conductor.lateralOffset,
          );
        const startPoint = endpoint(start);
        const endPoint = endpoint(end);
        const midpoint = new THREE.Vector3(
          (startPoint.x + endPoint.x) * 0.5,
          // A quadratic curve only gives its control point half weight at
          // t=0.5. Lower it by twice the requested value so the rendered wire
          // reaches the declared physical midpoint sag.
          conductor.height - conductor.sag * 2,
          (startPoint.z + endPoint.z) * 0.5,
        );
        const wire = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.QuadraticBezierCurve3(
              startPoint,
              midpoint,
              endPoint,
            ),
            32,
            0.0035,
            5,
            false,
          ),
          wireMaterial,
        );
        wire.name =
          `PLN conductor ${conductorIndex + 1}, span ${supportIndex + 1}`;
        context.add(wire);
      });
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
    addAlunAlunTyreShop(context);
    addAlunAlunWestRoadsideContext(context);
    addAlunAlunEastJunctionFrontage(context);

    junctionDefinition.contextTrees.forEach((tree, index) =>
      addAlunAlunTree(
        context,
        tree.center[0],
        tree.center[1],
        tree.height,
        tree.spread,
        112 + index * 0.83,
        false,
        0.014,
        tree.trunkScale,
      ),
    );

    junctionDefinition.parkedVehicles.forEach((vehicle) => {
      const addParkedVehicle =
        vehicle.kind === "pickup"
          ? addAlunAlunParkedPickup
          : addAlunAlunParkedVehicle;
      addParkedVehicle(
        context,
        vehicle.center[0],
        vehicle.center[1],
        vehicle.color,
        vehicle.yaw,
        vehicle.scale,
      );
    });

    // Dense overhead distribution lines and the strong T-pole immediately
    // behind the monument are defining features of the May 2025 frame.
    const junctionUtilities = junctionDefinition.utilityCorridor;
    const junctionUtilityFrames = junctionUtilities.supports.map(
      (support) => ({
        ...support,
        axis: [Math.cos(support.yaw), -Math.sin(support.yaw)],
      }),
    );
    junctionUtilityFrames.forEach((support, supportIndex) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(
          junctionUtilities.poleRadius * 0.72,
          junctionUtilities.poleRadius,
          junctionUtilities.poleHeight,
          8,
        ),
        postGrey,
      );
      pole.name = `Ahmad Jafar PLN pole ${supportIndex + 1}`;
      pole.position.set(
        support.center[0],
        junctionUtilities.poleHeight * 0.5,
        support.center[1],
      );
      context.add(pole);

      const crossArmCount = supportIndex === 1 ? 2 : 1;
      for (let armIndex = 0; armIndex < crossArmCount; armIndex += 1) {
        const crossArm = new THREE.Mesh(
          roundedBox(
            junctionUtilities.crossArmLength,
            0.035,
            0.035,
            0.008,
          ),
          postGrey,
        );
        crossArm.name =
          `Ahmad Jafar PLN pole ${supportIndex + 1} crossarm ${armIndex + 1}`;
        crossArm.position.set(
          support.center[0],
          junctionUtilities.poleHeight - 0.16 - armIndex * 0.14,
          support.center[1],
        );
        crossArm.rotation.y = support.yaw;
        context.add(crossArm);
      }

      junctionUtilities.conductorOffsets.forEach((offset) => {
        const insulator = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.019, 0.085, 7),
          asphaltTrim,
        );
        insulator.position.set(
          support.center[0] + support.axis[0] * offset,
          junctionUtilities.poleHeight - 0.095,
          support.center[1] + support.axis[1] * offset,
        );
        context.add(insulator);
      });
    });
    junctionUtilities.conductorOffsets.forEach((offset, conductorIndex) => {
      junctionUtilityFrames.slice(0, -1).forEach((start, spanIndex) => {
        const end = junctionUtilityFrames[spanIndex + 1];
        const endpoint = (frame) =>
          new THREE.Vector3(
            frame.center[0] + frame.axis[0] * offset,
            junctionUtilities.poleHeight - 0.09,
            frame.center[1] + frame.axis[1] * offset,
          );
        const startPoint = endpoint(start);
        const endPoint = endpoint(end);
        const midpoint = new THREE.Vector3(
          (startPoint.x + endPoint.x) * 0.5,
          junctionUtilities.poleHeight - 0.34,
          (startPoint.z + endPoint.z) * 0.5,
        );
        const wire = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.QuadraticBezierCurve3(
              startPoint,
              midpoint,
              endPoint,
            ),
            28,
            0.0028,
            5,
            false,
          ),
          wireMaterial,
        );
        wire.name =
          `Ahmad Jafar conductor ${conductorIndex + 1}, span ${spanIndex + 1}`;
        context.add(wire);
      });
    });

    const postFlag = addIndonesianFlag(context, 22.1, -2.45, 1.8);
    animatedStopDetails.push({ object: postFlag, type: "parkFlag", phase: 2.4 });

    addAlunAlunParkedPickup(context, 20.95, -5.55, 0xe7e4da, 0.08, 1.08);
    addAlunAlunParkedVehicle(context, 24.55, -8.1, 0xf0eee7, 0, 0.98);
    addAlunAlunParkedVehicle(context, 24.55, -10.15, 0xd7d6cf, 0, 0.94);
    // Sparse curbside parking is part of the real west-corridor street wall;
    // keep every vehicle half a world unit inside the new asphalt edge.
    addAlunAlunParkedVehicle(context, 6.4, -19.5769, 0x30393d, 1.77, 0.94);
    addAlunAlunParkedVehicle(context, 4.1, -16.82, 0x273238, 1.77, 0.92);
    addAlunAlunParkedVehicle(context, -3.2, -17.6409, 0x9d4d43, 1.77, 0.9);
    addAlunAlunParkedVehicle(context, -10.2, -16.2292, 0xd8d4c9, 1.77, 0.92);
    // Keep the vendor on the checker-paved park apron, clear of both the
    // northbound vehicle envelope and the open corner's turning area.
    addAlunAlunVendorCart(context, 16.2, 9.45);

    [
      [24.9, -7.0, 3.45, 1.52],
      [24.95, -10.25, 3.8, 1.68],
      [24.8, -13.6, 3.55, 1.58],
    ].forEach(([north, east, height, spread], index) =>
      addAlunAlunTree(context, north, east, height, spread, 31 + index * 0.86, false, 0.018),
    );

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
