import * as THREE from "three";
import { roundedBox } from "../../../rendering/geometry.js";

// This preserves the existing provisional monument silhouette. Its location
// and architectural likeness still require photographic survey; geometry
// validation establishes only grounding and collision containment.
export function createSoutheastMonument({ definition, roadSurfaceY, materials }) {
  const monument = new THREE.Group();
  monument.name = "True south-east compact junction monument";
  monument.position.set(definition.center[0], 0, definition.center[1]);
  monument.rotation.y = definition.yaw;
  const add = (name, geometry, material, y) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    monument.add(mesh);
    return mesh;
  };

  // Extend downward to the road without changing the former upper surface.
  const base = add("island base", new THREE.CylinderGeometry(0.5, 0.5, 0.0675, 24),
    materials.terracotta, roadSurfaceY + 0.03375);
  base.scale.set(definition.islandWidth, 1, definition.islandDepth);
  for (let index = 0; index < definition.curbBlocks; index += 1) {
    const angle = index / definition.curbBlocks * Math.PI * 2;
    const curb = add(`island curb ${index + 1}`, roundedBox(0.12, 0.055, 0.07, 0.009),
      index % 2 === 0 ? materials.cream : materials.terracotta,
      roadSurfaceY + 0.085);
    curb.position.x = Math.cos(angle) * definition.islandWidth * 0.48;
    curb.position.z = Math.sin(angle) * definition.islandDepth * 0.48;
    // Box local +X follows the ellipse derivative, not its radial vector.
    curb.rotation.y = -Math.atan2(
      definition.islandDepth * Math.cos(angle),
      -definition.islandWidth * Math.sin(angle),
    );
  }
  // Retain the soil's top level while filling the former gap under it.
  const soil = add("island soil", new THREE.CylinderGeometry(0.5, 0.5, 0.055, 24),
    materials.soil, roadSurfaceY + 0.095);
  soil.scale.set(definition.islandWidth * 0.72, 1, definition.islandDepth * 0.72);
  add("monument plinth", new THREE.CylinderGeometry(0.13, 0.16, 0.16, 12), materials.cream, 0.22);
  add("monument column", roundedBox(0.14, 0.36, 0.12, 0.025), materials.green, 0.46);
  add("monument capital", roundedBox(0.22, 0.075, 0.18, 0.018), materials.cream, 0.665);
  add("monument finial", new THREE.SphereGeometry(0.055, 10, 7),
    materials.gold, definition.visualHeight - 0.055);
  return monument;
}
