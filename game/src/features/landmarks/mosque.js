import * as THREE from "three";
import {
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import { toonMaterial } from "../../rendering/materials.js";

export function createMosqueModelFactory({
  collections: {
    animatedStopDetails,
  },
  helpers: {
    addAlunAlunWalker,
    addLocalPalm,
    addSitubondoSign,
    createArchPanelGeometry,
    getSitubondoSignMaterial,
  },
}) {
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
    const redMullion = toonMaterial({ color: 0x713c3a });
    const gold = toonMaterial({ color: 0xc7a34e, emissive: 0x5e4314, emissiveIntensity: 0.12 });
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
    const domeIvory = toonMaterial({ color: 0xe8e4d4 });
    const minaretLime = toonMaterial({ color: 0xa9c77a });
    const minaretGreen = toonMaterial({ color: 0x57954d });
    const minaretBand = toonMaterial({ color: 0xd8dfbc });
    const annexAqua = toonMaterial({ color: 0x77b4a6 });
    const fenceGreen = toonMaterial({ color: 0x327e4b });
    const pillarStone = toonMaterial({ color: 0x626761 });
    const black = toonMaterial({ color: 0x202827 });
    const nameWall = toonMaterial({ color: 0x4a403c });
    const metal = toonMaterial({ color: 0x666d69 });
    const fenceAccent = toonMaterial({ color: 0x424b49 });
    const curbBlue = toonMaterial({ color: 0x2376a0 });
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

    const forecourt = new THREE.Mesh(roundedBox(7.8, 0.08, 1.55, 0.035), paver);
    forecourt.position.set(0, 0.04, 4.72);
    architecture.add(forecourt);
    for (let index = 0; index < 15; index += 1) {
      const stripe = new THREE.Mesh(
        roundedBox(0.48, 0.014, 1.4, 0.006),
        index % 3 === 0 ? paverLight : index % 2 === 0 ? sandstone : paver,
      );
      stripe.position.set(-3.36 + index * 0.48, 0.088, 4.72);
      architecture.add(stripe);
    }
    const approach = new THREE.Mesh(roundedBox(1.18, 0.024, 1.48, 0.012), pale);
    approach.position.set(0.28, 0.102, 4.72);
    architecture.add(approach);

    for (let index = 0; index < 18; index += 1) {
      const curb = new THREE.Mesh(
        roundedBox(0.44, 0.16, 0.28, 0.018),
        index % 2 === 0 ? curbBlue : pale,
      );
      curb.position.set(-3.74 + index * 0.44, 0.08, 5.56);
      architecture.add(curb);
    }

    const baseCourse = new THREE.Mesh(roundedBox(6.84, 0.24, 7.84, 0.055), stone);
    baseCourse.position.set(0, 0.22, -0.14);
    architecture.add(baseCourse);
    // The public east elevation is a full two-storey frontage.  The former
    // low hall made every bay outside the centre tower read as one storey.
    const body = new THREE.Mesh(roundedBox(6.72, 2.16, 7.72, 0.06), cream);
    body.position.set(0, 1.2, -0.14);
    architecture.add(body);
    const roofSlab = new THREE.Mesh(roundedBox(6.88, 0.12, 7.88, 0.035), pale);
    roofSlab.position.set(0, 2.33, -0.14);
    architecture.add(roofSlab);

    [
      [0, 2.49, 3.78, 6.84, 0.26, 0.16],
      [0, 2.49, -4.06, 6.84, 0.26, 0.16],
      [-3.36, 2.49, -0.14, 0.16, 0.26, 7.7],
      [3.36, 2.49, -0.14, 0.16, 0.26, 7.7],
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
        new THREE.PlaneGeometry(0.64, 0.14),
        getSitubondoSignMaterial("الله", "#d8c36f", 900, {
          strokeColor: "rgba(53,45,35,.5)",
          strokeScale: 0.012,
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
      getSitubondoSignMaterial("محمد", "#e0ca76", 900, {
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

    const outerArch = new THREE.Mesh(createArchPanelGeometry(1.28, 2.32), mosaicAqua);
    outerArch.position.set(0, 0.43, 4.19);
    architecture.add(outerArch);
    const ornamentArch = new THREE.Mesh(createArchPanelGeometry(1.17, 2.18), trimOchre);
    ornamentArch.position.set(0, 0.5, 4.205);
    architecture.add(ornamentArch);
    const innerArch = new THREE.Mesh(createArchPanelGeometry(0.96, 1.98), pale);
    innerArch.position.set(0, 0.61, 4.22);
    architecture.add(innerArch);
    const archGlass = new THREE.Mesh(createArchPanelGeometry(0.79, 1.83), darkGlass);
    archGlass.position.set(0, 0.68, 4.235);
    architecture.add(archGlass);
    [-0.19, 0, 0.19].forEach((x) => {
      const archMullion = new THREE.Mesh(
        roundedBox(0.032, 1.68, 0.025, 0.008),
        redMullion,
      );
      archMullion.position.set(x, 1.52, 4.253);
      architecture.add(archMullion);
    });
    [
      [1.05, 0.61],
      [1.38, 0.63],
      [1.71, 0.55],
    ].forEach(([y, width]) => {
      const archCross = new THREE.Mesh(
        roundedBox(width, 0.035, 0.025, 0.008),
        redMullion,
      );
      archCross.position.set(0, y, 4.254);
      architecture.add(archCross);
    });
    const centralDoor = new THREE.Mesh(roundedBox(0.7, 0.64, 0.06, 0.018), black);
    centralDoor.position.set(0, 0.49, 4.27);
    architecture.add(centralDoor);
    const archRoundel = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.023, 8, 28),
      trimOchre,
    );
    archRoundel.position.set(0, 1.94, 4.27);
    architecture.add(archRoundel);

    [-1.82, -1.1, 1.1, 1.82].forEach((x) => {
      const frame = new THREE.Mesh(createArchPanelGeometry(0.66, 1.42), lime);
      frame.position.set(x, 0.88, 4.1);
      architecture.add(frame);
      const paleFrame = new THREE.Mesh(createArchPanelGeometry(0.57, 1.33), pale);
      paleFrame.position.set(x, 0.925, 4.125);
      architecture.add(paleFrame);
      const window = new THREE.Mesh(createArchPanelGeometry(0.46, 1.21), darkGlass);
      window.position.set(x, 0.985, 4.15);
      architecture.add(window);
      const windowLine = new THREE.Mesh(roundedBox(0.03, 1.05, 0.018, 0.006), redMullion);
      windowLine.position.set(x, 1.515, 4.168);
      architecture.add(windowLine);
      const windowRoundel = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.018, 7, 24),
        pale,
      );
      windowRoundel.position.set(x, 1.965, 4.175);
      architecture.add(windowRoundel);
      const doorTrim = new THREE.Mesh(roundedBox(0.58, 0.72, 0.05, 0.018), lime);
      doorTrim.position.set(x, 0.43, 4.13);
      architecture.add(doorTrim);
      const door = new THREE.Mesh(roundedBox(0.47, 0.61, 0.04, 0.014), darkGlass);
      door.position.set(x, 0.405, 4.17);
      architecture.add(door);
      for (let tileIndex = 0; tileIndex < 3; tileIndex += 1) {
        const tile = new THREE.Mesh(roundedBox(0.12, 0.12, 0.025, 0.008), gold);
        tile.position.set(x - 0.16 + tileIndex * 0.16, 0.8, 4.185);
        architecture.add(tile);
      }
      addMosqueMedallion(architecture, "محمد", x, 1.62, 4.18, 0.072, darkOrnament);
    });

    // Slender outer lancets bookend the paired lime-framed windows in the real
    // east facade. Keeping them separate also restores the wide peach wall fields.
    [-2.75, 2.75].forEach((x) => {
      const slitFrame = new THREE.Mesh(
        roundedBox(0.25, 1.64, 0.06, 0.018),
        sandstone,
      );
      slitFrame.position.set(x, 1.43, 4.1);
      architecture.add(slitFrame);
      const slit = new THREE.Mesh(
        roundedBox(0.105, 1.43, 0.042, 0.012),
        darkGlass,
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

    [-1.55, 1.55].forEach((x) => {
      const frieze = new THREE.Mesh(roundedBox(1.36, 0.3, 0.08, 0.025), ornamentGreen);
      frieze.position.set(x, 2.36, 4.1);
      architecture.add(frieze);
      [2.205, 2.515].forEach((y) => {
        const friezeTrim = new THREE.Mesh(
          roundedBox(1.44, 0.045, 0.035, 0.012),
          trimOchre,
        );
        friezeTrim.position.set(x, y, 4.145);
        architecture.add(friezeTrim);
      });
      for (let panelIndex = -2; panelIndex <= 2; panelIndex += 1) {
        const panel = new THREE.Mesh(
          roundedBox(0.18, 0.17, 0.025, 0.008),
          panelIndex % 2 === 0 ? ornamentBrown : darkOrnament,
        );
        panel.position.set(x + panelIndex * 0.245, 2.36, 4.155);
        architecture.add(panel);
      }
    });
    [-1.55, 1.55].forEach((x, index) => {
      addMosqueMedallion(
        architecture,
        index % 2 === 0 ? "الله" : "محمد",
        x,
        2.36,
        4.16,
        0.145,
        darkOrnament,
        "#d8c36f",
      );
      [-0.54, 0.54].forEach((offset) => {
        const ornament = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), trimOchre);
        ornament.position.set(x + offset, 2.36, 4.185);
        ornament.rotation.z = Math.PI * 0.25;
        architecture.add(ornament);
      });
    });

    const canopy = new THREE.Mesh(roundedBox(5.9, 0.055, 0.45, 0.015), ornamentBrown);
    canopy.position.set(0, 0.88, 4.3);
    architecture.add(canopy);
    const canopyFascia = new THREE.Mesh(roundedBox(5.96, 0.02, 0.47, 0.008), gold);
    canopyFascia.position.set(0, 0.902, 4.3);
    architecture.add(canopyFascia);
    [-2.62, -1.82, -1.1, 0, 1.1, 1.82, 2.62].forEach((x) => {
      const post = new THREE.Mesh(
        roundedBox(0.075, 0.76, 0.075, 0.012),
        ornamentBrown,
      );
      post.position.set(x, 0.46, 4.44);
      architecture.add(post);
      const postCap = new THREE.Mesh(
        roundedBox(0.11, 0.055, 0.11, 0.01),
        trimOchre,
      );
      postCap.position.set(x, 0.835, 4.44);
      architecture.add(postCap);
    });
    for (let index = 0; index < 7; index += 1) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), warmGlow);
      light.position.set(-2.55 + index * 0.85, 0.85, 4.5);
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
      frame.position.set(x, 0.97, -4.04);
      architecture.add(frame);
      const window = new THREE.Mesh(roundedBox(0.4, 0.64, 0.035, 0.016), darkGlass);
      window.position.set(x, 0.98, -4.085);
      architecture.add(window);
    });

    addMosqueDome(architecture, {
      x: 0,
      z: -1.34,
      baseY: 2.29,
      radius: 0.72,
      domeMaterial: domeIvory,
      paleMaterial: pale,
      accentMaterial: green,
      goldMaterial: gold,
      scaleY: 1.42,
      patternMaterial: green,
      secondaryPatternMaterial: pale,
      patternScale: 1.0,
      faceted: true,
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

    // Single-storey west annex/guard building visible in every public east
    // panorama, immediately inside the compound beside the name wall.
    const annexFoundation = new THREE.Mesh(
      roundedBox(1.95, 0.13, 1.28, 0.035),
      stone,
    );
    annexFoundation.position.set(-4.02, 0.065, 3.48);
    architecture.add(annexFoundation);
    const annexBody = new THREE.Mesh(
      roundedBox(1.78, 0.72, 1.12, 0.04),
      pale,
    );
    annexBody.position.set(-4.02, 0.49, 3.48);
    architecture.add(annexBody);
    const annexRoof = new THREE.Mesh(
      roundedBox(1.98, 0.11, 1.32, 0.035),
      annexAqua,
    );
    annexRoof.position.set(-4.02, 0.9, 3.48);
    architecture.add(annexRoof);
    const annexFascia = new THREE.Mesh(
      roundedBox(2.02, 0.14, 0.08, 0.015),
      annexAqua,
    );
    annexFascia.position.set(-4.02, 0.84, 4.08);
    architecture.add(annexFascia);
    [-4.46, -3.88].forEach((x, index) => {
      const annexOpening = new THREE.Mesh(
        roundedBox(index === 0 ? 0.38 : 0.48, 0.5, 0.045, 0.014),
        darkGlass,
      );
      annexOpening.position.set(x, 0.43, 4.065);
      architecture.add(annexOpening);
      const annexLintel = new THREE.Mesh(
        roundedBox(index === 0 ? 0.46 : 0.56, 0.045, 0.055, 0.01),
        ornamentBrown,
      );
      annexLintel.position.set(x, 0.72, 4.07);
      architecture.add(annexLintel);
    });

    const minaret = new THREE.Group();
    minaret.position.set(3.72, 0, 2.34);
    const minaretBase = new THREE.Mesh(roundedBox(1.16, 0.18, 1.08, 0.04), stone);
    minaretBase.position.y = 0.09;
    minaret.add(minaretBase);
    const minaretShaft = new THREE.Mesh(
      roundedBox(1.08, 5.15, 1.0, 0.045),
      minaretLime,
    );
    minaretShaft.position.y = 2.755;
    minaret.add(minaretShaft);
    [-0.48, 0.48].forEach((offset) => {
      [-0.44, 0.44].forEach((depth) => {
        const corner = new THREE.Mesh(
          roundedBox(0.12, 5.05, 0.12, 0.018),
          minaretGreen,
        );
        corner.position.set(offset, 2.73, depth);
        minaret.add(corner);
      });
    });
    [1.2, 2.35, 3.5, 4.65].forEach((y) => {
      const band = new THREE.Mesh(
        roundedBox(1.14, 0.1, 1.06, 0.022),
        minaretBand,
      );
      band.position.y = y;
      minaret.add(band);
    });
    [1.15, 2.3, 3.45, 4.6].forEach((y) => {
      [-1, 1].forEach((side) => {
        const frontWindowFrame = new THREE.Mesh(
          roundedBox(0.32, 0.82, 0.035, 0.014),
          minaretGreen,
        );
        frontWindowFrame.position.set(0, y, side * 0.51);
        minaret.add(frontWindowFrame);
        const frontWindow = new THREE.Mesh(
          roundedBox(0.22, 0.7, 0.035, 0.014),
          darkGlass,
        );
        frontWindow.position.set(0, y, side * 0.535);
        minaret.add(frontWindow);
        const sideWindowFrame = new THREE.Mesh(
          roundedBox(0.035, 0.82, 0.32, 0.014),
          minaretGreen,
        );
        sideWindowFrame.position.set(side * 0.55, y, 0);
        minaret.add(sideWindowFrame);
        const sideWindow = new THREE.Mesh(
          roundedBox(0.035, 0.7, 0.22, 0.014),
          darkGlass,
        );
        sideWindow.position.set(side * 0.575, y, 0);
        minaret.add(sideWindow);
      });
    });
    const minaretCap = new THREE.Mesh(roundedBox(1.2, 0.16, 1.12, 0.03), minaretBand);
    minaretCap.position.y = 5.39;
    minaret.add(minaretCap);
    const minaretBalcony = new THREE.Mesh(
      roundedBox(1.42, 0.14, 1.34, 0.035),
      minaretGreen,
    );
    minaretBalcony.position.y = 5.52;
    minaret.add(minaretBalcony);
    const upperStage = new THREE.Mesh(
      roundedBox(0.82, 0.92, 0.76, 0.035),
      minaretLime,
    );
    upperStage.position.y = 6.02;
    minaret.add(upperStage);
    [-1, 1].forEach((side) => {
      const upperFrontWindow = new THREE.Mesh(
        roundedBox(0.2, 0.58, 0.035, 0.012),
        darkGlass,
      );
      upperFrontWindow.position.set(0, 6.02, side * 0.395);
      minaret.add(upperFrontWindow);
      const upperSideWindow = new THREE.Mesh(
        roundedBox(0.035, 0.58, 0.2, 0.012),
        darkGlass,
      );
      upperSideWindow.position.set(side * 0.425, 6.02, 0);
      minaret.add(upperSideWindow);
    });
    const upperCornice = new THREE.Mesh(
      roundedBox(1.04, 0.14, 0.98, 0.03),
      minaretBand,
    );
    upperCornice.position.y = 6.54;
    minaret.add(upperCornice);
    mergeDirectMeshesByMaterial(minaret);
    architecture.add(minaret);

    const leftNamePost = new THREE.Mesh(
      roundedBox(0.3, 0.95, 0.3, 0.025),
      pillarStone,
    );
    leftNamePost.position.set(-3.62, 0.5, 5.18);
    architecture.add(leftNamePost);
    const rightNamePost = leftNamePost.clone();
    rightNamePost.position.x = -0.02;
    architecture.add(rightNamePost);
    addSitubondoSign(
      architecture,
      "MASJID AGUNG AL-ABROR",
      3.4,
      0.32,
      new THREE.Vector3(-1.82, 0.49, 5.25),
      {
        background: 0x4a403c,
        color: "#d2b26b",
        border: 0x4a403c,
        materialOptions: { canvasWidth: 3072, maxFontSize: 230 },
      },
    );
    addSitubondoSign(
      architecture,
      "KABUPATEN SITUBONDO",
      3.0,
      0.2,
      new THREE.Vector3(-1.82, 0.22, 5.27),
      {
        background: 0x4a403c,
        color: "#c5aa70",
        border: 0x4a403c,
        materialOptions: { canvasWidth: 3072, maxFontSize: 220 },
      },
    );
    [0.62, 3.62].forEach((x) => {
      const gatePost = new THREE.Mesh(
        roundedBox(0.29, 0.98, 0.29, 0.025),
        pillarStone,
      );
      gatePost.position.set(x, 0.51, 5.18);
      architecture.add(gatePost);
    });
    [-3.62, -0.02, 0.62, 3.62].forEach((x) => {
      const postInset = new THREE.Mesh(roundedBox(0.075, 0.68, 0.025, 0.008), metal);
      postInset.position.set(x, 0.54, 5.305);
      architecture.add(postInset);
    });
    [0.28, 0.62].forEach((y) => {
      const rail = new THREE.Mesh(
        roundedBox(2.88, 0.05, 0.06, 0.012),
        fenceGreen,
      );
      rail.position.set(2.12, y, 5.18);
      architecture.add(rail);
    });
    const fenceStart = 0.72;
    const fenceEnd = 3.52;
    const fencePanelCount = 12;
    const fencePanelWidth = (fenceEnd - fenceStart) / fencePanelCount;
    const fenceBraceHeight = 0.26;
    const fenceBraceLength = Math.hypot(fencePanelWidth, fenceBraceHeight);
    const fenceBraceAngle = Math.atan2(fenceBraceHeight, fencePanelWidth);
    for (let index = 0; index <= fencePanelCount; index += 1) {
      const bar = new THREE.Mesh(
        roundedBox(0.032, 0.46, 0.038, 0.009),
        fenceGreen,
      );
      bar.position.set(fenceStart + index * fencePanelWidth, 0.45, 5.2);
      architecture.add(bar);
    }
    for (let index = 0; index < fencePanelCount; index += 1) {
      const panelCenter = fenceStart + (index + 0.5) * fencePanelWidth;
      [-1, 1].forEach((direction) => {
        const brace = new THREE.Mesh(
          roundedBox(fenceBraceLength, 0.014, 0.02, 0.006),
          fenceGreen,
        );
        brace.position.set(panelCenter, 0.45, 5.215);
        brace.rotation.z = direction * fenceBraceAngle;
        architecture.add(brace);
      });
      if (index % 2 === 0) {
        const diamond = new THREE.Mesh(
          roundedBox(0.09, 0.09, 0.025, 0.006),
          gold,
        );
        diamond.position.set(panelCenter, 0.45, 5.245);
        diamond.rotation.z = Math.PI * 0.25;
        architecture.add(diamond);
      }
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
        { x: 0, z: 5.72, width: 8.1, depth: 0.86, height: 0.045, label: "front sidewalk" },
        { x: 0, z: 4.72, width: 7.8, depth: 1.55, height: 0.08, label: "front forecourt" },
        { x: 0.28, z: 4.08, width: 1.32, depth: 0.26, height: 0.105, label: "entrance stair 1" },
        { x: 0.28, z: 3.88, width: 1.22, depth: 0.24, height: 0.145, label: "entrance stair 2" },
        { x: 0.28, z: 3.7, width: 1.12, depth: 0.2, height: 0.18, label: "entrance landing" },
      ],
      obstacles: [
        { shape: "box", x: 0, z: -0.225, width: 6.76, depth: 7.55, label: "prayer hall" },
        { shape: "box", x: -4.02, z: 3.48, width: 1.82, depth: 1.16, label: "west annex" },
        { shape: "box", x: 3.72, z: 2.34, width: 1.1, depth: 1.02, label: "minaret" },
        { shape: "box", x: -1.82, z: 5.2, width: 3.64, depth: 0.22, label: "name wall" },
        { shape: "box", x: 2.12, z: 5.18, width: 3.08, depth: 0.18, label: "front fence" },
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
