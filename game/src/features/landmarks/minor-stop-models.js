import * as THREE from "three";
import {
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import { toonMaterial } from "../../rendering/materials.js";

export function createMinorStopModelFactory({
  helpers: {
    addIndonesianFlag,
    addLocalPalm,
    addSitubondoSign,
    createArchPanelGeometry,
  },
  materials: {
    trunkMaterial,
  },
}) {
  function addMarketModel(group, primaryMaterial) {
    const concrete = toonMaterial({ color: 0xc9c8bb });
    const weathered = toonMaterial({ color: 0xa9ada5 });
    const shutter = toonMaterial({ color: 0xb85b4d });
    const dark = toonMaterial({ color: 0x2f4241 });
    const body = new THREE.Mesh(roundedBox(1.08, 0.68, 0.56, 0.014), concrete);
    body.position.y = 0.38;
    group.add(body);
    const roof = new THREE.Mesh(roundedBox(1.15, 0.08, 0.64, 0.015), weathered);
    roof.position.y = 0.76;
    group.add(roof);

    const archFrame = new THREE.Mesh(createArchPanelGeometry(0.36, 0.51), primaryMaterial);
    archFrame.position.set(0, 0.08, 0.292);
    group.add(archFrame);
    const archOpening = new THREE.Mesh(createArchPanelGeometry(0.24, 0.43), dark);
    archOpening.position.set(0, 0.1, 0.304);
    group.add(archOpening);
    [-0.36, 0.36].forEach((x) => {
      const roller = new THREE.Mesh(roundedBox(0.25, 0.27, 0.025, 0.004), shutter);
      roller.position.set(x, 0.23, 0.298);
      group.add(roller);
      for (let index = 0; index < 4; index += 1) {
        const seam = new THREE.Mesh(roundedBox(0.22, 0.008, 0.008, 0.002), dark);
        seam.position.set(x, 0.15 + index * 0.055, 0.316);
        group.add(seam);
      }
    });
    [-0.35, 0, 0.35].forEach((x) => {
      const upperWindow = new THREE.Mesh(roundedBox(0.2, 0.13, 0.025, 0.005), dark);
      upperWindow.position.set(x, 0.6, 0.299);
      group.add(upperWindow);
    });
    addSitubondoSign(
      group,
      "PASAR MIMBAAN",
      0.72,
      0.13,
      new THREE.Vector3(0, 0.81, 0.31),
      { background: 0x3f8ea6, color: "#f4ebd2", border: 0x314b48 },
    );

    const becak = new THREE.Group();
    becak.position.set(-0.36, 0.03, 0.44);
    [-0.1, 0.1].forEach((x) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 6, 16), dark);
      wheel.position.set(x, 0.08, 0);
      becak.add(wheel);
    });
    const seat = new THREE.Mesh(roundedBox(0.17, 0.12, 0.13, 0.012), primaryMaterial);
    seat.position.set(0, 0.14, 0);
    becak.add(seat);
    const canopy = new THREE.Mesh(roundedBox(0.22, 0.035, 0.18, 0.01), shutter);
    canopy.position.set(0, 0.29, 0);
    becak.add(canopy);
    group.add(becak);
    mergeDirectMeshesByMaterial(becak);
    mergeDirectMeshesByMaterial(group);
  }

  function addStationModel(group, primaryMaterial) {
    const cream = toonMaterial({ color: 0xe5d5b8 });
    const roofMaterial = toonMaterial({ color: 0xa95443 });
    const railMaterial = toonMaterial({ color: 0x3f4c4b, metalness: 0.08 });
    const platform = new THREE.Mesh(roundedBox(1.12, 0.08, 0.65, 0.014), toonMaterial({ color: 0xbcb9aa }));
    platform.position.y = 0.04;
    group.add(platform);
    const body = new THREE.Mesh(roundedBox(0.94, 0.45, 0.44, 0.012), cream);
    body.position.set(0, 0.3, -0.05);
    group.add(body);
    const veranda = new THREE.Mesh(roundedBox(1.06, 0.055, 0.25, 0.012), roofMaterial);
    veranda.position.set(0, 0.49, 0.2);
    veranda.rotation.x = -0.08;
    group.add(veranda);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.73, 0.28, 4), roofMaterial);
    roof.position.set(0, 0.66, -0.05);
    roof.rotation.y = Math.PI * 0.25;
    roof.scale.z = 0.63;
    group.add(roof);
    [-0.3, 0, 0.3].forEach((x) => {
      const door = new THREE.Mesh(roundedBox(0.16, 0.29, 0.025, 0.006), primaryMaterial);
      door.position.set(x, 0.25, 0.185);
      group.add(door);
    });
    addSitubondoSign(
      group,
      "SITUBONDO",
      0.54,
      0.12,
      new THREE.Vector3(0, 0.53, 0.235),
      { background: 0xf0e4c9, color: "#315342", border: 0x315342 },
    );
    [-0.23, 0.23].forEach((x) => {
      const rail = new THREE.Mesh(roundedBox(0.035, 0.025, 0.86, 0.005), railMaterial);
      rail.position.set(x, 0.025, 0.48);
      group.add(rail);
    });
    for (let index = 0; index < 8; index += 1) {
      const sleeper = new THREE.Mesh(roundedBox(0.52, 0.022, 0.045, 0.004), trunkMaterial);
      sleeper.position.set(-0.42 + index * 0.12, 0.018, 0.48);
      sleeper.rotation.y = Math.PI * 0.5;
      group.add(sleeper);
    }
    mergeDirectMeshesByMaterial(group);
  }

  function addBeachStopModel(group, primaryMaterial) {
    const sand = toonMaterial({ color: 0xe3c98d });
    const white = toonMaterial({ color: 0xf2ecdc });
    const blue = toonMaterial({ color: 0x3f91ac });
    const base = new THREE.Mesh(roundedBox(1.12, 0.055, 0.72, 0.08), sand);
    base.position.y = 0.025;
    group.add(base);

    const hull = new THREE.Mesh(roundedBox(0.75, 0.12, 0.18, 0.05), white);
    hull.position.set(0.04, 0.17, 0);
    group.add(hull);
    const hullStripe = new THREE.Mesh(roundedBox(0.64, 0.035, 0.19, 0.012), primaryMaterial);
    hullStripe.position.set(0.04, 0.18, 0.005);
    group.add(hullStripe);
    [-0.29, 0.29].forEach((z) => {
      const outrigger = new THREE.Mesh(roundedBox(0.82, 0.035, 0.04, 0.012), trunkMaterial);
      outrigger.position.set(0.02, 0.1, z);
      group.add(outrigger);
      [-0.22, 0.22].forEach((x) => {
        const brace = new THREE.Mesh(roundedBox(0.035, 0.035, 0.5, 0.008), trunkMaterial);
        brace.position.set(x, 0.13, 0);
        group.add(brace);
      });
    });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.017, 0.78, 7), trunkMaterial);
    mast.position.set(-0.12, 0.54, 0);
    group.add(mast);

    const sailCanvas = document.createElement("canvas");
    sailCanvas.width = 256;
    sailCanvas.height = 256;
    const sailContext = sailCanvas.getContext("2d");
    sailContext.fillStyle = "#f4edda";
    sailContext.fillRect(0, 0, 256, 256);
    sailContext.fillStyle = "#3f91ac";
    for (let index = -2; index < 7; index += 2) {
      sailContext.beginPath();
      sailContext.moveTo(index * 48, 256);
      sailContext.lineTo(index * 48 + 78, 256);
      sailContext.lineTo(index * 48 + 214, 0);
      sailContext.lineTo(index * 48 + 136, 0);
      sailContext.closePath();
      sailContext.fill();
    }
    const sailTexture = new THREE.CanvasTexture(sailCanvas);
    sailTexture.colorSpace = THREE.SRGBColorSpace;
    const sailMaterial = toonMaterial({ map: sailTexture, color: 0xffffff, side: THREE.DoubleSide });
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(0, 0.66);
    sailShape.lineTo(0.48, 0.08);
    sailShape.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), sailMaterial);
    sail.position.set(-0.1, 0.35, 0.01);
    group.add(sail);
    addSitubondoSign(
      group,
      "PASIR PUTIH",
      0.48,
      0.11,
      new THREE.Vector3(0.24, 0.24, 0.15),
      { background: 0x2f91a7, color: "#f5edd8", border: 0xf5edd8 },
    );
    addLocalPalm(group, 0.48, -0.24, 0.7);
    const foam = new THREE.Mesh(roundedBox(0.95, 0.015, 0.08, 0.035), blue);
    foam.position.set(0, 0.03, -0.38);
    group.add(foam);
    mergeDirectMeshesByMaterial(group);
  }

  function addStadiumModel(group, primaryMaterial) {
    const field = new THREE.Mesh(
      roundedBox(1.18, 0.045, 0.7, 0.16),
      toonMaterial({ color: 0x6f9a63 }),
    );
    field.position.y = 0.025;
    group.add(field);

    const track = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.055, 8, 48),
      primaryMaterial,
    );
    track.position.y = 0.065;
    track.rotation.x = Math.PI * 0.5;
    track.scale.z = 0.58;
    group.add(track);

    const pitch = new THREE.Mesh(
      roundedBox(0.63, 0.024, 0.31, 0.045),
      toonMaterial({ color: 0x78a96c }),
    );
    pitch.position.y = 0.075;
    group.add(pitch);

    [-0.49, 0.49].forEach((z) => {
      const stand = new THREE.Mesh(
        roundedBox(0.92, 0.18, 0.18, 0.025),
        toonMaterial({ color: z > 0 ? 0xd6d0bc : 0xbfc8ba }),
      );
      stand.position.set(0, 0.13, z);
      group.add(stand);
      const roof = new THREE.Mesh(
        roundedBox(1.02, 0.045, 0.25, 0.016),
        primaryMaterial,
      );
      roof.position.set(0, 0.28, z);
      group.add(roof);
    });

    addSitubondoSign(
      group,
      "GELORA M. SALEH",
      0.72,
      0.13,
      new THREE.Vector3(0, 0.39, 0.52),
      { background: 0x315342, color: "#f5edd8", border: 0xf5edd8 },
    );
    addIndonesianFlag(group, -0.52, 0.38, 0.74);
    addIndonesianFlag(group, 0.52, 0.38, 0.74);
    mergeDirectMeshesByMaterial(group);
  }


  return {
    addBeachStopModel,
    addMarketModel,
    addStadiumModel,
    addStationModel,
  };
}
