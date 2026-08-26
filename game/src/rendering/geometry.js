import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function roundedBox(width, height, depth, radius = 0.04, segments = 4) {
  const safeRadius = Math.max(
    0.001,
    Math.min(radius, width * 0.45, height * 0.45, depth * 0.45),
  );
  return new RoundedBoxGeometry(
    width,
    height,
    depth,
    segments,
    safeRadius,
  );
}

export function capsule(length, radius, capSegments = 5, radialSegments = 10) {
  return new THREE.CapsuleGeometry(
    radius,
    Math.max(0.001, length - radius * 2),
    capSegments,
    radialSegments,
  );
}

export function createGableRoofGeometry(width, depth, height) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const vertices = new Float32Array([
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    0, height, -halfDepth,
    -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth,
    0, height, halfDepth,
  ]);
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 3, 4, 0, 4, 1,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertices, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Float32Array(12), 2),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry.toNonIndexed();
}

export function createHippedRoofGeometry(
  width,
  depth,
  height,
  ridgeInset = depth * 0.52,
) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const ridgeHalfWidth = Math.max(0, halfWidth - ridgeInset);
  const vertices = new Float32Array([
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    halfWidth, 0, halfDepth,
    -halfWidth, 0, halfDepth,
    -ridgeHalfWidth, height, 0,
    ridgeHalfWidth, height, 0,
  ]);
  const indices = [
    0, 5, 1, 0, 4, 5,
    3, 2, 5, 3, 5, 4,
    0, 3, 4,
    1, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry.toNonIndexed();
}

export function mergeDirectMeshesByMaterial(group) {
  const buckets = new Map();
  const meshes = group.children.filter((child) => child.isMesh);

  meshes.forEach((mesh) => {
    mesh.updateMatrix();
    const key = mesh.material.uuid;
    if (!buckets.has(key)) {
      buckets.set(key, {
        material: mesh.material,
        geometries: [],
      });
    }
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    buckets.get(key).geometries.push(geometry.applyMatrix4(mesh.matrix));
  });

  meshes.forEach((mesh) => group.remove(mesh));
  buckets.forEach(({ material, geometries }) => {
    const geometry =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);
    const mergedMesh = new THREE.Mesh(geometry, material);
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;
    group.add(mergedMesh);
  });
}
