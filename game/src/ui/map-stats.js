export function renderMapStats(elements, mapData) {
  const {
    mapBuildingCountNode,
    mapPlaceCountNode,
    mapRadiusNode,
    mapAreaNode,
  } = elements;

  mapBuildingCountNode.textContent =
    mapData.stats.renderedBuildings.toLocaleString("en-US");
  mapPlaceCountNode.textContent =
    mapData.stats.animatedSemanticBuildings.toLocaleString("en-US");
  mapRadiusNode.textContent = `${(mapData.radiusMeters / 1000).toFixed(0)} km`;
  mapAreaNode.textContent =
    `${mapData.stats.surveyAreaSquareKilometers.toFixed(2)} km²`;
}
