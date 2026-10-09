import assert from "node:assert/strict";
import * as constants from "../src/config/runtime.js";
import { createMovementController } from "../src/player/movement.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { createGameState, createRiderState, createTouchState } from "../src/state/game-state.js";

// Exercise the actual spherical collision solver, not just static gap queries.
// This isolates circular obstacles from mapped buildings and raised floors.
const runtimeConstants = { ...constants, MAP_METERS_PER_WORLD_UNIT: 5, MAP_RADIUS_UNITS: 200 };
let scenarios = 0;
for (const [theta, phi, obstacleRadius] of [[4.7, 4.8, 1.24], [0, 0, 0.34]]) {
  for (const speed of [constants.WALK_SPEED, constants.RUN_SPEED]) {
    for (const delta of [0.016, 0.08]) {
      for (let direction = 0; direction < 8; direction += 1) {
        const angle = direction * Math.PI / 4;
        const radius = obstacleRadius + constants.RIDER_COLLISION_RADIUS;
        const startRadius = radius + 0.04;
        const rider = createRiderState();
        Object.assign(rider, {
          theta: theta + Math.cos(angle) * startRadius,
          phi: phi + Math.sin(angle) * startRadius,
          // Heading is east=0, north=PI/2, while phi increases south.
          heading: Math.atan2(Math.sin(angle), -Math.cos(angle)),
          speed,
        });
        const navigation = createNavigationSystem({
          constants: runtimeConstants, getGeospatialWorld: () => null,
        });
        navigation.addObstacle(theta, phi, obstacleRadius, "radial regression fixture");
        const movement = createMovementController({
          cameraRig: { followHeading: rider.heading, recenterTimer: 0 },
          constants: runtimeConstants, gameState: createGameState(),
          getGeospatialWorld: () => null, keys: new Set(), navigation,
          rider, stops: [], touchState: createTouchState(),
        });
        const label = `center(${theta},${phi}) radius${obstacleRadius} speed${speed} dt${delta} direction${direction}`;
        let collided = false;
        const frames = Math.ceil(0.5 / delta);
        for (let frame = 0; frame < frames; frame += 1) {
          const previousTheta = rider.theta;
          const previousPhi = rider.phi;
          movement.stepRider(delta);
          const displacement = Math.hypot(rider.theta - previousTheta, rider.phi - previousPhi);
          assert.ok(displacement <= speed * delta + 0.002,
            `${label}: correction jumped ${displacement}, beyond allowed step ${speed * delta}`);
          const radialX = rider.theta - theta;
          const radialY = rider.phi - phi;
          const actualRadius = Math.hypot(radialX, radialY);
          assert.ok(actualRadius >= radius - 0.002, `${label}: rider entered solid circle`);
          assert.ok(actualRadius <= startRadius + 0.002, `${label}: outward collision launch`);
          const lateral = -Math.sin(angle) * radialX + Math.cos(angle) * radialY;
          assert.ok(Math.abs(lateral) < 0.002,
            `${label}: radial approach jumped tangentially by ${lateral}`);
          assert.ok(radialX * Math.cos(angle) + radialY * Math.sin(angle) > 0,
            `${label}: collision transported rider to opposite side`);
          collided ||= rider.collisionActive;
        }
        assert.ok(collided, `${label}: real movement reached collision boundary`);
        assert.ok(Math.abs(Math.hypot(rider.theta - theta, rider.phi - phi) - radius) < 0.002,
          `${label}: final stop matches circle plus player radius`);
        // An already valid resting pose must not drift when no motion is requested.
        const restTheta = rider.theta;
        const restPhi = rider.phi;
        rider.speed = 0;
        for (let frame = 0; frame < 10; frame += 1) movement.stepRider(delta);
        assert.ok(Math.hypot(rider.theta - restTheta, rider.phi - restPhi) < 1e-6,
          `${label}: standstill drift`);
        assert.equal(rider.collisionActive, false, `${label}: standstill is not an active push`);
        scenarios += 1;
      }
    }
  }
}
console.log(`Circle movement regression passed: ${scenarios} real walk/run radial approaches, two frame sizes, eight directions, fountain and generic centers; no tangential jump, penetration, launch or standstill drift.`);
