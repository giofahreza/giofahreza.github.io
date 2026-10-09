import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateMapMetadata } from "../src/world/geospatial-world.js";

const map = JSON.parse(await readFile(new URL("../public/data/situbondo-map.json", import.meta.url), "utf8"));
assert.doesNotThrow(() => validateMapMetadata(map));
for (const value of [null, [], false, "map"]) {
  assert.throws(() => validateMapMetadata(value), /Invalid map data/);
}
for (const field of ["coordinatePrecision", "anglePrecision", "radiusMeters"]) {
  for (const value of [undefined, null, 0, -1, NaN, Infinity, -Infinity, "10"]) {
    assert.throws(() => validateMapMetadata({ ...map, [field]: value }), new RegExp(field));
  }
}
for (const coordinatePrecision of [Number.MIN_VALUE, 1e-308, 1e-20, 1, 100]) {
  assert.throws(() => validateMapMetadata({ ...map, coordinatePrecision }), /coordinatePrecision/);
}
console.log("Map metadata guards passed for production data and invalid numeric metadata.");
