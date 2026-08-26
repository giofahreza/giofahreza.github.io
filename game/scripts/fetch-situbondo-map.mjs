import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CENTER = Object.freeze({
  name: "Alun-Alun Situbondo",
  lat: -7.7068185,
  lon: 114.0054037,
  osmType: "way",
  osmId: 185229377,
});
const RADIUS_METERS = 1000;
const FETCH_PADDING_METERS = 120;
const EARTH_RADIUS_METERS = 6371008.8;
const COORDINATE_PRECISION = 10; // decimetres
const ANGLE_PRECISION = 10000;
const RAW_MAP_ENDPOINTS = [
  "https://api.openstreetmap.org/api/0.6/map",
  "https://www.openstreetmap.org/api/0.6/map",
];
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/data/situbondo-map.json",
);

const PLACE_TYPES = Object.freeze([
  ["phone", "Toko ponsel"],
  ["food", "Kuliner"],
  ["retail", "Toko / pasar"],
  ["medical", "Kesehatan"],
  ["worship", "Tempat ibadah"],
  ["education", "Sekolah"],
  ["finance", "Bank / ATM"],
  ["fuel", "SPBU"],
  ["workshop", "Bengkel"],
  ["lodging", "Penginapan"],
  ["civic", "Layanan publik"],
  ["recreation", "Rekreasi"],
  ["transport", "Transportasi"],
]);

const radians = (degrees) => (degrees * Math.PI) / 180;
const degrees = (angle) => (angle * 180) / Math.PI;
const centerLatitudeRadians = radians(CENTER.lat);

function project({ lat, lon }) {
  return {
    east:
      radians(lon - CENTER.lon) *
      EARTH_RADIUS_METERS *
      Math.cos(centerLatitudeRadians),
    north: radians(lat - CENTER.lat) * EARTH_RADIUS_METERS,
  };
}

function unproject(east, north) {
  return {
    lat: CENTER.lat + degrees(north / EARTH_RADIUS_METERS),
    lon:
      CENTER.lon +
      degrees(east / (EARTH_RADIUS_METERS * Math.cos(centerLatitudeRadians))),
  };
}

function quantize(value) {
  return Math.round(value * COORDINATE_PRECISION);
}

