import * as THREE from "three";
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

const upAxis = new THREE.Vector3(0, 1, 0);

// situbondo-map.json building 2. Map coordinates are stored in decimetres and
// the Alun-Alun landmark is authored at the project's established 1:5 scale.
// Local X is north and local Z is east.
export const ALUN_ALUN_LAPAS_PLACEMENT = Object.freeze({
  buildingIndex: 2,
  north: 6.9,
  east: 25.4,
  northSpan: 12.14,
  eastSpan: 13.2,
  yaw: 0.2072,
});

export const ALUN_ALUN_LAPAS_STREET_VIEW = Object.freeze({
  cornerPanoId: "bZjDa1lCYPoHpaIchD97UQ",
  cornerHeading: 90,
  westFrontDetailPanoId: "uBW81RMam4M8s5SyT7Z9BA",
  westFrontDetailHeading: 90,
  westFrontWidePanoId: "QybYaip5P2NJmRyJuhkXtQ",
  westFrontWideHeading: 90,
});

function createArchPanelGeometry(width, height) {
  const radius = width * 0.5;
  const straightHeight = Math.max(0.01, height - radius);
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(-radius, straightHeight);
  shape.absarc(0, straightHeight, radius, Math.PI, 0, true);
  shape.lineTo(radius, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 18);
}

