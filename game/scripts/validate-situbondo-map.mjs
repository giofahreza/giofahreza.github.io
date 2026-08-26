import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve("public/data/situbondo-map.json");
const map = JSON.parse(await readFile(path, "utf8"));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(map.schemaVersion === 3, "unexpected schema version");
check(map.radiusMeters === 1000, "playable survey radius is not exactly 1 km");
check(map.boundary?.outsideStatus === "restricted", "outside area is not marked restricted");
check(map.coordinatePrecision === 10, "coordinates are not stored at decimetre precision");
check(
  map.stats.renderedBuildings === map.buildings.length,
  "rendered building count does not match payload",
);
check(
  map.stats.sourceBuildingWays === map.buildings.length,
  "a mapped building footprint was dropped",
);
check(map.buildings.length >= 3000, "1 km building population is unexpectedly incomplete");
check(map.roads.length >= 250, "1 km road network is unexpectedly incomplete");
check(map.places.length >= 100, "semantic place layer is unexpectedly incomplete");
check(map.stats.semanticPlaces === map.places.length, "semantic place count does not match payload");
check(map.placeTypes.length >= 12, "semantic place taxonomy is incomplete");

let farthestBuildingCenter = 0;
map.buildings.forEach((building) => {
  const east = building[0] / map.coordinatePrecision;
  const north = building[1] / map.coordinatePrecision;
  farthestBuildingCenter = Math.max(farthestBuildingCenter, Math.hypot(east, north));
  check(
    building[2] > 0 && building[3] > 0 && building[4] > 0,
    "building has a non-positive dimension",
  );
  check(
    Array.isArray(building[7]) && building[7].length >= 6 && building[7].length % 2 === 0,
    "building is missing its exact footprint polygon",
  );
  building[7]?.forEach((coordinate) => {
    check(Number.isInteger(coordinate), "building footprint is not quantized");
  });
});
check(
  farthestBuildingCenter <= map.radiusMeters + 0.2,
  "a building center lies outside the 1 km development zone",
);

function validateLine(coordinates, label) {
  check(
    coordinates.length >= 4 && coordinates.length % 2 === 0,
    `${label} coordinate list is malformed`,
  );
  let farthest = 0;
  for (let index = 0; index < coordinates.length; index += 2) {
    const east = coordinates[index] / map.coordinatePrecision;
    const north = coordinates[index + 1] / map.coordinatePrecision;
    farthest = Math.max(farthest, Math.hypot(east, north));
  }
  check(farthest <= map.radiusMeters + 0.2, `${label} lies outside the 1 km circle`);
  return farthest;
}

let roadPointCount = 0;
let farthestRoadPoint = 0;
map.roads.forEach((road) => {
  roadPointCount += road[2].length / 2;
  farthestRoadPoint = Math.max(
    farthestRoadPoint,
    validateLine(road[2], "clipped road"),
  );
});
map.waterways.forEach((waterway) => validateLine(waterway[1], "waterway"));
map.railways.forEach((railway) => validateLine(railway[1], "railway"));
map.bridges.forEach((bridge) => validateLine(bridge[2], "bridge"));

const representedPlaceTypes = new Set();
const matchedSemanticBuildings = new Set();
map.places.forEach((place) => {
  const distance = Math.hypot(place[0], place[1]) / map.coordinatePrecision;
  check(distance <= map.radiusMeters + 0.2, "a semantic place lies outside the 1 km circle");
  check(Number.isInteger(place[2]) && map.placeTypes[place[2]], "place has an invalid type");
  check(typeof place[4] === "string" && place[4].length > 0, "place is missing its mapped name");
  check(
    place[5] === -1 || map.buildings[place[5]],
    "place references an invalid real building",
  );
  if (place[5] >= 0) matchedSemanticBuildings.add(place[5]);
  representedPlaceTypes.add(place[2]);
});
check(representedPlaceTypes.size >= 10, "too few semantic place types are represented");
check(map.waterways.length > 0, "no animated waterways are available");
check(map.bridges.length > 0, "no tagged bridges are available");
check(matchedSemanticBuildings.size >= 90, "too few semantic places match a real building");
check(
  map.stats.animatedSemanticBuildings === matchedSemanticBuildings.size,
  "animated semantic building count does not match payload",
);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  const area = (Math.PI * map.radiusMeters ** 2) / 1_000_000;
  console.log(`Center: ${map.center.lat}, ${map.center.lon}`);
  console.log(`Playable radius: ${(map.radiusMeters / 1000).toFixed(2)} km (${area.toFixed(2)} km²)`);
  console.log(`Outside status: ${map.boundary.outsideStatus} / ${map.boundary.outsideLabel}`);
  console.log(`Buildings: ${map.buildings.length.toLocaleString("en-US")}`);
  console.log(
    `Road parts: ${map.roads.length.toLocaleString("en-US")} (${roadPointCount.toLocaleString("en-US")} points)`,
  );
  console.log(`Living places: ${map.places.length.toLocaleString("en-US")} across ${representedPlaceTypes.size} types`);
  console.log(`Purpose-animated real buildings: ${matchedSemanticBuildings.size.toLocaleString("en-US")}`);
  console.log(`Waterways: ${map.waterways.length}; tagged bridges: ${map.bridges.length}`);
  console.log(`Farthest building center: ${farthestBuildingCenter.toFixed(1)} m`);
  console.log(`Farthest clipped road point: ${farthestRoadPoint.toFixed(1)} m`);
  console.log("Map validation passed");
}
