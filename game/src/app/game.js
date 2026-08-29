import * as THREE from "three";
import {
  MAP_METERS_PER_WORLD_UNIT,
  loadSitubondoMap,
} from "../world/geospatial-world.js";
import { getUiElements } from "../ui/dom.js";
import { createInterfaceController } from "../ui/interface.js";
import { createGameRuntime } from "./game-runtime.js";
import { createGameAssets } from "../rendering/game-assets.js";
import { createGameRenderer } from "../rendering/renderer.js";
import { createSceneGraph } from "../rendering/scene.js";
import { createWorldObjects } from "../rendering/world-objects.js";
import {
  createGameState,
  createHudCache,
  createRiderState,
  createTouchState,
} from "../state/game-state.js";
import {
  ACTUAL_CENTER_PHI,
  ANALOG_INPUT_RADIUS,
  ANALOG_VISUAL_RESPONSE,
  DEADZONE,
  DELIVERY_DISTANCE,
  DEV_FAST_RUN_SPEED,
  FOUNDATION_SINK,
  GROUND_EPSILON,
  LOGICAL_CENTER_PHI,
  LOGICAL_THETA_PERIOD,
  MAX_NAVIGATION_SUBSTEP,
  MAX_WALKABLE_STEP_HEIGHT,
  NAVIGATION_REPLACEMENT_BUILDING_INDEXES,
  OVERVIEW_DETAIL_LAYER,
  OVERVIEW_DETAIL_RADIUS,
  OVERVIEW_HORIZON_DOT,
  OVERVIEW_PROXY_LAYER,
  PLANET_RADIUS,
  RIDER_COLLISION_RADIUS,
  RIDER_SCALE,
  RIDER_VISUAL_GROUND_OFFSET,
  ROAD_SURFACE_OFFSET,
  ROCK_COLLISION_RADIUS,
  ROUND_TIME,
  RUN_SPEED,
  REPLACEMENT_BUILDING_INDEXES,
  TOWN_CURVE_SCALE,
  TOWN_DISTANCE_SCALE,
  TREE_COLLISION_RADIUS,
  TURN_SPEED,
  WALK_SPEED,
  getMapRadiusUnits,
} from "../config/runtime.js";
import { createStops } from "../data/stops.js";
import { initializeDevSession } from "../devtools/dev-session.js";
import { installDevSettings } from "../devtools/dev-settings.js";
import { installDebugApi } from "../devtools/debug-api.js";
import { installMapEditor } from "../devtools/map-editor.js";
import { populateBaseWorld } from "../features/environment/populate-base-world.js";
import { createLandmarkHelpers } from "../features/landmarks/helpers.js";
import { populateStops } from "../features/landmarks/populate-stops.js";
import { populateScenery } from "../features/scenery/populate.js";
import { createTownBuildingSystem } from "../features/town/buildings.js";
import { createInputController } from "../input/controls.js";
import { createNavigationSystem } from "../navigation/navigation.js";
import { createMovementController } from "../player/movement.js";
import { createRiderSystem } from "../player/rider.js";
import { activateGeospatialWorld } from "../world/activate-geospatial-world.js";
import { createSurfaceGeometryTools } from "../world/surface-geometry.js";
import {
  placeOnPlanet,
  sphericalPosition,
  surfaceFrame,
  surfaceOffsetFromNormal,
} from "../world/surface.js";
import "../ui/style.css?v=situbondo-v30";

const situbondoMapData = await loadSitubondoMap();
let geospatialWorld = null;

const uiElements = getUiElements();
const {
  app,
  canvas,
  startButton,
  deliveryToast,
} = uiElements;

// The geospatial layer uses a fixed metric projection: five real metres equal
// one Three.js world unit. The active 1 km development zone therefore occupies
// exactly 200 surface units in every direction, without axis-specific stretching.
const MAP_RADIUS_UNITS = getMapRadiusUnits(
  situbondoMapData,
  MAP_METERS_PER_WORLD_UNIT,
);
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let prefersReducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener?.("change", (event) => {
  prefersReducedMotion = event.matches;
});

