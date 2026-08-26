import * as THREE from "three";

export const MAP_METERS_PER_WORLD_UNIT = 5;

const SEMANTIC_BUILDING_COLORS = [
  0x78aee0,
  0xdd9272,
  0xdfb768,
  0xdf858c,
  0x7fba99,
  0x78a5c0,
  0xcfb750,
  0x71a890,
  0x988778,
  0xa986bb,
  0x789994,
  0x64a8b8,
  0x7897bd,
];

const SEMANTIC_BUILDING_PRIORITY = [
  95, 80, 60, 100, 88, 82, 92, 75, 85, 72, 68, 58, 70,
];

function collectSemanticBuildingPlaces(mapData) {
  const byBuilding = new Map();
  (mapData.places ?? []).forEach((place) => {
    const buildingIndex = place[5] ?? -1;
    if (buildingIndex < 0 || !mapData.buildings?.[buildingIndex]) return;
    const retained = byBuilding.get(buildingIndex);
    if (
      !retained ||
      (SEMANTIC_BUILDING_PRIORITY[place[2]] ?? 0) >
        (SEMANTIC_BUILDING_PRIORITY[retained[2]] ?? 0)
    ) {
      byBuilding.set(buildingIndex, place);
    }
  });
  return byBuilding;
}

export async function loadSitubondoMap() {
  const url = new URL(
    `${import.meta.env.BASE_URL}data/situbondo-map.json`,
    window.location.href,
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Map data request failed with HTTP ${response.status}`);
  }
  return response.json();
}

export function geoMetersToLogical(eastMeters, northMeters) {
  return {
    theta: eastMeters / MAP_METERS_PER_WORLD_UNIT,
    phi: -northMeters / MAP_METERS_PER_WORLD_UNIT,
  };
}

function createToonMaterial(gradientMap, options) {
  const { roughness: _roughness, metalness: _metalness, ...toonOptions } =
    options;
  const material = new THREE.MeshToonMaterial({
    gradientMap,
    ...toonOptions,
  });
  material.userData.outlineParameters = {
    thickness: 0.0013,
    color: [0.12, 0.18, 0.18],
    alpha: 0.55,
  };
  return material;
}

function decodeCoordinate(value, precision) {
  return value / precision;
}

function setScaledBasis(matrix, right, normal, forward, width, height, depth) {
  matrix.makeBasis(
    right.clone().multiplyScalar(width),
    normal.clone().multiplyScalar(height),
    forward.clone().multiplyScalar(depth),
  );
}

function createFacadeTexture(style = 0) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      let frame = x >= 8 && x <= 56 && y >= 10 && y <= 48;
      let glass = x >= 12 && x <= 52 && y >= 14 && y <= 43;
      let mullion = glass && (Math.abs(x - 32) <= 1 || Math.abs(y - 29) <= 1);
      let sill = y >= 47 && y <= 51 && x >= 6 && x <= 58;
      if (style === 1) {
        frame = x >= 3 && x <= 61 && y >= 7 && y <= 55;
        glass = x >= 6 && x <= 58 && y >= 10 && y <= 51;
        mullion = glass && (x % 17 <= 2 || Math.abs(y - 31) <= 1);
        sill = y >= 53 && y <= 57;
      } else if (style === 2) {
        frame = x >= 7 && x <= 57 && y >= 14 && y <= 57;
        glass = x >= 11 && x <= 53 && y >= 18 && y <= 53;
        mullion = glass && (x % 8 <= 1 || y % 10 <= 1);
        sill = x % 8 <= 1;
      } else if (style === 3) {
        frame = x >= 14 && x <= 50 && y >= 5 && y <= 54;
        glass = x >= 18 && x <= 46 && y >= 9 && y <= 49;
        mullion = glass && Math.abs(x - 32) <= 1;
        sill = y >= 52 && y <= 57 && x >= 10 && x <= 54;
      }
      const floorLine = y <= 2;
      let red = 238;
      let green = 235;
      let blue = 222;
      if (frame || sill) {
        red = 210;
        green = 207;
        blue = 194;
      }
      if (glass) {
        red = 72 + Math.round((1 - y / size) * 22);
        green = 112 + Math.round((1 - y / size) * 26);
        blue = 125 + Math.round((1 - y / size) * 29);
      }
      if (mullion) {
        red = 198;
        green = 203;
        blue = 194;
      }
      if (floorLine) {
        red = 190;
        green = 185;
        blue = 169;
      }
      const grain = ((x * 17 + y * 31) % 5) - 2;
      data[index] = THREE.MathUtils.clamp(red + grain, 0, 255);
      data[index + 1] = THREE.MathUtils.clamp(green + grain, 0, 255);
      data[index + 2] = THREE.MathUtils.clamp(blue + grain, 0, 255);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createAttachedSignTexture(label, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const drawing = canvas.getContext("2d");
  const fill = new THREE.Color(color);
  drawing.fillStyle = `#${fill.getHexString()}`;
  drawing.fillRect(0, 0, canvas.width, canvas.height);
  drawing.strokeStyle = "rgba(255,255,255,.88)";
  drawing.lineWidth = 5;
  drawing.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  drawing.fillStyle = "#f8fbef";
  drawing.font = "800 29px system-ui, sans-serif";
  drawing.textAlign = "center";
  drawing.textBaseline = "middle";
  drawing.fillText(label.toUpperCase(), canvas.width * 0.5, canvas.height * 0.52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createBuildingPopulation(mapData, context) {
  const { anglePrecision, buildings, coordinatePrecision } = mapData;
  const { gradientMap, planetRadius, sphericalPosition } = context;
  const palettes = [
    [0xd5c8ac, 0xc9bda5, 0xd9c0aa, 0xbcc5b4, 0xe0cda9],
    [0xb7b8ae, 0xc4b5a3, 0xaebfc0, 0xd0c1ac],
    [0xa9aca6, 0xb9a98f, 0x9fa7a3, 0xc1b59d],
    [0xe0d2b4, 0xd8c9aa, 0xc8d0bd, 0xe4c2ac],
  ];
  const facadeTextures = [0, 1, 2, 3].map(createFacadeTexture);
  const semanticFacadeStyles = [1, 1, 1, 3, 3, 3, 1, 1, 2, 1, 3, 1, 1];
  const materialCount = palettes.length + SEMANTIC_BUILDING_COLORS.length;
  const wallMaterials = Array.from({ length: materialCount }, (_, index) =>
    createToonMaterial(gradientMap, {
      color: 0xffffff,
      map: facadeTextures[
        index < palettes.length
          ? index
          : semanticFacadeStyles[index - palettes.length] ?? 0
      ],
      vertexColors: true,
      fog: true,
      side: THREE.DoubleSide,
    }),
  );
  const roofMaterials = Array.from({ length: materialCount }, () =>
    createToonMaterial(gradientMap, {
      color: 0xffffff,
      vertexColors: true,
      fog: true,
      side: THREE.DoubleSide,
    }),
  );
  [...wallMaterials, ...roofMaterials].forEach((material) => {
    material.userData.outlineParameters = { visible: false };
  });
  const buckets = wallMaterials.map(() => []);
  const semanticBuildings = collectSemanticBuildingPlaces(mapData);
  buildings.forEach((building, buildingIndex) => {
    if (context.replacementBuildingIndexes?.has(buildingIndex)) return;
    const semanticPlace = semanticBuildings.get(buildingIndex);
    const bucketIndex = semanticPlace
      ? palettes.length + semanticPlace[2]
      : building[6] ?? 0;
    buckets[bucketIndex].push({ building, buildingIndex });
  });

  const group = new THREE.Group();
  group.name = "Architectural OSM building population";
  buckets.forEach((placements, classIndex) => {
    if (placements.length === 0) return;
    const wallPositions = [];
    const wallUvs = [];
    const wallColors = [];
    const wallIndices = [];
    const roofPositions = [];
    const roofColors = [];
    const roofIndices = [];

    placements.forEach(({ building, buildingIndex }) => {
      const height = Math.max(
        0.48,
        decodeCoordinate(building[4], coordinatePrecision) /
          MAP_METERS_PER_WORLD_UNIT,
      );
      const heightMeters = height * MAP_METERS_PER_WORLD_UNIT;
      let footprint = building[7];
      if (!Array.isArray(footprint) || footprint.length < 6) {
        const east = building[0];
        const north = building[1];
        const halfLength = building[2] * 0.5;
        const halfWidth = building[3] * 0.5;
        const bearing = building[5] / anglePrecision;
        const alongX = Math.cos(bearing) * halfLength;
        const alongY = Math.sin(bearing) * halfLength;
        const acrossX = -Math.sin(bearing) * halfWidth;
        const acrossY = Math.cos(bearing) * halfWidth;
        footprint = [
          east - alongX - acrossX, north - alongY - acrossY,
          east + alongX - acrossX, north + alongY - acrossY,
          east + alongX + acrossX, north + alongY + acrossY,
          east - alongX + acrossX, north - alongY + acrossY,
        ];
      }
      const baseClass = building[6] ?? 0;
      const palette = palettes[baseClass] ?? palettes[0];
      const facadeColor = classIndex < palettes.length
        ? new THREE.Color(palette[buildingIndex % palette.length])
        : new THREE.Color(SEMANTIC_BUILDING_COLORS[classIndex - palettes.length]);
      const roofPalette = baseClass === 2
        ? [0x778081, 0x8d8d83, 0x6f7778]
        : baseClass === 1
          ? [0x665f57, 0x795f50, 0x62696a]
          : [0x98543f, 0xa96848, 0x765c4d, 0xb37956];
      const roofColor = new THREE.Color(
        roofPalette[Math.abs(buildingIndex * 7 + building[0]) % roofPalette.length],
      );
      const outline = [];
      const bases = [];
      const roofEdges = [];
      for (let pointIndex = 0; pointIndex < footprint.length; pointIndex += 2) {
        const eastMeters = decodeCoordinate(footprint[pointIndex], coordinatePrecision);
        const northMeters = decodeCoordinate(footprint[pointIndex + 1], coordinatePrecision);
        outline.push(new THREE.Vector2(eastMeters, northMeters));
        const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
        bases.push(sphericalPosition(theta, phi, planetRadius + 0.012));
        roofEdges.push(
          sphericalPosition(theta, phi, planetRadius + 0.012 + height),
        );
      }
      const count = outline.length;
      for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
        const next = (pointIndex + 1) % count;
        const vertexStart = wallPositions.length / 3;
        [bases[pointIndex], bases[next], roofEdges[pointIndex], roofEdges[next]].forEach(
          (position) => {
            wallPositions.push(position.x, position.y, position.z);
            wallColors.push(facadeColor.r, facadeColor.g, facadeColor.b);
          },
        );
        const edgeMeters = outline[pointIndex].distanceTo(outline[next]);
        const horizontalTiles = Math.max(0.75, edgeMeters / 3.15);
        const verticalTiles = Math.max(1, heightMeters / 3.05);
        wallUvs.push(
          0, 0,
          horizontalTiles, 0,
          0, verticalTiles,
          horizontalTiles, verticalTiles,
        );
        wallIndices.push(
          vertexStart,
          vertexStart + 1,
          vertexStart + 2,
          vertexStart + 2,
          vertexStart + 1,
          vertexStart + 3,
        );
      }

      const roofVertexStart = roofPositions.length / 3;
      roofEdges.forEach((position) => {
        roofPositions.push(position.x, position.y, position.z);
        roofColors.push(roofColor.r, roofColor.g, roofColor.b);
      });
      if (classIndex < palettes.length && (baseClass === 0 || baseClass === 3)) {
        const eastMeters = decodeCoordinate(building[0], coordinatePrecision);
        const northMeters = decodeCoordinate(building[1], coordinatePrecision);
        const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
        const roofRise = 0.3 +
          (Math.abs(building[0] * 13 + building[1] * 7) % 20) / 100;
        const apex = sphericalPosition(
          theta,
          phi,
          planetRadius + 0.012 + height + roofRise,
        );
        const apexIndex = roofPositions.length / 3;
        roofPositions.push(apex.x, apex.y, apex.z);
        roofColors.push(roofColor.r, roofColor.g, roofColor.b);
        for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
          roofIndices.push(
            roofVertexStart + pointIndex,
            roofVertexStart + ((pointIndex + 1) % count),
            apexIndex,
          );
        }
      } else {
        THREE.ShapeUtils.triangulateShape(outline, []).forEach((triangle) => {
          roofIndices.push(
            roofVertexStart + triangle[0],
            roofVertexStart + triangle[1],
            roofVertexStart + triangle[2],
          );
        });
      }
    });

    const wallGeometry = new THREE.BufferGeometry();
    wallGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(wallPositions, 3),
    );
    wallGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(wallUvs, 2));
    wallGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(wallColors, 3),
    );
    wallGeometry.setIndex(wallIndices);
    wallGeometry.computeVertexNormals();
    wallGeometry.computeBoundingSphere();
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterials[classIndex]);
    wallMesh.name =
      classIndex < palettes.length
        ? `Windowed OSM building facades class ${classIndex}`
        : `Animated real buildings: ${mapData.placeTypes[classIndex - palettes.length]?.[0] ?? "place"}`;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    const roofGeometry = new THREE.BufferGeometry();
    roofGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(roofPositions, 3),
    );
    roofGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(roofColors, 3),
    );
    roofGeometry.setIndex(roofIndices);
    roofGeometry.computeVertexNormals();
    roofGeometry.computeBoundingSphere();
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterials[classIndex]);
    roofMesh.name = `Distinct mapped roofs class ${classIndex}`;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;

    group.add(wallMesh, roofMesh);
  });
  return group;
}

