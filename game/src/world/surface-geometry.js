import * as THREE from "three";
import {
  ACTUAL_CENTER_PHI,
  LOGICAL_CENTER_PHI,
  PLANET_RADIUS,
  ROAD_SURFACE_OFFSET,
  TOWN_CURVE_SCALE,
} from "../config/runtime.js";
import { sphericalPosition, surfaceFrame } from "./surface.js";

export function createSurfaceGeometryTools({ materials, world }) {
  const {
    roadCenterMaterial,
    roadEdgeMaterial,
    roadMaterial,
    sidewalkMaterial,
    situbondoCurbMaterial,
  } = materials;

  function makeSurfaceRibbon(points, width, lift, material) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const lateralSegments = 4;
    const rowSize = lateralSegments + 1;

    points.forEach((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const center = point.clone().setLength(point.length() + lift);
      const normal = center.clone().normalize();
      const tangent = next.clone().sub(previous).normalize();
      const lateral = new THREE.Vector3()
        .crossVectors(normal, tangent)
        .normalize();

      for (let column = 0; column < rowSize; column += 1) {
        const offset = THREE.MathUtils.lerp(
          width * 0.5,
          -width * 0.5,
          column / lateralSegments,
        );
        const vertex = center
          .clone()
          .addScaledVector(lateral, offset)
          .setLength(center.length());
        const vertexNormal = vertex.clone().normalize();
        positions.push(vertex.x, vertex.y, vertex.z);
        normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
        uvs.push(column / lateralSegments, index / (points.length - 1));
      }

      if (index < points.length - 1) {
        const row = index * rowSize;
        const nextRow = row + rowSize;
        for (let column = 0; column < lateralSegments; column += 1) {
          const current = row + column;
          const nextCurrent = nextRow + column;
          indices.push(
            current,
            current + 1,
            nextCurrent,
            current + 1,
            nextCurrent + 1,
            nextCurrent,
          );
        }
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const ribbon = new THREE.Mesh(geometry, material);
    ribbon.receiveShadow = true;
    return ribbon;
  }

  function offsetSurfacePoints(points, offset) {
    return points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const normal = point.clone().normalize();
      const tangent = next.clone().sub(previous).normalize();
      const lateral = new THREE.Vector3()
        .crossVectors(normal, tangent)
        .normalize();
      return point
        .clone()
        .addScaledVector(lateral, offset)
        .setLength(point.length());
    });
  }

  function makeInkLine(points, width = 0.38) {
    const group = new THREE.Group();
    const sidewalk = makeSurfaceRibbon(points, width + 0.34, 0, sidewalkMaterial);
    const road = makeSurfaceRibbon(points, width, 0.0016, roadMaterial);
    const lineOffset = width * 0.43;
    const leftEdge = makeSurfaceRibbon(
      offsetSurfacePoints(points, lineOffset),
      0.018,
      0.003,
      roadEdgeMaterial,
    );
    const rightEdge = makeSurfaceRibbon(
      offsetSurfacePoints(points, -lineOffset),
      0.018,
      0.003,
      roadEdgeMaterial,
    );
    const curbOffset = width * 0.56;
    const leftCurb = makeSurfaceRibbon(
      offsetSurfacePoints(points, curbOffset),
      0.045,
      0.0045,
      situbondoCurbMaterial,
    );
    const rightCurb = makeSurfaceRibbon(
      offsetSurfacePoints(points, -curbOffset),
      0.045,
      0.0045,
      situbondoCurbMaterial,
    );
    const centerDashes = makeSurfaceRibbon(
      points,
      0.018,
      0.0035,
      roadCenterMaterial,
    );
    group.add(
      sidewalk,
      road,
      leftEdge,
      rightEdge,
      leftCurb,
      rightCurb,
      centerDashes,
    );
    return group;
  }

  function makeRoute(
    phi,
    thetaStart,
    thetaEnd,
    radius = PLANET_RADIUS + ROAD_SURFACE_OFFSET,
  ) {
    const points = [];
    const segmentCount = Math.max(
      36,
      Math.ceil(Math.abs(thetaEnd - thetaStart) * 20),
    );
    for (let i = 0; i <= segmentCount; i += 1) {
      const t = i / segmentCount;
      const theta = THREE.MathUtils.lerp(thetaStart, thetaEnd, t);
      points.push(sphericalPosition(theta, phi, radius));
    }
    return makeInkLine(points, 0.4);
  }

  function makeMeridian(
    theta,
    phiStart,
    phiEnd,
    radius = PLANET_RADIUS + ROAD_SURFACE_OFFSET,
  ) {
    const points = [];
    for (let i = 0; i <= 72; i += 1) {
      const t = i / 72;
      const phi = THREE.MathUtils.lerp(phiStart, phiEnd, t);
      points.push(sphericalPosition(theta, phi, radius));
    }
    return makeInkLine(points, 0.36);
  }

  function makePatchGeometry(
    radius = 0.5,
    segments = 14,
    irregularity = 0.16,
    radialSegments = 1,
  ) {
    const positions = [0, 0, 0];
    const normals = [0, 1, 0];
    const indices = [];
    const safeRadialSegments = Math.max(1, Math.floor(radialSegments));
    const boundaryRadii = [];

    for (let i = 0; i < segments; i += 1) {
      const wobble =
        1 +
        Math.sin(i * 1.73 + radius * 5.1) * irregularity * 0.55 +
        Math.cos(i * 2.41 + radius * 2.3) * irregularity * 0.45;
      boundaryRadii.push(radius * wobble);
    }

    for (let ring = 1; ring <= safeRadialSegments; ring += 1) {
      const ringProgress = ring / safeRadialSegments;
      for (let i = 0; i < segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        const ringRadius = boundaryRadii[i] * ringProgress;
        positions.push(
          Math.cos(angle) * ringRadius,
          0,
          Math.sin(angle) * ringRadius,
        );
        normals.push(0, 1, 0);
      }
    }

    const ringIndex = (ring, segment) =>
      1 + (ring - 1) * segments + (segment % segments);

    for (let i = 0; i < segments; i += 1) {
      indices.push(0, ringIndex(1, i + 1), ringIndex(1, i));
    }

    for (let ring = 1; ring < safeRadialSegments; ring += 1) {
      for (let i = 0; i < segments; i += 1) {
        const next = (i + 1) % segments;
        indices.push(
          ringIndex(ring, i),
          ringIndex(ring, next),
          ringIndex(ring + 1, i),
          ringIndex(ring, next),
          ringIndex(ring + 1, next),
          ringIndex(ring + 1, i),
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function conformGeometryToPlanet(geometry, scaleX, scaleZ, lift = 0) {
    const positions = geometry.getAttribute("position");
    const surfaceRadius = PLANET_RADIUS + lift;

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index) * scaleX;
      const z = positions.getZ(index) * scaleZ;
      const lateralRadiusSq = Math.min(
        x * x + z * z,
        surfaceRadius * surfaceRadius,
      );
      const y =
        Math.sqrt(surfaceRadius * surfaceRadius - lateralRadiusSq) -
        surfaceRadius;
      positions.setXYZ(index, x, y, z);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function createSurfacePatch(
    theta,
    phi,
    radius,
    scaleX,
    scaleZ,
    material,
    yaw = 0,
    lift = 0.0012,
  ) {
    const patchSegments = radius > 2 ? 48 : 24;
    const radialSegments = radius > 2 ? 28 : 5;
    const geometry = makePatchGeometry(
      radius,
      patchSegments,
      0.16,
      radialSegments,
    );
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const { normal, east, north } = surfaceFrame(theta, phi);
    const forward = east
      .clone()
      .multiplyScalar(Math.cos(yaw))
      .addScaledVector(north, Math.sin(yaw))
      .normalize();
    const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
    const surfaceDirection = new THREE.Vector3();
    const surfaceSpherical = new THREE.Spherical();

    for (let index = 0; index < positions.count; index += 1) {
      const localX = positions.getX(index) * scaleX;
      const localZ = positions.getZ(index) * scaleZ;
      surfaceDirection
        .copy(normal)
        .addScaledVector(right, localX / PLANET_RADIUS)
        .addScaledVector(forward, localZ / PLANET_RADIUS)
        .normalize();
      surfaceSpherical.setFromVector3(surfaceDirection);
      const logicalTheta = surfaceSpherical.theta / TOWN_CURVE_SCALE;
      const logicalPhi =
        LOGICAL_CENTER_PHI +
        (surfaceSpherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
      const worldPosition = sphericalPosition(
        logicalTheta,
        logicalPhi,
        PLANET_RADIUS + lift,
      );
      positions.setXYZ(
        index,
        worldPosition.x,
        worldPosition.y,
        worldPosition.z,
      );
      normals.setXYZ(
        index,
        surfaceDirection.x,
        surfaceDirection.y,
        surfaceDirection.z,
      );
    }

    positions.needsUpdate = true;
    normals.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const patch = new THREE.Mesh(geometry, material);
    patch.receiveShadow = true;
    world.add(patch);
    return patch;
  }

  return {
    conformGeometryToPlanet,
    createSurfacePatch,
    makeInkLine,
    makeMeridian,
    makePatchGeometry,
    makeRoute,
    makeSurfaceRibbon,
    offsetSurfacePoints,
  };
}
