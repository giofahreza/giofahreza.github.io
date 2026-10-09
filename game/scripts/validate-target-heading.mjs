import assert from "node:assert/strict";
import * as constants from "../src/config/runtime.js";
import { createMovementController } from "../src/player/movement.js";
import { createRiderState, createGameState, createTouchState } from "../src/state/game-state.js";
import { sphericalPosition, surfaceFrame } from "../src/world/surface.js";

const rider = createRiderState();
const stops = [{ theta: 0, phi: 0 }];
const movement = createMovementController({
  cameraRig: { followHeading: rider.heading, recenterTimer: 0 },
  constants: { ...constants, MAP_METERS_PER_WORLD_UNIT: 5, MAP_RADIUS_UNITS: 200 },
  gameState: createGameState(), getGeospatialWorld: () => null,
  keys: new Set(), navigation: { obstacles: [], surfaceTransitionIsBlocked: () => false },
  rider, stops, touchState: createTouchState(),
});
const angleError = (actual, expected) => Math.abs(Math.atan2(
  Math.sin(actual - expected), Math.cos(actual - expected),
));

// Retain the old algorithm in-memory to prove this suite detects the reported
// unit-sphere epsilon failure. It never replaces production source on disk.
function legacyHeading(stop) {
  const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
  const tangent = sphericalPosition(
    stop.deliveryTheta ?? stop.theta, stop.deliveryPhi ?? stop.phi, 1,
  ).sub(sphericalPosition(rider.theta, rider.phi, 1));
  tangent.addScaledVector(normal, -tangent.dot(normal));
  if (tangent.lengthSq() < 0.0001) return rider.heading;
  tangent.normalize();
  return Math.atan2(tangent.dot(north), tangent.dot(east));
}

let scenarios = 0;
let detectedLegacyFailures = 0;
function check(label, theta, phi, stop, expected, initialHeading = 0.37) {
  Object.assign(rider, { theta, phi, heading: initialHeading });
  stops[0] = stop;
  const actual = movement.headingTowardStop(0);
  assert.ok(Number.isFinite(actual), `${label}: finite heading`);
  // The flat local bearing oracle differs infinitesimally from the spherical
  // tangent at this scale. This tolerance is only 0.000573 degrees.
  assert.ok(angleError(actual, expected) < 1e-5,
    `${label}: expected ${expected}, got ${actual}`);
  if (angleError(legacyHeading(stop), expected) > 0.01) detectedLegacyFailures += 1;
  scenarios += 1;
}

for (const [theta, phi] of [[0, 0], [12, 12], [-23.71, 4.13]]) {
  for (const distance of [0.02, 1, 20]) {
    for (let direction = 0; direction < 8; direction += 1) {
      const heading = direction * Math.PI / 4;
      check(`origin(${theta},${phi}) distance${distance} direction${direction}`,
        theta, phi, {
          theta: theta + Math.cos(heading) * distance,
          phi: phi - Math.sin(heading) * distance,
        }, heading);
    }
  }
}
check("fresh spawn faces northwest", 12, 12, { theta: 0, phi: 0 }, 3 * Math.PI / 4, 0.65);
check("delivery coordinate pair overrides building center", 0, 0,
  { theta: -10, phi: 10, deliveryTheta: 4, deliveryPhi: -4 }, Math.PI / 4);
check("zero-valued delivery coordinates are not discarded", 3, 4,
  { theta: 50, phi: -50, deliveryTheta: 0, deliveryPhi: 0 }, Math.atan2(4, -3));
check("partial delivery theta uses base phi", 0, 0,
  { theta: -10, phi: -4, deliveryTheta: 4 }, Math.PI / 4);
check("partial delivery phi uses base theta", 0, 0,
  { theta: 4, phi: 10, deliveryPhi: -4 }, Math.PI / 4);
for (const [theta, phi] of [[0, 0], [12, 12], [-23.71, 4.13]]) {
  for (const heading of [-Math.PI, -0.8, 0, 2.6]) {
    check("coincident target retains rider heading", theta, phi, { theta, phi }, heading, heading);
  }
}
assert.ok(detectedLegacyFailures >= 70, "old algorithm must fail directional cases");
console.log(`Target-heading regression passed: ${scenarios} production-helper scenarios; old in-memory algorithm fails ${detectedLegacyFailures}. Cardinal/diagonal/near bearings, spawn, delivery offsets and coincident fallback covered.`);
