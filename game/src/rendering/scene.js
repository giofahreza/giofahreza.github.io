import * as THREE from "three";
import { createPaintedSkyTexture } from "./textures.js";

export function createSceneGraph() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x72c8c6);
  scene.fog = new THREE.Fog(0x72c8c6, 1800, 4300);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 6000);
  camera.position.set(0, 8.6, 15);
  camera.lookAt(0, 0.4, 0);
  scene.add(camera);

  const paintedSkyMaterial = new THREE.MeshBasicMaterial({
    map: createPaintedSkyTexture(),
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
  paintedSkyMaterial.userData.outlineParameters = { visible: false };
  const paintedSky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    paintedSkyMaterial,
  );
  paintedSky.position.z = -18;
  paintedSky.renderOrder = -1000;
  paintedSky.frustumCulled = false;
  camera.add(paintedSky);

  const cameraRig = {
    currentPosition: camera.position.clone(),
    currentTarget: new THREE.Vector3(0, 0.35, 0),
    currentUp: new THREE.Vector3(0, 1, 0),
    desiredUp: new THREE.Vector3(0, 1, 0),
    overviewPosition: new THREE.Vector3(0, 8.6, 15),
    overviewTarget: new THREE.Vector3(0, 0.25, 0),
    playDistance: 0.88,
    playHeight: 0.39,
    playSideOffset: -0.13,
    playForwardOffset: 0.34,
    followHeading: 0.65,
    recenterDelay: 0.16,
    recenterTimer: 0,
    turnFollowSpeed: 1.25,
    turnFollowDamping: 3.2,
    activeFollowSpeed: 1.05,
    activeFollowDamping: 2,
    obstructed: false,
    compression: 1,
  };

  const world = new THREE.Group();
  scene.add(world);

  return {
    camera,
    cameraRig,
    paintedSky,
    paintedSkyMaterial,
    scene,
    world,
  };
}
