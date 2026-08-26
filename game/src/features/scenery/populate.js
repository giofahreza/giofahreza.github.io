import * as THREE from "three";
import {
  createGableRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../rendering/materials.js";
import {
  placeOnPlanet,
  sphericalPosition,
  surfaceFrame,
  surfaceSagitta,
} from "../../world/surface.js";

export function populateScenery({
  collections: {
    animatedBoats,
    animatedFlowers,
    animatedFoliage,
    driftingClouds,
    lakeRipples,
  },
  constants: {
    ACTUAL_CENTER_PHI,
    LOGICAL_CENTER_PHI,
    LOGICAL_THETA_PERIOD,
    OVERVIEW_DETAIL_LAYER,
    PLANET_RADIUS,
    ROAD_LOOP_START,
    ROCK_COLLISION_RADIUS,
    TOWN_CURVE_SCALE,
    TOWN_DISTANCE_SCALE,
    TREE_COLLISION_RADIUS,
  },
  helpers: {
    addIndonesianFlag,
    addLocalPalm,
    addSitubondoSign,
    conformGeometryToPlanet,
    distanceToNearestRoad,
    hasPlacementClearance,
    isInsideRoadCorridor,
  },
  infillRows,
  infillStats,
  materials: {
    cloudMaterial,
    cloudShadowGeometry,
    cloudShadowMaterial,
    flowerMaterials,
    foliageMaterials,
    inkMaterial,
    lakeRippleGeometry,
    rippleMaterial,
    rockMaterial,
    targetMaterial,
    townMetalMaterial,
    townSignMaterials,
    townTrimMaterial,
    townWindowMaterial,
    townWoodMaterial,
    treeMaterial,
    trunkMaterial,
    waterMaterial,
  },
  navigation: {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
    buildingFootprints,
    obstacles,
    wireRoofClearances,
  },
  upAxis,
  world,
}) {
  const gardenSoilMaterial = toonMaterial({
    color: 0x887b62,
    roughness: 0.94,
    metalness: 0,
  });
  const gardenBorderMaterial = toonMaterial({
    color: 0xa9a58e,
    roughness: 0.9,
    metalness: 0,
  });
  
  function createGardenPlot(
    theta,
    phi,
    width = 0.5,
    depth = 0.34,
    yaw = 0,
    variant = 0,
  ) {
    const footprint = Math.hypot(width, depth) * 0.5;
    if (distanceToNearestRoad(theta, phi) < 0.58 + footprint * 0.3) return;
    if (!hasPlacementClearance(theta, phi, footprint, 0.045)) return;
  
    const group = new THREE.Group();
    const bed = new THREE.Mesh(
      roundedBox(width, 0.025, depth, 0.008),
      gardenSoilMaterial,
    );
    bed.position.y = 0.012;
    bed.receiveShadow = true;
    group.add(bed);
  
    [-1, 1].forEach((side) => {
      const border = new THREE.Mesh(
        roundedBox(width + 0.035, 0.04, 0.035, 0.006),
        gardenBorderMaterial,
      );
      border.position.set(0, 0.026, side * depth * 0.5);
      group.add(border);
    });
  
    const cropMaterial =
      foliageMaterials[variant % foliageMaterials.length];
    for (let row = -1; row <= 1; row += 1) {
      for (let column = -1; column <= 1; column += 1) {
        const crop = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.045, 0),
          cropMaterial,
        );
        crop.position.set(
          column * width * 0.24,
          0.07 + ((row + column + variant + 9) % 2) * 0.018,
          row * depth * 0.24,
        );
        crop.scale.set(0.78, 1.28, 0.82);
        crop.castShadow = true;
        group.add(crop);
      }
    }
  
    mergeDirectMeshesByMaterial(group);
    placeOnPlanet(
      group,
      theta,
      phi,
      -surfaceSagitta(footprint) - 0.004,
      yaw,
    );
    world.add(group);
    infillStats.gardens += 1;
  }
  
  const gardenColumns = 36;
  infillRows.forEach((phi, rowIndex) => {
    for (let column = 0; column < gardenColumns; column += 1) {
      const sequence = rowIndex * gardenColumns + column;
      const theta =
        ROAD_LOOP_START +
        ((column + 0.78 + (rowIndex % 2) * 0.47) / gardenColumns) *
          LOGICAL_THETA_PERIOD;
      createGardenPlot(
        theta,
        phi + Math.sin(sequence * 1.37) * 0.025,
        0.44 + (sequence % 3) * 0.045,
        0.3 + ((sequence * 3) % 2) * 0.05,
        theta * 0.09,
        sequence,
      );
    }
  });
  
  function createStreetLamp(theta, phi, yaw = 0) {
    const group = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.022, 0.82, 7),
      townMetalMaterial,
    );
    post.position.y = 0.42;
    post.castShadow = true;
    group.add(post);
  
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.24, 7),
      townMetalMaterial,
    );
    arm.position.set(0.105, 0.8, 0);
    arm.rotation.z = Math.PI / 2;
    group.add(arm);
  
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      targetMaterial,
    );
    light.position.set(0.215, 0.77, 0);
    group.add(light);
  
    placeOnPlanet(group, theta, phi, -0.004, yaw);
    world.add(group);
  }
  
  [
    [-2.3, 1.07, 0],
    [-1.82, 1.21, Math.PI],
    [-1.32, 1.07, 0],
    [-0.72, 1.21, Math.PI],
    [-0.12, 1.07, 0],
    [0.52, 1.21, Math.PI],
    [1.02, 1.07, 0],
    [-1.92, 1.36, Math.PI],
    [-1.18, 1.52, 0],
    [-0.42, 1.36, Math.PI],
    [0.56, 1.52, 0],
    [1.46, 1.36, Math.PI],
    [2.16, 1.52, 0],
  ].forEach(([theta, phi, yaw]) => createStreetLamp(theta, phi, yaw));
  
  [-6.12, -5.02, -3.92, 3.5, 4.62, 5.74].forEach(
    (theta, index) => {
      createStreetLamp(theta + 0.075, 1.02, Math.PI * 0.5);
      createStreetLamp(theta - 0.075, 1.59, -Math.PI * 0.5);
      if (index % 2 === 0) {
        createStreetLamp(theta + 0.075, 1.9, Math.PI * 0.5);
      }
    },
  );
  
  function createUtilityPole(theta, phi, yaw = 0) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.027, 1.48, 7),
      townWoodMaterial,
    );
    pole.position.y = 0.74;
    group.add(pole);
  
    const crossbar = new THREE.Mesh(
      roundedBox(0.34, 0.025, 0.028, 0.006),
      townMetalMaterial,
    );
    crossbar.position.y = 1.32;
    group.add(crossbar);
  
    [-0.13, 0, 0.13].forEach((x) => {
      const insulator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.018, 0.07, 7),
        townTrimMaterial,
      );
      insulator.position.set(x, 1.385, 0);
      group.add(insulator);
    });
  
    if (Math.round((theta + phi) * 10) % 2 === 0) {
      const transformer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.075, 0.17, 10),
        townMetalMaterial,
      );
      transformer.position.set(0.07, 1.02, 0.02);
      transformer.rotation.z = Math.PI * 0.5;
      group.add(transformer);
    }
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.003, yaw);
    world.add(group);
    addObstacle(theta, phi, 0.04);
  }
  
  function createUtilityWire(start, end, laneOffset = 0) {
    const points = [];
    const basePhi = (start[1] + end[1]) * 0.5;
    const streetBow = basePhi < 1.3 ? 0.035 : -0.035;
  
    for (let index = 0; index <= 18; index += 1) {
      const t = index / 18;
      const routeTheta = THREE.MathUtils.lerp(start[0], end[0], t);
      const routePhi =
        THREE.MathUtils.lerp(start[1], end[1], t) +
        Math.sin(t * Math.PI) * streetBow;
      const routeNormal = sphericalPosition(routeTheta, routePhi, 1).normalize();
      const sag = Math.sin(t * Math.PI) * 0.045;
      let wireHeight = 1.385 - sag;
  
      const nearbyBuildings = buildingFootprints.filter(
        (building) =>
          routeNormal.angleTo(building.normal) * PLANET_RADIUS <
          building.radius + 0.16,
      );
      nearbyBuildings.forEach((building) => {
        wireHeight = Math.max(wireHeight, building.height + 0.24);
      });
      nearbyBuildings.forEach((building) => {
        wireRoofClearances.push(wireHeight - building.height);
      });
  
      const point = sphericalPosition(
        routeTheta,
        routePhi,
        PLANET_RADIUS + wireHeight,
      );
      point.addScaledVector(surfaceFrame(routeTheta, routePhi).north, laneOffset);
      points.push(point);
    }
  
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        24,
        0.0045,
        4,
        false,
      ),
      inkMaterial,
    );
    wire.castShadow = true;
    world.add(wire);
  }
  
  [
    {
      phi: 1.07,
      yaw: 0,
      thetas: [
        -6.4, -5.35, -4.3, -3.3,
        -2.42, -2.02, -0.86, 0.56, 1.62, 2.02,
        3.1, 4.15, 5.2, 6.25,
      ],
    },
    {
      phi: 1.51,
      yaw: Math.PI,
      thetas: [
        -6.25, -5.2, -4.15, -3.1,
        -2.52, -1.44, -0.9, 0.58, 1.6, 2.02,
        3.3, 4.3, 5.35, 6.4,
      ],
    },
  ].forEach(({ phi, yaw, thetas }) => {
    thetas.forEach((theta) => createUtilityPole(theta, phi, yaw));
    for (let index = 0; index < thetas.length - 1; index += 1) {
      const start = [thetas[index], phi];
      const end = [thetas[index + 1], phi];
      createUtilityWire(start, end, -0.055);
      createUtilityWire(start, end, 0.055);
    }
  });
  
  function createWarungCart(theta, phi, color, yaw = 0, label = "WARUNG") {
    if (isInsideRoadCorridor(theta, phi, 0.46)) return;
    const group = new THREE.Group();
    const cartMaterial = toonMaterial({ color });
    const body = new THREE.Mesh(
      roundedBox(0.38, 0.26, 0.22, 0.014),
      cartMaterial,
    );
    body.position.y = 0.19;
    group.add(body);
  
    const display = new THREE.Mesh(
      roundedBox(0.29, 0.17, 0.16, 0.01),
      townWindowMaterial,
    );
    display.position.set(0, 0.38, 0);
    group.add(display);
  
    [-0.1, 0, 0.1].forEach((x, index) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 0.075, 8),
        flowerMaterials[index % flowerMaterials.length],
      );
      jar.position.set(x, 0.39, 0.085);
      group.add(jar);
    });
  
    const counter = new THREE.Mesh(
      roundedBox(0.47, 0.045, 0.31, 0.01),
      townTrimMaterial,
    );
    counter.position.y = 0.5;
    group.add(counter);
  
    const canopy = new THREE.Mesh(
      createGableRoofGeometry(0.58, 0.42, 0.14),
      cartMaterial,
    );
    canopy.position.y = 0.67;
    group.add(canopy);
    [-0.24, 0.24].forEach((x) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.012, 0.48, 6),
        townMetalMaterial,
      );
      post.position.set(x, 0.42, -0.14);
      group.add(post);
    });
    [-0.14, 0.14].forEach((x) => {
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.01, 6, 16),
        inkMaterial,
      );
      wheel.position.set(x, 0.08, 0.13);
      group.add(wheel);
    });
    addSitubondoSign(
      group,
      label,
      0.34,
      0.1,
      new THREE.Vector3(0, 0.61, 0.2),
      { background: color, color: "#f4ecd7", border: 0x314b48 },
    );
  
    mergeDirectMeshesByMaterial(group);
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.004, yaw);
    world.add(group);
    addObstacle(theta, phi, 0.2);
    addCameraCollider(group);
  }
  
  function createGuardRail(theta, phi, yaw, length = 0.9) {
    const group = new THREE.Group();
    [0.17, 0.3].forEach((y) => {
      const rail = new THREE.Mesh(
        roundedBox(length, 0.025, 0.025, 0.006),
        townTrimMaterial,
      );
      rail.position.y = y;
      group.add(rail);
    });
    [-0.44, 0, 0.44].forEach((factor) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.016, 0.34, 7),
        townMetalMaterial,
      );
      post.position.set(length * factor, 0.17, 0);
      group.add(post);
    });
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.003, yaw);
    world.add(group);
  }
  
  function createRoadsidePlanter(theta, phi, yaw = 0) {
    if (isInsideRoadCorridor(theta, phi, 0.43)) return;
    const group = new THREE.Group();
    const planter = new THREE.Mesh(
      roundedBox(0.32, 0.12, 0.14, 0.012),
      townTrimMaterial,
    );
    planter.position.y = 0.065;
    group.add(planter);
    [-0.1, 0, 0.1].forEach((x, index) => {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 6),
        foliageMaterials[index % foliageMaterials.length],
      );
      leaf.position.set(x, 0.17 + (index % 2) * 0.025, 0);
      leaf.scale.set(0.75, 1.25, 0.8);
      group.add(leaf);
    });
    placeOnPlanet(group, theta, phi, -0.003, yaw);
    world.add(group);
  }
  
  [
    [-1.15, 1.03, 0xc65f57, Math.PI * 0.5, "WARUNG"],
    [0.86, 1.53, 0x4e8eaa, -Math.PI * 0.5, "ES DEGAN"],
    [2.4, 1.28, 0xd3b34f, Math.PI, "KOPI"],
  ].forEach((item) => createWarungCart(...item));
  
  [
    [-1.02, 1.66, 0],
    [0.32, 1.03, Math.PI],
    [1.86, 1.65, 0],
    [-2.68, 1.32, Math.PI],
  ].forEach((item) => createRoadsidePlanter(...item));
  
  [
    [-1.7, 1.84, 0, 0.85],
    [-0.5, 1.84, 0, 0.95],
    [0.76, 1.84, 0, 0.9],
    [1.92, 1.84, 0, 0.9],
  ].forEach((item) => createGuardRail(...item));
  
  function createRoadSign(theta, phi, label, yaw = 0) {
    const group = new THREE.Group();
    [-0.18, 0.18].forEach((x) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.016, 0.58, 7),
        townMetalMaterial,
      );
      pole.position.set(x, 0.29, 0);
      group.add(pole);
    });
    addSitubondoSign(
      group,
      label,
      0.48,
      0.14,
      new THREE.Vector3(0, 0.57, 0.012),
      { background: 0x287b91, color: "#f4edda", border: 0xf4edda },
    );
  
    placeOnPlanet(group, theta, phi, -0.003, yaw);
    world.add(group);
  }
  
  [
    [-1.66, 1.06, "JL. A. YANI", 0],
    [-0.28, 1.52, "JL. KARTINI", Math.PI],
    [1.42, 1.05, "JL. DIPONEGORO", 0],
    [2.48, 1.62, "JL. PB. SUDIRMAN", Math.PI],
  ].forEach((item) => createRoadSign(...item));
  
  function createStreetFlag(theta, phi, yaw = 0, height = 0.9) {
    const group = new THREE.Group();
    addIndonesianFlag(group, 0, 0, height);
    placeOnPlanet(group, theta, phi, -0.004, yaw);
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    world.add(group);
  }
  
  [
    [-1.93, 1.055, 0],
    [-1.36, 1.055, 0],
    [-0.72, 1.525, Math.PI],
    [0.18, 1.055, 0],
    [0.72, 1.525, Math.PI],
    [1.58, 1.055, 0],
    [2.28, 1.525, Math.PI],
  ].forEach((item) => createStreetFlag(...item));
  
  function createFishingBoat(theta, phi, yaw, color) {
    const group = new THREE.Group();
    const hullMaterial = toonMaterial({ color: 0xf3f0df });
    const stripeMaterial = toonMaterial({ color });
    const hull = new THREE.Mesh(
      roundedBox(0.82, 0.18, 0.3, 0.05),
      hullMaterial,
    );
    hull.position.y = 0.09;
    hull.scale.x = 1.15;
    group.add(hull);
  
    const stripe = new THREE.Mesh(
      roundedBox(0.86, 0.055, 0.31, 0.018),
      stripeMaterial,
    );
    stripe.position.y = 0.1;
    group.add(stripe);
  
    [-0.18, 0.08, 0.3].forEach((x) => {
      const bench = new THREE.Mesh(
        roundedBox(0.08, 0.035, 0.25, 0.008),
        townWoodMaterial,
      );
      bench.position.set(x, 0.21, 0);
      group.add(bench);
    });
  
    [-0.34, 0.34].forEach((z) => {
      const outrigger = new THREE.Mesh(
        roundedBox(0.9, 0.035, 0.045, 0.012),
        townWoodMaterial,
      );
      outrigger.position.set(0, 0.08, z);
      group.add(outrigger);
    });
    [-0.25, 0.25].forEach((x) => {
      const brace = new THREE.Mesh(
        roundedBox(0.035, 0.035, 0.72, 0.008),
        townWoodMaterial,
      );
      brace.position.set(x, 0.13, 0);
      group.add(brace);
    });
  
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, 0.88, 7),
      townWoodMaterial,
    );
    mast.position.set(0.02, 0.57, 0);
    group.add(mast);
  
    const mastBar = new THREE.Mesh(
      roundedBox(0.42, 0.018, 0.018, 0.005),
      townMetalMaterial,
    );
    mastBar.position.set(0.18, 0.52, 0.01);
    mastBar.rotation.z = -0.36;
    group.add(mastBar);
  
    const sailCanvas = document.createElement("canvas");
    sailCanvas.width = 128;
    sailCanvas.height = 128;
    const sailContext = sailCanvas.getContext("2d");
    sailContext.fillStyle = "#f3ead4";
    sailContext.fillRect(0, 0, 128, 128);
    sailContext.fillStyle = `#${new THREE.Color(color).getHexString()}`;
    [0, 48, 96].forEach((offset) => {
      sailContext.beginPath();
      sailContext.moveTo(offset - 24, 128);
      sailContext.lineTo(offset + 16, 128);
      sailContext.lineTo(offset + 82, 0);
      sailContext.lineTo(offset + 42, 0);
      sailContext.closePath();
      sailContext.fill();
    });
    const sailTexture = new THREE.CanvasTexture(sailCanvas);
    sailTexture.colorSpace = THREE.SRGBColorSpace;
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(0, 0.75);
    sailShape.lineTo(0.52, 0.1);
    sailShape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ShapeGeometry(sailShape),
      toonMaterial({ map: sailTexture, color: 0xffffff, side: THREE.DoubleSide }),
    );
    sail.position.set(0.035, 0.27, 0.015);
    group.add(sail);
  
    mergeDirectMeshesByMaterial(group);
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(group, theta, phi, 0.02, yaw);
    world.add(group);
    animatedBoats.push({
      group,
      basePosition: group.position.clone(),
      normal: sphericalPosition(theta, phi, 1).normalize(),
      phase: theta * 1.9 + phi * 0.7,
    });
  }
  
  createFishingBoat(-1.65, 2.32, -0.24, 0x3b9dae);
  createFishingBoat(0.9, 2.37, 0.18, 0xd66c59);
  
  function createRetainingWall(
    theta,
    phi,
    yaw,
    length = 1,
    height = 0.28,
  ) {
    const group = new THREE.Group();
    const wallMaterial = toonMaterial({ color: 0xb9b8a9 });
    const wall = new THREE.Mesh(
      roundedBox(length, height, 0.12, 0.012),
      wallMaterial,
    );
    wall.position.y = height * 0.5;
    group.add(wall);
  
    const cap = new THREE.Mesh(
      roundedBox(length + 0.04, 0.045, 0.16, 0.008),
      townTrimMaterial,
    );
    cap.position.y = height + 0.018;
    group.add(cap);
  
    for (let x = -length * 0.4; x <= length * 0.4; x += 0.2) {
      const seam = new THREE.Mesh(
        roundedBox(0.008, height * 0.76, 0.008, 0.003),
        townWoodMaterial,
      );
      seam.position.set(x, height * 0.48, 0.064);
      group.add(seam);
    }
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.012, yaw);
    world.add(group);
  
    const logicalSpan = (length * 0.34) / TOWN_DISTANCE_SCALE;
    [-1, 0, 1].forEach((offset) => {
      addObstacle(theta + logicalSpan * offset, phi, 0.1);
    });
    addCameraCollider(group);
  }
  
  function createStreetStairs(
    theta,
    phi,
    yaw = 0,
    stepCount = 7,
    width = 0.38,
    rise = 0.032,
    run = 0.075,
  ) {
    const group = new THREE.Group();
    const totalRise = (stepCount - 1) * rise;
    const totalRun = (stepCount - 1) * run;
  
    for (let index = 0; index < stepCount; index += 1) {
      const step = new THREE.Mesh(
        roundedBox(width, 0.035, run * 1.28, 0.006),
        townTrimMaterial,
      );
      step.position.set(
        0,
        0.018 + index * rise,
        (index - (stepCount - 1) * 0.5) * run,
      );
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }
  
    const landing = new THREE.Mesh(
      roundedBox(width + 0.06, 0.045, run * 1.8, 0.008),
      townTrimMaterial,
    );
    landing.position.set(0, totalRise + 0.02, totalRun * 0.5 + run * 0.78);
    group.add(landing);
  
    const addRailSegment = (start, end, radius = 0.011) => {
      const direction = end.clone().sub(start);
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 7),
        townMetalMaterial,
      );
      rail.position.copy(start).add(end).multiplyScalar(0.5);
      rail.quaternion.setFromUnitVectors(
        upAxis,
        direction.clone().normalize(),
      );
      group.add(rail);
    };
  
    [-1, 1].forEach((side) => {
      const x = side * (width * 0.5 + 0.035);
      const lowZ = -totalRun * 0.5;
      const highZ = totalRun * 0.5 + run * 0.75;
      const lowTop = new THREE.Vector3(x, 0.2, lowZ);
      const highTop = new THREE.Vector3(
        x,
        totalRise + 0.2,
        highZ,
      );
      addRailSegment(lowTop, highTop, 0.012);
  
      [0, 0.5, 1].forEach((factor) => {
        const z = THREE.MathUtils.lerp(lowZ, highZ, factor);
        const stepY = THREE.MathUtils.lerp(0, totalRise, factor);
        addRailSegment(
          new THREE.Vector3(x, stepY + 0.03, z),
          new THREE.Vector3(x, stepY + 0.2, z),
          0.009,
        );
      });
    });
  
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.006, yaw);
    world.add(group);
    addCameraCollider(group);
  }
  
  function createBicycle(theta, phi, color, yaw = 0) {
    const group = new THREE.Group();
    const frameMaterial = toonMaterial({ color });
    const wheelMaterial = inkMaterial;
  
    [-0.16, 0.16].forEach((x) => {
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.009, 6, 20),
        wheelMaterial,
      );
      wheel.position.set(x, 0.115, 0);
      group.add(wheel);
    });
  
    const addFrameBar = (start, end, radius = 0.009) => {
      const direction = end.clone().sub(start);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
        frameMaterial,
      );
      bar.position.copy(start).add(end).multiplyScalar(0.5);
      bar.quaternion.setFromUnitVectors(
        upAxis,
        direction.clone().normalize(),
      );
      group.add(bar);
    };
  
    const rear = new THREE.Vector3(-0.16, 0.115, 0);
    const front = new THREE.Vector3(0.16, 0.115, 0);
    const seat = new THREE.Vector3(-0.045, 0.28, 0);
    const crank = new THREE.Vector3(-0.015, 0.13, 0);
    addFrameBar(rear, seat);
    addFrameBar(seat, front);
    addFrameBar(front, crank);
    addFrameBar(crank, rear);
    addFrameBar(crank, seat);
  
    const handle = new THREE.Mesh(
      roundedBox(0.08, 0.012, 0.012, 0.004),
      townMetalMaterial,
    );
    handle.position.set(0.18, 0.31, 0);
    group.add(handle);
    addFrameBar(front, new THREE.Vector3(0.18, 0.31, 0), 0.007);
  
    group.rotation.x = -0.06;
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.003, yaw);
    world.add(group);
    addObstacle(theta, phi, 0.13);
  }
  
  function createDeliveryCrates(theta, phi, yaw = 0) {
    const group = new THREE.Group();
    [
      [-0.11, 0.08, 0, 0.22, 0.16, 0.18],
      [0.1, 0.065, 0.02, 0.17, 0.13, 0.16],
      [-0.04, 0.21, -0.01, 0.18, 0.13, 0.15],
    ].forEach(([x, y, z, width, height, depth], index) => {
      const crate = new THREE.Mesh(
        roundedBox(width, height, depth, 0.008),
        index === 1 ? townSignMaterials[1] : townWoodMaterial,
      );
      crate.position.set(x, y, z);
      crate.rotation.y = index * 0.13;
      crate.castShadow = true;
      group.add(crate);
    });
    placeOnPlanet(group, theta, phi, -0.004, yaw);
    world.add(group);
    addObstacle(theta, phi, 0.2);
  }
  
  [
    [-1.1, 1.065, Math.PI * 0.5, 0.95, 0.3],
    [0.78, 1.535, -Math.PI * 0.5, 1.05, 0.34],
    [1.82, 1.345, Math.PI * 0.5, 0.9, 0.26],
  ].forEach((item) => createRetainingWall(...item));
  
  createStreetStairs(-1.58, 1.04, Math.PI * 0.5, 8);
  createStreetStairs(1.38, 1.55, -Math.PI * 0.5, 7);
  createStreetStairs(0.68, 0.755, Math.PI * 0.5, 10, 0.34, 0.03, 0.085);
  createStreetStairs(-0.36, 1.82, Math.PI * 0.5, 10, 0.36, 0.027, 0.08);
  createStreetStairs(-5.48, 0.755, Math.PI * 0.5, 9, 0.34, 0.03, 0.082);
  createStreetStairs(4.08, 1.91, -Math.PI * 0.5, 9, 0.34, 0.03, 0.082);
  
  function createBeachUmbrella(theta, phi, color, yaw = 0, scale = 1) {
    const group = new THREE.Group();
    const canopyMaterial = toonMaterial({ color });
  
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, 0.52, 7),
      townWoodMaterial,
    );
    post.position.y = 0.26;
    group.add(post);
  
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.12, 12),
      canopyMaterial,
    );
    canopy.position.y = 0.55;
    group.add(canopy);
  
    const canopyTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.255, 0.015, 6, 24),
      townTrimMaterial,
    );
    canopyTrim.position.y = 0.5;
    canopyTrim.rotation.x = Math.PI * 0.5;
    group.add(canopyTrim);
  
    const towel = new THREE.Mesh(
      roundedBox(0.32, 0.012, 0.48, 0.008),
      townSignMaterials[
        Math.abs(Math.round(theta * 10)) % townSignMaterials.length
      ],
    );
    towel.position.set(0.24, 0.012, 0.08);
    towel.rotation.y = 0.14;
    group.add(towel);
  
    group.scale.setScalar(scale);
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.006, yaw);
    world.add(group);
    addObstacle(theta, phi, 0.1 * scale);
    addCameraCollider(group);
  }
  
  function createBeachPier(theta, phi, yaw = 0, length = 1.25) {
    const group = new THREE.Group();
    const plankCount = 13;
    for (let index = 0; index < plankCount; index += 1) {
      const plank = new THREE.Mesh(
        roundedBox(0.52, 0.035, length / plankCount * 0.88, 0.005),
        index % 3 === 0 ? townTrimMaterial : townWoodMaterial,
      );
      plank.position.set(
        0,
        0.17,
        -length * 0.5 + ((index + 0.5) / plankCount) * length,
      );
      group.add(plank);
    }
  
    [-0.22, 0.22].forEach((x) => {
      [-0.46, 0, 0.46].forEach((factor) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.024, 0.34, 7),
          townWoodMaterial,
        );
        post.position.set(x, 0.04, factor * length);
        group.add(post);
      });
    });
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.01, yaw);
    world.add(group);
    addObstacle(theta, phi, 0.24);
    addCameraCollider(group);
  }
  
  function createBeachKiosk(theta, phi, yaw = 0) {
    const group = new THREE.Group();
    const deck = new THREE.Mesh(
      roundedBox(0.58, 0.08, 0.46, 0.012),
      townWoodMaterial,
    );
    deck.position.y = 0.08;
    group.add(deck);
  
    const wall = new THREE.Mesh(
      roundedBox(0.42, 0.32, 0.34, 0.014),
      toonMaterial({ color: 0xe5dfc9 }),
    );
    wall.position.y = 0.28;
    group.add(wall);
  
    const roof = new THREE.Mesh(
      createGableRoofGeometry(0.56, 0.46, 0.16),
      townSignMaterials[2],
    );
    roof.position.y = 0.45;
    group.add(roof);
  
    const serviceWindow = new THREE.Mesh(
      roundedBox(0.22, 0.15, 0.018, 0.006),
      townWindowMaterial,
    );
    serviceWindow.position.set(0, 0.31, 0.18);
    group.add(serviceWindow);
  
    const awning = new THREE.Mesh(
      roundedBox(0.3, 0.035, 0.16, 0.008),
      townSignMaterials[0],
    );
    awning.position.set(0, 0.43, 0.24);
    awning.rotation.x = -0.15;
    group.add(awning);
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    placeOnPlanet(group, theta, phi, -0.012, yaw);
    world.add(group);
    addBoxObstacle(theta, phi, 0.58, 0.46, yaw);
    addBuildingFootprint(theta, phi, 0.3, 0.64);
    addCameraCollider(group);
  }
  
  createBeachUmbrella(-1.05, 2.07, 0xd66c59, 0.2, 0.9);
  createBeachUmbrella(0.18, 2.09, 0xe2c76f, -0.1, 1);
  createBeachUmbrella(1.12, 2.04, 0x4e8eaa, 0.35, 0.82);
  createBeachPier(0.54, 2.18, -Math.PI * 0.5, 1.35);
  createBeachKiosk(-1.62, 2.02, Math.PI * 0.44);
  
  createBicycle(-0.92, 1.04, 0x4f8799, Math.PI * 0.5);
  createBicycle(1.5, 1.54, 0xc45e52, -Math.PI * 0.5);
  createDeliveryCrates(-2.3, 1.91, 0.18);
  createDeliveryCrates(2.32, 1.31, -0.12);
  
  function createTree(theta, phi, scale = 1) {
    if (isInsideRoadCorridor(theta, phi)) return;
  
    const group = new THREE.Group();
  
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035 * scale, 0.048 * scale, 0.27 * scale, 9),
      trunkMaterial,
    );
    trunk.position.y = 0.14 * scale;
    trunk.castShadow = true;
    group.add(trunk);
  
    const foliagePivot = new THREE.Group();
    const foliagePivotY = 0.29 * scale;
    foliagePivot.position.y = foliagePivotY;
    group.add(foliagePivot);
  
    const foliageMaterial =
      foliageMaterials[
        Math.abs(Math.round((theta * 19 + phi * 23) * 10)) %
          foliageMaterials.length
      ];
    [
      [0, 0.39, 0, 0.14, 0.17, 0.13],
      [-0.085, 0.405, 0.018, 0.105, 0.135, 0.11],
      [0.085, 0.42, -0.015, 0.115, 0.145, 0.12],
      [0.005, 0.505, 0.015, 0.105, 0.13, 0.105],
    ].forEach(([x, y, z, radiusX, radiusY, radiusZ]) => {
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 9),
        foliageMaterial,
      );
      crown.position.set(x * scale, y * scale - foliagePivotY, z * scale);
      crown.scale.set(radiusX * scale, radiusY * scale, radiusZ * scale);
      crown.castShadow = true;
      foliagePivot.add(crown);
    });
  
    placeOnPlanet(
      group,
      theta,
      phi,
      -0.006 - 0.01 * scale,
      theta * 0.17,
    );
    world.add(group);
    animatedFoliage.push({
      pivot: foliagePivot,
      phase: theta * 1.37 + phi * 2.11,
      strength: THREE.MathUtils.lerp(0.012, 0.022, Math.min(scale, 1)),
    });
    addObstacle(theta, phi, TREE_COLLISION_RADIUS * scale);
    addCameraCollider(group);
  }
  
  [
    [-2.55, 1.22, 1.1],
    [-2.15, 1.7, 0.8],
    [-2.04, 1.04, 0.72],
    [-1.62, 1.3, 0.74],
    [-1.1, 0.84, 0.85],
    [-1.42, 1.76, 0.72],
    [-1.26, 1.08, 0.66],
    [-0.75, 1.82, 0.82],
    [-0.72, 1.34, 0.68],
    [-0.1, 1.87, 0.95],
    [0.12, 0.96, 0.78],
    [0.55, 1.35, 0.75],
    [0.78, 1.72, 0.7],
    [1.55, 0.9, 1.05],
    [1.82, 1.18, 0.84],
    [2.55, 1.35, 0.88],
    [2.9, 1.95, 0.72],
    [-2.95, 1.35, 0.76],
    [2.18, 1.92, 0.7],
    [-2.62, 0.94, 0.9],
    [-2.32, 1.48, 0.82],
    [-1.86, 0.82, 0.88],
    [-1.54, 1.7, 0.76],
    [-0.96, 1.64, 0.86],
    [-0.5, 0.88, 0.8],
    [-0.28, 1.8, 0.94],
    [0.38, 0.84, 0.86],
    [0.72, 1.9, 0.78],
    [1.14, 1.24, 0.72],
    [1.46, 1.72, 0.84],
    [2.04, 1.02, 0.92],
    [2.38, 1.86, 0.8],
    [2.74, 1.12, 0.9],
  ].forEach(([theta, phi, scale]) => createTree(theta, phi, scale));
  
  function createPalmTree(theta, phi, scale = 1) {
    if (isInsideRoadCorridor(theta, phi, 0.48)) return;
    const group = new THREE.Group();
    addLocalPalm(group, 0, 0, scale);
    placeOnPlanet(group, theta, phi, -0.008, theta * 0.17);
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    world.add(group);
    addObstacle(theta, phi, 0.055 * scale);
    addCameraCollider(group);
  }
  
  [
    [-3.18, 2.02, 1.15],
    [-2.7, 2.1, 0.95],
    [-2.2, 2.03, 1.08],
    [-1.42, 2.1, 0.9],
    [-0.72, 2.04, 1.12],
    [0.12, 2.1, 0.96],
    [0.92, 2.02, 1.08],
    [1.7, 2.08, 0.94],
    [2.45, 2.03, 1.12],
    [-2.75, 0.62, 0.82],
    [-1.08, 0.6, 0.9],
    [1.36, 0.61, 0.86],
    [2.72, 0.63, 0.82],
  ].forEach(([theta, phi, scale]) => createPalmTree(theta, phi, scale));
  
  function createRicePaddy(theta, phi, width, depth, yaw = 0, phase = 0) {
    if (isInsideRoadCorridor(theta, phi, 0.46)) return;
    const group = new THREE.Group();
    const water = new THREE.Mesh(
      roundedBox(width, 0.018, depth, 0.018),
      toonMaterial({ color: 0x75a99b, emissive: 0x396f65, emissiveIntensity: 0.04 }),
    );
    water.position.y = 0.012;
    group.add(water);
    const bundMaterial = toonMaterial({ color: 0xb39b69 });
    [-1, 1].forEach((side) => {
      const bund = new THREE.Mesh(
        roundedBox(width + 0.035, 0.045, 0.035, 0.008),
        bundMaterial,
      );
      bund.position.set(0, 0.03, side * depth * 0.5);
      group.add(bund);
    });
    const riceMaterial = foliageMaterials[phase % foliageMaterials.length];
    for (let row = -2; row <= 2; row += 1) {
      for (let column = -3; column <= 3; column += 1) {
        const stalk = new THREE.Mesh(
          new THREE.ConeGeometry(0.018, 0.1, 5),
          riceMaterial,
        );
        stalk.position.set(
          column * width * 0.115,
          0.065,
          row * depth * 0.17,
        );
        group.add(stalk);
      }
    }
    mergeDirectMeshesByMaterial(group);
    placeOnPlanet(group, theta, phi, -0.008, yaw);
    world.add(group);
  }
  
  [
    [-3.35, 0.61, 0.64, 0.36, 0.08, 0],
    [-2.35, 0.59, 0.7, 0.38, -0.12, 1],
    [-1.35, 0.57, 0.62, 0.34, 0.15, 2],
    [1.05, 0.57, 0.68, 0.38, -0.08, 3],
    [2.05, 0.59, 0.62, 0.35, 0.1, 4],
    [3.05, 0.61, 0.7, 0.38, -0.12, 5],
  ].forEach((item) => createRicePaddy(...item));
  
  function createScenicForest() {
    const placements = [];
    const treesPerCap = 220;
    const minimumActualPhi = 0.12;
    const maximumActualPhi =
      ACTUAL_CENTER_PHI + (0.38 - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE;
    const goldenFraction = 0.61803398875;
  
    [0, 1].forEach((hemisphere) => {
      for (let index = 0; index < treesPerCap; index += 1) {
        const progress = (index + 0.5) / treesPerCap;
        const cosPhi = THREE.MathUtils.lerp(
          Math.cos(minimumActualPhi),
          Math.cos(maximumActualPhi),
          progress,
        );
        const northernActualPhi = Math.acos(cosPhi);
        const actualPhi =
          hemisphere === 0
            ? northernActualPhi
            : Math.PI - northernActualPhi;
        const logicalPhi =
          LOGICAL_CENTER_PHI +
          (actualPhi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
        const thetaFraction =
          (index * goldenFraction +
            hemisphere * 0.37 +
            Math.sin(index * 12.9898 + hemisphere) * 0.012 +
            2) %
          1;
        placements.push({
          theta: (thetaFraction - 0.5) * LOGICAL_THETA_PERIOD,
          phi:
            logicalPhi +
            Math.sin(index * 1.81 + hemisphere * 2.7) * 0.025,
          scale:
            0.94 +
            progress * 0.12 +
            ((index * 5 + hemisphere) % 4) * 0.045,
        });
      }
    });
  
    const trunkGeometry = new THREE.CylinderGeometry(
      0.034,
      0.05,
      0.36,
      7,
    );
    trunkGeometry.translate(0, 0.18, 0);
    const crownGeometry = new THREE.DodecahedronGeometry(0.22, 1);
    crownGeometry.scale(0.92, 1.2, 0.88);
    crownGeometry.translate(0, 0.52, 0);
  
    const scenicTrunkMaterial = hideMaterialOutline(trunkMaterial.clone());
    const scenicCrownMaterial = hideMaterialOutline(treeMaterial.clone());
    const trunks = new THREE.InstancedMesh(
      trunkGeometry,
      scenicTrunkMaterial,
      placements.length,
    );
    const crowns = new THREE.InstancedMesh(
      crownGeometry,
      scenicCrownMaterial,
      placements.length,
    );
    const instance = new THREE.Object3D();
  
    placements.forEach(({ theta, phi, scale }, index) => {
      placeOnPlanet(instance, theta, phi, -0.008, theta * 0.13);
      instance.scale.setScalar(scale);
      instance.updateMatrix();
      trunks.setMatrixAt(index, instance.matrix);
      crowns.setMatrixAt(index, instance.matrix);
    });
  
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    trunks.receiveShadow = true;
    crowns.castShadow = true;
    world.add(trunks, crowns);
    infillStats.scenicTrees = placements.length;
  }
  
  createScenicForest();
  
  function createShrubCluster(theta, phi, scale = 1, materialIndex = 0) {
    if (isInsideRoadCorridor(theta, phi, 0.6)) return;
  
    const shrubNormal = sphericalPosition(theta, phi, 1).normalize();
    const nearObstacle = obstacles.some(
      (obstacle) =>
        shrubNormal.angleTo(obstacle.normal) * PLANET_RADIUS <
        obstacle.radius + 0.2 * scale,
    );
    if (nearObstacle) return;
  
    const group = new THREE.Group();
    const material =
      foliageMaterials[materialIndex % foliageMaterials.length];
    [
      [-0.12, 0.105, 0.02, 0.13, 0.11, 0.1],
      [0, 0.13, -0.015, 0.16, 0.14, 0.12],
      [0.13, 0.1, 0.025, 0.12, 0.1, 0.09],
    ].forEach(([x, y, z, width, height, depth]) => {
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(1, 9, 6),
        material,
      );
      crown.position.set(x * scale, y * scale, z * scale);
      crown.scale.set(width * scale, height * scale, depth * scale);
      crown.castShadow = true;
      group.add(crown);
    });
  
    mergeDirectMeshesByMaterial(group);
    placeOnPlanet(group, theta, phi, -0.008, theta * 0.31);
    world.add(group);
  }
  
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 18; column += 1) {
      const theta = -2.92 + column * 0.34 + Math.sin(row * 2.1 + column) * 0.045;
      const phi = 0.7 + row * 0.31 + Math.cos(column * 1.7 + row) * 0.045;
      createShrubCluster(
        theta,
        phi,
        0.72 + ((row * 7 + column * 3) % 5) * 0.075,
        row + column,
      );
    }
  }
  
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 42; column += 1) {
      const sequence = row * 42 + column;
      const theta =
        ROAD_LOOP_START +
        ((column + 0.18 + (row % 2) * 0.46) / 42) *
          LOGICAL_THETA_PERIOD;
      const phi =
        0.66 +
        row * 0.285 +
        Math.sin(sequence * 1.47) * 0.035;
      createShrubCluster(
        theta,
        phi,
        0.62 + (sequence % 5) * 0.055,
        sequence,
      );
    }
  }
  
  function createLake(theta, phi, scaleX, scaleZ) {
    const lift = 0.0015;
    const lakeGeometry = new THREE.CircleGeometry(0.36, 36);
    lakeGeometry.rotateX(-Math.PI / 2);
    conformGeometryToPlanet(lakeGeometry, scaleX, scaleZ, lift);
    const lake = new THREE.Mesh(lakeGeometry, waterMaterial);
    placeOnPlanet(lake, theta, phi, lift, theta * 0.5);
    lake.receiveShadow = true;
  
    for (let index = 0; index < 2; index += 1) {
      const material = hideMaterialOutline(rippleMaterial.clone());
      const ripple = new THREE.Mesh(lakeRippleGeometry, material);
      ripple.position.y = 0.006 + index * 0.001;
      ripple.renderOrder = 2;
      lake.add(ripple);
      lakeRipples.push({
        mesh: ripple,
        phase: index * 0.5 + Math.abs(theta * 0.071),
        scaleX,
        scaleZ,
      });
    }
  
    world.add(lake);
    addObstacle(theta, phi, 0.36 * Math.max(scaleX, scaleZ));
  }
  
  createLake(-2.9, 1.52, 1.25, 0.62);
  createLake(1.85, 1.9, 0.95, 0.48);
  createLake(0.42, 1.25, 0.58, 0.34);
  
  function createRock(theta, phi, scale = 1, yaw = 0, collidable = true) {
    if (isInsideRoadCorridor(theta, phi)) return;
  
    const group = new THREE.Group();
  
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.16 * scale, 1),
      rockMaterial,
    );
    rock.position.y = 0.08 * scale;
    rock.scale.set(1.25, 0.72, 0.9);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  
    if (scale > 0.8) {
      const smallRock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.09 * scale, 1),
        rockMaterial,
      );
      smallRock.position.set(0.15 * scale, 0.05 * scale, -0.08 * scale);
      smallRock.scale.set(1, 0.62, 0.8);
      smallRock.castShadow = true;
      smallRock.receiveShadow = true;
      group.add(smallRock);
    }
  
    placeOnPlanet(group, theta, phi, -0.006, yaw);
    world.add(group);
  
    if (collidable) {
      addObstacle(theta, phi, ROCK_COLLISION_RADIUS * scale);
    }
    addCameraCollider(group);
  }
  
  [
    [-2.38, 0.74, 0.85, 0.1, false],
    [-1.82, 0.68, 0.74, -0.2, false],
    [-0.62, 0.64, 0.78, 0.4, false],
    [0.55, 0.63, 0.72, -0.3, false],
    [1.45, 0.68, 0.8, 0.35, false],
    [2.45, 0.76, 0.75, -0.1, false],
    [-2.72, 2.08, 0.74, 0.2, false],
    [-1.4, 2.11, 0.82, -0.45, false],
    [0.1, 2.08, 0.72, 0.24, false],
    [1.38, 2.1, 0.84, -0.2, false],
    [2.55, 2.07, 0.76, 0.4, false],
    [-0.86, 1.06, 0.68, 0.2, true],
    [0.98, 1.52, 0.72, -0.25, true],
    [2.18, 1.22, 0.66, 0.45, true],
    [-2.46, 1.62, 0.62, -0.35, true],
  ].forEach(([theta, phi, scale, yaw, collidable]) => {
    createRock(theta, phi, scale, yaw, collidable);
  });
  
  function createFlower(theta, phi, materialIndex = 0, scale = 1) {
    const group = new THREE.Group();
    const flowerPivot = new THREE.Group();
    group.add(flowerPivot);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012 * scale, 0.016 * scale, 0.12 * scale, 5),
      treeMaterial,
    );
    stem.position.y = 0.07 * scale;
    flowerPivot.add(stem);
  
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 * scale, 8, 8),
      flowerMaterials[materialIndex % flowerMaterials.length],
    );
    bloom.position.y = 0.15 * scale;
    bloom.castShadow = true;
    flowerPivot.add(bloom);
  
    placeOnPlanet(group, theta, phi, -0.004 - 0.01 * scale);
    world.add(group);
    animatedFlowers.push({
      pivot: flowerPivot,
      phase: theta * 2.3 + phi * 1.7,
    });
  }
  
  [
    [-2.3, 1.06, 0, 1],
    [-1.72, 1.72, 1, 0.9],
    [-0.82, 1.18, 2, 0.85],
    [-0.2, 1.55, 0, 0.8],
    [0.48, 1.82, 3, 0.9],
    [1.08, 0.92, 1, 0.75],
    [1.7, 1.28, 2, 0.85],
    [2.34, 1.68, 0, 0.8],
    [2.95, 1.3, 1, 0.72],
    [-2.82, 1.88, 3, 0.75],
  ].forEach(([theta, phi, materialIndex, scale]) => {
    createFlower(theta, phi, materialIndex, scale);
  });
  
  function createCloud(theta, phi, lift, scale = 1) {
    const group = new THREE.Group();
    group.userData.keepOverviewDynamic = true;
    const puffs = [];
    [
      [-0.16, 0.02, 0, 0.16],
      [0, 0.05, 0.02, 0.22],
      [0.18, 0.02, 0, 0.15],
      [0.05, 0, -0.08, 0.13],
    ].forEach(([x, y, z, radius]) => {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(radius * scale, 12, 10),
        cloudMaterial,
      );
      puff.position.set(x * scale, y * scale, z * scale);
      group.add(puff);
      puffs.push({
        mesh: puff,
        basePosition: puff.position.clone(),
        phase: puffs.length * 0.83,
      });
    });
    placeOnPlanet(group, theta, phi, lift);
    world.add(group);
  
    const shadowGroup = new THREE.Group();
    const shadow = new THREE.Mesh(cloudShadowGeometry, cloudShadowMaterial);
    shadow.layers.set(OVERVIEW_DETAIL_LAYER);
    shadow.scale.set(scale * 1.35, 1, scale * 0.68);
    shadow.renderOrder = 1;
    shadowGroup.add(shadow);
    placeOnPlanet(shadowGroup, theta, phi, 0.014, theta * 0.08);
    world.add(shadowGroup);
  
    driftingClouds.push({
      group,
      puffs,
      shadowGroup,
      shadow,
      theta,
      basePhi: phi,
      lift,
      scale,
      speed: 0.014 + (Math.abs(Math.round(theta * 10)) % 5) * 0.002,
      phase: theta * 1.7 + phi,
    });
  }
  
  createCloud(-2.5, 0.64, 3.4, 1.6);
  createCloud(-1.15, 0.72, 3.8, 1.45);
  createCloud(0.45, 0.66, 4.1, 1.7);
  createCloud(1.82, 0.78, 3.5, 1.4);
  createCloud(2.8, 1.03, 3.7, 1.55);
  createCloud(-2.75, 1.7, 3.2, 1.35);
  createCloud(0.92, 1.86, 3.9, 1.5);
  
  
}
