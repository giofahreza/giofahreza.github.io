import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
import "./style.css?v=anime-coast-v21";

const app = document.querySelector("#app");
const canvas = document.querySelector("#scene");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start");
const lettersNode = document.querySelector("#letters");
const timeNode = document.querySelector("#time");
const streakNode = document.querySelector("#streak");
const targetNode = document.querySelector("#target");
const analog = document.querySelector("#analog");
const analogStick = document.querySelector("#analog-stick");
const brakeButton = document.querySelector("#brake");

const PLANET_RADIUS = 18;
const TOWN_CURVE_SCALE = 0.46;
const LOGICAL_CENTER_PHI = 1.4;
const ACTUAL_CENTER_PHI = 1.5;
const LOGICAL_THETA_PERIOD = (Math.PI * 2) / TOWN_CURVE_SCALE;
const TOWN_DISTANCE_SCALE = PLANET_RADIUS * TOWN_CURVE_SCALE;
const GROUND_EPSILON = 0.0008;
const FOUNDATION_SINK = 0.004;
const ROAD_SURFACE_OFFSET = 0.0012;
const ROUND_TIME = 180;
const DELIVERY_DISTANCE = 0.9;
const RIDER_SCALE = 0.31;
const RIDER_COLLISION_RADIUS = 0.06;
const HOUSE_COLLISION_RADIUS = 0.34;
const TREE_COLLISION_RADIUS = 0.08;
const ROCK_COLLISION_RADIUS = 0.2;
const PLAYABLE_MIN_PHI = 0.56;
const PLAYABLE_MAX_PHI = 2.24;
const TURN_SPEED = 3.3;
const WALK_SPEED = 0.98;
const REVERSE_WALK_SPEED = 0.4;
const DEADZONE = 0.12;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const outlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.0022,
  defaultColor: [0.1, 0.16, 0.17],
  defaultAlpha: 0.72,
  defaultKeepAlive: true,
});

function createPaintedSkyTexture() {
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 1280;
  skyCanvas.height = 720;
  const context = skyCanvas.getContext("2d");
  context.fillStyle = "#66bec0";
  context.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  const cloudShapes = [
    [
      [-80, 88], [52, 72], [118, 32], [214, 58], [318, 44],
      [420, 95], [335, 110], [220, 102], [108, 126], [-40, 118],
    ],
    [
      [510, 165], [600, 128], [684, 146], [756, 104], [848, 126],
      [930, 178], [842, 194], [748, 181], [642, 204], [548, 196],
    ],
    [
      [900, 20], [1005, 2], [1112, 42], [1210, 24], [1325, 66],
      [1262, 104], [1152, 94], [1042, 118], [930, 82],
    ],
    [
      [-20, 352], [92, 326], [184, 349], [278, 318], [360, 342],
      [430, 390], [334, 402], [226, 388], [128, 416], [28, 398],
    ],
    [
      [710, 400], [794, 368], [874, 388], [950, 360], [1046, 386],
      [1130, 432], [1036, 446], [936, 430], [830, 454], [748, 438],
    ],
  ];

  cloudShapes.forEach((points, index) => {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
    context.closePath();
    context.fillStyle = index % 2 === 0 ? "#b9e8d9" : "#a9dfd3";
    context.fill();
    context.strokeStyle = "rgba(41, 87, 88, 0.34)";
    context.lineWidth = 3;
    context.stroke();
  });

  context.fillStyle = "rgba(224, 244, 230, 0.5)";
  for (let index = 0; index < 36; index += 1) {
    const x = (index * 193) % skyCanvas.width;
    const y = 42 + ((index * 97) % 520);
    context.fillRect(x, y, 3 + (index % 4), 2);
  }

  const texture = new THREE.CanvasTexture(skyCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = 1.015;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createPaintedGroundTexture() {
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = 768;
  groundCanvas.height = 384;
  const context = groundCanvas.getContext("2d");
  context.fillStyle = "#99b88e";
  context.fillRect(0, 0, groundCanvas.width, groundCanvas.height);

  const washes = [
    ["rgba(91, 143, 101, 0.28)", 94, 68],
    ["rgba(188, 198, 139, 0.2)", 142, 82],
    ["rgba(67, 119, 88, 0.16)", 76, 48],
    ["rgba(219, 211, 156, 0.13)", 118, 60],
  ];
  for (let index = 0; index < 72; index += 1) {
    const [color, width, height] = washes[index % washes.length];
    const x = (index * 137 + (index % 5) * 31) % groundCanvas.width;
    const y = (index * 83 + (index % 7) * 19) % groundCanvas.height;
    context.beginPath();
    context.ellipse(
      x,
      y,
      width * (0.7 + (index % 4) * 0.12),
      height * (0.75 + (index % 3) * 0.16),
      (index % 9) * 0.18,
      0,
      Math.PI * 2,
    );
    context.fillStyle = color;
    context.fill();
  }

  context.lineCap = "round";
  for (let index = 0; index < 190; index += 1) {
    const x = (index * 97) % groundCanvas.width;
    const y = (index * 59 + (index % 11) * 17) % groundCanvas.height;
    const length = 3 + (index % 5);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (index % 2 === 0 ? length : -length), y - length * 0.7);
    context.strokeStyle =
      index % 4 === 0
        ? "rgba(54, 102, 72, 0.2)"
        : "rgba(232, 225, 176, 0.2)";
    context.lineWidth = 1 + (index % 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(groundCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x72c8c6);
scene.fog = new THREE.Fog(0x72c8c6, 65, 125);

const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 140);
camera.position.set(0, 8.6, 15);
camera.lookAt(0, 0.4, 0);
scene.add(camera);

const paintedSkyMaterial = new THREE.MeshBasicMaterial({
  map: createPaintedSkyTexture(),
  depthTest: false,
  depthWrite: false,
  fog: false,
});
paintedSkyMaterial.userData.outlineParameters = { visible: false };
const paintedSky = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  paintedSkyMaterial,
);
paintedSky.position.z = -18;
paintedSky.renderOrder = -1000;
paintedSky.frustumCulled = false;
camera.add(paintedSky);
const cameraRig = {
  currentPosition: camera.position.clone(),
  currentTarget: new THREE.Vector3(0, 0.35, 0),
  currentUp: new THREE.Vector3(0, 1, 0),
  desiredUp: new THREE.Vector3(0, 1, 0),
  overviewPosition: new THREE.Vector3(0, 8.6, 15),
  overviewTarget: new THREE.Vector3(0, 0.25, 0),
  playDistance: 1.04,
  playHeight: 0.46,
  playSideOffset: -0.13,
  playForwardOffset: 0.53,
  followHeading: 0.65,
  turnFollowSpeed: 3.1,
};

const world = new THREE.Group();
scene.add(world);
const driftingClouds = [];

const toonGradient = new THREE.DataTexture(
  new Uint8Array([
    88, 88, 88,
    146, 146, 146,
    202, 202, 202,
    255, 255, 255,
  ]),
  4,
  1,
  THREE.RedFormat,
);
toonGradient.minFilter = THREE.NearestFilter;
toonGradient.magFilter = THREE.NearestFilter;
toonGradient.needsUpdate = true;

function toonMaterial(parameters = {}) {
  const {
    roughness: _roughness,
    metalness: _metalness,
    ...toonParameters
  } = parameters;
  return new THREE.MeshToonMaterial({
    ...toonParameters,
    gradientMap: toonGradient,
  });
}

function hideMaterialOutline(material) {
  material.userData.outlineParameters = { visible: false };
  return material;
}

const facadeMaterialCache = new Map();

function getFacadeDetailMaterial(style, variant) {
  const key = `${style}-${variant % 6}`;
  if (facadeMaterialCache.has(key)) {
    return facadeMaterialCache.get(key);
  }

  const detailCanvas = document.createElement("canvas");
  detailCanvas.width = 256;
  detailCanvas.height = 384;
  const context = detailCanvas.getContext("2d");
  context.clearRect(0, 0, detailCanvas.width, detailCanvas.height);

  context.strokeStyle = "rgba(38, 61, 61, 0.28)";
  context.fillStyle = "rgba(38, 61, 61, 0.2)";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (style === 4 || style === 5) {
    [132, 274].forEach((y, index) => {
      const inset = 28 + ((variant + index) % 3) * 7;
      context.beginPath();
      context.moveTo(inset, y);
      context.lineTo(78, y + (index % 2 === 0 ? 2 : -1));
      context.moveTo(182, y + 1);
      context.lineTo(256 - inset, y);
      context.stroke();
    });
  } else {
    [
      [18, 106, 68, 105],
      [178, 164, 236, 162],
      [22, 278, 82, 280],
    ].forEach(([x1, y1, x2, y2]) => {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    });
  }

  if (variant % 2 === 0) {
    const pipeX = variant % 4 === 0 ? 24 : 232;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(pipeX, 14);
    context.lineTo(pipeX + (variant % 3) * 2, 176);
    context.lineTo(pipeX - 3, 370);
    context.stroke();

    context.lineWidth = 3;
    context.strokeRect(pipeX - 14, 196, 28, 38);
    context.beginPath();
    context.arc(pipeX, 215, 7, 0, Math.PI * 2);
    context.stroke();
  }

  if (style === 1 || variant % 3 === 0) {
    context.fillStyle =
      variant % 3 === 0
        ? "rgba(196, 91, 78, 0.56)"
        : "rgba(62, 135, 147, 0.5)";
    context.fillRect(94, 306, 68, 24);
    context.strokeRect(94, 306, 68, 24);
    context.fillStyle = "rgba(241, 232, 205, 0.72)";
    context.fillRect(104, 313, 18, 5);
    context.fillRect(128, 313, 24, 5);
  }

  context.strokeStyle = "rgba(50, 72, 69, 0.18)";
  context.lineWidth = 2;
  [
    [54, 88, 69, 96, 62, 108],
    [188, 246, 178, 254, 190, 264],
  ].forEach(([x1, y1, x2, y2, x3, y3]) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.stroke();
  });

  const texture = new THREE.CanvasTexture(detailCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    depthWrite: false,
    toneMapped: false,
  });
  hideMaterialOutline(material);
  facadeMaterialCache.set(key, material);
  return material;
}