const { outlineEffect, renderer } = createGameRenderer(canvas);
const {
  camera,
  cameraRig,
  paintedSky,
  paintedSkyMaterial,
  scene,
  world,
} = createSceneGraph();
const driftingClouds = [];
const animatedFoliage = [];
const animatedFlowers = [];
const animatedBoats = [];
const chimneySmoke = [];
const lakeRipples = [];
const animatedStopDetails = [];
const {
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
} = createGameAssets();

const {
  conformGeometryToPlanet,
  createSurfacePatch,
  makeMeridian,
  makePatchGeometry,
  makeRoute,
  makeSurfaceRibbon,
  offsetSurfacePoints,
} = createSurfaceGeometryTools({
  materials: {
    roadCenterMaterial,
    roadEdgeMaterial,
    roadMaterial,
    sidewalkMaterial,
    situbondoCurbMaterial,
  },
  world,
});

const {
  outlinePlanet,
  planet,
  sun,
} = createWorldObjects({
  constants: {
    PLANET_RADIUS,
  },
  materials: {
    planetMaterial,
  },
  scene,
  world,
});

const gameState = createGameState();
const hudCache = createHudCache();
const rider = createRiderState();
const keys = new Set();
const touchState = createTouchState();
const {
  bindAnalog,
  bindBrakeButton,
  bindKeyboardControls,
  bindRunButton,
  resetAnalog,
  updateAnalogVisual,
} = createInputController({
  constants: {
    ANALOG_INPUT_RADIUS,
    ANALOG_VISUAL_RESPONSE,
  },
  elements: uiElements,
  gameState,
  keys,
  touchState,
});

const stops = createStops();
const {
  addBoxObstacle,
  addBuildingFootprint,
  addCameraCollider,
  addObstacle,
  buildingFootprints,
  cameraCollisionMeshes,
  mappedSurfaceLiftAt,
  navigationSurfaceLiftAt,
  obstacleGapAtSurfacePoint,
  obstacles,
  registerStopNavigation,
  reset: resetNavigation,
  surfaceTransitionIsBlocked,
  walkableSurfaces,
  wireRoofClearances,
} = createNavigationSystem({
  constants: {
    GROUND_EPSILON,
    MAP_METERS_PER_WORLD_UNIT,
    MAX_WALKABLE_STEP_HEIGHT,
    PLANET_RADIUS,
    RIDER_COLLISION_RADIUS,
  },
  getGeospatialWorld: () => geospatialWorld,
});

const upAxis = new THREE.Vector3(0, 1, 0);
const cameraRaycaster = new THREE.Raycaster();

const {
  ROAD_LOOP_START,
  distanceToNearestRoad,
  hasPlacementClearance,
  isInsideRoadCorridor,
  latitudeRoads,
  meridianRoads,
} = populateBaseWorld({
  constants: {
    ACTUAL_CENTER_PHI,
    LOGICAL_CENTER_PHI,
    PLANET_RADIUS,
    ROAD_SURFACE_OFFSET,
    TOWN_CURVE_SCALE,
    TOWN_DISTANCE_SCALE,
  },
  helpers: {
    conformGeometryToPlanet,
    createSurfacePatch,
    makeMeridian,
    makePatchGeometry,
    makeRoute,
    makeSurfaceRibbon,
    offsetSurfacePoints,
  },
  materials: {
    grassPatchMaterial,
    inkMaterial,
    roadMaterial,
    rockPatchMaterial,
    sandPatchMaterial,
    sidewalkMaterial,
    waterMaterial,
  },
  navigation: {
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
    obstacles,
  },
  world,
});

