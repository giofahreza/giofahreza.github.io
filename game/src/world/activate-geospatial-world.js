import { renderMapStats } from "../ui/map-stats.js";
import { createGeospatialWorld } from "./geospatial-world.js";
import { toonGradient } from "../rendering/materials.js";

export function activateGeospatialWorld({
  collections: {
    animatedBoats,
    animatedFlowers,
    animatedFoliage,
    chimneySmoke,
    driftingClouds,
    footstepDust,
    lakeRipples,
  },
  constants: {
    NAVIGATION_REPLACEMENT_BUILDING_INDEXES,
    PLANET_RADIUS,
    REPLACEMENT_BUILDING_INDEXES,
  },
  mapData,
  navigation: {
    addBoxObstacle,
    addCameraCollider,
    addObstacle,
    registerStopNavigation,
    resetNavigation,
  },
  objects: {
    outlinePlanet,
    planet,
    riderMesh,
  },
  stops,
  surface: {
    sphericalPosition,
    surfaceFrame,
  },
  uiElements,
  world,
}) {
  const geospatialWorld = createGeospatialWorld(mapData, {
    gradientMap: toonGradient,
    planetRadius: PLANET_RADIUS,
    sphericalPosition,
    surfaceFrame,
    replacementBuildingIndexes: REPLACEMENT_BUILDING_INDEXES,
    navigationExcludedBuildingIndexes: NAVIGATION_REPLACEMENT_BUILDING_INDEXES,
  });
  world.add(geospatialWorld);
  renderMapStats(uiElements, mapData);

  // Retire the old invented grid at runtime while retaining the hand-built stop
  // models and rider. The source art stays available for later landmark passes.
  const retainedWorldObjects = new Set([
    planet,
    outlinePlanet,
    riderMesh,
    geospatialWorld,
    ...stops.map((stop) => stop.group),
    ...footstepDust.map((puff) => puff.mesh),
    ...world.children.filter(
      (object) =>
        object.name === "Lesehan Situbondo frontage · Google Street View 360",
    ),
  ]);
  [...world.children].forEach((object) => {
    if (!retainedWorldObjects.has(object)) world.remove(object);
  });

  resetNavigation();
  driftingClouds.length = 0;
  animatedFoliage.length = 0;
  animatedFlowers.length = 0;
  animatedBoats.length = 0;
  chimneySmoke.length = 0;
  lakeRipples.length = 0;

  const retainedLesehanBlock = [...retainedWorldObjects].find(
    (object) =>
      object.name === "Lesehan Situbondo frontage · Google Street View 360",
  );
  if (retainedLesehanBlock) addCameraCollider(retainedLesehanBlock);

  stops.forEach((stop) => {
    const hasDetailedNavigation = registerStopNavigation(stop);
    if (stop.kind === "alun") {
      (stop.group.userData.localObstacles ?? []).forEach(
        ({ north, east, width, depth, yaw = 0 }) => {
          addBoxObstacle(
            stop.theta + east,
            stop.phi - north,
            width,
            depth,
            (stop.yaw ?? 0) + yaw,
            `${stop.shortName ?? stop.name}: park obstacle`,
          );
        },
      );
      return;
    }
    if (!hasDetailedNavigation && stop.navigationRadius) {
      addObstacle(
        stop.theta,
        stop.phi,
        stop.navigationRadius,
        stop.shortName ?? stop.name,
      );
    }
  });

  return geospatialWorld;
}