const inkMaterial = new THREE.MeshBasicMaterial({
  color: 0x263d3d,
  side: THREE.DoubleSide,
});
const roadMaterial = toonMaterial({
  color: 0x607d80,
  roughness: 0.82,
  metalness: 0,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
const roadEdgeMaterial = toonMaterial({
  color: 0xe7e5d5,
  roughness: 0.9,
  metalness: 0,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -3,
  polygonOffsetUnits: -3,
});
const sidewalkMaterial = toonMaterial({
  color: 0xd2d4c7,
  roughness: 0.88,
  metalness: 0,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const planetMaterial = toonMaterial({
  color: 0xffffff,
  map: createPaintedGroundTexture(),
  roughness: 0.84,
  metalness: 0,
  emissive: 0x547457,
  emissiveIntensity: 0.035,
});
const waterMaterial = toonMaterial({
  color: 0x3fa8af,
  roughness: 0.36,
  metalness: 0,
  emissive: 0x1d6267,
  emissiveIntensity: 0.06,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});
const grassPatchMaterial = toonMaterial({
  color: 0x6f9f70,
  roughness: 0.88,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const rockPatchMaterial = toonMaterial({
  color: 0xaaa9a0,
  roughness: 0.9,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const sandPatchMaterial = toonMaterial({
  color: 0xd8c795,
  roughness: 0.86,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});
const rockMaterial = toonMaterial({
  color: 0x999890,
  roughness: 0.92,
  metalness: 0,
});
const treeMaterial = toonMaterial({
  color: 0x63956c,
  roughness: 0.8,
  metalness: 0,
});
const trunkMaterial = toonMaterial({
  color: 0x856f5b,
  roughness: 0.82,
  metalness: 0,
});
const letterMaterial = toonMaterial({
  color: 0xffffff,
  roughness: 0.6,
  metalness: 0,
  emissive: 0x121212,
  emissiveIntensity: 0.05,
});
const targetMaterial = toonMaterial({
  color: 0xe7c766,
  roughness: 0.54,
  metalness: 0,
  emissive: 0xd99d28,
  emissiveIntensity: 0.45,
});
const flowerMaterials = [0xef9381, 0xe7c766, 0x80a9c8, 0xf6f0dc].map(
  (color) =>
    toonMaterial({
      color,
      roughness: 0.62,
      metalness: 0,
    }),
);
const cloudMaterial = toonMaterial({
  color: 0xffffff,
  roughness: 0.72,
  metalness: 0,
  transparent: true,
  opacity: 0.78,
});
const foliageMaterials = [0x5f9068, 0x719c73, 0x588962, 0x82a47a].map(
  (color) =>
    toonMaterial({
      color,
      roughness: 0.84,
      metalness: 0,
    }),
);

[
  roadMaterial,
  roadEdgeMaterial,
  sidewalkMaterial,
  waterMaterial,
  grassPatchMaterial,
  rockPatchMaterial,
  sandPatchMaterial,
].forEach(hideMaterialOutline);

const ambient = new THREE.HemisphereLight(0xffffff, 0xb7c8a4, 2.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 3.1);
sun.position.set(2.5, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
scene.add(sun);

const rimLight = new THREE.DirectionalLight(0x9fc8d6, 1.2);
rimLight.position.set(-5, 3, -4);
scene.add(rimLight);

const planetGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 128, 64);
deformPlanetGeometry(planetGeometry);
const planet = new THREE.Mesh(planetGeometry, planetMaterial);
planet.castShadow = true;
planet.receiveShadow = true;
world.add(planet);

const outlinePlanet = new THREE.Mesh(
  new THREE.IcosahedronGeometry(PLANET_RADIUS * 1.003, 2),
  new THREE.MeshBasicMaterial({
    color: 0x314b48,
    wireframe: true,
    transparent: true,
    opacity: 0.025,
  }),
);
outlinePlanet.visible = false;
world.add(outlinePlanet);

const gameState = {
  started: false,
  complete: false,
  timeLeft: ROUND_TIME,
  deliveries: 0,
  streak: 0,
  targetIndex: 0,
};

const rider = {
  theta: -1.35,
  phi: 1.14,
  heading: 0.65,
  speed: 0,
  turn: 0,
  walkPhase: 0,
  moveX: 0,
  moveY: 0,
};

const keys = new Set();
const touchState = {
  analogX: 0,
  analogY: 0,
  analogPointerId: null,
  brake: false,
};

const stops = [
  { name: "Blue Roof", theta: -1.68, phi: 0.99, color: 0x80a9c8 },
  { name: "Red Door", theta: -0.64, phi: 1.59, color: 0xd97f70 },
  { name: "Hill House", theta: 0.95, phi: 0.99, color: 0xe7c766 },
  { name: "Green Porch", theta: 2.12, phi: 1.59, color: 0x95bc7c },
  { name: "North Mill", theta: -0.08, phi: 0.66, color: 0xd8d1b8 },
  { name: "Harbor Hut", theta: -2.85, phi: 1.9, color: 0x9fc8d6 },
];
const obstacles = [];
const cameraCollisionMeshes = [];
const buildingFootprints = [];
const wireRoofClearances = [];

const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();
const tempVector3 = new THREE.Vector3();
const tempVector4 = new THREE.Vector3();
const tempVector5 = new THREE.Vector3();
const tempSpherical = new THREE.Spherical();
const upAxis = new THREE.Vector3(0, 1, 0);
const cameraRaycaster = new THREE.Raycaster();
const cameraAnchor = new THREE.Vector3();

function roundedBox(width, height, depth, radius = 0.04, segments = 4) {
  const safeRadius = Math.max(
    0.001,
    Math.min(radius, width * 0.45, height * 0.45, depth * 0.45),
  );
  return new RoundedBoxGeometry(
    width,
    height,
    depth,
    segments,
    safeRadius,
  );
}

function capsule(length, radius, capSegments = 5, radialSegments = 10) {
  return new THREE.CapsuleGeometry(
    radius,
    Math.max(0.001, length - radius * 2),
    capSegments,
    radialSegments,
  );
}

function createGableRoofGeometry(width, depth, height) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const vertices = new Float32Array([
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    0, height, -halfDepth,
    -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth,
    0, height, halfDepth,
  ]);
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 3, 4, 0, 4, 1,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertices, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Float32Array(12), 2),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry.toNonIndexed();
}

function mergeDirectMeshesByMaterial(group) {
  const buckets = new Map();
  const meshes = group.children.filter((child) => child.isMesh);

  meshes.forEach((mesh) => {
    mesh.updateMatrix();
    const key = mesh.material.uuid;
    if (!buckets.has(key)) {
      buckets.set(key, {
        material: mesh.material,
        geometries: [],
      });
    }
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    buckets.get(key).geometries.push(geometry.applyMatrix4(mesh.matrix));
  });

  meshes.forEach((mesh) => group.remove(mesh));
  buckets.forEach(({ material, geometries }) => {
    const geometry =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);
    const mergedMesh = new THREE.Mesh(geometry, material);
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;
    group.add(mergedMesh);
  });
}

function surfaceElevation(theta, phi) {
  const actualTheta = theta * TOWN_CURVE_SCALE;
  const seamFade = Math.cos(actualTheta * 0.5) ** 2;
  const broadSlope =
    Math.sin(theta * 1.08 + phi * 0.82) * 0.12 +
    Math.cos(theta * 2.15 - phi * 1.35) * 0.055;
  const northernRidge =
    Math.exp(-(((phi - 0.62) / 0.32) ** 2)) *
    (0.08 + Math.cos(theta * 1.4) * 0.035);
  return seamFade * (broadSlope + northernRidge);
}

function deformPlanetGeometry(geometry) {
  const positions = geometry.getAttribute("position");
  const spherical = new THREE.Spherical();
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    spherical.setFromVector3(vertex);
    const logicalTheta = spherical.theta / TOWN_CURVE_SCALE;
    const logicalPhi =
      LOGICAL_CENTER_PHI +
      (spherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
    vertex
      .normalize()
      .multiplyScalar(
        PLANET_RADIUS + surfaceElevation(logicalTheta, logicalPhi),
      );
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function sphericalPosition(theta, phi, radius = PLANET_RADIUS + GROUND_EPSILON) {
  const actualTheta = theta * TOWN_CURVE_SCALE;
  const actualPhi =
    ACTUAL_CENTER_PHI +
    (phi - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE;
  const elevation =
    radius > PLANET_RADIUS * 0.5 ? surfaceElevation(theta, phi) : 0;
  return new THREE.Vector3().setFromSphericalCoords(
    radius + elevation,
    actualPhi,
    actualTheta,
  );
}

function surfaceFrame(theta, phi) {
  const normal = sphericalPosition(theta, phi, 1).normalize();
  const actualTheta = theta * TOWN_CURVE_SCALE;
  const east = new THREE.Vector3(
    Math.cos(actualTheta),
    0,
    -Math.sin(actualTheta),
  ).normalize();
  const north = new THREE.Vector3().crossVectors(normal, east).normalize();
  return { normal, east, north };
}

function addObstacle(theta, phi, radius) {
  obstacles.push({
    theta,
    phi,
    radius,
    normal: sphericalPosition(theta, phi, 1).normalize(),
  });
}

function addBuildingFootprint(theta, phi, radius, height) {
  buildingFootprints.push({
    theta,
    phi,
    radius,
    height,
    normal: sphericalPosition(theta, phi, 1).normalize(),
  });
}

function addCameraCollider(object) {
  cameraCollisionMeshes.push(object);
}

function placeOnPlanet(object, theta, phi, lift = 0, yaw = 0) {
  const position = sphericalPosition(theta, phi, PLANET_RADIUS + lift);
  const { normal, east, north } = surfaceFrame(theta, phi);
  const forward = east
    .clone()
    .multiplyScalar(Math.cos(yaw))
    .addScaledVector(north, Math.sin(yaw))
    .normalize();
  const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  const matrix = new THREE.Matrix4().makeBasis(right, normal, forward);

  object.position.copy(position);
  object.quaternion.setFromRotationMatrix(matrix);
}

function surfaceSagitta(footprintRadius, radius = PLANET_RADIUS) {
  const clampedRadius = Math.min(footprintRadius, radius);
  return radius - Math.sqrt(radius * radius - clampedRadius * clampedRadius);
}

function makeSurfaceRibbon(points, width, lift, material) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const lateralSegments = 4;
  const rowSize = lateralSegments + 1;

  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const center = point.clone().setLength(point.length() + lift);
    const normal = center.clone().normalize();
    const tangent = next.clone().sub(previous).normalize();
    const lateral = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    for (let column = 0; column < rowSize; column += 1) {
      const offset = THREE.MathUtils.lerp(
        width * 0.5,
        -width * 0.5,
        column / lateralSegments,
      );
      const vertex = center
        .clone()
        .addScaledVector(lateral, offset)
        .setLength(center.length());
      const vertexNormal = vertex.clone().normalize();
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
      uvs.push(column / lateralSegments, index / (points.length - 1));
    }

    if (index < points.length - 1) {
      const row = index * rowSize;
      const nextRow = row + rowSize;
      for (let column = 0; column < lateralSegments; column += 1) {
        const current = row + column;
        const nextCurrent = nextRow + column;
        indices.push(
          current,
          current + 1,
          nextCurrent,
          current + 1,
          nextCurrent + 1,
          nextCurrent,
        );
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.receiveShadow = true;
  return ribbon;
}

function offsetSurfacePoints(points, offset) {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const normal = point.clone().normalize();
    const tangent = next.clone().sub(previous).normalize();
    const lateral = new THREE.Vector3()
      .crossVectors(normal, tangent)
      .normalize();
    return point
      .clone()
      .addScaledVector(lateral, offset)
      .setLength(point.length());
  });
}

function makeInkLine(points, width = 0.38) {
  const group = new THREE.Group();
  const sidewalk = makeSurfaceRibbon(points, width + 0.34, 0, sidewalkMaterial);
  const road = makeSurfaceRibbon(points, width, 0.0016, roadMaterial);
  const lineOffset = width * 0.43;
  const leftEdge = makeSurfaceRibbon(
    offsetSurfacePoints(points, lineOffset),
    0.018,
    0.003,
    roadEdgeMaterial,
  );
  const rightEdge = makeSurfaceRibbon(
    offsetSurfacePoints(points, -lineOffset),
    0.018,
    0.003,
    roadEdgeMaterial,
  );
  group.add(sidewalk, road, leftEdge, rightEdge);
  return group;
}

function makeRoute(
  phi,
  thetaStart,
  thetaEnd,
  radius = PLANET_RADIUS + ROAD_SURFACE_OFFSET,
) {
  const points = [];
  const segmentCount = Math.max(
    36,
    Math.ceil(Math.abs(thetaEnd - thetaStart) * 20),
  );
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount;
    const theta = THREE.MathUtils.lerp(thetaStart, thetaEnd, t);
    points.push(sphericalPosition(theta, phi, radius));
  }
  return makeInkLine(points, 0.4);
}

function makeMeridian(
  theta,
  phiStart,
  phiEnd,
  radius = PLANET_RADIUS + ROAD_SURFACE_OFFSET,
) {
  const points = [];
  for (let i = 0; i <= 72; i += 1) {
    const t = i / 72;
    const phi = THREE.MathUtils.lerp(phiStart, phiEnd, t);
    points.push(sphericalPosition(theta, phi, radius));
  }
  return makeInkLine(points, 0.36);
}

function makePatchGeometry(
  radius = 0.5,
  segments = 14,
  irregularity = 0.16,
  radialSegments = 1,
) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const indices = [];
  const safeRadialSegments = Math.max(1, Math.floor(radialSegments));
  const boundaryRadii = [];

  for (let i = 0; i < segments; i += 1) {
    const wobble =
      1 +
      Math.sin(i * 1.73 + radius * 5.1) * irregularity * 0.55 +
      Math.cos(i * 2.41 + radius * 2.3) * irregularity * 0.45;
    boundaryRadii.push(radius * wobble);
  }

  for (let ring = 1; ring <= safeRadialSegments; ring += 1) {
    const ringProgress = ring / safeRadialSegments;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const ringRadius = boundaryRadii[i] * ringProgress;
      positions.push(
        Math.cos(angle) * ringRadius,
        0,
        Math.sin(angle) * ringRadius,
      );
      normals.push(0, 1, 0);
    }
  }

  const ringIndex = (ring, segment) =>
    1 + (ring - 1) * segments + (segment % segments);

  for (let i = 0; i < segments; i += 1) {
    indices.push(0, ringIndex(1, i + 1), ringIndex(1, i));
  }

  for (let ring = 1; ring < safeRadialSegments; ring += 1) {
    for (let i = 0; i < segments; i += 1) {
      const next = (i + 1) % segments;
      indices.push(
        ringIndex(ring, i),
        ringIndex(ring, next),
        ringIndex(ring + 1, i),
        ringIndex(ring, next),
        ringIndex(ring + 1, next),
        ringIndex(ring + 1, i),
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function conformGeometryToPlanet(geometry, scaleX, scaleZ, lift = 0) {
  const positions = geometry.getAttribute("position");
  const surfaceRadius = PLANET_RADIUS + lift;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) * scaleX;
    const z = positions.getZ(index) * scaleZ;
    const lateralRadiusSq = Math.min(
      x * x + z * z,
      surfaceRadius * surfaceRadius,
    );
    const y =
      Math.sqrt(surfaceRadius * surfaceRadius - lateralRadiusSq) -
      surfaceRadius;
    positions.setXYZ(index, x, y, z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createSurfacePatch(
  theta,
  phi,
  radius,
  scaleX,
  scaleZ,
  material,
  yaw = 0,
  lift = 0.0012,
) {
  const patchSegments = radius > 2 ? 48 : 24;
  const radialSegments = radius > 2 ? 28 : 5;
  const geometry = makePatchGeometry(
    radius,
    patchSegments,
    0.16,
    radialSegments,
  );
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const { normal, east, north } = surfaceFrame(theta, phi);
  const forward = east
    .clone()
    .multiplyScalar(Math.cos(yaw))
    .addScaledVector(north, Math.sin(yaw))
    .normalize();
  const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  const surfaceDirection = new THREE.Vector3();
  const surfaceSpherical = new THREE.Spherical();

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index) * scaleX;
    const localZ = positions.getZ(index) * scaleZ;
    surfaceDirection
      .copy(normal)
      .addScaledVector(right, localX / PLANET_RADIUS)
      .addScaledVector(forward, localZ / PLANET_RADIUS)
      .normalize();
    surfaceSpherical.setFromVector3(surfaceDirection);
    const logicalTheta = surfaceSpherical.theta / TOWN_CURVE_SCALE;
    const logicalPhi =
      LOGICAL_CENTER_PHI +
      (surfaceSpherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
    const worldPosition = sphericalPosition(
      logicalTheta,
      logicalPhi,
      PLANET_RADIUS + lift,
    );
    positions.setXYZ(
      index,
      worldPosition.x,
      worldPosition.y,
      worldPosition.z,
    );
    normals.setXYZ(
      index,
      surfaceDirection.x,
      surfaceDirection.y,
      surfaceDirection.z,
    );
  }

  positions.needsUpdate = true;
  normals.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const patch = new THREE.Mesh(geometry, material);
  patch.receiveShadow = true;
  world.add(patch);
  return patch;
}

[
  [-1.78, 1.08, 0.64, 1.55, 0.78, rockPatchMaterial, -0.25],
  [-0.56, 1.42, 0.72, 1.46, 0.68, rockPatchMaterial, 0.12],
  [0.82, 1.12, 0.66, 1.4, 0.72, grassPatchMaterial, 0.48],
  [2.05, 1.56, 0.72, 1.5, 0.7, rockPatchMaterial, -0.38],
  [-2.82, 1.78, 0.58, 1.35, 0.58, sandPatchMaterial, 0.18],
  [0.12, 0.76, 0.42, 1.0, 0.55, grassPatchMaterial, 0.8],
  [1.22, 1.86, 0.48, 1.2, 0.6, sandPatchMaterial, -0.5],
].forEach(([theta, phi, radius, scaleX, scaleZ, material, yaw]) => {
  createSurfacePatch(theta, phi, radius, scaleX, scaleZ, material, yaw);
});

createSurfacePatch(
  0.05,
  2.34,
  4.8,
  0.62,
  1.72,
  waterMaterial,
  -0.03,
  0.006,
);
createSurfacePatch(
  0.02,
  2.04,
  3.65,
  0.2,
  1.85,
  sandPatchMaterial,
  -0.02,
  0.015,
);

const plateauGrassMaterial = toonMaterial({
  color: 0x71966d,
  roughness: 0.9,
  metalness: 0,
});
const plateauStoneMaterial = toonMaterial({
  color: 0x96998e,
  roughness: 0.94,
  metalness: 0,
});
const hillMaterials = [0x5c8f67, 0x6f9d70, 0x4e8062].map((color) =>
  toonMaterial({ color }),
);

function createDistantHill(theta, phi, width, height, materialIndex = 0) {
  const group = new THREE.Group();
  const rockSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.88, width, height * 0.22, 12),
    plateauStoneMaterial,
  );
  rockSkirt.position.y = height * 0.11;
  rockSkirt.scale.z = 0.66;
  rockSkirt.castShadow = true;
  rockSkirt.receiveShadow = true;
  group.add(rockSkirt);

  const hill = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 1),
    hillMaterials[materialIndex % hillMaterials.length],
  );
  hill.position.set(-width * 0.08, height * 0.34, 0);
  hill.scale.set(width * 0.78, height * 0.3, width * 0.53);
  hill.castShadow = true;
  hill.receiveShadow = true;
  group.add(hill);

  const shoulder = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 1),
    hillMaterials[(materialIndex + 1) % hillMaterials.length],
  );
  shoulder.position.set(width * 0.46, height * 0.25, 0.08);
  shoulder.scale.set(width * 0.5, height * 0.23, width * 0.4);
  shoulder.castShadow = true;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  const crown = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 1),
    hillMaterials[(materialIndex + 2) % hillMaterials.length],
  );
  crown.position.set(-width * 0.12, height * 0.53, -0.04);
  crown.scale.set(width * 0.42, height * 0.18, width * 0.34);
  crown.castShadow = true;
  group.add(crown);

  placeOnPlanet(
    group,
    theta,
    phi,
    -surfaceSagitta(Math.min(width, 1.6)) - 0.06,
    theta * 0.11,
  );
  world.add(group);
  addCameraCollider(group);
}

