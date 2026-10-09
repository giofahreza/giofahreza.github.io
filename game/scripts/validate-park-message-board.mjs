import assert from "node:assert/strict";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import { createAlunAlunModelFactory } from "../src/features/landmarks/alun-alun/index.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Build the real park, including geometry batching and obstacle collection.
// Canvas painting and unrelated helper vegetation are the only substitutes.
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
const boards = [];
root.traverse((object) => {
  if (object.name === "Alun-Alun entrance message board") boards.push(object);
});
assert.equal(boards.length, 1, "one real entrance message board exists");
const board = boards[0];
assert.deepEqual(board.position.toArray(), [13.05, 0.06, 10.05], "preserve board anchor");
assert.equal(board.rotation.y, Math.PI / 2, "preserve board orientation");
const boxes = board.userData.staticPropObstacles;
assert.equal(boxes?.length, 2, "only two grounded posts contribute collision");

// Independently reconstruct each post's vertex transform rather than deriving
// expectations from the collision data. Seven segments make the tapered
// cylinder bounds slightly asymmetric; a nominal radius-only check misses it.
for (const [index, offset] of [-0.45, 0.45].entries()) {
  const geometry = new THREE.CylinderGeometry(0.022, 0.028, 0.55, 7);
  const local = new THREE.Matrix4().makeTranslation(offset, 0.31, -0.005);
  const rotation = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const translation = new THREE.Matrix4().makeTranslation(13.05, 0.06, 10.05);
  geometry.applyMatrix4(translation.multiply(rotation).multiply(local));
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const box = boxes[index];
  for (const [actual, expected, label] of [
    [box.north, center.x, "north center"], [box.east, center.z, "east center"],
    [box.width, size.x, "north width"], [box.depth, size.z, "east depth"],
  ]) assert.ok(Math.abs(actual - expected) < 2e-6,
    `post ${index + 1} ${label} follows transformed cylinder vertices`);
  assert.ok(box.width < 0.057 && box.depth < 0.057, "no elevated panel footprint included");
  assert.equal(root.userData.localObstacles.filter((item) => item === box).length, 1,
    `runtime collects post ${index + 1} exactly once`);
  geometry.dispose();
}

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
for (const [index, box] of boxes.entries()) {
  assert.ok(gap(box.east, box.north) < 0, `post ${index + 1} center is solid`);
  for (const [dn, de, halfSize] of [
    [1, 0, box.width / 2], [-1, 0, box.width / 2],
    [0, 1, box.depth / 2], [0, -1, box.depth / 2],
  ]) {
    const outside = halfSize + constants.RIDER_COLLISION_RADIUS + 0.025;
    const touching = halfSize + constants.RIDER_COLLISION_RADIUS - 0.025;
    assert.ok(gap(box.east + de * outside, box.north + dn * outside) > 0,
      `post ${index + 1} approach ${dn},${de} starts clear`);
    assert.ok(gap(box.east + de * touching, box.north + dn * touching) < 0,
      `post ${index + 1} approach ${dn},${de} blocks before overlap`);
  }
}
// Keep the usable headroom between posts, plus both outside paths. The sign's
// elevated panel must never turn this entire north/south crossing into a wall.
for (const east of [9.3, 10.05, 10.8]) {
  for (let north = 12.35; north <= 13.45; north += 0.01) {
    assert.ok(gap(east, north) > 0, `passage remains clear at ${east},${north}`);
  }
}
console.log("Park message-board regression passed: two transformed post colliders register once; cardinal approaches block; central and adjacent passages remain clear.");
