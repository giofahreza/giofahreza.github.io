import * as THREE from "three";
import {
  createGableRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import {
  getFacadeDetailMaterial,
  toonMaterial,
} from "../../rendering/materials.js";
import {
  placeOnPlanet,
  surfaceSagitta,
} from "../../world/surface.js";

export function createTownBuildingSystem({
  constants: {
    FOUNDATION_SINK,
    LOGICAL_THETA_PERIOD,
    OVERVIEW_DETAIL_LAYER,
    OVERVIEW_PROXY_LAYER,
    ROAD_LOOP_START,
  },
  helpers: {
    distanceToNearestRoad,
    hasPlacementClearance,
    isInsideRoadCorridor,
  },
  materials: {
    inkMaterial,
    targetMaterial,
  },
  navigation: {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
  },
  overviewGeometries: {
    overviewBoxGeometry,
    overviewConeRoofGeometry,
    overviewGableRoofGeometry,
  },
  world,
}) {
  function createCabin(theta, phi, color, yaw = 0, scale = 1) {
    if (isInsideRoadCorridor(theta, phi)) return;
  
    const group = new THREE.Group();
    group.scale.setScalar(scale);
  
    const wall = new THREE.Mesh(
      roundedBox(0.38, 0.31, 0.32, 0.014),
      toonMaterial({
        color: 0xe9e6d7,
        roughness: 0.78,
        metalness: 0,
      }),
    );
    wall.position.y = 0.19;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  
    const roof = new THREE.Mesh(
      roundedBox(0.48, 0.045, 0.4, 0.012),
      toonMaterial({
        color,
        roughness: 0.58,
        metalness: 0,
        emissive: color,
        emissiveIntensity: 0.05,
      }),
    );
    roof.position.y = 0.365;
    roof.castShadow = true;
    group.add(roof);
  
    const roofCap = new THREE.Mesh(
      createGableRoofGeometry(0.43, 0.35, 0.13),
      roof.material,
    );
    roofCap.position.y = 0.385;
    roofCap.castShadow = true;
    group.add(roofCap);
  
    const door = new THREE.Mesh(
      roundedBox(0.09, 0.18, 0.012, 0.005),
      inkMaterial,
    );
    door.position.set(0.07, 0.13, 0.166);
    group.add(door);
  
    placeOnPlanet(group, theta, phi, -0.006 - 0.012 * scale, yaw);
    world.add(group);
    addBoxObstacle(theta, phi, 0.4 * scale, 0.34 * scale, yaw);
    addBuildingFootprint(theta, phi, 0.27 * scale, 0.54 * scale);
    addCameraCollider(group);
  }
  
  [
    [-1.18, 1.46, 0x9fc8d6, -0.45, 0.86],
    [-2.2, 1.34, 0xe7c766, 0.25, 0.78],
    [-0.88, 1.18, 0x95bc7c, -0.1, 0.72],
    [0.42, 1.62, 0xd97f70, 0.55, 0.78],
    [1.58, 1.35, 0x95bc7c, -0.2, 0.82],
    [2.68, 1.72, 0xe7c766, 0.35, 0.72],
    [2.0, 1.86, 0x80a9c8, -0.6, 0.7],
  ].forEach(([theta, phi, color, yaw, scale]) => {
    createCabin(theta, phi, color, yaw, scale);
  });
  
  const townWindowMaterial = toonMaterial({
    color: 0x426768,
    roughness: 0.34,
    metalness: 0.05,
    emissive: 0x5ca0a0,
    emissiveIntensity: 0.12,
  });
  const townTrimMaterial = toonMaterial({
    color: 0xe9e7d9,
    roughness: 0.76,
    metalness: 0,
  });
  const townWoodMaterial = toonMaterial({
    color: 0x665f52,
    roughness: 0.84,
    metalness: 0,
  });
  const townMetalMaterial = toonMaterial({
    color: 0x687b79,
    roughness: 0.68,
    metalness: 0.08,
  });
  const townSignMaterials = [0xd88778, 0xe2c76f, 0x7ea6aa, 0x7f9b72].map(
    (color) =>
      toonMaterial({
        color,
        roughness: 0.68,
        metalness: 0,
      }),
  );
  
  function createTownBuilding(
    theta,
    phi,
    width,
    depth,
    height,
    color,
    yaw = 0,
    styleIndex = 0,
  ) {
    const group = new THREE.Group();
    const buildingVariant =
      Math.abs(Math.round((theta * 17 + phi * 11) * 10)) % 12;
    const buildingStyle = styleIndex % 6;
    const localizedWallColor = new THREE.Color(color).lerp(
      new THREE.Color(0xd7c5a7),
      0.3,
    );
    const wallMaterial = toonMaterial({
      color: localizedWallColor,
      roughness: 0.74,
      metalness: 0,
    });
    const roofMaterial = toonMaterial({
      color: [0xa45b48, 0x8b594a, 0xb5674d, 0x7b5145, 0x4f8091, 0x9a604b][
        buildingVariant % 6
      ],
      roughness: 0.66,
      metalness: 0,
    });
    const accentMaterial =
      townSignMaterials[buildingVariant % townSignMaterials.length];
  
    const foundation = new THREE.Mesh(
      roundedBox(width + 0.08, 0.08, depth + 0.08, 0.012),
      townTrimMaterial,
    );
    foundation.position.y = 0.04;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    group.add(foundation);
  
    if (buildingStyle === 2) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, height, 20),
        wallMaterial,
      );
      tower.position.y = height * 0.5 + 0.08;
      tower.scale.set(width, 1, depth);
      group.add(tower);
    } else if (buildingStyle === 3) {
      const lowerHeight = height * 0.62;
      const upperHeight = height - lowerHeight;
      const lower = new THREE.Mesh(
        roundedBox(width, lowerHeight, depth, 0.016, 3),
        wallMaterial,
      );
      lower.position.y = lowerHeight * 0.5 + 0.08;
      group.add(lower);
  
      const upper = new THREE.Mesh(
        roundedBox(width * 0.76, upperHeight, depth * 0.84, 0.014, 3),
        townTrimMaterial,
      );
      upper.position.y = lowerHeight + upperHeight * 0.5 + 0.08;
      group.add(upper);
    } else {
      const building = new THREE.Mesh(
        roundedBox(width, height, depth, 0.016, 3),
        wallMaterial,
      );
      building.position.y = height * 0.5 + 0.08;
      group.add(building);
    }
  
    if (buildingStyle === 0) {
      const roof = new THREE.Mesh(
        roundedBox(width + 0.1, 0.09, depth + 0.1, 0.035),
        roofMaterial,
      );
      roof.position.y = height + 0.145;
      group.add(roof);
  
      const waterTank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.085, 0.13, 14),
        townMetalMaterial,
      );
      waterTank.position.set(width * 0.22, height + 0.255, 0);
      group.add(waterTank);
  
      const utilityBox = new THREE.Mesh(
        roundedBox(0.14, 0.1, 0.12, 0.025),
        townTrimMaterial,
      );
      utilityBox.position.set(-width * 0.2, height + 0.235, -depth * 0.1);
      group.add(utilityBox);
    } else if (buildingStyle === 2) {
      const eave = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.54, 0.06, 20),
        roofMaterial,
      );
      eave.position.y = height + 0.135;
      eave.scale.set(width + 0.1, 1, depth + 0.1);
      group.add(eave);
  
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 0.18, 20),
        roofMaterial,
      );
      roof.position.y = height + 0.255;
      roof.scale.set(width + 0.06, 1, depth + 0.06);
      group.add(roof);
    } else if (buildingStyle === 4 || buildingStyle === 5) {
      const roofWidth = width + (buildingStyle === 4 ? 0.16 : 0.1);
      const roofDepth = depth + (buildingStyle === 4 ? 0.16 : 0.1);
      const eave = new THREE.Mesh(
        roundedBox(roofWidth, 0.055, roofDepth, 0.01),
        roofMaterial,
      );
      eave.position.y = height + 0.125;
      group.add(eave);
  
      const gable = new THREE.Mesh(
        createGableRoofGeometry(
          roofWidth - 0.035,
          roofDepth - 0.035,
          buildingStyle === 4 ? 0.2 : 0.145,
        ),
        roofMaterial,
      );
      gable.position.y = height + 0.145;
      group.add(gable);
    } else {
      const roofWidth = buildingStyle === 3 ? width * 0.86 : width + 0.1;
      const roofDepth = buildingStyle === 3 ? depth * 0.94 : depth + 0.1;
      const eave = new THREE.Mesh(
        roundedBox(roofWidth, 0.06, roofDepth, 0.012),
        roofMaterial,
      );
      eave.position.y = height + 0.135;
      group.add(eave);
  
      const roofCap = new THREE.Mesh(
        new THREE.ConeGeometry(1, 0.14, 4),
        roofMaterial,
      );
      roofCap.position.y = height + 0.235;
      roofCap.rotation.y = Math.PI * 0.25;
      roofCap.scale.set(
        (roofWidth - 0.04) / Math.SQRT2,
        1,
        (roofDepth - 0.04) / Math.SQRT2,
      );
      group.add(roofCap);
    }
  
    const floorCount = height > 0.9 ? 3 : 2;
    for (let floor = 0; floor < floorCount; floor += 1) {
      const windowY = 0.25 + floor * ((height - 0.22) / floorCount);
  
      if (buildingStyle === 2) {
        [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((angle) => {
          const towerWindow = new THREE.Mesh(
            roundedBox(Math.min(0.15, width * 0.23), 0.13, 0.018, 0.012),
            townWindowMaterial,
          );
          towerWindow.position.set(
            Math.sin(angle) * (width * 0.5 + 0.012),
            windowY,
            Math.cos(angle) * (depth * 0.5 + 0.012),
          );
          towerWindow.rotation.y = angle;
          group.add(towerWindow);
        });
        continue;
      }
  
      const upperFloor = buildingStyle === 3 && windowY > height * 0.62;
      const facadeWidth = upperFloor ? width * 0.76 : width;
      const facadeDepth = upperFloor ? depth * 0.84 : depth;
      if (
        !(
          (buildingStyle === 1 || buildingStyle === 5) &&
          floor === 0
        )
      ) {
        [-0.22, 0.22].forEach((factor) => {
          const windowWidth = Math.min(0.16, facadeWidth * 0.24);
          const frontWindow = new THREE.Mesh(
            roundedBox(windowWidth, 0.13, 0.018, 0.006),
            townWindowMaterial,
          );
          frontWindow.position.set(
            facadeWidth * factor,
            windowY,
            facadeDepth * 0.5 + 0.012,
          );
          group.add(frontWindow);
  
          const mullion = new THREE.Mesh(
            roundedBox(0.009, 0.115, 0.009, 0.003),
            townTrimMaterial,
          );
          mullion.position.set(
            facadeWidth * factor,
            windowY,
            facadeDepth * 0.5 + 0.026,
          );
          group.add(mullion);
  
          if (buildingStyle === 3 || buildingStyle === 4) {
            const crossbar = new THREE.Mesh(
              roundedBox(windowWidth * 0.9, 0.009, 0.009, 0.003),
              townTrimMaterial,
            );
            crossbar.position.set(
              facadeWidth * factor,
              windowY,
              facadeDepth * 0.5 + 0.027,
            );
            group.add(crossbar);
          }
  
          const backWindow = frontWindow.clone();
          backWindow.position.z = -facadeDepth * 0.5 - 0.012;
          group.add(backWindow);
        });
      }
  
      [-1, 1].forEach((side) => {
        const sideWindow = new THREE.Mesh(
          roundedBox(0.018, 0.13, Math.min(0.16, facadeDepth * 0.28), 0.012),
          townWindowMaterial,
        );
        sideWindow.position.set(
          side * (facadeWidth * 0.5 + 0.012),
          windowY,
          0,
        );
        group.add(sideWindow);
      });
  
      if (buildingStyle === 0 && floor > 0) {
        const balcony = new THREE.Mesh(
          roundedBox(width * 0.74, 0.035, 0.17, 0.014),
          townTrimMaterial,
        );
        balcony.position.set(0, windowY - 0.09, depth * 0.5 + 0.075);
        group.add(balcony);
  
        const rail = new THREE.Mesh(
          roundedBox(width * 0.65, 0.024, 0.018, 0.008),
          townMetalMaterial,
        );
        rail.position.set(0, windowY + 0.025, depth * 0.5 + 0.15);
        group.add(rail);
  
        [-0.28, 0, 0.28].forEach((factor) => {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.12, 7),
            townMetalMaterial,
          );
          post.position.set(
            width * factor,
            windowY - 0.025,
            depth * 0.5 + 0.15,
          );
          group.add(post);
        });
      }
    }
  
    const doorWidth = Math.min(0.18, width * 0.28);
    const doorX = buildingStyle === 1 ? width * 0.27 : 0;
    const door = new THREE.Mesh(
      roundedBox(doorWidth, 0.27, 0.022, 0.016),
      inkMaterial,
    );
    door.position.set(doorX, 0.22, depth * 0.5 + 0.014);
    group.add(door);
  
    const doorKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      targetMaterial,
    );
    doorKnob.position.set(
      doorX + doorWidth * 0.27,
      0.22,
      depth * 0.5 + 0.035,
    );
    group.add(doorKnob);
  
    if (buildingStyle === 1) {
      const storeWindow = new THREE.Mesh(
        roundedBox(width * 0.38, 0.25, 0.022, 0.018),
        townWindowMaterial,
      );
      storeWindow.position.set(-width * 0.17, 0.23, depth * 0.5 + 0.016);
      group.add(storeWindow);
  
      const awningWidth = width * 0.74;
      const awning = new THREE.Mesh(
        roundedBox(awningWidth, 0.045, 0.19, 0.018),
        townTrimMaterial,
      );
      awning.position.set(0, 0.49, depth * 0.5 + 0.085);
      awning.rotation.x = -0.14;
      group.add(awning);
  
      [-0.3, -0.1, 0.1, 0.3].forEach((factor, index) => {
        const stripe = new THREE.Mesh(
          roundedBox(awningWidth * 0.16, 0.048, 0.194, 0.012),
          index % 2 === 0 ? accentMaterial : roofMaterial,
        );
        stripe.position.set(
          awningWidth * factor,
          0.492,
          depth * 0.5 + 0.087,
        );
        stripe.rotation.x = -0.14;
        group.add(stripe);
      });
  
      const sign = new THREE.Mesh(
        roundedBox(0.075, 0.22, 0.026, 0.014),
        accentMaterial,
      );
      sign.position.set(-width * 0.43, 0.61, depth * 0.5 + 0.022);
      group.add(sign);
    } else if (buildingStyle === 3 || buildingStyle === 4) {
      [-0.42, 0.42].forEach((factor) => {
        const timber = new THREE.Mesh(
          roundedBox(0.028, height * 0.82, 0.028, 0.01),
          townWoodMaterial,
        );
        timber.position.set(
          width * factor,
          height * 0.45,
          depth * 0.5 + 0.017,
        );
        group.add(timber);
      });
  
      [0.39, Math.min(height * 0.72, height - 0.08)].forEach((beamY) => {
        const beam = new THREE.Mesh(
          roundedBox(width * 0.88, 0.028, 0.028, 0.01),
          townWoodMaterial,
        );
        beam.position.set(0, beamY, depth * 0.5 + 0.018);
        group.add(beam);
      });
  
      const porch = new THREE.Mesh(
        roundedBox(width * 0.5, 0.045, 0.18, 0.018),
        roofMaterial,
      );
      porch.position.set(0, 0.48, depth * 0.5 + 0.08);
      porch.rotation.x = -0.12;
      group.add(porch);
    } else if (buildingStyle === 5) {
      const shutter = new THREE.Mesh(
        roundedBox(width * 0.56, 0.31, 0.026, 0.006),
        townMetalMaterial,
      );
      shutter.position.set(-width * 0.09, 0.2, depth * 0.5 + 0.017);
      group.add(shutter);
  
      [-0.095, -0.03, 0.035, 0.1].forEach((offsetY) => {
        const shutterLine = new THREE.Mesh(
          roundedBox(width * 0.5, 0.009, 0.01, 0.003),
          inkMaterial,
        );
        shutterLine.position.set(
          -width * 0.09,
          0.2 + offsetY,
          depth * 0.5 + 0.035,
        );
        group.add(shutterLine);
      });
  
      const workshopSign = new THREE.Mesh(
        roundedBox(width * 0.48, 0.1, 0.025, 0.006),
        accentMaterial,
      );
      workshopSign.position.set(0, 0.53, depth * 0.5 + 0.02);
      group.add(workshopSign);
    }
  
    if (buildingVariant % 3 !== 1) {
      const airConditioner = new THREE.Mesh(
        roundedBox(0.16, 0.11, 0.07, 0.012),
        townTrimMaterial,
      );
      airConditioner.position.set(
        width * 0.5 + 0.04,
        Math.min(height * 0.66, 0.64),
        -depth * 0.18,
      );
      group.add(airConditioner);
  
      const fan = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.007, 6, 16),
        townMetalMaterial,
      );
      fan.position.copy(airConditioner.position);
      fan.position.x += 0.038;
      fan.rotation.y = Math.PI * 0.5;
      group.add(fan);
    }
  
    if (buildingVariant % 4 === 0) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.009, 0.33, 6),
        townMetalMaterial,
      );
      antenna.position.set(-width * 0.2, height + 0.34, 0);
      group.add(antenna);
  
      [-0.08, 0.02, 0.1].forEach((offsetY) => {
        const antennaBar = new THREE.Mesh(
          roundedBox(0.22, 0.01, 0.01, 0.003),
          townMetalMaterial,
        );
        antennaBar.position.set(
          -width * 0.2,
          height + 0.34 + offsetY,
          0,
        );
        group.add(antennaBar);
      });
    }
  
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    mergeDirectMeshesByMaterial(group);
  
    const detailMaterial = getFacadeDetailMaterial(
      buildingStyle,
      buildingVariant,
    );
    const facadeDetail = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, height * 0.86),
      detailMaterial,
    );
    facadeDetail.position.set(
      0,
      height * 0.5 + 0.08,
      depth * 0.5 + 0.031,
    );
    facadeDetail.castShadow = false;
    facadeDetail.receiveShadow = false;
    group.add(facadeDetail);
  
    const overviewProxy = new THREE.Group();
    const overviewBody = new THREE.Mesh(overviewBoxGeometry, wallMaterial);
    overviewBody.position.y = height * 0.5 + 0.08;
    overviewBody.scale.set(width, height, depth);
    overviewProxy.add(overviewBody);
  
    let overviewRoof;
    if (buildingStyle === 2) {
      overviewRoof = new THREE.Mesh(overviewConeRoofGeometry, roofMaterial);
      overviewRoof.position.y = height + 0.12;
      overviewRoof.scale.set(width + 0.14, 0.3, depth + 0.14);
    } else if (buildingStyle >= 3) {
      overviewRoof = new THREE.Mesh(overviewGableRoofGeometry, roofMaterial);
      overviewRoof.position.y = height + 0.12;
      overviewRoof.scale.set(width + 0.13, 0.2, depth + 0.13);
    } else {
      overviewRoof = new THREE.Mesh(overviewBoxGeometry, roofMaterial);
      overviewRoof.position.y = height + 0.145;
      overviewRoof.scale.set(width + 0.12, 0.11, depth + 0.12);
    }
    overviewProxy.add(overviewRoof);
  
    const overviewFacade = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, height * 0.86),
      detailMaterial,
    );
    overviewFacade.position.set(
      0,
      height * 0.5 + 0.08,
      depth * 0.5 + 0.006,
    );
    overviewProxy.add(overviewFacade);
  
    const foundationRadius = Math.hypot(width + 0.08, depth + 0.08) * 0.5;
    placeOnPlanet(
      group,
      theta,
      phi,
      -surfaceSagitta(foundationRadius) - FOUNDATION_SINK,
      yaw,
    );
    placeOnPlanet(
      overviewProxy,
      theta,
      phi,
      -surfaceSagitta(foundationRadius) - FOUNDATION_SINK,
      yaw,
    );
    group.traverse((child) => {
      if (child.isMesh) child.layers.set(OVERVIEW_DETAIL_LAYER);
    });
    overviewProxy.traverse((child) => {
      if (!child.isMesh) return;
      child.layers.set(OVERVIEW_PROXY_LAYER);
      child.castShadow = false;
      child.receiveShadow = false;
    });
    world.add(group, overviewProxy);
    if (buildingStyle === 2) {
      addObstacle(theta, phi, Math.hypot(width, depth) * 0.4);
    } else {
      addBoxObstacle(theta, phi, width + 0.06, depth + 0.06, yaw);
    }
    addBuildingFootprint(
      theta,
      phi,
      Math.hypot(width, depth) * 0.4,
      height + 0.34,
    );
    addCameraCollider(group);
  }
  
  [
    [-2.42, 0.99, 0.62, 0.5, 0.88, 0xaeb9ac, Math.PI * 0.52],
    [-2.2, 1.29, 0.7, 0.52, 1.08, 0x9fadb0, -Math.PI * 0.48],
    [-1.98, 1.28, 0.58, 0.48, 0.82, 0xc0b2ac, -Math.PI * 0.48],
    [-1.66, 1.3, 0.68, 0.52, 1.12, 0x9eafa2, -Math.PI * 0.48],
    [-1.42, 1.01, 0.56, 0.46, 0.8, 0xbeb7a9, Math.PI * 0.52],
    [-1.08, 1.02, 0.72, 0.56, 1.18, 0xa0b1ad, Math.PI * 0.52],
    [-0.82, 1.29, 0.62, 0.5, 0.94, 0xc2b7aa, -Math.PI * 0.48],
    [-0.34, 1.02, 0.7, 0.54, 1.08, 0x9fb2b5, Math.PI * 0.52],
    [-0.08, 1.28, 0.58, 0.48, 0.86, 0xbbaaa8, -Math.PI * 0.48],
    [0.36, 1.02, 0.66, 0.5, 1.02, 0xb1b7a7, Math.PI * 0.52],
    [0.68, 1.28, 0.58, 0.46, 0.9, 0x9fafa9, -Math.PI * 0.48],
    [1.02, 0.99, 0.72, 0.58, 1.16, 0xbdb6a8, Math.PI * 0.52],
    [-2.08, 1.58, 0.62, 0.5, 0.92, 0xa2b0a8, Math.PI * 0.5],
    [-1.7, 1.3, 0.66, 0.5, 1.04, 0xc1b4a8, -Math.PI * 0.5],
    [-1.34, 1.58, 0.58, 0.48, 0.84, 0x9dadad, Math.PI * 0.5],
    [-0.92, 1.3, 0.72, 0.54, 1.18, 0xb7aca7, -Math.PI * 0.5],
    [-0.18, 1.58, 0.62, 0.48, 0.92, 0x99aa9f, Math.PI * 0.5],
    [0.36, 1.3, 0.7, 0.54, 1.1, 0xbeb7aa, -Math.PI * 0.5],
    [0.92, 1.58, 0.6, 0.48, 0.9, 0xa0afb1, Math.PI * 0.5],
    [1.32, 1.3, 0.7, 0.54, 1.14, 0xb9aaa6, -Math.PI * 0.5],
    [1.78, 1.58, 0.62, 0.5, 0.96, 0x9dad9f, Math.PI * 0.5],
    [2.16, 1.3, 0.7, 0.54, 1.08, 0xbab3a7, -Math.PI * 0.5],
    [-2.5, 0.68, 0.72, 0.54, 0.96, 0xc5b8a8, Math.PI * 0.52],
    [-1.52, 0.69, 0.62, 0.5, 0.86, 0xa7b8b1, Math.PI * 0.52],
    [-0.72, 0.68, 0.74, 0.56, 1.08, 0xb5aaa3, Math.PI * 0.52],
    [0.48, 0.69, 0.64, 0.5, 0.92, 0xa7b6bd, Math.PI * 0.52],
    [1.62, 0.7, 0.72, 0.56, 1.04, 0xc2b6a6, Math.PI * 0.52],
    [2.55, 0.69, 0.62, 0.48, 0.84, 0xa7b2aa, Math.PI * 0.52],
    [-2.38, 1.94, 0.72, 0.56, 0.98, 0xa8b8b4, -Math.PI * 0.5],
    [-1.34, 1.92, 0.66, 0.5, 0.9, 0xc0afa5, -Math.PI * 0.5],
    [-0.52, 1.93, 0.74, 0.56, 1.1, 0xa5b6b8, -Math.PI * 0.5],
    [0.66, 1.92, 0.62, 0.5, 0.88, 0xb8b09f, -Math.PI * 0.5],
    [1.62, 1.94, 0.7, 0.54, 1.02, 0xa8b7a9, -Math.PI * 0.5],
    [2.54, 1.92, 0.64, 0.5, 0.9, 0xb9aaa4, -Math.PI * 0.5],
  ].forEach((building, index) => createTownBuilding(...building, index));
  
  const infillStats = {
    buildings: 0,
    gardens: 0,
    scenicTrees: 0,
  };
  const infillBuildingColors = [
    0xd2c4aa,
    0xc4b99f,
    0xd0b5a1,
    0xc3c09f,
    0xb7c0b5,
    0xd9c6a3,
    0xc5b4aa,
    0xc8c4ad,
  ];
  
  function reserveInfillBuilding(
    placements,
    theta,
    phi,
    width,
    depth,
    height,
    color,
    roofColor,
    yaw,
    styleIndex,
  ) {
    const footprint = Math.hypot(width, depth) * 0.4;
    const collisionRadius = Math.hypot(width, depth) * 0.52;
    if (distanceToNearestRoad(theta, phi) < 0.54 + footprint) return;
    if (!hasPlacementClearance(theta, phi, footprint, 0.12)) return;
  
    placements.push({
      theta,
      phi,
      width,
      depth,
      height,
      color,
      roofColor,
      yaw,
      styleIndex,
      footprint,
    });
    addBoxObstacle(theta, phi, width + 0.04, depth + 0.04, yaw);
    addBuildingFootprint(theta, phi, collisionRadius, height + 0.28);
    infillStats.buildings += 1;
  }
  
  const infillRows = [0.68, 0.98, 1.29, 1.59, 1.96];
  const infillColumns = 72;
  const infillPlacements = [];
  const infillRoofColors = [
    0x985b48,
    0x79554b,
    0xa4664f,
    0x83574b,
    0x4f7d89,
    0x9d604a,
  ];
  infillRows.forEach((phi, rowIndex) => {
    for (let column = 0; column < infillColumns; column += 1) {
      const sequence = rowIndex * infillColumns + column;
      const theta =
        ROAD_LOOP_START +
        ((column + 0.3 + (rowIndex % 2) * 0.47) / infillColumns) *
          LOGICAL_THETA_PERIOD +
        Math.sin(sequence * 1.91) * 0.035;
      const width = 0.46 + ((sequence * 7) % 4) * 0.055;
      const depth = 0.4 + ((sequence * 5) % 3) * 0.055;
      const height = 0.72 + ((sequence * 11) % 5) * 0.085;
      const facesNorth = rowIndex % 2 === 0;
      const yaw =
        (facesNorth ? Math.PI * 0.5 : -Math.PI * 0.5) +
        Math.sin(theta * 1.7) * 0.08;
      reserveInfillBuilding(
        infillPlacements,
        theta,
        phi,
        width,
        depth,
        height,
        infillBuildingColors[sequence % infillBuildingColors.length],
        infillRoofColors[(sequence * 5) % infillRoofColors.length],
        yaw,
        sequence % 3,
      );
    }
  });
  
  function createInfillNeighborhood(placements) {
    if (placements.length === 0) return;
  
    const bodyGeometry = roundedBox(1, 1, 1, 0.055, 2);
    const foundationGeometry = roundedBox(1, 1, 1, 0.04, 2);
    const detailGeometry = new THREE.BoxGeometry(1, 1, 1);
    const gableGeometry = createGableRoofGeometry(1, 1, 1);
    const hipGeometry = new THREE.ConeGeometry(1, 1, 4);
    const flatGeometry = roundedBox(1, 1, 1, 0.05, 2);
    const wallMaterial = toonMaterial({
      color: 0xffffff,
      roughness: 0.76,
      metalness: 0,
    });
    const roofMaterial = toonMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0,
    });
    const bodyInstances = new THREE.InstancedMesh(
      bodyGeometry,
      wallMaterial,
      placements.length,
    );
    const foundationInstances = new THREE.InstancedMesh(
      foundationGeometry,
      townTrimMaterial,
      placements.length,
    );
    const doorInstances = new THREE.InstancedMesh(
      detailGeometry,
      townWoodMaterial,
      placements.length,
    );
    const windowsPerBuilding = 12;
    const windowTrimInstances = new THREE.InstancedMesh(
      detailGeometry,
      townTrimMaterial,
      placements.length * windowsPerBuilding,
    );
    const windowInstances = new THREE.InstancedMesh(
      detailGeometry,
      townWindowMaterial,
      placements.length * windowsPerBuilding,
    );
    const awningInstances = new THREE.InstancedMesh(
      detailGeometry,
      roofMaterial,
      placements.length,
    );
    const roofPlacements = [[], [], []];
    placements.forEach((placement) => {
      roofPlacements[placement.styleIndex].push(placement);
    });
    const roofInstances = [
      new THREE.InstancedMesh(
        gableGeometry,
        roofMaterial,
        roofPlacements[0].length,
      ),
      new THREE.InstancedMesh(
        hipGeometry,
        roofMaterial,
        roofPlacements[1].length,
      ),
      new THREE.InstancedMesh(
        flatGeometry,
        roofMaterial,
        roofPlacements[2].length,
      ),
    ];
    const roofIndices = [0, 0, 0];
    const root = new THREE.Object3D();
    const local = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    const wallColor = new THREE.Color();
    const roofColor = new THREE.Color();
    let windowIndex = 0;
  
    const setLocalMatrix = (
      mesh,
      index,
      position,
      scale,
      rotationY = 0,
    ) => {
      local.position.copy(position);
      local.quaternion.setFromEuler(new THREE.Euler(0, rotationY, 0));
      local.scale.copy(scale);
      local.updateMatrix();
      matrix.multiplyMatrices(root.matrix, local.matrix);
      mesh.setMatrixAt(index, matrix);
    };
  
    const setWindowMatrix = (index, position, scale) => {
      const trimScale = scale.clone();
      const glassPosition = position.clone();
      trimScale.y += 0.035;
  
      if (scale.x < scale.z) {
        trimScale.z += 0.035;
        glassPosition.x += Math.sign(position.x) * 0.004;
      } else {
        trimScale.x += 0.035;
        glassPosition.z += Math.sign(position.z) * 0.004;
      }
  
      setLocalMatrix(windowTrimInstances, index, position, trimScale);
      setLocalMatrix(windowInstances, index, glassPosition, scale);
    };
  
    placements.forEach((placement, index) => {
      const {
        theta,
        phi,
        width,
        depth,
        height,
        color,
        yaw,
        styleIndex,
        footprint,
      } = placement;
      placeOnPlanet(
        root,
        theta,
        phi,
        -surfaceSagitta(footprint) - FOUNDATION_SINK,
        yaw,
      );
      root.scale.setScalar(1);
      root.updateMatrix();
  
      setLocalMatrix(
        foundationInstances,
        index,
        new THREE.Vector3(0, 0.04, 0),
        new THREE.Vector3(width + 0.08, 0.08, depth + 0.08),
      );
      setLocalMatrix(
        bodyInstances,
        index,
        new THREE.Vector3(0, height * 0.5 + 0.08, 0),
        new THREE.Vector3(width, height, depth),
      );
      bodyInstances.setColorAt(index, wallColor.setHex(color));
  
      const doorX = styleIndex === 1 ? width * 0.2 : 0;
      setLocalMatrix(
        doorInstances,
        index,
        new THREE.Vector3(doorX, 0.22, depth * 0.5 + 0.014),
        new THREE.Vector3(Math.min(0.16, width * 0.28), 0.27, 0.025),
      );
      setLocalMatrix(
        awningInstances,
        index,
        new THREE.Vector3(doorX, 0.385, depth * 0.5 + 0.065),
        new THREE.Vector3(
          Math.min(0.28, width * 0.55),
          0.035,
          0.14,
        ),
      );
      awningInstances.setColorAt(index, roofColor.setHex(placement.roofColor));
  
      const floorY = [0.34, Math.min(height - 0.18, 0.68)];
      floorY.forEach((windowY) => {
        [-0.22, 0.22].forEach((factor) => {
          const windowWidth = Math.min(0.15, width * 0.24);
          setWindowMatrix(
            windowIndex,
            new THREE.Vector3(
              width * factor,
              windowY,
              depth * 0.5 + 0.016,
            ),
            new THREE.Vector3(windowWidth, 0.13, 0.025),
          );
          windowIndex += 1;
          setWindowMatrix(
            windowIndex,
            new THREE.Vector3(
              -width * factor,
              windowY,
              -depth * 0.5 - 0.016,
            ),
            new THREE.Vector3(windowWidth, 0.13, 0.025),
          );
          windowIndex += 1;
        });
      });
  
      [-1, 1].forEach((side) => {
        floorY.forEach((windowY) => {
          setWindowMatrix(
            windowIndex,
            new THREE.Vector3(side * (width * 0.5 + 0.016), windowY, 0),
            new THREE.Vector3(0.025, 0.13, Math.min(0.15, depth * 0.28)),
          );
          windowIndex += 1;
        });
      });
  
      const roofMesh = roofInstances[styleIndex];
      const roofIndex = roofIndices[styleIndex];
      if (styleIndex === 0) {
        setLocalMatrix(
          roofMesh,
          roofIndex,
          new THREE.Vector3(0, height + 0.125, 0),
          new THREE.Vector3(width + 0.12, 0.18, depth + 0.12),
        );
      } else if (styleIndex === 1) {
        setLocalMatrix(
          roofMesh,
          roofIndex,
          new THREE.Vector3(0, height + 0.2, 0),
          new THREE.Vector3(width * 0.72, 0.2, depth * 0.72),
          Math.PI * 0.25,
        );
      } else {
        setLocalMatrix(
          roofMesh,
          roofIndex,
          new THREE.Vector3(0, height + 0.145, 0),
          new THREE.Vector3(width + 0.13, 0.1, depth + 0.13),
        );
      }
      roofMesh.setColorAt(roofIndex, roofColor.setHex(placement.roofColor));
      roofIndices[styleIndex] += 1;
    });
  
    [
      bodyInstances,
      foundationInstances,
      doorInstances,
      windowTrimInstances,
      windowInstances,
      awningInstances,
      ...roofInstances,
    ].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      world.add(mesh);
    });
    addCameraCollider(bodyInstances);
    roofInstances.forEach(addCameraCollider);
  }
  
  createInfillNeighborhood(infillPlacements);
  
  

  return {
    infillRows,
    infillStats,
    townMetalMaterial,
    townSignMaterials,
    townTrimMaterial,
    townWindowMaterial,
    townWoodMaterial,
  };
}
