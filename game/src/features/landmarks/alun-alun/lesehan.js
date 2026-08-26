import * as THREE from "three";
import {
  createHippedRoofGeometry,
  roundedBox,
} from "../../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../../rendering/materials.js";
import {
  placeOnPlanet,
  surfaceSagitta,
} from "../../../world/surface.js";

export function createAlunAlunLesehanFactory({
  collections: {
    animatedStopDetails,
  },
  constants: {
    FOUNDATION_SINK,
    MAP_METERS_PER_WORLD_UNIT,
  },
  world,
}) {
  function createLesehanMenuMaterial() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    context.fillStyle = "#8fb96d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#d75a43";
    context.fillRect(0, 0, canvas.width, 116);
    context.fillStyle = "#f1ead7";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 70px Arial, sans-serif";
    context.fillText("GUBUG TOMBO LUWE  LUMAYAN", 512, 60);
    context.fillStyle = "#314741";
    context.textAlign = "left";
    context.font = "700 35px Arial, sans-serif";
    [
      "NASI RAMES        ES TEH",
      "NASI KARO AYAM    JERUK",
      "NASI PECEL        KOPI",
      "NASI BALI TELUR   SUSU",
      "MIE AYAM          SOGEM",
    ].forEach((line, index) => context.fillText(line, 70, 164 + index * 63));
    context.strokeStyle = "#e7dfca";
    context.lineWidth = 16;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
  }

  function createLesehanGraphicMaterial(width, height, paint) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    paint(context, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
  }

  function createLesehanMainSignMaterial() {
    return createLesehanGraphicMaterial(1200, 360, (context, width, height) => {
      context.fillStyle = "#495256";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#d9ddd7";
      context.lineWidth = 14;
      context.strokeRect(10, 10, width - 20, height - 20);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#ded9c9";
      context.font = "800 42px Arial, sans-serif";
      context.fillText("GUBUG TOMBO LUWE", width * 0.5, 55);
      context.lineWidth = 13;
      context.strokeStyle = "#6688ac";
      context.font = "900 154px Arial, sans-serif";
      context.strokeText('“ LUMAYAN ”', width * 0.5, 181);
      context.fillStyle = "#e7e2d2";
      context.fillText('“ LUMAYAN ”', width * 0.5, 181);
      context.fillStyle = "#ece9df";
      context.font = "800 34px Arial, sans-serif";
      context.fillText("085255881456 / 085330723692", width * 0.5, 306);
    });
  }

  function createLesehanMbahMaterial() {
    return createLesehanGraphicMaterial(1200, 460, (context, width, height) => {
      context.fillStyle = "#c9b58f";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(108, 82, 55, 0.17)";
      [90, 270, 520, 810, 1050].forEach((x, index) => {
        context.beginPath();
        context.ellipse(x, 85 + index * 61, 95, 34, -0.25, 0, Math.PI * 2);
        context.fill();
      });
      context.strokeStyle = "#b09b72";
      context.lineWidth = 12;
      context.strokeRect(8, 8, width - 16, height - 16);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#426b91";
      context.font = "900 82px Arial, sans-serif";
      context.fillText("WARUNG MAKAN", 520, 91);
      context.font = "italic 800 62px Georgia, serif";
      context.fillText("Mbah Kasan", 940, 94);
      context.fillStyle = "#473f35";
      context.textAlign = "left";
      context.font = "800 43px Arial, sans-serif";
      [
        "NASI PECEL     PENYETAN",
        "NASI KALDU     RAWON",
        "NASI SOTO      ANEKA MINUMAN",
      ].forEach((line, index) => context.fillText(line, 105, 205 + index * 70));
      context.strokeStyle = "rgba(89, 71, 49, 0.22)";
      context.lineWidth = 5;
      [58, 346, 742, 1080].forEach((x, index) => {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + (index % 2 === 0 ? 38 : -28), height);
        context.stroke();
      });
    });
  }

  function createLesehanMieMaterial() {
    return createLesehanGraphicMaterial(720, 360, (context, width, height) => {
      context.fillStyle = "#cab85c";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(112, 91, 45, 0.11)";
      context.fillRect(46, 36, 190, 74);
      context.fillRect(448, 226, 172, 66);
      context.strokeStyle = "#9c8844";
      context.lineWidth = 12;
      context.strokeRect(8, 8, width - 16, height - 16);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#4f7597";
      context.font = "900 100px Arial, sans-serif";
      context.fillText("MIE AYAM", width * 0.5, 125);
      context.font = "italic 800 91px Georgia, serif";
      context.fillText("Podo Moro", width * 0.5, 258);
    });
  }

  function createLesehanShutterMarkMaterial() {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 320;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 258px Arial, sans-serif";
    context.strokeStyle = "rgba(236, 235, 225, 0.54)";
    context.lineWidth = 24;
    context.setLineDash([58, 18, 30, 13]);
    context.strokeText("0", canvas.width * 0.27, canvas.height * 0.53);
    context.strokeText("3", canvas.width * 0.73, canvas.height * 0.53);
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "rgba(0, 0, 0, 0.8)";
    [
      [104, 82, 52, 14],
      [186, 197, 66, 11],
      [258, 116, 35, 18],
      [451, 76, 62, 13],
      [522, 184, 44, 20],
      [612, 122, 57, 12],
    ].forEach(([x, y, width, height]) => context.fillRect(x, y, width, height));
    context.globalCompositeOperation = "source-over";
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
  }

  function createLesehanBambooMaterial() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    context.fillStyle = "#d8c9aa";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 3; y < canvas.height; y += 7) {
      context.fillStyle = y % 21 === 3 ? "#8f806c" : "#b5a487";
      context.fillRect(0, y, canvas.width, y % 21 === 3 ? 2 : 1);
    }
    for (let x = 42; x < canvas.width; x += 82) {
      context.fillStyle = "rgba(52, 72, 83, 0.78)";
      context.fillRect(x, 0, 4, canvas.height);
    }
    [
      [94, 82, 74, 48],
      [282, 205, 96, 58],
      [136, 354, 82, 44],
    ].forEach(([x, y, width, height]) => {
      context.fillStyle = "rgba(230, 217, 188, 0.32)";
      context.fillRect(x, y, width, height);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.8, 1);
    return hideMaterialOutline(
      new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xf1e5cd,
        roughness: 0.92,
        side: THREE.DoubleSide,
      }),
    );
  }

  function addLesehanRoofCourses(
    parent,
    centerX,
    centerZ,
    width,
    depth,
    baseY,
    height,
    materials,
  ) {
    const lowerRoof = new THREE.Mesh(
      createHippedRoofGeometry(width, depth, height * 0.13, depth * 0.25),
      materials.roof,
    );
    lowerRoof.position.set(centerX, baseY, centerZ);
    parent.add(lowerRoof);

    [-1, 1].forEach((side) => {
      const flaredLip = new THREE.Mesh(
        roundedBox(width * 1.02, 0.034, 0.045, 0.009),
        materials.roofDark,
      );
      flaredLip.position.set(centerX, baseY + 0.022, centerZ + side * depth * 0.5);
      parent.add(flaredLip);
    });

    const upperWidth = width * 0.9;
    const upperDepth = depth * 0.68;
    const upperHeight = height * 0.68;
    const upperBaseY = baseY + height * 0.08;
    const upperRoof = new THREE.Mesh(
      createHippedRoofGeometry(upperWidth, upperDepth, upperHeight, upperDepth * 0.38),
      materials.roof,
    );
    upperRoof.position.set(centerX, upperBaseY, centerZ);
    parent.add(upperRoof);

    const halfDepth = upperDepth * 0.5;
    const ridgeHalfWidth = Math.max(0, upperWidth * 0.5 - upperDepth * 0.38);
    for (let row = 1; row <= 4; row += 1) {
      const progress = row / 5;
      const courseWidth = THREE.MathUtils.lerp(
        upperWidth * 0.98,
        ridgeHalfWidth * 2,
        progress,
      );
      [-1, 1].forEach((side) => {
        const course = new THREE.Mesh(
          roundedBox(courseWidth, 0.006, 0.018, 0.003),
          row % 2 === 0 ? materials.roofCourse : materials.roofDark,
        );
        course.position.set(
          centerX,
          upperBaseY + upperHeight * progress + 0.007,
          centerZ + side * halfDepth * (1 - progress),
        );
        course.rotation.x = side * Math.atan2(upperHeight, halfDepth);
        parent.add(course);
      });
    }
    const ridge = new THREE.Mesh(
      roundedBox(Math.max(0.18, ridgeHalfWidth * 2 + 0.18), 0.035, 0.05, 0.009),
      materials.roofDark,
    );
    ridge.position.set(centerX, upperBaseY + upperHeight + 0.025, centerZ);
    parent.add(ridge);
  }

  function addAlunAlunLesehanBlock(group) {
    const block = new THREE.Group();
    block.name = "Lesehan Situbondo frontage · Google Street View 360";
    // Exact OSM building 10 center and orientation. Local +Z is the narrow-lane
    // facade shown by the official 2025 panorama qkiGd_ZJbmzTEFsgeIfQIA.

    const mint = toonMaterial({ color: 0xa2b28d });
    const paleMint = toonMaterial({ color: 0xb7c49d });
    const cream = toonMaterial({ color: 0xcfbf9d });
    const agedCream = toonMaterial({ color: 0xbba984 });
    const timber = toonMaterial({ color: 0x50423b });
    const darkTimber = toonMaterial({ color: 0x2f2a27 });
    const opening = toonMaterial({ color: 0x202a27 });
    const shutter = toonMaterial({ color: 0x685b52 });
    const shutterLine = hideMaterialOutline(toonMaterial({ color: 0x403a35 }));
    const stone = toonMaterial({ color: 0x797b72 });
    const stoneLight = hideMaterialOutline(toonMaterial({ color: 0x999b92 }));
    const glass = toonMaterial({ color: 0x334c4a });
    const red = toonMaterial({ color: 0xbb4e3d });
    const yellow = toonMaterial({ color: 0xd8bd5c });
    const gray = toonMaterial({ color: 0x50585b });
    const rearGray = toonMaterial({ color: 0x424a4e });
    const rearGlass = toonMaterial({ color: 0x627477 });
    const rearGreen = toonMaterial({ color: 0x27845b });
    const roof = toonMaterial({ color: 0x9f4e42 });
    const roofCourse = hideMaterialOutline(toonMaterial({ color: 0xaa6254 }));
    const roofDark = hideMaterialOutline(toonMaterial({ color: 0x743d37 }));
    const corrugated = toonMaterial({ color: 0x767b76 });
    const white = toonMaterial({ color: 0xe9e7dc });
    const menuMaterial = createLesehanMenuMaterial();
    const bambooMaterial = createLesehanBambooMaterial();
    const mainSignMaterial = createLesehanMainSignMaterial();
    const mbahMaterial = createLesehanMbahMaterial();
    const mieMaterial = createLesehanMieMaterial();
    const shutterMarkMaterial = createLesehanShutterMarkMaterial();
    const roofMaterials = { roof, roofCourse, roofDark };

    // The tall gray-and-green mass rising behind the low roadside stalls is the
    // dominant silhouette in the south Street View sequence.
    const rearCenterX = 1.35;
    const rearMass = new THREE.Mesh(roundedBox(2.6, 2.86, 1.15, 0.035), rearGray);
    rearMass.position.set(rearCenterX, 1.43, -0.49);
    block.add(rearMass);
    const rearSouthWing = new THREE.Mesh(roundedBox(1.42, 2.32, 0.92, 0.03), gray);
    rearSouthWing.position.set(0.22, 1.16, -0.3);
    block.add(rearSouthWing);
    [-0.86, 0, 0.86].forEach((xOffset) => {
      const mullion = new THREE.Mesh(roundedBox(0.11, 2.72, 0.1, 0.01), rearGreen);
      mullion.position.set(rearCenterX + xOffset, 1.46, 0.095);
      block.add(mullion);
    });
    [-0.43, 0.43].forEach((xOffset) => {
      const rearWindow = new THREE.Mesh(roundedBox(0.64, 2.35, 0.07, 0.012), rearGlass);
      rearWindow.position.set(rearCenterX + xOffset, 1.58, 0.075);
      block.add(rearWindow);
    });
    [0.58, 1.13, 1.68, 2.23].forEach((y) => {
      const rearSeam = new THREE.Mesh(roundedBox(2.48, 0.018, 0.082, 0.004), gray);
      rearSeam.position.set(rearCenterX, y, 0.09);
      block.add(rearSeam);
    });
    const rearTopTrim = new THREE.Mesh(roundedBox(2.68, 0.065, 1.22, 0.012), agedCream);
    rearTopTrim.position.set(rearCenterX, 2.855, -0.49);
    block.add(rearTopTrim);

    const frontageBase = new THREE.Mesh(roundedBox(5.46, 0.15, 0.78, 0.02), mint);
    frontageBase.position.set(0, 0.075, 1.12);
    block.add(frontageBase);
    const frontageBack = new THREE.Mesh(roundedBox(5.36, 0.79, 0.24, 0.025), darkTimber);
    frontageBack.position.set(0, 0.54, 0.9);
    block.add(frontageBack);

    // North-to-south surveyed order: broad double shutter, recessed timber bay,
    // two Mie Ayam shutters, LUMAYAN, bamboo dining bay and Mbah Kasan.
    const sections = [
      { kind: "doubleShutter", width: 1.04 },
      { kind: "openBay", width: 0.52 },
      { kind: "mie", width: 0.4 },
      { kind: "mie", width: 0.4 },
      { kind: "lumayan", width: 1.23 },
      { kind: "blind", width: 0.9 },
      { kind: "mbah", width: 0.6 },
    ];
    const sectionGap = 0.035;
    const totalSectionWidth = sections.reduce((sum, section) => sum + section.width, 0) +
      sectionGap * (sections.length - 1);
    let sectionCursor = -totalSectionWidth * 0.5;
    sections.forEach((section) => {
      section.centerX = sectionCursor + section.width * 0.5;
      sectionCursor += section.width + sectionGap;
    });
    const sectionByKind = (kind, occurrence = 0) =>
      sections.filter((section) => section.kind === kind)[occurrence];
    const doubleShutterSection = sectionByKind("doubleShutter");
    const openSection = sectionByKind("openBay");
    const miePair = sections.filter((section) => section.kind === "mie");
    const lumayanSection = sectionByKind("lumayan");
    const blindSection = sectionByKind("blind");
    const mbahSection = sectionByKind("mbah");

    sections.forEach((section) => {
      const { centerX, width, kind } = section;
      const isShutter = kind === "doubleShutter" || kind === "mie";
      const bayOpening = new THREE.Mesh(
        roundedBox(width - 0.1, 0.69, 0.055, 0.012),
        isShutter ? shutter : opening,
      );
      bayOpening.position.set(centerX, 0.59, isShutter ? 1.305 : 1.255);
      block.add(bayOpening);
      section.opening = bayOpening;

      for (let y = 0.31; y <= 0.87; y += 0.065) {
        if (!isShutter) continue;
        const line = new THREE.Mesh(
          roundedBox(width - 0.15, 0.007, 0.014, 0.003),
          shutterLine,
        );
        line.position.set(centerX, y, 1.345);
        block.add(line);
      }
      const transom = new THREE.Mesh(roundedBox(width - 0.12, 0.07, 0.075, 0.01), timber);
      transom.position.set(centerX, 0.96, 1.39);
      block.add(transom);
      [-1, 1].forEach((direction) => {
        const brace = new THREE.Mesh(
          roundedBox(width * 0.34, 0.04, 0.05, 0.008),
          timber,
        );
        brace.position.set(centerX + direction * width * 0.19, 1.015, 1.425);
        brace.rotation.z = direction * 0.32;
        block.add(brace);
      });
    });

    const sectionBoundaries = [sections[0].centerX - sections[0].width * 0.5];
    sections.forEach((section) =>
      sectionBoundaries.push(section.centerX + section.width * 0.5));
    sectionBoundaries.forEach((x) => {
      const post = new THREE.Mesh(roundedBox(0.085, 1.02, 0.12, 0.012), timber);
      post.position.set(x, 0.68, 1.36);
      block.add(post);
      const pier = new THREE.Mesh(roundedBox(0.125, 0.43, 0.17, 0.01), stone);
      pier.position.set(x, 0.225, 1.37);
      block.add(pier);
      for (let row = 0; row < 9; row += 1) {
        const y = 0.065 + row * 0.041;
        const stoneCourse = new THREE.Mesh(
          roundedBox(
            0.122 + ((row * 5) % 3) * 0.004,
            0.008,
            0.174 + (row % 2) * 0.004,
            0.002,
          ),
          row % 3 === 0 ? stone : stoneLight,
        );
        stoneCourse.position.set(x + (row % 2 === 0 ? -0.003 : 0.003), y, 1.378);
        block.add(stoneCourse);
      }
      const pierCap = new THREE.Mesh(roundedBox(0.145, 0.025, 0.19, 0.004), darkTimber);
      pierCap.position.set(x, 0.445, 1.375);
      block.add(pierCap);
    });

    const shutterMark = new THREE.Mesh(
      new THREE.PlaneGeometry(doubleShutterSection.width - 0.11, 0.43),
      shutterMarkMaterial,
    );
    shutterMark.position.set(doubleShutterSection.centerX, 0.55, 1.358);
    shutterMark.renderOrder = 5;
    block.add(shutterMark);

    const openBayWall = new THREE.Mesh(
      roundedBox(openSection.width - 0.1, 0.36, 0.16, 0.012),
      darkTimber,
    );
    openBayWall.position.set(openSection.centerX, 0.24, 1.31);
    block.add(openBayWall);
    const openBayRail = new THREE.Mesh(
      roundedBox(openSection.width - 0.14, 0.06, 0.12, 0.008),
      timber,
    );
    openBayRail.position.set(openSection.centerX, 0.47, 1.36);
    block.add(openBayRail);

    [0.33, 0.62, 0.86].forEach((y) => {
      const subdivision = new THREE.Mesh(
        roundedBox(openSection.width - 0.15, 0.035, 0.055, 0.006),
        timber,
      );
      subdivision.position.set(openSection.centerX, y, 1.385);
      block.add(subdivision);
    });
    [-0.18, 0, 0.18].forEach((xOffset) => {
      const subdivision = new THREE.Mesh(
        roundedBox(0.035, 0.47, 0.055, 0.006),
        timber,
      );
      subdivision.position.set(openSection.centerX + xOffset, 0.69, 1.385);
      block.add(subdivision);
    });

    const addFascia = (centerX, width, y = 1.23) => {
      const fascia = new THREE.Mesh(roundedBox(width, 0.17, 0.15, 0.014), cream);
      fascia.position.set(centerX, y, 1.34);
      block.add(fascia);
    };
    addFascia(doubleShutterSection.centerX, doubleShutterSection.width + 0.14, 1.24);
    addFascia(openSection.centerX, openSection.width + 0.09, 1.205);
    const mieMin = miePair[0].centerX - miePair[0].width * 0.5;
    const mieMax = miePair[1].centerX + miePair[1].width * 0.5;
    addFascia((mieMin + mieMax) * 0.5, mieMax - mieMin + 0.11, 1.22);
    addFascia(lumayanSection.centerX, lumayanSection.width + 0.16, 1.245);
    addFascia(blindSection.centerX, blindSection.width + 0.1, 1.205);
    addFascia(mbahSection.centerX, mbahSection.width + 0.16, 1.235);

    addLesehanRoofCourses(
      block,
      lumayanSection.centerX,
      0.82,
      lumayanSection.width + 0.58,
      1.68,
      1.28,
      0.62,
      roofMaterials,
    );
    addLesehanRoofCourses(
      block,
      mbahSection.centerX,
      0.82,
      mbahSection.width + 0.44,
      1.54,
      1.28,
      0.54,
      roofMaterials,
    );
    addLesehanRoofCourses(
      block,
      doubleShutterSection.centerX,
      0.82,
      doubleShutterSection.width + 0.38,
      1.56,
      1.28,
      0.55,
      roofMaterials,
    );
    const mieEave = new THREE.Mesh(
      roundedBox(mieMax - mieMin + 0.18, 0.075, 1.34, 0.012),
      roof,
    );
    mieEave.position.set((mieMin + mieMax) * 0.5, 1.29, 0.84);
    mieEave.rotation.x = -0.06;
    block.add(mieEave);
    const blindCanopy = new THREE.Mesh(
      roundedBox(blindSection.width + 0.18, 0.05, 1.18, 0.012),
      corrugated,
    );
    blindCanopy.position.set(blindSection.centerX, 1.275, 0.95);
    blindCanopy.rotation.x = -0.07;
    block.add(blindCanopy);
    const northCanopy = new THREE.Mesh(
      roundedBox(openSection.width + 0.16, 0.06, 1.06, 0.012),
      corrugated,
    );
    northCanopy.position.set(openSection.centerX, 1.27, 1.02);
    northCanopy.rotation.x = -0.11;
    block.add(northCanopy);

    // LUMAYAN service window and its two stacked signs.
    const serviceWindow = new THREE.Mesh(
      roundedBox(lumayanSection.width - 0.16, 0.31, 0.06, 0.012),
      glass,
    );
    serviceWindow.position.set(lumayanSection.centerX, 0.89, 1.35);
    block.add(serviceWindow);
    [
      lumayanSection.centerX - lumayanSection.width * 0.34,
      lumayanSection.centerX + lumayanSection.width * 0.34,
    ].forEach((x) => {
      const windowPost = new THREE.Mesh(roundedBox(0.07, 0.66, 0.08, 0.01), timber);
      windowPost.position.set(x, 0.67, 1.395);
      block.add(windowPost);
    });
    const lumayanHalfWall = new THREE.Mesh(
      roundedBox(lumayanSection.width - 0.06, 0.57, 0.18, 0.014),
      paleMint,
    );
    lumayanHalfWall.position.set(lumayanSection.centerX, 0.36, 1.31);
    block.add(lumayanHalfWall);
    const mainSignWidth = 1.68;
    const mainSign = new THREE.Mesh(roundedBox(mainSignWidth, 0.38, 0.055, 0.014), gray);
    mainSign.position.set(lumayanSection.centerX - 0.32, 1.09, 1.44);
    mainSign.rotation.z = -0.015;
    block.add(mainSign);
    const mainSignLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(mainSignWidth - 0.04, 0.34),
      mainSignMaterial,
    );
    mainSignLabel.position.set(lumayanSection.centerX - 0.32, 1.09, 1.472);
    mainSignLabel.rotation.z = -0.015;
    mainSignLabel.renderOrder = 5;
    block.add(mainSignLabel);
    const menuBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(lumayanSection.width - 0.08, 0.47),
      menuMaterial,
    );
    menuBoard.position.set(lumayanSection.centerX, 0.355, 1.415);
    menuBoard.renderOrder = 5;
    block.add(menuBoard);

    // The broad rolled bamboo blind hangs over the open dining bay immediately
    // beside LUMAYAN. It is wind-animated without changing any street geometry.
    const bambooBlind = new THREE.Mesh(
      new THREE.PlaneGeometry(blindSection.width + 0.1, 0.7, 18, 7),
      bambooMaterial,
    );
    bambooBlind.position.set(blindSection.centerX, 0.81, 1.44);
    bambooBlind.renderOrder = 4;
    block.add(bambooBlind);
    animatedStopDetails.push({
      object: bambooBlind,
      type: "lesehanBlind",
      phase: 0.7,
      basePositions: bambooBlind.geometry.getAttribute("position").array.slice(),
      halfHeight: 0.35,
      height: 0.7,
    });
    const blindRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, blindSection.width + 0.1, 10),
      agedCream,
    );
    blindRoll.position.set(blindSection.centerX, 1.16, 1.45);
    blindRoll.rotation.z = Math.PI * 0.5;
    block.add(blindRoll);

    // The 360 view shows an open seating gap beneath the hanging blind rather
    // than a solid knee wall. Recess the shadow plane and retain the visible
    // floor and simple timber stools as part of the shopfront architecture.
    const blindOpening = sections.find((section) => section.kind === "blind").opening;
    if (blindOpening) blindOpening.position.z = 1.08;
    const blindFloor = new THREE.Mesh(
      roundedBox(blindSection.width - 0.1, 0.035, 0.48, 0.006),
      agedCream,
    );
    blindFloor.position.set(blindSection.centerX, 0.175, 1.2);
    block.add(blindFloor);
    [-0.22, 0.2].forEach((xOffset) => {
      const seat = new THREE.Mesh(roundedBox(0.22, 0.035, 0.18, 0.006), timber);
      seat.position.set(blindSection.centerX + xOffset, 0.32, 1.32);
      block.add(seat);
      [-0.075, 0.075].forEach((legOffset) => {
        const leg = new THREE.Mesh(roundedBox(0.028, 0.27, 0.028, 0.004), darkTimber);
        leg.position.set(blindSection.centerX + xOffset + legOffset, 0.19, 1.31);
        block.add(leg);
      });
    });

    // Warung Makan Mbah Kasan snack bay.
    const snackCase = new THREE.Mesh(
      roundedBox(mbahSection.width - 0.22, 0.55, 0.1, 0.012),
      glass,
    );
    snackCase.position.set(mbahSection.centerX - 0.03, 0.43, 1.38);
    block.add(snackCase);
    const cokePanel = new THREE.Mesh(roundedBox(0.14, 0.34, 0.055, 0.008), red);
    cokePanel.position.set(mbahSection.centerX + 0.09, 0.33, 1.45);
    block.add(cokePanel);
    const mbahUnderblind = new THREE.Mesh(
      new THREE.PlaneGeometry(mbahSection.width + 0.08, 0.5),
      bambooMaterial,
    );
    mbahUnderblind.position.set(mbahSection.centerX, 0.7, 1.435);
    mbahUnderblind.renderOrder = 3;
    block.add(mbahUnderblind);
    const warungBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(mbahSection.width + 0.44, 0.34, 14, 4),
      mbahMaterial,
    );
    const warungBannerPositions = warungBanner.geometry.getAttribute("position");
    const warungBannerHalfWidth = (mbahSection.width + 0.44) * 0.5;
    for (let index = 0; index < warungBannerPositions.count; index += 1) {
      const x = warungBannerPositions.getX(index);
      const y = warungBannerPositions.getY(index);
      const centerSag = 1 - Math.min(1, Math.abs(x) / warungBannerHalfWidth) ** 2;
      const edgeFray = Math.sin((x / warungBannerHalfWidth + 1) * Math.PI * 5.5) * 0.011;
      warungBannerPositions.setY(index, y - centerSag * 0.052 + (y < 0 ? edgeFray : 0));
      warungBannerPositions.setZ(index, Math.sin(x * 9.5) * 0.012 * centerSag);
    }
    warungBannerPositions.needsUpdate = true;
    warungBanner.geometry.computeVertexNormals();
    warungBanner.position.set(mbahSection.centerX - 0.06, 0.87, 1.46);
    warungBanner.rotation.z = -0.045;
    warungBanner.renderOrder = 5;
    block.add(warungBanner);

    [0.31, 0.43, 0.55, 0.67].forEach((y) => {
      const shelf = new THREE.Mesh(
        roundedBox(mbahSection.width - 0.18, 0.014, 0.032, 0.004),
        white,
      );
      shelf.position.set(mbahSection.centerX - 0.03, y, 1.445);
      block.add(shelf);
    });
    [
      [-0.16, 0.34, red],
      [0, 0.34, yellow],
      [0.16, 0.34, paleMint],
      [-0.13, 0.47, agedCream],
      [0.03, 0.47, red],
      [0.17, 0.47, yellow],
      [-0.17, 0.59, paleMint],
      [-0.02, 0.59, agedCream],
      [0.14, 0.59, red],
    ].forEach(([offsetX, y, material]) => {
      const packet = new THREE.Mesh(roundedBox(0.075, 0.078, 0.026, 0.005), material);
      packet.position.set(mbahSection.centerX - 0.03 + offsetX, y, 1.455);
      block.add(packet);
    });

    // Mie Ayam Podo Moro and the closed brown northern roller shutters.
    miePair.forEach(({ centerX, width }) => {
      const signPanel = new THREE.Mesh(
        roundedBox(width - 0.06, 0.27, 0.045, 0.01),
        yellow,
      );
      signPanel.position.set(centerX, 1.04, 1.46);
      block.add(signPanel);
      const signLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(width - 0.09, 0.23),
        mieMaterial,
      );
      signLabel.position.set(centerX, 1.04, 1.488);
      signLabel.renderOrder = 5;
      block.add(signLabel);
    });

    block.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    placeOnPlanet(
      block,
      -113 / MAP_METERS_PER_WORLD_UNIT,
      -105.7 / MAP_METERS_PER_WORLD_UNIT,
      -surfaceSagitta(Math.hypot(2.75, 1.58)) - FOUNDATION_SINK,
      3.089,
    );
    world.add(block);
    return block;
  }


  return { addAlunAlunLesehanBlock };
}
