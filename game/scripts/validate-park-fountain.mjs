import assert from "node:assert/strict";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import { createAlunAlunModelFactory, PARK_FOUNTAIN_PLACEMENT } from "../src/features/landmarks/alun-alun/index.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Exercise the real model and its collected navigation, including batching.
// Only canvas painting and unrelated helper palms are substituted.
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
const placement = PARK_FOUNTAIN_PLACEMENT;
assert.deepEqual(placement, { north: -4.8, east: 4.7, radius: 1.24, topRadius: 1.12 },
  "preserve existing surveyed basin geometry while correcting its collider");
const fountains = root.children.filter((child) => child.isGroup
  && child.position.x === placement.north && child.position.z === placement.east);
assert.equal(fountains.length, 1, "one actual fountain exists at the surveyed anchor");
const fountain = fountains[0];
const basin = fountain.children.find((child) => child.isMesh
  && child.geometry.type === "CylinderGeometry");
assert.ok(basin, "find the real stone basin mesh, not a navigation-only fixture");
assert.equal(basin.geometry.parameters.radiusBottom, 1.24);
assert.equal(basin.geometry.parameters.radiusTop, 1.12);
const bounds = new THREE.Box3().setFromObject(basin);
const center = bounds.getCenter(new THREE.Vector3());
const size = bounds.getSize(new THREE.Vector3());
assert.ok(Math.abs(center.x - placement.north) < 1e-6);
assert.ok(Math.abs(center.z - placement.east) < 1e-6);
assert.ok(Math.abs(size.x - 2.48) < 1e-6 && Math.abs(size.z - 2.48) < 1e-6,
  "visible bottom bounds retain their 2.48-unit diameter");
const vertices = basin.geometry.getAttribute("position");
let maximumMeshRadius = 0;
for (let i = 0; i < vertices.count; i += 1) {
  maximumMeshRadius = Math.max(maximumMeshRadius,
    Math.hypot(vertices.getX(i), vertices.getZ(i)));
}
assert.ok(Math.abs(maximumMeshRadius - 1.24) < 1e-6,
  "actual vertex radius agrees with collision radius");
assert.equal(root.userData.localObstacles.filter((obstacle) =>
  Math.abs(obstacle.north - placement.north) < 1e-6
  && Math.abs(obstacle.east - placement.east) < 1e-6).length, 0,
"legacy square fountain exclusion must not remain alongside the circle");

const navigation = createNavigationSystem({
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 }, getGeospatialWorld: () => null,
});
// Mirror the production park's legacy obstacle collection, then register its
// new navigation through the real stop path with a planet-positioned marker.
for (const { north, east, width, depth, yaw = 0 } of root.userData.localObstacles) {
  navigation.addBoxObstacle(east, -north, width, depth, yaw);
}
const marker = new THREE.Group();
marker.position.copy(sphericalPosition(0, 0, constants.PLANET_RADIUS));
marker.userData.navigation = root.userData.navigation;
assert.equal(navigation.registerStopNavigation({
  group: marker, theta: 0, phi: 0, yaw: 0, baseScale: 1, shortName: "Alun-Alun",
}), true);
const circles = navigation.obstacles.filter((obstacle) =>
  obstacle.label === "Alun-Alun: fountain basin");
assert.equal(circles.length, 1, "one fountain collider is registered through real stop navigation");
const circle = circles[0];
assert.equal(circle.shape, "circle");
assert.equal(circle.theta, 4.7);
assert.equal(circle.phi, 4.8);
assert.equal(circle.radius, 1.24);
const gapTo = (obstacle, theta, phi) => navigation.obstacleGapAtSurfacePoint(
  sphericalPosition(theta, phi, 1).normalize(), obstacle,
);
const minimumGap = (theta, phi) => Math.min(...navigation.obstacles.map(
  (obstacle) => gapTo(obstacle, theta, phi),
));
assert.ok(gapTo(circle, 4.7, 4.8) < 0, "basin center remains solid");
for (let direction = 0; direction < 8; direction += 1) {
  const angle = direction * Math.PI / 4;
  const contactRadius = circle.radius + constants.RIDER_COLLISION_RADIUS;
  for (const [offset, expectedSign] of [[-0.025, -1], [0.025, 1]]) {
    const radius = contactRadius + offset;
    const theta = circle.theta + Math.cos(angle) * radius;
    const phi = circle.phi + Math.sin(angle) * radius;
    const gap = gapTo(circle, theta, phi);
    assert.ok(Math.abs(gap - offset) < 0.002,
      `direction ${direction}: measured radial gap ${gap} matches ${offset}`);
    assert.ok(gap * expectedSign > 0, `direction ${direction}: inside/outside sign is correct`);
    if (expectedSign > 0) assert.ok(minimumGap(theta, phi) > 0,
      `direction ${direction}: no duplicate or neighboring blocker outside basin`);
  }
}
assert.ok(minimumGap(5.94, 3.56) > 0.4,
  "manually reproduced northeast phantom corner is now clear");
console.log("Park fountain regression passed: actual circular basin geometry and registered collider agree; eight radial approaches block correctly; former square corner is clear.");