[
  [-6.35, 0.48, 1.25, 1.08, 0],
  [-5.25, 0.46, 1.5, 1.32, 1],
  [-4.1, 0.49, 1.35, 1.16, 2],
  [-2.75, 0.48, 1.2, 1.1, 0],
  [-1.55, 0.46, 1.55, 1.45, 1],
  [-0.2, 0.45, 1.8, 1.65, 2],
  [1.2, 0.47, 1.5, 1.25, 0],
  [2.55, 0.49, 1.25, 1.08, 1],
  [3.7, 0.47, 1.42, 1.22, 2],
  [4.85, 0.48, 1.55, 1.36, 0],
  [6.05, 0.46, 1.38, 1.2, 1],
  [-6.1, 2.21, 1.35, 1.08, 2],
  [-4.85, 2.2, 1.5, 1.18, 0],
  [-3.55, 2.22, 1.28, 1.02, 1],
  [-2.1, 2.2, 1.3, 1.05, 2],
  [2.2, 2.22, 1.45, 1.18, 0],
  [3.55, 2.2, 1.32, 1.04, 1],
  [4.9, 2.22, 1.5, 1.2, 2],
  [6.2, 2.2, 1.36, 1.08, 0],
].forEach((item) => createDistantHill(...item));

const ROAD_LOOP_START = -LOGICAL_THETA_PERIOD * 0.5;
const ROAD_LOOP_END = LOGICAL_THETA_PERIOD * 0.5;
const latitudeRoads = [
  [0.82, ROAD_LOOP_START, ROAD_LOOP_END],
  [1.14, ROAD_LOOP_START, ROAD_LOOP_END],
  [1.44, ROAD_LOOP_START, ROAD_LOOP_END],
  [1.74, ROAD_LOOP_START, ROAD_LOOP_END],
];
const meridianRoads = [
  [-6.12, 0.82, 1.94],
  [-5.02, 0.82, 1.94],
  [-3.92, 0.82, 1.94],
  [-1.86, 0.82, 1.78],
  [-0.48, 0.86, 1.72],
  [0.18, 0.64, 1.58],
  [1.18, 0.78, 2.02],
  [2.28, 1.06, 1.94],
  [3.5, 0.82, 1.94],
  [4.62, 0.82, 1.94],
  [5.74, 0.82, 1.94],
];

latitudeRoads.forEach(([phi, thetaStart, thetaEnd]) => {
  world.add(makeRoute(phi, thetaStart, thetaEnd));
});
meridianRoads.forEach(([theta, phiStart, phiEnd]) => {
  world.add(makeMeridian(theta, phiStart, phiEnd));
});

function createRoadJunction(theta, phi) {
  const createLayer = (radius, lift, material) => {
    const geometry = new THREE.CircleGeometry(radius, 48);
    geometry.rotateX(-Math.PI * 0.5);
    conformGeometryToPlanet(geometry, 1, 1, lift);
    const junction = new THREE.Mesh(geometry, material);
    junction.receiveShadow = true;
    placeOnPlanet(junction, theta, phi, lift);
    world.add(junction);
  };

  createLayer(0.58, ROAD_SURFACE_OFFSET + 0.0011, sidewalkMaterial);
  createLayer(0.34, ROAD_SURFACE_OFFSET + 0.0032, roadMaterial);
}

latitudeRoads.forEach(([phi, thetaStart, thetaEnd]) => {
  meridianRoads.forEach(([theta, phiStart, phiEnd]) => {
    const connectsTheta = theta >= thetaStart - 0.06 && theta <= thetaEnd + 0.06;
    const connectsPhi = phi >= phiStart - 0.04 && phi <= phiEnd + 0.04;
    if (connectsTheta && connectsPhi) {
      createRoadJunction(theta, phi);
    }
  });
});

function distanceToNearestRoad(theta, phi) {
  let nearestDistance = Infinity;

  latitudeRoads.forEach(([roadPhi, thetaStart, thetaEnd]) => {
    if (theta < thetaStart || theta > thetaEnd) return;
    nearestDistance = Math.min(
      nearestDistance,
      Math.abs(phi - roadPhi) * TOWN_DISTANCE_SCALE,
    );
  });

  meridianRoads.forEach(([roadTheta, phiStart, phiEnd]) => {
    if (phi < phiStart || phi > phiEnd) return;
    const actualThetaDelta = Math.abs(
      Math.atan2(
        Math.sin((theta - roadTheta) * TOWN_CURVE_SCALE),
        Math.cos((theta - roadTheta) * TOWN_CURVE_SCALE),
      ),
    );
    nearestDistance = Math.min(
      nearestDistance,
      actualThetaDelta *
        PLANET_RADIUS *
        Math.sin(
          ACTUAL_CENTER_PHI +
            (phi - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE,
        ),
    );
  });

  return nearestDistance;
}

function isInsideRoadCorridor(theta, phi, clearance = 0.52) {
  return distanceToNearestRoad(theta, phi) < clearance;
}

function hasPlacementClearance(theta, phi, radius, extra = 0.1) {
  const placementNormal = sphericalPosition(theta, phi, 1).normalize();
  return !obstacles.some(
    (obstacle) =>
      placementNormal.angleTo(obstacle.normal) * PLANET_RADIUS <
      radius + obstacle.radius + extra,
  );
}

function createPlateau(theta, phi, radius, height, yaw = 0) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius * 0.9,
      radius,
      height,
      14,
      1,
      false,
    ),
    [plateauStoneMaterial, plateauGrassMaterial, plateauStoneMaterial],
  );
  base.position.y = height * 0.5;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const top = new THREE.Mesh(
    makePatchGeometry(radius * 0.93, 18, 0.1),
    plateauGrassMaterial,
  );
  top.position.y = height + 0.008;
  top.receiveShadow = true;
  group.add(top);

  const stoneLip = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.9, 0.035, 6, 40),
    plateauStoneMaterial,
  );
  stoneLip.position.y = height - 0.015;
  stoneLip.rotation.x = Math.PI * 0.5;
  group.add(stoneLip);

  const hutWall = new THREE.Mesh(
    roundedBox(0.38, 0.28, 0.3, 0.014),
    toonMaterial({ color: 0xe8e4d4 }),
  );
  hutWall.position.set(-0.08, height + 0.15, -0.04);
  group.add(hutWall);

  const hutRoof = new THREE.Mesh(
    createGableRoofGeometry(0.5, 0.4, 0.15),
    toonMaterial({ color: 0x78635d }),
  );
  hutRoof.position.set(-0.08, height + 0.3, -0.04);
  group.add(hutRoof);

  const hutDoor = new THREE.Mesh(
    roundedBox(0.09, 0.18, 0.018, 0.005),
    inkMaterial,
  );
  hutDoor.position.set(-0.01, height + 0.12, 0.118);
  group.add(hutDoor);

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(
    group,
    theta,
    phi,
    -surfaceSagitta(radius) - 0.012,
    yaw,
  );
  world.add(group);
  addObstacle(theta, phi, radius * 0.8);
  addBuildingFootprint(theta, phi, radius * 0.28, height + 0.48);
  addCameraCollider(group);
}

[
  [0.68, 0.6, 0.78, 0.3, -0.18],
  [-5.48, 0.61, 0.7, 0.27, 0.2],
  [4.08, 2.08, 0.74, 0.28, -0.14],
].forEach((item) => createPlateau(...item));

