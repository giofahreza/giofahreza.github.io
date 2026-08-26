import * as THREE from "three";
import {
  sphericalPosition,
  surfaceFrame,
  surfaceOffsetFromNormal,
} from "../world/surface.js";

function localPointPolygonRelation(x, z, points, epsilon = 0.0001) {
  let inside = false;
  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index, index += 1
  ) {
    const [startX, startZ] = points[previous];
    const [endX, endZ] = points[index];
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;
    const projection =
      lengthSquared > 0
        ? THREE.MathUtils.clamp(
            ((x - startX) * deltaX + (z - startZ) * deltaZ) / lengthSquared,
            0,
            1,
          )
        : 0;
    if (
      Math.hypot(
        x - (startX + deltaX * projection),
        z - (startZ + deltaZ * projection),
      ) <= epsilon
    ) {
      return 0;
    }
    if (
      (startZ > z) !== (endZ > z) &&
      x < ((endX - startX) * (z - startZ)) / (endZ - startZ) + startX
    ) {
      inside = !inside;
    }
  }
  return inside ? 1 : -1;
}

export function createNavigationSystem({
  constants: {
    GROUND_EPSILON,
    MAP_METERS_PER_WORLD_UNIT,
    MAX_WALKABLE_STEP_HEIGHT,
    PLANET_RADIUS,
    RIDER_COLLISION_RADIUS,
  },
  getGeospatialWorld,
}) {
  const obstacles = [];
  const walkableSurfaces = [];
  const cameraCollisionMeshes = [];
  const buildingFootprints = [];
  const wireRoofClearances = [];

  const tempSurfacePoint = new THREE.Vector3();
  const tempSurfaceOffset = new THREE.Vector3();

  function addObstacle(theta, phi, radius, label = "") {
    obstacles.push({
      shape: "circle",
      theta,
      phi,
      radius,
      label,
      normal: sphericalPosition(theta, phi, 1).normalize(),
    });
  }

  function addBoxObstacle(theta, phi, width, depth, yaw = 0, label = "") {
    const { normal, east, north } = surfaceFrame(theta, phi);
    const forward = east
      .clone()
      .multiplyScalar(Math.cos(yaw))
      .addScaledVector(north, Math.sin(yaw))
      .normalize();
    const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
    const halfWidth = width * 0.5;
    const halfDepth = depth * 0.5;

    obstacles.push({
      shape: "box",
      theta,
      phi,
      radius: Math.hypot(halfWidth, halfDepth),
      halfWidth,
      halfDepth,
      label,
      normal,
      right,
      forward,
    });
  }

  function addWalkableBox(theta, phi, width, depth, height, yaw = 0, label = "") {
    const { normal, east, north } = surfaceFrame(theta, phi);
    const forward = east
      .clone()
      .multiplyScalar(Math.cos(yaw))
      .addScaledVector(north, Math.sin(yaw))
      .normalize();
    const right = new THREE.Vector3().crossVectors(normal, forward).normalize();

    walkableSurfaces.push({
      shape: "box",
      theta,
      phi,
      radius: Math.hypot(width, depth) * 0.5,
      halfWidth: width * 0.5,
      halfDepth: depth * 0.5,
      height,
      yaw,
      label,
      normal,
      right,
      forward,
      contains(localX, localZ) {
        return (
          Math.abs(localX) <= this.halfWidth + 0.0001 &&
          Math.abs(localZ) <= this.halfDepth + 0.0001
        );
      },
    });
  }

  function addWalkablePolygon(
    theta,
    phi,
    points,
    holes,
    liftOffset,
    yaw = 0,
    label = "",
  ) {
    const { normal, east, north } = surfaceFrame(theta, phi);
    const forward = east
      .clone()
      .multiplyScalar(Math.cos(yaw))
      .addScaledVector(north, Math.sin(yaw))
      .normalize();
    const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
    walkableSurfaces.push({
      shape: "polygon",
      theta,
      phi,
      radius: Math.max(...points.map(([x, z]) => Math.hypot(x, z))),
      points,
      holes,
      liftOffset,
      yaw,
      label,
      normal,
      right,
      forward,
      contains(localX, localZ) {
        return (
          localPointPolygonRelation(localX, localZ, this.points) >= 0 &&
          this.holes.every(
            (hole) => localPointPolygonRelation(localX, localZ, hole) <= 0,
          )
        );
      },
    });
  }

  function localNavigationPosition(stop, localX, localZ) {
    const yaw = stop.yaw ?? 0;
    const scale = stop.baseScale ?? stop.scale ?? 1;
    const east =
      (-Math.sin(yaw) * localX + Math.cos(yaw) * localZ) * scale;
    const north =
      (Math.cos(yaw) * localX + Math.sin(yaw) * localZ) * scale;
    return {
      theta: stop.theta + east,
      phi: stop.phi - north,
    };
  }

  function registerStopNavigation(stop) {
    const navigation = stop.group?.userData.navigation;
    if (!navigation) return false;

    const scale = stop.baseScale ?? 1;
    const yaw = stop.yaw ?? 0;
    const baseLift = stop.group.position.length() - PLANET_RADIUS;

    (navigation.surfaces ?? []).forEach((surface) => {
      const label =
        `${stop.shortName ?? stop.name}: ${surface.label ?? "surface"}`;
      if (surface.shape === "polygon") {
        addWalkablePolygon(
          stop.theta,
          stop.phi,
          surface.points.map(([x, z]) => [x * scale, z * scale]),
          (surface.holes ?? []).map((hole) =>
            hole.map(([x, z]) => [x * scale, z * scale]),
          ),
          surface.liftOffset * scale,
          yaw + (surface.yaw ?? 0),
          label,
        );
        return;
      }
      const position = localNavigationPosition(stop, surface.x, surface.z);
      addWalkableBox(
        position.theta,
        position.phi,
        surface.width * scale,
        surface.depth * scale,
        baseLift + surface.height * scale,
        yaw + (surface.yaw ?? 0),
        label,
      );
    });

    (navigation.obstacles ?? []).forEach((obstacle) => {
      const position = localNavigationPosition(stop, obstacle.x, obstacle.z);
      const label = `${stop.shortName ?? stop.name}: ${obstacle.label ?? "obstacle"}`;
      if (obstacle.shape === "circle") {
        addObstacle(
          position.theta,
          position.phi,
          obstacle.radius * scale,
          label,
        );
        return;
      }
      addBoxObstacle(
        position.theta,
        position.phi,
        obstacle.width * scale,
        obstacle.depth * scale,
        yaw + (obstacle.yaw ?? 0),
        label,
      );
    });

    if (navigation.deliveryTarget) {
      const target = navigation.deliveryTarget;
      const position = localNavigationPosition(stop, target.x, target.z);
      stop.deliveryTheta = position.theta;
      stop.deliveryPhi = position.phi;
      stop.marker.position.set(target.x, target.height ?? 0, target.z);
    }

    return true;
  }

  function mappedSurfaceLiftAt(theta, phi) {
    return getGeospatialWorld()?.userData.navigation?.surfaceLiftAt(
      theta * MAP_METERS_PER_WORLD_UNIT,
      -phi * MAP_METERS_PER_WORLD_UNIT,
    ) ?? GROUND_EPSILON;
  }

  function navigationSurfaceLiftAt(theta, phi) {
    const mappedLift = mappedSurfaceLiftAt(theta, phi);
    let lift = mappedLift;
    if (walkableSurfaces.length === 0) return lift;

    const surfacePoint = tempSurfacePoint
      .copy(sphericalPosition(theta, phi, 1))
      .normalize();

    walkableSurfaces.forEach((surface) => {
      const broadPhaseAngle =
        (surface.radius + RIDER_COLLISION_RADIUS) / PLANET_RADIUS;
      if (surfacePoint.angleTo(surface.normal) > broadPhaseAngle) return;

      const offset = surfaceOffsetFromNormal(
        surfacePoint,
        surface.normal,
        tempSurfaceOffset,
      );
      const localX = offset.dot(surface.right);
      const localZ = offset.dot(surface.forward);
      if (surface.contains(localX, localZ)) {
        const surfaceLift =
          surface.shape === "polygon"
            ? mappedLift + surface.liftOffset
            : surface.height;
        lift = Math.max(lift, surfaceLift);
      }
    });

    return lift;
  }

  function surfaceTransitionIsBlocked(
    previousTheta,
    previousPhi,
    nextTheta,
    nextPhi,
  ) {
    const previousLift = navigationSurfaceLiftAt(previousTheta, previousPhi);
    const nextLift = navigationSurfaceLiftAt(nextTheta, nextPhi);
    return Math.abs(nextLift - previousLift) > MAX_WALKABLE_STEP_HEIGHT;
  }

  function obstacleGapAtSurfacePoint(surfacePoint, obstacle) {
    if (obstacle.shape !== "box") {
      return (
        surfacePoint.angleTo(obstacle.normal) * PLANET_RADIUS -
        obstacle.radius -
        RIDER_COLLISION_RADIUS
      );
    }

    const offset = surfaceOffsetFromNormal(
      surfacePoint,
      obstacle.normal,
      tempSurfaceOffset,
    );
    const localX = offset.dot(obstacle.right);
    const localZ = offset.dot(obstacle.forward);
    const outsideX = Math.abs(localX) - obstacle.halfWidth;
    const outsideZ = Math.abs(localZ) - obstacle.halfDepth;
    const outsideDistance = Math.hypot(
      Math.max(outsideX, 0),
      Math.max(outsideZ, 0),
    );
    const insideDistance = Math.min(Math.max(outsideX, outsideZ), 0);
    return outsideDistance + insideDistance - RIDER_COLLISION_RADIUS;
  }

  function addBuildingFootprint(theta, phi, radius, height) {
    buildingFootprints.push({
      theta,
      phi,
      radius,
      height,
      normal: sphericalPosition(theta, phi, 1).normalize(),
    });
  }

  function addCameraCollider(object) {
    cameraCollisionMeshes.push(object);
  }

  function reset() {
    obstacles.length = 0;
    walkableSurfaces.length = 0;
    cameraCollisionMeshes.length = 0;
    buildingFootprints.length = 0;
    wireRoofClearances.length = 0;
  }

  return {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
    buildingFootprints,
    cameraCollisionMeshes,
    mappedSurfaceLiftAt,
    navigationSurfaceLiftAt,
    obstacleGapAtSurfacePoint,
    obstacles,
    registerStopNavigation,
    reset,
    surfaceTransitionIsBlocked,
    walkableSurfaces,
    wireRoofClearances,
  };
}
