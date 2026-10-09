import * as THREE from "three";
import {
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import { hideMaterialOutline, toonMaterial } from "../../rendering/materials.js";

export function createMosqueModelFactory({
  collections: {
    animatedStopDetails,
  },
  helpers: {
    addAlunAlunWalker,
    addLocalPalm,
    createArchPanelGeometry,
    getSitubondoSignMaterial,
  },
}) {
  function addClippedMosqueGrille(
    group,
    material,
    { x, y, z, width, height, directions = [-1, 1], spacing = 0.06 },
  ) {
    const wireThickness = 0.003;
    const halfWidth = (width - wireThickness) * 0.5;
    const halfHeight = (height - wireThickness) * 0.5;
    const slope = 1.4;
    const interceptExtent = halfHeight + slope * halfWidth;
    const strandCount = Math.ceil(interceptExtent / spacing);
    directions.forEach((direction) => {
      for (let strand = -strandCount; strand <= strandCount; strand += 1) {
        const intercept = strand * spacing;
        const startX = Math.max(-halfWidth, (-halfHeight - intercept) / slope);
        const endX = Math.min(halfWidth, (halfHeight - intercept) / slope);
        if (endX <= startX) continue;
        const startY = direction * (slope * startX + intercept);
        const endY = direction * (slope * endX + intercept);
        const wire = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.hypot(endX - startX, endY - startY),
            wireThickness,
            0.008,
          ),
          material,
        );
        wire.position.set(x + (startX + endX) * 0.5, y + (startY + endY) * 0.5, z);
        wire.rotation.z = Math.atan2(endY - startY, endX - startX);
        group.add(wire);
      }
    });
  }

  function addMosqueMedallion(
    group,
    text,
    x,
    y,
    z,
    radius,
    backingMaterial,
    textColor = "#dcc36d",
  ) {
    const medallion = new THREE.Group();
    medallion.position.set(x, y, z);
    const backing = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 24),
      backingMaterial,
    );
    medallion.add(backing);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 1.55, radius * 0.82),
      getSitubondoSignMaterial(text, textColor, 900),
    );
    label.position.z = 0.012;
    label.renderOrder = 5;
    medallion.add(label);
    group.add(medallion);
    return medallion;
  }

  function addMosqueDome(
    group,
    {
      x,
      z,
      baseY,
      radius,
      domeMaterial,
      paleMaterial,
      accentMaterial,
      goldMaterial,
      scaleY = 1.12,
      patternMaterial = paleMaterial,
      secondaryPatternMaterial = accentMaterial,
      patternScale = 1,
      drumMaterial = paleMaterial,
      drumAccentMaterial = null,
      drumPatternMaterial = null,
      drumSecondaryPatternMaterial = drumPatternMaterial,
      faceted = false,
    },
  ) {
    const domeRoot = new THREE.Group();
    domeRoot.position.set(x, 0, z);

    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.72, radius * 0.78, radius * 0.34, 24),
      drumMaterial,
    );
    drum.position.y = baseY - radius * 0.17;
    domeRoot.add(drum);

    if (drumAccentMaterial) {
      [baseY - radius * 0.315, baseY - radius * 0.02].forEach((bandY) => {
        const drumBand = new THREE.Mesh(
          new THREE.TorusGeometry(radius * 0.775, radius * 0.025, 7, 28),
          drumAccentMaterial,
        );
        drumBand.position.y = bandY;
        drumBand.rotation.x = Math.PI * 0.5;
        domeRoot.add(drumBand);
      });
    }

    if (drumPatternMaterial) {
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2;
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(radius * 0.19, radius * 0.19),
          index % 2 === 0 ? drumPatternMaterial : drumSecondaryPatternMaterial,
        );
        panel.position.set(
          Math.sin(angle) * radius * 0.79,
          baseY - radius * 0.17,
          Math.cos(angle) * radius * 0.79,
        );
        panel.lookAt(
          panel.position.clone().add(
            new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)),
          ),
        );
        panel.rotation.z = Math.PI * 0.25;
        domeRoot.add(panel);
      }
    }

    const domeHeight = radius * scaleY;
    const facetedProfile = [
      new THREE.Vector2(radius * 0.86, 0),
      new THREE.Vector2(radius, domeHeight * 0.24),
      new THREE.Vector2(radius * 0.76, domeHeight * 0.54),
      new THREE.Vector2(radius * 0.4, domeHeight * 0.8),
      new THREE.Vector2(0, domeHeight),
    ];
    const dome = new THREE.Mesh(
      faceted
        ? new THREE.LatheGeometry(facetedProfile, 12)
        : new THREE.SphereGeometry(
            radius,
            28,
            16,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.52,
          ),
      domeMaterial,
    );
    dome.position.y = baseY;
    if (!faceted) dome.scale.y = scaleY;
    domeRoot.add(dome);

    const baseBand = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.88, radius * 0.045, 8, 32),
      accentMaterial,
    );
    baseBand.position.y = baseY + radius * 0.015;
    baseBand.rotation.x = Math.PI * 0.5;
    domeRoot.add(baseBand);

    const patternBands = faceted
      ? [
          { level: 0.17, panelCount: 12, panelSize: 0.44 },
          { level: 0.36, panelCount: 12, panelSize: 0.4 },
          { level: 0.56, panelCount: 10, panelSize: 0.34 },
          { level: 0.75, panelCount: 8, panelSize: 0.25 },
        ]
      : [
          { latitude: 0.52, panelCount: 8, panelSize: 0.32 },
          { latitude: 0.9, panelCount: 10, panelSize: 0.27 },
        ];
    patternBands.forEach(({ latitude, level, panelCount, panelSize }, bandIndex) => {
      const facetedRadius = faceted
        ? level <= 0.24
          ? THREE.MathUtils.lerp(radius * 0.86, radius, level / 0.24)
          : level <= 0.54
            ? THREE.MathUtils.lerp(radius, radius * 0.76, (level - 0.24) / 0.3)
            : level <= 0.8
              ? THREE.MathUtils.lerp(radius * 0.76, radius * 0.4, (level - 0.54) / 0.26)
              : THREE.MathUtils.lerp(radius * 0.4, 0, (level - 0.8) / 0.2)
        : 0;
      const horizontalRadius = faceted
        ? facetedRadius * 1.018
        : radius * Math.sin(latitude) * 1.018;
      const panelY = faceted
        ? baseY + domeHeight * level
        : baseY + radius * Math.cos(latitude) * scaleY;
      for (let index = 0; index < panelCount; index += 1) {
        const angle = (index / panelCount) * Math.PI * 2;
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(
            radius * panelSize * patternScale,
            radius * panelSize * patternScale,
          ),
          index % 2 === bandIndex ? patternMaterial : secondaryPatternMaterial,
        );
        panel.position.set(
          Math.sin(angle) * horizontalRadius,
          panelY,
          Math.cos(angle) * horizontalRadius,
        );
        const outward = faceted
          ? new THREE.Vector3(
              Math.sin(angle),
              (radius * 0.92) / domeHeight,
              Math.cos(angle),
            ).normalize()
          : new THREE.Vector3(
              Math.sin(angle) * Math.sin(latitude),
              Math.cos(latitude) / scaleY,
              Math.cos(angle) * Math.sin(latitude),
            ).normalize();
        panel.lookAt(panel.position.clone().add(outward));
        panel.rotateZ(index % 2 === 0 ? Math.PI * 0.25 : -Math.PI * 0.25);
        domeRoot.add(panel);
      }
    });

    const domeTop = baseY + domeHeight;
    const finialPole = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.018, radius * 0.026, radius * 0.34, 8),
      goldMaterial,
    );
    finialPole.position.y = domeTop + radius * 0.17;
    domeRoot.add(finialPole);
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.09, radius * 0.018, 8, 28, Math.PI * 1.55),
      goldMaterial,
    );
    crescent.position.y = domeTop + radius * 0.39;
    crescent.rotation.z = Math.PI * 0.22;
    domeRoot.add(crescent);

    mergeDirectMeshesByMaterial(domeRoot);
    group.add(domeRoot);
    return domeRoot;
  }

  // The prayer-hall roof is not a small onion dome. Google satellite imagery
  // resolves a broad eight-petal crown that fills most of the rear roof, with
  // a low central cap. Keep it separate from the compact corner-dome helper so
  // enlarging it does not turn the real shallow silhouette into a tall bulb.
  function addMosquePetalDome(
    group,
    {
      x,
      z,
      baseY,
      ivoryMaterial,
      greenMaterial,
      darkGreenMaterial,
      goldMaterial,
    },
  ) {
    const domeRoot = new THREE.Group();
    domeRoot.position.set(x, 0, z);

    const apron = new THREE.Mesh(
      new THREE.CylinderGeometry(2.38, 2.48, 0.13, 16),
      darkGreenMaterial,
    );
    apron.position.y = baseY - 0.065;
    domeRoot.add(apron);

    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
        ivoryMaterial,
      );
      petal.position.set(Math.sin(angle) * 0.82, baseY, Math.cos(angle) * 0.82);
      petal.scale.set(0.68, 0.34, 1.62);
      petal.rotation.y = angle;
      domeRoot.add(petal);

      const rib = new THREE.Mesh(
        new THREE.SphereGeometry(1.012, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.5),
        index % 2 === 0 ? greenMaterial : darkGreenMaterial,
      );
      rib.position.copy(petal.position);
      rib.position.y += 0.012;
      rib.scale.set(0.19, 0.355, 1.48);
      rib.rotation.y = angle;
      domeRoot.add(rib);
    }

    const centerCap = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      darkGreenMaterial,
    );
    centerCap.position.y = baseY + 0.23;
    centerCap.scale.y = 0.62;
    domeRoot.add(centerCap);
    const centerCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      ivoryMaterial,
    );
    centerCrown.position.y = baseY + 0.47;
    centerCrown.scale.y = 0.52;
    domeRoot.add(centerCrown);

    const finial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.038, 0.32, 8),
      goldMaterial,
    );
    finial.position.y = baseY + 1.08;
    domeRoot.add(finial);
    const finialBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 7),
      goldMaterial,
    );
    finialBall.position.y = baseY + 1.27;
    domeRoot.add(finialBall);

    mergeDirectMeshesByMaterial(domeRoot);
    group.add(domeRoot);
    return domeRoot;
  }

  function addMosqueModel(group, primaryMaterial) {
    group.name = "Masjid Agung Al-Abror · Google Maps Street View & 360° survey";
    primaryMaterial.color.setHex(0x4ea879);
    primaryMaterial.emissive.setHex(0x214c3b);
    primaryMaterial.emissiveIntensity = 0.16;

    const architecture = new THREE.Group();
    const cream = toonMaterial({ color: 0xd1ad91 });
    const pale = toonMaterial({ color: 0xeee6d5 });
    const sandstone = toonMaterial({ color: 0xb69778 });
    const stone = toonMaterial({ color: 0x817e76 });
    const paver = toonMaterial({ color: 0xc8a993 });
    const paverLight = toonMaterial({ color: 0xe2d3c1 });
    const green = toonMaterial({ color: 0x6f9c4d });
    const lime = toonMaterial({ color: 0xaac56b });
    const gold = toonMaterial({ color: 0xc7a34e, emissive: 0x5e4314, emissiveIntensity: 0.12 });
    const bronzeLattice = hideMaterialOutline(toonMaterial({ color: 0x9f6b2e }));
    const darkOrnament = toonMaterial({ color: 0x25483b });
    const ornamentGreen = toonMaterial({ color: 0x4f7458 });
    const ornamentBrown = toonMaterial({ color: 0x70443b });
    const mosaicAqua = toonMaterial({ color: 0x6d9b83 });
    const mosaicTeal = toonMaterial({ color: 0x3f7666 });
    const trimOchre = toonMaterial({ color: 0xb99a50 });
    const darkGlass = toonMaterial({
      color: 0x1f3436,
      emissive: 0x173e3a,
      emissiveIntensity: 0.28,
    });
    const upperGlass = toonMaterial({
      color: 0x637573,
      emissive: 0x243f3d,
      emissiveIntensity: 0.18,
    });
    const domeIvory = toonMaterial({ color: 0xe8e4d4 });
    const minaretLime = toonMaterial({ color: 0xb9d678 });
    const minaretGreen = toonMaterial({ color: 0x459c49 });
    const minaretBand = toonMaterial({ color: 0xd8dfbc });
    const annexAqua = toonMaterial({ color: 0x69bdb4 });
    const fenceGreen = hideMaterialOutline(toonMaterial({ color: 0x327e4b }));
    const pillarStone = toonMaterial({ color: 0x626761 });
    const black = toonMaterial({ color: 0x202827 });
    const nameWall = toonMaterial({ color: 0x302f2d });
    const canopyMetal = toonMaterial({ color: 0x352b25 });
    const metal = toonMaterial({ color: 0x666d69 });
    const fenceAccent = toonMaterial({ color: 0x424b49 });
    const greenGlow = toonMaterial({
      color: 0x81ffd0,
      emissive: 0x44ffad,
      emissiveIntensity: 0.56,
    });
    const warmGlow = toonMaterial({
      color: 0xffe2a2,
      emissive: 0xffc35b,
      emissiveIntensity: 0.56,
    });

    const site = new THREE.Mesh(roundedBox(7.5, 0.12, 8.7, 0.055), stone);
    site.position.set(0, 0.06, -0.14);
    architecture.add(site);

    // Clip the private forecourt at the surveyed property line. The public
    // 1.50-metre sidewalk and its 15-cm blue-white road curb are owned by the
    // adjoining Alun-Alun corridor, so the old 1.55-metre slab must not extend
    // back across that tread.
    const frontagePropertyEdgeZ = 5.3130374848;
    const forecourtInnerZ = 3.945;
    const forecourtDepth = frontagePropertyEdgeZ - forecourtInnerZ;
    const forecourtCenterZ = (frontagePropertyEdgeZ + forecourtInnerZ) * 0.5;
    const forecourt = new THREE.Mesh(
      roundedBox(7.8, 0.08, forecourtDepth, 0.035),
      paver,
    );
    forecourt.position.set(0, 0.04, forecourtCenterZ);
    architecture.add(forecourt);
    const stripeInnerZ = 4.02;
    const stripeDepth = frontagePropertyEdgeZ - stripeInnerZ;
    const stripeCenterZ = (frontagePropertyEdgeZ + stripeInnerZ) * 0.5;
    for (let index = 0; index < 15; index += 1) {
      const stripe = new THREE.Mesh(
        roundedBox(0.48, 0.014, stripeDepth, 0.006),
        index % 3 === 0 ? paverLight : index % 2 === 0 ? sandstone : paver,
      );
      stripe.position.set(-3.36 + index * 0.48, 0.088, stripeCenterZ);
      architecture.add(stripe);
    }
    const approachInnerZ = 3.98;
    const approachDepth = frontagePropertyEdgeZ - approachInnerZ;
    const approach = new THREE.Mesh(
      roundedBox(1.18, 0.024, approachDepth, 0.012),
      pale,
    );
    approach.position.set(
      0.28,
      0.102,
      (frontagePropertyEdgeZ + approachInnerZ) * 0.5,
    );
    architecture.add(approach);

    // The frontage follows KH Wahid Hasyim, while the mapped prayer-hall
    // footprint is skewed 23.9 degrees behind it. Capture only the hall and
    // rotate it later; the name wall, fence, annex, and minaret stay aligned to
    // the surveyed street edge.
    const hallStartIndex = architecture.children.length;
    const hallToFrontageYaw = -0.4174;
    const hallDepth = 8.24;
    const sideDoorXs = [-2.05, -1.42, 1.42, 2.05];
    const hallBox = (x, z, width, depth, label) => ({
      shape: "box",
      x: Math.cos(hallToFrontageYaw) * x + Math.sin(hallToFrontageYaw) * z,
      z: -Math.sin(hallToFrontageYaw) * x + Math.cos(hallToFrontageYaw) * z,
      width, depth, yaw: hallToFrontageYaw, label,
    });

    const baseCourse = new THREE.Mesh(roundedBox(6.84, 0.24, 8.38, 0.055), stone);
    baseCourse.position.set(0, 0.22, -0.14);
    architecture.add(baseCourse);
    // The public east elevation is a full two-storey frontage.  The former
    // low hall made every bay outside the centre tower read as one storey.
    const body = new THREE.Mesh(roundedBox(6.72, 2.16, hallDepth, 0.06), cream);
    body.position.set(0, 1.2, -0.14);
    architecture.add(body);
    const roofSlab = new THREE.Mesh(roundedBox(6.88, 0.12, 8.4, 0.035), pale);
    roofSlab.position.set(0, 2.33, -0.14);
    architecture.add(roofSlab);

    [
      [0, 2.49, 3.98, 6.84, 0.26, 0.16],
      [0, 2.49, -4.26, 6.84, 0.26, 0.16],
      [-3.36, 2.49, -0.14, 0.16, 0.26, 8.22],
      [3.36, 2.49, -0.14, 0.16, 0.26, 8.22],
    ].forEach(([x, y, z, width, height, depth]) => {
      const parapet = new THREE.Mesh(roundedBox(width, height, depth, 0.025), pale);
      parapet.position.set(x, y, z);
      architecture.add(parapet);
    });

    [-2.64, 2.64].forEach((x) => {
      const cornerTower = new THREE.Mesh(roundedBox(1.04, 2.42, 0.52, 0.035), cream);
      cornerTower.position.set(x, 1.34, 3.82);
      architecture.add(cornerTower);
      const cornerCap = new THREE.Mesh(roundedBox(1.16, 0.16, 0.62, 0.025), pale);
      cornerCap.position.set(x, 2.62, 3.82);
      architecture.add(cornerCap);
      const calligraphyFrame = new THREE.Mesh(
        roundedBox(0.98, 0.34, 0.065, 0.018),
        trimOchre,
      );
      calligraphyFrame.position.set(x, 2.38, 4.08);
      architecture.add(calligraphyFrame);
      const calligraphyPanel = new THREE.Mesh(
        roundedBox(0.9, 0.26, 0.055, 0.018),
        ornamentBrown,
      );
      calligraphyPanel.position.set(x, 2.38, 4.105);
      architecture.add(calligraphyPanel);
      const calligraphy = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.15),
        getSitubondoSignMaterial("لا إله إلا الله", "#e5d5a3", 800, {
          strokeColor: "rgba(53,45,35,.5)",
          strokeScale: 0.008,
          canvasWidth: 2048,
          maxFontSize: 260,
        }),
      );
      calligraphy.position.set(x, 2.38, 4.14);
      calligraphy.renderOrder = 7;
      architecture.add(calligraphy);
      [0.46, 0.84, 1.22, 1.6, 1.98].forEach((y) => {
        const masonryCourse = new THREE.Mesh(
          roundedBox(0.88, 0.018, 0.025, 0.005),
          sandstone,
        );
        masonryCourse.position.set(x, y, 4.13);
        architecture.add(masonryCourse);
      });
    });

    [-1.55, 1.55].forEach((x) => {
      const frontWing = new THREE.Mesh(roundedBox(1.42, 2.16, 0.44, 0.035), cream);
      frontWing.position.set(x, 1.2, 3.81);
      architecture.add(frontWing);
    });

    const centerTower = new THREE.Mesh(
      roundedBox(1.5, 2.94, 0.6, 0.045),
      pale,
    );
    centerTower.position.set(0, 1.61, 3.88);
    architecture.add(centerTower);
    const centerInset = new THREE.Mesh(
      roundedBox(1.28, 2.66, 0.055, 0.025),
      ornamentGreen,
    );
    centerInset.position.set(0, 1.63, 4.205);
    architecture.add(centerInset);
    [-0.65, 0.65].forEach((x) => {
      const towerTrim = new THREE.Mesh(roundedBox(0.1, 2.7, 0.08, 0.018), trimOchre);
      towerTrim.position.set(x, 1.63, 4.21);
      architecture.add(towerTrim);
      for (let tileIndex = 0; tileIndex < 10; tileIndex += 1) {
        const towerTile = new THREE.Mesh(
          roundedBox(0.07, 0.105, 0.025, 0.006),
          tileIndex % 3 === 0
            ? gold
            : tileIndex % 2 === 0
              ? mosaicAqua
              : mosaicTeal,
        );
        towerTile.position.set(x, 0.63 + tileIndex * 0.245, 4.265);
        towerTile.rotation.z = Math.PI * 0.25;
        architecture.add(towerTile);
      }
    });
    const centerCap = new THREE.Mesh(roundedBox(1.65, 0.2, 0.7, 0.03), darkOrnament);
    centerCap.position.set(0, 3.17, 3.88);
    architecture.add(centerCap);
    const centerCapTrim = new THREE.Mesh(roundedBox(1.71, 0.055, 0.73, 0.014), trimOchre);
    centerCapTrim.position.set(0, 3.245, 3.88);
    architecture.add(centerCapTrim);

    const centerPanelFrame = new THREE.Mesh(
      roundedBox(1.18, 0.38, 0.055, 0.022),
      trimOchre,
    );
    centerPanelFrame.position.set(0, 2.83, 4.24);
    architecture.add(centerPanelFrame);
    const centerPanel = new THREE.Mesh(
      roundedBox(1.02, 0.26, 0.035, 0.016),
      ornamentBrown,
    );
    centerPanel.position.set(0, 2.83, 4.275);
    architecture.add(centerPanel);
    const centerCalligraphy = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.16),
        getSitubondoSignMaterial("الله", "#e6d6a2", 900, {
        strokeColor: "rgba(55,47,35,.55)",
        strokeScale: 0.01,
      }),
    );
    centerCalligraphy.position.set(0, 2.83, 4.305);
    centerCalligraphy.renderOrder = 7;
    architecture.add(centerCalligraphy);
    for (let tileIndex = -4; tileIndex <= 4; tileIndex += 1) {
      const lintelTile = new THREE.Mesh(
        roundedBox(0.105, 0.085, 0.025, 0.005),
        tileIndex % 3 === 0
          ? gold
          : tileIndex % 2 === 0
            ? mosaicAqua
            : mosaicTeal,
      );
      lintelTile.position.set(tileIndex * 0.125, 2.56, 4.285);
      architecture.add(lintelTile);
    }

    const outerArch = new THREE.Mesh(createArchPanelGeometry(1.34, 2.36), mosaicAqua);
    outerArch.position.set(0, 0.43, 4.19);
    architecture.add(outerArch);
    const spandrelArch = new THREE.Mesh(
      createArchPanelGeometry(1.23, 2.25),
      ornamentBrown,
    );
    spandrelArch.position.set(0, 0.49, 4.205);
    architecture.add(spandrelArch);
    const mintArch = new THREE.Mesh(createArchPanelGeometry(1.09, 2.1), lime);
    mintArch.position.set(0, 0.56, 4.22);
    architecture.add(mintArch);
    const innerArch = new THREE.Mesh(createArchPanelGeometry(0.96, 1.98), pale);
    innerArch.position.set(0, 0.63, 4.235);
    architecture.add(innerArch);
    const archGlass = new THREE.Mesh(createArchPanelGeometry(0.84, 1.86), upperGlass);
    archGlass.position.set(0, 0.69, 4.25);
    architecture.add(archGlass);
    [-0.22, 0.22].forEach((x) => {
      const archMullion = new THREE.Mesh(
        roundedBox(0.032, 1.52, 0.025, 0.008),
        pale,
      );
      archMullion.position.set(x, 1.47, 4.268);
      architecture.add(archMullion);
    });
    const archCross = new THREE.Mesh(
      roundedBox(0.72, 0.035, 0.025, 0.008),
      pale,
    );
    archCross.position.set(0, 1.78, 4.269);
    architecture.add(archCross);
    const archLatticeBacking = new THREE.Mesh(
      roundedBox(0.16, 0.85, 0.024, 0.006),
      ornamentBrown,
    );
    archLatticeBacking.position.set(0, 1.26, 4.282);
    architecture.add(archLatticeBacking);
    // The amber inserts carry fine diamond mesh in the 270°/245° panoramas,
    // not a sparse rectangular ladder. Keep the strands inside each insert.
    addClippedMosqueGrille(architecture, bronzeLattice, {
      x: 0,
      y: 1.26,
      z: 4.299,
      width: 0.14,
      height: 0.78,
      spacing: 0.026,
    });
    const centralDoor = new THREE.Mesh(roundedBox(0.7, 0.64, 0.06, 0.018), black);
    centralDoor.position.set(0, 0.49, 4.27);
    architecture.add(centralDoor);
    const centralDoorObstacles = [
      hallBox(0, 4.27, 0.7, 0.06, "closed central door backing"),
    ];
    // Below the broad arch, the 245°/270° Google 360 views show a bank of
    // slender glazed entrance leaves with brass heads and stiles, not an
    // uninterrupted black opening. Keep these inside the existing reveal.
    const entranceLeafWidth = 0.124;
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const leafX = (leaf - 2) * entranceLeafWidth;
      const doorGlass = new THREE.Mesh(
        roundedBox(entranceLeafWidth - 0.021, 0.51, 0.012, 0.004),
        darkGlass,
      );
      doorGlass.position.set(leafX, 0.475, 4.307);
      architecture.add(doorGlass);
      centralDoorObstacles.push(hallBox(
        leafX, 4.307, entranceLeafWidth - 0.021, 0.012, "closed central door glass",
      ));
      const doorHead = new THREE.Mesh(
        roundedBox(entranceLeafWidth - 0.014, 0.022, 0.014, 0.004),
        trimOchre,
      );
      doorHead.position.set(leafX, 0.742, 4.312);
      architecture.add(doorHead);
    }
    for (let stileIndex = 0; stileIndex <= 5; stileIndex += 1) {
      const doorStile = new THREE.Mesh(
        roundedBox(0.012, 0.54, 0.014, 0.004),
        trimOchre,
      );
      doorStile.position.set(
        (stileIndex - 2.5) * entranceLeafWidth,
        0.48,
        4.315,
      );
      architecture.add(doorStile);
      centralDoorObstacles.push(hallBox(
        (stileIndex - 2.5) * entranceLeafWidth, 4.315, 0.012, 0.014,
        "closed central door stile",
      ));
    }
    const archRoundel = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.022, 8, 28),
      pale,
    );
    archRoundel.position.set(0, 1.91, 4.285);
    architecture.add(archRoundel);

    sideDoorXs.forEach((x) => {
      const frame = new THREE.Mesh(
        roundedBox(0.64, 1.3, 0.055, 0.018),
        darkOrnament,
      );
      frame.position.set(x, 1.5, 4.1);
      architecture.add(frame);
      const paleFrame = new THREE.Mesh(
        roundedBox(0.54, 1.18, 0.045, 0.014),
        pale,
      );
      paleFrame.position.set(x, 1.5, 4.13);
      architecture.add(paleFrame);
      const window = new THREE.Mesh(
        roundedBox(0.44, 1.08, 0.034, 0.011),
        upperGlass,
      );
      window.position.set(x, 1.5, 4.155);
      architecture.add(window);
      [-0.135, 0.135].forEach((offset) => {
        const windowLine = new THREE.Mesh(
          roundedBox(0.026, 1.0, 0.018, 0.006),
          pale,
        );
        windowLine.position.set(x + offset, 1.5, 4.174);
        architecture.add(windowLine);
      });
      const latticeBacking = new THREE.Mesh(
        roundedBox(0.14, 0.65, 0.02, 0.005),
        ornamentBrown,
      );
      latticeBacking.position.set(x, 1.31, 4.177);
      architecture.add(latticeBacking);
      addClippedMosqueGrille(architecture, bronzeLattice, {
        x,
        y: 1.31,
        z: 4.19,
        width: 0.12,
        height: 0.63,
        spacing: 0.026,
      });
      const windowRoundel = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.018, 7, 24),
        pale,
      );
      windowRoundel.position.set(x, 1.67, 4.188);
      architecture.add(windowRoundel);
      const doorTrim = new THREE.Mesh(roundedBox(0.58, 0.72, 0.05, 0.018), lime);
      doorTrim.position.set(x, 0.43, 4.13);
      architecture.add(doorTrim);
      const door = new THREE.Mesh(roundedBox(0.47, 0.61, 0.04, 0.014), darkGlass);
      door.position.set(x, 0.405, 4.17);
      architecture.add(door);
      for (let tileIndex = 0; tileIndex < 3; tileIndex += 1) {
        const tile = new THREE.Mesh(
          roundedBox(0.12, 0.12, 0.025, 0.008),
          tileIndex === 1 ? ornamentGreen : trimOchre,
        );
        tile.position.set(x - 0.16 + tileIndex * 0.16, 0.88, 4.185);
        if (tileIndex !== 1) tile.rotation.z = Math.PI * 0.25;
        architecture.add(tile);
      }
    });

    // Slender outer lancets bookend the paired lime-framed windows in the real
    // east facade. Keeping them separate also restores the wide peach wall fields.
    [-2.75, -0.92, 0.92, 2.75].forEach((x) => {
      const slitFrame = new THREE.Mesh(
        roundedBox(0.25, 1.64, 0.06, 0.018),
        sandstone,
      );
      slitFrame.position.set(x, 1.43, 4.1);
      architecture.add(slitFrame);
      const slitReveal = new THREE.Mesh(
        roundedBox(0.145, 1.47, 0.032, 0.008),
        pale,
      );
      slitReveal.position.set(x, 1.43, 4.128);
      architecture.add(slitReveal);
      const slit = new THREE.Mesh(
        roundedBox(0.105, 1.43, 0.042, 0.012),
        upperGlass,
      );
      slit.position.set(x, 1.43, 4.14);
      architecture.add(slit);
    });

    [-3.18, -2.08, -0.82, 0.82, 2.08, 3.18].forEach((x) => {
      const pilaster = new THREE.Mesh(roundedBox(0.14, 2.34, 0.16, 0.022), sandstone);
      pilaster.position.set(x, 1.34, 3.98);
      architecture.add(pilaster);
      const trim = new THREE.Mesh(roundedBox(0.19, 0.12, 0.2, 0.018), gold);
      trim.position.set(x, 2.48, 4.0);
      architecture.add(trim);
    });

    [-1, 1].forEach((side, index) => {
      const panelX = side * 1.04;
      const arabesqueFrame = new THREE.Mesh(
        roundedBox(0.84, 0.31, 0.08, 0.022),
        trimOchre,
      );
      arabesqueFrame.position.set(panelX, 2.36, 4.1);
      architecture.add(arabesqueFrame);
      const arabesquePanel = new THREE.Mesh(
        roundedBox(0.76, 0.23, 0.055, 0.018),
        ornamentBrown,
      );
      arabesquePanel.position.set(panelX, 2.36, 4.145);
      architecture.add(arabesquePanel);
      addMosqueMedallion(
        architecture,
        index % 2 === 0 ? "الله" : "محمد",
        panelX,
        2.36,
        4.185,
        0.11,
        darkOrnament,
        "#e7d9b0",
      );
      [-0.25, 0.25].forEach((offset) => {
        const ornament = new THREE.Mesh(
          new THREE.PlaneGeometry(0.11, 0.11),
          pale,
        );
        ornament.position.set(panelX + offset, 2.36, 4.19);
        ornament.rotation.z = Math.PI * 0.25;
        architecture.add(ornament);
      });

      const floralBandX = side * 1.87;
      const floralBand = new THREE.Mesh(
        roundedBox(0.8, 0.27, 0.07, 0.02),
        darkOrnament,
      );
      floralBand.position.set(floralBandX, 2.35, 4.105);
      architecture.add(floralBand);
      for (let panelIndex = -2; panelIndex <= 2; panelIndex += 1) {
        const floralTile = new THREE.Mesh(
          roundedBox(0.1, 0.16, 0.025, 0.006),
          panelIndex % 2 === 0 ? trimOchre : pale,
        );
        floralTile.position.set(
          floralBandX + panelIndex * 0.145,
          2.35,
          4.153,
        );
        architecture.add(floralTile);
      }
    });

    // The hall is skewed behind the road-aligned property boundary. Taper its
    // shallow canopy at that boundary rather than moving the surveyed hall or
    // allowing its northern corner to project over the public pedestrian tread.
    const canopyPropertyLimit = frontagePropertyEdgeZ - 0.012;
    const canopyLocalFrontLimit = (x) =>
      (canopyPropertyLimit + Math.sin(hallToFrontageYaw) * x) /
      Math.cos(hallToFrontageYaw);
    const clipCanopyToProperty = (mesh) => {
      const position = mesh.geometry.getAttribute("position");
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index) + mesh.position.x;
        position.setZ(index, Math.min(
          position.getZ(index),
          canopyLocalFrontLimit(x) - mesh.position.z,
        ));
      }
      position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    };
    const canopy = new THREE.Mesh(
      roundedBox(6.74, 0.055, 0.5, 0.012),
      canopyMetal,
    );
    canopy.position.set(0, 0.84, 4.3);
    clipCanopyToProperty(canopy);
    architecture.add(canopy);
    for (let index = 0; index < 21; index += 1) {
      const corrugation = new THREE.Mesh(
        roundedBox(0.016, 0.018, 0.48, 0.004),
        darkOrnament,
      );
      corrugation.position.set(-3.18 + index * 0.318, 0.875, 4.3);
      clipCanopyToProperty(corrugation);
      architecture.add(corrugation);
    }
    const canopyPostObstacles = [];
    Array.from({ length: 13 }, (_, index) => -3.12 + index * 0.52).forEach((x) => {
      // Include the cap's half-width/depth in the clearance calculation.
      const postZ = Math.min(4.46, canopyLocalFrontLimit(x + 0.0325) - 0.0325);
      const post = new THREE.Mesh(
        roundedBox(0.045, 0.74, 0.045, 0.009),
        canopyMetal,
      );
      post.position.set(x, 0.45, postZ);
      architecture.add(post);
      canopyPostObstacles.push(hallBox(x, postZ, 0.045, 0.045, "canopy post"));
      const postCap = new THREE.Mesh(
        roundedBox(0.065, 0.035, 0.065, 0.008),
        trimOchre,
      );
      postCap.position.set(x, 0.81, postZ);
      architecture.add(postCap);
    });
    for (let index = 0; index < 7; index += 1) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), warmGlow);
      light.position.set(-2.55 + index * 0.85, 0.82, 4.5);
      architecture.add(light);
    }

    for (const side of [-1, 1]) {
      [-3.0, -1.55, -0.1, 1.35].forEach((z) => {
        const frame = new THREE.Mesh(roundedBox(0.055, 0.78, 0.5, 0.02), green);
        frame.position.set(side * 3.38, 0.96, z);
        architecture.add(frame);
        const window = new THREE.Mesh(roundedBox(0.035, 0.62, 0.34, 0.015), darkGlass);
        window.position.set(side * 3.425, 0.97, z);
        architecture.add(window);
      });
    }
    [-2.4, -1.2, 0, 1.2, 2.4].forEach((x) => {
      const frame = new THREE.Mesh(roundedBox(0.58, 0.8, 0.055, 0.022), green);
      frame.position.set(x, 0.97, -4.3);
      architecture.add(frame);
      const window = new THREE.Mesh(roundedBox(0.4, 0.64, 0.035, 0.016), darkGlass);
      window.position.set(x, 0.98, -4.345);
      architecture.add(window);
    });

    addMosquePetalDome(architecture, {
      x: -0.88,
      z: -1.58,
      baseY: 2.38,
      ivoryMaterial: domeIvory,
      greenMaterial: green,
      darkGreenMaterial: darkOrnament,
      goldMaterial: gold,
    });
    [-2.62, 2.62].forEach((x) => {
      addMosqueDome(architecture, {
        x,
        z: 2.6,
        baseY: 2.74,
        radius: 0.56,
        domeMaterial: domeIvory,
        paleMaterial: pale,
        accentMaterial: green,
        goldMaterial: gold,
        scaleY: 1.42,
        patternMaterial: green,
        secondaryPatternMaterial: pale,
        patternScale: 1.25,
        drumMaterial: darkOrnament,
        drumAccentMaterial: gold,
        drumPatternMaterial: pale,
        drumSecondaryPatternMaterial: green,
        faceted: true,
      });
    });

    // The latest frontage carries three compact freestanding green name rows,
    // supported above the central tower rather than painted on a black board.
    [-0.55, 0.55].forEach((x) => {
      const support = new THREE.Mesh(
        roundedBox(0.035, 0.46, 0.035, 0.009),
        darkOrnament,
      );
      support.position.set(x, 3.5, 4.3);
      architecture.add(support);
    });
    [
      ["MASJID AGUNG", 3.72, 1.32, 0.13, 2800, 410],
      ["AL-ABROR", 3.55, 1.46, 0.18, 2048, 400],
      ["SITUBONDO", 3.38, 1.16, 0.115, 2048, 380],
    ].forEach(([text, y, width, height, canvasWidth, maxFontSize]) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        getSitubondoSignMaterial(
          text,
          "#317e50",
          800,
          {
            strokeColor: "rgba(24,65,42,.42)",
            strokeScale: 0.006,
            canvasWidth,
            canvasHeight: 512,
            maxFontSize,
          },
        ),
      );
      label.position.set(0, y, 4.31);
      label.renderOrder = 7;
      architecture.add(label);
    });

    const hallRoot = new THREE.Group();
    hallRoot.name = "Al-Abror prayer hall · OSM footprint bearing";
    architecture.children
      .slice(hallStartIndex)
      .forEach((child) => hallRoot.add(child));
    hallRoot.rotation.y = hallToFrontageYaw;
    mergeDirectMeshesByMaterial(hallRoot);
    architecture.add(hallRoot);

    // Single-storey south-side guard booth visible in every public east
    // panorama, immediately inside the compound beside the name wall.
    const annexFoundation = new THREE.Mesh(
      roundedBox(2.04, 0.13, 1.36, 0.035),
      stone,
    );
    annexFoundation.position.set(-4.02, 0.065, 3.48);
    architecture.add(annexFoundation);
    const annexBody = new THREE.Mesh(
      roundedBox(1.86, 0.74, 1.16, 0.04),
      pale,
    );
    annexBody.position.set(-4.02, 0.5, 3.48);
    architecture.add(annexBody);
    const annexRoof = new THREE.Mesh(
      createHippedRoofGeometry(2.12, 1.44, 0.24),
      // Keep the non-UV hipped roof out of the rounded-fascia merge bucket.
      annexAqua.clone(),
    );
    annexRoof.position.set(-4.02, 0.87, 3.48);
    architecture.add(annexRoof);
    const annexFascia = new THREE.Mesh(
      roundedBox(2.14, 0.08, 0.07, 0.012),
      annexAqua,
    );
    annexFascia.position.set(-4.02, 0.87, 4.19);
    architecture.add(annexFascia);
    const annexGlazing = new THREE.Mesh(
      roundedBox(1.66, 0.5, 0.045, 0.012),
      darkOrnament,
    );
    annexGlazing.position.set(-4.02, 0.38, 4.075);
    architecture.add(annexGlazing);
    [-4.54, -4.02, -3.5].forEach((x, index) => {
      const annexPane = new THREE.Mesh(
        roundedBox(0.44, 0.42, 0.025, 0.008),
        index === 1 ? upperGlass : darkGlass,
      );
      annexPane.position.set(x, 0.38, 4.105);
      architecture.add(annexPane);
      const annexMullion = new THREE.Mesh(
        roundedBox(0.035, 0.48, 0.025, 0.006),
        metal,
      );
      annexMullion.position.set(x - 0.25, 0.38, 4.116);
      architecture.add(annexMullion);
    });
    [-4.48, -3.56].forEach((x) => {
      const vent = new THREE.Mesh(
        roundedBox(0.42, 0.09, 0.03, 0.006),
        ornamentBrown,
      );
      vent.position.set(x, 0.73, 4.095);
      architecture.add(vent);
      for (let index = -2; index <= 2; index += 1) {
        const ventSlot = new THREE.Mesh(
          roundedBox(0.045, 0.035, 0.012, 0.003),
          black,
        );
        ventSlot.position.set(x + index * 0.07, 0.73, 4.116);
        architecture.add(ventSlot);
      }
    });
    const annexPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.085),
      getSitubondoSignMaterial("POS JAGA", "#365842", 800, {
        strokeScale: 0,
        canvasWidth: 1536,
        maxFontSize: 230,
      }),
    );
    annexPlaque.position.set(-4.02, 0.73, 4.122);
    annexPlaque.renderOrder = 7;
    architecture.add(annexPlaque);

    const minaret = new THREE.Group();
    minaret.position.set(3.72, 0, 2.34);
    const minaretBase = new THREE.Mesh(roundedBox(1.02, 0.18, 0.96, 0.04), stone);
    minaretBase.position.y = 0.09;
    minaret.add(minaretBase);
    const minaretShaft = new THREE.Mesh(
      roundedBox(0.82, 5.02, 0.78, 0.035),
      minaretLime,
    );
    minaretShaft.position.y = 2.69;
    minaret.add(minaretShaft);
    [-0.37, 0.37].forEach((offset) => {
      [-0.35, 0.35].forEach((depth) => {
        const corner = new THREE.Mesh(
          roundedBox(0.085, 4.94, 0.085, 0.016),
          minaretGreen,
        );
        corner.position.set(offset, 2.68, depth);
        minaret.add(corner);
      });
    });
    [1.18, 2.43, 3.68].forEach((y) => {
      [-1, 1].forEach((side) => {
        const frontWindowFrame = new THREE.Mesh(
          roundedBox(0.27, 0.78, 0.035, 0.012),
          minaretGreen,
        );
        frontWindowFrame.position.set(0, y, side * 0.395);
        minaret.add(frontWindowFrame);
        const frontWindow = new THREE.Mesh(
          roundedBox(0.17, 0.68, 0.025, 0.01),
          upperGlass,
        );
        frontWindow.position.set(0, y, side * 0.42);
        minaret.add(frontWindow);
        const sideWindowFrame = new THREE.Mesh(
          roundedBox(0.035, 0.78, 0.27, 0.012),
          minaretGreen,
        );
        sideWindowFrame.position.set(side * 0.415, y, 0);
        minaret.add(sideWindowFrame);
        const sideWindow = new THREE.Mesh(
          roundedBox(0.025, 0.68, 0.17, 0.01),
          upperGlass,
        );
        sideWindow.position.set(side * 0.44, y, 0);
        minaret.add(sideWindow);
      });
    });
    [-1, 1].forEach((side) => {
      const frontUpperWindow = new THREE.Mesh(
        roundedBox(0.19, 0.38, 0.025, 0.009),
        upperGlass,
      );
      frontUpperWindow.position.set(0, 4.67, side * 0.415);
      minaret.add(frontUpperWindow);
      const sideUpperWindow = new THREE.Mesh(
        roundedBox(0.025, 0.38, 0.19, 0.009),
        upperGlass,
      );
      sideUpperWindow.position.set(side * 0.435, 4.67, 0);
      minaret.add(sideUpperWindow);
    });
    const minaretCap = new THREE.Mesh(
      roundedBox(0.98, 0.13, 0.92, 0.025),
      minaretGreen,
    );
    minaretCap.position.y = 5.2;
    minaret.add(minaretCap);
    const minaretBalcony = new THREE.Mesh(
      roundedBox(1.28, 0.13, 1.2, 0.03),
      minaretBand,
    );
    minaretBalcony.position.y = 5.32;
    minaret.add(minaretBalcony);
    [-1, 1].forEach((side) => {
      [5.42, 5.55].forEach((y) => {
        const balconyFrontRail = new THREE.Mesh(
          roundedBox(1.18, 0.032, 0.032, 0.008),
          metal,
        );
        balconyFrontRail.position.set(0, y, side * 0.57);
        minaret.add(balconyFrontRail);
        const balconySideRail = new THREE.Mesh(
          roundedBox(0.032, 0.032, 1.08, 0.008),
          metal,
        );
        balconySideRail.position.set(side * 0.61, y, 0);
        minaret.add(balconySideRail);
      });
      [-0.48, 0, 0.48].forEach((x) => {
        const balconyFrontPost = new THREE.Mesh(
          roundedBox(0.025, 0.18, 0.025, 0.006),
          metal,
        );
        balconyFrontPost.position.set(x, 5.48, side * 0.57);
        minaret.add(balconyFrontPost);
      });
      [-0.43, 0, 0.43].forEach((z) => {
        const balconySidePost = new THREE.Mesh(
          roundedBox(0.025, 0.18, 0.025, 0.006),
          metal,
        );
        balconySidePost.position.set(side * 0.61, 5.48, z);
        minaret.add(balconySidePost);
      });
    });
    const upperStage = new THREE.Mesh(
      roundedBox(0.76, 0.86, 0.7, 0.03),
      minaretLime,
    );
    upperStage.position.y = 5.95;
    minaret.add(upperStage);
    [-0.33, 0.33].forEach((offset) => {
      [-0.3, 0.3].forEach((depth) => {
        const lanternCorner = new THREE.Mesh(
          roundedBox(0.075, 0.82, 0.075, 0.014),
          minaretGreen,
        );
        lanternCorner.position.set(offset, 5.95, depth);
        minaret.add(lanternCorner);
      });
    });
    [-1, 1].forEach((side) => {
      const frontOpening = new THREE.Mesh(
        createArchPanelGeometry(0.34, 0.56),
        darkGlass,
      );
      frontOpening.position.set(0, 5.63, side * 0.356);
      if (side < 0) frontOpening.rotation.y = Math.PI;
      minaret.add(frontOpening);
      const sideOpening = new THREE.Mesh(
        createArchPanelGeometry(0.32, 0.56),
        darkGlass,
      );
      sideOpening.position.set(side * 0.386, 5.63, 0);
      sideOpening.rotation.y = side * Math.PI * 0.5;
      minaret.add(sideOpening);
    });
    const upperCornice = new THREE.Mesh(
      roundedBox(1.02, 0.14, 0.96, 0.028),
      minaretBand,
    );
    upperCornice.position.y = 6.43;
    minaret.add(upperCornice);
    addMosqueDome(minaret, {
      x: 0,
      z: 0,
      baseY: 6.52,
      radius: 0.49,
      domeMaterial: domeIvory,
      paleMaterial: pale,
      accentMaterial: minaretGreen,
      goldMaterial: gold,
      scaleY: 0.92,
      patternMaterial: minaretGreen,
      secondaryPatternMaterial: minaretLime,
      patternScale: 0.82,
      drumMaterial: darkOrnament,
      drumAccentMaterial: minaretGreen,
      faceted: true,
    });
    mergeDirectMeshesByMaterial(minaret);
    architecture.add(minaret);

    const continuousNameWall = new THREE.Mesh(
      roundedBox(3.5, 0.76, 0.13, 0.025),
      nameWall,
    );
    continuousNameWall.position.set(-1.82, 0.43, 5.18);
    architecture.add(continuousNameWall);
    [-3.32, -2.82, -2.32, -1.82, -1.32, -0.82, -0.32].forEach((x) => {
      const wallJoint = new THREE.Mesh(
        roundedBox(0.012, 0.7, 0.012, 0.003),
        fenceAccent,
      );
      wallJoint.position.set(x, 0.43, 5.252);
      architecture.add(wallJoint);
    });
    [0.18, 0.43, 0.68].forEach((y) => {
      const wallJoint = new THREE.Mesh(
        roundedBox(3.38, 0.012, 0.012, 0.003),
        fenceAccent,
      );
      wallJoint.position.set(-1.82, y, 5.252);
      architecture.add(wallJoint);
    });
    const leftNamePost = new THREE.Mesh(
      roundedBox(0.27, 0.86, 0.27, 0.025),
      pillarStone,
    );
    leftNamePost.position.set(-3.62, 0.46, 5.175);
    architecture.add(leftNamePost);
    const rightNamePost = leftNamePost.clone();
    rightNamePost.position.x = -0.02;
    architecture.add(rightNamePost);
    const mosqueName = new THREE.Mesh(
      new THREE.PlaneGeometry(3.25, 0.28),
      getSitubondoSignMaterial("MASJID AGUNG AL-ABROR", "#d4b15c", 900, {
        strokeColor: "rgba(55,42,25,.55)",
        strokeScale: 0.012,
        canvasWidth: 4096,
        maxFontSize: 270,
      }),
    );
    mosqueName.position.set(-1.82, 0.52, 5.26);
    mosqueName.renderOrder = 7;
    architecture.add(mosqueName);
    const regencyName = new THREE.Mesh(
      new THREE.PlaneGeometry(2.82, 0.17),
      getSitubondoSignMaterial("KABUPATEN SITUBONDO", "#caae65", 900, {
        strokeColor: "rgba(55,42,25,.55)",
        strokeScale: 0.012,
        canvasWidth: 4096,
        maxFontSize: 250,
      }),
    );
    regencyName.position.set(-1.82, 0.27, 5.265);
    regencyName.renderOrder = 7;
    architecture.add(regencyName);
    [0.62, 3.62].forEach((x) => {
      const gatePost = new THREE.Mesh(
        roundedBox(0.27, 0.88, 0.27, 0.025),
        pillarStone,
      );
      gatePost.position.set(x, 0.47, 5.175);
      architecture.add(gatePost);
    });
    [-3.62, -0.02, 0.62, 3.62].forEach((x) => {
      const postInset = new THREE.Mesh(roundedBox(0.07, 0.58, 0.025, 0.008), metal);
      postInset.position.set(x, 0.48, 5.292);
      architecture.add(postInset);
    });

    // The forecourt is walkable: leave the pedestrian leaf open inward, not
    // a visibly closed grille that the player can walk straight through.
    const pedestrianGate = new THREE.Group();
    pedestrianGate.name = "mosque-pedestrian-gate-open";
    pedestrianGate.position.set(0.06, 0, 5.2);
    pedestrianGate.rotation.y = Math.PI / 2;
    architecture.add(pedestrianGate);
    [0.16, 0.68].forEach((y) => {
      const gateRail = new THREE.Mesh(
        roundedBox(0.48, 0.035, 0.045, 0.007),
        gold,
      );
      gateRail.position.set(0.24, y, 0);
      pedestrianGate.add(gateRail);
    });
    [-0.22, 0.22].forEach((xOffset) => {
      const gateStile = new THREE.Mesh(
        roundedBox(0.035, 0.56, 0.045, 0.007),
        gold,
      );
      gateStile.position.set(0.24 + xOffset, 0.42, 0);
      pedestrianGate.add(gateStile);
    });
    addClippedMosqueGrille(pedestrianGate, fenceGreen, {
      x: 0.24,
      y: 0.42,
      z: 0,
      width: 0.42,
      height: 0.5,
    });
    mergeDirectMeshesByMaterial(pedestrianGate);

    [0.18, 0.76].forEach((y) => {
      const rail = new THREE.Mesh(
        roundedBox(2.8, 0.045, 0.055, 0.01),
        gold,
      );
      rail.position.set(2.12, y, 5.18);
      architecture.add(rail);
    });
    const fenceStart = 0.72;
    const fenceEnd = 3.52;
    const fencePanelCount = 6;
    const fencePanelWidth = (fenceEnd - fenceStart) / fencePanelCount;
    for (let index = 0; index <= fencePanelCount; index += 1) {
      const bar = new THREE.Mesh(
        roundedBox(0.035, 0.58, 0.038, 0.009),
        gold,
      );
      bar.position.set(fenceStart + index * fencePanelWidth, 0.47, 5.2);
      architecture.add(bar);
    }
    for (let index = 0; index < fencePanelCount; index += 1) {
      const panelCenter = fenceStart + (index + 0.5) * fencePanelWidth;
      addClippedMosqueGrille(architecture, fenceGreen, {
        x: panelCenter,
        y: 0.47,
        z: 5.2,
        width: fencePanelWidth - 0.02,
        height: 0.55,
      });
      const flower = new THREE.Mesh(
        roundedBox(0.1, 0.1, 0.025, 0.006),
        gold,
      );
      flower.position.set(panelCenter, 0.47, 5.248);
      flower.rotation.z = Math.PI * 0.25;
      architecture.add(flower);
      const flowerCenter = new THREE.Mesh(
        new THREE.CircleGeometry(0.035, 12),
        ornamentBrown,
      );
      flowerCenter.position.set(panelCenter, 0.47, 5.265);
      architecture.add(flowerCenter);
    }

    const leftPalm = addLocalPalm(architecture, -2.5, 4.42, 1.05);
    const rightPalm = addLocalPalm(architecture, 2.82, 4.4, 1.18);
    animatedStopDetails.push({ object: leftPalm, type: "parkPalm", phase: 0.7, strength: 0.014 });
    animatedStopDetails.push({ object: rightPalm, type: "parkPalm", phase: 2.2, strength: 0.014 });
    addAlunAlunWalker(architecture, 0x55788d, 0.5, 1.25, 0.12, 0.1, 0.25, 4.45);
    addAlunAlunWalker(architecture, 0x9b604b, 3.2, 1.05, 0.1, -0.085, 0.15, 4.5);

    animatedStopDetails.push({ type: "parkLamp", material: greenGlow, phase: 0.3 });
    animatedStopDetails.push({ type: "parkLamp", material: warmGlow, phase: 2.6 });

    group.userData.navigation = {
      surfaces: [
        // The public KH Wahid Hasyim sidewalk is now one surveyed polygon in
        // the Alun-Alun landmark. The former local box extended 2.5 metres
        // into the reconstructed asphalt and produced a hidden height seam.
        { x: 0, z: forecourtCenterZ, width: 7.8, depth: forecourtDepth, height: 0.08, label: "front forecourt" },
        // Match the existing stone slab beneath the skewed hall. Omitting it
        // made the inner forecourt edge behave like a drop to bare ground.
        { x: 0, z: -0.14, width: 7.5, depth: 8.7, height: 0.12, label: "site slab" },
      ],
      obstacles: [
        { shape: "box", x: 0.057, z: -0.128, width: 6.76, depth: hallDepth, yaw: hallToFrontageYaw, label: "prayer hall" },
        // Closed door leaves and frames protrude beyond the main hall box.
        // Match their individual footprints, not a full-width phantom wall.
        ...sideDoorXs.flatMap((x) => [
          hallBox(x, 4.13, 0.58, 0.05, "closed side door frame"),
          hallBox(x, 4.17, 0.47, 0.04, "closed side door"),
        ]),
        ...canopyPostObstacles,
        ...centralDoorObstacles,
        { shape: "box", x: -4.02, z: 3.48, width: 1.82, depth: 1.16, label: "south-side guard booth" },
        { shape: "box", x: 3.72, z: 2.34, width: 1.1, depth: 1.02, label: "minaret" },
        { shape: "box", x: -1.82, z: 5.2, width: 3.64, depth: 0.22, label: "name wall" },
        { shape: "box", x: 2.12, z: 5.18, width: 3.08, depth: 0.18, label: "front fence" },
        { shape: "box", x: 0.06, z: 4.96, width: 0.045, depth: 0.48, label: "pedestrian gate leaf" },
        ...[-0.02, 0.62].map((x) => ({
          shape: "box", x, z: 5.175, width: 0.27, depth: 0.27,
          label: "pedestrian gate post",
        })),
        { shape: "circle", x: -2.5, z: 4.42, radius: 0.13, label: "front palm" },
        { shape: "circle", x: 2.82, z: 4.4, radius: 0.13, label: "front palm" },
      ],
      deliveryTarget: { x: 0.3, z: 4.65, height: 0.08 },
    };

    mergeDirectMeshesByMaterial(architecture);
    group.add(architecture);
  }


  return { addMosqueModel };
}