export function createAlunAlunLapasFactory({
  helpers: {
    getSitubondoSignMaterial,
  },
}) {
  function addRod(parent, start, end, radius, material) {
    const direction = end.clone().sub(start);
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 7),
      material,
    );
    rod.position.copy(start).add(end).multiplyScalar(0.5);
    rod.quaternion.setFromUnitVectors(upAxis, direction.normalize());
    parent.add(rod);
    return rod;
  }

  function addWestLabel(
    parent,
    text,
    width,
    height,
    x,
    y,
    z,
    color,
    fontWeight = 850,
    options = {},
  ) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      getSitubondoSignMaterial(text, color, fontWeight, options),
    );
    label.position.set(x, y, z);
    label.rotation.y = Math.PI;
    label.renderOrder = 7;
    parent.add(label);
    return label;
  }

  function addNorthLabel(
    parent,
    text,
    width,
    height,
    x,
    y,
    z,
    color,
    fontWeight = 850,
    options = {},
  ) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      getSitubondoSignMaterial(text, color, fontWeight, options),
    );
    label.position.set(x, y, z);
    label.rotation.y = Math.PI * 0.5;
    label.renderOrder = 7;
    parent.add(label);
    return label;
  }

  function addWestArchedWindow(
    parent,
    x,
    {
      wallZ,
      baseY,
      frameMaterial,
      glassMaterial,
      barMaterial,
    },
  ) {
    const width = 0.58;
    const height = 0.69;
    const outer = new THREE.Mesh(
      createArchPanelGeometry(width, height),
      frameMaterial,
    );
    outer.position.set(x, baseY, wallZ);
    outer.rotation.y = Math.PI;
    parent.add(outer);

    const inner = new THREE.Mesh(
      createArchPanelGeometry(width - 0.12, height - 0.13),
      glassMaterial,
    );
    inner.position.set(x, baseY + 0.055, wallZ - 0.011);
    inner.rotation.y = Math.PI;
    parent.add(inner);

    [-0.13, 0, 0.13].forEach((offset) => {
      const bar = new THREE.Mesh(
        roundedBox(0.026, 0.48, 0.02, 0.004),
        barMaterial,
      );
      bar.position.set(x + offset, baseY + 0.275, wallZ - 0.026);
      parent.add(bar);
    });
    const springY = baseY + 0.42;
    const archRadius = (width - 0.12) * 0.5;
    // White transoms divide the rectangular lights from the radial fanlight
    // in west-front panorama uBW81RMam4M8s5SyT7Z9BA.
    [springY, baseY + 0.25].forEach((y) => {
      const transom = new THREE.Mesh(
        roundedBox(width - 0.1, 0.025, 0.024, 0.004),
        barMaterial,
      );
      transom.position.set(x, y, wallZ - 0.028);
      parent.add(transom);
    });
    [-0.72, -0.36, 0, 0.36, 0.72].forEach((angleOffset) => {
      const angle = Math.PI * 0.5 + angleOffset;
      addRod(
        parent,
        new THREE.Vector3(x, springY, wallZ - 0.028),
        new THREE.Vector3(
          x + Math.cos(angle) * archRadius,
          springY + Math.sin(angle) * archRadius,
          wallZ - 0.028,
        ),
        0.011,
        barMaterial,
      );
    });
  }

  function addClayRange(
    parent,
    {
      name,
      x,
      z,
      width,
      depth,
      wallHeight,
      roofHeight,
      wallMaterial,
      roofMaterial,
      roofTrimMaterial,
    },
  ) {
    const range = new THREE.Group();
    range.name = name;
    range.position.set(x, 0, z);

    const foundation = new THREE.Mesh(
      roundedBox(width + 0.08, 0.12, depth + 0.08, 0.022),
      roofTrimMaterial,
    );
    foundation.position.y = 0.06;
    range.add(foundation);

    const walls = new THREE.Mesh(
      roundedBox(width, wallHeight, depth, 0.035),
      wallMaterial,
    );
    walls.position.y = wallHeight * 0.5 + 0.1;
    range.add(walls);

    const alongZ = depth > width;
    const roofWidth = (alongZ ? depth : width) + 0.42;
    const roofDepth = (alongZ ? width : depth) + 0.42;
    const roof = new THREE.Mesh(
      createHippedRoofGeometry(
        roofWidth,
        roofDepth,
        roofHeight,
        Math.min(roofDepth * 0.48, roofWidth * 0.42),
      ),
      roofMaterial,
    );
    roof.position.y = wallHeight + 0.1;
    if (alongZ) roof.rotation.y = Math.PI * 0.5;
    range.add(roof);

    const eave = new THREE.Mesh(
      roundedBox(width + 0.31, 0.055, depth + 0.31, 0.012),
      roofTrimMaterial,
    );
    eave.position.y = wallHeight + 0.1;
    range.add(eave);

    const ridge = new THREE.Mesh(
      alongZ
        ? roundedBox(0.06, 0.055, Math.max(0.35, depth - width * 0.72), 0.01)
        : roundedBox(Math.max(0.35, width - depth * 0.72), 0.055, 0.06, 0.01),
      roofTrimMaterial,
    );
    ridge.position.y = wallHeight + roofHeight + 0.13;
    range.add(ridge);

    mergeDirectMeshesByMaterial(range);
    parent.add(range);
    return range;
  }

  function addAlunAlunLapas(group) {
    const lapas = new THREE.Group();
    lapas.name =
      "Rutan Kelas IIB Situbondo · Google Street View 360 and satellite survey";
    lapas.position.set(
      ALUN_ALUN_LAPAS_PLACEMENT.north,
      0.05,
      ALUN_ALUN_LAPAS_PLACEMENT.east,
    );
    lapas.rotation.y = ALUN_ALUN_LAPAS_PLACEMENT.yaw;

    const warmGray = toonMaterial({ color: 0xc7c4b9 });
    const paleGray = toonMaterial({ color: 0xe2e1d8 });
    const upperGray = toonMaterial({ color: 0xcfd1cb });
    const concrete = toonMaterial({ color: 0x9d9f99 });
    const darkConcrete = toonMaterial({ color: 0x4a504d });
    const roofGray = toonMaterial({ color: 0x525955 });
    const roofGrayDark = toonMaterial({ color: 0x343a38 });
    const clayTile = toonMaterial({ color: 0x9a5542 });
    const clayTileLight = toonMaterial({ color: 0xaa654d });
    const clayTrim = toonMaterial({ color: 0x713d34 });
    const weatheredTile = toonMaterial({ color: 0x765047 });
    const yellowWall = toonMaterial({ color: 0xd6b767 });
    const peachPier = toonMaterial({ color: 0xd2a275 });
    const green = toonMaterial({ color: 0x18724f });
    const darkGreen = toonMaterial({ color: 0x115039 });
    const blue = toonMaterial({ color: 0x315c82 });
    const red = toonMaterial({ color: 0xb24d40 });
    const orange = toonMaterial({ color: 0xd56d35 });
    const gold = toonMaterial({ color: 0xc79a3b });
    const signBrown = toonMaterial({ color: 0x312b25 });
    const black = toonMaterial({ color: 0x242927 });
    const glass = toonMaterial({
      color: 0x263c3b,
      emissive: 0x11201f,
      emissiveIntensity: 0.16,
    });
    const signBlue = toonMaterial({ color: 0x174c83 });
    const wireMaterial = hideMaterialOutline(toonMaterial({ color: 0x5b6461 }));

    // The west-road frontage is the recognisable two-storey RUTAN elevation
    // in the adjacent official spheres. Its roof ridge follows the long
    // north-south edge of the mapped quadrilateral.
    const administration = new THREE.Group();
    administration.name = "Two-storey west administration frontage";
    administration.position.set(-0.25, 0, -4.85);

    const adminFoundation = new THREE.Mesh(
      roundedBox(10.1, 0.14, 3.14, 0.028),
      darkConcrete,
    );
    adminFoundation.position.y = 0.07;
    administration.add(adminFoundation);

    const adminGround = new THREE.Mesh(
      roundedBox(9.55, 0.72, 2.7, 0.035),
      warmGray,
    );
    adminGround.position.y = 0.46;
    administration.add(adminGround);

    const adminUpper = new THREE.Mesh(
      roundedBox(9.55, 0.93, 2.58, 0.032),
      upperGray,
    );
    adminUpper.position.y = 1.24;
    administration.add(adminUpper);

    [0.76, 1.16, 1.63].forEach((y, index) => {
      const band = new THREE.Mesh(
        roundedBox(9.62, index === 1 ? 0.035 : 0.055, 0.055, 0.01),
        index === 1 ? concrete : darkConcrete,
      );
      band.position.set(0, y, -1.39);
      administration.add(band);
    });

    const longRoof = new THREE.Mesh(
      createGableRoofGeometry(3.36, 10.16, 0.55),
      roofGray,
    );
    longRoof.position.set(0, 1.7, 0.03);
    longRoof.rotation.y = Math.PI * 0.5;
    administration.add(longRoof);
    const longRoofRidge = new THREE.Mesh(
      roundedBox(10.22, 0.065, 0.065, 0.012),
      roofGrayDark,
    );
    longRoofRidge.position.set(0, 2.27, 0.03);
    administration.add(longRoofRidge);
    [-1.66, 1.72].forEach((z) => {
      const fascia = new THREE.Mesh(
        roundedBox(10.18, 0.07, 0.065, 0.012),
        roofGrayDark,
      );
      fascia.position.set(0, 1.7, z);
      administration.add(fascia);
    });

    const verandaRoof = new THREE.Mesh(
      createHippedRoofGeometry(9.92, 1.52, 0.28, 0.62),
      weatheredTile,
    );
    verandaRoof.position.set(0, 0.79, -1.18);
    administration.add(verandaRoof);
    const verandaEave = new THREE.Mesh(
      roundedBox(9.98, 0.055, 1.56, 0.012),
      clayTrim,
    );
    verandaEave.position.set(0, 0.79, -1.18);
    administration.add(verandaEave);
    [-4.42, -3.18, -1.96, 1.73, 3.08, 4.42].forEach((x) => {
      const post = new THREE.Mesh(
        roundedBox(0.075, 0.69, 0.075, 0.012),
        darkConcrete,
      );
      post.position.set(x, 0.36, -1.8);
      administration.add(post);
    });

    // Four arched upper openings on each side of the entrance, not three.
    [-4.2, -3.26, -2.32, -1.38, 1.38, 2.32, 3.26, 4.2].forEach((x) => {
      addWestArchedWindow(administration, x, {
        wallZ: -1.382,
        baseY: 0.98,
        frameMaterial: paleGray,
        glassMaterial: glass,
        barMaterial: paleGray,
      });
    });

    [-3.77, -2.62, -1.5, 1.32, 2.48, 3.64].forEach((x, index) => {
      const lowerWindow = new THREE.Mesh(
        roundedBox(0.74, 0.43, 0.045, 0.012),
        index === 2 || index === 3 ? black : glass,
      );
      lowerWindow.position.set(x, 0.41, -1.387);
      administration.add(lowerWindow);
      for (let barIndex = -1; barIndex <= 1; barIndex += 1) {
        const bar = new THREE.Mesh(
          roundedBox(0.024, 0.4, 0.024, 0.004),
          paleGray,
        );
        bar.position.set(x + barIndex * 0.2, 0.41, -1.42);
        administration.add(bar);
      }
    });

    const centralGableRoof = new THREE.Mesh(
      createGableRoofGeometry(2.32, 3.18, 0.67),
      roofGray,
    );
    centralGableRoof.position.set(0.02, 1.69, 0.03);
    administration.add(centralGableRoof);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-1.14, 0);
    gableShape.lineTo(1.14, 0);
    gableShape.lineTo(0, 0.67);
    gableShape.closePath();
    const centralGable = new THREE.Mesh(
      new THREE.ShapeGeometry(gableShape),
      upperGray,
    );
    centralGable.position.set(0.02, 1.69, -1.59);
    centralGable.rotation.y = Math.PI;
    administration.add(centralGable);
    // Frame only the sloping edges. A solid triangular roof wedge here would
    // cover the pale gable face, vent, and part of the crest from the road.
    [-1, 1].forEach((side) => {
      const slopeLength = Math.hypot(1.22, 0.72);
      const trim = new THREE.Mesh(
        roundedBox(slopeLength, 0.065, 0.09, 0.012),
        concrete,
      );
      trim.position.set(0.02 + side * 0.61, 2.04, -1.64);
      trim.rotation.z = -side * Math.atan2(0.72, 1.22);
      administration.add(trim);
    });

    // Small triangular louver above the institutional crest, inset in the
    // central gable rather than a projecting roof ornament.
    const ventShape = new THREE.Shape();
    ventShape.moveTo(-0.28, 0);
    ventShape.lineTo(0.28, 0);
    ventShape.lineTo(0, 0.16);
    ventShape.closePath();
    const gableVent = new THREE.Mesh(
      new THREE.ShapeGeometry(ventShape),
      roofGrayDark,
    );
    gableVent.position.set(0.02, 2.13, -1.603);
    gableVent.rotation.y = Math.PI;
    administration.add(gableVent);
    [0.025, 0.065, 0.105].forEach((height) => {
      const louver = new THREE.Mesh(
        roundedBox(0.56 * (1 - height / 0.16), 0.013, 0.014, 0.003),
        concrete,
      );
      louver.position.set(0.02, 2.13 + height, -1.612);
      administration.add(louver);
    });

    const crestRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.045, 24),
      gold,
    );
    // The small seal sits below the vent, separated from both its louvers
    // and the RUTAN lettering. The former oversized ring overlapped the vent.
    crestRing.position.set(0.02, 1.86, -1.64);
    crestRing.rotation.x = Math.PI * 0.5;
    administration.add(crestRing);
    const crestCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.052, 24),
      black,
    );
    crestCore.position.set(0.02, 1.86, -1.667);
    crestCore.rotation.x = Math.PI * 0.5;
    administration.add(crestCore);
    const crestMark = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.09, 5),
      gold,
    );
    crestMark.position.set(0.02, 1.86, -1.705);
    crestMark.rotation.x = Math.PI * 0.5;
    administration.add(crestMark);

    addWestLabel(
      administration,
      "RUTAN",
      1.36,
      0.34,
      0.02,
      1.52,
      -1.642,
      "#d7a43f",
      900,
      { strokeColor: "rgba(39,43,41,.82)", strokeScale: 0.045 },
    );
    addWestLabel(
      administration,
      "SITUBONDO",
      1.18,
      0.2,
      0.02,
      1.31,
      -1.644,
      "#eeece1",
      900,
      { strokeColor: "rgba(39,43,41,.76)", strokeScale: 0.04 },
    );

    const entryDoor = new THREE.Mesh(
      roundedBox(1.04, 0.69, 0.065, 0.012),
      glass,
    );
    entryDoor.position.set(0.03, 0.43, -1.405);
    administration.add(entryDoor);
    const doorMullion = new THREE.Mesh(
      roundedBox(0.035, 0.66, 0.035, 0.006),
      paleGray,
    );
    doorMullion.position.set(0.03, 0.43, -1.45);
    administration.add(doorMullion);
    const entryCanopy = new THREE.Mesh(
      createHippedRoofGeometry(1.72, 0.75, 0.22, 0.3),
      roofGrayDark,
    );
    entryCanopy.position.set(0.03, 0.81, -1.45);
    administration.add(entryCanopy);

    administration.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    lapas.add(administration);

    // The north-corner sphere shows this older one-storey clay-tile range in
    // front of the taller secure blocks. It is deliberately separate from the
    // grey two-storey west administration wing.
    const northRange = new THREE.Group();
    northRange.name = "North clay-tile corner administration range";
    const northBody = new THREE.Mesh(
      roundedBox(2.38, 0.72, 8.28, 0.035),
      warmGray,
    );
    northBody.position.set(4.65, 0.46, -0.2);
    northRange.add(northBody);
    const northRoof = new THREE.Mesh(
      createGableRoofGeometry(3.12, 8.84, 0.54),
      clayTile,
    );
    northRoof.position.set(4.65, 0.82, -0.2);
    northRange.add(northRoof);
    const northEave = new THREE.Mesh(
      roundedBox(3.16, 0.06, 8.9, 0.013),
      clayTrim,
    );
    northEave.position.set(4.65, 0.82, -0.2);
    northRange.add(northEave);
    const northRidge = new THREE.Mesh(
      roundedBox(0.06, 0.06, 8.9, 0.012),
      clayTrim,
    );
    northRidge.position.set(4.65, 1.39, -0.2);
    northRange.add(northRidge);
    [-3.45, -2.34, -1.23, -0.12, 0.99, 2.1].forEach((z, index) => {
      const shutterFrame = new THREE.Mesh(
        roundedBox(0.045, 0.54, 0.78, 0.012),
        index % 3 === 1 ? blue : paleGray,
      );
      shutterFrame.position.set(5.86, 0.47, z);
      northRange.add(shutterFrame);
      const shutter = new THREE.Mesh(
        roundedBox(0.035, 0.46, 0.66, 0.009),
        index % 2 === 0 ? concrete : warmGray,
      );
      shutter.position.set(5.89, 0.47, z);
      northRange.add(shutter);
    });
    northRange.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    lapas.add(northRange);

    const northEntrance = new THREE.Group();
    northEntrance.name = "North RUTAN guard and service entrance";
    const guardBody = new THREE.Mesh(
      roundedBox(2.5, 0.82, 3.18, 0.04),
      yellowWall,
    );
    guardBody.position.set(4.72, 0.49, 4.37);
    northEntrance.add(guardBody);
    const guardRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.0, 3.72, 0.49, 0.72),
      clayTileLight,
    );
    guardRoof.position.set(4.72, 0.9, 4.37);
    northEntrance.add(guardRoof);
    const guardEave = new THREE.Mesh(
      roundedBox(2.78, 0.06, 3.48, 0.012),
      clayTrim,
    );
    guardEave.position.set(4.72, 0.9, 4.37);
    northEntrance.add(guardEave);
    const northDoor = new THREE.Mesh(
      roundedBox(0.055, 0.68, 0.72, 0.012),
      darkGreen,
    );
    northDoor.position.set(5.99, 0.42, 4.05);
    northEntrance.add(northDoor);
    const serviceWindow = new THREE.Mesh(
      roundedBox(0.055, 0.42, 0.86, 0.012),
      glass,
    );
    serviceWindow.position.set(5.99, 0.49, 5.07);
    northEntrance.add(serviceWindow);
    const banner = new THREE.Mesh(
      roundedBox(0.07, 0.33, 2.65, 0.015),
      orange,
    );
    banner.position.set(6.01, 0.82, 4.33);
    northEntrance.add(banner);
    addNorthLabel(
      northEntrance,
      "RUTAN SITUBONDO",
      2.3,
      0.22,
      6.052,
      0.82,
      4.33,
      "#f2e9d5",
      900,
      { strokeColor: "rgba(86,54,32,.72)", strokeScale: 0.035 },
    );
    northEntrance.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    lapas.add(northEntrance);

    // Satellite coverage resolves the red-tile secure mass behind the two
    // public elevations: a south range, east range and broad inner block leave
    // the narrow exercise/service court visible from above instead of filling
    // the whole OSM polygon with one extrusion.
    addClayRange(lapas, {
      name: "South secure clay-tile range",
      x: -4.63,
      z: 0.15,
      width: 2.32,
      depth: 9.75,
      wallHeight: 0.76,
      roofHeight: 0.56,
      wallMaterial: paleGray,
      roofMaterial: clayTileLight,
      roofTrimMaterial: clayTrim,
    });
    addClayRange(lapas, {
      name: "East secure clay-tile range",
      x: -0.12,
      z: 4.82,
      width: 8.18,
      depth: 2.34,
      wallHeight: 0.78,
      roofHeight: 0.55,
      wallMaterial: warmGray,
      roofMaterial: clayTile,
      roofTrimMaterial: clayTrim,
    });
    addClayRange(lapas, {
      name: "Inner west detention range",
      x: -0.25,
      z: -1.37,
      width: 6.15,
      depth: 3.82,
      wallHeight: 0.82,
      roofHeight: 0.62,
      wallMaterial: upperGray,
      roofMaterial: clayTileLight,
      roofTrimMaterial: clayTrim,
    });

    const exerciseCourt = new THREE.Mesh(
      roundedBox(5.18, 0.045, 2.72, 0.03),
      toonMaterial({ color: 0x587e65 }),
    );
    exerciseCourt.name = "Satellite-visible inner exercise court";
    exerciseCourt.position.set(-0.13, 0.08, 2.35);
    exerciseCourt.receiveShadow = true;
    lapas.add(exerciseCourt);
    const courtCenterLine = new THREE.Mesh(
      roundedBox(4.52, 0.009, 0.025, 0.003),
      paleGray,
    );
    courtCenterLine.position.set(-0.13, 0.107, 2.35);
    lapas.add(courtCenterLine);
    const courtCircle = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.018, 5, 24),
      paleGray,
    );
    courtCircle.position.set(-0.13, 0.112, 2.35);
    courtCircle.rotation.x = Math.PI * 0.5;
    lapas.add(courtCircle);

    // Public west frontage: green steel rails, red/white masonry piers and the
    // permanent black-and-gold institutional board seen between the gates.
    const westFence = new THREE.Group();
    westFence.name = "West green frontage fence and gates";
    const addWestFencePanel = (centerX, width, gate = false) => {
      if (!gate) {
        const base = new THREE.Mesh(
          roundedBox(width, 0.22, 0.15, 0.018),
          paleGray,
        );
        base.position.set(centerX, 0.13, -6.48);
        westFence.add(base);
      }
      for (
        let x = centerX - width * 0.5 + 0.08;
        x <= centerX + width * 0.5 - 0.08;
        x += 0.16
      ) {
        const rail = new THREE.Mesh(
          roundedBox(0.028, gate ? 0.61 : 0.47, 0.032, 0.005),
          green,
        );
        rail.position.set(x, gate ? 0.37 : 0.43, -6.58);
        westFence.add(rail);
      }
      [gate ? 0.18 : 0.3, gate ? 0.62 : 0.58].forEach((y) => {
        const crossRail = new THREE.Mesh(
          roundedBox(width, 0.035, 0.038, 0.006),
          darkGreen,
        );
        crossRail.position.set(centerX, y, -6.59);
        westFence.add(crossRail);
      });
    };
    addWestFencePanel(-4.38, 2.15, true);
    addWestFencePanel(-2.51, 1.17);
    addWestFencePanel(1.83, 1.64);
    addWestFencePanel(4.17, 2.32, true);
    [-5.56, -3.25, -1.82, 1.0, 2.74, 5.43].forEach((x, index) => {
      const pier = new THREE.Mesh(
        roundedBox(0.25, 0.64, 0.25, 0.026),
        index % 2 === 0 ? paleGray : red,
      );
      pier.position.set(x, 0.33, -6.52);
      westFence.add(pier);
      const cap = new THREE.Mesh(
        roundedBox(0.31, 0.08, 0.31, 0.018),
        paleGray,
      );
      cap.position.set(x, 0.69, -6.52);
      westFence.add(cap);
    });
    mergeDirectMeshesByMaterial(westFence);
    lapas.add(westFence);

    const monument = new THREE.Group();
    monument.name = "RUTAN institutional monument board";
    monument.position.set(-0.18, 0, -6.7);
    const monumentPlinth = new THREE.Mesh(
      roundedBox(3.08, 0.18, 0.58, 0.035),
      concrete,
    );
    monumentPlinth.position.y = 0.09;
    monument.add(monumentPlinth);
    const monumentPanel = new THREE.Mesh(
      roundedBox(2.8, 0.79, 0.17, 0.022),
      signBrown,
    );
    monumentPanel.position.y = 0.59;
    monument.add(monumentPanel);
    [-1.46, 1.46].forEach((x) => {
      const pillar = new THREE.Mesh(
        roundedBox(0.22, 0.92, 0.31, 0.024),
        paleGray,
      );
      pillar.position.set(x, 0.48, 0.02);
      monument.add(pillar);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.15, 4),
        darkConcrete,
      );
      cap.position.set(x, 1.01, 0.02);
      cap.rotation.y = Math.PI * 0.25;
      monument.add(cap);
    });
    addWestLabel(
      monument,
      "KEMENTERIAN HUKUM DAN HAM",
      2.46,
      0.14,
      0,
      0.79,
      -0.098,
      "#d8b359",
      820,
      { strokeScale: 0, canvasWidth: 1800, maxFontSize: 118 },
    );
    addWestLabel(
      monument,
      "RUMAH TAHANAN NEGARA",
      2.48,
      0.19,
      0,
      0.58,
      -0.1,
      "#d8b359",
      900,
      { strokeScale: 0, canvasWidth: 1800, maxFontSize: 140 },
    );
    addWestLabel(
      monument,
      "KELAS IIB SITUBONDO",
      2.42,
      0.18,
      0,
      0.38,
      -0.102,
      "#d8b359",
      900,
      { strokeScale: 0, canvasWidth: 1800, maxFontSize: 140 },
    );
    lapas.add(monument);

    // The north side uses the older cream/peach masonry and grey bars visible
    // in the requested corner panorama, rather than copying the green west
    // frontage around the corner.
    const northFence = new THREE.Group();
    northFence.name = "North cream masonry and grey railing";
    const addNorthFencePanel = (centerZ, width) => {
      const base = new THREE.Mesh(
        roundedBox(0.15, 0.24, width, 0.018),
        paleGray,
      );
      base.position.set(6.0, 0.14, centerZ);
      northFence.add(base);
      for (
        let z = centerZ - width * 0.5 + 0.08;
        z <= centerZ + width * 0.5 - 0.08;
        z += 0.17
      ) {
        const rail = new THREE.Mesh(
          roundedBox(0.032, 0.46, 0.026, 0.005),
          wireMaterial,
        );
        rail.position.set(6.08, 0.43, z);
        northFence.add(rail);
      }
      [0.3, 0.58].forEach((y) => {
        const crossRail = new THREE.Mesh(
          roundedBox(0.038, 0.033, width, 0.006),
          wireMaterial,
        );
        crossRail.position.set(6.09, y, centerZ);
        northFence.add(crossRail);
      });
    };
    addNorthFencePanel(-4.85, 2.55);
    addNorthFencePanel(-1.6, 2.68);
    addNorthFencePanel(1.15, 1.92);
    [
      [-6.05, peachPier],
      [-3.5, peachPier],
      [-0.12, blue],
      [2.25, peachPier],
    ].forEach(([z, material]) => {
      const pier = new THREE.Mesh(
        roundedBox(0.29, 0.68, 0.29, 0.026),
        material,
      );
      pier.position.set(6.0, 0.35, z);
      northFence.add(pier);
      const cap = new THREE.Mesh(
        roundedBox(0.35, 0.08, 0.35, 0.018),
        paleGray,
      );
      cap.position.set(6.0, 0.73, z);
      northFence.add(cap);
    });
    mergeDirectMeshesByMaterial(northFence);
    lapas.add(northFence);

    // The non-public south and east edges remain secure, tall masonry. Keeping
    // these walls architectural is important when the player rounds the block;
    // no road, tree, traffic or pavement geometry is introduced here.
    const secureBoundary = new THREE.Group();
    secureBoundary.name = "South and east secure compound walls";
    const southWall = new THREE.Mesh(
      roundedBox(0.17, 1.02, 12.72, 0.026),
      paleGray,
    );
    southWall.position.set(-5.98, 0.53, 0);
    secureBoundary.add(southWall);
    const southCap = new THREE.Mesh(
      roundedBox(0.22, 0.07, 12.78, 0.012),
      darkConcrete,
    );
    southCap.position.set(-5.98, 1.07, 0);
    secureBoundary.add(southCap);
    const eastWall = new THREE.Mesh(
      roundedBox(11.96, 1.02, 0.17, 0.026),
      paleGray,
    );
    eastWall.position.set(-0.02, 0.53, 6.48);
    secureBoundary.add(eastWall);
    const eastCap = new THREE.Mesh(
      roundedBox(12.02, 0.07, 0.22, 0.012),
      darkConcrete,
    );
    eastCap.position.set(-0.02, 1.07, 6.48);
    secureBoundary.add(eastCap);
    [-4.5, -1.5, 1.5, 4.5].forEach((z) => {
      const pier = new THREE.Mesh(
        roundedBox(0.27, 1.14, 0.27, 0.026),
        concrete,
      );
      pier.position.set(-5.98, 0.58, z);
      secureBoundary.add(pier);
    });
    [-4.5, -1.5, 1.5, 4.5].forEach((x) => {
      const pier = new THREE.Mesh(
        roundedBox(0.27, 1.14, 0.27, 0.026),
        concrete,
      );
      pier.position.set(x, 0.58, 6.48);
      secureBoundary.add(pier);
    });
    mergeDirectMeshesByMaterial(secureBoundary);
    lapas.add(secureBoundary);

    // Two restrained security strands complete the wall silhouette without
    // inventing guard towers that are absent from the surveyed roofline.
    [1.15, 1.27].forEach((y) => {
      addRod(
        lapas,
        new THREE.Vector3(-5.98, y, -6.2),
        new THREE.Vector3(-5.98, y, 6.42),
        0.012,
        wireMaterial,
      );
      addRod(
        lapas,
        new THREE.Vector3(-5.88, y, 6.48),
        new THREE.Vector3(5.88, y, 6.48),
        0.012,
        wireMaterial,
      );
    });

    const serviceBoard = new THREE.Group();
    serviceBoard.name = "North entrance service board";
    const boardPanel = new THREE.Mesh(
      roundedBox(0.08, 0.72, 1.02, 0.018),
      signBlue,
    );
    boardPanel.position.set(6.09, 0.74, 2.8);
    serviceBoard.add(boardPanel);
    addNorthLabel(
      serviceBoard,
      "PELAYANAN RUTAN",
      0.88,
      0.22,
      6.14,
      0.85,
      2.8,
      "#f3ead5",
      880,
      { strokeScale: 0, canvasWidth: 1500, maxFontSize: 120 },
    );
    addNorthLabel(
      serviceBoard,
      "SITUBONDO",
      0.78,
      0.16,
      6.142,
      0.62,
      2.8,
      "#f3ead5",
      850,
      { strokeScale: 0 },
    );
    lapas.add(serviceBoard);

    lapas.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow =
        child.userData.disableShadowCasting !== true &&
        !child.material?.transparent;
      child.receiveShadow = true;
    });
    group.add(lapas);
    return lapas;
  }

  return {
    addAlunAlunLapas,
  };
}
