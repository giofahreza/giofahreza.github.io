import * as THREE from "three";
import {
  sphericalPosition,
  surfaceFrame,
} from "../world/surface.js";

export function createCameraController({
  camera,
  cameraCollisionMeshes,
  cameraRig,
  cameraRaycaster,
  constants: {
    MAP_RADIUS_UNITS,
    PLANET_RADIUS,
  },
  gameState,
  getElapsedTime,
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
}) {
  const tempVector2 = new THREE.Vector3();
  const tempVector3 = new THREE.Vector3();
  const tempVector4 = new THREE.Vector3();
  const tempVector5 = new THREE.Vector3();
  const tempVector6 = new THREE.Vector3();
  const tempVector7 = new THREE.Vector3();
  const tempVector8 = new THREE.Vector3();
  const cameraAnchor = new THREE.Vector3();

  function updateLighting(delta) {
    const targetPosition = tempVector6;
    const desiredSunPosition = tempVector7;
  
    if (gameState.started) {
      const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
      targetPosition.copy(riderMesh.position).addScaledVector(normal, 0.18);
      desiredSunPosition
        .copy(targetPosition)
        .addScaledVector(normal, 6.4)
        .addScaledVector(east, 3.6)
        .addScaledVector(north, 2.8);
    } else {
      const { normal, east, north } = surfaceFrame(0, 0);
      targetPosition.copy(sphericalPosition(0, 0, PLANET_RADIUS));
      desiredSunPosition
        .copy(targetPosition)
        .addScaledVector(normal, 2400)
        .addScaledVector(east, 900)
        .addScaledVector(north, 1200);
    }
  
    const response = 1 - Math.exp(-4.2 * delta);
    sun.target.position.lerp(targetPosition, response);
    sun.position.lerp(desiredSunPosition, response);
    sun.target.updateMatrixWorld();
  }

  function setDesiredCameraFrame(desiredPosition, desiredTarget, elapsed = getElapsedTime()) {
    const width = window.innerWidth;
    const isMobile = width < 700;
  
    if (gameState.started) {
      const { normal } = surfaceFrame(rider.theta, rider.phi);
      const cameraHeading = tempVector7.copy(
        getHeadingTangent(cameraRig.followHeading),
      );
      const lookAheadHeading =
        cameraRig.followHeading +
        shortestAngleDelta(cameraRig.followHeading, rider.heading) * 0.55;
      const lookAhead = tempVector8.copy(
        getHeadingTangent(lookAheadHeading),
      );
      const side = tempVector5.crossVectors(normal, cameraHeading).normalize();
      const distance = isMobile ? 0.9 : cameraRig.playDistance;
      const height = isMobile ? 0.4 : cameraRig.playHeight;
      const forwardOffset = isMobile ? 0.32 : cameraRig.playForwardOffset;
      const sideOffset = cameraRig.playSideOffset;
  
      desiredTarget
        .copy(riderMesh.position)
        .addScaledVector(normal, isMobile ? 0.21 : 0.25)
        .addScaledVector(lookAhead, forwardOffset);
      desiredPosition
        .copy(riderMesh.position)
        .addScaledVector(normal, height)
        .addScaledVector(cameraHeading, -distance)
        .addScaledVector(side, sideOffset);
      cameraRig.desiredUp.copy(normal);
  
      cameraAnchor.copy(riderMesh.position).addScaledVector(normal, 0.16);
      const cameraDirection = tempVector2
        .copy(desiredPosition)
        .sub(cameraAnchor);
      const cameraDistance = cameraDirection.length();
      cameraDirection.normalize();
      cameraRaycaster.set(cameraAnchor, cameraDirection);
      cameraRaycaster.near = 0.04;
      cameraRaycaster.far = cameraDistance;
      const obstruction = cameraRaycaster.intersectObjects(
        cameraCollisionMeshes,
        true,
      )[0];
  
      cameraRig.obstructed = Boolean(obstruction);
      cameraRig.compression = 1;
      if (obstruction) {
        const safeDistance = Math.max(0.1, obstruction.distance - 0.065);
        cameraRig.compression = THREE.MathUtils.clamp(
          safeDistance / cameraDistance,
          0.1,
          1,
        );
        desiredPosition
          .copy(cameraAnchor)
          .addScaledVector(cameraDirection, safeDistance);
        desiredTarget
          .copy(riderMesh.position)
          .addScaledVector(normal, isMobile ? 0.2 : 0.23)
          .addScaledVector(
            lookAhead,
            forwardOffset * THREE.MathUtils.lerp(0.28, 1, cameraRig.compression),
          );
      }
    } else {
      cameraRig.obstructed = false;
      cameraRig.compression = 1;
      const overviewTheta = 0;
      const overviewPhi = 0;
      const { normal, east, north } = surfaceFrame(
        overviewTheta,
        overviewPhi,
      );
      const drift =
        Math.sin(elapsed * 0.25) * 24 *
        (getReducedMotion() ? 0.1 : 1);
      const centerDistance =
        MAP_RADIUS_UNITS * (window.innerWidth < 700 ? 2.7 : 2.35);
      desiredTarget.copy(sphericalPosition(0, 0, PLANET_RADIUS));
      desiredPosition
        .copy(desiredTarget)
        .addScaledVector(normal, centerDistance)
        .addScaledVector(north, centerDistance * 0.16)
        .addScaledVector(east, drift);
      cameraRig.desiredUp.copy(north);
    }
  }
  
  function snapCameraToDesired() {
    setDesiredCameraFrame(cameraRig.currentPosition, cameraRig.currentTarget);
    cameraRig.currentUp.copy(cameraRig.desiredUp);
    camera.up.copy(cameraRig.currentUp);
    camera.position.copy(cameraRig.currentPosition);
    camera.lookAt(cameraRig.currentTarget);
  }
  
  function updateCamera(delta, elapsed) {
    const desiredPosition = tempVector3;
    const desiredTarget = tempVector4;
  
    if (gameState.started) {
      if (rider.inputActive) {
        cameraRig.recenterTimer = 0;
      } else {
        cameraRig.recenterTimer += delta;
      }
  
      if (
        rider.inputActive ||
        cameraRig.recenterTimer >= cameraRig.recenterDelay
      ) {
        const headingError = shortestAngleDelta(
          cameraRig.followHeading,
          rider.heading,
        );
        const followDamping = rider.inputActive
          ? cameraRig.activeFollowDamping
          : cameraRig.turnFollowDamping;
        const followSpeed = rider.inputActive
          ? cameraRig.activeFollowSpeed
          : cameraRig.turnFollowSpeed;
        const dampedTurn =
          headingError * (1 - Math.exp(-followDamping * delta));
        const maxTurn = followSpeed * delta;
        cameraRig.followHeading += THREE.MathUtils.clamp(
          dampedTurn,
          -maxTurn,
          maxTurn,
        );
      }
      cameraRig.followHeading = Math.atan2(
        Math.sin(cameraRig.followHeading),
        Math.cos(cameraRig.followHeading),
      );
    }
  
    setDesiredCameraFrame(desiredPosition, desiredTarget, elapsed);
  
    const smoothness = gameState.started ? 7.2 : 3.4;
    const alpha = 1 - Math.exp(-smoothness * delta);
    scene.fog.near = THREE.MathUtils.damp(
      scene.fog.near,
      gameState.started ? 11 : 1700,
      gameState.started ? 10 : 2.5,
      delta,
    );
    scene.fog.far = THREE.MathUtils.damp(
      scene.fog.far,
      gameState.started ? 38 : 4400,
      gameState.started ? 10 : 2.5,
      delta,
    );
    cameraRig.currentPosition.lerp(desiredPosition, alpha);
    cameraRig.currentTarget.lerp(desiredTarget, alpha);
  
    if (gameState.started) {
      const currentDirection = tempVector2
        .copy(cameraRig.currentPosition)
        .sub(cameraAnchor);
      const currentDistance = currentDirection.length();
      currentDirection.normalize();
      cameraRaycaster.set(cameraAnchor, currentDirection);
      cameraRaycaster.near = 0.04;
      cameraRaycaster.far = currentDistance;
      const currentObstruction = cameraRaycaster.intersectObjects(
        cameraCollisionMeshes,
        true,
      )[0];
  
      if (
        currentObstruction &&
        currentObstruction.distance < currentDistance - 0.005
      ) {
        const safeDistance = Math.max(
          0.055,
          currentObstruction.distance - 0.055,
        );
        cameraRig.currentPosition
          .copy(cameraAnchor)
          .addScaledVector(currentDirection, safeDistance);
      }
    }
  
    if (cameraRig.currentUp.dot(cameraRig.desiredUp) < 0.05) {
      cameraRig.currentUp.copy(cameraRig.desiredUp);
    } else {
      cameraRig.currentUp.lerp(cameraRig.desiredUp, alpha).normalize();
    }
    camera.up.copy(cameraRig.currentUp);
    camera.position.copy(cameraRig.currentPosition);
    camera.lookAt(cameraRig.currentTarget);
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
  
    if (width < 700) {
      camera.fov = 51;
      camera.far = gameState.started ? 42 : 6000;
      cameraRig.overviewPosition.set(0, 10.2, 18.5);
      cameraRig.playSideOffset = -0.1;
    } else {
      camera.fov = 48;
      camera.far = gameState.started ? 42 : 6000;
      cameraRig.overviewPosition.set(0, 8.6, 15);
      cameraRig.playSideOffset = -0.16;
    }
  
    paintedSky.scale.set(camera.aspect * 10, 10, 1);
    camera.updateProjectionMatrix();
    if (!gameState.started) requestPausedRender();
  }

  return {
    resize,
    snapCameraToDesired,
    updateCamera,
    updateLighting,
  };
}
