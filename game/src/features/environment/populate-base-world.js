import * as THREE from "three";
import {
  createGableRoofGeometry,
  roundedBox,
} from "../../rendering/geometry.js";
import { toonMaterial } from "../../rendering/materials.js";
import {
  placeOnPlanet,
  sphericalPosition,
  surfaceSagitta,
} from "../../world/surface.js";

export function populateBaseWorld({
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
}) {
  [
    [-1.78, 1.08, 0.64, 1.55, 0.78, rockPatchMaterial, -0.25],
    [-0.56, 1.42, 0.72, 1.46, 0.68, rockPatchMaterial, 0.12],
    [0.82, 1.12, 0.66, 1.4, 0.72, grassPatchMaterial, 0.48],
    [2.05, 1.56, 0.72, 1.5, 0.7, rockPatchMaterial, -0.38],
    [-2.82, 1.78, 0.58, 1.35, 0.58, sandPatchMaterial, 0.18],
    [0.12, 0.76, 0.42, 1.0, 0.55, grassPatchMaterial, 0.8],
    [1.22, 1.86, 0.48, 1.2, 0.6, sandPatchMaterial, -0.5],
  ].forEach(([theta, phi, radius, scaleX, scaleZ, material, yaw]) => {
    createSurfacePatch(theta, phi, radius, scaleX, scaleZ, material, yaw);
  });

  createSurfacePatch(
    0.05,
    2.34,
    4.8,
    0.62,
    1.72,
    waterMaterial,
    -0.03,
    0.006,
  );
  createSurfacePatch(
    0.02,
    2.04,
    3.65,
    0.2,
    1.85,
    sandPatchMaterial,
    -0.02,
    0.015,
  );

  const plateauGrassMaterial = toonMaterial({
    color: 0x71966d,
    roughness: 0.9,
    metalness: 0,
  });
  const plateauStoneMaterial = toonMaterial({
    color: 0x96998e,
    roughness: 0.94,
    metalness: 0,
  });
  const hillMaterials = [0x617d52, 0x7f8f59, 0x4e7354].map((color) =>
    toonMaterial({ color }),
  );

  function createDistantHill(theta, phi, width, height, materialIndex = 0) {
    const group = new THREE.Group();
    const rockSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.88, width, height * 0.22, 12),
      plateauStoneMaterial,
    );
    rockSkirt.position.y = height * 0.11;
    rockSkirt.scale.z = 0.66;
    rockSkirt.castShadow = true;
    rockSkirt.receiveShadow = true;
    group.add(rockSkirt);

    const hill = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 1),
      hillMaterials[materialIndex % hillMaterials.length],
    );
    hill.position.set(-width * 0.08, height * 0.34, 0);
    hill.scale.set(width * 0.78, height * 0.3, width * 0.53);
    hill.castShadow = true;
    hill.receiveShadow = true;
    group.add(hill);

    const shoulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 1),
      hillMaterials[(materialIndex + 1) % hillMaterials.length],
    );
    shoulder.position.set(width * 0.46, height * 0.25, 0.08);
    shoulder.scale.set(width * 0.5, height * 0.23, width * 0.4);
    shoulder.castShadow = true;
    shoulder.receiveShadow = true;
    group.add(shoulder);

    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 1),
      hillMaterials[(materialIndex + 2) % hillMaterials.length],
    );
    crown.position.set(-width * 0.12, height * 0.53, -0.04);
    crown.scale.set(width * 0.42, height * 0.18, width * 0.34);
    crown.castShadow = true;
    group.add(crown);

    placeOnPlanet(
      group,
      theta,
      phi,
      -surfaceSagitta(Math.min(width, 1.6)) - 0.06,
      theta * 0.11,
    );
    world.add(group);
    addCameraCollider(group);
  }

  [
    [-6.35, 0.48, 1.25, 1.08, 0],
    [-5.25, 0.46, 1.5, 1.32, 1],
    [-4.1, 0.49, 1.35, 1.16, 2],
    [-2.75, 0.48, 1.2, 1.1, 0],
    [-1.55, 0.46, 1.55, 1.45, 1],
    [-0.2, 0.45, 1.8, 1.65, 2],
    [1.2, 0.47, 1.5, 1.25, 0],
    [2.55, 0.49, 1.25, 1.08, 1],
    [3.7, 0.47, 1.42, 1.22, 2],
    [4.85, 0.48, 1.55, 1.36, 0],
    [6.05, 0.46, 1.38, 1.2, 1],
    [-6.1, 2.21, 1.35, 1.08, 2],
    [-4.85, 2.2, 1.5, 1.18, 0],
    [-3.55, 2.22, 1.28, 1.02, 1],
    [-2.1, 2.2, 1.3, 1.05, 2],
    [2.2, 2.22, 1.45, 1.18, 0],
    [3.55, 2.2, 1.32, 1.04, 1],
    [4.9, 2.22, 1.5, 1.2, 2],
    [6.2, 2.2, 1.36, 1.08, 0],
  ].forEach((item) => createDistantHill(...item));

  function createSitubondoMountain(theta, phi, width, height, colorIndex = 0) {
    const group = new THREE.Group();
    const mainPeak = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, 7, 3),
      hillMaterials[colorIndex % hillMaterials.length],
    );
    mainPeak.position.y = height * 0.5;
    mainPeak.scale.z = 0.58;
    group.add(mainPeak);

    const shoulder = new THREE.Mesh(
      new THREE.ConeGeometry(width * 0.72, height * 0.66, 7, 2),
      hillMaterials[(colorIndex + 1) % hillMaterials.length],
    );
    shoulder.position.set(width * 0.58, height * 0.33, 0.03);
    shoulder.scale.z = 0.66;
    group.add(shoulder);

    const dryRidge = new THREE.Mesh(
      new THREE.ConeGeometry(width * 0.38, height * 0.36, 7, 1),
      toonMaterial({ color: 0xa39461 }),
    );
    dryRidge.position.set(-width * 0.08, height * 0.72, 0.02);
    dryRidge.scale.z = 0.6;
    group.add(dryRidge);

    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(
      group,
      theta,
      phi,
      -surfaceSagitta(Math.min(width, 1.8)) - 0.08,
      theta * 0.08,
    );
    world.add(group);
  }

  [
    [-2.45, 0.4, 1.3, 2.25, 0],
    [-0.15, 0.37, 1.55, 2.7, 2],
    [2.35, 0.4, 1.25, 2.1, 1],
  ].forEach((item) => createSitubondoMountain(...item));

  function createBantonganCanal() {
    const points = [];
    for (let index = 0; index <= 72; index += 1) {
      const progress = index / 72;
      const phi = THREE.MathUtils.lerp(0.62, 2.02, progress);
      const theta =
        -2.92 +
        Math.sin(progress * Math.PI * 2.1) * 0.12 +
        progress * 0.16;
      points.push(
        sphericalPosition(theta, phi, PLANET_RADIUS + ROAD_SURFACE_OFFSET * 0.35),
      );
    }
    const group = new THREE.Group();
    const concreteBankMaterial = toonMaterial({
      color: 0xbcbcad,
      side: THREE.DoubleSide,
    });
    const canalEdgeMaterial = toonMaterial({
      color: 0x6b7974,
      side: THREE.DoubleSide,
    });
    group.add(
      makeSurfaceRibbon(points, 0.29, 0.0001, concreteBankMaterial),
      makeSurfaceRibbon(points, 0.17, 0.001, waterMaterial),
      makeSurfaceRibbon(
        offsetSurfacePoints(points, 0.112),
        0.026,
        0.0014,
        canalEdgeMaterial,
      ),
      makeSurfaceRibbon(
        offsetSurfacePoints(points, -0.112),
        0.026,
        0.0014,
        canalEdgeMaterial,
      ),
    );
    world.add(group);
  }

  createBantonganCanal();

  // Legacy decorative generators are removed before rendering, but their setup
  // must remain bounded while the landmark functions are still sourced here.
  const ROAD_LOOP_START = -6.83;
  const ROAD_LOOP_END = 6.83;
  const latitudeRoads = [
    [0.82, ROAD_LOOP_START, ROAD_LOOP_END],
    [1.14, ROAD_LOOP_START, ROAD_LOOP_END],
    [1.44, ROAD_LOOP_START, ROAD_LOOP_END],
    [1.74, ROAD_LOOP_START, ROAD_LOOP_END],
  ];
  const meridianRoads = [
    [-6.12, 0.82, 1.94],
    [-5.02, 0.82, 1.94],
    [-3.92, 0.82, 1.94],
    [-1.86, 0.82, 1.78],
    [-0.48, 0.86, 1.72],
    [0.18, 0.64, 1.58],
    [1.18, 0.78, 2.02],
    [2.28, 1.06, 1.94],
    [3.5, 0.82, 1.94],
    [4.62, 0.82, 1.94],
    [5.74, 0.82, 1.94],
  ];

  latitudeRoads.forEach(([phi, thetaStart, thetaEnd]) => {
    world.add(makeRoute(phi, thetaStart, thetaEnd));
  });
  meridianRoads.forEach(([theta, phiStart, phiEnd]) => {
    world.add(makeMeridian(theta, phiStart, phiEnd));
  });

  function createRoadJunction(theta, phi) {
    const createLayer = (radius, lift, material) => {
      const geometry = new THREE.CircleGeometry(radius, 48);
      geometry.rotateX(-Math.PI * 0.5);
      conformGeometryToPlanet(geometry, 1, 1, lift);
      const junction = new THREE.Mesh(geometry, material);
      junction.receiveShadow = true;
      placeOnPlanet(junction, theta, phi, lift);
      world.add(junction);
    };

    createLayer(0.58, ROAD_SURFACE_OFFSET + 0.0011, sidewalkMaterial);
    createLayer(0.34, ROAD_SURFACE_OFFSET + 0.0032, roadMaterial);
  }

  latitudeRoads.forEach(([phi, thetaStart, thetaEnd]) => {
    meridianRoads.forEach(([theta, phiStart, phiEnd]) => {
      const connectsTheta = theta >= thetaStart - 0.06 && theta <= thetaEnd + 0.06;
      const connectsPhi = phi >= phiStart - 0.04 && phi <= phiEnd + 0.04;
      if (connectsTheta && connectsPhi) {
        createRoadJunction(theta, phi);
      }
    });
  });

  function distanceToNearestRoad(theta, phi) {
    let nearestDistance = Infinity;

    latitudeRoads.forEach(([roadPhi, thetaStart, thetaEnd]) => {
      if (theta < thetaStart || theta > thetaEnd) return;
      nearestDistance = Math.min(
        nearestDistance,
        Math.abs(phi - roadPhi) * TOWN_DISTANCE_SCALE,
      );
    });

    meridianRoads.forEach(([roadTheta, phiStart, phiEnd]) => {
      if (phi < phiStart || phi > phiEnd) return;
      const actualThetaDelta = Math.abs(
        Math.atan2(
          Math.sin((theta - roadTheta) * TOWN_CURVE_SCALE),
          Math.cos((theta - roadTheta) * TOWN_CURVE_SCALE),
        ),
      );
      nearestDistance = Math.min(
        nearestDistance,
        actualThetaDelta *
          PLANET_RADIUS *
          Math.sin(
            ACTUAL_CENTER_PHI +
              (phi - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE,
          ),
      );
    });

    return nearestDistance;
  }

  function isInsideRoadCorridor(theta, phi, clearance = 0.52) {
    return distanceToNearestRoad(theta, phi) < clearance;
  }

  function hasPlacementClearance(theta, phi, radius, extra = 0.1) {
    const placementNormal = sphericalPosition(theta, phi, 1).normalize();
    return !obstacles.some(
      (obstacle) =>
        placementNormal.angleTo(obstacle.normal) * PLANET_RADIUS <
        radius + obstacle.radius + extra,
    );
  }

  function createPlateau(theta, phi, radius, height, yaw = 0) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius * 0.9,
        radius,
        height,
        14,
        1,
        false,
      ),
      [plateauStoneMaterial, plateauGrassMaterial, plateauStoneMaterial],
    );
    base.position.y = height * 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const top = new THREE.Mesh(
      makePatchGeometry(radius * 0.93, 18, 0.1),
      plateauGrassMaterial,
    );
    top.position.y = height + 0.008;
    top.receiveShadow = true;
    group.add(top);

    const stoneLip = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.9, 0.035, 6, 40),
      plateauStoneMaterial,
    );
    stoneLip.position.y = height - 0.015;
    stoneLip.rotation.x = Math.PI * 0.5;
    group.add(stoneLip);

    const hutWall = new THREE.Mesh(
      roundedBox(0.38, 0.28, 0.3, 0.014),
      toonMaterial({ color: 0xe8e4d4 }),
    );
    hutWall.position.set(-0.08, height + 0.15, -0.04);
    group.add(hutWall);

    const hutRoof = new THREE.Mesh(
      createGableRoofGeometry(0.5, 0.4, 0.15),
      toonMaterial({ color: 0x78635d }),
    );
    hutRoof.position.set(-0.08, height + 0.3, -0.04);
    group.add(hutRoof);

    const hutDoor = new THREE.Mesh(
      roundedBox(0.09, 0.18, 0.018, 0.005),
      inkMaterial,
    );
    hutDoor.position.set(-0.01, height + 0.12, 0.118);
    group.add(hutDoor);

    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(
      group,
      theta,
      phi,
      -surfaceSagitta(radius) - 0.012,
      yaw,
    );
    world.add(group);
    addObstacle(theta, phi, radius * 0.8);
    addBuildingFootprint(theta, phi, radius * 0.28, height + 0.48);
    addCameraCollider(group);
  }

  [
    [0.68, 0.6, 0.78, 0.3, -0.18],
    [-5.48, 0.61, 0.7, 0.27, 0.2],
    [4.08, 2.08, 0.74, 0.28, -0.14],
  ].forEach((item) => createPlateau(...item));

  return {
    ROAD_LOOP_START,
    distanceToNearestRoad,
    hasPlacementClearance,
    isInsideRoadCorridor,
    latitudeRoads,
    meridianRoads,
  };
}
