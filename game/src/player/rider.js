import * as THREE from "three";
import {
  capsule,
  roundedBox,
} from "../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../rendering/materials.js";
import {
  sphericalPosition,
  surfaceFrame,
} from "../world/surface.js";

export function createRiderSystem({
  constants: {
    PLANET_RADIUS,
    RIDER_SCALE,
    RIDER_VISUAL_GROUND_OFFSET,
    RUN_SPEED,
    WALK_SPEED,
  },
  gameState,
  getReducedMotion,
  materials: {
    dustMaterial,
    inkMaterial,
    letterMaterial,
    targetMaterial,
  },
  navigationSurfaceLiftAt,
  rider,
  world,
}) {
  const footstepDust = [];
  const tempVector = new THREE.Vector3();
  const tempVector2 = new THREE.Vector3();
  const tempVector8 = new THREE.Vector3();
  const tempVector9 = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);

  function createRider() {
    const root = new THREE.Group();
    const visual = new THREE.Group();
    const body = new THREE.Group();
    root.add(visual);
    visual.add(body);
    body.position.y = 0.04;
  
    const contactShadowGeometry = new THREE.CircleGeometry(0.26, 28);
    contactShadowGeometry.rotateX(-Math.PI * 0.5);
    const contactShadowMaterial = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        color: 0x294b47,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const contactShadow = new THREE.Mesh(
      contactShadowGeometry,
      contactShadowMaterial,
    );
    contactShadow.position.y = 0.014;
    contactShadow.scale.set(1.08, 1, 0.7);
    contactShadow.renderOrder = 1;
    root.add(contactShadow);
  
    const coatMaterial = toonMaterial({
      color: 0xb94f4a,
      roughness: 0.76,
      metalness: 0,
    });
    const coatTrimMaterial = toonMaterial({
      color: 0xf0e7d3,
      roughness: 0.8,
      metalness: 0,
    });
    const shortsMaterial = toonMaterial({
      color: 0x263f4b,
      roughness: 0.78,
      metalness: 0,
    });
    const sockMaterial = toonMaterial({
      color: 0xf2e9df,
      roughness: 0.82,
      metalness: 0,
    });
    const shoeMaterial = toonMaterial({
      color: 0x31383c,
      roughness: 0.82,
      metalness: 0,
    });
    const skinMaterial = toonMaterial({
      color: 0xdba17d,
      roughness: 0.7,
      metalness: 0,
    });
    const hairMaterial = toonMaterial({
      color: 0x34363f,
      roughness: 0.82,
      metalness: 0,
    });
    const eyeWhiteMaterial = toonMaterial({
      color: 0xfffdf8,
      roughness: 0.5,
      metalness: 0,
    });
    const eyeMaterial = toonMaterial({
      color: 0x2f4654,
      roughness: 0.48,
      metalness: 0,
    });
    const eyeHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const blushMaterial = toonMaterial({
      color: 0xe99a98,
      roughness: 0.72,
      metalness: 0,
    });
    const bagMaterial = toonMaterial({
      color: 0x2d3b3e,
      roughness: 0.76,
      metalness: 0,
    });
    const bagFlapMaterial = toonMaterial({
      color: 0x202d30,
      roughness: 0.78,
      metalness: 0,
    });
    const scarfMaterial = toonMaterial({
      color: 0xf0e7d3,
      roughness: 0.72,
      metalness: 0,
    });
  
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.13, 0.32, 18),
      coatMaterial,
    );
    torso.position.y = 0.535;
    torso.scale.set(0.72, 1, 1.08);
    body.add(torso);
  
    const coatHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.145, 0.12, 18),
      coatMaterial,
    );
    coatHem.position.y = 0.39;
    coatHem.scale.set(0.72, 1, 1.08);
    body.add(coatHem);
  
    [0.49, 0.59].forEach((buttonY) => {
      const button = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 6),
        coatTrimMaterial,
      );
      button.position.set(0.095, buttonY, 0);
      body.add(button);
    });
  
    [
      [0.58, -0.045, 0.09],
      [0.61, 0.005, 0.075],
      [0.55, 0.012, 0.055],
    ].forEach(([y, z, depth], index) => {
      const emblemBar = new THREE.Mesh(
        roundedBox(0.014, 0.022, depth, 0.005),
        bagMaterial,
      );
      emblemBar.position.set(0.09, y, z);
      emblemBar.rotation.x = index * 0.18;
      body.add(emblemBar);
    });
  
    const hips = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.22, 16),
      shortsMaterial,
    );
    hips.position.y = 0.37;
    hips.scale.set(0.78, 1, 1.08);
    visual.add(hips);
  
    function createLeg(side) {
      const upperLength = 0.16;
      const lowerLength = 0.18;
      const hip = new THREE.Group();
      const knee = new THREE.Group();
      const foot = new THREE.Group();
      hip.position.set(0, 0.375, side * 0.057);
      knee.position.y = -upperLength;
      foot.position.y = -lowerLength;
  
      const upperLeg = new THREE.Mesh(
        capsule(upperLength, 0.039, 6, 12),
        skinMaterial,
      );
      upperLeg.position.y = -upperLength * 0.5;
      hip.add(upperLeg);
  
      const lowerLeg = new THREE.Mesh(
        capsule(lowerLength, 0.035, 6, 12),
        sockMaterial,
      );
      lowerLeg.position.y = -lowerLength * 0.5;
      knee.add(lowerLeg);
  
      const sockCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12),
        coatTrimMaterial,
      );
      sockCuff.position.y = -0.015;
      knee.add(sockCuff);
  
      const shoe = new THREE.Mesh(
        roundedBox(0.14, 0.055, 0.075, 0.022),
        shoeMaterial,
      );
      shoe.position.set(0.04, -0.022, 0);
      foot.add(shoe);
  
      knee.add(foot);
      hip.add(knee);
      visual.add(hip);
      return { hip, knee, foot };
    }
  
    function createArm(side) {
      const upperLength = 0.14;
      const lowerLength = 0.125;
      const shoulder = new THREE.Group();
      const elbow = new THREE.Group();
      shoulder.position.set(0, 0.66, side * 0.132);
      elbow.position.y = -upperLength;
  
      const upperSleeve = new THREE.Mesh(
        capsule(upperLength, 0.041, 6, 12),
        coatMaterial,
      );
      upperSleeve.position.y = -upperLength * 0.5;
      shoulder.add(upperSleeve);
  
      const lowerSleeve = new THREE.Mesh(
        capsule(lowerLength, 0.036, 6, 12),
        coatMaterial,
      );
      lowerSleeve.position.y = -lowerLength * 0.5;
      elbow.add(lowerSleeve);
  
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.041, 12, 9),
        skinMaterial,
      );
      hand.position.y = -lowerLength - 0.018;
      elbow.add(hand);
  
      shoulder.add(elbow);
      body.add(shoulder);
      return { shoulder, elbow };
    }
  
    const leftLeg = createLeg(1);
    const rightLeg = createLeg(-1);
    const leftArm = createArm(1);
    const rightArm = createArm(-1);
  
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.052, 0.07, 12),
      skinMaterial,
    );
    neck.position.y = 0.735;
    body.add(neck);
  
    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.063, 0.018, 7, 18),
      scarfMaterial,
    );
    scarf.position.y = 0.745;
    scarf.rotation.x = Math.PI * 0.5;
    scarf.scale.set(0.78, 0.78, 1);
    body.add(scarf);
  
    const scarfTails = new THREE.Group();
    scarfTails.position.set(-0.095, 0.7, 0.025);
    [
      [-0.006, -0.11, -0.025, 0.18, 0.08],
      [-0.012, -0.14, 0.035, 0.22, -0.06],
    ].forEach(([x, y, z, length, angle]) => {
      const tail = new THREE.Mesh(
        roundedBox(0.025, length, 0.055, 0.012),
        scarfMaterial,
      );
      tail.position.set(x, y, z);
      tail.rotation.z = angle;
      scarfTails.add(tail);
    });
    body.add(scarfTails);
  
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.785;
    headGroup.scale.setScalar(0.86);
    body.add(headGroup);
    const hairLocks = [];
  
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 24, 18),
      skinMaterial,
    );
    head.position.y = 0.085;
    head.scale.set(0.94, 1, 1);
    headGroup.add(head);
  
    const backHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.143, 22, 16),
      hairMaterial,
    );
    backHair.position.set(-0.045, 0.095, 0);
    backHair.scale.set(0.72, 1.05, 1.02);
    headGroup.add(backHair);
  
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.151,
        24,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.58,
      ),
      hairMaterial,
    );
    hairCap.position.y = 0.115;
    hairCap.scale.x = 0.95;
    headGroup.add(hairCap);
  
    [-0.1, -0.05, 0, 0.05, 0.1].forEach((z, index) => {
      const backLock = new THREE.Mesh(
        new THREE.ConeGeometry(0.032, 0.13 + (index % 2) * 0.025, 8),
        hairMaterial,
      );
      backLock.position.set(
        -0.125 - Math.abs(z) * 0.12,
        -0.005 + (index % 2) * 0.008,
        z,
      );
      backLock.rotation.z = Math.PI;
      backLock.rotation.x = z * 0.7;
      backLock.userData.restRotationZ = backLock.rotation.z;
      hairLocks.push(backLock);
      headGroup.add(backLock);
    });
  
    const hood = new THREE.Mesh(
      new THREE.TorusGeometry(0.137, 0.027, 8, 22),
      coatMaterial,
    );
    hood.position.set(-0.045, 0.055, 0);
    hood.rotation.y = Math.PI * 0.5;
    hood.scale.set(1, 1.1, 0.94);
    headGroup.add(hood);
  
    [-1, 1].forEach((side) => {
      const sideLock = new THREE.Mesh(
        capsule(0.16, 0.027, 6, 12),
        hairMaterial,
      );
      sideLock.position.set(0.012, 0.025, side * 0.126);
      sideLock.rotation.z = side * 0.08;
      sideLock.userData.restRotationZ = sideLock.rotation.z;
      hairLocks.push(sideLock);
      headGroup.add(sideLock);
    });
  
    [
      [0.93, -0.06, 0.105, -0.08],
      [0.945, 0, 0.125, 0],
      [0.93, 0.06, 0.1, 0.08],
    ].forEach(([y, z, length, angle]) => {
      const bang = new THREE.Mesh(
        new THREE.ConeGeometry(0.034, length, 10),
        hairMaterial,
      );
      bang.position.set(0.122, y - 0.78, z);
      bang.rotation.z = Math.PI + angle;
      headGroup.add(bang);
    });
  
    const headphoneMaterial = toonMaterial({
      color: 0xf5f1e7,
      emissive: 0x7db6b0,
      emissiveIntensity: 0.03,
    });
    const headphoneBand = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.145,
        0.012,
        7,
        28,
        Math.PI * 1.08,
      ),
      headphoneMaterial,
    );
    headphoneBand.position.y = 0.105;
    headphoneBand.rotation.y = Math.PI * 0.5;
    headphoneBand.rotation.z = Math.PI * 0.46;
    headGroup.add(headphoneBand);
  
    [-1, 1].forEach((side) => {
      const earCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.047, 0.052, 0.026, 14),
        headphoneMaterial,
      );
      earCup.position.set(-0.002, 0.08, side * 0.145);
      earCup.rotation.x = Math.PI * 0.5;
      headGroup.add(earCup);
  
      const earPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.037, 0.04, 0.012, 14),
        inkMaterial,
      );
      earPad.position.set(-0.002, 0.08, side * 0.137);
      earPad.rotation.x = Math.PI * 0.5;
      headGroup.add(earPad);
    });
  
    const eyes = [];
    [-0.055, 0.055].forEach((side) => {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 14, 10),
        eyeWhiteMaterial,
      );
      eyeWhite.position.set(0.134, 0.1, side);
      eyeWhite.scale.set(0.35, 1.08, 0.8);
      headGroup.add(eyeWhite);
  
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 12, 9),
        eyeMaterial,
      );
      iris.position.set(0.144, 0.098, side);
      iris.scale.set(0.26, 1.05, 0.78);
      headGroup.add(iris);
  
      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.005, 7, 5),
        eyeHighlightMaterial,
      );
      highlight.position.set(0.149, 0.107, side - Math.sign(side) * 0.004);
      headGroup.add(highlight);
      eyes.push({
        eyeWhite,
        iris,
        highlight,
        whiteScaleY: eyeWhite.scale.y,
        irisScaleY: iris.scale.y,
        highlightScaleY: highlight.scale.y,
      });
  
      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.019, 10, 7),
        blushMaterial,
      );
      blush.position.set(0.134, 0.06, side * 1.42);
      blush.scale.set(0.26, 0.52, 1);
      headGroup.add(blush);
    });
  
    const mouth = new THREE.Mesh(
      capsule(0.034, 0.0035, 4, 7),
      hairMaterial,
    );
    mouth.position.set(0.14, 0.047, 0);
    mouth.rotation.x = Math.PI * 0.5;
    headGroup.add(mouth);
  
    const bag = new THREE.Mesh(
      roundedBox(0.09, 0.22, 0.25, 0.035),
      bagMaterial,
    );
    bag.position.set(-0.13, 0.49, 0);
    body.add(bag);
  
    const bagFlap = new THREE.Mesh(
      roundedBox(0.022, 0.105, 0.225, 0.018),
      bagFlapMaterial,
    );
    bagFlap.position.set(-0.052, 0.035, 0);
    bag.add(bagFlap);
  
    const bagClasp = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      targetMaterial,
    );
    bagClasp.position.set(-0.066, 0.012, 0);
    bag.add(bagClasp);
  
    const strap = new THREE.Mesh(
      capsule(0.5, 0.011, 5, 9),
      bagFlapMaterial,
    );
    strap.position.set(-0.1, 0.615, 0);
    strap.rotation.x = 0.55;
    body.add(strap);
  
    const letter = new THREE.Mesh(
      roundedBox(0.12, 0.08, 0.016, 0.009),
      letterMaterial,
    );
    letter.position.set(0.055, -0.255, 0);
    letter.rotation.z = -0.16;
    rightArm.shoulder.add(letter);
  
    visual.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  
    root.userData.visual = visual;
    root.userData.contactShadow = contactShadow;
    root.userData.body = body;
    root.userData.hips = hips;
    root.userData.bag = bag;
    root.userData.coatHem = coatHem;
    root.userData.headGroup = headGroup;
    root.userData.scarfTails = scarfTails;
    root.userData.hairLocks = hairLocks;
    root.userData.eyes = eyes;
    root.userData.leftLeg = leftLeg;
    root.userData.rightLeg = rightLeg;
    root.userData.leftArm = leftArm;
    root.userData.rightArm = rightArm;
    world.add(root);
    return root;
  }
  
  const riderMesh = createRider();
  riderMesh.scale.setScalar(RIDER_SCALE);
  
  const footstepDustGeometry = new THREE.RingGeometry(0.022, 0.04, 14);
  footstepDustGeometry.rotateX(-Math.PI * 0.5);
  for (let index = 0; index < 8; index += 1) {
    const material = hideMaterialOutline(dustMaterial.clone());
    const mesh = new THREE.Mesh(footstepDustGeometry, material);
    mesh.visible = false;
    mesh.renderOrder = 2;
    world.add(mesh);
    footstepDust.push({
      mesh,
      material,
      age: 1,
      duration: 0.52,
      basePosition: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
    });
  }
  
  function spawnFootstepDust(side) {
    if (getReducedMotion()) return;
    const puff = footstepDust.find((item) => !item.mesh.visible);
    if (!puff) return;
  
    const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
    const forward = tempVector8
      .copy(east)
      .multiplyScalar(Math.cos(rider.heading))
      .addScaledVector(north, Math.sin(rider.heading))
      .normalize();
    const lateral = tempVector9.crossVectors(forward, normal).normalize();
    const surfaceLift = navigationSurfaceLiftAt(rider.theta, rider.phi);
    puff.basePosition
      .copy(
        sphericalPosition(
          rider.theta,
          rider.phi,
          PLANET_RADIUS + surfaceLift + 0.006,
        ),
      )
      .addScaledVector(lateral, side * 0.045)
      .addScaledVector(forward, -0.035);
    puff.normal.copy(normal);
    puff.mesh.position.copy(puff.basePosition);
    puff.mesh.quaternion.setFromUnitVectors(upAxis, normal);
    puff.mesh.rotateY(side * 0.18);
    puff.mesh.scale.setScalar(0.72);
    puff.material.opacity = 0.3;
    puff.age = 0;
    puff.mesh.visible = true;
  }
  
  function updateFootstepDust(delta) {
    footstepDust.forEach((puff) => {
      if (!puff.mesh.visible) return;
      puff.age += delta;
      const progress = puff.age / puff.duration;
      if (progress >= 1 || getReducedMotion()) {
        puff.mesh.visible = false;
        puff.material.opacity = 0;
        return;
      }
  
      puff.mesh.position
        .copy(puff.basePosition)
        .addScaledVector(puff.normal, Math.sin(progress * Math.PI) * 0.018);
      puff.mesh.scale.setScalar(THREE.MathUtils.lerp(0.72, 1.8, progress));
      puff.material.opacity = Math.pow(1 - progress, 1.4) * 0.3;
    });
  }
  
  function updateRiderTransform() {
    const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
    const surfaceLift = navigationSurfaceLiftAt(rider.theta, rider.phi);
    const position = sphericalPosition(
      rider.theta,
      rider.phi,
      PLANET_RADIUS + surfaceLift + 0.0025,
    );
    const tangentHeading = tempVector
      .copy(east)
      .multiplyScalar(Math.cos(rider.heading))
      .addScaledVector(north, Math.sin(rider.heading))
      .normalize();
    const modelSide = tempVector2.crossVectors(tangentHeading, normal).normalize();
    const matrix = new THREE.Matrix4().makeBasis(tangentHeading, normal, modelSide);
  
    riderMesh.position.copy(position);
    riderMesh.quaternion.setFromRotationMatrix(matrix);
  }
  
  function updateRiderAnimation(delta, elapsed) {
    rider.celebration = Math.max(0, rider.celebration - delta);
    const speedRatio = THREE.MathUtils.clamp(
      rider.actualSpeed / WALK_SPEED,
      0,
      RUN_SPEED / WALK_SPEED,
    );
    const measuredMotion = Math.min(1, speedRatio);
    const blockedTarget = rider.collisionActive
      ? THREE.MathUtils.clamp(
          (Math.abs(rider.speed) - rider.actualSpeed) / WALK_SPEED,
          0,
          1,
        )
      : 0;
    rider.motionBlend = THREE.MathUtils.damp(
      rider.motionBlend,
      measuredMotion,
      measuredMotion > rider.motionBlend ? 14 : 9,
      delta,
    );
    rider.blockedBlend = THREE.MathUtils.damp(
      rider.blockedBlend,
      blockedTarget,
      blockedTarget > rider.blockedBlend ? 16 : 10,
      delta,
    );
  
    const travelMotion = rider.motionBlend;
    const blockedMotion = rider.blockedBlend;
    const pivotMotion =
      THREE.MathUtils.clamp(Math.abs(rider.turn) * 0.68, 0, 0.68) *
      (1 - travelMotion * 0.45);
    const motion = Math.max(travelMotion, pivotMotion);
  
    if (blockedMotion > 0.28 && rider.inputActive) {
      rider.animationState = "blocked";
    } else if (travelMotion > 0.08) {
      rider.animationState = speedRatio > 1.12 ? "run" : "walk";
    } else if (pivotMotion > 0.08) {
      rider.animationState = "turn";
    } else {
      rider.animationState = "idle";
    }
  
    if (motion > 0.02) {
      rider.walkPhase +=
        (4.8 + speedRatio * 3 + pivotMotion * 1.5) * delta;
    }
  
    const footstepIndex = Math.floor(
      (rider.walkPhase + Math.PI * 0.5) / Math.PI,
    );
    if (
      gameState.started &&
      travelMotion > 0.34 &&
      footstepIndex !== rider.lastFootstep
    ) {
      spawnFootstepDust(footstepIndex % 2 === 0 ? -1 : 1);
      rider.lastFootstep = footstepIndex;
    }
  
    const phaseSin = Math.sin(rider.walkPhase);
    const phaseCos = Math.cos(rider.walkPhase);
    const stride = phaseSin * 0.52 * motion;
    const leftKneeBend = -Math.max(0, -phaseSin) * 0.82 * motion;
    const rightKneeBend = -Math.max(0, phaseSin) * 0.82 * motion;
    const armStride = -stride * 0.64;
    const animationDamping = motion > 0.02 ? 14 : 10;
    const {
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      visual,
      body,
      hips,
      bag,
      coatHem,
      headGroup,
      scarfTails,
      hairLocks,
      eyes,
      contactShadow,
    } = riderMesh.userData;
  
    const celebrationProgress =
      rider.celebration > 0
        ? 1 - rider.celebration / 0.85
        : 0;
    const celebrationHop =
      rider.celebration > 0 && !getReducedMotion()
        ? Math.sin(celebrationProgress * Math.PI) * 0.085
        : 0;
  
    leftLeg.hip.position.y = THREE.MathUtils.damp(
      leftLeg.hip.position.y,
      0.375 + Math.max(0, -phaseSin) * 0.01 * motion,
      animationDamping,
      delta,
    );
    rightLeg.hip.position.y = THREE.MathUtils.damp(
      rightLeg.hip.position.y,
      0.375 + Math.max(0, phaseSin) * 0.01 * motion,
      animationDamping,
      delta,
    );
    leftLeg.hip.rotation.z = THREE.MathUtils.damp(
      leftLeg.hip.rotation.z,
      stride,
      animationDamping,
      delta,
    );
    rightLeg.hip.rotation.z = THREE.MathUtils.damp(
      rightLeg.hip.rotation.z,
      -stride,
      animationDamping,
      delta,
    );
    leftLeg.knee.rotation.z = THREE.MathUtils.damp(
      leftLeg.knee.rotation.z,
      leftKneeBend,
      animationDamping,
      delta,
    );
    rightLeg.knee.rotation.z = THREE.MathUtils.damp(
      rightLeg.knee.rotation.z,
      rightKneeBend,
      animationDamping,
      delta,
    );
    leftLeg.foot.rotation.z = THREE.MathUtils.damp(
      leftLeg.foot.rotation.z,
      -stride * 0.62 - leftKneeBend * 0.58,
      animationDamping,
      delta,
    );
    rightLeg.foot.rotation.z = THREE.MathUtils.damp(
      rightLeg.foot.rotation.z,
      stride * 0.62 - rightKneeBend * 0.58,
      animationDamping,
      delta,
    );
    leftArm.shoulder.rotation.z = THREE.MathUtils.damp(
      leftArm.shoulder.rotation.z,
      armStride,
      animationDamping,
      delta,
    );
    rightArm.shoulder.rotation.z = THREE.MathUtils.damp(
      rightArm.shoulder.rotation.z,
      -armStride,
      animationDamping,
      delta,
    );
    leftArm.elbow.rotation.z = THREE.MathUtils.damp(
      leftArm.elbow.rotation.z,
      0.16 +
        travelMotion * 0.4 +
        blockedMotion * 0.16 +
        Math.max(0, phaseSin) * 0.28 * motion,
      animationDamping,
      delta,
    );
    rightArm.elbow.rotation.z = THREE.MathUtils.damp(
      rightArm.elbow.rotation.z,
      0.24 +
        travelMotion * 0.52 +
        blockedMotion * 0.14 +
        Math.max(0, -phaseSin) * 0.22 * motion,
      animationDamping,
      delta,
    );
  
    visual.position.y = THREE.MathUtils.damp(
      visual.position.y,
      RIDER_VISUAL_GROUND_OFFSET + celebrationHop,
      14,
      delta,
    );
    visual.position.z = THREE.MathUtils.damp(
      visual.position.z,
      phaseCos * 0.007 * motion,
      14,
      delta,
    );
    visual.rotation.x = THREE.MathUtils.damp(
      visual.rotation.x,
      -rider.turn * 0.035 * motion + phaseCos * 0.012 * motion,
      14,
      delta,
    );
    body.rotation.z = THREE.MathUtils.damp(
      body.rotation.z,
      -0.095 * travelMotion -
        0.07 * blockedMotion +
        Math.sin(elapsed * 1.4) * 0.012 * (1 - motion),
      11,
      delta,
    );
    body.rotation.x = THREE.MathUtils.damp(
      body.rotation.x,
      rider.turn * 0.07 * motion,
      12,
      delta,
    );
    body.rotation.y = THREE.MathUtils.damp(
      body.rotation.y,
      -phaseSin * 0.055 * motion,
      14,
      delta,
    );
    hips.rotation.x = THREE.MathUtils.damp(
      hips.rotation.x,
      -phaseCos * 0.04 * motion,
      14,
      delta,
    );
    hips.rotation.y = THREE.MathUtils.damp(
      hips.rotation.y,
      phaseSin * 0.07 * motion,
      14,
      delta,
    );
    bag.rotation.z = THREE.MathUtils.damp(
      bag.rotation.z,
      phaseSin * 0.07 * motion - rider.turn * 0.02 * motion,
      10,
      delta,
    );
    coatHem.rotation.y = THREE.MathUtils.damp(
      coatHem.rotation.y,
      -phaseSin * 0.065 * motion,
      12,
      delta,
    );
    coatHem.rotation.x = THREE.MathUtils.damp(
      coatHem.rotation.x,
      rider.turn * 0.04 * motion,
      10,
      delta,
    );
    headGroup.position.y = THREE.MathUtils.damp(
      headGroup.position.y,
      0.785 +
        Math.sin(rider.walkPhase * 2) * 0.003 * motion +
        Math.sin(elapsed * 1.7) * 0.002 * (1 - motion),
      12,
      delta,
    );
    headGroup.rotation.z = THREE.MathUtils.damp(
      headGroup.rotation.z,
      0.03 * motion -
        phaseCos * 0.012 * motion +
        Math.sin(elapsed * 1.3) * 0.018 * (1 - motion),
      11,
      delta,
    );
    headGroup.rotation.x = THREE.MathUtils.damp(
      headGroup.rotation.x,
      -rider.turn * 0.04 * motion +
        Math.sin(elapsed * 0.8) * 0.01 * (1 - motion),
      11,
      delta,
    );
    headGroup.rotation.y = THREE.MathUtils.damp(
      headGroup.rotation.y,
      phaseSin * 0.025 * motion,
      12,
      delta,
    );
    scarfTails.rotation.z = THREE.MathUtils.damp(
      scarfTails.rotation.z,
      -0.06 + phaseSin * 0.12 * motion,
      9,
      delta,
    );
    scarfTails.rotation.x = THREE.MathUtils.damp(
      scarfTails.rotation.x,
      rider.turn * 0.12 * motion + phaseCos * 0.045 * motion,
      9,
      delta,
    );
    scarfTails.rotation.y = THREE.MathUtils.damp(
      scarfTails.rotation.y,
      -phaseSin * 0.055 * motion,
      9,
      delta,
    );
  
    const shadowStride = Math.abs(phaseSin) * motion;
    contactShadow.scale.x = THREE.MathUtils.damp(
      contactShadow.scale.x,
      1.08 + shadowStride * 0.09 - celebrationHop * 1.4,
      12,
      delta,
    );
    contactShadow.scale.z = THREE.MathUtils.damp(
      contactShadow.scale.z,
      0.7 - shadowStride * 0.05 + celebrationHop * 0.7,
      12,
      delta,
    );
    contactShadow.material.opacity = THREE.MathUtils.damp(
      contactShadow.material.opacity,
      THREE.MathUtils.clamp(
        0.105 + travelMotion * 0.025 - celebrationHop * 0.45,
        0.045,
        0.15,
      ),
      10,
      delta,
    );
  
    hairLocks.forEach((lock, index) => {
      const strideSway =
        -phaseSin * (0.02 + (index % 3) * 0.005) * motion;
      const idleSway =
        Math.sin(elapsed * (1.05 + index * 0.07) + index * 0.8) *
        0.005 *
        (1 - motion);
      lock.rotation.z = THREE.MathUtils.damp(
        lock.rotation.z,
        lock.userData.restRotationZ + strideSway + idleSway,
        8,
        delta,
      );
    });
  
    const blinkPhase = (elapsed + 0.7) % 4.6;
    const eyeOpen =
      blinkPhase < 0.18
        ? THREE.MathUtils.clamp(Math.abs(blinkPhase - 0.09) / 0.09, 0.08, 1)
        : 1;
    eyes.forEach((eye) => {
      eye.eyeWhite.scale.y = THREE.MathUtils.damp(
        eye.eyeWhite.scale.y,
        eye.whiteScaleY * eyeOpen,
        34,
        delta,
      );
      eye.iris.scale.y = THREE.MathUtils.damp(
        eye.iris.scale.y,
        eye.irisScaleY * eyeOpen,
        34,
        delta,
      );
      eye.highlight.scale.y = THREE.MathUtils.damp(
        eye.highlight.scale.y,
        eye.highlightScaleY * eyeOpen,
        34,
        delta,
      );
    });
  }

  return {
    footstepDust,
    riderMesh,
    updateFootstepDust,
    updateRiderAnimation,
    updateRiderTransform,
  };
}
