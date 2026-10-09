import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createMosqueModelFactory } from "../src/features/landmarks/mosque.js";
import { createPendopoModelFactory } from "../src/features/landmarks/pendopo.js";
import { createAlAbrorSouthFactory } from "../src/features/landmarks/alun-alun/al-abror-south.js";
import { createAlunAlunEastSchoolsFactory } from "../src/features/landmarks/alun-alun/east-schools.js";
import { createAlunAlunWestRoadsideFactory } from "../src/features/landmarks/alun-alun/west-roadside.js";
import { createStops } from "../src/data/stops.js";
import * as corridor from "../src/features/landmarks/alun-alun/traffic.js";

// Real factory geometry, including roofs, awnings, posts and signs. Only canvas
// paint/sign textures and non-building vegetation/walkers are stubbed. The dome
// canvas stub never changes vertices. This is a planar map-clearance regression,
// not an assertion about every building or road in the game or photographic fit.
globalThis.document = {
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }),
};
const animatedStopDetails = [];
const helpers = {
  ...createLandmarkHelpers({ animatedStopDetails, materials: { inkMaterial: new THREE.MeshToonMaterial() } }),
  addAlunAlunTree: () => new THREE.Group(),
  addAlunAlunWalker: () => new THREE.Group(),
  addLocalPalm: () => new THREE.Group(),
  getSitubondoSignMaterial: () => new THREE.MeshBasicMaterial(),
};
const dependencies = {
  helpers,
  collections: { animatedStopDetails },
  materials: {
    foliageMaterials: [new THREE.MeshToonMaterial(), new THREE.MeshToonMaterial()],
    rockMaterial: new THREE.MeshToonMaterial(),
  },
};
const scopes = [
  ["west asphalt infill", corridor.ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE],
  ["west pedestrian tread and curb", corridor.ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE],
  ["south asphalt", corridor.ALUN_ALUN_SOUTH_LOCAL_ROAD_SURFACE_OUTLINE],
  ["south pedestrian tread and curb", corridor.ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.sidewalkOutline],
  ["southeast junction asphalt", corridor.ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.asphaltOutline],
  ["southeast corner pedestrian return", corridor.ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION.cornerReturns.southeast.sidewalkOutline],
  ["north Ahmad Yani asphalt union", corridor.ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE],
  ["north Ahmad Yani property sidewalk and curb", corridor.ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniSidewalkOutline],
  ["northeast signalised junction asphalt", corridor.ALUN_ALUN_JUNCTION_ASPHALT_OUTLINE],
];
// The small generated lane beside the corner residence is not part of the
// custom west/south road polygons. Guard its frontage, including BOTH its
// 0.18 m curb and 1.45 m pedestrian strip, using the actual map coordinates.
const map = JSON.parse(readFileSync(new URL("../public/data/situbondo-map.json", import.meta.url)));
const lane = map.roads[59];
assert.equal(lane[0], 3, "Re-audit residence lane after a map refresh");
const laneStart = [lane[2][33] / 50, lane[2][32] / 50];
const laneEnd = [lane[2][35] / 50, lane[2][34] / 50];
assert.deepEqual(laneStart, [-20.56, -15.64]);
assert.deepEqual(laneEnd, [-20.46, -14.28]);
const laneHalfWidth = (lane[1] / 10 / 2 + 0.18 + 1.45) / 5;
const laneLength = Math.hypot(laneEnd[0] - laneStart[0], laneEnd[1] - laneStart[1]);
const laneNormal = [-(laneEnd[1] - laneStart[1]) / laneLength, (laneEnd[0] - laneStart[0]) / laneLength];
scopes.push(["residence side lane 59 asphalt, curb and pedestrian band", [
  [laneStart[0] + laneNormal[0] * laneHalfWidth, laneStart[1] + laneNormal[1] * laneHalfWidth],
  [laneEnd[0] + laneNormal[0] * laneHalfWidth, laneEnd[1] + laneNormal[1] * laneHalfWidth],
  [laneEnd[0] - laneNormal[0] * laneHalfWidth, laneEnd[1] - laneNormal[1] * laneHalfWidth],
  [laneStart[0] - laneNormal[0] * laneHalfWidth, laneStart[1] - laneNormal[1] * laneHalfWidth],
]]);
const ribbonScopes = [
  ["west road ribbon", corridor.ALUN_ALUN_WEST_LOCAL_ROAD_PATH, corridor.ALUN_ALUN_PERIMETER_LOCAL_ROAD_OUTER_WIDTH],
  // Match addAlunAlunRoadContext's north cross-street: 1.7-unit asphalt plus
  // its 0.28-unit shoulder. Re-audit this snapshot when that road changes.
  ["north cross-street asphalt and shoulder", [[23.58, 12.86], [29.16, 14.28], [32.2, 15.1]], 1.98],
  ...["northWest", "northEast"].map((name) => {
    const route = corridor.ALUN_ALUN_PEDESTRIAN_ROUTE_DEFINITIONS[name];
    // Enclose the curb along the ribbon edge as well as its clear tread.
    return [`${name} pedestrian ribbon and curb`, route.points, route.width + 0.03];
  }),
];
for (const [name, path, width] of ribbonScopes) {
  const ribbon = corridor.createAlunAlunRoadRibbonGeometry(path, width);
  const ribbonPosition = ribbon.attributes.position;
  for (let i = 0; i < ribbon.index.count; i += 3) {
    scopes.push([name, [0, 1, 2].map((corner) => {
      const index = ribbon.index.getX(i + corner);
      return [ribbonPosition.getX(index), ribbonPosition.getZ(index)];
    })]);
  }
  ribbon.dispose();
}
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const bounds = (points) => [
  Math.min(...points.map((p) => p[0])), Math.max(...points.map((p) => p[0])),
  Math.min(...points.map((p) => p[1])), Math.max(...points.map((p) => p[1])),
];
function inside(p, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
      p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function overlaps(triangle, polygon) {
  if (triangle.some((p) => inside(p, polygon))) return true;
  if (Math.abs(cross(...triangle)) > 1e-10 && polygon.some((p) => inside(p, triangle))) return true;
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < polygon.length; j += 1) {
    const a = triangle[i], b = triangle[(i + 1) % 3], c = polygon[j], d = polygon[(j + 1) % polygon.length];
    if (cross(a, b, c) * cross(a, b, d) < -1e-14 && cross(c, d, a) * cross(c, d, b) < -1e-14) return true;
  }
  return false;
}
const boundedScopes = scopes.map(([name, polygon]) => ({ name, polygon, box: bounds(polygon) }));
const models = [
  ["mosque", "Al-Abror", createMosqueModelFactory(dependencies).addMosqueModel],
  ["pendopo", "Pendopo", createPendopoModelFactory(dependencies).addPendopoModel],
  ["alun", "Al-Abror south compound", createAlAbrorSouthFactory(dependencies).addAlAbrorSouthCompound],
  ["alun", "Warung Pojok", createAlunAlunEastSchoolsFactory(dependencies).addAlunAlunWarungPojok],
  ["alun", "Post Office", createAlunAlunWestRoadsideFactory(dependencies).addAlunAlunPostOffice],
  ["alun", "Planet Ban tyre shop", createAlunAlunWestRoadsideFactory(dependencies).addAlunAlunTyreShop],
  ["alun", "Northeast junction frontage", createAlunAlunEastSchoolsFactory(dependencies).addAlunAlunEastJunctionFrontage],
];
let failures = 0;
for (const [kind, name, construct] of models) {
  const stop = createStops().find((s) => s.kind === kind);
  const root = new THREE.Group();
  construct(root, new THREE.MeshToonMaterial());
  root.updateMatrixWorld(true);
  const violations = new Map();
  let triangleCount = 0;
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position;
    const indices = mesh.geometry.index;
    const points = [];
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; i += 1) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      points.push([
        -stop.phi + (Math.cos(stop.yaw) * vertex.x + Math.sin(stop.yaw) * vertex.z) * stop.scale,
        stop.theta + (-Math.sin(stop.yaw) * vertex.x + Math.cos(stop.yaw) * vertex.z) * stop.scale,
        vertex.y * stop.scale,
      ]);
    }
    for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
      const triangle = [0, 1, 2].map((offset) => points[indices ? indices.getX(i + offset) : i + offset]);
      // At-grade property apron/floor surfaces are tested by map validation;
      // this check targets built elements above 40 cm (0.08 world units).
      if (Math.max(...triangle.map((p) => p[2])) <= 0.08001) continue;
      triangleCount += 1;
      const box = bounds(triangle);
      for (const scope of boundedScopes) {
        if (box[0] > scope.box[1] || box[1] < scope.box[0] || box[2] > scope.box[3] || box[3] < scope.box[2]) continue;
        if (!overlaps(triangle, scope.polygon)) continue;
        const key = `${scope.name} | ${mesh.parent.name || "model"} | ${mesh.material.color?.getHexString()}`;
        violations.set(key, (violations.get(key) ?? 0) + 1);
      }
    }
  });
  if (violations.size) {
    failures += violations.size;
    console.error(name, Object.fromEntries(violations));
  } else console.log(`${name}: ${triangleCount} elevated mesh triangles clear of targeted asphalt and pedestrian corridors`);
  root.traverse((mesh) => { if (mesh.isMesh) mesh.geometry.dispose(); });
}
assert.equal(failures, 0, "Building geometry intersects targeted road/pedestrian corridors");
