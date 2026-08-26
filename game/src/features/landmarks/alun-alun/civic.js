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

export function createAlunAlunCivicFactory({
  helpers: {
    getSitubondoSignMaterial,
  },
}) {
  function addAlunAlunKantorPerpustakaan(group) {
    const library = new THREE.Group();
    library.name =
      "Dinas Perpustakaan dan Kearsipan · Google Street View 360";
    // OSM building 13. The surveyed north frontage rises roughly 11° toward
    // the east, so local +X faces Jl. Kartini and local +Z follows the facade.
    library.position.set(-22.54, 0.05, -9.01);
    library.rotation.y = 0.19;

    const wallMaterial = toonMaterial({ color: 0xd6cabb });
    const paleWallMaterial = toonMaterial({ color: 0xe7e2d8 });
    const grayWallMaterial = toonMaterial({ color: 0xc9cbc7 });
    const whiteMaterial = toonMaterial({ color: 0xeeeae0 });
    const darkStoneMaterial = toonMaterial({ color: 0x4d5352 });
    const stoneMaterial = toonMaterial({ color: 0x777b77 });
    const redRoofMaterial = toonMaterial({ color: 0x8f4336 });
    const rearRoofMaterial = toonMaterial({ color: 0xa55240 });
    const roofCourseMaterial = toonMaterial({ color: 0x6f3832 });
    const grayRoofMaterial = toonMaterial({ color: 0x6c716e });
    const grayRoofTopMaterial = toonMaterial({ color: 0x555b59 });
    const grayFinialMaterial = toonMaterial({ color: 0x555b59 });
    const greenRoofMaterial = toonMaterial({ color: 0x356f56 });
    const woodMaterial = toonMaterial({ color: 0x704637 });
    const redMaterial = toonMaterial({ color: 0xae4f43 });
    const greenMaterial = toonMaterial({ color: 0x4d8266 });
    const darkMaterial = toonMaterial({ color: 0x292e2d });
    const glassMaterial = toonMaterial({ color: 0x32484a });
    const frameMaterial = toonMaterial({ color: 0xe4dfd4 });
    const boardMaterial = toonMaterial({ color: 0x302f2a });

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

    const mainOffice = new THREE.Group();
    mainOffice.name = "Library tiled front office";
    mainOffice.position.set(-1.16, 0, 0.84);
    const mainFoundation = new THREE.Mesh(
      roundedBox(2.34, 0.16, 2.9, 0.025),
      darkStoneMaterial,
    );
    mainFoundation.position.y = 0.08;
    mainOffice.add(mainFoundation);
    const mainWalls = new THREE.Mesh(
      roundedBox(2.18, 0.76, 2.74, 0.045),
      wallMaterial,
    );
    mainWalls.position.y = 0.46;
    mainOffice.add(mainWalls);
    const mainRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.06, 2.56, 0.47, 0.64),
      redRoofMaterial,
    );
    mainRoof.position.y = 0.82;
    mainRoof.rotation.y = Math.PI * 0.5;
    mainOffice.add(mainRoof);
    const mainEave = new THREE.Mesh(
      roundedBox(2.38, 0.065, 2.94, 0.018),
      roofCourseMaterial,
    );
    mainEave.position.y = 0.82;
    mainOffice.add(mainEave);
    for (let rowIndex = 1; rowIndex <= 10; rowIndex += 1) {
      const progress = rowIndex / 11;
      const courseWidth = 3.06 - progress * 1.25;
      [-1, 1].forEach((side) => {
        const roofCourse = new THREE.Mesh(
          roundedBox(0.025, 0.014, courseWidth, 0.004),
          roofCourseMaterial,
        );
        roofCourse.position.set(
          side * 1.28 * (1 - progress),
          0.82 + 0.47 * progress + 0.008,
          0,
        );
        mainOffice.add(roofCourse);
      });
    }
    const mainRidge = new THREE.Mesh(
      roundedBox(0.055, 0.04, 1.78, 0.008),
      roofCourseMaterial,
    );
    mainRidge.position.set(0, 1.315, 0);
    mainOffice.add(mainRidge);

    const frontAwning = new THREE.Mesh(
      roundedBox(0.32, 0.065, 2.62, 0.018),
      grayRoofMaterial,
    );
    frontAwning.position.set(1.18, 0.71, 0.02);
    mainOffice.add(frontAwning);
    for (let eastOffset = -1.24; eastOffset <= 1.24; eastOffset += 0.16) {
      const awningScallop = new THREE.Mesh(
        roundedBox(0.06, 0.075, 0.12, 0.025),
        frameMaterial,
      );
      awningScallop.position.set(1.335, 0.66, eastOffset);
      mainOffice.add(awningScallop);
    }

    [-0.82, -0.22, 0.38, 0.98].forEach((eastOffset, index) => {
      const windowFrame = new THREE.Mesh(
        roundedBox(0.075, 0.58, 0.49, 0.016),
        frameMaterial,
      );
      windowFrame.position.set(1.115, 0.42, eastOffset);
      mainOffice.add(windowFrame);
      const windowGlass = new THREE.Mesh(
        roundedBox(0.035, 0.5, 0.41, 0.012),
        index === 1 ? darkMaterial : glassMaterial,
      );
      windowGlass.position.set(1.158, 0.42, eastOffset);
      mainOffice.add(windowGlass);
      const centerMullion = new THREE.Mesh(
        roundedBox(0.025, 0.47, 0.025, 0.006),
        frameMaterial,
      );
      centerMullion.position.set(1.18, 0.42, eastOffset);
      mainOffice.add(centerMullion);
      const transom = new THREE.Mesh(
        roundedBox(0.025, 0.025, 0.39, 0.006),
        frameMaterial,
      );
      transom.position.set(1.18, 0.52, eastOffset);
      mainOffice.add(transom);
    });
    [-1.17, -0.57, 0.03, 0.63, 1.17].forEach((eastOffset) => {
      const verandaPost = new THREE.Mesh(
        roundedBox(0.07, 0.67, 0.07, 0.012),
        darkStoneMaterial,
      );
      verandaPost.position.set(1.24, 0.335, eastOffset);
      mainOffice.add(verandaPost);
    });
    mergeDirectMeshesByMaterial(mainOffice);
    library.add(mainOffice);

    const rearHall = new THREE.Group();
    rearHall.name = "Library rear reading hall";
    rearHall.position.set(-3.58, 0, 0.28);
    const rearWalls = new THREE.Mesh(
      roundedBox(2.5, 0.72, 3.18, 0.045),
      paleWallMaterial,
    );
    rearWalls.position.y = 0.4;
    rearHall.add(rearWalls);
    const rearRoof = new THREE.Mesh(
      createHippedRoofGeometry(3.5, 2.82, 0.5, 0.72),
      rearRoofMaterial,
    );
    rearRoof.position.y = 0.76;
    rearRoof.rotation.y = Math.PI * 0.5;
    rearHall.add(rearRoof);
    const rearEave = new THREE.Mesh(
      roundedBox(2.66, 0.06, 3.36, 0.018),
      roofCourseMaterial,
    );
    rearEave.position.y = 0.76;
    rearHall.add(rearEave);
    mergeDirectMeshesByMaterial(rearHall);
    library.add(rearHall);

    const middleAnnex = new THREE.Group();
    middleAnnex.name = "Library sign-side annex";
    middleAnnex.position.set(-1.55, 0, -0.73);
    const middleBody = new THREE.Mesh(
      roundedBox(1.72, 0.72, 1.28, 0.04),
      paleWallMaterial,
    );
    middleBody.position.y = 0.4;
    middleAnnex.add(middleBody);
    const middleRoof = new THREE.Mesh(
      createHippedRoofGeometry(1.55, 2.0, 0.36, 0.52),
      rearRoofMaterial,
    );
    middleRoof.position.y = 0.76;
    middleRoof.rotation.y = Math.PI * 0.5;
    middleAnnex.add(middleRoof);
    const middleEave = new THREE.Mesh(
      roundedBox(1.84, 0.055, 1.42, 0.016),
      roofCourseMaterial,
    );
    middleEave.position.y = 0.76;
    middleAnnex.add(middleEave);
    mergeDirectMeshesByMaterial(middleAnnex);
    library.add(middleAnnex);

    const westWing = new THREE.Group();
    westWing.name = "Library west gable wing";
    westWing.position.set(-2.58, 0, -2.03);
    const westFoundation = new THREE.Mesh(
      roundedBox(3.82, 0.14, 1.42, 0.025),
      darkStoneMaterial,
    );
    westFoundation.position.y = 0.07;
    westWing.add(westFoundation);
    const westBody = new THREE.Mesh(
      roundedBox(3.62, 1.02, 1.28, 0.04),
      grayWallMaterial,
    );
    westBody.position.y = 0.55;
    westWing.add(westBody);
    const westRoof = new THREE.Mesh(
      createGableRoofGeometry(1.55, 3.94, 0.42),
      grayRoofMaterial,
    );
    westRoof.position.y = 1.06;
    westRoof.rotation.y = Math.PI * 0.5;
    westWing.add(westRoof);
    const westFrontFrame = new THREE.Mesh(
      roundedBox(0.065, 0.7, 0.67, 0.018),
      frameMaterial,
    );
    westFrontFrame.position.set(1.8, 0.45, 0.05);
    westWing.add(westFrontFrame);
    const westFrontInset = new THREE.Mesh(
      roundedBox(0.04, 0.62, 0.58, 0.016),
      glassMaterial,
    );
    westFrontInset.position.set(1.84, 0.45, 0.05);
    westWing.add(westFrontInset);
    mergeDirectMeshesByMaterial(westWing);
    library.add(westWing);

    const westFrontOffice = new THREE.Group();
    westFrontOffice.name = "Library west front office";
    westFrontOffice.position.set(-0.78, 0, -1.26);
    const westOfficeBody = new THREE.Mesh(
      roundedBox(1.24, 0.7, 1.08, 0.04),
      paleWallMaterial,
    );
    westOfficeBody.position.y = 0.38;
    westFrontOffice.add(westOfficeBody);
    const westOfficeRoof = new THREE.Mesh(
      createHippedRoofGeometry(1.32, 1.5, 0.3, 0.48),
      rearRoofMaterial,
    );
    westOfficeRoof.position.y = 0.73;
    westOfficeRoof.rotation.y = Math.PI * 0.5;
    westFrontOffice.add(westOfficeRoof);
    const westOfficeDoor = new THREE.Mesh(
      roundedBox(0.04, 0.54, 0.38, 0.014),
      darkMaterial,
    );
    westOfficeDoor.position.set(0.635, 0.3, 0.05);
    westFrontOffice.add(westOfficeDoor);
    mergeDirectMeshesByMaterial(westFrontOffice);
    library.add(westFrontOffice);

    const pavilion = new THREE.Group();
    pavilion.name = "Library open pendopo pavilion";
    pavilion.position.set(-1.16, 0, 2.43);
    const pavilionBase = new THREE.Mesh(
      roundedBox(1.66, 0.12, 1.66, 0.025),
      darkStoneMaterial,
    );
    pavilionBase.position.y = 0.06;
    pavilion.add(pavilionBase);
    const pavilionFloor = new THREE.Mesh(
      roundedBox(1.52, 0.06, 1.52, 0.018),
      stoneMaterial,
    );
    pavilionFloor.position.y = 0.13;
    pavilion.add(pavilionFloor);
    [-0.62, 0.62].forEach((northOffset) => {
      [-0.62, 0.62].forEach((eastOffset) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.065, 0.58, 8),
          woodMaterial,
        );
        post.position.set(northOffset, 0.47, eastOffset);
        pavilion.add(post);
        const postBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.09, 0.1, 8),
          stoneMaterial,
        );
        postBase.position.set(northOffset, 0.2, eastOffset);
        pavilion.add(postBase);
      });
    });
    [-0.62, 0.62].forEach((northOffset) => {
      const sideRail = new THREE.Mesh(
        roundedBox(0.055, 0.07, 1.2, 0.012),
        woodMaterial,
      );
      sideRail.position.set(northOffset, 0.36, 0);
      pavilion.add(sideRail);
    });
    const pavilionRoof = new THREE.Mesh(
      createHippedRoofGeometry(2.12, 2.12, 0.42, 1.2),
      grayRoofMaterial,
    );
    pavilionRoof.position.y = 0.77;
    pavilion.add(pavilionRoof);
    const pavilionTopRoof = new THREE.Mesh(
      createHippedRoofGeometry(0.92, 0.92, 0.26, 0.54),
      grayRoofTopMaterial,
    );
    pavilionTopRoof.position.y = 1.1;
    pavilion.add(pavilionTopRoof);
    const pavilionFinial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.045, 0.16, 7),
      grayFinialMaterial,
    );
    pavilionFinial.position.y = 1.46;
    pavilion.add(pavilionFinial);
    mergeDirectMeshesByMaterial(pavilion);
    library.add(pavilion);

    const signWall = new THREE.Group();
    signWall.name = "Library Street View name wall";
    signWall.position.set(0.08, 0, -0.43);
    const signWallBase = new THREE.Mesh(
      roundedBox(0.38, 0.12, 1.72, 0.024),
      darkStoneMaterial,
    );
    signWallBase.position.y = 0.06;
    signWall.add(signWallBase);
    const signWallBody = new THREE.Mesh(
      roundedBox(0.3, 0.46, 1.58, 0.035),
      paleWallMaterial,
    );
    signWallBody.position.y = 0.28;
    signWall.add(signWallBody);
    const signBoard = new THREE.Mesh(
      roundedBox(0.045, 0.31, 1.38, 0.014),
      boardMaterial,
    );
    signBoard.position.set(0.18, 0.3, 0);
    signWall.add(signBoard);
    addFrontLabel(
      signWall,
      "DINAS PERPUSTAKAAN",
      1.23,
      0.13,
      0.207,
      0.36,
      0,
      "#ded8ca",
      820,
    );
    addFrontLabel(
      signWall,
      "DAN KEARSIPAN",
      1.05,
      0.13,
      0.209,
      0.28,
      0,
      "#ded8ca",
      850,
    );
    addFrontLabel(
      signWall,
      "JL. R.A. KARTINI NO. 2A",
      1.08,
      0.075,
      0.21,
      0.2,
      0,
      "#c7bead",
      720,
    );
    [-0.62, 0.62].forEach((eastOffset) => {
      const letterSupport = new THREE.Mesh(
        roundedBox(0.04, 0.35, 0.04, 0.008),
        darkStoneMaterial,
      );
      letterSupport.position.set(-0.05, 0.68, eastOffset);
      signWall.add(letterSupport);
    });
    addFrontLabel(
      signWall,
      "DINAS PERPUSTAKAAN",
      1.68,
      0.16,
      0.03,
      0.89,
      0,
      "#d8d5cb",
      900,
    );
    addFrontLabel(
      signWall,
      "DAN KEARSIPAN",
      1.34,
      0.16,
      0.032,
      0.75,
      0,
      "#d8d5cb",
      900,
    );
    mergeDirectMeshesByMaterial(signWall);
    library.add(signWall);

    const guardBooth = new THREE.Group();
    guardBooth.name = "Library west gate booth";
    guardBooth.position.set(0, 0, -1.78);
    const boothBase = new THREE.Mesh(
      roundedBox(0.68, 0.08, 0.62, 0.022),
      redMaterial,
    );
    boothBase.position.y = 0.04;
    guardBooth.add(boothBase);
    [-0.23, 0.23].forEach((northOffset) => {
      [-0.21, 0.21].forEach((eastOffset, index) => {
        const boothPost = new THREE.Mesh(
          roundedBox(0.07, 0.44, 0.07, 0.012),
          index === 0 ? redMaterial : greenMaterial,
        );
        boothPost.position.set(northOffset, 0.3, eastOffset);
        guardBooth.add(boothPost);
      });
    });
    const boothRoof = new THREE.Mesh(
      createHippedRoofGeometry(0.86, 0.82, 0.22, 0.48),
      greenRoofMaterial,
    );
    boothRoof.position.y = 0.54;
    guardBooth.add(boothRoof);
    const boothDesk = new THREE.Mesh(
      roundedBox(0.5, 0.09, 0.45, 0.015),
      darkMaterial,
    );
    boothDesk.position.y = 0.31;
    guardBooth.add(boothDesk);
    mergeDirectMeshesByMaterial(guardBooth);
    library.add(guardBooth);

    const frontFence = new THREE.Group();
    frontFence.name = "Library white metal frontage fence";
    frontFence.position.x = 0.1;
    const addFencePanel = (east, width, hasBase = true) => {
      if (hasBase) {
        const base = new THREE.Mesh(
          roundedBox(0.16, 0.13, width, 0.022),
          darkStoneMaterial,
        );
        base.position.set(0, 0.065, east);
        frontFence.add(base);
      }
      [0.16, 0.42].forEach((height) => {
        const rail = new THREE.Mesh(
          roundedBox(0.04, 0.035, Math.max(0.1, width - 0.08), 0.008),
          whiteMaterial,
        );
        rail.position.set(0.02, height, east);
        frontFence.add(rail);
      });
      for (
        let offset = -width * 0.5 + 0.1;
        offset <= width * 0.5 - 0.1;
        offset += 0.16
      ) {
        const picket = new THREE.Mesh(
          roundedBox(0.03, 0.34, 0.03, 0.007),
          whiteMaterial,
        );
        picket.position.set(0.025, 0.29, east + offset);
        frontFence.add(picket);
      }
    };
    addFencePanel(-2.65, 0.7);
    addFencePanel(-1.54, 0.46);
    addFencePanel(0.72, 0.58, false);
    addFencePanel(1.33, 0.58, false);
    addFencePanel(2.35, 1.28);
    [-3.04, -2.25, -1.29, 0.38, 1.02, 1.65, 3.03].forEach(
      (eastOffset) => {
        const pillarBase = new THREE.Mesh(
          roundedBox(0.22, 0.14, 0.22, 0.022),
          darkStoneMaterial,
        );
        pillarBase.position.set(0, 0.07, eastOffset);
        frontFence.add(pillarBase);
        const pillar = new THREE.Mesh(
          roundedBox(0.17, 0.42, 0.17, 0.022),
          whiteMaterial,
        );
        pillar.position.set(0, 0.28, eastOffset);
        frontFence.add(pillar);
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(0.115, 0.12, 4),
          stoneMaterial,
        );
        cap.position.set(0, 0.55, eastOffset);
        cap.rotation.y = Math.PI * 0.25;
        frontFence.add(cap);
      },
    );
    mergeDirectMeshesByMaterial(frontFence);
    library.add(frontFence);

    library.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(library);
    return library;
  }

  function addAlunAlunBankBri(group) {
    const bank = new THREE.Group();
    bank.name = "Bank BRI KC Situbondo · Google Street View 360";
    // OSM building 3. Local +X follows the east-west frontage and local +Z
    // points south toward Jl. Achmad Yani, preventing a front/back inversion.
    bank.position.set(18.9, 0.05, -34.18);
    bank.rotation.y = -1.577;

    const whiteMaterial = toonMaterial({ color: 0xe9eceb });
    const brightWhiteMaterial = toonMaterial({ color: 0xf4f5f2 });
    const paleGrayMaterial = toonMaterial({ color: 0xcbd1d0 });
    const seamMaterial = toonMaterial({ color: 0xaeb8ba });
    const blueMaterial = toonMaterial({ color: 0x184492 });
    const deepBlueMaterial = toonMaterial({ color: 0x12346f });
    const glassMaterial = toonMaterial({ color: 0x1b3f63 });
    const glassHighlightMaterial = toonMaterial({ color: 0x2d6385 });
    const darkGlassMaterial = toonMaterial({ color: 0x152d3d });
    const orangeMaterial = toonMaterial({ color: 0xd65c37 });
    const silverMaterial = toonMaterial({ color: 0xb6c0c1 });
    const foundationMaterial = toonMaterial({ color: 0xb8bfbd });
    const canopyMaterial = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        color: 0x4aa5c8,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    const addFrontLabel = (
      parent,
      text,
      width,
      height,
      x,
      y,
      z,
      color = "#f5f7f7",
      fontWeight = 900,
    ) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        getSitubondoSignMaterial(text, color, fontWeight),
      );
      label.position.set(x, y, z);
      label.renderOrder = 6;
      parent.add(label);
      return label;
    };

    const addFrontGlassBand = (
      parent,
      x,
      y,
      z,
      width,
      height,
      columns,
      material = glassMaterial,
    ) => {
      const band = new THREE.Mesh(
        roundedBox(width, height, 0.045, 0.008),
        material,
      );
      band.position.set(x, y, z);
      parent.add(band);
      for (let index = 1; index < columns; index += 1) {
        const mullion = new THREE.Mesh(
          roundedBox(0.018, height * 0.96, 0.025, 0.004),
          seamMaterial,
        );
        mullion.position.set(
          x - width * 0.5 + (width * index) / columns,
          y,
          z + 0.032,
        );
        parent.add(mullion);
      }
      const rail = new THREE.Mesh(
        roundedBox(width * 0.99, 0.018, 0.025, 0.004),
        seamMaterial,
      );
      rail.position.set(x, y, z + 0.034);
      parent.add(rail);
    };

    const addSideGlassBand = (
      parent,
      x,
      y,
      z,
      depth,
      height,
      rows,
      material = glassMaterial,
    ) => {
      const band = new THREE.Mesh(
        roundedBox(0.045, height, depth, 0.008),
        material,
      );
      band.position.set(x, y, z);
      parent.add(band);
      for (let index = 1; index < rows; index += 1) {
        const mullion = new THREE.Mesh(
          roundedBox(0.025, height * 0.96, 0.018, 0.004),
          seamMaterial,
        );
        mullion.position.set(
          x + 0.032,
          y,
          z - depth * 0.5 + (depth * index) / rows,
        );
        parent.add(mullion);
      }
      const rail = new THREE.Mesh(
        roundedBox(0.025, 0.018, depth * 0.99, 0.004),
        seamMaterial,
      );
      rail.position.set(x + 0.034, y, z);
      parent.add(rail);
    };

    const addRod = (parent, start, end, radius = 0.014) => {
      const direction = end.clone().sub(start);
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
        silverMaterial,
      );
      rod.position.copy(start).add(end).multiplyScalar(0.5);
      rod.quaternion.setFromUnitVectors(upAxis, direction.normalize());
      parent.add(rod);
      return rod;
    };

    const foundation = new THREE.Mesh(
      roundedBox(6.22, 0.1, 6.46, 0.025),
      foundationMaterial,
    );
    foundation.position.set(-0.28, 0.05, -0.02);
    bank.add(foundation);

    const mainBlock = new THREE.Group();
    mainBlock.name = "BRI west office block";
    const mainWalls = new THREE.Mesh(
      roundedBox(3.75, 1.78, 5.55, 0.025),
      whiteMaterial,
    );
    mainWalls.position.set(-1.53, 0.94, -0.3);
    mainBlock.add(mainWalls);

    const westTower = new THREE.Mesh(
      roundedBox(0.58, 1.94, 5.5, 0.018),
      blueMaterial,
    );
    westTower.position.set(-3.12, 1.01, -0.28);
    mainBlock.add(westTower);
    [-0.42, -0.31, -0.2, -0.09].forEach((yOffset) => {
      const vent = new THREE.Mesh(
        roundedBox(0.035, 0.025, 0.42, 0.004),
        orangeMaterial,
      );
      vent.position.set(-3.425, 1.25 + yOffset, 1.92);
      vent.rotation.y = Math.PI * 0.5;
      mainBlock.add(vent);
    });

    [0.55, 0.99, 1.42].forEach((height, rowIndex) => {
      addFrontGlassBand(
        mainBlock,
        -1.88,
        height,
        2.5,
        2.22,
        rowIndex === 0 ? 0.31 : 0.3,
        5,
        rowIndex === 1 ? glassHighlightMaterial : glassMaterial,
      );
    });

    const upperSign = new THREE.Mesh(
      roundedBox(2.18, 0.38, 0.055, 0.012),
      blueMaterial,
    );
    upperSign.position.set(-1.56, 1.66, 2.54);
    mainBlock.add(upperSign);
    addFrontLabel(mainBlock, "BANK BRI", 1.93, 0.25, -1.56, 1.67, 2.574);
    const signUnderline = new THREE.Mesh(
      roundedBox(2.18, 0.045, 0.035, 0.006),
      orangeMaterial,
    );
    signUnderline.position.set(-1.56, 1.445, 2.575);
    mainBlock.add(signUnderline);

    for (let x = -2.85; x <= 0.05; x += 0.58) {
      const seam = new THREE.Mesh(
        roundedBox(0.012, 1.74, 0.018, 0.003),
        seamMaterial,
      );
      seam.position.set(x, 0.94, 2.795);
      mainBlock.add(seam);
    }

    const roofCap = new THREE.Mesh(
      roundedBox(3.84, 0.075, 5.64, 0.014),
      brightWhiteMaterial,
    );
    roofCap.position.set(-1.53, 1.84, -0.3);
    mainBlock.add(roofCap);

    const roofRail = new THREE.Group();
    roofRail.name = "BRI open rooftop parapet";
    [-3.22, 0.15].forEach((x) => {
      const endPost = new THREE.Mesh(
        roundedBox(0.045, 0.25, 0.045, 0.006),
        paleGrayMaterial,
      );
      endPost.position.set(x, 2.02, 2.49);
      roofRail.add(endPost);
    });
    for (let x = -2.7; x <= -0.3; x += 0.6) {
      const post = new THREE.Mesh(
        roundedBox(0.035, 0.2, 0.035, 0.005),
        paleGrayMaterial,
      );
      post.position.set(x, 2.0, 2.49);
      roofRail.add(post);
    }
    [1.93, 2.08].forEach((y) => {
      const rail = new THREE.Mesh(
        roundedBox(3.45, 0.035, 0.035, 0.005),
        paleGrayMaterial,
      );
      rail.position.set(-1.54, y, 2.49);
      roofRail.add(rail);
    });
    mainBlock.add(roofRail);
    bank.add(mainBlock);

    const frontBay = new THREE.Group();
    frontBay.name = "BRI projecting glazed gable";
    const bayWalls = new THREE.Mesh(
      roundedBox(1.74, 1.43, 1.5, 0.02),
      whiteMaterial,
    );
    bayWalls.position.set(-0.72, 0.76, 2.68);
    frontBay.add(bayWalls);
    const bayRoof = new THREE.Mesh(
      createGableRoofGeometry(1.84, 1.58, 0.27),
      brightWhiteMaterial,
    );
    bayRoof.position.set(-0.72, 1.475, 2.68);
    frontBay.add(bayRoof);
    const bayEave = new THREE.Mesh(
      roundedBox(1.91, 0.055, 1.64, 0.012),
      paleGrayMaterial,
    );
    bayEave.position.set(-0.72, 1.48, 2.68);
    frontBay.add(bayEave);
    const gableFasciaShape = new THREE.Shape();
    gableFasciaShape.moveTo(-0.9, 0);
    gableFasciaShape.lineTo(0.9, 0);
    gableFasciaShape.lineTo(0, 0.27);
    gableFasciaShape.closePath();
    const gableFascia = new THREE.Mesh(
      new THREE.ShapeGeometry(gableFasciaShape),
      brightWhiteMaterial,
    );
    gableFascia.position.set(-0.72, 1.47, 3.475);
    frontBay.add(gableFascia);

    [0.91, 1.31].forEach((height, rowIndex) => {
      addFrontGlassBand(
        frontBay,
        -0.72,
        height,
        3.45,
        1.64,
        0.29,
        4,
        rowIndex === 0 ? glassHighlightMaterial : glassMaterial,
      );
      [-1, 1].forEach((side) => {
        addSideGlassBand(
          frontBay,
          -0.72 + side * 0.89,
          height,
          2.72,
          1.34,
          0.29,
          3,
          glassMaterial,
        );
      });
    });

    const entranceFrame = new THREE.Mesh(
      roundedBox(0.78, 0.64, 0.075, 0.012),
      paleGrayMaterial,
    );
    entranceFrame.position.set(-0.73, 0.35, 3.456);
    frontBay.add(entranceFrame);
    const entranceGlass = new THREE.Mesh(
      roundedBox(0.67, 0.56, 0.04, 0.008),
      darkGlassMaterial,
    );
    entranceGlass.position.set(-0.73, 0.34, 3.505);
    frontBay.add(entranceGlass);
    const entranceMullion = new THREE.Mesh(
      roundedBox(0.025, 0.54, 0.02, 0.004),
      silverMaterial,
    );
    entranceMullion.position.set(-0.73, 0.34, 3.535);
    frontBay.add(entranceMullion);
    [-1.23, -0.23].forEach((x) => {
      const lobbyWindow = new THREE.Mesh(
        roundedBox(0.34, 0.45, 0.04, 0.008),
        darkGlassMaterial,
      );
      lobbyWindow.position.set(x, 0.33, 3.48);
      frontBay.add(lobbyWindow);
    });
    const entranceCanopy = new THREE.Mesh(
      roundedBox(1.72, 0.09, 0.42, 0.014),
      brightWhiteMaterial,
    );
    entranceCanopy.position.set(-0.72, 0.62, 3.59);
    entranceCanopy.rotation.x = -0.035;
    frontBay.add(entranceCanopy);
    bank.add(frontBay);

    const eastWing = new THREE.Group();
    eastWing.name = "BRI east office wing";
    const connectorWalls = new THREE.Mesh(
      roundedBox(0.78, 1.68, 2.32, 0.02),
      whiteMaterial,
    );
    connectorWalls.position.set(0.68, 0.89, -0.4);
    eastWing.add(connectorWalls);
    const eastWalls = new THREE.Mesh(
      roundedBox(1.82, 1.7, 4.28, 0.025),
      whiteMaterial,
    );
    eastWalls.position.set(1.84, 0.9, -1.08);
    eastWing.add(eastWalls);
    [0.6, 1.04, 1.46].forEach((height, rowIndex) => {
      addFrontGlassBand(
        eastWing,
        1.83,
        height,
        1.085,
        1.68,
        rowIndex === 0 ? 0.29 : 0.28,
        4,
        rowIndex === 1 ? glassHighlightMaterial : glassMaterial,
      );
      addSideGlassBand(
        eastWing,
        2.77,
        height,
        -1.1,
        3.92,
        rowIndex === 0 ? 0.29 : 0.28,
        7,
        rowIndex === 1 ? glassHighlightMaterial : glassMaterial,
      );
    });
    const eastRoof = new THREE.Mesh(
      roundedBox(1.92, 0.075, 4.38, 0.014),
      brightWhiteMaterial,
    );
    eastRoof.position.set(1.84, 1.79, -1.08);
    eastWing.add(eastRoof);

    const servicePier = new THREE.Mesh(
      roundedBox(0.23, 2.08, 0.43, 0.012),
      brightWhiteMaterial,
    );
    servicePier.position.set(0.75, 1.06, 0.05);
    eastWing.add(servicePier);
    [-0.075, 0.075].forEach((xOffset) => {
      const crownPost = new THREE.Mesh(
        roundedBox(0.055, 0.42, 0.09, 0.006),
        brightWhiteMaterial,
      );
      crownPost.position.set(0.75 + xOffset, 2.25, 0.05);
      eastWing.add(crownPost);
    });
    const crownBeam = new THREE.Mesh(
      roundedBox(0.22, 0.055, 0.09, 0.006),
      brightWhiteMaterial,
    );
    crownBeam.position.set(0.75, 2.44, 0.05);
    eastWing.add(crownBeam);
    bank.add(eastWing);

    const westLobby = new THREE.Group();
    westLobby.name = "BRI ATM and banking lobby";
    const lobbyBody = new THREE.Mesh(
      roundedBox(1.24, 0.62, 0.76, 0.018),
      whiteMaterial,
    );
    lobbyBody.position.set(-2.72, 0.35, 2.74);
    westLobby.add(lobbyBody);
    const lobbyFascia = new THREE.Mesh(
      roundedBox(1.32, 0.15, 0.82, 0.012),
      blueMaterial,
    );
    lobbyFascia.position.set(-2.72, 0.69, 2.74);
    westLobby.add(lobbyFascia);
    addFrontLabel(westLobby, "GALERI ATM", 0.92, 0.1, -2.72, 0.69, 3.161, "#ffffff", 850);
    const lobbyDoor = new THREE.Mesh(
      roundedBox(0.42, 0.5, 0.04, 0.008),
      darkGlassMaterial,
    );
    lobbyDoor.position.set(-2.72, 0.3, 3.14);
    westLobby.add(lobbyDoor);
    bank.add(westLobby);

    const carport = new THREE.Group();
    carport.name = "BRI blue east parking canopy";
    carport.position.set(1.18, 0, 2.25);
    for (let panelIndex = 0; panelIndex < 7; panelIndex += 1) {
      const progress = panelIndex / 6;
      const z = THREE.MathUtils.lerp(-0.82, 0.82, progress);
      const curve = (progress - 0.5) * 2;
      const canopyPanel = new THREE.Mesh(
        roundedBox(1.62, 0.04, 0.31, 0.012),
        canopyMaterial,
      );
      canopyPanel.position.set(0, 0.84 + (1 - curve * curve) * 0.09, z);
      canopyPanel.rotation.x = -curve * 0.2;
      carport.add(canopyPanel);
    }
    [-0.66, 0.66].forEach((x) => {
      [-0.72, 0.72].forEach((z) => {
        addRod(
          carport,
          new THREE.Vector3(x, 0.05, z),
          new THREE.Vector3(x * 0.9, 0.84, z * 0.92),
          0.018,
        );
      });
    });
    addRod(
      carport,
      new THREE.Vector3(-0.7, 0.08, -0.72),
      new THREE.Vector3(0.7, 0.84, 0.72),
      0.014,
    );
    addRod(
      carport,
      new THREE.Vector3(0.7, 0.08, -0.72),
      new THREE.Vector3(-0.7, 0.84, 0.72),
      0.014,
    );
    [-0.52, -0.26, 0, 0.26, 0.52].forEach((x) => {
      addRod(
        carport,
        new THREE.Vector3(x, 0.87, -0.9),
        new THREE.Vector3(x, 0.81, 0.9),
        0.009,
      );
    });
    bank.add(carport);

    const pylon = new THREE.Group();
    pylon.name = "BRI roadside identity pylon";
    pylon.position.set(2.6, 0, 2.72);
    [-0.17, 0.17].forEach((x) => {
      const support = new THREE.Mesh(
        roundedBox(0.09, 1.72, 0.12, 0.01),
        brightWhiteMaterial,
      );
      support.position.set(x, 0.86, 0);
      pylon.add(support);
    });
    const pylonPanel = new THREE.Mesh(
      roundedBox(0.7, 1.36, 0.17, 0.018),
      brightWhiteMaterial,
    );
    pylonPanel.position.y = 1.32;
    pylon.add(pylonPanel);
    const pylonTop = new THREE.Mesh(
      roundedBox(0.62, 0.38, 0.185, 0.012),
      blueMaterial,
    );
    pylonTop.position.set(0, 1.78, 0.015);
    pylon.add(pylonTop);
    addFrontLabel(pylon, "BANK BRI", 0.53, 0.2, 0, 1.79, 0.111, "#ffffff", 850);
    addFrontLabel(pylon, "ATM", 0.38, 0.18, 0, 1.38, 0.111, "#184492", 900);
    const branchPanel = new THREE.Mesh(
      roundedBox(0.58, 0.22, 0.185, 0.01),
      deepBlueMaterial,
    );
    branchPanel.position.set(0, 0.93, 0.015);
    pylon.add(branchPanel);
    addFrontLabel(pylon, "KC SITUBONDO", 0.51, 0.12, 0, 0.93, 0.111, "#ffffff", 800);
    bank.add(pylon);

    const eastBoundary = new THREE.Group();
    eastBoundary.name = "BRI east compound wall";
    const wall = new THREE.Mesh(
      roundedBox(0.14, 0.34, 3.92, 0.018),
      brightWhiteMaterial,
    );
    wall.position.set(2.96, 0.19, -0.72);
    eastBoundary.add(wall);
    const wallCap = new THREE.Mesh(
      roundedBox(0.17, 0.055, 3.98, 0.01),
      paleGrayMaterial,
    );
    wallCap.position.set(2.96, 0.39, -0.72);
    eastBoundary.add(wallCap);
    bank.add(eastBoundary);

    bank.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    group.add(bank);
    return bank;
  }


  return {
    addAlunAlunBankBri,
    addAlunAlunKantorPerpustakaan,
  };
}
