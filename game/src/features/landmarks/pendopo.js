import * as THREE from "three";
import {
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../rendering/materials.js";

const upAxis = new THREE.Vector3(0, 1, 0);

export function createPendopoModelFactory({
  collections: {
    animatedStopDetails,
  },
  helpers: {
    addAlunAlunTree,
    addAlunAlunWalker,
    addIndonesianFlag,
    addLocalPalm,
    addPendopoPennant,
    addPendopoSimpleColumn,
    addPendopoTimberColumn,
    getSitubondoSignMaterial,
  },
}) {
  function addPendopoModel(group, primaryMaterial) {
    group.name = "Pendopo Aryo Situbondo · Google Street View 360 survey";
    primaryMaterial.side = THREE.DoubleSide;
    primaryMaterial.color.setHex(0x8f5046);
    primaryMaterial.emissive.setHex(0x7d2f27);
    primaryMaterial.emissiveIntensity = 0.12;
    const architecture = new THREE.Group();
    const cream = toonMaterial({ color: 0xe9e1cc });
    const pale = toonMaterial({ color: 0xf3ecdc });
    const stone = toonMaterial({ color: 0x77776f });
    const darkStone = toonMaterial({ color: 0x4b514d });
    const darkWood = toonMaterial({ color: 0x5e3b32 });
    const timberDark = toonMaterial({ color: 0x302a27 });
    const timberHoney = toonMaterial({ color: 0x95633f });
    const carvedPlinth = toonMaterial({ color: 0x292b29 });
    const eaveGray = toonMaterial({ color: 0x737b70 });
    const eaveUnderside = toonMaterial({ color: 0x3f443d });
    const polishedTile = toonMaterial({ color: 0xc9c4b6 });
    const lawnMaterial = toonMaterial({ color: 0x628651 });
    const tileTrim = toonMaterial({ color: 0x6f342d });
    const roofTileLine = hideMaterialOutline(toonMaterial({ color: 0x9a574b }));
    const stoneMid = toonMaterial({ color: 0x666963 });
    const stoneLight = toonMaterial({ color: 0x89877f });
    const carvingGold = toonMaterial({ color: 0xb58a45 });
    const carvingRecess = toonMaterial({ color: 0x4a2925 });
    const rearCream = toonMaterial({ color: 0xd9d1bd });
    const rearTerracotta = toonMaterial({ color: 0x795047 });
    const rearTileLine = hideMaterialOutline(toonMaterial({ color: 0x9b6b5c }));
    const officeBlue = toonMaterial({ color: 0x435e68 });
    const corrugatedDark = toonMaterial({ color: 0x343b39 });
    const gateBrick = toonMaterial({ color: 0xa95643 });
    const gateBrickDark = toonMaterial({ color: 0x714036 });
    const flagPole = toonMaterial({ color: 0xa8b1ad, roughness: 0.46 });
    const windowMaterial = toonMaterial({
      color: 0x31494a,
      emissive: 0x16292a,
      emissiveIntensity: 0.18,
    });
    const lampGlow = toonMaterial({
      color: 0xffe6ae,
      emissive: 0xffc76a,
      emissiveIntensity: 0.56,
    });

    // Jalan Kartini, its 15-cm curb, public sidewalk and Pendopo gate apron
    // are owned by the surveyed Alun-Alun corridor. The former stop-local road
    // and oversized curb overlapped that shared surface and created a raised,
    // green-striped slab in only the middle of the street.

    const frontageWall = new THREE.Mesh(roundedBox(8.9, 0.34, 0.42, 0.045), stone);
    frontageWall.position.set(0, 0.21, 2.12);
    architecture.add(frontageWall);
    const claddingMaterials = [stoneLight, stone, stoneMid];
    for (let row = 0; row < 3; row += 1) {
      const blockWidth = 0.58;
      const offset = row % 2 === 0 ? 0 : blockWidth * 0.5;
      for (let index = -8; index <= 8; index += 1) {
        const x = index * blockWidth + offset;
        if (Math.abs(x) > 4.28) continue;
        const block = new THREE.Mesh(
          roundedBox(blockWidth - 0.018, 0.092, 0.022, 0.004),
          claddingMaterials[(index + row * 2 + 20) % claddingMaterials.length],
        );
        block.position.set(x, 0.105 + row * 0.105, 2.342);
        architecture.add(block);
      }
    }
    const lawn = new THREE.Mesh(roundedBox(8.9, 0.16, 1.35, 0.12), lawnMaterial);
    lawn.position.set(0, 0.34, 1.5);
    architecture.add(lawn);
    [-4.48, 4.48].forEach((x) => {
      const post = new THREE.Mesh(roundedBox(0.34, 0.66, 0.34, 0.04), stone);
      post.position.set(x, 0.33, 2.03);
      architecture.add(post);
      const cap = new THREE.Mesh(roundedBox(0.46, 0.12, 0.46, 0.04), pale);
      cap.position.set(x, 0.7, 2.03);
      architecture.add(cap);
    });

    const signage = new THREE.Group();
    const titleShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(8.0, 0.34),
      getSitubondoSignMaterial(
        "pendopo aryo situbondo",
        "#303533",
        800,
        {
          strokeScale: 0,
          canvasWidth: 3072,
          canvasHeight: 128,
          maxFontSize: 112,
        },
      ),
    );
    titleShadow.position.set(0.035, 0.55, 2.335);
    titleShadow.renderOrder = 6;
    signage.add(titleShadow);
    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(8.0, 0.34),
      getSitubondoSignMaterial(
        "pendopo aryo situbondo",
        "#e8e5dc",
        800,
        {
          strokeColor: "rgba(43,48,46,.72)",
          strokeScale: 0.008,
          canvasWidth: 3072,
          canvasHeight: 128,
          maxFontSize: 112,
        },
      ),
    );
    title.position.set(0, 0.57, 2.37);
    title.renderOrder = 7;
    signage.add(title);
    const mottoBacking = new THREE.Mesh(
      roundedBox(3.95, 0.14, 0.045, 0.012),
      timberDark,
    );
    mottoBacking.position.set(0, 0.205, 2.345);
    signage.add(mottoBacking);
    const motto = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.115),
      getSitubondoSignMaterial(
        "GRAHA AMUKTI PRAJA",
        "#d8ad5d",
        800,
        {
          strokeColor: "rgba(65,64,57,.48)",
          strokeScale: 0.01,
          canvasWidth: 3072,
          canvasHeight: 96,
          maxFontSize: 80,
        },
      ),
    );
    motto.position.set(0, 0.205, 2.37);
    motto.renderOrder = 7;
    signage.add(motto);
    const titleRail = new THREE.Mesh(
      roundedBox(8.25, 0.055, 0.055, 0.012),
      timberDark,
    );
    titleRail.position.set(0, 0.44, 2.34);
    signage.add(titleRail);
    architecture.add(signage);

    // The two public drives terminate in split East-Javanese candi-bentar
    // gateways. Both are visible in the same road panorama at 130°/210° and
    // sit outside the central name wall, rather than being pavilion wings.
    const addCandiBentarPier = (x, z, inward) => {
      const pier = new THREE.Group();
      pier.position.set(x, 0, z);
      [
        [0.62, 0.13, 0.62, 0.1],
        [0.5, 0.17, 0.5, 0.235],
        [0.4, 0.28, 0.42, 0.46],
        [0.52, 0.1, 0.52, 0.65],
        [0.32, 0.23, 0.35, 0.815],
        [0.43, 0.08, 0.45, 0.97],
        [0.25, 0.2, 0.29, 1.105],
      ].forEach(([width, height, depth, y], index) => {
        const tier = new THREE.Mesh(
          roundedBox(width, height, depth, index % 3 === 0 ? 0.018 : 0.01),
          index === 0 || index === 3 || index === 5 ? gateBrickDark : gateBrick,
        );
        tier.position.y = y;
        tier.position.x = inward * index * 0.012;
        pier.add(tier);
      });
      // The 234° close view resolves a flat brick cap above a flared
      // cornice, not a pointed pyramid. Keep the split pair mirrored toward
      // its own drive regardless of which side of the campus it stands on.
      const crownCornice = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.24, 0.18, 4),
        gateBrick,
      );
      crownCornice.position.set(inward * 0.085, 1.235, 0);
      crownCornice.rotation.y = Math.PI * 0.25;
      pier.add(crownCornice);
      const crownCap = new THREE.Mesh(
        roundedBox(0.16, 0.075, 0.16, 0.004),
        gateBrick,
      );
      crownCap.position.set(inward * 0.085, 1.36, 0);
      pier.add(crownCap);
      for (let course = 0; course < 7; course += 1) {
        const line = new THREE.Mesh(
          roundedBox(0.42 - course * 0.018, 0.012, 0.018, 0.003),
          gateBrickDark,
        );
        line.position.set(inward * course * 0.01, 0.31 + course * 0.125, 0.23);
        pier.add(line);
      }
      mergeDirectMeshesByMaterial(pier);
      architecture.add(pier);
    };
    [-1, 1].forEach((side) => {
      const gateCenter = side * 5.75;
      addCandiBentarPier(gateCenter - 0.54, 1.02, 1);
      addCandiBentarPier(gateCenter + 0.54, 1.02, -1);
    });

    // Google satellite and the road sphere place the pavilion roof around
    // east 23.5 m / north -138.6 m. The delivery stop is deliberately at the
    // Jalan Kartini gate, so the architecture must sit about 35 m behind it.
    // Keeping the sign at the gate while moving only the building fixes the
    // former model, which incorrectly occupied the entrance lawn.
    const building = new THREE.Group();
    building.position.set(0.32, 0, -8.07);
    architecture.add(building);
    // The current road photo leaves only a narrow dark band between the
    // freestanding name letters and the pavilion eave. Keep the surveyed roof
    // plan intact, but lower the complete supported roof assembly so the live
    // silhouette matches that relationship instead of exposing a tall bright
    // forest of columns above the sign.
    const pavilionRoofDrop = 0.4;
    const hallFloor = new THREE.Mesh(roundedBox(6.05, 0.18, 6.2, 0.05), polishedTile);
    hallFloor.position.set(0, 0.17, -0.12);
    building.add(hallFloor);
    const columnMaterials = {
      base: stone,
      shaft: darkWood,
      trim: timberDark,
    };
    [-2.8, -2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1, 2.8].forEach((x) => {
      [-2.08, 1.85].forEach((z) => {
        addPendopoSimpleColumn(building, x, z, columnMaterials, {
          floorY: 0.24,
          shaftHeight: 0.91 - pavilionRoofDrop + (Math.abs(x) === 2.8 ? 0.0376 : 0),
          width: 0.09,
        });
      });
    });
    const ornateColumnMaterials = {
      base: carvedPlinth,
      panel: stone,
      trim: carvingGold,
      wood: timberHoney,
      woodGrain: darkWood,
      carving: tileTrim,
      carvingAccent: carvingGold,
      carvingRecess,
    };
    [-1.02, 1.02].forEach((x) => {
      [-0.76, 0.68].forEach((z) => {
        addPendopoTimberColumn(building, x, z, ornateColumnMaterials, {
          floorY: 0.24,
          shaftHeight: 0.427,
          width: 0.19,
          heavy: true,
          detailProfile: "google360",
        });
      });
    });
    [-0.68, 0.58].forEach((z) => {
      const crossBeam = new THREE.Mesh(
        roundedBox(2.42, 0.11, 0.17, 0.016),
        timberDark,
      );
      crossBeam.position.set(0, 1.3 - pavilionRoofDrop, z);
      building.add(crossBeam);
    });
    [-1.02, 1.02].forEach((x) => {
      const crossBeam = new THREE.Mesh(
        roundedBox(0.17, 0.11, 1.56, 0.016),
        timberDark,
      );
      crossBeam.position.set(x, 1.3 - pavilionRoofDrop, -0.05);
      building.add(crossBeam);
    });
    for (let index = -3; index <= 3; index += 1) {
      const seam = new THREE.Mesh(
        roundedBox(0.018, 0.012, 4.6, 0.003),
        stone,
      );
      seam.position.set(index * 0.98, 0.267, -0.12);
      building.add(seam);
    }
    const ceiling = new THREE.Mesh(roundedBox(6.0, 0.07, 6.28, 0.025), pale);
    ceiling.position.set(0, 1.415 - pavilionRoofDrop, -0.12);
    building.add(ceiling);
    const steppedCeiling = new THREE.Mesh(
      roundedBox(4.72, 0.075, 4.72, 0.025),
      cream,
    );
    steppedCeiling.position.set(0, 1.37 - pavilionRoofDrop, -0.12);
    building.add(steppedCeiling);
    const eaveShadow = new THREE.Mesh(
      roundedBox(6.3, 0.11, 0.15, 0.012),
      eaveUnderside,
    );
    eaveShadow.position.set(0, 1.37 - pavilionRoofDrop, 3.18);
    building.add(eaveShadow);

    const frontAwning = new THREE.Mesh(
      createHippedRoofGeometry(6.18, 0.82, 0.13, 0.32),
      eaveGray,
    );
    frontAwning.position.set(0, 1.28 - pavilionRoofDrop, 2.78);
    building.add(frontAwning);

    const lowerRoof = new THREE.Mesh(
      createHippedRoofGeometry(6.27, 6.63, 0.82, 2.45),
      primaryMaterial,
    );
    lowerRoof.position.set(0, 1.43 - pavilionRoofDrop, -0.12);
    building.add(lowerRoof);
    const upperRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.42, 3.34, 1.58, 1.71),
      primaryMaterial,
    );
    upperRoof.position.set(0, 2.12 - pavilionRoofDrop, -0.12);
    building.add(upperRoof);
    [
      [6.3, 6.66, 1.43],
      [3.45, 3.37, 2.12],
    ].forEach(([width, depth, y]) => {
      [-depth * 0.5, depth * 0.5].forEach((zOffset) => {
        const trim = new THREE.Mesh(roundedBox(width, 0.06, 0.065, 0.014), tileTrim);
        trim.position.set(0, y - pavilionRoofDrop, -0.12 + zOffset);
        building.add(trim);
      });
    });
    const addFrontRoofRows = (
      width,
      ridgeWidth,
      depth,
      height,
      baseY,
      centerZ,
      rowCount,
    ) => {
      for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
        const progress = rowIndex / (rowCount + 1);
        const rowWidth = THREE.MathUtils.lerp(width, ridgeWidth, progress) * 0.96;
        const row = new THREE.Mesh(
          roundedBox(rowWidth, 0.004, 0.006, 0.002),
          roofTileLine,
        );
        row.position.set(
          0,
          baseY + height * progress + 0.006,
          centerZ + depth * 0.5 * (1 - progress) + 0.006,
        );
        row.rotation.x = Math.atan2(height, depth * 0.5);
        building.add(row);
      }
    };
    addFrontRoofRows(
      6.27,
      1.37,
      6.63,
      0.82,
      1.43 - pavilionRoofDrop,
      -0.12,
      18,
    );
    addFrontRoofRows(
      3.42,
      0,
      3.34,
      1.58,
      2.12 - pavilionRoofDrop,
      -0.12,
      26,
    );

    const addFrontRoofJoints = (
      ridgeWidth,
      depth,
      height,
      baseY,
      centerZ,
      spacing,
    ) => {
      const slopeLength = Math.hypot(depth * 0.5, height);
      for (
        let x = -ridgeWidth * 0.5 + spacing * 0.5;
        x < ridgeWidth * 0.5;
        x += spacing
      ) {
        const joint = new THREE.Mesh(
          roundedBox(0.005, 0.004, slopeLength * 0.97, 0.002),
          roofTileLine,
        );
        joint.position.set(
          x,
          baseY + height * 0.5 + 0.005,
          centerZ + depth * 0.25,
        );
        joint.rotation.x = Math.atan2(height, depth * 0.5);
        building.add(joint);
      }
    };
    addFrontRoofJoints(
      1.37,
      6.63,
      0.82,
      1.43 - pavilionRoofDrop,
      -0.12,
      0.18,
    );
    for (let x = -1.56; x <= 1.56; x += 0.22) {
      const apex = new THREE.Vector3(0, 3.705 - pavilionRoofDrop, -0.12);
      const eave = new THREE.Vector3(x, 2.125 - pavilionRoofDrop, 1.55);
      const direction = eave.clone().sub(apex);
      const seam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, direction.length(), 5),
        roofTileLine,
      );
      seam.position.copy(apex).add(eave).multiplyScalar(0.5);
      seam.quaternion.setFromUnitVectors(upAxis, direction.clone().normalize());
      building.add(seam);
    }
    const roofFinial = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 8), tileTrim);
    roofFinial.position.set(0, 3.84 - pavilionRoofDrop, -0.12);
    building.add(roofFinial);

    // The two buildings flanking the Pendopo are distinct OSM footprints,
    // not attached wings. Their former ±4.65-unit copies both overlapped the
    // generic map buildings and pulled the campus inward by roughly 20 m.
    const westOffice = new THREE.Group();
    westOffice.position.set(8.45, 0, -6.76);
    const westFoundation = new THREE.Mesh(
      roundedBox(3.24, 0.14, 2.5, 0.04),
      stone,
    );
    westFoundation.position.y = 0.07;
    westOffice.add(westFoundation);
    const westBody = new THREE.Mesh(
      roundedBox(3.02, 0.78, 2.26, 0.035),
      cream,
    );
    westBody.position.y = 0.53;
    westOffice.add(westBody);
    const westRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.44, 2.82, 0.56),
      rearTerracotta,
    );
    westRoof.position.y = 0.94;
    westOffice.add(westRoof);
    [-0.88, 0, 0.88].forEach((x, index) => {
      const opening = new THREE.Mesh(
        roundedBox(index === 1 ? 0.54 : 0.46, 0.52, 0.045, 0.012),
        officeBlue,
      );
      opening.position.set(x, 0.46, 1.145);
      westOffice.add(opening);
    });
    const westFascia = new THREE.Mesh(
      roundedBox(3.18, 0.09, 0.08, 0.012),
      pale,
    );
    westFascia.position.set(0, 0.9, 1.17);
    westOffice.add(westFascia);
    mergeDirectMeshesByMaterial(westOffice);
    architecture.add(westOffice);

    const eastOffice = new THREE.Group();
    eastOffice.position.set(-10.08, 0, -5.91);
    const eastFoundation = new THREE.Mesh(
      roundedBox(3.18, 0.14, 2.72, 0.04),
      stone,
    );
    eastFoundation.position.y = 0.07;
    eastOffice.add(eastFoundation);
    const eastBody = new THREE.Mesh(
      roundedBox(2.98, 0.72, 2.1, 0.035),
      cream,
    );
    // The east office's road-facing elevation is a shaded veranda, not a
    // flush wall. Panorama gHIAR9-7DNO6HM9zetIQZg at 130–141 degrees resolves
    // the recessed openings and pale pierced balustrade below the red hip.
    // Keep the surveyed rear edge, roof and navigation envelope unchanged.
    eastBody.position.set(0, 0.5, -0.24);
    eastOffice.add(eastBody);
    [-1.05, -0.35, 0.35, 1.05].forEach((x, index) => {
      const opening = new THREE.Mesh(
        roundedBox(0.43, 0.45, 0.045, 0.012),
        index % 2 === 0 ? windowMaterial : officeBlue,
      );
      opening.position.set(x, 0.46, 0.835);
      eastOffice.add(opening);
    });
    [-1.36, -0.45, 0.45, 1.36].forEach((x) => {
      const column = new THREE.Mesh(
        roundedBox(0.1, 0.65, 0.1, 0.014),
        pale,
      );
      column.position.set(x, 0.48, 1.3);
      eastOffice.add(column);
      const base = new THREE.Mesh(roundedBox(0.17, 0.12, 0.17, 0.012), stone);
      base.position.set(x, 0.2, 1.3);
      eastOffice.add(base);
    });
    // Two pierced side bays leave the central entrance open. The narrow
    // balusters read as the light/dark openings visible beneath the porch.
    [-0.905, 0.905].forEach((centerX) => {
      [0.19, 0.39].forEach((y) => {
        const rail = new THREE.Mesh(roundedBox(0.83, 0.05, 0.085, 0.008), pale);
        rail.position.set(centerX, y, 1.3);
        eastOffice.add(rail);
      });
      for (let offset = -0.3; offset <= 0.3; offset += 0.12) {
        const baluster = new THREE.Mesh(roundedBox(0.045, 0.2, 0.055, 0.008), pale);
        baluster.position.set(centerX + offset, 0.29, 1.3);
        eastOffice.add(baluster);
      }
    });
    const eastRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.46, 3.03, 0.52),
      rearTerracotta,
    );
    eastRoof.position.set(0, 0.9, -0.02);
    eastOffice.add(eastRoof);
    const eastEave = new THREE.Mesh(
      roundedBox(3.5, 0.06, 0.07, 0.012),
      tileTrim,
    );
    eastEave.position.set(0, 0.9, 1.5);
    eastOffice.add(eastEave);
    mergeDirectMeshesByMaterial(eastOffice);
    architecture.add(eastOffice);

    // OSM 2231 is the open, dark-roofed motorcycle shelter visible west of
    // the entrance—not a solid generic house.
    const parkingCanopy = new THREE.Group();
    parkingCanopy.position.set(9.1, 0, 0.91);
    const parkingRoof = new THREE.Mesh(
      roundedBox(1.72, 0.09, 1.58, 0.025),
      corrugatedDark,
    );
    parkingRoof.position.y = 1.04;
    parkingRoof.rotation.z = -0.035;
    parkingCanopy.add(parkingRoof);
    [-0.72, 0.72].forEach((x) => {
      [-0.64, 0.64].forEach((z) => {
        const post = new THREE.Mesh(
          roundedBox(0.055, 0.98, 0.055, 0.009),
          timberDark,
        );
        post.position.set(x, 0.51, z);
        parkingCanopy.add(post);
      });
    });
    mergeDirectMeshesByMaterial(parkingCanopy);
    architecture.add(parkingCanopy);

    // OSM 2225 continues another 50 m south of the public pavilion. Google
    // satellite shows a connected group of weathered clay hipped roofs rather
    // than an empty lawn; model the observed cross-wing/longitudinal layout.
    const rearComplex = new THREE.Group();
    rearComplex.position.set(-0.95, 0, -16.77);
    const rearFoundation = new THREE.Mesh(
      roundedBox(7.07, 0.16, 12.94, 0.05),
      stoneMid,
    );
    rearFoundation.position.y = 0.08;
    rearComplex.add(rearFoundation);
    [
      // Recess the solid body behind the pavilion stage; the former north
      // face at 6.38 buried the timber backdrop inside the pale wall.
      { x: 0, z: 3.91, width: 6.2, depth: 3.9 },
      // Retain the exposed western cheek and original exterior outline.
      { x: -2.2325, z: 6.12, width: 1.735, depth: 0.52 },
      { x: 0.1, z: -0.68, width: 6.55, depth: 5.1 },
      { x: -0.25, z: -4.88, width: 4.65, depth: 3.2 },
      { x: 2.45, z: -2.75, width: 1.45, depth: 3.25 },
    ].forEach(({ x, z, width, depth }) => {
      const body = new THREE.Mesh(
        roundedBox(width, 0.9, depth, 0.045),
        rearCream,
      );
      body.position.set(x, 0.58, z);
      rearComplex.add(body);
    });
    const rearNorthRoof = new THREE.Mesh(
      createHippedRoofGeometry(6.55, 4.8, 0.62),
      rearTerracotta,
    );
    rearNorthRoof.position.set(0, 1.03, 4.17);
    rearComplex.add(rearNorthRoof);
    const rearLongRoof = new THREE.Mesh(
      createHippedRoofGeometry(7.0, 5.58, 0.82),
      rearTerracotta,
    );
    rearLongRoof.position.set(0.1, 1.04, -0.68);
    rearComplex.add(rearLongRoof);
    const rearSouthRoof = new THREE.Mesh(
      createHippedRoofGeometry(5.18, 3.72, 0.68),
      rearTerracotta,
    );
    rearSouthRoof.position.set(-0.25, 1.04, -4.88);
    rearComplex.add(rearSouthRoof);
    const rearEastRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.62, 1.82, 0.5),
      rearTerracotta,
    );
    rearEastRoof.position.set(2.45, 1.02, -2.75);
    rearEastRoof.rotation.y = Math.PI * 0.5;
    rearComplex.add(rearEastRoof);
    [4.17, -4.88].forEach((z, index) => {
      const trim = new THREE.Mesh(
        roundedBox(index === 0 ? 6.59 : 5.22, 0.055, 0.07, 0.012),
        tileTrim,
      );
      trim.position.set(index === 0 ? 0 : -0.25, 1.03, z + (index === 0 ? 2.41 : 1.87));
      rearComplex.add(trim);
    });
    for (let row = 1; row <= 11; row += 1) {
      const progress = row / 12;
      const course = new THREE.Mesh(
        roundedBox(THREE.MathUtils.lerp(6.55, 2.85, progress), 0.005, 0.012, 0.003),
        rearTileLine,
      );
      course.position.set(
        0,
        1.03 + 0.62 * progress + 0.006,
        4.17 + 2.4 * (1 - progress),
      );
      course.rotation.x = Math.atan2(0.62, 2.4);
      rearComplex.add(course);
    }
    [-2.25, -0.75, 0.75, 2.25].forEach((x) => {
      const frontWindow = new THREE.Mesh(
        roundedBox(0.72, 0.42, 0.045, 0.014),
        windowMaterial,
      );
      frontWindow.position.set(x, 0.57, x === -2.25 ? 6.4 : 5.88);
      rearComplex.add(frontWindow);
    });
    // Satellite resolves this junction as a continuous clay-roofed connector,
    // not the exposed flat cream slab that previously projected above the
    // eastern roofline. Recess the vent wall into the intersecting roof and
    // give it a shallow hip whose ridge stays below the main north roof.
    const clerestory = new THREE.Mesh(
      roundedBox(4.08, 0.27, 1.3, 0.035),
      rearCream,
    );
    clerestory.position.set(0, 1.245, 3.85);
    rearComplex.add(clerestory);
    const clerestoryRoof = new THREE.Mesh(
      createHippedRoofGeometry(4.36, 1.62, 0.2, 0.76),
      rearTerracotta,
    );
    clerestoryRoof.position.set(0, 1.37, 3.85);
    rearComplex.add(clerestoryRoof);
    [-1.55, -0.52, 0.52, 1.55].forEach((x) => {
      const vent = new THREE.Mesh(
        roundedBox(0.55, 0.105, 0.035, 0.008),
        windowMaterial,
      );
      vent.position.set(x, 1.255, 4.515);
      rearComplex.add(vent);
    });

    // The oblique Street View sightlines through both side gates show that
    // these ranges are veranda elevations, not blank rendered walls. Keep the
    // satellite-surveyed masses intact and add the permanent dark timber/glass
    // openings, pale round porch columns and low masonry balustrades visible
    // beneath their deep eaves.
    const addRearSideWindow = (side, x, z, width = 0.68) => {
      const frame = new THREE.Mesh(
        roundedBox(0.065, 0.57, width + 0.12, 0.012),
        darkWood,
      );
      frame.position.set(x, 0.62, z);
      rearComplex.add(frame);

      const glass = new THREE.Mesh(
        roundedBox(0.038, 0.45, width, 0.008),
        windowMaterial,
      );
      glass.position.set(x + side * 0.018, 0.62, z);
      rearComplex.add(glass);

      const mullion = new THREE.Mesh(
        roundedBox(0.026, 0.43, 0.026, 0.005),
        rearCream,
      );
      mullion.position.set(x + side * 0.041, 0.62, z);
      rearComplex.add(mullion);

      const transom = new THREE.Mesh(
        roundedBox(0.026, 0.026, width * 0.94, 0.005),
        rearCream,
      );
      transom.position.set(x + side * 0.041, 0.67, z);
      rearComplex.add(transom);
    };

    const addRearEndWindow = (x, z, width = 0.72) => {
      const frame = new THREE.Mesh(
        roundedBox(width + 0.12, 0.57, 0.065, 0.012),
        darkWood,
      );
      frame.position.set(x, 0.62, z);
      rearComplex.add(frame);

      const glass = new THREE.Mesh(
        roundedBox(width, 0.45, 0.038, 0.008),
        windowMaterial,
      );
      glass.position.set(x, 0.62, z - 0.018);
      rearComplex.add(glass);

      const mullion = new THREE.Mesh(
        roundedBox(0.026, 0.43, 0.026, 0.005),
        rearCream,
      );
      mullion.position.set(x, 0.62, z - 0.041);
      rearComplex.add(mullion);

      const transom = new THREE.Mesh(
        roundedBox(width * 0.94, 0.026, 0.026, 0.005),
        rearCream,
      );
      transom.position.set(x, 0.67, z - 0.041);
      rearComplex.add(transom);
    };

    const addRearPorchColumn = (x, z) => {
      const base = new THREE.Mesh(
        roundedBox(0.24, 0.18, 0.24, 0.025),
        stoneMid,
      );
      base.position.set(x, 0.17, z);
      rearComplex.add(base);

      const plinth = new THREE.Mesh(
        roundedBox(0.18, 0.12, 0.18, 0.02),
        pale,
      );
      plinth.position.set(x, 0.31, z);
      rearComplex.add(plinth);

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.073, 0.55, 10),
        pale,
      );
      column.position.set(x, 0.645, z);
      rearComplex.add(column);

      const capital = new THREE.Mesh(
        roundedBox(0.19, 0.1, 0.19, 0.018),
        pale,
      );
      capital.position.set(x, 0.95, z);
      rearComplex.add(capital);
    };

    const addRearBalustrade = (x, centerZ, depth) => {
      const sill = new THREE.Mesh(
        roundedBox(0.12, 0.14, depth, 0.024),
        stoneMid,
      );
      sill.position.set(x, 0.18, centerZ);
      rearComplex.add(sill);

      [0.33, 0.5].forEach((y) => {
        const rail = new THREE.Mesh(
          roundedBox(0.085, 0.055, depth, 0.012),
          pale,
        );
        rail.position.set(x, y, centerZ);
        rearComplex.add(rail);
      });

      for (let offset = -depth * 0.5 + 0.2; offset <= depth * 0.5 - 0.2; offset += 0.34) {
        const baluster = new THREE.Mesh(
          roundedBox(0.072, 0.3, 0.072, 0.012),
          pale,
        );
        baluster.position.set(x, 0.385, centerZ + offset);
        rearComplex.add(baluster);
      }
    };

    [-1, 1].forEach((side) => {
      [2.65, 4.15, 5.58].forEach((z) =>
        addRearSideWindow(side, side * 3.12, z),
      );
      [2.18, 3.52, 4.86, 6.08].forEach((z) =>
        addRearPorchColumn(side * 3.38, z),
      );
      addRearBalustrade(side * 3.39, 4.13, 3.62);

      [-5.73, -4.22].forEach((z) =>
        addRearSideWindow(side, -0.25 + side * 2.35, z, 0.61),
      );
      [-6.07, -4.78, -3.5].forEach((z) =>
        addRearPorchColumn(-0.25 + side * 2.5, z),
      );
      addRearBalustrade(-0.25 + side * 2.51, -4.79, 2.28);
    });

    [-2.18, -0.7, 0.78].forEach((z) =>
      addRearSideWindow(-1, -3.3, z),
    );
    [-2.72, -1.36, 0, 1.38].forEach((z) =>
      addRearPorchColumn(-3.46, z),
    );
    addRearBalustrade(-3.47, -0.67, 3.95);

    // The short east-side stretch remains visible ahead of the projecting
    // cross-wing; stop the gallery before that real overlap.
    [0.25, 1.22].forEach((z) => addRearSideWindow(1, 3.3, z, 0.6));
    [0.04, 1.46].forEach((z) => addRearPorchColumn(3.46, z));
    addRearBalustrade(3.47, 0.75, 1.35);

    // Finish the outward face of the projecting cross-wing as the same
    // continuous shaded veranda; leaving this face bare produced the large
    // cream rectangle visible from the eastern gate.
    [-3.72, -2.74, -1.76].forEach((z) =>
      addRearSideWindow(1, 3.195, z, 0.56),
    );
    [-4.08, -3.12, -2.16, -1.38].forEach((z) =>
      addRearPorchColumn(3.34, z),
    );
    addRearBalustrade(3.35, -2.73, 2.68);

    // The rear road sequence resolves the southern end wall as a row of dark
    // timber windows, not the large blank cream rectangle of the massing box.
    [-1.75, -0.75, 0.25, 1.25].forEach((x) =>
      addRearEndWindow(x, -6.5),
    );

    mergeDirectMeshesByMaterial(rearComplex);
    architecture.add(rearComplex);

    const stageWall = new THREE.Mesh(roundedBox(5.25, 0.72, 0.2, 0.055), timberHoney);
    stageWall.position.set(0, 0.6, -2.73);
    building.add(stageWall);
    for (let x = -2.42; x <= 2.42; x += 0.22) {
      const slat = new THREE.Mesh(roundedBox(0.035, 0.65, 0.025, 0.005), timberDark);
      slat.position.set(x, 0.6, -2.615);
      building.add(slat);
    }
    const stage = new THREE.Mesh(roundedBox(4.8, 0.13, 0.78, 0.035), polishedTile);
    stage.position.set(0, 0.32, -2.25);
    building.add(stage);
    const stageScreen = new THREE.Mesh(roundedBox(1.76, 0.38, 0.045, 0.012), windowMaterial);
    stageScreen.position.set(0, 0.61, -2.6);
    building.add(stageScreen);
    [-1.42, 1.42].forEach((x) => {
      const portrait = new THREE.Mesh(roundedBox(0.27, 0.34, 0.035, 0.008), pale);
      portrait.position.set(x, 0.73, -2.595);
      building.add(portrait);
      const portraitInset = new THREE.Mesh(roundedBox(0.18, 0.24, 0.02, 0.006), darkWood);
      portraitInset.position.set(x, 0.73, -2.57);
      building.add(portraitInset);
    });
    const garuda = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 7), carvingGold);
    garuda.scale.set(1.15, 0.5, 0.3);
    garuda.position.set(0, 0.88, -2.56);
    building.add(garuda);

    const chandelierStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8),
      timberDark,
    );
    chandelierStem.position.set(0, 1.22 - pavilionRoofDrop, -0.12);
    building.add(chandelierStem);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const end = new THREE.Vector3(
        Math.cos(angle) * 0.46,
        1.08 - pavilionRoofDrop,
        -0.12 + Math.sin(angle) * 0.46,
      );
      const start = new THREE.Vector3(0, 1.12 - pavilionRoofDrop, -0.12);
      const direction = end.clone().sub(start);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, direction.length(), 7),
        timberDark,
      );
      arm.position.copy(start).add(end).multiplyScalar(0.5);
      arm.quaternion.setFromUnitVectors(upAxis, direction.clone().normalize());
      building.add(arm);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 7), lampGlow);
      globe.position.copy(end);
      building.add(globe);
    }

    [-2.2, 0, 2.2].forEach((x) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 7), lampGlow);
      bulb.position.set(x, 1.2 - pavilionRoofDrop, 1.28);
      building.add(bulb);
    });

    mergeDirectMeshesByMaterial(building);
    architecture.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    mergeDirectMeshesByMaterial(architecture);
    group.add(architecture);

    [
      { x: -4.08, z: 1.12, height: 2.5, clothHeight: 1.06, lean: 0.11, phase: 0.2 },
      { x: -3.18, z: 1.0, height: 2.18, clothHeight: 0.9, lean: 0.078, phase: 1.05 },
      { x: -1.72, z: 1.08, height: 2.62, clothHeight: 1.1, lean: 0.035, phase: 2.2 },
      { x: 1.68, z: 1.06, height: 2.36, clothHeight: 0.98, lean: -0.035, phase: 3.15 },
      { x: 3.08, z: 0.98, height: 2.7, clothHeight: 1.14, lean: -0.078, phase: 4.2 },
      { x: 4.04, z: 1.13, height: 2.28, clothHeight: 0.94, lean: -0.11, phase: 5.1 },
    ].forEach(({ x, z, height, clothHeight, lean, phase }, index) => {
      const pennant = addPendopoPennant(group, x, z, height, {
        clothHeight,
        clothWidth: index % 2 === 0 ? 0.19 : 0.17,
        lean,
        rotationY: index % 2 === 0 ? -0.08 : 0.07,
        poleMaterial: flagPole,
        windScale: 0.68 + (index % 3) * 0.08,
      });
      animatedStopDetails.push({
        object: pennant,
        type: "pendopoPennant",
        phase,
      });
    });

    const centralFlag = addIndonesianFlag(group, 0, 1.28, 4.08, {
      panelWidth: 0.33,
      panelHeight: 0.1,
      poleMaterial: flagPole,
      gravitySag: 0.095,
      windScale: 0.68,
    });
    centralFlag.scale.set(1.45, 1.3, 1.45);
    centralFlag.userData.keepOverviewDynamic = true;
    animatedStopDetails.push({ object: centralFlag, type: "parkFlag", phase: 0.4 });
    [-3.5, 3.5].forEach((x, index) => {
      const flag = addIndonesianFlag(group, x, 1.18, 1.72, {
        gravitySag: 0.08,
        windScale: 0.74,
      });
      flag.scale.set(1.1, 1.05, 1.1);
      flag.userData.keepOverviewDynamic = true;
      animatedStopDetails.push({ object: flag, type: "parkFlag", phase: 1.2 + index * 1.7 });
    });

    const leftPalm = addLocalPalm(group, -2.48, 0.6, 1.9);
    const rightPalm = addLocalPalm(group, 2.48, 0.6, 1.9);
    animatedStopDetails.push({ object: leftPalm, type: "parkPalm", phase: 0.6, strength: 0.011 });
    animatedStopDetails.push({ object: rightPalm, type: "parkPalm", phase: 2.4, strength: 0.011 });
    addAlunAlunTree(group, -4.55, 0.3, 2.8, 1.12, 0.8, false, 0.014);
    addAlunAlunTree(group, 4.25, 0.32, 3.95, 1.82, 2.1, false, 0.012);
    addAlunAlunWalker(group, 0x536f8d, 0.7, 1.5, 0.22, 0.13, -1.3, 1.45);
    addAlunAlunWalker(group, 0xb25b4f, 3.4, 1.55, 0.24, -0.11, 1.25, 1.48);
    animatedStopDetails.push({ type: "parkLamp", material: lampGlow, phase: 0.9 });

    const pendopoObstacles = [
      { shape: "box", x: 0, z: 2.12, width: 8.9, depth: 0.42, label: "frontage wall" },
      { shape: "box", x: 0, z: 1.5, width: 8.9, depth: 1.35, label: "raised lawn" },
      { shape: "box", x: -4.48, z: 2.03, width: 0.34, depth: 0.34, label: "frontage post" },
      { shape: "box", x: 4.48, z: 2.03, width: 0.34, depth: 0.34, label: "frontage post" },
      { shape: "box", x: 0.32, z: -10.8, width: 5.25, depth: 0.2, label: "rear stage wall" },
      { shape: "box", x: 0.32, z: -10.32, width: 4.8, depth: 0.78, label: "raised stage" },
      { shape: "box", x: -0.95, z: -16.77, width: 7.07, depth: 12.94, label: "rear building complex" },
      { shape: "box", x: 8.45, z: -6.76, width: 3.24, depth: 2.5, label: "west detached office" },
      { shape: "box", x: -10.08, z: -5.91, width: 3.18, depth: 2.72, label: "east detached office" },
      { shape: "circle", x: -4.55, z: 0.3, radius: 0.22, label: "tree trunk" },
      { shape: "circle", x: 4.25, z: 0.32, radius: 0.22, label: "tree trunk" },
    ];
    [-1, 1].forEach((side) => {
      const gateCenter = side * 5.75;
      [-0.54, 0.54].forEach((offset) => {
        pendopoObstacles.push({
          shape: "box",
          x: gateCenter + offset,
          z: 1.02,
          width: 0.62,
          depth: 0.62,
          label: "candi bentar gate pier",
        });
      });
    });
    [-2.8, -2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1, 2.8].forEach((x) => {
      [-2.08, 1.85].forEach((z) => {
        pendopoObstacles.push({
          shape: "box",
          x: x + 0.32,
          z: z - 8.07,
          width: 0.2,
          depth: 0.2,
          label: "simple timber post",
        });
      });
    });
    [-1.02, 1.02].forEach((x) => {
      [-0.76, 0.68].forEach((z) => {
        pendopoObstacles.push({
          shape: "box",
          x: x + 0.32,
          z: z - 8.07,
          width: 0.29,
          depth: 0.29,
          label: "main timber post",
        });
      });
    });
    [-0.72, 0.72].forEach((x) => {
      [-0.64, 0.64].forEach((z) => {
        pendopoObstacles.push({
          shape: "box",
          x: x + 9.1,
          z: z + 0.91,
          width: 0.08,
          depth: 0.08,
          label: "motorcycle shelter post",
        });
      });
    });
    group.userData.navigation = {
      surfaces: [
        { x: 0.32, z: -8.19, width: 6.05, depth: 6.2, height: 0.26, label: "main hall floor" },
      ],
      obstacles: pendopoObstacles,
      deliveryTarget: { x: 0, z: 3.08, height: 0.08 },
    };
  }


  return { addPendopoModel };
}
