const freezeCoordinates = (coordinates) => Object.freeze(coordinates);

// Every source fragment below is redrawn by addAlunAlunRoadContext(). Keeping
// the generic ribbon underneath also keeps its inferred two-sided curb and
// sidewalk, which can rise through the tangent-plane landmark as the camera
// moves. Match exact quantized centre lines so an OSM refresh cannot silently
// mask a different road.
export const ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS = Object.freeze([
  Object.freeze({
    label: "west local connector",
    style: 2,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([
      -970, 666, -963, 618, -775, -316, -634, -883,
    ]),
  }),
  Object.freeze({
    label: "south shared approach",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([1039, -642, 980, -425, 897, -76, 760, 503]),
  }),
  Object.freeze({
    label: "south-west local connector",
    style: 2,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([
      -634, -883, -581, -937, -526, -953, -385, -953, -127, -894,
      496, -768, 689, -722, 1039, -642,
    ]),
  }),
  Object.freeze({
    label: "north-arm continuation",
    style: 1,
    // Retain the distant prefix through [755, 1610]. The custom north arm
    // begins there and replaces only the final segment to [714, 1458].
    retainedPointCount: 4,
    coordinates: freezeCoordinates([
      1037, 2695, 956, 2381, 872, 2060, 755, 1610, 714, 1458,
    ]),
  }),
  Object.freeze({
    label: "east outbound carriageway",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([696, 1170, 935, 1221]),
  }),
  Object.freeze({
    label: "west shared approach",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([
      -1458, 554, -1423, 564, -970, 666, -137, 878,
    ]),
  }),
  Object.freeze({
    label: "west park-side carriageway",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([604, 1023, 398, 985, 110, 906, -137, 878]),
  }),
  Object.freeze({
    label: "west post-office-side carriageway",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([-137, 878, 79, 986, 373, 1070, 596, 1156]),
  }),
  Object.freeze({
    label: "north-east diagonal branch",
    style: 3,
    // Keep the distant prefix through [1483, 1080]; the landmark owns the
    // remaining two segments into the compact junction.
    retainedPointCount: 8,
    coordinates: freezeCoordinates([
      2719, 1670, 2731, 1621, 2735, 1570, 2719, 1524, 2668, 1483,
      2598, 1450, 2019, 1235, 1483, 1080, 743, 872, 660, 857,
    ]),
  }),
  Object.freeze({
    label: "south park-side carriageway",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([760, 503, 676, 793, 660, 857, 639, 1008]),
  }),
  Object.freeze({
    label: "north-arm junction connector",
    style: 1,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([714, 1458, 643, 1179]),
  }),
  Object.freeze({
    label: "compact junction loop",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([
      578, 1132, 596, 1156, 618, 1171, 643, 1179, 670, 1179, 696, 1170,
      722, 1150, 738, 1121, 742, 1088, 734, 1056, 711, 1026, 677, 1009,
      639, 1008, 604, 1023, 583, 1045, 571, 1073, 569, 1103, 578, 1132,
    ]),
  }),
  Object.freeze({
    label: "south shop-side carriageway",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([711, 1026, 743, 872, 760, 503]),
  }),
  Object.freeze({
    label: "east inbound carriageway",
    style: 0,
    retainedPointCount: 0,
    coordinates: freezeCoordinates([
      935, 1221, 1294, 1303, 1406, 1337, 1469, 1356,
    ]),
  }),
  Object.freeze({
    label: "east opposing carriageway",
    style: 0,
    // Retain the distant prefix through [1601, 1314].
    retainedPointCount: 3,
    coordinates: freezeCoordinates([
      2719, 1670, 2649, 1649, 1601, 1314, 1394, 1249, 961, 1130, 734, 1056,
    ]),
  }),
]);

const roadKey = (style, coordinates) => `${style}:${coordinates.join(",")}`;
const replacementsByRoadKey = new Map(
  ALUN_ALUN_GENERATED_ROAD_REPLACEMENTS.map((replacement) => [
    roadKey(replacement.style, replacement.coordinates),
    replacement,
  ]),
);

export function getAlunAlunGeneratedRoadReplacement(road) {
  return replacementsByRoadKey.get(roadKey(road[0], road[2])) ?? null;
}

export function maskAlunAlunGeneratedRoads(roads) {
  return roads.flatMap((road) => {
    const replacement = getAlunAlunGeneratedRoadReplacement(road);
    if (!replacement) return [road];

    const retainedCoordinates = road[2].slice(
      0,
      replacement.retainedPointCount * 2,
    );
    if (retainedCoordinates.length < 4) return [];

    const retainedRoad = [...road];
    retainedRoad[2] = retainedCoordinates;
    return [retainedRoad];
  });
}
