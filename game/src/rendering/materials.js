import * as THREE from "three";

export const toonGradient = new THREE.DataTexture(
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

export function toonMaterial(parameters = {}) {
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

export function hideMaterialOutline(material) {
  material.userData.outlineParameters = { visible: false };
  return material;
}

const facadeMaterialCache = new Map();

export function getFacadeDetailMaterial(style, variant) {
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

  const shopLabels = [
    "WARUNG",
    "TOKO",
    "KOPI",
    "BENGKEL",
    "APOTEK",
    "KELONTONG",
  ];
  if (style === 1 || style === 5 || variant % 3 === 0) {
    const label = shopLabels[variant % shopLabels.length];
    context.fillStyle =
      variant % 2 === 0
        ? "rgba(54, 125, 143, 0.92)"
        : "rgba(187, 83, 67, 0.9)";
    context.fillRect(36, 304, 184, 38);
    context.strokeStyle = "rgba(38, 61, 61, 0.7)";
    context.lineWidth = 4;
    context.strokeRect(36, 304, 184, 38);
    context.fillStyle = "#f5ead2";
    context.font = "900 25px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 128, 324);
  }

  if (variant % 4 === 1) {
    context.fillStyle = "rgba(49, 75, 72, 0.32)";
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        context.fillRect(82 + column * 20, 56 + row * 18, 11, 8);
      }
    }
  }

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
