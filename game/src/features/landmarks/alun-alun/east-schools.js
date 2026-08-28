import * as THREE from "three";
import {
  createGableRoofGeometry,
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import { toonMaterial } from "../../../rendering/materials.js";

export function createAlunAlunEastSchoolsFactory({
  helpers: {
    getSitubondoSignMaterial,
  },
}) {
  const AL_ABROR_ROAD_YAW = 0.199;

  function addAlunAlunWarungPojok(group) {
    const warung = new THREE.Group();
    warung.name = "Warung Pojok Hj. Nurul · Google Street View 360";
    warung.position.set(-23.02, 0.05, 25.64);
    warung.rotation.y = 0.199;

    const wallMaterial = toonMaterial({ color: 0xe3dfd4 });
    const agedWallMaterial = toonMaterial({ color: 0xbcb8aa });
    const reliefMaterial = toonMaterial({ color: 0xc9c2aa });
    const trimMaterial = toonMaterial({ color: 0x7f362d });
    const darkTrimMaterial = toonMaterial({ color: 0x512b28 });
    const glassMaterial = toonMaterial({ color: 0x27393a });
    const glassHighlightMaterial = toonMaterial({ color: 0x536665 });
    const awningMaterial = toonMaterial({ color: 0x337760 });
    const awningStripeMaterial = toonMaterial({ color: 0xd9d2b8 });
    const blueMaterial = toonMaterial({ color: 0x2788c4 });
    const yellowMaterial = toonMaterial({ color: 0xd5b65e });
    const foundationMaterial = toonMaterial({ color: 0x555a55 });
    const roofMaterial = toonMaterial({ color: 0x77766d });
    const roofEdgeMaterial = toonMaterial({ color: 0x4d504b });
    const postMaterial = toonMaterial({ color: 0x87634b });
    const blackMaterial = toonMaterial({ color: 0x252928 });
    const redMaterial = toonMaterial({ color: 0xb34336 });
    const muralBaseMaterial = toonMaterial({ color: 0xaaa99e });
    const muralRedMaterial = toonMaterial({ color: 0xa6534b });
    const muralGreenMaterial = toonMaterial({ color: 0x4e7d68 });
    const muralDarkMaterial = toonMaterial({ color: 0x3d4644 });

    const addFrontLabel = (
      parent,
      text,
      width,
      height,
      x,
      y,
      z,
      color,
      fontWeight = 850,
    ) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        getSitubondoSignMaterial(text, color, fontWeight),
      );
      label.position.set(x, y, z);
      label.rotation.y = Math.PI * 0.5;
      label.renderOrder = 5;
      parent.add(label);
      return label;
    };

    const addSideLabel = (
      parent,
      text,
      width,
      height,
      x,
      y,
      z,
      color,
      fontWeight = 850,
    ) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        getSitubondoSignMaterial(text, color, fontWeight),
      );
      label.position.set(x, y, z);
      label.renderOrder = 5;
      parent.add(label);
      return label;
    };

    const foundation = new THREE.Mesh(
      roundedBox(6.04, 0.08, 1.64, 0.025),
      foundationMaterial,
    );
    foundation.position.y = 0.04;
    warung.add(foundation);

    const restaurant = new THREE.Group();
    restaurant.name = "Warung Pojok corner dining room";
    restaurant.position.x = 1;
    restaurant.scale.y = 0.84;

    const restaurantBody = new THREE.Mesh(
      roundedBox(3.98, 0.58, 1.5, 0.035),
      wallMaterial,
    );
    restaurantBody.position.y = 0.36;
    restaurant.add(restaurantBody);
    const upperWall = new THREE.Mesh(
      roundedBox(3.86, 0.35, 1.43, 0.025),
      agedWallMaterial,
    );
    upperWall.position.set(0.01, 0.825, 0);
    restaurant.add(upperWall);
    const flatRoof = new THREE.Mesh(
      roundedBox(3.9, 0.035, 1.48, 0.018),
      roofMaterial,
    );
    flatRoof.position.set(0.01, 1.018, 0);
    restaurant.add(flatRoof);

    const addStreetWindow = (north, width) => {
      const outerFrame = new THREE.Mesh(
        roundedBox(width + 0.08, 0.52, 0.06, 0.012),
        trimMaterial,
      );
      outerFrame.position.set(north, 0.38, 0.767);
      restaurant.add(outerFrame);
      const glass = new THREE.Mesh(
        roundedBox(width, 0.43, 0.032, 0.008),
        glassMaterial,
      );
      glass.position.set(north, 0.38, 0.8);
      restaurant.add(glass);
      const transom = new THREE.Mesh(
        roundedBox(width - 0.04, 0.035, 0.025, 0.006),
        trimMaterial,
      );
      transom.position.set(north, 0.52, 0.823);
      restaurant.add(transom);
      const mullion = new THREE.Mesh(
        roundedBox(0.035, 0.41, 0.025, 0.006),
        trimMaterial,
      );
      mullion.position.set(north, 0.37, 0.823);
      restaurant.add(mullion);
      [-0.17, 0.17].forEach((offset, index) => {
        const highlight = new THREE.Mesh(
          roundedBox(width * 0.34, 0.025, 0.018, 0.004),
          index === 0 ? redMaterial : glassHighlightMaterial,
        );
        highlight.position.set(
          north + offset * width,
          0.29 + index * 0.07,
          0.827,
        );
        highlight.rotation.z = index === 0 ? 0.14 : -0.1;
        restaurant.add(highlight);
      });
    };
    addStreetWindow(-1.5, 0.72);
    addStreetWindow(-0.58, 0.96);
    addStreetWindow(1.23, 0.94);

    const sideDoorFrame = new THREE.Mesh(
      roundedBox(0.48, 0.56, 0.06, 0.012),
      trimMaterial,
    );
    sideDoorFrame.position.set(0.32, 0.35, 0.767);
    restaurant.add(sideDoorFrame);
    const sideDoor = new THREE.Mesh(
      roundedBox(0.4, 0.5, 0.032, 0.008),
      darkTrimMaterial,
    );
    sideDoor.position.set(0.32, 0.34, 0.8);
    restaurant.add(sideDoor);

    const frontDoorFrame = new THREE.Mesh(
      roundedBox(0.06, 0.58, 0.5, 0.012),
      trimMaterial,
    );
    frontDoorFrame.position.set(2.005, 0.36, 0.29);
    restaurant.add(frontDoorFrame);
    const frontDoor = new THREE.Mesh(
      roundedBox(0.032, 0.51, 0.42, 0.008),
      darkTrimMaterial,
    );
    frontDoor.position.set(2.038, 0.35, 0.29);
    restaurant.add(frontDoor);

    const sideCanopy = new THREE.Mesh(
      roundedBox(4.3, 0.055, 0.48, 0.018),
      awningMaterial,
    );
    sideCanopy.position.set(0.01, 0.675, 0.93);
    restaurant.add(sideCanopy);
    const sideValance = new THREE.Mesh(
      roundedBox(4.32, 0.105, 0.04, 0.01),
      awningMaterial,
    );
    sideValance.position.set(0.01, 0.62, 1.165);
    restaurant.add(sideValance);
    for (let north = -2.08; north <= 2.08; north += 0.28) {
      const stripe = new THREE.Mesh(
        roundedBox(0.12, 0.108, 0.023, 0.005),
        awningStripeMaterial,
      );
      stripe.position.set(north, 0.62, 1.189);
      restaurant.add(stripe);
    }
    for (let north = -1.98; north <= 1.98; north += 0.34) {
      const seam = new THREE.Mesh(
        roundedBox(0.022, 0.01, 0.46, 0.004),
        awningStripeMaterial,
      );
      seam.position.set(north, 0.71, 0.93);
      restaurant.add(seam);
    }

    const frontCanopy = new THREE.Mesh(
      roundedBox(0.52, 0.055, 2.55, 0.018),
      awningMaterial,
    );
    frontCanopy.position.set(2.13, 0.675, -0.35);
    restaurant.add(frontCanopy);
    const frontValance = new THREE.Mesh(
      roundedBox(0.04, 0.105, 2.57, 0.01),
      awningMaterial,
    );
    frontValance.position.set(2.39, 0.62, -0.35);
    restaurant.add(frontValance);
    for (let east = -1.5; east <= 0.82; east += 0.28) {
      const stripe = new THREE.Mesh(
        roundedBox(0.023, 0.108, 0.12, 0.005),
        awningStripeMaterial,
      );
      stripe.position.set(2.414, 0.62, east);
      restaurant.add(stripe);
    }

    [
      [-2.04, 1.16],
      [2.05, 1.16],
      [2.4, -1.5],
    ].forEach(([north, east]) => {
      const canopyPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.026, 0.65, 7),
        postMaterial,
      );
      canopyPost.position.set(north, 0.34, east);
      restaurant.add(canopyPost);
    });

    for (let north = -1.72; north <= 1.72; north += 0.34) {
      const diamond = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.16),
        reliefMaterial,
      );
      diamond.position.set(north, 0.83, 0.721);
      diamond.rotation.z = Math.PI * 0.25;
      restaurant.add(diamond);
    }
    for (let north = -1.72; north <= 1.72; north += 0.34) {
      const reliefRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.012, 4, 12),
        reliefMaterial,
      );
      reliefRing.position.set(north, 0.7, 0.724);
      restaurant.add(reliefRing);
    }
    for (let east = -0.5; east <= 0.5; east += 0.28) {
      const diamond = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.15),
        reliefMaterial,
      );
      diamond.position.set(1.946, 0.82, east);
      diamond.rotation.y = Math.PI * 0.5;
      diamond.rotation.z = Math.PI * 0.25;
      restaurant.add(diamond);
    }

    const mainSign = new THREE.Mesh(
      roundedBox(1.24, 0.27, 0.045, 0.015),
      blueMaterial,
    );
    mainSign.position.set(1.29, 0.91, 0.744);
    restaurant.add(mainSign);
    addSideLabel(
      restaurant,
      "WARUNG POJOK",
      1.02,
      0.13,
      1.29,
      0.94,
      0.77,
      "#f0eee6",
      900,
    );
    addSideLabel(
      restaurant,
      "Pilih Indonesia",
      0.76,
      0.065,
      1.29,
      0.845,
      0.772,
      "#f0eee6",
      760,
    );
    const signIcon = new THREE.Mesh(
      roundedBox(0.09, 0.18, 0.025, 0.012),
      wallMaterial,
    );
    signIcon.position.set(0.77, 0.91, 0.772);
    restaurant.add(signIcon);

    const sideSign = new THREE.Mesh(
      roundedBox(0.045, 0.32, 0.43, 0.012),
      yellowMaterial,
    );
    sideSign.position.set(2.043, 0.49, -0.22);
    restaurant.add(sideSign);
    addFrontLabel(
      restaurant,
      "WARUNG",
      0.34,
      0.09,
      2.07,
      0.55,
      -0.22,
      "#334746",
      820,
    );
    addFrontLabel(
      restaurant,
      "POJOK",
      0.34,
      0.13,
      2.072,
      0.44,
      -0.22,
      "#b34336",
      900,
    );
    const cornerVent = new THREE.Mesh(
      roundedBox(0.035, 0.13, 0.09, 0.008),
      blackMaterial,
    );
    cornerVent.position.set(2.071, 0.71, -0.22);
    restaurant.add(cornerVent);

    mergeDirectMeshesByMaterial(restaurant);
    warung.add(restaurant);

    const rearWing = new THREE.Group();
    rearWing.name = "Warung Pojok weathered rear wing";
    rearWing.position.set(-2.03, 0, 0);
    rearWing.scale.y = 0.88;

    const rearBody = new THREE.Mesh(
      roundedBox(2.02, 0.66, 1.46, 0.025),
      agedWallMaterial,
    );
    rearBody.position.y = 0.4;
    rearWing.add(rearBody);
    const rearUpper = new THREE.Mesh(
      roundedBox(1.92, 0.18, 1.38, 0.018),
      wallMaterial,
    );
    rearUpper.position.set(-0.03, 0.79, 0);
    rearWing.add(rearUpper);
    const rearRoof = new THREE.Mesh(
      roundedBox(2.12, 0.065, 1.56, 0.014),
      roofMaterial,
    );
    rearRoof.position.y = 0.93;
    rearRoof.rotation.z = -0.035;
    rearWing.add(rearRoof);
    const rearEave = new THREE.Mesh(
      roundedBox(2.16, 0.07, 1.55, 0.014),
      roofEdgeMaterial,
    );
    rearEave.position.y = 0.72;
    rearWing.add(rearEave);

    const muralPanel = new THREE.Mesh(
      roundedBox(1.86, 0.64, 0.045, 0.008),
      muralBaseMaterial,
    );
    muralPanel.position.set(0.02, 0.38, 0.753);
    rearWing.add(muralPanel);
    [
      [-0.62, 0.36, 0.3, 0.24, muralDarkMaterial, -0.22],
      [-0.18, 0.42, 0.38, 0.32, muralGreenMaterial, 0.2],
      [0.26, 0.38, 0.34, 0.36, muralRedMaterial, -0.16],
      [0.67, 0.46, 0.27, 0.25, muralDarkMaterial, 0.24],
    ].forEach(([north, height, width, panelHeight, material, rotation]) => {
      const muralShape = new THREE.Mesh(
        roundedBox(width, panelHeight, 0.025, 0.012),
        material,
      );
      muralShape.position.set(north, height - 0.06, 0.785);
      muralShape.rotation.z = rotation;
      rearWing.add(muralShape);
    });
    [-0.72, -0.22, 0.32, 0.72].forEach((north, index) => {
      const muralLine = new THREE.Mesh(
        roundedBox(0.36, 0.025, 0.02, 0.004),
        index % 2 === 0 ? blackMaterial : redMaterial,
      );
      muralLine.position.set(north, 0.24 + (index % 2) * 0.17, 0.805);
      muralLine.rotation.z = index % 2 === 0 ? 0.42 : -0.38;
      rearWing.add(muralLine);
    });

    const rearDoorFrame = new THREE.Mesh(
      roundedBox(0.48, 0.67, 0.065, 0.01),
      trimMaterial,
    );
    rearDoorFrame.position.set(0.78, 0.36, 0.758);
    rearWing.add(rearDoorFrame);
    const rearDoor = new THREE.Mesh(
      roundedBox(0.4, 0.59, 0.035, 0.008),
      darkTrimMaterial,
    );
    rearDoor.position.set(0.78, 0.35, 0.795);
    rearWing.add(rearDoor);

    [-0.62, 0.08, 0.65].forEach((north, index) => {
      const upperVent = new THREE.Mesh(
        roundedBox(0.28, 0.1, 0.035, 0.008),
        index === 1 ? glassHighlightMaterial : blackMaterial,
      );
      upperVent.position.set(north, 0.63 + (index % 2) * 0.04, 0.748);
      rearWing.add(upperVent);
    });

    const rearSideAwning = new THREE.Mesh(
      roundedBox(2.17, 0.065, 0.28, 0.014),
      roofEdgeMaterial,
    );
    rearSideAwning.position.set(0, 0.65, 0.84);
    rearWing.add(rearSideAwning);
    mergeDirectMeshesByMaterial(rearWing);
    warung.add(rearWing);

    warung.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(warung);
    return warung;
  }

  function addAlunAlunSdAlAbror(group) {
    const school = new THREE.Group();
    school.name = "SD Islam Al-Abror · Google Street View 360";
    school.position.set(2.9, 0.05, -20.99);
    school.rotation.y = AL_ABROR_ROAD_YAW;

    const tealMaterial = toonMaterial({ color: 0x187a73 });
    const darkTealMaterial = toonMaterial({ color: 0x153f3d });
    const limeMaterial = toonMaterial({ color: 0x70c93c });
    const limeTrimMaterial = toonMaterial({ color: 0x3f9b48 });
    const orangeMaterial = toonMaterial({ color: 0xe76342 });
    const paleMaterial = toonMaterial({ color: 0xf0ead9 });
    const creamMaterial = toonMaterial({ color: 0xe5d9b6 });
    const beigeMaterial = toonMaterial({ color: 0xc9c2ab });
    const glassMaterial = toonMaterial({ color: 0x294d4e });
    const frameMaterial = toonMaterial({ color: 0xd8d1b9 });
    const darkMaterial = toonMaterial({ color: 0x252d2d });
    const stoneMaterial = toonMaterial({ color: 0x51595a });
    const stoneLightMaterial = toonMaterial({ color: 0x72797a });
    const goldMaterial = toonMaterial({ color: 0xc8ad55 });
    const greenFenceMaterial = toonMaterial({ color: 0x27705b });
    const redRoofMaterial = toonMaterial({ color: 0x98483a });
    const redGableRoofMaterial = toonMaterial({ color: 0x98483a });
    const roofCourseMaterial = toonMaterial({ color: 0x723832 });
    const woodMaterial = toonMaterial({ color: 0x76513e });
    const posterMaterial = toonMaterial({ color: 0x476f76 });

    const courtyard = new THREE.Mesh(
      roundedBox(7.25, 0.06, 1.45, 0.018),
      paleMaterial,
    );
    courtyard.position.set(0.38, 0.03, 0.62);
    courtyard.receiveShadow = true;
    school.add(courtyard);

    const frontBody = new THREE.Mesh(
      roundedBox(5.15, 1.58, 3.2, 0.045),
      tealMaterial,
    );
    frontBody.position.set(0.45, 0.79, -1.55);
    school.add(frontBody);
    const southBlock = new THREE.Mesh(
      roundedBox(1.36, 1.98, 3.55, 0.045),
      beigeMaterial,
    );
    southBlock.position.set(-2.45, 0.99, -2.55);
    school.add(southBlock);
    const upperFront = new THREE.Mesh(
      roundedBox(4.95, 0.58, 0.08, 0.016),
      darkTealMaterial,
    );
    upperFront.position.set(0.48, 1.31, 0.075);
    school.add(upperFront);
    const floorBand = new THREE.Mesh(
      roundedBox(5.28, 0.09, 3.32, 0.018),
      paleMaterial,
    );
    floorBand.position.set(0.45, 0.89, -1.55);
    school.add(floorBand);

    const addFrontWindow = (north, height, width, windowHeight) => {
      const frame = new THREE.Mesh(
        roundedBox(width + 0.1, windowHeight + 0.1, 0.065, 0.012),
        frameMaterial,
      );
      frame.position.set(north, height, 0.095);
      school.add(frame);
      const glass = new THREE.Mesh(
        roundedBox(width, windowHeight, 0.04, 0.009),
        glassMaterial,
      );
      glass.position.set(north, height, 0.135);
      school.add(glass);
      [-0.24, 0, 0.24].forEach((verticalProgress) => {
        const verticalBar = new THREE.Mesh(
          roundedBox(0.025, windowHeight - 0.06, 0.025, 0.006),
          frameMaterial,
        );
        verticalBar.position.set(
          north + verticalProgress * width,
          height,
          0.162,
        );
        school.add(verticalBar);
      });
      [-0.2, 0.2].forEach((horizontalProgress) => {
        const horizontalBar = new THREE.Mesh(
          roundedBox(width - 0.06, 0.025, 0.025, 0.006),
          frameMaterial,
        );
        horizontalBar.position.set(
          north,
          height + horizontalProgress * windowHeight,
          0.162,
        );
        school.add(horizontalBar);
      });
    };

    [0.72, 1.58, 2.44].forEach((north) =>
      addFrontWindow(north, 0.51, 0.62, 0.42),
    );
    [-1.45, -0.72, 0.72, 1.52, 2.32].forEach((north) =>
      addFrontWindow(north, 1.34, 0.52, 0.36),
    );
    [0.25, 1.15, 2.05, 2.95].forEach((north) => {
      const groundColumn = new THREE.Mesh(
        roundedBox(0.12, 0.78, 0.14, 0.016),
        orangeMaterial,
      );
      groundColumn.position.set(north, 0.47, 0.14);
      school.add(groundColumn);
    });
    [0.1, 1.2, 2.3].forEach((north) => {
      const upperColumn = new THREE.Mesh(
        roundedBox(0.12, 0.58, 0.14, 0.016),
        orangeMaterial,
      );
      upperColumn.position.set(north, 1.32, 0.14);
      school.add(upperColumn);
    });

    const balconyFloor = new THREE.Mesh(
      roundedBox(3.65, 0.09, 0.56, 0.018),
      paleMaterial,
    );
    balconyFloor.position.set(1.22, 1.01, 0.2);
    school.add(balconyFloor);
    const balconyParapet = new THREE.Mesh(
      roundedBox(3.55, 0.31, 0.14, 0.018),
      tealMaterial,
    );
    balconyParapet.position.set(1.22, 1.19, 0.42);
    school.add(balconyParapet);
    [1.47, 1.68].forEach((height) => {
      const balconyRail = new THREE.Mesh(
        roundedBox(3.4, 0.035, 0.035, 0.007),
        stoneLightMaterial,
      );
      balconyRail.position.set(1.22, height, 0.44);
      school.add(balconyRail);
    });
    for (let north = -0.38; north <= 2.82; north += 0.32) {
      const balconyPicket = new THREE.Mesh(
        roundedBox(0.03, 0.28, 0.03, 0.007),
        stoneLightMaterial,
      );
      balconyPicket.position.set(north, 1.56, 0.44);
      school.add(balconyPicket);
    }

    const doorway = new THREE.Mesh(
      roundedBox(0.86, 0.78, 0.06, 0.014),
      darkMaterial,
    );
    doorway.position.set(-0.42, 0.49, 0.13);
    school.add(doorway);
    [-1.12, 0.3].forEach((north) => {
      const trophyCase = new THREE.Mesh(
        roundedBox(0.42, 0.72, 0.08, 0.014),
        woodMaterial,
      );
      trophyCase.position.set(north, 0.5, 0.18);
      school.add(trophyCase);
      for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < 2; columnIndex += 1) {
          const trophy = new THREE.Mesh(
            new THREE.CircleGeometry(0.035, 9),
            goldMaterial,
          );
          trophy.position.set(
            north + (columnIndex - 0.5) * 0.18,
            0.31 + rowIndex * 0.17,
            0.226,
          );
          school.add(trophy);
        }
      }
    });
    [-1.62, -0.7, 0.22, 1.06].forEach((north) => {
      const entranceColumn = new THREE.Mesh(
        roundedBox(0.16, 1.14, 0.18, 0.018),
        orangeMaterial,
      );
      entranceColumn.position.set(north, 0.57, 0.48);
      school.add(entranceColumn);
    });
    const entranceCeiling = new THREE.Mesh(
      roundedBox(2.92, 0.1, 1.02, 0.018),
      paleMaterial,
    );
    entranceCeiling.position.set(-0.3, 1.15, 0.42);
    school.add(entranceCeiling);

    const createMarqueeShape = (scale = 1) => {
      const shape = new THREE.Shape();
      shape.moveTo(-1.4 * scale, -0.38 * scale);
      shape.lineTo(1.4 * scale, -0.38 * scale);
      shape.lineTo(1.4 * scale, 0.29 * scale);
      shape.lineTo(1.02 * scale, 0.46 * scale);
      shape.lineTo(-1.02 * scale, 0.46 * scale);
      shape.lineTo(-1.4 * scale, 0.29 * scale);
      shape.closePath();
      return shape;
    };
    const marqueeBorder = new THREE.Mesh(
      new THREE.ExtrudeGeometry(createMarqueeShape(1.04), {
        depth: 0.08,
        bevelEnabled: false,
      }),
      paleMaterial,
    );
    marqueeBorder.position.set(-0.3, 1.57, 0.39);
    school.add(marqueeBorder);
    const marqueeFace = new THREE.Mesh(
      new THREE.ExtrudeGeometry(createMarqueeShape(), {
        depth: 0.07,
        bevelEnabled: false,
      }),
      tealMaterial,
    );
    marqueeFace.position.set(-0.3, 1.57, 0.48);
    school.add(marqueeFace);
    const crestOuter = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 18),
      limeTrimMaterial,
    );
    crestOuter.position.set(-0.3, 1.83, 0.57);
    school.add(crestOuter);
    const crestMiddle = new THREE.Mesh(
      new THREE.CircleGeometry(0.145, 18),
      goldMaterial,
    );
    crestMiddle.position.set(-0.3, 1.83, 0.575);
    school.add(crestMiddle);
    const crestInner = new THREE.Mesh(
      new THREE.CircleGeometry(0.095, 16),
      paleMaterial,
    );
    crestInner.position.set(-0.3, 1.83, 0.58);
    school.add(crestInner);
    const titleLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.28, 0.25),
      getSitubondoSignMaterial("SD ISLAM AL-ABROR", "#eadb9f", 880),
    );
    titleLabel.position.set(-0.3, 1.55, 0.585);
    school.add(titleLabel);
    const cityLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.34, 0.25),
      getSitubondoSignMaterial("SITUBONDO", "#ef684d", 900),
    );
    cityLabel.position.set(-0.3, 1.31, 0.588);
    school.add(cityLabel);

    const mainRoof = new THREE.Mesh(
      createHippedRoofGeometry(5.58, 3.62, 0.54, 0.96),
      redRoofMaterial,
    );
    mainRoof.position.set(0.45, 1.58, -1.55);
    school.add(mainRoof);
    const mainEave = new THREE.Mesh(
      roundedBox(5.72, 0.07, 3.76, 0.014),
      roofCourseMaterial,
    );
    mainEave.position.set(0.45, 1.59, -1.55);
    school.add(mainEave);
    const mainRoofSlope = Math.atan2(0.54, 1.81);
    for (let rowIndex = 1; rowIndex <= 7; rowIndex += 1) {
      const progress = rowIndex / 8;
      const courseLength = 5.58 - progress * 1.92;
      [-1, 1].forEach((side) => {
        const roofCourse = new THREE.Mesh(
          roundedBox(courseLength, 0.012, 0.024, 0.004),
          roofCourseMaterial,
        );
        roofCourse.position.set(
          0.45,
          1.59 + progress * 0.54,
          -1.55 + side * 1.81 * (1 - progress),
        );
        roofCourse.rotation.x = side * mainRoofSlope;
        school.add(roofCourse);
      });
    }
    const mainRidge = new THREE.Mesh(
      roundedBox(3.72, 0.04, 0.055, 0.008),
      roofCourseMaterial,
    );
    mainRidge.position.set(0.45, 2.14, -1.55);
    school.add(mainRidge);

    const limeTower = new THREE.Mesh(
      roundedBox(0.92, 2.02, 1.38, 0.035),
      limeMaterial,
    );
    limeTower.position.set(-2.42, 1.01, -0.72);
    school.add(limeTower);
    const limeTowerStrip = new THREE.Mesh(
      roundedBox(0.12, 1.9, 1.42, 0.018),
      limeTrimMaterial,
    );
    limeTowerStrip.position.set(-2.83, 1.02, -0.72);
    school.add(limeTowerStrip);
    const towerWindow = new THREE.Mesh(
      roundedBox(0.32, 0.78, 0.055, 0.012),
      glassMaterial,
    );
    towerWindow.position.set(-2.42, 1.15, -0.005);
    school.add(towerWindow);
    const towerCap = new THREE.Mesh(
      roundedBox(1.12, 0.13, 1.55, 0.018),
      paleMaterial,
    );
    towerCap.position.set(-2.42, 2.03, -0.72);
    school.add(towerCap);
    const towerCrown = new THREE.Mesh(
      roundedBox(1.0, 0.34, 1.4, 0.018),
      paleMaterial,
    );
    towerCrown.position.set(-2.42, 2.24, -0.72);
    school.add(towerCrown);
    [-2.65, -2.19].forEach((north) => {
      const crownDiamond = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        limeTrimMaterial,
      );
      crownDiamond.position.set(north, 2.24, 0.005);
      crownDiamond.rotation.z = Math.PI * 0.25;
      school.add(crownDiamond);
    });

    const southWindow = new THREE.Mesh(
      roundedBox(0.38, 0.92, 0.055, 0.012),
      glassMaterial,
    );
    southWindow.position.set(-2.45, 1.18, -0.75);
    school.add(southWindow);
    const southRoof = new THREE.Mesh(
      roundedBox(1.5, 0.12, 3.7, 0.018),
      stoneLightMaterial,
    );
    southRoof.position.set(-2.45, 2.0, -2.55);
    school.add(southRoof);

    const northAnnex = new THREE.Mesh(
      roundedBox(1.78, 0.94, 2.12, 0.035),
      tealMaterial,
    );
    northAnnex.position.set(3.32, 0.47, -0.92);
    school.add(northAnnex);
    const annexRoofTrim = new THREE.Mesh(
      createGableRoofGeometry(2.02, 2.34, 0.5),
      paleMaterial,
    );
    annexRoofTrim.position.set(3.32, 0.93, -0.92);
    school.add(annexRoofTrim);
    const annexRoof = new THREE.Mesh(
      createGableRoofGeometry(1.82, 2.14, 0.43),
      redGableRoofMaterial,
    );
    annexRoof.position.set(3.32, 0.97, -0.92);
    school.add(annexRoof);
    const annexGableShape = new THREE.Shape();
    annexGableShape.moveTo(-0.8, 0);
    annexGableShape.lineTo(0.8, 0);
    annexGableShape.lineTo(0, 0.4);
    annexGableShape.closePath();
    const annexGableFace = new THREE.Mesh(
      new THREE.ShapeGeometry(annexGableShape),
      tealMaterial,
    );
    annexGableFace.position.set(3.32, 0.95, 0.272);
    school.add(annexGableFace);
    const annexDoor = new THREE.Mesh(
      roundedBox(0.48, 0.62, 0.055, 0.012),
      woodMaterial,
    );
    annexDoor.position.set(2.96, 0.38, 0.165);
    school.add(annexDoor);
    const portraitPanel = new THREE.Mesh(
      roundedBox(0.54, 0.7, 0.05, 0.012),
      posterMaterial,
    );
    portraitPanel.position.set(3.58, 0.52, 0.17);
    school.add(portraitPanel);
    const portraitHead = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 14),
      paleMaterial,
    );
    portraitHead.position.set(3.58, 0.62, 0.203);
    school.add(portraitHead);
    const portraitLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.09),
      getSitubondoSignMaterial("K.H. AS'AD", "#eee7d8", 760),
    );
    portraitLabel.position.set(3.58, 0.27, 0.205);
    school.add(portraitLabel);
    const acUnit = new THREE.Mesh(
      roundedBox(0.32, 0.25, 0.12, 0.025),
      paleMaterial,
    );
    acUnit.position.set(4.02, 0.63, 0.19);
    school.add(acUnit);
    const acFan = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.012, 6, 12),
      darkMaterial,
    );
    acFan.position.set(4.02, 0.63, 0.257);
    school.add(acFan);

    const northAwning = new THREE.Mesh(
      roundedBox(3.2, 0.08, 0.64, 0.014),
      darkMaterial,
    );
    northAwning.position.set(1.55, 1.01, 0.33);
    northAwning.rotation.x = 0.07;
    school.add(northAwning);
    const southAwning = new THREE.Mesh(
      roundedBox(1.12, 0.08, 0.62, 0.014),
      darkMaterial,
    );
    southAwning.position.set(-2.13, 0.95, 0.2);
    southAwning.rotation.x = 0.07;
    school.add(southAwning);
    for (let north = -2.6; north <= 3.05; north += 0.3) {
      const awningSeam = new THREE.Mesh(
        roundedBox(0.025, 0.018, 0.64, 0.004),
        stoneLightMaterial,
      );
      awningSeam.position.set(north, north < -1.65 ? 1.0 : 1.06, 0.33);
      awningSeam.rotation.x = 0.07;
      school.add(awningSeam);
    }

    const addFencePanel = (north, width, hasBase = true) => {
      if (hasBase) {
        const base = new THREE.Mesh(
          roundedBox(width, 0.25, 0.17, 0.02),
          creamMaterial,
        );
        base.position.set(north, 0.125, 1.28);
        school.add(base);
        [0.07, 0.14, 0.21].forEach((height) => {
          const baseGroove = new THREE.Mesh(
            roundedBox(width - 0.05, 0.015, 0.018, 0.004),
            stoneLightMaterial,
          );
          baseGroove.position.set(north, height, 1.372);
          school.add(baseGroove);
        });
      }
      const panelCenterHeight = hasBase ? 0.46 : 0.35;
      const middleRail = new THREE.Mesh(
        roundedBox(width, 0.025, 0.025, 0.006),
        greenFenceMaterial,
      );
      middleRail.position.set(north, panelCenterHeight, 1.323);
      school.add(middleRail);
      for (
        let offset = -width * 0.5 + 0.08;
        offset <= width * 0.5 - 0.08;
        offset += 0.2
      ) {
        const meshPicket = new THREE.Mesh(
          roundedBox(0.025, 0.3, 0.025, 0.006),
          greenFenceMaterial,
        );
        meshPicket.position.set(north + offset, panelCenterHeight, 1.323);
        school.add(meshPicket);
      }
      [hasBase ? 0.29 : 0.18, hasBase ? 0.63 : 0.52].forEach((height) => {
        const rail = new THREE.Mesh(
          roundedBox(width + 0.03, 0.04, 0.04, 0.009),
          goldMaterial,
        );
        rail.position.set(north, height, 1.342);
        school.add(rail);
      });
      const diagonalLength = Math.hypot(width, 0.3);
      const diagonalAngle = Math.atan2(0.3, width);
      [-1, 1].forEach((side) => {
        const diagonal = new THREE.Mesh(
          roundedBox(diagonalLength, 0.025, 0.025, 0.005),
          goldMaterial,
        );
        diagonal.position.set(north, panelCenterHeight, 1.35);
        diagonal.rotation.z = side * diagonalAngle;
        school.add(diagonal);
      });
      const medallion = new THREE.Mesh(
        new THREE.CircleGeometry(0.075, 12),
        goldMaterial,
      );
      medallion.position.set(north, panelCenterHeight, 1.368);
      school.add(medallion);
    };

    addFencePanel(-2.57, 1.52);
    addFencePanel(2.66, 3.2);
    addFencePanel(-1.02, 1.25, false);
    addFencePanel(0.3, 1.25, false);
    [-3.38, -1.75, -0.36, 1.02, 4.32].forEach((north) => {
      const pillar = new THREE.Mesh(
        roundedBox(0.28, 0.76, 0.32, 0.025),
        stoneMaterial,
      );
      pillar.position.set(north, 0.38, 1.27);
      school.add(pillar);
      const pillarCap = new THREE.Mesh(
        roundedBox(0.34, 0.08, 0.38, 0.018),
        stoneLightMaterial,
      );
      pillarCap.position.set(north, 0.79, 1.27);
      school.add(pillarCap);
    });

    school.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(school);
    group.add(school);
    return school;
  }

  function addAlunAlunSdNegeri6Dawuhan(group) {
    const school = new THREE.Group();
    school.name = "SD Negeri 6 Dawuhan · Google Street View 360";
    school.position.set(2.24, 0.05, -36.86);

    const skyBlueMaterial = toonMaterial({ color: 0x73c3d0 });
    const turquoiseMaterial = toonMaterial({ color: 0x4caebc });
    const paleYellowMaterial = toonMaterial({ color: 0xe5e19a });
    const darkBlueMaterial = toonMaterial({ color: 0x19599a });
    const terracottaMaterial = toonMaterial({ color: 0xc25f43 });
    const greenMaterial = toonMaterial({ color: 0x5ab64a });
    const deepGreenMaterial = toonMaterial({ color: 0x2f793b });
    const glassMaterial = toonMaterial({ color: 0x26494c });
    const whiteMaterial = toonMaterial({ color: 0xe9eae4 });
    const tileMaterial = toonMaterial({ color: 0xe5e5dc });
    const courtyardMaterial = toonMaterial({ color: 0xa5a69d });
    const courtyardDarkMaterial = toonMaterial({ color: 0x8c8e88 });
    const redRoofMaterial = toonMaterial({ color: 0xa24d39 });
    const redRoofLightMaterial = toonMaterial({ color: 0xb9664b });
    const roofCourseMaterial = toonMaterial({ color: 0x753831 });
    const weatheredWallMaterial = toonMaterial({ color: 0xc8cbc5 });
    const corrugatedMaterial = toonMaterial({ color: 0x747b79 });
    const corrugatedLightMaterial = toonMaterial({ color: 0x9ba09c });
    const woodMaterial = toonMaterial({ color: 0x9a744e });
    const silverMaterial = toonMaterial({ color: 0x9ba2a0 });
    const redGateMaterial = toonMaterial({ color: 0xc43c3e });
    const blueDoorMaterial = toonMaterial({ color: 0x245899 });
    const yellowMaterial = toonMaterial({ color: 0xe1b848 });
    const darkMaterial = toonMaterial({ color: 0x262b2a });

    const addEastWindow = (
      north,
      east,
      y,
      width = 0.62,
      height = 0.34,
      frameMaterial = greenMaterial,
      paneMaterial = glassMaterial,
    ) => {
      const frame = new THREE.Mesh(
        roundedBox(width + 0.1, height + 0.1, 0.055, 0.009),
        frameMaterial,
      );
      frame.position.set(north, y, east);
      school.add(frame);
      const pane = new THREE.Mesh(
        roundedBox(width, height, 0.032, 0.006),
        paneMaterial,
      );
      pane.position.set(north, y, east + 0.014);
      school.add(pane);
      [-0.25, 0.25].forEach((offset) => {
        const mullion = new THREE.Mesh(
          roundedBox(0.028, height + 0.025, 0.036, 0.004),
          frameMaterial,
        );
        mullion.position.set(north + offset * width, y, east + 0.03);
        school.add(mullion);
      });
      const rail = new THREE.Mesh(
        roundedBox(width + 0.025, 0.028, 0.036, 0.004),
        frameMaterial,
      );
      rail.position.set(north, y, east + 0.03);
      school.add(rail);
    };

    const addNorthWindow = (
      north,
      east,
      y,
      width = 0.64,
      height = 0.34,
      frameMaterial = greenMaterial,
      paneMaterial = glassMaterial,
    ) => {
      const frame = new THREE.Mesh(
        roundedBox(0.055, height + 0.1, width + 0.1, 0.009),
        frameMaterial,
      );
      frame.position.set(north, y, east);
      school.add(frame);
      const pane = new THREE.Mesh(
        roundedBox(0.032, height, width, 0.006),
        paneMaterial,
      );
      pane.position.set(north + 0.014, y, east);
      school.add(pane);
      [-0.25, 0.25].forEach((offset) => {
        const mullion = new THREE.Mesh(
          roundedBox(0.036, height + 0.025, 0.028, 0.004),
          frameMaterial,
        );
        mullion.position.set(north + 0.03, y, east + offset * width);
        school.add(mullion);
      });
      const rail = new THREE.Mesh(
        roundedBox(0.036, 0.028, width + 0.025, 0.004),
        frameMaterial,
      );
      rail.position.set(north + 0.03, y, east);
      school.add(rail);
    };

    const addEastDoor = (
      north,
      east,
      width = 0.3,
      height = 0.62,
      material = greenMaterial,
    ) => {
      const frame = new THREE.Mesh(
        roundedBox(width + 0.08, height + 0.06, 0.06, 0.009),
        deepGreenMaterial,
      );
      frame.position.set(north, 0.1 + height * 0.5, east);
      school.add(frame);
      const door = new THREE.Mesh(
        roundedBox(width, height, 0.035, 0.006),
        material,
      );
      door.position.set(north, 0.1 + height * 0.5, east + 0.018);
      school.add(door);
      [0.31, 0.69].forEach((progress) => {
        const panelRail = new THREE.Mesh(
          roundedBox(width - 0.04, 0.025, 0.038, 0.004),
          deepGreenMaterial,
        );
        panelRail.position.set(
          north,
          0.1 + height * progress,
          east + 0.038,
        );
        school.add(panelRail);
      });
    };

    const addNorthDoor = (
      north,
      east,
      width = 0.3,
      height = 0.62,
      material = greenMaterial,
    ) => {
      const frame = new THREE.Mesh(
        roundedBox(0.06, height + 0.06, width + 0.08, 0.009),
        deepGreenMaterial,
      );
      frame.position.set(north, 0.1 + height * 0.5, east);
      school.add(frame);
      const door = new THREE.Mesh(
        roundedBox(0.035, height, width, 0.006),
        material,
      );
      door.position.set(north + 0.018, 0.1 + height * 0.5, east);
      school.add(door);
      [0.31, 0.69].forEach((progress) => {
        const panelRail = new THREE.Mesh(
          roundedBox(0.038, 0.025, width - 0.04, 0.004),
          deepGreenMaterial,
        );
        panelRail.position.set(
          north + 0.038,
          0.1 + height * progress,
          east,
        );
        school.add(panelRail);
      });
    };

    const addNorthSouthRoof = (
      north,
      east,
      length,
      depth,
      baseY,
      rise,
    ) => {
      const roof = new THREE.Mesh(
        createGableRoofGeometry(depth + 0.24, length + 0.28, rise),
        redRoofMaterial,
      );
      roof.position.set(north, baseY, east);
      roof.rotation.y = Math.PI * 0.5;
      school.add(roof);
      const eave = new THREE.Mesh(
        roundedBox(length + 0.32, 0.055, depth + 0.28, 0.01),
        roofCourseMaterial,
      );
      eave.position.set(north, baseY, east);
      school.add(eave);
      const ridge = new THREE.Mesh(
        roundedBox(length + 0.18, 0.045, 0.06, 0.007),
        roofCourseMaterial,
      );
      ridge.position.set(north, baseY + rise, east);
      school.add(ridge);
      const slope = Math.atan2(rise, depth * 0.5 + 0.12);
      [0.34, 0.67].forEach((progress) => {
        [-1, 1].forEach((side) => {
          const course = new THREE.Mesh(
            roundedBox(length + 0.22, 0.018, 0.04, 0.004),
            redRoofLightMaterial,
          );
          course.position.set(
            north,
            baseY + rise * progress,
            east + side * (depth * 0.5 + 0.12) * (1 - progress),
          );
          course.rotation.x = side * slope;
          school.add(course);
        });
      });
    };

    const addEastWestRoof = (
      north,
      east,
      width,
      length,
      baseY,
      rise,
    ) => {
      const roof = new THREE.Mesh(
        createGableRoofGeometry(width + 0.24, length + 0.28, rise),
        redRoofMaterial,
      );
      roof.position.set(north, baseY, east);
      school.add(roof);
      const eave = new THREE.Mesh(
        roundedBox(width + 0.28, 0.055, length + 0.32, 0.01),
        roofCourseMaterial,
      );
      eave.position.set(north, baseY, east);
      school.add(eave);
      const ridge = new THREE.Mesh(
        roundedBox(0.06, 0.045, length + 0.18, 0.007),
        roofCourseMaterial,
      );
      ridge.position.set(north, baseY + rise, east);
      school.add(ridge);
      const slope = Math.atan2(rise, width * 0.5 + 0.12);
      [0.34, 0.67].forEach((progress) => {
        [-1, 1].forEach((side) => {
          const course = new THREE.Mesh(
            roundedBox(0.04, 0.018, length + 0.22, 0.004),
            redRoofLightMaterial,
          );
          course.position.set(
            north + side * (width * 0.5 + 0.12) * (1 - progress),
            baseY + rise * progress,
            east,
          );
          course.rotation.z = -side * slope;
          school.add(course);
        });
      });
    };

    const courtyard = new THREE.Mesh(
      roundedBox(5.35, 0.045, 4.45, 0.012),
      courtyardMaterial,
    );
    courtyard.position.set(2.05, 0.022, -0.12);
    courtyard.receiveShadow = true;
    school.add(courtyard);
    for (let north = -0.48; north <= 4.55; north += 0.17) {
      const paverJoint = new THREE.Mesh(
        roundedBox(0.006, 0.006, 4.28, 0.002),
        courtyardDarkMaterial,
      );
      paverJoint.position.set(north, 0.05, -0.12);
      school.add(paverJoint);
    }
    for (let east = -2.02; east <= 1.78; east += 0.14) {
      const paverJoint = new THREE.Mesh(
        roundedBox(5.15, 0.006, 0.006, 0.002),
        courtyardDarkMaterial,
      );
      paverJoint.position.set(2.05, 0.051, east);
      school.add(paverJoint);
    }

    const westRangeNorth = 0.45;
    const westRangeEast = -2.84;
    const westRangeLength = 8.1;
    const westRangeDepth = 1.52;
    const westFoundation = new THREE.Mesh(
      roundedBox(westRangeLength, 0.18, westRangeDepth, 0.018),
      terracottaMaterial,
    );
    westFoundation.position.set(westRangeNorth, 0.09, westRangeEast);
    school.add(westFoundation);
    const westBody = new THREE.Mesh(
      roundedBox(westRangeLength, 0.78, westRangeDepth, 0.03),
      skyBlueMaterial,
    );
    westBody.position.set(westRangeNorth, 0.5, westRangeEast);
    school.add(westBody);
    const westBand = new THREE.Mesh(
      roundedBox(westRangeLength - 0.08, 0.18, 0.045, 0.007),
      darkBlueMaterial,
    );
    westBand.position.set(westRangeNorth, 0.29, -2.055);
    school.add(westBand);
    const westCorridor = new THREE.Mesh(
      roundedBox(westRangeLength - 0.08, 0.05, 0.72, 0.012),
      tileMaterial,
    );
    westCorridor.position.set(westRangeNorth, 0.045, -1.7);
    westCorridor.receiveShadow = true;
    school.add(westCorridor);
    [-2.7, -1.35, 0, 1.35, 2.7, 4.0].forEach((bay, index) => {
      addEastWindow(bay - 0.17, -2.05, 0.6, 0.63, 0.34);
      addEastDoor(
        bay + 0.4,
        -2.045,
        0.29,
        0.62,
        index === 5 ? deepGreenMaterial : greenMaterial,
      );
    });
    [-3.52, -2.04, -0.57, 0.9, 2.37, 3.84, 4.43].forEach((north) => {
      const column = new THREE.Mesh(
        roundedBox(0.085, 0.75, 0.085, 0.009),
        turquoiseMaterial,
      );
      column.position.set(north, 0.43, -1.84);
      school.add(column);
    });
    const westFascia = new THREE.Mesh(
      roundedBox(westRangeLength + 0.05, 0.09, 0.08, 0.009),
      whiteMaterial,
    );
    westFascia.position.set(westRangeNorth, 0.87, -1.91);
    school.add(westFascia);
    addNorthSouthRoof(
      westRangeNorth,
      westRangeEast,
      westRangeLength,
      westRangeDepth,
      0.89,
      0.29,
    );

    const southOuterNorth = -3.55;
    const southOuterEast = -0.15;
    const southOuterWidth = 1.62;
    const southOuterLength = 6.5;
    const southOuterFoundation = new THREE.Mesh(
      roundedBox(southOuterWidth, 0.18, southOuterLength, 0.018),
      terracottaMaterial,
    );
    southOuterFoundation.position.set(southOuterNorth, 0.09, southOuterEast);
    school.add(southOuterFoundation);
    const southOuterBody = new THREE.Mesh(
      roundedBox(southOuterWidth, 0.8, southOuterLength, 0.03),
      paleYellowMaterial,
    );
    southOuterBody.position.set(southOuterNorth, 0.5, southOuterEast);
    school.add(southOuterBody);
    const southOuterBand = new THREE.Mesh(
      roundedBox(0.045, 0.18, southOuterLength - 0.08, 0.007),
      darkBlueMaterial,
    );
    southOuterBand.position.set(-2.72, 0.29, southOuterEast);
    school.add(southOuterBand);
    const southOuterCorridor = new THREE.Mesh(
      roundedBox(0.7, 0.05, southOuterLength - 0.08, 0.012),
      tileMaterial,
    );
    southOuterCorridor.position.set(-2.38, 0.045, southOuterEast);
    southOuterCorridor.receiveShadow = true;
    school.add(southOuterCorridor);
    [-2.72, -1.38, -0.04, 1.3, 2.62].forEach((bay, index) => {
      addNorthWindow(-2.72, bay - 0.17, 0.6, 0.62, 0.34);
      addNorthDoor(
        -2.715,
        bay + 0.39,
        0.29,
        0.62,
        index === 2 ? deepGreenMaterial : greenMaterial,
      );
    });
    [-3.14, -1.68, -0.22, 1.24, 2.7].forEach((east) => {
      const column = new THREE.Mesh(
        roundedBox(0.085, 0.75, 0.085, 0.009),
        turquoiseMaterial,
      );
      column.position.set(-2.5, 0.43, east);
      school.add(column);
    });
    const southOuterFascia = new THREE.Mesh(
      roundedBox(0.08, 0.09, southOuterLength + 0.05, 0.009),
      whiteMaterial,
    );
    southOuterFascia.position.set(-2.58, 0.88, southOuterEast);
    school.add(southOuterFascia);
    addEastWestRoof(
      southOuterNorth,
      southOuterEast,
      southOuterWidth,
      southOuterLength,
      0.9,
      0.28,
    );

    const southInnerNorth = -1.68;
    const southInnerEast = -0.82;
    const southInnerWidth = 1.2;
    const southInnerLength = 5.15;
    const southInnerFoundation = new THREE.Mesh(
      roundedBox(southInnerWidth, 0.18, southInnerLength, 0.018),
      terracottaMaterial,
    );
    southInnerFoundation.position.set(southInnerNorth, 0.09, southInnerEast);
    school.add(southInnerFoundation);
    const southInnerBody = new THREE.Mesh(
      roundedBox(southInnerWidth, 0.78, southInnerLength, 0.03),
      skyBlueMaterial,
    );
    southInnerBody.position.set(southInnerNorth, 0.49, southInnerEast);
    school.add(southInnerBody);
    const southInnerBand = new THREE.Mesh(
      roundedBox(0.045, 0.18, southInnerLength - 0.08, 0.007),
      darkBlueMaterial,
    );
    southInnerBand.position.set(-1.055, 0.29, southInnerEast);
    school.add(southInnerBand);
    const southInnerCorridor = new THREE.Mesh(
      roundedBox(0.66, 0.05, southInnerLength - 0.08, 0.012),
      tileMaterial,
    );
    southInnerCorridor.position.set(-0.72, 0.045, southInnerEast);
    southInnerCorridor.receiveShadow = true;
    school.add(southInnerCorridor);
    [-2.82, -1.6, -0.38, 0.84, 1.62].forEach((bay, index) => {
      addNorthWindow(-1.055, bay - 0.12, 0.59, 0.55, 0.32);
      if (index < 4) {
        addNorthDoor(-1.05, bay + 0.36, 0.27, 0.61, greenMaterial);
      }
    });
    addEastWestRoof(
      southInnerNorth,
      southInnerEast,
      southInnerWidth,
      southInnerLength,
      0.88,
      0.25,
    );

    [-2.0, 0.75].forEach((east) => {
      const acBody = new THREE.Mesh(
        roundedBox(0.12, 0.2, 0.34, 0.018),
        whiteMaterial,
      );
      acBody.position.set(-1.0, 0.73, east);
      school.add(acBody);
      const fan = new THREE.Mesh(
        new THREE.CircleGeometry(0.075, 12),
        corrugatedMaterial,
      );
      fan.position.set(-0.932, 0.73, east);
      fan.rotation.y = Math.PI * 0.5;
      school.add(fan);
    });

    const southRoadBody = new THREE.Mesh(
      roundedBox(3.4, 0.68, 0.72, 0.025),
      weatheredWallMaterial,
    );
    southRoadBody.position.set(-2.4, 0.35, 3.2);
    school.add(southRoadBody);
    const southRoadBase = new THREE.Mesh(
      roundedBox(3.38, 0.22, 0.055, 0.007),
      corrugatedLightMaterial,
    );
    southRoadBase.position.set(-2.4, 0.13, 3.575);
    school.add(southRoadBase);
    [-3.35, -1.22].forEach((north) => {
      addEastWindow(
        north,
        3.575,
        0.52,
        0.68,
        0.27,
        darkMaterial,
        darkMaterial,
      );
      for (let bar = -0.24; bar <= 0.24; bar += 0.12) {
        const grille = new THREE.Mesh(
          roundedBox(0.02, 0.29, 0.035, 0.003),
          corrugatedMaterial,
        );
        grille.position.set(north + bar, 0.52, 3.62);
        school.add(grille);
      }
    });
    const blueRoadDoor = new THREE.Mesh(
      roundedBox(0.5, 0.58, 0.045, 0.007),
      blueDoorMaterial,
    );
    blueRoadDoor.position.set(-2.24, 0.34, 3.59);
    school.add(blueRoadDoor);
    const blueRoadDoorTop = new THREE.Mesh(
      roundedBox(0.56, 0.07, 0.05, 0.007),
      darkMaterial,
    );
    blueRoadDoorTop.position.set(-2.24, 0.68, 3.59);
    school.add(blueRoadDoorTop);
    const southRoadRoof = new THREE.Mesh(
      roundedBox(3.64, 0.075, 1.02, 0.01),
      corrugatedMaterial,
    );
    southRoadRoof.position.set(-2.4, 0.73, 3.18);
    school.add(southRoadRoof);

    const northRoadWall = new THREE.Mesh(
      roundedBox(3.55, 0.58, 0.62, 0.025),
      weatheredWallMaterial,
    );
    northRoadWall.position.set(3.25, 0.3, 3.2);
    school.add(northRoadWall);
    const northRoadPatch = new THREE.Mesh(
      roundedBox(0.48, 0.56, 0.045, 0.008),
      silverMaterial,
    );
    northRoadPatch.position.set(1.56, 0.3, 3.535);
    school.add(northRoadPatch);
    const northRoadWindowFrame = new THREE.Mesh(
      roundedBox(0.7, 0.42, 0.055, 0.008),
      woodMaterial,
    );
    northRoadWindowFrame.position.set(4.45, 0.4, 3.535);
    school.add(northRoadWindowFrame);
    const northRoadWindow = new THREE.Mesh(
      roundedBox(0.58, 0.32, 0.036, 0.006),
      glassMaterial,
    );
    northRoadWindow.position.set(4.45, 0.4, 3.57);
    school.add(northRoadWindow);
    [2.02, 2.36, 2.7, 3.04].forEach((north) => {
      const vent = new THREE.Mesh(
        roundedBox(0.16, 0.055, 0.04, 0.006),
        darkMaterial,
      );
      vent.position.set(north, 0.25, 3.56);
      school.add(vent);
    });
    const northRoadRoof = new THREE.Mesh(
      roundedBox(3.82, 0.075, 0.92, 0.01),
      corrugatedMaterial,
    );
    northRoadRoof.position.set(3.25, 0.62, 3.18);
    school.add(northRoadRoof);
    const northRoadFascia = new THREE.Mesh(
      roundedBox(3.86, 0.055, 0.06, 0.007),
      roofCourseMaterial,
    );
    northRoadFascia.position.set(3.25, 0.61, 3.66);
    school.add(northRoadFascia);

    const roadsideStallLower = new THREE.Mesh(
      roundedBox(1.05, 0.48, 0.72, 0.018),
      silverMaterial,
    );
    roadsideStallLower.position.set(0.82, 0.25, 3.32);
    school.add(roadsideStallLower);
    const roadsideStallUpper = new THREE.Mesh(
      roundedBox(1.05, 0.29, 0.72, 0.018),
      woodMaterial,
    );
    roadsideStallUpper.position.set(0.82, 0.63, 3.32);
    school.add(roadsideStallUpper);
    const roadsideStallRoof = new THREE.Mesh(
      roundedBox(1.22, 0.075, 0.96, 0.01),
      corrugatedMaterial,
    );
    roadsideStallRoof.position.set(0.82, 0.82, 3.31);
    school.add(roadsideStallRoof);
    const warningPanel = new THREE.Mesh(
      roundedBox(0.23, 0.3, 0.032, 0.006),
      whiteMaterial,
    );
    warningPanel.position.set(0.98, 0.46, 3.7);
    school.add(warningPanel);
    const warningTop = new THREE.Mesh(
      roundedBox(0.2, 0.055, 0.022, 0.004),
      redGateMaterial,
    );
    warningTop.position.set(0.98, 0.57, 3.723);
    school.add(warningTop);
    const warningLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.055),
      getSitubondoSignMaterial("DILARANG PARKIR", "#26302e", 900),
    );
    warningLabel.position.set(0.98, 0.46, 3.722);
    warningLabel.renderOrder = 7;
    school.add(warningLabel);
    const warningSideLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.19, 0.052),
      getSitubondoSignMaterial("SISI BARAT JALAN", "#26302e", 850),
    );
    warningSideLabel.position.set(0.98, 0.39, 3.723);
    warningSideLabel.renderOrder = 7;
    school.add(warningSideLabel);

    const gateNorth = -0.08;
    const gate = new THREE.Mesh(
      roundedBox(0.9, 0.72, 0.08, 0.01),
      redGateMaterial,
    );
    gate.position.set(gateNorth, 0.39, 3.49);
    school.add(gate);
    [-0.28, 0, 0.28].forEach((offset) => {
      const gateRail = new THREE.Mesh(
        roundedBox(0.035, 0.68, 0.04, 0.005),
        roofCourseMaterial,
      );
      gateRail.position.set(gateNorth + offset, 0.39, 3.54);
      school.add(gateRail);
    });
    [0.18, 0.42, 0.66].forEach((height) => {
      const gateRail = new THREE.Mesh(
        roundedBox(0.86, 0.035, 0.04, 0.005),
        roofCourseMaterial,
      );
      gateRail.position.set(gateNorth, height, 3.54);
      school.add(gateRail);
    });
    [-0.58, 0.42].forEach((north) => {
      const gatePillar = new THREE.Mesh(
        roundedBox(0.13, 0.86, 0.18, 0.012),
        whiteMaterial,
      );
      gatePillar.position.set(north, 0.43, 3.47);
      school.add(gatePillar);
      const gateCap = new THREE.Mesh(
        roundedBox(0.18, 0.07, 0.23, 0.01),
        terracottaMaterial,
      );
      gateCap.position.set(north, 0.89, 3.47);
      school.add(gateCap);
    });
    const yellowServiceDoor = new THREE.Mesh(
      roundedBox(0.17, 0.63, 0.045, 0.006),
      yellowMaterial,
    );
    yellowServiceDoor.position.set(0.5, 0.36, 3.6);
    school.add(yellowServiceDoor);

    school.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    mergeDirectMeshesByMaterial(school);
    group.add(school);
    return school;
  }

  function addAlunAlunEastJunctionFrontage(group) {
    const frontage = new THREE.Group();
    const creamMaterial = toonMaterial({ color: 0xe4ddcc });
    const beigeMaterial = toonMaterial({ color: 0xc9b98f });
    const paleMaterial = toonMaterial({ color: 0xeee9dc });
    const roofMaterial = toonMaterial({ color: 0x777873 });
    const roofDarkMaterial = toonMaterial({ color: 0x555a58 });
    const redMaterial = toonMaterial({ color: 0xa54a40 });
    const fadedRedMaterial = toonMaterial({ color: 0xb06b5d });
    const maroonMaterial = toonMaterial({ color: 0x95534d });
    const greenMaterial = toonMaterial({ color: 0x5b8753 });
    const blueMaterial = toonMaterial({ color: 0x2f6f99 });
    const brightBlueMaterial = toonMaterial({ color: 0x2f7ba6 });
    const glassMaterial = toonMaterial({ color: 0x40595d });
    const darkMaterial = toonMaterial({ color: 0x252c2d });
    const shutterMaterial = toonMaterial({ color: 0xd9d7ce });
    const silverMaterial = toonMaterial({ color: 0xa7aaa5 });

    const shopRow = new THREE.Group();
    shopRow.name = "East-junction Google Street View commercial frontage";
    shopRow.position.set(25.7, 0.05, 11.8);

    const blueOffice = new THREE.Group();
    // Street View places a narrow neighbouring unit between Planet Ban and
    // the longer beige row. Keep all three shells distinct instead of letting
    // this generic office occupy both adjoining buildings.
    blueOffice.position.set(0, 0, -4.9);
    blueOffice.scale.z = 0.66;
    const officeBody = new THREE.Mesh(
      roundedBox(2.6, 1.56, 1.58, 0.04),
      creamMaterial,
    );
    officeBody.position.y = 0.78;
    blueOffice.add(officeBody);
    const officeCap = new THREE.Mesh(
      roundedBox(2.68, 0.1, 1.66, 0.018),
      roofDarkMaterial,
    );
    officeCap.position.y = 1.59;
    blueOffice.add(officeCap);
    const bluePier = new THREE.Mesh(
      roundedBox(0.07, 1.42, 0.42, 0.014),
      brightBlueMaterial,
    );
    bluePier.position.set(-1.33, 0.84, 0.56);
    blueOffice.add(bluePier);
    [-0.48, -0.08, 0.31].forEach((eastOffset) => {
      const upperWindow = new THREE.Mesh(
        roundedBox(0.055, 0.44, 0.27, 0.012),
        glassMaterial,
      );
      upperWindow.position.set(-1.325, 1.15, eastOffset);
      blueOffice.add(upperWindow);
    });
    [-0.36, 0.3].forEach((eastOffset, index) => {
      const lowerOpening = new THREE.Mesh(
        roundedBox(0.055, 0.5, index === 0 ? 0.42 : 0.5, 0.014),
        index === 0 ? darkMaterial : glassMaterial,
      );
      lowerOpening.position.set(-1.325, 0.35, eastOffset);
      blueOffice.add(lowerOpening);
    });
    const officeTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.34, 12),
      silverMaterial,
    );
    officeTank.position.set(0.45, 1.79, -0.28);
    blueOffice.add(officeTank);
    shopRow.add(blueOffice);

    const beigeBlock = new THREE.Group();
    // Leave a real pedestrian-width gap between the facade and the west
    // footway of Jl. Susanto.  The former position forced the footway into the
    // northbound vehicle envelope at the junction throat.
    beigeBlock.position.set(0.15, 0, -2.15);
    const beigeBody = new THREE.Mesh(
      roundedBox(2.72, 1.62, 4.3, 0.045),
      beigeMaterial,
    );
    beigeBody.position.y = 0.81;
    beigeBlock.add(beigeBody);
    const beigeParapet = new THREE.Mesh(
      roundedBox(2.82, 0.3, 4.4, 0.028),
      creamMaterial,
    );
    beigeParapet.position.y = 1.7;
    beigeBlock.add(beigeParapet);
    const fadedRoofBoard = new THREE.Mesh(
      roundedBox(0.06, 0.22, 3.9, 0.014),
      fadedRedMaterial,
    );
    fadedRoofBoard.position.set(-1.43, 1.73, -0.08);
    beigeBlock.add(fadedRoofBoard);

    const catBoard = new THREE.Mesh(
      roundedBox(0.065, 0.48, 1.58, 0.015),
      maroonMaterial,
    );
    catBoard.position.set(-1.43, 1.3, -1.12);
    beigeBlock.add(catBoard);
    const catFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 16),
      paleMaterial,
    );
    catFace.position.set(-1.47, 1.31, -1.58);
    catFace.rotation.y = -Math.PI * 0.5;
    beigeBlock.add(catFace);
    const catBoardLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.24),
      getSitubondoSignMaterial("ATURR... PATENANG!", "#f0dfd3", 780),
    );
    catBoardLabel.position.set(-1.47, 1.3, -0.96);
    catBoardLabel.rotation.y = -Math.PI * 0.5;
    beigeBlock.add(catBoardLabel);

    [0.05, 0.55, 1.05, 1.55].forEach((eastOffset) => {
      const upperWindow = new THREE.Mesh(
        roundedBox(0.06, 0.5, 0.34, 0.012),
        glassMaterial,
      );
      upperWindow.position.set(-1.43, 1.28, eastOffset);
      beigeBlock.add(upperWindow);
      const upperFrame = new THREE.Mesh(
        roundedBox(0.068, 0.56, 0.045, 0.008),
        paleMaterial,
      );
      upperFrame.position.set(-1.465, 1.28, eastOffset);
      beigeBlock.add(upperFrame);
    });

    [-1.65, -0.82, 0.02, 0.86, 1.7].forEach((eastOffset, index) => {
      const shutter = new THREE.Mesh(
        roundedBox(0.06, 0.7, 0.72, 0.014),
        shutterMaterial,
      );
      shutter.position.set(-1.43, 0.4, eastOffset);
      beigeBlock.add(shutter);
      const shutterStripe = new THREE.Mesh(
        roundedBox(0.025, index % 2 === 0 ? 0.27 : 0.31, 0.67, 0.008),
        redMaterial,
      );
      shutterStripe.position.set(-1.47, 0.36, eastOffset);
      beigeBlock.add(shutterStripe);
      for (let slatIndex = 0; slatIndex < 5; slatIndex += 1) {
        const shutterSlat = new THREE.Mesh(
          roundedBox(0.018, 0.015, 0.65, 0.005),
          roofDarkMaterial,
        );
        shutterSlat.position.set(
          -1.488,
          0.17 + slatIndex * 0.115,
          eastOffset,
        );
        beigeBlock.add(shutterSlat);
      }
    });
    const beigeAwning = new THREE.Mesh(
      roundedBox(0.54, 0.08, 4.18, 0.018),
      roofMaterial,
    );
    beigeAwning.position.set(-1.58, 0.83, 0);
    beigeBlock.add(beigeAwning);
    for (let seamEast = -1.92; seamEast <= 1.92; seamEast += 0.24) {
      const awningSeam = new THREE.Mesh(
        roundedBox(0.55, 0.018, 0.025, 0.006),
        silverMaterial,
      );
      awningSeam.position.set(-1.59, 0.875, seamEast);
      beigeBlock.add(awningSeam);
    }
    [-1.32, -0.35, 0.7, 1.5].forEach((eastOffset, index) => {
      const shopPlacard = new THREE.Mesh(
        roundedBox(0.055, 0.15, index === 3 ? 0.62 : 0.78, 0.012),
        [maroonMaterial, roofDarkMaterial, greenMaterial, creamMaterial][index],
      );
      shopPlacard.position.set(-1.48, 0.77, eastOffset);
      beigeBlock.add(shopPlacard);
    });
    shopRow.add(beigeBlock);

    const modernShop = new THREE.Group();
    // Set the facade back far enough for the east footway to pass between the
    // storefront and the southbound lane, matching the paved setback visible
    // in Street View.
    modernShop.position.set(0.65, 0, 4.45);
    const modernBody = new THREE.Mesh(
      roundedBox(2.5, 1.82, 1.6, 0.04),
      paleMaterial,
    );
    modernBody.position.y = 0.91;
    modernShop.add(modernBody);
    const modernCap = new THREE.Mesh(
      roundedBox(2.6, 0.1, 1.7, 0.018),
      roofDarkMaterial,
    );
    modernCap.position.y = 1.86;
    modernShop.add(modernCap);
    const darkUpperPanel = new THREE.Mesh(
      roundedBox(0.06, 0.82, 0.72, 0.014),
      darkMaterial,
    );
    darkUpperPanel.position.set(-1.28, 1.38, -0.13);
    modernShop.add(darkUpperPanel);
    const greenPier = new THREE.Mesh(
      roundedBox(0.07, 1.42, 0.25, 0.012),
      greenMaterial,
    );
    greenPier.position.set(-1.29, 1.08, 0.63);
    modernShop.add(greenPier);
    [-0.5, 0.5].forEach((eastOffset) => {
      const frameSide = new THREE.Mesh(
        roundedBox(0.075, 0.96, 0.12, 0.012),
        creamMaterial,
      );
      frameSide.position.set(-1.31, 1.34, eastOffset);
      modernShop.add(frameSide);
    });
    [0.9, 1.8].forEach((height) => {
      const frameRail = new THREE.Mesh(
        roundedBox(0.075, 0.12, 1.12, 0.012),
        creamMaterial,
      );
      frameRail.position.set(-1.31, height, 0);
      modernShop.add(frameRail);
    });
    const modernOpening = new THREE.Mesh(
      roundedBox(0.06, 0.62, 0.92, 0.016),
      shutterMaterial,
    );
    modernOpening.position.set(-1.29, 0.39, 0.08);
    modernShop.add(modernOpening);
    const modernAwning = new THREE.Mesh(
      roundedBox(0.42, 0.08, 1.42, 0.016),
      roofMaterial,
    );
    modernAwning.position.set(-1.45, 0.75, 0.05);
    modernShop.add(modernAwning);
    const arumBoard = new THREE.Mesh(
      roundedBox(0.07, 0.38, 0.68, 0.014),
      blueMaterial,
    );
    arumBoard.position.set(-1.31, 1.1, -0.62);
    modernShop.add(arumBoard);
    const arumLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.25),
      getSitubondoSignMaterial("ARUM SHOP", "#f3eee0", 760),
    );
    arumLabel.position.set(-1.35, 1.1, -0.62);
    arumLabel.rotation.y = -Math.PI * 0.5;
    modernShop.add(arumLabel);
    shopRow.add(modernShop);

    shopRow.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    frontage.add(shopRow);

    const workshop = new THREE.Group();
    workshop.name = "Bakti Motor · Google Street View workshop";
    workshop.position.set(30.82, 0.05, 23.74);
    workshop.rotation.y = 0.145;
    const workshopBody = new THREE.Mesh(
      roundedBox(6.25, 1.06, 4.38, 0.045),
      paleMaterial,
    );
    workshopBody.position.y = 0.53;
    workshop.add(workshopBody);
    const workshopRoof = new THREE.Mesh(
      createGableRoofGeometry(6.62, 4.72, 0.42),
      silverMaterial,
    );
    workshopRoof.position.y = 1.02;
    workshop.add(workshopRoof);
    const workshopRidge = new THREE.Mesh(
      roundedBox(0.08, 0.08, 4.65, 0.014),
      roofDarkMaterial,
    );
    workshopRidge.position.set(0, 1.47, 0);
    workshop.add(workshopRidge);

    const workshopFrontX = -3.16;
    const openBay = new THREE.Mesh(
      roundedBox(0.065, 0.72, 1.52, 0.018),
      darkMaterial,
    );
    openBay.position.set(workshopFrontX, 0.4, 1.18);
    workshop.add(openBay);
    const westDoor = new THREE.Mesh(
      roundedBox(0.065, 0.62, 0.46, 0.014),
      darkMaterial,
    );
    westDoor.position.set(workshopFrontX, 0.35, -1.43);
    workshop.add(westDoor);
    const serviceWindow = new THREE.Mesh(
      roundedBox(0.065, 0.36, 0.76, 0.014),
      glassMaterial,
    );
    serviceWindow.position.set(workshopFrontX, 0.5, -0.64);
    workshop.add(serviceWindow);
    const workshopAwning = new THREE.Mesh(
      roundedBox(0.5, 0.08, 2.42, 0.018),
      roofMaterial,
    );
    workshopAwning.position.set(-3.36, 0.82, -0.76);
    workshop.add(workshopAwning);
    for (let seamEast = -1.82; seamEast <= 0.3; seamEast += 0.25) {
      const awningSeam = new THREE.Mesh(
        roundedBox(0.51, 0.018, 0.025, 0.006),
        silverMaterial,
      );
      awningSeam.position.set(-3.37, 0.865, seamEast);
      workshop.add(awningSeam);
    }
    [-1.82, -1.45, -1.08].forEach((eastOffset) => {
      const wallVent = new THREE.Mesh(
        roundedBox(0.065, 0.1, 0.2, 0.008),
        roofDarkMaterial,
      );
      wallVent.position.set(workshopFrontX, 0.9, eastOffset);
      workshop.add(wallVent);
    });

    const ircBoard = new THREE.Mesh(
      roundedBox(0.07, 0.34, 1.9, 0.015),
      paleMaterial,
    );
    ircBoard.position.set(workshopFrontX, 0.93, 1.18);
    workshop.add(ircBoard);
    const ircLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.48, 0.26),
      getSitubondoSignMaterial("IRC", "#2d69a3", 900),
    );
    ircLabel.position.set(-3.205, 0.96, 1.18);
    ircLabel.rotation.y = -Math.PI * 0.5;
    workshop.add(ircLabel);
    const workshopName = new THREE.Mesh(
      new THREE.PlaneGeometry(1.42, 0.11),
      getSitubondoSignMaterial("BAKTI MOTOR", "#456578", 760),
    );
    workshopName.position.set(-3.207, 0.79, 1.18);
    workshopName.rotation.y = -Math.PI * 0.5;
    workshop.add(workshopName);
    const oxyBoard = new THREE.Mesh(
      roundedBox(0.07, 0.2, 0.62, 0.012),
      blueMaterial,
    );
    oxyBoard.position.set(workshopFrontX, 0.93, -0.13);
    workshop.add(oxyBoard);
    const oxyLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.47, 0.12),
      getSitubondoSignMaterial("OXY", "#ede9dc", 820),
    );
    oxyLabel.position.set(-3.205, 0.94, -0.13);
    oxyLabel.rotation.y = -Math.PI * 0.5;
    workshop.add(oxyLabel);

    [-1.2, 1.2].forEach((eastOffset) => {
      const billboardSupport = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.05, 1.45, 7),
        roofDarkMaterial,
      );
      billboardSupport.position.set(-0.55, 1.72, eastOffset + 0.35);
      workshop.add(billboardSupport);
    });
    const roofBillboard = new THREE.Mesh(
      roundedBox(0.13, 1.3, 3.45, 0.028),
      silverMaterial,
    );
    roofBillboard.position.set(-0.55, 2.2, 0.35);
    workshop.add(roofBillboard);
    const roofBillboardInset = new THREE.Mesh(
      roundedBox(0.045, 1.08, 3.2, 0.018),
      roofMaterial,
    );
    roofBillboardInset.position.set(-0.63, 2.2, 0.35);
    workshop.add(roofBillboardInset);

    workshop.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(workshop);
    frontage.add(workshop);

    group.add(frontage);
  }

  function addAlunAlunIntersectionBoards(group) {
    const boards = new THREE.Group();
    const poleMaterial = toonMaterial({ color: 0x596360 });
    const blueMaterial = toonMaterial({ color: 0x2c6e9b });
    const paleMaterial = toonMaterial({ color: 0xe9e6da });
    const blankMaterial = toonMaterial({ color: 0x777c78 });
    const greenMaterial = toonMaterial({ color: 0x315a43 });
    const redMaterial = toonMaterial({ color: 0x99483f });

    const directionBoard = new THREE.Group();
    directionBoard.position.set(17.35, 0.05, 10.15);
    const directionPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 1.62, 8),
      poleMaterial,
    );
    directionPole.position.y = 0.81;
    directionBoard.add(directionPole);
    const directionFace = new THREE.Mesh(
      roundedBox(0.78, 0.5, 0.065, 0.025),
      blueMaterial,
    );
    directionFace.position.set(-0.15, 1.46, -0.02);
    directionBoard.add(directionFace);
    [1.61, 1.45, 1.29].forEach((height, index) => {
      const line = new THREE.Mesh(
        roundedBox(index === 1 ? 0.5 : 0.62, 0.035, 0.018, 0.006),
        paleMaterial,
      );
      line.position.set(-0.16, height - 0.03, -0.06);
      directionBoard.add(line);
    });
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.22, 3),
      paleMaterial,
    );
    arrow.position.set(0.16, 1.29, -0.065);
    arrow.rotation.set(Math.PI * 0.5, 0, -Math.PI * 0.5);
    directionBoard.add(arrow);
    mergeDirectMeshesByMaterial(directionBoard);
    boards.add(directionBoard);

    const blankBoard = new THREE.Group();
    blankBoard.position.set(23.9, 0.05, 10.4);
    [-0.24, 0.24].forEach((northOffset) => {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 2.15, 7),
        poleMaterial,
      );
      support.position.set(northOffset, 1.08, 0);
      blankBoard.add(support);
    });
    const blankFace = new THREE.Mesh(
      roundedBox(0.88, 1.42, 0.08, 0.025),
      blankMaterial,
    );
    blankFace.position.y = 1.92;
    blankBoard.add(blankFace);
    const blankInset = new THREE.Mesh(
      roundedBox(0.68, 1.12, 0.035, 0.014),
      redMaterial,
    );
    blankInset.position.set(0, 1.92, -0.055);
    blankBoard.add(blankInset);
    mergeDirectMeshesByMaterial(blankBoard);
    boards.add(blankBoard);

    const parkBillboard = new THREE.Group();
    parkBillboard.position.set(14.85, 0.05, 10.85);
    [-0.52, 0.52].forEach((northOffset) => {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.04, 1.8, 7),
        poleMaterial,
      );
      support.position.set(northOffset, 0.9, 0);
      parkBillboard.add(support);
    });
    const parkFace = new THREE.Mesh(
      roundedBox(1.5, 0.72, 0.08, 0.025),
      greenMaterial,
    );
    parkFace.position.y = 1.61;
    parkBillboard.add(parkFace);
    const parkHeader = new THREE.Mesh(
      roundedBox(1.22, 0.08, 0.035, 0.01),
      paleMaterial,
    );
    parkHeader.position.set(0, 1.81, -0.06);
    parkBillboard.add(parkHeader);
    const parkLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.23),
      getSitubondoSignMaterial("SAFARI", "#eee6d5", 760),
    );
    parkLabel.position.set(0, 1.58, -0.068);
    parkLabel.rotation.y = Math.PI;
    parkBillboard.add(parkLabel);
    mergeDirectMeshesByMaterial(parkBillboard);
    boards.add(parkBillboard);

    group.add(boards);
  }


  return {
    addAlunAlunEastJunctionFrontage,
    addAlunAlunIntersectionBoards,
    addAlunAlunSdAlAbror,
    addAlunAlunSdNegeri6Dawuhan,
    addAlunAlunWarungPojok,
  };
}