function createHouse(stop) {
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

  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.025, 8, 48), targetMaterial);
  marker.position.y = 0.015;
  marker.rotation.x = Math.PI / 2;
  marker.visible = false;
  group.add(marker);

  placeOnPlanet(
    group,
    stop.theta,
    stop.phi,
    -surfaceSagitta(0.48 * houseScale) -
      FOUNDATION_SINK -
      0.012 * houseScale,
    stop.yaw ?? stop.theta * 0.27,
  );
  stop.group = group;
  stop.marker = marker;
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
  addObstacle(theta, phi, 0.27 * scale);
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
  const wallMaterial = toonMaterial({
    color,
    roughness: 0.74,
    metalness: 0,
  });
  const roofMaterial = toonMaterial({
    color: [0x4f7772, 0x747d7d, 0x54765f, 0x735f5c, 0x4f8091, 0x855b52][
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

  const foundationRadius = Math.hypot(width + 0.08, depth + 0.08) * 0.5;
  placeOnPlanet(
    group,
    theta,
    phi,
    -surfaceSagitta(foundationRadius) - FOUNDATION_SINK,
    yaw,
  );
  world.add(group);
  addObstacle(theta, phi, Math.hypot(width, depth) * 0.4);
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
  0xc7c2b4,
  0xa9b9b5,
  0xc6b2aa,
  0xb5bea9,
  0xaab8c0,
  0xd0c5ae,
  0xb7afbc,
  0xb6c1b5,
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
  addObstacle(theta, phi, collisionRadius);
  addBuildingFootprint(theta, phi, collisionRadius, height + 0.28);
  infillStats.buildings += 1;
}

const infillRows = [0.68, 0.98, 1.29, 1.59, 1.96];
const infillColumns = 72;
const infillPlacements = [];
const infillRoofColors = [
  0x557873,
  0x747c7b,
  0x5b765f,
  0x795f5a,
  0x587f8d,
  0x875e55,
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
    inkMaterial,
    placements.length,
  );
  const windowsPerBuilding = 12;
  const windowInstances = new THREE.InstancedMesh(
    detailGeometry,
    townWindowMaterial,
    placements.length * windowsPerBuilding,
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

    const floorY = [0.34, Math.min(height - 0.18, 0.68)];
    floorY.forEach((windowY) => {
      [-0.22, 0.22].forEach((factor) => {
        const windowWidth = Math.min(0.15, width * 0.24);
        setLocalMatrix(
          windowInstances,
          windowIndex,
          new THREE.Vector3(
            width * factor,
            windowY,
            depth * 0.5 + 0.016,
          ),
          new THREE.Vector3(windowWidth, 0.13, 0.025),
        );
        windowIndex += 1;
        setLocalMatrix(
          windowInstances,
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
        setLocalMatrix(
          windowInstances,
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
    windowInstances,
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

const gardenSoilMaterial = toonMaterial({
  color: 0x887b62,
  roughness: 0.94,
  metalness: 0,
});
const gardenBorderMaterial = toonMaterial({
  color: 0xa9a58e,
  roughness: 0.9,
  metalness: 0,
});

function createGardenPlot(
  theta,
  phi,
  width = 0.5,
  depth = 0.34,
  yaw = 0,
  variant = 0,
) {
  const footprint = Math.hypot(width, depth) * 0.5;
  if (distanceToNearestRoad(theta, phi) < 0.58 + footprint * 0.3) return;
  if (!hasPlacementClearance(theta, phi, footprint, 0.045)) return;

  const group = new THREE.Group();
  const bed = new THREE.Mesh(
    roundedBox(width, 0.025, depth, 0.008),
    gardenSoilMaterial,
  );
  bed.position.y = 0.012;
  bed.receiveShadow = true;
  group.add(bed);

  [-1, 1].forEach((side) => {
    const border = new THREE.Mesh(
      roundedBox(width + 0.035, 0.04, 0.035, 0.006),
      gardenBorderMaterial,
    );
    border.position.set(0, 0.026, side * depth * 0.5);
    group.add(border);
  });

  const cropMaterial =
    foliageMaterials[variant % foliageMaterials.length];
  for (let row = -1; row <= 1; row += 1) {
    for (let column = -1; column <= 1; column += 1) {
      const crop = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.045, 0),
        cropMaterial,
      );
      crop.position.set(
        column * width * 0.24,
        0.07 + ((row + column + variant + 9) % 2) * 0.018,
        row * depth * 0.24,
      );
      crop.scale.set(0.78, 1.28, 0.82);
      crop.castShadow = true;
      group.add(crop);
    }
  }

  mergeDirectMeshesByMaterial(group);
  placeOnPlanet(
    group,
    theta,
    phi,
    -surfaceSagitta(footprint) - 0.004,
    yaw,
  );
  world.add(group);
  infillStats.gardens += 1;
}

const gardenColumns = 36;
infillRows.forEach((phi, rowIndex) => {
  for (let column = 0; column < gardenColumns; column += 1) {
    const sequence = rowIndex * gardenColumns + column;
    const theta =
      ROAD_LOOP_START +
      ((column + 0.78 + (rowIndex % 2) * 0.47) / gardenColumns) *
        LOGICAL_THETA_PERIOD;
    createGardenPlot(
      theta,
      phi + Math.sin(sequence * 1.37) * 0.025,
      0.44 + (sequence % 3) * 0.045,
      0.3 + ((sequence * 3) % 2) * 0.05,
      theta * 0.09,
      sequence,
    );
  }
});

function createStreetLamp(theta, phi, yaw = 0) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.022, 0.82, 7),
    townMetalMaterial,
  );
  post.position.y = 0.42;
  post.castShadow = true;
  group.add(post);

  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.24, 7),
    townMetalMaterial,
  );
  arm.position.set(0.105, 0.8, 0);
  arm.rotation.z = Math.PI / 2;
  group.add(arm);

  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    targetMaterial,
  );
  light.position.set(0.215, 0.77, 0);
  group.add(light);

  placeOnPlanet(group, theta, phi, -0.004, yaw);
  world.add(group);
}

[
  [-2.3, 1.07, 0],
  [-1.82, 1.21, Math.PI],
  [-1.32, 1.07, 0],
  [-0.72, 1.21, Math.PI],
  [-0.12, 1.07, 0],
  [0.52, 1.21, Math.PI],
  [1.02, 1.07, 0],
  [-1.92, 1.36, Math.PI],
  [-1.18, 1.52, 0],
  [-0.42, 1.36, Math.PI],
  [0.56, 1.52, 0],
  [1.46, 1.36, Math.PI],
  [2.16, 1.52, 0],
].forEach(([theta, phi, yaw]) => createStreetLamp(theta, phi, yaw));

[-6.12, -5.02, -3.92, 3.5, 4.62, 5.74].forEach(
  (theta, index) => {
    createStreetLamp(theta + 0.075, 1.02, Math.PI * 0.5);
    createStreetLamp(theta - 0.075, 1.59, -Math.PI * 0.5);
    if (index % 2 === 0) {
      createStreetLamp(theta + 0.075, 1.9, Math.PI * 0.5);
    }
  },
);

function createUtilityPole(theta, phi, yaw = 0) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.027, 1.48, 7),
    townWoodMaterial,
  );
  pole.position.y = 0.74;
  group.add(pole);

  const crossbar = new THREE.Mesh(
    roundedBox(0.34, 0.025, 0.028, 0.006),
    townMetalMaterial,
  );
  crossbar.position.y = 1.32;
  group.add(crossbar);

  [-0.13, 0, 0.13].forEach((x) => {
    const insulator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, 0.07, 7),
      townTrimMaterial,
    );
    insulator.position.set(x, 1.385, 0);
    group.add(insulator);
  });

  if (Math.round((theta + phi) * 10) % 2 === 0) {
    const transformer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.075, 0.17, 10),
      townMetalMaterial,
    );
    transformer.position.set(0.07, 1.02, 0.02);
    transformer.rotation.z = Math.PI * 0.5;
    group.add(transformer);
  }

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.003, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.04);
}

function createUtilityWire(start, end, laneOffset = 0) {
  const points = [];
  const basePhi = (start[1] + end[1]) * 0.5;
  const streetBow = basePhi < 1.3 ? 0.035 : -0.035;

  for (let index = 0; index <= 18; index += 1) {
    const t = index / 18;
    const routeTheta = THREE.MathUtils.lerp(start[0], end[0], t);
    const routePhi =
      THREE.MathUtils.lerp(start[1], end[1], t) +
      Math.sin(t * Math.PI) * streetBow;
    const routeNormal = sphericalPosition(routeTheta, routePhi, 1).normalize();
    const sag = Math.sin(t * Math.PI) * 0.045;
    let wireHeight = 1.385 - sag;

    const nearbyBuildings = buildingFootprints.filter(
      (building) =>
        routeNormal.angleTo(building.normal) * PLANET_RADIUS <
        building.radius + 0.16,
    );
    nearbyBuildings.forEach((building) => {
      wireHeight = Math.max(wireHeight, building.height + 0.24);
    });
    nearbyBuildings.forEach((building) => {
      wireRoofClearances.push(wireHeight - building.height);
    });

    const point = sphericalPosition(
      routeTheta,
      routePhi,
      PLANET_RADIUS + wireHeight,
    );
    point.addScaledVector(surfaceFrame(routeTheta, routePhi).north, laneOffset);
    points.push(point);
  }

  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      24,
      0.0045,
      4,
      false,
    ),
    inkMaterial,
  );
  wire.castShadow = true;
  world.add(wire);
}

[
  {
    phi: 1.07,
    yaw: 0,
    thetas: [
      -6.4, -5.35, -4.3, -3.3,
      -2.42, -1.48, -0.86, 0.56, 1.62, 2.02,
      3.1, 4.15, 5.2, 6.25,
    ],
  },
  {
    phi: 1.51,
    yaw: Math.PI,
    thetas: [
      -6.25, -5.2, -4.15, -3.1,
      -2.52, -1.44, -0.9, 0.58, 1.6, 2.02,
      3.3, 4.3, 5.35, 6.4,
    ],
  },
].forEach(({ phi, yaw, thetas }) => {
  thetas.forEach((theta) => createUtilityPole(theta, phi, yaw));
  for (let index = 0; index < thetas.length - 1; index += 1) {
    const start = [thetas[index], phi];
    const end = [thetas[index + 1], phi];
    createUtilityWire(start, end, -0.055);
    createUtilityWire(start, end, 0.055);
  }
});

function createVendingMachine(theta, phi, color, yaw = 0) {
  if (isInsideRoadCorridor(theta, phi, 0.46)) return;
  const group = new THREE.Group();
  const machineMaterial = toonMaterial({ color });
  const body = new THREE.Mesh(
    roundedBox(0.2, 0.42, 0.14, 0.014),
    machineMaterial,
  );
  body.position.y = 0.22;
  group.add(body);

  const display = new THREE.Mesh(
    roundedBox(0.145, 0.19, 0.012, 0.005),
    townTrimMaterial,
  );
  display.position.set(0, 0.29, 0.076);
  group.add(display);

  [0.24, 0.29, 0.34].forEach((y, index) => {
    const productRow = new THREE.Mesh(
      roundedBox(0.112, 0.018, 0.008, 0.003),
      townSignMaterials[index % townSignMaterials.length],
    );
    productRow.position.set(0, y, 0.084);
    group.add(productRow);
  });

  const slot = new THREE.Mesh(
    roundedBox(0.09, 0.045, 0.012, 0.004),
    inkMaterial,
  );
  slot.position.set(0, 0.1, 0.08);
  group.add(slot);

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.004, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.11);
  addCameraCollider(group);
}

function createGuardRail(theta, phi, yaw, length = 0.9) {
  const group = new THREE.Group();
  [0.17, 0.3].forEach((y) => {
    const rail = new THREE.Mesh(
      roundedBox(length, 0.025, 0.025, 0.006),
      townTrimMaterial,
    );
    rail.position.y = y;
    group.add(rail);
  });
  [-0.44, 0, 0.44].forEach((factor) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.016, 0.34, 7),
      townMetalMaterial,
    );
    post.position.set(length * factor, 0.17, 0);
    group.add(post);
  });
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.003, yaw);
  world.add(group);
}

function createRoadsidePlanter(theta, phi, yaw = 0) {
  if (isInsideRoadCorridor(theta, phi, 0.43)) return;
  const group = new THREE.Group();
  const planter = new THREE.Mesh(
    roundedBox(0.32, 0.12, 0.14, 0.012),
    townTrimMaterial,
  );
  planter.position.y = 0.065;
  group.add(planter);
  [-0.1, 0, 0.1].forEach((x, index) => {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 6),
      foliageMaterials[index % foliageMaterials.length],
    );
    leaf.position.set(x, 0.17 + (index % 2) * 0.025, 0);
    leaf.scale.set(0.75, 1.25, 0.8);
    group.add(leaf);
  });
  placeOnPlanet(group, theta, phi, -0.003, yaw);
  world.add(group);
}

[
  [-1.15, 1.03, 0xc65f57, Math.PI * 0.5],
  [0.86, 1.53, 0x4e8eaa, -Math.PI * 0.5],
  [2.4, 1.28, 0xd3b34f, Math.PI],
].forEach((item) => createVendingMachine(...item));

[
  [-1.02, 1.66, 0],
  [0.32, 1.03, Math.PI],
  [1.86, 1.65, 0],
  [-2.68, 1.32, Math.PI],
].forEach((item) => createRoadsidePlanter(...item));

[
  [-1.7, 1.84, 0, 0.85],
  [-0.5, 1.84, 0, 0.95],
  [0.76, 1.84, 0, 0.9],
  [1.92, 1.84, 0, 0.9],
].forEach((item) => createGuardRail(...item));

function createRoadSign(theta, phi, color, yaw = 0) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.52, 7),
    townMetalMaterial,
  );
  pole.position.y = 0.26;
  group.add(pole);

  const signMaterial = toonMaterial({ color });
  const sign = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.018, 16),
    signMaterial,
  );
  sign.position.set(0, 0.54, 0);
  sign.rotation.x = Math.PI * 0.5;
  group.add(sign);

  const signCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.021, 16),
    townTrimMaterial,
  );
  signCenter.position.copy(sign.position);
  signCenter.position.z += 0.006;
  signCenter.rotation.x = Math.PI * 0.5;
  group.add(signCenter);

  placeOnPlanet(group, theta, phi, -0.003, yaw);
  world.add(group);
}

[
  [-1.66, 1.06, 0x4e86a2, 0],
  [-0.28, 1.52, 0xc85f58, Math.PI],
  [1.42, 1.05, 0x4e86a2, 0],
  [2.48, 1.62, 0xc85f58, Math.PI],
].forEach((item) => createRoadSign(...item));

function createFishingBoat(theta, phi, yaw, color) {
  const group = new THREE.Group();
  const hullMaterial = toonMaterial({ color: 0xf3f0df });
  const stripeMaterial = toonMaterial({ color });
  const hull = new THREE.Mesh(
    roundedBox(0.82, 0.18, 0.3, 0.05),
    hullMaterial,
  );
  hull.position.y = 0.09;
  hull.scale.x = 1.15;
  group.add(hull);

  const stripe = new THREE.Mesh(
    roundedBox(0.86, 0.055, 0.31, 0.018),
    stripeMaterial,
  );
  stripe.position.y = 0.1;
  group.add(stripe);

  const cabin = new THREE.Mesh(
    roundedBox(0.34, 0.26, 0.25, 0.02),
    townTrimMaterial,
  );
  cabin.position.set(-0.08, 0.3, 0);
  group.add(cabin);

  const cabinWindow = new THREE.Mesh(
    roundedBox(0.12, 0.09, 0.012, 0.004),
    townWindowMaterial,
  );
  cabinWindow.position.set(-0.26, 0.33, 0);
  cabinWindow.rotation.y = Math.PI * 0.5;
  group.add(cabinWindow);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.018, 0.62, 7),
    townWoodMaterial,
  );
  mast.position.set(0.12, 0.48, 0);
  group.add(mast);

  const mastBar = new THREE.Mesh(
    roundedBox(0.42, 0.018, 0.018, 0.005),
    townMetalMaterial,
  );
  mastBar.position.set(0.12, 0.68, 0);
  group.add(mastBar);

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(group, theta, phi, 0.02, yaw);
  world.add(group);
}

createFishingBoat(-1.65, 2.32, -0.24, 0x3b9dae);
createFishingBoat(0.9, 2.37, 0.18, 0xd66c59);

function createRetainingWall(
  theta,
  phi,
  yaw,
  length = 1,
  height = 0.28,
) {
  const group = new THREE.Group();
  const wallMaterial = toonMaterial({ color: 0xb9b8a9 });
  const wall = new THREE.Mesh(
    roundedBox(length, height, 0.12, 0.012),
    wallMaterial,
  );
  wall.position.y = height * 0.5;
  group.add(wall);

  const cap = new THREE.Mesh(
    roundedBox(length + 0.04, 0.045, 0.16, 0.008),
    townTrimMaterial,
  );
  cap.position.y = height + 0.018;
  group.add(cap);

  for (let x = -length * 0.4; x <= length * 0.4; x += 0.2) {
    const seam = new THREE.Mesh(
      roundedBox(0.008, height * 0.76, 0.008, 0.003),
      townWoodMaterial,
    );
    seam.position.set(x, height * 0.48, 0.064);
    group.add(seam);
  }

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.012, yaw);
  world.add(group);

  const logicalSpan = (length * 0.34) / TOWN_DISTANCE_SCALE;
  [-1, 0, 1].forEach((offset) => {
    addObstacle(theta + logicalSpan * offset, phi, 0.1);
  });
  addCameraCollider(group);
}