function createBuildingArchitecture(mapData, context) {
  const group = new THREE.Group();
  group.name = "Mapped doors, porches, shop canopies and rooftop equipment";
  const roadSegments = [];
  const roadGrid = new Map();
  const roadCellSize = 80;
  const roadGridKey = (x, y) => `${x},${y}`;
  mapData.roads.forEach((road) => {
    for (let index = 2; index < road[2].length; index += 2) {
      const segment = {
        a: {
          x: road[2][index - 2] / mapData.coordinatePrecision,
          y: road[2][index - 1] / mapData.coordinatePrecision,
        },
        b: {
          x: road[2][index] / mapData.coordinatePrecision,
          y: road[2][index + 1] / mapData.coordinatePrecision,
        },
      };
      roadSegments.push(segment);
      for (
        let cellX = Math.floor(Math.min(segment.a.x, segment.b.x) / roadCellSize);
        cellX <= Math.floor(Math.max(segment.a.x, segment.b.x) / roadCellSize);
        cellX += 1
      ) {
        for (
          let cellY = Math.floor(Math.min(segment.a.y, segment.b.y) / roadCellSize);
          cellY <= Math.floor(Math.max(segment.a.y, segment.b.y) / roadCellSize);
          cellY += 1
        ) {
          const key = roadGridKey(cellX, cellY);
          if (!roadGrid.has(key)) roadGrid.set(key, []);
          roadGrid.get(key).push(segment);
        }
      }
    }
  });
  const states = mapData.buildings.map((building, buildingIndex) => {
    if (context.replacementBuildingIndexes?.has(buildingIndex)) return null;
    const eastMeters = decodeCoordinate(building[0], mapData.coordinatePrecision);
    const northMeters = decodeCoordinate(building[1], mapData.coordinatePrecision);
    const length = Math.max(
      0.44,
      decodeCoordinate(building[2], mapData.coordinatePrecision) /
        MAP_METERS_PER_WORLD_UNIT,
    );
    const width = Math.max(
      0.44,
      decodeCoordinate(building[3], mapData.coordinatePrecision) /
        MAP_METERS_PER_WORLD_UNIT,
    );
    const height = Math.max(
      0.48,
      decodeCoordinate(building[4], mapData.coordinatePrecision) /
        MAP_METERS_PER_WORLD_UNIT,
    );
    const bearing = building[5] / mapData.anglePrecision;
    const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
    const frame = context.surfaceFrame(theta, phi);
    const along = frame.east
      .clone()
      .multiplyScalar(Math.cos(bearing))
      .addScaledVector(frame.north, Math.sin(bearing))
      .normalize();
    const across = new THREE.Vector3()
      .crossVectors(frame.normal, along)
      .normalize();
    const acrossEast = -Math.sin(bearing);
    const acrossNorth = Math.cos(bearing);
    let nearestRoadPoint = null;
    let nearestRoadDistanceSquared = Infinity;
    const nearbyRoadSegments = new Set();
    const roadCellX = Math.floor(eastMeters / roadCellSize);
    const roadCellY = Math.floor(northMeters / roadCellSize);
    for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        roadGrid
          .get(roadGridKey(roadCellX + offsetX, roadCellY + offsetY))
          ?.forEach((segment) => nearbyRoadSegments.add(segment));
      }
    }
    (nearbyRoadSegments.size > 0 ? nearbyRoadSegments : roadSegments).forEach((segment) => {
      const point = closestPointOnSegment(
        eastMeters,
        northMeters,
        segment.a,
        segment.b,
      );
      const distanceSquared =
        (eastMeters - point.x) ** 2 + (northMeters - point.y) ** 2;
      if (distanceSquared < nearestRoadDistanceSquared) {
        nearestRoadDistanceSquared = distanceSquared;
        nearestRoadPoint = point;
      }
    });
    const frontSign = nearestRoadPoint
      ? Math.sign(
          (nearestRoadPoint.x - eastMeters) * acrossEast +
          (nearestRoadPoint.y - northMeters) * acrossNorth,
        ) || 1
      : 1;
    let frontDistanceMeters = width * MAP_METERS_PER_WORLD_UNIT * 0.5;
    if (Array.isArray(building[7])) {
      frontDistanceMeters = 0;
      for (let pointIndex = 0; pointIndex < building[7].length; pointIndex += 2) {
        const pointEast =
          building[7][pointIndex] / mapData.coordinatePrecision - eastMeters;
        const pointNorth =
          building[7][pointIndex + 1] / mapData.coordinatePrecision - northMeters;
        frontDistanceMeters = Math.max(
          frontDistanceMeters,
          frontSign * (pointEast * acrossEast + pointNorth * acrossNorth),
        );
      }
    }
    return {
      building,
      buildingIndex,
      baseClass: building[6] ?? 0,
      length,
      width,
      height,
      along,
      across,
      normal: frame.normal,
      surface: context.sphericalPosition(
        theta,
        phi,
        context.planetRadius + 0.014,
      ),
      frontSign,
      frontDistance: Math.max(0.2, frontDistanceMeters / MAP_METERS_PER_WORLD_UNIT),
    };
  }).filter(Boolean);

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const doorMaterial = createToonMaterial(context.gradientMap, {
    color: 0xffffff,
    vertexColors: true,
    fog: true,
  });
  doorMaterial.userData.outlineParameters = { visible: false };
  const doors = new THREE.InstancedMesh(boxGeometry, doorMaterial, states.length);
  doors.name = "Physical mapped building entrances";
  doors.castShadow = true;
  const doorColors = [0x4b3027, 0x35596a, 0x66513c, 0x36584d, 0x754942];
  const matrix = new THREE.Matrix4();
  const axisX = new THREE.Vector3();
  const axisY = new THREE.Vector3();
  const axisZ = new THREE.Vector3();
  const position = new THREE.Vector3();
  states.forEach((state, index) => {
    const doorWidth = Math.min(0.2, state.length * 0.25);
    const doorHeight = Math.min(0.43, state.height * 0.72);
    matrix.makeBasis(
      axisX.copy(state.along).multiplyScalar(doorWidth),
      axisY.copy(state.normal).multiplyScalar(doorHeight),
      axisZ.copy(state.across).multiplyScalar(0.035 * state.frontSign),
    );
    position
      .copy(state.surface)
      .addScaledVector(
        state.across,
        state.frontSign * (state.frontDistance + 0.012),
      )
      .addScaledVector(state.normal, doorHeight * 0.5);
    matrix.setPosition(position);
    doors.setMatrixAt(index, matrix);
    doors.setColorAt(
      index,
      new THREE.Color(doorColors[(state.buildingIndex + state.baseClass) % doorColors.length]),
    );
  });
  doors.instanceMatrix.needsUpdate = true;
  doors.instanceColor.needsUpdate = true;
  doors.computeBoundingSphere();
  group.add(doors);

  const canopyStates = states.filter(
    (state) =>
      state.baseClass === 1 ||
      state.baseClass === 3 ||
      state.buildingIndex % 5 === 0,
  );
  const canopyMaterial = createToonMaterial(context.gradientMap, {
    color: 0xffffff,
    vertexColors: true,
    fog: true,
  });
  canopyMaterial.userData.outlineParameters = { visible: false };
  const canopies = new THREE.InstancedMesh(
    boxGeometry,
    canopyMaterial,
    canopyStates.length,
  );
  canopies.name = "Mapped porches and storefront canopies";
  canopies.castShadow = true;
  const canopyColors = [0xa8563f, 0xd4a444, 0x457b78, 0x726796, 0xd7c49d];
  canopyStates.forEach((state, index) => {
    const canopyWidth = Math.min(0.85, Math.max(0.3, state.length * 0.58));
    const canopyDepth = state.baseClass === 1 ? 0.25 : 0.18;
    matrix.makeBasis(
      axisX.copy(state.along).multiplyScalar(canopyWidth),
      axisY.copy(state.normal).multiplyScalar(0.045),
      axisZ.copy(state.across).multiplyScalar(canopyDepth * state.frontSign),
    );
    position
      .copy(state.surface)
      .addScaledVector(
        state.across,
        state.frontSign * (state.frontDistance + canopyDepth * 0.48),
      )
      .addScaledVector(state.normal, Math.min(0.5, state.height * 0.72));
    matrix.setPosition(position);
    canopies.setMatrixAt(index, matrix);
    canopies.setColorAt(
      index,
      new THREE.Color(canopyColors[(state.buildingIndex * 3) % canopyColors.length]),
    );
  });
  canopies.instanceMatrix.needsUpdate = true;
  canopies.instanceColor.needsUpdate = true;
  canopies.computeBoundingSphere();
  group.add(canopies);

  const rooftopStates = states.filter(
    (state) =>
      state.height > 0.75 &&
      (state.baseClass === 1 || state.baseClass === 2) &&
      state.buildingIndex % 4 === 0,
  );
  const equipmentMaterial = createToonMaterial(context.gradientMap, {
    color: 0x62777a,
    fog: true,
  });
  equipmentMaterial.userData.outlineParameters = { visible: false };
  const equipment = new THREE.InstancedMesh(
    boxGeometry,
    equipmentMaterial,
    rooftopStates.length,
  );
  equipment.name = "Rooftop tanks and utility housings";
  equipment.castShadow = true;
  rooftopStates.forEach((state, index) => {
    matrix.makeBasis(
      axisX.copy(state.along).multiplyScalar(0.22),
      axisY.copy(state.normal).multiplyScalar(0.18),
      axisZ.copy(state.across).multiplyScalar(0.2),
    );
    position
      .copy(state.surface)
      .addScaledVector(state.normal, state.height + 0.1)
      .addScaledVector(state.along, state.length * 0.17);
    matrix.setPosition(position);
    equipment.setMatrixAt(index, matrix);
  });
  equipment.instanceMatrix.needsUpdate = true;
  equipment.computeBoundingSphere();
  group.add(equipment);
  return group;
}

