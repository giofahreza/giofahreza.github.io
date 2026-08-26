import * as THREE from "three";
import {
  createGableRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../rendering/materials.js";

export function createLandmarkHelpers({
  animatedStopDetails,
  materials: {
    flowerMaterials,
    foliageMaterials,
    inkMaterial,
    letterMaterial,
    targetMaterial,
    trunkMaterial,
  },
}) {
  function addStopMotif(group, stop, roofMaterial) {
    const motifRoot = new THREE.Group();
    const motifPhase = stop.theta * 1.7 + stop.phi * 2.3;
  
    if (stop.motif === "fish") {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.013, 0.34, 7),
        inkMaterial,
      );
      pole.position.set(-0.16, 0.78, 0);
      motifRoot.add(pole);
  
      const vane = new THREE.Group();
      vane.position.set(-0.16, 0.91, 0);
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 7),
        roofMaterial,
      );
      body.scale.set(1.55, 0.62, 0.4);
      vane.add(body);
      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.11, 7),
        targetMaterial,
      );
      tail.position.x = -0.105;
      tail.rotation.z = -Math.PI * 0.5;
      vane.add(tail);
      motifRoot.add(vane);
      animatedStopDetails.push({
        object: vane,
        type: "vane",
        phase: motifPhase,
      });
    } else if (stop.motif === "flowers") {
      const box = new THREE.Mesh(
        roundedBox(0.25, 0.055, 0.08, 0.009),
        trunkMaterial,
      );
      box.position.set(-0.13, 0.225, 0.275);
      motifRoot.add(box);
      [-0.08, 0, 0.08].forEach((offset, index) => {
        const bloom = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 8, 6),
          flowerMaterials[index % flowerMaterials.length],
        );
        bloom.position.set(-0.13 + offset, 0.285, 0.28);
        motifRoot.add(bloom);
      });
    } else if (stop.motif === "bell") {
      [-0.07, 0.07].forEach((x) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.016, 0.25, 7),
          trunkMaterial,
        );
        post.position.set(x, 0.82, 0);
        motifRoot.add(post);
      });
      const cap = new THREE.Mesh(
        createGableRoofGeometry(0.24, 0.16, 0.09),
        roofMaterial,
      );
      cap.position.y = 0.94;
      motifRoot.add(cap);
      const bell = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.075, 10),
        targetMaterial,
      );
      bell.position.y = 0.82;
      motifRoot.add(bell);
      animatedStopDetails.push({
        object: bell,
        type: "bell",
        phase: motifPhase,
      });
    } else if (stop.motif === "banner") {
      const banner = new THREE.Group();
      banner.position.set(-0.2, 0.54, 0.3);
      const bracket = new THREE.Mesh(
        roundedBox(0.16, 0.018, 0.018, 0.004),
        inkMaterial,
      );
      bracket.position.x = 0.07;
      banner.add(bracket);
      const cloth = new THREE.Mesh(
        roundedBox(0.11, 0.17, 0.018, 0.007),
        roofMaterial,
      );
      cloth.position.set(0.13, -0.095, 0);
      banner.add(cloth);
      motifRoot.add(banner);
      animatedStopDetails.push({
        object: banner,
        type: "sway",
        phase: motifPhase,
      });
    } else if (stop.motif === "mill") {
      const wheel = new THREE.Group();
      wheel.position.set(-0.13, 0.73, 0.31);
      for (let index = 0; index < 4; index += 1) {
        const blade = new THREE.Mesh(
          roundedBox(0.035, 0.3, 0.018, 0.006),
          index % 2 === 0 ? roofMaterial : targetMaterial,
        );
        blade.position.y = 0.13;
        blade.rotation.z = index * Math.PI * 0.5;
        const bladePivot = new THREE.Group();
        bladePivot.rotation.z = index * Math.PI * 0.5;
        blade.rotation.z = 0;
        bladePivot.add(blade);
        wheel.add(bladePivot);
      }
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.035, 12),
        targetMaterial,
      );
      hub.rotation.x = Math.PI * 0.5;
      wheel.add(hub);
      motifRoot.add(wheel);
      animatedStopDetails.push({
        object: wheel,
        type: "spin",
        phase: motifPhase,
      });
    } else if (stop.motif === "buoy") {
      const buoy = new THREE.Group();
      buoy.position.set(-0.2, 0.38, 0.28);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.028, 0.34, 8),
        letterMaterial,
      );
      post.position.y = 0.1;
      buoy.add(post);
      [-0.01, 0.08].forEach((y) => {
        const stripe = new THREE.Mesh(
          new THREE.TorusGeometry(0.029, 0.012, 6, 14),
          targetMaterial,
        );
        stripe.position.y = y;
        stripe.rotation.x = Math.PI * 0.5;
        buoy.add(stripe);
      });
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 9, 7),
        roofMaterial,
      );
      top.position.y = 0.29;
      buoy.add(top);
      motifRoot.add(buoy);
      animatedStopDetails.push({
        object: buoy,
        type: "sway",
        phase: motifPhase,
      });
    }
  
    group.add(motifRoot);
  }
  
  const situbondoSignMaterials = new Map();
  
  function getSitubondoSignMaterial(
    text,
    color = "#f7f0d9",
    fontWeight = 900,
    options = {},
  ) {
    const {
      strokeColor = "rgba(31, 49, 47, 0.72)",
      strokeScale = 0.055,
      canvasWidth = 1024,
      canvasHeight = 256,
      maxFontSize = 150,
    } = options;
    const key = `${text}-${color}-${fontWeight}-${strokeColor}-${strokeScale}-${canvasWidth}-${canvasHeight}-${maxFontSize}`;
    if (situbondoSignMaterials.has(key)) {
      return situbondoSignMaterials.get(key);
    }
  
    const signCanvas = document.createElement("canvas");
    signCanvas.width = canvasWidth;
    signCanvas.height = canvasHeight;
    const context = signCanvas.getContext("2d");
    context.clearRect(0, 0, signCanvas.width, signCanvas.height);
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const fontFamily =
      text === "pendopo aryo situbondo"
        ? '"Arial Narrow", "Roboto Condensed", Arial, sans-serif'
        : "Arial, sans-serif";
    let fontSize = maxFontSize;
    do {
      context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      fontSize -= 4;
    } while (
      context.measureText(text).width > signCanvas.width * 0.9 &&
      fontSize > 44
    );
    context.lineWidth = strokeScale > 0 ? Math.max(1, fontSize * strokeScale) : 0;
    context.strokeStyle = strokeColor;
    if (strokeScale > 0) {
      context.strokeText(text, signCanvas.width * 0.5, signCanvas.height * 0.52);
    }
    context.fillText(text, signCanvas.width * 0.5, signCanvas.height * 0.52);
  
    const texture = new THREE.CanvasTexture(signCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = hideMaterialOutline(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    situbondoSignMaterials.set(key, material);
    return material;
  }
  
  function addSitubondoSign(
    group,
    text,
    width,
    height,
    position,
    {
      background = 0x314b48,
      color = "#f7f0d9",
      border = 0xe8dfc7,
      rotationY = 0,
      materialOptions = {},
    } = {},
  ) {
    const sign = new THREE.Group();
    sign.position.copy(position);
    sign.rotation.y = rotationY;
  
    const panel = new THREE.Mesh(
      roundedBox(width, height, 0.035, Math.min(0.018, height * 0.16)),
      toonMaterial({ color: background }),
    );
    sign.add(panel);
  
    const borderMesh = new THREE.Mesh(
      roundedBox(width + 0.035, height + 0.035, 0.018, 0.018),
      toonMaterial({ color: border }),
    );
    borderMesh.position.z = -0.018;
    sign.add(borderMesh);
  
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.92, height * 0.78),
      getSitubondoSignMaterial(text, color, 900, materialOptions),
    );
    label.position.z = 0.022;
    label.renderOrder = 4;
    sign.add(label);
    group.add(sign);
    return sign;
  }
  
  function createArchPanelGeometry(width, height) {
    const radius = width * 0.5;
    const straightHeight = Math.max(0.01, height - radius);
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0);
    shape.lineTo(-radius, straightHeight);
    shape.absarc(0, straightHeight, radius, Math.PI, 0, true);
    shape.lineTo(radius, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 18);
  }
  
  function addLocalPalm(group, x, z, scale = 1) {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    palm.rotation.z = x * 0.08;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.032, 0.52, 7),
      trunkMaterial,
    );
    trunk.position.y = 0.26;
    palm.add(trunk);
    for (let index = 0; index < 7; index += 1) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 5),
        foliageMaterials[index % foliageMaterials.length],
      );
      const angle = (index / 7) * Math.PI * 2;
      leaf.position.set(
        Math.cos(angle) * 0.08,
        0.54 + (index % 2) * 0.018,
        Math.sin(angle) * 0.08,
      );
      leaf.scale.set(1.45, 0.26, 0.45);
      leaf.rotation.y = -angle;
      leaf.rotation.z = Math.cos(angle) * 0.3;
      palm.add(leaf);
    }
    mergeDirectMeshesByMaterial(palm);
    palm.scale.setScalar(scale);
    group.add(palm);
    return palm;
  }
  
  function addIndonesianFlag(group, x, z, height = 0.78, options = {}) {
    const {
      panelWidth = 0.25,
      panelHeight = 0.075,
      poleMaterial = inkMaterial,
      gravitySag = 0.065,
      windScale = 1,
    } = options;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.012, height, 6),
      poleMaterial,
    );
    pole.position.set(x, height * 0.5, z);
    group.add(pole);
  
    const flag = new THREE.Group();
    flag.position.set(x + 0.012, height - 0.095, z);
    const segmentCount = 7;
    const flagPanels = [];
    const addFlagPanel = (color, y) => {
      const geometry = new THREE.PlaneGeometry(
        panelWidth,
        panelHeight,
        segmentCount,
        1,
      );
      geometry.translate(panelWidth * 0.5, 0, 0);
      const panel = new THREE.Mesh(
        geometry,
        toonMaterial({ color, side: THREE.DoubleSide }),
      );
      panel.position.y = y;
      panel.castShadow = true;
      flag.add(panel);
      flagPanels.push({
        geometry,
        basePositions: geometry.getAttribute("position").array.slice(),
        width: panelWidth,
      });
    };
    addFlagPanel(0xd84f45, panelHeight * 0.5);
    addFlagPanel(0xf4f0df, -panelHeight * 0.5);
    flag.userData.flagPanels = flagPanels;
    flag.userData.gravitySag = gravitySag;
    flag.userData.windScale = windScale;
    group.add(flag);
    return flag;
  }
  
  function addPendopoPennant(group, x, z, height = 2.25, options = {}) {
    const {
      clothWidth = 0.18,
      clothHeight = 0.96,
      lean = 0,
      rotationY = 0,
      poleMaterial = inkMaterial,
      windScale = 1,
    } = options;
    const pennantRoot = new THREE.Group();
    pennantRoot.position.set(x, 0, z);
    pennantRoot.rotation.set(0, rotationY, lean);
  
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.014, height, 7),
      poleMaterial,
    );
    pole.position.y = height * 0.5;
    pole.castShadow = true;
    pennantRoot.add(pole);
  
    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 6),
      poleMaterial,
    );
    finial.position.y = height;
    finial.castShadow = true;
    pennantRoot.add(finial);
  
    const cloth = new THREE.Group();
    cloth.position.set(0.008, height - 0.055, 0);
    cloth.userData.keepOverviewDynamic = true;
    const pennantPanels = [];
    const addPennantPanel = (color, topOffset, panelHeight) => {
      const rowCount = Math.max(3, Math.round((panelHeight / clothHeight) * 12));
      const geometry = new THREE.PlaneGeometry(clothWidth, panelHeight, 2, rowCount);
      geometry.translate(
        clothWidth * 0.5,
        -(topOffset + panelHeight * 0.5),
        0,
      );
      const positions = geometry.getAttribute("position");
      for (let index = 0; index < positions.count; index += 1) {
        const progress = THREE.MathUtils.clamp(
          -positions.getY(index) / clothHeight,
          0,
          1,
        );
        positions.setX(
          index,
          positions.getX(index) * THREE.MathUtils.lerp(1, 0.34, progress),
        );
      }
      geometry.computeVertexNormals();
      const panel = new THREE.Mesh(
        geometry,
        toonMaterial({ color, side: THREE.DoubleSide }),
      );
      panel.castShadow = true;
      cloth.add(panel);
      pennantPanels.push({
        geometry,
        basePositions: positions.array.slice(),
        height: clothHeight,
        width: clothWidth,
      });
    };
    const redHeight = clothHeight * 0.48;
    addPennantPanel(0xd84f45, 0, redHeight);
    addPennantPanel(0xf4f0df, redHeight, clothHeight - redHeight);
    cloth.userData.pennantPanels = pennantPanels;
    cloth.userData.windScale = windScale;
    pennantRoot.add(cloth);
    group.add(pennantRoot);
    return cloth;
  }
  
  function addPendopoCeremonialCanopy(group, width, depth, height) {
    const canopy = new THREE.Group();
    canopy.position.y = height;
    canopy.userData.keepOverviewDynamic = true;
    const red = toonMaterial({ color: 0xd83f35, side: THREE.DoubleSide });
    const white = toonMaterial({ color: 0xf6f0e3, side: THREE.DoubleSide });
    const halfWidth = width * 0.5;
    const halfDepth = depth * 0.5;
    const perimeter = [];
  
    const addPerimeterSide = (start, end, segments) => {
      for (let index = 0; index < segments; index += 1) {
        perimeter.push(start.clone().lerp(end, index / segments));
      }
    };
    addPerimeterSide(
      new THREE.Vector3(-halfWidth, 0, halfDepth),
      new THREE.Vector3(halfWidth, 0, halfDepth),
      8,
    );
    addPerimeterSide(
      new THREE.Vector3(halfWidth, 0, halfDepth),
      new THREE.Vector3(halfWidth, 0, -halfDepth),
      2,
    );
    addPerimeterSide(
      new THREE.Vector3(halfWidth, 0, -halfDepth),
      new THREE.Vector3(-halfWidth, 0, -halfDepth),
      8,
    );
    addPerimeterSide(
      new THREE.Vector3(-halfWidth, 0, -halfDepth),
      new THREE.Vector3(-halfWidth, 0, halfDepth),
      2,
    );
  
    const createFabricBucket = () => ({
      positions: [],
      indices: [],
      movementWeights: [],
      vertexPhases: [],
    });
    const addGridIndices = (bucket, firstVertex, rowSegments, columnSegments) => {
      const rowWidth = columnSegments + 1;
      for (let rowIndex = 0; rowIndex < rowSegments; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < columnSegments; columnIndex += 1) {
          const topLeft = firstVertex + rowIndex * rowWidth + columnIndex;
          const bottomLeft = topLeft + rowWidth;
          bucket.indices.push(
            topLeft,
            bottomLeft,
            topLeft + 1,
            bottomLeft,
            bottomLeft + 1,
            topLeft + 1,
          );
        }
      }
    };
    const baseBucket = createFabricBucket();
    const radialBuckets = [createFabricBucket(), createFabricBucket()];
    const fasciaBucket = createFabricBucket();
    const valanceBucket = createFabricBucket();
    const fanBuckets = [createFabricBucket(), createFabricBucket()];
    const fanCenters = [];
    const openingDrapeBucket = createFabricBucket();
    const tailBuckets = [createFabricBucket(), createFabricBucket()];
    const baseRadialSegments = 8;
    const baseAcrossSegments = 2;
    const drapeRadialSegments = 9;
    const drapeAcrossSegments = 6;
  
    perimeter.forEach((point, panelIndex) => {
      const nextPoint = perimeter[(panelIndex + 1) % perimeter.length];
      const baseFirstVertex = baseBucket.positions.length / 3;
  
      for (
        let radialIndex = 0;
        radialIndex <= baseRadialSegments;
        radialIndex += 1
      ) {
        const radialProgress = radialIndex / baseRadialSegments;
        const rowStart = point.clone().multiplyScalar(radialProgress);
        const rowEnd = nextPoint.clone().multiplyScalar(radialProgress);
        const anchorDrop = THREE.MathUtils.lerp(0.024, 0.012, radialProgress);
        const radialDrape = Math.sin(radialProgress * Math.PI) * 0.032;
  
        for (
          let acrossIndex = 0;
          acrossIndex <= baseAcrossSegments;
          acrossIndex += 1
        ) {
          const acrossProgress = acrossIndex / baseAcrossSegments;
          const position = rowStart.clone().lerp(rowEnd, acrossProgress);
          const crossDrape =
            Math.sin(acrossProgress * Math.PI) *
            Math.sin(radialProgress * Math.PI) *
            0.004;
          baseBucket.positions.push(
            position.x,
            -anchorDrop - radialDrape - crossDrape,
            position.z,
          );
          baseBucket.movementWeights.push(0);
          baseBucket.vertexPhases.push(
            panelIndex * 0.31 + acrossProgress * 0.22 + radialProgress * 0.44,
          );
        }
      }
      addGridIndices(
        baseBucket,
        baseFirstVertex,
        baseRadialSegments,
        baseAcrossSegments,
      );
  
      const radialBucket = radialBuckets[panelIndex % 2];
      const isWhiteDrape = panelIndex % 2 === 1;
      const radialFirstVertex = radialBucket.positions.length / 3;
      const edgeInset = isWhiteDrape ? 0.09 : 0.16;
      const insetStart = point.clone().lerp(nextPoint, edgeInset);
      const insetEnd = point.clone().lerp(nextPoint, 1 - edgeInset);
  
      for (
        let radialIndex = 0;
        radialIndex <= drapeRadialSegments;
        radialIndex += 1
      ) {
        const radialProgress = radialIndex / drapeRadialSegments;
        const spread = THREE.MathUtils.lerp(
          0.018,
          1,
          THREE.MathUtils.smoothstep(radialProgress, 0, 1),
        );
        const rowStart = insetStart.clone().multiplyScalar(spread);
        const rowEnd = insetEnd.clone().multiplyScalar(spread);
        const anchoredDrop = THREE.MathUtils.lerp(0.026, 0.015, radialProgress);
        const baseDrape = Math.sin(radialProgress * Math.PI) * 0.032;
        const gatheredDrape =
          Math.sin(radialProgress * Math.PI) *
          (isWhiteDrape ? 0.095 : 0.052);
  
        for (
          let acrossIndex = 0;
          acrossIndex <= drapeAcrossSegments;
          acrossIndex += 1
        ) {
          const acrossProgress = acrossIndex / drapeAcrossSegments;
          const position = rowStart.clone().lerp(rowEnd, acrossProgress);
          const pleat =
            Math.sin(acrossProgress * Math.PI * 6 + panelIndex * 0.41) *
            Math.sin(radialProgress * Math.PI) *
            (isWhiteDrape ? 0.0085 : 0.0065);
          radialBucket.positions.push(
            position.x,
            -anchoredDrop - baseDrape - gatheredDrape - 0.008 - pleat,
            position.z,
          );
          radialBucket.movementWeights.push(
            Math.sin(radialProgress * Math.PI) ** 2 *
              (0.55 + Math.sin(acrossProgress * Math.PI) * 0.45),
          );
          radialBucket.vertexPhases.push(
            panelIndex * 0.37 + acrossProgress * 0.28 + radialProgress * 0.52,
          );
        }
      }
      addGridIndices(
        radialBucket,
        radialFirstVertex,
        drapeRadialSegments,
        drapeAcrossSegments,
      );
  
      const edgeDirection = nextPoint.clone().sub(point);
      const outward = new THREE.Vector3(
        -edgeDirection.z,
        0,
        edgeDirection.x,
      ).normalize();
      const fasciaFirstVertex = fasciaBucket.positions.length / 3;
      const fasciaSegments = 4;
      for (let index = 0; index <= fasciaSegments; index += 1) {
        const progress = index / fasciaSegments;
        const position = point
          .clone()
          .lerp(nextPoint, progress)
          .addScaledVector(outward, 0.004);
        const lowerDrop = 0.084 + Math.sin(progress * Math.PI) * 0.006;
        fasciaBucket.positions.push(position.x, -0.018, position.z);
        fasciaBucket.movementWeights.push(0);
        fasciaBucket.vertexPhases.push(panelIndex * 0.29 + progress * 0.18);
        fasciaBucket.positions.push(position.x, -lowerDrop, position.z);
        fasciaBucket.movementWeights.push(0);
        fasciaBucket.vertexPhases.push(panelIndex * 0.29 + progress * 0.18);
      }
      addGridIndices(fasciaBucket, fasciaFirstVertex, fasciaSegments, 1);
  
      const valanceFirstVertex = valanceBucket.positions.length / 3;
      const valanceSegments = 6;
      for (let index = 0; index <= valanceSegments; index += 1) {
        const progress = index / valanceSegments;
        const position = point
          .clone()
          .lerp(nextPoint, progress)
          .addScaledVector(outward, 0.009);
        const swagWeight = Math.sin(progress * Math.PI);
        const topDrop = 0.078 + swagWeight * 0.006;
        const lowerDrop = 0.094 + swagWeight ** 1.1 * 0.14;
        valanceBucket.positions.push(position.x, -topDrop, position.z);
        valanceBucket.movementWeights.push(0);
        valanceBucket.vertexPhases.push(panelIndex * 0.31 + progress * 0.2);
        valanceBucket.positions.push(position.x, -lowerDrop, position.z);
        valanceBucket.movementWeights.push(swagWeight ** 1.35);
        valanceBucket.vertexPhases.push(panelIndex * 0.31 + progress * 0.2);
      }
      addGridIndices(valanceBucket, valanceFirstVertex, valanceSegments, 1);
  
      const fanCenter = point
        .clone()
        .lerp(nextPoint, 0.5)
        .addScaledVector(outward, 0.014);
      const tangent = edgeDirection.clone().normalize();
      const fanSegments = 8;
      const fanRadius = edgeDirection.length() * 0.23;
      const fanDrop = Math.min(0.112, edgeDirection.length() * 0.15);
      const fanTopDrop = 0.086;
      for (let wedgeIndex = 0; wedgeIndex < fanSegments; wedgeIndex += 1) {
        const startProgress = wedgeIndex / fanSegments;
        const endProgress = (wedgeIndex + 1) / fanSegments;
        const startAngle = Math.PI + startProgress * Math.PI;
        const endAngle = Math.PI + endProgress * Math.PI;
        const bucket = fanBuckets[wedgeIndex % 2];
        const firstVertex = bucket.positions.length / 3;
        bucket.positions.push(fanCenter.x, -fanTopDrop, fanCenter.z);
        bucket.movementWeights.push(0);
        bucket.vertexPhases.push(panelIndex * 0.34 + 0.31);
        const addFanVertex = (angle, progress) => {
          const lowerWeight = Math.sin(progress * Math.PI) ** 1.5;
          const position = fanCenter
            .clone()
            .addScaledVector(tangent, Math.cos(angle) * fanRadius)
            .addScaledVector(outward, lowerWeight * 0.006);
          bucket.positions.push(
            position.x,
            -fanTopDrop + Math.sin(angle) * fanDrop,
            position.z,
          );
          bucket.movementWeights.push(lowerWeight);
          bucket.vertexPhases.push(
            panelIndex * 0.34 + progress * 0.62,
          );
        };
        addFanVertex(startAngle, startProgress);
        addFanVertex(endAngle, endProgress);
        bucket.indices.push(firstVertex, firstVertex + 1, firstVertex + 2);
      }
      fanCenters.push({ position: fanCenter, outward });
    });
  
    const openingDrapeZ = halfDepth + 0.018;
    [-1, 1].forEach((direction, sideIndex) => {
      const firstVertex = openingDrapeBucket.positions.length / 3;
      const lengthSegments = 12;
      const dropSegments = 3;
      const sideAnchorX = direction * Math.min(halfWidth * 0.5, 1.52);
  
      for (let lengthIndex = 0; lengthIndex <= lengthSegments; lengthIndex += 1) {
        const progress = lengthIndex / lengthSegments;
        const swagWeight = Math.sin(progress * Math.PI);
        const x = THREE.MathUtils.lerp(direction * 0.035, sideAnchorX, progress);
        const topDrop = THREE.MathUtils.lerp(0.086, 0.112, progress) + swagWeight * 0.02;
        const lowerDrop =
          THREE.MathUtils.lerp(0.15, 0.132, progress) + swagWeight ** 1.05 * 0.255;
  
        for (let dropIndex = 0; dropIndex <= dropSegments; dropIndex += 1) {
          const dropProgress = dropIndex / dropSegments;
          const easedDrop = THREE.MathUtils.smoothstep(dropProgress, 0, 1);
          const pleat =
            Math.sin(progress * Math.PI * 6 + dropProgress * 1.1 + sideIndex * 0.6) *
            swagWeight *
            dropProgress *
            0.008;
          openingDrapeBucket.positions.push(
            x,
            -THREE.MathUtils.lerp(topDrop, lowerDrop, easedDrop) + pleat,
            openingDrapeZ + pleat * 0.9,
          );
          openingDrapeBucket.movementWeights.push(
            swagWeight ** 1.35 * THREE.MathUtils.lerp(0.22, 1, dropProgress),
          );
          openingDrapeBucket.vertexPhases.push(
            sideIndex * 1.3 + progress * 0.72 + dropProgress * 0.31,
          );
        }
      }
      addGridIndices(
        openingDrapeBucket,
        firstVertex,
        lengthSegments,
        dropSegments,
      );
    });
  
    const addCenterTail = (angle, length, tailWidth, isWhiteTail, phaseOffset) => {
      const bucket = tailBuckets[isWhiteTail ? 1 : 0];
      const firstVertex = bucket.positions.length / 3;
      const tailSegments = 7;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      for (let index = 0; index <= tailSegments; index += 1) {
        const progress = index / tailSegments;
        const distance = 0.075 + length * progress;
        const sideCurve = Math.sin(progress * Math.PI) * 0.026 * phaseOffset;
        const center = direction
          .clone()
          .multiplyScalar(distance)
          .addScaledVector(side, sideCurve);
        const halfTailWidth =
          tailWidth * THREE.MathUtils.lerp(0.52, 0.24, progress);
        const drop =
          0.043 +
          Math.sin(progress * Math.PI * 0.78) * 0.026 +
          progress ** 1.65 * 0.052;
        const left = center.clone().addScaledVector(side, halfTailWidth);
        const right = center.clone().addScaledVector(side, -halfTailWidth);
        bucket.positions.push(left.x, -drop, left.z, right.x, -drop - 0.003, right.z);
        const movementWeight = progress ** 1.7;
        bucket.movementWeights.push(movementWeight, movementWeight);
        const vertexPhase = angle * 0.7 + progress * 0.54;
        bucket.vertexPhases.push(vertexPhase, vertexPhase + 0.11);
      }
      addGridIndices(bucket, firstVertex, tailSegments, 1);
    };
    addCenterTail(-0.1, 0.72, 0.13, false, 0.7);
    addCenterTail(0.58, 0.82, 0.14, true, -0.55);
    addCenterTail(1.42, 0.68, 0.12, false, 0.5);
    addCenterTail(2.25, 0.78, 0.14, true, -0.65);
    addCenterTail(3.05, 0.7, 0.13, false, 0.6);
    addCenterTail(4.3, 0.76, 0.12, false, -0.55);
  
    const fabricPieces = [];
    const addFabricBucket = (bucket, material, motionScale) => {
      if (bucket.positions.length === 0) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(bucket.positions, 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      geometry.setIndex(bucket.indices);
      geometry.computeVertexNormals();
      const fabric = new THREE.Mesh(geometry, material);
      fabric.castShadow = true;
      fabric.receiveShadow = true;
      canopy.add(fabric);
      if (motionScale > 0) {
        fabricPieces.push({
          geometry,
          basePositions: geometry.getAttribute("position").array.slice(),
          movementWeights: Float32Array.from(bucket.movementWeights),
          vertexPhases: Float32Array.from(bucket.vertexPhases),
          motionScale,
        });
      }
    };
    addFabricBucket(baseBucket, red, 0);
    addFabricBucket(radialBuckets[0], red, 0.14);
    addFabricBucket(radialBuckets[1], white, 0.34);
    addFabricBucket(fasciaBucket, red, 0);
    addFabricBucket(valanceBucket, white, 0.72);
    addFabricBucket(fanBuckets[0], red, 0.24);
    addFabricBucket(fanBuckets[1], white, 0.2);
    addFabricBucket(openingDrapeBucket, white, 0.88);
    addFabricBucket(tailBuckets[0], red, 0.58);
    addFabricBucket(tailBuckets[1], white, 0.5);
  
    const knotGeometry = new THREE.SphereGeometry(0.038, 8, 6);
    const redKnots = new THREE.InstancedMesh(knotGeometry, red, perimeter.length);
    const whiteKnots = new THREE.InstancedMesh(knotGeometry, white, perimeter.length);
    const knotTransform = new THREE.Object3D();
    perimeter.forEach((point, index) => {
      const direction = point.clone().normalize();
      knotTransform.position.copy(point).addScaledVector(direction, 0.012);
      knotTransform.position.y = -0.084;
      knotTransform.rotation.set(0, Math.atan2(direction.z, direction.x), 0);
      knotTransform.scale.set(1.45, 0.42, 0.88);
      knotTransform.updateMatrix();
      redKnots.setMatrixAt(index, knotTransform.matrix);
      knotTransform.position.addScaledVector(direction, 0.008);
      knotTransform.position.y -= 0.008;
      knotTransform.rotation.y += Math.PI * 0.5;
      knotTransform.scale.set(0.92, 0.34, 0.58);
      knotTransform.updateMatrix();
      whiteKnots.setMatrixAt(index, knotTransform.matrix);
    });
    redKnots.instanceMatrix.needsUpdate = true;
    whiteKnots.instanceMatrix.needsUpdate = true;
    redKnots.castShadow = true;
    whiteKnots.castShadow = true;
    canopy.add(redKnots, whiteKnots);
  
    const fanKnots = new THREE.InstancedMesh(knotGeometry, red, fanCenters.length);
    fanCenters.forEach(({ position, outward }, index) => {
      knotTransform.position.copy(position);
      knotTransform.position.y = -0.084;
      knotTransform.rotation.set(0, Math.atan2(outward.x, outward.z), 0);
      knotTransform.scale.set(0.72, 0.28, 0.4);
      knotTransform.updateMatrix();
      fanKnots.setMatrixAt(index, knotTransform.matrix);
    });
    fanKnots.instanceMatrix.needsUpdate = true;
    fanKnots.castShadow = true;
    canopy.add(fanKnots);
  
    const openingKnot = new THREE.Group();
    openingKnot.position.set(0, -0.103, openingDrapeZ + 0.012);
    const openingKnotCore = new THREE.Mesh(knotGeometry, red);
    openingKnotCore.scale.set(1.65, 0.5, 0.9);
    openingKnotCore.castShadow = true;
    openingKnot.add(openingKnotCore);
    [-1, 1].forEach((direction) => {
      const petal = new THREE.Mesh(knotGeometry, white);
      petal.position.x = direction * 0.045;
      petal.rotation.z = direction * 0.42;
      petal.scale.set(1.1, 0.28, 0.62);
      petal.castShadow = true;
      openingKnot.add(petal);
    });
    canopy.add(openingKnot);
  
    const rosette = new THREE.Group();
    rosette.position.y = -0.038;
    const rosetteCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.084, 10, 7),
      red,
    );
    rosetteCore.scale.y = 0.38;
    rosette.add(rosetteCore);
    const petalGeometry = new THREE.SphereGeometry(0.065, 8, 6);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const petal = new THREE.Mesh(
        petalGeometry,
        index % 3 === 1 ? white : red,
      );
      petal.position.set(Math.cos(angle) * 0.075, -0.004, Math.sin(angle) * 0.075);
      petal.rotation.y = -angle;
      petal.scale.set(1.55, 0.2, 0.55);
      petal.castShadow = true;
      rosette.add(petal);
    }
    canopy.add(rosette);
    canopy.userData.fabricPieces = fabricPieces;
    group.add(canopy);
    return canopy;
  }
  
  function createPendopoLeafReliefGeometry() {
    const leaf = new THREE.Shape();
    leaf.moveTo(0, -0.5);
    leaf.bezierCurveTo(0.38, -0.34, 0.48, 0.18, 0, 0.5);
    leaf.bezierCurveTo(-0.48, 0.18, -0.38, -0.34, 0, -0.5);
    leaf.closePath();
    return new THREE.ShapeGeometry(leaf, 8);
  }
  
  const pendopoLeafReliefGeometry = createPendopoLeafReliefGeometry();
  
  function addPendopoTimberColumn(group, x, z, materials, options = {}) {
    const {
      floorY = 0.22,
      shaftHeight = 0.9,
      width = 0.18,
      heavy = false,
      detailProfile = "standard",
    } = options;
    const matchesGoogle360 = detailProfile === "google360";
    const plinthWidth =
      width *
      (matchesGoogle360
        ? heavy
          ? 1.7
          : 1.55
        : heavy
          ? 2.05
          : 1.65);
    const plinthHeight = matchesGoogle360
      ? heavy
        ? 0.27
        : 0.205
      : heavy
        ? 0.27
        : 0.19;
    const shaftBottom =
      floorY + plinthHeight * (matchesGoogle360 ? 0.82 : 0.74);
    const shaftCenter = shaftBottom + shaftHeight * 0.5;
    const shaftTop = shaftBottom + shaftHeight;
  
    const plinth = new THREE.Mesh(
      roundedBox(plinthWidth, plinthHeight, plinthWidth, 0.018),
      materials.base,
    );
    plinth.position.set(x, floorY + plinthHeight * 0.5, z);
    group.add(plinth);
  
    const panelWidth = plinthWidth * (matchesGoogle360 ? 0.38 : 0.58);
    const panelHeight = plinthHeight * (matchesGoogle360 ? 0.8 : 0.58);
    [
      [0, 0, plinthWidth * 0.5 + 0.008],
      [0, Math.PI, -plinthWidth * 0.5 - 0.008],
      [-plinthWidth * 0.5 - 0.008, -Math.PI * 0.5, 0],
      [plinthWidth * 0.5 + 0.008, Math.PI * 0.5, 0],
    ].forEach(([offsetX, rotationY, offsetZ]) => {
      const frame = new THREE.Mesh(
        roundedBox(panelWidth, panelHeight, 0.02, 0.004),
        materials.trim,
      );
      frame.position.set(x + offsetX, floorY + plinthHeight * 0.5, z + offsetZ);
      frame.rotation.y = rotationY;
      group.add(frame);
      const inset = new THREE.Mesh(
        roundedBox(panelWidth * 0.76, panelHeight * 0.7, 0.012, 0.003),
        materials.panel,
      );
      inset.position.copy(frame.position);
      inset.rotation.copy(frame.rotation);
      inset.translateZ(0.013);
      group.add(inset);
    });
  
    if (matchesGoogle360) {
      const capTrim = new THREE.Mesh(
        roundedBox(plinthWidth * 1.015, 0.024, plinthWidth * 1.015, 0.006),
        materials.trim,
      );
      capTrim.position.set(x, floorY + plinthHeight - 0.004, z);
      group.add(capTrim);
      const cap = new THREE.Mesh(
        roundedBox(plinthWidth * 1.1, 0.034, plinthWidth * 1.1, 0.008),
        materials.base,
      );
      cap.position.set(x, floorY + plinthHeight + 0.013, z);
      group.add(cap);
    }
  
    const shaft = new THREE.Mesh(
      roundedBox(width, shaftHeight, width, 0.014),
      materials.wood,
    );
    shaft.position.set(x, shaftCenter, z);
    group.add(shaft);
  
    const addFacePiece = (
      centerY,
      faceRotationY,
      faceOffset,
      offsetX,
      pieceWidth,
      pieceHeight,
      pieceDepth,
      material,
      rotationZ = 0,
    ) => {
      const piece = new THREE.Mesh(
        roundedBox(pieceWidth, pieceHeight, pieceDepth, 0.003, 2),
        material,
      );
      const cosine = Math.cos(faceRotationY);
      const sine = Math.sin(faceRotationY);
      piece.position.set(
        x + cosine * offsetX + sine * faceOffset,
        centerY,
        z - sine * offsetX + cosine * faceOffset,
      );
      piece.rotation.set(0, faceRotationY, rotationZ);
      group.add(piece);
    };
    const addFaceLeaf = (
      centerY,
      faceRotationY,
      faceOffset,
      offsetX,
      offsetY,
      leafWidth,
      leafHeight,
      material,
      rotationZ = 0,
    ) => {
      const leaf = new THREE.Mesh(pendopoLeafReliefGeometry, material);
      const cosine = Math.cos(faceRotationY);
      const sine = Math.sin(faceRotationY);
      leaf.position.set(
        x + cosine * offsetX + sine * faceOffset,
        centerY + offsetY,
        z - sine * offsetX + cosine * faceOffset,
      );
      leaf.rotation.set(0, faceRotationY, rotationZ);
      leaf.scale.set(leafWidth, leafHeight, 1);
      group.add(leaf);
    };
  
    if (matchesGoogle360 && materials.woodGrain) {
      const lineHeight = shaftHeight * 0.92;
      const lineOffset = width * 0.23;
      [0, Math.PI, Math.PI * 0.5, -Math.PI * 0.5].forEach(
        (faceRotationY) => {
          [-lineOffset, lineOffset].forEach((offsetX) => {
            addFacePiece(
              shaftCenter,
              faceRotationY,
              width * 0.5 + 0.0025,
              offsetX,
              0.004,
              lineHeight,
              0.003,
              materials.woodGrain,
            );
          });
        },
      );
    }
  
    const cuffSpecs = matchesGoogle360
      ? heavy
        ? [
            [shaftBottom + 0.135, 0.245, 1.46, true],
            [shaftBottom + shaftHeight * 0.54, 0.105, 1.29, false],
            [shaftTop - 0.04, 0.08, 1.32, false],
          ]
        : [
            [shaftBottom + 0.075, 0.14, 1.4, true],
            [shaftBottom + shaftHeight * 0.55, 0.07, 1.24, false],
            [shaftTop - 0.035, 0.07, 1.28, false],
          ]
      : heavy
        ? [
            [shaftBottom + 0.14, 0.27, 1.62, false],
            [shaftBottom + shaftHeight * 0.57, 0.105, 1.42, false],
            [shaftTop - 0.055, 0.11, 1.46, false],
          ]
        : [
            [shaftBottom + 0.08, 0.12, 1.5, false],
            [shaftBottom + shaftHeight * 0.54, 0.075, 1.34, false],
            [shaftTop - 0.045, 0.09, 1.4, false],
          ];
    cuffSpecs.forEach(([centerY, cuffHeight, widthScale, detailed]) => {
      if (!matchesGoogle360) {
        const cuff = new THREE.Mesh(
          roundedBox(width * widthScale, cuffHeight, width * widthScale, 0.012),
          materials.carving,
        );
        cuff.position.set(x, centerY, z);
        group.add(cuff);
        return;
      }
  
      const sleeveWidth = width * widthScale;
      const faceWidth = sleeveWidth * 0.93;
      const faceOffset = sleeveWidth * 0.5 + 0.004;
      const railThickness = Math.min(cuffHeight * 0.16, width * 0.12);
      const carvingAccent = materials.carvingAccent ?? materials.carving;
      [0, Math.PI, Math.PI * 0.5, -Math.PI * 0.5].forEach(
        (faceRotationY) => {
          addFacePiece(
            centerY,
            faceRotationY,
            faceOffset - 0.006,
            0,
            faceWidth * 0.86,
            cuffHeight * 0.78,
            0.012,
            materials.carvingRecess ?? materials.carving,
          );
          [-1, 1].forEach((direction) => {
            addFacePiece(
              centerY + direction * (cuffHeight * 0.5 - railThickness * 0.5),
              faceRotationY,
              faceOffset,
              0,
              faceWidth,
              railThickness,
              0.022,
              materials.carving,
            );
            addFacePiece(
              centerY,
              faceRotationY,
              faceOffset,
              direction * (faceWidth * 0.5 - railThickness * 0.5),
              railThickness,
              cuffHeight,
              0.022,
              materials.carving,
            );
          });
  
          const reliefOffset = faceOffset + 0.014;
          const leafWidth = faceWidth * (detailed ? 0.16 : 0.15);
          const leafHeight = cuffHeight * (detailed ? 0.27 : 0.3);
          addFacePiece(
            centerY,
            faceRotationY,
            reliefOffset - 0.002,
            0,
            railThickness * 0.34,
            cuffHeight * (detailed ? 0.48 : 0.3),
            0.01,
            carvingAccent,
          );
          const leafSpecs = detailed
            ? [
                [0, 0.27, 0, 0.88],
                [0, -0.27, Math.PI, 0.88],
                [-0.2, 0.15, 0.78, 1],
                [0.2, 0.15, -0.78, 1],
                [-0.23, -0.08, 1.92, 0.96],
                [0.23, -0.08, -1.92, 0.96],
                [-0.2, -0.24, 2.32, 0.82],
                [0.2, -0.24, -2.32, 0.82],
              ]
            : [
                [0, 0.22, 0, 0.82],
                [0, -0.22, Math.PI, 0.82],
                [-0.2, 0, Math.PI * 0.5, 0.88],
                [0.2, 0, -Math.PI * 0.5, 0.88],
              ];
          leafSpecs.forEach(
            ([horizontalOffset, verticalOffset, rotationZ, scale]) => {
              addFaceLeaf(
                centerY,
                faceRotationY,
                reliefOffset,
                horizontalOffset * faceWidth,
                verticalOffset * cuffHeight,
                leafWidth * scale,
                leafHeight * scale,
                carvingAccent,
                rotationZ,
              );
            },
          );
          const rosette = new THREE.Mesh(
            new THREE.SphereGeometry(railThickness * (detailed ? 0.74 : 0.64), 7, 5),
            carvingAccent,
          );
          const cosine = Math.cos(faceRotationY);
          const sine = Math.sin(faceRotationY);
          rosette.position.set(
            x + sine * (faceOffset + 0.022),
            centerY,
            z + cosine * (faceOffset + 0.022),
          );
          rosette.rotation.y = faceRotationY;
          rosette.scale.z = 0.32;
          group.add(rosette);
        },
      );
    });
  
    const capital = new THREE.Mesh(
      roundedBox(
        width *
          (matchesGoogle360
            ? heavy
              ? 1.38
              : 1.32
            : heavy
              ? 1.55
              : 1.42),
        matchesGoogle360 ? 0.078 : 0.105,
        width *
          (matchesGoogle360
            ? heavy
              ? 1.38
              : 1.32
            : heavy
              ? 1.55
              : 1.42),
        0.018,
      ),
      materials.carving,
    );
    capital.position.set(x, shaftTop + (matchesGoogle360 ? 0.023 : 0.035), z);
    group.add(capital);
  
    return {
      floorY,
      shaftBottom,
      shaftTop,
      shaftHeight,
      width,
      plinthWidth,
      plinthHeight,
    };
  }
  
  function addPendopoSimpleColumn(group, x, z, materials, options = {}) {
    const {
      floorY = 0.22,
      shaftHeight = 0.9,
      width = 0.12,
      heavy = false,
    } = options;
    const plinthWidth = width * (heavy ? 1.55 : 1.65);
    const plinthHeight = heavy ? 0.18 : 0.14;
    const shaftBottom = floorY + plinthHeight * 0.76;
    const shaftTop = shaftBottom + shaftHeight;
  
    const plinth = new THREE.Mesh(
      roundedBox(plinthWidth, plinthHeight, plinthWidth, 0.015),
      materials.base,
    );
    plinth.position.set(x, floorY + plinthHeight * 0.5, z);
    group.add(plinth);
  
    const shaft = new THREE.Mesh(
      roundedBox(width, shaftHeight, width, 0.012),
      materials.shaft,
    );
    shaft.position.set(x, shaftBottom + shaftHeight * 0.5, z);
    group.add(shaft);
  
    const capital = new THREE.Mesh(
      roundedBox(
        width * (heavy ? 1.42 : 1.3),
        heavy ? 0.075 : 0.06,
        width * (heavy ? 1.42 : 1.3),
        0.014,
      ),
      materials.trim,
    );
    capital.position.set(x, shaftTop + (heavy ? 0.025 : 0.018), z);
    group.add(capital);
    const abacus = new THREE.Mesh(
      roundedBox(
        width * (heavy ? 1.62 : 1.42),
        heavy ? 0.045 : 0.036,
        width * (heavy ? 1.62 : 1.42),
        0.012,
      ),
      materials.trim,
    );
    abacus.position.set(x, shaftTop + (heavy ? 0.085 : 0.068), z);
    group.add(abacus);
  
    return {
      floorY,
      shaftBottom,
      shaftTop,
      shaftHeight,
      width,
      plinthWidth,
      plinthHeight,
    };
  }
  
  function addPendopoColumnSash(
    group,
    x,
    z,
    columnDimensions,
    materials,
    options = {},
  ) {
    const { facingZ = z >= 0 ? -1 : 1 } = options;
    const sash = new THREE.Group();
    sash.position.set(x, 0, z);
    sash.userData.keepOverviewDynamic = true;
    const { shaftBottom, shaftTop, width } = columnDimensions;
    const tieY = THREE.MathUtils.lerp(shaftBottom, shaftTop, 0.62);
    const faceRotationY = facingZ < 0 ? Math.PI : 0;
    const faceOffset = facingZ * (width * 0.7 + 0.012);
  
    const addFrontBand = (
      material,
      centerY,
      bandHeight,
      rotationZ,
      offsetX = 0,
      widthScale = 1.18,
    ) => {
      const band = new THREE.Mesh(
        roundedBox(width * widthScale, bandHeight, 0.014, 0.003, 2),
        material,
      );
      band.position.set(offsetX, centerY, faceOffset);
      band.rotation.set(0, faceRotationY, rotationZ);
      sash.add(band);
    };
  
    const upperDropHeight = shaftTop - tieY - 0.035;
    const upperDrop = new THREE.Mesh(
      roundedBox(width * 0.34, upperDropHeight, 0.013, 0.003, 2),
      materials.red,
    );
    upperDrop.position.set(
      -width * 0.31,
      tieY + upperDropHeight * 0.5 + 0.014,
      faceOffset,
    );
    upperDrop.rotation.set(0, faceRotationY, -0.045);
    sash.add(upperDrop);
  
    addFrontBand(materials.red, tieY + 0.035, 0.065, -0.34, 0.003, 1.24);
    addFrontBand(materials.white, tieY - 0.017, 0.055, -0.31, -0.002, 1.2);
  
    [-1, 1].forEach((direction) => {
      const sideRotationY = direction > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const sideBand = new THREE.Mesh(
        roundedBox(width * 1.03, 0.058, 0.013, 0.003, 2),
        direction < 0 ? materials.red : materials.white,
      );
      sideBand.position.set(direction * (width * 0.5 + 0.009), tieY, 0);
      sideBand.rotation.set(0, sideRotationY, direction * 0.2);
      sash.add(sideBand);
    });
  
    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(width * 0.25, 9, 6),
      materials.red,
    );
    knot.position.set(width * 0.22, tieY - 0.003, faceOffset + facingZ * 0.018);
    knot.scale.set(1.28, 0.68, 0.46);
    sash.add(knot);
    const whiteKnot = new THREE.Mesh(
      new THREE.SphereGeometry(width * 0.19, 8, 5),
      materials.white,
    );
    whiteKnot.position.set(
      width * 0.12,
      tieY - 0.025,
      faceOffset + facingZ * 0.024,
    );
    whiteKnot.scale.set(1.05, 0.58, 0.42);
    sash.add(whiteKnot);
  
    const tailPanels = [];
    const addTail = (
      material,
      offsetX,
      tailWidth,
      tailHeight,
      lean,
      amplitude,
      phaseOffset,
    ) => {
      const geometry = new THREE.PlaneGeometry(tailWidth, tailHeight, 2, 7);
      geometry.translate(0, -tailHeight * 0.5, 0);
      const positions = geometry.getAttribute("position");
      for (let index = 0; index < positions.count; index += 1) {
        const progress = THREE.MathUtils.clamp(
          -positions.getY(index) / tailHeight,
          0,
          1,
        );
        positions.setX(
          index,
          positions.getX(index) * THREE.MathUtils.lerp(1, 0.72, progress) +
            lean * Math.pow(progress, 1.35),
        );
      }
      geometry.computeVertexNormals();
      const tail = new THREE.Mesh(geometry, material);
      tail.position.set(
        offsetX,
        tieY - 0.018,
        faceOffset + facingZ * 0.015,
      );
      tail.rotation.y = faceRotationY;
      tail.castShadow = true;
      sash.add(tail);
      tailPanels.push({
        geometry,
        basePositions: positions.array.slice(),
        height: tailHeight,
        amplitude,
        phaseOffset,
      });
    };
    addTail(
      materials.white,
      -width * 0.13,
      width * 0.48,
      width * 2.2,
      -width * 0.16,
      0.012,
      0.7,
    );
    addTail(
      materials.red,
      width * 0.25,
      width * 0.36,
      width * 1.5,
      width * 0.2,
      0.017,
      2.1,
    );
  
    sash.userData.tailPanels = tailPanels;
    group.add(sash);
    return sash;
  }
  
  function addDeliveryMarker(group, stop, ringRadius, beaconBaseY) {
    const marker = new THREE.Group();
    const groundRing = new THREE.Mesh(
      new THREE.TorusGeometry(ringRadius, 0.025, 8, 48),
      targetMaterial,
    );
    groundRing.position.y = 0.015;
    groundRing.rotation.x = Math.PI / 2;
    marker.add(groundRing);
  
    const beacon = new THREE.Group();
    beacon.position.set(0, beaconBaseY, 0);
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
    marker.userData.beaconBaseY = beaconBaseY;
    marker.visible = false;
    group.add(marker);
    stop.marker = marker;
  }
  

  return {
    addDeliveryMarker,
    addIndonesianFlag,
    addLocalPalm,
    addPendopoCeremonialCanopy,
    addPendopoColumnSash,
    addPendopoPennant,
    addPendopoSimpleColumn,
    addPendopoTimberColumn,
    addSitubondoSign,
    addStopMotif,
    createArchPanelGeometry,
    getSitubondoSignMaterial,
  };
}
