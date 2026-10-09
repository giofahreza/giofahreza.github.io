import assert from "node:assert/strict";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import {
  createAlunAlunModelFactory,
  ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES,
} from "../src/features/landmarks/alun-alun/index.js";
import { ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS } from "../src/features/landmarks/alun-alun/traffic.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Construct the actual park, including material-batched bench geometry. Only
// browser canvas painting and unrelated vegetation helpers are stubbed.
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
const west = [];
const south = [];
root.traverse((object) => {
  if (object.name.startsWith("West park outward-facing bench ")) west.push(object);
  if (object.name.startsWith("South park south-facing bench ")) south.push(object);
});
assert.equal(west.length, 3);
assert.equal(south.length, 3);
const navigation = createNavigationSystem({
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 }, getGeospatialWorld: () => null,
});
for (const { north, east, width, depth, yaw = 0 } of root.userData.localObstacles) {
  navigation.addBoxObstacle(east, -north, width, depth, yaw);
}
const gap = (north, east) => {
  const point = sphericalPosition(east, -north, 1).normalize();
  return Math.min(...navigation.obstacles.map((o) => navigation.obstacleGapAtSurfacePoint(point, o)));
};
const epsilon = 1e-6;
west.forEach((bench, index) => {
  const [north, east] = [[6.35, -15.46], [-4.15, -13.28], [-10.45, -11.97]][index];
  assert.equal(bench.position.x, north, "preserve north anchor");
  assert.equal(bench.position.z, east, "preserve east anchor");
  assert.equal(bench.userData.staticPropObstacles?.length, 1);
  const box = bench.userData.staticPropObstacles[0];
  assert.equal(root.userData.localObstacles.filter((item) => item === box).length, 1);
  assert.equal(box.yaw, bench.rotation.y);
  assert.ok(Math.abs(box.width - 0.72) < epsilon, "tight seat width, not rotated AABB width");
  assert.ok(Math.abs(box.depth - 0.2475) < epsilon, "include asymmetric projecting backrest");
  const cos = Math.cos(box.yaw);
  const sin = Math.sin(box.yaw);
  const measured = new THREE.Box3();
  // Independent check after batching: measure all final mesh vertices in the
  // collider's oriented frame, rather than copying its construction formula.
  bench.traverse((child) => {
    if (!child.isMesh) return;
    const positions = child.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i += 1) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld);
      const dn = vertex.x - box.north;
      const de = vertex.z - box.east;
      measured.expandByPoint(new THREE.Vector3(dn * cos - de * sin, vertex.y, dn * sin + de * cos));
    }
  });
  for (const [actual, expected] of [
    [measured.min.x, -box.width / 2], [measured.max.x, box.width / 2],
    [measured.min.z, -box.depth / 2], [measured.max.z, box.depth / 2],
  ]) assert.ok(Math.abs(actual - expected) < epsilon, "merged geometry fits oriented collider exactly");
  const at = (x, z) => gap(box.north + x * cos + z * sin, box.east - x * sin + z * cos);
  assert.ok(at(0, 0) < 0, "bench center is solid");
  for (const [dx, dz, half] of [
    [1, 0, box.width / 2], [-1, 0, box.width / 2],
    [0, 1, box.depth / 2], [0, -1, box.depth / 2],
  ]) {
    const outside = half + constants.RIDER_COLLISION_RADIUS + 0.04;
    const touching = half + constants.RIDER_COLLISION_RADIUS - 0.04;
    assert.ok(at(dx * outside, dz * outside) > 0, "approach starts clear");
    assert.ok(at(dx * touching, dz * touching) < 0, "all four local sides block before overlap");
  }
  for (const sign of [-1, 1]) {
    const bypass = sign * (box.width / 2 + constants.RIDER_COLLISION_RADIUS + 0.08);
    for (let z = -0.4; z <= 0.4; z += 0.02) {
      assert.ok(at(bypass, z) > 0, "passage around each bench end remains open");
    }
  }
});
const southBoxes = ALUN_ALUN_SOUTH_PROMENADE_COLLISION_OBSTACLES.filter(({ label }) => label.includes("bench"));
assert.equal(southBoxes.length, 3);
south.forEach((bench, index) => {
  const definition = ALUN_ALUN_SOUTH_PARK_BENCH_DEFINITIONS[index];
  assert.equal(bench.userData.staticPropObstacles, undefined, "south benches do not opt into duplicate registration");
  assert.equal(bench.position.x, definition.center[0]);
  assert.equal(bench.position.z, definition.center[1]);
  assert.equal(bench.rotation.y, definition.yaw);
  assert.equal(root.userData.localObstacles.filter((item) => item === southBoxes[index]).length, 1);
  assert.equal(southBoxes[index].width, 0.76);
  assert.equal(southBoxes[index].depth, 0.3);
});
console.log("West benches regression passed: three exact oriented mesh footprints registered once, four-side collision and end passages verified; south benches unchanged with no duplicates.");