function createStreetStairs(
  theta,
  phi,
  yaw = 0,
  stepCount = 7,
  width = 0.38,
  rise = 0.032,
  run = 0.075,
) {
  const group = new THREE.Group();
  const totalRise = (stepCount - 1) * rise;
  const totalRun = (stepCount - 1) * run;

  for (let index = 0; index < stepCount; index += 1) {
    const step = new THREE.Mesh(
      roundedBox(width, 0.035, run * 1.28, 0.006),
      townTrimMaterial,
    );
    step.position.set(
      0,
      0.018 + index * rise,
      (index - (stepCount - 1) * 0.5) * run,
    );
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }

  const landing = new THREE.Mesh(
    roundedBox(width + 0.06, 0.045, run * 1.8, 0.008),
    townTrimMaterial,
  );
  landing.position.set(0, totalRise + 0.02, totalRun * 0.5 + run * 0.78);
  group.add(landing);

  const addRailSegment = (start, end, radius = 0.011) => {
    const direction = end.clone().sub(start);
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 7),
      townMetalMaterial,
    );
    rail.position.copy(start).add(end).multiplyScalar(0.5);
    rail.quaternion.setFromUnitVectors(
      upAxis,
      direction.clone().normalize(),
    );
    group.add(rail);
  };

  [-1, 1].forEach((side) => {
    const x = side * (width * 0.5 + 0.035);
    const lowZ = -totalRun * 0.5;
    const highZ = totalRun * 0.5 + run * 0.75;
    const lowTop = new THREE.Vector3(x, 0.2, lowZ);
    const highTop = new THREE.Vector3(
      x,
      totalRise + 0.2,
      highZ,
    );
    addRailSegment(lowTop, highTop, 0.012);

    [0, 0.5, 1].forEach((factor) => {
      const z = THREE.MathUtils.lerp(lowZ, highZ, factor);
      const stepY = THREE.MathUtils.lerp(0, totalRise, factor);
      addRailSegment(
        new THREE.Vector3(x, stepY + 0.03, z),
        new THREE.Vector3(x, stepY + 0.2, z),
        0.009,
      );
    });
  });

  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.006, yaw);
  world.add(group);
  addCameraCollider(group);
}

function createBicycle(theta, phi, color, yaw = 0) {
  const group = new THREE.Group();
  const frameMaterial = toonMaterial({ color });
  const wheelMaterial = inkMaterial;

  [-0.16, 0.16].forEach((x) => {
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.009, 6, 20),
      wheelMaterial,
    );
    wheel.position.set(x, 0.115, 0);
    group.add(wheel);
  });

  const addFrameBar = (start, end, radius = 0.009) => {
    const direction = end.clone().sub(start);
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
      frameMaterial,
    );
    bar.position.copy(start).add(end).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(
      upAxis,
      direction.clone().normalize(),
    );
    group.add(bar);
  };

  const rear = new THREE.Vector3(-0.16, 0.115, 0);
  const front = new THREE.Vector3(0.16, 0.115, 0);
  const seat = new THREE.Vector3(-0.045, 0.28, 0);
  const crank = new THREE.Vector3(-0.015, 0.13, 0);
  addFrameBar(rear, seat);
  addFrameBar(seat, front);
  addFrameBar(front, crank);
  addFrameBar(crank, rear);
  addFrameBar(crank, seat);

  const handle = new THREE.Mesh(
    roundedBox(0.08, 0.012, 0.012, 0.004),
    townMetalMaterial,
  );
  handle.position.set(0.18, 0.31, 0);
  group.add(handle);
  addFrameBar(front, new THREE.Vector3(0.18, 0.31, 0), 0.007);

  group.rotation.x = -0.06;
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.003, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.13);
}

function createDeliveryCrates(theta, phi, yaw = 0) {
  const group = new THREE.Group();
  [
    [-0.11, 0.08, 0, 0.22, 0.16, 0.18],
    [0.1, 0.065, 0.02, 0.17, 0.13, 0.16],
    [-0.04, 0.21, -0.01, 0.18, 0.13, 0.15],
  ].forEach(([x, y, z, width, height, depth], index) => {
    const crate = new THREE.Mesh(
      roundedBox(width, height, depth, 0.008),
      index === 1 ? townSignMaterials[1] : townWoodMaterial,
    );
    crate.position.set(x, y, z);
    crate.rotation.y = index * 0.13;
    crate.castShadow = true;
    group.add(crate);
  });
  placeOnPlanet(group, theta, phi, -0.004, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.2);
}

[
  [-1.1, 1.065, Math.PI * 0.5, 0.95, 0.3],
  [0.78, 1.535, -Math.PI * 0.5, 1.05, 0.34],
  [1.82, 1.345, Math.PI * 0.5, 0.9, 0.26],
].forEach((item) => createRetainingWall(...item));

createStreetStairs(-1.58, 1.04, Math.PI * 0.5, 8);
createStreetStairs(1.38, 1.55, -Math.PI * 0.5, 7);
createStreetStairs(0.68, 0.755, Math.PI * 0.5, 10, 0.34, 0.03, 0.085);
createStreetStairs(-0.36, 1.82, Math.PI * 0.5, 10, 0.36, 0.027, 0.08);
createStreetStairs(-5.48, 0.755, Math.PI * 0.5, 9, 0.34, 0.03, 0.082);
createStreetStairs(4.08, 1.91, -Math.PI * 0.5, 9, 0.34, 0.03, 0.082);

function createBeachUmbrella(theta, phi, color, yaw = 0, scale = 1) {
  const group = new THREE.Group();
  const canopyMaterial = toonMaterial({ color });

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.018, 0.52, 7),
    townWoodMaterial,
  );
  post.position.y = 0.26;
  group.add(post);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.12, 12),
    canopyMaterial,
  );
  canopy.position.y = 0.55;
  group.add(canopy);

  const canopyTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.255, 0.015, 6, 24),
    townTrimMaterial,
  );
  canopyTrim.position.y = 0.5;
  canopyTrim.rotation.x = Math.PI * 0.5;
  group.add(canopyTrim);

  const towel = new THREE.Mesh(
    roundedBox(0.32, 0.012, 0.48, 0.008),
    townSignMaterials[
      Math.abs(Math.round(theta * 10)) % townSignMaterials.length
    ],
  );
  towel.position.set(0.24, 0.012, 0.08);
  towel.rotation.y = 0.14;
  group.add(towel);

  group.scale.setScalar(scale);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.006, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.1 * scale);
  addCameraCollider(group);
}

function createBeachPier(theta, phi, yaw = 0, length = 1.25) {
  const group = new THREE.Group();
  const plankCount = 13;
  for (let index = 0; index < plankCount; index += 1) {
    const plank = new THREE.Mesh(
      roundedBox(0.52, 0.035, length / plankCount * 0.88, 0.005),
      index % 3 === 0 ? townTrimMaterial : townWoodMaterial,
    );
    plank.position.set(
      0,
      0.17,
      -length * 0.5 + ((index + 0.5) / plankCount) * length,
    );
    group.add(plank);
  }

  [-0.22, 0.22].forEach((x) => {
    [-0.46, 0, 0.46].forEach((factor) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.024, 0.34, 7),
        townWoodMaterial,
      );
      post.position.set(x, 0.04, factor * length);
      group.add(post);
    });
  });

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.01, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.24);
  addCameraCollider(group);
}

function createBeachKiosk(theta, phi, yaw = 0) {
  const group = new THREE.Group();
  const deck = new THREE.Mesh(
    roundedBox(0.58, 0.08, 0.46, 0.012),
    townWoodMaterial,
  );
  deck.position.y = 0.08;
  group.add(deck);

  const wall = new THREE.Mesh(
    roundedBox(0.42, 0.32, 0.34, 0.014),
    toonMaterial({ color: 0xe5dfc9 }),
  );
  wall.position.y = 0.28;
  group.add(wall);

  const roof = new THREE.Mesh(
    createGableRoofGeometry(0.56, 0.46, 0.16),
    townSignMaterials[2],
  );
  roof.position.y = 0.45;
  group.add(roof);

  const serviceWindow = new THREE.Mesh(
    roundedBox(0.22, 0.15, 0.018, 0.006),
    townWindowMaterial,
  );
  serviceWindow.position.set(0, 0.31, 0.18);
  group.add(serviceWindow);

  const awning = new THREE.Mesh(
    roundedBox(0.3, 0.035, 0.16, 0.008),
    townSignMaterials[0],
  );
  awning.position.set(0, 0.43, 0.24);
  awning.rotation.x = -0.15;
  group.add(awning);

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  placeOnPlanet(group, theta, phi, -0.012, yaw);
  world.add(group);
  addObstacle(theta, phi, 0.3);
  addBuildingFootprint(theta, phi, 0.3, 0.64);
  addCameraCollider(group);
}

createBeachUmbrella(-1.05, 2.07, 0xd66c59, 0.2, 0.9);
createBeachUmbrella(0.18, 2.09, 0xe2c76f, -0.1, 1);
createBeachUmbrella(1.12, 2.04, 0x4e8eaa, 0.35, 0.82);
createBeachPier(0.54, 2.18, -Math.PI * 0.5, 1.35);
createBeachKiosk(-1.62, 2.02, Math.PI * 0.44);

createBicycle(-0.92, 1.04, 0x4f8799, Math.PI * 0.5);
createBicycle(1.5, 1.54, 0xc45e52, -Math.PI * 0.5);
createDeliveryCrates(-2.3, 1.91, 0.18);
createDeliveryCrates(2.32, 1.31, -0.12);

function createTree(theta, phi, scale = 1) {
  if (isInsideRoadCorridor(theta, phi)) return;

  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035 * scale, 0.048 * scale, 0.27 * scale, 9),
    trunkMaterial,
  );
  trunk.position.y = 0.14 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageMaterial =
    foliageMaterials[
      Math.abs(Math.round((theta * 19 + phi * 23) * 10)) %
        foliageMaterials.length
    ];
  [
    [0, 0.39, 0, 0.14, 0.17, 0.13],
    [-0.085, 0.405, 0.018, 0.105, 0.135, 0.11],
    [0.085, 0.42, -0.015, 0.115, 0.145, 0.12],
    [0.005, 0.505, 0.015, 0.105, 0.13, 0.105],
  ].forEach(([x, y, z, radiusX, radiusY, radiusZ]) => {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 9),
      foliageMaterial,
    );
    crown.position.set(x * scale, y * scale, z * scale);
    crown.scale.set(radiusX * scale, radiusY * scale, radiusZ * scale);
    crown.castShadow = true;
    group.add(crown);
  });

  placeOnPlanet(
    group,
    theta,
    phi,
    -0.006 - 0.01 * scale,
    theta * 0.17,
  );
  world.add(group);
  addObstacle(theta, phi, TREE_COLLISION_RADIUS * scale);
  addCameraCollider(group);
}

[
  [-2.55, 1.22, 1.1],
  [-2.15, 1.7, 0.8],
  [-2.04, 1.04, 0.72],
  [-1.62, 1.3, 0.74],
  [-1.1, 0.84, 0.85],
  [-1.42, 1.76, 0.72],
  [-1.26, 1.08, 0.66],
  [-0.75, 1.82, 0.82],
  [-0.72, 1.34, 0.68],
  [-0.1, 1.87, 0.95],
  [0.12, 0.96, 0.78],
  [0.55, 1.35, 0.75],
  [0.78, 1.72, 0.7],
  [1.55, 0.9, 1.05],
  [1.82, 1.18, 0.84],
  [2.55, 1.35, 0.88],
  [2.9, 1.95, 0.72],
  [-2.95, 1.35, 0.76],
  [2.18, 1.92, 0.7],
  [-2.62, 0.94, 0.9],
  [-2.32, 1.48, 0.82],
  [-1.86, 0.82, 0.88],
  [-1.54, 1.7, 0.76],
  [-0.96, 1.64, 0.86],
  [-0.5, 0.88, 0.8],
  [-0.28, 1.8, 0.94],
  [0.38, 0.84, 0.86],
  [0.72, 1.9, 0.78],
  [1.14, 1.24, 0.72],
  [1.46, 1.72, 0.84],
  [2.04, 1.02, 0.92],
  [2.38, 1.86, 0.8],
  [2.74, 1.12, 0.9],
].forEach(([theta, phi, scale]) => createTree(theta, phi, scale));

