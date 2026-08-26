import * as THREE from "three";

export function createPaintedSkyTexture() {
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

export function createPaintedGroundTexture() {
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = 768;
  groundCanvas.height = 384;
  const context = groundCanvas.getContext("2d");
  context.fillStyle = "#a8b780";
  context.fillRect(0, 0, groundCanvas.width, groundCanvas.height);

  const washes = [
    ["rgba(77, 132, 83, 0.28)", 94, 68],
    ["rgba(200, 186, 105, 0.24)", 142, 82],
    ["rgba(72, 114, 71, 0.16)", 76, 48],
    ["rgba(225, 204, 126, 0.18)", 118, 60],
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
