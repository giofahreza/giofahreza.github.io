import * as THREE from "three";
import { createAmbientAnimationSystem } from "../animation/ambient.js";
import { createCameraController } from "../camera/controller.js";
import { createOverviewLodSystem } from "../rendering/overview-lod.js";

export function createGameRuntime({
  alunAlunTraffic,
  cameraContext: {
    camera,
    cameraCollisionMeshes,
    cameraRig,
    cameraRaycaster,
    paintedSky,
  },
  collections: {
    animatedBoats,
    animatedFlowers,
    animatedFoliage,
    animatedStopDetails,
    chimneySmoke,
    driftingClouds,
    lakeRipples,
  },
  constants: {
    DELIVERY_DISTANCE,
    LOGICAL_THETA_PERIOD,
    MAP_RADIUS_UNITS,
    OVERVIEW_DETAIL_LAYER,
    OVERVIEW_DETAIL_RADIUS,
    OVERVIEW_HORIZON_DOT,
    OVERVIEW_PROXY_LAYER,
    PLANET_RADIUS,
    ROUND_TIME,
  },
  controls: {
    resetAnalog,
    updateAnalogVisual,
  },
  elements: {
    app,
    deliveryToast,
  },
  gameState,
  getGeospatialWorld,
  getReducedMotion,
  interfaceController: {
    hideMessage,
    showDeliveryFeedback,
    showMessage,
    updateHud,
    updateInterface,
    updateNearbyPlaceCard,
    updateTargetMarker,
  },
  materials: {
    paintedSkyMaterial,
    targetMaterial,
    townWindowMaterial,
    waterMaterial,
  },
  movement: {
    angularDistance,
    applyDirectMovement,
    getHeadingTangent,
    getMovementInput,
    headingTowardStop,
    shortestAngleDelta,
    stepRider,
  },
  overviewGeometries: {
    overviewBoxGeometry,
    overviewConeRoofGeometry,
    overviewGableRoofGeometry,
  },
  renderContext: {
    outlineEffect,
    renderer,
    scene,
  },
  rider,
  riderSystem: {
    riderMesh,
    updateFootstepDust,
    updateRiderAnimation,
    updateRiderTransform,
  },
  sceneObjects: {
    outlinePlanet,
    planet,
    sun,
    world,
  },
  stops,
  surface: {
    placeOnPlanet,
  },
}) {
  function resetGame() {
    app.classList.remove("not-started");
    gameState.started = true;
    gameState.complete = false;
    gameState.timeLeft = ROUND_TIME;
    gameState.deliveries = 0;
    gameState.streak = 0;
    gameState.targetIndex = 0;
    gameState.deliveryToastTime = 0;
    gameState.controlHintTime = 5.2;
    gameState.boundaryNoticeTime = 0;

    rider.theta = 12;
    rider.phi = 12;
    rider.heading = headingTowardStop(gameState.targetIndex);
    rider.speed = 0;
    rider.actualSpeed = 0;
    rider.motionBlend = 0;
    rider.blockedBlend = 0;
    rider.animationState = "idle";
    rider.turn = 0;
    rider.walkPhase = 0;
    rider.moveX = 0;
    rider.moveY = 0;
    rider.inputActive = false;
    rider.controlHeading = rider.heading;
    rider.desiredHeading = rider.heading;
    rider.collisionActive = false;
    rider.celebration = 0;
    rider.lastFootstep = -1;
    cameraRig.followHeading = rider.heading;
    cameraRig.recenterTimer = 0;
    cameraRig.obstructed = false;
    cameraRig.compression = 1;
    scene.fog.near = 11;
    scene.fog.far = 38;
    clock.start();
    resetAnalog();
    updateRiderTransform();
    snapCameraToDesired();

    hideMessage();
    deliveryToast.classList.remove("show");
    updateTargetMarker();
    updateHud();
    requestGameFrame();
  }

  function completeGame() {
    gameState.started = false;
    gameState.complete = true;
    gameState.deliveryToastTime = 0;
    gameState.controlHintTime = 0;
    gameState.boundaryNoticeTime = 0;
    resetAnalog();
    updateTargetMarker();
    showMessage(
      "Route Complete",
      `All letters delivered with ${Math.ceil(gameState.timeLeft)} seconds left.`,
      "Walk Again",
    );
  }

  function failGame() {
    gameState.started = false;
    gameState.complete = false;
    gameState.deliveryToastTime = 0;
    gameState.controlHintTime = 0;
    gameState.boundaryNoticeTime = 0;
    resetAnalog();
    updateTargetMarker();
    showMessage(
      "Dusk Arrived",
      `${gameState.deliveries} letters made it home. Try a cleaner route.`,
      "Retry Route",
    );
  }

  function deliverIfReady() {
    const target = stops[gameState.targetIndex];
    const distance =
      angularDistance(
        rider.theta,
        rider.phi,
        target.deliveryTheta ?? target.theta,
        target.deliveryPhi ?? target.phi,
      ) * PLANET_RADIUS;

    target.marker.scale.setScalar(
      1 + Math.sin(performance.now() * 0.008) * 0.08,
    );

    if (distance <= DELIVERY_DISTANCE && gameState.started) {
      const deliveredName = target.name;
      gameState.deliveries += 1;
      gameState.streak += 1;
      gameState.timeLeft = Math.min(ROUND_TIME, gameState.timeLeft + 5);
      gameState.targetIndex += 1;
      rider.celebration = 0.85;
      showDeliveryFeedback(deliveredName);

      if (gameState.targetIndex >= stops.length) {
        updateHud();
        completeGame();
        return;
      }

      updateTargetMarker();
      updateHud();
    }
  }

  const { updateAmbientAnimation } = createAmbientAnimationSystem({
    collections: {
      animatedBoats,
      animatedFlowers,
      animatedFoliage,
      animatedStopDetails,
      chimneySmoke,
      driftingClouds,
      lakeRipples,
    },
    constants: {
      ...alunAlunTraffic.constants,
      LOGICAL_THETA_PERIOD,
    },
    getReducedMotion,
    getSignalState: alunAlunTraffic.getSignalState,
    materials: {
      paintedSkyMaterial,
      targetMaterial,
      townWindowMaterial,
      waterMaterial,
    },
    placeOnPlanet,
    state: {
      gameState,
      stops,
    },
  });

  const {
    getDetailedRenderMode,
    overviewLodStats,
    updateRenderDetailMode,
  } = createOverviewLodSystem({
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
  });

  const clock = new THREE.Clock();
  let animationFrameId = null;
  let pausedRenderPending = true;

  function requestGameFrame() {
    if (animationFrameId !== null) return;
    animationFrameId = requestAnimationFrame(animate);
  }

  function requestPausedRender() {
    pausedRenderPending = true;
    requestGameFrame();
  }

  const {
    resize,
    snapCameraToDesired,
    updateCamera,
    updateLighting,
  } = createCameraController({
    camera,
    cameraCollisionMeshes,
    cameraRig,
    cameraRaycaster,
    constants: {
      MAP_RADIUS_UNITS,
      PLANET_RADIUS,
    },
    gameState,
    getElapsedTime: () => clock.elapsedTime,
    getHeadingTangent,
    getReducedMotion,
    paintedSky,
    requestPausedRender,
    renderer,
    rider,
    riderMesh,
    scene,
    shortestAngleDelta,
    sun,
  });

  function animate() {
    animationFrameId = null;
    if (!gameState.started && !pausedRenderPending) return;
    pausedRenderPending = false;

    // Collision movement is substepped, so a wider cap keeps controls responsive
    // on lower-powered devices without allowing large jumps after a paused tab.
    const delta = Math.min(clock.getDelta(), 0.08);
    const elapsed = clock.elapsedTime;

    updateAnalogVisual(delta);

    if (gameState.started) {
      applyDirectMovement(getMovementInput(), delta);
      stepRider(delta);

      gameState.timeLeft -= delta;
      if (gameState.timeLeft <= 0) {
        gameState.timeLeft = 0;
        updateHud();
        failGame();
      } else {
        deliverIfReady();
        updateHud();
      }
    } else {
      rider.heading +=
        Math.sin(elapsed * 0.7) * 0.002 *
        (getReducedMotion() ? 0.12 : 1);
      rider.speed = THREE.MathUtils.damp(rider.speed, 0, 4, delta);
    }

    updateRiderTransform();
    updateRiderAnimation(delta, elapsed);
    updateFootstepDust(delta);
    updateAmbientAnimation(delta, elapsed);
    getGeospatialWorld()?.userData.update?.(elapsed, getReducedMotion());
    updateNearbyPlaceCard();
    updateCamera(delta, elapsed);
    updateLighting(delta);
    updateInterface(delta);
    updateRenderDetailMode();

    outlinePlanet.rotation.copy(planet.rotation);
    renderer.info.reset();

    if (gameState.started) {
      outlineEffect.render(scene, camera);
    } else {
      renderer.render(scene, camera);
    }

    if (gameState.started) requestGameFrame();
  }

  return {
    getDetailedRenderMode,
    overviewLodStats,
    requestGameFrame,
    resetGame,
    resize,
    snapCameraToDesired,
  };
}
