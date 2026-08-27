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
    const eaveGray = toonMaterial({ color: 0x737b70 });
    const eaveUnderside = toonMaterial({ color: 0x3f443d });
    const polishedTile = toonMaterial({ color: 0xc9c4b6 });
    const lawnMaterial = toonMaterial({ color: 0x628651 });
    const tileTrim = toonMaterial({ color: 0x6f342d });
    const roofTileLine = hideMaterialOutline(toonMaterial({ color: 0x9a574b }));
    const stoneMid = toonMaterial({ color: 0x666963 });
    const stoneLight = toonMaterial({ color: 0x89877f });
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
      new THREE.PlaneGeometry(8.0, 0.54),
      getSitubondoSignMaterial(
        "pendopo aryo situbondo",
        "#303533",
        800,
        {
          strokeScale: 0,
          canvasWidth: 3072,
          maxFontSize: 240,
        },
      ),
    );
    titleShadow.position.set(0.045, 0.645, 2.335);
    titleShadow.renderOrder = 6;
    signage.add(titleShadow);
    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(8.0, 0.54),
      getSitubondoSignMaterial(
        "pendopo aryo situbondo",
        "#e8e5dc",
        800,
        {
          strokeColor: "rgba(43,48,46,.72)",
          strokeScale: 0.008,
          canvasWidth: 3072,
          maxFontSize: 240,
        },
      ),
    );
    title.position.set(0, 0.68, 2.37);
    title.renderOrder = 7;
    signage.add(title);
    const mottoBacking = new THREE.Mesh(
      roundedBox(3.95, 0.18, 0.045, 0.012),
      timberDark,
    );
    mottoBacking.position.set(0, 0.205, 2.345);
    signage.add(mottoBacking);
    const motto = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.19),
      getSitubondoSignMaterial(
        "GRAHA AMUKTI PRAJA",
        "#d8ad5d",
        800,
        {
          strokeColor: "rgba(65,64,57,.48)",
          strokeScale: 0.01,
          canvasWidth: 3072,
          maxFontSize: 260,
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

    const building = new THREE.Group();
    building.position.z = -0.55;
    architecture.add(building);
    const hallFloor = new THREE.Mesh(roundedBox(7.1, 0.18, 4.95, 0.05), polishedTile);
    hallFloor.position.set(0, 0.17, -0.12);
    building.add(hallFloor);
    const columnMaterials = {
      base: stone,
      shaft: darkWood,
      trim: timberDark,
    };
    [-2.8, -2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1, 2.8].forEach((x) => {
      [-1.72, 1.55].forEach((z) => {
        addPendopoSimpleColumn(building, x, z, columnMaterials, {
          floorY: 0.24,
          shaftHeight: 0.91,
          width: 0.09,
        });
      });
    });
    [-1.02, 1.02].forEach((x) => {
      [-0.68, 0.58].forEach((z) => {
        addPendopoSimpleColumn(building, x, z, columnMaterials, {
          floorY: 0.24,
          shaftHeight: 0.98,
          width: 0.19,
          heavy: true,
        });
      });
    });
    [-0.68, 0.58].forEach((z) => {
      const crossBeam = new THREE.Mesh(
        roundedBox(2.42, 0.11, 0.17, 0.016),
        timberDark,
      );
      crossBeam.position.set(0, 1.3, z);
      building.add(crossBeam);
    });
    [-1.02, 1.02].forEach((x) => {
      const crossBeam = new THREE.Mesh(
        roundedBox(0.17, 0.11, 1.56, 0.016),
        timberDark,
      );
      crossBeam.position.set(x, 1.3, -0.05);
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
    const ceiling = new THREE.Mesh(roundedBox(6.85, 0.07, 4.7, 0.025), eaveGray);
    ceiling.position.set(0, 1.415, -0.12);
    building.add(ceiling);
    const eaveShadow = new THREE.Mesh(
      roundedBox(7.1, 0.035, 0.09, 0.012),
      eaveUnderside,
    );
    eaveShadow.position.set(0, 1.365, 2.24);
    building.add(eaveShadow);

    const lowerRoof = new THREE.Mesh(
      createHippedRoofGeometry(7.7, 5.35, 0.82),
      primaryMaterial,
    );
    lowerRoof.position.set(0, 1.43, -0.12);
    building.add(lowerRoof);
    const upperRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.08, 3.0, 1.58, 1.54),
      primaryMaterial,
    );
    upperRoof.position.set(0, 2.12, -0.12);
    building.add(upperRoof);
    [
      [7.73, 5.38, 1.43],
      [3.11, 3.03, 2.12],
    ].forEach(([width, depth, y]) => {
      [-depth * 0.5, depth * 0.5].forEach((zOffset) => {
        const trim = new THREE.Mesh(roundedBox(width, 0.06, 0.065, 0.014), tileTrim);
        trim.position.set(0, y, -0.12 + zOffset);
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
    addFrontRoofRows(7.7, 2.14, 5.35, 0.82, 1.43, -0.12, 18);
    addFrontRoofRows(3.08, 0, 3.0, 1.58, 2.12, -0.12, 26);

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
    addFrontRoofJoints(2.14, 5.35, 0.82, 1.43, -0.12, 0.18);
    for (let x = -1.4; x <= 1.4; x += 0.22) {
      const apex = new THREE.Vector3(0, 3.705, -0.12);
      const eave = new THREE.Vector3(x, 2.125, 1.38);
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
    roofFinial.position.set(0, 3.84, -0.12);
    building.add(roofFinial);

    [-1, 1].forEach((direction) => {
      const wingCenterX = direction * 4.65;
      const wingWidth = 4.15;
      const wingDepth = 1.72;
      const wingFloor = new THREE.Mesh(
        roundedBox(wingWidth, 0.16, wingDepth, 0.045),
        polishedTile,
      );
      wingFloor.position.set(wingCenterX, 0.17, -0.03);
      building.add(wingFloor);

      const rearWall = new THREE.Mesh(
        roundedBox(wingWidth - 0.2, 0.58, 0.14, 0.035),
        cream,
      );
      rearWall.position.set(wingCenterX, 0.58, -0.76);
      building.add(rearWall);
      const outerWall = new THREE.Mesh(
        roundedBox(0.16, 0.58, wingDepth - 0.16, 0.035),
        cream,
      );
      outerWall.position.set(
        wingCenterX + direction * (wingWidth * 0.5 - 0.08),
        0.58,
        -0.03,
      );
      building.add(outerWall);

      [-1.5, -0.5, 0.5, 1.5].forEach((offset) => {
        const x = wingCenterX + offset;
        const base = new THREE.Mesh(roundedBox(0.24, 0.14, 0.24, 0.025), stone);
        base.position.set(x, 0.31, 0.69);
        building.add(base);
        const column = new THREE.Mesh(roundedBox(0.16, 0.66, 0.16, 0.025), cream);
        column.position.set(x, 0.63, 0.69);
        building.add(column);
        const collar = new THREE.Mesh(
          roundedBox(0.21, 0.075, 0.21, 0.018),
          darkWood,
        );
        collar.position.set(x, 0.73, 0.69);
        building.add(collar);
        const capital = new THREE.Mesh(roundedBox(0.25, 0.12, 0.25, 0.025), pale);
        capital.position.set(x, 0.97, 0.69);
        building.add(capital);
      });

      const frontBeam = new THREE.Mesh(
        roundedBox(wingWidth - 0.3, 0.12, 0.15, 0.02),
        cream,
      );
      frontBeam.position.set(wingCenterX, 0.98, 0.69);
      building.add(frontBeam);
      const rearBeam = new THREE.Mesh(
        roundedBox(wingWidth - 0.3, 0.11, 0.15, 0.02),
        cream,
      );
      rearBeam.position.set(wingCenterX, 0.96, -0.69);
      building.add(rearBeam);
      const wingCeiling = new THREE.Mesh(
        roundedBox(wingWidth - 0.12, 0.08, wingDepth - 0.12, 0.025),
        pale,
      );
      wingCeiling.position.set(wingCenterX, 1.0, -0.03);
      building.add(wingCeiling);

      [-1.25, -0.42, 0.42, 1.25].forEach((offset) => {
        const window = new THREE.Mesh(
          roundedBox(0.62, 0.3, 0.035, 0.014),
          windowMaterial,
        );
        window.position.set(wingCenterX + offset, 0.61, -0.68);
        building.add(window);
      });

      const wingRoof = new THREE.Mesh(
        createHippedRoofGeometry(4.5, 2.02, 0.43),
        primaryMaterial,
      );
      wingRoof.position.set(wingCenterX, 1.04, -0.03);
      building.add(wingRoof);
      [-1.04, 0.98].forEach((zOffset) => {
        const trim = new THREE.Mesh(roundedBox(4.54, 0.05, 0.055, 0.012), tileTrim);
        trim.position.set(wingCenterX, 1.04, zOffset);
        building.add(trim);
      });
    });

    const rearHall = new THREE.Mesh(roundedBox(6.55, 0.82, 0.2, 0.07), cream);
    rearHall.position.set(0, 0.57, -2.34);
    building.add(rearHall);
    [-2.4, -0.8, 0.8, 2.4].forEach((x) => {
      const rearWindow = new THREE.Mesh(roundedBox(0.8, 0.4, 0.06, 0.018), windowMaterial);
      rearWindow.position.set(x, 0.6, -2.46);
      building.add(rearWindow);
    });

    [-2.2, 0, 2.2].forEach((x) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 7), lampGlow);
      bulb.position.set(x, 1.2, 1.28);
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
      { shape: "box", x: 0, z: -2.89, width: 6.55, depth: 0.2, label: "rear hall wall" },
      { shape: "circle", x: -4.55, z: 0.3, radius: 0.22, label: "tree trunk" },
      { shape: "circle", x: 4.25, z: 0.32, radius: 0.22, label: "tree trunk" },
    ];
    [-2.8, -2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1, 2.8].forEach((x) => {
      [-2.27, 1].forEach((z) => {
        pendopoObstacles.push({
          shape: "box",
          x,
          z,
          width: 0.2,
          depth: 0.2,
          label: "simple timber post",
        });
      });
    });
    [-1.02, 1.02].forEach((x) => {
      [-1.23, 0.03].forEach((z) => {
        pendopoObstacles.push({
          shape: "box",
          x,
          z,
          width: 0.29,
          depth: 0.29,
          label: "main timber post",
        });
      });
    });
    [-1, 1].forEach((direction) => {
      const wingCenterX = direction * 4.65;
      pendopoObstacles.push(
        {
          shape: "box",
          x: wingCenterX,
          z: -1.31,
          width: 3.95,
          depth: 0.14,
          label: "wing rear wall",
        },
        {
          shape: "box",
          x: wingCenterX + direction * 1.995,
          z: -0.58,
          width: 0.16,
          depth: 1.56,
          label: "wing outer wall",
        },
      );
      [-1.5, -0.5, 0.5, 1.5].forEach((offset) => {
        pendopoObstacles.push({
          shape: "box",
          x: wingCenterX + offset,
          z: 0.14,
          width: 0.16,
          depth: 0.16,
          label: "wing column",
        });
      });
    });
    group.userData.navigation = {
      surfaces: [
        { x: 0, z: -0.67, width: 7.1, depth: 4.95, height: 0.26, label: "main hall floor" },
        { x: -4.65, z: -0.58, width: 4.15, depth: 1.72, height: 0.25, label: "west wing floor" },
        { x: 4.65, z: -0.58, width: 4.15, depth: 1.72, height: 0.25, label: "east wing floor" },
      ],
      obstacles: pendopoObstacles,
      deliveryTarget: { x: 0, z: 3.08, height: 0.08 },
    };
  }


  return { addPendopoModel };
}
