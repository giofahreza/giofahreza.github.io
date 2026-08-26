import * as THREE from "three";
import { createAlunAlunModelFactory } from "./alun-alun/index.js";
import { createGazeboSitubondoModelFactory } from "./gazebo-situbondo.js";
import { createMinorStopModelFactory } from "./minor-stop-models.js";
import { createMosqueModelFactory } from "./mosque.js";
import { createPendopoModelFactory } from "./pendopo.js";
import {
  createGableRoofGeometry,
  roundedBox,
} from "../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../rendering/materials.js";
import {
  placeOnPlanet,
  surfaceSagitta,
} from "../../world/surface.js";

export function populateStops({
  collections: {
    animatedStopDetails,
    chimneySmoke,
  },
  constants: {
    FOUNDATION_SINK,
    MAP_METERS_PER_WORLD_UNIT,
  },
  helpers: {
    addDeliveryMarker,
    addIndonesianFlag,
    addLocalPalm,
    addPendopoPennant,
    addPendopoSimpleColumn,
    addSitubondoSign,
    addStopMotif,
    createArchPanelGeometry,
    getSitubondoSignMaterial,
  },
  materials: {
    chimneySmokeMaterial,
    foliageMaterials,
    inkMaterial,
    letterMaterial,
    rockMaterial,
    targetMaterial,
    trunkMaterial,
  },
  navigation: {
    addBoxObstacle,
    addBuildingFootprint,
    addCameraCollider,
    addObstacle,
  },
  stops,
  world,
}) {
  const {
    addAlunAlunModel,
    addAlunAlunTree,
    addAlunAlunWalker,
    alunAlunTraffic,
  } = createAlunAlunModelFactory({
    collections: {
      animatedStopDetails,
    },
    constants: {
      FOUNDATION_SINK,
      MAP_METERS_PER_WORLD_UNIT,
    },
    helpers: {
      addIndonesianFlag,
      addLocalPalm,
      getSitubondoSignMaterial,
    },
    materials: {
      foliageMaterials,
      inkMaterial,
      rockMaterial,
      targetMaterial,
      trunkMaterial,
    },
    world,
  });
  const { addMosqueModel } = createMosqueModelFactory({
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
  });
  const { addPendopoModel } = createPendopoModelFactory({
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
  });
  const { addGazeboSitubondoModel } = createGazeboSitubondoModelFactory({
    collections: {
      animatedStopDetails,
    },
    helpers: {
      addAlunAlunWalker,
    },
    materials: {
      foliageMaterials,
    },
  });
  const {
    addBeachStopModel,
    addMarketModel,
    addStadiumModel,
    addStationModel,
  } = createMinorStopModelFactory({
    helpers: {
      addIndonesianFlag,
      addLocalPalm,
      addSitubondoSign,
      createArchPanelGeometry,
    },
    materials: {
      trunkMaterial,
    },
  });

  function createSitubondoLandmark(stop) {
    const group = new THREE.Group();
    const baseScale = stop.scale ?? 1;
    const primaryMaterial = toonMaterial({
      color: stop.color,
      emissive: stop.color,
      emissiveIntensity: 0.08,
    });

    if (stop.kind === "alun") addAlunAlunModel(group, primaryMaterial);
    if (stop.kind === "gazebo") addGazeboSitubondoModel(group, primaryMaterial);
    if (stop.kind === "mosque") addMosqueModel(group, primaryMaterial);
    if (stop.kind === "pendopo") addPendopoModel(group, primaryMaterial);
    if (stop.kind === "market") addMarketModel(group, primaryMaterial);
    if (stop.kind === "station") addStationModel(group, primaryMaterial);
    if (stop.kind === "beach") addBeachStopModel(group, primaryMaterial);
    if (stop.kind === "stadium") addStadiumModel(group, primaryMaterial);

    const footprint =
      stop.kind === "stadium"
        ? 0.72
        : stop.kind === "gazebo"
          ? 3.25
          : stop.kind === "mosque"
            ? 5.35
            : stop.kind === "alun" || stop.kind === "beach"
              ? 0.52
              : 0.58;
    const placementFootprint = stop.kind === "alun" ? 25 : footprint * baseScale;
    const beaconY = stop.kind === "gazebo"
      ? 2.18
      : stop.kind === "mosque"
        ? 3.25
        : stop.kind === "pendopo"
          ? 1.34
          : 1.08;
    const markerRadius = stop.kind === "gazebo" || stop.kind === "mosque"
      ? 0.72
      : footprint;
    addDeliveryMarker(group, stop, markerRadius, beaconY);
    group.scale.setScalar(baseScale);
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
    });
    const editorLift = -surfaceSagitta(placementFootprint) - FOUNDATION_SINK;
    placeOnPlanet(
      group,
      stop.theta,
      stop.phi,
      editorLift,
      stop.yaw ?? 0,
    );
    stop.group = group;
    stop.mapEditorPlacement = { lift: editorLift };
    stop.roofMaterial = primaryMaterial;
    stop.baseScale = baseScale;
    stop.navigationRadius = footprint * 0.72 * baseScale;
    world.add(group);
    if (stop.kind === "alun") {
      (group.userData.localObstacles ?? []).forEach(
        ({ north, east, width, depth, yaw = 0 }) => {
          addBoxObstacle(
            stop.theta + east,
            stop.phi - north,
            width,
            depth,
            (stop.yaw ?? 0) + yaw,
          );
        },
      );
    } else {
      addObstacle(stop.theta, stop.phi, footprint * 0.72 * baseScale);
    }
    addBuildingFootprint(stop.theta, stop.phi, footprint * baseScale, beaconY * baseScale);
    addCameraCollider(group);
  }

  function createHouse(stop) {
    if (stop.kind) {
      createSitubondoLandmark(stop);
      return;
    }
    const group = new THREE.Group();
    const houseScale = stop.scale ?? 1.08;
    group.scale.setScalar(houseScale);
    const roofMaterial = toonMaterial({
      color: stop.color,
      roughness: 0.54,
      metalness: 0,
      emissive: stop.color,
      emissiveIntensity: 0.08,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.48, 0.06, 8),
      toonMaterial({
        color: 0xb9c8a5,
        roughness: 0.9,
        metalness: 0,
      }),
    );
    base.position.y = 0.035;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const wall = new THREE.Mesh(
      roundedBox(0.52, 0.46, 0.44, 0.018),
      toonMaterial({
        color: 0xf5efdc,
        roughness: 0.72,
        metalness: 0,
      }),
    );
    wall.position.y = 0.27;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    const roof = new THREE.Mesh(
      roundedBox(0.64, 0.055, 0.56, 0.014),
      roofMaterial,
    );
    roof.position.y = 0.525;
    roof.castShadow = true;
    group.add(roof);

    const roofCap = new THREE.Mesh(
      createGableRoofGeometry(0.58, 0.5, 0.19),
      roofMaterial,
    );
    roofCap.position.y = 0.55;
    roofCap.castShadow = true;
    group.add(roofCap);

    const chimney = new THREE.Mesh(
      roundedBox(0.065, 0.17, 0.065, 0.01),
      toonMaterial({
        color: 0x8f765e,
        roughness: 0.78,
        metalness: 0,
      }),
    );
    chimney.position.set(0.15, 0.7, -0.06);
    chimney.rotation.z = -0.08;
    chimney.castShadow = true;
    group.add(chimney);

    for (let index = 0; index < 3; index += 1) {
      const smokeMaterial = hideMaterialOutline(chimneySmokeMaterial.clone());
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 + index * 0.008, 9, 7),
        smokeMaterial,
      );
      smoke.position.set(0.15, 0.81, -0.06);
      smoke.scale.setScalar(0.4);
      smoke.renderOrder = 2;
      group.add(smoke);
      chimneySmoke.push({
        mesh: smoke,
        phase: index / 3 + chimneySmoke.length * 0.071,
        originX: 0.15,
        originZ: -0.06,
      });
    }

    const door = new THREE.Mesh(
      roundedBox(0.12, 0.24, 0.016, 0.006),
      inkMaterial,
    );
    door.position.set(0.09, 0.17, 0.228);
    group.add(door);

    const windowFrame = new THREE.Mesh(
      roundedBox(0.15, 0.11, 0.015, 0.006),
      inkMaterial,
    );
    windowFrame.position.set(-0.13, 0.3, 0.228);
    group.add(windowFrame);

    const windowLight = new THREE.Mesh(
      roundedBox(0.115, 0.075, 0.017, 0.004),
      toonMaterial({
        color: 0xffeb9c,
        roughness: 0.35,
        metalness: 0,
        emissive: 0xffc94a,
        emissiveIntensity: 0.28,
      }),
    );
    windowLight.position.set(-0.13, 0.3, 0.24);
    group.add(windowLight);

    const porchRoof = new THREE.Mesh(
      roundedBox(0.28, 0.035, 0.16, 0.009),
      roofMaterial,
    );
    porchRoof.position.set(0.08, 0.36, 0.29);
    porchRoof.rotation.x = -0.12;
    group.add(porchRoof);

    const entryStep = new THREE.Mesh(
      roundedBox(0.24, 0.045, 0.13, 0.01),
      toonMaterial({
        color: 0xd8d7c9,
        roughness: 0.86,
        metalness: 0,
      }),
    );
    entryStep.position.set(0.08, 0.045, 0.27);
    group.add(entryStep);

    const gutter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.58, 7),
      inkMaterial,
    );
    gutter.position.set(0, 0.52, 0.285);
    gutter.rotation.z = Math.PI * 0.5;
    group.add(gutter);

    const downPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.43, 7),
      inkMaterial,
    );
    downPipe.position.set(-0.27, 0.29, 0.245);
    group.add(downPipe);

    const sideWindow = windowFrame.clone();
    sideWindow.position.set(0.268, 0.3, -0.05);
    sideWindow.rotation.y = Math.PI * 0.5;
    group.add(sideWindow);

    const sideWindowLight = windowLight.clone();
    sideWindowLight.position.set(0.279, 0.3, -0.05);
    sideWindowLight.rotation.y = Math.PI * 0.5;
    group.add(sideWindowLight);

    const marker = new THREE.Group();
    const groundRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.53, 0.025, 8, 48),
      targetMaterial,
    );
    groundRing.position.y = 0.015;
    groundRing.rotation.x = Math.PI / 2;
    marker.add(groundRing);

    const beacon = new THREE.Group();
    beacon.position.set(0, 0.98, 0);
    const beaconCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.105, 0),
      targetMaterial,
    );
    beaconCore.rotation.z = Math.PI * 0.25;
    beacon.add(beaconCore);

    const envelope = new THREE.Mesh(
      roundedBox(0.13, 0.082, 0.026, 0.008),
      letterMaterial,
    );
    envelope.position.z = 0.084;
    beacon.add(envelope);

    const envelopeFold = new THREE.Mesh(
      roundedBox(0.008, 0.074, 0.01, 0.003),
      inkMaterial,
    );
    envelopeFold.position.set(0, 0, 0.101);
    envelopeFold.rotation.z = Math.PI * 0.31;
    beacon.add(envelopeFold);

    const beaconHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.011, 6, 28),
      targetMaterial,
    );
    beaconHalo.position.z = -0.025;
    beacon.add(beaconHalo);

    const beaconHaloCross = beaconHalo.clone();
    beaconHaloCross.rotation.y = Math.PI * 0.5;
    beacon.add(beaconHaloCross);
    marker.add(beacon);

    marker.userData.groundRing = groundRing;
    marker.userData.beacon = beacon;
    marker.userData.beaconHalo = beaconHalo;
    marker.visible = false;
    group.add(marker);
    addStopMotif(group, stop, roofMaterial);

    const editorLift =
      -surfaceSagitta(0.48 * houseScale) -
      FOUNDATION_SINK -
      0.012 * houseScale;
    placeOnPlanet(
      group,
      stop.theta,
      stop.phi,
      editorLift,
      stop.yaw ?? stop.theta * 0.27,
    );
    stop.group = group;
    stop.mapEditorPlacement = { lift: editorLift };
    stop.marker = marker;
    stop.roofMaterial = roofMaterial;
    stop.baseScale = houseScale;
    world.add(group);
    addObstacle(stop.theta, stop.phi, 0.44 * houseScale);
    addBuildingFootprint(
      stop.theta,
      stop.phi,
      0.44 * houseScale,
      0.78 * houseScale,
    );
    addCameraCollider(group);
  }

  stops.forEach(createHouse);

  return { alunAlunTraffic };
}
