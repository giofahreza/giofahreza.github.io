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
export const RUN_SPEED = 6.4;

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

// OSM buildings 0, 3, 4, 10, 11, 12, 13, 15, 169, 567, 2122, 2225, 2226 and 2228
// are Al-Abror, Bank BRI KC Situbondo, SD Negeri 6 Dawuhan, the
// Lesehan/Pegadaian frontage block, Kantor Pos's west-side compound wing,
// Kantor Pos, municipal library, the east-side tyre shop, Warung Pojok, the
// southeast SEWA BILLBOARD showroom, Bakti Motor, Pendopo Aryo, SD Islam
// Al-Abror and the Pendopo gazebo. Their generic extrusions are replaced
// one-for-one by surveyed art. OSM 617 is the road-edge SEWA BILLBOARD
// showroom used by the custom facade; OSM 567 is its masked rear duplicate.
export const REPLACEMENT_BUILDING_INDEX_LIST = [
  0,
  3,
  4,
  10,
  11,
  12,
  13,
  15,
  169,
  567,
  617,
  2122,
  2225,
  2226,
  2228,
];

export const REPLACEMENT_BUILDING_INDEXES = new Set(
  REPLACEMENT_BUILDING_INDEX_LIST,
);

// BRI and the Lesehan/Pegadaian block keep their exact OSM polygons for
// collision while their generic visual extrusions are replaced. The other
// surveyed landmarks use dedicated hand-authored navigation shapes.
export const NAVIGATION_REPLACEMENT_BUILDING_INDEXES = new Set(
  REPLACEMENT_BUILDING_INDEX_LIST.filter(
    (buildingIndex) => buildingIndex !== 3 && buildingIndex !== 10,
  ),
);
