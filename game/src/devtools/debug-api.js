import * as THREE from "three";

export function installDebugApi({
  camera,
  cameraRig,
  constants,
  distanceToNearestRoad,
  elements,
  environment,
  gameState,
  getDetailedRenderMode,
  getGeospatialWorld,
  getReducedMotion,
  mapData,
  mappedSurfaceLiftAt,
  navigationSurfaceLiftAt,
  obstacleGapAtSurfacePoint,
  renderer,
  rider,
  shortestAngleDelta,
  snapCameraToDesired,
  sphericalPosition,
  surfaceOffsetFromNormal,
  touchState,
  updateRiderTransform,
}) {
  const {
    ANALOG_INPUT_RADIUS,
    MAP_METERS_PER_WORLD_UNIT,
    MAP_RADIUS_UNITS,
    PLANET_RADIUS,
    RIDER_COLLISION_RADIUS,
  } = constants;
  const {
    deliveryToast,
    boundaryNotice,
    nearbyPlace,
    nearbyPlaceName,
    controlHint,
    targetDistanceNode,
  } = elements;
  const {
    animatedFoliage,
    animatedFlowers,
    chimneySmoke,
    driftingClouds,
    infillStats,
    lakeRipples,
    latitudeRoads,
    meridianRoads,
    obstacles,
    overviewLodStats,
    paintedSkyMaterial,
    walkableSurfaces,
    wireRoofClearances,
  } = environment;

  Object.defineProperty(window, "__tinyMessengerState", {
    configurable: true,
    get: () => {
      const geospatialWorld = getGeospatialWorld();
      return {
        started: gameState.started,
        devMode: gameState.devMode,
        mapEditorOpen: gameState.mapEditorOpen,
        complete: gameState.complete,
        timeLeft: gameState.timeLeft,
        deliveries: gameState.deliveries,
        targetIndex: gameState.targetIndex,
        rider: {
          theta: rider.theta,
          phi: rider.phi,
          heading: rider.heading,
          speed: rider.speed,
          actualSpeed: rider.actualSpeed,
          motionBlend: rider.motionBlend,
          blockedBlend: rider.blockedBlend,
          animationState: rider.animationState,
          turn: rider.turn,
          desiredHeading: rider.desiredHeading,
          controlHeading: rider.controlHeading,
          inputActive: rider.inputActive,
          collisionActive: rider.collisionActive,
          celebration: rider.celebration,
        },
        controls: {
          mode: "camera-relative-directional",
          analogX: touchState.analogX,
          analogY: touchState.analogY,
          analogInputRadius: ANALOG_INPUT_RADIUS,
          visualX: touchState.analogVisualX,
          visualY: touchState.analogVisualY,
          visualTargetX: touchState.analogVisualTargetX,
          visualTargetY: touchState.analogVisualTargetY,
          pointerActive: touchState.analogPointerId !== null,
          run: touchState.run,
          brake: touchState.brake,
        },
        camera: {
          position: camera.position.toArray(),
          target: cameraRig.currentTarget.toArray(),
          up: camera.up.toArray(),
          followHeading: cameraRig.followHeading,
          recenterTimer: cameraRig.recenterTimer,
          yawError: shortestAngleDelta(
            cameraRig.followHeading,
            rider.heading,
          ),
          obstructed: cameraRig.obstructed,
          compression: cameraRig.compression,
        },
        render: {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        },
        environment: {
          geospatialMap: {
            ...(geospatialWorld?.userData.mapStats ?? {}),
            center: { ...mapData.center },
            riderEastMeters: rider.theta * MAP_METERS_PER_WORLD_UNIT,
            riderNorthMeters: -rider.phi * MAP_METERS_PER_WORLD_UNIT,
            mappedBuildingCollisionCount:
              geospatialWorld?.userData.navigation?.buildingCount ?? 0,
            mappedSurfaceLift: mappedSurfaceLiftAt(rider.theta, rider.phi),
            riderSurfaceLift: navigationSurfaceLiftAt(rider.theta, rider.phi),
            landmarkWalkableSurfaceCount: walkableSurfaces.length,
          },
          skyOffset: paintedSkyMaterial.map.offset.x,
          cloudThetas: driftingClouds.map((cloud) => cloud.theta),
          animatedFoliageCount: animatedFoliage.length,
          animatedFlowerCount: animatedFlowers.length,
          lakeRippleCount: lakeRipples.length,
          chimneySmokeCount: chimneySmoke.length,
          reducedMotion: getReducedMotion(),
          infill: { ...infillStats },
          overviewLod: {
            ...overviewLodStats,
            detailedRenderMode: getDetailedRenderMode(),
          },
          latitudeRoadCount: latitudeRoads.length,
          meridianRoadCount: meridianRoads.length,
          minimumWireRoofClearance:
            wireRoofClearances.length > 0
              ? Math.min(...wireRoofClearances)
              : null,
        },
        interface: {
          deliveryToastVisible: deliveryToast.classList.contains("show"),
          boundaryNoticeVisible: boundaryNotice.classList.contains("show"),
          nearbyPlaceVisible: nearbyPlace.classList.contains("show"),
          nearbyPlaceName: nearbyPlaceName.textContent,
          controlHintVisible: controlHint.classList.contains("show"),
          targetDistance: targetDistanceNode.textContent,
        },
        obstacleCount: obstacles.length,
        circleObstacleCount: obstacles.filter(
          (obstacle) => obstacle.shape === "circle",
        ).length,
        boxObstacleCount: obstacles.filter(
          (obstacle) => obstacle.shape === "box",
        ).length,
        nearestObstacleGap: (() => {
          const riderNormal = sphericalPosition(
            rider.theta,
            rider.phi,
            1,
          ).normalize();
          return Math.min(
            ...obstacles.map((obstacle) =>
              obstacleGapAtSurfacePoint(riderNormal, obstacle),
            ),
          );
        })(),
        minimumRoadGap: Math.min(
          ...obstacles.map(
            (obstacle) =>
              distanceToNearestRoad(obstacle.theta, obstacle.phi) -
              obstacle.radius -
              RIDER_COLLISION_RADIUS,
          ),
        ),
      };
    },
  });

  Object.defineProperty(window, "__tinyMessengerTeleport", {
    configurable: true,
    value: (theta, phi, heading = rider.heading) => {
      const requestedDistance = Math.hypot(theta, phi);
      const boundaryScale =
        requestedDistance > MAP_RADIUS_UNITS
          ? MAP_RADIUS_UNITS / requestedDistance
          : 1;
      rider.theta = theta * boundaryScale;
      rider.phi = phi * boundaryScale;
      rider.heading = heading;
      rider.speed = 0;
      rider.actualSpeed = 0;
      rider.motionBlend = 0;
      rider.blockedBlend = 0;
      rider.animationState = "idle";
      rider.turn = 0;
      rider.moveX = 0;
      rider.moveY = 0;
      rider.inputActive = false;
      rider.controlHeading = heading;
      rider.desiredHeading = heading;
      rider.collisionActive = false;
      rider.celebration = 0;
      rider.lastFootstep = -1;
      cameraRig.followHeading = heading;
      cameraRig.recenterTimer = 0;
      cameraRig.obstructed = false;
      cameraRig.compression = 1;
      updateRiderTransform();
      snapCameraToDesired();
      return window.__tinyMessengerState;
    },
  });

  Object.defineProperty(window, "__tinyMessengerNavigationProbe", {
    configurable: true,
    value: (theta = rider.theta, phi = rider.phi) => {
      const surfacePoint = sphericalPosition(theta, phi, 1).normalize();
      const surfaces = walkableSurfaces
        .map((surface) => {
          const offset = surfaceOffsetFromNormal(
            surfacePoint,
            surface.normal,
            new THREE.Vector3(),
          );
          const localX = offset.dot(surface.right);
          const localZ = offset.dot(surface.forward);
          return {
            label: surface.label,
            shape: surface.shape,
            localX,
            localZ,
            halfWidth: surface.halfWidth,
            halfDepth: surface.halfDepth,
            height: surface.height,
            liftOffset: surface.liftOffset,
            inside: surface.contains(localX, localZ),
          };
        })
        .filter((surface) => surface.inside);
      const nearestObstacles = obstacles
        .map((obstacle) => ({
          label: obstacle.label,
          gap: obstacleGapAtSurfacePoint(surfacePoint, obstacle),
        }))
        .sort((a, b) => a.gap - b.gap)
        .slice(0, 5);
      return {
        theta,
        phi,
        mappedSurfaceLift: mappedSurfaceLiftAt(theta, phi),
        surfaceLift: navigationSurfaceLiftAt(theta, phi),
        surfaces,
        nearestObstacles,
      };
    },
  });
}