const {
  addDeliveryMarker,
  addIndonesianFlag,
  addLocalPalm,
  addPendopoPennant,
  addPendopoSimpleColumn,
  addSitubondoSign,
  addStopMotif,
  createArchPanelGeometry,
  getSitubondoSignMaterial,
} = createLandmarkHelpers({
  animatedStopDetails,
  materials: {
    flowerMaterials,
    foliageMaterials,
    inkMaterial,
    letterMaterial,
    targetMaterial,
    trunkMaterial,
  },
});
const { alunAlunTraffic } = populateStops({
  collections: {
    animatedStopDetails,
    chimneySmoke,
  },
  constants: {
    FOUNDATION_SINK,
    MAP_METERS_PER_WORLD_UNIT,
  },
  helpers: {
    addDeliveryMarker,
    addIndonesianFlag,
    addLocalPalm,
    addPendopoPennant,
    addPendopoSimpleColumn,
    addSitubondoSign,
    addStopMotif,
    createArchPanelGeometry,
    getSitubondoSignMaterial,
  },
  materials: {
    chimneySmokeMaterial,
    foliageMaterials,
    inkMaterial,
    letterMaterial,
    rockMaterial,
    targetMaterial,
    trunkMaterial,
  },
  navigation: {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
  },
  stops,
  world,
});

const {
  infillRows,
  infillStats,
  townMetalMaterial,
  townSignMaterials,
  townTrimMaterial,
  townWindowMaterial,
  townWoodMaterial,
} = createTownBuildingSystem({
  constants: {
    FOUNDATION_SINK,
    LOGICAL_THETA_PERIOD,
    OVERVIEW_DETAIL_LAYER,
    OVERVIEW_PROXY_LAYER,
    ROAD_LOOP_START,
  },
  helpers: {
    distanceToNearestRoad,
    hasPlacementClearance,
    isInsideRoadCorridor,
  },
  materials: {
    inkMaterial,
    targetMaterial,
  },
  navigation: {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
  },
  overviewGeometries: {
    overviewBoxGeometry,
    overviewConeRoofGeometry,
    overviewGableRoofGeometry,
  },
  world,
});

populateScenery({
  collections: {
    animatedBoats,
    animatedFlowers,
    animatedFoliage,
    driftingClouds,
    lakeRipples,
  },
  constants: {
    ACTUAL_CENTER_PHI,
    LOGICAL_CENTER_PHI,
    LOGICAL_THETA_PERIOD,
    OVERVIEW_DETAIL_LAYER,
    PLANET_RADIUS,
    ROAD_LOOP_START,
    ROCK_COLLISION_RADIUS,
    TOWN_CURVE_SCALE,
    TOWN_DISTANCE_SCALE,
    TREE_COLLISION_RADIUS,
  },
  helpers: {
    addIndonesianFlag,
    addLocalPalm,
    addSitubondoSign,
    conformGeometryToPlanet,
    distanceToNearestRoad,
    hasPlacementClearance,
    isInsideRoadCorridor,
  },
  infillRows,
  infillStats,
  materials: {
    cloudMaterial,
    cloudShadowGeometry,
    cloudShadowMaterial,
    flowerMaterials,
    foliageMaterials,
    inkMaterial,
    lakeRippleGeometry,
    rippleMaterial,
    rockMaterial,
    targetMaterial,
    townMetalMaterial,
    townSignMaterials,
    townTrimMaterial,
    townWindowMaterial,
    townWoodMaterial,
    treeMaterial,
    trunkMaterial,
    waterMaterial,
  },
  navigation: {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
    buildingFootprints,
    obstacles,
    wireRoofClearances,
  },
  upAxis,
  world,
});

const {
  footstepDust,
  riderMesh,
  updateFootstepDust,
  updateRiderAnimation,
  updateRiderTransform,
} = createRiderSystem({
  constants: {
    DEV_FAST_RUN_SPEED,
    PLANET_RADIUS,
    RIDER_SCALE,
    RIDER_VISUAL_GROUND_OFFSET,
    RUN_SPEED,
    WALK_SPEED,
  },
  gameState,
  getReducedMotion: () => prefersReducedMotion,
  materials: {
    dustMaterial,
    inkMaterial,
    letterMaterial,
    targetMaterial,
  },
  navigationSurfaceLiftAt,
  rider,
  world,
});

