import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";

// Execute the production activation body; replace only expensive map creation
// and DOM/material imports. Real Three groups preserve child/parent semantics.
const source = await readFile(new URL("../src/world/activate-geospatial-world.js", import.meta.url), "utf8");
function loadActivation(moduleSource) {
  let body = moduleSource;
  for (const declaration of [
    'import { renderMapStats } from "../ui/map-stats.js";',
    'import { createGeospatialWorld } from "./geospatial-world.js";',
    'import { toonGradient } from "../rendering/materials.js";',
  ]) {
    assert.ok(body.includes(declaration), "activation fixture import boundary changed");
    body = body.replace(declaration, "");
  }
  body = body.replace("export function activateGeospatialWorld", "function activateGeospatialWorld");
  return new Function("renderMapStats", "createGeospatialWorld", "toonGradient",
    `${body}\nreturn activateGeospatialWorld;`)(
    () => {},
    () => Object.assign(new THREE.Group(), { name: "fixture geospatial world" }),
    null,
  );
}

function checkRegistration(activate, withLesehan) {
  const world = new THREE.Group();
  const planet = new THREE.Group();
  const outlinePlanet = new THREE.Group();
  const riderMesh = new THREE.Group();
  const retired = new THREE.Group();
  const dust = new THREE.Group();
  const lesehan = Object.assign(new THREE.Group(), {
    name: "Lesehan Situbondo frontage · Google Street View 360",
  });
  const stops = ["alun", "gazebo", "mosque", "pendopo", "market", "station", "beach"]
    .map((kind) => ({ kind, group: new THREE.Group(), theta: 0, phi: 0, navigationRadius: 1 }));
  world.add(planet, outlinePlanet, riderMesh, retired, dust, ...stops.map(({ group }) => group));
  if (withLesehan) world.add(lesehan);
  const cameraColliders = [retired, ...stops.map(({ group }) => group)];
  const calls = [];
  const collections = Object.fromEntries([
    "animatedBoats", "animatedFlowers", "animatedFoliage", "chimneySmoke", "driftingClouds", "lakeRipples",
  ].map((name) => [name, [retired]]));
  collections.footstepDust = [{ mesh: dust }];
  const options = {
    collections,
    constants: { NAVIGATION_REPLACEMENT_BUILDING_INDEXES: new Set(), PLANET_RADIUS: 50000, REPLACEMENT_BUILDING_INDEXES: new Set() },
    mapData: {},
    navigation: {
      addBoxObstacle() {},
      addObstacle() {},
      addCameraCollider(object) { calls.push(["camera", object]); cameraColliders.push(object); },
      registerStopNavigation(stop) { calls.push(["walking", stop.group]); return stop.kind !== "station"; },
      resetNavigation() { calls.push(["reset"]); cameraColliders.length = 0; },
    },
    objects: { outlinePlanet, planet, riderMesh },
    stops,
    surface: { sphericalPosition() {}, surfaceFrame() {} },
    uiElements: {},
    world,
  };
  let previousMap;
  for (let activation = 0; activation < 2; activation += 1) {
    calls.length = 0;
    const map = activate(options);
    assert.equal(calls[0][0], "reset", "camera registration must follow navigation reset");
    const expected = [...(withLesehan ? [lesehan] : []), ...stops.map(({ group }) => group)];
    assert.equal(cameraColliders.length, expected.length, "retained camera collider count mismatch");
    for (const group of expected) {
      assert.equal(cameraColliders.filter((object) => object === group).length, 1,
        "each retained collider must be registered exactly once");
      assert.equal(group.parent, world);
    }
    assert.equal(cameraColliders.includes(retired), false, "retired geometry still collides with camera");
    assert.equal(retired.parent, null);
    assert.equal(dust.parent, world);
    assert.equal(map.parent, world);
    if (previousMap) assert.equal(previousMap.parent, null, "prior map remains after reactivation");
    for (const stop of stops) {
      assert.ok(calls.findIndex(([kind, group]) => kind === "camera" && group === stop.group) <
        calls.findIndex(([kind, group]) => kind === "walking" && group === stop.group),
      "stop collider must survive the alun early return and detailed-navigation branch");
    }
    previousMap = map;
  }
}

for (const withLesehan of [false, true]) checkRegistration(loadActivation(source), withLesehan);
const missingStopRegistration = source.replace("addCameraCollider(stop.group);", "");
assert.notEqual(missingStopRegistration, source, "negative-control removal target missing");
assert.throws(() => checkRegistration(loadActivation(missingStopRegistration), true),
  /retained camera collider count mismatch/, "negative control must detect lost stop colliders");
console.log("Camera activation: seven retained stops, optional Lesehan, reset ordering, retired-object removal, repeat activation and missing-registration negative control passed.");