function createScenicForest() {
  const placements = [];
  const treesPerCap = 220;
  const minimumActualPhi = 0.12;
  const maximumActualPhi =
    ACTUAL_CENTER_PHI + (0.38 - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE;
  const goldenFraction = 0.61803398875;

  [0, 1].forEach((hemisphere) => {
    for (let index = 0; index < treesPerCap; index += 1) {
      const progress = (index + 0.5) / treesPerCap;
      const cosPhi = THREE.MathUtils.lerp(
        Math.cos(minimumActualPhi),
        Math.cos(maximumActualPhi),
        progress,
      );
      const northernActualPhi = Math.acos(cosPhi);
      const actualPhi =
        hemisphere === 0
          ? northernActualPhi
          : Math.PI - northernActualPhi;
      const logicalPhi =
        LOGICAL_CENTER_PHI +
        (actualPhi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
      const thetaFraction =
        (index * goldenFraction +
          hemisphere * 0.37 +
          Math.sin(index * 12.9898 + hemisphere) * 0.012 +
          2) %
        1;
      placements.push({
        theta: (thetaFraction - 0.5) * LOGICAL_THETA_PERIOD,
        phi:
          logicalPhi +
          Math.sin(index * 1.81 + hemisphere * 2.7) * 0.025,
        scale:
          0.94 +
          progress * 0.12 +
          ((index * 5 + hemisphere) % 4) * 0.045,
      });
    }
  });

  const trunkGeometry = new THREE.CylinderGeometry(
    0.034,
    0.05,
    0.36,
    7,
  );
  trunkGeometry.translate(0, 0.18, 0);
  const crownGeometry = new THREE.DodecahedronGeometry(0.22, 1);
  crownGeometry.scale(0.92, 1.2, 0.88);
  crownGeometry.translate(0, 0.52, 0);

  const scenicTrunkMaterial = hideMaterialOutline(trunkMaterial.clone());
  const scenicCrownMaterial = hideMaterialOutline(treeMaterial.clone());
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    scenicTrunkMaterial,
    placements.length,
  );
  const crowns = new THREE.InstancedMesh(
    crownGeometry,
    scenicCrownMaterial,
    placements.length,
  );
  const instance = new THREE.Object3D();

  placements.forEach(({ theta, phi, scale }, index) => {
    placeOnPlanet(instance, theta, phi, -0.008, theta * 0.13);
    instance.scale.setScalar(scale);
    instance.updateMatrix();
    trunks.setMatrixAt(index, instance.matrix);
    crowns.setMatrixAt(index, instance.matrix);
  });

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  trunks.receiveShadow = true;
  crowns.castShadow = true;
  world.add(trunks, crowns);
  infillStats.scenicTrees = placements.length;
}

createScenicForest();

function createShrubCluster(theta, phi, scale = 1, materialIndex = 0) {
  if (isInsideRoadCorridor(theta, phi, 0.6)) return;

  const shrubNormal = sphericalPosition(theta, phi, 1).normalize();
  const nearObstacle = obstacles.some(
    (obstacle) =>
      shrubNormal.angleTo(obstacle.normal) * PLANET_RADIUS <
      obstacle.radius + 0.2 * scale,
  );
  if (nearObstacle) return;

  const group = new THREE.Group();
  const material =
    foliageMaterials[materialIndex % foliageMaterials.length];
  [
    [-0.12, 0.105, 0.02, 0.13, 0.11, 0.1],
    [0, 0.13, -0.015, 0.16, 0.14, 0.12],
    [0.13, 0.1, 0.025, 0.12, 0.1, 0.09],
  ].forEach(([x, y, z, width, height, depth]) => {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1, 9, 6),
      material,
    );
    crown.position.set(x * scale, y * scale, z * scale);
    crown.scale.set(width * scale, height * scale, depth * scale);
    crown.castShadow = true;
    group.add(crown);
  });

  mergeDirectMeshesByMaterial(group);
  placeOnPlanet(group, theta, phi, -0.008, theta * 0.31);
  world.add(group);
}

for (let row = 0; row < 5; row += 1) {
  for (let column = 0; column < 18; column += 1) {
    const theta = -2.92 + column * 0.34 + Math.sin(row * 2.1 + column) * 0.045;
    const phi = 0.7 + row * 0.31 + Math.cos(column * 1.7 + row) * 0.045;
    createShrubCluster(
      theta,
      phi,
      0.72 + ((row * 7 + column * 3) % 5) * 0.075,
      row + column,
    );
  }
}

for (let row = 0; row < 6; row += 1) {
  for (let column = 0; column < 42; column += 1) {
    const sequence = row * 42 + column;
    const theta =
      ROAD_LOOP_START +
      ((column + 0.18 + (row % 2) * 0.46) / 42) *
        LOGICAL_THETA_PERIOD;
    const phi =
      0.66 +
      row * 0.285 +
      Math.sin(sequence * 1.47) * 0.035;
    createShrubCluster(
      theta,
      phi,
      0.62 + (sequence % 5) * 0.055,
      sequence,
    );
  }
}

function createLake(theta, phi, scaleX, scaleZ) {
  const lift = 0.0015;
  const lakeGeometry = new THREE.CircleGeometry(0.36, 36);
  lakeGeometry.rotateX(-Math.PI / 2);
  conformGeometryToPlanet(lakeGeometry, scaleX, scaleZ, lift);
  const lake = new THREE.Mesh(lakeGeometry, waterMaterial);
  placeOnPlanet(lake, theta, phi, lift, theta * 0.5);
  lake.receiveShadow = true;
  world.add(lake);
  addObstacle(theta, phi, 0.36 * Math.max(scaleX, scaleZ));
}

createLake(-2.9, 1.52, 1.25, 0.62);
createLake(1.85, 1.9, 0.95, 0.48);
createLake(0.42, 1.25, 0.58, 0.34);

function createRock(theta, phi, scale = 1, yaw = 0, collidable = true) {
  if (isInsideRoadCorridor(theta, phi)) return;

  const group = new THREE.Group();

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.16 * scale, 1),
    rockMaterial,
  );
  rock.position.y = 0.08 * scale;
  rock.scale.set(1.25, 0.72, 0.9);
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  if (scale > 0.8) {
    const smallRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09 * scale, 1),
      rockMaterial,
    );
    smallRock.position.set(0.15 * scale, 0.05 * scale, -0.08 * scale);
    smallRock.scale.set(1, 0.62, 0.8);
    smallRock.castShadow = true;
    smallRock.receiveShadow = true;
    group.add(smallRock);
  }

  placeOnPlanet(group, theta, phi, -0.006, yaw);
  world.add(group);

  if (collidable) {
    addObstacle(theta, phi, ROCK_COLLISION_RADIUS * scale);
  }
  addCameraCollider(group);
}

[
  [-2.38, 0.74, 0.85, 0.1, false],
  [-1.82, 0.68, 0.74, -0.2, false],
  [-0.62, 0.64, 0.78, 0.4, false],
  [0.55, 0.63, 0.72, -0.3, false],
  [1.45, 0.68, 0.8, 0.35, false],
  [2.45, 0.76, 0.75, -0.1, false],
  [-2.72, 2.08, 0.74, 0.2, false],
  [-1.4, 2.11, 0.82, -0.45, false],
  [0.1, 2.08, 0.72, 0.24, false],
  [1.38, 2.1, 0.84, -0.2, false],
  [2.55, 2.07, 0.76, 0.4, false],
  [-0.86, 1.06, 0.68, 0.2, true],
  [0.98, 1.52, 0.72, -0.25, true],
  [2.18, 1.22, 0.66, 0.45, true],
  [-2.46, 1.62, 0.62, -0.35, true],
].forEach(([theta, phi, scale, yaw, collidable]) => {
  createRock(theta, phi, scale, yaw, collidable);
});

function createFlower(theta, phi, materialIndex = 0, scale = 1) {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012 * scale, 0.016 * scale, 0.12 * scale, 5),
    treeMaterial,
  );
  stem.position.y = 0.07 * scale;
  group.add(stem);

  const bloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.045 * scale, 8, 8),
    flowerMaterials[materialIndex % flowerMaterials.length],
  );
  bloom.position.y = 0.15 * scale;
  bloom.castShadow = true;
  group.add(bloom);

  placeOnPlanet(group, theta, phi, -0.004 - 0.01 * scale);
  world.add(group);
}

[
  [-2.3, 1.06, 0, 1],
  [-1.72, 1.72, 1, 0.9],
  [-0.82, 1.18, 2, 0.85],
  [-0.2, 1.55, 0, 0.8],
  [0.48, 1.82, 3, 0.9],
  [1.08, 0.92, 1, 0.75],
  [1.7, 1.28, 2, 0.85],
  [2.34, 1.68, 0, 0.8],
  [2.95, 1.3, 1, 0.72],
  [-2.82, 1.88, 3, 0.75],
].forEach(([theta, phi, materialIndex, scale]) => {
  createFlower(theta, phi, materialIndex, scale);
});

function createCloud(theta, phi, lift, scale = 1) {
  const group = new THREE.Group();
  [
    [-0.16, 0.02, 0, 0.16],
    [0, 0.05, 0.02, 0.22],
    [0.18, 0.02, 0, 0.15],
    [0.05, 0, -0.08, 0.13],
  ].forEach(([x, y, z, radius]) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(radius * scale, 12, 10),
      cloudMaterial,
    );
    puff.position.set(x * scale, y * scale, z * scale);
    group.add(puff);
  });
  placeOnPlanet(group, theta, phi, lift);
  world.add(group);
  driftingClouds.push({
    group,
    theta,
    basePhi: phi,
    lift,
    speed: 0.014 + (Math.abs(Math.round(theta * 10)) % 5) * 0.002,
    phase: theta * 1.7 + phi,
  });
}

createCloud(-2.5, 0.64, 3.4, 1.6);
createCloud(-1.15, 0.72, 3.8, 1.45);
createCloud(0.45, 0.66, 4.1, 1.7);
createCloud(1.82, 0.78, 3.5, 1.4);
createCloud(2.8, 1.03, 3.7, 1.55);
createCloud(-2.75, 1.7, 3.2, 1.35);
createCloud(0.92, 1.86, 3.9, 1.5);

