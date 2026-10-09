export const PLANET_RADIUS = 50000;
export const TOWN_CURVE_SCALE = 1 / PLANET_RADIUS;
export const LOGICAL_CENTER_PHI = 0;
export const ACTUAL_CENTER_PHI = Math.PI * 0.5;
export const LOGICAL_THETA_PERIOD = (Math.PI * 2) / TOWN_CURVE_SCALE;
export const TOWN_DISTANCE_SCALE = PLANET_RADIUS * TOWN_CURVE_SCALE;

export const GROUND_EPSILON = 0.0008;
export const FOUNDATION_SINK = 0.004;
export const ROAD_SURFACE_OFFSET = 0.0012;

export const ROUND_TIME = 900;
export const DELIVERY_DISTANCE = 1.2;

export const RIDER_SCALE = 0.31;
export const RIDER_COLLISION_RADIUS = 0.06;
export const RIDER_VISUAL_GROUND_OFFSET = -0.032;
export const TURN_SPEED = 10.2;
export const WALK_SPEED = 0.82;
export const RUN_SPEED = WALK_SPEED * 2;
export const DEV_FAST_RUN_SPEED = 6.4;

export const MAX_WALKABLE_STEP_HEIGHT = 0.055;
export const MAX_NAVIGATION_SUBSTEP = 0.025;
export const HOUSE_COLLISION_RADIUS = 0.34;
export const TREE_COLLISION_RADIUS = 0.08;
export const ROCK_COLLISION_RADIUS = 0.2;

export const DEADZONE = 0.1;
export const ANALOG_INPUT_RADIUS = 75;
export const ANALOG_VISUAL_RESPONSE = 18;

export const OVERVIEW_DETAIL_LAYER = 1;
export const OVERVIEW_PROXY_LAYER = 2;
export const OVERVIEW_DETAIL_RADIUS = 0.26;
export const OVERVIEW_HORIZON_DOT = 0.1;

export function getMapRadiusUnits(mapData, metersPerWorldUnit) {
  return mapData.radiusMeters / metersPerWorldUnit;
}

// OSM buildings 0, 2, 3, 4, 10, 11, 12, 13, 14, 15, 50, 84, 90, 98, 104,
// 105, 121, 169, 2122, 2225, 2226, 2227, 2228, 2229, 2230, 2231, 2232 and
// 2233
// are Al-Abror, Rutan Situbondo, Bank BRI KC Situbondo, SD Negeri 6 Dawuhan, the
// Lesehan/Pegadaian frontage block, Kantor Pos's west-side compound wing,
// Kantor Pos, municipal library, Kwarcab Pramuka, the east-side tyre shop,
// Suzuki–VIAR corner, the six-part low compound directly south of Al-Abror,
// Warung Pojok, Bakti Motor, Pendopo Aryo, SD Islam Al-Abror, Pendopo's west
// office, the public gazebo, motorcycle shelter and east office. Their generic
// extrusions are replaced by surveyed art. Current z21 satellite and the 2023–
// 2024 road sequence resolve stale Pendopo footprints 2229, 2230 and 2233 as
// open landscaped lawn/garden, so those three are suppressed without custom art.
export const REPLACEMENT_BUILDING_INDEX_LIST = [
  0,
  2,
  3,
  4,
  10,
  11,
  12,
  13,
  14,
  15,
  50,
  84,
  90,
  98,
  104,
  105,
  121,
  169,
  2122,
  2225,
  2226,
  2227,
  2228,
  2229,
  2230,
  2231,
  2232,
  2233,
];

export const REPLACEMENT_BUILDING_INDEXES = new Set(
  REPLACEMENT_BUILDING_INDEX_LIST,
);

// Rutan, BRI, the Lesehan/Pegadaian block, Kwarcab Pramuka, the Suzuki–VIAR
// corner and the six-building Al-Abror south compound keep their exact OSM
// polygons for collision while their generic visual extrusions are replaced.
// The other surveyed landmarks use dedicated hand-authored navigation shapes.
// Stale Pendopo 2229, 2230 and 2233 remain in this set so their false generic
// collisions disappear with their obsolete visual extrusions.
export const NAVIGATION_REPLACEMENT_BUILDING_INDEXES = new Set(
  REPLACEMENT_BUILDING_INDEX_LIST.filter(
    (buildingIndex) =>
      ![2, 3, 10, 14, 50, 84, 90, 98, 104, 105, 121].includes(buildingIndex),
  ),
);
