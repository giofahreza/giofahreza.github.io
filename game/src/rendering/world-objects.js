import * as THREE from "three";
import { deformPlanetGeometry } from "../world/surface.js";

export function createWorldObjects({
  constants: {
    PLANET_RADIUS,
  },
  materials: {
    planetMaterial,
  },
  scene,
  world,
}) {
  const ambient = new THREE.HemisphereLight(0xffffff, 0xb7c8a4, 2.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 3.1);
  sun.position.set(2.5, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -3.6;
  sun.shadow.camera.right = 3.6;
  sun.shadow.camera.top = 3.6;
  sun.shadow.camera.bottom = -3.6;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 20;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.018;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const rimLight = new THREE.DirectionalLight(0x9fc8d6, 1.2);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const planetGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 256, 128);
  deformPlanetGeometry(planetGeometry);
  const planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planet.castShadow = true;
  planet.receiveShadow = true;
  world.add(planet);

  const outlinePlanet = new THREE.Mesh(
    new THREE.IcosahedronGeometry(PLANET_RADIUS * 1.003, 2),
    new THREE.MeshBasicMaterial({
      color: 0x314b48,
      wireframe: true,
      transparent: true,
      opacity: 0.025,
    }),
  );
  outlinePlanet.visible = false;
  world.add(outlinePlanet);

  return {
    ambient,
    outlinePlanet,
    planet,
    rimLight,
    sun,
  };
}