function buildRibbonGeometry(features, context, widthScale = 1, lift = 0.02) {
  const { coordinatePrecision } = context.mapData;
  const { planetRadius, sphericalPosition, surfaceFrame } = context;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const points = [];
  const tangent = new THREE.Vector3();
  const lateral = new THREE.Vector3();

  features.forEach((feature) => {
    const widthMeters = decodeCoordinate(feature[1], coordinatePrecision);
    const coordinates = feature[2];
    points.length = 0;
    for (let index = 0; index < coordinates.length; index += 2) {
      const eastMeters = decodeCoordinate(coordinates[index], coordinatePrecision);
      const northMeters = decodeCoordinate(coordinates[index + 1], coordinatePrecision);
      const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
      points.push({
        point: sphericalPosition(theta, phi, planetRadius + lift),
        normal: surfaceFrame(theta, phi).normal,
      });
    }
    if (points.length < 2) return;

    const firstVertex = positions.length / 3;
    const halfWidth =
      (widthMeters / MAP_METERS_PER_WORLD_UNIT) * widthScale * 0.5;
    let travelled = 0;
    points.forEach((entry, pointIndex) => {
      const previous = points[Math.max(0, pointIndex - 1)].point;
      const next = points[Math.min(points.length - 1, pointIndex + 1)].point;
      tangent.copy(next).sub(previous).normalize();
      lateral.crossVectors(entry.normal, tangent).normalize();
      if (pointIndex > 0) travelled += entry.point.distanceTo(points[pointIndex - 1].point);

      [-1, 1].forEach((side) => {
        const vertex = entry.point.clone().addScaledVector(lateral, side * halfWidth);
        vertex.setLength(entry.point.length());
        positions.push(vertex.x, vertex.y, vertex.z);
        normals.push(entry.normal.x, entry.normal.y, entry.normal.z);
        uvs.push(side < 0 ? 0 : 1, travelled);
      });
    });

    for (let row = 0; row < points.length - 1; row += 1) {
      const current = firstVertex + row * 2;
      indices.push(current, current + 2, current + 1, current + 1, current + 2, current + 3);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createRibbonMesh(features, material, context, options = {}) {
  const geometry = buildRibbonGeometry(
    features,
    context,
    options.widthScale ?? 1,
    options.lift ?? 0.02,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = options.name ?? "Mapped ribbons";
  mesh.receiveShadow = true;
  mesh.renderOrder = options.renderOrder ?? 0;
  return mesh;
}

const SIDEWALK_WIDTH_METERS = [2.1, 1.9, 1.7, 1.45, 1.2, 0];
const ROAD_SURFACE_LIFT = 0.024;
const SIDEWALK_SURFACE_LIFT = 0.034;

function buildRoadsideBandGeometry(features, context, bandStartMeters, bandWidthMeters, lift) {
  const { coordinatePrecision } = context.mapData;
  const { planetRadius, sphericalPosition, surfaceFrame } = context;
  const positions = [];
  const normals = [];
  const indices = [];
  const tangent = new THREE.Vector3();
  const lateral = new THREE.Vector3();

  features.forEach((feature) => {
    const roadHalfWidth =
      decodeCoordinate(feature[1], coordinatePrecision) /
      MAP_METERS_PER_WORLD_UNIT * 0.5;
    const start = roadHalfWidth + bandStartMeters / MAP_METERS_PER_WORLD_UNIT;
    const end = start + bandWidthMeters / MAP_METERS_PER_WORLD_UNIT;
    const points = [];
    for (let index = 0; index < feature[2].length; index += 2) {
      const eastMeters = decodeCoordinate(feature[2][index], coordinatePrecision);
      const northMeters = decodeCoordinate(feature[2][index + 1], coordinatePrecision);
      const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
      points.push({
        point: sphericalPosition(theta, phi, planetRadius + lift),
        normal: surfaceFrame(theta, phi).normal,
      });
    }
    if (points.length < 2) return;
    [-1, 1].forEach((side) => {
      const firstVertex = positions.length / 3;
      points.forEach((entry, pointIndex) => {
        const previous = points[Math.max(0, pointIndex - 1)].point;
        const next = points[Math.min(points.length - 1, pointIndex + 1)].point;
        tangent.copy(next).sub(previous).normalize();
        lateral.crossVectors(entry.normal, tangent).normalize();
        [start, end].forEach((offset) => {
          const vertex = entry.point.clone().addScaledVector(lateral, side * offset);
          vertex.setLength(entry.point.length());
          positions.push(vertex.x, vertex.y, vertex.z);
          normals.push(entry.normal.x, entry.normal.y, entry.normal.z);
        });
      });
      for (let row = 0; row < points.length - 1; row += 1) {
        const current = firstVertex + row * 2;
        indices.push(current, current + 2, current + 1, current + 1, current + 2, current + 3);
      }
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createRoadsideBand(features, material, context, options) {
  const mesh = new THREE.Mesh(
    buildRoadsideBandGeometry(
      features,
      context,
      options.bandStartMeters,
      options.bandWidthMeters,
      options.lift,
    ),
    material,
  );
  mesh.name = options.name;
  mesh.receiveShadow = true;
  mesh.renderOrder = options.renderOrder ?? 0;
  return mesh;
}

function createRoadNetwork(mapData, context) {
  const group = new THREE.Group();
  group.name = "OSM roads";
  const roadColors = [0x4b5351, 0x555b57, 0x62645c, 0x6a6960, 0x777268, 0xb4a985];
  const sidewalk = createToonMaterial(context.gradientMap, {
    color: 0xd8d3c1,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  sidewalk.userData.outlineParameters = { visible: false };
  const curb = createToonMaterial(context.gradientMap, {
    color: 0xeee7d3,
    side: THREE.DoubleSide,
  });
  curb.userData.outlineParameters = { visible: false };

  for (let style = 0; style < roadColors.length; style += 1) {
    const roads = mapData.roads.filter((road) => road[0] === style);
    if (roads.length === 0) continue;
    if (style <= 4) {
      group.add(
        createRoadsideBand(roads, curb, context, {
          bandStartMeters: 0,
          bandWidthMeters: 0.18,
          lift: SIDEWALK_SURFACE_LIFT + 0.002,
          name: `Two-sided road curbs ${style}`,
          renderOrder: 3,
        }),
        createRoadsideBand(roads, sidewalk, context, {
          bandStartMeters: 0.18,
          bandWidthMeters: SIDEWALK_WIDTH_METERS[style],
          lift: SIDEWALK_SURFACE_LIFT,
          name: `Two-sided sidewalks ${style}`,
          renderOrder: 2,
        }),
      );
    }
    const material = createToonMaterial(context.gradientMap, {
      color: roadColors[style],
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    material.userData.outlineParameters = { visible: false };
    group.add(
      createRibbonMesh(roads, material, context, {
        lift: ROAD_SURFACE_LIFT,
        name: `Road surface ${style}`,
        renderOrder: 2,
      }),
    );
  }
  return group;
}

function normalizeLinearFeatures(features, style = 0) {
  return features.map(([width, coordinates]) => [style, width, coordinates]);
}

function createAnimatedStripeTexture(kind) {
  const width = 8;
  const height = 64;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const centeredX = Math.abs(x - (width - 1) * 0.5) / (width * 0.5);
      const stripe = y % 32;
      const active = kind === "water" ? stripe < 15 : stripe < 19;
      const edgeFade = Math.max(0, 1 - centeredX * (kind === "water" ? 0.92 : 0.3));
      data[index] = kind === "water" ? 205 : 250;
      data[index + 1] = kind === "water" ? 246 : 193;
      data[index + 2] = kind === "water" ? 244 : 76;
      data[index + 3] = active ? Math.round(210 * edgeFade) : 0;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.repeat.set(1, kind === "water" ? 0.42 : 0.2);
  texture.needsUpdate = true;
  return texture;
}

function roundRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width * 0.5, height * 0.5);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function createPlaceIconTexture(typeIndex, label) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const colors = [
    "#3979c6",
    "#d16c45",
    "#d39836",
    "#d6575b",
    "#4f9a70",
    "#4c83a6",
    "#bea13b",
    "#448b75",
    "#7e6e60",
    "#8c63a5",
    "#557c75",
    "#3d91a4",
    "#4975a1",
  ];
  context.clearRect(0, 0, 256, 256);
  context.shadowColor = "rgba(31, 61, 57, 0.35)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 7;
  roundRectPath(context, 18, 14, 220, 220, 48);
  context.fillStyle = colors[typeIndex] ?? "#557c75";
  context.fill();
  context.shadowColor = "transparent";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = "#fff8df";
  context.fillStyle = "#fff8df";
  context.lineWidth = 13;

  if (typeIndex === 0) {
    roundRectPath(context, 88, 42, 80, 125, 13);
    context.stroke();
    context.beginPath();
    context.moveTo(112, 145);
    context.lineTo(144, 145);
    context.stroke();
    context.lineWidth = 10;
    [23, 43, 63].forEach((radius, index) => {
      context.beginPath();
      context.arc(177, 75, radius, Math.PI * 1.08, Math.PI * 1.58);
      if (index < 2) context.stroke();
    });
  } else if (typeIndex === 1) {
    context.beginPath();
    context.moveTo(62, 118);
    context.quadraticCurveTo(128, 190, 194, 118);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(73, 117);
    context.lineTo(184, 117);
    context.stroke();
    context.lineWidth = 10;
    [95, 128, 161].forEach((x, index) => {
      context.beginPath();
      context.moveTo(x, 95);
      context.bezierCurveTo(x - 13, 79, x + 14, 67, x + (index - 1) * 4, 47);
      context.stroke();
    });
  } else if (typeIndex === 2) {
    context.strokeRect(66, 97, 124, 77);
    context.beginPath();
    context.moveTo(55, 94);
    context.lineTo(72, 55);
    context.lineTo(184, 55);
    context.lineTo(201, 94);
    [55, 84, 113, 142, 171, 201].forEach((x, index) => {
      context.lineTo(x, 94 + (index % 2) * 12);
    });
    context.stroke();
    context.strokeRect(113, 125, 30, 49);
  } else if (typeIndex === 3) {
    context.fillRect(103, 43, 50, 139);
    context.fillRect(58, 88, 140, 49);
  } else if (typeIndex === 4) {
    context.beginPath();
    context.moveTo(67, 153);
    context.quadraticCurveTo(76, 79, 128, 54);
    context.quadraticCurveTo(180, 79, 189, 153);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(128, 53);
    context.lineTo(128, 32);
    context.stroke();
    context.beginPath();
    context.arc(135, 35, 13, Math.PI * 0.35, Math.PI * 1.65);
    context.stroke();
  } else if (typeIndex === 5) {
    context.beginPath();
    context.moveTo(43, 68);
    context.quadraticCurveTo(85, 51, 126, 82);
    context.lineTo(126, 177);
    context.quadraticCurveTo(86, 146, 43, 164);
    context.closePath();
    context.moveTo(213, 68);
    context.quadraticCurveTo(171, 51, 130, 82);
    context.lineTo(130, 177);
    context.quadraticCurveTo(170, 146, 213, 164);
    context.closePath();
    context.stroke();
  } else if (typeIndex === 6) {
    context.beginPath();
    context.arc(128, 108, 65, 0, Math.PI * 2);
    context.stroke();
    context.font = "900 50px Arial";
    context.textAlign = "center";
    context.fillText("Rp", 128, 126);
  } else if (typeIndex === 7) {
    context.strokeRect(68, 48, 86, 127);
    context.strokeRect(87, 68, 48, 42);
    context.beginPath();
    context.moveTo(154, 70);
    context.quadraticCurveTo(198, 82, 188, 129);
    context.lineTo(188, 166);
    context.stroke();
    context.beginPath();
    context.arc(188, 174, 12, 0, Math.PI * 2);
    context.fill();
  } else if (typeIndex === 8) {
    context.beginPath();
    const teeth = 16;
    for (let index = 0; index <= teeth; index += 1) {
      const angle = (index / teeth) * Math.PI * 2;
      const radius = index % 2 === 0 ? 73 : 57;
      const x = 128 + Math.cos(angle) * radius;
      const y = 108 + Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
    context.beginPath();
    context.arc(128, 108, 24, 0, Math.PI * 2);
    context.stroke();
  } else if (typeIndex === 9) {
    context.strokeRect(53, 78, 150, 93);
    context.beginPath();
    context.moveTo(57, 119);
    context.lineTo(199, 119);
    context.stroke();
    context.beginPath();
    context.arc(84, 97, 15, 0, Math.PI * 2);
    context.stroke();
  } else if (typeIndex === 10) {
    context.beginPath();
    context.moveTo(47, 83);
    context.lineTo(128, 43);
    context.lineTo(209, 83);
    context.closePath();
    context.stroke();
    [72, 110, 148, 186].forEach((x) => {
      context.moveTo(x, 91);
      context.lineTo(x, 163);
    });
    context.stroke();
    context.beginPath();
    context.moveTo(48, 171);
    context.lineTo(208, 171);
    context.stroke();
  } else if (typeIndex === 11) {
    context.beginPath();
    context.arc(128, 108, 67, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(128, 42);
    context.lineTo(149, 86);
    context.lineTo(199, 94);
    context.moveTo(57, 94);
    context.lineTo(107, 86);
    context.lineTo(128, 42);
    context.moveTo(83, 160);
    context.lineTo(92, 114);
    context.lineTo(57, 94);
    context.moveTo(173, 160);
    context.lineTo(164, 114);
    context.lineTo(199, 94);
    context.stroke();
  } else {
    roundRectPath(context, 48, 58, 160, 110, 22);
    context.stroke();
    context.strokeRect(73, 84, 110, 42);
    [82, 174].forEach((x) => {
      context.beginPath();
      context.arc(x, 169, 16, 0, Math.PI * 2);
      context.fill();
    });
  }

  context.font = "900 21px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff8df";
  context.fillText(label.toLocaleUpperCase("id-ID").slice(0, 19), 128, 210);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createLivingPlaces(mapData, context, animations) {
  const group = new THREE.Group();
  group.name = "Living OSM places";
  const places = mapData.places ?? [];
  if (places.length === 0) return group;

  const poleGeometry = new THREE.CylinderGeometry(0.035, 0.045, 1, 6);
  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0x465a55, fog: true });
  poleMaterial.userData.outlineParameters = { visible: false };
  const poles = new THREE.InstancedMesh(poleGeometry, poleMaterial, places.length);
  poles.name = "Place sign supports";
  const poleMatrix = new THREE.Matrix4();
  const polePosition = new THREE.Vector3();
  places.forEach((place, index) => {
    const eastMeters = decodeCoordinate(place[0], mapData.coordinatePrecision);
    const northMeters = decodeCoordinate(place[1], mapData.coordinatePrecision);
    const roofHeight = decodeCoordinate(place[3] ?? 0, mapData.coordinatePrecision) /
      MAP_METERS_PER_WORLD_UNIT;
    const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
    const frame = context.surfaceFrame(theta, phi);
    const supportHeight = roofHeight > 0 ? 0.48 : 0.7;
    poleMatrix.makeBasis(
      frame.east.clone().multiplyScalar(1),
      frame.normal.clone().multiplyScalar(supportHeight),
      frame.north.clone().multiplyScalar(1),
    );
    polePosition
      .copy(context.sphericalPosition(theta, phi, context.planetRadius + 0.04))
      .addScaledVector(frame.normal, roofHeight + supportHeight * 0.5);
    poleMatrix.setPosition(polePosition);
    poles.setMatrixAt(index, poleMatrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  poles.computeBoundingSphere();
  group.add(poles);

  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const scratchMatrix = new THREE.Matrix4();
  const scratchPosition = new THREE.Vector3();
  const scratchRight = new THREE.Vector3();
  const scratchUp = new THREE.Vector3();
  const scratchFacing = new THREE.Vector3();

  (mapData.placeTypes ?? []).forEach(([key, label], typeIndex) => {
    const placements = places.filter((place) => place[2] === typeIndex);
    if (placements.length === 0) return;
    const material = new THREE.MeshBasicMaterial({
      map: createPlaceIconTexture(typeIndex, label),
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    material.userData.outlineParameters = { visible: false };
    // Two crossed faces keep every real-place symbol readable from any street
    // approach without creating a separate draw call per business.
    const mesh = new THREE.InstancedMesh(
      planeGeometry,
      material,
      placements.length * 2,
    );
    mesh.name = `Animated ${key} places`;
    mesh.renderOrder = 8;
    mesh.frustumCulled = true;

    const states = placements.map((place, index) => {
      const eastMeters = decodeCoordinate(place[0], mapData.coordinatePrecision);
      const northMeters = decodeCoordinate(place[1], mapData.coordinatePrecision);
      const roofHeight = decodeCoordinate(
        place[3] ?? 0,
        mapData.coordinatePrecision,
      ) / MAP_METERS_PER_WORLD_UNIT;
      const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
      return {
        frame: context.surfaceFrame(theta, phi),
        basePosition: context
          .sphericalPosition(theta, phi, context.planetRadius + 0.045)
          .addScaledVector(
            context.surfaceFrame(theta, phi).normal,
            roofHeight + (roofHeight > 0 ? 0.5 : 0.78),
          ),
        phase: ((Math.abs(place[0] * 13 + place[1] * 7) + index * 19) % 628) / 100,
      };
    });

    const update = (elapsed, reducedMotion) => {
      const motion = reducedMotion ? 0.12 : 1;
      states.forEach((state, index) => {
        let rotation = 0;
        let bob = 0;
        let scaleX = 0.8;
        let scaleY = 0.8;
        const phase = state.phase;
        if (typeIndex === 0) {
          rotation = Math.sin(elapsed * 7 + phase) * 0.12 * motion;
          bob = Math.sin(elapsed * 3.5 + phase) * 0.055 * motion;
        } else if (typeIndex === 1) {
          bob = (Math.sin(elapsed * 1.8 + phase) * 0.07 + 0.04) * motion;
          scaleY *= 1 + Math.sin(elapsed * 1.8 + phase) * 0.035 * motion;
        } else if (typeIndex === 2) {
          rotation = Math.sin(elapsed * 1.1 + phase) * 0.055 * motion;
          scaleX *= 1 + Math.sin(elapsed * 2.2 + phase) * 0.025 * motion;
        } else if (typeIndex === 3) {
          const pulse = 1 + Math.sin(elapsed * 4.2 + phase) * 0.08 * motion;
          scaleX *= pulse;
          scaleY *= pulse;
        } else if (typeIndex === 4) {
          rotation = Math.sin(elapsed * 1.3 + phase) * 0.1 * motion;
          bob = Math.sin(elapsed * 1.3 + phase) * 0.045 * motion;
        } else if (typeIndex === 5) {
          scaleX *= 1 + Math.sin(elapsed * 2.1 + phase) * 0.05 * motion;
          rotation = Math.sin(elapsed * 1.05 + phase) * 0.045 * motion;
        } else if (typeIndex === 6) {
          rotation = elapsed * 1.7 * motion + phase;
          scaleX *= 0.93 + Math.abs(Math.cos(rotation)) * 0.07;
        } else if (typeIndex === 7) {
          bob = Math.abs(Math.sin(elapsed * 2.4 + phase)) * 0.1 * motion;
        } else if (typeIndex === 8) {
          rotation = -elapsed * 1.45 * motion + phase;
        } else if (typeIndex === 9) {
          const glow = 0.92 + Math.sin(elapsed * 2.6 + phase) * 0.08 * motion;
          scaleX *= glow;
          scaleY *= glow;
        } else if (typeIndex === 10) {
          rotation = Math.sin(elapsed * 1.7 + phase) * 0.075 * motion;
        } else if (typeIndex === 11) {
          bob = Math.abs(Math.sin(elapsed * 2.2 + phase)) * 0.16 * motion;
          rotation = Math.sin(elapsed * 1.1 + phase) * 0.11 * motion;
        } else {
          bob = Math.sin(elapsed * 1.6 + phase) * 0.075 * motion;
          rotation = Math.sin(elapsed * 0.8 + phase) * 0.045 * motion;
        }

        scratchPosition
          .copy(state.basePosition)
          .addScaledVector(state.frame.normal, bob);
        for (let face = 0; face < 2; face += 1) {
          const baseRight = face === 0 ? state.frame.east : state.frame.north;
          scratchRight
            .copy(baseRight)
            .multiplyScalar(Math.cos(rotation))
            .addScaledVector(state.frame.normal, Math.sin(rotation))
            .normalize();
          scratchUp
            .copy(state.frame.normal)
            .multiplyScalar(Math.cos(rotation))
            .addScaledVector(baseRight, -Math.sin(rotation))
            .normalize();
          scratchFacing
            .copy(face === 0 ? state.frame.north : state.frame.east)
            .multiplyScalar(face === 0 ? 1 : -1);
          scratchMatrix.makeBasis(
            scratchRight.multiplyScalar(scaleX),
            scratchUp.multiplyScalar(scaleY),
            scratchFacing,
          );
          scratchMatrix.setPosition(scratchPosition);
          mesh.setMatrixAt(index * 2 + face, scratchMatrix);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (typeIndex === 9) {
        material.opacity = reducedMotion
          ? 0.94
          : 0.76 + (Math.sin(elapsed * 2.6) * 0.5 + 0.5) * 0.24;
      }
    };
    update(0, true);
    animations.push(update);
    mesh.computeBoundingSphere();
    group.add(mesh);
  });
  return group;
}

function createSemanticBuildingDetails(mapData, context, animations) {
  const group = new THREE.Group();
  group.name = "Animated real-purpose building facades";
  const semanticBuildings = collectSemanticBuildingPlaces(mapData);
  if (semanticBuildings.size === 0) return group;

  const statesByType = (mapData.placeTypes ?? []).map(() => []);
  semanticBuildings.forEach((place, buildingIndex) => {
    if (context.replacementBuildingIndexes?.has(buildingIndex)) return;
    const building = mapData.buildings[buildingIndex];
    const eastMeters = decodeCoordinate(building[0], mapData.coordinatePrecision);
    const northMeters = decodeCoordinate(building[1], mapData.coordinatePrecision);
    const length = Math.max(
      0.44,
      decodeCoordinate(building[2], mapData.coordinatePrecision) /
        MAP_METERS_PER_WORLD_UNIT,
    );
    const width = Math.max(
      0.44,
      decodeCoordinate(building[3], mapData.coordinatePrecision) /
        MAP_METERS_PER_WORLD_UNIT,
    );
    const height = Math.max(
      0.48,
      decodeCoordinate(building[4], mapData.coordinatePrecision) /
        MAP_METERS_PER_WORLD_UNIT,
    );
    const bearing = building[5] / mapData.anglePrecision;
    const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
    const frame = context.surfaceFrame(theta, phi);
    const forward = frame.east
      .clone()
      .multiplyScalar(Math.cos(bearing))
      .addScaledVector(frame.north, Math.sin(bearing))
      .normalize();
    const right = new THREE.Vector3()
      .crossVectors(frame.normal, forward)
      .normalize();
    statesByType[place[2]]?.push({
      buildingIndex,
      place,
      length,
      width,
      height,
      normal: frame.normal,
      forward,
      right,
      surface: context.sphericalPosition(
        theta,
        phi,
        context.planetRadius + 0.018,
      ),
      phase:
        ((Math.abs(building[0] * 11 + building[1] * 17) + buildingIndex * 23) %
          628) /
        100,
    });
  });

  const scratchMatrix = new THREE.Matrix4();
  const scratchPosition = new THREE.Vector3();
  const scratchX = new THREE.Vector3();
  const scratchY = new THREE.Vector3();
  const scratchZ = new THREE.Vector3();
  const rotatedX = new THREE.Vector3();
  const rotatedY = new THREE.Vector3();

  const setMatrix = (
    matrix,
    xAxis,
    yAxis,
    zAxis,
    scaleX,
    scaleY,
    scaleZ,
    position,
  ) => {
    matrix.makeBasis(
      scratchX.copy(xAxis).multiplyScalar(scaleX),
      scratchY.copy(yAxis).multiplyScalar(scaleY),
      scratchZ.copy(zAxis).multiplyScalar(scaleZ),
    );
    matrix.setPosition(position);
  };

  const detailMaterial = (color, options = {}) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      fog: true,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      depthWrite: options.depthWrite ?? true,
      side: options.side ?? THREE.FrontSide,
      map: options.map ?? null,
    });
    material.userData.outlineParameters = { visible: false };
    return material;
  };

  const addComponent = ({
    name,
    states,
    geometry,
    material,
    count = 1,
    updateMatrix,
    updateMaterial,
  }) => {
    if (states.length === 0) return null;
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      states.length * count,
    );
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const update = (elapsed, reducedMotion) => {
      const motion = reducedMotion ? 0.12 : 1;
      states.forEach((state, stateIndex) => {
        for (let part = 0; part < count; part += 1) {
          updateMatrix(
            state,
            part,
            elapsed,
            motion,
            scratchMatrix,
            scratchPosition,
          );
          mesh.setMatrixAt(stateIndex * count + part, scratchMatrix);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      updateMaterial?.(material, elapsed, motion);
    };
    update(0, true);
    mesh.computeBoundingSphere();
    animations.push(update);
    group.add(mesh);
    return mesh;
  };

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const attachedSignLabels = [
    "PONSEL",
    "MAKAN",
    "TOKO",
    "MEDIS",
    "IBADAH",
    "SEKOLAH",
    "BANK",
    "BBM",
    "BENGKEL",
    "HOTEL",
    "KANTOR",
    "REKREASI",
    "TRANSIT",
  ];
  statesByType.forEach((states, typeIndex) => {
    if (states.length === 0) return;
    const color = SEMANTIC_BUILDING_COLORS[typeIndex] ?? 0x7faaa0;
    const bandMaterial = detailMaterial(0xffffff, {
      map: createAttachedSignTexture(
        attachedSignLabels[typeIndex] ?? "SITUBONDO",
        color,
      ),
    });
    addComponent({
      name: `Animated facade activity: ${mapData.placeTypes[typeIndex]?.[0]}`,
      states,
      geometry: boxGeometry,
      material: bandMaterial,
      count: 2,
      updateMatrix: (state, part, elapsed, motion, matrix, position) => {
        const side = part === 0 ? 1 : -1;
        const pulse = 1 + Math.sin(elapsed * 1.8 + state.phase) * 0.025 * motion;
        const span = Math.max(0.32, Math.min(state.length * 0.72, 2.35));
        const bandHeight =
          Math.max(0.13, Math.min(state.height * 0.18, 0.28)) * pulse;
        position
          .copy(state.surface)
          .addScaledVector(state.normal, state.height * 0.56)
          .addScaledVector(state.right, side * (state.width * 0.5 + 0.025));
        setMatrix(
          matrix,
          state.forward,
          state.normal,
          state.right,
          span,
          bandHeight,
          0.035,
          position,
        );
      },
    });

    if (typeIndex === 0) {
      addComponent({
        name: "Phone-store facade signal bars",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xe8fbff),
        count: 3,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const wave =
            0.72 +
            (Math.sin(elapsed * 5.8 + state.phase - part * 0.8) * 0.5 + 0.5) *
              0.42 *
              motion;
          const barHeight = (0.14 + part * 0.105) * wave;
          position
            .copy(state.surface)
            .addScaledVector(state.right, state.width * 0.5 + 0.065)
            .addScaledVector(state.forward, (part - 1) * 0.17)
            .addScaledVector(state.normal, state.height * 0.62 + barHeight * 0.5);
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            0.105,
            barHeight,
            0.055,
            position,
          );
        },
      });
    } else if (typeIndex === 1) {
      addComponent({
        name: "Restaurant roof steam",
        states,
        geometry: new THREE.SphereGeometry(1, 8, 6),
        material: detailMaterial(0xf4f0df, {
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
        count: 3,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const progress = reducedProgress(
            elapsed * 0.2 * motion + state.phase * 0.17 + part / 3,
          );
          const puffScale = 0.075 + progress * 0.11;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height + 0.08 + progress * 0.62)
            .addScaledVector(state.forward, (part - 1) * 0.12 + progress * 0.08)
            .addScaledVector(state.right, Math.sin(progress * Math.PI * 2) * 0.05);
          setMatrix(
            matrix,
            state.right,
            state.normal,
            state.forward,
            puffScale,
            puffScale * 1.18,
            puffScale,
            position,
          );
        },
      });
      addComponent({
        name: "Restaurant facade awnings",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xf3cf72),
        updateMatrix: (state, _part, elapsed, motion, matrix, position) => {
          const extension = 0.24 + Math.sin(elapsed * 1.7 + state.phase) * 0.035 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height * 0.72)
            .addScaledVector(state.right, state.width * 0.5 + extension * 0.5);
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            Math.max(0.42, Math.min(state.length * 0.72, 1.9)),
            0.085,
            extension,
            position,
          );
        },
      });
    } else if (typeIndex === 2) {
      addComponent({
        name: "Retail animated awning slats",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xffe09b),
        count: 5,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const usableSpan = Math.max(0.5, Math.min(state.length * 0.68, 1.9));
          const extension =
            0.22 + Math.sin(elapsed * 2.1 + state.phase + part * 0.45) * 0.035 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height * 0.7)
            .addScaledVector(state.right, state.width * 0.5 + extension * 0.5)
            .addScaledVector(state.forward, ((part - 2) / 5) * usableSpan);
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            usableSpan / 5.5,
            0.1,
            extension,
            position,
          );
        },
      });
    } else if (typeIndex === 3) {
      const crossMaterial = detailMaterial(0xfff5e6);
      addComponent({
        name: "Pulsing medical facade crosses",
        states,
        geometry: boxGeometry,
        material: crossMaterial,
        count: 2,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const pulse = 1 + Math.sin(elapsed * 4.4 + state.phase) * 0.12 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height * 0.63)
            .addScaledVector(state.right, state.width * 0.5 + 0.07);
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            (part === 0 ? 0.48 : 0.14) * pulse,
            (part === 0 ? 0.14 : 0.48) * pulse,
            0.055,
            position,
          );
        },
        updateMaterial: (material, elapsed, motion) => {
          material.opacity = 0.82 + Math.sin(elapsed * 4.4) * 0.18 * motion;
          material.transparent = true;
        },
      });
    } else if (typeIndex === 4) {
      addComponent({
        name: "Glowing worship-building domes",
        states,
        geometry: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        material: detailMaterial(0xdaf0b2),
        updateMatrix: (state, _part, elapsed, motion, matrix, position) => {
          const glow = 1 + Math.sin(elapsed * 1.8 + state.phase) * 0.055 * motion;
          const radius = Math.max(0.2, Math.min(state.width * 0.32, 0.62));
          position.copy(state.surface).addScaledVector(state.normal, state.height + 0.015);
          setMatrix(
            matrix,
            state.right,
            state.normal,
            state.forward,
            radius * glow,
            radius * 0.68 * glow,
            radius * glow,
            position,
          );
        },
      });
    } else if (typeIndex === 5) {
      addComponent({
        name: "Opening school facade books",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xf4f0d8),
        count: 2,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const open = 0.88 + Math.sin(elapsed * 2 + state.phase) * 0.1 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height * 0.64)
            .addScaledVector(state.right, state.width * 0.5 + 0.075)
            .addScaledVector(state.forward, (part === 0 ? -1 : 1) * 0.19);
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            0.35 * open,
            0.42,
            0.045 + (1 - open) * 0.08,
            position,
          );
        },
      });
    } else if (typeIndex === 6 || typeIndex === 8) {
      const isFinance = typeIndex === 6;
      addComponent({
        name: isFinance ? "Rotating bank facade coins" : "Rotating workshop facade gears",
        states,
        geometry: new THREE.TorusGeometry(0.5, isFinance ? 0.13 : 0.16, 8, 18),
        material: detailMaterial(isFinance ? 0xf5d45f : 0xd8d0bf),
        updateMatrix: (state, _part, elapsed, motion, matrix, position) => {
          const angle = elapsed * (isFinance ? 1.7 : -1.45) * motion + state.phase;
          rotatedX
            .copy(state.forward)
            .multiplyScalar(Math.cos(angle))
            .addScaledVector(state.normal, Math.sin(angle));
          rotatedY
            .copy(state.normal)
            .multiplyScalar(Math.cos(angle))
            .addScaledVector(state.forward, -Math.sin(angle));
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height * 0.64)
            .addScaledVector(state.right, state.width * 0.5 + 0.085);
          setMatrix(
            matrix,
            rotatedX,
            rotatedY,
            state.right,
            0.58,
            0.58,
            0.58,
            position,
          );
        },
      });
    } else if (typeIndex === 7) {
      addComponent({
        name: "Fuel-building pump lights",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xe8f7d7),
        count: 2,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const bob = Math.abs(Math.sin(elapsed * 2.5 + state.phase)) * 0.06 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height * 0.55 + bob)
            .addScaledVector(state.right, state.width * 0.5 + 0.065)
            .addScaledVector(state.forward, (part === 0 ? -1 : 1) * 0.22);
          setMatrix(matrix, state.forward, state.normal, state.right, 0.2, 0.42, 0.05, position);
        },
      });
    } else if (typeIndex === 9) {
      addComponent({
        name: "Hotel facade window lights",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xffe69a),
        count: 6,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const column = part % 3;
          const row = Math.floor(part / 3);
          const blink =
            0.72 +
            (Math.sin(elapsed * 2.4 + state.phase + part * 1.7) * 0.5 + 0.5) *
              0.28 *
              motion;
          position
            .copy(state.surface)
            .addScaledVector(state.right, state.width * 0.5 + 0.055)
            .addScaledVector(state.forward, (column - 1) * 0.27)
            .addScaledVector(state.normal, state.height * (0.42 + row * 0.28));
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            0.18 * blink,
            0.17 * blink,
            0.045,
            position,
          );
        },
      });
    } else if (typeIndex === 10) {
      addComponent({
        name: "Civic rooftop flags",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xf2f0da),
        count: 2,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          if (part === 0) {
            position
              .copy(state.surface)
              .addScaledVector(state.normal, state.height + 0.38);
            setMatrix(matrix, state.forward, state.normal, state.right, 0.035, 0.76, 0.035, position);
            return;
          }
          const wave = 1 + Math.sin(elapsed * 2.2 + state.phase) * 0.12 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.normal, state.height + 0.62)
            .addScaledVector(state.forward, 0.22);
          setMatrix(
            matrix,
            state.forward,
            state.normal,
            state.right,
            0.44 * wave,
            0.26,
            0.03,
            position,
          );
        },
      });
    } else if (typeIndex === 11) {
      addComponent({
        name: "Recreation entrance activity",
        states,
        geometry: new THREE.SphereGeometry(1, 10, 8),
        material: detailMaterial(0xf2d764),
        updateMatrix: (state, _part, elapsed, motion, matrix, position) => {
          const bounce = Math.abs(Math.sin(elapsed * 2.35 + state.phase)) * 0.34 * motion;
          position
            .copy(state.surface)
            .addScaledVector(state.right, state.width * 0.5 + 0.2)
            .addScaledVector(state.normal, 0.13 + bounce);
          setMatrix(matrix, state.right, state.normal, state.forward, 0.13, 0.13, 0.13, position);
        },
      });
    } else if (typeIndex === 12) {
      addComponent({
        name: "Transport facade moving lights",
        states,
        geometry: boxGeometry,
        material: detailMaterial(0xe3f7ff),
        count: 3,
        updateMatrix: (state, part, elapsed, motion, matrix, position) => {
          const travel =
            Math.sin(elapsed * 1.6 * motion + state.phase + part * (Math.PI * 2) / 3) *
            Math.min(state.length * 0.32, 0.8);
          position
            .copy(state.surface)
            .addScaledVector(state.right, state.width * 0.5 + 0.06)
            .addScaledVector(state.forward, travel)
            .addScaledVector(state.normal, state.height * 0.58);
          setMatrix(matrix, state.forward, state.normal, state.right, 0.21, 0.1, 0.05, position);
        },
      });
    }
  });

  group.userData.semanticBuildingCount = semanticBuildings.size;
  return group;
}