function createRider() {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  const body = new THREE.Group();
  root.add(visual);
  visual.add(body);
  body.position.y = 0.04;

  const coatMaterial = toonMaterial({
    color: 0xf0eee2,
    roughness: 0.76,
    metalness: 0,
  });
  const coatTrimMaterial = toonMaterial({
    color: 0x52b9ae,
    roughness: 0.8,
    metalness: 0,
  });
  const shortsMaterial = toonMaterial({
    color: 0x31565e,
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
    color: 0xf0c3a0,
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
    color: 0xb64e47,
    roughness: 0.76,
    metalness: 0,
  });
  const bagFlapMaterial = toonMaterial({
    color: 0x823d3b,
    roughness: 0.78,
    metalness: 0,
  });
  const scarfMaterial = toonMaterial({
    color: 0x52b9ae,
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
      capsule(upperLength, 0.034, 6, 12),
      skinMaterial,
    );
    upperLeg.position.y = -upperLength * 0.5;
    hip.add(upperLeg);

    const lowerLeg = new THREE.Mesh(
      capsule(lowerLength, 0.031, 6, 12),
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
      capsule(upperLength, 0.038, 6, 12),
      coatMaterial,
    );
    upperSleeve.position.y = -upperLength * 0.5;
    shoulder.add(upperSleeve);

    const lowerSleeve = new THREE.Mesh(
      capsule(lowerLength, 0.034, 6, 12),
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
  headGroup.position.y = 0.8;
  headGroup.scale.setScalar(0.7);
  body.add(headGroup);

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
  root.userData.body = body;
  root.userData.hips = hips;
  root.userData.bag = bag;
  root.userData.coatHem = coatHem;
  root.userData.headGroup = headGroup;
  root.userData.scarfTails = scarfTails;
  root.userData.leftLeg = leftLeg;
  root.userData.rightLeg = rightLeg;
  root.userData.leftArm = leftArm;
  root.userData.rightArm = rightArm;
  world.add(root);
  return root;
}

const riderMesh = createRider();
riderMesh.scale.setScalar(RIDER_SCALE);

function updateRiderTransform() {
  const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
  const position = sphericalPosition(
    rider.theta,
    rider.phi,
    PLANET_RADIUS + GROUND_EPSILON + 0.0025,
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
  const travelMotion = THREE.MathUtils.clamp(
    Math.abs(rider.speed) / WALK_SPEED,
    0,
    1,
  );
  const pivotMotion =
    THREE.MathUtils.clamp(Math.abs(rider.turn) * 0.55, 0, 0.55) *
    (1 - travelMotion * 0.5);
  const motion = Math.max(travelMotion, pivotMotion);
  if (motion > 0.02) {
    rider.walkPhase +=
      (Math.abs(rider.speed) * 9 + Math.abs(rider.turn) * 2.6) * delta;
  }

  const phaseSin = Math.sin(rider.walkPhase);
  const phaseCos = Math.cos(rider.walkPhase);
  const direction = rider.speed < -0.02 ? -1 : 1;
  const stride = phaseSin * 0.58 * motion * direction;
  const leftKneeBend = -Math.max(0, -phaseSin) * 0.92 * motion;
  const rightKneeBend = -Math.max(0, phaseSin) * 0.92 * motion;
  const armStride = -stride * 0.82;
  const animationDamping = motion > 0.02 ? 16 : 10;
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
  } = riderMesh.userData;

  leftLeg.hip.position.y = THREE.MathUtils.damp(
    leftLeg.hip.position.y,
    0.375 + Math.max(0, -phaseSin) * 0.014 * motion,
    animationDamping,
    delta,
  );
  rightLeg.hip.position.y = THREE.MathUtils.damp(
    rightLeg.hip.position.y,
    0.375 + Math.max(0, phaseSin) * 0.014 * motion,
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
    -stride - leftKneeBend * 0.72,
    animationDamping,
    delta,
  );
  rightLeg.foot.rotation.z = THREE.MathUtils.damp(
    rightLeg.foot.rotation.z,
    stride - rightKneeBend * 0.72,
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
    0.2 + Math.max(0, phaseSin) * 0.28 * motion,
    animationDamping,
    delta,
  );
  rightArm.elbow.rotation.z = THREE.MathUtils.damp(
    rightArm.elbow.rotation.z,
    0.24 + Math.max(0, -phaseSin) * 0.24 * motion,
    animationDamping,
    delta,
  );

  const walkBob = Math.cos(rider.walkPhase * 2) * 0.012 * motion;
  const idleBob = Math.sin(elapsed * 2.1) * 0.0035 * (1 - motion);
  visual.position.y = THREE.MathUtils.damp(
    visual.position.y,
    walkBob + idleBob,
    14,
    delta,
  );
  visual.position.z = THREE.MathUtils.damp(
    visual.position.z,
    phaseCos * 0.012 * motion,
    14,
    delta,
  );
  visual.rotation.x = THREE.MathUtils.damp(
    visual.rotation.x,
    -rider.turn * 0.05 * motion + phaseCos * 0.018 * motion,
    14,
    delta,
  );
  body.rotation.z = THREE.MathUtils.damp(
    body.rotation.z,
    -0.1 * travelMotion +
      Math.sin(elapsed * 1.4) * 0.012 * (1 - motion),
    11,
    delta,
  );
  body.rotation.x = THREE.MathUtils.damp(
    body.rotation.x,
    rider.turn * 0.11 * motion,
    12,
    delta,
  );
  body.rotation.y = THREE.MathUtils.damp(
    body.rotation.y,
    -phaseSin * 0.075 * motion,
    14,
    delta,
  );
  hips.rotation.x = THREE.MathUtils.damp(
    hips.rotation.x,
    -phaseCos * 0.06 * motion,
    14,
    delta,
  );
  hips.rotation.y = THREE.MathUtils.damp(
    hips.rotation.y,
    phaseSin * 0.1 * motion,
    14,
    delta,
  );
  bag.rotation.z = THREE.MathUtils.damp(
    bag.rotation.z,
    phaseSin * 0.09 * motion - rider.turn * 0.025 * motion,
    10,
    delta,
  );
  coatHem.rotation.y = THREE.MathUtils.damp(
    coatHem.rotation.y,
    -phaseSin * 0.09 * motion,
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
    0.8 +
      Math.sin(rider.walkPhase * 2) * 0.004 * motion +
      Math.sin(elapsed * 1.7) * 0.002 * (1 - motion),
    12,
    delta,
  );
  headGroup.rotation.z = THREE.MathUtils.damp(
    headGroup.rotation.z,
    0.045 * motion -
      phaseCos * 0.018 * motion +
      Math.sin(elapsed * 1.3) * 0.018 * (1 - motion),
    11,
    delta,
  );
  headGroup.rotation.x = THREE.MathUtils.damp(
    headGroup.rotation.x,
    -rider.turn * 0.055 * motion +
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
}

function getHeadingTangent(heading = rider.heading) {
  const { east, north } = surfaceFrame(rider.theta, rider.phi);
  return tempVector
    .copy(east)
    .multiplyScalar(Math.cos(heading))
    .addScaledVector(north, Math.sin(heading))
    .normalize();
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function headingTowardStop(stopIndex) {
  const stop = stops[stopIndex];
  const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
  const targetPosition = sphericalPosition(stop.theta, stop.phi, 1);
  const origin = sphericalPosition(rider.theta, rider.phi, 1);
  const tangentToTarget = tempVector3.copy(targetPosition).sub(origin);
  tangentToTarget.addScaledVector(normal, -tangentToTarget.dot(normal));

  if (tangentToTarget.lengthSq() < 0.0001) return rider.heading;

  tangentToTarget.normalize();
  return Math.atan2(tangentToTarget.dot(north), tangentToTarget.dot(east));
}

function getMovementInput() {
  const keyboardX =
    Number(keys.has("ArrowRight") || keys.has("KeyD")) -
    Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  const keyboardY =
    Number(keys.has("ArrowUp") || keys.has("KeyW")) -
    Number(keys.has("ArrowDown") || keys.has("KeyS"));
  const x = THREE.MathUtils.clamp(touchState.analogX + keyboardX, -1, 1);
  const y = THREE.MathUtils.clamp(-touchState.analogY + keyboardY, -1, 1);
  const magnitude = Math.min(1, Math.hypot(x, y));

  if (magnitude < DEADZONE) {
    return { x: 0, y: 0, magnitude: 0, active: false };
  }

  const scaledMagnitude = (magnitude - DEADZONE) / (1 - DEADZONE);
  const inputScale = scaledMagnitude / magnitude;

  return {
    x: x * inputScale,
    y: y * inputScale,
    magnitude: scaledMagnitude,
    active: true,
  };
}

function applyDirectMovement(input, delta) {
  const brake = keys.has("Space") || touchState.brake;
  if (!input.active || brake) {
    rider.turn = THREE.MathUtils.damp(
      rider.turn,
      0,
      brake ? 14 : 8,
      delta,
    );
    rider.speed = THREE.MathUtils.damp(
      rider.speed,
      0,
      brake ? 14 : 6.5,
      delta,
    );
    return;
  }

  const lateralIntent = THREE.MathUtils.clamp(input.x, -1, 1);
  const forwardIntent = THREE.MathUtils.clamp(input.y, -1, 1);
  const steer =
    -Math.sign(lateralIntent) * Math.pow(Math.abs(lateralIntent), 1.12);
  const moveStrength = THREE.MathUtils.clamp(
    Math.abs(forwardIntent) * 1.15,
    0,
    1,
  );
  const pivoting = moveStrength < 0.12 && Math.abs(steer) > 0.08;
  const speedRatio = THREE.MathUtils.clamp(
    Math.abs(rider.speed) / WALK_SPEED,
    0,
    1,
  );
  const steerPower = pivoting
    ? 0.92
    : 0.6 + moveStrength * 0.14 + speedRatio * 0.16;
  const reversing = forwardIntent < -0.08;
  const targetSpeed =
    (pivoting ? 0 : moveStrength) *
    (reversing ? -REVERSE_WALK_SPEED : WALK_SPEED);
  const speedResponse =
    Math.abs(targetSpeed) > Math.abs(rider.speed) ? 5.2 : 7.2;

  rider.turn = THREE.MathUtils.damp(rider.turn, steer, 10, delta);
  rider.heading += rider.turn * TURN_SPEED * steerPower * delta;
  rider.speed = THREE.MathUtils.damp(
    rider.speed,
    targetSpeed,
    speedResponse,
    delta,
  );
}

function angularDistance(aTheta, aPhi, bTheta, bPhi) {
  const a = sphericalPosition(aTheta, aPhi, 1);
  const b = sphericalPosition(bTheta, bPhi, 1);
  return a.angleTo(b);
}

function updateTargetMarker() {
  stops.forEach((stop, index) => {
    stop.marker.visible = index === gameState.targetIndex && gameState.started && !gameState.complete;
  });
  targetNode.textContent = gameState.complete ? "All Delivered" : stops[gameState.targetIndex].name;
}

function updateHud() {
  lettersNode.textContent = `${gameState.deliveries}/${stops.length}`;
  timeNode.textContent = `${Math.ceil(Math.max(0, gameState.timeLeft))}`;
  streakNode.textContent = `${gameState.streak}`;
}

function showMessage(title, body, button) {
  message.classList.remove("title-screen");
  message.querySelector("h1").textContent = title;
  message.querySelector("p").textContent = body;
  startButton.textContent = button;
  message.classList.remove("hidden");
}

function hideMessage() {
  message.classList.add("hidden");
}

function resetGame() {
  app.classList.remove("not-started");
  gameState.started = true;
  gameState.complete = false;
  gameState.timeLeft = ROUND_TIME;
  gameState.deliveries = 0;
  gameState.streak = 0;
  gameState.targetIndex = 0;

  rider.theta = -1.35;
  rider.phi = 1.14;
  rider.heading = headingTowardStop(gameState.targetIndex);
  rider.speed = 0;
  rider.turn = 0;
  rider.walkPhase = 0;
  cameraRig.followHeading = rider.heading;
  scene.fog.near = 11;
  scene.fog.far = 38;
  resetAnalog();
  updateRiderTransform();
  snapCameraToDesired();

  hideMessage();
  updateTargetMarker();
  updateHud();
}

function completeGame() {
  gameState.started = false;
  gameState.complete = true;
  resetAnalog();
  updateTargetMarker();
  showMessage(
    "Route Complete",
    `All letters delivered with ${Math.ceil(gameState.timeLeft)} seconds left.`,
    "Walk Again",
  );
}

function failGame() {
  gameState.started = false;
  gameState.complete = false;
  resetAnalog();
  showMessage(
    "Dusk Arrived",
    `${gameState.deliveries} letters made it home. Try a cleaner route.`,
    "Retry Route",
  );
}

function deliverIfReady() {
  const target = stops[gameState.targetIndex];
  const distance = angularDistance(rider.theta, rider.phi, target.theta, target.phi) * PLANET_RADIUS;

  target.marker.scale.setScalar(1 + Math.sin(performance.now() * 0.008) * 0.08);

  if (distance <= DELIVERY_DISTANCE && gameState.started) {
    gameState.deliveries += 1;
    gameState.streak += 1;
    gameState.timeLeft = Math.min(ROUND_TIME, gameState.timeLeft + 5);
    gameState.targetIndex += 1;

    if (gameState.targetIndex >= stops.length) {
      updateHud();
      completeGame();
      return;
    }

    updateTargetMarker();
    updateHud();
  }
}

function wrapRiderTheta() {
  const halfPeriod = LOGICAL_THETA_PERIOD * 0.5;
  if (rider.theta > halfPeriod) rider.theta -= LOGICAL_THETA_PERIOD;
  if (rider.theta < -halfPeriod) rider.theta += LOGICAL_THETA_PERIOD;
}

function clampSurfacePointToPlayable(surfacePoint) {
  tempSpherical.setFromVector3(surfacePoint.normalize());
  const logicalPhi =
    LOGICAL_CENTER_PHI +
    (tempSpherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
  const clampedLogicalPhi = THREE.MathUtils.clamp(
    logicalPhi,
    PLAYABLE_MIN_PHI,
    PLAYABLE_MAX_PHI,
  );

  if (Math.abs(clampedLogicalPhi - logicalPhi) < 0.0001) {
    return false;
  }

  const clampedActualPhi =
    ACTUAL_CENTER_PHI +
    (clampedLogicalPhi - LOGICAL_CENTER_PHI) * TOWN_CURVE_SCALE;
  surfacePoint
    .setFromSphericalCoords(1, clampedActualPhi, tempSpherical.theta)
    .normalize();
  return true;
}

function setHeadingFromTangent(tangent) {
  const { normal, east, north } = surfaceFrame(rider.theta, rider.phi);
  const projected = tempVector2.copy(tangent).addScaledVector(normal, -tangent.dot(normal));

  if (projected.lengthSq() < 0.000001) return;

  projected.normalize();
  rider.heading = Math.atan2(projected.dot(north), projected.dot(east));
}

function setRiderFromSurfacePoint(surfacePoint) {
  const hitBoundary = clampSurfacePointToPlayable(surfacePoint);
  tempSpherical.setFromVector3(surfacePoint);
  rider.theta = tempSpherical.theta / TOWN_CURVE_SCALE;
  rider.phi =
    LOGICAL_CENTER_PHI +
    (tempSpherical.phi - ACTUAL_CENTER_PHI) / TOWN_CURVE_SCALE;
  wrapRiderTheta();
  return hitBoundary;
}

function resolveObstacleCollisions(previousTheta, previousPhi) {
  const surfacePoint = tempVector3
    .copy(sphericalPosition(rider.theta, rider.phi, 1))
    .normalize();
  const previousPoint = tempVector4
    .copy(sphericalPosition(previousTheta, previousPhi, 1))
    .normalize();
  let collided = false;

  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;

    obstacles.forEach((obstacle) => {
      const minAngle = (obstacle.radius + RIDER_COLLISION_RADIUS) / PLANET_RADIUS;
      const angle = surfacePoint.angleTo(obstacle.normal);

      if (angle >= minAngle) return;

      const pushDirection = tempVector5
        .copy(surfacePoint)
        .addScaledVector(obstacle.normal, -surfacePoint.dot(obstacle.normal));

      if (pushDirection.lengthSq() < 0.000001) {
        pushDirection
          .copy(surfacePoint)
          .sub(previousPoint)
          .addScaledVector(obstacle.normal, -pushDirection.dot(obstacle.normal));
      }

      if (pushDirection.lengthSq() < 0.000001) {
        pushDirection.copy(surfaceFrame(obstacle.theta, obstacle.phi).east);
      }

      pushDirection.normalize();
      surfacePoint
        .copy(obstacle.normal)
        .multiplyScalar(Math.cos(minAngle))
        .addScaledVector(pushDirection, Math.sin(minAngle))
        .normalize();
      changed = true;
      collided = true;
    });

    if (!changed) break;
  }

  if (collided) {
    setRiderFromSurfacePoint(surfacePoint);
  }

  return collided;
}

function stepRider(delta) {
  const linearMovement = rider.speed * delta;

  if (Math.abs(linearMovement) > 0.000001) {
    const substeps = Math.max(1, Math.ceil(Math.abs(linearMovement) / 0.08));
    const stepDistance = linearMovement / substeps;

    for (let step = 0; step < substeps; step += 1) {
      const previousTheta = rider.theta;
      const previousPhi = rider.phi;
      const angularStep = stepDistance / PLANET_RADIUS;
      const startPoint = tempVector3
        .copy(sphericalPosition(rider.theta, rider.phi, 1))
        .normalize();
      const { east, north } = surfaceFrame(rider.theta, rider.phi);
      const tangent = tempVector
        .copy(east)
        .multiplyScalar(Math.cos(rider.heading))
        .addScaledVector(north, Math.sin(rider.heading))
        .normalize();
      const nextPoint = tempVector4
        .copy(startPoint)
        .multiplyScalar(Math.cos(angularStep))
        .addScaledVector(tangent, Math.sin(angularStep))
        .normalize();
      const hitBoundary = setRiderFromSurfacePoint(nextPoint);
      const transportedHeading = tempVector5
        .copy(tangent)
        .addScaledVector(nextPoint, -tangent.dot(nextPoint));

      setHeadingFromTangent(transportedHeading);

      if (hitBoundary) {
        rider.speed *= 0.18;
        break;
      }

      if (resolveObstacleCollisions(previousTheta, previousPhi)) {
        break;
      }
    }
  } else {
    const currentPoint = tempVector3
      .copy(sphericalPosition(rider.theta, rider.phi, 1))
      .normalize();
    if (setRiderFromSurfacePoint(currentPoint)) {
      rider.speed = 0;
    }
  }
}

const clock = new THREE.Clock();

function setDesiredCameraFrame(desiredPosition, desiredTarget, elapsed = clock.elapsedTime) {
  const width = window.innerWidth;
  const isMobile = width < 700;

  if (gameState.started) {
    const { normal } = surfaceFrame(rider.theta, rider.phi);
    const tangentHeading = getHeadingTangent(cameraRig.followHeading);
    const side = tempVector5.crossVectors(normal, tangentHeading).normalize();
    const distance = isMobile ? 1.28 : cameraRig.playDistance;
    const height = isMobile ? 0.54 : cameraRig.playHeight;
    const forwardOffset = isMobile ? 0.48 : cameraRig.playForwardOffset;
    const sideOffset = cameraRig.playSideOffset;

    desiredTarget
      .copy(riderMesh.position)
      .addScaledVector(normal, isMobile ? 0.21 : 0.25)
      .addScaledVector(tangentHeading, forwardOffset);
    desiredPosition
      .copy(riderMesh.position)
      .addScaledVector(normal, height)
      .addScaledVector(tangentHeading, -distance)
      .addScaledVector(side, sideOffset);
    cameraRig.desiredUp.copy(normal);

    cameraAnchor.copy(riderMesh.position).addScaledVector(normal, 0.16);
    let nearestLargeObstacle = null;
    let nearestLargeObstacleDistance = Infinity;
    obstacles.forEach((obstacle) => {
      if (obstacle.radius < 0.2) return;
      const obstacleDistance =
        normal.angleTo(obstacle.normal) * PLANET_RADIUS;
      if (
        obstacleDistance < obstacle.radius + 0.34 &&
        obstacleDistance < nearestLargeObstacleDistance
      ) {
        nearestLargeObstacle = obstacle;
        nearestLargeObstacleDistance = obstacleDistance;
      }
    });

    if (nearestLargeObstacle) {
      const awayFromObstacle = tempVector2
        .copy(normal)
        .sub(nearestLargeObstacle.normal);
      awayFromObstacle.addScaledVector(
        normal,
        -awayFromObstacle.dot(normal),
      );
      if (awayFromObstacle.lengthSq() < 0.000001) {
        awayFromObstacle.copy(side);
      } else {
        awayFromObstacle.normalize();
      }
      desiredTarget
        .copy(riderMesh.position)
        .addScaledVector(normal, isMobile ? 0.2 : 0.23)
        .addScaledVector(tangentHeading, isMobile ? 0.08 : 0.16);
      desiredPosition
        .copy(riderMesh.position)
        .addScaledVector(normal, height + (isMobile ? 0.26 : 0.2))
        .addScaledVector(awayFromObstacle, isMobile ? 1.02 : 0.86);
    } else {
      const cameraDirection = tempVector2
        .copy(desiredPosition)
        .sub(cameraAnchor);
      const cameraDistance = cameraDirection.length();
      cameraDirection.normalize();
      cameraRaycaster.set(cameraAnchor, cameraDirection);
      cameraRaycaster.near = 0.08;
      cameraRaycaster.far = cameraDistance;
      const obstruction = cameraRaycaster.intersectObjects(
        cameraCollisionMeshes,
        true,
      )[0];

      if (obstruction) {
        desiredPosition
          .copy(riderMesh.position)
          .addScaledVector(normal, height + (isMobile ? 0.26 : 0.2))
          .addScaledVector(tangentHeading, -distance * 0.24)
          .addScaledVector(side, sideOffset * 0.18);

        const fallbackDirection = tempVector2
          .copy(desiredPosition)
          .sub(cameraAnchor);
        const fallbackDistance = fallbackDirection.length();
        fallbackDirection.normalize();
        cameraRaycaster.set(cameraAnchor, fallbackDirection);
        cameraRaycaster.near = 0.06;
        cameraRaycaster.far = fallbackDistance;
        const fallbackObstruction = cameraRaycaster.intersectObjects(
          cameraCollisionMeshes,
          true,
        )[0];

        if (fallbackObstruction) {
          desiredPosition
            .copy(riderMesh.position)
            .addScaledVector(normal, height + (isMobile ? 0.58 : 0.48))
            .addScaledVector(tangentHeading, -distance * 0.08);
        }
      }
    }
  } else {
    const overviewTheta = -0.18;
    const overviewPhi = 1.36;
    const { normal, east, north } = surfaceFrame(
      overviewTheta,
      overviewPhi,
    );
    const drift = Math.sin(elapsed * 0.25) * 0.34;
    const centerDistance = window.innerWidth < 700 ? 88 : 64;
    desiredTarget.set(0, 0, 0);
    desiredPosition
      .copy(normal)
      .multiplyScalar(centerDistance)
      .addScaledVector(north, centerDistance * 0.13)
      .addScaledVector(east, drift)
      .setLength(centerDistance);
    cameraRig.desiredUp.copy(north);
  }
}

function snapCameraToDesired() {
  setDesiredCameraFrame(cameraRig.currentPosition, cameraRig.currentTarget);
  cameraRig.currentUp.copy(cameraRig.desiredUp);
  camera.up.copy(cameraRig.currentUp);
  camera.position.copy(cameraRig.currentPosition);
  camera.lookAt(cameraRig.currentTarget);
}

function updateCamera(delta, elapsed) {
  const desiredPosition = tempVector3;
  const desiredTarget = tempVector4;

  if (gameState.started) {
    const turnAlpha = 1 - Math.exp(-cameraRig.turnFollowSpeed * delta);
    cameraRig.followHeading +=
      shortestAngleDelta(cameraRig.followHeading, rider.heading) * turnAlpha;
  }

  setDesiredCameraFrame(desiredPosition, desiredTarget, elapsed);

  const smoothness = gameState.started ? 8.5 : 3.4;
  const alpha = 1 - Math.exp(-smoothness * delta);
  scene.fog.near = THREE.MathUtils.damp(
    scene.fog.near,
    gameState.started ? 11 : 65,
    gameState.started ? 10 : 2.5,
    delta,
  );
  scene.fog.far = THREE.MathUtils.damp(
    scene.fog.far,
    gameState.started ? 38 : 125,
    gameState.started ? 10 : 2.5,
    delta,
  );
  cameraRig.currentPosition.lerp(desiredPosition, alpha);
  cameraRig.currentTarget.lerp(desiredTarget, alpha);

  if (gameState.started) {
    const currentDirection = tempVector2
      .copy(cameraRig.currentPosition)
      .sub(cameraAnchor);
    const currentDistance = currentDirection.length();
    currentDirection.normalize();
    cameraRaycaster.set(cameraAnchor, currentDirection);
    cameraRaycaster.near = 0.08;
    cameraRaycaster.far = currentDistance;
    const currentObstruction = cameraRaycaster.intersectObjects(
      cameraCollisionMeshes,
      true,
    )[0];

    if (currentObstruction) {
      cameraRig.currentPosition.lerp(
        desiredPosition,
        Math.min(1, alpha * 2.5),
      );
    }
  }

  if (cameraRig.currentUp.dot(cameraRig.desiredUp) < 0.05) {
    cameraRig.currentUp.copy(cameraRig.desiredUp);
  } else {
    cameraRig.currentUp.lerp(cameraRig.desiredUp, alpha).normalize();
  }
  camera.up.copy(cameraRig.currentUp);
  camera.position.copy(cameraRig.currentPosition);
  camera.lookAt(cameraRig.currentTarget);
}

function animate() {
  requestAnimationFrame(animate);

  // Collision movement is substepped, so a wider cap keeps controls responsive
  // on lower-powered devices without allowing large jumps after a paused tab.
  const delta = Math.min(clock.getDelta(), 0.08);
  const elapsed = clock.elapsedTime;

  paintedSkyMaterial.map.offset.x = (elapsed * 0.006) % 1;
  driftingClouds.forEach((cloud) => {
    cloud.theta += cloud.speed * delta;
    if (cloud.theta > LOGICAL_THETA_PERIOD * 0.5) {
      cloud.theta -= LOGICAL_THETA_PERIOD;
    }
    const cloudPhi =
      cloud.basePhi + Math.sin(elapsed * 0.1 + cloud.phase) * 0.018;
    placeOnPlanet(
      cloud.group,
      cloud.theta,
      cloudPhi,
      cloud.lift,
      cloud.theta * 0.08,
    );
  });

  if (gameState.started) {
    applyDirectMovement(getMovementInput(), delta);
    stepRider(delta);

    gameState.timeLeft -= delta;
    if (gameState.timeLeft <= 0) {
      gameState.timeLeft = 0;
      updateHud();
      failGame();
    } else {
      deliverIfReady();
      updateHud();
    }
  } else {
    rider.heading += Math.sin(elapsed * 0.7) * 0.002;
    rider.speed = THREE.MathUtils.damp(rider.speed, 0, 4, delta);
  }

  updateRiderTransform();
  updateRiderAnimation(delta, elapsed);
  updateCamera(delta, elapsed);

  outlinePlanet.rotation.copy(planet.rotation);
  stops.forEach((stop, index) => {
    const targetPulse = index === gameState.targetIndex && gameState.started ? 1.08 : 1;
    stop.group.scale.setScalar(stop.baseScale * targetPulse);
  });

  if (gameState.started) {
    outlineEffect.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;

  if (width < 700) {
    camera.fov = 53;
    cameraRig.overviewPosition.set(0, 10.2, 18.5);
    cameraRig.playSideOffset = -0.1;
  } else {
    camera.fov = 49;
    cameraRig.overviewPosition.set(0, 8.6, 15);
    cameraRig.playSideOffset = -0.16;
  }

  paintedSky.scale.set(camera.aspect * 10, 10, 1);
  camera.updateProjectionMatrix();
}

function resetAnalog(event) {
  if (
    event &&
    touchState.analogPointerId !== null &&
    event.pointerId !== touchState.analogPointerId
  ) {
    return;
  }

  touchState.analogX = 0;
  touchState.analogY = 0;
  touchState.analogPointerId = null;
  analog.classList.remove("active");
  analogStick.style.setProperty("--analog-x", "0px");
  analogStick.style.setProperty("--analog-y", "0px");
}

function updateAnalog(event) {
  const rect = analog.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) * 0.34;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);

  if (distance > radius) {
    dx = (dx / distance) * radius;
    dy = (dy / distance) * radius;
  }

  touchState.analogX = THREE.MathUtils.clamp(dx / radius, -1, 1);
  touchState.analogY = THREE.MathUtils.clamp(dy / radius, -1, 1);
  analogStick.style.setProperty("--analog-x", `${dx}px`);
  analogStick.style.setProperty("--analog-y", `${dy}px`);
}

function bindAnalog() {
  canvas.addEventListener("pointerdown", (event) => {
    if (
      !gameState.started ||
      touchState.analogPointerId !== null ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();
    touchState.analogPointerId = event.pointerId;
    analog.style.left = `${event.clientX}px`;
    analog.style.top = `${event.clientY}px`;
    analog.classList.add("active");
    canvas.setPointerCapture(event.pointerId);
    updateAnalog(event);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== touchState.analogPointerId) return;
    event.preventDefault();
    updateAnalog(event);
  });

  canvas.addEventListener("pointerup", resetAnalog);
  canvas.addEventListener("pointercancel", resetAnalog);
  canvas.addEventListener("lostpointercapture", resetAnalog);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}

function bindBrakeButton() {
  const setBrake = (value) => {
    touchState.brake = value;
  };

  brakeButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    brakeButton.setPointerCapture(event.pointerId);
    setBrake(true);
  });
  brakeButton.addEventListener("pointerup", () => setBrake(false));
  brakeButton.addEventListener("pointercancel", () => setBrake(false));
  brakeButton.addEventListener("lostpointercapture", () => setBrake(false));
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", () => {
  resetAnalog();
  resize();
});
startButton.addEventListener("click", resetGame);

