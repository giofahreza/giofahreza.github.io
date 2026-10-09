import * as THREE from "three";
import {
  createGableRoofGeometry,
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import { toonMaterial } from "../../../rendering/materials.js";

// situbondo-map.json building 14. Map coordinates are stored in decimetres;
// the Alun-Alun landmark uses the project's established 1:5 scale. Local X
// follows the long north-south range and local Z crosses the street frontage.
export const ALUN_ALUN_PRAMUKA_PLACEMENT = Object.freeze({
  buildingIndex: 14,
  north: -26.92,
  east: -11.28,
  yaw: 0.17496,
});

export const ALUN_ALUN_PRAMUKA_STREET_VIEW = Object.freeze({
  panoId: "xmX33FzrGEYDJJKhw59WYA",
  heading: 210,
});

// The mapped outline is L-shaped. Two tight boxes preserve the open sliver
// beside the library instead of blocking it with one oversized rectangle.
export const ALUN_ALUN_PRAMUKA_COLLISION_OBSTACLES = Object.freeze([
  Object.freeze({
    label: "Kwarcab Pramuka main office range",
    north: -26.51,
    east: -12.11,
    width: 7.9,
    depth: 1.72,
    yaw: 0.17496,
  }),
  Object.freeze({
    label: "Kwarcab Pramuka rear east wing",
    north: -29.48,
    east: -9.69,
    width: 1.55,
    depth: 1.7,
    yaw: 0.17496,
  }),
]);

export function createAlunAlunPramukaFactory({
  helpers: {
    getSitubondoSignMaterial,
  },
}) {
  function addNorthFacingLabel(
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

  function addFrontWindow(
    parent,
    x,
    y,
    z,
    width,
    height,
    frameMaterial,
    glassMaterial,
  ) {
    const frame = new THREE.Mesh(
      roundedBox(0.055, height + 0.1, width + 0.1, 0.012),
      frameMaterial,
    );
    frame.position.set(x, y, z);
    parent.add(frame);

    const glass = new THREE.Mesh(
      roundedBox(0.033, height, width, 0.009),
      glassMaterial,
    );
    glass.position.set(x + 0.033, y, z);
    parent.add(glass);

    const mullion = new THREE.Mesh(
      roundedBox(0.025, height * 0.94, 0.025, 0.005),
      frameMaterial,
    );
    mullion.position.set(x + 0.052, y, z);
    parent.add(mullion);

    const transom = new THREE.Mesh(
      roundedBox(0.025, 0.025, width * 0.94, 0.005),
      frameMaterial,
    );
    transom.position.set(x + 0.052, y + height * 0.12, z);
    parent.add(transom);
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
      foundationMaterial,
      roofMaterial,
      roofTrimMaterial,
      windowFrameMaterial,
      windowGlassMaterial,
      frontWindows = [],
    },
  ) {
    const range = new THREE.Group();
    range.name = name;
    range.position.set(x, 0, z);

    const foundation = new THREE.Mesh(
      roundedBox(width + 0.08, 0.13, depth + 0.08, 0.024),
      foundationMaterial,
    );
    foundation.position.y = 0.065;
    range.add(foundation);

    const walls = new THREE.Mesh(
      roundedBox(width, wallHeight, depth, 0.035),
      wallMaterial,
    );
    walls.position.y = 0.13 + wallHeight * 0.5;
    range.add(walls);

    const roof = new THREE.Mesh(
      createGableRoofGeometry(depth + 0.32, width + 0.34, roofHeight),
      roofMaterial,
    );
    roof.position.y = 0.13 + wallHeight;
    roof.rotation.y = Math.PI * 0.5;
    range.add(roof);

    const eave = new THREE.Mesh(
      roundedBox(width + 0.4, 0.055, depth + 0.37, 0.014),
      roofTrimMaterial,
    );
    eave.position.y = 0.13 + wallHeight;
    range.add(eave);

    const ridge = new THREE.Mesh(
      roundedBox(width + 0.22, 0.06, 0.055, 0.01),
      roofTrimMaterial,
    );
    ridge.position.y = 0.13 + wallHeight + roofHeight + 0.018;
    range.add(ridge);

    const roofHalfDepth = (depth + 0.32) * 0.5;
    for (let courseIndex = 1; courseIndex <= 7; courseIndex += 1) {
      const progress = courseIndex / 8;
      [-1, 1].forEach((side) => {
        const course = new THREE.Mesh(
          roundedBox(width + 0.25, 0.016, 0.035, 0.005),
          roofTrimMaterial,
        );
        course.position.set(
          0,
          0.13 + wallHeight + roofHeight * (1 - progress) + 0.01,
          side * roofHalfDepth * progress,
        );
        range.add(course);
      });
    }

    frontWindows.forEach(({ z: windowZ, width: windowWidth = 0.42 }) => {
      addFrontWindow(
        range,
        width * 0.5 + 0.026,
        0.47,
        windowZ,
        windowWidth,
        0.51,
        windowFrameMaterial,
        windowGlassMaterial,
      );
    });

    mergeDirectMeshesByMaterial(range);
    parent.add(range);
    return range;
  }

  function addAlunAlunPramuka(group) {
    const pramuka = new THREE.Group();
    pramuka.name =
      "Kwartir Cabang Gerakan Pramuka Situbondo · Google Street View 360";
    pramuka.position.set(
      ALUN_ALUN_PRAMUKA_PLACEMENT.north,
      0.05,
      ALUN_ALUN_PRAMUKA_PLACEMENT.east,
    );
    pramuka.rotation.y = ALUN_ALUN_PRAMUKA_PLACEMENT.yaw;

    const warmWhite = toonMaterial({ color: 0xe6e2d9 });
    const brightWhite = toonMaterial({ color: 0xf1eee5 });
    const weatheredWhite = toonMaterial({ color: 0xd2d2cb });
    const paleMint = toonMaterial({ color: 0xb8c9bd });
    const mint = toonMaterial({ color: 0x7aa795 });
    const deepMint = toonMaterial({ color: 0x3e7468 });
    const clayTile = toonMaterial({ color: 0x98513f });
    const clayTileLight = toonMaterial({ color: 0xad6048 });
    const clayTrim = toonMaterial({ color: 0x6e3a32 });
    const foundation = toonMaterial({ color: 0x555b58 });
    const brown = toonMaterial({ color: 0x68483a });
    const glass = toonMaterial({ color: 0x314b4a });

    // Heading 210° shows this narrow compound between the library and the
    // neighbouring residence: plain pale walls and red clay roofs. The ornate
    // grey-roofed porch at 270° belongs to that residence, not this footprint.
    addClayRange(pramuka, {
      name: "Pramuka plain red-tile front range",
      x: 3.38,
      z: -1.0,
      width: 2.08,
      depth: 1.38,
      wallHeight: 0.83,
      roofHeight: 0.42,
      wallMaterial: weatheredWhite,
      foundationMaterial: foundation,
      roofMaterial: clayTile,
      roofTrimMaterial: clayTrim,
      windowFrameMaterial: warmWhite,
      windowGlassMaterial: glass,
    });

    addClayRange(pramuka, {
      name: "Pramuka central low red-tile office range",
      x: 0.62,
      z: -0.74,
      width: 3.72,
      depth: 1.5,
      wallHeight: 0.71,
      roofHeight: 0.37,
      wallMaterial: paleMint,
      foundationMaterial: foundation,
      roofMaterial: clayTile,
      roofTrimMaterial: clayTrim,
      windowFrameMaterial: warmWhite,
      windowGlassMaterial: glass,
      frontWindows: [
        { z: -0.42, width: 0.4 },
        { z: 0.25, width: 0.4 },
      ],
    });

    addClayRange(pramuka, {
      name: "Pramuka rear low red-tile range",
      x: -2.3,
      z: -0.7,
      width: 2.28,
      depth: 1.58,
      wallHeight: 0.68,
      roofHeight: 0.35,
      wallMaterial: warmWhite,
      foundationMaterial: foundation,
      roofMaterial: clayTileLight,
      roofTrimMaterial: clayTrim,
      windowFrameMaterial: brown,
      windowGlassMaterial: glass,
      frontWindows: [{ z: -0.35, width: 0.45 }],
    });

    const eastWing = new THREE.Group();
    eastWing.name = "Pramuka mapped rear east hipped wing";
    eastWing.position.set(-2.8, 0, 1.08);
    const eastWingBase = new THREE.Mesh(
      roundedBox(1.6, 0.13, 1.74, 0.026),
      foundation,
    );
    eastWingBase.position.y = 0.065;
    eastWing.add(eastWingBase);
    const eastWingWalls = new THREE.Mesh(
      roundedBox(1.5, 0.68, 1.64, 0.036),
      paleMint,
    );
    eastWingWalls.position.y = 0.47;
    eastWing.add(eastWingWalls);
    const eastWingRoof = new THREE.Mesh(
      createHippedRoofGeometry(1.92, 2.06, 0.39, 0.57),
      clayTile,
    );
    eastWingRoof.position.y = 0.82;
    eastWing.add(eastWingRoof);
    const eastWingEave = new THREE.Mesh(
      roundedBox(1.84, 0.055, 1.98, 0.014),
      clayTrim,
    );
    eastWingEave.position.y = 0.82;
    eastWing.add(eastWingEave);
    mergeDirectMeshesByMaterial(eastWing);
    pramuka.add(eastWing);

    // The white-purple ornate fence and warning boards visible to the right
    // at 240° belong to the neighbouring residence (OSM 84). Its model owns
    // that frontage; only this compound's pale-green entrance stays here.
    const sharedGatePost = new THREE.Group();
    sharedGatePost.name = "Pramuka east gate address pier";
    sharedGatePost.position.set(4.92, 0, -0.54);
    const gatePostBase = new THREE.Mesh(
      roundedBox(0.27, 0.14, 0.27, 0.024),
      foundation,
    );
    gatePostBase.position.y = 0.07;
    sharedGatePost.add(gatePostBase);
    const gatePost = new THREE.Mesh(
      roundedBox(0.21, 0.67, 0.21, 0.022),
      brightWhite,
    );
    gatePost.position.y = 0.44;
    sharedGatePost.add(gatePost);
    const gatePostStripe = new THREE.Mesh(
      roundedBox(0.225, 0.07, 0.225, 0.012),
      clayTile,
    );
    gatePostStripe.position.y = 0.18;
    sharedGatePost.add(gatePostStripe);
    const gatePostCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 0.16, 4),
      brightWhite,
    );
    gatePostCap.position.y = 0.86;
    gatePostCap.rotation.y = Math.PI * 0.25;
    sharedGatePost.add(gatePostCap);
    addNorthFacingLabel(
      sharedGatePost,
      "17 08 24",
      0.15,
      0.34,
      0.116,
      0.49,
      0,
      "#a1423b",
      900,
      { strokeScale: 0, canvasWidth: 520, canvasHeight: 850, maxFontSize: 110 },
    );
    mergeDirectMeshesByMaterial(sharedGatePost);
    pramuka.add(sharedGatePost);

    const entryGate = new THREE.Group();
    entryGate.name = "Pramuka pale-green east entry gate";
    entryGate.position.set(4.92, 0, -0.25);
    [0.18, 0.55].forEach((height) => {
      const gateRail = new THREE.Mesh(
        roundedBox(0.055, 0.04, 0.38, 0.009),
        deepMint,
      );
      gateRail.position.y = height;
      entryGate.add(gateRail);
    });
    for (let offset = -0.17; offset <= 0.17; offset += 0.085) {
      const gatePicket = new THREE.Mesh(
        roundedBox(0.04, 0.53, 0.035, 0.007),
        mint,
      );
      gatePicket.position.set(0, 0.34, offset);
      entryGate.add(gatePicket);
    }
    mergeDirectMeshesByMaterial(entryGate);
    pramuka.add(entryGate);

    pramuka.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    group.add(pramuka);
    return pramuka;
  }

  return {
    addAlunAlunPramuka,
  };
}
