import * as THREE from "three";
import {
  sphericalPosition,
  surfaceFrame,
  surfaceOffsetFromNormal,
  surfacePointFromOffset,
} from "../world/surface.js";

export function createMovementController({
  cameraRig,
  constants: {
    ACTUAL_CENTER_PHI,
    DEADZONE,
    DEV_FAST_RUN_SPEED,
    LOGICAL_CENTER_PHI,
    LOGICAL_THETA_PERIOD,
    MAP_METERS_PER_WORLD_UNIT,
    MAP_RADIUS_UNITS,
    MAX_NAVIGATION_SUBSTEP,
    PLANET_RADIUS,
    RIDER_COLLISION_RADIUS,
    RUN_SPEED,
    TOWN_CURVE_SCALE,
    TOWN_DISTANCE_SCALE,
    TURN_SPEED,
    WALK_SPEED,
  },
  gameState,
  getGeospatialWorld,
  keys,
  navigation: {
    obstacles,
    surfaceTransitionIsBlocked,
  },
  rider,
  stops,
  touchState,
}) {
  const tempVector = new THREE.Vector3();
  const tempVector2 = new THREE.Vector3();
  const tempVector3 = new THREE.Vector3();
  const tempVector4 = new THREE.Vector3();
  const tempVector5 = new THREE.Vector3();
  const tempVector6 = new THREE.Vector3();
  const tempVector7 = new THREE.Vector3();
  const tempVector8 = new THREE.Vector3();
  const tempVector9 = new THREE.Vector3();
  const tempVector10 = new THREE.Vector3();
  const tempSpherical = new THREE.Spherical();

  function getHeadingTangent(heading = rider.heading) {
    const { east, north } = surfaceFrame(rider.theta, rider.phi);
    return tempVector
      .copy(east)
      .multiplyScalar(Math.cos(heading))
      .addScaledVector(north, Math.sin(heading))
      .normalize();
  }
  
  function shortestAngleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }
  
  function headingTowardStop(stopIndex) {
    const stop = stops[stopIndex];
    const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
    const targetPosition = sphericalPosition(
      stop.deliveryTheta ?? stop.theta,
      stop.deliveryPhi ?? stop.phi,
      1,
    );
    const origin = sphericalPosition(rider.theta, rider.phi, 1);
    const tangentToTarget = tempVector3.copy(targetPosition).sub(origin);
    tangentToTarget.addScaledVector(normal, -tangentToTarget.dot(normal));
  
    if (tangentToTarget.lengthSq() < 0.0001) return rider.heading;
  
    tangentToTarget.normalize();
    return Math.atan2(tangentToTarget.dot(north), tangentToTarget.dot(east));
  }
  
  function getMovementInput() {
    const keyboardX =
      Number(keys.has("ArrowRight") || keys.has("KeyD")) -
      Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    const keyboardY =
      Number(keys.has("ArrowUp") || keys.has("KeyW")) -
      Number(keys.has("ArrowDown") || keys.has("KeyS"));
    const x = THREE.MathUtils.clamp(touchState.analogX + keyboardX, -1, 1);
    const y = THREE.MathUtils.clamp(-touchState.analogY + keyboardY, -1, 1);
    const magnitude = Math.min(1, Math.hypot(x, y));
  
    if (magnitude < DEADZONE) {
      return { x: 0, y: 0, magnitude: 0, active: false };
    }
  
    const linearMagnitude = (magnitude - DEADZONE) / (1 - DEADZONE);
    const scaledMagnitude = Math.pow(linearMagnitude, 1.18);
    const inputScale = scaledMagnitude / magnitude;
  
    return {
      x: x * inputScale,
      y: y * inputScale,
      magnitude: scaledMagnitude,
      active: true,
    };
  }
  
  function applyDirectMovement(input, delta) {
    const brake = keys.has("Space") || touchState.brake;
    if (!input.active || brake) {
      if (rider.inputActive) cameraRig.recenterTimer = 0;
      rider.inputActive = false;
      rider.moveX = 0;
      rider.moveY = 0;
      rider.turn = THREE.MathUtils.damp(
        rider.turn,
        0,
        brake ? 20 : 16,
        delta,
      );
      rider.speed = THREE.MathUtils.damp(
        rider.speed,
        0,
        brake ? 20 : 14.5,
        delta,
      );
      return;
    }
  
    gameState.controlHintTime = 0;
    rider.inputActive = true;
    cameraRig.recenterTimer = 0;
    rider.moveX = input.x;
    rider.moveY = input.y;
    rider.controlHeading = cameraRig.followHeading;
    rider.desiredHeading =
      rider.controlHeading - Math.atan2(input.x, input.y);
  
    const headingError = shortestAngleDelta(
      rider.heading,
      rider.desiredHeading,
    );
    const maxTurnStep =
      TURN_SPEED * (0.82 + input.magnitude * 0.18) * delta;
    const turnStep = THREE.MathUtils.clamp(
      headingError,
      -maxTurnStep,
      maxTurnStep,
    );
    rider.heading += turnStep;
  
    const normalizedTurn =
      maxTurnStep > 0.000001 ? turnStep / maxTurnStep : 0;
    rider.turn = THREE.MathUtils.damp(
      rider.turn,
      normalizedTurn,
      20,
      delta,
    );
  
    const running = touchState.run || keys.has("ShiftLeft") || keys.has("ShiftRight");
    const configuredRunSpeed =
      gameState.devMode && gameState.runSpeedMode === "fast"
        ? DEV_FAST_RUN_SPEED
        : RUN_SPEED;
    const targetSpeed =
      (running ? configuredRunSpeed : WALK_SPEED) * input.magnitude;
    const speedResponse =
      targetSpeed > rider.speed ? 8.2 : 11.5;
  
    rider.speed = THREE.MathUtils.damp(
      rider.speed,
      targetSpeed,
      speedResponse,
      delta,
    );
  }
  
  function angularDistance(aTheta, aPhi, bTheta, bPhi) {
    const eastWest = (bTheta - aTheta) * TOWN_DISTANCE_SCALE;
    const northSouth = (bPhi - aPhi) * TOWN_DISTANCE_SCALE;
    return Math.hypot(eastWest, northSouth) / PLANET_RADIUS;
  }
  
  function wrapRiderTheta() {
    const halfPeriod = LOGICAL_THETA_PERIOD * 0.5;
    if (rider.theta > halfPeriod) rider.theta -= LOGICAL_THETA_PERIOD;
    if (rider.theta < -halfPeriod) rider.theta += LOGICAL_THETA_PERIOD;
  }
  
  function clampSurfacePointToPlayable(surfacePoint) {
    tempSpherical.setFromVector3(surfacePoint.normalize());
    const logicalTheta = tempSpherical.theta / TOWN_CURVE_SCALE;
    const logicalPhi =
      LOGICAL_CENTER_PHI +
      (tempSpherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
    const logicalDistance = Math.hypot(logicalTheta, logicalPhi);
  
    if (logicalDistance <= MAP_RADIUS_UNITS) return false;
  
    const boundaryScale = MAP_RADIUS_UNITS / logicalDistance;
    const clampedLogicalTheta = logicalTheta * boundaryScale;
    const clampedLogicalPhi = logicalPhi * boundaryScale;
    const clampedActualPhi =
      ACTUAL_CENTER_PHI +
      (clampedLogicalPhi - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE;
    surfacePoint
      .setFromSphericalCoords(
        1,
        clampedActualPhi,
        clampedLogicalTheta * TOWN_CURVE_SCALE,
      )
      .normalize();
    return true;
  }
  
  function setHeadingFromTangent(tangent) {
    const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
    const projected = tempVector2.copy(tangent).addScaledVector(normal, -tangent.dot(normal));
  
    if (projected.lengthSq() < 0.000001) return;
  
    projected.normalize();
    rider.heading = Math.atan2(projected.dot(north), projected.dot(east));
  }
  
  function setRiderFromSurfacePoint(surfacePoint) {
    const hitBoundary = clampSurfacePointToPlayable(surfacePoint);
    tempSpherical.setFromVector3(surfacePoint);
    rider.theta = tempSpherical.theta / TOWN_CURVE_SCALE;
    rider.phi =
      LOGICAL_CENTER_PHI +
      (tempSpherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
    wrapRiderTheta();
    return hitBoundary;
  }
  
  function resolveObstacleCollisions(previousTheta, previousPhi) {
    const mappedResolution = getGeospatialWorld()?.userData.navigation?.resolveBuildingCollision(
      rider.theta * MAP_METERS_PER_WORLD_UNIT,
      -rider.phi * MAP_METERS_PER_WORLD_UNIT,
      RIDER_COLLISION_RADIUS * MAP_METERS_PER_WORLD_UNIT,
      previousTheta * MAP_METERS_PER_WORLD_UNIT,
      -previousPhi * MAP_METERS_PER_WORLD_UNIT,
    );
    if (mappedResolution?.collided) {
      rider.theta = mappedResolution.eastMeters / MAP_METERS_PER_WORLD_UNIT;
      rider.phi = -mappedResolution.northMeters / MAP_METERS_PER_WORLD_UNIT;
    }
    const surfacePoint = tempVector3
      .copy(sphericalPosition(rider.theta, rider.phi, 1))
      .normalize();
    const previousPoint = tempVector4
      .copy(sphericalPosition(previousTheta, previousPhi, 1))
      .normalize();
    let collided = mappedResolution?.collided ?? false;
  
    for (let pass = 0; pass < 4; pass += 1) {
      let changed = false;
  
      obstacles.forEach((obstacle) => {
        const angle = surfacePoint.angleTo(obstacle.normal);
        const broadPhaseAngle =
          (obstacle.radius + RIDER_COLLISION_RADIUS) / PLANET_RADIUS;
  
        if (angle >= broadPhaseAngle) return;
  
        if (obstacle.shape === "box") {
          const offset = surfaceOffsetFromNormal(
            surfacePoint,
            obstacle.normal,
            tempVector8,
          );
          const localX = offset.dot(obstacle.right);
          const localZ = offset.dot(obstacle.forward);
          const closestX = THREE.MathUtils.clamp(
            localX,
            -obstacle.halfWidth,
            obstacle.halfWidth,
          );
          const closestZ = THREE.MathUtils.clamp(
            localZ,
            -obstacle.halfDepth,
            obstacle.halfDepth,
          );
          const deltaX = localX - closestX;
          const deltaZ = localZ - closestZ;
          const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
  
          if (distanceSquared >= RIDER_COLLISION_RADIUS ** 2) return;
  
          let correctedX;
          let correctedZ;
          if (distanceSquared > 0.0000001) {
            const correctionScale =
              RIDER_COLLISION_RADIUS / Math.sqrt(distanceSquared);
            correctedX = closestX + deltaX * correctionScale;
            correctedZ = closestZ + deltaZ * correctionScale;
          } else {
            const distanceToXFace =
              obstacle.halfWidth + RIDER_COLLISION_RADIUS - Math.abs(localX);
            const distanceToZFace =
              obstacle.halfDepth + RIDER_COLLISION_RADIUS - Math.abs(localZ);
            const previousOffset = surfaceOffsetFromNormal(
              previousPoint,
              obstacle.normal,
              tempVector10,
            );
  
            correctedX = localX;
            correctedZ = localZ;
            if (distanceToXFace < distanceToZFace) {
              const side =
                Math.sign(localX) ||
                Math.sign(previousOffset.dot(obstacle.right)) ||
                1;
              correctedX = side *
                (obstacle.halfWidth + RIDER_COLLISION_RADIUS);
            } else {
              const side =
                Math.sign(localZ) ||
                Math.sign(previousOffset.dot(obstacle.forward)) ||
                1;
              correctedZ = side *
                (obstacle.halfDepth + RIDER_COLLISION_RADIUS);
            }
          }
  
          tempVector9
            .copy(obstacle.right)
            .multiplyScalar(correctedX)
            .addScaledVector(obstacle.forward, correctedZ);
          surfacePointFromOffset(obstacle.normal, tempVector9, surfacePoint);
          changed = true;
          collided = true;
          return;
        }
  
        const minAngle = broadPhaseAngle;
  
        const pushDirection = tempVector5
          .copy(surfacePoint)
          .addScaledVector(obstacle.normal, -surfacePoint.dot(obstacle.normal));
  
        if (pushDirection.lengthSq() < 0.000001) {
          pushDirection
            .copy(surfacePoint)
            .sub(previousPoint)
            .addScaledVector(obstacle.normal, -pushDirection.dot(obstacle.normal));
        }
  
        if (pushDirection.lengthSq() < 0.000001) {
          pushDirection.copy(surfaceFrame(obstacle.theta, obstacle.phi).east);
        }
  
        pushDirection.normalize();
        surfacePoint
          .copy(obstacle.normal)
          .multiplyScalar(Math.cos(minAngle))
          .addScaledVector(pushDirection, Math.sin(minAngle))
          .normalize();
        changed = true;
        collided = true;
      });
  
      if (!changed) break;
    }
  
    if (collided) {
      setRiderFromSurfacePoint(surfacePoint);
    }
  
    if (
      surfaceTransitionIsBlocked(
        previousTheta,
        previousPhi,
        rider.theta,
        rider.phi,
      )
    ) {
      rider.theta = previousTheta;
      rider.phi = previousPhi;
      collided = true;
    }
  
    return collided;
  }
  
  function stepRider(delta) {
    const movementStart = tempVector6
      .copy(sphericalPosition(rider.theta, rider.phi, 1))
      .normalize();
    const linearMovement = rider.speed * delta;
    rider.collisionActive = false;
  
    if (Math.abs(linearMovement) > 0.000001) {
      const substeps = Math.max(
        1,
        Math.ceil(Math.abs(linearMovement) / MAX_NAVIGATION_SUBSTEP),
      );
      const stepDistance = linearMovement / substeps;
  
      for (let step = 0; step < substeps; step += 1) {
        const previousTheta = rider.theta;
        const previousPhi = rider.phi;
        const angularStep = stepDistance / PLANET_RADIUS;
        const startPoint = tempVector3
          .copy(sphericalPosition(rider.theta, rider.phi, 1))
          .normalize();
        const { east, north } = surfaceFrame(rider.theta, rider.phi);
        const tangent = tempVector
          .copy(east)
          .multiplyScalar(Math.cos(rider.heading))
          .addScaledVector(north, Math.sin(rider.heading))
          .normalize();
        const nextPoint = tempVector4
          .copy(startPoint)
          .multiplyScalar(Math.cos(angularStep))
          .addScaledVector(tangent, Math.sin(angularStep))
          .normalize();
        const hitBoundary = setRiderFromSurfacePoint(nextPoint);
        const transportedHeading = tempVector5
          .copy(tangent)
          .addScaledVector(nextPoint, -tangent.dot(nextPoint));
  
        setHeadingFromTangent(transportedHeading);
  
        if (hitBoundary) {
          gameState.boundaryNoticeTime = 4.2;
          rider.speed *= 0.18;
          break;
        }
  
        if (resolveObstacleCollisions(previousTheta, previousPhi)) {
          rider.collisionActive = true;
        }
      }
    } else {
      const currentPoint = tempVector3
        .copy(sphericalPosition(rider.theta, rider.phi, 1))
        .normalize();
      if (setRiderFromSurfacePoint(currentPoint)) {
        rider.speed = 0;
      }
    }
  
    const movementEnd = tempVector7
      .copy(sphericalPosition(rider.theta, rider.phi, 1))
      .normalize();
    rider.actualSpeed =
      delta > 0.000001
        ? (movementStart.angleTo(movementEnd) * PLANET_RADIUS) / delta
        : 0;
  }

  return {
    angularDistance,
    applyDirectMovement,
    getHeadingTangent,
    getMovementInput,
    headingTowardStop,
    shortestAngleDelta,
    stepRider,
  };
}
