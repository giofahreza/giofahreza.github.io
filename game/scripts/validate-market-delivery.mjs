import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import * as constants from "../src/config/runtime.js";
import { createStops } from "../src/data/stops.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createMinorStopModelFactory } from "../src/features/landmarks/minor-stop-models.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { sphericalPosition } from "../src/world/surface.js";

// Exercise the real model and navigation registration. Only canvas signs and
// unrelated vegetation are stubbed; this is not a substitute for a live route
// test with the mapped world, traffic, input, and delivery state machine.
const material = new THREE.MeshToonMaterial({ color: 0xffffff });
const helpers = createLandmarkHelpers({
  animatedStopDetails: [],
  materials: { inkMaterial: material },
});
const { addMarketModel, addStationModel, addStadiumModel } = createMinorStopModelFactory({
  helpers: {
    ...helpers,
    addSitubondoSign() {},
    addLocalPalm() {},
  },
  materials: { trunkMaterial: material },
});
const stop = createStops().find(({ kind }) => kind === "market");
assert.ok(stop, "market stop must exist");
stop.group = new THREE.Group();
stop.group.position.copy(sphericalPosition(stop.theta, stop.phi));
stop.baseScale = stop.scale;
stop.marker = new THREE.Group();
stop.group.add(stop.marker);
addMarketModel(stop.group, material);

const navigation = createNavigationSystem({
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5 },
  getGeospatialWorld: () => null,
});
assert.equal(navigation.registerStopNavigation(stop), true);
assert.equal(navigation.obstacles.length, 1,
  "explicit navigation must retain the circle skipped by fallback registration");
const [obstacle] = navigation.obstacles;
assert.equal(obstacle.shape, "circle");
assert.equal(obstacle.theta, stop.theta);
assert.equal(obstacle.phi, stop.phi);
assert.equal(obstacle.radius, 0.58 * 0.72 * stop.baseScale,
  "retain exactly the market's former fallback footprint");
assert.ok(Math.abs(stop.deliveryTheta - 126.486) < 1e-9);
assert.ok(Math.abs(stop.deliveryPhi + 21.44) < 1e-9);
assert.deepEqual(stop.marker.position.toArray(), [0.72, 0.04, 0]);

const gapAt = (theta, phi) => navigation.obstacleGapAtSurfacePoint(
  sphericalPosition(theta, phi, 1).normalize(), obstacle,
);
assert.ok(gapAt(stop.theta, stop.phi) < -1,
  "market center must remain solid, not become a walk-through delivery fix");
assert.ok(gapAt(stop.deliveryTheta, stop.deliveryPhi) > 0.7,
  "handoff must be comfortably outside the rider-expanded footprint");

const targetNormal = sphericalPosition(stop.deliveryTheta, stop.deliveryPhi, 1).normalize();
let reachableHandoff = null;
for (let theta = 128; theta >= stop.theta; theta -= 0.005) {
  if (gapAt(theta, stop.phi) < 0) break;
  const distance = sphericalPosition(theta, stop.phi, 1).normalize()
    .angleTo(targetNormal) * constants.PLANET_RADIUS;
  if (distance <= constants.DELIVERY_DISTANCE) {
    reachableHandoff = { theta, phi: stop.phi, distance };
    break;
  }
}
assert.ok(reachableHandoff, "original east approach must reach delivery range before collision");
assert.ok(obstacle.radius + constants.RIDER_COLLISION_RADIUS > constants.DELIVERY_DISTANCE,
  "control: the former center target reproduces the inaccessible handoff");

const geometries = new Set();
const materials = new Set([material]);
stop.group.traverse((object) => {
  if (object.geometry) geometries.add(object.geometry);
  if (object.material) {
    for (const item of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(item);
    }
  }
});
for (const geometry of geometries) geometry.dispose();
for (const item of materials) item.dispose();
console.log("Market delivery regression passed: real factory/registration, exact retained collider, marker and accessible east handoff.");
console.log(JSON.stringify(reachableHandoff));

const map = JSON.parse(readFileSync(new URL("../public/data/situbondo-map.json", import.meta.url)));
const terminalOutline = map.buildings[9][7];
assert.ok(Array.isArray(terminalOutline), "re-audit Terminal building 9 after a map schema change");
const terminalPolygon = [];
for (let index = 0; index < terminalOutline.length; index += 2) {
  terminalPolygon.push([terminalOutline[index] / 50, -terminalOutline[index + 1] / 50]);
}
function polygonClearance(x, y, polygon) {
  let inside = false;
  let distance = Infinity;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [ax, ay] = polygon[previous];
    const [bx, by] = polygon[index];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -distance : distance;
}
for (const test of [
  { kind: "station", build: addStationModel, footprint: 0.58,
    world: [159, -2.2], local: [2.772256655765709, 0.04, 0.5289613739720815] },
  { kind: "stadium", build: addStadiumModel, footprint: 0.72,
    world: [-180.90802245365947, -84.42229876633907], local: [0, 0.04, 0.75] },
]) {
  const target = createStops().find(({ kind }) => kind === test.kind);
  const primary = new THREE.MeshToonMaterial();
  target.group = new THREE.Group();
  target.group.position.copy(sphericalPosition(target.theta, target.phi));
  target.marker = new THREE.Group();
  target.group.add(target.marker);
  target.baseScale = target.scale;
  test.build(target.group, primary);
  navigation.reset();
  assert.equal(navigation.registerStopNavigation(target), true);
  assert.equal(navigation.obstacles.length, 1);
  const [retained] = navigation.obstacles;
  assert.equal(retained.shape, "circle");
  assert.equal(retained.theta, target.theta);
  assert.equal(retained.phi, target.phi);
  assert.equal(retained.radius, test.footprint * 0.72 * target.baseScale);
  assert.ok(Math.abs(target.deliveryTheta - test.world[0]) < 1e-9);
  assert.ok(Math.abs(target.deliveryPhi - test.world[1]) < 1e-9);
  assert.deepEqual(target.marker.position.toArray(), test.local);
  const gap = navigation.obstacleGapAtSurfacePoint(
    sphericalPosition(target.deliveryTheta, target.deliveryPhi, 1).normalize(), retained,
  );
  assert.ok(gap > 0.5, `${test.kind}: handoff outside expanded collider`);
  assert.ok(navigation.obstacleGapAtSurfacePoint(
    sphericalPosition(target.theta, target.phi, 1).normalize(), retained,
  ) < -1, `${test.kind}: center remains solid`);
  if (test.kind === "station") {
    const clearance = polygonClearance(target.deliveryTheta, target.deliveryPhi, terminalPolygon);
    assert.ok(clearance > constants.RIDER_COLLISION_RADIUS,
      `Terminal handoff overlaps mapped building 9: clearance ${clearance}`);
    console.log(`Terminal mapped building 9 clearance: ${clearance.toFixed(6)} world units`);
  }
  const geometriesToDispose = new Set();
  const materialsToDispose = new Set([primary]);
  target.group.traverse((object) => {
    if (object.geometry) geometriesToDispose.add(object.geometry);
    if (object.material) {
      for (const item of Array.isArray(object.material) ? object.material : [object.material]) materialsToDispose.add(item);
    }
  });
  for (const geometry of geometriesToDispose) geometry.dispose();
  for (const item of materialsToDispose) item.dispose();
  console.log(`${test.kind}: real factory/registration, retained collider, marker and handoff clearance passed`);
}
