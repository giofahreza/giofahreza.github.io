import assert from "node:assert/strict";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import { createAlunAlunModelFactory } from "../src/features/landmarks/alun-alun/index.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Exercise the real constructor and material batching. Only canvas painting
// and unrelated helper vegetation are stubbed, never the barrier geometry.
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
const animatedBarriers = animatedStopDetails.filter(({ type }) => type === "parkBarrier");
assert.equal(animatedBarriers.length, 1, "one real park entrance barrier exists");
const arm = animatedBarriers[0].object;
const barrier = arm.parent;
assert.equal(barrier.position.x, 13.25, "preserve surveyed barrier north anchor");
assert.equal(barrier.position.z, -2.62, "preserve surveyed barrier east anchor");
const fixedBounds = new THREE.Box3();
for (const child of barrier.children) {
  if (child !== arm) fixedBounds.union(new THREE.Box3().setFromObject(child));
}
const fixedCenter = fixedBounds.getCenter(new THREE.Vector3());
const fixedSize = fixedBounds.getSize(new THREE.Vector3());
const boxes = barrier.userData.staticPropObstacles;
assert.equal(boxes?.length, 1, "fixed base/stripe/hinge contribute exactly one collider");
const box = boxes[0];
assert.equal(root.userData.localObstacles.filter((item) => item === box).length, 1,
  "park runtime collects the pedestal collider exactly once");
for (const [actual, expected, label] of [
  [box.north, fixedCenter.x, "north center"], [box.east, fixedCenter.z, "east center"],
  [box.width, fixedSize.x, "north width"], [box.depth, fixedSize.z, "east depth"],
]) assert.ok(Math.abs(actual - expected) < 1e-7, `pedestal ${label} follows actual fixed geometry`);
assert.ok(box.width < 0.3 && box.depth < 0.3, "moving arm must not inflate the fixed collider");

const navigation = createNavigationSystem({
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 }, getGeospatialWorld: () => null,
});
for (const { north, east, width, depth, yaw = 0 } of root.userData.localObstacles) {
  navigation.addBoxObstacle(east, -north, width, depth, yaw);
}
const gap = (east, north) => {
  const point = sphericalPosition(east, -north, 1).normalize();
  return Math.min(...navigation.obstacles.map((o) => navigation.obstacleGapAtSurfacePoint(point, o)));
};
assert.ok(gap(box.east, box.north) < 0, "visible pedestal center is solid");
for (const [dn, de, halfSize] of [
  [1, 0, box.width / 2], [-1, 0, box.width / 2],
  [0, 1, box.depth / 2], [0, -1, box.depth / 2],
]) {
  const outside = halfSize + constants.RIDER_COLLISION_RADIUS + 0.025;
  const touching = halfSize + constants.RIDER_COLLISION_RADIUS - 0.025;
  assert.ok(gap(box.east + de * outside, box.north + dn * outside) > 0,
    `approach ${dn},${de} starts outside the solid base`);
  assert.ok(gap(box.east + de * touching, box.north + dn * touching) < 0,
    `approach ${dn},${de} encounters collision before overlapping the base`);
}
// The original manually reproduced northward walk must intersect the fixed
// pedestal. Parallel crossing under the arm must not meet a permanent blocker;
// raised-arm collision is deliberately outside this static-base correction.
assert.ok(gap(-2.62, 12.95) > 0, "original manual northward setup remains clear");
assert.ok(gap(-2.62, 13.5559) > 0, "original pass-through endpoint remains outside the base");
for (const east of [-3.0, -2.15]) {
  for (let north = 12.95; north <= 13.4; north += 0.01) {
    assert.ok(gap(east, north) > 0, `adjacent passage stays clear at ${east},${north}`);
  }
}
const savedBox = JSON.stringify(box);
arm.rotation.x = -0.95;
root.updateMatrixWorld(true);
assert.equal(JSON.stringify(box), savedBox, "raising the arm leaves the fixed pedestal unchanged");
console.log("Park barrier regression passed: real fixed geometry matches one collider; all four sides block; adjacent passage remains clear.");
