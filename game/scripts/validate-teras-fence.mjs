import assert from "node:assert/strict";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import { createAlunAlunModelFactory } from "../src/features/landmarks/alun-alun/index.js";
import { ALUN_ALUN_WEST_FRONTAGE_DEFINITION } from "../src/features/landmarks/alun-alun/traffic.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Construct the real park with its normal geometry batching. Only canvas
// painting and unrelated vegetation helpers are stubbed, as in the monument
// regression; neither fence geometry nor its navigation is replaced.
const context = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === "measureText") return (text) => ({ width: String(text).length * 12 });
    if (String(key).startsWith("create")) return () => ({ addColorStop() {} });
    return () => {};
  },
});
const previousDocument = globalThis.document;
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const material = new THREE.MeshToonMaterial({ color: 0xffffff });
const animatedStopDetails = [];
const root = new THREE.Group();
try {
  const helpers = createLandmarkHelpers({ animatedStopDetails, materials: { inkMaterial: material } });
  const factory = createAlunAlunModelFactory({
    collections: { animatedStopDetails },
    constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 },
    helpers: { ...helpers, addLocalPalm: () => new THREE.Group(), getSitubondoSignMaterial: () => material },
    materials: {
      foliageMaterials: [material, material], inkMaterial: material,
      rockMaterial: material, targetMaterial: material, trunkMaterial: material,
    },
    world: new THREE.Group(),
  });
  factory.addAlunAlunModel(root, material);
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}
root.updateMatrixWorld(true);
const fence = root.getObjectByName("Teras Pos sidewalk-aligned fence");
assert.ok(fence, "real constructor retains the visible fence");
const fenceBoxes = fence.userData.sidewalkFenceObstacles;
assert.ok(fenceBoxes?.length > 0, "visible fence must contribute colliders");
assert.equal(new Set(fenceBoxes.map((box) => JSON.stringify(box))).size, fenceBoxes.length,
  "vertically duplicated rails must not duplicate ground colliders");
for (const box of fenceBoxes) {
  assert.ok(root.userData.localObstacles.includes(box),
    "actual park construction must collect every fence collider for runtime registration");
  assert.ok(box.width > 0 && box.depth > 0, "inscribed box dimensions are positive");
}
const edge = ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniSidewalkOuterBoundary;
function boundaryNorth(east) {
  for (let i = 1; i < edge.length; i++) {
    const [an, ae] = edge[i - 1];
    const [bn, be] = edge[i];
    if (east >= ae && east <= be) return an + (east - ae) * (bn - an) / (be - ae);
  }
  throw new Error(`Outside sidewalk edge: ${east}`);
}
// With runtime yaw convention, width points north/west and depth east/north.
// Wrong yaw sign makes corners cross the sidewalk on this sloping boundary.
for (const box of fenceBoxes) {
  const c = Math.cos(box.yaw), s = Math.sin(box.yaw);
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const north = box.north + a * box.width / 2 * c + b * box.depth / 2 * s;
    const east = box.east - a * box.width / 2 * s + b * box.depth / 2 * c;
    const setback = north - boundaryNorth(east);
    assert.ok(setback >= 0.0002 - 1e-8, "box corner must not extend onto the sidewalk");
    assert.ok(setback <= 0.0602 + 1e-8, "box must remain within the thickest visible member");
  }
}

const navigation = createNavigationSystem({
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 }, getGeospatialWorld: () => null,
});
// Reproduce the exact localObstacles registration convention used by
// activateGeospatialWorld, including all other park obstacles for regressions.
for (const { north, east, width, depth, yaw = 0 } of root.userData.localObstacles) {
  navigation.addBoxObstacle(east, -north, width, depth, yaw);
}
const gap = (east, north) => {
  const point = sphericalPosition(east, -north, 1).normalize();
  return Math.min(...navigation.obstacles.map((o) => navigation.obstacleGapAtSurfacePoint(point, o)));
};
const testEast = -3.3;
const boundary = boundaryNorth(testEast);
assert.ok(gap(testEast, 18.68) > 0, "original outside repro setup is clear");
assert.ok(gap(testEast, 19.024) > 0, "original inside repro endpoint is clear");
for (const direction of [-1, 1]) {
  const start = direction === 1 ? 18.68 : 19.024;
  let firstBlocked = null;
  for (let n = start; direction === 1 ? n <= 19.024 : n >= 18.68; n += direction * 0.002) {
    if (gap(testEast, n) < 0) { firstBlocked = n; break; }
  }
  assert.notEqual(firstBlocked, null, "north/south approach must encounter a fence collision");
  assert.ok(direction === 1 ? firstBlocked < boundary : firstBlocked > boundary + 0.05,
    "rider radius must stop either approach before the actual visible rail");
}
for (let east = -4.45; east <= -2.18; east += 0.01) {
  assert.ok(gap(east, boundaryNorth(east) - 0.1) > 0,
    `sidewalk parallel walk stays clear at east ${east}`);
}
for (let north = 20; north <= 21.5; north += 0.01) {
  assert.ok(gap(0.42, north) > 0, "main postal gate approach must remain clear");
}
console.log("Teras Pos fence regression passed: real constructor registers inscribed colliders; both approaches blocked; sidewalk and postal gate clear.");