function reducedProgress(value) {
  return ((value % 1) + 1) % 1;
}

function createWaterwayLayer(mapData, context, animations) {
  const group = new THREE.Group();
  group.name = "Animated OSM waterways";
  const features = normalizeLinearFeatures(mapData.waterways ?? [], 0);
  if (features.length === 0) return group;
  const waterMaterial = createToonMaterial(context.gradientMap, {
    color: 0x3d9fb5,
    emissive: 0x235d68,
    emissiveIntensity: 0.1,
    side: THREE.DoubleSide,
  });
  waterMaterial.userData.outlineParameters = { visible: false };
  const flowTexture = createAnimatedStripeTexture("water");
  const flowMaterial = new THREE.MeshBasicMaterial({
    map: flowTexture,
    color: 0xd7fffa,
    transparent: true,
    opacity: 0.56,
    alphaTest: 0.025,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  flowMaterial.userData.outlineParameters = { visible: false };
  group.add(
    createRibbonMesh(features, waterMaterial, context, {
      name: "OSM waterway beds",
      lift: 0.03,
      renderOrder: 3,
    }),
    createRibbonMesh(features, flowMaterial, context, {
      name: "Flowing water highlights",
      widthScale: 0.72,
      lift: 0.041,
      renderOrder: 4,
    }),
  );
  animations.push((elapsed, reducedMotion) => {
    const motion = reducedMotion ? 0.12 : 1;
    flowTexture.offset.y = (-elapsed * 0.22 * motion) % 1;
    waterMaterial.emissiveIntensity =
      0.09 + Math.sin(elapsed * 0.8) * 0.025 * motion;
  });
  return group;
}

function createBridgeLayer(mapData, context, animations) {
  const group = new THREE.Group();
  group.name = "Animated tagged bridges";
  const bridges = mapData.bridges ?? [];
  if (bridges.length === 0) return group;
  const features = bridges.map(([mode, width, coordinates]) => [
    mode,
    width,
    coordinates,
  ]);
  const deckMaterial = createToonMaterial(context.gradientMap, {
    color: 0x6b6a62,
    side: THREE.DoubleSide,
  });
  deckMaterial.userData.outlineParameters = { visible: false };
  const trafficTexture = createAnimatedStripeTexture("bridge");
  const trafficMaterial = new THREE.MeshBasicMaterial({
    map: trafficTexture,
    color: 0xffcf63,
    transparent: true,
    opacity: 0.82,
    alphaTest: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  trafficMaterial.userData.outlineParameters = { visible: false };
  group.add(
    createRibbonMesh(features, deckMaterial, context, {
      name: "Tagged bridge decks",
      widthScale: 1.28,
      lift: 0.057,
      renderOrder: 5,
    }),
    createRibbonMesh(features, trafficMaterial, context, {
      name: "Moving bridge activity",
      widthScale: 0.14,
      lift: 0.069,
      renderOrder: 6,
    }),
  );
  animations.push((elapsed, reducedMotion) => {
    trafficTexture.offset.y =
      (elapsed * 0.38 * (reducedMotion ? 0.12 : 1)) % 1;
  });
  return group;
}

function createSurveyGround(mapData, context) {
  const radialSegments = 64;
  const angularSegments = 256;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const appendVertex = (eastMeters, northMeters) => {
    const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
    const position = context.sphericalPosition(
      theta,
      phi,
      context.planetRadius + 0.006,
    );
    const normal = context.surfaceFrame(theta, phi).normal;
    positions.push(position.x, position.y, position.z);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(
      0.5 + eastMeters / (mapData.radiusMeters * 2),
      0.5 - northMeters / (mapData.radiusMeters * 2),
    );
  };

  appendVertex(0, 0);
  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const radius = (ring / radialSegments) * mapData.radiusMeters;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = (segment / angularSegments) * Math.PI * 2;
      appendVertex(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }

  const ringIndex = (ring, segment) =>
    1 + (ring - 1) * angularSegments + (segment % angularSegments);
  for (let segment = 0; segment < angularSegments; segment += 1) {
    indices.push(0, ringIndex(1, segment), ringIndex(1, segment + 1));
  }
  for (let ring = 1; ring < radialSegments; ring += 1) {
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const current = ringIndex(ring, segment);
      const next = ringIndex(ring, segment + 1);
      const outer = ringIndex(ring + 1, segment);
      const outerNext = ringIndex(ring + 1, segment + 1);
      indices.push(current, outer, next, next, outer, outerNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const material = createToonMaterial(context.gradientMap, {
    color: 0xa8b780,
    side: THREE.DoubleSide,
  });
  material.userData.outlineParameters = { visible: false };
  const mesh = new THREE.Mesh(geometry, material);
  const area = (Math.PI * mapData.radiusMeters ** 2) / 1_000_000;
  mesh.name = `${area.toFixed(2)} square kilometre survey ground`;
  mesh.receiveShadow = true;
  return mesh;
}

function createRestrictedApron(mapData, context) {
  const innerRadius = mapData.radiusMeters;
  const outerRadius = innerRadius + 120;
  const segments = 384;
  const positions = [];
  const normals = [];
  const indices = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    [innerRadius, outerRadius].forEach((radius) => {
      const eastMeters = Math.cos(angle) * radius;
      const northMeters = Math.sin(angle) * radius;
      const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
      const point = context.sphericalPosition(
        theta,
        phi,
        context.planetRadius + 0.008,
      );
      const normal = context.surfaceFrame(theta, phi).normal;
      positions.push(point.x, point.y, point.z);
      normals.push(normal.x, normal.y, normal.z);
    });
  }
  for (let index = 0; index < segments; index += 1) {
    const current = index * 2;
    indices.push(
      current,
      current + 2,
      current + 1,
      current + 1,
      current + 2,
      current + 3,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const material = createToonMaterial(context.gradientMap, {
    color: 0xc78b49,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.userData.outlineParameters = { visible: false };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Restricted development apron";
  mesh.renderOrder = 1;
  return mesh;
}

function createBoundarySignTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(20, 34, 32, 0.36)";
  context.shadowBlur = 16;
  context.shadowOffsetY = 10;
  roundRectPath(context, 14, 14, 484, 224, 36);
  context.fillStyle = "#e2aa45";
  context.fill();
  context.shadowColor = "transparent";
  context.lineWidth = 12;
  context.strokeStyle = "#fff4d3";
  context.stroke();
  context.fillStyle = "#314b48";
  context.textAlign = "center";
  context.font = "900 49px Arial";
  context.fillText("BATAS PETA 1 KM", 256, 105);
  context.font = "800 33px Arial";
  context.fillText("AREA PENGEMBANGAN", 256, 164);
  context.font = "700 24px Arial";
  context.fillText("RESTRICTED", 256, 204);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMapBoundary(mapData, context, animations) {
  const group = new THREE.Group();
  group.name = `${mapData.radiusMeters / 1000} km restricted survey boundary`;
  const coordinates = [];
  const segments = 384;
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    coordinates.push(
      Math.round(Math.cos(angle) * mapData.radiusMeters * mapData.coordinatePrecision),
      Math.round(Math.sin(angle) * mapData.radiusMeters * mapData.coordinatePrecision),
    );
  }
  const stripeTexture = createAnimatedStripeTexture("bridge");
  stripeTexture.repeat.y = 0.12;
  const material = createToonMaterial(context.gradientMap, {
    color: 0xf0d36e,
    map: stripeTexture,
    emissive: 0x856617,
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide,
  });
  material.userData.outlineParameters = { visible: false };
  group.add(
    createRibbonMesh(
      [[0, 30 * mapData.coordinatePrecision, coordinates]],
      material,
      context,
      {
        name: `${mapData.radiusMeters / 1000} km restricted line`,
        lift: 0.046,
        renderOrder: 7,
      },
    ),
  );

  const postCount = 96;
  const postGeometry = new THREE.CylinderGeometry(0.075, 0.09, 1, 7);
  const postMaterial = new THREE.MeshBasicMaterial({ color: 0x9d563f, fog: true });
  postMaterial.userData.outlineParameters = { visible: false };
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, postCount);
  posts.name = "Restricted boundary posts";
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  for (let index = 0; index < postCount; index += 1) {
    const angle = (index / postCount) * Math.PI * 2;
    const postRadius = mapData.radiusMeters + 8;
    const eastMeters = Math.cos(angle) * postRadius;
    const northMeters = Math.sin(angle) * postRadius;
    const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
    const frame = context.surfaceFrame(theta, phi);
    const height = 0.82;
    matrix.makeBasis(
      frame.east,
      frame.normal.clone().multiplyScalar(height),
      frame.north,
    );
    position
      .copy(context.sphericalPosition(theta, phi, context.planetRadius + 0.052))
      .addScaledVector(frame.normal, height * 0.5);
    matrix.setPosition(position);
    posts.setMatrixAt(index, matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  posts.computeBoundingSphere();
  group.add(posts);

  const signMaterial = new THREE.SpriteMaterial({
    map: createBoundarySignTexture(),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const signCount = 12;
  for (let index = 0; index < signCount; index += 1) {
    const angle = ((index + 0.5) / signCount) * Math.PI * 2;
    const eastMeters = Math.cos(angle) * (mapData.radiusMeters + 9);
    const northMeters = Math.sin(angle) * (mapData.radiusMeters + 9);
    const { theta, phi } = geoMetersToLogical(eastMeters, northMeters);
    const frame = context.surfaceFrame(theta, phi);
    const sprite = new THREE.Sprite(signMaterial);
    sprite.name = "Area pengembangan sign";
    sprite.position
      .copy(context.sphericalPosition(theta, phi, context.planetRadius + 0.05))
      .addScaledVector(frame.normal, 1.65);
    sprite.scale.set(2.9, 1.45, 1);
    sprite.renderOrder = 10;
    group.add(sprite);
  }
  animations.push((elapsed, reducedMotion) => {
    stripeTexture.offset.y =
      (elapsed * 0.24 * (reducedMotion ? 0.12 : 1)) % 1;
    material.emissiveIntensity =
      0.24 + Math.sin(elapsed * 2.2) * 0.06 * (reducedMotion ? 0.12 : 1);
  });
  return group;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function closestPointOnSegment(x, y, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const denominator = dx * dx + dy * dy;
  const amount = denominator > 0
    ? THREE.MathUtils.clamp(((x - a.x) * dx + (y - a.y) * dy) / denominator, 0, 1)
    : 0;
  return { x: a.x + dx * amount, y: a.y + dy * amount };
}

export function createMapNavigation(mapData, options = {}) {
  const precision = mapData.coordinatePrecision;
  const excludedBuildingIndexes = options.excludedBuildingIndexes ?? new Set();
  const cellSize = 40;
  const grid = new Map();
  const polygons = [];
  const gridKey = (x, y) => `${x},${y}`;
  mapData.buildings.forEach((building, buildingIndex) => {
    if (excludedBuildingIndexes.has(buildingIndex)) return;
    if (!Array.isArray(building[7]) || building[7].length < 6) return;
    const points = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let index = 0; index < building[7].length; index += 2) {
      const x = building[7][index] / precision;
      const y = building[7][index + 1] / precision;
      points.push({ x, y });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const polygon = { points, minX, maxX, minY, maxY, buildingIndex };
    polygons.push(polygon);
    for (let cellX = Math.floor(minX / cellSize); cellX <= Math.floor(maxX / cellSize); cellX += 1) {
      for (let cellY = Math.floor(minY / cellSize); cellY <= Math.floor(maxY / cellSize); cellY += 1) {
        const key = gridKey(cellX, cellY);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(polygon);
      }
    }
  });

  const roadSegments = [];
  mapData.roads.forEach((road) => {
    const coordinates = road[2];
    for (let index = 2; index < coordinates.length; index += 2) {
      roadSegments.push({
        ax: coordinates[index - 2] / precision,
        ay: coordinates[index - 1] / precision,
        bx: coordinates[index] / precision,
        by: coordinates[index + 1] / precision,
        halfWidth: road[1] / precision * 0.5,
        sidewalkWidth: SIDEWALK_WIDTH_METERS[road[0]] ?? 0,
      });
    }
  });

  return {
    buildingCount: polygons.length,
    resolveBuildingCollision(
      eastMeters,
      northMeters,
      radiusMeters,
      previousEastMeters = eastMeters,
      previousNorthMeters = northMeters,
    ) {
      let x = eastMeters;
      let y = northMeters;
      let collided = false;
      const candidates = new Set();
      for (let cellX = Math.floor((x - radiusMeters) / cellSize); cellX <= Math.floor((x + radiusMeters) / cellSize); cellX += 1) {
        for (let cellY = Math.floor((y - radiusMeters) / cellSize); cellY <= Math.floor((y + radiusMeters) / cellSize); cellY += 1) {
          grid.get(gridKey(cellX, cellY))?.forEach((polygon) => candidates.add(polygon));
        }
      }
      const crossedWall = [...candidates].some(
        (polygon) =>
          pointInPolygon(x, y, polygon.points) &&
          !pointInPolygon(previousEastMeters, previousNorthMeters, polygon.points),
      );
      if (crossedWall) {
        return {
          eastMeters: previousEastMeters,
          northMeters: previousNorthMeters,
          collided: true,
        };
      }
      for (let pass = 0; pass < 6; pass += 1) {
        let changed = false;
        candidates.forEach((polygon) => {
          if (
            x < polygon.minX - radiusMeters || x > polygon.maxX + radiusMeters ||
            y < polygon.minY - radiusMeters || y > polygon.maxY + radiusMeters
          ) return;
          let nearest = null;
          let nearestDistanceSquared = Infinity;
          for (let index = 0; index < polygon.points.length; index += 1) {
            const point = closestPointOnSegment(
              x,
              y,
              polygon.points[index],
              polygon.points[(index + 1) % polygon.points.length],
            );
            const distanceSquared = (x - point.x) ** 2 + (y - point.y) ** 2;
            if (distanceSquared < nearestDistanceSquared) {
              nearestDistanceSquared = distanceSquared;
              nearest = point;
            }
          }
          const inside = pointInPolygon(x, y, polygon.points);
          if (!inside && nearestDistanceSquared >= radiusMeters ** 2) return;
          if (
            inside &&
            !pointInPolygon(previousEastMeters, previousNorthMeters, polygon.points)
          ) {
            x = previousEastMeters;
            y = previousNorthMeters;
            changed = true;
            collided = true;
            return;
          }
          let dx = x - nearest.x;
          let dy = y - nearest.y;
          let distance = Math.hypot(dx, dy);
          if (distance < 0.0001) {
            dx = x - eastMeters || 1;
            dy = y - northMeters;
            distance = Math.hypot(dx, dy);
          }
          const direction = inside ? -1 : 1;
          x = nearest.x + direction * dx / distance * (radiusMeters + 0.025);
          y = nearest.y + direction * dy / distance * (radiusMeters + 0.025);
          changed = true;
          collided = true;
        });
        if (!changed) break;
      }
      return { eastMeters: x, northMeters: y, collided };
    },
    surfaceLiftAt(eastMeters, northMeters) {
      let lift = 0.0008;
      roadSegments.forEach((segment) => {
        const closest = closestPointOnSegment(
          eastMeters,
          northMeters,
          { x: segment.ax, y: segment.ay },
          { x: segment.bx, y: segment.by },
        );
        const distance = Math.hypot(eastMeters - closest.x, northMeters - closest.y);
        if (distance <= segment.halfWidth) {
          lift = Math.max(lift, ROAD_SURFACE_LIFT);
        } else if (
          segment.sidewalkWidth > 0 &&
          distance <= segment.halfWidth + 0.18 + segment.sidewalkWidth
        ) {
          lift = Math.max(lift, SIDEWALK_SURFACE_LIFT + 0.002);
        }
      });
      return lift;
    },
  };
}

export function createGeospatialWorld(mapData, options) {
  const context = { ...options, mapData };
  const animations = [];
  const group = new THREE.Group();
  group.name = `Situbondo ${mapData.radiusMeters / 1000} km geospatial world`;

  const railwayMaterial = createToonMaterial(options.gradientMap, {
    color: 0x574f49,
    side: THREE.DoubleSide,
  });
  railwayMaterial.userData.outlineParameters = { visible: false };

  group.add(
    createRestrictedApron(mapData, context),
    createSurveyGround(mapData, context),
    createRoadNetwork(mapData, context),
    createWaterwayLayer(mapData, context, animations),
    createRibbonMesh(
      normalizeLinearFeatures(mapData.railways, 0),
      railwayMaterial,
      context,
      { name: "OSM railways", lift: 0.036, renderOrder: 4 },
    ),
    createBridgeLayer(mapData, context, animations),
    createBuildingPopulation(mapData, context),
    createBuildingArchitecture(mapData, context),
    createSemanticBuildingDetails(mapData, context, animations),
    createMapBoundary(mapData, context, animations),
  );

  group.userData.mapStats = {
    ...mapData.stats,
    radiusMeters: mapData.radiusMeters,
    areaSquareKilometers:
      (Math.PI * mapData.radiusMeters * mapData.radiusMeters) / 1_000_000,
    metersPerWorldUnit: MAP_METERS_PER_WORLD_UNIT,
  };
  group.userData.navigation = createMapNavigation(mapData, {
    excludedBuildingIndexes:
      context.navigationExcludedBuildingIndexes ??
      context.replacementBuildingIndexes,
  });
  group.userData.update = (elapsed, reducedMotion = false) => {
    animations.forEach((update) => update(elapsed, reducedMotion));
  };
  return group;
}
