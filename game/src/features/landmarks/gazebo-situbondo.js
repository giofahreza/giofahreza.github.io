import * as THREE from "three";
import {
  createHippedRoofGeometry,
  mergeDirectMeshesByMaterial,
  roundedBox,
} from "../../rendering/geometry.js";
import {
  hideMaterialOutline,
  toonMaterial,
} from "../../rendering/materials.js";

const upAxis = new THREE.Vector3(0, 1, 0);

export function createGazeboSitubondoModelFactory({
  collections: {
    animatedStopDetails,
  },
  helpers: {
    addAlunAlunWalker,
  },
  materials: {
    foliageMaterials,
  },
}) {
  function addGazeboSitubondoModel(group, primaryMaterial) {
    group.name = "Gazebo Situbondo · Google Maps 360 survey · August 2022";
    const architecture = new THREE.Group();
    const white = toonMaterial({ color: 0xf0eee6 });
    const panel = toonMaterial({ color: 0xd5d8d2 });
    const stone = toonMaterial({ color: 0xb9bbb5 });
    const columnInset = toonMaterial({ color: 0xc8cbc6 });
    const columnShadow = toonMaterial({ color: 0x9fa5a0 });
    const floorTile = toonMaterial({ color: 0xd5d0c6 });
    const floorGrout = toonMaterial({ color: 0xb7b4aa });
    const floorBorder = toonMaterial({ color: 0xa8a79f });
    const floorBlue = toonMaterial({ color: 0xc3c0b7 });
    const roofLower = toonMaterial({ color: 0x78453c });
    const roofUpper = toonMaterial({ color: 0x4b403b });
    const roofPortico = toonMaterial({ color: 0x804a3f });
    const tileEdge = toonMaterial({ color: 0x41322e });
    const lowerTileHighlight = hideMaterialOutline(toonMaterial({ color: 0x945d50 }));
    const upperTileHighlight = hideMaterialOutline(toonMaterial({ color: 0x67534b }));
    const porticoTileHighlight = hideMaterialOutline(toonMaterial({ color: 0x9a6052 }));
    const roofFascia = toonMaterial({ color: 0x784537 });
    const stepStone = toonMaterial({ color: 0xb6aa9c });
    const stepNosing = toonMaterial({ color: 0x8c8176 });
    const stainless = toonMaterial({ color: 0x9ca8a8, roughness: 0.42 });
    const lampMetal = toonMaterial({ color: 0x202a2a });
    const lampGlow = toonMaterial({
      color: 0xffe3a1,
      emissive: 0xffc45b,
      emissiveIntensity: 0.58,
    });

    // The mapped footprint is 31.7 m by 8.9 m. At the game's 1:5 scale this
    // plinth follows it closely, including the broad road-facing stair.
    const forecourt = new THREE.Mesh(roundedBox(6.7, 0.1, 2.36, 0.08), stone);
    forecourt.position.y = 0.05;
    architecture.add(forecourt);
    const floor = new THREE.Mesh(roundedBox(6.34, 0.12, 1.72, 0.035), floorTile);
    floor.position.y = 0.16;
    architecture.add(floor);
    for (let index = -10; index <= 10; index += 1) {
      const seam = new THREE.Mesh(
        roundedBox(0.015, 0.01, 1.62, 0.003),
        floorGrout,
      );
      seam.position.set(index * 0.3, 0.225, 0);
      architecture.add(seam);
    }
    for (let index = -2; index <= 2; index += 1) {
      const seam = new THREE.Mesh(
        roundedBox(6.2, 0.01, 0.012, 0.003),
        floorGrout,
      );
      seam.position.set(0, 0.225, index * 0.3);
      architecture.add(seam);
    }

    const addFloorOutline = (x, z, width, depth, material, thickness) => {
      [-1, 1].forEach((direction) => {
        const horizontal = new THREE.Mesh(
          roundedBox(width, 0.012, thickness, 0.003),
          material,
        );
        horizontal.position.set(x, 0.232, z + direction * depth * 0.5);
        architecture.add(horizontal);

        const vertical = new THREE.Mesh(
          roundedBox(thickness, 0.012, depth, 0.003),
          material,
        );
        vertical.position.set(x + direction * width * 0.5, 0.232, z);
        architecture.add(vertical);
      });
    };
    addFloorOutline(0, 0, 6.08, 1.48, floorBorder, 0.018);
    addFloorOutline(0, 0, 5.88, 1.3, floorBlue, 0.012);
    addFloorOutline(0, 0.32, 2.32, 0.82, floorBorder, 0.018);
    addFloorOutline(0, 0.32, 2.14, 0.64, floorBlue, 0.012);

    // The public-road Street View is unambiguous here: these are white masonry
    // columns with recessed rectangular panels, not the carved timber columns
    // of the ceremonial pavilion inside the Pendopo grounds.
    const addGazeboColumn = (x, z, { heavy = false } = {}) => {
      const width = heavy ? 0.18 : 0.16;
      const plinthWidth = heavy ? 0.3 : 0.27;
      const plinthHeight = heavy ? 0.23 : 0.22;
      const floorY = 0.2;
      const shaftBottom = floorY + plinthHeight;
      const shaftHeight = 0.62;
      const shaftTop = shaftBottom + shaftHeight;

      const plinth = new THREE.Mesh(
        roundedBox(plinthWidth, plinthHeight, plinthWidth, 0.018),
        white,
      );
      plinth.position.set(x, floorY + plinthHeight * 0.5, z);
      architecture.add(plinth);

      [0, Math.PI, Math.PI * 0.5, -Math.PI * 0.5].forEach((rotationY) => {
        const faceOffset = plinthWidth * 0.5 + 0.004;
        const inset = new THREE.Mesh(
          roundedBox(width * 0.55, plinthHeight * 0.5, 0.012, 0.004),
          panel,
        );
        inset.position.set(
          x + Math.sin(rotationY) * faceOffset,
          floorY + plinthHeight * 0.52,
          z + Math.cos(rotationY) * faceOffset,
        );
        inset.rotation.y = rotationY;
        architecture.add(inset);
      });

      const lowerCollar = new THREE.Mesh(
        roundedBox(width * 1.3, 0.075, width * 1.3, 0.012),
        columnInset,
      );
      lowerCollar.position.set(x, shaftBottom + 0.02, z);
      architecture.add(lowerCollar);

      const shaft = new THREE.Mesh(
        roundedBox(width, shaftHeight, width, 0.012),
        white,
      );
      shaft.position.set(x, shaftBottom + shaftHeight * 0.5, z);
      architecture.add(shaft);

      // Four slim vertical rebates reproduce the fluted panel rhythm visible
      // across both the road-facing and rear rows.
      [0, Math.PI, Math.PI * 0.5, -Math.PI * 0.5].forEach((rotationY) => {
        const faceOffset = width * 0.5 + 0.004;
        [-0.034, 0.034].forEach((offset) => {
          const rebate = new THREE.Mesh(
            roundedBox(0.018, shaftHeight * 0.77, 0.01, 0.003),
            columnShadow,
          );
          const cosine = Math.cos(rotationY);
          const sine = Math.sin(rotationY);
          rebate.position.set(
            x + cosine * offset + sine * faceOffset,
            shaftBottom + shaftHeight * 0.54,
            z - sine * offset + cosine * faceOffset,
          );
          rebate.rotation.y = rotationY;
          architecture.add(rebate);
        });
      });

      const capital = new THREE.Mesh(
        roundedBox(width * 1.42, 0.105, width * 1.42, 0.016),
        white,
      );
      capital.position.set(x, shaftTop + 0.035, z);
      architecture.add(capital);
      const abacus = new THREE.Mesh(
        roundedBox(width * 1.62, 0.06, width * 1.62, 0.014),
        panel,
      );
      abacus.position.set(x, shaftTop + 0.105, z);
      architecture.add(abacus);

      return { floorY, shaftBottom, shaftTop, shaftHeight, width, plinthWidth, plinthHeight };
    };

    const columnXs = [-2.92, -2.12, -1.32, -0.62, 0.62, 1.32, 2.12, 2.92];
    let perimeterColumnDimensions;
    let mainColumnDimensions;
    columnXs.forEach((x) => {
      [-0.67, 0.67].forEach((z) => {
        const heavy = z === 0.67 && Math.abs(x) === 0.62;
        const dimensions = addGazeboColumn(x, z, { heavy });
        if (heavy) mainColumnDimensions ??= dimensions;
        else perimeterColumnDimensions ??= dimensions;
      });
    });
    const entranceHeader = new THREE.Mesh(
      roundedBox(1.62, 0.1, 0.15, 0.014),
      columnInset,
    );
    entranceHeader.position.set(0, 1.13, 0.67);
    architecture.add(entranceHeader);

    const ceiling = new THREE.Mesh(roundedBox(6.42, 0.07, 1.62, 0.025), white);
    ceiling.position.y = 1.19;
    architecture.add(ceiling);
    [-2.52, -1.72, -0.97, 0, 0.97, 1.72, 2.52].forEach((x) => {
      const ceilingBeam = new THREE.Mesh(
        roundedBox(0.055, 0.045, 1.56, 0.012),
        panel,
      );
      ceilingBeam.position.set(x, 1.145, 0);
      architecture.add(ceilingBeam);
    });
    const lowerRoof = new THREE.Mesh(
      createHippedRoofGeometry(6.82, 2.05, 0.33),
      roofLower,
    );
    lowerRoof.position.y = 1.24;
    architecture.add(lowerRoof);
    const upperRoof = new THREE.Mesh(
      createHippedRoofGeometry(4.76, 1.64, 0.4),
      roofUpper,
    );
    upperRoof.position.y = 1.46;
    architecture.add(upperRoof);
    const porticoSoffit = new THREE.Mesh(
      roundedBox(1.72, 0.08, 0.92, 0.018),
      white,
    );
    porticoSoffit.position.set(0, 1.3, 0.72);
    architecture.add(porticoSoffit);
    const porticoRoof = new THREE.Mesh(
      createHippedRoofGeometry(1.88, 1.06, 0.25, 0.47),
      roofPortico,
    );
    porticoRoof.position.set(0, 1.34, 0.72);
    architecture.add(porticoRoof);
    const porticoFascia = new THREE.Mesh(
      roundedBox(1.92, 0.04, 0.05, 0.012),
      roofFascia,
    );
    porticoFascia.position.set(0, 1.34, 1.25);
    architecture.add(porticoFascia);

    [-1.02, 1.02].forEach((z) => {
      const eave = new THREE.Mesh(roundedBox(6.86, 0.055, 0.055, 0.014), roofFascia);
      eave.position.set(0, 1.24, z);
      architecture.add(eave);
    });
    [-3.4, 3.4].forEach((x) => {
      const eave = new THREE.Mesh(roundedBox(0.055, 0.055, 1.98, 0.014), tileEdge);
      eave.position.set(x, 1.24, 0);
      architecture.add(eave);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), tileEdge);
      finial.position.set(x, 1.3, 0);
      architecture.add(finial);
    });
    [-1, 1].forEach((side) => {
      const eaveCurl = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.011, 6, 18, Math.PI * 1.35),
        tileEdge,
      );
      eaveCurl.position.set(side * 3.34, 1.29, 1.035);
      eaveCurl.rotation.z = side > 0 ? -Math.PI * 0.2 : Math.PI * 0.85;
      architecture.add(eaveCurl);
    });
    const ridge = new THREE.Mesh(roundedBox(3.05, 0.05, 0.06, 0.012), tileEdge);
    ridge.position.y = 1.88;
    architecture.add(ridge);
    [-1.525, 1.525].forEach((x) => {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.065, 6), tileEdge);
      crown.position.set(x, 1.925, 0);
      architecture.add(crown);
    });

    // Fine warm courses reproduce the dense clay-tile rhythm on every visible
    // roof slope without turning the pavilion into a stack of heavy black rails.
    const addGazeboRoofCourses = ({
      width,
      ridgeWidth,
      depth,
      height,
      baseY,
      centerZ = 0,
      rows,
      material,
    }) => {
      [-1, 1].forEach((side) => {
        for (let row = 1; row <= rows; row += 1) {
          const progress = row / (rows + 1);
          const course = new THREE.Mesh(
            roundedBox(
              THREE.MathUtils.lerp(width, ridgeWidth, progress),
              0.005,
              0.014,
              0.003,
            ),
            material,
          );
          course.position.set(
            0,
            baseY + height * progress + 0.005,
            centerZ + side * (depth * 0.5 * (1 - progress) + 0.005),
          );
          course.rotation.x = side * Math.atan2(height, depth * 0.5);
          architecture.add(course);
        }
      });
    };
    addGazeboRoofCourses({
      width: 6.78,
      ridgeWidth: 4.72,
      depth: 2.05,
      height: 0.33,
      baseY: 1.24,
      rows: 14,
      material: lowerTileHighlight,
    });
    addGazeboRoofCourses({
      width: 4.72,
      ridgeWidth: 3.05,
      depth: 1.64,
      height: 0.4,
      baseY: 1.46,
      rows: 16,
      material: upperTileHighlight,
    });
    addGazeboRoofCourses({
      width: 1.84,
      ridgeWidth: 0.94,
      depth: 1.06,
      height: 0.25,
      baseY: 1.34,
      centerZ: 0.72,
      rows: 8,
      material: porticoTileHighlight,
    });

    // Six warm-stone risers flare gently toward the road, matching the roughly
    // one-third-width stair visible from Jalan Kartini.
    for (let index = 0; index < 6; index += 1) {
      const width = 2.44 - index * 0.045;
      const centerY = (index + 1) * (0.22 / 6) - 0.02;
      const centerZ = 1.53 - index * 0.14;
      const step = new THREE.Mesh(
        roundedBox(width, 0.04, 0.2, 0.012),
        stepStone,
      );
      step.position.set(0, centerY, centerZ);
      architecture.add(step);
      const nosing = new THREE.Mesh(
        roundedBox(width + 0.02, 0.014, 0.035, 0.006),
        stepNosing,
      );
      nosing.position.set(0, centerY + 0.025, centerZ + 0.092);
      architecture.add(nosing);
    }

    const addRailSegment = (start, end, radius = 0.014) => {
      const direction = end.clone().sub(start);
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
        stainless,
      );
      rail.position.copy(start).add(end).multiplyScalar(0.5);
      rail.quaternion.setFromUnitVectors(upAxis, direction.clone().normalize());
      architecture.add(rail);
    };
    [-1, 1].forEach((side) => {
      const outerX = side * 1.18;
      const innerX = side * 1.06;
      const outerTop = new THREE.Vector3(outerX, 0.35, 1.64);
      const innerTop = new THREE.Vector3(innerX, 0.5, 0.72);
      addRailSegment(outerTop, innerTop, 0.017);
      [
        new THREE.Vector3(outerX, 0.07, 1.64),
        new THREE.Vector3(outerX, 0.12, 1.34),
        new THREE.Vector3(outerX, 0.18, 1.03),
        new THREE.Vector3(innerX, 0.24, 0.72),
      ].forEach((base, index, bases) => {
        const progress = index / (bases.length - 1);
        const x = THREE.MathUtils.lerp(outerX, innerX, progress);
        base.x = x;
        const top = new THREE.Vector3(
          x,
          THREE.MathUtils.lerp(outerTop.y, innerTop.y, progress),
          base.z,
        );
        addRailSegment(base, top, 0.011);
      });
    });

    const addPlanter = (x, z, phase) => {
      const pot = new THREE.Mesh(roundedBox(0.42, 0.27, 0.42, 0.035), white);
      pot.position.set(x, 0.24, z);
      architecture.add(pot);
      const plant = new THREE.Group();
      plant.position.set(x, 0.37, z);
      plant.userData.keepOverviewDynamic = true;
      for (let index = 0; index < 7; index += 1) {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 5),
          foliageMaterials[(index + Math.round(phase)) % foliageMaterials.length],
        );
        const angle = (index / 7) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.11, 0.12 + (index % 3) * 0.07, Math.sin(angle) * 0.11);
        leaf.scale.set(0.42, 1.3, 0.28);
        leaf.rotation.z = Math.cos(angle) * 0.48;
        plant.add(leaf);
      }
      mergeDirectMeshesByMaterial(plant);
      group.add(plant);
      animatedStopDetails.push({ object: plant, type: "parkPalm", phase, strength: 0.018 });
    };
    addPlanter(-2.88, 1.08, 0.4);
    addPlanter(2.88, 1.08, 1.7);

    // The distinctive curled black lamps appear repeatedly around the pavilion.
    const addCeremonialLamp = (x, z, phase) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, 0.08, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.035, 1.32, 8), lampMetal);
      pole.position.y = 0.66;
      lamp.add(pole);
      const arm = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 6, 16, Math.PI * 1.1), lampMetal);
      arm.position.set(0.18, 1.18, 0);
      arm.rotation.z = -0.2;
      lamp.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 7), lampGlow);
      bulb.position.set(0.38, 1.25, 0);
      lamp.add(bulb);
      mergeDirectMeshesByMaterial(lamp);
      group.add(lamp);
      void phase;
    };
    addCeremonialLamp(-3.28, 1.12, 0.2);
    addCeremonialLamp(3.28, 1.12, 1.4);
    animatedStopDetails.push({ type: "parkLamp", material: lampGlow, phase: 0.8 });

    architecture.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    mergeDirectMeshesByMaterial(architecture);
    group.add(architecture);

    addAlunAlunWalker(group, 0x4a7393, 0.3, 1.35, 0.35, 0.18);
    addAlunAlunWalker(group, 0xb85d4f, 2.9, 1.7, 0.42, -0.14);

    // Keep the delivery beacon visually related to the dark tiled roof.
    primaryMaterial.color.setHex(0x8b4439);

    const gazeboObstacles = [
      { shape: "box", x: -2.88, z: 1.08, width: 0.42, depth: 0.42, label: "planter" },
      { shape: "box", x: 2.88, z: 1.08, width: 0.42, depth: 0.42, label: "planter" },
      { shape: "circle", x: -3.28, z: 1.12, radius: 0.08, label: "ceremonial lamp" },
      { shape: "circle", x: 3.28, z: 1.12, radius: 0.08, label: "ceremonial lamp" },
    ];
    columnXs.forEach((x) => {
      [-0.67, 0.67].forEach((z) => {
        const heavy = z === 0.67 && Math.abs(x) === 0.62;
        const dimensions = heavy ? mainColumnDimensions : perimeterColumnDimensions;
        gazeboObstacles.push({
          shape: "box",
          x,
          z,
          width: dimensions.plinthWidth * 1.1,
          depth: dimensions.plinthWidth * 1.1,
          label: heavy ? "main masonry column" : "masonry column",
        });
      });
    });
    group.userData.navigation = {
      surfaces: [
        { x: 0, z: 0, width: 6.7, depth: 2.36, height: 0.1, label: "plinth" },
        { x: 0, z: 0, width: 6.34, depth: 1.72, height: 0.22, label: "pavilion floor" },
        ...Array.from({ length: 6 }, (_, index) => ({
          x: 0,
          z: 1.53 - index * 0.14,
          width: 2.44 - index * 0.045,
          depth: 0.2,
          height: (index + 1) * (0.22 / 6),
          label: `stair ${index + 1}`,
        })),
      ],
      obstacles: gazeboObstacles,
      deliveryTarget: { x: 0, z: 0, height: 0.22 },
    };
  }


  return { addGazeboSitubondoModel };
}
