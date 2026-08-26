import * as THREE from "three";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";

export function createGameRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // OutlineEffect performs two renderer passes. Reset once per animation frame
  // so diagnostics report the complete cost rather than only its final pass.
  renderer.info.autoReset = false;

  const outlineEffect = new OutlineEffect(renderer, {
    defaultThickness: 0.0022,
    defaultColor: [0.1, 0.16, 0.17],
    defaultAlpha: 0.72,
    defaultKeepAlive: true,
  });

  return { outlineEffect, renderer };
}
