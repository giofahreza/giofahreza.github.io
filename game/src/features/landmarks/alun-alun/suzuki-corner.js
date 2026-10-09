import * as THREE from "three";
import {
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../../rendering/geometry.js";
import { toonMaterial } from "../../../rendering/materials.js";

// OSM building 50, checked against Google Street View panorama
// L139DDJA3qEuqHCUkm1Szg at 230–250°. Local coordinates are north/east in
// five-metre units, matching the rest of the Alun-Alun tangent-plane model.
export function createAlunAlunSuzukiCornerFactory({
  helpers: {
    getSitubondoSignMaterial,
  },
}) {
  const footprint = Object.freeze([
    [1.437, -1.368],
    [-1.401, -1.361],
    [-1.523, -0.226],
    [-1.168, -0.168],
    [-1.059, 1.288],
    [0.805, 1.163],
    [1.401, 0.733],
    [1.427, -0.053],
  ]);

  function createFootprintGeometry(height) {
    const shape = new THREE.Shape();
    footprint.forEach(([x, z], index) => {
      // ExtrudeGeometry grows along +Z. Authoring shape Y as -local-Z and
      // folding it -90° puts the extrusion vertically in the tangent plane.
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      curveSegments: 1,
    });
    geometry.rotateX(-Math.PI * 0.5);
    return geometry;
  }

  function addAlunAlunSuzukiCorner(group) {
    const shop = new THREE.Group();
    shop.name = "Suzuki–VIAR corner workshop · Google Street View 360";
    shop.position.set(-17.24, 0.035, 18.64);
    // OSM's oriented box reports its long axis; the public facade is the
    // perpendicular +Z face seen from the north-east panorama position.
    shop.rotation.y = -1.4107 + Math.PI * 0.5;

    const concrete = toonMaterial({ color: 0xb8bab6 });
    const concreteLight = toonMaterial({ color: 0xd2d1c9 });
    const concreteDark = toonMaterial({ color: 0x737976 });
    const corrugated = toonMaterial({ color: 0x6d7372 });
    const corrugatedLine = toonMaterial({ color: 0x4d5554 });
    const red = toonMaterial({ color: 0xd93632 });
    const redDark = toonMaterial({ color: 0x9f2928 });
    const navy = toonMaterial({ color: 0x233d59 });
    const charcoal = toonMaterial({ color: 0x222928 });
    const glass = toonMaterial({
      color: 0x2e4444,
      emissive: 0x142626,
      emissiveIntensity: 0.12,
    });
    const silver = toonMaterial({ color: 0xaeb4b1 });
    const billboardCream = toonMaterial({ color: 0xd8d3ca });

    const foundation = new THREE.Mesh(
      createFootprintGeometry(0.1),
      concreteDark,
    );
    shop.add(foundation);

    const body = new THREE.Mesh(
      createFootprintGeometry(0.78),
      concrete,
    );
    body.position.y = 0.1;
    shop.add(body);

    // The road panorama shows a shallow nearly-flat corrugated roof rather
    // than the generic map renderer's tall cream hip.
    const roof = new THREE.Mesh(
      roundedBox(3.08, 0.09, 2.76, 0.022),
      corrugated,
    );
    roof.position.set(0, 0.91, -0.02);
    roof.rotation.x = -0.018;
    shop.add(roof);
    for (let x = -1.42; x <= 1.42; x += 0.22) {
      const seam = new THREE.Mesh(
        roundedBox(0.018, 0.014, 2.66, 0.004),
        corrugatedLine,
      );
      seam.position.set(x, 0.963, -0.02);
      seam.rotation.x = -0.018;
      shop.add(seam);
    }

    // Suzuki's red parapet is taller over the right-hand showroom and steps
    // down toward the small VIAR service bay on the left.
    const suzukiParapet = new THREE.Mesh(
      roundedBox(1.6, 0.43, 0.18, 0.022),
      red,
    );
    suzukiParapet.position.set(0.1, 1.03, 1.25);
    shop.add(suzukiParapet);
    const parapetCap = new THREE.Mesh(
      roundedBox(1.65, 0.055, 0.22, 0.012),
      redDark,
    );
    parapetCap.position.set(0.1, 1.27, 1.25);
    shop.add(parapetCap);
    const viarHeader = new THREE.Mesh(
      roundedBox(0.5, 0.22, 0.16, 0.018),
      navy,
    );
    viarHeader.position.set(-0.82, 0.91, 1.305);
    shop.add(viarHeader);

    // Full-height open bays and shutters form nearly the entire street face.
    const baySpecs = [
      { x: -0.82, width: 0.48, material: charcoal, type: "open" },
      { x: -0.4, width: 0.27, material: concreteLight, type: "roller" },
      { x: -0.12, width: 0.24, material: concreteLight, type: "grille" },
      { x: 0.2, width: 0.34, material: charcoal, type: "entrance" },
      { x: 0.63, width: 0.47, material: concreteLight, type: "shutter" },
    ];
    baySpecs.forEach(({ x, width, material, type }) => {
      const opening = new THREE.Mesh(
        roundedBox(width, type === "entrance" ? 0.6 : 0.66, 0.055, 0.01),
        material,
      );
      opening.position.set(x, type === "entrance" ? 0.42 : 0.45, 1.307);
      shop.add(opening);
      if (type === "roller") {
        for (let y = 0.16; y <= 0.74; y += 0.032) {
          const slat = new THREE.Mesh(
            roundedBox(width - 0.015, 0.006, 0.012, 0.002),
            silver,
          );
          slat.position.set(x, y, 1.342);
          shop.add(slat);
        }
        const shutterJoin = new THREE.Mesh(
          roundedBox(0.009, 0.62, 0.014, 0.002),
          concreteDark,
        );
        shutterJoin.position.set(x, 0.45, 1.343);
        shop.add(shutterJoin);
      }
      if (type === "shutter") {
        for (let stripe = -width * 0.42; stripe <= width * 0.42; stripe += 0.055) {
          const shutterLine = new THREE.Mesh(
            roundedBox(0.012, 0.6, 0.018, 0.003),
            silver,
          );
          shutterLine.position.set(x + stripe, 0.45, 1.34);
          shop.add(shutterLine);
        }
      }
      if (type === "grille") {
        const blueBand = new THREE.Mesh(roundedBox(width, 0.14, 0.012, 0.002), navy);
        blueBand.position.set(x, 0.29, 1.341);
        shop.add(blueBand);
        const redBand = new THREE.Mesh(roundedBox(width, 0.1, 0.012, 0.002), red);
        redBand.position.set(x, 0.17, 1.341);
        shop.add(redBand);
        // The bands are painted across the folded grille, not thick panels
        // mounted over it. Continue each raised rib through all three colors.
        for (let stripe = -0.1; stripe <= 0.101; stripe += 0.025) {
          [
            { y: 0.56, height: 0.4, material: silver },
            { y: 0.29, height: 0.14, material: navy },
            { y: 0.17, height: 0.1, material: red },
          ].forEach(({ y, height, material }) => {
            const rib = new THREE.Mesh(
              roundedBox(0.009, height, 0.016, 0.002), material,
            );
            rib.position.set(x + stripe, y, 1.355);
            shop.add(rib);
          });
        }
      }
      if (type === "entrance") {
        [0.15, 0.22].forEach((y, stepIndex) => {
          const step = new THREE.Mesh(
            roundedBox(width + 0.12 - stepIndex * 0.05, 0.055, 0.16, 0.008),
            stepIndex === 0 ? charcoal : concreteLight,
          );
          step.position.set(x, y, 1.4 + stepIndex * 0.055);
          shop.add(step);
        });
      }
    });
    [-1.08, -0.56, -0.25, 0.04, 0.39, 0.89].forEach((x, index) => {
      const mullion = new THREE.Mesh(
        roundedBox(0.055, 0.74, 0.075, 0.009),
        index === 5 ? red : concreteLight,
      );
      mullion.position.set(x, 0.48, 1.32);
      shop.add(mullion);
    });
    const viarCanopy = new THREE.Mesh(
      roundedBox(0.62, 0.065, 0.38, 0.016),
      navy,
    );
    viarCanopy.position.set(-0.82, 0.79, 1.48);
    viarCanopy.rotation.x = -0.08;
    shop.add(viarCanopy);
    const mainFascia = new THREE.Mesh(
      roundedBox(1.38, 0.08, 0.16, 0.012),
      concreteDark,
    );
    mainFascia.position.set(0.29, 0.82, 1.34);
    shop.add(mainFascia);

    const viarSignFace = new THREE.Mesh(
      roundedBox(0.28, 0.19, 0.015, 0.003), concreteLight,
    );
    viarSignFace.position.set(-0.73, 0.91, 1.395);
    shop.add(viarSignFace);
    const viarLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, 0.09),
      getSitubondoSignMaterial("VIAR", "#c43838", 900, {
        canvasWidth: 1600,
      }),
    );
    viarLabel.position.set(-0.73, 0.938, 1.408);
    viarLabel.renderOrder = 6;
    shop.add(viarLabel);
    const viarSeries = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.045),
      getSitubondoSignMaterial("V SERIES", "#41484a", 700),
    );
    viarSeries.position.set(-0.73, 0.868, 1.408);
    viarSeries.renderOrder = 6;
    shop.add(viarSeries);
    // The tall cigarette advertisement is a persistent silhouette in the
    // panorama, mounted on two narrow steel posts behind the red parapet.
    [-0.26, 0.26].forEach((x) => {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.026, 0.85, 7),
        charcoal,
      );
      support.position.set(x + 0.12, 1.45, 0.12);
      shop.add(support);
    });
    const billboard = new THREE.Mesh(
      roundedBox(0.75, 1.05, 0.075, 0.018),
      billboardCream,
    );
    billboard.position.set(0.12, 1.76, 0.12);
    shop.add(billboard);
    const billboardInset = new THREE.Mesh(
      roundedBox(0.67, 0.97, 0.025, 0.012),
      redDark,
    );
    billboardInset.position.set(0.12, 1.76, 0.165);
    shop.add(billboardInset);
    [
      ["SUKUN", 1.98, 0.2],
      ["SPECIAL NEW", 1.69, 0.16],
    ].forEach(([text, y, height]) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.58, height),
        getSitubondoSignMaterial(text, "#f4e9d7", 900, {
          strokeColor: "rgba(59,26,22,.7)",
          strokeScale: 0.025,
          canvasWidth: 1024,
          maxFontSize: 250,
        }),
      );
      label.position.set(0.12, y, 0.181);
      label.renderOrder = 7;
      shop.add(label);
    });
    [-0.18, 0.42].forEach((x) => {
      const lampArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.3, 7),
        charcoal,
      );
      lampArm.position.set(x, 2.4, 0.13);
      lampArm.rotation.z = -0.35;
      shop.add(lampArm);
      const lamp = new THREE.Mesh(roundedBox(0.13, 0.055, 0.09, 0.01), charcoal);
      lamp.position.set(x + 0.05, 2.54, 0.17);
      lamp.rotation.z = -0.35;
      shop.add(lamp);
    });

    mergeDirectMeshesByMaterial(shop);
    shop.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = !child.material?.transparent;
      child.receiveShadow = true;
      if (child.material?.transparent) child.renderOrder = 7;
    });
    group.add(shop);
    return shop;
  }

  return { addAlunAlunSuzukiCorner };
}
