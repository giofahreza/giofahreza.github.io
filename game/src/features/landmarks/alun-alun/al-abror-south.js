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
import {
  ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION,
  ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER,
} from "./traffic.js";

// Follow the existing property side of the public pavement, not the old
// east=-14.73 draft frontage (which crossed the widened carriageway). The
// 2023 road spheres show this fence behind the pavement throughout the run.
const [frontageNorth, frontageSouth] = ALUN_ALUN_WEST_PROPERTY_SIDEWALK_OUTER;
const frontageSlope = (frontageSouth[1] - frontageNorth[1]) /
  (frontageSouth[0] - frontageNorth[0]);
const frontageYaw = Math.atan(-frontageSlope);
const frontageEastAt = (north) => frontageNorth[1] +
  (north - frontageNorth[0]) * frontageSlope - 0.12;

// The west-side compound immediately south of Masjid Agung Al-Abror is a
// continuous part of the square's streetscape. The map snapshot represents it
// as six generic two-storey boxes, while the 2023 road sequence shows three
// low, individually recognisable ranges and their rear service roofs.
// Coordinates are north/east in the Alun-Alun model's established 1:5 scale.
export const AL_ABROR_SOUTH_BUILDING_INDEXES = Object.freeze([
  84,
  90,
  98,
  104,
  105,
  121,
]);

export const AL_ABROR_SOUTH_STREET_VIEW = Object.freeze({
  mainPanoId: "xmX33FzrGEYDJJKhw59WYA",
  mainHeading: 270,
  mainDate: "2023-08",
  northPanoId: "SkWE6Saif9zE8EQES2B_ow",
  northHeading: 270,
  middlePanoId: "WyqFlPVrMhuz_-Tt_10Pzg",
  middleHeading: 270,
  residencePanoId: "tEAG1CqbUigI685lORpXlA",
  residenceHeading: 265,
  southPanoId: "Rsuu1FY7kB-O-rpgeV9p6Q",
  southHeading: 270,
  rearPanoId: "PnbPCGVejxbfQVB2PVsRLA",
  rearHeading: 80,
});

