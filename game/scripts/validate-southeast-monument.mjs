import assert from "node:assert/strict";
import * as THREE from "three";
import { createSoutheastMonument } from "../src/features/landmarks/alun-alun/southeast-monument.js";
import { ALUN_ALUN_TRUE_SOUTHEAST_JUNCTION_DEFINITION as junction } from "../src/features/landmarks/alun-alun/traffic.js";

const definition = junction.monument;
const material = new THREE.MeshBasicMaterial();
const root = createSoutheastMonument({
  definition,
  roadSurfaceY: junction.roadSurfaceY,
  materials: Object.fromEntries(["terracotta", "cream", "green", "gold", "soil"].map(name => [name, material])),
});
root.updateMatrixWorld(true);
const inverse = root.matrixWorld.clone().invert();
const epsilon = 1e-7;
const bounds = new Map();
let vertexCount = 0;
root.traverse(mesh => {
  if (!mesh.isMesh) return;
  const box = new THREE.Box3();
  const transform = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
  const positions = mesh.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform);
    assert.ok([vertex.x, vertex.y, vertex.z].every(Number.isFinite), `${mesh.name}: finite vertex`);
    assert.ok(Math.abs(vertex.x) <= definition.collisionWidth / 2 + epsilon, `${mesh.name}: collision north extent`);
    assert.ok(Math.abs(vertex.z) <= definition.collisionDepth / 2 + epsilon, `${mesh.name}: collision east extent`);
    assert.ok(vertex.y >= junction.roadSurfaceY - epsilon, `${mesh.name}: above road`);
    assert.ok(vertex.y <= definition.visualHeight + epsilon, `${mesh.name}: below declared top`);
    box.expandByPoint(vertex);
    vertexCount += 1;
  }
  bounds.set(mesh.name, box);
});
const near = (a, b, label) => assert.ok(Math.abs(a - b) < epsilon, `${label}: ${a} != ${b}`);
near(bounds.get("island base").min.y, junction.roadSurfaceY, "grounded base");
near(bounds.get("island base").max.y, bounds.get("island soil").min.y, "soil touches base");
near(bounds.get("monument finial").max.y, definition.visualHeight, "declared height is actual mesh top");
for (const [below, above] of [
  ["island base", "island curb 1"],
  ["island soil", "monument plinth"],
  ["monument plinth", "monument column"],
  ["monument column", "monument capital"],
  ["monument capital", "monument finial"],
]) {
  assert.ok(bounds.get(below).max.y >= bounds.get(above).min.y - epsilon, `${above}: supported by ${below}`);
}
for (let index = 0; index < definition.curbBlocks; index += 1) {
  const angle = index / definition.curbBlocks * Math.PI * 2;
  const curb = root.getObjectByName(`island curb ${index + 1}`);
  const tangent = new THREE.Vector3(-definition.islandWidth * Math.sin(angle), 0,
    definition.islandDepth * Math.cos(angle)).normalize();
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(curb.quaternion);
  near(axis.dot(tangent), 1, `curb ${index + 1} ellipse tangent`);
}
near(root.position.x, definition.center[0], "north placement");
near(root.position.z, definition.center[1], "east placement");
near(root.rotation.y, definition.yaw, "island orientation");
console.log(`Southeast monument: ${bounds.size} meshes / ${vertexCount} vertices grounded, supported, tangent-aligned and collision-contained. Visual likeness is not asserted.`);
