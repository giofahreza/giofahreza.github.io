import * as THREE from "three";
import { createAlunAlunCivicFactory } from "./civic.js";
import { createAlunAlunEastSchoolsFactory } from "./east-schools.js";
import { createAlunAlunLesehanFactory } from "./lesehan.js";
import {
  ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES,
  ALUN_ALUN_INTERIOR_TACTILE_PAVER_DEFINITION,
  ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
  ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION,
  ALUN_ALUN_WEST_MEDIAN_PATH,
  ALUN_ALUN_WEST_MEDIAN_WIDTHS,
  ALUN_ALUN_WEST_FRONTAGE_DEFINITION,
  ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,
  ALUN_ALUN_WEST_PARK_TREE_CENTERS,
  ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE,
  ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE,
  ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS,
  ALUN_ALUN_SOUTH_MEDIAN_PATH,
  ALUN_ALUN_SOUTH_MEDIAN_WIDTHS,
  ALUN_ALUN_SOUTH_CROSSING_DEFINITION,
  ALUN_ALUN_PARK_OUTLINE,
  ALUN_ALUN_ROAD_SURFACE_Y,
  createAlunAlunTrafficFactory,
} from "./traffic.js";
import { createAlunAlunWestRoadsideFactory } from "./west-roadside.js";
import {
  createGableRoofGeometry,
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../../rendering/materials.js";

const freezeTrafficObstacle = (obstacle) => Object.freeze(obstacle);

// Keep the park finish just below the top of the surveyed blue-white curb.
// The surrounding carriageway is deliberately lower, so the curb has a real
// vertical face instead of acting as a painted line on one flat plane.
export const ALUN_ALUN_PARK_SURFACE_HEIGHTS = Object.freeze({
  ceramic: 0.057,
  checker: 0.0575,
  checkerStep: 0.0005,
  lawn: 0.038,
  outerCurbCenter: 0.04,
  outerCurbHeight: 0.04,
  palePath: 0.059,
  palePathStep: 0.0005,
  tactileCenter: 0.067,
  tactileHeight: 0.018,
});

export const ALUN_ALUN_PARK_LAWN_OUTLINE = Object.freeze(
  ALUN_ALUN_PARK_OUTLINE.map(([north, east]) =>
    Object.freeze([north * 0.77 - 0.1, east * 0.76 + 0.2]),
  ),
);

export const ALUN_ALUN_PARK_NAVIGATION_SURFACES = Object.freeze([
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_PARK_OUTLINE,
    holes: Object.freeze([ALUN_ALUN_PARK_LAWN_OUTLINE]),
    liftOffset:
      ALUN_ALUN_PARK_SURFACE_HEIGHTS.ceramic - ALUN_ALUN_ROAD_SURFACE_Y,
    label: "raised ceramic ring",
  }),
  ...ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES.map((points, index) =>
    Object.freeze({
      shape: "polygon",
      points,
      liftOffset:
        ALUN_ALUN_PARK_SURFACE_HEIGHTS.checker +
        index * ALUN_ALUN_PARK_SURFACE_HEIGHTS.checkerStep -
        ALUN_ALUN_ROAD_SURFACE_Y,
      label: `raised checker path ${index + 1}`,
    }),
  ),
]);

// Unlike the generated map road, these asymmetric infills and exact-width
// pedestrian bands are owned by the tangent-plane landmark. Absolute local
// heights keep walking aligned with the visible surfaces even where the OSM
// source road has deliberately had its generic sidewalk suppressed.
export const ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES = Object.freeze([
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_WESTERN_ASPHALT_UNION_OUTLINE,
    height: ALUN_ALUN_ROAD_SURFACE_Y,
    label: "full-width Ahmad Yani western asphalt union",
  }),
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_WEST_PROPERTY_ASPHALT_INFILL_OUTLINE,
    height: ALUN_ALUN_ROAD_SURFACE_Y,
    label: "full-width KH Wahid Hasyim property-side asphalt infill",
  }),
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTLINE,
    height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    label: "KH Wahid Hasyim 1.5-metre clear sidewalk",
  }),
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_WEST_FRONTAGE_DEFINITION.branchSidewalkOutline,
    height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    label: "Pegadaian one-metre clear sidewalk",
  }),
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_WEST_FRONTAGE_DEFINITION.ahmadYaniSidewalkOutline,
    height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    label: "Ahmad Yani one-metre clear sidewalk",
  }),
  Object.freeze({
    shape: "polygon",
    points: ALUN_ALUN_PEGADAIAN_ROAD_DEFINITION.oppositeSidewalkOutline,
    height: ALUN_ALUN_FRONTAGE_SIDEWALK_Y,
    label: "Pegadaian opposite one-metre sidewalk",
  }),
  ...ALUN_ALUN_WEST_FRONTAGE_DEFINITION.propertyAprons.map((apron) =>
    Object.freeze({
      shape: "polygon",
      points: apron.outline,
      height: apron.height,
      label: apron.label,
    }),
  ),
]);

// Collision objects that belong to the signalised junction are kept separate
// from the landmark/building list so the traffic validator can audit the exact
// same envelopes used by player navigation.
export const ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES = Object.freeze([
  // The detailed Planet Ban architecture scales its 2.92 x 3.34 shell by
  // 1.64 x 0.96 in plan; keep collision aligned with the actual rendered body.
  freezeTrafficObstacle({ label: "Planet Ban", north: 26.04, east: 4.7, width: 4.8, depth: 3.21 }),
  freezeTrafficObstacle({ label: "frontage blue office", north: 25.7, east: 6.9, width: 2.8, depth: 1.09 }),
  freezeTrafficObstacle({ label: "frontage beige row", north: 25.85, east: 9.65, width: 2.95, depth: 4.4 }),
  freezeTrafficObstacle({ label: "frontage ARUM shop", north: 26.35, east: 16.25, width: 2.7, depth: 1.85 }),
  freezeTrafficObstacle({ label: "park vendor cart", north: 16.2, east: 9.45, width: 0.7, depth: 0.9 }),
  ...ALUN_ALUN_SOUTH_MEDIAN_PATH.slice(0, -1).map((start, index) => {
    const end = ALUN_ALUN_SOUTH_MEDIAN_PATH[index + 1];
    const deltaNorth = end[0] - start[0];
    const deltaEast = end[1] - start[1];
    const segmentNorthStart = Math.min(start[0], end[0]);
    const segmentNorthEnd = Math.max(start[0], end[0]);
    const crossingGap =
      ALUN_ALUN_SOUTH_CROSSING_DEFINITION.medianCurbGapNorth;
    const overlapsCrossingGap =
      Math.min(segmentNorthEnd, crossingGap.end) -
        Math.max(segmentNorthStart, crossingGap.start) > 0.0001;
    return freezeTrafficObstacle({
      label: `south median ${index + 1}`,
      north: (start[0] + end[0]) * 0.5,
      east: (start[1] + end[1]) * 0.5,
      width:
        Math.max(
          ALUN_ALUN_SOUTH_MEDIAN_WIDTHS[index],
          ALUN_ALUN_SOUTH_MEDIAN_WIDTHS[index + 1],
        ) + 0.12,
      depth: Math.hypot(deltaNorth, deltaEast) + 0.1,
      yaw: Math.atan2(deltaNorth, deltaEast),
      // Any segment underneath the pedestrian refuge remains solid to animated
      // traffic checks but is omitted from player navigation collision.
      playerCollision: overlapsCrossingGap ? false : undefined,
    });
  }),
  ...ALUN_ALUN_WEST_MEDIAN_PATH.slice(0, -1).map((start, index) => {
    const end = ALUN_ALUN_WEST_MEDIAN_PATH[index + 1];
    const deltaNorth = end[0] - start[0];
    const deltaEast = end[1] - start[1];
    return freezeTrafficObstacle({
      label: `west median ${index + 1}`,
      north: (start[0] + end[0]) * 0.5,
      east: (start[1] + end[1]) * 0.5,
      width:
        Math.max(
          ALUN_ALUN_WEST_MEDIAN_WIDTHS[index],
          ALUN_ALUN_WEST_MEDIAN_WIDTHS[index + 1],
        ) + 0.18,
      depth: Math.hypot(deltaNorth, deltaEast) + 0.14,
      yaw: Math.atan2(deltaNorth, deltaEast),
    });
  }),
  freezeTrafficObstacle({ label: "junction island", north: 21.9, east: 13.08, width: 1.55, depth: 0.95 }),
  freezeTrafficObstacle({ label: "east median nose", north: 23.13, east: 17.33, width: 1.05, depth: 3.55, yaw: 0.27 }),
  freezeTrafficObstacle({ label: "east median middle", north: 24.41, east: 22.43, width: 0.8, depth: 7.3, yaw: 0.235 }),
  freezeTrafficObstacle({ label: "east median tail", north: 25.56, east: 27.08, width: 0.62, depth: 2.6, yaw: 0.26 }),
  freezeTrafficObstacle({ label: "eastbound signal", north: 21.72, east: 10.65, width: 0.2, depth: 0.2 }),
  freezeTrafficObstacle({ label: "westbound signal", north: 23.15, east: 15.72, width: 0.2, depth: 0.2 }),
  freezeTrafficObstacle({ label: "northbound signal", north: 17.32, east: 11.55, width: 0.2, depth: 0.2 }),
  freezeTrafficObstacle({ label: "southbound signal", north: 24.6, east: 15.05, width: 0.2, depth: 0.2 }),
  freezeTrafficObstacle({ label: "east median barrier", north: 22.85, east: 16.55, width: 0.22, depth: 0.58, yaw: 0.25 }),
]);