function createGablePanelGeometry(width, height) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(width * 0.5, 0);
  shape.lineTo(0, height);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createSteppedOpeningGeometry(width, height) {
  const halfWidth = width * 0.5;
  const shoulder = Math.min(width * 0.18, height * 0.17);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, height - shoulder * 2);
  shape.lineTo(-halfWidth + shoulder, height - shoulder * 2);
  shape.lineTo(-halfWidth + shoulder, height - shoulder);
  shape.lineTo(-halfWidth + shoulder * 2, height - shoulder);
  shape.lineTo(-halfWidth + shoulder * 2, height);
  shape.lineTo(halfWidth - shoulder * 2, height);
  shape.lineTo(halfWidth - shoulder * 2, height - shoulder);
  shape.lineTo(halfWidth - shoulder, height - shoulder);
  shape.lineTo(halfWidth - shoulder, height - shoulder * 2);
  shape.lineTo(halfWidth, height - shoulder * 2);
  shape.lineTo(halfWidth, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function createAlAbrorSouthFactory({
  helpers: {
    getSitubondoSignMaterial,
  },
}) {
  function addEastWindow(
    parent,
    x,
    y,
    z,
    width,
    height,
    frameMaterial,
    glassMaterial,
    mullionMaterial = frameMaterial,
  ) {
    const frame = new THREE.Mesh(
      roundedBox(width + 0.1, height + 0.1, 0.055, 0.01),
      frameMaterial,
    );
    frame.position.set(x, y, z);
    parent.add(frame);

    const glass = new THREE.Mesh(
      roundedBox(width, height, 0.035, 0.008),
      glassMaterial,
    );
    glass.position.set(x, y, z + 0.034);
    parent.add(glass);

    const vertical = new THREE.Mesh(
      roundedBox(0.024, height, 0.025, 0.004),
      mullionMaterial,
    );
    vertical.position.set(x, y, z + 0.056);
    parent.add(vertical);
    const horizontal = new THREE.Mesh(
      roundedBox(width, 0.024, 0.025, 0.004),
      mullionMaterial,
    );
    horizontal.position.set(x, y, z + 0.056);
    parent.add(horizontal);
  }

  function addRoofRidge(parent, width, y, z, material) {
    const ridge = new THREE.Mesh(
      roundedBox(0.055, 0.055, width, 0.008),
      material,
    );
    ridge.position.set(0, y, z);
    parent.add(ridge);
  }

  function finishBuilding(building) {
    building.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    // The hand-authored roofs do not need texture coordinates, while
    // RoundedBoxGeometry and ShapeGeometry provide them. Normalizing the
    // direct meshes before the material merge keeps BufferGeometry attributes
    // compatible and avoids a runtime-only merge failure.
    building.children.forEach((child) => {
      if (child.isMesh) child.geometry.deleteAttribute("uv");
    });
    mergeDirectMeshesByMaterial(building);
  }

  function addCheckerDome(parent, x, baseY, z, materials) {
    const domeRoot = new THREE.Group();
    domeRoot.position.set(x, baseY, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.42, 0.14, 8),
      materials.domeGreen,
    );
    base.position.y = 0.07;
    domeRoot.add(base);
    const baseBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.425, 0.425, 0.055, 8),
      materials.paleFrame,
    );
    baseBand.position.y = 0.035;
    domeRoot.add(baseBand);

    const profile = [
      new THREE.Vector2(0.38, 0),
      new THREE.Vector2(0.4, 0.1),
      new THREE.Vector2(0.34, 0.25),
      new THREE.Vector2(0.24, 0.43),
      new THREE.Vector2(0.1, 0.59),
      new THREE.Vector2(0, 0.67),
    ];
    const domeCanvas = document.createElement("canvas");
    domeCanvas.width = 768;
    domeCanvas.height = 512;
    const domeContext = domeCanvas.getContext("2d");
    const tileColors = ["#e3e7d9", "#549b78", "#88ba70", "#e3e7d9", "#367b63", "#67a98d"];
    domeContext.fillStyle = "#549b78";
    domeContext.fillRect(0, 0, 768, 512);
    for (let row = -1; row <= 11; row += 1) {
      for (let column = -1; column <= 12; column += 1) {
        const centerX = column * 64 + (row % 2 === 0 ? 0 : 32);
        const centerY = row * 51.2;
        const colorIndex = ((column + row * 2) % tileColors.length + tileColors.length) % tileColors.length;
        domeContext.fillStyle = tileColors[colorIndex];
        domeContext.strokeStyle = "#408361";
        domeContext.lineWidth = 1.5;
        domeContext.beginPath();
        domeContext.moveTo(centerX, centerY - 51.2);
        domeContext.lineTo(centerX + 32, centerY);
        domeContext.lineTo(centerX, centerY + 51.2);
        domeContext.lineTo(centerX - 32, centerY);
        domeContext.closePath();
        domeContext.fill();
        domeContext.stroke();
      }
    }
    const domeTexture = new THREE.CanvasTexture(domeCanvas);
    domeTexture.colorSpace = THREE.SRGBColorSpace;
    domeTexture.wrapS = THREE.RepeatWrapping;
    const dome = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 32),
      toonMaterial({ color: 0xffffff, map: domeTexture }),
    );
    dome.position.y = 0.12;
    domeRoot.add(dome);

    const finial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.024, 0.27, 7),
      materials.grayDark,
    );
    finial.position.y = 0.91;
    domeRoot.add(finial);
    const finialBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      materials.warningYellow,
    );
    finialBall.position.y = 1.055;
    domeRoot.add(finialBall);
    parent.add(domeRoot);
  }

  function addNorthRange(parent, materials) {
    const building = new THREE.Group();
    building.name =
      "Lime-green domed Al-Abror south annex · OSM 90 · Street View 2023";
    building.position.set(-10.96, 0.05, -21.06);
    building.rotation.y = -0.032;

    // OSM 90 is a long, low tiled hall. Its raised eastern prayer/office bay,
    // checker dome and lime frieze are the features visible from the square.
    const hall = new THREE.Mesh(
      roundedBox(2.02, 0.61, 3.48, 0.035),
      materials.annexLime,
    );
    hall.position.y = 0.355;
    building.add(hall);
    const hallRoof = new THREE.Mesh(
      createGableRoofGeometry(2.24, 3.72, 0.32),
      materials.clayRoof,
    );
    hallRoof.position.y = 0.66;
    building.add(hallRoof);
    addRoofRidge(building, 3.64, 1.005, 0, materials.clayRoofDark);

    const frontBay = new THREE.Mesh(
      roundedBox(1.72, 0.98, 0.82, 0.025),
      materials.annexLime,
    );
    frontBay.position.set(-0.08, 0.55, 1.5);
    building.add(frontBay);
    const stoneBase = new THREE.Mesh(
      roundedBox(1.78, 0.25, 0.86, 0.015),
      materials.stone,
    );
    stoneBase.position.set(-0.08, 0.175, 1.51);
    building.add(stoneBase);
    const cap = new THREE.Mesh(
      roundedBox(1.84, 0.095, 0.92, 0.014),
      materials.annexMint,
    );
    cap.position.set(-0.08, 1.075, 1.5);
    building.add(cap);

    const windowFrame = new THREE.Mesh(
      roundedBox(1.23, 0.5, 0.075, 0.012),
      materials.frame,
    );
    windowFrame.position.set(-0.08, 0.49, 1.925);
    building.add(windowFrame);
    const windowGlass = new THREE.Mesh(
      roundedBox(1.14, 0.42, 0.045, 0.008),
      materials.glass,
    );
    windowGlass.position.set(-0.08, 0.49, 1.965);
    building.add(windowGlass);
    [-0.46, 0.3].forEach((x) => {
      const mullion = new THREE.Mesh(
        roundedBox(0.035, 0.42, 0.035, 0.005),
        materials.frame,
      );
      mullion.position.set(x, 0.49, 1.992);
      building.add(mullion);
    });

    const frieze = new THREE.Mesh(
      roundedBox(1.62, 0.25, 0.05, 0.009),
      materials.annexMint,
    );
    frieze.position.set(-0.08, 0.845, 1.935);
    building.add(frieze);
    [-0.52, -0.08, 0.36].forEach((x) => {
      const scallop = new THREE.Mesh(
        new THREE.TorusGeometry(0.195, 0.009, 5, 20, Math.PI),
        materials.paleFrame,
      );
      scallop.position.set(x, 0.94, 1.973);
      scallop.rotation.z = Math.PI;
      building.add(scallop);
      [-1, 1].forEach((slope) => {
        for (let offset = -0.24; offset <= 0.16; offset += 0.08) {
          const discriminant = 2 * 0.195 ** 2 - offset ** 2;
          if (discriminant <= 0) continue;
          let startX = (-slope * offset - Math.sqrt(discriminant)) * 0.5;
          let endX = (-slope * offset + Math.sqrt(discriminant)) * 0.5;
          if (slope > 0) endX = Math.min(endX, -offset);
          else startX = Math.max(startX, offset);
          if (endX <= startX) continue;
          const startY = slope * startX + offset;
          const endY = slope * endX + offset;
          const lattice = new THREE.Mesh(
            new THREE.BoxGeometry(0.006, Math.hypot(endX - startX, endY - startY), 0.008),
            materials.paleFrame,
          );
          lattice.position.set(x + (startX + endX) * 0.5, 0.94 + (startY + endY) * 0.5, 1.978);
          lattice.rotation.z = -Math.atan2(endX - startX, endY - startY);
          building.add(lattice);
        }
      });
    });
    addCheckerDome(building, -0.08, 1.12, 1.5, materials);

    // A light steel lean-to connects the annex toward the main mosque.
    const leanRoof = new THREE.Mesh(
      roundedBox(0.72, 0.065, 1.88, 0.009),
      materials.corrugatedGreen,
    );
    leanRoof.position.set(1.23, 0.73, 0.82);
    leanRoof.rotation.z = -0.065;
    building.add(leanRoof);
    [0.92, 1.52].forEach((x) => {
      [0.08, 1.58].forEach((z) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.023, 0.66, 6),
          materials.grayDark,
        );
        post.position.set(x, 0.38, z);
        building.add(post);
      });
    });

    // The low yellow rail and black diagonal infill sit directly in front of
    // the annex bay in the 2023 sphere.
    [-0.74, 0.38, 1.5].forEach((x) => {
      const post = new THREE.Mesh(
        roundedBox(0.045, 0.48, 0.045, 0.006),
        materials.warningYellow,
      );
      post.position.set(x, 0.28, 2.02);
      building.add(post);
    });
    [0.1, 0.41, 0.49].forEach((y) => {
      const rail = new THREE.Mesh(
        roundedBox(2.28, 0.025, 0.035, 0.004),
        materials.warningYellow,
      );
      rail.position.set(0.38, y, 2.02);
      building.add(rail);
    });
    [-1, 1].forEach((slope) => {
      for (let offset = -1.6; offset <= 2.1; offset += 0.095) {
        const startX = Math.max(-0.72, Math.min((0.115 - offset) / slope, (0.475 - offset) / slope));
        const endX = Math.min(1.48, Math.max((0.115 - offset) / slope, (0.475 - offset) / slope));
        if (endX <= startX) continue;
        const startY = slope * startX + offset;
        const endY = slope * endX + offset;
        const meshBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.009, Math.hypot(endX - startX, endY - startY), 0.009),
          materials.dark,
        );
        meshBar.position.set((startX + endX) * 0.5, (startY + endY) * 0.5, 2.045);
        meshBar.rotation.z = -Math.atan2(endX - startX, endY - startY);
        building.add(meshBar);
      }
    });

    finishBuilding(building);
    parent.add(building);
  }

  function addMiddleRange(parent, materials) {
    const {
      clayRoof,
      clayRoofDark,
      dark,
      frame,
      oldGlass,
      paleFrame,
      rustedAwning,
      warmWhite,
      weatheredWhite,
    } = materials;
    const building = new THREE.Group();
    building.name =
      "Weathered colonial-gabled veranda house · OSM 98 · Street View 2023";
    building.position.set(-15.28, 0.05, -20.98);
    building.rotation.y = 0.025;

    const body = new THREE.Mesh(
      roundedBox(2.18, 0.61, 1.98, 0.035),
      weatheredWhite,
    );
    body.position.y = 0.355;
    building.add(body);
    const dampPlinth = new THREE.Mesh(
      roundedBox(2.2, 0.17, 2.01, 0.018),
      materials.grayDark,
    );
    dampPlinth.position.y = 0.135;
    building.add(dampPlinth);
    // The street view shows a broad roof behind a left-offset attic gable,
    // not one symmetrical gable spanning the entire glazed veranda.
    const roof = new THREE.Mesh(
      createHippedRoofGeometry(2.44, 2.3, 0.4, 0.32),
      clayRoof,
    );
    roof.position.y = 0.66;
    building.add(roof);
    const mainRidge = new THREE.Mesh(
      roundedBox(1.84, 0.055, 0.055, 0.008),
      clayRoofDark,
    );
    mainRidge.position.set(0, 1.075, 0);
    building.add(mainRidge);

    const atticWall = new THREE.Mesh(
      roundedBox(0.93, 0.36, 0.09, 0.008),
      warmWhite,
    );
    atticWall.position.set(-0.59, 0.79, 1.13);
    building.add(atticWall);
    const atticRoof = new THREE.Mesh(
      createGableRoofGeometry(1.13, 0.9, 0.27),
      clayRoof,
    );
    atticRoof.position.set(-0.59, 0.97, 0.73);
    building.add(atticRoof);

    const gable = new THREE.Mesh(
      createGablePanelGeometry(0.97, 0.235),
      warmWhite,
    );
    gable.position.set(-0.59, 0.97, 1.183);
    building.add(gable);

    // WyqFlPVrMhuz_-Tt_10Pzg at 245 degrees resolves weathered vertical
    // timber boards in the attic triangle above its pale cornice. Keep the
    // insert inside the existing gable silhouette; this is not a new roof.
    const atticTimber = new THREE.Mesh(
      createGablePanelGeometry(0.85, 0.19),
      oldGlass,
    );
    atticTimber.position.set(-0.59, 0.99, 1.195);
    building.add(atticTimber);
    for (let x = -0.38; x <= 0.38; x += 0.0475) {
      const boardHeight = 0.19 * (1 - (Math.abs(x) + 0.006) / 0.425);
      const boardSeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.009, boardHeight, 0.008),
        clayRoofDark,
      );
      boardSeam.position.set(-0.59 + x, 0.99 + boardHeight * 0.5, 1.203);
      building.add(boardSeam);
    }
    [-1, 1].forEach((side) => {
      const rakeTrim = new THREE.Mesh(
        new THREE.BoxGeometry(Math.hypot(0.485, 0.235), 0.027, 0.026),
        paleFrame,
      );
      rakeTrim.position.set(-0.59 + side * 0.2425, 1.0875, 1.213);
      rakeTrim.rotation.z = -side * Math.atan2(0.235, 0.485);
      building.add(rakeTrim);
    });
    [0.66, 0.96].forEach((y) => {
      const atticTrim = new THREE.Mesh(
        roundedBox(1.01, 0.035, 0.055, 0.005),
        paleFrame,
      );
      atticTrim.position.set(-0.59, y, 1.192);
      building.add(atticTrim);
    });

    const verandaRoof = new THREE.Mesh(
      roundedBox(2.28, 0.085, 0.58, 0.012),
      rustedAwning,
    );
    verandaRoof.position.set(0, 0.65, 1.24);
    verandaRoof.rotation.x = -0.075;
    building.add(verandaRoof);
    const verandaBeam = new THREE.Mesh(
      roundedBox(2.08, 0.075, 0.07, 0.008),
      clayRoofDark,
    );
    verandaBeam.position.set(0, 0.59, 1.51);
    building.add(verandaBeam);

    // Five narrow glazed door/window leaves fill the enclosed veranda.
    [-0.82, -0.41, 0, 0.41, 0.82].forEach((x) => {
      addEastWindow(
        building,
        x,
        0.36,
        1.005,
        0.3,
        0.44,
        paleFrame,
        oldGlass,
        frame,
      );
    });
    [-1.04, -0.52, 0, 0.52, 1.04].forEach((x) => {
      const post = new THREE.Mesh(
        roundedBox(0.045, 0.58, 0.045, 0.006),
        paleFrame,
      );
      post.position.set(x, 0.34, 1.48);
      building.add(post);
    });
    const verandaFloor = new THREE.Mesh(
      roundedBox(2.15, 0.09, 0.52, 0.012),
      dark,
    );
    verandaFloor.position.set(0, 0.085, 1.25);
    building.add(verandaFloor);

    // Three-pane attic window sits in the rectangular wall below the small
    // left gable; it is not centered above the whole veranda.
    const upperFrame = new THREE.Mesh(
      roundedBox(0.52, 0.19, 0.04, 0.007),
      paleFrame,
    );
    upperFrame.position.set(-0.59, 0.8, 1.19);
    building.add(upperFrame);
    const upperGlass = new THREE.Mesh(
      roundedBox(0.46, 0.14, 0.025, 0.004),
      oldGlass,
    );
    upperGlass.position.set(-0.59, 0.8, 1.223);
    building.add(upperGlass);
    [-0.077, 0.077].forEach((x) => {
      const mullion = new THREE.Mesh(
        roundedBox(0.022, 0.14, 0.02, 0.003),
        frame,
      );
      mullion.position.set(-0.59 + x, 0.8, 1.244);
      building.add(mullion);
    });

    finishBuilding(building);
    parent.add(building);
  }

  function createOsm84FootprintGeometry(height) {
    // Exact way 323939127 outline, converted from map decimetres into the
    // Alun-Alun's north/east world units around the OSM centre.
    const footprint = [
      [1.64, -1.3],
      [1.76, 1.84],
      [0.58, 1.96],
      [0.58, 1.18],
      [-1.9, 1.36],
      [-2.08, -1.0],
      [-0.96, -1.24],
      [-0.84, -0.66],
      [0.58, -0.72],
      [0.64, -1.3],
    ];
    const shape = new THREE.Shape();
    footprint.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      curveSegments: 1,
    });
    geometry.rotateX(-Math.PI * 0.5);
    // The source footprint itself is landward of the diagonal corner
    // pavement. Only its added bevel projected six vertices onto that tread;
    // trim those decorative vertices without moving the OSM footprint.
    const [cornerStart, cornerEnd] =
      ALUN_ALUN_SOUTH_CORRIDOR_DEFINITION.sidewalkOuterBoundary;
    const cornerSlope = (cornerEnd[1] - cornerStart[1]) /
      (cornerEnd[0] - cornerStart[0]);
    const positions = geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      const north = positions.getX(index) - 18;
      if (north < cornerEnd[0] || north > cornerStart[0]) continue;
      const maxEast = cornerStart[1] +
        (north - cornerStart[0]) * cornerSlope - 0.008;
      positions.setZ(index, Math.min(positions.getZ(index), maxEast + 17.3));
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  function addSouthRange(parent, materials) {
    const {
      dark,
      frame,
      gray,
      grayRoof,
      paleFrame,
      warmWhite,
      weatheredWhite,
    } = materials;
    const building = new THREE.Group();
    building.name =
      "L-shaped official residence with scalloped porch · OSM 84";
    building.position.set(-18, 0.05, -17.3);

    const body = new THREE.Mesh(
      createOsm84FootprintGeometry(0.64),
      weatheredWhite,
    );
    building.add(body);

    // The footprint has two lobes, while the roof reads as one broad, heavily
    // weathered hip intersected by a strong east-facing gable.
    const mainRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.58, 2.96, 0.46, 0.68),
      grayRoof,
    );
    mainRoof.position.set(-0.16, 0.63, -0.04);
    mainRoof.rotation.y = 0.0375;
    building.add(mainRoof);

    const gableRoof = new THREE.Mesh(
      createGableRoofGeometry(1.16, 0.86, 0.29),
      grayRoof,
    );
    gableRoof.position.set(-0.72, 0.64, 1.47);
    gableRoof.rotation.y = 0.0375;
    building.add(gableRoof);
    const gableFace = new THREE.Mesh(
      createGablePanelGeometry(1.06, 0.25),
      gray,
    );
    gableFace.position.set(-0.72, 0.64, 1.906);
    gableFace.rotation.y = 0.0375;
    building.add(gableFace);
    const fasciaAngle = Math.atan2(0.25, 0.53);
    [-1, 1].forEach((side) => {
      const fascia = new THREE.Mesh(
        roundedBox(0.59, 0.045, 0.035, 0.005),
        paleFrame,
      );
      fascia.position.set(
        -0.72 + side * 0.265,
        0.765,
        1.93,
      );
      fascia.rotation.z = side === -1 ? fasciaAngle : -fasciaAngle;
      building.add(fascia);
    });
    const porchRecess = new THREE.Mesh(
      roundedBox(0.82, 0.36, 0.04, 0.008),
      dark,
    );
    porchRecess.position.set(-0.72, 0.34, 1.94);
    building.add(porchRecess);
    const shallowCanopy = new THREE.Mesh(
      roundedBox(1.04, 0.055, 0.36, 0.009),
      grayRoof,
    );
    shallowCanopy.position.set(-0.72, 0.595, 1.78);
    shallowCanopy.rotation.x = -0.055;
    building.add(shallowCanopy);
    [-1.13, -0.31].forEach((x) => {
      const support = new THREE.Mesh(
        roundedBox(0.055, 0.48, 0.06, 0.008),
        paleFrame,
      );
      support.position.set(x, 0.32, 1.94);
      building.add(support);
    });

    // The right-hand street lobe is a narrower pale gabled bay with one
    // stepped-corner doorway and a tall repeating breeze-block strip.
    const porchBack = new THREE.Mesh(
      roundedBox(0.84, 0.58, 0.08, 0.018),
      warmWhite,
    );
    porchBack.position.set(1.04, 0.35, 1.97);
    building.add(porchBack);
    // Shade the recess so the white scallops have a readable silhouette.
    const porchShadow = new THREE.Mesh(
      roundedBox(0.69, 0.43, 0.012, 0.008), gray,
    );
    porchShadow.position.set(1.04, 0.365, 2.017);
    building.add(porchShadow);
    const porchHeader = new THREE.Mesh(
      roundedBox(0.88, 0.14, 0.1, 0.016),
      paleFrame,
    );
    porchHeader.position.set(1.04, 0.65, 1.98);
    building.add(porchHeader);
    // Broad rounded drops beneath the porch fascia are clearly visible in
    // the residence sphere, unlike the previous straight rectangular beam.
    const scallopedFascia = new THREE.Shape();
    scallopedFascia.moveTo(-0.44, 0.08);
    scallopedFascia.lineTo(0.44, 0.08);
    scallopedFascia.lineTo(0.44, 0);
    for (let edge = 0.44; edge > -0.43; edge -= 0.22) {
      scallopedFascia.quadraticCurveTo(edge - 0.11, -0.13, edge - 0.22, 0);
    }
    scallopedFascia.closePath();
    const scallops = new THREE.Mesh(
      new THREE.ShapeGeometry(scallopedFascia),
      paleFrame,
    );
    scallops.position.set(1.04, 0.58, 2.043);
    building.add(scallops);
    const porchRoof = new THREE.Mesh(
      createGableRoofGeometry(0.98, 0.5, 0.16),
      grayRoof,
    );
    porchRoof.position.set(1.04, 0.72, 1.8);
    building.add(porchRoof);
    [0.66, 1.42].forEach((x) => {
      const column = new THREE.Mesh(
        roundedBox(0.075, 0.57, 0.08, 0.01),
        paleFrame,
      );
      column.position.set(x, 0.35, 2.03);
      building.add(column);
    });
    const steppedFrame = new THREE.Mesh(
      createSteppedOpeningGeometry(0.31, 0.35),
      paleFrame,
    );
    steppedFrame.position.set(1.01, 0.15, 2.025);
    building.add(steppedFrame);
    const steppedOpening = new THREE.Mesh(
      createSteppedOpeningGeometry(0.22, 0.28),
      materials.grayDark,
    );
    steppedOpening.position.set(1.01, 0.19, 2.045);
    building.add(steppedOpening);

    const ventPanel = new THREE.Mesh(
      roundedBox(0.11, 0.46, 0.055, 0.007),
      paleFrame,
    );
    ventPanel.position.set(1.4, 0.47, 2.025);
    building.add(ventPanel);
    for (let row = -4; row <= 4; row += 1) {
      [-1, 1].forEach((column) => {
        const ventDiamond = new THREE.Mesh(
          roundedBox(0.022, 0.022, 0.022, 0.003),
          dark,
        );
        ventDiamond.position.set(1.4 + column * 0.025, 0.47 + row * 0.045, 2.06);
        ventDiamond.rotation.z = Math.PI * 0.25;
        building.add(ventDiamond);
      });
    }
    [-1.48, 1.5].forEach((x) => {
      const corner = new THREE.Mesh(
        roundedBox(0.1, 0.68, 0.1, 0.012),
        frame,
      );
      corner.position.set(x, 0.39, 1.31);
      building.add(corner);
    });

    finishBuilding(building);
    parent.add(building);
  }

  function addRearRanges(parent, materials) {
    const {
      clayRoof,
      clayRoofDark,
      corrugatedGreen,
      darkClayRoof,
      weatheredWhite,
    } = materials;
    const definitions = [
      {
        name: "Pale-green shallow service range · OSM 104",
        position: [-17.78, -19.28],
        width: 2.64,
        depth: 1.04,
        height: 0.46,
        roof: "corrugated",
      },
      {
        name: "Compact orange-tile service pavilion · OSM 105",
        position: [-17.52, -20.62],
        width: 1,
        depth: 1.28,
        height: 0.48,
        roof: "hip",
        yaw: 0.0993,
      },
      {
        name: "Rear dark-tile range hidden by west wall · OSM 121",
        position: [-19.82, -21.24],
        width: 2.64,
        depth: 1.2,
        height: 0.5,
        roof: "dark-gable",
      },
    ];

    definitions.forEach((definition) => {
      const building = new THREE.Group();
      building.name = definition.name;
      building.position.set(
        definition.position[0],
        0.05,
        definition.position[1],
      );
      building.rotation.y = definition.yaw ?? 0;
      const body = new THREE.Mesh(
        roundedBox(
          definition.width,
          definition.height,
          definition.depth,
          0.025,
        ),
        weatheredWhite,
      );
      body.position.y = definition.height * 0.5 + 0.04;
      building.add(body);
      let roof;
      if (definition.roof === "hip") {
        roof = new THREE.Mesh(
          createHippedRoofGeometry(
            definition.width + 0.22,
            definition.depth + 0.22,
            0.28,
            0.38,
          ),
          clayRoof,
        );
      } else {
        const isCorrugated = definition.roof === "corrugated";
        roof = new THREE.Mesh(
          createGableRoofGeometry(
            definition.depth + 0.22,
            definition.width + 0.22,
            isCorrugated ? 0.11 : 0.27,
          ),
          isCorrugated ? corrugatedGreen : darkClayRoof,
        );
        roof.rotation.y = Math.PI * 0.5;
      }
      roof.position.y = definition.height + 0.04;
      building.add(roof);
      const ridge = new THREE.Mesh(
        roundedBox(definition.width, 0.045, 0.05, 0.007),
        definition.roof === "corrugated"
          ? corrugatedGreen
          : clayRoofDark,
      );
      ridge.position.y =
        definition.height +
        (definition.roof === "corrugated" ? 0.16 : 0.33);
      building.add(ridge);
      finishBuilding(building);
      parent.add(building);
    });
  }

  function addFencePier(parent, x, z, materials, height = 0.82) {
    const pier = new THREE.Mesh(
      roundedBox(0.11, height, 0.12, 0.018),
      materials.paleFrame,
    );
    pier.position.set(x, height * 0.5 + 0.05, z);
    parent.add(pier);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.11, 4),
      materials.paleFrame,
    );
    cap.position.set(x, height + 0.12, z);
    cap.rotation.y = Math.PI * 0.25;
    parent.add(cap);
  }

  function addFenceRun(parent, start, end, z, materials, ornate = false) {
    const center = (start + end) * 0.5;
    const length = Math.abs(end - start);
    const base = new THREE.Mesh(
      roundedBox(length, 0.18, 0.14, 0.012),
      materials.paleFrame,
    );
    base.position.set(center, 0.14, z);
    parent.add(base);
    const purpleBand = new THREE.Mesh(
      roundedBox(length, 0.075, 0.13, 0.008),
      materials.purple,
    );
    purpleBand.position.set(center, 0.39, z);
    parent.add(purpleBand);
    [0.25, 0.57].forEach((y) => {
      const rail = new THREE.Mesh(
        roundedBox(length, 0.035, 0.045, 0.005),
        materials.paleFrame,
      );
      rail.position.set(center, y, z + 0.018);
      parent.add(rail);
    });
    const count = Math.max(1, Math.floor(length / 0.055));
    for (let index = 0; index <= count; index += 1) {
      const x = THREE.MathUtils.lerp(start, end, index / count);
      const picket = new THREE.Mesh(
        roundedBox(0.012, ornate ? 0.64 : 0.54, 0.018, 0.003),
        materials.paleFrame,
      );
      picket.position.set(x, ornate ? 0.48 : 0.43, z + 0.035);
      parent.add(picket);
      if (ornate) {
        const spear = new THREE.Mesh(
          new THREE.ConeGeometry(0.022, 0.08, 4),
          materials.paleFrame,
        );
        spear.position.set(x, 0.855, z + 0.035);
        spear.rotation.y = Math.PI * 0.25;
        parent.add(spear);
      }
    }
    addFencePier(parent, start, z, materials, ornate ? 0.83 : 0.72);
    addFencePier(parent, end, z, materials, ornate ? 0.83 : 0.72);
  }

  function addFenceGate(parent, center, width, z, materials, ornate = false) {
    const panelWidth = width * 0.5 - 0.04;
    [-1, 1].forEach((side) => {
      const panelCenter = center + side * width * 0.25;
      [0.26, 0.58].forEach((y) => {
        const rail = new THREE.Mesh(
          roundedBox(panelWidth, 0.04, 0.05, 0.005),
          materials.paleFrame,
        );
        rail.position.set(panelCenter, y, z + 0.035);
        parent.add(rail);
      });
      for (let offset = -panelWidth * 0.42; offset <= panelWidth * 0.42; offset += 0.05) {
        const crownRise = ornate
          ? Math.cos(Math.min(1, Math.abs(panelCenter + offset - center) / (width * 0.5)) * Math.PI * 0.5) * 0.22
          : 0;
        const barHeight = (ornate ? 0.58 : 0.54) + crownRise;
        const bar = new THREE.Mesh(
          roundedBox(0.012, barHeight, 0.018, 0.003),
          materials.paleFrame,
        );
        bar.position.set(
          panelCenter + offset,
          0.15 + barHeight * 0.5,
          z + 0.045,
        );
        parent.add(bar);
        if (ornate) {
          const spear = new THREE.Mesh(
            new THREE.ConeGeometry(0.019, 0.07, 4),
            materials.paleFrame,
          );
          spear.position.set(panelCenter + offset, 0.185 + barHeight, z + 0.045);
          spear.rotation.y = Math.PI * 0.25;
          parent.add(spear);
        }
      }
      if (ornate) {
        // The two leaves form one continuous arch toward the center seam.
        // Street View shows a pale shaped insert and purple painted band,
        // not two peaked panels with diagonal X braces.
        const insertShape = new THREE.Shape();
        insertShape.moveTo(-panelWidth * 0.5, 0.29);
        insertShape.lineTo(panelWidth * 0.5, 0.29);
        for (let sample = 12; sample >= 0; sample -= 1) {
          const x = -panelWidth * 0.5 + panelWidth * sample / 12;
          const distance = Math.min(1, Math.abs(panelCenter + x - center) / (width * 0.5));
          insertShape.lineTo(x, 0.43 + Math.cos(distance * Math.PI * 0.5) * 0.26);
        }
        insertShape.closePath();
        const insert = new THREE.Mesh(
          new THREE.ExtrudeGeometry(insertShape, { depth: 0.012, bevelEnabled: false }),
          materials.paleFrame,
        );
        insert.position.set(panelCenter, 0, z + 0.025);
        parent.add(insert);
        const band = new THREE.Mesh(
          roundedBox(panelWidth, 0.075, 0.018, 0.004), materials.purple,
        );
        band.position.set(panelCenter, 0.39, z + 0.062);
        parent.add(band);
      }
      const lowerPanel = new THREE.Mesh(
        roundedBox(panelWidth, 0.16, 0.055, 0.007),
        materials.paleFrame,
      );
      lowerPanel.position.set(panelCenter, 0.15, z + 0.04);
      parent.add(lowerPanel);
    });
    addFencePier(parent, center - width * 0.5, z, materials, ornate ? 0.86 : 0.76);
    addFencePier(parent, center + width * 0.5, z, materials, ornate ? 0.86 : 0.76);
  }

  function addStreetFence(parent, materials) {
    const fence = new THREE.Group();
    fence.name = "Street View white-and-purple Al-Abror south boundary fence";
    // The generic-building pass had no frontage, so an early draft read this
    // fence at nearly four metres tall. The road spheres establish a roughly
    // 2.2-metre spear/wire line, comfortably below the residence eaves.
    const z = -14.73;
    // Two real gates interrupt the otherwise continuous frontage: the plain
    // central double gate in the middle panorama and the ornate southern gate.
    // Leave the lime annex bay open for its real yellow-and-black gate; the
    // white/purple property fence resumes on either side instead of crossing
    // in front of that distinct frontage.
    addFenceRun(fence, -9.62, -10.35, z, materials, false);
    addFenceRun(fence, -11.6, -13.02, z, materials, false);
    addFenceGate(fence, -13.55, 1.06, z, materials, false);
    addFenceRun(fence, -14.08, -17.52, z, materials, false);
    addFenceGate(fence, -18.2, 1.36, z, materials, true);
    // The generated side lane (OSM road 59) crosses the old terminal span.
    // Pull its end pier north into the yard, including clearance for that
    // lane's curb and pedestrian band. Preserve the gate and re-space this
    // final fence bay rather than translating it west through the house.
    const terminalNorth = -19.82;
    const terminalAuthorX = -15.4 + (terminalNorth + 15.4) / Math.cos(frontageYaw);
    addFenceRun(fence, -18.88, terminalAuthorX, z, materials, true);

    // The northern frames show three taut security wires behind the pickets.
    const wireMaterial = hideMaterialOutline(materials.dark);
    [0.72, 0.84, 0.96].forEach((y) => {
      const wire = new THREE.Mesh(
        roundedBox(7.9, 0.012, 0.012, 0.002),
        wireMaterial,
      );
      wire.position.set(-13.57, y, z - 0.08);
      fence.add(wire);
    });
    [-9.65, -11.65, -13.65, -15.65, -17.5].forEach((x) => {
      const post = new THREE.Mesh(
        roundedBox(0.035, 0.88, 0.035, 0.004),
        materials.grayDark,
      );
      post.position.set(x, 0.58, z - 0.08);
      post.rotation.z = -0.08;
      fence.add(post);
    });

    finishBuilding(fence);
    // Authoring the picket details at a comfortable mesh scale keeps their
    // bevels stable. Compress the assembled frontage to its surveyed
    // 1.7-2.0 metre real height (one world unit is five metres).
    fence.scale.y = 0.42;
    // Rotate the complete fence rigidly: gates, piers, and wires retain
    // their authored proportions. Its outermost pier stays landward of
    // the sidewalk; extending the same line south joins the residence run.
    const pivotNorth = -15.4;
    fence.rotation.y = frontageYaw;
    fence.position.x = pivotNorth -
      pivotNorth * Math.cos(frontageYaw) - z * Math.sin(frontageYaw);
    fence.position.z = frontageEastAt(pivotNorth) +
      pivotNorth * Math.sin(frontageYaw) - z * Math.cos(frontageYaw);
    parent.add(fence);
  }

  function addRearSecurityWall(parent, materials) {
    const wall = new THREE.Group();
    wall.name =
      "Weathered west masonry boundary with barbed wire · Street View rear";
    const centerX = -15.42;
    const length = 12.18;
    const z = -22.43;

    const body = new THREE.Mesh(
      roundedBox(length, 0.49, 0.14, 0.018),
      materials.weatheredWhite,
    );
    body.position.set(centerX, 0.295, z);
    wall.add(body);
    for (let x = centerX - length * 0.5; x <= centerX + length * 0.5; x += 1.52) {
      const seam = new THREE.Mesh(
        roundedBox(0.055, 0.52, 0.17, 0.006),
        materials.frame,
      );
      seam.position.set(x, 0.31, z);
      wall.add(seam);
    }
    [
      [-18.5, 1.35, 0.2],
      [-15.55, 1.8, 0.17],
      [-12.25, 1.45, 0.22],
    ].forEach(([x, width, height], index) => {
      [-1, 1].forEach((side) => {
        const stain = new THREE.Mesh(
          roundedBox(width, height, 0.018, 0.006),
          index % 2 === 0 ? materials.wallStain : materials.grayDark,
        );
        stain.position.set(x, 0.25 + index * 0.035, z + side * 0.08);
        wall.add(stain);
      });
    });

    const wireMaterial = hideMaterialOutline(materials.dark);
    [0.59, 0.68, 0.77].forEach((y) => {
      const wire = new THREE.Mesh(
        roundedBox(length, 0.012, 0.012, 0.002),
        wireMaterial,
      );
      wire.position.set(centerX, y, z);
      wall.add(wire);
    });
    for (let x = centerX - length * 0.5; x <= centerX + length * 0.5; x += 1.52) {
      const post = new THREE.Mesh(
        roundedBox(0.025, 0.28, 0.025, 0.003),
        materials.grayDark,
      );
      post.position.set(x, 0.65, z);
      wall.add(post);
    }
    finishBuilding(wall);
    parent.add(wall);
  }

  function addNoVendingBoard(parent, materials) {
    [-19.35].forEach((north) => {
      const board = new THREE.Group();
      board.name =
        "Yellow DILARANG BERJUALAN warning board · Street View 2023";
      board.position.set(north, 0, frontageEastAt(north) + 0.05);
      board.rotation.y = frontageYaw;

      const backing = new THREE.Mesh(
        roundedBox(0.64, 0.24, 0.035, 0.012),
        materials.warningYellow,
      );
      backing.position.y = 0.3;
      backing.castShadow = true;
      backing.receiveShadow = true;
      board.add(backing);

      const border = new THREE.Mesh(
        roundedBox(0.61, 0.21, 0.012, 0.007),
        materials.warningRed,
      );
      border.position.set(0, 0.3, 0.024);
      board.add(border);

      const face = new THREE.Mesh(
        roundedBox(0.58, 0.18, 0.009, 0.005),
        materials.warningYellow,
      );
      face.position.set(0, 0.3, 0.034);
      board.add(face);

      [
        ["DILARANG BERJUALAN", 0.338],
        ["DI DEPAN RUMAH", 0.27],
      ].forEach(([text, y]) => {
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 0.062),
          getSitubondoSignMaterial(text, "#c63531", 900, {
            canvasWidth: 1024,
            canvasHeight: 160,
            maxFontSize: 104,
            strokeScale: 0,
          }),
        );
        label.position.set(0, y, 0.042);
        label.renderOrder = 8;
        board.add(label);
      });

      parent.add(board);
    });
  }

  function addAlAbrorSouthCompound(group) {
    const compound = new THREE.Group();
    compound.name =
      "Al-Abror south-side building compound · Google Street View 360";

    const materials = {
      warmWhite: toonMaterial({ color: 0xe7e3d9 }),
      weatheredWhite: toonMaterial({ color: 0xc7c5ba }),
      gray: toonMaterial({ color: 0x929896 }),
      grayDark: toonMaterial({ color: 0x5f6664 }),
      paleFrame: toonMaterial({ color: 0xebe9df }),
      frame: toonMaterial({ color: 0xc2c3bc }),
      glass: toonMaterial({
        color: 0x3d5352,
        emissive: 0x172322,
        emissiveIntensity: 0.1,
      }),
      oldGlass: toonMaterial({ color: 0x756d61 }),
      dark: toonMaterial({ color: 0x363c3b }),
      clayRoof: toonMaterial({ color: 0x8b5d4e }),
      clayRoofDark: toonMaterial({ color: 0x66443b }),
      darkClayRoof: toonMaterial({ color: 0x554a43 }),
      grayRoof: toonMaterial({ color: 0x5e5b53 }),
      rustedAwning: toonMaterial({ color: 0x7e514a }),
      corrugatedGreen: toonMaterial({ color: 0x9aaea0 }),
      annexLime: toonMaterial({ color: 0x83b95e }),
      annexMint: toonMaterial({ color: 0x5da77c }),
      domeGreen: toonMaterial({ color: 0x3f9468 }),
      domeDark: toonMaterial({ color: 0x235c45 }),
      domePale: toonMaterial({ color: 0xe3e7d9 }),
      stone: toonMaterial({ color: 0x656c68 }),
      wallStain: toonMaterial({ color: 0x8b8982 }),
      purple: toonMaterial({ color: 0x763c75 }),
      warningYellow: toonMaterial({ color: 0xf0d44e }),
      warningRed: toonMaterial({ color: 0xb83f37 }),
    };

    addNorthRange(compound, materials);
    addMiddleRange(compound, materials);
    addSouthRange(compound, materials);
    addRearRanges(compound, materials);
    addRearSecurityWall(compound, materials);
    addStreetFence(compound, materials);
    addNoVendingBoard(compound, materials);
    group.add(compound);
    return compound;
  }

  return { addAlAbrorSouthCompound };
}