function parseMetric(value) {
  if (value === undefined || value === null) return null;
  const match = String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function decodeXml(value = "") {
  return value
    .replace(/&#(\d+);/g, (_match, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_match, number) =>
      String.fromCodePoint(Number.parseInt(number, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttributes(source) {
  const attributes = {};
  for (const match of source.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    attributes[match[1]] = decodeXml(match[2]);
  }
  return attributes;
}

function parseTags(source = "") {
  const tags = {};
  for (const match of source.matchAll(/<tag\b([^>]*?)\/>/g)) {
    const attributes = parseAttributes(match[1]);
    if (attributes.k) tags[attributes.k] = attributes.v ?? "";
  }
  return tags;
}

function parseOsmXml(xml) {
  const nodes = new Map();
  for (const match of xml.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    const attributes = parseAttributes(match[1]);
    const id = Number(attributes.id);
    const lat = Number(attributes.lat);
    const lon = Number(attributes.lon);
    if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    nodes.set(id, {
      type: "node",
      id,
      lat,
      lon,
      tags: parseTags(match[2]),
    });
  }

  const ways = [];
  for (const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const attributes = parseAttributes(match[1]);
    const refs = [...match[2].matchAll(/<nd\b[^>]*ref="(\d+)"[^>]*\/>/g)].map(
      (reference) => Number(reference[1]),
    );
    const geometry = refs
      .map((reference) => nodes.get(reference))
      .filter(Boolean)
      .map(({ lat, lon }) => ({ lat, lon }));
    if (geometry.length < 2) continue;
    ways.push({
      type: "way",
      id: Number(attributes.id),
      tags: parseTags(match[2]),
      geometry,
    });
  }
  return { nodes: [...nodes.values()], ways };
}

function deterministicHeight(tags, id) {
  const explicitHeight = parseMetric(tags.height);
  if (explicitHeight) return Math.min(80, Math.max(2.4, explicitHeight));
  const levels = parseMetric(tags["building:levels"]);
  if (levels) return Math.min(80, Math.max(2.8, levels * 3.15));

  const type = tags.building ?? "yes";
  const bases = {
    apartments: 10.5,
    commercial: 7.2,
    hospital: 8.2,
    hotel: 8.4,
    industrial: 7.5,
    mosque: 8.5,
    office: 8.4,
    public: 7,
    retail: 5.8,
    school: 7.2,
    warehouse: 7.5,
  };
  const base =
    bases[type] ?? (type === "house" || type === "residential" ? 4.6 : 4.9);
  return base + ((Number(id) % 7) - 3) * 0.16;
}

function buildingClass(tags) {
  const type = tags.building ?? "yes";
  if (["commercial", "office", "retail", "supermarket"].includes(type)) return 1;
  if (["industrial", "warehouse", "manufacture"].includes(type)) return 2;
  if (
    ["public", "school", "hospital", "civic", "mosque", "church"].includes(type)
  ) {
    return 3;
  }
  return 0;
}

function polygonPlacement(element) {
  const raw = element.geometry?.map(project) ?? [];
  const points =
    raw.length > 1 &&
    raw[0].east === raw.at(-1).east &&
    raw[0].north === raw.at(-1).north
      ? raw.slice(0, -1)
      : raw;
  if (points.length < 3) return null;

  const center = points.reduce(
    (sum, point) => ({ east: sum.east + point.east, north: sum.north + point.north }),
    { east: 0, north: 0 },
  );
  center.east /= points.length;
  center.north /= points.length;

  let longest = { lengthSquared: 0, bearing: 0 };
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const east = next.east - current.east;
    const north = next.north - current.north;
    const lengthSquared = east * east + north * north;
    if (lengthSquared > longest.lengthSquared) {
      longest = { lengthSquared, bearing: Math.atan2(north, east) };
    }
  }

  const cos = Math.cos(longest.bearing);
  const sin = Math.sin(longest.bearing);
  let minAlong = Infinity;
  let maxAlong = -Infinity;
  let minAcross = Infinity;
  let maxAcross = -Infinity;
  points.forEach((point) => {
    const east = point.east - center.east;
    const north = point.north - center.north;
    const along = east * cos + north * sin;
    const across = -east * sin + north * cos;
    minAlong = Math.min(minAlong, along);
    maxAlong = Math.max(maxAlong, along);
    minAcross = Math.min(minAcross, across);
    maxAcross = Math.max(maxAcross, across);
  });

  const length = Math.max(2.2, maxAlong - minAlong);
  const width = Math.max(2.2, maxAcross - minAcross);
  const footprint = points.flatMap((point) => [
    quantize(point.east),
    quantize(point.north),
  ]);
  return [
    quantize(center.east),
    quantize(center.north),
    quantize(length),
    quantize(width),
    quantize(deterministicHeight(element.tags ?? {}, element.id)),
    Math.round(longest.bearing * ANGLE_PRECISION),
    buildingClass(element.tags ?? {}),
    footprint,
  ];
}

function roadClass(highway) {
  if (
    ["motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"].includes(
      highway,
    )
  ) {
    return 0;
  }
  if (["secondary", "secondary_link"].includes(highway)) return 1;
  if (["tertiary", "tertiary_link"].includes(highway)) return 2;
  if (["residential", "unclassified", "living_street"].includes(highway)) return 3;
  if (
    ["footway", "path", "pedestrian", "steps", "cycleway", "bridleway"].includes(
      highway,
    )
  ) {
    return 5;
  }
  return 4;
}

function inferredRoadWidth(tags) {
  const explicit = parseMetric(tags.width);
  if (explicit) return Math.min(24, Math.max(1.2, explicit));
  const lanes = parseMetric(tags.lanes);
  if (lanes) return Math.min(24, Math.max(2.4, lanes * 3.05));
  return [11, 8.5, 6.8, 5.2, 3.6, 1.8][roadClass(tags.highway)];
}

function inferredWaterwayWidth(tags) {
  const explicit = parseMetric(tags.width);
  if (explicit) return Math.min(40, Math.max(1.2, explicit));
  return {
    river: 11,
    canal: 6,
    stream: 3.5,
    drain: 2.4,
    ditch: 1.8,
  }[tags.waterway] ?? 3.5;
}

function insideCircle(point) {
  return point.east * point.east + point.north * point.north <= RADIUS_METERS ** 2;
}

function segmentCircleIntersections(start, end) {
  const dx = end.east - start.east;
  const dy = end.north - start.north;
  const a = dx * dx + dy * dy;
  if (a < 1e-9) return [];
  const b = 2 * (start.east * dx + start.north * dy);
  const c = start.east ** 2 + start.north ** 2 - RADIUS_METERS ** 2;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((time) => time >= 0 && time <= 1)
    .sort((left, right) => left - right)
    .map((time) => ({
      east: start.east + dx * time,
      north: start.north + dy * time,
    }));
}

function clipPolyline(points) {
  const parts = [];
  let current = [];
  const append = (point) => {
    const previous = current.at(-1);
    if (
      !previous ||
      Math.hypot(previous.east - point.east, previous.north - point.north) > 0.01
    ) {
      current.push(point);
    }
  };
  const finish = () => {
    if (current.length > 1) parts.push(current);
    current = [];
  };

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const startInside = insideCircle(start);
    const endInside = insideCircle(end);
    const intersections = segmentCircleIntersections(start, end);

    if (startInside && endInside) {
      append(start);
      append(end);
    } else if (startInside && !endInside) {
      append(start);
      if (intersections.length) append(intersections.at(-1));
      finish();
    } else if (!startInside && endInside) {
      if (intersections.length) append(intersections[0]);
      append(end);
    } else if (intersections.length === 2) {
      append(intersections[0]);
      append(intersections[1]);
      finish();
    } else {
      finish();
    }
  }
  finish();
  return parts;
}

function quantizedLine(points) {
  const result = [];
  points.forEach((point) => {
    const east = quantize(point.east);
    const north = quantize(point.north);
    if (result.at(-2) !== east || result.at(-1) !== north) result.push(east, north);
  });
  return result;
}

function elementPoint(element) {
  if (element.type === "node") return project(element);
  const points = element.geometry?.map(project) ?? [];
  if (points.length === 0) return null;
  const total = points.reduce(
    (sum, point) => ({ east: sum.east + point.east, north: sum.north + point.north }),
    { east: 0, north: 0 },
  );
  return { east: total.east / points.length, north: total.north / points.length };
}

function classifyPlace(tags) {
  const amenity = tags.amenity?.toLowerCase();
  const shop = tags.shop?.toLowerCase();
  const tourism = tags.tourism?.toLowerCase();
  const healthcare = tags.healthcare?.toLowerCase();
  const leisure = tags.leisure?.toLowerCase();
  const office = tags.office?.toLowerCase();
  const craft = tags.craft?.toLowerCase();
  const railway = tags.railway?.toLowerCase();
  const publicTransport = tags.public_transport?.toLowerCase();
  const name = `${tags.name ?? ""} ${tags.brand ?? ""}`.toLowerCase();

  if (
    ["mobile_phone", "electronics", "computer"].includes(shop) ||
    /\b(ponsel|phone|cell|gadget|telkomsel|indosat|smartfren)\b/.test(name)
  ) {
    return 0;
  }
  if (
    ["restaurant", "cafe", "fast_food", "food_court", "ice_cream"].includes(amenity) ||
    ["bakery", "confectionery", "deli", "coffee", "beverages", "seafood"].includes(shop) ||
    /\b(warung|bakso|soto|kopi|cafe|resto|makan|kuliner|lesehan)\b/.test(name)
  ) {
    return 1;
  }
  if (
    healthcare ||
    ["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(amenity)
  ) {
    return 3;
  }
  if (amenity === "place_of_worship") return 4;
  if (["school", "college", "kindergarten", "university", "library"].includes(amenity)) {
    return 5;
  }
  if (
    ["bank", "atm", "bureau_de_change"].includes(amenity) ||
    office === "financial" ||
    /\b(bank|bpr|bri|bca|atm)\b/.test(name)
  ) {
    return 6;
  }
  if (amenity === "fuel") return 7;
  if (
    ["car_repair", "motorcycle_repair", "tyres"].includes(shop) ||
    ["mechanic", "metal_construction", "electrician", "carpenter"].includes(craft)
  ) {
    return 8;
  }
  if (["hotel", "guest_house", "hostel", "motel", "homestay"].includes(tourism)) {
    return 9;
  }
  if (
    [
      "townhall",
      "courthouse",
      "police",
      "fire_station",
      "post_office",
      "community_centre",
      "social_facility",
    ].includes(amenity) ||
    office === "government" ||
    tourism === "museum"
  ) {
    return 10;
  }
  if (
    leisure ||
    ["cinema", "arts_centre", "theatre"].includes(amenity) ||
    ["attraction", "gallery"].includes(tourism)
  ) {
    return 11;
  }
  if (
    railway === "station" ||
    publicTransport ||
    ["bus_station", "ferry_terminal", "taxi", "bicycle_rental"].includes(amenity)
  ) {
    return 12;
  }
  if (shop || amenity === "marketplace") return 2;
  return null;
}

function placeName(tags, typeIndex) {
  const value = tags.name ?? tags.brand ?? tags.operator ?? PLACE_TYPES[typeIndex][1];
  return String(value).replace(/\s+/g, " ").trim().slice(0, 80);
}

function buildingMatchAt(east, north, buildings) {
  let bestHeight = 0;
  let bestIndex = -1;
  let bestArea = Infinity;
  let nearestHeight = 0;
  let nearestIndex = -1;
  let nearestGap = Infinity;
  buildings.forEach((building, buildingIndex) => {
    const centerEast = building[0] / COORDINATE_PRECISION;
    const centerNorth = building[1] / COORDINATE_PRECISION;
    const length = building[2] / COORDINATE_PRECISION;
    const width = building[3] / COORDINATE_PRECISION;
    const bearing = building[5] / ANGLE_PRECISION;
    const deltaEast = east - centerEast;
    const deltaNorth = north - centerNorth;
    const along = deltaEast * Math.cos(bearing) + deltaNorth * Math.sin(bearing);
    const across = -deltaEast * Math.sin(bearing) + deltaNorth * Math.cos(bearing);
    const area = length * width;
    if (
      Math.abs(along) <= length * 0.5 + 2 &&
      Math.abs(across) <= width * 0.5 + 2 &&
      area < bestArea
    ) {
      bestArea = area;
      bestHeight = building[4];
      bestIndex = buildingIndex;
    }
    const gap = Math.max(
      0,
      Math.hypot(deltaEast, deltaNorth) - Math.hypot(length, width) * 0.5,
    );
    if (gap < nearestGap) {
      nearestGap = gap;
      nearestHeight = building[4];
      nearestIndex = buildingIndex;
    }
  });
  if (bestIndex >= 0) return { height: bestHeight, index: bestIndex };
  if (nearestGap <= 12) return { height: nearestHeight, index: nearestIndex };
  return { height: 0, index: -1 };
}

function createPlaces(elements, buildings) {
  const candidates = [];
  elements.forEach((element) => {
    const typeIndex = classifyPlace(element.tags ?? {});
    if (typeIndex === null) return;
    const point = elementPoint(element);
    if (!point || !insideCircle(point)) return;
    candidates.push({
      east: point.east,
      north: point.north,
      typeIndex,
      name: placeName(element.tags ?? {}, typeIndex),
      explicitlyNamed: Boolean(element.tags?.name || element.tags?.brand),
    });
  });

  candidates.sort((left, right) => Number(right.explicitlyNamed) - Number(left.explicitlyNamed));
  const retained = [];
  candidates.forEach((candidate) => {
    const normalizedName = candidate.name.toLocaleLowerCase("id-ID");
    const duplicate = retained.some((other) => {
      if (other.typeIndex !== candidate.typeIndex) return false;
      const separation = Math.hypot(
        other.east - candidate.east,
        other.north - candidate.north,
      );
      if (other.normalizedName === normalizedName) return separation < 35;
      return separation < 9 && (!candidate.explicitlyNamed || !other.explicitlyNamed);
    });
    if (duplicate) return;
    retained.push({ ...candidate, normalizedName });
  });

  return retained.map((place) => {
    const building = buildingMatchAt(place.east, place.north, buildings);
    return [
      quantize(place.east),
      quantize(place.north),
      place.typeIndex,
      building.height,
      place.name,
      building.index,
    ];
  });
}

function buildBbox() {
  const extent = RADIUS_METERS + FETCH_PADDING_METERS;
  const southWest = unproject(-extent, -extent);
  const northEast = unproject(extent, extent);
  return [southWest.lon, southWest.lat, northEast.lon, northEast.lat]
    .map((value) => value.toFixed(7))
    .join(",");
}

async function fetchRawMap() {
  const bbox = buildBbox();
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const endpoint = RAW_MAP_ENDPOINTS[attempt % RAW_MAP_ENDPOINTS.length];
    try {
      const url = new URL(endpoint);
      url.searchParams.set("bbox", bbox);
      process.stdout.write(`OSM snapshot via ${url.host}... `);
      const response = await fetch(url, {
        headers: { "user-agent": "SitubondoMessengerMapBuilder/2.0" },
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 120)}`);
      }
      const xml = await response.text();
      console.log(`${(Buffer.byteLength(xml) / 1024 / 1024).toFixed(2)} MiB`);
      return xml;
    } catch (error) {
      lastError = error;
      console.log(`failed (${error.message})`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200 * (attempt + 1)));
    }
  }
  throw new Error(`Unable to fetch Situbondo snapshot: ${lastError?.message ?? "unknown error"}`);
}

async function main() {
  const { nodes, ways } = parseOsmXml(await fetchRawMap());
  const intersectsSurveyCircle = (way) => {
    const geometry = way.geometry?.map(project) ?? [];
    return geometry.some(insideCircle) || clipPolyline(geometry).length > 0;
  };

  const buildings = ways
    .filter((way) => way.tags?.building)
    .map(polygonPlacement)
    .filter(
      (building) =>
        building &&
        Math.hypot(building[0], building[1]) <=
          RADIUS_METERS * COORDINATE_PRECISION,
    );
  const highwayWays = ways.filter(
    (way) => way.tags?.highway && intersectsSurveyCircle(way),
  );
  const railwayWays = ways.filter(
    (way) => way.tags?.railway && intersectsSurveyCircle(way),
  );
  const waterwayWays = ways.filter(
    (way) => way.tags?.waterway && intersectsSurveyCircle(way),
  );
  const bridgeWays = ways.filter(
    (way) =>
      way.tags?.bridge &&
      way.tags.bridge !== "no" &&
      (way.tags.highway || way.tags.railway) &&
      intersectsSurveyCircle(way),
  );

  const roads = [];
  highwayWays.forEach((way) => {
    const tags = way.tags ?? {};
    const style = roadClass(tags.highway);
    const width = quantize(inferredRoadWidth(tags));
    clipPolyline(way.geometry.map(project)).forEach((part) => {
      const line = quantizedLine(part);
      if (line.length >= 4) roads.push([style, width, line]);
    });
  });

  const linearFeatures = (sourceWays, widthForWay) => {
    const output = [];
    sourceWays.forEach((way) => {
      clipPolyline(way.geometry.map(project)).forEach((part) => {
        const line = quantizedLine(part);
        if (line.length >= 4) output.push([quantize(widthForWay(way.tags ?? {})), line]);
      });
    });
    return output;
  };
  const railways = linearFeatures(railwayWays, () => 2.2);
  const waterways = linearFeatures(waterwayWays, inferredWaterwayWidth);
  const bridges = [];
  bridgeWays.forEach((way) => {
    const tags = way.tags ?? {};
    const mode = tags.railway ? 1 : roadClass(tags.highway) === 5 ? 2 : 0;
    const width = tags.highway ? inferredRoadWidth(tags) : 2.2;
    clipPolyline(way.geometry.map(project)).forEach((part) => {
      const line = quantizedLine(part);
      if (line.length >= 4) {
        bridges.push([mode, quantize(width), line, String(tags.name ?? "Jembatan").slice(0, 60)]);
      }
    });
  });

  const places = createPlaces([...nodes, ...ways], buildings);
  const matchedPlaceBuildings = new Set(
    places.filter((place) => place[5] >= 0).map((place) => place[5]),
  );
  const roadLengthMeters = roads.reduce((total, road) => {
    const coordinates = road[2];
    let length = 0;
    for (let index = 2; index < coordinates.length; index += 2) {
      length +=
        Math.hypot(
          coordinates[index] - coordinates[index - 2],
          coordinates[index + 1] - coordinates[index - 1],
        ) / COORDINATE_PRECISION;
    }
    return total + length;
  }, 0);
  const areaSquareKilometers =
    (Math.PI * RADIUS_METERS * RADIUS_METERS) / 1_000_000;
  const placeCounts = Object.fromEntries(
    PLACE_TYPES.map(([key], typeIndex) => [
      key,
      places.filter((place) => place[2] === typeIndex).length,
    ]),
  );

  const output = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    source: {
      name: "OpenStreetMap",
      licence: "ODbL 1.0",
      copyright: "© OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
      snapshotEndpoint: "OpenStreetMap map API",
    },
    center: CENTER,
    radiusMeters: RADIUS_METERS,
    boundary: {
      playable: true,
      outsideStatus: "restricted",
      outsideLabel: "Area pengembangan",
    },
    coordinatePrecision: COORDINATE_PRECISION,
    anglePrecision: ANGLE_PRECISION,
    placeTypes: PLACE_TYPES,
    stats: {
      sourceBuildingWays: buildings.length,
      renderedBuildings: buildings.length,
      sourceHighwayWays: highwayWays.length,
      renderedRoadParts: roads.length,
      roadLengthMeters: Math.round(roadLengthMeters),
      sourceRailwayWays: railwayWays.length,
      sourceWaterwayWays: waterwayWays.length,
      sourceBridgeWays: bridgeWays.length,
      renderedBridgeParts: bridges.length,
      semanticPlaces: places.length,
      semanticPlaceBuildingMatches: places.filter((place) => place[5] >= 0).length,
      animatedSemanticBuildings: matchedPlaceBuildings.size,
      placeCounts,
      surveyAreaSquareKilometers: Number(areaSquareKilometers.toFixed(4)),
      mappedBuildingsPerSquareKilometer: Number(
        (buildings.length / areaSquareKilometers).toFixed(2),
      ),
    },
    buildings,
    roads,
    railways,
    waterways,
    bridges,
    places,
  };

  const serialized = JSON.stringify(output);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, serialized);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Buildings: ${buildings.length.toLocaleString("en-US")}`);
  console.log(`Road parts: ${roads.length.toLocaleString("en-US")}`);
  console.log(`Living places: ${places.length.toLocaleString("en-US")}`);
  console.log(`Waterways: ${waterways.length}; bridges: ${bridges.length}`);
  console.log(`Size: ${(Buffer.byteLength(serialized) / 1024).toFixed(1)} KiB`);
}

await main();