export function createAlunAlunModelFactory({
  collections: {
    animatedStopDetails,
  },
  constants: {
    FOUNDATION_SINK,
    MAP_METERS_PER_WORLD_UNIT,
  },
  helpers: {
    addIndonesianFlag,
    addLocalPalm,
    getSitubondoSignMaterial,
  },
  materials: {
    foliageMaterials,
    inkMaterial,
    rockMaterial,
    targetMaterial,
    trunkMaterial,
  },
  world,
}) {
  function createAlunAlunTileMaterial() {
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = 128;
    tileCanvas.height = 128;
    const drawing = tileCanvas.getContext("2d");
    const colors = ["#ded0bf", "#f2ede3", "#918b82", "#c98f7b"];
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        drawing.fillStyle = colors[(row * 3 + column * 5) % colors.length];
        drawing.fillRect(column * 32, row * 32, 32, 32);
        drawing.strokeStyle = "rgba(64,72,69,.14)";
        drawing.lineWidth = 2;
        drawing.strokeRect(column * 32, row * 32, 32, 32);
      }
    }
    const texture = new THREE.CanvasTexture(tileCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.NearestFilter;
    return toonMaterial({ map: texture, color: 0xffffff, side: THREE.DoubleSide });
  }

  function addSurfaceContour(path, points) {
    points.forEach(([north, east], index) => {
      // ShapeGeometry is authored in XY, then folded onto the tangent plane.
      const shapeX = north;
      const shapeY = -east;
      if (index === 0) path.moveTo(shapeX, shapeY);
      else path.lineTo(shapeX, shapeY);
    });
    path.closePath();
  }

  function createAlunAlunSurfaceGeometry(
    points,
    tilePeriod = 1.36,
    holes = [],
  ) {
    const shape = new THREE.Shape();
    addSurfaceContour(shape, points);
    holes.forEach((pointsInHole) => {
      const hole = new THREE.Path();
      addSurfaceContour(hole, pointsInHole);
      shape.holes.push(hole);
    });
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI * 0.5);
    const positions = geometry.getAttribute("position");
    const uvs = geometry.getAttribute("uv");
    for (let index = 0; index < positions.count; index += 1) {
      uvs.setXY(
        index,
        positions.getX(index) / tilePeriod,
        positions.getZ(index) / tilePeriod,
      );
    }
    uvs.needsUpdate = true;
    return geometry;
  }

  function addAlunAlunSurface(
    group,
    points,
    y,
    material,
    tilePeriod,
    holes,
  ) {
    const surface = new THREE.Mesh(
      createAlunAlunSurfaceGeometry(points, tilePeriod, holes),
      material,
    );
    surface.position.y = y;
    surface.receiveShadow = true;
    group.add(surface);
    return surface;
  }

  function addAlunAlunCurb(
    group,
    outline,
    materials,
    {
      segmentLength = 0.22,
      height = 0.04,
      depth = 0.07,
      y = 0.04,
      gaps = [],
    } = {},
  ) {
    outline.forEach((start, edgeIndex) => {
      const end = outline[(edgeIndex + 1) % outline.length];
      const deltaX = end[0] - start[0];
      const deltaZ = end[1] - start[1];
      const length = Math.hypot(deltaX, deltaZ);
      const segmentCount = Math.max(1, Math.ceil(length / segmentLength));
      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const t0 = segmentIndex / segmentCount;
        const t1 = (segmentIndex + 1) / segmentCount;
        const midpoint = (t0 + t1) * 0.5;
        if (
          gaps.some(
            (gap) =>
              gap.edge === edgeIndex &&
              midpoint >= gap.start &&
              midpoint <= gap.end,
          )
        ) {
          continue;
        }
        const actualSegmentLength = length / segmentCount;
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(actualSegmentLength + 0.01, height, depth),
          materials[(segmentIndex + edgeIndex) % materials.length],
        );
        curb.position.set(
          THREE.MathUtils.lerp(start[0], end[0], (t0 + t1) * 0.5),
          y,
          THREE.MathUtils.lerp(start[1], end[1], (t0 + t1) * 0.5),
        );
        curb.rotation.y = -Math.atan2(deltaZ, deltaX);
        group.add(curb);
      }
    });
  }

  function addAlunAlunTree(
    group,
    north,
    east,
    height,
    spread,
    phase,
    narrow = false,
    motionStrength = narrow ? 0.025 : 0.04,
    trunkScale = 1,
  ) {
    const tree = new THREE.Group();
    tree.position.set(north, 0.06, east);
    const trunkHeight = height * (narrow ? 0.68 : 0.48);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(
        spread * (narrow ? 0.055 : 0.08) * trunkScale,
        spread * (narrow ? 0.08 : 0.12) * trunkScale,
        trunkHeight,
        8,
      ),
      trunkMaterial,
    );
    trunk.position.y = trunkHeight * 0.5;
    tree.add(trunk);

    const crownPivot = new THREE.Group();
    crownPivot.position.y = trunkHeight * 0.9;
    crownPivot.userData.keepOverviewDynamic = true;
    tree.add(crownPivot);
    const crownMaterial = foliageMaterials[Math.abs(Math.round(phase * 7)) % foliageMaterials.length];
    const crownParts = narrow
      ? [
          [0, height * 0.1, 0, spread * 0.34, height * 0.28, spread * 0.32],
          [0.02, height * 0.34, -0.01, spread * 0.27, height * 0.22, spread * 0.27],
          [-0.015, height * 0.53, 0.01, spread * 0.18, height * 0.16, spread * 0.2],
        ]
      : [
          [0, height * 0.08, 0, spread * 0.72, height * 0.2, spread * 0.66],
          [-spread * 0.32, height * 0.18, 0.06, spread * 0.48, height * 0.18, spread * 0.48],
          [spread * 0.32, height * 0.2, -0.04, spread * 0.52, height * 0.2, spread * 0.5],
          [0, height * 0.36, 0.02, spread * 0.55, height * 0.19, spread * 0.52],
        ];
    crownParts.forEach(([x, y, z, scaleX, scaleY, scaleZ]) => {
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(1, narrow ? 9 : 12, narrow ? 7 : 9),
        crownMaterial,
      );
      crown.position.set(x, y, z);
      crown.scale.set(scaleX, scaleY, scaleZ);
      crown.castShadow = true;
      crownPivot.add(crown);
    });
    mergeDirectMeshesByMaterial(crownPivot);
    group.add(tree);
    animatedStopDetails.push({
      object: crownPivot,
      type: "parkTree",
      phase,
      strength: motionStrength,
    });
    return tree;
  }

  function addAlunAlunGazebo(group, north, east, rotation = 0, roofColor = 0x774a3e) {
    const gazebo = new THREE.Group();
    gazebo.position.set(north, 0.06, east);
    gazebo.rotation.y = rotation;
    const stone = toonMaterial({ color: 0xaaa79c });
    const wood = toonMaterial({ color: 0x5f463a });
    const roofMaterial = toonMaterial({ color: roofColor });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.94, 0.12, 8), stone);
    floor.position.y = 0.06;
    gazebo.add(floor);
    [
      [-0.54, -0.48],
      [-0.54, 0.48],
      [0.54, -0.48],
      [0.54, 0.48],
    ].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.78, 7), wood);
      post.position.set(x, 0.5, z);
      gazebo.add(post);
    });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.56, 4), roofMaterial);
    roof.position.y = 1.04;
    roof.rotation.y = Math.PI * 0.25;
    gazebo.add(roof);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), targetMaterial);
    cap.position.y = 1.38;
    gazebo.add(cap);
    [-0.48, 0.48].forEach((z) => {
      const bench = new THREE.Mesh(roundedBox(0.72, 0.09, 0.16, 0.025), wood);
      bench.position.set(0, 0.29, z * 0.72);
      gazebo.add(bench);
    });
    gazebo.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(gazebo);
    group.add(gazebo);
    return gazebo;
  }

  function addAlunAlunFrontageShelter(group, north, east) {
    const shelter = new THREE.Group();
    shelter.position.set(north, 0.055, east);
    const shelterLength = 18.2;
    const shelterWidth = 1.16;
    const floorMaterial = toonMaterial({ color: 0x41433f });
    const lineMaterial = toonMaterial({ color: 0xe6e5dc });
    const frameMaterial = toonMaterial({ color: 0x606762 });
    const roofMaterial = toonMaterial({ color: 0x4a463f });
    const roofRidgeMaterial = toonMaterial({ color: 0x343733 });
    const wallMaterial = toonMaterial({ color: 0xd8d4c7 });
    const wallTrimMaterial = toonMaterial({ color: 0x3f72a0 });
    const doorMaterial = toonMaterial({ color: 0x4e504b });

    const floor = new THREE.Mesh(
      roundedBox(shelterWidth, 0.075, shelterLength, 0.025),
      floorMaterial,
    );
    floor.position.y = 0.075;
    shelter.add(floor);
    [-1, 1].forEach((side) => {
      const floorLine = new THREE.Mesh(
        roundedBox(0.055, 0.018, shelterLength - 0.22, 0.006),
        lineMaterial,
      );
      floorLine.position.set(side * (shelterWidth * 0.5 - 0.07), 0.121, -0.08);
      shelter.add(floorLine);
    });

    for (
      let eastOffset = -shelterLength * 0.5 + 0.42;
      eastOffset <= shelterLength * 0.5 - 0.4;
      eastOffset += 1.34
    ) {
      [-1, 1].forEach((side) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.029, 0.72, 6),
          frameMaterial,
        );
        post.position.set(
          side * (shelterWidth * 0.5 - 0.07),
          0.47,
          eastOffset,
        );
        shelter.add(post);
      });
      const crossBeam = new THREE.Mesh(
        roundedBox(shelterWidth + 0.04, 0.045, 0.045, 0.012),
        frameMaterial,
      );
      crossBeam.position.set(0, 0.83, eastOffset);
      shelter.add(crossBeam);
    }

    [-1, 1].forEach((side) => {
      const roofPanel = new THREE.Mesh(
        roundedBox(shelterWidth * 0.57, 0.075, shelterLength + 0.24, 0.018),
        roofMaterial,
      );
      roofPanel.position.set(side * shelterWidth * 0.255, 0.88, 0);
      roofPanel.rotation.z = -side * 0.19;
      shelter.add(roofPanel);

      const gutter = new THREE.Mesh(
        roundedBox(0.07, 0.07, shelterLength + 0.28, 0.015),
        roofRidgeMaterial,
      );
      gutter.position.set(side * shelterWidth * 0.53, 0.81, 0);
      shelter.add(gutter);
    });
    const ridge = new THREE.Mesh(
      roundedBox(0.12, 0.085, shelterLength + 0.3, 0.018),
      roofRidgeMaterial,
    );
    ridge.position.y = 0.955;
    shelter.add(ridge);

    const entryOpeningWidth = 0.54;
    const endWallSegmentWidth = (shelterWidth - entryOpeningWidth) * 0.5;
    [-1, 1].forEach((side) => {
      const segmentCenter = side * (
        entryOpeningWidth * 0.5 + endWallSegmentWidth * 0.5
      );
      const eastEndWall = new THREE.Mesh(
        roundedBox(endWallSegmentWidth + 0.04, 0.14, 0.15, 0.025),
        wallMaterial,
      );
      eastEndWall.position.set(segmentCenter, 0.09, shelterLength * 0.5 + 0.01);
      shelter.add(eastEndWall);
      const endWallCap = new THREE.Mesh(
        roundedBox(endWallSegmentWidth + 0.08, 0.035, 0.18, 0.012),
        wallTrimMaterial,
      );
      endWallCap.position.set(segmentCenter, 0.17, shelterLength * 0.5 + 0.01);
      shelter.add(endWallCap);
      for (let index = 0; index < 2; index += 1) {
        const stone = new THREE.Mesh(
          new THREE.CircleGeometry(0.075 + index * 0.01, 7),
          wallTrimMaterial,
        );
        stone.position.set(
          segmentCenter + (index === 0 ? -0.075 : 0.075),
          0.08 + index * 0.045,
          shelterLength * 0.5 + 0.091,
        );
        stone.rotation.z = side * (0.35 + index * 0.52);
        stone.scale.set(1.05, 0.68, 1);
        shelter.add(stone);
      }
    });

    const entryRamp = new THREE.Mesh(
      roundedBox(entryOpeningWidth - 0.05, 0.075, 0.86, 0.02),
      floorMaterial,
    );
    entryRamp.position.set(0, 0.075, shelterLength * 0.5 + 0.43);
    entryRamp.rotation.x = 0.09;
    shelter.add(entryRamp);
    [-1, 1].forEach((side) => {
      const rampLine = new THREE.Mesh(
        roundedBox(0.045, 0.017, 0.84, 0.006),
        lineMaterial,
      );
      rampLine.position.set(
        side * (entryOpeningWidth * 0.5 - 0.045),
        0.116,
        shelterLength * 0.5 + 0.43,
      );
      rampLine.rotation.x = 0.09;
      shelter.add(rampLine);
    });

    const serviceBlock = new THREE.Group();
    serviceBlock.position.set(-1.95, 0, 8.8);
    const serviceWall = new THREE.Mesh(
      roundedBox(1.18, 0.72, 1.26, 0.045),
      wallMaterial,
    );
    serviceWall.position.y = 0.45;
    serviceBlock.add(serviceWall);
    const serviceBase = new THREE.Mesh(
      roundedBox(1.22, 0.14, 1.3, 0.035),
      wallTrimMaterial,
    );
    serviceBase.position.y = 0.13;
    serviceBlock.add(serviceBase);
    const serviceRoof = new THREE.Mesh(
      roundedBox(1.34, 0.09, 1.42, 0.025),
      roofMaterial,
    );
    serviceRoof.position.y = 0.85;
    serviceBlock.add(serviceRoof);
    const serviceDoor = new THREE.Mesh(
      roundedBox(0.38, 0.52, 0.035, 0.012),
      doorMaterial,
    );
    serviceDoor.position.set(0.2, 0.43, 0.65);
    serviceBlock.add(serviceDoor);
    [-0.38, -0.18, 0.02].forEach((northOffset) => {
      const vent = new THREE.Mesh(
        roundedBox(0.1, 0.38, 0.025, 0.008),
        frameMaterial,
      );
      vent.position.set(northOffset, 0.48, 0.662);
      serviceBlock.add(vent);
    });
    mergeDirectMeshesByMaterial(serviceBlock);
    shelter.add(serviceBlock);

    shelter.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(shelter);
    group.add(shelter);
    return shelter;
  }

  function addAlunAlunLamp(group, north, east, phase, gold, bulbMaterial) {
    const lamp = new THREE.Group();
    lamp.position.set(north, 0.06, east);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.45, 9), gold);
    pole.position.y = 0.72;
    lamp.add(pole);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 7), gold);
    finial.position.y = 1.48;
    lamp.add(finial);
    [-0.28, 0, 0.28].forEach((z, index) => {
      const arm = new THREE.Mesh(roundedBox(0.04, 0.18, Math.abs(z) + 0.08, 0.014), gold);
      arm.position.set(0, 1.36 + (index === 1 ? 0.08 : 0), z * 0.5);
      arm.rotation.x = z * 0.36;
      lamp.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 9), bulbMaterial);
      bulb.position.set(0, 1.48 + (index === 1 ? 0.08 : 0), z);
      lamp.add(bulb);
    });
    lamp.rotation.y = phase * 0.37;
    lamp.traverse((child) => {
      if (child.isMesh) child.castShadow = !child.material.transparent;
    });
    mergeDirectMeshesByMaterial(lamp);
    group.add(lamp);
  }

  function addAlunAlunEntranceMessageBoard(group, north, east) {
    const board = new THREE.Group();
    board.position.set(north, 0.06, east);
    board.rotation.y = Math.PI * 0.5;
    const faceMaterial = toonMaterial({ color: 0xe8e7df });
    const frameMaterial = toonMaterial({ color: 0x5a5d57 });
    const postMaterial = toonMaterial({ color: 0x343a36 });

    const backing = new THREE.Mesh(
      roundedBox(1.18, 0.5, 0.045, 0.02),
      frameMaterial,
    );
    backing.position.set(0, 0.69, -0.018);
    board.add(backing);
    const face = new THREE.Mesh(
      roundedBox(1.12, 0.44, 0.035, 0.016),
      faceMaterial,
    );
    face.position.set(0, 0.69, 0.015);
    board.add(face);

    [-0.45, 0.45].forEach((offset) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.028, 0.55, 7),
        postMaterial,
      );
      post.position.set(offset, 0.31, -0.005);
      board.add(post);
    });

    [
      ["Kerusakan alam", 0.79, 0.105, 850],
      ["bukan terjadi pada kita,", 0.68, 0.085, 760],
      ["tapi karena kita.", 0.58, 0.085, 760],
    ].forEach(([text, height, faceHeight, fontWeight]) => {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(1.01, faceHeight),
        getSitubondoSignMaterial(text, "#303430", fontWeight),
      );
      line.position.set(0, height, 0.036);
      line.renderOrder = 5;
      board.add(line);
    });

    board.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(board);
    group.add(board);
  }

  function addAlunAlunEntranceBarrier(group, north, east, phase = 0) {
    const barrier = new THREE.Group();
    barrier.position.set(north, 0.06, east);
    const yellowMaterial = toonMaterial({ color: 0xe7bb3f });
    const redMaterial = toonMaterial({ color: 0xcf5143 });
    const darkMaterial = toonMaterial({ color: 0x4d514d });
    const paleMaterial = toonMaterial({ color: 0xeee8d9 });

    const base = new THREE.Mesh(
      roundedBox(0.22, 0.3, 0.24, 0.035),
      yellowMaterial,
    );
    base.position.y = 0.15;
    barrier.add(base);
    const baseStripe = new THREE.Mesh(
      roundedBox(0.228, 0.075, 0.248, 0.02),
      redMaterial,
    );
    baseStripe.position.y = 0.17;
    barrier.add(baseStripe);
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.25, 10),
      darkMaterial,
    );
    hinge.position.set(0, 0.33, 0);
    hinge.rotation.z = Math.PI * 0.5;
    barrier.add(hinge);

    const armPivot = new THREE.Group();
    armPivot.position.set(0, 0.33, 0);
    const armLength = 1.62;
    const segmentCount = 9;
    const segmentLength = armLength / segmentCount;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const segment = new THREE.Mesh(
        roundedBox(0.07, 0.065, segmentLength + 0.012, 0.012),
        segmentIndex % 2 === 0 ? yellowMaterial : redMaterial,
      );
      segment.position.z = segmentLength * (segmentIndex + 0.5);
      armPivot.add(segment);
    }
    const armTip = new THREE.Mesh(
      roundedBox(0.085, 0.085, 0.08, 0.018),
      paleMaterial,
    );
    armTip.position.z = armLength + 0.035;
    armPivot.add(armTip);
    const counterweight = new THREE.Mesh(
      roundedBox(0.11, 0.14, 0.25, 0.025),
      redMaterial,
    );
    counterweight.position.z = -0.14;
    armPivot.add(counterweight);
    barrier.add(armPivot);

    barrier.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(barrier);
    animatedStopDetails.push({
      object: armPivot,
      type: "parkBarrier",
      phase,
    });
  }

  function addAlunAlunBollard(group, north, east, height, material, phase) {
    const bollard = new THREE.Group();
    bollard.position.set(north, 0.06, east);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, height, 9), material);
    post.position.y = height * 0.5;
    bollard.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 7), material);
    cap.position.y = height + 0.04;
    bollard.add(cap);
    mergeDirectMeshesByMaterial(bollard);
    group.add(bollard);
    animatedStopDetails.push({
      object: bollard,
      type: "parkBollard",
      phase,
      baseY: 0.06,
    });
  }

  function addAlunAlunFlowerBed(group, north, east, width, depth, rotation, phase) {
    const bed = new THREE.Group();
    bed.position.set(north, 0.064, east);
    bed.rotation.y = rotation;
    const soil = new THREE.Mesh(
      roundedBox(width, 0.08, depth, 0.05),
      toonMaterial({ color: 0x6b5142 }),
    );
    const stemMaterial = toonMaterial({ color: 0x426f4d });
    soil.position.y = 0.04;
    bed.add(soil);
    const flowerColors = [0xd95b53, 0xe5bf58, 0xf0e7cf, 0x78a985];
    for (let index = 0; index < 16; index += 1) {
      const x = THREE.MathUtils.lerp(-width * 0.38, width * 0.38, (index % 8) / 7);
      const z = index < 8 ? -depth * 0.22 : depth * 0.22;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.14, 5),
        stemMaterial,
      );
      stem.position.set(x, 0.15, z);
      bed.add(stem);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 7, 5),
        toonMaterial({ color: flowerColors[index % flowerColors.length] }),
      );
      bloom.position.set(x, 0.23 + (index % 3) * 0.012, z);
      bloom.scale.set(1, 0.55, 1);
      bed.add(bloom);
      animatedStopDetails.push({
        object: bloom,
        type: "parkFlower",
        phase: phase + index * 0.31,
        baseX: x,
        baseZ: z,
      });
    }
    bed.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(bed);
  }

  function addAlunAlunShadePalm(group, north, east, rotation, scale, phase) {
    const shade = new THREE.Group();
    shade.position.set(north, 0.06, east);
    shade.rotation.y = rotation;
    const wood = toonMaterial({ color: 0x705645 });
    const leafMaterial = foliageMaterials[Math.abs(Math.round(phase * 5)) % foliageMaterials.length];
    [-0.42, 0.42].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.86, 7), wood);
      post.position.set(x * scale, 0.43 * scale, 0);
      post.scale.y = scale;
      shade.add(post);
    });
    const canopyPivot = new THREE.Group();
    canopyPivot.position.y = 0.88 * scale;
    shade.add(canopyPivot);
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(
        roundedBox(0.68 * scale, 0.045 * scale, 0.18 * scale, 0.02 * scale),
        leafMaterial,
      );
      frond.position.set(
        Math.cos(angle) * 0.34 * scale,
        Math.sin(index * 1.7) * 0.015 * scale,
        Math.sin(angle) * 0.18 * scale,
      );
      frond.rotation.y = -angle;
      frond.rotation.z = Math.cos(angle) * 0.18;
      canopyPivot.add(frond);
    }
    shade.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(shade);
    animatedStopDetails.push({
      object: canopyPivot,
      type: "parkTree",
      phase,
      strength: 0.018,
    });
  }

  function addGarudaMonument(group, north, east, primaryMaterial, goldMaterial) {
    const monument = new THREE.Group();
    monument.position.set(north, 0.06, east);
    const stone = toonMaterial({ color: 0xc5c5bc });
    const darkStone = toonMaterial({ color: 0x596360 });
    const base = new THREE.Mesh(roundedBox(0.9, 0.18, 0.9, 0.08), darkStone);
    base.position.y = 0.09;
    monument.add(base);
    const plinth = new THREE.Mesh(roundedBox(0.6, 0.26, 0.6, 0.06), stone);
    plinth.position.y = 0.3;
    monument.add(plinth);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.72, 10), stone);
    column.position.y = 1.22;
    monument.add(column);

    const shield = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), primaryMaterial);
    shield.position.set(0.21, 1.18, 0);
    shield.rotation.z = Math.PI * 0.25;
    shield.scale.set(0.32, 1, 0.75);
    monument.add(shield);

    const garuda = new THREE.Group();
    garuda.position.y = 2.18;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), goldMaterial);
    body.scale.set(0.72, 1.18, 0.72);
    garuda.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 9, 7), goldMaterial);
    head.position.set(0.09, 0.23, -0.02);
    garuda.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 6), goldMaterial);
    beak.position.set(0.2, 0.22, -0.02);
    beak.rotation.z = -Math.PI * 0.5;
    garuda.add(beak);
    [-1, 1].forEach((direction) => {
      const wing = new THREE.Group();
      wing.position.z = direction * 0.1;
      for (let featherIndex = 0; featherIndex < 5; featherIndex += 1) {
        const feather = new THREE.Mesh(
          roundedBox(0.08, 0.5 - featherIndex * 0.035, 0.1, 0.025),
          goldMaterial,
        );
        feather.position.set(
          -0.02,
          0.1 + featherIndex * 0.045,
          direction * (0.22 + featherIndex * 0.12),
        );
        feather.rotation.x = direction * (0.58 - featherIndex * 0.06);
        feather.rotation.z = direction * (0.32 + featherIndex * 0.045);
        wing.add(feather);
      }
      mergeDirectMeshesByMaterial(wing);
      garuda.add(wing);
    });
    mergeDirectMeshesByMaterial(garuda);
    monument.add(garuda);
    group.add(monument);
    return monument;
  }

  function addAlunAlunFountain(group, north, east) {
    const fountain = new THREE.Group();
    fountain.position.set(north, 0.06, east);
    const stone = toonMaterial({ color: 0xa9aaa2 });
    const water = hideMaterialOutline(toonMaterial({
      color: 0x6fb9c0,
      emissive: 0x326c73,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.86,
    }));
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.24, 0.18, 28), stone);
    basin.position.y = 0.09;
    fountain.add(basin);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.02, 32), water);
    pool.position.y = 0.19;
    pool.rotation.x = -Math.PI * 0.5;
    fountain.add(pool);
    for (let jetIndex = 0; jetIndex < 7; jetIndex += 1) {
      const angle = (jetIndex / 7) * Math.PI * 2;
      const jet = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.025, 0.55, 4, 6),
        water,
      );
      const radius = jetIndex === 0 ? 0 : 0.55;
      jet.position.set(Math.cos(angle) * radius, 0.52, Math.sin(angle) * radius);
      fountain.add(jet);
      animatedStopDetails.push({
        object: jet,
        type: "fountainJet",
        phase: jetIndex * 0.73,
        baseY: 0.52,
        height: jetIndex === 0 ? 1.35 : 0.72,
      });
    }
    for (let mistIndex = 0; mistIndex < 10; mistIndex += 1) {
      const angle = (mistIndex / 10) * Math.PI * 2;
      const mist = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        water,
      );
      mist.position.set(Math.cos(angle) * 0.42, 0.68, Math.sin(angle) * 0.42);
      fountain.add(mist);
      animatedStopDetails.push({
        object: mist,
        type: "fountainMist",
        phase: mistIndex * 0.37,
        radius: 0.36 + (mistIndex % 3) * 0.08,
        angle,
      });
    }
    group.add(fountain);
    return fountain;
  }

  function addAlunAlunElephant(group, north, east, rotation, color, phase) {
    const elephant = new THREE.Group();
    elephant.position.set(north, 0.07, east);
    elephant.rotation.y = rotation;
    const skin = toonMaterial({ color });
    const tusk = toonMaterial({ color: 0xeee5cf });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), skin);
    body.position.y = 0.58;
    body.scale.set(1.16, 0.8, 0.72);
    elephant.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 11, 8), skin);
    head.position.set(0.42, 0.62, 0);
    head.scale.set(0.88, 1, 0.86);
    elephant.add(head);
    const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 5, 8), skin);
    trunk.position.set(0.64, 0.34, 0);
    trunk.rotation.z = -0.16;
    elephant.add(trunk);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), skin);
      ear.position.set(0.3, 0.68, side * 0.22);
      ear.scale.set(0.42, 1, 0.82);
      elephant.add(ear);
      const ivory = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 7), tusk);
      ivory.position.set(0.64, 0.48, side * 0.1);
      ivory.rotation.z = -Math.PI * 0.5;
      elephant.add(ivory);
    });
    [-0.28, 0.27].forEach((x) => {
      [-0.19, 0.19].forEach((z) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.42, 8), skin);
        leg.position.set(x, 0.25, z);
        elephant.add(leg);
      });
    });
    elephant.scale.setScalar(0.88);
    elephant.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(elephant);
    return elephant;
  }

  const {
    addAlunAlunMedianPlanter,
    addAlunAlunParkedPickup,
    addAlunAlunParkedVehicle,
    addAlunAlunPostOffice,
    addAlunAlunRoadBarrier,
    addAlunAlunTyreShop,
    addAlunAlunVendorCart,
    addAlunAlunWestRoadsideContext,
  } = createAlunAlunWestRoadsideFactory({
    collections: {
      animatedStopDetails,
    },
    helpers: {
      addLocalPalm,
      getSitubondoSignMaterial,
    },
    materials: {
      foliageMaterials,
      rockMaterial,
    },
  });
  const {
    addAlunAlunBankBri,
    addAlunAlunKantorPerpustakaan,
  } = createAlunAlunCivicFactory({
    helpers: {
      getSitubondoSignMaterial,
    },
  });
  const { addAlunAlunLesehanBlock } = createAlunAlunLesehanFactory({
    collections: {
      animatedStopDetails,
    },
    constants: {
      FOUNDATION_SINK,
      MAP_METERS_PER_WORLD_UNIT,
    },
    world,
  });
  const {
    addAlunAlunEastJunctionFrontage,
    addAlunAlunIntersectionBoards,
    addAlunAlunSdAlAbror,
    addAlunAlunSdNegeri6Dawuhan,
    addAlunAlunWarungPojok,
  } = createAlunAlunEastSchoolsFactory({
    helpers: {
      getSitubondoSignMaterial,
    },
  });
  const {
    addAlunAlunMotorbike,
    addAlunAlunRoadContext,
    addAlunAlunStreetVehicle,
    addAlunAlunWalker,
    alunAlunTraffic,
  } = createAlunAlunTrafficFactory({
    collections: {
      animatedStopDetails,
    },
    helpers: {
      addIndonesianFlag,
      getSitubondoSignMaterial,
    },
    materials: {
      inkMaterial,
      trunkMaterial,
    },
    roadside: {
      addAlunAlunTree,
      addAlunAlunEastJunctionFrontage,
      addAlunAlunIntersectionBoards,
      addAlunAlunMedianPlanter,
      addAlunAlunParkedPickup,
      addAlunAlunParkedVehicle,
      addAlunAlunPostOffice,
      addAlunAlunRoadBarrier,
      addAlunAlunTyreShop,
      addAlunAlunVendorCart,
      addAlunAlunWestRoadsideContext,
    },
  });

  function addAlunAlunModel(group, primaryMaterial) {
    group.name = "Alun-Alun Situbondo · Street View 360 reference";
    const tileMaterial = createAlunAlunTileMaterial();
    const parkGrassMaterial = toonMaterial({ color: 0x6d9c63 });
    const paleStoneMaterial = toonMaterial({ color: 0xd6d5c8 });
    const tactileStoneMaterial = toonMaterial({ color: 0x77776f });
    const hedgeMaterial = toonMaterial({ color: 0x426f4d });
    const planterMaterial = toonMaterial({ color: 0xbcbdb4 });
    const planterTrimMaterial = toonMaterial({ color: 0xd55b4d });
    const planterSlatBackingMaterial = toonMaterial({ color: 0x414944 });
    const planterSlatMaterial = toonMaterial({ color: 0x858b7d });
    const curbMaterials = [
      toonMaterial({ color: 0xe9e5d5 }),
      toonMaterial({ color: 0x3978a9 }),
    ];
    const lawnCurbMaterials = [
      toonMaterial({ color: 0xf0ecdc }),
      toonMaterial({ color: 0x5b8d72 }),
    ];
    const goldMaterial = toonMaterial({
      color: 0xc89b43,
      emissive: 0x6f4c13,
      emissiveIntensity: 0.08,
    });
    const bulbMaterial = toonMaterial({
      color: 0xfff3c7,
      emissive: 0xf0b94c,
      emissiveIntensity: 0.06,
    });

    const lawnOutline = ALUN_ALUN_PARK_LAWN_OUTLINE;
    // The ceramic base is an outer ring rather than a solid raised polygon.
    // This preserves the lower inset lawn while lifting the complete
    // pedestrian finish above the highway outside the blue-white curb.
    addAlunAlunSurface(
      group,
      ALUN_ALUN_PARK_OUTLINE,
      ALUN_ALUN_PARK_SURFACE_HEIGHTS.ceramic,
      tileMaterial,
      0.6,
      [lawnOutline],
    );
    addAlunAlunSurface(
      group,
      lawnOutline,
      ALUN_ALUN_PARK_SURFACE_HEIGHTS.lawn,
      parkGrassMaterial,
      2,
    );
    addAlunAlunCurb(group, ALUN_ALUN_PARK_OUTLINE, curbMaterials, {
      // A short dropped-curb opening aligns with the compact crossing at the
      // signalised north-east corner.
      // Edges are zero-based: edge 9 is the short diagonal corner from
      // (16.13, 11.96) to (17.10, 10.85), directly beside the zebra.
      gaps: [ALUN_ALUN_SOUTH_CROSSING_DEFINITION.parkCurbGap],
      height: ALUN_ALUN_PARK_SURFACE_HEIGHTS.outerCurbHeight,
      y: ALUN_ALUN_PARK_SURFACE_HEIGHTS.outerCurbCenter,
    });
    addAlunAlunCurb(group, lawnOutline, lawnCurbMaterials, {
      segmentLength: 0.2,
      height: 0.06,
      depth: 0.12,
      y: 0.07,
    });

    // Broad checker paths remain entirely inside the blue-white park curb.
    // The exterior side is owned by the custom asphalt surface in traffic.js.
    ALUN_ALUN_INTERIOR_CHECKER_PATH_OUTLINES.forEach((points, index) =>
      addAlunAlunSurface(
        group,
        points,
        ALUN_ALUN_PARK_SURFACE_HEIGHTS.checker +
          index * ALUN_ALUN_PARK_SURFACE_HEIGHTS.checkerStep,
        tileMaterial,
        0.6,
      ),
    );

    [
      [[9.4, -10.9], [10.2, -10.9], [10.2, 10.6], [9.4, 10.6]],
      [[-13.7, -9.8], [-12.7, -9.8], [-12.7, 9.6], [-13.7, 9.6]],
    ].forEach((points, index) =>
      addAlunAlunSurface(
        group,
        points,
        ALUN_ALUN_PARK_SURFACE_HEIGHTS.palePath +
          index * ALUN_ALUN_PARK_SURFACE_HEIGHTS.palePathStep,
        paleStoneMaterial,
        2,
      ),
    );

    // Keep the tactile strip wholly on the ceramic side of the blue curb.
    const tactilePavers = ALUN_ALUN_INTERIOR_TACTILE_PAVER_DEFINITION;
    for (let index = 0; ; index += 1) {
      const east = tactilePavers.startEast + index * tactilePavers.step;
      if (east > tactilePavers.endEast + 1e-9) break;
      const tactilePaver = new THREE.Mesh(
        roundedBox(
          tactilePavers.width,
          ALUN_ALUN_PARK_SURFACE_HEIGHTS.tactileHeight,
          tactilePavers.depth,
          0.006,
        ),
        tactileStoneMaterial,
      );
      tactilePaver.position.set(
        tactilePavers.north,
        ALUN_ALUN_PARK_SURFACE_HEIGHTS.tactileCenter,
        east,
      );
      group.add(tactilePaver);
    }

    // Street-facing sign planter and Situbondo sail mark from the north-side
    // entrance shown in the Street View panorama.
    const signPlanter = new THREE.Mesh(roundedBox(1.2, 0.14, 4.45, 0.08), planterMaterial);
    signPlanter.position.set(14.15, 0.12, 0.2);
    group.add(signPlanter);
    const planterTrim = new THREE.Mesh(roundedBox(1.24, 0.04, 4.52, 0.02), planterTrimMaterial);
    planterTrim.position.set(14.15, 0.205, 0.2);
    group.add(planterTrim);
    const hedge = new THREE.Mesh(roundedBox(0.98, 0.16, 4.18, 0.1), hedgeMaterial);
    hedge.position.set(14.15, 0.31, 0.2);
    group.add(hedge);

    const slatBacking = new THREE.Mesh(
      roundedBox(0.035, 0.17, 0.98, 0.012),
      planterSlatBackingMaterial,
    );
    slatBacking.position.set(14.765, 0.13, -1.56);
    group.add(slatBacking);
    for (let slatIndex = 0; slatIndex < 8; slatIndex += 1) {
      const slat = new THREE.Mesh(
        roundedBox(0.043, 0.145, 0.055, 0.009),
        planterSlatMaterial,
      );
      slat.position.set(14.785, 0.13, -1.18 - slatIndex * 0.108);
      slat.rotation.x = (slatIndex % 3 - 1) * 0.025;
      group.add(slat);
    }

    const sailMaterial = toonMaterial({ color: 0xe86855 });
    const frontage = new THREE.Group();
    frontage.position.set(14.79, 0.62, 0.2);
    frontage.rotation.y = Math.PI * 0.5;
    const cityName = new THREE.Mesh(
      new THREE.PlaneGeometry(3.12, 0.3),
      getSitubondoSignMaterial("Situbondo", "#e3e4dc", 840),
    );
    cityName.position.set(-0.18, 0.09, 0);
    cityName.renderOrder = 5;
    frontage.add(cityName);
    const citySubtitle = new THREE.Mesh(
      new THREE.PlaneGeometry(2.92, 0.22),
      getSitubondoSignMaterial("kota santri pancasila", "#f4f0df", 800),
    );
    citySubtitle.position.set(-0.05, -0.15, 0.004);
    citySubtitle.renderOrder = 5;
    frontage.add(citySubtitle);

    const addSail = (x, width, height, bend) => {
      const sailShape = new THREE.Shape();
      sailShape.moveTo(-width * 0.5, -height * 0.5);
      sailShape.quadraticCurveTo(
        -width * bend,
        height * 0.04,
        -width * 0.28,
        height * 0.5,
      );
      sailShape.quadraticCurveTo(
        width * 0.2,
        height * 0.18,
        width * 0.5,
        -height * 0.5,
      );
      sailShape.closePath();
      const sail = new THREE.Mesh(
        new THREE.ShapeGeometry(sailShape),
        sailMaterial,
      );
      sail.position.set(x, 0.06, 0.025);
      frontage.add(sail);
    };
    addSail(2.04, 0.38, 0.62, 0.46);
    addSail(1.7, 0.27, 0.47, 0.34);
    group.add(frontage);

    addAlunAlunEntranceMessageBoard(group, 13.05, 10.05);
    addAlunAlunEntranceBarrier(group, 13.25, -2.62, 0.08);

    const garudaMonument = addGarudaMonument(group, 12.7, 0.95, primaryMaterial, goldMaterial);
    garudaMonument.scale.setScalar(0.72);

    const flag = addIndonesianFlag(group, 12.7, -1.45, 1.85);
    animatedStopDetails.push({ object: flag, type: "parkFlag", phase: 1.1 });

    addAlunAlunGazebo(group, 11.4, -6.2, 0.08, 0x75463e);
    addAlunAlunGazebo(group, 5.2, 7.1, -0.2, 0x765148);
    addAlunAlunGazebo(group, -8.4, -5.6, 0.12, 0x765148);
    addAlunAlunGazebo(group, -9.1, 7.6, -0.08, 0x6f4a40);

    addAlunAlunElephant(group, 11.8, 8.2, -0.18, 0x3d8a63, 0.3);
    addAlunAlunElephant(group, 10.8, -7.75, 0.12, 0x77766f, 1.2);
    addAlunAlunFrontageShelter(group, 7.65, 0.4);

    [
      [13.55, -9.0, 1.2, 0.42, 0.02],
      [13.55, -6.7, 1.2, 0.42, 0.6],
      [13.55, 6.2, 1.2, 0.42, 1.1],
      [13.55, 8.7, 1.2, 0.42, 1.7],
      [7.9, 11.4, 0.95, 0.36, 2.2],
      [-8.8, 11.3, 0.95, 0.36, 2.8],
    ].forEach(([north, east, width, depth, phase], index) =>
      addAlunAlunFlowerBed(group, north, east, width, depth, index % 2 ? 0.1 : -0.08, phase),
    );

    // The large irregular boulder is visible directly beside the north gazebo.
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.86, 1), rockMaterial);
    boulder.position.set(11.0, 0.76, -8.1);
    boulder.rotation.set(0.1, 0.7, -0.08);
    boulder.scale.set(1.25, 0.88, 1.05);
    group.add(boulder);

    // The west edge is a shaded promenade in Street View, not an exposed
    // ceramic apron. Tree wells keep the new mature trunks from appearing to
    // grow directly out of the checker paving, while the central park entrance
    // remains open between the two halves of the row.
    const westTreeWellMaterial = toonMaterial({ color: 0x514a3b });
    ALUN_ALUN_WEST_PARK_TREE_CENTERS.forEach(([north, east], index) => {
      const well = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.29, 0.012, 14),
        westTreeWellMaterial,
      );
      well.position.set(north, 0.063, east);
      group.add(well);
      addAlunAlunTree(
        group,
        north,
        east,
        3.55 + (index % 4) * 0.18,
        1.3 + (index % 3) * 0.14,
        40 + index * 0.73,
        false,
        0.018,
        0.42,
      );
    });
    ALUN_ALUN_WEST_PROPERTY_TREE_CENTERS.forEach(
      ([north, east], index) =>
        addAlunAlunTree(
          group,
          north,
          east,
          3.7 + (index % 3) * 0.22,
          1.42 + (index % 4) * 0.1,
          60 + index * 0.81,
          false,
          0.016,
          0.55,
        ),
    );

    // Preserve the real SD gates as openings instead of drawing one invented
    // wall. The mosque already owns its surveyed name wall and fence, so it
    // deliberately receives no duplicate hedge here.
    [
      [[-0.1885297087, -19.2072863383], [1.4093018454, -19.5295196774]],
      [[4.1246352226, -20.0771186645], [7.359508921, -20.7294929092]],
    ].forEach(([start, end]) => {
      const deltaNorth = end[0] - start[0];
      const deltaEast = end[1] - start[1];
      const hedge = new THREE.Mesh(
        roundedBox(
          Math.hypot(deltaNorth, deltaEast),
          0.42,
          0.16,
          0.04,
        ),
        hedgeMaterial,
      );
      hedge.position.set(
        (start[0] + end[0]) * 0.5,
        0.27,
        (start[1] + end[1]) * 0.5,
      );
      hedge.rotation.y = -Math.atan2(deltaEast, deltaNorth);
      group.add(hedge);
    });

    const tallTreePositions = [
      [10.15, -11.5, 4.08, 0.9], [10.35, -10.25, 4.34, 0.96],
      [10.2, -9.0, 4.18, 0.88], [10.0, -7.75, 4.42, 0.94],
      [9.92, -6.5, 4.12, 0.86], [9.8, -5.25, 4.36, 0.92],
      [9.68, -4.0, 4.2, 0.9], [9.6, -2.75, 4.46, 0.96],
      [9.48, -1.5, 4.14, 0.88], [9.38, -0.25, 4.38, 0.94],
      [9.28, 1.0, 4.22, 0.9], [9.18, 2.25, 4.44, 0.96],
      [9.05, 3.5, 4.16, 0.88], [8.92, 4.75, 4.36, 0.94],
      [8.78, 6.0, 4.18, 0.9], [8.62, 7.25, 4.4, 0.96],
      [8.46, 8.5, 4.12, 0.88], [8.3, 9.75, 4.32, 0.94],
    ];
    tallTreePositions.forEach(([north, east, height, spread], index) =>
      addAlunAlunTree(group, north, east, height, spread, index * 0.61, true, 0.02),
    );
    [
      [7.3, -10.4, 3.45, 1.55], [7.0, -6.7, 3.2, 1.48],
      [6.7, -2.7, 3.5, 1.65], [6.4, 1.7, 3.25, 1.5],
      [6.1, 5.8, 3.55, 1.68], [5.8, 9.3, 3.35, 1.55],
      [3.1, -11.1, 3.0, 1.5], [1.0, 10.8, 2.8, 1.35],
      [-4.3, -9.0, 3.2, 1.55], [-5.2, 10.7, 3.1, 1.45],
      [-11.7, -6.4, 2.9, 1.35], [-10.8, 5.0, 3.25, 1.5],
      [-2.4, 5.8, 2.55, 1.25], [4.2, -3.5, 2.65, 1.3],
    ].forEach(([north, east, height, spread], index) =>
      addAlunAlunTree(group, north, east, height, spread, 8 + index * 0.91),
    );

    [
      [12.15, -9.8, 1.72], [11.75, -6.2, 1.62],
      [11.7, 3.15, 1.92], [11.45, 5.0, 2.08],
      [11.15, 6.85, 2.22], [10.85, 8.75, 1.98],
      [8.1, 10.4, 2.5], [2.6, -8.0, 2.15], [-4.0, 8.5, 2.25],
      [-12.0, -3.0, 2.3],
    ].forEach(([north, east, scale], index) => {
      const palmRoot = new THREE.Group();
      palmRoot.position.set(north, 0.06, east);
      group.add(palmRoot);
      const palm = addLocalPalm(palmRoot, 0, 0, scale);
      animatedStopDetails.push({
        object: palm,
        type: "parkPalm",
        phase: index * 0.86,
        strength: 0.025,
      });
    });

    [
      [14.2, -5.4], [14.2, 0.1], [13.8, 8.2], [4.0, 12.0],
      [-5.8, 12.3], [-12.5, 7.3], [-13.3, -3.2], [-7.8, -9.9],
    ].forEach(([north, east], index) =>
      addAlunAlunLamp(group, north, east, index, goldMaterial, bulbMaterial),
    );

    addAlunAlunFountain(group, -4.8, 4.7);
    [
      [0x4f8fa2, 0.2, 13.0, 12.0, 0.13],
      [0xc85e4f, 1.9, 12.4, 11.1, -0.11],
      [0xd6b24e, 3.4, 11.8, 10.4, 0.1],
      [0x71905f, 4.8, 13.6, 12.6, -0.09],
    ].forEach(([color, phase, radiusX, radiusZ, speed]) =>
      addAlunAlunWalker(group, color, phase, radiusX, radiusZ, speed),
    );
    addAlunAlunWalker(group, 0xe8e2d3, 0.2, 0, 0, 0.34, 0, 0, {
      type: "line",
      startNorth: 15.35,
      startEast: 9.2,
      endNorth: 15.35,
      endEast: -8.4,
    });
    addAlunAlunWalker(group, 0x8b604f, 8.8, 0, 0, 0.31, 0, 0, {
      type: "line",
      startNorth: 15.08,
      startEast: -7.8,
      endNorth: 15.08,
      endEast: 8.5,
    });
    addAlunAlunWalker(group, 0x4f7d91, 5.4, 0, 0, 0.29, 0, 0, {
      type: "line",
      startNorth: 13.2,
      startEast: 0.25,
      endNorth: -10.5,
      endEast: 0.25,
    });
    addAlunAlunWalker(group, 0xd47a55, 1.6, 0, 0, 0.27, 0, 0, {
      type: "line",
      startNorth: 7.42,
      startEast: -7.8,
      endNorth: 7.42,
      endEast: 8.55,
    });
    addAlunAlunWalker(group, 0x547d8e, 9.2, 0, 0, 0.24, 0, 0, {
      type: "line",
      startNorth: 7.9,
      startEast: 8.35,
      endNorth: 7.9,
      endEast: -7.55,
    });
    addAlunAlunWalker(group, 0x8a5d49, 1.35, 0, 0, 0.22, 0, 0, {
      type: "line",
      startNorth: 13.8744,
      startEast: -21.7679,
      endNorth: -15.3516,
      endEast: -15.8739,
    });
    addAlunAlunWalker(group, 0x4f7180, 8.1, 0, 0, 0.19, 0, 0, {
      type: "line",
      startNorth: -15.3516,
      startEast: -15.8739,
      endNorth: 13.8744,
      endEast: -21.7679,
    });
    addAlunAlunWalker(group, 0xb66b50, 3.7, 0, 0, 0.21, 0, 0, {
      type: "line",
      startNorth: 8.97,
      startEast: -16.48,
      endNorth: -13.63,
      endEast: -11.79,
    });
    addAlunAlunKantorPerpustakaan(group);
    addAlunAlunBankBri(group);
    addAlunAlunLesehanBlock(group);
    addAlunAlunWarungPojok(group);
    addAlunAlunSdAlAbror(group);
    addAlunAlunSdNegeri6Dawuhan(group);
    addAlunAlunRoadContext(group);
    [
      [0xe9e5d8, 0.02, 21.48, 2.35, 0, "mpv"],
      [0x4f5f63, 0.27, 23.05, 2.15, 1.44, "pickup"],
      [0x9e584a, 0.54, 21.62, 2.45, 2.88, "minivan"],
      [0xd8d6cd, 0.14, 19.2, -2.25, 0, "minivan"],
      [0xb94f4a, 0.43, 19.76, -2.4, 1.44, "sedan"],
      [0x596c70, 0.74, 19.25, -2.2, 2.88, "mpv"],
    ].forEach(([color, phase, laneNorth, speed, queueOffset, variant]) =>
      addAlunAlunStreetVehicle(group, color, phase, laneNorth, speed, queueOffset, variant),
    );
    [
      [0xd36a45, 0.08, 21.4, 2.85, 0.72, "commuter"],
      [0xe7e1d5, 0.31, 23.0, 2.7, 2.16, "scooter"],
      [0x4d7889, 0.57, 21.58, 3.0, 3.6, "delivery"],
      [0xcaa548, 0.82, 23.2, 2.8, 5.04, "scooter"],
      [0x3e7280, 0.19, 19.35, -2.75, 0.72, "commuter"],
      [0x5b655e, 0.45, 19.86, -2.9, 2.16, "scooter"],
      [0xb64f49, 0.69, 19.42, -2.7, 3.6, "delivery"],
      [0xe6e0d3, 0.94, 19.92, -3.0, 5.04, "scooter"],
    ].forEach(([color, phase, laneNorth, speed, queueOffset, variant]) =>
      addAlunAlunMotorbike(group, color, phase, laneNorth, speed, queueOffset, variant),
    );
    [
      [0x4f7180, 0.04, -0.78, 1.7, 1.15, "cargoTruck", 0xc4a84f],
      [0xe4e0d7, 0.33, 0.78, -1.75, 1.45, "boxTruck", 0x8b918b],
      [0xb2aea4, 0.58, -1.32, 1.9, 2.35, "pickup", null],
      [0x596c70, 0.91, 1.32, -1.95, 2.55, "minivan", null],
    ].forEach(([color, phase, laneOffset, speed, queueOffset, variant, cargoColor]) =>
      addAlunAlunStreetVehicle(
        group,
        color,
        phase,
        laneOffset,
        speed,
        queueOffset,
        variant,
        "cross",
        cargoColor,
      ),
    );
    [
      [0xd66a4c, 0.16, -1.05, 2.55, 0, "delivery"],
      [0x4d7889, 0.69, 1.05, -2.65, 0.35, "commuter"],
    ].forEach(([color, phase, laneOffset, speed, queueOffset, variant]) =>
      addAlunAlunMotorbike(group, color, phase, laneOffset, speed, queueOffset, variant, "cross"),
    );

    group.userData.localObstacles = [
      { north: 12.7, east: -0.35, width: 0.8, depth: 0.8 },
      { north: 14.15, east: 0.2, width: 1.3, depth: 4.6 },
      { north: 11.8, east: 8.2, width: 1.0, depth: 0.8 },
      { north: 10.8, east: -7.75, width: 1.0, depth: 0.8 },
      { north: 11.4, east: -6.2, width: 1.5, depth: 1.5 },
      { north: 5.2, east: 7.1, width: 1.5, depth: 1.5 },
      { north: 5.7, east: 9.2, width: 1.22, depth: 1.34 },
      { north: 7.22, east: 9.52, width: 0.34, depth: 0.2 },
      { north: 8.08, east: 9.52, width: 0.34, depth: 0.2 },
      { north: -8.4, east: -5.6, width: 1.5, depth: 1.5 },
      { north: -9.1, east: 7.6, width: 1.5, depth: 1.5 },
      { north: 11.0, east: -8.1, width: 1.7, depth: 1.5 },
      { north: -4.8, east: 4.7, width: 2.4, depth: 2.4 },
      { north: 3.12, east: -22.97, width: 7.9, depth: 5.0, yaw: 0.199 },
      { north: 25.1, east: 0.42, width: 4.65, depth: 5.25 },
      { north: 24.54, east: -3.38, width: 8.1, depth: 2.42 },
      { north: 23.55, east: -12.35, width: 1.08, depth: 1.42 },
      // Signals, frontage around the open north arm, the relocated vendor,
      // medians, island and barrier share one collision definition with the
      // route-clearance validator.
      ...ALUN_ALUN_TRAFFIC_COLLISION_OBSTACLES.filter(
        (obstacle) => obstacle.playerCollision !== false,
      ),
      { north: 30.82, east: 23.74, width: 6.65, depth: 4.8, yaw: 0.145 },
      { north: -23.52, east: -7.97, width: 2.85, depth: 3.29 },
      { north: -26.0, east: -8.06, width: 3.06, depth: 3.59 },
      { north: -24.2, east: -9.43, width: 1.93, depth: 1.58 },
      { north: -25.46, east: -10.52, width: 4.02, depth: 2.12 },
      { north: -23.54, east: -10.1, width: 1.42, depth: 1.29 },
      { north: -23.22, east: -6.4, width: 1.94, depth: 1.94 },
      { north: -22.54, east: -9.45, width: 0.7, depth: 1.76 },
      { north: -22.88, east: -10.76, width: 0.78, depth: 0.74 },
      { north: -22.94, east: -11.63, width: 0.33, depth: 0.73 },
      { north: -22.73, east: -10.54, width: 0.28, depth: 0.49 },
      { north: -22.31, east: -8.32, width: 0.31, depth: 0.61 },
      { north: -22.19, east: -7.72, width: 0.31, depth: 0.61 },
      { north: -22.0, east: -6.72, width: 0.44, depth: 1.29 },
      { north: -23.02, east: 25.64, width: 6.12, depth: 1.7, yaw: 0.199 },
      { north: 16.16, east: -31.56, width: 0.42, depth: 0.42, yaw: -1.577 },
      { north: 19.6, east: -31.22, width: 0.17, depth: 3.98, yaw: -1.577 },
      { north: 2.69, east: -39.7, width: 8.1, depth: 1.52 },
      { north: -1.31, east: -37.01, width: 1.62, depth: 6.5 },
      { north: 0.56, east: -37.68, width: 1.2, depth: 5.15 },
      { north: -0.16, east: -33.66, width: 3.4, depth: 0.72 },
      { north: 3.06, east: -33.54, width: 1.05, depth: 0.72 },
      { north: 2.16, east: -33.37, width: 0.9, depth: 0.08 },
      { north: 5.49, east: -33.66, width: 3.55, depth: 0.62 },
      { north: 20.95, east: -5.55, width: 0.65, depth: 1.2, yaw: 0.08 },
      { north: 24.55, east: -8.1, width: 0.62, depth: 1.05 },
      { north: 24.55, east: -10.15, width: 0.62, depth: 1.0 },
      { north: 6.4, east: -19.5769, width: 0.58, depth: 1.02, yaw: 1.77 },
      { north: 4.1, east: -16.82, width: 0.58, depth: 1.0, yaw: 1.77 },
      { north: -3.2, east: -17.6409, width: 0.56, depth: 0.98, yaw: 1.77 },
      { north: -10.2, east: -16.2292, width: 0.57, depth: 1.0, yaw: 1.77 },
      { north: 15.6, east: 1.2, width: 0.2, depth: 0.95 },
    ];

    // Navigation follows the exact ceramic ownership polygons. Use a relative
    // lift so crossing the curb raises the rider by the same amount as the
    // visible road-to-ceramic step without inheriting the landmark's sag.
    group.userData.navigation = {
      surfaces: [
        ...ALUN_ALUN_PARK_NAVIGATION_SURFACES,
        ...ALUN_ALUN_FRONTAGE_NAVIGATION_SURFACES,
      ],
    };

    // Batch the static paving, curbs, planter bodies and boulder. Gazebos,
    // foliage, water and people stay separate because they animate or collide.
    mergeDirectMeshesByMaterial(group);
  }


  return {
    addAlunAlunModel,
    addAlunAlunTree,
    addAlunAlunWalker,
    alunAlunTraffic,
  };
}
