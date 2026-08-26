import * as THREE from "three";
import {
  createGableRoofGeometry,
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import { toonMaterial } from "../../../rendering/materials.js";

export function createAlunAlunWestRoadsideFactory({
  collections: {
    animatedStopDetails,
  },
  helpers: {
    addLocalPalm,
    getSitubondoSignMaterial,
  },
  materials: {
    foliageMaterials,
    rockMaterial,
  },
}) {
  function addAlunAlunParkedVehicle(
    group,
    north,
    east,
    color,
    rotation = 0,
    scale = 1,
  ) {
    const vehicle = new THREE.Group();
    vehicle.position.set(north, 0.07, east);
    vehicle.rotation.y = rotation;
    vehicle.scale.setScalar(scale);
    const bodyMaterial = toonMaterial({ color });
    const glassMaterial = toonMaterial({ color: 0x304b50 });
    const darkMaterial = toonMaterial({ color: 0x252b2c });
    const body = new THREE.Mesh(roundedBox(0.44, 0.28, 0.92, 0.07), bodyMaterial);
    body.position.y = 0.23;
    vehicle.add(body);
    const cabin = new THREE.Mesh(roundedBox(0.38, 0.25, 0.48, 0.065), glassMaterial);
    cabin.position.set(0, 0.44, -0.04);
    vehicle.add(cabin);
    [-0.24, 0.24].forEach((x) => {
      [-0.3, 0.3].forEach((z) => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.055, 12),
          darkMaterial,
        );
        wheel.position.set(x, 0.11, z);
        wheel.rotation.z = Math.PI * 0.5;
        vehicle.add(wheel);
      });
    });
    vehicle.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(vehicle);
    group.add(vehicle);
    return vehicle;
  }

  function addAlunAlunParkedPickup(
    group,
    north,
    east,
    color,
    rotation = 0,
    scale = 1,
  ) {
    const pickup = new THREE.Group();
    pickup.position.set(north, 0.07, east);
    pickup.rotation.y = rotation;
    pickup.scale.setScalar(scale);
    const bodyMaterial = toonMaterial({ color });
    const glassMaterial = toonMaterial({ color: 0x304b50 });
    const railMaterial = toonMaterial({ color: 0x2b3131 });

    const chassis = new THREE.Mesh(
      roundedBox(0.46, 0.2, 1.04, 0.055),
      bodyMaterial,
    );
    chassis.position.y = 0.2;
    pickup.add(chassis);
    const cabin = new THREE.Mesh(
      roundedBox(0.42, 0.34, 0.42, 0.065),
      glassMaterial,
    );
    cabin.position.set(0, 0.39, 0.25);
    pickup.add(cabin);
    const cabinRoof = new THREE.Mesh(
      roundedBox(0.46, 0.07, 0.46, 0.025),
      bodyMaterial,
    );
    cabinRoof.position.set(0, 0.58, 0.25);
    pickup.add(cabinRoof);
    const bed = new THREE.Mesh(
      roundedBox(0.44, 0.12, 0.5, 0.025),
      bodyMaterial,
    );
    bed.position.set(0, 0.31, -0.29);
    pickup.add(bed);

    [-0.225, 0.225].forEach((northOffset) => {
      [-0.5, -0.28, -0.06].forEach((eastOffset) => {
        const post = new THREE.Mesh(
          roundedBox(0.035, 0.28, 0.035, 0.008),
          railMaterial,
        );
        post.position.set(northOffset, 0.5, eastOffset);
        pickup.add(post);
      });
      [0.43, 0.55].forEach((height) => {
        const rail = new THREE.Mesh(
          roundedBox(0.035, 0.035, 0.48, 0.008),
          railMaterial,
        );
        rail.position.set(northOffset, height, -0.28);
        pickup.add(rail);
      });
    });
    [0.43, 0.55].forEach((height) => {
      const tailRail = new THREE.Mesh(
        roundedBox(0.46, 0.035, 0.035, 0.008),
        railMaterial,
      );
      tailRail.position.set(0, height, -0.52);
      pickup.add(tailRail);
    });

    [-0.24, 0.24].forEach((northOffset) => {
      [-0.35, 0.35].forEach((eastOffset) => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.055, 12),
          railMaterial,
        );
        wheel.position.set(northOffset, 0.11, eastOffset);
        wheel.rotation.z = Math.PI * 0.5;
        pickup.add(wheel);
      });
    });
    pickup.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(pickup);
    group.add(pickup);
    return pickup;
  }

  function addAlunAlunMedianPlanter(group, north, east, phase) {
    const planter = new THREE.Group();
    planter.position.set(north, 0.08, east);
    const stone = toonMaterial({ color: 0x77756d });
    const stoneLight = toonMaterial({ color: 0xa19c91 });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.08, 14),
      stone,
    );
    base.position.y = 0.04;
    planter.add(base);
    const urn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 9), stoneLight);
    urn.position.y = 0.2;
    urn.scale.set(1, 0.72, 1);
    planter.add(urn);
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.11, 14),
      stone,
    );
    neck.position.y = 0.31;
    planter.add(neck);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.025, 7, 18), stoneLight);
    rim.position.y = 0.37;
    rim.rotation.x = Math.PI * 0.5;
    planter.add(rim);
    mergeDirectMeshesByMaterial(planter);

    const palmRoot = new THREE.Group();
    palmRoot.position.y = 0.34;
    planter.add(palmRoot);
    const palm = addLocalPalm(palmRoot, 0, 0, 0.62);
    animatedStopDetails.push({
      object: palm,
      type: "parkPalm",
      phase,
      strength: 0.012,
    });
    group.add(planter);
    return planter;
  }

  function addAlunAlunRoadBarrier(group, north, east, rotation = 0) {
    const barrier = new THREE.Group();
    barrier.position.set(north, 0.075, east);
    barrier.rotation.y = rotation;
    const orange = toonMaterial({ color: 0xd9583f });
    const pale = toonMaterial({ color: 0xf3e8d1 });
    const dark = toonMaterial({ color: 0x4d504c });
    const body = new THREE.Mesh(roundedBox(0.18, 0.34, 0.86, 0.07), orange);
    body.position.y = 0.24;
    barrier.add(body);
    [-0.24, 0.24].forEach((eastOffset) => {
      const reflector = new THREE.Mesh(roundedBox(0.022, 0.12, 0.18, 0.015), pale);
      reflector.position.set(-0.1, 0.27, eastOffset);
      barrier.add(reflector);
    });
    [-0.29, 0.29].forEach((eastOffset) => {
      const foot = new THREE.Mesh(roundedBox(0.32, 0.07, 0.12, 0.025), dark);
      foot.position.set(0, 0.035, eastOffset);
      barrier.add(foot);
    });
    mergeDirectMeshesByMaterial(barrier);
    barrier.scale.setScalar(0.58);
    group.add(barrier);
    return barrier;
  }

  function addAlunAlunPostOffice(group) {
    const postOffice = new THREE.Group();
    postOffice.position.set(25.1, 0.05, 0.42);
    const wallMaterial = toonMaterial({ color: 0xe6dfd0 });
    const orangeMaterial = toonMaterial({ color: 0xd96839 });
    const roofMaterial = toonMaterial({ color: 0xa74334 });
    const entranceRoofMaterial = new THREE.MeshBasicMaterial({
      color: 0xb84a35,
      side: THREE.DoubleSide,
    });
    const eaveMaterial = toonMaterial({ color: 0xa74334 });
    const roofCourseMaterial = toonMaterial({ color: 0x843a34 });
    const roofRidgeMaterial = toonMaterial({ color: 0x72302d });
    const frameMaterial = toonMaterial({ color: 0xa94c36 });
    const glassMaterial = toonMaterial({ color: 0x365357 });
    const darkMaterial = toonMaterial({ color: 0x333636 });
    const rockMaterial = toonMaterial({ color: 0x333636 });
    const paleMaterial = toonMaterial({ color: 0xe9e5d8 });

    const facadeShift = -1.02;
    const walls = new THREE.Mesh(roundedBox(4.6, 0.96, 5.25, 0.055), wallMaterial);
    walls.position.y = 0.48;
    postOffice.add(walls);
    const roof = new THREE.Mesh(
      createHippedRoofGeometry(5.75, 5.1, 0.56, 1.1),
      roofMaterial,
    );
    roof.position.y = 0.96;
    roof.rotation.y = Math.PI * 0.5;
    postOffice.add(roof);
    const roofCourses = new THREE.Group();
    roofCourses.position.y = 0.96;
    roofCourses.rotation.y = Math.PI * 0.5;
    const roofHalfDepth = 2.55;
    const roofHeight = 0.56;
    const roofSlope = Math.atan2(roofHeight, roofHalfDepth);
    for (let rowIndex = 1; rowIndex <= 18; rowIndex += 1) {
      const progress = rowIndex / 19;
      const courseLength = 5.75 - progress * 1.4;
      [-1, 1].forEach((side) => {
        const course = new THREE.Mesh(
          roundedBox(courseLength, 0.01, 0.018, 0.004),
          rowIndex % 2 === 0 ? roofCourseMaterial : roofRidgeMaterial,
        );
        course.position.set(
          0,
          roofHeight * progress + 0.006,
          side * roofHalfDepth * (1 - progress),
        );
        course.rotation.x = side * roofSlope;
        roofCourses.add(course);
      });
    }
    const roofRidge = new THREE.Mesh(
      roundedBox(4.35, 0.028, 0.048, 0.008),
      roofRidgeMaterial,
    );
    roofRidge.position.y = roofHeight + 0.025;
    roofCourses.add(roofRidge);
    mergeDirectMeshesByMaterial(roofCourses);
    postOffice.add(roofCourses);
    const eave = new THREE.Mesh(roundedBox(4.85, 0.09, 5.5, 0.025), eaveMaterial);
    eave.position.y = 0.96;
    postOffice.add(eave);
    const entranceRoof = new THREE.Mesh(
      createGableRoofGeometry(1.18, 0.98, 0.33),
      entranceRoofMaterial,
    );
    entranceRoof.position.set(-1.47 + facadeShift, 0.95, 0);
    entranceRoof.rotation.y = Math.PI * 0.5;
    postOffice.add(entranceRoof);
    const entranceRoofCourses = new THREE.Group();
    const entranceSlope = Math.atan2(0.33, 0.59);
    for (let rowIndex = 1; rowIndex <= 7; rowIndex += 1) {
      const progress = rowIndex / 8;
      [-1, 1].forEach((side) => {
        const course = new THREE.Mesh(
          roundedBox(0.92, 0.01, 0.018, 0.004),
          rowIndex % 2 === 0 ? roofCourseMaterial : roofRidgeMaterial,
        );
        course.position.set(
          -1.47 + facadeShift,
          0.95 + 0.33 * progress + 0.006,
          side * 0.59 * (1 - progress),
        );
        course.rotation.x = side * entranceSlope;
        entranceRoofCourses.add(course);
      });
    }
    const entranceRidge = new THREE.Mesh(
      roundedBox(0.94, 0.025, 0.04, 0.007),
      roofRidgeMaterial,
    );
    entranceRidge.position.set(-1.47 + facadeShift, 1.3, 0);
    entranceRoofCourses.add(entranceRidge);
    mergeDirectMeshesByMaterial(entranceRoofCourses);
    postOffice.add(entranceRoofCourses);
    const entranceEave = new THREE.Mesh(
      roundedBox(0.92, 0.065, 1.32, 0.018),
      eaveMaterial,
    );
    entranceEave.position.set(-1.5 + facadeShift, 0.94, 0);
    postOffice.add(entranceEave);
    const upperBand = new THREE.Mesh(roundedBox(0.055, 0.1, 5.05, 0.018), orangeMaterial);
    upperBand.position.set(-1.275 + facadeShift, 0.87, 0);
    postOffice.add(upperBand);
    const lowerBand = new THREE.Mesh(roundedBox(0.055, 0.08, 5.05, 0.018), orangeMaterial);
    lowerBand.position.set(-1.275 + facadeShift, 0.12, 0);
    postOffice.add(lowerBand);

    [-2.1, -1.5, -0.9, 0.92, 1.52, 2.12].forEach((east) => {
      const transom = new THREE.Mesh(
        roundedBox(0.035, 0.11, 0.38, 0.012),
        glassMaterial,
      );
      transom.position.set(-1.31 + facadeShift, 0.82, east);
      postOffice.add(transom);
    });

    [-1.72, 1.72].forEach((east) => {
      const canopy = new THREE.Mesh(
        roundedBox(0.34, 0.065, 1.7, 0.018),
        orangeMaterial,
      );
      canopy.position.set(-1.42 + facadeShift, 0.69, east);
      postOffice.add(canopy);
    });

    const addOpening = (east, width, height, isDoor = false) => {
      const frame = new THREE.Mesh(
        roundedBox(0.06, height, width, 0.025),
        frameMaterial,
      );
      frame.position.set(-1.285 + facadeShift, isDoor ? height * 0.5 + 0.12 : 0.43, east);
      postOffice.add(frame);
      const glass = new THREE.Mesh(
        roundedBox(0.035, height - 0.08, width - 0.08, 0.018),
        glassMaterial,
      );
      glass.position.set(-1.322 + facadeShift, frame.position.y, east);
      postOffice.add(glass);
    };
    [-2.05, -1.35, -0.45, 0.45, 1.35, 2.05].forEach((east, index) =>
      addOpening(east, index === 2 || index === 3 ? 0.62 : 0.56, index === 2 || index === 3 ? 0.64 : 0.46, index === 2 || index === 3),
    );

    const signBacking = new THREE.Mesh(roundedBox(0.055, 0.24, 1.62, 0.025), darkMaterial);
    signBacking.position.set(-1.315 + facadeShift, 0.73, 0);
    postOffice.add(signBacking);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.38, 0.16),
      getSitubondoSignMaterial("POS INDONESIA", "#f2eee2", 900),
    );
    sign.position.set(-1.347 + facadeShift, 0.73, 0);
    sign.rotation.y = -Math.PI * 0.5;
    postOffice.add(sign);

    [-1.92, -1.24, 0.94, 1.48, 2.04].forEach((east) => {
      const unit = new THREE.Mesh(roundedBox(0.1, 0.2, 0.3, 0.025), paleMaterial);
      unit.position.set(-1.33 + facadeShift, 0.78, east);
      postOffice.add(unit);
      const fanMount = new THREE.Group();
      fanMount.position.set(-1.388 + facadeShift, 0.78, east);
      fanMount.rotation.y = -Math.PI * 0.5;
      const rotor = new THREE.Group();
      const fanRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.012, 6, 12),
        darkMaterial,
      );
      rotor.add(fanRing);
      for (let bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
        const blade = new THREE.Mesh(
          roundedBox(0.012, 0.07, 0.01, 0.004),
          darkMaterial,
        );
        blade.position.y = 0.027;
        blade.rotation.z = (bladeIndex / 3) * Math.PI * 2;
        rotor.add(blade);
      }
      fanMount.add(rotor);
      postOffice.add(fanMount);
      animatedStopDetails.push({
        object: rotor,
        type: "spin",
        phase: east,
      });
    });

    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(roundedBox(0.04, 0.045, 1.88, 0.012), orangeMaterial);
      rail.position.set(-1.66 + facadeShift, 0.28, side * 1.46);
      postOffice.add(rail);
    });
    for (let east = -2.38; east <= 2.38; east += 0.24) {
      if (Math.abs(east) < 0.48) continue;
      const picket = new THREE.Mesh(roundedBox(0.045, 0.34, 0.045, 0.012), orangeMaterial);
      picket.position.set(-1.66 + facadeShift, 0.22, east);
      postOffice.add(picket);
    }

    const propertySign = new THREE.Mesh(
      roundedBox(0.18, 0.3, 1.42, 0.045),
      darkMaterial,
    );
    propertySign.position.set(-1.91 + facadeShift, 0.18, -0.42);
    postOffice.add(propertySign);
    const propertyLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.18, 0.13),
      getSitubondoSignMaterial("KANTOR POS SITUBONDO", "#d7b75f", 800),
    );
    propertyLabel.position.set(-2.015 + facadeShift, 0.2, -0.42);
    propertyLabel.rotation.y = -Math.PI * 0.5;
    postOffice.add(propertyLabel);
    [
      [-1.92, 0.23, -1.18, 0.22],
      [-1.96, 0.2, 0.32, 0.18],
      [-1.86, 0.16, 0.72, 0.14],
    ].forEach(([north, height, east, scale]) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(scale, 0),
        rockMaterial,
      );
      rock.position.set(north + facadeShift, height, east);
      rock.scale.y = 0.72;
      postOffice.add(rock);
    });

    const planter = new THREE.Mesh(roundedBox(0.5, 0.16, 1.08, 0.05), paleMaterial);
    planter.position.set(-1.82 + facadeShift, 0.11, -1.7);
    postOffice.add(planter);
    const shrubs = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 7),
      foliageMaterials[1],
    );
    shrubs.position.set(-1.82 + facadeShift, 0.31, -1.7);
    shrubs.scale.set(0.72, 0.52, 1.45);
    postOffice.add(shrubs);

    const westAnnex = new THREE.Group();
    westAnnex.name = "Pos Indonesia integrated west annex";
    westAnnex.position.set(-0.56, 0, -3.8);
    const annexBody = new THREE.Mesh(
      roundedBox(7.72, 0.58, 2.05, 0.035),
      wallMaterial,
    );
    annexBody.position.y = 0.29;
    westAnnex.add(annexBody);
    const annexConnector = new THREE.Mesh(
      roundedBox(3.65, 0.5, 0.62, 0.025),
      wallMaterial,
    );
    annexConnector.position.set(0.6, 0.27, 1.32);
    westAnnex.add(annexConnector);
    const annexRoof = new THREE.Mesh(
      createHippedRoofGeometry(8.05, 2.35, 0.22, 0.72),
      roofMaterial,
    );
    annexRoof.position.y = 0.58;
    westAnnex.add(annexRoof);
    const annexEave = new THREE.Mesh(
      roundedBox(8.15, 0.055, 2.42, 0.014),
      roofCourseMaterial,
    );
    annexEave.position.y = 0.58;
    westAnnex.add(annexEave);
    const annexBand = new THREE.Mesh(
      roundedBox(0.065, 0.12, 1.52, 0.014),
      orangeMaterial,
    );
    annexBand.position.set(-3.9, 0.49, -0.08);
    westAnnex.add(annexBand);
    const annexWindow = new THREE.Mesh(
      roundedBox(0.04, 0.22, 1.22, 0.014),
      glassMaterial,
    );
    annexWindow.position.set(-3.94, 0.31, -0.08);
    westAnnex.add(annexWindow);
    const annexApron = new THREE.Mesh(
      roundedBox(1.15, 0.052, 1.82, 0.018),
      paleMaterial,
    );
    annexApron.position.set(-4.34, 0.026, -0.08);
    westAnnex.add(annexApron);
    mergeDirectMeshesByMaterial(westAnnex);
    postOffice.add(westAnnex);

    const postalTerrace = new THREE.Group();
    postalTerrace.name = "Pos Indonesia west terrace frontage";
    postalTerrace.position.set(-3.18, 0, -3.72);
    const terracePaving = new THREE.Mesh(
      roundedBox(2.58, 0.052, 2.16, 0.024),
      paleMaterial,
    );
    terracePaving.position.y = 0.026;
    postalTerrace.add(terracePaving);
    const terraceCanopy = new THREE.Mesh(
      roundedBox(2.28, 0.07, 1.68, 0.02),
      orangeMaterial,
    );
    terraceCanopy.position.set(0.12, 0.76, -0.04);
    terraceCanopy.rotation.z = 0.025;
    postalTerrace.add(terraceCanopy);
    [-0.86, 0.92].forEach((east) => {
      const canopyPost = new THREE.Mesh(
        roundedBox(0.055, 0.74, 0.055, 0.012),
        darkMaterial,
      );
      canopyPost.position.set(-0.98, 0.38, east);
      postalTerrace.add(canopyPost);
    });
    const terraceLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.14),
      getSitubondoSignMaterial("TERAS POS", "#f2eee2", 820),
    );
    terraceLabel.position.set(-1.02, 0.6, -0.08);
    terraceLabel.rotation.y = -Math.PI * 0.5;
    postalTerrace.add(terraceLabel);
    [-0.98, -0.42, 0.32, 0.9].forEach((east) => {
      const lowPost = new THREE.Mesh(
        roundedBox(0.06, 0.32, 0.06, 0.012),
        orangeMaterial,
      );
      lowPost.position.set(-1.2, 0.17, east);
      postalTerrace.add(lowPost);
    });
    [0.18, 0.31].forEach((height) => {
      const lowRail = new THREE.Mesh(
        roundedBox(0.05, 0.04, 1.96, 0.01),
        height < 0.2 ? paleMaterial : orangeMaterial,
      );
      lowRail.position.set(-1.2, height, -0.02);
      postalTerrace.add(lowRail);
    });
    mergeDirectMeshesByMaterial(postalTerrace);
    postOffice.add(postalTerrace);

    postOffice.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(postOffice);
    group.add(postOffice);
    return postOffice;
  }

  function addAlunAlunTyreShop(group) {
    const shop = new THREE.Group();
    shop.position.set(26.04, 0.05, 4.7);
    const architecture = new THREE.Group();
    const wallMaterial = toonMaterial({ color: 0x7f817d });
    const wallShadowMaterial = toonMaterial({ color: 0x676b68 });
    const concreteMaterial = toonMaterial({ color: 0x5f625f });
    const columnMaterial = toonMaterial({ color: 0x4f5351 });
    const accentMaterial = toonMaterial({ color: 0xa6433d });
    const bannerMaterial = toonMaterial({ color: 0xd6b94a });
    const greenMaterial = toonMaterial({ color: 0x56735a });
    const glassMaterial = toonMaterial({ color: 0x1f2d2e });
    const paleMaterial = toonMaterial({ color: 0xd9d8cf });
    const blueMaterial = toonMaterial({ color: 0x2d6298 });
    const tyreMaterial = toonMaterial({ color: 0x252928 });
    const rimMaterial = toonMaterial({ color: 0x858b87 });

    const body = new THREE.Mesh(
      roundedBox(2.92, 1.96, 3.34, 0.035),
      wallMaterial,
    );
    body.position.y = 0.98;
    architecture.add(body);
    const westSide = new THREE.Mesh(
      roundedBox(2.98, 1.88, 0.075, 0.018),
      wallShadowMaterial,
    );
    westSide.position.set(0.02, 0.96, -1.69);
    architecture.add(westSide);
    const roof = new THREE.Mesh(
      roundedBox(3.12, 0.13, 3.5, 0.018),
      concreteMaterial,
    );
    roof.position.y = 2.01;
    architecture.add(roof);

    const shopApron = new THREE.Mesh(
      roundedBox(0.5, 0.08, 3.02, 0.025),
      concreteMaterial,
    );
    shopApron.position.set(-1.67, 0.04, 0.08);
    architecture.add(shopApron);
    const groundRecess = new THREE.Mesh(
      roundedBox(0.075, 0.7, 2.76, 0.018),
      glassMaterial,
    );
    groundRecess.position.set(-1.495, 0.4, 0.14);
    architecture.add(groundRecess);
    [-1.06, -0.34, 0.38, 1.1].forEach((east) => {
      const bayColumn = new THREE.Mesh(
        roundedBox(0.09, 0.72, 0.09, 0.016),
        columnMaterial,
      );
      bayColumn.position.set(-1.57, 0.4, east);
      architecture.add(bayColumn);
    });

    const yellowFascia = new THREE.Mesh(
      roundedBox(0.105, 0.18, 2.9, 0.018),
      bannerMaterial,
    );
    yellowFascia.position.set(-1.54, 0.79, 0.08);
    architecture.add(yellowFascia);
    [
      ["MESIN BARU", -0.98, "#f4e9ce", greenMaterial],
      ["BAN MOTOR", -0.22, "#4b524d", bannerMaterial],
      ["SERVIS", 0.5, "#4b524d", bannerMaterial],
      ["SPAREPART", 1.12, "#4b524d", bannerMaterial],
    ].forEach(([text, east, color, backingMaterial]) => {
      const backing = new THREE.Mesh(
        roundedBox(0.03, 0.135, text === "MESIN BARU" ? 0.5 : 0.56, 0.01),
        backingMaterial,
      );
      backing.position.set(-1.605, 0.79, east);
      architecture.add(backing);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(text === "MESIN BARU" ? 0.42 : 0.47, 0.08),
        getSitubondoSignMaterial(text, color, 820),
      );
      label.position.set(-1.624, 0.79, east);
      label.rotation.y = -Math.PI * 0.5;
      architecture.add(label);
    });

    const balconySlab = new THREE.Mesh(
      roundedBox(0.28, 0.11, 3.04, 0.018),
      concreteMaterial,
    );
    balconySlab.position.set(-1.57, 1.01, 0.06);
    architecture.add(balconySlab);
    const patternedAwning = new THREE.Mesh(
      roundedBox(0.095, 0.17, 2.9, 0.018),
      accentMaterial,
    );
    patternedAwning.position.set(-1.69, 0.99, 0.06);
    architecture.add(patternedAwning);
    const awningPattern = new THREE.Mesh(
      new THREE.PlaneGeometry(2.58, 0.105),
      getSitubondoSignMaterial("◇ ◇ ◇ ◇ ◇ ◇", "#eadfcf", 700),
    );
    awningPattern.position.set(-1.742, 0.99, 0.06);
    awningPattern.rotation.y = -Math.PI * 0.5;
    architecture.add(awningPattern);

    [-1.26, -0.42, 0.42, 1.26].forEach((east) => {
      const upperBay = new THREE.Mesh(
        roundedBox(0.065, 0.54, 0.56, 0.016),
        glassMaterial,
      );
      upperBay.position.set(-1.495, 1.55, east);
      architecture.add(upperBay);
      const upperLintel = new THREE.Mesh(
        roundedBox(0.075, 0.08, 0.64, 0.014),
        wallShadowMaterial,
      );
      upperLintel.position.set(-1.51, 1.86, east);
      architecture.add(upperLintel);
      const unit = new THREE.Mesh(
        roundedBox(0.09, 0.2, 0.28, 0.018),
        paleMaterial,
      );
      unit.position.set(-1.565, 1.72, east - 0.13);
      architecture.add(unit);
      const fan = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.012, 6, 12),
        columnMaterial,
      );
      fan.position.set(-1.617, 1.72, east - 0.13);
      fan.rotation.y = -Math.PI * 0.5;
      architecture.add(fan);
    });
    [-1.63, -0.84, 0, 0.84, 1.63].forEach((east) => {
      const upperColumn = new THREE.Mesh(
        roundedBox(0.09, 0.86, 0.1, 0.016),
        accentMaterial,
      );
      upperColumn.position.set(-1.53, 1.53, east);
      architecture.add(upperColumn);
    });

    [1.18, 1.32].forEach((height) => {
      const balconyRail = new THREE.Mesh(
        roundedBox(0.045, 0.04, 2.94, 0.01),
        columnMaterial,
      );
      balconyRail.position.set(-1.72, height, 0.06);
      architecture.add(balconyRail);
    });
    for (let east = -1.35; east <= 1.45; east += 0.28) {
      const baluster = new THREE.Mesh(
        roundedBox(0.035, 0.24, 0.035, 0.008),
        columnMaterial,
      );
      baluster.position.set(-1.72, 1.23, east);
      architecture.add(baluster);
    }

    [
      [1.83, -0.88, 0.24, 0.08],
      [1.43, 0.02, 0.18, 0.07],
      [1.78, 0.93, 0.28, 0.06],
    ].forEach(([height, east, width, depth]) => {
      const weathering = new THREE.Mesh(
        roundedBox(0.025, width, depth, 0.008),
        wallShadowMaterial,
      );
      weathering.position.set(-1.515, height, east);
      architecture.add(weathering);
    });

    const signPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 1.72, 8),
      columnMaterial,
    );
    signPole.position.set(-1.82, 0.86, -1.35);
    architecture.add(signPole);
    const signBacking = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 28),
      blueMaterial,
    );
    signBacking.position.set(-1.85, 1.73, -1.35);
    signBacking.rotation.y = -Math.PI * 0.5;
    signBacking.scale.set(0.92, 1.18, 1);
    architecture.add(signBacking);
    const signInset = new THREE.Mesh(
      new THREE.CircleGeometry(0.285, 28),
      paleMaterial,
    );
    signInset.position.set(-1.875, 1.73, -1.35);
    signInset.rotation.y = -Math.PI * 0.5;
    signInset.scale.set(0.92, 1.18, 1);
    architecture.add(signInset);
    const signLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.43, 0.16),
      getSitubondoSignMaterial("PLANET BAN", "#b8413e", 900),
    );
    signLabel.position.set(-1.9, 1.73, -1.35);
    signLabel.rotation.y = -Math.PI * 0.5;
    architecture.add(signLabel);

    architecture.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(architecture);
    architecture.scale.set(1.64, 0.62, 0.96);
    shop.add(architecture);

    [-0.66, 0.14, 0.92].forEach((east, index) => {
      const tyreDisplay = new THREE.Group();
      tyreDisplay.position.set(-1.62, 0.31 + (index % 2) * 0.03, east);
      tyreDisplay.rotation.y = -Math.PI * 0.5;
      const wheel = new THREE.Group();
      const tyre = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.05, 8, 20),
        tyreMaterial,
      );
      wheel.add(tyre);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.062, 0.012, 6, 16),
        rimMaterial,
      );
      rim.position.z = -0.004;
      wheel.add(rim);
      for (let spokeIndex = 0; spokeIndex < 3; spokeIndex += 1) {
        const spoke = new THREE.Mesh(
          roundedBox(0.018, 0.115, 0.014, 0.005),
          rimMaterial,
        );
        spoke.rotation.z = (spokeIndex / 3) * Math.PI;
        spoke.position.z = -0.006;
        wheel.add(spoke);
      }
      const balanceMark = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 7, 5),
        accentMaterial,
      );
      balanceMark.position.set(0.11, 0.06, 0.012);
      wheel.add(balanceMark);
      tyreDisplay.add(wheel);
      shop.add(tyreDisplay);
      animatedStopDetails.push({
        object: wheel,
        type: "spin",
        phase: index * 0.7,
      });
    });

    shop.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    group.add(shop);
    return shop;
  }

  function addAlunAlunVendorCart(group, north, east) {
    const cart = new THREE.Group();
    cart.position.set(north, 0.06, east);
    const redMaterial = toonMaterial({ color: 0xc94b3e });
    const paleMaterial = toonMaterial({ color: 0xeadfbf });
    const darkMaterial = toonMaterial({ color: 0x2c3232 });
    const body = new THREE.Mesh(roundedBox(0.38, 0.34, 0.66, 0.045), redMaterial);
    body.position.y = 0.34;
    cart.add(body);
    const counter = new THREE.Mesh(roundedBox(0.46, 0.06, 0.75, 0.02), paleMaterial);
    counter.position.y = 0.55;
    cart.add(counter);
    [-0.25, 0.25].forEach((eastOffset) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14), darkMaterial);
      wheel.position.set(-0.23, 0.2, eastOffset);
      wheel.rotation.y = Math.PI * 0.5;
      cart.add(wheel);
    });
    [-0.17, 0.17].forEach((northOffset) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.62, 6), darkMaterial);
      pole.position.set(northOffset, 0.82, 0);
      cart.add(pole);
    });
    const canopy = new THREE.Mesh(roundedBox(0.6, 0.08, 0.86, 0.025), redMaterial);
    canopy.position.y = 1.13;
    cart.add(canopy);
    cart.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(cart);
    group.add(cart);
    return cart;
  }

  function addAlunAlunWestRoadsideContext(group) {
    const roadside = new THREE.Group();
    const kioskMaterial = toonMaterial({ color: 0xe5e4dc });
    const roofMaterial = toonMaterial({ color: 0x41684b });
    const kioskRoofSlopeMaterial = toonMaterial({ color: 0x7c827d });
    const kioskFasciaMaterial = toonMaterial({ color: 0x303936 });
    const greenMaterial = toonMaterial({ color: 0x315d45 });
    const redMaterial = toonMaterial({ color: 0xc95745 });
    const paleMaterial = toonMaterial({ color: 0xf1eadc });
    const darkMaterial = toonMaterial({ color: 0x252b2b });
    const glassMaterial = toonMaterial({ color: 0x31565a });
    const signMaterial = toonMaterial({ color: 0xcdbd9f });

    const kiosk = new THREE.Group();
    kiosk.name = "@BICAU STORY takeaway booth · Google Street View";
    kiosk.position.set(23.55, 0.05, -12.35);
    const kioskBody = new THREE.Mesh(
      roundedBox(0.96, 0.62, 1.2, 0.035),
      kioskMaterial,
    );
    kioskBody.position.y = 0.31;
    kiosk.add(kioskBody);
    const kioskBase = new THREE.Mesh(
      roundedBox(0.99, 0.12, 1.24, 0.025),
      darkMaterial,
    );
    kioskBase.position.y = 0.06;
    kiosk.add(kioskBase);
    const kioskRoof = new THREE.Mesh(
      roundedBox(1.14, 0.08, 1.42, 0.018),
      kioskRoofSlopeMaterial,
    );
    kioskRoof.position.y = 0.73;
    kioskRoof.rotation.z = 0.045;
    kiosk.add(kioskRoof);
    for (let seamEast = -0.62; seamEast <= 0.62; seamEast += 0.16) {
      const roofSeam = new THREE.Mesh(
        roundedBox(1.15, 0.018, 0.02, 0.005),
        paleMaterial,
      );
      roofSeam.position.set(0, 0.777, seamEast);
      roofSeam.rotation.z = 0.045;
      kiosk.add(roofSeam);
    }
    const kioskHeader = new THREE.Mesh(
      roundedBox(0.065, 0.25, 1.26, 0.016),
      kioskFasciaMaterial,
    );
    kioskHeader.position.set(-0.51, 0.64, 0);
    kiosk.add(kioskHeader);
    const bicauLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.15),
      getSitubondoSignMaterial("@BICAU", "#eeeae0", 860),
    );
    bicauLabel.position.set(-0.548, 0.65, -0.22);
    bicauLabel.rotation.y = -Math.PI * 0.5;
    kiosk.add(bicauLabel);
    const storyLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.47, 0.15),
      getSitubondoSignMaterial("STORY", "#68a548", 900),
    );
    storyLabel.position.set(-0.55, 0.65, 0.4);
    storyLabel.rotation.y = -Math.PI * 0.5;
    kiosk.add(storyLabel);

    const menuPanel = new THREE.Mesh(
      roundedBox(0.055, 0.36, 0.5, 0.012),
      signMaterial,
    );
    menuPanel.position.set(-0.5, 0.35, -0.31);
    kiosk.add(menuPanel);
    [-0.43, -0.31, -0.19].forEach((eastOffset, index) => {
      const cupBadge = new THREE.Mesh(
        new THREE.CircleGeometry(index === 1 ? 0.06 : 0.045, 12),
        index === 1 ? redMaterial : paleMaterial,
      );
      cupBadge.position.set(-0.536, 0.38 + (index % 2) * 0.07, eastOffset);
      cupBadge.rotation.y = -Math.PI * 0.5;
      kiosk.add(cupBadge);
    });
    const servicePanel = new THREE.Mesh(
      roundedBox(0.055, 0.36, 0.44, 0.012),
      darkMaterial,
    );
    servicePanel.position.set(-0.5, 0.35, 0.27);
    kiosk.add(servicePanel);
    [0.18, 0.28, 0.38].forEach((eastOffset, index) => {
      const menuLine = new THREE.Mesh(
        roundedBox(0.018, 0.018, index === 1 ? 0.2 : 0.15, 0.005),
        paleMaterial,
      );
      menuLine.position.set(-0.536, 0.42 - index * 0.07, eastOffset);
      kiosk.add(menuLine);
    });
    const counterBand = new THREE.Mesh(
      roundedBox(0.06, 0.09, 1.08, 0.012),
      greenMaterial,
    );
    counterBand.position.set(-0.51, 0.12, 0);
    kiosk.add(counterBand);
    const orderLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.07),
      getSitubondoSignMaterial("ORDER", "#eeeae0", 760),
    );
    orderLabel.position.set(-0.548, 0.12, -0.33);
    orderLabel.rotation.y = -Math.PI * 0.5;
    kiosk.add(orderLabel);
    const takeawayLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.07),
      getSitubondoSignMaterial("TAKE AWAY", "#eeeae0", 760),
    );
    takeawayLabel.position.set(-0.55, 0.12, 0.29);
    takeawayLabel.rotation.y = -Math.PI * 0.5;
    kiosk.add(takeawayLabel);
    [-0.64, 0.64].forEach((eastOffset, index) => {
      const cornerPost = new THREE.Mesh(
        roundedBox(0.12, 0.54, 0.12, 0.018),
        index === 0 ? paleMaterial : darkMaterial,
      );
      cornerPost.position.set(-0.51, 0.28, eastOffset);
      kiosk.add(cornerPost);
    });
    const sideVent = new THREE.Mesh(
      roundedBox(0.34, 0.2, 0.035, 0.01),
      glassMaterial,
    );
    sideVent.position.set(0.1, 0.37, 0.615);
    kiosk.add(sideVent);

    for (let east = -3.05, index = 0; east <= 3.05; east += 0.34, index += 1) {
      if (Math.abs(east) < 0.82) continue;
      const fencePost = new THREE.Mesh(
        roundedBox(0.055, 0.42, 0.055, 0.012),
        index % 2 === 0 ? redMaterial : paleMaterial,
      );
      fencePost.position.set(-0.66, 0.23, east);
      kiosk.add(fencePost);
    }
    [-2.0, 2.0].forEach((side) => {
      [0.14, 0.32].forEach((height, index) => {
        const fenceRail = new THREE.Mesh(
          roundedBox(0.045, 0.045, 2.1, 0.01),
          index === 0 ? paleMaterial : redMaterial,
        );
        fenceRail.position.set(-0.65, height, side);
        kiosk.add(fenceRail);
      });
    });
    [-0.82, 0.82].forEach((eastOffset, index) => {
      const gatePost = new THREE.Mesh(
        roundedBox(0.11, 0.58, 0.11, 0.018),
        index === 0 ? paleMaterial : redMaterial,
      );
      gatePost.position.set(-0.65, 0.29, eastOffset);
      kiosk.add(gatePost);
    });
    kiosk.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    mergeDirectMeshesByMaterial(kiosk);
    roadside.add(kiosk);

    const billboard = new THREE.Group();
    billboard.position.set(23.15, 0.05, -10.0);
    billboard.rotation.y = 0.08;
    [-0.36, 0.36].forEach((east) => {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 2.45, 7),
        roofMaterial,
      );
      support.position.set(0, 1.22, east);
      billboard.add(support);
    });
    const board = new THREE.Mesh(
      roundedBox(0.12, 0.82, 1.5, 0.025),
      paleMaterial,
    );
    board.position.y = 2.25;
    billboard.add(board);
    const boardInset = new THREE.Mesh(
      roundedBox(0.035, 0.58, 1.22, 0.012),
      darkMaterial,
    );
    boardInset.position.set(-0.075, 2.25, 0);
    billboard.add(boardInset);
    const boardLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 0.13),
      getSitubondoSignMaterial("SITUBONDO", "#e9e4d6", 740),
    );
    boardLabel.position.set(-0.098, 2.25, 0);
    boardLabel.rotation.y = -Math.PI * 0.5;
    billboard.add(boardLabel);
    const diagonal = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.LineCurve3(
          new THREE.Vector3(-0.08, 1.95, -0.48),
          new THREE.Vector3(-0.08, 2.54, 0.46),
        ),
        1,
        0.025,
        5,
        false,
      ),
      roofMaterial,
    );
    billboard.add(diagonal);
    mergeDirectMeshesByMaterial(billboard);
    roadside.add(billboard);

    group.add(roadside);
  }


  return {
    addAlunAlunMedianPlanter,
    addAlunAlunParkedPickup,
    addAlunAlunParkedVehicle,
    addAlunAlunPostOffice,
    addAlunAlunRoadBarrier,
    addAlunAlunTyreShop,
    addAlunAlunVendorCart,
    addAlunAlunWestRoadsideContext,
  };
}
