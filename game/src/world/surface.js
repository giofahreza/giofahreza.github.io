import * as THREE from "three";
import {
  ACTUAL_CENTER_PHI,
  GROUND_EPSILON,
  LOGICAL_CENTER_PHI,
  PLANET_RADIUS,
  TOWN_CURVE_SCALE,
} from "../config/runtime.js";

export function surfaceElevation(theta, phi) {
  // Keep the survey plane metrically neutral for this phase. Elevation can be
  // added from a DEM later without changing any road/building coordinates.
  void theta;
  void phi;
  return 0;
}

export function deformPlanetGeometry(geometry) {
  const positions = geometry.getAttribute("position");
  const spherical = new THREE.Spherical();
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    spherical.setFromVector3(vertex);
    const logicalTheta = spherical.theta / TOWN_CURVE_SCALE;
    const logicalPhi =
      LOGICAL_CENTER_PHI +
      (spherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
    vertex
      .normalize()
      .multiplyScalar(
        PLANET_RADIUS + surfaceElevation(logicalTheta, logicalPhi),
      );
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

export function sphericalPosition(
  theta,
  phi,
  radius = PLANET_RADIUS + GROUND_EPSILON,
) {
  const actualTheta = theta * TOWN_CURVE_SCALE;
  const actualPhi =
    ACTUAL_CENTER_PHI +
    (phi - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE;
  const elevation =
    radius > PLANET_RADIUS * 0.5 ? surfaceElevation(theta, phi) : 0;
  return new THREE.Vector3().setFromSphericalCoords(
    radius + elevation,
    actualPhi,
    actualTheta,
  );
}

export function surfaceFrame(theta, phi) {
  const normal = sphericalPosition(theta, phi, 1).normalize();
  const actualTheta = theta * TOWN_CURVE_SCALE;
  const east = new THREE.Vector3(
    Math.cos(actualTheta),
    0,
    -Math.sin(actualTheta),
  ).normalize();
  const north = new THREE.Vector3().crossVectors(normal, east).normalize();
  return { normal, east, north };
}

export function placeOnPlanet(object, theta, phi, lift = 0, yaw = 0) {
  const position = sphericalPosition(theta, phi, PLANET_RADIUS + lift);
  const { normal, east, north } = surfaceFrame(theta, phi);
  const forward = east
    .clone()
    .multiplyScalar(Math.cos(yaw))
    .addScaledVector(north, Math.sin(yaw))
    .normalize();
  const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  const matrix = new THREE.Matrix4().makeBasis(right, normal, forward);

  object.position.copy(position);
  object.quaternion.setFromRotationMatrix(matrix);
}

export function surfaceOffsetFromNormal(point, normal, target) {
  const normalDot = THREE.MathUtils.clamp(normal.dot(point), -1, 1);
  const angle = Math.acos(normalDot);
  target.copy(point).addScaledVector(normal, -normalDot);

  if (target.lengthSq() < 1e-20 || angle < 1e-10) {
    return target.set(0, 0, 0);
  }

  return target.normalize().multiplyScalar(angle * PLANET_RADIUS);
}

export function surfacePointFromOffset(normal, offset, target) {
  const distance = offset.length();
  if (distance < 0.000001) return target.copy(normal);

  const angle = distance / PLANET_RADIUS;
  return target
    .copy(normal)
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(offset, Math.sin(angle) / distance)
    .normalize();
}

export function surfaceSagitta(footprintRadius, radius = PLANET_RADIUS) {
  const clampedRadius = Math.min(footprintRadius, radius);
  return radius - Math.sqrt(radius * radius - clampedRadius * clampedRadius);
}