Object.defineProperty(window, "__tinyMessengerState", {
  configurable: true,
  get: () => ({
    started: gameState.started,
    deliveries: gameState.deliveries,
    targetIndex: gameState.targetIndex,
    rider: {
      theta: rider.theta,
      phi: rider.phi,
      heading: rider.heading,
      speed: rider.speed,
      turn: rider.turn,
    },
    camera: {
      position: camera.position.toArray(),
      target: cameraRig.currentTarget.toArray(),
      up: camera.up.toArray(),
      followHeading: cameraRig.followHeading,
    },
    render: {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    },
    environment: {
      skyOffset: paintedSkyMaterial.map.offset.x,
      cloudThetas: driftingClouds.map((cloud) => cloud.theta),
      infill: { ...infillStats },
      latitudeRoadCount: latitudeRoads.length,
      meridianRoadCount: meridianRoads.length,
      minimumWireRoofClearance:
        wireRoofClearances.length > 0
          ? Math.min(...wireRoofClearances)
          : null,
    },
    obstacleCount: obstacles.length,
    minimumRoadGap: Math.min(
      ...obstacles.map(
        (obstacle) =>
          distanceToNearestRoad(obstacle.theta, obstacle.phi) -
          obstacle.radius -
          RIDER_COLLISION_RADIUS,
      ),
    ),
  }),
});

Object.defineProperty(window, "__tinyMessengerTeleport", {
  configurable: true,
  value: (theta, phi, heading = rider.heading) => {
    rider.theta = theta;
    rider.phi = THREE.MathUtils.clamp(
      phi,
      PLAYABLE_MIN_PHI,
      PLAYABLE_MAX_PHI,
    );
    rider.heading = heading;
    rider.speed = 0;
    rider.turn = 0;
    cameraRig.followHeading = heading;
    updateRiderTransform();
    snapCameraToDesired();
    return window.__tinyMessengerState;
  },
});

bindAnalog();
bindBrakeButton();

updateRiderTransform();
updateTargetMarker();
updateHud();
resize();
animate();
