import * as THREE from "three";
import { createGableRoofGeometry } from "./geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "./materials.js";
import { createPaintedGroundTexture } from "./textures.js";

function createSitubondoCurbMaterial() {
  const curbCanvas = document.createElement("canvas");
  curbCanvas.width = 32;
  curbCanvas.height = 256;
  const context = curbCanvas.getContext("2d");
  for (let index = 0; index < 8; index += 1) {
    context.fillStyle = index % 2 === 0 ? "#3484a0" : "#eee9d9";
    context.fillRect(0, index * 32, 32, 32);
  }
  const texture = new THREE.CanvasTexture(curbCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 14);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.NearestFilter;
  return hideMaterialOutline(
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
}

function createRoadCenterMaterial() {
  const markingCanvas = document.createElement("canvas");
  markingCanvas.width = 16;
  markingCanvas.height = 128;
  const context = markingCanvas.getContext("2d");
  context.clearRect(0, 0, 16, 128);
  context.fillStyle = "#eee9d9";
  context.fillRect(0, 0, 16, 44);
  const texture = new THREE.CanvasTexture(markingCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 22);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.NearestFilter;
  return hideMaterialOutline(
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.12,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    }),
  );
}

export function createGameAssets() {
  const overviewBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const overviewConeRoofGeometry = new THREE.ConeGeometry(0.5, 1, 12);
  const overviewGableRoofGeometry = createGableRoofGeometry(1, 1, 1);

  const inkMaterial = new THREE.MeshBasicMaterial({
    color: 0x263d3d,
    side: THREE.DoubleSide,
  });
  const roadMaterial = toonMaterial({
    color: 0x596f70,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const roadEdgeMaterial = toonMaterial({
    color: 0xe7e5d5,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const situbondoCurbMaterial = createSitubondoCurbMaterial();
  const roadCenterMaterial = createRoadCenterMaterial();
  const sidewalkMaterial = toonMaterial({
    color: 0xc9c8b7,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const planetMaterial = toonMaterial({
    color: 0xffffff,
    map: createPaintedGroundTexture(),
    roughness: 0.84,
    metalness: 0,
    emissive: 0x547457,
    emissiveIntensity: 0.035,
  });
  const waterMaterial = toonMaterial({
    color: 0x3eabb7,
    roughness: 0.36,
    metalness: 0,
    emissive: 0x1d6267,
    emissiveIntensity: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const grassPatchMaterial = toonMaterial({
    color: 0x6f9f70,
    roughness: 0.88,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const rockPatchMaterial = toonMaterial({
    color: 0xaaa9a0,
    roughness: 0.9,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const sandPatchMaterial = toonMaterial({
    color: 0xe2ca8e,
    roughness: 0.86,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const rockMaterial = toonMaterial({
    color: 0x999890,
    roughness: 0.92,
    metalness: 0,
  });
  const treeMaterial = toonMaterial({
    color: 0x63956c,
    roughness: 0.8,
    metalness: 0,
  });
  const trunkMaterial = toonMaterial({
    color: 0x856f5b,
    roughness: 0.82,
    metalness: 0,
  });
  const letterMaterial = toonMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0,
    emissive: 0x121212,
    emissiveIntensity: 0.05,
  });
  const targetMaterial = toonMaterial({
    color: 0xe7c766,
    roughness: 0.54,
    metalness: 0,
    emissive: 0xd99d28,
    emissiveIntensity: 0.45,
  });
  const flowerMaterials = [0xef9381, 0xe7c766, 0x80a9c8, 0xf6f0dc].map(
    (color) =>
      toonMaterial({
        color,
        roughness: 0.62,
        metalness: 0,
      }),
  );
  const cloudMaterial = hideMaterialOutline(
    toonMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  const cloudShadowMaterial = hideMaterialOutline(
    new THREE.MeshBasicMaterial({
      color: 0x426b65,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    }),
  );
  const chimneySmokeMaterial = hideMaterialOutline(
    new THREE.MeshBasicMaterial({
      color: 0xf5f1e3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  const rippleMaterial = hideMaterialOutline(
    new THREE.MeshBasicMaterial({
      color: 0xb9e5dc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const dustMaterial = hideMaterialOutline(
    new THREE.MeshBasicMaterial({
      color: 0xf2e4c2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const lakeRippleGeometry = new THREE.RingGeometry(0.105, 0.118, 32);
  lakeRippleGeometry.rotateX(-Math.PI * 0.5);
  const cloudShadowGeometry = new THREE.CircleGeometry(0.32, 28);
  cloudShadowGeometry.rotateX(-Math.PI * 0.5);
  const foliageMaterials = [0x5f9068, 0x719c73, 0x588962, 0x82a47a].map(
    (color) =>
      toonMaterial({
        color,
        roughness: 0.84,
        metalness: 0,
      }),
  );

  [
    roadMaterial,
    roadEdgeMaterial,
    sidewalkMaterial,
    waterMaterial,
    grassPatchMaterial,
    rockPatchMaterial,
    sandPatchMaterial,
  ].forEach(hideMaterialOutline);

  return {
    cloudMaterial,
    cloudShadowGeometry,
    cloudShadowMaterial,
    chimneySmokeMaterial,
    dustMaterial,
    flowerMaterials,
    foliageMaterials,
    grassPatchMaterial,
    inkMaterial,
    lakeRippleGeometry,
    letterMaterial,
    overviewBoxGeometry,
    overviewConeRoofGeometry,
    overviewGableRoofGeometry,
    planetMaterial,
    rippleMaterial,
    roadCenterMaterial,
    roadEdgeMaterial,
    roadMaterial,
    rockMaterial,
    rockPatchMaterial,
    sandPatchMaterial,
    sidewalkMaterial,
    situbondoCurbMaterial,
    targetMaterial,
    treeMaterial,
    trunkMaterial,
    waterMaterial,
  };
}
