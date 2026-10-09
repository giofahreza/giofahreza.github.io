import assert from "node:assert/strict";
import * as THREE from "three";
import { createAlunAlunWestRoadsideFactory } from "../src/features/landmarks/alun-alun/west-roadside.js";
import { ALUN_ALUN_WEST_FRONTAGE_DEFINITION } from "../src/features/landmarks/alun-alun/traffic.js";
import { FOUNDATION_SINK, PLANET_RADIUS } from "../src/config/runtime.js";
import { surfaceSagitta } from "../src/world/surface.js";

// Build production geometry (including the office's material batching). Only
// canvas sign painting and unrelated palm artwork are stubbed.
const material = new THREE.MeshBasicMaterial();
const root = new THREE.Group();
const factory = createAlunAlunWestRoadsideFactory({
  collections: { animatedStopDetails: [] },
  helpers: { addLocalPalm: () => new THREE.Group(), getSitubondoSignMaterial: () => material },
  materials: { foliageMaterials: [material, material], rockMaterial: material },
});
const office = factory.addAlunAlunPostOffice(root);
root.updateMatrixWorld(true);
const garden = root.getObjectByName("Kantor Pos grounded garden decorations");
assert.ok(garden, "actual constructor must retain the garden group after batching");
assert.equal(garden.children.length, 7, "repair must not add a fabricated support slab");
const close = (actual, expected, message, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
close(office.position.x, 25.1, "office north unchanged");
close(office.position.z, 0.42, "office east unchanged");
close(office.position.y, 0.05, "office foundation unchanged");
function named(name) {
  const object = garden.getObjectByName(name);
  assert.ok(object?.isMesh, `missing actual mesh ${name}`);
  return object;
}
const bounds = (mesh) => new THREE.Box3().setFromObject(mesh);
const apron = ALUN_ALUN_WEST_FRONTAGE_DEFINITION.propertyAprons.find((item) => item.id === "post-office-entry");
assert.ok(apron, "existing gated paving is the second rock's support");
function insideApron(north, east) {
  let inside = false;
  for (let i = 0, j = apron.outline.length - 1; i < apron.outline.length; j = i++) {
    const a = apron.outline[i], b = apron.outline[j];
    if ((a[1] > east) !== (b[1] > east)
      && north < (b[0] - a[0]) * (east - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
// Invert the real survey sphere into the Alun root's tangent coordinates.
// Allow 0.002 world units (1 cm) embed for curvature/tessellation; never a gap.
const rootLift = -surfaceSagitta(25) - FOUNDATION_SINK;
function yardHeight(north, east) {
  return Math.sqrt((PLANET_RADIUS + 0.006) ** 2 - north ** 2 - east ** 2)
    - PLANET_RADIUS - rootLift;
}
for (const [name, north, east, paved] of [
  ["Postal garden name wall", 22.17, 0, false],
  ["Postal garden planter", 22.26, -1.28, false],
  ["Postal garden rock 1", 22.16, -0.76, false],
  ["Postal garden rock 2", 22.12, 0.74, true],
  ["Postal garden rock 3", 22.22, 1.14, false],
]) {
  const box = bounds(named(name));
  const center = box.getCenter(new THREE.Vector3());
  close(center.x, north, `${name} preserved north`);
  close(center.z, east, `${name} preserved east`);
  if (name !== "Postal garden name wall") assert.equal(insideApron(north, east), paved, `${name} support type`);
  const support = paved ? apron.height : yardHeight(north, east);
  const gap = box.min.y - support;
  assert.ok(gap >= -0.002 && gap <= 1e-5, `${name} bottom gap ${gap} must be flush/slightly embedded`);
  console.log(`${name}: support=${paved ? "existing paving" : "survey yard"}, gap=${gap.toFixed(6)}`);
}
const sign = bounds(named("Postal garden name wall"));
close(sign.max.y, 0.38, "name-wall top preserved");
close(sign.max.x - sign.min.x, 0.18, "name-wall thickness preserved");
close(sign.max.z - sign.min.z, 1.42, "name-wall span preserved");
const label = garden.children.find((mesh) => mesh.geometry?.type === "PlaneGeometry");
assert.ok(label, "lettering preserved");
close(label.position.x, -3.035, "label north preserved");
close(label.position.y, 0.2, "label height preserved");
close(label.position.z, -0.42, "label east preserved");
close(label.rotation.y, -Math.PI / 2, "label orientation preserved");
const shrubs = garden.children.find((mesh) => mesh.geometry?.type === "SphereGeometry");
assert.ok(shrubs, "planter foliage preserved");
const shrubBox = bounds(shrubs), planterBox = bounds(named("Postal garden planter"));
assert.ok(shrubBox.min.y < planterBox.max.y && shrubBox.max.y > planterBox.max.y,
  "foliage must intersect planter rim rather than float above it");
close(shrubBox.getCenter(new THREE.Vector3()).x, 22.26, "foliage north preserved");
close(shrubBox.getCenter(new THREE.Vector3()).z, -1.28, "foliage east preserved");
const geometries = new Set(), materials = new Set([material]);
root.traverse((mesh) => {
  if (!mesh.isMesh) return;
  geometries.add(mesh.geometry);
  for (const value of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(value);
});
for (const geometry of geometries) geometry.dispose();
for (const value of materials) value.dispose();
console.log("Postal garden regression passed: real geometry grounded, sign top/lettering retained, no extra slab.");
