import * as THREE from "three";
import { surfaceFrame } from "../world/surface.js";

export function createOverviewLodSystem({
  camera,
  cameraRaycaster,
  constants: {
    OVERVIEW_DETAIL_LAYER,
    OVERVIEW_DETAIL_RADIUS,
    OVERVIEW_HORIZON_DOT,
    OVERVIEW_PROXY_LAYER,
    PLANET_RADIUS,
  },
  gameState,
  overviewGeometries: {
    overviewBoxGeometry,
    overviewConeRoofGeometry,
    overviewGableRoofGeometry,
  },
  planet,
  renderer,
  sun,
  world,
}) {
  const overviewLodStats = {
    hiddenMeshes: 0,
    retainedMeshes: 0,
    proxyMeshes: 0,
    simplifiedProxyMeshes: 0,
    proxyInstances: 0,
    culledInstances: 0,
    retainedTriangles: 0,
    proxyTriangles: 0,
  };

  function configureOverviewLod() {
    world.updateMatrixWorld(true);
    overviewLodStats.hiddenMeshes = 0;
    overviewLodStats.retainedMeshes = 0;
    overviewLodStats.proxyMeshes = 0;
    overviewLodStats.simplifiedProxyMeshes = 0;
    overviewLodStats.proxyInstances = 0;
    overviewLodStats.culledInstances = 0;
    overviewLodStats.retainedTriangles = 0;
    overviewLodStats.proxyTriangles = 0;
  
    const overviewDirection = surfaceFrame(-0.18, 1.36).normal;
    const sourceMeshes = [];
    const localMatrix = new THREE.Matrix4();
    const worldMatrix = new THREE.Matrix4();
    const worldCenter = new THREE.Vector3();
    const instanceColor = new THREE.Color();
  
    const visibleFromOverview = (center, radius) => {
      const centerDistance = center.length();
      if (centerDistance < PLANET_RADIUS * 0.35) return true;
      return (
        center.dot(overviewDirection) / centerDistance +
          radius / PLANET_RADIUS >=
        OVERVIEW_HORIZON_DOT
      );
    };
    const staysDynamicInOverview = (object) => {
      let current = object;
      while (current && current !== world) {
        if (current.userData.keepOverviewDynamic) return true;
        current = current.parent;
      }
      return false;
    };
  
    world.traverse((object) => {
      if (
        object.isMesh &&
        object !== planet &&
        object.layers.mask !== (1 << OVERVIEW_PROXY_LAYER)
      ) {
        sourceMeshes.push(object);
      }
    });
  
    sourceMeshes.forEach((object) => {
      if (object.layers.mask === (1 << OVERVIEW_DETAIL_LAYER)) {
        overviewLodStats.hiddenMeshes += 1;
        return;
      }
  
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      const bounds = object.geometry.boundingSphere;
  
      if (object.isInstancedMesh) {
        const retainedMatrices = [];
        const retainedColors = object.instanceColor ? [] : null;
  
        for (let index = 0; index < object.count; index += 1) {
          object.getMatrixAt(index, localMatrix);
          worldMatrix.multiplyMatrices(object.matrixWorld, localMatrix);
          const worldRadius =
            bounds.radius * worldMatrix.getMaxScaleOnAxis();
          worldCenter.copy(bounds.center).applyMatrix4(worldMatrix);
  
          if (
            worldRadius < OVERVIEW_DETAIL_RADIUS ||
            !visibleFromOverview(worldCenter, worldRadius)
          ) {
            overviewLodStats.culledInstances += 1;
            continue;
          }
  
          retainedMatrices.push(localMatrix.clone());
          if (retainedColors) {
            object.getColorAt(index, instanceColor);
            retainedColors.push(instanceColor.clone());
          }
        }
  
        // The original keeps every instance for close gameplay. A lightweight
        // front-cap proxy lets the title avoid submitting rear-hemisphere and
        // sub-pixel instances that are fully hidden by the globe.
        object.layers.set(OVERVIEW_DETAIL_LAYER);
        overviewLodStats.hiddenMeshes += 1;
  
        if (retainedMatrices.length > 0) {
          const usesSimplifiedGeometry =
            object.geometry.type === "RoundedBoxGeometry";
          const proxy = new THREE.InstancedMesh(
            usesSimplifiedGeometry
              ? overviewBoxGeometry
              : object.geometry,
            object.material,
            retainedMatrices.length,
          );
          proxy.name = `${object.name || "instanced"}-overview`;
          proxy.position.copy(object.position);
          proxy.quaternion.copy(object.quaternion);
          proxy.scale.copy(object.scale);
          proxy.renderOrder = object.renderOrder;
          proxy.frustumCulled = object.frustumCulled;
          proxy.castShadow = false;
          proxy.receiveShadow = false;
          proxy.layers.set(OVERVIEW_PROXY_LAYER);
  
          retainedMatrices.forEach((matrix, index) => {
            proxy.setMatrixAt(index, matrix);
            if (retainedColors) proxy.setColorAt(index, retainedColors[index]);
          });
          proxy.instanceMatrix.needsUpdate = true;
          if (proxy.instanceColor) proxy.instanceColor.needsUpdate = true;
          proxy.computeBoundingSphere();
          object.parent.add(proxy);
  
          overviewLodStats.proxyMeshes += 1;
          if (usesSimplifiedGeometry) {
            overviewLodStats.simplifiedProxyMeshes += 1;
          }
          overviewLodStats.proxyInstances += retainedMatrices.length;
          const proxyPosition = proxy.geometry.getAttribute("position");
          const proxyTriangleCount = proxy.geometry.index
            ? proxy.geometry.index.count / 3
            : proxyPosition.count / 3;
          overviewLodStats.proxyTriangles +=
            proxyTriangleCount * retainedMatrices.length;
        }
        return;
      }
  
      const worldRadius =
        bounds.radius * object.matrixWorld.getMaxScaleOnAxis();
      worldCenter.copy(bounds.center).applyMatrix4(object.matrixWorld);
      const overviewDynamic = staysDynamicInOverview(object);
  
      if (
        !overviewDynamic &&
        (worldRadius < OVERVIEW_DETAIL_RADIUS ||
          !visibleFromOverview(worldCenter, worldRadius))
      ) {
        // Tiny or globe-occluded meshes contribute hundreds of title draw calls
        // while covering no readable pixels. Gameplay keeps the full objects.
        object.layers.set(OVERVIEW_DETAIL_LAYER);
        overviewLodStats.hiddenMeshes += 1;
      } else {
        overviewLodStats.retainedMeshes += 1;
        const position = object.geometry.getAttribute("position");
        const triangleCount = object.geometry.index
          ? object.geometry.index.count / 3
          : position.count / 3;
        overviewLodStats.retainedTriangles += triangleCount;
      }
    });
  
    // Gameplay shadows and camera collision still include the detail layer.
    sun.shadow.camera.layers.enable(OVERVIEW_DETAIL_LAYER);
    cameraRaycaster.layers.enable(OVERVIEW_DETAIL_LAYER);
  }
  
  let detailedRenderMode = null;
  function updateRenderDetailMode() {
    const shouldRenderDetails =
      gameState.started ||
      (detailedRenderMode === true && camera.position.length() < 50);
    if (detailedRenderMode === shouldRenderDetails) return;
    detailedRenderMode = shouldRenderDetails;
  
    if (detailedRenderMode) {
      camera.layers.enable(OVERVIEW_DETAIL_LAYER);
      camera.layers.disable(OVERVIEW_PROXY_LAYER);
      camera.far = 42;
      camera.near = 0.08;
      sun.castShadow = true;
      renderer.shadowMap.needsUpdate = true;
    } else {
      camera.layers.disable(OVERVIEW_DETAIL_LAYER);
      camera.layers.enable(OVERVIEW_PROXY_LAYER);
      camera.far = 6000;
      camera.near = 8;
      // At overview distance, real-time shadow maps add substantial work but
      // almost no readable detail; toon lighting and painted contact shapes
      // preserve the title composition without the extra shadow pass.
      sun.castShadow = false;
    }
    camera.updateProjectionMatrix();
  }

  return {
    configureOverviewLod,
    getDetailedRenderMode: () => detailedRenderMode,
    overviewLodStats,
    updateRenderDetailMode,
  };
}
