import assert from "node:assert/strict";
import * as THREE from "three";
import { createAlunAlunWestRoadsideFactory } from "../src/features/landmarks/alun-alun/west-roadside.js";
import { ALUN_ALUN_WEST_FRONTAGE_DEFINITION } from "../src/features/landmarks/alun-alun/traffic.js";

// Test actual fence meshes in Alun-Alun map coordinates (x=north, z=east).
// Only canvas sign painting and unrelated palms are stubbed. This checks
// sidewalk contact, not merely the absence of road intersections.
const materials = new Set();
const signMaterial = new THREE.MeshBasicMaterial();
const foliageMaterials = [new THREE.MeshToonMaterial(), new THREE.MeshToonMaterial()];
const rockMaterial = new THREE.MeshToonMaterial();
for (const material of [signMaterial, ...foliageMaterials, rockMaterial]) materials.add(material);
const factory = createAlunAlunWestRoadsideFactory({
  collections: { animatedStopDetails: [] },
  helpers: {
    addLocalPalm: () => new THREE.Group(),
    getSitubondoSignMaterial: () => signMaterial,
  },
  materials: { foliageMaterials, rockMaterial },
});
const root = new THREE.Group();
factory.addAlunAlunPostOffice(root);
factory.addAlunAlunWestRoadsideContext(root);
root.updateMatrixWorld(true);

const boundary = [...ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniSidewalkOuterBoundary]
  .sort((a, b) => a[1] - b[1]);
const tolerance = 1e-5;
const maximumContactGap = 0.002;
function boundaryNorth(east) {
  assert.ok(east >= boundary[0][1] - tolerance && east <= boundary.at(-1)[1] + tolerance,
    `Fence station ${east} lies outside the surveyed sidewalk boundary`);
  const segment = boundary.findIndex((point, index) => index < boundary.length - 1
    && east >= point[1] - tolerance && east <= boundary[index + 1][1] + tolerance);
  assert.ok(segment >= 0, `No sidewalk segment at east=${east}`);
  const [start, end] = [boundary[segment], boundary[segment + 1]];
  const fraction = (east - start[1]) / (end[1] - start[1]);
  return start[0] + fraction * (end[0] - start[0]);
}

const expectedFences = [
  { name: "Kantor Pos sidewalk-aligned fence", gate: [-0.06, 0.90] },
  { name: "Teras Pos sidewalk-aligned fence" },
  { name: "BICAU sidewalk-aligned fence", gate: [-13.17, -11.53] },
];
for (const { name, gate } of expectedFences) {
  const matches = [];
  root.traverse((object) => { if (object.name === name) matches.push(object); });
  assert.equal(matches.length, 1, `${name}: expected one named fence assembly`);
  let vertexCount = 0;
  let meshCount = 0;
  let minimumGap = Infinity;
  let maximumGap = -Infinity;
  let minimumEast = Infinity;
  let maximumEast = -Infinity;
  matches[0].traverse((mesh) => {
    if (!mesh.isMesh) return;
    meshCount += 1;
    const position = mesh.geometry?.getAttribute("position");
    assert.ok(position?.count > 0, `${name}: empty mesh`);
    const worldPositions = [];
    let memberMinimumGap = Infinity;
    for (let index = 0; index < position.count; index += 1) {
      const vertex = new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
      assert.ok(vertex.toArray().every(Number.isFinite), `${name}: nonfinite vertex`);
      const gap = vertex.x - boundaryNorth(vertex.z);
      assert.ok(gap >= -tolerance,
        `${name}: vertex intrudes onto sidewalk by ${(-gap * 5).toFixed(5)} metres at east=${vertex.z}`);
      minimumGap = Math.min(minimumGap, gap);
      memberMinimumGap = Math.min(memberMinimumGap, gap);
      maximumGap = Math.max(maximumGap, gap);
      minimumEast = Math.min(minimumEast, vertex.z);
      maximumEast = Math.max(maximumEast, vertex.z);
      worldPositions.push(vertex);
      vertexCount += 1;
    }
    assert.ok(memberMinimumGap <= maximumContactGap,
      `${name}: a fence member misses sidewalk contact by ${(memberMinimumGap * 5).toFixed(4)} metres`);
    if (gate) {
      const indices = mesh.geometry.index;
      const count = indices?.count ?? position.count;
      for (let index = 0; index < count; index += 3) {
        const east = [0, 1, 2].map((offset) => worldPositions[indices ? indices.getX(index + offset) : index + offset].z);
        // Testing triangle extents also catches a bar spanning a gate without
        // placing any of its vertices inside the opening.
        assert.ok(Math.max(...east) <= gate[0] + tolerance || Math.min(...east) >= gate[1] - tolerance,
          `${name}: fence triangle ${Math.min(...east).toFixed(6)}–${Math.max(...east).toFixed(6)} obstructs the preserved entrance ${gate.join(" to ")}`);
      }
    }
  });
  assert.ok(meshCount > 0 && vertexCount > 0, `${name}: missing fence geometry`);
  assert.ok(minimumGap <= maximumContactGap,
    `${name}: fence misses sidewalk contact by ${(minimumGap * 5).toFixed(4)} metres`);
  console.log(`${name}: ${meshCount} meshes, ${vertexCount} vertices; property-side gap ${(minimumGap * 5).toFixed(4)}–${(maximumGap * 5).toFixed(4)} m; east span ${minimumEast.toFixed(3)}–${maximumEast.toFixed(3)}${gate ? "; entrance clear" : ""}`);
}

// A fence can pass its contact checks while its booth remains tens of metres
// behind it. Guard the actual booth geometry independently of the fence.
const booth = root.getObjectByName("@BICAU STORY takeaway booth · Google Street View");
assert.ok(booth, "Missing BICAU booth");
let boothGap = Infinity;
for (const mesh of booth.children) {
  if (!mesh.isMesh) continue; // the fence is a separate child group
  const positions = mesh.geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positions, index)
      .applyMatrix4(mesh.matrixWorld);
    const gap = vertex.x - boundaryNorth(vertex.z);
    assert.ok(gap >= 0.1, "BICAU architecture must clear the sidewalk by at least 0.5 m");
    boothGap = Math.min(boothGap, gap);
  }
}
assert.ok(boothGap <= 0.6, "BICAU booth is too far behind its frontage (over 3 m)");
console.log(`BICAU architecture: nearest sidewalk setback ${(boothGap * 5).toFixed(2)} m`);

const geometries = new Set();
root.traverse((mesh) => {
  if (!mesh.isMesh) return;
  geometries.add(mesh.geometry);
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
});
for (const geometry of geometries) geometry.dispose();
for (const material of materials) material.dispose();