const {
  angularDistance,
  applyDirectMovement,
  getHeadingTangent,
  getMovementInput,
  headingTowardStop,
  shortestAngleDelta,
  stepRider,
} = createMovementController({
  cameraRig,
  constants: {
    ACTUAL_CENTER_PHI,
    DEADZONE,
    DEV_FAST_RUN_SPEED,
    LOGICAL_CENTER_PHI,
    LOGICAL_THETA_PERIOD,
    MAP_METERS_PER_WORLD_UNIT,
    MAP_RADIUS_UNITS,
    MAX_NAVIGATION_SUBSTEP,
    PLANET_RADIUS,
    RIDER_COLLISION_RADIUS,
    RUN_SPEED,
    TOWN_CURVE_SCALE,
    TOWN_DISTANCE_SCALE,
    TURN_SPEED,
    WALK_SPEED,
  },
  gameState,
  getGeospatialWorld: () => geospatialWorld,
  keys,
  navigation: {
    obstacles,
    surfaceTransitionIsBlocked,
  },
  rider,
  stops,
  touchState,
});

const {
  hideMessage,
  showDeliveryFeedback,
  showMessage,
  updateHud,
  updateInterface,
  updateNearbyPlaceCard,
  updateTargetMarker,
} = createInterfaceController({
  angularDistance,
  cameraRig,
  constants: {
    DELIVERY_DISTANCE,
    MAP_METERS_PER_WORLD_UNIT,
    PLANET_RADIUS,
  },
  elements: uiElements,
  gameState,
  headingTowardStop,
  hudCache,
  mapData: situbondoMapData,
  rider,
  shortestAngleDelta,
  stops,
});

const {
  getDetailedRenderMode,
  overviewLodStats,
  requestGameFrame,
  resetGame,
  resize,
  snapCameraToDesired,
} = createGameRuntime({
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
  getGeospatialWorld: () => geospatialWorld,
  getReducedMotion: () => prefersReducedMotion,
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
});

bindKeyboardControls();

window.addEventListener("resize", () => {
  resetAnalog();
  resize();
});
startButton.addEventListener("click", () => {
  startButton.blur();
  resetGame();
  canvas.focus({ preventScroll: true });
});

installDebugApi({
  camera,
  cameraRig,
  constants: {
    ANALOG_INPUT_RADIUS,
    DEV_FAST_RUN_SPEED,
    MAP_METERS_PER_WORLD_UNIT,
    MAP_RADIUS_UNITS,
    PLANET_RADIUS,
    RIDER_COLLISION_RADIUS,
    RUN_SPEED,
    WALK_SPEED,
  },
  distanceToNearestRoad,
  elements: uiElements,
  environment: {
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
  },
  gameState,
  getDetailedRenderMode,
  getGeospatialWorld: () => geospatialWorld,
  getReducedMotion: () => prefersReducedMotion,
  mapData: situbondoMapData,
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
});

geospatialWorld = activateGeospatialWorld({
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
  mapData: situbondoMapData,
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
});

bindAnalog();
bindRunButton();
bindBrakeButton();

let devTools = null;
const installDevToolsOnce = () => {
  if (devTools) return;
  devTools = {
    settings: installDevSettings({
      constants: {
        DEV_FAST_RUN_SPEED,
        RUN_SPEED,
      },
      elements: uiElements,
      gameState,
      requestGameFrame,
      rider,
    }),
    mapEditor: installMapEditor({
      elements: uiElements,
      gameState,
      placeOnPlanet,
      requestGameFrame,
      scene,
      stops,
      updateHud,
      updateTargetMarker,
      world,
    }),
  };
};

initializeDevSession({
  elements: uiElements,
  gameState,
  onAuthenticated: installDevToolsOnce,
  startGame: resetGame,
}).catch((error) => {
  console.error("Dev session failed to initialize", error);
});

// The mapped population and its purpose-specific facade details are already
// batched. The old proxy builder would duplicate their matrices without
// reducing draw calls.
updateRiderTransform();
updateTargetMarker();
updateHud();
resize();
snapCameraToDesired();
requestGameFrame();
