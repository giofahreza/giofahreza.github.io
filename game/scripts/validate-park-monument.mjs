import assert from "node:assert/strict";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import { createAlunAlunModelFactory, GARUDA_MONUMENT_PLACEMENT } from "../src/features/landmarks/alun-alun/index.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Build the actual park, including its material batching. Canvas painting and
// unrelated helper palms are stubbed: these checks concern monument geometry
// and collision, not texture pixels or vegetation.
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
const placement = GARUDA_MONUMENT_PLACEMENT;
const monument = root.children.find((child) => child.isGroup
  && child.position.x === placement.north && child.position.z === placement.east
  && child.scale.x === placement.scale);
assert.ok(monument, "actual park constructor must place the monument at its shared anchor");
const base = monument.children.find((child) => {
  if (!child.isMesh) return false;
  const bounds = new THREE.Box3().setFromObject(child);
  return Math.abs(bounds.min.y - monument.position.y) < 1e-6;
});
assert.ok(base, "find actual lowest plinth mesh after material batching");
const baseBounds = new THREE.Box3().setFromObject(base);
const center = baseBounds.getCenter(new THREE.Vector3());
const size = baseBounds.getSize(new THREE.Vector3());
const colliders = root.userData.localObstacles.filter((obstacle) =>
  Math.abs(obstacle.north - center.x) < 1e-6 && Math.abs(obstacle.east - center.z) < 1e-6);
assert.equal(colliders.length, 1, "exactly one collider must follow the actual visible plinth");
assert.ok(Math.abs(colliders[0].width - size.x) < 1e-6, "collider matches scaled visible base width");
assert.ok(Math.abs(colliders[0].depth - size.z) < 1e-6, "collider matches scaled visible base depth");

const navigation = createNavigationSystem({
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 }, getGeospatialWorld: () => null,
});
// Same north/east mapping used by activateGeospatialWorld for park obstacles.
for (const { north, east, width, depth, yaw = 0 } of root.userData.localObstacles) {
  navigation.addBoxObstacle(east, -north, width, depth, yaw);
}
const gapsAt = (theta, phi) => {
  const normal = sphericalPosition(theta, phi, 1).normalize();
  return navigation.obstacles.map((obstacle) => navigation.obstacleGapAtSurfacePoint(normal, obstacle));
};
assert.ok(Math.min(...gapsAt(placement.east, -placement.north)) < 0,
  "visible monument center is solid");
for (let phi = -11.4; phi >= -13.1; phi -= 0.02) {
  assert.ok(Math.min(...gapsAt(-0.35, phi)) > constants.RIDER_COLLISION_RADIUS,
    `old phantom location must be clear along the original northward repro at ${phi}`);
}
console.log("Park Garuda regression passed: actual constructor/plinth bounds match collision; old phantom approach is clear.");
